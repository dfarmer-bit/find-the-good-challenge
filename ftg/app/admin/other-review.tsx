import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  Alert,
  FlatList,
  Image,
  Modal,
  StyleSheet,
  Text,
  TextInput,
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
} from "../../constants/theme";
import { supabase } from "../../lib/supabase";

type ReviewItem = {
  id: string;
  challenge_name: string;
  full_name: string;
  media_url: string | null;
  metadata: any;
};

export default function OtherReviewScreen() {
  const router = useRouter();

  const [items, setItems] = useState<ReviewItem[]>([]);
  const [loading, setLoading] = useState(true);

  const [rejecting, setRejecting] = useState<ReviewItem | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  useEffect(() => {
    loadItems();
  }, []);

  const loadItems = async () => {
    setLoading(true);

    const { data, error } = await supabase
      .from("challenge_activity")
      .select(`
        id,
        media_url,
        metadata,
        challenges!inner (
          name
        ),
        profiles!challenge_activity_user_id_fkey (
          full_name
        )
      `)
      .eq("status", "pending");

    if (error) {
      Alert.alert("Error", error.message);
      setLoading(false);
      return;
    }

    const filtered =
      data?.filter(
        (row: any) =>
          row.challenges?.name !== "Activate Gym Challenge"
      ) ?? [];

    const mapped = filtered.map((row: any) => ({
      id: row.id,
      challenge_name: row.challenges.name,
      full_name: row.profiles.full_name,
      media_url: row.media_url,
      metadata: row.metadata ?? {},
    }));

    setItems(mapped);
    setLoading(false);
  };

  const approve = async (item: ReviewItem) => {
    const { error } = await supabase.rpc(
      "admin_approve_challenge",
      {
        p_activity_id: item.id,
      }
    );

    if (error) {
      Alert.alert("Error", error.message);
      return;
    }

    Alert.alert(
      "Approved",
      "Submission approved successfully.",
      [{ text: "OK", onPress: loadItems }]
    );
  };

  const reject = async () => {
    if (!rejecting || !rejectReason.trim()) return;

    const { error } = await supabase
      .from("challenge_activity")
      .update({
        status: "rejected",
        reviewed_at: new Date().toISOString(),
      })
      .eq("id", rejecting.id);

    if (error) {
      Alert.alert("Error", error.message);
      return;
    }

    setRejecting(null);
    setRejectReason("");

    Alert.alert(
      "Rejected",
      "Submission rejected.",
      [{ text: "OK", onPress: loadItems }]
    );
  };

  return (
    <View style={styles.container}>
      <AppHeader />

      <View style={styles.header}>
        <Text style={styles.title}>📋 Other Submissions</Text>
        <Text style={styles.subtitle}>Pending approvals</Text>
      </View>

      {loading ? (
        <Text style={styles.loading}>Loading…</Text>
      ) : items.length === 0 ? (
        <Text style={styles.empty}>
          No submissions awaiting review.
        </Text>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingBottom: 140 }}
          renderItem={({ item }) => (
            <View style={styles.card}>
              <Text style={styles.challenge}>
                {item.challenge_name}
              </Text>

              <Text style={styles.name}>
                {item.full_name}
              </Text>

              {item.metadata?.title && (
                <Text style={styles.metaTitle}>
                  {item.metadata.title}
                </Text>
              )}

              {item.metadata?.description && (
                <Text style={styles.metaText}>
                  {item.metadata.description}
                </Text>
              )}

              {item.media_url && (
                <Image
                  source={{ uri: item.media_url }}
                  style={styles.image}
                />
              )}

              <View style={styles.actions}>
                <TouchableOpacity
                  style={styles.approveButton}
                  onPress={() => approve(item)}
                >
                  <Text style={styles.approveText}>
                    Approve
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => setRejecting(item)}
                >
                  <Text style={styles.rejectText}>
                    Reject
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        />
      )}

      <Modal visible={!!rejecting} transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>
              Reject Submission
            </Text>

            <TextInput
              style={styles.input}
              placeholder="Reason for rejection"
              placeholderTextColor={Colors.textSecondary}
              value={rejectReason}
              onChangeText={setRejectReason}
              multiline
            />

            <View style={styles.modalActions}>
              <TouchableOpacity
                onPress={() => {
                  setRejecting(null);
                  setRejectReason("");
                }}
              >
                <Text style={styles.cancelText}>
                  Cancel
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.confirmReject}
                onPress={reject}
              >
                <Text style={styles.approveText}>
                  Reject
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <View style={styles.bottomBar}>
        <TouchableOpacity
          style={Components.backButton}
          onPress={() => router.back()}
        >
          <Text style={styles.backText}>
            ⬅️ Back
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={Components.backButton}
          onPress={() => router.push("/main")}
        >
          <Text style={styles.backText}>
            🏠 Home
          </Text>
        </TouchableOpacity>
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
  header: { alignItems: "center", marginBottom: 16 },
  title: { fontSize: 22, fontWeight: "700", color: Colors.textPrimary },
  subtitle: { color: Colors.textSecondary },
  loading: { textAlign: "center", marginTop: 40, color: Colors.textSecondary },
  empty: { textAlign: "center", marginTop: 60, color: Colors.textSecondary },
  card: {
    backgroundColor: Colors.cards.journal,
    borderRadius: Radius.card,
    padding: 14,
    marginBottom: 12,
  },
  challenge: { fontWeight: "700", color: Colors.textPrimary },
  name: { color: Colors.textSecondary, marginBottom: 8 },
  metaTitle: { fontWeight: "700", color: Colors.textPrimary },
  metaText: { color: Colors.textPrimary, marginBottom: 6 },
  image: { width: "100%", height: 180, borderRadius: Radius.card },
  actions: { flexDirection: "row", justifyContent: "flex-end", gap: 12 },
  approveButton: {
    backgroundColor: Colors.cards.complete,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: Radius.card,
  },
  approveText: { color: "#FFF", fontWeight: "700" },
  rejectText: { color: Colors.textSecondary, fontWeight: "600" },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalCard: {
    width: "90%",
    backgroundColor: Colors.background,
    borderRadius: Radius.card,
    padding: 16,
  },
  modalTitle: { fontSize: 18, fontWeight: "700", color: Colors.textPrimary },
  input: {
    backgroundColor: Colors.cards.admin,
    borderRadius: Radius.card,
    padding: 10,
    color: Colors.textPrimary,
    minHeight: 80,
  },
  modalActions: { flexDirection: "row", justifyContent: "flex-end", gap: 12 },
  cancelText: { color: Colors.textSecondary },
  confirmReject: {
    backgroundColor: "#E63946",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: Radius.card,
  },
  bottomBar: {
    position: "absolute",
    bottom: Layout.bottomNavSpacing,
    left: Spacing.screenPadding,
    right: Spacing.screenPadding,
    flexDirection: "row",
    justifyContent: "center",
    gap: 16,
  },
  backText: { color: Colors.textPrimary, fontWeight: "700" },
});
