// app/challenges/physical/physical-exam.tsx

import { AppHeader } from "@/components/AppHeader";
import {
    Colors,
    Components,
    Layout,
    Radius,
    Spacing,
    Typography,
} from "@/constants/theme";
import { supabase } from "@/lib/supabase";
import * as ImagePicker from "expo-image-picker";
import { useRouter } from "expo-router";
import { useMemo, useState } from "react";
import {
    Alert,
    KeyboardAvoidingView,
    Modal,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";

type Option = { label: string; value: string };

function pad2(n: number) {
  return n < 10 ? `0${n}` : `${n}`;
}

function formatPrettyDate(isoDate: string) {
  const [y, m, d] = isoDate.split("-").map((x) => parseInt(x, 10));
  const dt = new Date(y, m - 1, d);
  return dt.toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function buildPastNDates(n: number): Option[] {
  const out: Option[] = [];
  const now = new Date();
  for (let i = 0; i < n; i++) {
    const d = new Date(now);
    d.setDate(now.getDate() - i);
    const iso = `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(
      d.getDate()
    )}`;
    out.push({ value: iso, label: formatPrettyDate(iso) });
  }
  return out;
}

function Dropdown({
  label,
  valueLabel,
  placeholder,
  options,
  onSelect,
  cardColor,
}: {
  label: string;
  valueLabel: string | null;
  placeholder: string;
  options: Option[];
  onSelect: (opt: Option) => void;
  cardColor: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Text style={styles.fieldLabel}>{label}</Text>

      <TouchableOpacity
        style={[styles.dropdownButton, { backgroundColor: cardColor }]}
        onPress={() => setOpen(true)}
        activeOpacity={0.85}
      >
        <Text
          style={[
            styles.dropdownText,
            !valueLabel && styles.dropdownPlaceholder,
          ]}
        >
          {valueLabel || placeholder}
        </Text>
        <Text style={styles.dropdownChevron}>▾</Text>
      </TouchableOpacity>

      <Modal
        visible={open}
        transparent
        animationType="fade"
        onRequestClose={() => setOpen(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>{label}</Text>

            <ScrollView
              style={{ maxHeight: 420 }}
              contentContainerStyle={{ paddingVertical: 6 }}
              keyboardShouldPersistTaps="handled"
            >
              {options.map((opt) => (
                <TouchableOpacity
                  key={opt.value}
                  style={styles.modalOption}
                  onPress={() => {
                    onSelect(opt);
                    setOpen(false);
                  }}
                >
                  <Text style={styles.modalOptionText}>{opt.label}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <TouchableOpacity
              style={styles.modalCancel}
              onPress={() => setOpen(false)}
            >
              <Text style={styles.modalCancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </>
  );
}

export default function PhysicalExamScreen() {
  const router = useRouter();

  const CHALLENGE_ID = "3c635de5-4111-49c8-a13a-618eefc815bb"; // Physical Checkup (500)

  const dates = useMemo(() => buildPastNDates(365), []);

  const [selectedDate, setSelectedDate] = useState<Option | null>(
    dates[0] ?? null
  );
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const canSubmit = !!selectedDate && !!photoUri;

  const ensureCameraPermission = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permission needed", "Camera access is required to take a photo.");
      return false;
    }
    return true;
  };

  const ensureLibraryPermission = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert(
        "Permission needed",
        "Photo library access is required to upload a photo."
      );
      return false;
    }
    return true;
  };

  const pickFromCamera = async () => {
    const ok = await ensureCameraPermission();
    if (!ok) return;

    const result = await ImagePicker.launchCameraAsync({ quality: 0.7 });
    if (!result.canceled) setPhotoUri(result.assets[0].uri);
  };

  const pickFromLibrary = async () => {
    const ok = await ensureLibraryPermission();
    if (!ok) return;

    const result = await ImagePicker.launchImageLibraryAsync({ quality: 0.7 });
    if (!result.canceled) setPhotoUri(result.assets[0].uri);
  };

  const submit = async () => {
    if (!canSubmit || submitting) return;

    setSubmitting(true);

    const {
      data: { user },
      error: userErr,
    } = await supabase.auth.getUser();

    if (userErr || !user?.id) {
      setSubmitting(false);
      Alert.alert("Not signed in", "Please sign in and try again.");
      return;
    }

    const occurredDate = selectedDate!.value; // YYYY-MM-DD
    const [yy, mm, dd] = occurredDate.split("-").map((x) => parseInt(x, 10));
    const occurredAtIso = new Date(yy, mm - 1, dd, 12, 0, 0).toISOString();

    const { error } = await supabase.from("challenge_activity").insert({
      user_id: user.id,
      challenge_id: CHALLENGE_ID,
      status: "pending", // admin approval required
      occurred_at: occurredAtIso,
      media_url: photoUri, // current pattern in your app
      activity_type: "physical_checkup",
      metadata: {
        physical_date: occurredDate,
        note:
          "Do not include personal health information. Appointment verification photo only.",
      },
    });

    setSubmitting(false);

    if (error) {
      // If it truly is one-time, this will typically be a unique/constraint error.
      // Otherwise, show the real error so you can fix it fast.
      const msg = (error.message || "").toLowerCase();
      const looksLikeDuplicate =
        msg.includes("duplicate") ||
        msg.includes("unique") ||
        msg.includes("already") ||
        msg.includes("violates");

      Alert.alert(
        looksLikeDuplicate ? "Already submitted" : "Couldn’t submit",
        looksLikeDuplicate
          ? "This challenge is one time only."
          : error.message || "Please try again."
      );
      return;
    }

    Alert.alert("Submitted", "Your submission has been sent for review.", [
      { text: "OK", onPress: () => router.back() },
    ]);
  };

  return (
    <View style={styles.container}>
      <AppHeader />

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.headerText}>
            <Text style={styles.icon}>🩺</Text>
            <Text style={styles.title}>Physical Checkup</Text>
            <Text style={styles.subtitle}>
              <Text style={styles.subtitleBold}>
                Worth 500 points | One time only{"\n"}
              </Text>
              Please upload or capture a picture verifying your checkup or
              physical, and do not include any personal health information. A
              copy of the appointment verification is sufficient.
            </Text>
          </View>

          <View style={{ marginTop: 10 }}>
            <Dropdown
              label="Date of Physical"
              valueLabel={selectedDate?.label ?? null}
              placeholder="Select date"
              options={dates}
              onSelect={setSelectedDate}
              cardColor={Colors.cards.journal}
            />
          </View>

          <View style={styles.photoSection}>
            <Text style={styles.photoLabel}>Proof (required)</Text>

            <View style={styles.photoButtons}>
              <TouchableOpacity style={styles.photoButton} onPress={pickFromCamera}>
                <Text style={styles.photoIcon}>📷</Text>
                <Text style={styles.photoText}>Take Photo</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.photoButton} onPress={pickFromLibrary}>
                <Text style={styles.photoIcon}>🖼️</Text>
                <Text style={styles.photoText}>Upload Photo</Text>
              </TouchableOpacity>
            </View>

            {photoUri && <Text style={styles.photoSelected}>Photo attached</Text>}
          </View>

          <TouchableOpacity
            style={[
              styles.submitButton,
              (!canSubmit || submitting) && styles.submitDisabled,
            ]}
            disabled={!canSubmit || submitting}
            onPress={submit}
          >
            <Text style={styles.submitText}>
              {submitting ? "Submitting..." : "Submit for Review"}
            </Text>
          </TouchableOpacity>

          <View style={{ height: 120 }} />
        </ScrollView>
      </KeyboardAvoidingView>

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
    paddingHorizontal: Spacing.screenPadding,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  headerText: {
    alignItems: "center",
    marginBottom: 20,
  },
  icon: {
    fontSize: 28,
    marginBottom: 6,
  },
  title: {
    fontSize: Typography.greeting.fontSize,
    fontWeight: Typography.greeting.fontWeight,
    color: Colors.textPrimary,
    textAlign: "center",
  },
  subtitle: {
    fontSize: Typography.quote.fontSize,
    color: Colors.textSecondary,
    textAlign: "center",
    marginTop: 6,
    lineHeight: 20,
  },
  subtitleBold: {
    fontWeight: "700",
    color: Colors.textPrimary,
  },
  fieldLabel: {
    color: Colors.textSecondary,
    marginBottom: 8,
    marginTop: 10,
  },
  dropdownButton: {
    borderRadius: Radius.card,
    paddingVertical: 14,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  dropdownText: {
    color: Colors.textPrimary,
    fontWeight: "700",
    flex: 1,
  },
  dropdownPlaceholder: {
    color: Colors.textSecondary,
    fontWeight: "600",
  },
  dropdownChevron: {
    color: Colors.textPrimary,
    marginLeft: 10,
    fontSize: 16,
    opacity: 0.8,
  },
  photoSection: {
    marginTop: 16,
    marginBottom: 20,
  },
  photoLabel: {
    color: Colors.textSecondary,
    marginBottom: 8,
  },
  photoButtons: {
    flexDirection: "row",
    gap: 12,
  },
  photoButton: {
    flex: 1,
    backgroundColor: Colors.cards.goals,
    borderRadius: Radius.card,
    paddingVertical: 14,
    alignItems: "center",
  },
  photoIcon: {
    fontSize: 20,
    marginBottom: 4,
  },
  photoText: {
    color: Colors.textPrimary,
    fontWeight: "700",
  },
  photoSelected: {
    marginTop: 8,
    color: Colors.textSecondary,
    fontSize: 12,
  },
  submitButton: {
    backgroundColor: Colors.cards.complete,
    paddingVertical: 14,
    borderRadius: Radius.card,
    alignItems: "center",
  },
  submitDisabled: {
    opacity: 0.4,
  },
  submitText: {
    color: Colors.textPrimary,
    fontWeight: "700",
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
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.55)",
    padding: Spacing.screenPadding,
    justifyContent: "center",
  },
  modalCard: {
    backgroundColor: Colors.background,
    borderRadius: Radius.card,
    padding: 14,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
  },
  modalTitle: {
    color: Colors.textPrimary,
    fontSize: 16,
    fontWeight: "800",
    marginBottom: 8,
    textAlign: "center",
  },
  modalOption: {
    backgroundColor: "rgba(255,255,255,0.08)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    borderRadius: Radius.card,
    paddingVertical: 12,
    paddingHorizontal: 12,
    marginBottom: 10,
  },
  modalOptionText: {
    color: Colors.textPrimary,
    fontWeight: "700",
    textAlign: "center",
  },
  modalCancel: {
    marginTop: 6,
    paddingVertical: 12,
    borderRadius: Radius.card,
    backgroundColor: "rgba(255,255,255,0.08)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    alignItems: "center",
  },
  modalCancelText: {
    color: Colors.textPrimary,
    fontWeight: "800",
  },
});
