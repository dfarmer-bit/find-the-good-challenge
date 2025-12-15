import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

serve(async (req) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const { activity_id, gps_lat, gps_lng } = await req.json();

  if (!activity_id) {
    return new Response(
      JSON.stringify({ error: "Missing activity_id" }),
      { status: 400 }
    );
  }

  const { data: activity } = await supabase
    .from("challenge_activity")
    .select("*")
    .eq("id", activity_id)
    .single();

  if (!activity || activity.status !== "pending") {
    return new Response(
      JSON.stringify({ error: "Invalid activity" }),
      { status: 400 }
    );
  }

  const started = new Date(activity.occurred_at).getTime();
  const now = Date.now();
  const minutes = (now - started) / 60000;

  if (minutes < 15) {
    return new Response(
      JSON.stringify({ status: "pending", minutes_remaining: 15 - minutes }),
      { status: 200 }
    );
  }

  const { data: approved } = await supabase
    .from("approved_locations")
    .select("id")
    .eq("challenge_type", "gym")
    .eq("address", activity.location_name)
    .maybeSingle();

  if (!approved) {
    await supabase
      .from("challenge_activity")
      .update({ status: "needs_review" })
      .eq("id", activity_id);

    return new Response(
      JSON.stringify({ status: "needs_review" }),
      { status: 200 }
    );
  }

  await supabase
    .from("challenge_activity")
    .update({ status: "approved" })
    .eq("id", activity_id);

  return new Response(
    JSON.stringify({ status: "approved" }),
    { status: 200 }
  );
});
