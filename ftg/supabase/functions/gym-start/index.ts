// supabase/functions/gym-start/index.ts
// @ts-nocheck

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

serve(async (req: Request) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const { challenge_id, gps_lat, gps_lng } = await req.json();

  if (!challenge_id || gps_lat == null || gps_lng == null) {
    return new Response(
      JSON.stringify({ error: "Missing required fields" }),
      { status: 400 }
    );
  }

  // TEMP: anonymous user placeholder
  const TEMP_USER_ID = "00000000-0000-0000-0000-000000000000";

  const { data, error } = await supabase
    .from("challenge_activity")
    .insert({
      user_id: TEMP_USER_ID,
      challenge_id,
      gps_lat,
      gps_lng,
      status: "pending",
      occurred_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400 }
    );
  }

  return new Response(
    JSON.stringify({
      activity_id: data.id,
      status: data.status,
    }),
    { status: 200 }
  );
});
