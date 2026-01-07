// app/admin/events/edit/[id].tsx
// FULL FILE REPLACEMENT
// Fix: simplest possible event load + show the received id if not found

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
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

type ProfileRow = {
  id: string;
  full_name: string | null;
  department: string | null;
  role?: string | null;
};

type EventRow = {
  id: any;
  title: string | null;
  type: string | null;
  start_time: string | null;
  end_time: string | null;
  location: string | null;
  description?: string | null;
  leader_user_id: string | null;
};

function normalizeId(raw: unknown): string | null {
  if (!raw) return null;
  if (typeof raw === "string") return raw;
  if (Array.isArray(raw) && typeof raw[0] === "string") return raw[0];
  return null;
}

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

function PeoplePicker({
  title,
  people,
  selectedId,
  onPick,
  onClose,
}: {
  title: string;
  people: ProfileRow[];
  selectedId: string | null;
  onPick: (id: string) => void;
  onClose: () => void;
}) {
  return (
    <View style={styles.modalOverlay}>
      <View style={styles.modalCard}>
        <Text style={styles.modalTitle}>{title}</Text>

        <ScrollView style={{ maxHeight: 460 }} keyboardShouldPersistTaps="handled">
          {people.map((p) => {
            const name = (p.full_name || "Unknown").trim();
            const dept = (p.department || "").trim();
            const checked = p.id === selectedId;

            return (
              <TouchableOpacity
                key={p.id}
                style={[styles.personRow, checked && styles.personRowActive]}
                onPress={() => onPick(p.id)}
                activeOpacity={0.85}
              >
                <View style={{ flex: 1 }}>
                  <Text style={styles.personName}>{name}</Text>
                  {!!dept && <Text style={styles.personDept}>{dept}</Text>}
                </View>
                <Text style={styles.personCheck}>{checked ? "✅" : "➡️"}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        <TouchableOpacity style={styles.modalCancel} onPress={onClose}>
          <Text style={styles.modalCancelText}>Done</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

export default function AdminEventEditScreen() {
  const params = useLocalSearchParams();
  const router = useRouter();

  const id = normalizeId((params as any)?.id);

  const [checking, setChecking] = useState(true);
  const [adminOk, setAdminOk] = useState(false);

  const [loading, setLoading] = useState(true);
  const [event, setEvent] = useState<EventRow | null>(null);

  const [profiles, setProfiles] = useState<ProfileRow[]>([]);
  const [loadingPeople, setLoadingPeople] = useState(true);

  const [pickLeaderOpen, setPickLeaderOpen] = useState(false);
  const [leaderDraftId, setLeaderDraftId] = useState<string | null>(null);
  const [savingLeader, setSavingLeader] = useState(false);

  const peopleLabelById = useMemo(() => {
    const m = new Map<string, string>();
    profiles.forEach((p) => m.set(p.id, (p.full_name || "Unknown").trim()));
    return m;
  }, [profiles]);

  const leaderName = useMemo(() => {
    const currentId = leaderDraftId ?? event?.leader_user_id ?? null;
    if (!currentId) return "None";
    return peopleLabelById.get(currentId) || "Leader selected";
  }, [event, leaderDraftId, peopleLabelById]);

  useEffect(() => {
    (async () => {
      setChecking(true);

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user?.id) {
        setChecking(false);
        setAdminOk(false);
        Alert.alert("Not signed in", "Please sign in and try again.");
        router.replace("/login");
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
        return;
      }

      setAdminOk(true);
      setChecking(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    (async () => {
      setLoadingPeople(true);
      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name, department, role")
        .order("full_name", { ascending: true });

      if (error) {
        setProfiles([]);
        setLoadingPeople(false);
        return;
      }

      setProfiles((data as any) || []);
      setLoadingPeople(false);
    })();
  }, []);

  useEffect(() => {
    if (!id) {
      setLoading(false);
      setEvent(null);
      return;
    }
    loadEvent(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function loadEvent(eventId: string) {
    setLoading(true);

    // ✅ simplest possible load
    const { data, error } = await supabase
      .from("events")
      .select("*")
      .eq("id", eventId)
      .maybeSingle();

    if (error || !data) {
      setEvent(null);
      setLeaderDraftId(null);
      setLoading(false);
      return;
    }

    setEvent(data as any);
    setLeaderDraftId((data as any)?.leader_user_id ?? null);
    setLoading(false);
  }

  async function saveLeader() {
    if (!event?.id) return;
    if (savingLeader) return;

    setSavingLeader(true);

    const { error } = await supabase
      .from("events")
      .update({ leader_user_id: leaderDraftId ?? null })
      .eq("id", event.id);

    setSavingLeader(false);

    if (error) {
      Alert.alert("Couldn’t update leader", error.message || "Please try again.");
      return;
    }

    Alert.alert("Saved", "Leader updated.");
    loadEvent(String(event.id));
  }

  if (!adminOk && checking) {
    return (
      <View style={styles.container}>
        <AppHeader />
        <Text style={styles.title}>Event Detail</Text>
        <ActivityIndicator color={Colors.textPrimary} />
      </View>
    );
  }

  if (!adminOk) return null;

  if (loading) {
    return (
      <View style={styles.container}>
        <AppHeader />
        <Text style={styles.title}>Event Detail</Text>
        <ActivityIndicator color={Colors.textPrimary} />
        <BottomNav router={router} />
      </View>
    );
  }

  if (!event) {
    return (
      <View style={styles.container}>
        <AppHeader />
        <Text style={styles.title}>Event Detail</Text>
        <View style={styles.card}>
          <Text style={styles.value}>Event not found.</Text>

          {/* ✅ show what id the screen received */}
          <Text style={styles.debugLine}>Received id: {String(id ?? "null")}</Text>

          <TouchableOpacity
            style={[styles.actionButton, { marginTop: 14 }]}
            onPress={() => id && loadEvent(id)}
            activeOpacity={0.9}
            disabled={!id}
          >
            <Text style={styles.actionText}>Try Again</Text>
          </TouchableOpacity>
        </View>
        <BottomNav router={router} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <AppHeader />
      <Text style={styles.title}>Event Detail</Text>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>{(event.title || "Untitled Event").trim()}</Text>

        <Text style={styles.label}>Type</Text>
        <Text style={styles.value}>{prettyType(event.type)}</Text>

        <Text style={styles.label}>Start</Text>
        <Text style={styles.value}>{prettyWhen(event.start_time)}</Text>

        <Text style={styles.label}>End</Text>
        <Text style={styles.value}>{prettyWhen(event.end_time)}</Text>

        <Text style={styles.label}>Location</Text>
        <Text style={styles.value}>{(event.location || "").trim() || "—"}</Text>

        {!!(event.description || "").trim() && (
          <>
            <Text style={styles.label}>Description</Text>
            <Text style={styles.value}>{(event.description || "").trim()}</Text>
          </>
        )}

        <View style={styles.divider} />

        <Text style={styles.label}>Leader</Text>

        <TouchableOpacity
          style={[styles.dropdownButton, { backgroundColor: Colors.cards.goals }]}
          onPress={() => setPickLeaderOpen(true)}
          activeOpacity={0.85}
          disabled={loadingPeople}
        >
          <Text style={[styles.dropdownText, !leaderName && styles.dropdownPlaceholder]}>
            {leaderName || (loadingPeople ? "Loading…" : "Select leader")}
          </Text>
          <Text style={styles.dropdownChevron}>▾</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionButton, savingLeader && { opacity: 0.6 }]}
          onPress={saveLeader}
          activeOpacity={0.9}
          disabled={savingLeader}
        >
          <Text style={styles.actionText}>{savingLeader ? "Saving…" : "Save Leader"}</Text>
        </TouchableOpacity>
      </View>

      <BottomNav router={router} />

      <Modal visible={pickLeaderOpen} transparent animationType="fade" onRequestClose={() => setPickLeaderOpen(false)}>
        <PeoplePicker
          title="Pick a leader"
          people={profiles}
          selectedId={leaderDraftId}
          onPick={(pickedId) => {
            setLeaderDraftId(pickedId);
            setPickLeaderOpen(false);
          }}
          onClose={() => setPickLeaderOpen(false)}
        />
      </Modal>
    </View>
  );
}

function BottomNav({ router }: { router: any }) {
  return (
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
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
    paddingTop: Layout.topScreenPadding,
    paddingHorizontal: Spacing.screenPadding,
  },

  title: {
    fontSize: Typography.greeting.fontSize,
    fontWeight: Typography.greeting.fontWeight,
    color: Colors.textPrimary,
    textAlign: "center",
    marginBottom: 18,
  },

  card: {
    margin: 16,
    padding: 16,
    backgroundColor: "rgba(255,255,255,0.08)",
    borderWidth: 2,
    borderColor: Colors.cards.complete,
    borderRadius: Radius.card,
  },

  cardTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: Colors.textPrimary,
    marginBottom: 12,
    textAlign: "center",
  },

  label: {
    fontSize: 12,
    fontWeight: "600",
    color: Colors.textSecondary,
    marginTop: 10,
  },

  value: {
    fontSize: 14,
    color: Colors.textPrimary,
    marginTop: 2,
  },

  debugLine: {
    marginTop: 10,
    color: "rgba(255,255,255,0.75)",
    fontWeight: "800",
    fontSize: 12,
    textAlign: "center",
  },

  divider: {
    marginTop: 14,
    marginBottom: 10,
    height: 1,
    backgroundColor: "rgba(255,255,255,0.10)",
  },

  dropdownButton: {
    borderRadius: Radius.card,
    paddingVertical: 14,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 8,
  },

  dropdownText: {
    color: Colors.textPrimary,
    fontWeight: "800",
    flex: 1,
  },

  dropdownPlaceholder: {
    color: Colors.textSecondary,
    fontWeight: "700",
  },

  dropdownChevron: {
    color: Colors.textPrimary,
    marginLeft: 10,
    fontSize: 16,
    opacity: 0.8,
  },

  actionButton: {
    marginTop: 14,
    backgroundColor: Colors.cards.complete,
    borderRadius: Radius.card,
    paddingVertical: 12,
    alignItems: "center",
  },

  actionText: {
    color: Colors.textPrimary,
    fontWeight: "900",
    textAlign: "center",
    fontSize: 16,
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

  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.55)",
    padding: Spacing.screenPadding,
    justifyContent: "center",
  },

  modalCard: {
    backgroundColor: Colors.background,
    borderRadius: Radius.card,
    padding: 14,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
  },

  modalTitle: {
    color: Colors.textPrimary,
    fontSize: 16,
    fontWeight: "900",
    marginBottom: 8,
    textAlign: "center",
  },

  modalCancel: {
    marginTop: 6,
    paddingVertical: 12,
    borderRadius: Radius.card,
    backgroundColor: "rgba(255,255,255,0.08)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    alignItems: "center",
  },

  modalCancelText: {
    color: Colors.textPrimary,
    fontWeight: "900",
  },

  personRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "rgba(255,255,255,0.08)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    borderRadius: Radius.card,
    paddingVertical: 12,
    paddingHorizontal: 12,
    marginBottom: 10,
  },

  personRowActive: {
    borderColor: "rgba(255,255,255,0.28)",
  },

  personName: {
    color: Colors.textPrimary,
    fontWeight: "900",
  },

  personDept: {
    color: Colors.textSecondary,
    marginTop: 2,
    fontWeight: "700",
    fontSize: 12,
  },

  personCheck: {
    fontSize: 18,
    marginLeft: 8,
  },
});
