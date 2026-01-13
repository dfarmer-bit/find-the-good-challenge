// app/challenges/gratitude-journal.tsx
// FULL FILE REPLACEMENT
// Change: after successful save, return to /main

import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
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

const MIN_CHARS = 80;

export default function GratitudeJournalScreen() {
  const router = useRouter();

  const [entry, setEntry] = useState("");
  const [setAsGoal, setSetAsGoal] = useState(false);
  const [selectedGoal, setSelectedGoal] = useState<string | null>(null);
  const [showGoalOptions, setShowGoalOptions] = useState(false);
  const [saving, setSaving] = useState(false);
  const [challengeId, setChallengeId] = useState<string | null>(null);

  const goalOptions = [
    "Reach Out",
    "Do Something Kind",
    "Take Care of Myself",
    "Build the Habit",
    "Reflect More",
  ];

  useEffect(() => {
    loadChallengeId();
  }, []);

  async function loadChallengeId() {
    const { data } = await supabase
      .from("challenges")
      .select("id")
      .eq("name", "Gratitude Journal")
      .single();

    if (data) setChallengeId(data.id);
  }

  const canSubmit =
    entry.trim().length >= MIN_CHARS &&
    (!setAsGoal || selectedGoal) &&
    !saving &&
    !!challengeId;

  async function handleSave() {
    if (!canSubmit || !challengeId) return;

    setSaving(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setSaving(false);
      return;
    }

    const today = new Date().toISOString().slice(0, 10);

    const { data: existing } = await supabase
      .from("challenge_activity")
      .select("id")
      .eq("user_id", user.id)
      .eq("challenge_id", challengeId)
      .eq("occurred_date", today)
      .limit(1);

    if (existing && existing.length > 0) {
      Alert.alert("Already submitted", "You’ve already added an entry today.");
      setSaving(false);
      return;
    }

    const { data: activity, error } = await supabase
      .from("challenge_activity")
      .insert({
        user_id: user.id,
        challenge_id: challengeId,
        occurred_at: new Date().toISOString(),
        occurred_date: today,
        status: "approved",
        metadata: {
          text: entry.trim(),
          set_as_goal: setAsGoal,
          goal_type: selectedGoal,
        },
      })
      .select("id")
      .single();

    if (error || !activity) {
      Alert.alert("Error", error?.message || "Unable to save entry.");
      setSaving(false);
      return;
    }

    if (setAsGoal && selectedGoal) {
      await supabase.from("goals").insert({
        user_id: user.id,
        title: selectedGoal,
        note: entry.trim(),
        source_type: "gratitude_journal",
        source_activity_id: activity.id,
      });
    }

    setEntry("");
    setSetAsGoal(false);
    setSelectedGoal(null);
    setShowGoalOptions(false);
    setSaving(false);

    Alert.alert("Saved", "Your gratitude entry has been recorded.", [
      { text: "OK", onPress: () => router.push("/main") },
    ]);
  }

  return (
    <View style={styles.container}>
      <AppHeader />

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.headerText}>
            <Text style={styles.title}>Gratitude Journal</Text>
            <Text style={styles.subtitle}>
              This challenge may be completed once daily and is worth 10 points.
            </Text>
          </View>

          <View style={styles.card}>
            <TextInput
              style={styles.textInput}
              placeholder="What are you grateful for today?"
              placeholderTextColor={Colors.textSecondary}
              multiline
              value={entry}
              onChangeText={setEntry}
              textAlignVertical="top"
            />
            <Text style={styles.helperText}>
              Entries must be at least {MIN_CHARS} characters.
            </Text>
          </View>

          <View style={styles.card}>
            <TouchableOpacity
              style={styles.toggleRow}
              onPress={() => {
                const next = !setAsGoal;
                setSetAsGoal(next);
                setShowGoalOptions(next);
                if (!next) setSelectedGoal(null);
              }}
            >
              <Text style={styles.toggleText}>Set As Goal</Text>
              <Text style={styles.toggleIcon}>
                {setAsGoal ? "✅" : "⬜️"}
              </Text>
            </TouchableOpacity>

            {setAsGoal && showGoalOptions && (
              <View style={styles.goalList}>
                {goalOptions.map((goal) => (
                  <TouchableOpacity
                    key={goal}
                    style={styles.goalOption}
                    onPress={() => {
                      setSelectedGoal(goal);
                      setShowGoalOptions(false);
                    }}
                  >
                    <Text style={styles.goalText}>{goal}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {setAsGoal && selectedGoal && !showGoalOptions && (
              <TouchableOpacity
                style={styles.goalOptionSelected}
                onPress={() => setShowGoalOptions(true)}
              >
                <Text style={styles.goalText}>{selectedGoal}</Text>
              </TouchableOpacity>
            )}
          </View>

          <TouchableOpacity
            style={[
              styles.submitButton,
              !canSubmit && styles.submitDisabled,
            ]}
            disabled={!canSubmit}
            onPress={handleSave}
          >
            <Text style={styles.submitText}>
              {saving ? "Saving…" : "Save Entry"}
            </Text>
          </TouchableOpacity>

          <View style={{ height: 140 }} />
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Bottom Back / Home */}
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
  scrollContent: { paddingBottom: 200 },
  headerText: { alignItems: "center", marginBottom: 16 },
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
  card: {
    backgroundColor: Colors.cards.journal,
    borderRadius: Radius.card,
    padding: Spacing.cardPadding,
    marginBottom: Spacing.gridGap,
  },
  textInput: {
    minHeight: 140,
    fontSize: Typography.quote.fontSize,
    color: Colors.textPrimary,
  },
  helperText: { marginTop: 8, fontSize: 13, color: Colors.textSecondary },
  toggleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  toggleText: {
    fontSize: Typography.quote.fontSize,
    fontWeight: "700",
    color: Colors.textPrimary,
  },
  toggleIcon: { fontSize: 20 },
  goalList: { marginTop: 12, gap: 8 },
  goalOption: {
    padding: 12,
    borderRadius: Radius.card,
    backgroundColor: Colors.cards.goals,
  },
  goalOptionSelected: {
    marginTop: 12,
    padding: 12,
    borderRadius: Radius.card,
    backgroundColor: Colors.cards.complete,
  },
  goalText: { color: Colors.textPrimary, fontWeight: "600" },
  submitButton: {
    backgroundColor: Colors.cards.complete,
    borderRadius: Radius.card,
    paddingVertical: 14,
    alignItems: "center",
  },
  submitDisabled: { opacity: 0.4 },
  submitText: {
    color: Colors.textPrimary,
    fontSize: 16,
    fontWeight: "800",
  },
  bottomBar: {
    position: "absolute",
    bottom: Layout.bottomNavSpacing,
    left: Spacing.screenPadding,
    right: Spacing.screenPadding,
    alignItems: "center",
  },
  bottomButtonRow: { flexDirection: "row", gap: 16 },
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
