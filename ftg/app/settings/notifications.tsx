// app/settings/notifications.tsx
// FULL FILE REPLACEMENT
// Adds REAL notification permission detection
// No notification sending yet

import { useRouter } from "expo-router";
import * as Notifications from "expo-notifications";
import { useEffect, useState } from "react";
import {
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

type NotificationStatus = "on" | "off" | "not_set" | "limited";

export default function NotificationsSettingsScreen() {
  const router = useRouter();
  const [status, setStatus] = useState<NotificationStatus>("not_set");

  useEffect(() => {
    checkStatus();
  }, []);

  const checkStatus = async () => {
    const settings = await Notifications.getPermissionsAsync();

    if (settings.status === "granted") {
      setStatus("on");
    } else if (settings.status === "denied") {
      setStatus("off");
    } else if (settings.status === "undetermined") {
      setStatus("not_set");
    } else {
      setStatus("limited");
    }
  };

  const requestPermission = async () => {
    const result = await Notifications.requestPermissionsAsync();
    if (result.status === "granted") {
      setStatus("on");
    } else {
      setStatus("off");
    }
  };

  const openSystemSettings = () => {
    Linking.openSettings();
  };

  const content = {
    on: {
      title: "Notifications are enabled",
      body:
        "You’ll receive alerts for messages, events, reminders, and important updates.",
      action: null,
    },
    off: {
      title: "Notifications are turned off",
      body:
        "You won’t receive message alerts, event reminders, or deadlines.",
      action: {
        label: "Open Phone Settings",
        handler: openSystemSettings,
      },
    },
    not_set: {
      title: "Notifications not enabled yet",
      body:
        "Turn on notifications to stay on track with messages, events, and goals.",
      action: {
        label: "Enable Notifications",
        handler: requestPermission,
      },
    },
    limited: {
      title: "Notifications are limited",
      body:
        "Your device may be silencing or delaying notifications due to system settings.",
      action: {
        label: "Review Phone Settings",
        handler: openSystemSettings,
      },
    },
  }[status];

  return (
    <View style={styles.container}>
      <AppHeader />

      <View style={styles.headerText}>
        <Text style={styles.title}>Notifications</Text>
        <Text style={styles.subtitle}>Alerts and reminders</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.statusTitle}>{content.title}</Text>
        <Text style={styles.statusBody}>{content.body}</Text>

        {content.action && (
          <TouchableOpacity
            style={styles.actionButton}
            onPress={content.action.handler}
            activeOpacity={0.85}
          >
            <Text style={styles.actionText}>{content.action.label}</Text>
          </TouchableOpacity>
        )}

        <Text style={styles.footerNote}>
          Notification timing and frequency are managed automatically to avoid
          overload.
        </Text>
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
    marginBottom: 16,
  },
  title: {
    fontSize: Typography.greeting.fontSize,
    fontWeight: Typography.greeting.fontWeight,
    color: Colors.textPrimary,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: Typography.quote.fontSize,
    color: Colors.textSecondary,
  },

  card: {
    backgroundColor: "rgba(255,255,255,0.06)",
    borderRadius: Radius.card,
    padding: 18,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
  },

  statusTitle: {
    fontSize: 18,
    fontWeight: "900",
    color: Colors.textPrimary,
    marginBottom: 8,
  },
  statusBody: {
    fontSize: 14,
    color: "rgba(255,255,255,0.88)",
    marginBottom: 16,
  },

  actionButton: {
    backgroundColor: Colors.cards.settings,
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: "center",
    marginBottom: 14,
  },
  actionText: {
    color: Colors.textPrimary,
    fontSize: 15,
    fontWeight: "800",
  },

  footerNote: {
    fontSize: 12,
    color: "rgba(255,255,255,0.65)",
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
