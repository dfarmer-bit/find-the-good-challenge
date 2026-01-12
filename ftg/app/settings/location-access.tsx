// app/settings/location-access.tsx
// FULL FILE REPLACEMENT

import * as Location from "expo-location";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
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

type PermState = {
  granted: boolean;
  status: "undetermined" | "granted" | "denied";
  canAskAgain: boolean;
};

export default function LocationAccessScreen() {
  const router = useRouter();
  const [perm, setPerm] = useState<PermState | null>(null);
  const [busy, setBusy] = useState(false);

  const loadStatus = async () => {
    const res = await Location.getForegroundPermissionsAsync();
    setPerm({
      granted: !!res.granted,
      status: (res.status as any) ?? "undetermined",
      canAskAgain: !!res.canAskAgain,
    });
  };

  useEffect(() => {
    loadStatus();
  }, []);

  const requestPermission = async () => {
    setBusy(true);
    const res = await Location.requestForegroundPermissionsAsync();
    const next: PermState = {
      granted: !!res.granted,
      status: (res.status as any) ?? "undetermined",
      canAskAgain: !!res.canAskAgain,
    };
    setPerm(next);

    if (!next.granted && !next.canAskAgain) {
      Alert.alert(
        "Location Blocked",
        "Location is blocked. Open settings to enable it."
      );
    }

    setBusy(false);
  };

  const openSettings = () => {
    Linking.openSettings();
  };

  const enabled = perm?.granted === true;

  return (
    <View style={styles.container}>
      <AppHeader />

      <View style={styles.headerText}>
        <Text style={styles.title}>Location Access</Text>
        <Text style={styles.subtitle}>
          Enable GPS so events and check-ins work.
        </Text>
      </View>

      <View style={styles.card}>
        <View style={styles.statusRow}>
          <Text style={styles.statusLabel}>Status</Text>
          <View style={[styles.pill, enabled ? styles.pillOn : styles.pillOff]}>
            <Text style={styles.pillText}>
              {enabled ? "Enabled" : "Not enabled"}
            </Text>
          </View>
        </View>

        <TouchableOpacity
          style={styles.primaryButton}
          onPress={requestPermission}
          disabled={busy}
          activeOpacity={0.9}
        >
          <Text style={styles.primaryIcon}>📍</Text>
          <Text style={styles.primaryText}>
            {enabled ? "Re-check Location" : "Enable Location"}
          </Text>
        </TouchableOpacity>

        {!enabled && perm?.canAskAgain === false && (
          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={openSettings}
            activeOpacity={0.9}
          >
            <Text style={styles.secondaryIcon}>⚙️</Text>
            <Text style={styles.secondaryText}>Open Settings</Text>
          </TouchableOpacity>
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
    justifyContent: "space-between",
    marginBottom: 12,
  },
  statusLabel: {
    color: Colors.textSecondary,
    fontSize: 12,
    fontWeight: "800",
  },
  pill: {
    paddingHorizontal: 12,
    height: 26,
    borderRadius: 13,
    justifyContent: "center",
    borderWidth: 1,
  },
  pillOn: {
    backgroundColor: "rgba(46,196,182,0.25)",
    borderColor: "rgba(46,196,182,0.45)",
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
  primaryButton: {
    marginTop: 8,
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "center",
    backgroundColor: "#2EC4B6",
  },
  primaryIcon: {
    fontSize: 18,
    marginRight: 10,
  },
  primaryText: {
    color: "#0B0B0B",
    fontSize: 16,
    fontWeight: "900",
  },
  secondaryButton: {
    marginTop: 10,
    borderRadius: 16,
    paddingVertical: 12,
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.10)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.14)",
  },
  secondaryIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  secondaryText: {
    color: Colors.textPrimary,
    fontSize: 14,
    fontWeight: "900",
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
