// app/index.tsx

import { useRouter } from "expo-router";
import { useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity
} from "react-native";
import { Colors, Radius, Spacing, Typography } from "../constants/theme";
import { supabase } from "../lib/supabase";

export default function LoginScreen() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert("Missing info", "Enter email and password");
      return;
    }

    setLoading(true);

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    setLoading(false);

    if (error) {
      if (error.message.toLowerCase().includes("confirm")) {
        Alert.alert(
          "Email not confirmed",
          "Please check your email and confirm your address before logging in."
        );
        return;
      }

      Alert.alert("Login failed", "Invalid email or password");
      return;
    }

    router.replace("/main");
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.title}>Find the Good</Text>

        <TextInput
          style={styles.input}
          placeholder="Email"
          placeholderTextColor={Colors.textSecondary}
          autoCapitalize="none"
          value={email}
          onChangeText={setEmail}
        />

        <TextInput
          style={styles.input}
          placeholder="Password"
          placeholderTextColor={Colors.textSecondary}
          secureTextEntry
          value={password}
          onChangeText={setPassword}
        />

        <TouchableOpacity
          style={styles.button}
          onPress={handleLogin}
          disabled={loading}
        >
          <Text style={styles.buttonText}>
            {loading ? "Signing in..." : "Log In"}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={() => router.push("/signup")}>
          <Text style={styles.link}>Create my account</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    backgroundColor: Colors.background,
    padding: Spacing.screenPadding,
    justifyContent: "center",
  },
  title: {
    fontSize: Typography.greeting.fontSize,
    fontWeight: Typography.greeting.fontWeight,
    color: Colors.textPrimary,
    textAlign: "center",
    marginBottom: 32,
  },
  input: {
    backgroundColor: "rgba(255,255,255,0.08)",
    borderRadius: Radius.card,
    padding: 14,
    marginBottom: 14,
    color: Colors.textPrimary,
  },
  button: {
    backgroundColor: Colors.cards.complete,
    borderRadius: Radius.card,
    paddingVertical: 16,
    marginTop: 8,
    marginBottom: 16,
  },
  buttonText: {
    color: Colors.textPrimary,
    textAlign: "center",
    fontSize: 16,
    fontWeight: "600",
  },
  link: {
    color: Colors.textSecondary,
    textAlign: "center",
    textDecorationLine: "underline",
  },
});
