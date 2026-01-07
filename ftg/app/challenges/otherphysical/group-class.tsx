// app/challenges/otherphysical/group-class.tsx

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
import * as Location from "expo-location";
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
  TextInput,
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

function buildNextNDates(n: number): Option[] {
  const out: Option[] = [];
  const now = new Date();
  for (let i = 0; i < n; i++) {
    const d = new Date(now);
    d.setDate(now.getDate() + i);
    const iso = `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(
      d.getDate()
    )}`;
    out.push({ value: iso, label: formatPrettyDate(iso) });
  }
  return out;
}

function buildTimes15MinFrom6am(): Option[] {
  const out: Option[] = [];
  for (let h = 6; h < 24; h++) {
    for (let m = 0; m < 60; m += 15) {
      const value = `${pad2(h)}:${pad2(m)}`;
      const dt = new Date();
      dt.setHours(h, m, 0, 0);
      const label = dt.toLocaleTimeString(undefined, {
        hour: "numeric",
        minute: "2-digit",
      });
      out.push({ value, label });
    }
  }
  return out;
}

function buildHourLengths(): Option[] {
  const hours = [1, 2, 3, 4, 5, 6, 7, 8];
  return hours.map((h) => ({
    value: `${h * 60}`,
    label: `${h} hour${h === 1 ? "" : "s"}`,
  }));
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

export default function GroupClassScreen() {
  const router = useRouter();

  const CHALLENGE_ID = "a485e75c-7ba5-436d-b3fe-f1f00ddbf209";

  const dates = useMemo(() => buildNextNDates(30), []);
  const times = useMemo(() => buildTimes15MinFrom6am(), []);
  const lengths = useMemo(() => buildHourLengths(), []);

  const [className, setClassName] = useState("");
  const [selectedDate, setSelectedDate] = useState<Option | null>(
    dates[0] ?? null
  );
  const [selectedTime, setSelectedTime] = useState<Option | null>(null);
  const [selectedLength, setSelectedLength] = useState<Option | null>(null);
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const canSubmit =
    className.trim().length > 0 &&
    !!selectedDate &&
    !!selectedTime &&
    !!selectedLength &&
    description.trim().length > 0;

  const getGpsOrStop = async () => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== "granted") {
      Alert.alert(
        "Location needed",
        "Location access is required to capture GPS on submission."
      );
      return null;
    }

    try {
      const pos = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      return {
        lat: pos.coords.latitude ?? null,
        lng: pos.coords.longitude ?? null,
      };
    } catch {
      Alert.alert("Couldn’t capture GPS", "Please try again.");
      return null;
    }
  };

  const submit = async () => {
    if (!canSubmit || submitting) return;

    const lenMin = parseInt(selectedLength!.value, 10);
    if (Number.isNaN(lenMin) || lenMin < 60) {
      Alert.alert(
        "Class too short",
        "Classes must be at least 1 hour in length."
      );
      return;
    }

    setSubmitting(true);

    const { data: userData, error: userErr } = await supabase.auth.getUser();
    const userId = userData?.user?.id ?? null;

    if (userErr || !userId) {
      setSubmitting(false);
      Alert.alert("Not signed in", "Please sign in and try again.");
      return;
    }

    const gps = await getGpsOrStop();
    if (!gps) {
      setSubmitting(false);
      return;
    }

    // IMPORTANT: Build occurred_at in LOCAL time (not UTC)
    const occurredDate = selectedDate!.value; // YYYY-MM-DD
    const [yy, mm, dd] = occurredDate.split("-").map((x) => parseInt(x, 10));
    const [hh, min] = selectedTime!.value
      .split(":")
      .map((x) => parseInt(x, 10));

    const occurredAtIso = new Date(yy, mm - 1, dd, hh, min, 0).toISOString();

    // Insert APPROVED directly (auto-award happens on INSERT)
    // Do NOT send occurred_date — triggers derive it from occurred_at
    const { error: insertError } = await supabase.from("challenge_activity").insert({
      user_id: userId,
      challenge_id: CHALLENGE_ID,
      status: "approved",
      occurred_at: occurredAtIso,
      gps_lat: gps.lat,
      gps_lng: gps.lng,
      activity_type: "group_class",
      metadata: {
        class_name: className.trim(),
        class_date: selectedDate!.value,
        class_time: selectedTime!.value,
        length_minutes: lenMin,
        description: description.trim(),
      },
    });

    setSubmitting(false);

    if (insertError) {
      Alert.alert("Couldn’t submit", insertError.message || "Please try again.");
      return;
    }

    Alert.alert("Submitted", "Points will apply based on the weekly rule.", [
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
            <Text style={styles.icon}>👥</Text>

            <Text
              style={styles.title}
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.85}
            >
              Participate in Group / Class
            </Text>

            <Text style={styles.subtitle}>
              You may participate in a physical activity group or class weekly
              for 25 points upon submission. GPS will capture your location upon
              submission. Classes must be at least 1 hour in length.
            </Text>
          </View>

          <View style={{ marginTop: 10 }}>
            <TextInput
              style={styles.input}
              placeholder="Class name"
              placeholderTextColor={Colors.textSecondary}
              value={className}
              onChangeText={setClassName}
            />

            <Dropdown
              label="Class date"
              valueLabel={selectedDate?.label ?? null}
              placeholder="Select date"
              options={dates}
              onSelect={(opt) => setSelectedDate(opt)}
              cardColor={Colors.cards.journal}
            />

            <Dropdown
              label="Class time"
              valueLabel={selectedTime?.label ?? null}
              placeholder="Select time"
              options={times}
              onSelect={(opt) => setSelectedTime(opt)}
              cardColor={Colors.cards.journal}
            />

            <Dropdown
              label="Class length"
              valueLabel={selectedLength?.label ?? null}
              placeholder="Select length"
              options={lengths}
              onSelect={(opt) => setSelectedLength(opt)}
              cardColor={Colors.cards.journal}
            />

            <TextInput
              style={styles.textArea}
              placeholder="Brief description"
              placeholderTextColor={Colors.textSecondary}
              value={description}
              onChangeText={setDescription}
              multiline
            />
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
              {submitting ? "Submitting..." : "Submit"}
            </Text>
          </TouchableOpacity>

          <View style={{ height: 120 }} />
        </ScrollView>
      </KeyboardAvoidingView>

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
    width: "100%",
  },

  subtitle: {
    fontSize: Typography.quote.fontSize,
    color: Colors.textSecondary,
    textAlign: "center",
    marginTop: 6,
    lineHeight: 20,
  },

  input: {
    backgroundColor: Colors.cards.journal,
    color: Colors.textPrimary,
    padding: 12,
    borderRadius: Radius.card,
    marginBottom: 10,
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

  textArea: {
    backgroundColor: Colors.cards.journal,
    color: Colors.textPrimary,
    padding: 12,
    borderRadius: Radius.card,
    minHeight: 90,
    marginTop: 12,
    marginBottom: 16,
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
