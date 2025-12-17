import { useRouter, type Href } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { AppHeader } from "../../components/AppHeader";
import {
  Colors,
  Components,
  Layout,
  Radius,
  Spacing,
  Typography,
} from "../../constants/theme";
import { supabase } from "../../lib/supabase";

type EventInviteRow = {
  status: string | null;
  events: {
    id: string;
    title: string | null;
    start_time: string;
    end_time: string;
    challenge_id: string | null;
    cancelled_at: string | null;
  } | null;
};

type EventListItem = {
  id: string;
  title: string;
  start_time: string;
  end_time: string;
  challenge_id: string | null;
  status: string | null;
};

const CHALLENGE_ID_LUNCH_LEARN = "433932cd-1119-4faa-9216-134ea4778223";
const CHALLENGE_ID_TRAINING = "f4218098-4bde-421b-8e46-067090a28776";

export default function EventsListScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [events, setEvents] = useState<EventListItem[]>([]);

  useEffect(() => {
    loadEvents();
  }, []);

  async function loadEvents() {
    setLoading(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setEvents([]);
      setLoading(false);
      return;
    }

    const nowIso = new Date().toISOString();

    const { data } = await supabase
      .from("event_invites")
      .select(
        `
        status,
        events (
          id,
          title,
          start_time,
          end_time,
          challenge_id,
          cancelled_at
        )
      `
      )
      .eq("user_id", user.id)
      .is("events.cancelled_at", null)
      .order("start_time", { ascending: true, foreignTable: "events" });

    const mapped =
      (data as EventInviteRow[] | null)
        ?.map((row) => {
          if (!row.events) return null;
          if (row.events.end_time < nowIso) return null; // hide after event ends

          return {
            id: row.events.id,
            title: row.events.title || "Event",
            start_time: row.events.start_time,
            end_time: row.events.end_time,
            challenge_id: row.events.challenge_id,
            status: row.status,
          };
        })
        .filter(Boolean) as EventListItem[];

    setEvents(mapped);
    setLoading(false);
  }

  function pointsLabel(challengeId: string | null) {
    if (challengeId === CHALLENGE_ID_TRAINING) return "+50";
    if (challengeId === CHALLENGE_ID_LUNCH_LEARN) return "+150";
    return "";
  }

  function formatDate(iso: string) {
    return new Date(iso).toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  }

  function formatTime(iso: string) {
    return new Date(iso).toLocaleTimeString(undefined, {
      hour: "numeric",
      minute: "2-digit",
    });
  }

  return (
    <View style={styles.container}>
      <AppHeader />

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator />
        </View>
      ) : events.length === 0 ? (
        <View style={styles.center}>
          <Text style={styles.emptyTitle}>No upcoming events</Text>
          <Text style={styles.mutedText}>
            You don’t have any scheduled events right now.
          </Text>
        </View>
      ) : (
        <FlatList
          data={events}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => {
            const checkedIn = item.status === "attended";

            return (
              <TouchableOpacity
                style={[
                  styles.eventCard,
                  checkedIn && styles.checkedInCard,
                ]}
                onPress={() =>
                  router.push((`/events/${item.id}`) as Href)
                }
              >
                <View style={styles.left}>
                  <Text style={styles.title}>{item.title}</Text>
                  <Text style={styles.sub}>
                    {formatDate(item.start_time)} •{" "}
                    {formatTime(item.start_time)}
                  </Text>
                  {checkedIn && (
                    <Text style={styles.checkedInText}>Checked In</Text>
                  )}
                </View>
                <Text style={styles.points}>
                  {pointsLabel(item.challenge_id)}
                </Text>
              </TouchableOpacity>
            );
          }}
        />
      )}

      <View style={styles.bottomBar}>
        <View style={styles.bottomButtonRow}>
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

  list: {
    paddingTop: 24,
    paddingBottom: 140,
  },

  eventCard: {
    backgroundColor: "rgba(120, 90, 160, 0.18)",
    borderRadius: Radius.card,
    padding: 16,
    marginBottom: 14,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(180,140,220,0.35)",
  },

  checkedInCard: {
    opacity: 0.55,
  },

  left: {
    flex: 1,
    paddingRight: 12,
  },

  title: {
    fontSize: 16,
    fontWeight: "700",
    color: Colors.textPrimary,
    marginBottom: 4,
  },

  sub: {
    fontSize: 13,
    color: Colors.textSecondary,
  },

  checkedInText: {
    marginTop: 6,
    fontSize: 12,
    fontWeight: "700",
    color: Colors.textSecondary,
  },

  points: {
    fontSize: 16,
    fontWeight: "800",
    color: Colors.cards.complete,
  },

  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },

  emptyTitle: {
    fontSize: Typography.greeting.fontSize,
    fontWeight: Typography.greeting.fontWeight,
    color: Colors.textPrimary,
    marginBottom: 8,
    textAlign: "center",
  },

  mutedText: {
    color: Colors.textSecondary,
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
