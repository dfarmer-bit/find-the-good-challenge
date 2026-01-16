import { AppHeader } from "@/components/AppHeader";
import { AppTextInput } from "@/components/AppTextInput";
import {
  Colors,
  Components,
  Layout,
  Radius,
  Spacing,
  Typography,
} from "@/constants/theme";
import { supabase } from "@/lib/supabase";
import { useRouter } from "expo-router";
import { useState } from "react";
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

export default function WorkIdeaScreen() {
  const router = useRouter();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [impact, setImpact] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const canSubmit =
    title.trim().length > 0 &&
    description.trim().length > 0 &&
    impact.trim().length > 0;

  const submit = async () => {
    if (!canSubmit) return;

    setSubmitting(true);

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      setSubmitting(false);
      Alert.alert("Error", "You must be logged in to submit.");
      return;
    }

    const { error } = await supabase.from("challenge_activity").insert({
      user_id: user.id,
      challenge_id: "affd9da2-1986-42be-be57-c7453f13454f",
      status: "pending",
      occurred_at: new Date().toISOString(),
      metadata: {
        title: title.trim(),
        description: description.trim(),
        impact: impact.trim(),
      },
    });

    setSubmitting(false);

    if (error) {
      Alert.alert(
        "Already submitted",
        "You can submit this challenge once per week."
      );
      return;
    }

    Alert.alert(
      "Submitted",
      "Your work improvement idea has been sent for review.",
      [{ text: "OK", onPress: () => router.back() }]
    );
  };

  return (
    <View style={styles.container}>
      <AppHeader />

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.headerText}>
            <Text style={styles.icon}>💡</Text>
            <Text style={styles.title}>Work Improvement Idea</Text>
            <Text style={styles.subtitle}>
              <Text style={styles.subtitleBold}>+100 Points{"\n"}</Text>
              Share an idea that could improve workflows, teamwork, efficiency,
              or the overall work environment. Limit 1x per week. Requires 
              admin approval for points.
            </Text>
          </View>

          <View style={{ marginTop: 10 }}>
            <AppTextInput
              placeholder="Idea title"
              placeholderTextColor={Colors.textSecondary}
              value={title}
              onChangeText={setTitle}
              style={styles.inputSpacing}
            />

            <AppTextInput
              placeholder="Describe your idea"
              placeholderTextColor={Colors.textSecondary}
              value={description}
              onChangeText={setDescription}
              multiline
              style={[styles.textArea, styles.inputSpacing]}
            />

            <AppTextInput
              placeholder="How will this improve the work environment?"
              placeholderTextColor={Colors.textSecondary}
              value={impact}
              onChangeText={setImpact}
              multiline
              style={styles.textArea}
            />
          </View>

          <TouchableOpacity
            style={[
              styles.submitButton,
              (!canSubmit || submitting) && styles.submitDisabled,
            ]}
            disabled={!canSubmit || submitting}
            onPress={submit}
          >
            <Text style={styles.submitText}>Submit for Review</Text>
          </TouchableOpacity>

          <View style={{ height: 120 }} />
        </ScrollView>
      </KeyboardAvoidingView>

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

  inputSpacing: {
    marginBottom: 12,
  },

  textArea: {
    minHeight: 90,
  },

  submitButton: {
    backgroundColor: Colors.cards.complete,
    paddingVertical: 14,
    borderRadius: Radius.card,
    alignItems: "center",
    marginTop: 8,
  },

  submitDisabled: {
    opacity: 0.4,
  },

  submitText: {
    color: Colors.textPrimary,
    fontWeight: "700",
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
});
