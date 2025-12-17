import {
    Colors,
    Components,
    Layout,
    Radius,
    Spacing,
} from "@/constants/theme";
import { supabase } from "@/lib/supabase";
import * as Location from "expo-location";
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

export default function EventDetailScreen() {
  const params = useLocalSearchParams();
  const eventId = Array.isArray(params.id) ? params.id[0] : params.id;
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [event, setEvent] = useState<any>(null);
  const [invite, setInvite] = useState<any>(null);
  const [checkingIn, setCheckingIn] = useState(false);

  useEffect(() => {
    if (eventId) loadData();
  }, [eventId]);

  async function loadData() {
    setLoading(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setLoading(false);
      return;
    }

    // 1) Load event directly
    const { data: eventData } = await supabase
      .from("events")
      .select("*")
      .eq("id", eventId)
      .single();

    if (!eventData) {
      setEvent(null);
      setInvite(null);
      setLoading(false);
      return;
    }

    // 2) Verify invite exists
    const { data: inviteData } = await supabase
      .from("event_invites")
      .select("*")
      .eq("event_id", eventId)
      .eq("user_id", user.id)
      .single();

    if (!inviteData) {
      setEvent(null);
      setInvite(null);
      setLoading(false);
      return;
    }

    setEvent(eventData);
    setInvite(inviteData);
    setLoading(false);
  }

  function distanceMeters(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
  ) {
    const R = 6371000;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  async function handleCheckIn() {
    if (!event || !invite || invite.checked_in_at || checkingIn) return;
    setCheckingIn(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user?.id)
      .single();

    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Location required", "Please allow location access.");
      setCheckingIn(false);
      return;
    }

    const location = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.High,
    });

    const radius = event.radius_meters ?? 100;

    const distance = distanceMeters(
      location.coords.latitude,
      location.coords.longitude,
      event.lat,
      event.lng
    );

    // Admin override
    if (distance > radius && profile?.role === "admin") {
      await supabase
        .from("event_invites")
        .update({
          status: "attended",
          checked_in_at: new Date().toISOString(),
          admin_override: true,
        })
        .eq("id", invite.id);

      Alert.alert("Checked In (Admin Override)");
      setCheckingIn(false);
      loadData();
      return;
    }

    if (distance > radius) {
      Alert.alert(
        "Location check failed",
        "You must be physically at the event location to check in."
      );
      setCheckingIn(false);
      return;
    }

    await supabase
      .from("event_invites")
      .update({
        status: "attended",
        checked_in_at: new Date().toISOString(),
      })
      .eq("id", invite.id);

    Alert.alert("Checked In");
    setCheckingIn(false);
    loadData();
  }

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator />
        <BottomNav router={router} />
      </View>
    );
  }

  if (!event || !invite) {
    return (
      <View style={styles.container}>
        <Text style={styles.empty}>Event not found</Text>
        <BottomNav router={router} />
      </View>
    );
  }

  const alreadyCheckedIn = !!invite.checked_in_at;

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.title}>{event.title}</Text>
        <Text style={styles.meta}>
          {new Date(event.start_time).toLocaleString()}
        </Text>
        <Text style={styles.meta}>{event.location}</Text>

        <TouchableOpacity
          style={[
            styles.button,
            alreadyCheckedIn && { opacity: 0.5 },
          ]}
          disabled={alreadyCheckedIn || checkingIn}
          onPress={handleCheckIn}
        >
          <Text style={styles.buttonText}>
            {alreadyCheckedIn ? "Checked In" : "Check In"}
          </Text>
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
  card: {
    padding: 16,
    backgroundColor: "rgba(255,255,255,0.08)",
    borderRadius: Radius.card,
  },
  title: {
    color: Colors.textPrimary,
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 8,
    textAlign: "center",
  },
  meta: {
    color: Colors.textSecondary,
    textAlign: "center",
    marginBottom: 6,
  },
  button: {
    marginTop: 20,
    backgroundColor: Colors.cards.complete,
    borderRadius: Radius.card,
    paddingVertical: 12,
  },
  buttonText: {
    color: Colors.textPrimary,
    fontWeight: "700",
    textAlign: "center",
    fontSize: 16,
  },
  empty: {
    color: Colors.textPrimary,
    textAlign: "center",
    marginTop: 40,
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
