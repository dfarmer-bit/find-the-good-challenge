import { router } from "expo-router";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { theme } from "../theme";

export default function Dashboard() {
  // Placeholder values — will replace with real DB values later
  const points = 0;
  const todayQuote = "Every day is a chance to grow.";

  return (
    <View style={styles.container}>
      <Text style={styles.pointsText}>Points: {points}</Text>

      <View style={styles.quoteBox}>
        <Text style={styles.quoteText}>{todayQuote}</Text>
      </View>

      <TouchableOpacity
        style={styles.button}
        onPress={() => router.push("/home")}
      >
        <Text style={styles.buttonText}>Enter Challenges</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.navy,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },

  pointsText: {
    fontSize: 24,
    fontWeight: "bold",
    color: theme.colors.yellow,
    marginBottom: 40,

    textShadowColor: "rgba(0, 0, 0, 0.35)",
    textShadowOffset: { width: 0.8, height: 0.8 },
    textShadowRadius: 1,
  },

  quoteBox: {
    backgroundColor: theme.colors.blue,
    padding: 20,
    borderRadius: 20,
    width: "90%",
    marginBottom: 50,
  },

  quoteText: {
    color: "white",
    fontSize: 18,
    textAlign: "center",

    textShadowColor: "rgba(0, 0, 0, 0.35)",
    textShadowOffset: { width: 0.6, height: 0.6 },
    textShadowRadius: 1,
  },

  button: {
    backgroundColor: theme.colors.pink,
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 10,
  },

  buttonText: {
    color: "white",
    fontSize: 18,
    fontWeight: "bold",
  },
});
