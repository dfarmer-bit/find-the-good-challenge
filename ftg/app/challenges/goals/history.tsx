import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
    ScrollView,
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

type Goal = {
  id: string;
  title: string;
  note: string;
  completed_at: string;
};

export default function GoalsHistoryScreen() {
  const router = useRouter();
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadHistory();
  }, []);

  async function loadHistory() {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setLoading(false);
      return;
    }

    const { data } = await supabase
      .from("goals")
      .select("id, title, note, completed_at")
      .eq("user_id", user.id)
      .not("completed_at", "is", null)
      .order("completed_at", { ascending: false });

    setGoals(data ?? []);
    setLoading(false);
  }

  return (
    <View style={styles.container}>
      <AppHeader />

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={styles.title}>Completed Goals</Text>
        <Text style={styles.subtitle}>
          Goals you’ve completed from your challenges.
        </Text>

        {loading && (
          <Text style={styles.emptyText}>Loading…</Text>
        )}

        {!loading && goals.length === 0 && (
          <View style={styles.card}>
            <Text style={styles.emptyText}>
              No completed goals yet.
            </Text>
          </View>
        )}

        {goals.map((goal) => (
          <View key={goal.id} style={styles.goalCard}>
            <Text style={styles.goalTitle}>{goal.title}</Text>
            <Text style={styles.goalNote}>{goal.note}</Text>
            <Text style={styles.completedText}>
              Completed
            </Text>
          </View>
        ))}

        <View style={{ height: 140 }} />
      </ScrollView>

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
    paddingBottom: 200,
  },
  title: {
    fontSize: Typography.greeting.fontSize,
    fontWeight: Typography.greeting.fontWeight,
    color: Colors.textPrimary,
    textAlign: "center",
    marginBottom: 6,
  },
  subtitle: {
    fontSize: Typography.quote.fontSize,
    color: Colors.textSecondary,
    textAlign: "center",
    marginBottom: 20,
  },
  card: {
    backgroundColor: Colors.cards.goals,
    borderRadius: Radius.card,
    padding: Spacing.cardPadding,
    alignItems: "center",
  },
  emptyText: {
    color: Colors.textSecondary,
    fontSize: 14,
    fontStyle: "italic",
    textAlign: "center",
  },
  goalCard: {
    backgroundColor: Colors.cards.goals,
    borderRadius: Radius.card,
    padding: Spacing.cardPadding,
    marginBottom: Spacing.gridGap,
    opacity: 0.85,
  },
  goalTitle: {
    color: Colors.textPrimary,
    fontSize: 16,
    fontWeight: "800",
    marginBottom: 6,
  },
  goalNote: {
    color: Colors.textPrimary,
    fontSize: 14,
    lineHeight: 20,
  },
  completedText: {
    marginTop: 10,
    fontSize: 12,
    color: Colors.textSecondary,
    fontStyle: "italic",
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
  backIcon: { fontSize: 18, marginRight: 8 },
  backText: {
    color: Colors.textPrimary,
    fontSize: 16,
    fontWeight: "700",
  },
});
