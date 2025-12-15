// lib/gym.ts

import { supabase } from "./supabase";

export async function startGym(
  challengeId: string,
  lat?: number,
  lng?: number
) {
  const { data, error } = await supabase.functions.invoke("gym-start", {
    body: {
      challenge_id: challengeId,
      gps_lat: lat,
      gps_lng: lng,
    },
  });

  if (error) throw error;
  return data;
}
