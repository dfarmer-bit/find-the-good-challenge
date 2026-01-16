// app/challenges/bonus/growth-missions/index.tsx
// FULL FILE REPLACEMENT

import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { AppHeader } from "@/components/AppHeader";
import { supabase } from "@/lib/supabase";
import { Colors, Components, Layout, Radius, Spacing, Typography } from "@/constants/theme";

type GrowthMission = {
  id: string;
  title: string;
  description: string | null;
  status: string;
  publish_start: string | null;
  publish_end: string | null;
  created_at: string;
};

export default function GrowthMissionsIndexScreen() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [missions, setMissions] = useState<GrowthMission[]>([]);
  const [completedSet, setCompletedSet] = useState<Set<string>>(new Set());
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const closeAt = useMemo(() => new Date("2026-12-01T00:00:00Z").getTime(), []);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    try {
      setLoading(true);
      setErrorMsg(null);

      const userRes = await supabase.auth.getUser();
      const user = userRes.data.user;

      const nowIso = new Date().toISOString();

      const { data: missionData, error: missionErr } = await supabase
        .from("growth_missions")
        .select("id, title, description, status, publish_start, publish_end, created_at")
        .eq("status", "published")
        .or(`publish_start.is.null,publish_start.lte.${nowIso}`)
        .or(`publish_end.is.null,publish_end.gte.${nowIso}`)
        .order("created_at", { ascending: false });

      if (missionErr) throw missionErr;

      let done = new Set<string>();
      if (user) {
        const { data: subData, error: subErr } = await supabase
          .from("growth_mission_submissions")
          .select("growth_mission_id")
          .eq("user_id", user.id);

        if (subErr) throw subErr;
        done = new Set((subData || []).map((s: any) => s.growth_mission_id));
      }

      const filtered = (missionData || []).filter(() => Date.now() < closeAt);

      setMissions(filtered);
      setCompletedSet(done);
    } catch (e: any) {
      setMissions([]);
      setCompletedSet(new Set());
      setErrorMsg(e?.message || "Failed to load missions");
    } finally {
      setLoading(false);
    }
  }

  function goToMission(missionId: string) {
    router.push(
      {
        pathname: "/challenges/bonus/growth-missions/[id]",
        params: { id: missionId },
      } as any
    );
  }

  const openMissions = missions.filter((m) => !completedSet.has(m.id));
  const completedMissions = missions.filter((m) => completedSet.has(m.id));

  return (
    <View style={styles.container}>
      <AppHeader />

      <View style={styles.headerText}>
  <Text style={styles.icon}>🌱</Text>
  <Text style={styles.title}>Growth Missions</Text>
  <Text style={styles.subtitle}>
    <Text style={styles.subtitleBold}>
      +150 Points{"\n"}
    </Text>
    Complete missions to earn bonus points.
  </Text>
</View>


      <ScrollView contentContainerStyle={{ paddingBottom: 120 }} showsVerticalScrollIndicator={false}>
        {loading ? (
          <View style={styles.infoCard}>
            <Text style={styles.infoTitle}>Loading…</Text>
            <Text style={styles.infoSub}>Fetching available missions</Text>
          </View>
        ) : errorMsg ? (
          <View style={styles.infoCard}>
            <Text style={styles.infoTitle}>Couldn’t load missions</Text>
            <Text style={styles.infoSub}>{errorMsg}</Text>

            <TouchableOpacity
              style={[styles.smallButton, { marginTop: 12 }]}
              onPress={load}
              activeOpacity={0.9}
            >
              <Text style={styles.smallButtonText}>Retry</Text>
            </TouchableOpacity>
          </View>
        ) : missions.length === 0 ? (
          <View style={styles.infoCard}>
            <Text style={styles.infoTitle}>No missions right now</Text>
            <Text style={styles.infoSub}>When a mission is posted, it will appear here.</Text>
          </View>
        ) : (
          <>
            {openMissions.length > 0 && <Text style={styles.sectionLabel}>Open</Text>}

            {openMissions.map((m) => (
              <TouchableOpacity
                key={m.id}
                style={[styles.card, { backgroundColor: Colors.cards.goals }]}
                activeOpacity={0.9}
                onPress={() => goToMission(m.id)}
              >
                <LinearGradient
                  colors={["rgba(255,255,255,0.35)", "rgba(255,255,255,0.05)"]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.sideBubble}
                >
                  <Text style={styles.bubbleIcon}>🚀</Text>
                  <Text style={styles.pointsBadge}>+100 pts</Text>
                </LinearGradient>

                <View style={styles.textWrapper}>
                  <Text style={styles.cardTitle}>{m.title}</Text>
                  {!!m.description && (
                    <Text style={styles.cardSub} numberOfLines={2}>
                      {m.description}
                    </Text>
                  )}
                  <Text style={styles.openHint}>Tap to open</Text>
                </View>
              </TouchableOpacity>
            ))}

            {completedMissions.length > 0 && (
              <Text style={[styles.sectionLabel, { marginTop: 14 }]}>Completed</Text>
            )}

            {completedMissions.map((m) => (
              <View
                key={m.id}
                style={[styles.card, { backgroundColor: Colors.cards.complete, opacity: 0.55 }]}
              >
                <LinearGradient
                  colors={["rgba(255,255,255,0.25)", "rgba(255,255,255,0.04)"]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.sideBubble}
                >
                  <Text style={styles.bubbleIcon}>✅</Text>
                  <Text style={styles.pointsBadge}>+100 pts</Text>
                </LinearGradient>

                <View style={styles.textWrapper}>
                  <Text style={styles.cardTitle}>{m.title}</Text>
                  {!!m.description && (
                    <Text style={styles.cardSub} numberOfLines={2}>
                      {m.description}
                    </Text>
                  )}
                  <Text style={styles.completedHint}>Completed (locked)</Text>
                </View>
              </View>
            ))}
          </>
        )}
      </ScrollView>

      <View style={styles.bottomBar}>
        <View style={styles.bottomButtonRow}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Text style={styles.backIcon}>⬅️</Text>
            <Text style={styles.backText}>Back</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.backButton} onPress={() => router.push("/main" as any)}>
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

  headerText: {
    alignItems: "center",
    marginBottom: 18,
  },

  title: {
    fontSize: Typography.greeting.fontSize,
    fontWeight: Typography.greeting.fontWeight,
    color: Colors.textPrimary,
    marginBottom: 4,
    textAlign: "center",
  },

  subtitle: {
    fontSize: Typography.quote.fontSize,
    color: Colors.textSecondary,
    textAlign: "center",
  },

  sectionLabel: {
    color: Colors.textSecondary,
    fontSize: 14,
    fontWeight: "700",
    marginBottom: 10,
    marginTop: 6,
    paddingLeft: 2,
  },

  card: {
    width: "100%",
    minHeight: 120,
    borderRadius: Radius.card,
    justifyContent: "center",
    overflow: "hidden",
    marginBottom: Spacing.gridGap,
  },

  sideBubble: {
    position: "absolute",
    right: 0,
    top: 0,
    bottom: 0,
    width: 96,
    justifyContent: "center",
    alignItems: "center",
  },

  bubbleIcon: {
    fontSize: 36,
  },

  pointsBadge: {
    marginTop: 4,
    fontSize: 12,
    fontWeight: "900",
    color: Colors.textPrimary,
    opacity: 0.95,
  },

  textWrapper: {
    paddingLeft: Spacing.cardPadding,
    paddingRight: 140,
    justifyContent: "center",
    gap: 6,
  },

  cardTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: Colors.textPrimary,
    textAlign: "left",
    flexWrap: "wrap",
  },

  cardSub: {
    color: Colors.textSecondary,
    fontSize: 14,
    lineHeight: 18,
  },

  openHint: {
    color: Colors.textSecondary,
    fontSize: 12,
    fontWeight: "700",
    opacity: 0.9,
  },

  completedHint: {
    color: Colors.textSecondary,
    fontSize: 12,
    fontWeight: "800",
    opacity: 0.95,
  },

  infoCard: {
    backgroundColor: "rgba(255,255,255,0.08)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    borderRadius: Radius.card,
    padding: 16,
  },

  infoTitle: {
    color: Colors.textPrimary,
    fontSize: 18,
    fontWeight: "800",
    marginBottom: 6,
  },

  infoSub: {
    color: Colors.textSecondary,
    fontSize: 14,
    lineHeight: 18,
  },

  smallButton: {
    backgroundColor: "rgba(255,255,255,0.12)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.18)",
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 12,
    alignSelf: "flex-start",
  },
icon: {
  fontSize: 36,
  marginBottom: 6,
},

subtitleBold: {
  fontWeight: "800",
  color: Colors.textPrimary,
},

  smallButtonText: {
    color: Colors.textPrimary,
    fontSize: 14,
    fontWeight: "800",
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
