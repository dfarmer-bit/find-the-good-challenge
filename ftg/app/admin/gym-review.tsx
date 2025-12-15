import * as Location from "expo-location";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  Alert,
  FlatList,
  Linking,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { AppHeader } from "../../components/AppHeader";
import {
  Colors,
  Components,
  Layout,
  Radius,
  Spacing,
  Typography,
} from "../../constants/theme";
import { supabase } from "../../lib/supabase";

type GymReviewItem = {
  id: string;
  user_id: string;
  location_name: string | null;
  gps_lat: number | null;
  gps_lng: number | null;
  address?: string;
};

const REJECTION_MESSAGE =
  "We cannot identify a physical fitness organization at the location you are attempting to approve. If you feel this was rejected in error, please contact your supervisor.";

export default function GymReviewScreen() {
  const router = useRouter();
  const [items, setItems] = useState<GymReviewItem[]>([]);
  const [toast, setToast] = useState<string | null>(null);
  const GYM_CHALLENGE_ID = "8d3dec03-9d52-4948-b6e9-d9aa399cf733";

  const showToast = (message: string) => {
    setToast(message);
    setTimeout(() => setToast(null), 2000);
  };

  const loadPending = async () => {
    const { data } = await supabase
      .from("challenge_activity")
      .select("id, user_id, location_name, gps_lat, gps_lng")
      .eq("status", "pending")
      .eq("challenge_id", GYM_CHALLENGE_ID)
      .order("created_at", { ascending: true });

    if (!data) return;

    const enriched = await Promise.all(
      data.map(async (item) => {
        if (item.gps_lat && item.gps_lng) {
          const geo = await Location.reverseGeocodeAsync({
            latitude: item.gps_lat,
            longitude: item.gps_lng,
          });

          const addr = geo[0]
            ? `${geo[0].street ?? ""} ${geo[0].city ?? ""}, ${geo[0].region ?? ""}`
            : "Address unavailable";

          return { ...item, address: addr };
        }
        return item;
      })
    );

    setItems(enriched);
  };

  useEffect(() => {
    loadPending();
  }, []);

  const getAdminId = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    return user?.id;
  };

  const openMap = (lat?: number | null, lng?: number | null) => {
    if (!lat || !lng) return;
    const url = `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
    Linking.openURL(url);
  };

  const approveGym = async (item: GymReviewItem) => {
    Alert.alert("Approve Gym", "Approve this gym permanently?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Approve",
        onPress: async () => {
          const adminId = await getAdminId();
          if (!adminId) return;

          await supabase
            .from("challenge_activity")
            .update({
              status: "approved",
              reviewed_by: adminId,
              reviewed_at: new Date().toISOString(),
            })
            .eq("id", item.id);

          await supabase.from("approved_locations").insert({
            user_id: item.user_id,
            challenge_type: "gym",
            location_name: item.location_name ?? "Unknown Gym",
            address: item.address,
            approved_by: adminId,
          });

          showToast("Gym approved ✓");
          loadPending();
        },
      },
    ]);
  };

  const rejectGym = async (item: GymReviewItem) => {
    Alert.alert("Reject Gym", "Reject this gym request?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Reject",
        style: "destructive",
        onPress: async () => {
          const adminId = await getAdminId();
          if (!adminId) return;

          await supabase
            .from("challenge_activity")
            .update({
              status: "rejected",
              reviewed_by: adminId,
              reviewed_at: new Date().toISOString(),
            })
            .eq("id", item.id);

          await supabase.from("messages").insert({
            recipient_id: item.user_id,
            body: REJECTION_MESSAGE,
            is_read: false,
          });

          showToast("Gym rejected ✕");
          loadPending();
        },
      },
    ]);
  };

  return (
    <View style={styles.container}>
      <AppHeader />

      <View style={styles.headerText}>
        <Text style={styles.title}>Gym – For Review</Text>
        <Text style={styles.subtitle}>Pending gym verifications</Text>
      </View>

      <FlatList
        data={items}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingBottom: 140 }}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.gymName}>
                {item.location_name ?? "Unnamed Gym"}
              </Text>

              <TouchableOpacity
                onPress={() => openMap(item.gps_lat, item.gps_lng)}
              >
                <Text style={styles.mapLink}>View Map</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.address}>
              {item.address ?? "Address unavailable"}
            </Text>

            <View style={styles.actionRow}>
              <TouchableOpacity
                style={styles.approveButton}
                onPress={() => approveGym(item)}
              >
                <Text style={styles.actionText}>Approve</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.rejectButton}
                onPress={() => rejectGym(item)}
              >
                <Text style={styles.actionText}>Reject</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      />

      {toast && (
        <View style={styles.toast}>
          <Text style={styles.toastText}>{toast}</Text>
        </View>
      )}

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
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
    paddingTop: Layout.topScreenPadding,
    paddingHorizontal: Spacing.screenPadding,
  },

  headerText: {
    alignItems: "center",
    marginBottom: 12,
  },

  title: {
    fontSize: Typography.greeting.fontSize,
    fontWeight: Typography.greeting.fontWeight,
    color: Colors.textPrimary,
  },

  subtitle: {
    fontSize: Typography.quote.fontSize,
    color: Colors.textSecondary,
  },

  card: {
    backgroundColor: "rgba(255,255,255,0.08)",
    borderRadius: Radius.card,
    padding: 14,
    marginBottom: 12,
  },

  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
  },

  gymName: {
    color: Colors.textPrimary,
    fontSize: 16,
    fontWeight: "700",
    flex: 1,
    paddingRight: 8,
  },

  mapLink: {
    color: "#6DA8FF",
    fontSize: 13,
    fontWeight: "600",
  },

  address: {
    color: Colors.textSecondary,
    fontSize: 13,
    marginTop: 6,
    marginBottom: 12,
  },

  actionRow: {
    flexDirection: "row",
    gap: 12,
  },

  approveButton: {
    flex: 1,
    backgroundColor: Colors.cards.complete,
    borderRadius: 999,
    paddingVertical: 10,
    alignItems: "center",
  },

  rejectButton: {
    flex: 1,
    backgroundColor: "#FF4D4F",
    borderRadius: 999,
    paddingVertical: 10,
    alignItems: "center",
  },

  actionText: {
    color: Colors.textPrimary,
    fontWeight: "700",
  },

  toast: {
    position: "absolute",
    bottom: 100,
    alignSelf: "center",
    backgroundColor: "rgba(0,0,0,0.85)",
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
  },

  toastText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
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
