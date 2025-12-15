// app/challenges/gratitude-journal/history.tsx

import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
    ActivityIndicator,
    ScrollView,
    Share,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import { AppHeader } from "../../../components/AppHeader";
import {
    Colors,
    Components,
    Layout,
    Radius,
    Spacing,
    Typography,
} from "../../../constants/theme";
import { supabase } from "../../../lib/supabase";

const GRATITUDE_CHALLENGE_ID = "REPLACE_WITH_GRATITUDE_CHALLENGE_ID";

type Entry = {
  id: string;
  occurred_date: string;
  metadata: {
    text?: string;
    set_as_goal?: boolean;
    goal_type?: string;
  };
};

export default function GratitudeHistoryScreen() {
  const router = useRouter();
  const [entries, setEntries] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadEntries();
  }, []);

  async function loadEntries() {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setLoading(false);
      return;
    }

    const { data } = await supabase
      .from("challenge_activity")
      .select("id, occurred_date, metadata")
      .eq("user_id", user.id)
      .eq("challenge_id", GRATITUDE_CHALLENGE_ID)
      .order("occurred_date", { ascending: false });

    if (data) setEntries(data);
    setLoading(false);
  }

  function formatDate(dateStr: string) {
    return new Date(dateStr).toLocaleDateString(undefined, {
      weekday: "long",
      month: "long",
      day: "numeric",
      year: "numeric",
    });
  }

  async function handleShareAll() {
    if (entries.length === 0) return;

    let message = "My Gratitude Journal\n\n";

    entries.forEach((entry) => {
      message += `${formatDate(entry.occurred_date)}\n`;
      message += `${entry.metadata?.text || ""}\n`;

      if (entry.metadata?.set_as_goal && entry.metadata?.goal_type) {
        message += `Saved as goal: ${entry.metadata.goal_type}\n`;
      }

      message += "\n---\n\n";
    });

    await Share.share({ message });
  }

  return (
    <View style={styles.container}>
      <AppHeader />

      <View style={styles.headerText}>
        <Text style={styles.title}>Past Gratitude Entries</Text>
        <Text style={styles.subtitle}>
          Review or export your entries
        </Text>
      </View>

      <TouchableOpacity
        style={styles.exportButton}
        onPress={handleShareAll}
      >
        <Text style={styles.exportText}>Export All Entries</Text>
      </TouchableOpacity>

      {loading ? (
        <ActivityIndicator color={Colors.textSecondary} />
      ) : (
        <ScrollView contentContainerStyle={styles.list}>
          {entries.map((entry) => (
            <TouchableOpacity
              key={entry.id}
              style={styles.entryButton}
              onPress={() =>
                router.push(
                  `/challenges/gratitude-journal/history/${entry.id}`
                )
              }
            >
              <Text style={styles.entryText}>
                {formatDate(entry.occurred_date)}
              </Text>
            </TouchableOpacity>
          ))}

          {entries.length === 0 && (
            <Text style={styles.emptyText}>
              You haven’t added any gratitude entries yet.
            </Text>
          )}
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
  },

  subtitle: {
    fontSize: Typography.quote.fontSize,
    color: Colors.textSecondary,
    textAlign: "center",
  },

  exportButton: {
    backgroundColor: Colors.cards.complete,
    borderRadius: Radius.card,
    paddingVertical: 12,
    alignItems: "center",
    marginBottom: 16,
  },

  exportText: {
    color: Colors.textPrimary,
    fontSize: 15,
    fontWeight: "700",
  },

  list: {
    paddingBottom: 180,
    gap: 12,
  },

  entryButton: {
    backgroundColor: Colors.cards.messages,
    borderRadius: Radius.card,
    paddingVertical: 16,
    alignItems: "center",
  },

  entryText: {
    color: Colors.textPrimary,
    fontSize: 15,
    fontWeight: "700",
  },

  emptyText: {
    marginTop: 40,
    textAlign: "center",
    color: Colors.textSecondary,
    fontSize: 14,
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
