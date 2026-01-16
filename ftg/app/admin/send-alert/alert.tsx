// app/admin/send-alert/alert.tsx
// FULL FILE REPLACEMENT
// Send Alert screen with:
// - Send to: Users / Department / Organization
// - Priority: Regular / Urgent
// - Message field with iOS keyboard suggestions enabled
// - Confirm recap modal
// - User picker shows FULL list + optional search
// - FIX: source_id is a real UUID (no batch_ strings)

import { useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  FlatList,
  Modal,
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

type SendToMode = "users" | "department" | "org";
type Priority = "regular" | "urgent";

type ProfileRow = {
  id: string;
  full_name: string | null;
  department: string | null;
  role: string | null;
};

// ✅ Local UUID v4 generator (no imports, works everywhere)
function makeBatchId() {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export default function AdminSendAlertScreen() {
  const router = useRouter();
  const [authorized, setAuthorized] = useState(false);

  // form
  const [sendTo, setSendTo] = useState<SendToMode>("users");
  const [priority, setPriority] = useState<Priority>("regular");
  const [message, setMessage] = useState("");

  // data
  const [profiles, setProfiles] = useState<ProfileRow[]>([]);
  const [departments, setDepartments] = useState<string[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<ProfileRow[]>([]);
  const [selectedDept, setSelectedDept] = useState<string>("");

  // ui
  const [busy, setBusy] = useState(false);
  const [showUserPicker, setShowUserPicker] = useState(false);
  const [showDeptPicker, setShowDeptPicker] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  // optional search
  const [userSearch, setUserSearch] = useState("");
  const [deptSearch, setDeptSearch] = useState("");

  useEffect(() => {
    const init = async () => {
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

      if (profile?.role !== "admin") {
        Alert.alert(
          "Restricted Access",
          "For admin use only",
          [{ text: "OK", onPress: () => router.replace("/main") }],
          { cancelable: false }
        );
        return;
      }

      setAuthorized(true);
      await loadProfilesAndDepts();
    };

    init();
  }, []);

  const loadProfilesAndDepts = async () => {
    const { data, error } = await supabase
      .from("profiles")
      .select("id, full_name, department, role")
      .order("full_name", { ascending: true });

    if (error) {
      Alert.alert("Error", error.message);
      return;
    }

    const rows: ProfileRow[] = Array.isArray(data) ? (data as any) : [];
    setProfiles(rows);

    const uniq = new Set<string>();
    rows.forEach((p) => {
      const d = (p.department || "").trim();
      if (d) uniq.add(d);
    });

    const deptList = Array.from(uniq).sort((a, b) => a.localeCompare(b));
    setDepartments(deptList);

    if (!selectedDept && deptList.length > 0) setSelectedDept(deptList[0]);
  };

  const canSend = useMemo(() => {
    if (!message.trim()) return false;
    if (busy) return false;

    if (sendTo === "users") return selectedUsers.length > 0;
    if (sendTo === "department") return !!selectedDept;
    return true;
  }, [message, busy, sendTo, selectedUsers.length, selectedDept]);

  const recipientsPreview = useMemo(() => {
    if (sendTo === "users") {
      return {
        title: "Selected User(s)",
        detail:
          selectedUsers.length === 0
            ? "None selected"
            : `${selectedUsers.length} selected`,
        list: selectedUsers
          .slice(0, 10)
          .map((u) => u.full_name || "Unnamed")
          .join(", "),
        more:
          selectedUsers.length > 10 ? `+${selectedUsers.length - 10} more` : "",
      };
    }

    if (sendTo === "department") {
      return { title: "Department", detail: selectedDept || "None", list: "", more: "" };
    }

    return { title: "Organization", detail: "All users", list: "", more: "" };
  }, [sendTo, selectedUsers, selectedDept]);

  const toggleUser = (u: ProfileRow) => {
    setSelectedUsers((prev) => {
      const exists = prev.some((x) => x.id === u.id);
      if (exists) return prev.filter((x) => x.id !== u.id);
      return [...prev, u];
    });
  };

  const removeSelectedUser = (id: string) => {
    setSelectedUsers((prev) => prev.filter((x) => x.id !== id));
  };

  const filteredUsers = useMemo(() => {
    const q = userSearch.trim().toLowerCase();
    if (!q) return profiles;
    return profiles.filter((p) => {
      const name = (p.full_name || "").toLowerCase();
      const dept = (p.department || "").toLowerCase();
      return name.includes(q) || dept.includes(q);
    });
  }, [profiles, userSearch]);

  const filteredDepts = useMemo(() => {
    const q = deptSearch.trim().toLowerCase();
    if (!q) return departments;
    return departments.filter((d) => d.toLowerCase().includes(q));
  }, [departments, deptSearch]);

  const buildRecipientIds = async (): Promise<string[]> => {
    if (sendTo === "users") return selectedUsers.map((u) => u.id);

    if (sendTo === "department") {
      const dept = selectedDept?.trim();
      if (!dept) return [];

      const { data, error } = await supabase
        .from("profiles")
        .select("id, role")
        .eq("department", dept);

      if (error) throw new Error(error.message);

      const rows: any[] = Array.isArray(data) ? data : [];
      return rows.filter((r) => r.role !== "admin").map((r) => String(r.id));
    }

    const { data, error } = await supabase.from("profiles").select("id, role");
    if (error) throw new Error(error.message);

    const rows: any[] = Array.isArray(data) ? data : [];
    return rows.filter((r) => r.role !== "admin").map((r) => String(r.id));
  };

  const doSend = async () => {
    if (!canSend) return;

    try {
      setBusy(true);

      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Not signed in.");

      const recipientIds = await buildRecipientIds();
      if (!recipientIds.length) throw new Error("No recipients found.");

      const batchId = makeBatchId(); // ✅ UUID string
      const title = priority === "urgent" ? "🚨 URGENT ALERT" : "🔔 ALERT";

      // ✅ Always write to messages (fast + existing pipeline)
      const rows = recipientIds.map((rid) => ({
        title,
        body: message.trim(),
        recipient_id: rid,
        is_read: false,
        source_type: priority === "urgent" ? "admin_alert_urgent" : "admin_alert",
        source_id: batchId, // ✅ UUID
        is_locked: true,
        created_at: new Date().toISOString(),
      }));

      const { error: msgErr } = await supabase.from("messages").insert(rows);
      if (msgErr) throw new Error(msgErr.message);

      // Optional: also write to notifications table if it exists (won’t block)
      try {
        await supabase.from("notifications").insert(
          recipientIds.map((rid) => ({
            recipient_id: rid,
            title,
            body: message.trim(),
            level: priority === "urgent" ? "Urgent" : "Notification",
            source_type: priority === "urgent" ? "admin_alert_urgent" : "admin_alert",
            source_id: batchId, // ✅ UUID
            created_at: new Date().toISOString(),
          }))
        );
      } catch {}

      setConfirmOpen(false);
      setMessage("");
      if (sendTo === "users") setSelectedUsers([]);

      Alert.alert("Sent", "Alert sent successfully.");
    } catch (e: any) {
      Alert.alert("Error", e?.message || "Failed to send alert.");
    } finally {
      setBusy(false);
    }
  };

  const isPicked = (id: string) => selectedUsers.some((x) => x.id === id);

  if (!authorized) return null;

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        bounces={false}
      >
        <AppHeader />

        <View style={styles.headerText}>
          <Text style={styles.title}>Send Alert</Text>
          <Text style={styles.subtitle}>Push-style notification</Text>
        </View>

        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Send to</Text>

          <View style={styles.toggleRow}>
            <TouchableOpacity
              activeOpacity={0.9}
              onPress={() => setSendTo("users")}
              style={[styles.toggleBtn, sendTo === "users" && styles.toggleBtnActive]}
            >
              <Text style={[styles.toggleText, sendTo === "users" && styles.toggleTextActive]}>
                User(s)
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.9}
              onPress={() => setSendTo("department")}
              style={[styles.toggleBtn, sendTo === "department" && styles.toggleBtnActive]}
            >
              <Text style={[styles.toggleText, sendTo === "department" && styles.toggleTextActive]}>
                Department
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.9}
              onPress={() => setSendTo("org")}
              style={[styles.toggleBtn, sendTo === "org" && styles.toggleBtnActive]}
            >
              <Text style={[styles.toggleText, sendTo === "org" && styles.toggleTextActive]}>
                Organization
              </Text>
            </TouchableOpacity>
          </View>

          {sendTo === "users" && (
            <>
              <TouchableOpacity
                activeOpacity={0.9}
                onPress={() => setShowUserPicker(true)}
                style={styles.pickButton}
              >
                <Text style={styles.pickButtonText}>
                  {selectedUsers.length > 0
                    ? `Selected: ${selectedUsers.length}`
                    : "Select User(s)"}
                </Text>
              </TouchableOpacity>

              {selectedUsers.length > 0 && (
                <View style={styles.selectedWrap}>
                  {selectedUsers.map((u) => (
                    <View key={u.id} style={styles.chip}>
                      <Text style={styles.chipText} numberOfLines={1}>
                        {u.full_name || "Unnamed"}
                      </Text>
                      <TouchableOpacity
                        onPress={() => removeSelectedUser(u.id)}
                        style={styles.chipX}
                        activeOpacity={0.85}
                      >
                        <Text style={styles.chipXText}>✕</Text>
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
              )}
            </>
          )}

          {sendTo === "department" && (
            <TouchableOpacity
              activeOpacity={0.9}
              onPress={() => setShowDeptPicker(true)}
              style={styles.pickButton}
            >
              <Text style={styles.pickButtonText}>
                {selectedDept ? selectedDept : "Select Department"}
              </Text>
            </TouchableOpacity>
          )}

          {sendTo === "org" && (
            <Text style={styles.helperText}>
              This will send to all users in the app (excluding admins).
            </Text>
          )}
        </View>

        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Priority</Text>

          <View style={styles.toggleRow}>
            <TouchableOpacity
              activeOpacity={0.9}
              onPress={() => setPriority("regular")}
              style={[styles.toggleBtn, priority === "regular" && styles.toggleBtnActive]}
            >
              <Text style={[styles.toggleText, priority === "regular" && styles.toggleTextActive]}>
                Regular
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.9}
              onPress={() => setPriority("urgent")}
              style={[styles.toggleBtn, priority === "urgent" && styles.toggleBtnActiveRed]}
            >
              <Text style={[styles.toggleText, priority === "urgent" && styles.toggleTextActive]}>
                Urgent
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Message</Text>
          <TextInput
            value={message}
            onChangeText={setMessage}
            placeholder="Type the alert message…"
            placeholderTextColor="rgba(255,255,255,0.45)"
            multiline
            // ✅ suggestions + spellcheck
            autoCorrect
            spellCheck
            autoCapitalize="sentences"
            keyboardAppearance="dark"
            style={styles.textArea}
          />
        </View>

        <TouchableOpacity
          activeOpacity={0.9}
          disabled={!canSend}
          onPress={() => setConfirmOpen(true)}
          style={[styles.sendBtn, !canSend && styles.sendBtnDisabled]}
        >
          <Text style={styles.sendBtnText}>{busy ? "Sending…" : "Send Alert"}</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Confirm modal */}
      <Modal
        visible={confirmOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setConfirmOpen(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.confirmCard}>
            <Text style={styles.confirmTitle}>Confirm Alert</Text>

            <View style={styles.confirmRow}>
              <Text style={styles.confirmLabel}>To</Text>
              <Text style={styles.confirmValue}>
                {recipientsPreview.title}: {recipientsPreview.detail}
              </Text>
            </View>

            {!!recipientsPreview.list && (
              <Text style={styles.confirmSmall} numberOfLines={2}>
                {recipientsPreview.list}{" "}
                {recipientsPreview.more ? `(${recipientsPreview.more})` : ""}
              </Text>
            )}

            <View style={styles.confirmRow}>
              <Text style={styles.confirmLabel}>Priority</Text>
              <Text style={styles.confirmValue}>
                {priority === "urgent" ? "Urgent" : "Regular"}
              </Text>
            </View>

            <View style={styles.previewBox}>
              <Text style={styles.previewText} numberOfLines={6}>
                {message.trim()}
              </Text>
            </View>

            <View style={styles.confirmButtons}>
              <TouchableOpacity
                activeOpacity={0.9}
                onPress={() => setConfirmOpen(false)}
                style={[styles.confirmBtn, styles.confirmBtnGhost]}
                disabled={busy}
              >
                <Text style={styles.confirmBtnGhostText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                activeOpacity={0.9}
                onPress={doSend}
                style={[styles.confirmBtn, priority === "urgent" ? styles.confirmBtnRed : styles.confirmBtnSolid]}
                disabled={!canSend}
              >
                <Text style={styles.confirmBtnSolidText}>
                  {busy ? "Sending…" : "Confirm & Send"}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* User picker modal */}
      <Modal
        visible={showUserPicker}
        transparent
        animationType="slide"
        onRequestClose={() => {
          setUserSearch("");
          setShowUserPicker(false);
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.pickerCardFixed}>
            <View style={styles.pickerTopBar}>
              <TouchableOpacity
                activeOpacity={0.9}
                onPress={() => {
                  setUserSearch("");
                  setShowUserPicker(false);
                }}
                style={styles.closeBtn}
              >
                <Text style={styles.closeBtnText}>Close</Text>
              </TouchableOpacity>

              <Text style={styles.pickerTitle}>Select User(s)</Text>

              <View style={{ width: 64 }} />
            </View>

            <TextInput
              value={userSearch}
              onChangeText={setUserSearch}
              placeholder="Search (optional)…"
              placeholderTextColor="rgba(255,255,255,0.45)"
              autoCorrect={false}
              spellCheck={false}
              style={styles.searchInput}
            />

            <View style={styles.listWrap}>
              <FlatList
                data={filteredUsers}
                keyExtractor={(item) => item.id}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingBottom: 10 }}
                renderItem={({ item }) => {
                  const picked = isPicked(item.id);
                  return (
                    <TouchableOpacity
                      activeOpacity={0.9}
                      onPress={() => toggleUser(item)}
                      style={[styles.userRowBtn, picked && styles.userRowBtnOn]}
                    >
                      <View style={styles.userRowLeft}>
                        <Text style={styles.userRowName} numberOfLines={1}>
                          {item.full_name || "Unnamed"}
                        </Text>
                        <Text style={styles.userRowMeta} numberOfLines={1}>
                          {item.department || "No department"}
                        </Text>
                      </View>

                      <View style={[styles.check, picked && styles.checkOn]}>
                        <Text style={styles.checkText}>{picked ? "✓" : ""}</Text>
                      </View>
                    </TouchableOpacity>
                  );
                }}
              />
            </View>

            <View style={styles.pickerFooter}>
              <TouchableOpacity
                activeOpacity={0.9}
                onPress={() => {
                  setUserSearch("");
                  setShowUserPicker(false);
                }}
                style={[styles.confirmBtn, styles.confirmBtnSolid]}
              >
                <Text style={styles.confirmBtnSolidText}>
                  Done ({selectedUsers.length})
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Dept picker modal */}
      <Modal
        visible={showDeptPicker}
        transparent
        animationType="slide"
        onRequestClose={() => {
          setDeptSearch("");
          setShowDeptPicker(false);
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.pickerCardFixed}>
            <View style={styles.pickerTopBar}>
              <TouchableOpacity
                activeOpacity={0.9}
                onPress={() => {
                  setDeptSearch("");
                  setShowDeptPicker(false);
                }}
                style={styles.closeBtn}
              >
                <Text style={styles.closeBtnText}>Close</Text>
              </TouchableOpacity>

              <Text style={styles.pickerTitle}>Select Department</Text>

              <View style={{ width: 64 }} />
            </View>

            <TextInput
              value={deptSearch}
              onChangeText={setDeptSearch}
              placeholder="Search (optional)…"
              placeholderTextColor="rgba(255,255,255,0.45)"
              autoCorrect={false}
              spellCheck={false}
              style={styles.searchInput}
            />

            <View style={styles.listWrap}>
              <FlatList
                data={filteredDepts}
                keyExtractor={(item) => item}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingBottom: 10 }}
                renderItem={({ item }) => {
                  const picked = item === selectedDept;
                  return (
                    <TouchableOpacity
                      activeOpacity={0.9}
                      onPress={() => setSelectedDept(item)}
                      style={[styles.userRowBtn, picked && styles.userRowBtnOn]}
                    >
                      <Text style={styles.userRowName} numberOfLines={1}>
                        {item}
                      </Text>

                      <View style={[styles.check, picked && styles.checkOn]}>
                        <Text style={styles.checkText}>{picked ? "✓" : ""}</Text>
                      </View>
                    </TouchableOpacity>
                  );
                }}
              />
            </View>

            <View style={styles.pickerFooter}>
              <TouchableOpacity
                activeOpacity={0.9}
                onPress={() => {
                  setDeptSearch("");
                  setShowDeptPicker(false);
                }}
                style={[styles.confirmBtn, styles.confirmBtnSolid]}
              >
                <Text style={styles.confirmBtnSolidText}>Done</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <View style={styles.bottomBar}>
        <View style={styles.bottomButtonRow}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Text style={styles.backIcon}>⬅️</Text>
            <Text style={styles.backText}>Back</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.backButton} onPress={() => router.push("/main")}>
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
    paddingHorizontal: Math.round(Spacing.screenPadding * 1.15),
  },
  scroll: { flex: 1 },
  scrollContent: { paddingBottom: Layout.bottomNavSpacing + 140 },

  headerText: { alignItems: "center", marginBottom: 12 },
  title: {
    fontSize: Typography.greeting.fontSize,
    fontWeight: Typography.greeting.fontWeight,
    color: Colors.textPrimary,
    marginBottom: 4,
  },
  subtitle: { fontSize: Typography.quote.fontSize, color: Colors.textSecondary },

  sectionCard: {
    backgroundColor: "rgba(255,255,255,0.06)",
    borderRadius: Radius.card,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
  },
  sectionTitle: {
    color: Colors.textPrimary,
    fontSize: 13,
    fontWeight: "900",
    marginBottom: 10,
  },

  toggleRow: {
    flexDirection: "row",
    gap: 10,
    justifyContent: "space-between",
    marginBottom: 8,
  },
  toggleBtn: {
    flex: 1,
    height: 44,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    backgroundColor: "rgba(255,255,255,0.04)",
    alignItems: "center",
    justifyContent: "center",
  },
  toggleBtnActive: {
    backgroundColor: "rgba(255,255,255,0.10)",
    borderColor: "rgba(255,255,255,0.22)",
  },
  toggleBtnActiveRed: {
    backgroundColor: "rgba(225,29,72,0.22)",
    borderColor: "rgba(225,29,72,0.40)",
  },
  toggleText: { color: "rgba(255,255,255,0.80)", fontSize: 13, fontWeight: "900" },
  toggleTextActive: { color: "#FFFFFF" },

  pickButton: {
    height: 46,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.08)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 12,
  },
  pickButtonText: { color: Colors.textPrimary, fontSize: 13, fontWeight: "900" },

  helperText: { marginTop: 8, color: "rgba(255,255,255,0.75)", fontSize: 12, lineHeight: 16 },

  selectedWrap: { marginTop: 10, flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    maxWidth: "100%",
    backgroundColor: "rgba(255,255,255,0.10)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.14)",
    borderRadius: 999,
    paddingVertical: 6,
    paddingLeft: 10,
    paddingRight: 6,
  },
  chipText: { color: "rgba(255,255,255,0.92)", fontSize: 12, fontWeight: "800", maxWidth: 220 },
  chipX: {
    marginLeft: 8,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: "rgba(0,0,0,0.22)",
    alignItems: "center",
    justifyContent: "center",
  },
  chipXText: { color: "#FFFFFF", fontSize: 12, fontWeight: "900", marginTop: -1 },

  textArea: {
    minHeight: 120,
    borderRadius: 14,
    backgroundColor: "rgba(0,0,0,0.18)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    paddingHorizontal: 12,
    paddingVertical: 12,
    color: Colors.textPrimary,
    fontSize: 14,
    fontWeight: "700",
    textAlignVertical: "top",
  },

  sendBtn: {
    height: 52,
    borderRadius: 16,
    backgroundColor: "#E11D48",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 6,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.14)",
  },
  sendBtnDisabled: { opacity: 0.45 },
  sendBtnText: { color: "#FFFFFF", fontSize: 14, fontWeight: "900", letterSpacing: 0.2 },

  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.70)",
    alignItems: "center",
    justifyContent: "center",
    padding: 18,
  },

  confirmCard: {
    width: "100%",
    borderRadius: Radius.card,
    backgroundColor: "rgba(18,18,18,0.98)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    padding: 16,
  },
  confirmTitle: { color: Colors.textPrimary, fontSize: 16, fontWeight: "900", marginBottom: 12 },
  confirmRow: { flexDirection: "row", justifyContent: "space-between", gap: 10, marginBottom: 8 },
  confirmLabel: { color: "rgba(255,255,255,0.72)", fontSize: 12, fontWeight: "800" },
  confirmValue: { color: "#FFFFFF", fontSize: 12, fontWeight: "900", textAlign: "right", flex: 1 },
  confirmSmall: { color: "rgba(255,255,255,0.72)", fontSize: 12, marginBottom: 10 },
  previewBox: {
    marginTop: 8,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
    padding: 12,
    marginBottom: 12,
  },
  previewText: { color: "rgba(255,255,255,0.92)", fontSize: 13, fontWeight: "700", lineHeight: 18 },
  confirmButtons: { flexDirection: "row", gap: 10, justifyContent: "space-between" },
  confirmBtn: { flex: 1, height: 48, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  confirmBtnGhost: {
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
  },
  confirmBtnGhostText: { color: "rgba(255,255,255,0.90)", fontSize: 13, fontWeight: "900" },
  confirmBtnSolid: { backgroundColor: "#D67A2F", borderWidth: 1, borderColor: "rgba(255,255,255,0.14)" },
  confirmBtnRed: { backgroundColor: "#E11D48", borderWidth: 1, borderColor: "rgba(255,255,255,0.14)" },
  confirmBtnSolidText: { color: "#FFFFFF", fontSize: 13, fontWeight: "900" },

  pickerCardFixed: {
    width: "100%",
    height: "88%",
    borderRadius: Radius.card,
    backgroundColor: "rgba(18,18,18,0.98)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    padding: 14,
  },
  pickerTopBar: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 10 },
  pickerTitle: { color: Colors.textPrimary, fontSize: 15, fontWeight: "900", textAlign: "center" },
  closeBtn: {
    width: 64,
    height: 34,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    alignItems: "center",
    justifyContent: "center",
  },
  closeBtnText: { color: "rgba(255,255,255,0.92)", fontSize: 12, fontWeight: "900" },

  searchInput: {
    height: 44,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    paddingHorizontal: 12,
    color: Colors.textPrimary,
    fontSize: 13,
    fontWeight: "800",
    marginBottom: 10,
  },

  listWrap: { flex: 1, width: "100%" },

  userRowBtn: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.04)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    marginBottom: 8,
  },
  userRowBtnOn: { backgroundColor: "rgba(46,196,182,0.10)", borderColor: "rgba(46,196,182,0.22)" },
  userRowLeft: { flex: 1, paddingRight: 10 },
  userRowName: { color: "#FFFFFF", fontSize: 13, fontWeight: "900" },
  userRowMeta: { color: "rgba(255,255,255,0.65)", fontSize: 11, marginTop: 2, fontWeight: "700" },

  check: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.14)",
    alignItems: "center",
    justifyContent: "center",
  },
  checkOn: { backgroundColor: "rgba(46,196,182,0.30)", borderColor: "rgba(46,196,182,0.55)" },
  checkText: { color: "#FFFFFF", fontSize: 14, fontWeight: "900", marginTop: -1 },

  pickerFooter: { paddingTop: 8 },

  bottomBar: {
    position: "absolute",
    bottom: Layout.bottomNavSpacing,
    left: Math.round(Spacing.screenPadding * 1.15),
    right: Math.round(Spacing.screenPadding * 1.15),
    alignItems: "center",
  },
  bottomButtonRow: { flexDirection: "row", gap: 16 },
  backButton: { ...Components.backButton, flexDirection: "row", alignItems: "center" },
  backIcon: { fontSize: 18, marginRight: 8 },
  backText: { color: Colors.textPrimary, fontSize: 16, fontWeight: "700" },
});
