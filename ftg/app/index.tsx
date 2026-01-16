import { Ionicons } from "@expo/vector-icons";
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
  TouchableOpacity,
  Image,
  View,
} from "react-native";
import { Colors, Radius, Spacing } from "../constants/theme";
import { supabase } from "../lib/supabase";

export default function LoginScreen() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);

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

    router.replace("/intro");
  };

  const handleForgotPassword = async () => {
    if (!email) {
      Alert.alert("Enter email", "Please enter your email address first.");
      return;
    }

    setResetLoading(true);

    const { error } = await supabase.auth.resetPasswordForEmail(email);

    setResetLoading(false);

    if (error) {
      Alert.alert("Reset failed", error.message);
      return;
    }

    Alert.alert(
      "Check your email",
      "We sent you a password reset link. After resetting, return here to log in."
    );
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
        <Image
          source={require("../assets/images/FTG1.png")}
          style={styles.logo}
          resizeMode="contain"
        />

        <TextInput
          style={styles.input}
          placeholder="Email"
          placeholderTextColor={Colors.textSecondary}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="email-address"
          value={email}
          onChangeText={setEmail}
        />

        <View style={styles.passwordWrapper}>
          <TextInput
            style={styles.passwordInput}
            placeholder="Password"
            placeholderTextColor={Colors.textSecondary}
            secureTextEntry={!showPassword}
            value={password}
            onChangeText={setPassword}
            autoCapitalize="none"
            autoCorrect={false}
          />

          <TouchableOpacity
            style={styles.eyeButton}
            onPress={() => setShowPassword((v) => !v)}
            accessibilityLabel={showPassword ? "Hide password" : "Show password"}
          >
            <Ionicons
              name={showPassword ? "eye-off" : "eye"}
              size={22}
              color={Colors.textSecondary}
            />
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={styles.button}
          onPress={handleLogin}
          disabled={loading}
        >
          <Text style={styles.buttonText}>
            {loading ? "Signing in..." : "Log In"}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={handleForgotPassword} disabled={resetLoading}>
          <Text style={styles.link}>
            {resetLoading ? "Sending reset..." : "Forgot password?"}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={() => router.push("/signup")}>
          <Text style={[styles.link, { marginTop: 12 }]}>Create my account</Text>
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

  logo: {
    width: 140,
    height: 140,
    alignSelf: "center",
    marginBottom: 24,
  },

  input: {
    backgroundColor: "rgba(255,255,255,0.08)",
    borderRadius: Radius.card,
    padding: 14,
    marginBottom: 14,
    color: Colors.textPrimary,
  },

  passwordWrapper: {
    position: "relative",
    marginBottom: 14,
  },

  passwordInput: {
    backgroundColor: "rgba(255,255,255,0.08)",
    borderRadius: Radius.card,
    padding: 14,
    paddingRight: 48,
    color: Colors.textPrimary,
  },

  eyeButton: {
    position: "absolute",
    right: 14,
    top: "50%",
    transform: [{ translateY: -11 }],
  },

  button: {
    backgroundColor: Colors.cards.complete,
    borderRadius: Radius.card,
    paddingVertical: 16,
    marginTop: 8,
    marginBottom: 12,
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
