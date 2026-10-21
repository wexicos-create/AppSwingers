import { createClient } from "npm:@supabase/supabase-js@2.49.1";

const baseHeaders = {
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json; charset=utf-8",
  "Vary": "Origin",
  "Cache-Control": "no-store",
};

const json = (body: unknown, status = 200, origin = "") =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...baseHeaders, "Access-Control-Allow-Origin": origin || "null" },
  });

Deno.serve(async (req) => {
  const allowedOrigin = Deno.env.get("APP_ORIGIN") ?? "";
  const origin = req.headers.get("Origin") ?? "";
  const mobileOrigins = new Set(["capacitor://localhost", "http://localhost", "https://localhost"]);
  const originOk =
    (!origin && req.headers.get("x-client-info")?.includes("supabase")) ||
    mobileOrigins.has(origin) ||
    Boolean(allowedOrigin && origin === allowedOrigin);

  if (req.method === "OPTIONS") {
    return new Response("ok", {
      status: originOk ? 200 : 403,
      headers: {
        ...baseHeaders,
        "Access-Control-Allow-Origin": originOk ? (origin || allowedOrigin || "null") : "null",
      },
    });
  }
  if (!originOk) return json({ error: "origin_not_allowed" }, 403, allowedOrigin);
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405, origin || allowedOrigin);

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceKey) {
    return json({ error: "server_configuration_incomplete" }, 503, origin || allowedOrigin);
  }

  const bearer = req.headers.get("Authorization") ?? "";
  const token = bearer.startsWith("Bearer ") ? bearer.slice(7) : "";
  if (!token) return json({ error: "unauthorized" }, 401, origin || allowedOrigin);

  let body: { plan_code?: unknown };
  try {
    body = await req.json();
  } catch {
    return json({ error: "invalid_json" }, 400, origin || allowedOrigin);
  }

  const planCode = body.plan_code;
  const plans: Record<string, { base: number; iva: number; total: number }> = {
    prime: { base: 350, iva: 56, total: 406 },
    gold: { base: 500, iva: 80, total: 580 },
  };
  if (typeof planCode !== "string" || !(planCode in plans)) {
    return json({ error: "invalid_plan", allowed: ["prime", "gold"] }, 400, origin || allowedOrigin);
  }
  const selected = plans[planCode];

  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: authData, error: authError } = await supabase.auth.getUser(token);
  const user = authData?.user;
  if (authError || !user) return json({ error: "unauthorized" }, 401, origin || allowedOrigin);

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("status, age_verified_at, identity_verified_at, profile_photo_path, profile_photo_match_status")
    .eq("id", user.id)
    .maybeSingle();

  if (profileError) {
    console.error("SPEI profile lookup failed", profileError.code);
    return json({ error: "profile_lookup_failed" }, 500, origin || allowedOrigin);
  }
  if (
    !profile ||
    profile.status !== "active" ||
    !profile.age_verified_at ||
    !profile.identity_verified_at ||
    !profile.profile_photo_path ||
    profile.profile_photo_match_status !== "matched"
  ) {
    return json({ error: "verified_adult_and_approved_profile_required" }, 403, origin || allowedOrigin);
  }

  const { data: account, error: accountError } = await supabase
    .from("spei_account_config")
    .select("clabe,account_holder,bank_name")
    .eq("singleton", true)
    .maybeSingle();

  if (accountError) {
    console.error("SPEI receiver account lookup failed", accountError.code);
    return json({ error: "spei_account_lookup_failed" }, 500, origin || allowedOrigin);
  }
  if (!account || !/^\d{18}$/.test(account.clabe)) {
    return json({ error: "spei_account_not_configured" }, 503, origin || allowedOrigin);
  }

  const now = new Date();
  const expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString();

  // Reuse a matching unexpired order to avoid duplicate orders on double-tap/retry.
  const { data: existing, error: existingError } = await supabase
    .from("spei_payment_orders")
    .select("id,order_code,plan_code,amount_mxn,status,expires_at,created_at,subtotal_mxn,iva_amount_mxn,total_amount_mxn")
    .eq("user_id", user.id)
    .eq("plan_code", planCode)
    .eq("total_amount_mxn", selected.total)
    .in("status", ["pending_payment", "verification_pending", "manual_review"])
    .gt("expires_at", now.toISOString())
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (existingError) {
    console.error("SPEI pending order lookup failed", existingError.code);
    return json({ error: "order_lookup_failed" }, 500, origin || allowedOrigin);
  }

  let order = existing;
  if (!order) {
    const orderCode = "AS-" + now.toISOString().slice(0, 10).replaceAll("-", "") + "-" +
      crypto.randomUUID().slice(0, 8).toUpperCase();

    const { data: created, error: createError } = await supabase
      .from("spei_payment_orders")
      .insert({
        user_id: user.id,
        order_code: orderCode,
        plan_code: planCode,
        amount_mxn: selected.total,
        subtotal_mxn: selected.base,
        iva_rate: 0.16,
        iva_amount_mxn: selected.iva,
        total_amount_mxn: selected.total,
        status: "pending_payment",
        expires_at: expiresAt,
        tracking_key: crypto.randomUUID(),
      })
      .select("id,order_code,plan_code,amount_mxn,status,expires_at,created_at,subtotal_mxn,iva_amount_mxn,total_amount_mxn")
      .single();

    if (createError || !created) {
      console.error("SPEI order creation failed", createError?.code ?? "unknown");
      return json({ error: "order_creation_failed" }, 500, origin || allowedOrigin);
    }
    order = created;
  }

  return json({
    order,
    payment: {
      method: "SPEI",
      clabe: account.clabe,
      account_holder: account.account_holder,
      bank_name: account.bank_name,
      reference: order.order_code,
      expires_at: order.expires_at,
      instructions: "Transfer the exact total and include the unique order code in the payment concept. Submit the Banxico CEP URL after the transfer.",
    },
  }, 201, origin || allowedOrigin);
});
