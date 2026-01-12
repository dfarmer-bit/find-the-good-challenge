// app/admin/messages/send.tsx
// FULL FILE REPLACEMENT

import { useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  FlatList,
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
import { AppHeader } from "../../../components/AppHeader";
import {
  Colors,
  Components,
  Layout,
  Radius,
  Spacing,
  Typography,
} from "../../../constants/theme";
import { supabase } from "../../../lib/supabase";

type TargetType = "single" | "department" | "all";

type ProfileLite = {
  id: string;
  full_name: string;
  email: string;
  role: string;
  department: string;
};

function uuidv4(): string {
  // Prefer crypto.randomUUID when available (Expo SDKs often support this)
  // Fallback to Math.random-based UUID if not
  // @ts-ignore
  const maybeCrypto = globalThis?.crypto;
  if (maybeCrypto?.randomUUID) return maybeCrypto.randomUUID();

  const hex = Array.from({ length: 16 }, () =>
    Math.floor(Math.random() * 256)
      .toString(16)
      .padStart(2, "0")
  ).join("");

  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-4${hex.slice(
    13,
    16
  )}-a${hex.slice(17, 20)}-${hex.slice(20, 32)}`;
}

function chunkArray<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

export default function AdminSendMessageScreen() {
  const router = useRouter();

  const [authorized, setAuthorized] = useState(false);
  const [loading, setLoading] = useState(true);

  const [targetType, setTargetType] = useState<TargetType>("single");

  const [profiles, setProfiles] = useState<ProfileLite[]>([]);
  const [departments, setDepartments] = useState<string[]>([]);

  const [selectedUser, setSelectedUser] = useState<ProfileLite | null>(null);
  const [selectedDepartment, setSelectedDepartment] = useState<string | null>(
    null
  );

  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");

  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerMode, setPickerMode] = useState<"user" | "department">("user");

  useEffect(() => {
    const init = async () => {
      setLoading(true);

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.replace("/");
        return;
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();

      if (profile?.role?.toLowerCase?.() !== "admin") {
        Alert.alert(
          "Restricted Access",
          "For admin use only",
          [{ text: "OK", onPress: () => router.replace("/main") }],
          { cancelable: false }
        );
        return;
      }

      setAuthorized(true);

      const { data: allProfiles, error } = await supabase
        .from("profiles")
        .select("id, full_name, email, role, department")
        .order("full_name", { ascending: true });

      if (error) {
        Alert.alert("Error", error.message);
        setLoading(false);
        return;
      }

      const nonAdmins =
        (allProfiles as ProfileLite[] | null)?.filter(
          (p) => (p.role || "").toLowerCase() !== "admin"
        ) ?? [];

      setProfiles(nonAdmins);

      const deps = Array.from(
        new Set(
          nonAdmins
            .map((p) => (p.department || "").trim())
            .filter((d) => d.length > 0)
        )
      ).sort((a, b) => a.localeCompare(b));

      setDepartments(deps);

      // sensible defaults
      setSelectedUser(nonAdmins[0] ?? null);
      setSelectedDepartment(deps[0] ?? null);

      setLoading(false);
    };

    init();
  }, []);

  useEffect(() => {
    // reset selections when switching modes
    if (targetType === "single") {
      if (!selectedUser && profiles.length) setSelectedUser(profiles[0]);
    } else if (targetType === "department") {
      if (!selectedDepartment && departments.length)
        setSelectedDepartment(departments[0]);
    }
  }, [targetType, profiles, departments]);

  const targetSummary = useMemo(() => {
    if (targetType === "all") return "All users (excluding admins)";
    if (targetType === "department")
      return selectedDepartment ? selectedDepartment : "Select department";
    if (targetType === "single")
      return selectedUser ? selectedUser.full_name : "Select recipient";
    return "";
  }, [targetType, selectedUser, selectedDepartment]);

  const openUserPicker = () => {
    setPickerMode("user");
    setPickerOpen(true);
  };

  const openDepartmentPicker = () => {
    setPickerMode("department");
    setPickerOpen(true);
  };

  const validate = () => {
    if (!title.trim()) {
      Alert.alert("Missing Title", "Please enter a title.");
      return false;
    }
    if (!body.trim()) {
      Alert.alert("Missing Message", "Please enter a message body.");
      return false;
    }
    if (targetType === "single" && !selectedUser) {
      Alert.alert("Missing Recipient", "Please select a person.");
      return false;
    }
    if (targetType === "department" && !selectedDepartment) {
      Alert.alert("Missing Department", "Please select a department.");
      return false;
    }
    return true;
  };

  const resolveRecipients = (): ProfileLite[] => {
    if (targetType === "all") return profiles;
    if (targetType === "department") {
      const dep = (selectedDepartment || "").trim().toLowerCase();
      return profiles.filter((p) => (p.department || "").trim().toLowerCase() === dep);
    }
    if (targetType === "single") return selectedUser ? [selectedUser] : [];
    return [];
  };

  const onSend = async () => {
    if (!validate()) return;

    const recipients = resolveRecipients();
    if (!recipients.length) {
      Alert.alert("No Recipients", "No users found for this target.");
      return;
    }

    Alert.alert(
      "Confirm Send",
      `Send to: ${targetSummary}\nRecipients: ${recipients.length}`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Send",
          style: "default",
          onPress: async () => {
            try {
              const batchId = uuidv4();
              const nowIso = new Date().toISOString();

              const rows = recipients.map((r) => ({
                recipient_id: r.id,
                title: title.trim(),
                body: body.trim(),
                is_read: false,
                source_type: "admin_send_message",
                source_id: batchId,
                is_locked: false,
                created_at: nowIso,
              }));

              // Insert in chunks to avoid payload limits
              const chunks = chunkArray(rows, 500);

              for (const part of chunks) {
                const { error } = await supabase.from("messages").insert(part);
                if (error) throw error;
              }

              Alert.alert(
                "Sent",
                `Message sent to ${recipients.length} recipient${
                  recipients.length === 1 ? "" : "s"
                }.`
              );

              setTitle("");
              setBody("");
            } catch (e: any) {
              Alert.alert("Send Failed", e?.message ?? "Unknown error");
            }
          },
        },
      ],
      { cancelable: true }
    );
  };

  if (!authorized) return null;
  if (loading) return null;

  return (
    <View style={styles.container}>
      <AppHeader />

      <View style={styles.headerText}>
        <Text style={styles.titleText}>Send Message</Text>
        <Text style={styles.subtitleText}>Create a test message for users</Text>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.card}>
            <Text style={styles.sectionLabel}>Target</Text>

            <View style={styles.segmentRow}>
              <TouchableOpacity
                onPress={() => setTargetType("single")}
                activeOpacity={0.9}
                style={[
                  styles.segmentButton,
                  targetType === "single" && styles.segmentActive,
                ]}
              >
                <Text
                  style={[
                    styles.segmentText,
                    targetType === "single" && styles.segmentTextActive,
                  ]}
                >
                  Single
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => setTargetType("department")}
                activeOpacity={0.9}
                style={[
                  styles.segmentButton,
                  targetType === "department" && styles.segmentActive,
                ]}
              >
                <Text
                  style={[
                    styles.segmentText,
                    targetType === "department" && styles.segmentTextActive,
                  ]}
                >
                  Department
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => setTargetType("all")}
                activeOpacity={0.9}
                style={[
                  styles.segmentButton,
                  targetType === "all" && styles.segmentActive,
                ]}
              >
                <Text
                  style={[
                    styles.segmentText,
                    targetType === "all" && styles.segmentTextActive,
                  ]}
                >
                  All
                </Text>
              </TouchableOpacity>
            </View>

            {targetType === "single" && (
              <>
                <Text style={styles.fieldLabel}>Recipient</Text>
                <TouchableOpacity
                  style={styles.pickerButton}
                  onPress={openUserPicker}
                  activeOpacity={0.9}
                >
                  <Text style={styles.pickerButtonText}>
                    {selectedUser ? selectedUser.full_name : "Select recipient"}
                  </Text>
                  <Text style={styles.pickerChevron}>▾</Text>
                </TouchableOpacity>

                {selectedUser ? (
                  <Text style={styles.helperText}>
                    {selectedUser.department} • {selectedUser.email}
                  </Text>
                ) : null}
              </>
            )}

            {targetType === "department" && (
              <>
                <Text style={styles.fieldLabel}>Department</Text>
                <TouchableOpacity
                  style={styles.pickerButton}
                  onPress={openDepartmentPicker}
                  activeOpacity={0.9}
                >
                  <Text style={styles.pickerButtonText}>
                    {selectedDepartment ?? "Select department"}
                  </Text>
                  <Text style={styles.pickerChevron}>▾</Text>
                </TouchableOpacity>

                <Text style={styles.helperText}>
                  Sends to everyone in this department (excluding admins).
                </Text>
              </>
            )}

            {targetType === "all" && (
              <Text style={styles.helperText}>
                Sends to all users (excluding admins).
              </Text>
            )}

            <View style={styles.divider} />

            <Text style={styles.sectionLabel}>Message</Text>

            <Text style={styles.fieldLabel}>Title</Text>
            <TextInput
              value={title}
              onChangeText={setTitle}
              placeholder="Enter title"
              placeholderTextColor={Colors.textSecondary}
              style={styles.input}
              autoCapitalize="sentences"
            />

            <Text style={styles.fieldLabel}>Body</Text>
            <TextInput
              value={body}
              onChangeText={setBody}
              placeholder="Enter message"
              placeholderTextColor={Colors.textSecondary}
              style={[styles.input, styles.textarea]}
              autoCapitalize="sentences"
              multiline
              textAlignVertical="top"
            />

            <TouchableOpacity
              style={styles.sendButton}
              onPress={onSend}
              activeOpacity={0.9}
            >
              <Text style={styles.sendIcon}>✉️</Text>
              <Text style={styles.sendText}>Send</Text>
            </TouchableOpacity>

            <Text style={styles.footerNote}>
              Messages may not be reposnded to, for notification only
            </Text>
          </View>

          <View style={{ height: 120 }} />
        </ScrollView>
      </KeyboardAvoidingView>

      <View style={styles.bottomBar}>
        <View style={styles.bottomButtonRow}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
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

      <Modal
        visible={pickerOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setPickerOpen(false)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setPickerOpen(false)}>
          <Pressable style={styles.modalCard} onPress={() => {}}>
            <Text style={styles.modalTitle}>
              {pickerMode === "user" ? "Select Recipient" : "Select Department"}
            </Text>

            {pickerMode === "user" ? (
              <FlatList
                data={profiles}
                keyExtractor={(item) => item.id}
                keyboardShouldPersistTaps="handled"
                renderItem={({ item }) => {
                  const selected = selectedUser?.id === item.id;
                  return (
                    <TouchableOpacity
                      style={[styles.modalItem, selected && styles.modalItemSelected]}
                      onPress={() => {
                        setSelectedUser(item);
                        setPickerOpen(false);
                      }}
                      activeOpacity={0.85}
                    >
                      <Text style={styles.modalItemTitle}>{item.full_name}</Text>
                      <Text style={styles.modalItemSub}>
                        {item.department} • {item.email}
                      </Text>
                    </TouchableOpacity>
                  );
                }}
                ItemSeparatorComponent={() => <View style={styles.modalSeparator} />}
              />
            ) : (
              <FlatList
                data={departments}
                keyExtractor={(item) => item}
                keyboardShouldPersistTaps="handled"
                renderItem={({ item }) => {
                  const selected =
                    (selectedDepartment || "").toLowerCase() === item.toLowerCase();
                  return (
                    <TouchableOpacity
                      style={[styles.modalItem, selected && styles.modalItemSelected]}
                      onPress={() => {
                        setSelectedDepartment(item);
                        setPickerOpen(false);
                      }}
                      activeOpacity={0.85}
                    >
                      <Text style={styles.modalItemTitle}>{item}</Text>
                      <Text style={styles.modalItemSub}>
                        {profiles.filter(
                          (p) =>
                            (p.department || "").trim().toLowerCase() ===
                            item.trim().toLowerCase()
                        ).length}{" "}
                        users
                      </Text>
                    </TouchableOpacity>
                  );
                }}
                ItemSeparatorComponent={() => <View style={styles.modalSeparator} />}
              />
            )}

            <TouchableOpacity
              style={styles.modalCloseButton}
              onPress={() => setPickerOpen(false)}
              activeOpacity={0.9}
            >
              <Text style={styles.modalCloseText}>Close</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>
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
  titleText: {
    fontSize: Typography.greeting.fontSize,
    fontWeight: Typography.greeting.fontWeight,
    color: Colors.textPrimary,
    marginBottom: 4,
  },
  subtitleText: {
    fontSize: Typography.quote.fontSize,
    color: Colors.textSecondary,
  },
  scrollContent: {
    paddingBottom: 0,
  },

  card: {
    backgroundColor: "rgba(255,255,255,0.08)",
    borderColor: "rgba(255,255,255,0.12)",
    borderWidth: 1,
    borderRadius: Radius.card,
    padding: 14,
  },
  sectionLabel: {
    color: Colors.textPrimary,
    fontSize: 14,
    fontWeight: "800",
    marginBottom: 10,
  },
  segmentRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 12,
  },
  segmentButton: {
    flex: 1,
    borderRadius: 14,
    paddingVertical: 10,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.14)",
    backgroundColor: "rgba(255,255,255,0.06)",
  },
  segmentActive: {
    borderColor: "rgba(255,255,255,0.28)",
    backgroundColor: "rgba(255,255,255,0.12)",
  },
  segmentText: {
    color: Colors.textSecondary,
    fontSize: 13,
    fontWeight: "800",
  },
  segmentTextActive: {
    color: Colors.textPrimary,
  },

  fieldLabel: {
    color: Colors.textSecondary,
    fontSize: 12,
    fontWeight: "800",
    marginTop: 8,
    marginBottom: 6,
  },
  helperText: {
    color: Colors.textSecondary,
    fontSize: 12,
    marginTop: 8,
  },

  pickerButton: {
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.14)",
    backgroundColor: "rgba(0,0,0,0.12)",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  pickerButtonText: {
    color: Colors.textPrimary,
    fontSize: 14,
    fontWeight: "800",
    flex: 1,
    marginRight: 10,
  },
  pickerChevron: {
    color: Colors.textSecondary,
    fontSize: 16,
    fontWeight: "900",
  },

  divider: {
    height: 1,
    backgroundColor: "rgba(255,255,255,0.10)",
    marginVertical: 14,
  },

  input: {
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.14)",
    backgroundColor: "rgba(0,0,0,0.12)",
    color: Colors.textPrimary,
    fontSize: 14,
    fontWeight: "700",
  },
  textarea: {
    minHeight: 140,
  },

  sendButton: {
    marginTop: 14,
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    backgroundColor: "#D67A2F",
  },
  sendIcon: {
    fontSize: 18,
    marginRight: 10,
  },
  sendText: {
    color: "#0B0B0B",
    fontSize: 16,
    fontWeight: "900",
  },
  footerNote: {
    marginTop: 10,
    color: Colors.textSecondary,
    fontSize: 12,
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

  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.55)",
    justifyContent: "center",
    paddingHorizontal: Spacing.screenPadding,
  },
  modalCard: {
    backgroundColor: Colors.background,
    borderRadius: Radius.card,
    padding: 14,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.14)",
    maxHeight: "75%",
  },
  modalTitle: {
    color: Colors.textPrimary,
    fontSize: 16,
    fontWeight: "900",
    marginBottom: 10,
    textAlign: "center",
  },
  modalItem: {
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
  },
  modalItemSelected: {
    backgroundColor: "rgba(255,255,255,0.12)",
    borderColor: "rgba(255,255,255,0.22)",
  },
  modalItemTitle: {
    color: Colors.textPrimary,
    fontSize: 14,
    fontWeight: "900",
    marginBottom: 4,
  },
  modalItemSub: {
    color: Colors.textSecondary,
    fontSize: 12,
    fontWeight: "700",
  },
  modalSeparator: {
    height: 10,
  },
  modalCloseButton: {
    marginTop: 12,
    borderRadius: 16,
    paddingVertical: 12,
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.10)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.14)",
  },
  modalCloseText: {
    color: Colors.textPrimary,
    fontSize: 14,
    fontWeight: "900",
  },
});
