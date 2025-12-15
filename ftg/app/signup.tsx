// app/signup.tsx

import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useState } from "react";
import {
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Colors, Layout, Spacing, Typography } from "../constants/theme";
import { supabase } from "../lib/supabase";

export default function SignupScreen() {
  const router = useRouter();

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [department, setDepartment] = useState<
    "Operations" | "Clinical" | "Administration" | ""
  >("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const handleSignup = async () => {
    setError("");

    if (
      !firstName ||
      !lastName ||
      !department ||
      !email ||
      !password ||
      !confirmPassword
    ) {
      setError("Please complete all fields.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: `${firstName} ${lastName}`,
          department,
          role: "user",
        },
      },
    });

    setLoading(false);

    if (error) {
      setError(error.message);
      return;
    }

    setSuccess(true);
  };

  const resendConfirmation = async () => {
    await supabase.auth.resend({
      type: "signup",
      email,
    });
  };

  const departmentConfig = {
    Operations: {
      color: "#6DA8FF",
      icon: "construct",
    },
    Clinical: {
      color: "#4CAF8F",
      icon: "medkit",
    },
    Administration: {
      color: "#7A5CFA",
      icon: "briefcase",
    },
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
        <Text style={styles.title}>Create Your Account</Text>

        {success && (
          <View style={styles.successBox}>
            <Text style={styles.successText}>
              Check your email to confirm your account.
            </Text>
            <TouchableOpacity onPress={resendConfirmation}>
              <Text style={styles.link}>Resend confirmation email</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => router.replace("/")}>
              <Text style={styles.link}>Back to Login</Text>
            </TouchableOpacity>
          </View>
        )}

        {!success && (
          <>
            {error !== "" && <Text style={styles.errorText}>{error}</Text>}

            <View style={styles.row}>
              <TextInput
                style={[styles.input, styles.half]}
                placeholder="First Name"
                placeholderTextColor="rgba(255,255,255,0.6)"
                value={firstName}
                onChangeText={setFirstName}
              />
              <TextInput
                style={[styles.input, styles.half]}
                placeholder="Last Name"
                placeholderTextColor="rgba(255,255,255,0.6)"
                value={lastName}
                onChangeText={setLastName}
              />
            </View>

            <View style={styles.departmentRow}>
              {(Object.keys(departmentConfig) as Array<
                "Operations" | "Clinical" | "Administration"
              >).map((dept) => {
                const config = departmentConfig[dept];
                const selected = department === dept;

                return (
                  <TouchableOpacity
                    key={dept}
                    style={[
                      styles.departmentButton,
                      { backgroundColor: config.color },
                      selected && styles.departmentSelected,
                    ]}
                    onPress={() => setDepartment(dept)}
                    activeOpacity={0.85}
                  >
                    <Ionicons
                      name={config.icon as any}
                      size={18}
                      color="#FFFFFF"
                    />
                    <Text style={styles.departmentText} numberOfLines={1}>
                      {dept}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <TextInput
              style={styles.input}
              placeholder="Email Address"
              placeholderTextColor="rgba(255,255,255,0.6)"
              autoCapitalize="none"
              keyboardType="email-address"
              value={email}
              onChangeText={setEmail}
            />

            <View style={styles.passwordField}>
              <TextInput
                style={styles.passwordInput}
                placeholder="Password"
                placeholderTextColor="rgba(255,255,255,0.6)"
                secureTextEntry={!showPassword}
                value={password}
                onChangeText={setPassword}
              />
              <TouchableOpacity
                onPress={() => setShowPassword(!showPassword)}
              >
                <Ionicons
                  name={showPassword ? "eye-off" : "eye"}
                  size={22}
                  color={Colors.textPrimary}
                />
              </TouchableOpacity>
            </View>

            <TextInput
              style={styles.input}
              placeholder="Confirm Password"
              placeholderTextColor="rgba(255,255,255,0.6)"
              secureTextEntry={!showPassword}
              value={confirmPassword}
              onChangeText={setConfirmPassword}
            />

            <View style={styles.logoZone}>
              <TouchableOpacity
                style={[
                  styles.logoButton,
                  loading && { opacity: 0.6 },
                ]}
                onPress={handleSignup}
                disabled={loading}
              >
                <Image
                  source={require("../assets/images/FTG1.png")}
                  style={styles.logo}
                  resizeMode="contain"
                />
                <Text style={styles.signupLabel}>
                  {loading ? "Creating Account…" : "Sign Up"}
                </Text>
              </TouchableOpacity>
            </View>
          </>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingTop: Layout.topScreenPadding,
    paddingHorizontal: Spacing.screenPadding,
    backgroundColor: Colors.background,
    flexGrow: 1,
  },
  title: {
    fontSize: Typography.greeting.fontSize,
    fontWeight: Typography.greeting.fontWeight,
    color: Colors.textPrimary,
    textAlign: "center",
    marginBottom: 18,
  },
  errorText: {
    color: "#FF6B6B",
    textAlign: "center",
    marginBottom: 10,
  },
  successBox: {
    alignItems: "center",
    marginTop: 20,
  },
  successText: {
    color: Colors.textPrimary,
    textAlign: "center",
    marginBottom: 12,
  },
  link: {
    color: Colors.cards.complete,
    textDecorationLine: "underline",
    marginTop: 8,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  half: { width: "48%" },
  input: {
    backgroundColor: "rgba(255,255,255,0.1)",
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 14,
    color: Colors.textPrimary,
    marginBottom: 12,
    fontSize: 15,
  },
  departmentRow: {
    flexDirection: "row",
    marginBottom: 12,
  },
  departmentButton: {
    flex: 1,
    marginHorizontal: 4,
    paddingVertical: 12,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  departmentSelected: {
    borderWidth: 2,
    borderColor: "#FFFFFF",
  },
  departmentText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "600",
    marginTop: 4,
  },
  passwordField: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.1)",
    borderRadius: 10,
    paddingHorizontal: 14,
    marginBottom: 12,
  },
  passwordInput: {
    flex: 1,
    paddingVertical: 12,
    color: Colors.textPrimary,
  },
  logoZone: {
    marginTop: 20,
    alignItems: "center",
  },
  logoButton: {
    paddingVertical: 18,
    paddingHorizontal: 18,
    backgroundColor: "rgba(255,255,255,0.08)",
    borderWidth: 3,
    borderColor: Colors.cards.complete,
    borderRadius: 22,
    alignItems: "center",
  },
  logo: {
    width: 260,
    height: 180,
  },
  signupLabel: {
    marginTop: 6,
    color: Colors.cards.complete,
    fontSize: 16,
    fontWeight: "600",
  },
});
