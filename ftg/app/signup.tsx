// app/signup.tsx
// FULL FILE REPLACEMENT (adds Back to Login button under title)

import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useState } from "react";
import {
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
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

  const accentGreen = "#4CAF8F"; // Clinical button green

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
      color: accentGreen,
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

        <Pressable onPress={() => router.replace("/")}>
          <Text style={styles.backLink}>← Back to Login</Text>
        </Pressable>

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

            {/* First + Last */}
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

            {/* Email */}
            <TextInput
              style={styles.input}
              placeholder="Email Address"
              placeholderTextColor="rgba(255,255,255,0.6)"
              autoCapitalize="none"
              keyboardType="email-address"
              value={email}
              onChangeText={setEmail}
            />

            {/* Department AFTER email */}
            <View style={styles.deptHeaderRow}>
              <Text style={styles.deptLabel}>Department</Text>
              <Text style={styles.deptHint}>(Select One)</Text>
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

            {/* Password */}
            <View style={styles.passwordField}>
              <TextInput
                style={styles.passwordInput}
                placeholder="Password"
                placeholderTextColor="rgba(255,255,255,0.6)"
                secureTextEntry={!showPassword}
                value={password}
                onChangeText={setPassword}
              />
              <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                <Ionicons
                  name={showPassword ? "eye-off" : "eye"}
                  size={22}
                  color={Colors.textPrimary}
                />
              </TouchableOpacity>
            </View>

            {/* Confirm */}
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
                style={[styles.logoButton, loading && { opacity: 0.6 }]}
                onPress={handleSignup}
                disabled={loading}
                activeOpacity={0.86}
              >
                <Image
                  source={require("../assets/images/FTG1.png")}
                  style={styles.logo}
                  resizeMode="contain"
                />

                <View style={styles.signupRow}>
                  <Text style={styles.signupLabel}>
                    {loading ? "Creating Account…" : "Sign Up"}
                  </Text>
                  <View style={styles.arrowPill}>
                    <Ionicons
                      name="arrow-forward"
                      size={16}
                      color={Colors.cards.complete}
                    />
                  </View>
                </View>

                <Text style={styles.tapHint}>Tap to create your account</Text>
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
    marginBottom: 10,
  },
  backLink: {
    textAlign: "center",
    color: Colors.cards.complete,
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 16,
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

  // GREEN OUTLINE INPUTS
  input: {
    backgroundColor: "rgba(255,255,255,0.10)",
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 14,
    color: Colors.textPrimary,
    marginBottom: 12,
    fontSize: 15,

    borderWidth: 1.5,
    borderColor: "rgba(76,175,143,0.85)", // Clinical green
  },

  deptHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 2,
    marginBottom: 8,
  },
  deptLabel: {
    color: Colors.textPrimary,
    fontSize: 13,
    fontWeight: "700",
    marginRight: 6,
    opacity: 0.95,
  },
  deptHint: {
    color: "rgba(255,255,255,0.7)",
    fontSize: 13,
    fontWeight: "600",
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

  // GREEN OUTLINE PASSWORD FIELD
  passwordField: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.10)",
    borderRadius: 10,
    paddingHorizontal: 14,
    marginBottom: 12,

    borderWidth: 1.5,
    borderColor: "rgba(76,175,143,0.85)", // Clinical green
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
    backgroundColor: "rgba(255,255,255,0.10)",
    borderWidth: 3,
    borderColor: Colors.cards.complete,
    borderRadius: 22,
    alignItems: "center",

    shadowColor: "#000",
    shadowOpacity: 0.28,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 8 },
    elevation: 6,
  },
  logo: {
    width: 260,
    height: 180,
  },

  signupRow: {
    marginTop: 6,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  signupLabel: {
    color: Colors.cards.complete,
    fontSize: 16,
    fontWeight: "700",
  },
  arrowPill: {
    marginLeft: 10,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.22)",
    backgroundColor: "rgba(0,0,0,0.18)",
    alignItems: "center",
    justifyContent: "center",
  },
  tapHint: {
    marginTop: 8,
    color: "rgba(255,255,255,0.65)",
    fontSize: 12,
    fontWeight: "600",
  },
});
