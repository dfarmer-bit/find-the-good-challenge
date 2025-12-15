import { useRouter, type Href } from "expo-router";
import { useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Colors, Layout, Spacing, Typography } from "../constants/theme";
import { supabase } from "../lib/supabase";

const HOME_ROUTE: Href = "/";

export default function LoginScreen() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert("Missing Info", "Please enter email and password.");
      return;
    }

    setLoading(true);

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    setLoading(false);

    if (error) {
      Alert.alert("Login Error", error.message);
      return;
    }

    router.replace(HOME_ROUTE);
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={Layout.topScreenPadding}
    >
      <View style={styles.inner}>
        <Text style={styles.title}>Welcome Back</Text>

        <TextInput
          style={styles.input}
          placeholder="Email Address"
          placeholderTextColor="rgba(255,255,255,0.6)"
          autoCapitalize="none"
          keyboardType="email-address"
          value={email}
          onChangeText={setEmail}
        />

        <TextInput
          style={styles.input}
          placeholder="Password"
          placeholderTextColor="rgba(255,255,255,0.6)"
          secureTextEntry
          value={password}
          onChangeText={setPassword}
        />

        <TouchableOpacity
          style={styles.primaryButton}
          onPress={handleLogin}
          disabled={loading}
        >
          <Text style={styles.primaryButtonText}>
            {loading ? "Signing In…" : "Log In"}
          </Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
    paddingTop: Layout.topScreenPadding,
  },
  inner: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: Spacing.screenPadding,
    paddingBottom: Platform.OS === "ios" ? 40 : 20,
  },
  title: {
    fontSize: Typography.greeting.fontSize,
    fontWeight: Typography.greeting.fontWeight,
    color: Colors.textPrimary,
    textAlign: "center",
    marginBottom: 32,
  },
  input: {
    backgroundColor: "rgba(255,255,255,0.1)",
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 14,
    color: Colors.textPrimary,
    marginBottom: 12,
    fontSize: 15,
  },
  primaryButton: {
    backgroundColor: Colors.cards.complete,
    paddingVertical: 16,
    borderRadius: 999,
    alignItems: "center",
    marginTop: 8,
  },
  primaryButtonText: {
    color: Colors.textPrimary,
    fontSize: 16,
    fontWeight: "700",
  },
});
