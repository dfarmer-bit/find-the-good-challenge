import { AppHeader } from "@/components/AppHeader";
import {
    Colors,
    Components,
    Layout,
    Spacing,
    Typography,
} from "@/constants/theme";
import { useRouter } from "expo-router";
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";

export default function WalkingRules() {
  const router = useRouter();

  return (
    <View style={styles.container}>
      <AppHeader />

      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Walking Challenge Rules</Text>

        <Text style={styles.sectionTitle}>How points work</Text>
        <Text style={styles.text}>• Steps are tracked using one device you choose</Text>
        <Text style={styles.text}>• Steps are reviewed once per day</Text>
        <Text style={styles.text}>• Only yesterday’s steps count toward points</Text>
        <Text style={styles.text}>• Points are awarded automatically</Text>

        <Text style={styles.sectionTitle}>Step goals</Text>
        <Text style={styles.text}>• 5,000 steps earns points</Text>
        <Text style={styles.text}>• 10,000 steps earns bonus points</Text>

        <Text style={styles.sectionTitle}>Your device matters</Text>
        <Text style={styles.text}>• Carry your phone if you selected phone tracking</Text>
        <Text style={styles.text}>• Wear your watch or Fitbit during activity</Text>
        <Text style={styles.text}>
          • If you don’t wear or carry your selected device, steps will not count
        </Text>

        <Text style={styles.sectionTitle}>Opening the app</Text>
        <Text style={styles.text}>
          • Open the app at least once a day to sync steps
        </Text>
        <Text style={styles.text}>
          • Today’s steps are shown for progress only
        </Text>

        <Text style={styles.sectionTitle}>Changing devices</Text>
        <Text style={styles.text}>• You can change your device at any time</Text>
        <Text style={styles.text}>
          • A new device is used starting the next day
        </Text>
        <Text style={styles.text}>• Past days are not changed</Text>
      </ScrollView>

      {/* Bottom Navigation */}
      <View style={styles.bottomBar}>
        <View style={styles.bottomButtonRow}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Text style={styles.backText}>⬅️ Back</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.push("/main")}
          >
            <Text style={styles.backText}>🏠 Home</Text>
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
  },
  content: {
    paddingHorizontal: Spacing.screenPadding,
    paddingBottom: 120,
  },
  title: {
    fontSize: Typography.greeting.fontSize,
    fontWeight: Typography.greeting.fontWeight,
    color: Colors.textPrimary,
    textAlign: "center",
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: Colors.textPrimary,
    marginTop: 18,
    marginBottom: 8,
  },
  text: {
    fontSize: 15,
    color: Colors.textSecondary,
    marginBottom: 6,
    lineHeight: 22,
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
  },
  backText: {
    color: Colors.textPrimary,
    fontSize: 16,
    fontWeight: "700",
  },
});
