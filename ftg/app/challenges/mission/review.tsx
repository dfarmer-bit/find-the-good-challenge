import { AppHeader } from "@/components/AppHeader";
import {
  Colors,
  Components,
  Layout,
  Radius,
  Spacing,
} from "@/constants/theme";
import { supabase } from "@/lib/supabase";
import { useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useMission } from "./MissionContext";

export default function MissionReview() {
  const router = useRouter();
  const { answers, reset } = useMission();

  const [loading, setLoading] = useState(true);
  const [missionText, setMissionText] = useState<string>("");
  const [saving, setSaving] = useState(false);

  const hasAnyAnswers = useMemo(() => {
    return answers && Object.keys(answers).length > 0;
  }, [answers]);

  useEffect(() => {
    const run = async () => {
      if (!hasAnyAnswers) {
        setLoading(false);
        router.replace("/challenges/mission/step-1");
        return;
      }

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setLoading(false);
        return;
      }

      // If already saved, just display it
      const { data: existing } = await supabase
        .from("personal_missions")
        .select("mission_text")
        .eq("user_id", user.id)
        .maybeSingle();

      if (existing?.mission_text) {
        setMissionText(existing.mission_text);
        setLoading(false);
        return;
      }

      const {
        data: { session },
      } = await supabase.auth.getSession();

      // IMPORTANT: send body as a JSON STRING (prevents empty body / req.json() errors)
      const payload = JSON.stringify({ answers });

      const { data, error } = await supabase.functions.invoke(
        "generate-mission-statement",
        {
          body: payload as any,
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session?.access_token}`,
          },
        }
      );

      if (error || !data?.mission_text) {
        setMissionText(
          "We couldn’t generate your mission statement right now. Please try again."
        );
        setLoading(false);
        return;
      }

      setMissionText(data.mission_text);
      setLoading(false);
    };

    run();
  }, [hasAnyAnswers]);

  const handleAccept = async () => {
    if (!missionText || saving) return;

    setSaving(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setSaving(false);
      return;
    }

    const {
      data: { session },
    } = await supabase.auth.getSession();

    // Save mission + answers
    await supabase.from("personal_missions").upsert({
      user_id: user.id,
      answers,
      mission_text: missionText,
    });

    // Generate insights (send body as JSON STRING)
    const reflectionPayload = JSON.stringify({
      mission_text: missionText,
      answers,
    });

    const { data } = await supabase.functions.invoke(
      "generate-mission-reflection",
      {
        body: reflectionPayload as any,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session?.access_token}`,
        },
      }
    );

    if (data?.reflection_text) {
      await supabase
        .from("personal_missions")
        .update({ reflection_text: data.reflection_text })
        .eq("user_id", user.id);
    }

    setSaving(false);
    router.replace("/challenges/mission");
  };

  const handleRevise = () => {
    reset();
    router.replace("/challenges/mission/step-1");
  };

  if (loading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <AppHeader />

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.progress}>Review Your Mission</Text>

        <Text style={styles.title}>Personal Mission Statement</Text>

        <View style={styles.missionCard}>
          <Text style={styles.missionText}>{missionText}</Text>
        </View>

        <TouchableOpacity
          style={[styles.acceptButton, saving && styles.disabledButton]}
          onPress={handleAccept}
          disabled={saving}
        >
          <Text style={styles.buttonText}>
            {saving ? "Saving..." : "Accept Mission"}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.reviseButton}
          onPress={handleRevise}
          disabled={saving}
        >
          <Text style={styles.buttonText}>Revise Answers</Text>
        </TouchableOpacity>
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity
          style={Components.backButton}
          onPress={() => router.back()}
        >
          <Text style={styles.footerText}>⬅ Back</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={Components.backButton}
          onPress={() => router.push("/main")}
        >
          <Text style={styles.footerText}>🏠 Home</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Colors.background,
    paddingTop: Layout.topScreenPadding,
  },

  loading: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },

  scroll: {
    paddingHorizontal: Spacing.screenPadding,
    paddingBottom: 180,
  },

  progress: {
    marginTop: 16,
    marginBottom: 8,
    color: Colors.textSecondary,
    fontSize: 13,
  },

  title: {
    fontSize: 22,
    fontWeight: "700",
    color: Colors.textPrimary,
    marginBottom: 16,
  },

  missionCard: {
    backgroundColor: Colors.cards.journal,
    borderRadius: Radius.card,
    padding: 18,
    marginBottom: 24,
  },

  missionText: {
    color: Colors.textPrimary,
    fontSize: 15,
    lineHeight: 24,
  },

  acceptButton: {
    backgroundColor: Colors.cards.complete,
    borderRadius: Radius.card,
    paddingVertical: 14,
    alignItems: "center",
    marginBottom: 12,
  },

  reviseButton: {
    backgroundColor: Colors.cards.journal,
    borderRadius: Radius.card,
    paddingVertical: 14,
    alignItems: "center",
  },

  disabledButton: {
    opacity: 0.45,
  },

  buttonText: {
    color: Colors.textPrimary,
    fontSize: 16,
    fontWeight: "700",
  },

  footer: {
    position: "absolute",
    bottom: Layout.bottomNavSpacing,
    left: Spacing.screenPadding,
    right: Spacing.screenPadding,
    flexDirection: "row",
    justifyContent: "space-between",
  },

  footerText: {
    color: Colors.textPrimary,
    fontSize: 16,
    fontWeight: "700",
  },
});
