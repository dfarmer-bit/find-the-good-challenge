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
  Spacing,
  Typography,
} from "../../constants/theme";

export default function GymScreen() {
  const router = useRouter();

  return (
    <View style={styles.container}>
      <AppHeader />

      <View style={styles.headerText}>
        <Text style={styles.icon}>🏋️‍♂️</Text>
        <Text style={styles.title}>Gym Challenge</Text>
        <Text style={styles.subtitle}>
          <Text style={styles.subtitleBold}>
            Worth 100 points | One time only{"\n"}
          </Text>
          Earn points for verified gym visits.
        </Text>
      </View>

      <View style={styles.infoBox}>
        <Text style={styles.infoText}>• Gym Activation +100 points (one time only)</Text>
        <Text style={styles.infoText}>• Activate a gym once to unlock check-ins</Text>
        <Text style={styles.infoText}>• Visits must last at least 15 minutes</Text>
        <Text style={styles.infoText}>• Weekly and streak bonuses apply automatically</Text>
      </View>

      <TouchableOpacity
        style={styles.primaryButton}
        onPress={() => router.push("/challenges/gym-activate")}
      >
        <Text style={styles.primaryButtonText}>Activate Gym</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.secondaryButton}>
        <Text style={styles.secondaryButtonText}>Check In</Text>
      </TouchableOpacity>

      <View style={styles.bottomBar}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Text style={styles.backIcon}>⬅️</Text>
          <Text style={styles.backText}>Back</Text>
        </TouchableOpacity>
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
    marginTop: 10,
    marginBottom: 12,
  },

  icon: {
    fontSize: 42,
    marginBottom: 6,
  },

  title: {
    fontSize: Typography.greeting.fontSize,
    fontWeight: Typography.greeting.fontWeight,
    color: Colors.textPrimary,
    marginBottom: 6,
    textAlign: "center",
  },

  subtitle: {
    fontSize: Typography.quote.fontSize,
    color: Colors.textSecondary,
    textAlign: "center",
    marginBottom: 16,
  },

  subtitleBold: {
    fontWeight: "700",
    color: Colors.textPrimary,
  },

  infoBox: {
    backgroundColor: "rgba(255,255,255,0.08)",
    borderRadius: 12,
    padding: 14,
    marginBottom: 20,
  },

  infoText: {
    color: Colors.textSecondary,
    fontSize: 14,
    lineHeight: 20,
    textAlign: "center",
  },

  primaryButton: {
    backgroundColor: Colors.cards.complete,
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 999,
    marginBottom: 12,
    width: "100%",
    alignItems: "center",
  },

  primaryButtonText: {
    color: Colors.textPrimary,
    fontSize: 16,
    fontWeight: "700",
  },

  secondaryButton: {
    borderColor: Colors.cards.complete,
    borderWidth: 2,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 999,
    width: "100%",
    alignItems: "center",
  },

  secondaryButtonText: {
    color: Colors.textPrimary,
    fontSize: 15,
    fontWeight: "700",
  },

  bottomBar: {
    position: "absolute",
    bottom: Layout.bottomNavSpacing,
    left: Spacing.screenPadding,
    right: Spacing.screenPadding,
    alignItems: "center",
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
