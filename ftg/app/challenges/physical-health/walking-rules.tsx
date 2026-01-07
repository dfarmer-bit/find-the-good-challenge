import { AppHeader } from "@/components/AppHeader";
import { Colors, Components, Layout, Spacing, Typography } from "@/constants/theme";
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
        <Text style={styles.text}>• Steps are checked once per day</Text>
        <Text style={styles.text}>• Only yesterday’s steps count toward points</Text>
        <Text style={styles.text}>• Points are awarded automatically</Text>

        <Text style={styles.sectionTitle}>Step goals</Text>
        <Text style={styles.text}>• 5,000 steps earns points</Text>
        <Text style={styles.text}>• 10,000 steps earns bonus points</Text>

        <Text style={styles.sectionTitle}>Using a phone or watch</Text>
        <Text style={styles.text}>
          • You can earn credit using your phone OR a synced wearable (Apple Watch / Android Watch)
        </Text>
        <Text style={styles.text}>
          • If you use a watch, your steps must sync to your phone for them to count
        </Text>

        <Text style={styles.sectionTitle}>Apple Watch tips</Text>
        <Text style={styles.text}>• Keep your Apple Watch paired to your iPhone</Text>
        <Text style={styles.text}>• Make sure motion/fitness permissions are enabled</Text>
        <Text style={styles.text}>• Watch steps usually count even if your phone stays on the desk</Text>

        <Text style={styles.sectionTitle}>Android Watch tips</Text>
        <Text style={styles.text}>
          • Make sure your watch is syncing steps to your phone’s health/fitness app (varies by device)
        </Text>
        <Text style={styles.text}>
          • Some Android devices may not include watch steps perfectly in the phone’s total
        </Text>
        <Text style={styles.text}>
          • If your totals look low, open your watch/fitness app first, then open this app to sync
        </Text>

        <Text style={styles.sectionTitle}>Opening the app</Text>
        <Text style={styles.text}>• Open the app at least once a day to sync steps</Text>
        <Text style={styles.text}>• Today’s steps are shown for progress only</Text>
      </ScrollView>

      {/* Bottom Navigation */}
      <View style={styles.bottomBar}>
        <View style={styles.bottomButtonRow}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Text style={styles.backText}>⬅️ Back</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.backButton} onPress={() => router.push("/main")}>
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
