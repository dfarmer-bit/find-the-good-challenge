// lib/gym.ts

import { supabase } from "./supabase";

type AnyJson = any;

async function getAuthParts() {
  const {
    data: { session },
    error: sessionError,
  } = await supabase.auth.getSession();

  if (sessionError) throw sessionError;

  const token = session?.access_token;
  if (!token) throw new Error("You are not logged in (no session token).");

  const supabaseUrl = (supabase as any).supabaseUrl as string | undefined;
  const supabaseAnonKey = (supabase as any).supabaseKey as string | undefined;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error("Supabase client is missing URL or anon key.");
  }

  return { supabaseUrl, supabaseAnonKey, token };
}

async function postEdge(path: string, body: AnyJson) {
  const { supabaseUrl, supabaseAnonKey, token } = await getAuthParts();

  const res = await fetch(`${supabaseUrl}/functions/v1/${path}`, {
    method: "POST",
    headers: {
      apikey: supabaseAnonKey,
      Authorization: `Bearer ${token}`,
      authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  const text = await res.text();

  if (!res.ok) {
    throw new Error(text || `Edge Function error (${res.status})`);
  }

  try {
    return JSON.parse(text);
  } catch {
    return text as any;
  }
}

// 1) Gym Activation (Award #1)
export async function startGym(challengeId: string, lat?: number, lng?: number) {
  return await postEdge("gym-start", {
    challenge_id: challengeId,
    gps_lat: lat,
    gps_lng: lng,
  });
}

// 2) Validate activation / approval decision
export async function activateGym(activityId: string) {
  return await postEdge("gym-activate", {
    activity_id: activityId,
  });
}
