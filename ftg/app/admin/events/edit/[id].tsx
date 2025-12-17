import {
    Colors,
    Components,
    Layout,
    Radius,
    Spacing,
    Typography,
} from "@/constants/theme";
import { supabase } from "@/lib/supabase";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";

export default function AdminEventDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [event, setEvent] = useState<any>(null);

  useEffect(() => {
    if (!id) return;
    loadEvent();
  }, [id]);

  async function loadEvent() {
    setLoading(true);

    const { data, error } = await supabase
      .from("events")
      .select("*")
      .eq("id", id);

    if (error || !data || data.length === 0) {
      setEvent(null);
      setLoading(false);
      return;
    }

    setEvent(data[0]);
    setLoading(false);
  }

  async function handleCheckIn() {
    try {
      await event.check_in_logic();
      Alert.alert("Checked In", "Check-in completed successfully.");
      loadEvent();
    } catch (e: any) {
      Alert.alert("Check-in Failed", e.message ?? "Unable to check in.");
    }
  }

  if (loading) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Event Detail</Text>
        <ActivityIndicator color={Colors.textPrimary} />
        <BottomNav router={router} />
      </View>
    );
  }

  if (!event) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Event Detail</Text>
        <View style={styles.card}>
          <Text style={styles.value}>Event not found.</Text>
        </View>
        <BottomNav router={router} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Event Detail</Text>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>{event.title}</Text>

        <Text style={styles.label}>Date</Text>
        <Text style={styles.value}>
          {new Date(event.start_time).toLocaleString()}
        </Text>

        <Text style={styles.label}>Location</Text>
        <Text style={styles.value}>{event.location_name}</Text>

        <Text style={styles.label}>Description</Text>
        <Text style={styles.value}>{event.description}</Text>

        <TouchableOpacity style={styles.actionButton} onPress={handleCheckIn}>
          <Text style={styles.actionText}>Check In</Text>
        </TouchableOpacity>
      </View>

      <BottomNav router={router} />
    </View>
  );
}

function BottomNav({ router }: { router: any }) {
  return (
    <View style={styles.bottomBar}>
      <View style={styles.bottomButtonRow}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Text style={styles.backIcon}>⬅️</Text>
          <Text style={styles.backText}>Back</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.push("/main")}
        >
          <Text style={styles.backIcon}>🏠</Text>
          <Text style={styles.backText}>Home</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
    paddingTop: 60,
    paddingHorizontal: Spacing.screenPadding,
  },

  title: {
    fontSize: Typography.greeting.fontSize,
    fontWeight: Typography.greeting.fontWeight,
    color: Colors.textPrimary,
    textAlign: "center",
    marginBottom: 18,
  },

  card: {
    margin: 16,
    padding: 16,
    backgroundColor: "rgba(255,255,255,0.08)",
    borderWidth: 2,
    borderColor: Colors.cards.complete,
    borderRadius: Radius.card,
  },

  cardTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: Colors.textPrimary,
    marginBottom: 12,
    textAlign: "center",
  },

  label: {
    fontSize: 12,
    fontWeight: "600",
    color: Colors.textSecondary,
    marginTop: 10,
  },

  value: {
    fontSize: 14,
    color: Colors.textPrimary,
    marginTop: 2,
  },

  actionButton: {
    marginTop: 20,
    backgroundColor: Colors.cards.complete,
    borderRadius: Radius.card,
    paddingVertical: 12,
  },

  actionText: {
    color: Colors.textPrimary,
    fontWeight: "700",
    textAlign: "center",
    fontSize: 16,
  },

  bottomBar: {
    position: "absolute",
    bottom: Layout.bottomNavSpacing,
    left: Spacing.screenPadding,
    right: Spacing.screenPadding,
    alignItems: "center",
  },

  bottomButtonRow: {
    flexDirection: "row",
    gap: 16,
  },

  backButton: {
    ...Components.backButton,
    flexDirection: "row",
    alignItems: "center",
  },

  backIcon: {
    fontSize: 18,
    marginRight: 8,
  },

  backText: {
    color: Colors.textPrimary,
    fontSize: 16,
    fontWeight: "700",
  },
});
