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
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useMission } from "./MissionContext";

export default function MissionIndex() {
  const router = useRouter();
  const { loadAnswers, reset } = useMission();

  const [loading, setLoading] = useState(true);
  const [hasMission, setHasMission] = useState(false);

  useEffect(() => {
    const checkMission = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setLoading(false);
        return;
      }

      const { data } = await supabase
        .from("personal_missions")
        .select("answers")
        .eq("user_id", user.id)
        .maybeSingle();

      setHasMission(!!data);
      setLoading(false);
    };

    checkMission();
  }, []);

  const handleStart = () => {
    reset();
    router.push("/challenges/mission/step-1");
  };

  const handleRevise = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return;

    const { data } = await supabase
      .from("personal_missions")
      .select("answers")
      .eq("user_id", user.id)
      .maybeSingle();

    if (!data) return;

    loadAnswers(data.answers);
    router.push("/challenges/mission/step-1");
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

      <View style={styles.content}>
        <Text style={styles.title}>Personal Mission Statement</Text>

        {!hasMission ? (
          <>
            <Text style={styles.subtitle}>
              Let’s define what matters most to you.
            </Text>

            <TouchableOpacity
              style={[styles.button, styles.startButton]}
              onPress={handleStart}
            >
              <Text style={styles.buttonText}>
                Start My Personal Mission
              </Text>
            </TouchableOpacity>
          </>
        ) : (
          <>
            <Text style={styles.subtitle}>
              You’ve already defined your personal mission.
            </Text>

            <TouchableOpacity
              style={[styles.button, styles.viewButton]}
              onPress={() =>
                router.push("/challenges/mission/review")
              }
            >
              <Text style={styles.buttonText}>
                View Mission Statement
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.button, styles.insightsButton]}
              onPress={() =>
                router.push("/challenges/mission/insights")
              }
            >
              <Text style={styles.buttonText}>
                View Mission Insights
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.button, styles.reviseButton]}
              onPress={handleRevise}
            >
              <Text style={styles.buttonText}>
                Revise Mission Statement
              </Text>
            </TouchableOpacity>

            <Text style={styles.disclaimer}>
              Points are awarded only for the initial submission of your
              Personal Mission Statement. You are encouraged to revise
              your mission as your journey evolves. Revised mission
              statements will generate updated insights.
            </Text>
          </>
        )}
      </View>

      <View style={styles.footer}>
        <TouchableOpacity
          style={Components.backButton}
          onPress={() => router.back()}
        >
          <Text style={styles.backText}>⬅ Back</Text>
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

  content: {
    flex: 1,
    paddingHorizontal: Spacing.screenPadding,
    justifyContent: "flex-start",
    paddingTop: 80,
  },

  title: {
    fontSize: 22,
    fontWeight: "700",
    color: Colors.textPrimary,
    marginBottom: 10,
    textAlign: "center",
  },

  subtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginBottom: 24,
    textAlign: "center",
  },

  button: {
    borderRadius: Radius.card,
    paddingVertical: 14,
    alignItems: "center",
    marginBottom: 14,
  },

  startButton: {
    backgroundColor: "#FF9F1C", // warm amber (start)
  },

  viewButton: {
    backgroundColor: "#2EC4B6", // calm teal (read)
  },

  insightsButton: {
    backgroundColor: "#FF5DA2", // reflective rose (insights)
  },

  reviseButton: {
    backgroundColor: "#9B5DE5", // purposeful purple (revise)
  },

  buttonText: {
    color: Colors.textPrimary,
    fontSize: 16,
    fontWeight: "700",
  },

  disclaimer: {
    marginTop: 16,
    fontSize: 12,
    lineHeight: 18,
    color: Colors.textSecondary,
    textAlign: "center",
  },

  footer: {
    position: "absolute",
    bottom: Layout.bottomNavSpacing,
    left: Spacing.screenPadding,
    right: Spacing.screenPadding,
    alignItems: "center",
  },

  backText: {
    color: Colors.textPrimary,
    fontSize: 16,
    fontWeight: "700",
  },
});
