// app/admin/events/reassign-leader.tsx
// FULL FILE REPLACEMENT
// Fix: navigate using pathname + params so the event id arrives correctly on iPhone Expo

import { AppHeader } from "@/components/AppHeader";
import {
  Colors,
  Components,
  Layout,
  Radius,
  Spacing,
  Typography,
} from "@/constants/theme";
import { supabase } from "@/lib/supabase";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

type EventRow = {
  id: string;
  title: string | null;
  type: string | null;
  start_time: string | null;
  location: string | null;
  leader_user_id: string | null;
  leader?: { full_name: string | null } | null;
};

function prettyWhen(iso: string | null) {
  if (!iso) return "Unknown time";
  const dt = new Date(iso);
  return dt.toLocaleString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function prettyType(t: string | null) {
  if (!t) return "Event";
  if (t === "ftg_training") return "Training";
  if (t === "lunch_learn") return "Lunch & Learn";
  return t.replaceAll("_", " ");
}

export default function ReassignLeaderListScreen() {
  const router = useRouter();

  const [checking, setChecking] = useState(true);
  const [adminOk, setAdminOk] = useState(false);

  const [loading, setLoading] = useState(true);
  const [events, setEvents] = useState<EventRow[]>([]);
  const [filter, setFilter] = useState<"upcoming" | "no_leader">("upcoming");

  const load = useCallback(async () => {
    setLoading(true);

    // Admin gate
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user?.id) {
      setChecking(false);
      setAdminOk(false);
      Alert.alert("Not signed in", "Please sign in and try again.");
      router.replace("/login");
      setLoading(false);
      return;
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();

    const role = (profile?.role || "").toLowerCase();
    if (role !== "admin") {
      setChecking(false);
      setAdminOk(false);
      Alert.alert("Admins only", "You don’t have access to this page.", [
        { text: "OK", onPress: () => router.back() },
      ]);
      setLoading(false);
      return;
    }

    setAdminOk(true);
    setChecking(false);

    const nowIso = new Date().toISOString();

    const { data, error } = await supabase
      .from("events")
      .select(
        `
        id,
        title,
        type,
        start_time,
        location,
        leader_user_id,
        leader:profiles!events_leader_user_id_fkey (
          full_name
        )
      `
      )
      .gte("start_time", nowIso)
      .order("start_time", { ascending: true });

    if (error) {
      setEvents([]);
      setLoading(false);
      return;
    }

    setEvents((data as any) || []);
    setLoading(false);
  }, [router]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const visible = useMemo(() => {
    if (filter === "no_leader") return events.filter((e) => !e.leader_user_id);
    return events;
  }, [events, filter]);

  if (!adminOk && checking) {
    return (
      <View style={styles.container}>
        <AppHeader />
        <View style={styles.headerText}>
          <Text style={styles.title}>Re-Assign Event Leader</Text>
          <Text style={styles.subtitle}>Checking access…</Text>
        </View>
        <ActivityIndicator color={Colors.textPrimary} />
      </View>
    );
  }

  if (!adminOk) return null;

  return (
    <View style={styles.container}>
      <AppHeader />

      <View style={styles.headerText}>
        <Text style={styles.title}>Re-Assign Event Leader</Text>
        <Text style={styles.subtitle}>
          Tap an event to assign or change the leader.
        </Text>
      </View>

      <View style={styles.filterRow}>
        <TouchableOpacity
          style={[
            styles.filterPill,
            filter === "upcoming" && styles.filterPillActive,
          ]}
          onPress={() => setFilter("upcoming")}
          activeOpacity={0.85}
        >
          <Text
            style={[
              styles.filterText,
              filter === "upcoming" && styles.filterTextActive,
            ]}
          >
            Upcoming
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.filterPill,
            filter === "no_leader" && styles.filterPillActive,
          ]}
          onPress={() => setFilter("no_leader")}
          activeOpacity={0.85}
        >
          <Text
            style={[
              styles.filterText,
              filter === "no_leader" && styles.filterTextActive,
            ]}
          >
            No Leader
          </Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={{ paddingTop: 20 }}>
          <ActivityIndicator color={Colors.textPrimary} />
        </View>
      ) : visible.length === 0 ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyText}>
            {filter === "no_leader"
              ? "No upcoming events without a leader."
              : "No upcoming events found."}
          </Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={{ paddingBottom: 140 }}
          showsVerticalScrollIndicator={false}
        >
          {visible.map((ev) => {
            const leaderName = (ev.leader?.full_name || "").trim() || "None";

            return (
              <TouchableOpacity
                key={ev.id}
                style={styles.eventCard}
                onPress={() =>
                  router.push({
                    pathname: "/admin/events/edit/[id]" as any,
                    params: { id: ev.id },
                  })
                }
                activeOpacity={0.9}
              >
                <View style={styles.eventTopRow}>
                  <Text style={styles.eventTitle}>
                    {(ev.title || "Untitled Event").trim()}
                  </Text>
                  <Text style={styles.goArrow}>➡️</Text>
                </View>

                <Text style={styles.eventMeta}>
                  {prettyType(ev.type)} • {prettyWhen(ev.start_time)}
                </Text>

                {!!(ev.location || "").trim() && (
                  <Text style={styles.eventMeta2}>{ev.location}</Text>
                )}

                <View style={styles.leaderRow}>
                  <Text style={styles.leaderLabel}>Leader</Text>
                  <Text style={styles.leaderValue}>{leaderName}</Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      )}

      <View style={styles.bottomBar}>
        <View style={styles.bottomButtonRow}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Text style={styles.backIcon}>⬅️</Text>
            <Text style={styles.backText}>Back</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.push("/main")}
          >
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
    marginBottom: 12,
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

  filterRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 10,
  },

  filterPill: {
    flex: 1,
    backgroundColor: "rgba(255,255,255,0.08)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    borderRadius: Radius.card,
    paddingVertical: 10,
    alignItems: "center",
  },

  filterPillActive: {
    backgroundColor: Colors.cards.goals,
    borderColor: "rgba(255,255,255,0.20)",
  },

  filterText: {
    color: Colors.textSecondary,
    fontWeight: "900",
    fontSize: 12,
  },

  filterTextActive: {
    color: Colors.textPrimary,
  },

  eventCard: {
    backgroundColor: "rgba(255,255,255,0.08)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    borderRadius: Radius.card,
    padding: 14,
    marginBottom: 12,
  },

  eventTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },

  eventTitle: {
    color: Colors.textPrimary,
    fontWeight: "900",
    fontSize: 16,
    flex: 1,
  },

  goArrow: {
    fontSize: 16,
    opacity: 0.9,
  },

  eventMeta: {
    marginTop: 6,
    color: Colors.textSecondary,
    fontWeight: "800",
    fontSize: 12,
  },

  eventMeta2: {
    marginTop: 6,
    color: "rgba(255,255,255,0.70)",
    fontWeight: "700",
    fontSize: 12,
  },

  leaderRow: {
    marginTop: 10,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.10)",
  },

  leaderLabel: {
    color: Colors.textSecondary,
    fontWeight: "900",
    fontSize: 12,
  },

  leaderValue: {
    color: Colors.textPrimary,
    fontWeight: "900",
    fontSize: 12,
  },

  emptyCard: {
    marginTop: 10,
    backgroundColor: "rgba(255,255,255,0.08)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    borderRadius: Radius.card,
    padding: 16,
    alignItems: "center",
  },

  emptyText: {
    color: Colors.textSecondary,
    fontWeight: "800",
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
    fontWeight: "900",
  },
});
