import { useRouter } from "expo-router";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { AppHeader } from "../../../components/AppHeader";
import { Colors, Layout, Spacing } from "../../../constants/theme";

export default function ParticipationSummaryReport() {
  const router = useRouter();

  return (
    <View style={styles.container}>
      <AppHeader />
      <Text style={styles.text}>Participation Summary Report</Text>

      <View style={styles.bottomBar}>
        <TouchableOpacity onPress={() => router.back()} style={styles.btn}>
          <Text style={styles.btnText}>Back</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => router.push("/main")} style={styles.btn}>
          <Text style={styles.btnText}>Home</Text>
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
    justifyContent: "center",
    alignItems: "center",
  },
  text: { color: "#fff", fontSize: 18 },
  bottomBar: {
    position: "absolute",
    bottom: 16,
    flexDirection: "row",
    gap: 12,
  },
  btn: {
    backgroundColor: "rgba(255,255,255,0.08)",
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 18,
  },
  btnText: { color: "#fff", fontWeight: "800" },
});
