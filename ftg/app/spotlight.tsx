// app/spotlight.tsx

import { AppHeader } from "@/components/AppHeader";
import {
    Colors,
    Components,
    Layout,
    Radius,
    Spacing,
} from "@/constants/theme";
import { supabase } from "@/lib/supabase";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
    Alert,
    Keyboard,
    KeyboardAvoidingView,
    Modal,
    Platform,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";

type Profile = {
  id: string;
  full_name: string;
  department: string;
};

const SEARCH_DROPDOWN_SPACE = 58;

export default function SpotlightScreen() {
  const router = useRouter();

  const [search, setSearch] = useState("");
  const [results, setResults] = useState<Profile[]>([]);
  const [selectedProfile, setSelectedProfile] = useState<Profile | null>(null);

  const [behaviorType, setBehaviorType] =
    useState<"one_time" | "ongoing" | null>(null);
  const [behaviorOpen, setBehaviorOpen] = useState(false);

  const [reason, setReason] = useState("");
  const [details, setDetails] = useState("");

  const [showSuccess, setShowSuccess] = useState(false);

  useEffect(() => {
    if (search.trim().length < 2) {
      setResults([]);
      return;
    }

    const runSearch = async () => {
      const { data } = await supabase
        .from("profiles")
        .select("id, full_name, department")
        .ilike("full_name", `%${search.trim()}%`)
        .order("full_name")
        .limit(10);

      setResults(data ?? []);
    };

    runSearch();
  }, [search]);

  const showEmployeeDropdown =
    !selectedProfile && search.trim().length >= 2;

  const canSubmit =
    !!selectedProfile &&
    !!behaviorType &&
    reason.trim().length > 0 &&
    details.trim().length > 0;

  const submitNomination = async () => {
    if (!canSubmit || !selectedProfile || !behaviorType) return;

    const { data, error } = await supabase.rpc(
      "submit_spotlight_nomination",
      {
        p_nominee_id: selectedProfile.id,
        p_behavior_type: behaviorType,
        p_reason: reason.trim(),
        p_details: details.trim(),
      }
    );

    if (error) {
      Alert.alert("Something went wrong", "Please try again.");
      return;
    }

    if (data?.status === "blocked") {
      const messages: Record<string, string> = {
        self_nomination:
          "You can’t nominate yourself — but we love the confidence 🙂",
        monthly_duplicate:
          "You’ve already nominated this person this month. You can nominate them again next month.",
      };

      Alert.alert(
        "Not quite",
        messages[data.code] ??
          "This nomination can’t be submitted right now."
      );
      return;
    }

    if (data?.status === "success") {
      if (!data.nominee_points_awarded) {
        Alert.alert(
          "Nomination recorded",
          "They’ve already received nomination points twice this week, but your nomination was saved."
        );
      }

      setShowSuccess(true);
    }
  };

  const behaviorLabel =
    behaviorType === "one_time"
      ? "One-time action"
      : behaviorType === "ongoing"
      ? "Ongoing behavior"
      : "Select one";

  return (
    <Pressable
      style={{ flex: 1 }}
      onPress={() => {
        Keyboard.dismiss();
        setBehaviorOpen(false);
      }}
    >
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView
          style={{ backgroundColor: Colors.background }}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.container}>
            <AppHeader />

            <View style={styles.headerText}>
              <Text style={styles.title}>🌟 Spotlight</Text>
              <Text style={styles.subtitle}>
                Recognize someone who’s making a real difference
              </Text>
            </View>

            {/* EMPLOYEE SEARCH */}
            <View style={styles.searchWrap}>
              <TextInput
                style={styles.input}
                placeholder="Search employee (type 2+ letters)..."
                placeholderTextColor={Colors.textSecondary}
                value={search}
                onChangeText={(text) => {
                  setSearch(text);
                  setSelectedProfile(null);
                }}
                onFocus={() => setBehaviorOpen(false)}
              />

              {showEmployeeDropdown && (
                <View style={styles.dropdown}>
                  {results.length === 0 ? (
                    <Text style={styles.noResult}>
                      No matching employee found
                    </Text>
                  ) : (
                    <View>
                      {results.map((item) => (
                        <TouchableOpacity
                          key={item.id}
                          style={styles.profileRow}
                          onPress={() => {
                            setSelectedProfile(item);
                            setSearch(item.full_name);
                            Keyboard.dismiss();
                          }}
                        >
                          <Text style={styles.profileName}>
                            {item.full_name}
                          </Text>
                          <Text style={styles.profileDept}>
                            {item.department}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  )}
                </View>
              )}
            </View>

            <View style={{ height: SEARCH_DROPDOWN_SPACE }} />

            {selectedProfile && (
              <View style={styles.selectedBox}>
                <Text style={styles.selectedName}>
                  {selectedProfile.full_name}
                </Text>
                <Text style={styles.selectedDept}>
                  {selectedProfile.department}
                </Text>
              </View>
            )}

            {/* BEHAVIOR DROPDOWN */}
            <View style={styles.behaviorWrap}>
              <TouchableOpacity
                style={styles.behaviorSelect}
                onPress={() => {
                  Keyboard.dismiss();
                  setBehaviorOpen((v) => !v);
                }}
              >
                <Text
                  style={[
                    styles.behaviorSelectText,
                    !behaviorType && styles.behaviorPlaceholder,
                  ]}
                >
                  {behaviorLabel}
                </Text>
                <Text style={styles.behaviorChevron}>▾</Text>
              </TouchableOpacity>

              {behaviorOpen && (
                <View style={styles.behaviorMenu}>
                  <TouchableOpacity
                    style={styles.behaviorItem}
                    onPress={() => {
                      setBehaviorType("one_time");
                      setBehaviorOpen(false);
                    }}
                  >
                    <Text style={styles.behaviorItemText}>
                      One-time action
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.behaviorItem}
                    onPress={() => {
                      setBehaviorType("ongoing");
                      setBehaviorOpen(false);
                    }}
                  >
                    <Text style={styles.behaviorItemText}>
                      Ongoing behavior
                    </Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>

            {/* FIELDS */}
            <TextInput
              style={styles.textArea}
              placeholder="What did this person do?"
              placeholderTextColor={Colors.textSecondary}
              value={reason}
              onChangeText={setReason}
              multiline
              onFocus={() => setBehaviorOpen(false)}
            />

            <TextInput
              style={styles.textArea}
              placeholder="Why does this matter to our culture or mission?"
              placeholderTextColor={Colors.textSecondary}
              value={details}
              onChangeText={setDetails}
              multiline
              onFocus={() => setBehaviorOpen(false)}
            />

            {/* SUBMIT */}
            <TouchableOpacity
              style={[
                styles.submitButton,
                !canSubmit && styles.submitDisabled,
              ]}
              disabled={!canSubmit}
              onPress={submitNomination}
            >
              <Text style={styles.submitText}>
                Submit Nomination
              </Text>
            </TouchableOpacity>

            <View style={{ height: 120 }} />
          </View>
        </ScrollView>

        {/* BACK */}
        <View style={styles.bottomBar}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Text style={styles.backIcon}>⬅️</Text>
            <Text style={styles.backText}>Back</Text>
          </TouchableOpacity>
        </View>

        {/* SUCCESS */}
        <Modal visible={showSuccess} transparent>
          <View style={styles.modalOverlay}>
            <View style={styles.modalBox}>
              <Text style={styles.modalText}>
                🎉 Spotlight nomination submitted!
              </Text>
              <TouchableOpacity
                style={styles.modalButton}
                onPress={() => router.replace("/main")}
              >
                <Text style={styles.modalButtonText}>
                  Back to Home
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      </KeyboardAvoidingView>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  scrollContent: { paddingBottom: 40 },
  container: {
    backgroundColor: Colors.background,
    paddingTop: Layout.topScreenPadding,
    paddingHorizontal: Spacing.screenPadding,
  },
  headerText: { marginTop: 18, marginBottom: 14 },
  title: { fontSize: 22, fontWeight: "700", color: Colors.textPrimary },
  subtitle: { color: Colors.textSecondary },

  searchWrap: { position: "relative", zIndex: 20 },
  input: {
    backgroundColor: Colors.cards.journal,
    color: Colors.textPrimary,
    padding: 12,
    borderRadius: Radius.card,
  },
  dropdown: {
    position: "absolute",
    top: 52,
    left: 0,
    right: 0,
    backgroundColor: Colors.cards.journal,
    borderRadius: Radius.card,
    maxHeight: 180,
    zIndex: 50,
    elevation: 50,
  },
  noResult: { padding: 12, color: Colors.textSecondary },
  profileRow: { padding: 12 },
  profileName: { color: Colors.textPrimary, fontWeight: "600" },
  profileDept: { color: Colors.textSecondary, fontSize: 12 },

  selectedBox: { padding: 10 },
  selectedName: { color: Colors.textPrimary, fontWeight: "700" },
  selectedDept: { color: Colors.textSecondary },

  behaviorWrap: { marginBottom: 10 },
  behaviorSelect: {
    backgroundColor: "rgba(255,255,255,0.08)",
    borderRadius: Radius.card,
    paddingVertical: 12,
    paddingHorizontal: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  behaviorSelectText: { color: Colors.textPrimary, fontWeight: "700" },
  behaviorPlaceholder: { color: Colors.textSecondary },
  behaviorChevron: { color: Colors.textSecondary },

  behaviorMenu: {
    marginTop: 8,
    backgroundColor: "rgba(255,255,255,0.10)",
    borderRadius: Radius.card,
  },
  behaviorItem: { padding: 12 },
  behaviorItemText: { color: Colors.textPrimary, fontWeight: "700" },

  textArea: {
    backgroundColor: Colors.cards.goals,
    color: Colors.textPrimary,
    padding: 12,
    borderRadius: Radius.card,
    marginBottom: 8,
    minHeight: 72,
  },

  submitButton: {
    backgroundColor: Colors.cards.complete,
    padding: 14,
    borderRadius: Radius.card,
    alignItems: "center",
  },
  submitDisabled: { opacity: 0.4 },
  submitText: { color: Colors.textPrimary, fontWeight: "700" },

  bottomBar: {
    position: "absolute",
    bottom: Layout.bottomNavSpacing,
    left: Spacing.screenPadding,
    right: Spacing.screenPadding,
    alignItems: "center",
  },
  backButton: { ...Components.backButton, flexDirection: "row" },
  backIcon: { fontSize: 18, marginRight: 8 },
  backText: { color: Colors.textPrimary, fontSize: 16, fontWeight: "700" },

  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalBox: {
    backgroundColor: Colors.cards.journal,
    padding: 20,
    borderRadius: Radius.card,
    width: "80%",
    alignItems: "center",
  },
  modalText: { color: Colors.textPrimary, marginBottom: 12 },
  modalButton: {
    backgroundColor: Colors.cards.complete,
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: Radius.card,
  },
  modalButtonText: { color: Colors.textPrimary, fontWeight: "700" },
});
