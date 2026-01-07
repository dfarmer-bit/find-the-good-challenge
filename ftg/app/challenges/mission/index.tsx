import { AppHeader } from "@/components/AppHeader";
import { Colors, Components, Layout, Radius, Spacing } from "@/constants/theme";
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
  const { reset } = useMission();

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
        .select("mission_text")
        .eq("user_id", user.id)
        .maybeSingle();

      setHasMission(!!data?.mission_text);
      setLoading(false);
    };

    checkMission();
  }, []);

  const handleStart = () => {
    reset();
    router.push("/challenges/mission/step-1");
  };

  const handleRevise = () => {
    reset();
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
    <View style={styles.container}>
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
              activeOpacity={0.85}
            >
              <Text style={styles.buttonText}>Start My Personal Mission</Text>
            </TouchableOpacity>
          </>
        ) : (
          <>
            <Text style={styles.subtitle}>
              You’ve already defined your personal mission.
            </Text>

            <TouchableOpacity
              style={[styles.button, styles.viewButton]}
              onPress={() => router.push("/challenges/mission/view")}
              activeOpacity={0.85}
            >
              <Text style={styles.buttonText}>View Mission Statement</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.button, styles.insightsButton]}
              onPress={() => router.push("/challenges/mission/insights")}
              activeOpacity={0.85}
            >
              <Text style={styles.buttonText}>View Mission Insights</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.button, styles.reviseButton]}
              onPress={handleRevise}
              activeOpacity={0.85}
            >
              <Text style={styles.buttonText}>Revise Mission Statement</Text>
            </TouchableOpacity>

            <Text style={styles.disclaimer}>
              Points are awarded only for the initial submission of your Personal
              Mission Statement. You are encouraged to revise your mission as
              your journey evolves. Revised mission statements will generate
              updated insights.
            </Text>
          </>
        )}
      </View>

      {/* Bottom Navigation (matches Spiritual Health) */}
      <View style={styles.bottomBar}>
        <View style={styles.bottomButtonRow}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
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

  loading: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: Colors.background,
  },

  content: {
    flex: 1,
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
    backgroundColor: "#FF9F1C",
  },

  viewButton: {
    backgroundColor: "#2EC4B6",
  },

  insightsButton: {
    backgroundColor: "#FF5DA2",
  },

  reviseButton: {
    backgroundColor: "#9B5DE5",
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
