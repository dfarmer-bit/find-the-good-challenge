// app/challenges/gratitude-journal/history/[id].tsx

import { useLocalSearchParams, useRouter } from "expo-router";
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
import { AppHeader } from "../../../../components/AppHeader";
import {
    Colors,
    Components,
    Layout,
    Radius,
    Spacing,
    Typography,
} from "../../../../constants/theme";
import { supabase } from "../../../../lib/supabase";

type Entry = {
  occurred_date: string;
  metadata: {
    text?: string;
    set_as_goal?: boolean;
    goal_type?: string;
  };
};

export default function GratitudeEntryDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();

  const [entry, setEntry] = useState<Entry | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) loadEntry();
  }, [id]);

  async function loadEntry() {
    const { data, error } = await supabase
      .from("challenge_activity")
      .select("occurred_date, metadata")
      .eq("id", id)
      .single();

    if (!error && data) {
      setEntry(data);
    }

    setLoading(false);
  }

  function formatDate(dateStr: string) {
    const date = new Date(dateStr);
    return date.toLocaleDateString(undefined, {
      weekday: "long",
      month: "long",
      day: "numeric",
      year: "numeric",
    });
  }

  async function handleShare() {
    if (!entry?.metadata?.text) return;

    let message = `Gratitude Entry\n\n${formatDate(
      entry.occurred_date
    )}\n\n${entry.metadata.text}`;

    if (entry.metadata.set_as_goal && entry.metadata.goal_type) {
      message += `\n\nSaved as goal: ${entry.metadata.goal_type}`;
    }

    await Share.share({ message });
  }

  return (
    <View style={styles.container}>
      <AppHeader />

      {loading ? (
        <ActivityIndicator color={Colors.textSecondary} />
      ) : entry ? (
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.headerText}>
            <Text style={styles.title}>
              {formatDate(entry.occurred_date)}
            </Text>
            <Text style={styles.subtitle}>Your Gratitude Entry</Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.entryText}>{entry.metadata?.text}</Text>
          </View>

          {entry.metadata?.set_as_goal && entry.metadata?.goal_type && (
            <View style={styles.goalCard}>
              <Text style={styles.goalLabel}>Saved as a Goal</Text>
              <Text style={styles.goalValue}>
                {entry.metadata.goal_type}
              </Text>
            </View>
          )}

          <TouchableOpacity
            style={styles.shareButton}
            onPress={handleShare}
          >
            <Text style={styles.shareText}>Share / Export Entry</Text>
          </TouchableOpacity>
        </ScrollView>
      ) : (
        <Text style={styles.errorText}>Entry not found.</Text>
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

  scrollContent: {
    paddingBottom: 180,
  },

  headerText: {
    alignItems: "center",
    marginBottom: 16,
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
  },

  card: {
    backgroundColor: Colors.cards.journal,
    borderRadius: Radius.card,
    padding: Spacing.cardPadding,
    marginBottom: 16,
  },

  entryText: {
    fontSize: Typography.quote.fontSize,
    color: Colors.textPrimary,
    lineHeight: 22,
  },

  goalCard: {
    backgroundColor: Colors.cards.goals,
    borderRadius: Radius.card,
    padding: Spacing.cardPadding,
    marginBottom: 16,
  },

  goalLabel: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginBottom: 4,
    textAlign: "center",
  },

  goalValue: {
    fontSize: 15,
    fontWeight: "700",
    color: Colors.textPrimary,
    textAlign: "center",
  },

  shareButton: {
    backgroundColor: Colors.cards.messages,
    borderRadius: Radius.card,
    paddingVertical: 14,
    alignItems: "center",
  },

  shareText: {
    color: Colors.textPrimary,
    fontSize: 15,
    fontWeight: "700",
  },

  errorText: {
    textAlign: "center",
    color: Colors.textSecondary,
    marginTop: 40,
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
