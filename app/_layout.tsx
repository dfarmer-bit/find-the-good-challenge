import { Session } from "@supabase/supabase-js";
import { Stack, router } from "expo-router";
import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

export default function RootLayout() {
  const [session, setSession] = useState<Session | null>(null);

  useEffect(() => {
    // Load session on startup
    const loadSession = async () => {
      const { data } = await supabase.auth.getSession();
      setSession(data.session);

      if (data.session) {
        router.replace("/dashboard"); // logged in
      } else {
        router.replace("/auth/login"); // logged out
      }
    };

    loadSession();

    // Listen for login/logout events
    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, newSession) => {
        setSession(newSession);

        if (newSession) {
          router.replace("/dashboard"); // after login
        } else {
          router.replace("/auth/login"); // after logout
        }
      }
    );

    return () => {
      listener.subscription.unsubscribe();
    };
  }, []);

  return (
    <Stack
      screenOptions={{
        headerShown: false,
      }}
    />
  );
}
