import { supabase } from "@/lib/supabase";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

const DEVICES = [
  { label: "Use My Phone", value: "phone" },
  { label: "Apple Health / Apple Watch", value: "apple" },
  { label: "Google Fit / Google Watch", value: "google" },
  { label: "Fitbit", value: "fitbit" },
];

export default function ConnectDevice() {
  const router = useRouter();
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUserId(data.user?.id ?? null);
    });
  }, []);

  const connectDevice = async (deviceType: string) => {
    if (!userId) return;

    await supabase.from("user_device_connections").upsert(
      {
        user_id: userId,
        device_type: deviceType,
        connected_at: new Date().toISOString(),
      },
      { onConflict: "user_id" }
    );

    router.replace("/challenges/physical-health/walking");
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Connect a Fitness Device</Text>
      <Text style={styles.subtitle}>
        Choose how you'd like to track your steps.
      </Text>

      {DEVICES.map((device) => (
        <TouchableOpacity
          key={device.value}
          style={styles.card}
          onPress={() => connectDevice(device.value)}
        >
          <Text style={styles.cardText}>{device.label}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0E2A66",
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    color: "#FFFFFF",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: "#BFD3FF",
    marginBottom: 24,
  },
  card: {
    backgroundColor: "#1E3A8A",
    padding: 18,
    borderRadius: 16,
    marginBottom: 12,
  },
  cardText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
});
