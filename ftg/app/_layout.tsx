// app/_layout.tsx

import { Stack, useRouter, useSegments } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect, useState } from "react";
import { ActivityIndicator, View } from "react-native";
import { Colors } from "../constants/theme";
import { supabase } from "../lib/supabase";

export default function RootLayout() {
  const router = useRouter();
  const segments = useSegments();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const checkSession = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      const inAuth =
        segments[0] === undefined || // index (login)
        segments[0] === "signup";

      if (!session && !inAuth) {
        router.replace("/");
      }

      if (session && inAuth) {
        router.replace("/main");
      }

      setChecking(false);
    };

    checkSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => {
      checkSession();
    });

    return () => subscription.unsubscribe();
  }, [segments]);

  if (checking) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: Colors.background,
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <ActivityIndicator color={Colors.textPrimary} />
      </View>
    );
  }

  return (
    <>
      <Stack screenOptions={{ headerShown: false }} />
      <StatusBar style="light" />
    </>
  );
}
