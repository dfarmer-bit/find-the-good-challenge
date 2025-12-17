// app/challenges/emotional-health.tsx

import { LinearGradient } from "expo-linear-gradient";
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
      label: "Mindfulness &\nMeditation",
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
            onPress={() => card.route && router.push(card.route as any)}
            style={[styles.card, { backgroundColor: card.color }]}
          >
            {/* Right-side vertical bubble */}
            <LinearGradient
              colors={["rgba(255,255,255,0.35)", "rgba(255,255,255,0.05)"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.sideBubble}
            >
              <Text style={styles.bubbleIcon}>{card.icon}</Text>
            </LinearGradient>

            {/* Text */}
            <View style={styles.textWrapper}>
              <Text style={styles.cardTitle}>{card.label}</Text>
            </View>
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
    gap: Spacing.gridGap,
  },

  card: {
    width: "100%",
    height: 120,
    borderRadius: Radius.card,
    justifyContent: "center",
    overflow: "hidden",
  },

  sideBubble: {
    position: "absolute",
    right: 0,
    top: 0,
    bottom: 0,
    width: 96,
    justifyContent: "center",
    alignItems: "center",
  },

  bubbleIcon: {
    fontSize: 36,
  },

  textWrapper: {
    paddingLeft: Spacing.cardPadding,
    paddingRight: 140,
    justifyContent: "center",
  },

  cardTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: Colors.textPrimary,
    textAlign: "left",
    flexWrap: "wrap",
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
