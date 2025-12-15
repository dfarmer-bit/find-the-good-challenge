import { useRouter } from "expo-router";
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import {
  Colors,
  Components,
  Layout,
  Radius,
  Spacing,
  Typography,
} from "../../constants/theme";

export default function ChallengesHomeScreen() {
  const router = useRouter();

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Challenges</Text>

      <TouchableOpacity
        style={styles.button}
        onPress={() => router.push("/challenges/emotional-health")}
      >
        <Text style={styles.buttonText}>Emotional Health</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.button}
        onPress={() => router.push("/challenges/mental-health")}
      >
        <Text style={styles.buttonText}>Mental Health</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.button}
        onPress={() => router.push("/challenges/spiritual-health")}
      >
        <Text style={styles.buttonText}>Spiritual Health</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.button}
        onPress={() => router.push("/challenges/physical-health")}
      >
        <Text style={styles.buttonText}>Physical Health</Text>
      </TouchableOpacity>

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
    paddingTop: 60,
    paddingHorizontal: Spacing.screenPadding,
  },

  title: {
    fontSize: Typography.greeting.fontSize,
    fontWeight: Typography.greeting.fontWeight,
    color: Colors.textPrimary,
    textAlign: "center",
    marginBottom: 18,
  },

  button: {
    backgroundColor: "rgba(255,255,255,0.08)",
    borderWidth: 2,
    borderColor: Colors.cards.complete,
    borderRadius: Radius.card,
    paddingVertical: 14,
    paddingHorizontal: 14,
    marginBottom: 12,
  },

  buttonText: {
    color: Colors.textPrimary,
    fontSize: 16,
    fontWeight: "600",
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
