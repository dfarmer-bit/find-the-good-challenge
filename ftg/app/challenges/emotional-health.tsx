// app/challenges/emotional-health.tsx

import { useRouter } from "expo-router";
import {
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

type Card = {
  label: string;
  icon: string;
  color: string;
  route?: string;
};

export default function EmotionalHealthScreen() {
  const router = useRouter();

  const cards: Card[] = [
  {
    label: "Gratitude Journal",
    icon: "📝",
    color: Colors.cards.journal,
    route: "/challenges/gratitude-journal",
  },
  {
    label: "Mindfulness & Meditation",
    icon: "🧘",
    color: Colors.cards.complete,
     route: "/challenges/mindfulness",
  },
];

  return (
    <View style={styles.container}>
      <AppHeader />

      <View style={styles.headerText}>
        <Text style={styles.title}>Emotional Health</Text>
        <Text style={styles.subtitle}>Choose a challenge</Text>
      </View>

      <View style={styles.cardColumn}>
        {cards.map((card, index) => (
          <TouchableOpacity
            key={index}
            onPress={() => {
              if (card.route) router.push(card.route as any);
            }}
            style={[styles.card, { backgroundColor: card.color }]}
          >
            <Text style={styles.cardEmoji}>{card.icon}</Text>
            <Text style={styles.cardTitle}>{card.label}</Text>
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

  cardColumn: {
    alignItems: "center",
    gap: Spacing.gridGap,
  },

  card: {
    width: "100%",
    borderRadius: Radius.card,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 18,
    paddingHorizontal: Spacing.cardPadding,
  },

  cardEmoji: {
    fontSize: 28,
    marginBottom: 6,
  },

  cardTitle: {
    fontSize: Typography.cardTitle.fontSize,
    fontWeight: Typography.cardTitle.fontWeight,
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
