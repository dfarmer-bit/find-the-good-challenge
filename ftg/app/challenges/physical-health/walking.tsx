import { AppHeader } from "@/components/AppHeader";
import {
    Colors,
    Components,
    Layout,
    Spacing
} from "@/constants/theme";
import { supabase } from "@/lib/supabase";
import { useRouter } from "expo-router";
import { Pedometer } from "expo-sensors";
import { useEffect, useState } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

const WALKING_CHALLENGE_ID = "0063a3bf-d013-4bee-8f72-47fd7fe39455";
const GOAL_TWO = 10000;

export default function Walking() {
  const router = useRouter();
  const [stepsToday, setStepsToday] = useState(0);
  const [statusMessage, setStatusMessage] = useState("Syncing steps...");
  const [deviceType, setDeviceType] = useState<"Phone" | "Wearable">("Phone");

  useEffect(() => {
    const run = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      // DEVICE TYPE
      const { data: device } = await supabase
        .from("user_device_connections")
        .select("device_type")
        .eq("user_id", user.id)
        .maybeSingle();

      setDeviceType(
        device?.device_type && device.device_type !== "phone"
          ? "Wearable"
          : "Phone"
      );

      // YESTERDAY
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      yesterday.setHours(0, 0, 0, 0);

      const yesterdayEnd = new Date(yesterday);
      yesterdayEnd.setHours(23, 59, 59, 999);

      const occurredDate = yesterday.toISOString().slice(0, 10);

      const { data: existing } = await supabase
        .from("challenge_activity")
        .select("id")
        .eq("user_id", user.id)
        .eq("challenge_id", WALKING_CHALLENGE_ID)
        .eq("occurred_date", occurredDate)
        .maybeSingle();

      if (!existing) {
        const result = await Pedometer.getStepCountAsync(
          yesterday,
          yesterdayEnd
        );

        if (result.steps > 0) {
          await supabase.from("challenge_activity").insert({
            user_id: user.id,
            challenge_id: WALKING_CHALLENGE_ID,
            occurred_date: occurredDate,
            status: "approved",
            metadata: {
              steps: result.steps,
              source: deviceType.toLowerCase(),
            },
          });

          setStatusMessage("Yesterday synced ✔️");
        } else {
          setStatusMessage("No steps recorded yesterday");
        }
      } else {
        setStatusMessage("Yesterday already synced ✔️");
      }

      // TODAY (DISPLAY ONLY)
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);

      const todayResult = await Pedometer.getStepCountAsync(
        todayStart,
        new Date()
      );

      setStepsToday(todayResult.steps);
    };

    run();
  }, []);

  const progressPercent = Math.min(stepsToday / GOAL_TWO, 1) * 100;

  return (
    <View style={styles.container}>
      <AppHeader />

      <View style={styles.content}>
        {/* DEVICE STATUS */}
        <Text style={styles.trackingTitle}>
          Currently Tracking With:
        </Text>
        <Text style={styles.trackingValue}>{deviceType}</Text>

        <TouchableOpacity
          style={styles.changeButton}
          onPress={() =>
            router.push("/challenges/physical-health/connect-device")
          }
        >
          <Text style={styles.changeText}>Change Device</Text>
        </TouchableOpacity>

        {/* ICON */}
        <Text style={styles.icon}>🏃‍♂️</Text>

        {/* STEPS */}
        <Text style={styles.steps}>
          {stepsToday.toLocaleString()} steps today
        </Text>

        {/* PROGRESS BAR */}
        <View style={styles.progressBar}>
          <View
            style={[
              styles.progressFill,
              { width: `${progressPercent}%` },
            ]}
          />
        </View>

        <View style={styles.milestones}>
          <Text style={styles.milestone}>0</Text>
          <Text style={styles.milestone}>5,000</Text>
          <Text style={styles.milestone}>10,000</Text>
        </View>

        <Text style={styles.status}>{statusMessage}</Text>

        <TouchableOpacity
          style={styles.rulesButton}
          onPress={() =>
            router.push("/challenges/physical-health/walking-rules")
          }
        >
          <Text style={styles.rulesText}>📘 Rules & How This Works</Text>
        </TouchableOpacity>
      </View>

      {/* Bottom Navigation */}
      <View style={styles.bottomBar}>
        <View style={styles.bottomButtonRow}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Text style={styles.backText}>⬅️ Back</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.push("/main")}
          >
            <Text style={styles.backText}>🏠 Home</Text>
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
  },
  content: {
    flex: 1,
    paddingHorizontal: Spacing.screenPadding,
    justifyContent: "center",
  },
  trackingTitle: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: "center",
  },
  trackingValue: {
    fontSize: 28,
    fontWeight: "700",
    color: Colors.textPrimary,
    textAlign: "center",
    marginBottom: 6,
  },
  changeButton: {
    alignSelf: "center",
    marginBottom: 18,
  },
  changeText: {
    fontSize: 15,
    fontWeight: "700",
    color: Colors.cards.goals,
  },
  icon: {
    fontSize: 44,
    textAlign: "center",
    marginBottom: 6,
  },
  steps: {
    fontSize: 22,
    color: Colors.textSecondary,
    textAlign: "center",
    marginBottom: 14,
  },
  progressBar: {
    height: 14,
    borderRadius: 8,
    backgroundColor: Colors.cards.complete,
    opacity: 0.25,
    overflow: "hidden",
    marginBottom: 6,
  },
  progressFill: {
    height: "100%",
    backgroundColor: Colors.cards.goals,
  },
  milestones: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 14,
  },
  milestone: {
    fontSize: 13,
    color: Colors.textSecondary,
  },
  status: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: "center",
    marginBottom: 18,
  },
  rulesButton: {
    alignSelf: "center",
    paddingVertical: 12,
    paddingHorizontal: 18,
    borderRadius: 12,
    backgroundColor: Colors.cards.goals,
  },
  rulesText: {
    fontSize: 15,
    fontWeight: "700",
    color: Colors.textPrimary,
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
  },
  backText: {
    color: Colors.textPrimary,
    fontSize: 16,
    fontWeight: "700",
  },
});
