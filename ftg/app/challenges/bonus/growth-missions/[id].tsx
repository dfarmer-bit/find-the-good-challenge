// app/challenges/bonus/growth-missions/[id].tsx
// FULL FILE REPLACEMENT

import { AppHeader } from "@/components/AppHeader";
import { Colors, Components, Layout, Radius, Spacing, Typography } from "@/constants/theme";
import { supabase } from "@/lib/supabase";
import * as ImagePicker from "expo-image-picker";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

type GrowthMission = {
  id: string;
  title: string;
  description: string | null;
  points: number;
};

const BUCKET = "growth-mission-videos";
const GROWTH_MISSION_CHALLENGE_ID = "b1125af1-c46c-4e99-a6ad-8ff7295e8455"; // Growth Mission Completion

export default function GrowthMissionDetailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const rawId = params?.id;
  const missionId = Array.isArray(rawId) ? rawId[0] : rawId;

  const closeAt = useMemo(() => new Date("2026-12-01T00:00:00Z").getTime(), []);

  const [loading, setLoading] = useState(true);
  const [mission, setMission] = useState<GrowthMission | null>(null);
  const [alreadyCompleted, setAlreadyCompleted] = useState(false);

  const [videoUri, setVideoUri] = useState<string | null>(null);
  const [videoDurationMs, setVideoDurationMs] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const isClosed = Date.now() >= closeAt;
  const canSubmit = !!videoUri && !submitting && !alreadyCompleted && !isClosed;

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [missionId]);

  async function load() {
    if (!missionId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);

      const {
        data: { user },
      } = await supabase.auth.getUser();

      const { data: m, error: mErr } = await supabase
        .from("growth_missions")
        .select("id, title, description, points")
        .eq("id", missionId)
        .maybeSingle();

      if (mErr) throw mErr;
      setMission(m ?? null);

      if (user?.id) {
        const { data: s, error: sErr } = await supabase
          .from("growth_mission_submissions")
          .select("id")
          .eq("growth_mission_id", missionId)
          .eq("user_id", user.id)
          .maybeSingle();

        if (sErr) throw sErr;
        setAlreadyCompleted(!!s);
      } else {
        setAlreadyCompleted(false);
      }
    } catch (e: any) {
      setMission(null);
    } finally {
      setLoading(false);
    }
  }

  const ensureCameraPermission = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permission needed", "Camera access is required to record a video.");
      return false;
    }
    return true;
  };

  const ensureLibraryPermission = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permission needed", "Photo library access is required to upload a video.");
      return false;
    }
    return true;
  };

  const pickFromCamera = async () => {
    const ok = await ensureCameraPermission();
    if (!ok) return;

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Videos,
      quality: 1,
      videoMaxDuration: 60,
    });

    if (!result.canceled) {
      const a = result.assets[0];
      setVideoUri(a.uri);
      setVideoDurationMs(typeof a.duration === "number" ? a.duration : null);
    }
  };

  const pickFromLibrary = async () => {
    const ok = await ensureLibraryPermission();
    if (!ok) return;

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Videos,
      quality: 1,
    });

    if (!result.canceled) {
      const a = result.assets[0];
      setVideoUri(a.uri);
      setVideoDurationMs(typeof a.duration === "number" ? a.duration : null);
    }
  };

  async function uploadVideoGetPublicUrl(userId: string) {
    if (!videoUri || !missionId) throw new Error("No video selected");

    const durationMs = videoDurationMs ?? 0;
    if (durationMs < 30000) {
      throw new Error("Video must be at least 30 seconds.");
    }

    // required path convention:
    // growth-mission-videos/<user_id>/<mission_id>/<uuid>.mp4
    const fileName = `${Date.now()}-${Math.random().toString(16).slice(2)}.mp4`;
    const objectPath = `${userId}/${missionId}/${fileName}`;

    const resp = await fetch(videoUri);
    const blob = await resp.blob();

    const { error: upErr } = await supabase.storage
      .from(BUCKET)
      .upload(objectPath, blob as any, {
        contentType: "video/mp4",
        upsert: false,
      });

    if (upErr) throw upErr;

    const { data } = supabase.storage.from(BUCKET).getPublicUrl(objectPath);
    return { publicUrl: data.publicUrl, objectPath };
  }

  async function attachVideoToLatestAward(userId: string, publicUrl: string, objectPath: string) {
    // RPC inserts challenge_activity. We attach video afterward to the newest row.
    const { data: row, error } = await supabase
      .from("challenge_activity")
      .select("id, metadata")
      .eq("user_id", userId)
      .eq("challenge_id", GROWTH_MISSION_CHALLENGE_ID)
      .order("occurred_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error || !row?.id) return;

    const merged = {
      ...(row.metadata || {}),
      growth_mission_id: missionId,
      video_seconds: Math.floor((videoDurationMs ?? 0) / 1000),
      storage_object_path: objectPath,
    };

    await supabase
      .from("challenge_activity")
      .update({
        media_url: publicUrl,
        metadata: merged,
      })
      .eq("id", row.id);
  }

  async function submit() {
    if (!missionId || !mission) return;
    if (submitting) return;

    if (isClosed) {
      Alert.alert("Closed", "Growth Missions are closed.");
      return;
    }

    setSubmitting(true);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user?.id) {
        Alert.alert("Not signed in", "Please sign in and try again.");
        setSubmitting(false);
        return;
      }

      // Upload first (enforces 30s minimum)
      const { publicUrl, objectPath } = await uploadVideoGetPublicUrl(user.id);

      // Submit mission (awards points)
      const { error: rpcErr } = await supabase.rpc("submit_growth_mission", {
        p_growth_mission_id: missionId,
      });

      if (rpcErr) {
        // If they already completed, they will see this message.
        Alert.alert("Couldn’t submit", rpcErr.message || "Please try again.");
        setSubmitting(false);
        return;
      }

      // Attach video URL to the award activity row (no DB changes needed)
      await attachVideoToLatestAward(user.id, publicUrl, objectPath);

      setAlreadyCompleted(true);
      Alert.alert("Completed ✅", "Mission submitted and points awarded.", [
        { text: "OK", onPress: () => router.back() },
      ]);
    } catch (e: any) {
      Alert.alert("Couldn’t submit", e?.message || "Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  if (!missionId) {
    return (
      <View style={styles.container}>
        <AppHeader />
        <View style={styles.infoCard}>
          <Text style={styles.infoTitle}>Missing mission</Text>
          <Text style={styles.infoSub}>No mission id was provided.</Text>
        </View>

        <View style={styles.bottomBar}>
          <View style={styles.bottomButtonRow}>
            <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
              <Text style={styles.backIcon}>⬅️</Text>
              <Text style={styles.backText}>Back</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.backButton} onPress={() => router.push("/main")}>
              <Text style={styles.backIcon}>🏠</Text>
              <Text style={styles.backText}>Home</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <AppHeader />

      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          <View style={styles.headerText}>
            <Text style={styles.icon}>🚀</Text>
            <Text style={styles.title}>{loading ? "Loading…" : mission?.title || "Growth Mission"}</Text>

            <Text style={styles.subtitle}>
              <Text style={styles.subtitleBold}>
                Worth {mission?.points ?? 100} points{"\n"}
              </Text>
              Upload a 30–60 second video showing you completed this mission.
              {isClosed ? " (Closed)" : ""}
            </Text>
          </View>

          {!loading && !mission ? (
            <View style={styles.infoCard}>
              <Text style={styles.infoTitle}>Not found</Text>
              <Text style={styles.infoSub}>This mission may have been removed.</Text>
            </View>
          ) : null}

          {!!mission?.description && (
            <View style={styles.instructionsCard}>
              <Text style={styles.instructionsTitle}>Instructions</Text>
              <Text style={styles.instructionsText}>{mission.description}</Text>
            </View>
          )}

          <View style={styles.videoSection}>
            <Text style={styles.videoLabel}>Video (required)</Text>

            <View style={styles.videoButtons}>
              <TouchableOpacity style={styles.videoButton} onPress={pickFromCamera} disabled={alreadyCompleted || isClosed}>
                <Text style={styles.videoIcon}>🎥</Text>
                <Text style={styles.videoText}>Record Video</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.videoButton} onPress={pickFromLibrary} disabled={alreadyCompleted || isClosed}>
                <Text style={styles.videoIcon}>📁</Text>
                <Text style={styles.videoText}>Upload Video</Text>
              </TouchableOpacity>
            </View>

            {videoUri ? (
              <Text style={styles.videoSelected}>
                Video attached
                {typeof videoDurationMs === "number"
                  ? ` • ${Math.floor(videoDurationMs / 1000)}s`
                  : ""}
              </Text>
            ) : null}

            {alreadyCompleted ? (
              <Text style={styles.lockedText}>✅ Completed (locked)</Text>
            ) : isClosed ? (
              <Text style={styles.lockedText}>Closed</Text>
            ) : null}
          </View>

          <TouchableOpacity
            style={[styles.submitButton, (!canSubmit || submitting) && styles.submitDisabled]}
            disabled={!canSubmit || submitting}
            onPress={submit}
          >
            <Text style={styles.submitText}>{submitting ? "Submitting..." : "Submit Mission"}</Text>
          </TouchableOpacity>

          <View style={{ height: 120 }} />
        </ScrollView>
      </KeyboardAvoidingView>

      <View style={styles.bottomBar}>
        <View style={styles.bottomButtonRow}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Text style={styles.backIcon}>⬅️</Text>
            <Text style={styles.backText}>Back</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.backButton} onPress={() => router.push("/main")}>
            <Text style={styles.backIcon}>🏠</Text>
            <Text style={styles.backText}>Home</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
    paddingTop: Layout.topScreenPadding,
    paddingHorizontal: Spacing.screenPadding,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  headerText: {
    alignItems: "center",
    marginBottom: 20,
  },
  icon: {
    fontSize: 28,
    marginBottom: 6,
  },
  title: {
    fontSize: Typography.greeting.fontSize,
    fontWeight: Typography.greeting.fontWeight,
    color: Colors.textPrimary,
    textAlign: "center",
  },
  subtitle: {
    fontSize: Typography.quote.fontSize,
    color: Colors.textSecondary,
    textAlign: "center",
    marginTop: 6,
    lineHeight: 20,
  },
  subtitleBold: {
    fontWeight: "700",
    color: Colors.textPrimary,
  },

  instructionsCard: {
    backgroundColor: "rgba(255,255,255,0.08)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    borderRadius: Radius.card,
    padding: 14,
    marginBottom: 16,
  },
  instructionsTitle: {
    color: Colors.textPrimary,
    fontSize: 16,
    fontWeight: "900",
    marginBottom: 8,
    textAlign: "center",
  },
  instructionsText: {
    color: Colors.textSecondary,
    fontSize: 14,
    lineHeight: 20,
  },

  videoSection: {
    marginTop: 6,
    marginBottom: 20,
  },
  videoLabel: {
    color: Colors.textSecondary,
    marginBottom: 8,
  },
  videoButtons: {
    flexDirection: "row",
    gap: 12,
  },
  videoButton: {
    flex: 1,
    backgroundColor: Colors.cards.goals,
    borderRadius: Radius.card,
    paddingVertical: 14,
    alignItems: "center",
    opacity: 1,
  },
  videoIcon: {
    fontSize: 20,
    marginBottom: 4,
  },
  videoText: {
    color: Colors.textPrimary,
    fontWeight: "700",
  },
  videoSelected: {
    marginTop: 8,
    color: Colors.textSecondary,
    fontSize: 12,
  },
  lockedText: {
    marginTop: 10,
    color: Colors.textSecondary,
    fontSize: 12,
    fontWeight: "800",
  },

  submitButton: {
    backgroundColor: Colors.cards.complete,
    paddingVertical: 14,
    borderRadius: Radius.card,
    alignItems: "center",
  },
  submitDisabled: {
    opacity: 0.4,
  },
  submitText: {
    color: Colors.textPrimary,
    fontWeight: "700",
    fontSize: 16,
  },

  infoCard: {
    backgroundColor: "rgba(255,255,255,0.08)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    borderRadius: Radius.card,
    padding: 16,
    marginTop: 16,
  },
  infoTitle: {
    color: Colors.textPrimary,
    fontSize: 18,
    fontWeight: "800",
    marginBottom: 6,
    textAlign: "center",
  },
  infoSub: {
    color: Colors.textSecondary,
    fontSize: 14,
    lineHeight: 18,
    textAlign: "center",
  },

  bottomBar: {
    position: "absolute",
    bottom: Layout.bottomNavSpacing,
    left: Spacing.screenPadding,
    right: Spacing.screenPadding,
    alignItems: "center",
  },
  bottomButtonRow: {
    flexDirection: "row",
    gap: 16,
  },
  backButton: {
    ...Components.backButton,
    flexDirection: "row",
    alignItems: "center",
  },
  backIcon: {
    fontSize: 18,
    marginRight: 8,
  },
  backText: {
    color: Colors.textPrimary,
    fontSize: 16,
    fontWeight: "700",
  },
});
