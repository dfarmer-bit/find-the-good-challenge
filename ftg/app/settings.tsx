// app/settings.tsx
// FULL FILE REPLACEMENT
// DESIGN-ONLY
// Update:
// - Wire all Settings cards to their routes

import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { AppHeader } from "../components/AppHeader";
import {
  Colors,
  Components,
  Layout,
  Radius,
  Spacing,
  Typography,
} from "../constants/theme";

type SettingsCard = {
  key: string;
  title: string;
  subtitle: string;
  icon: string;
  color: string;
  route: string;
};

export default function SettingsScreen() {
  const router = useRouter();

  const cards: SettingsCard[] = [
    {
      key: "notifications",
      title: "Notifications",
      subtitle: "Reminders, challenges, messages",
      icon: "🔔",
      color: "#3A86FF",
      route: "/settings/notifications",
    },
    {
      key: "location",
      title: "Location Access",
      subtitle: "Required for walking challenges",
      icon: "📍",
      color: "#2EC4B6",
      route: "/settings/location-access",
    },
    {
      key: "walking",
      title: "Walking Setup",
      subtitle: "Steps, device, and permissions",
      icon: "🚶",
      color: "#FF5DA2",
      route: "/settings/walking-setup",
    },
  ];

  return (
    <View style={styles.container}>
      <AppHeader />

      <View style={styles.headerText}>
        <Text style={styles.title}>Settings</Text>
        <Text style={styles.subtitle}>
          Manage permissions and app features
        </Text>
      </View>

      <View style={styles.cardColumn}>
        {cards.map((card) => (
          <TouchableOpacity
            key={card.key}
            activeOpacity={0.9}
            onPress={() => router.push(card.route as any)}
            style={[styles.card, { backgroundColor: card.color }]}
          >
            <LinearGradient
              colors={["rgba(255,255,255,0.35)", "rgba(255,255,255,0.05)"]}
              start={{ x: 1, y: 0 }}
              end={{ x: 0, y: 1 }}
              style={styles.cornerBubble}
            >
              <Text style={styles.bubbleIcon}>{card.icon}</Text>
            </LinearGradient>

            <Text style={styles.cardTitle}>{card.title}</Text>
            <Text style={styles.cardSubtitle}>{card.subtitle}</Text>
          </TouchableOpacity>
        ))}
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
    textAlign: "center",
  },

  cardColumn: {
    gap: 14,
  },
  card: {
    height: 110,
    borderRadius: Radius.card,
    padding: 16,
    justifyContent: "flex-end",
    overflow: "hidden",
  },
  cornerBubble: {
    position: "absolute",
    top: -22,
    right: -22,
    width: 90,
    height: 90,
    borderRadius: 26,
    justifyContent: "flex-end",
    alignItems: "flex-start",
    padding: 16,
  },
  bubbleIcon: {
    fontSize: 24,
  },
  cardTitle: {
    fontSize: Typography.cardTitle.fontSize,
    fontWeight: Typography.cardTitle.fontWeight,
    lineHeight: Typography.cardTitle.lineHeight,
    color: Colors.textPrimary,
    marginBottom: 4,
  },
  cardSubtitle: {
    fontSize: 13,
    color: "rgba(255,255,255,0.85)",
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
