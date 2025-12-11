import { router } from "expo-router";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

export default function Verify() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Check Your Email</Text>

      <Text style={styles.text}>
        We've sent you a confirmation link. Please open your email and verify
        your account to continue.
      </Text>

      <TouchableOpacity
        style={styles.button}
        onPress={() => router.replace("/auth/login")}
      >
        <Text style={styles.buttonText}>Return to Login</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
    backgroundColor: "#0E2A66",
  },
  title: {
    fontSize: 28,
    color: "white",
    fontWeight: "bold",
    marginBottom: 20,
    textAlign: "center",
  },
  text: {
    color: "white",
    opacity: 0.9,
    textAlign: "center",
    fontSize: 16,
    marginBottom: 40,
    paddingHorizontal: 10,
  },
  button: {
    backgroundColor: "#6DA8FF",
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
