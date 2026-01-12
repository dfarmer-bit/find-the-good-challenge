// supabase/functions/send-notification-jobs/index.ts
// Sends pending notification_jobs via Expo Push
// Uses Supabase Edge Functions (Deno)

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error("Missing Supabase environment variables");
}

const supabase = createClient(
  SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY
);

type NotificationJob = {
  id: string;
  user_id: string;
  title: string;
  body: string;
  data: Record<string, unknown>;
};

async function sendExpoPush(
  to: string,
  title: string,
  body: string,
  data: Record<string, unknown>
) {
  const res = await fetch("https://exp.host/--/api/v2/push/send", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      to,
      sound: "default",
      title,
      body,
      data,
    }),
  });

  return await res.json();
}

serve(async () => {
  const { data: jobs } = await supabase
    .from("notification_jobs")
    .select("id,user_id,title,body,data")
    .eq("status", "pending")
    .order("created_at", { ascending: true })
    .limit(25);

  if (!jobs || jobs.length === 0) {
    return new Response(JSON.stringify({ ok: true, processed: 0 }), {
      headers: { "Content-Type": "application/json" },
    });
  }

  let sent = 0;
  let errored = 0;

  for (const job of jobs as NotificationJob[]) {
    try {
      const { data: tokens } = await supabase
        .from("device_tokens")
        .select("expo_push_token")
        .eq("user_id", job.user_id);

      const expoTokens =
        tokens?.map((t) => t.expo_push_token).filter(Boolean) ?? [];

      if (expoTokens.length === 0) {
        await supabase
          .from("notification_jobs")
          .update({ status: "error", error: "No device token" })
          .eq("id", job.id);
        errored++;
        continue;
      }

      let ok = false;

      for (const token of expoTokens) {
        const result = await sendExpoPush(
          token,
          job.title,
          job.body,
          job.data
        );

        if (result?.data?.status === "ok") {
          ok = true;
        }
      }

      if (ok) {
        await supabase
          .from("notification_jobs")
          .update({
            status: "sent",
            sent_at: new Date().toISOString(),
          })
          .eq("id", job.id);
        sent++;
      } else {
        throw new Error("Expo push failed");
      }
    } catch (err) {
      await supabase
        .from("notification_jobs")
        .update({
          status: "error",
          error: String(err),
        })
        .eq("id", job.id);
      errored++;
    }
  }

  return new Response(
    JSON.stringify({ ok: true, processed: jobs.length, sent, errored }),
    { headers: { "Content-Type": "application/json" } }
  );
});
