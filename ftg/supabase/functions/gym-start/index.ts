import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

type NearbySearchResponse = {
  results?: Array<{
    place_id: string;
    name?: string;
    vicinity?: string;
    business_status?: string;
    types?: string[];
    geometry?: { location?: { lat: number; lng: number } };
    rating?: number;
    user_ratings_total?: number;
  }>;
  status?: string;
  error_message?: string;
};

const VERSION = "GYM_START_V5_IDEMPOTENT_DAILY";
const LOCKED_GYM_CHALLENGE_ID = "8d3dec03-9d52-4948-b6e9-d9aa399cf733";
const SEARCH_RADIUS_METERS = 150;

function json(status: number, body: any) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function getBearerToken(req: Request) {
  const h = req.headers.get("authorization") ?? req.headers.get("Authorization");
  if (!h) return null;
  const m = h.match(/^Bearer\s+(.+)$/i);
  return m?.[1] ?? null;
}

// meters
function distanceMeters(lat1: number, lng1: number, lat2: number, lng2: number) {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

async function googlePlacesNearestGym(lat: number, lng: number) {
  const key = Deno.env.get("GOOGLE_PLACES_API_KEY");
  if (!key) throw new Error("Missing GOOGLE_PLACES_API_KEY secret in Supabase.");

  const url = new URL("https://maps.googleapis.com/maps/api/place/nearbysearch/json");
  url.searchParams.set("location", `${lat},${lng}`);
  url.searchParams.set("radius", String(SEARCH_RADIUS_METERS));
  url.searchParams.set("type", "gym");
  url.searchParams.set("key", key);

  const res = await fetch(url.toString(), { method: "GET" });
  const data = (await res.json()) as NearbySearchResponse;

  if (!res.ok) throw new Error(`Google Places error (${res.status}): ${JSON.stringify(data)}`);

  if (data.status && data.status !== "OK" && data.status !== "ZERO_RESULTS") {
    throw new Error(
      `Google Places status=${data.status}${data.error_message ? `: ${data.error_message}` : ""}`,
    );
  }

  const top = data.results?.[0];
  if (!top?.place_id) return { found: false as const };

  const pLat = top.geometry?.location?.lat;
  const pLng = top.geometry?.location?.lng;

  const dist =
    typeof pLat === "number" && typeof pLng === "number"
      ? Math.round(distanceMeters(lat, lng, pLat, pLng))
      : null;

  const confident = dist !== null && dist <= SEARCH_RADIUS_METERS;

  return {
    found: true as const,
    confident,
    place: top,
    distance_m: dist,
  };
}

serve(async (req) => {
  const base = { version: VERSION };
  try {
    if (req.method !== "POST") return json(405, { ...base, error: "Method not allowed" });

    const token = getBearerToken(req);
    if (!token) return json(401, { ...base, error: "Missing authorization header" });

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY");
    const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
      return json(500, { ...base, error: "Missing SUPABASE_URL / SUPABASE_ANON_KEY" });
    }
    if (!SERVICE_ROLE_KEY) {
      return json(500, { ...base, error: "Missing SUPABASE_SERVICE_ROLE_KEY" });
    }

    const supabaseUser = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: `Bearer ${token}` } },
      auth: { persistSession: false },
    });

    const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
      auth: { persistSession: false },
    });

    const { data: userData, error: userErr } = await supabaseUser.auth.getUser(token);
    if (userErr || !userData?.user) return json(401, { ...base, error: "Unauthorized" });

    const user = userData.user;

    const body = await req.json().catch(() => ({}));
    const gps_lat = Number(body?.gps_lat);
    const gps_lng = Number(body?.gps_lng);

    if (!Number.isFinite(gps_lat) || !Number.isFinite(gps_lng)) {
      return json(400, { ...base, error: "gps_lat and gps_lng are required numbers." });
    }

    // ensure profile exists (prevents challenge_activity_user_id_fkey)
    const { data: existingProfile, error: profileCheckErr } = await supabaseAdmin
      .from("profiles")
      .select("id")
      .eq("id", user.id)
      .maybeSingle();

    if (profileCheckErr) return json(500, { ...base, error: `Profile check failed: ${profileCheckErr.message}` });

    if (!existingProfile) {
      const { error: insertProfileErr } = await supabaseAdmin.from("profiles").insert({
        id: user.id,
        email: user.email ?? null,
        full_name: (user.user_metadata?.full_name as string) ?? null,
        department: "administration",
        role: "employee",
      });
      if (insertProfileErr) return json(500, { ...base, error: `Profile create failed: ${insertProfileErr.message}` });
    }

    // ✅ Idempotency: if user already has a gym_activation today, return it instead of inserting again
    const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD (UTC)
    const { data: existingToday, error: existingErr } = await supabaseAdmin
      .from("challenge_activity")
      .select("id, status, location_name, created_at, challenge_id, activity_type")
      .eq("user_id", user.id)
      .eq("challenge_id", LOCKED_GYM_CHALLENGE_ID)
      .eq("activity_type", "gym_activation")
      .eq("occurred_date", today)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (existingErr) {
      return json(500, { ...base, error: `Existing check failed: ${existingErr.message}` });
    }

    if (existingToday) {
      return json(200, {
        ...base,
        inserted: false,
        already_exists_today: true,
        activity_id: existingToday.id,
        status: existingToday.status,
        location_name: existingToday.location_name,
        created_at: existingToday.created_at,
        challenge_id: existingToday.challenge_id,
        activity_type: existingToday.activity_type,
      });
    }

    // Places lookup (safe)
    let places: any = { found: false };
    let placesError: string | null = null;
    try {
      places = await googlePlacesNearestGym(gps_lat, gps_lng);
    } catch (e: any) {
      placesError = e?.message ?? "Places lookup failed";
      places = { found: false };
    }

    // Only allowed statuses: pending / approved / rejected
    let status: "approved" | "pending" = "pending";
    let location_name: string | null = null;

    const metadata: Record<string, any> = {
      version: VERSION,
      gps: { lat: gps_lat, lng: gps_lng },
      places_error: placesError,
      review_required: true,
      google_places: null,
    };

    if (places?.found) {
      location_name = places.place.place_id;
      metadata.google_places = {
        place_id: places.place.place_id,
        name: places.place.name ?? null,
        vicinity: places.place.vicinity ?? null,
        distance_m: places.distance_m ?? null,
        confident: !!places.confident,
      };
      if (places.confident) {
        status = "approved";
        metadata.review_required = false;
      }
    } else {
      metadata.google_places = { found: false, radius_m: SEARCH_RADIUS_METERS };
    }

    const { data: activity, error: activityErr } = await supabaseAdmin
      .from("challenge_activity")
      .insert({
        user_id: user.id,
        challenge_id: LOCKED_GYM_CHALLENGE_ID,
        activity_type: "gym_activation",
        status,
        gps_lat,
        gps_lng,
        location_name,
        metadata,
      })
      .select("id, status, location_name, challenge_id, activity_type")
      .single();

    if (activityErr) {
      return json(500, { ...base, inserted: false, error: `challenge_activity insert failed: ${activityErr.message}` });
    }

    return json(200, {
      ...base,
      inserted: true,
      activity_id: activity.id,
      status: activity.status,
      location_name: activity.location_name,
      challenge_id: activity.challenge_id,
      activity_type: activity.activity_type,
    });
  } catch (e: any) {
    return json(500, { version: VERSION, inserted: false, error: e?.message ?? "Unknown error" });
  }
});
