import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

function canonical(value: unknown): string {
  if (Array.isArray(value)) return "[" + value.map(canonical).join(",") + "]";
  if (value && typeof value === "object") {
    const object = value as Record<string, unknown>;
    return "{" + Object.keys(object).sort().map(key => JSON.stringify(key) + ":" + canonical(object[key])).join(",") + "}";
  }
  return JSON.stringify(value);
}
function hex(bytes: Uint8Array): string { return Array.from(bytes).map(b => b.toString(16).padStart(2, "0")).join(""); }
function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return result === 0;
}
async function hmac(secret: string, value: string): Promise<string> {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return hex(new Uint8Array(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(value))));
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });
  const secret = Deno.env.get("DIDIT_WEBHOOK_SECRET");
  const url = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!secret || !url || !serviceKey) return new Response("Webhook not configured", { status: 503 });
  try {
    const payload = await req.json();
    const signature = (req.headers.get("X-Signature-V2") || "").trim().toLowerCase();
    const expected = await hmac(secret, canonical(payload));
    if (!signature || !constantTimeEqual(signature, expected)) return new Response("Invalid signature", { status: 401 });

    const data = payload?.data && typeof payload.data === "object" ? payload.data : payload;
    const sessionId = String(data.session_id || data.sessionId || "");
    const userId = String(data.vendor_data || data.vendorData || "");
    const rawStatus = String(data.status || "");
    if (!sessionId || !userId || !rawStatus) return new Response("Invalid payload", { status: 400 });

    const admin = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
    const { data: existing, error: lookupError } = await admin.from("identity_verifications")
      .select("user_id,provider_session_id").eq("provider_session_id", sessionId).maybeSingle();
    if (lookupError || !existing || existing.user_id !== userId || existing.provider_session_id !== sessionId) return new Response("Session mismatch", { status: 404 });

    const normalized = rawStatus.toLowerCase();
    const approved = ["approved", "verified"].includes(normalized);
    const rejected = ["declined", "rejected"].includes(normalized);
    const status = approved ? "verified" : rejected ? "rejected" : "manual_review";
    const faceStatus = approved ? "matched" : rejected ? "rejected" : "pending";
    const now = new Date().toISOString();
    const { error: updateError } = await admin.from("identity_verifications").update({
      status, age_verified_at: approved ? now : null, document_match_verified_at: approved ? now : null,
      selfie_match_verified_at: approved ? now : null, updated_at: now, verified_at: approved ? now : null,
    }).eq("provider_session_id", sessionId).eq("user_id", userId);
    if (updateError) throw updateError;
    const { error: profileError } = await admin.from("profiles").update({
      identity_verification_status: status === "manual_review" ? "pending" : status,
      face_match_status: faceStatus,
      identity_verified_at: approved ? now : null,
      age_verified_at: approved ? now : null,
    }).eq("id", userId);
    if (profileError) throw profileError;
    return new Response("ok", { status: 200 });
  } catch (error) {
    console.error("Didit webhook failed", error instanceof Error ? error.message : "unknown");
    return new Response("Webhook processing failed", { status: 500 });
  }
});
