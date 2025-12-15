import * as Location from "expo-location";
import { useRouter } from "expo-router";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
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
import { startGym } from "../../lib/gym";

export default function GymActivateScreen() {
  const router = useRouter();
  const GYM_CHALLENGE_ID = "8d3dec03-9d52-4948-b6e9-d9aa399cf733";

  const handleSubmit = async () => {
    try {
      // 1️⃣ Request location permission
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Location required", "Please allow location access.");
        return;
      }

      // 2️⃣ Get current GPS position
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });

      const lat = location.coords.latitude;
      const lng = location.coords.longitude;

      // 3️⃣ Send to backend
      const result = await startGym(GYM_CHALLENGE_ID, lat, lng);

      Alert.alert(
        "Submitted",
        "Location submitted. If verified, approval and points will follow automatically."
      );

      console.log(result);
    } catch (err: any) {
      Alert.alert("Error", err.message ?? "Something went wrong");
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <View style={styles.container}>
        <AppHeader />

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={styles.title}>Activate a Gym</Text>
          <Text style={styles.subtitle}>
            We’ll use your location to verify this gym.
          </Text>

          <View style={styles.infoBox}>
            <Text style={styles.infoText}>
              • Location is checked once{"\n"}
              • Approved gyms never need review again{"\n"}
              • Points are awarded automatically when verified
            </Text>
          </View>

          <TouchableOpacity
            style={styles.primaryButton}
            onPress={handleSubmit}
          >
            <Text style={styles.primaryButtonText}>
              Activate This Gym
            </Text>
          </TouchableOpacity>

          <View style={{ height: 140 }} />
        </ScrollView>

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
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
    paddingTop: Layout.topScreenPadding,
    paddingHorizontal: Spacing.screenPadding,
  },

  scrollContent: {
    paddingTop: 10,
  },

  title: {
    fontSize: Typography.greeting.fontSize,
    fontWeight: Typography.greeting.fontWeight,
    color: Colors.textPrimary,
    textAlign: "center",
    marginBottom: 6,
  },

  subtitle: {
    fontSize: Typography.quote.fontSize,
    color: Colors.textSecondary,
    textAlign: "center",
    marginBottom: 16,
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
    paddingVertical: 16,
    borderRadius: 999,
    alignItems: "center",
    marginTop: 12,
  },

  primaryButtonText: {
    color: Colors.textPrimary,
    fontSize: 16,
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
