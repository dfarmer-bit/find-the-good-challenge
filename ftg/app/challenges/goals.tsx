import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
    Alert,
    ScrollView,
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

type Goal = {
  id: string;
  title: string;
  note: string;
  created_at: string;
};

export default function GoalsScreen() {
  const router = useRouter();
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadGoals();
  }, []);

  async function loadGoals() {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setLoading(false);
      return;
    }

    const { data } = await supabase
      .from("goals")
      .select("id, title, note, created_at")
      .eq("user_id", user.id)
      .is("completed_at", null)
      .order("created_at", { ascending: false });

    setGoals(data ?? []);
    setLoading(false);
  }

  async function completeGoal(goalId: string) {
    await supabase
      .from("goals")
      .update({ completed_at: new Date().toISOString() })
      .eq("id", goalId);

    setGoals((prev) => prev.filter((g) => g.id !== goalId));
  }

  async function rejectGoal(goalId: string) {
    Alert.alert(
      "Remove Goal",
      "Are you sure you want to remove this goal?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Remove",
          style: "destructive",
          onPress: async () => {
            await supabase.from("goals").delete().eq("id", goalId);
            setGoals((prev) => prev.filter((g) => g.id !== goalId));
          },
        },
      ]
    );
  }

  return (
    <View style={styles.container}>
      <AppHeader />

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={styles.title}>My Goals</Text>
        <Text style={styles.subtitle}>
          Complete or remove goals when you’re ready.
        </Text>

        <TouchableOpacity
          style={styles.historyButton}
          onPress={() => router.push("/challenges/goals/history")}
        >
          <Text style={styles.historyText}>
            View Completed Goals History
          </Text>
        </TouchableOpacity>

        {loading && <Text style={styles.emptyText}>Loading…</Text>}

        {!loading && goals.length === 0 && (
          <View style={styles.card}>
            <Text style={styles.emptyText}>
              You don’t have any active goals.
            </Text>
          </View>
        )}

        {goals.map((goal) => (
          <View key={goal.id} style={styles.goalCard}>
            <Text style={styles.goalTitle}>{goal.title}</Text>
            <Text style={styles.goalNote}>{goal.note}</Text>

            <View style={styles.actionRow}>
              <TouchableOpacity
                style={styles.completeButton}
                onPress={() => completeGoal(goal.id)}
              >
                <Text style={styles.actionText}>Complete</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.rejectButton}
                onPress={() => rejectGoal(goal.id)}
              >
                <Text style={styles.actionText}>Reject</Text>
              </TouchableOpacity>
            </View>
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
    marginBottom: 12,
  },
  historyButton: {
    backgroundColor: Colors.cards.messages,
    borderRadius: Radius.card,
    paddingVertical: 12,
    alignItems: "center",
    marginBottom: 16,
  },
  historyText: {
    color: Colors.textPrimary,
    fontSize: 14,
    fontWeight: "700",
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
  actionRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 14,
  },
  completeButton: {
    backgroundColor: Colors.cards.complete,
    borderRadius: Radius.card,
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  rejectButton: {
    backgroundColor: Colors.cards.admin,
    borderRadius: Radius.card,
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  actionText: {
    color: Colors.textPrimary,
    fontSize: 14,
    fontWeight: "700",
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
