// app/admin/spotlight-review.tsx

import { useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import {
    Alert,
    FlatList,
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

type Nominee = {
  nominee_id: string;
  full_name: string;
  nomination_count: number;
};

const SPOTLIGHT_CHALLENGE_ID =
  "ba045771-c758-469d-badf-e2ec865c8d12";

export default function SpotlightReviewScreen() {
  const router = useRouter();

  const [nominees, setNominees] = useState<Nominee[]>([]);
  const [loading, setLoading] = useState(true);

  const [rejectingNominee, setRejectingNominee] =
    useState<Nominee | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  useEffect(() => {
    loadNominees();
  }, []);

  const loadNominees = async () => {
    setLoading(true);

    const { data, error } = await supabase.rpc(
      "spotlight_monthly_ranked_nominees"
    );

    if (!error && data) {
      setNominees(data);
    }

    setLoading(false);
  };

  const topCount = useMemo(() => {
    if (nominees.length === 0) return null;
    return nominees[0].nomination_count;
  }, [nominees]);

  const topNominees = useMemo(() => {
    if (topCount === null) return [];
    return nominees.filter(
      (n) => n.nomination_count === topCount
    );
  }, [nominees, topCount]);

  const approveNominees = async (winners: Nominee[]) => {
    const payload = winners.map((n) => ({
      challenge_id: SPOTLIGHT_CHALLENGE_ID,
      user_id: n.nominee_id,
      status: "approved",
      occurred_at: new Date().toISOString(),
    }));

    const { error } = await supabase
      .from("challenge_activity")
      .insert(payload);

    if (error) {
      Alert.alert("Error", "Approval failed.");
      return;
    }

    Alert.alert(
      "Approved",
      winners.length > 1
        ? "All tied nominees approved."
        : `${winners[0].full_name} approved.`,
      [{ text: "OK", onPress: loadNominees }]
    );
  };

  const rejectNominee = async () => {
    if (!rejectingNominee || !rejectReason.trim()) return;

    const { error } = await supabase
      .from("challenge_activity")
      .insert({
        challenge_id: SPOTLIGHT_CHALLENGE_ID,
        user_id: rejectingNominee.nominee_id,
        status: "rejected",
        notes: rejectReason,
        occurred_at: new Date().toISOString(),
      });

    if (error) {
      Alert.alert("Error", "Rejection failed.");
      return;
    }

    setRejectingNominee(null);
    setRejectReason("");
    loadNominees();
  };

  return (
    <View style={styles.container}>
      <AppHeader />

      <View style={styles.header}>
        <Text style={styles.title}>🌟 Spotlight Review</Text>
        <Text style={styles.subtitle}>
          Monthly top nominees
        </Text>
      </View>

      {loading ? (
        <Text style={styles.loading}>Loading…</Text>
      ) : nominees.length === 0 ? (
        <Text style={styles.empty}>
          No nominees awaiting review.
        </Text>
      ) : (
        <>
          {topNominees.length > 1 && (
            <View style={styles.tieBar}>
              <Text style={styles.tieText}>
                Tie detected ({topNominees.length})
              </Text>
              <TouchableOpacity
                style={styles.approveAllButton}
                onPress={() =>
                  approveNominees(topNominees)
                }
              >
                <Text style={styles.approveText}>
                  Approve All (Tied)
                </Text>
              </TouchableOpacity>
            </View>
          )}

          <FlatList
            data={nominees}
            keyExtractor={(item) => item.nominee_id}
            contentContainerStyle={{ paddingBottom: 140 }}
            renderItem={({ item }) => {
              const isTop =
                item.nomination_count === topCount;

              return (
                <View style={styles.card}>
                  <View style={styles.row}>
                    <Text style={styles.name}>
                      {item.full_name}
                    </Text>
                    <Text style={styles.count}>
                      {item.nomination_count}
                    </Text>
                  </View>

                  {isTop && topNominees.length === 1 && (
                    <View style={styles.actions}>
                      <TouchableOpacity
                        style={styles.approveButton}
                        onPress={() =>
                          approveNominees([item])
                        }
                      >
                        <Text style={styles.approveText}>
                          Approve
                        </Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        onPress={() =>
                          setRejectingNominee(item)
                        }
                      >
                        <Text style={styles.rejectText}>
                          Reject
                        </Text>
                      </TouchableOpacity>
                    </View>
                  )}

                  {isTop && topNominees.length > 1 && (
                    <View style={styles.rejectOnly}>
                      <TouchableOpacity
                        onPress={() =>
                          setRejectingNominee(item)
                        }
                      >
                        <Text style={styles.rejectText}>
                          Reject
                        </Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              );
            }}
          />
        </>
      )}

      {/* Reject Modal */}
      <Modal
        visible={!!rejectingNominee}
        transparent
        animationType="fade"
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>
              Reject Nominee
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
                  setRejectingNominee(null);
                  setRejectReason("");
                }}
              >
                <Text style={styles.cancelText}>
                  Cancel
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.confirmReject}
                onPress={rejectNominee}
              >
                <Text style={styles.approveText}>
                  Reject
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Footer */}
      <View style={styles.bottomBar}>
        <TouchableOpacity
          style={Components.backButton}
          onPress={() => router.back()}
        >
          <Text style={styles.backText}>⬅️ Back</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={Components.backButton}
          onPress={() => router.push("/main")}
        >
          <Text style={styles.backText}>🏠 Home</Text>
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
  title: {
    fontSize: 22,
    fontWeight: "700",
    color: Colors.textPrimary,
  },
  subtitle: { color: Colors.textSecondary },

  loading: {
    textAlign: "center",
    marginTop: 40,
    color: Colors.textSecondary,
  },
  empty: {
    textAlign: "center",
    marginTop: 60,
    color: Colors.textSecondary,
  },

  tieBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 10,
    backgroundColor: Colors.cards.admin,
    borderRadius: Radius.card,
    marginBottom: 12,
  },
  tieText: {
    color: Colors.textPrimary,
    fontWeight: "700",
  },
  approveAllButton: {
    backgroundColor: Colors.cards.complete,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: Radius.card,
  },
  approveText: {
    color: "#FFF",
    fontWeight: "700",
  },

  card: {
    backgroundColor: Colors.cards.journal,
    borderRadius: Radius.card,
    padding: 14,
    marginBottom: 12,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  name: {
    color: Colors.textPrimary,
    fontWeight: "700",
  },
  count: {
    color: Colors.textPrimary,
    fontWeight: "700",
  },

  actions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginTop: 10,
    gap: 12,
  },
  approveButton: {
    backgroundColor: Colors.cards.complete,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: Radius.card,
  },
  rejectOnly: {
    alignItems: "flex-end",
    marginTop: 10,
  },
  rejectText: {
    color: Colors.textSecondary,
    fontWeight: "600",
  },

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
  modalTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: Colors.textPrimary,
    marginBottom: 12,
  },
  input: {
    backgroundColor: Colors.cards.admin,
    borderRadius: Radius.card,
    padding: 10,
    color: Colors.textPrimary,
    minHeight: 80,
    marginBottom: 12,
  },
  modalActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 12,
  },
  cancelText: {
    color: Colors.textSecondary,
  },
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
  backText: {
    color: Colors.textPrimary,
    fontWeight: "700",
  },
});
