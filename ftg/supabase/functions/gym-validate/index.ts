// supabase/functions/gym-activate/index.ts
// @ts-nocheck

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

function json(body: any, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "authorization, apikey, content-type",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
    },
  });
}

serve(async (req: Request) => {
  // CORS preflight
  if (req.method === "OPTIONS") return json({ ok: true }, 200);

  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

  const authHeader =
    req.headers.get("authorization") || req.headers.get("Authorization");
  if (!authHeader) return json({ error: "Missing authorization header" }, 401);

  const supabaseAuthed = createClient(supabaseUrl, serviceRoleKey, {
    global: { headers: { authorization: authHeader } },
  });

  const {
    data: { user },
    error: userErr,
  } = await supabaseAuthed.auth.getUser();

  if (userErr || !user) return json({ error: "Invalid or expired session" }, 401);

  let payload: any = null;
  try {
    payload = await req.json();
  } catch {
    return json({ error: "Invalid JSON body" }, 400);
  }

  const { activity_id, gps_lat, gps_lng } = payload || {};
  if (!activity_id) return json({ error: "Missing activity_id" }, 400);

  // Load the activity and ensure it belongs to the caller
  const { data: activity, error: actErr } = await supabaseAdmin
    .from("challenge_activity")
    .select("*")
    .eq("id", activity_id)
    .single();

  if (actErr || !activity) return json({ error: "Activity not found" }, 400);

  if (activity.user_id !== user.id) {
    return json({ error: "Not authorized for this activity" }, 403);
  }

  if (activity.status !== "pending") {
    return json({ error: "Invalid activity status" }, 400);
  }

  const started = new Date(activity.occurred_at).getTime();
  const now = Date.now();
  const minutes = (now - started) / 60000;

  if (minutes < 15) {
    return json(
      { status: "pending", minutes_remaining: Math.max(0, 15 - minutes) },
      200
    );
  }

  // NOTE: This depends on activity.location_name being set elsewhere.
  const { data: approved, error: apprErr } = await supabaseAdmin
    .from("approved_locations")
    .select("id")
    .eq("challenge_type", "gym")
    .eq("address", activity.location_name)
    .maybeSingle();

  if (apprErr) return json({ error: apprErr.message }, 400);

  if (!approved) {
    const { error: updErr } = await supabaseAdmin
      .from("challenge_activity")
      .update({ status: "needs_review" })
      .eq("id", activity_id);

    if (updErr) return json({ error: updErr.message }, 400);

    return json({ status: "needs_review" }, 200);
  }

  const { error: updErr } = await supabaseAdmin
    .from("challenge_activity")
    .update({ status: "approved" })
    .eq("id", activity_id);

  if (updErr) return json({ error: updErr.message }, 400);

  return json({ status: "approved" }, 200);
});
