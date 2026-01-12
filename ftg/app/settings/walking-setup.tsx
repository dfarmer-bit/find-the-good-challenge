// app/settings/walking-setup.tsx
// FULL FILE REPLACEMENT

import { Pedometer } from "expo-sensors";
import { useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Linking,
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

type StepPerm = {
  granted: boolean;
  canAskAgain: boolean;
};

export default function WalkingSetupScreen() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const [perm, setPerm] = useState<StepPerm | null>(null);
  const [deviceConnected, setDeviceConnected] = useState(false);

  const statusLabel = useMemo(() => {
    if (deviceConnected) return "Enabled";
    return "Not enabled";
  }, [deviceConnected]);

  const loadState = async () => {
    try {
      setLoading(true);

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setLoading(false);
        return;
      }

      // Step permission
      const p = await Pedometer.getPermissionsAsync();
      setPerm({
        granted: !!p.granted,
        canAskAgain: !!p.canAskAgain,
      });

      // Connected state (your existing marker)
      const { data } = await supabase
        .from("user_device_connections")
        .select("user_id")
        .eq("user_id", user.id)
        .maybeSingle();

      setDeviceConnected(!!data);
    } catch (e: any) {
      Alert.alert("Error", e?.message ?? "Unable to load setup status.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadState();
  }, []);

  const openSettings = async () => {
    try {
      await Linking.openSettings();
    } catch {
      Alert.alert("Unable to open settings");
    }
  };

  const enable = async () => {
    try {
      setBusy(true);

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        Alert.alert("Not signed in", "Please sign in and try again.");
        return;
      }

      const res = await Pedometer.requestPermissionsAsync();
      const nextPerm: StepPerm = {
        granted: !!res.granted,
        canAskAgain: !!res.canAskAgain,
      };
      setPerm(nextPerm);

      if (!nextPerm.granted) {
        if (!nextPerm.canAskAgain) {
          Alert.alert(
            "Step Tracking Blocked",
            "Permission is blocked. Tap Open Settings to enable it."
          );
        } else {
          Alert.alert(
            "Permission Needed",
            "Step tracking permission is required to connect your device."
          );
        }
        return;
      }

      // Mark device connected (one-time row)
      const { data: existing } = await supabase
        .from("user_device_connections")
        .select("user_id")
        .eq("user_id", user.id)
        .maybeSingle();

      if (!existing) {
        const { error } = await supabase.from("user_device_connections").insert({
          user_id: user.id,
          // If your table has other NOT NULL columns, add them here.
          // This assumes user_id alone is enough (as used in your walking.tsx).
        });

        if (error) throw error;
      }

      setDeviceConnected(true);
      Alert.alert("Connected", "Step tracking is now enabled.");
    } catch (e: any) {
      Alert.alert("Error", e?.message ?? "Unable to enable step tracking.");
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator color={Colors.textPrimary} />
      </View>
    );
  }

  const showOpenSettings =
    perm && perm.granted === false && perm.canAskAgain === false;

  return (
    <View style={styles.container}>
      <AppHeader />

      <View style={styles.headerText}>
        <Text style={styles.title}>Walking Setup</Text>
        <Text style={styles.subtitle}>Enable step tracking on this device</Text>
      </View>

      <View style={styles.card}>
        <View style={styles.statusRow}>
          <Text style={styles.statusLabel}>Status</Text>
          <View
            style={[
              styles.pill,
              deviceConnected ? styles.pillOn : styles.pillOff,
            ]}
          >
            <Text style={styles.pillText}>{statusLabel}</Text>
          </View>
        </View>

        <Text style={styles.bodyText}>
          If you skipped step tracking permission during install, you can enable
          it here.
        </Text>

        <TouchableOpacity
          style={[styles.primaryButton, busy && { opacity: 0.75 }]}
          onPress={deviceConnected ? loadState : enable}
          activeOpacity={0.9}
          disabled={busy}
        >
          <Text style={styles.primaryIcon}>🚶</Text>
          <Text style={styles.primaryText}>
            {deviceConnected ? "Re-check Status" : "Enable Step Tracking"}
          </Text>
        </TouchableOpacity>

        {showOpenSettings && (
          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={openSettings}
            activeOpacity={0.9}
          >
            <Text style={styles.secondaryIcon}>⚙️</Text>
            <Text style={styles.secondaryText}>Open Settings</Text>
          </TouchableOpacity>
        )}

        {deviceConnected ? (
          <Text style={styles.helperText}>
            You can return to the Walking Challenge — tracking is automatic.
          </Text>
        ) : (
          <Text style={styles.helperText}>
            This does not award points. It only enables step tracking.
          </Text>
        )}
      </View>

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
    marginBottom: 12,
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

  card: {
    backgroundColor: "rgba(255,255,255,0.08)",
    borderColor: "rgba(255,255,255,0.12)",
    borderWidth: 1,
    borderRadius: Radius.card,
    padding: 14,
  },

  statusRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },

  statusLabel: {
    color: Colors.textSecondary,
    fontSize: 12,
    fontWeight: "800",
  },

  pill: {
    paddingHorizontal: 10,
    height: 26,
    borderRadius: 13,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
  },

  pillOn: {
    backgroundColor: "rgba(46, 196, 182, 0.22)",
    borderColor: "rgba(46, 196, 182, 0.40)",
  },

  pillOff: {
    backgroundColor: "rgba(255,255,255,0.08)",
    borderColor: "rgba(255,255,255,0.14)",
  },

  pillText: {
    color: Colors.textPrimary,
    fontSize: 12,
    fontWeight: "900",
  },

  bodyText: {
    color: Colors.textSecondary,
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 12,
  },

  primaryButton: {
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 14,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    backgroundColor: Colors.cards.complete,
  },

  primaryIcon: {
    fontSize: 18,
    marginRight: 10,
  },

  primaryText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "900",
  },

  secondaryButton: {
    marginTop: 10,
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 14,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    backgroundColor: "rgba(255,255,255,0.10)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.14)",
  },

  secondaryIcon: {
    fontSize: 16,
    marginRight: 10,
  },

  secondaryText: {
    color: Colors.textPrimary,
    fontSize: 14,
    fontWeight: "900",
  },

  helperText: {
    marginTop: 10,
    color: Colors.textSecondary,
    fontSize: 12,
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
