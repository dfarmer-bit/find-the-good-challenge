// app/challenges/walking.tsx
// FULL FILE REPLACEMENT

import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
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

export default function WalkingScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [deviceConnected, setDeviceConnected] = useState(false);

  useEffect(() => {
    const checkDeviceConnection = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setLoading(false);
        return;
      }

      const { data } = await supabase
        .from("user_device_connections")
        .select("user_id")
        .eq("user_id", user.id)
        .maybeSingle();

      if (data) {
        setDeviceConnected(true);
      }

      setLoading(false);
    };

    checkDeviceConnection();
  }, []);

  const handleConnectDevice = async () => {
    router.push("/settings/walking-setup");
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator color={Colors.textPrimary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <AppHeader />

      <View style={styles.headerText}>
        <Text style={styles.title}>🚶 Walking Challenge</Text>
        <Text style={styles.subtitle}>Automatic tracking & rewards</Text>
      </View>

      {/* RULES */}
      <View style={styles.rulesBox}>
        <Text style={styles.rule}>• A connected fitness device is required</Text>
        <Text style={styles.rule}>
          • Points are automatically awarded when you connect a device (one time)
        </Text>
        <Text style={styles.rule}>
          • Earn points for walking 5,000+ steps in a day
        </Text>
        <Text style={styles.rule}>
          • Earn additional points for 10,000+ steps in a day
        </Text>
        <Text style={styles.rule}>• Daily window: 12:00 AM – 11:59 PM</Text>
        <Text style={styles.rule}>• No manual check-ins are required</Text>
      </View>

      {/* DEVICE STATUS */}
      <View style={styles.deviceBox}>
        {deviceConnected ? (
          <>
            <Text style={styles.connectedIcon}>✅</Text>
            <Text style={styles.connectedText}>Device Connected</Text>
            <Text style={styles.connectedSubtext}>
              You’re all set. Walking will be tracked automatically.
            </Text>
          </>
        ) : (
          <>
            <TouchableOpacity
              style={styles.connectButton}
              onPress={handleConnectDevice}
              activeOpacity={0.9}
            >
              <Text style={styles.connectButtonText}>Connect Your Device</Text>
            </TouchableOpacity>
            <Text style={styles.deviceNote}>Apple Health • Fitbit • Google Fit</Text>
          </>
        )}
      </View>

      {/* Bottom Back/Home */}
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
  loadingContainer: {
    flex: 1,
    backgroundColor: Colors.background,
    justifyContent: "center",
    alignItems: "center",
  },

  container: {
    flex: 1,
    backgroundColor: Colors.background,
    paddingTop: Layout.topScreenPadding,
    paddingHorizontal: Spacing.screenPadding,
  },

  headerText: {
    alignItems: "center",
    marginBottom: 20,
  },

  title: {
    fontSize: Typography.greeting.fontSize,
    fontWeight: Typography.greeting.fontWeight,
    color: Colors.textPrimary,
    marginBottom: 4,
    textAlign: "center",
  },

  subtitle: {
    fontSize: Typography.quote.fontSize,
    color: Colors.textSecondary,
    textAlign: "center",
  },

  rulesBox: {
    backgroundColor: "rgba(255,255,255,0.06)",
    borderRadius: Radius.card,
    padding: 16,
    marginBottom: 20,
  },

  rule: {
    color: Colors.textPrimary,
    fontSize: 14,
    marginBottom: 8,
  },

  deviceBox: {
    alignItems: "center",
    marginTop: 10,
  },

  connectButton: {
    backgroundColor: Colors.cards.complete,
    paddingVertical: 14,
    paddingHorizontal: 22,
    borderRadius: Radius.card,
  },

  connectButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },

  deviceNote: {
    marginTop: 8,
    fontSize: 12,
    color: Colors.textSecondary,
    textAlign: "center",
  },

  connectedIcon: {
    fontSize: 40,
    marginBottom: 6,
  },

  connectedText: {
    fontSize: 16,
    fontWeight: "700",
    color: Colors.textPrimary,
    marginBottom: 4,
  },

  connectedSubtext: {
    fontSize: 13,
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
