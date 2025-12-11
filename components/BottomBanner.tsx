import { Picker } from "@react-native-picker/picker";
import { router } from "expo-router";
import React, { useState } from "react";
import { Alert, Text, TextInput, TouchableOpacity, View } from "react-native";
import { supabase } from "../lib/supabase";

export default function SignUp() {
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [department, setDepartment] = useState("Clinical");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSignUp = async () => {
    if (!email || !fullName || !department || !password) {
      Alert.alert("Missing Fields", "Please complete all fields.");
      return;
    }

    try {
      setLoading(true);

      // 1. Create auth user
      const { data: authData, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
      });

      if (signUpError) {
        Alert.alert("Sign Up Error", signUpError.message);
        setLoading(false);
        return;
      }

      const user = authData.user;
      if (!user) {
        Alert.alert("Error", "User could not be created.");
        setLoading(false);
        return;
      }

      // 2. Create profile row with department + role = employee
      const { error: profileError } = await supabase.from("profiles").insert({
        id: user.id,
        email,
        full_name: fullName,
        department,
        role: "employee",
      });

      if (profileError) {
        Alert.alert("Profile Error", profileError.message);
        setLoading(false);
        return;
      }

      Alert.alert(
        "Success",
        "Account created! Please check your email to verify your address."
      );

      router.replace("/auth/login");
    } catch (error: any) {
      Alert.alert("Unexpected Error", error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: "#0E2A66",
        padding: 24,
        justifyContent: "center",
      }}
    >
      <Text
        style={{
          fontSize: 28,
          fontWeight: "700",
          color: "white",
          marginBottom: 30,
          textAlign: "center",
        }}
      >
        Create Account
      </Text>

      {/* Full Name */}
      <Text style={{ color: "white", marginBottom: 6 }}>Full Name</Text>
      <TextInput
        value={fullName}
        onChangeText={setFullName}
        placeholder="Enter your name"
        placeholderTextColor="#cccccc"
        style={{
          backgroundColor: "#1A3B7A",
          color: "white",
          padding: 12,
          borderRadius: 10,
          marginBottom: 16,
        }}
      />

      {/* Email */}
      <Text style={{ color: "white", marginBottom: 6 }}>Email</Text>
      <TextInput
        value={email}
        onChangeText={setEmail}
        placeholder="Enter email"
        placeholderTextColor="#cccccc"
        autoCapitalize="none"
        keyboardType="email-address"
        style={{
          backgroundColor: "#1A3B7A",
          color: "white",
          padding: 12,
          borderRadius: 10,
          marginBottom: 16,
        }}
      />

      {/* Department */}
      <Text style={{ color: "white", marginBottom: 6 }}>Department</Text>
      <View
        style={{
          backgroundColor: "#1A3B7A",
          borderRadius: 10,
          marginBottom: 16,
        }}
      >
        <Picker
          selectedValue={department}
          onValueChange={(val) => setDepartment(val)}
          dropdownIconColor="white"
          style={{ color: "white" }}
        >
          <Picker.Item label="Clinical" value="Clinical" />
          <Picker.Item label="Operational" value="Operational" />
          <Picker.Item label="Administration" value="Administration" />
        </Picker>
      </View>

      {/* Password */}
      <Text style={{ color: "white", marginBottom: 6 }}>Password</Text>
      <TextInput
        value={password}
        onChangeText={setPassword}
        placeholder="Enter password"
        placeholderTextColor="#cccccc"
        secureTextEntry
        style={{
          backgroundColor: "#1A3B7A",
          color: "white",
          padding: 12,
          borderRadius: 10,
          marginBottom: 24,
        }}
      />

      {/* Submit Button */}
      <TouchableOpacity
        onPress={handleSignUp}
        disabled={loading}
        style={{
          backgroundColor: loading ? "#5A7BBB" : "#6DA8FF",
          padding: 14,
          borderRadius: 10,
          alignItems: "center",
        }}
      >
        <Text style={{ fontSize: 18, fontWeight: "600", color: "#0E2A66" }}>
          {loading ? "Creating Account..." : "Sign Up"}
        </Text>
      </TouchableOpacity>
    </View>
  );
}
