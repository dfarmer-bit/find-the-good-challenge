// app/complete-challenge.tsx

import { useRouter, type Href } from "expo-router";
import {
  Dimensions,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { AppHeader } from "../components/AppHeader";
import {
  Colors,
  Components,
  Layout,
  Radius,
  Spacing,
  Typography,
} from "../constants/theme";

type Category = {
  label: string;
  icon: string;
  color: string;
  route: Href;
};

export default function CompleteChallengeScreen() {
  const router = useRouter();
  const screenWidth = Dimensions.get("window").width;

  const baseSize =
    (screenWidth - Spacing.screenPadding * 2 - Spacing.gridGap) / 2;

  const cardSize = baseSize * Layout.cardScale;

  const categories: Category[] = [
    {
      label: "Physical\nHealth",
      icon: "💪",
      color: Colors.cards.complete,
      route: "/challenges/physical-health",
    },
    {
      label: "Mental\nHealth",
      icon: "🧠",
      color: Colors.cards.journal,
      route: "/challenges/mental-health",
    },
    {
      label: "Spiritual\nHealth",
      icon: "✨",
      color: Colors.cards.goals,
      route: "/challenges/spiritual-health",
    },
    {
      label: "Emotional\nHealth",
      icon: "❤️",
      color: Colors.cards.messages,
      route: "/challenges/emotional-health",
    },
  ];

  return (
    <View style={styles.container}>
      <AppHeader />

      <View style={styles.headerText}>
        <Text style={styles.title}>Complete a Challenge</Text>
        <Text style={styles.subtitle}>Choose a category</Text>
      </View>

      <View style={styles.cardGrid}>
        {categories.map((item, index) => (
          <TouchableOpacity
            key={index}
            onPress={() => router.push(item.route)}
            style={[
              styles.card,
              {
                width: cardSize,
                height: cardSize,
                backgroundColor: item.color,
              },
            ]}
          >
            <Text style={styles.cardEmoji}>{item.icon}</Text>
            <Text style={styles.cardTitle}>{item.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Bottom Navigation */}
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
    marginBottom: 14,
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

  cardGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    columnGap: Spacing.gridGap,
    rowGap: Spacing.gridGap,
  },

  card: {
    borderRadius: Radius.card,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: Spacing.cardPadding,
  },

  cardEmoji: {
    fontSize: 28,
    marginBottom: 6,
  },

  cardTitle: {
    fontSize: Typography.cardTitle.fontSize,
    fontWeight: Typography.cardTitle.fontWeight,
    lineHeight: Typography.cardTitle.lineHeight,
    color: Colors.textPrimary,
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
