import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "https://AppSwinger.live",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405, headers: corsHeaders });
  const url = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const diditKey = Deno.env.get("DIDIT_API_KEY");
  const workflowId = Deno.env.get("DIDIT_WORKFLOW_ID");
  if (!url || !anonKey || !serviceKey || !diditKey || !workflowId) {
    return Response.json({ error: "La verificación no está configurada en el servidor." }, { status: 503, headers: corsHeaders });
  }
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return Response.json({ error: "Inicia sesión para verificar tu identidad." }, { status: 401, headers: corsHeaders });
  const userClient = createClient(url, anonKey, { global: { headers: { Authorization: authHeader } }, auth: { persistSession: false } });
  const { data: { user }, error: authError } = await userClient.auth.getUser();
  if (authError || !user) return Response.json({ error: "Sesión no válida." }, { status: 401, headers: corsHeaders });
  if (!user.email_confirmed_at) return Response.json({ error: "Confirma tu correo antes de verificar tu identidad." }, { status: 403, headers: corsHeaders });

  const admin = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data: profile, error: profileError } = await admin.from("profiles").select("id,identity_verification_status").eq("id", user.id).maybeSingle();
  if (profileError || !profile) return Response.json({ error: "Primero completa tu perfil." }, { status: 409, headers: corsHeaders });
  if (profile.identity_verification_status === "verified") return Response.json({ error: "Tu identidad ya está verificada." }, { status: 409, headers: corsHeaders });

  let input: { identityConsent?: boolean; termsAccepted?: boolean };
  try { input = await req.json(); } catch { return Response.json({ error: 'invalid_json' }, { status: 400, headers: corsHeaders }); }
  if (input.identityConsent !== true || input.termsAccepted !== true) return Response.json({ error: 'explicit_identity_and_terms_consent_required' }, { status: 400, headers: corsHeaders });
  const consentAt = new Date().toISOString();
  const { error: consentError } = await admin.from('profiles').update({ identity_consent_at: consentAt, terms_accepted_at: consentAt, updated_at: consentAt }).eq('id', user.id);
  if (consentError) return Response.json({ error: 'consent_record_failed' }, { status: 500, headers: corsHeaders });

  const diditResponse = await fetch("https://verification.didit.me/v3/session/", {
    method: "POST",
    headers: { "x-api-key": diditKey, "content-type": "application/json" },
    body: JSON.stringify({
      workflow_id: workflowId,
      vendor_data: user.id,
      callback: "https://AppSwinger.live/?verification=return",
    }),
  });
  const didit = await diditResponse.json().catch(() => ({}));
  if (!diditResponse.ok || typeof didit.session_id !== "string" || typeof didit.url !== "string" || !didit.url.startsWith("https://")) {
    console.error("Didit session creation failed", diditResponse.status);
    return Response.json({ error: "Didit no pudo iniciar la sesión. Revisa el workflow configurado." }, { status: 502, headers: corsHeaders });
  }

  const { error: upsertError } = await admin.from("identity_verifications").upsert({
    user_id: user.id,
    provider: "didit",
    provider_session_id: didit.session_id,
    status: "pending",
    age_verified_at: null,
    document_match_verified_at: null,
    selfie_match_verified_at: null,
    verified_at: null,
    updated_at: new Date().toISOString(),
  }, { onConflict: "user_id" });
  if (upsertError) {
    console.error("Could not persist Didit session", upsertError.code);
    return Response.json({ error: "No se pudo guardar la sesión de verificación." }, { status: 500, headers: corsHeaders });
  }
  await admin.from("profiles").update({
    identity_verification_status: "pending",
    face_match_status: "pending",
  }).eq("id", user.id);

  return Response.json({ url: didit.url, sessionId: didit.session_id, status: "pending" }, { headers: corsHeaders });
});
