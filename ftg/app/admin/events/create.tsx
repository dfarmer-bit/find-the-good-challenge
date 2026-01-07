// replaces: app/admin/events/create.tsx

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
import { useEffect, useMemo, useState } from "react";
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

type ProfileRow = {
  id: string;
  full_name: string | null;
  department: string | null;
  role?: string | null;
};

const STANDARD_RADIUS_METERS = 1000;

// ✅ Final challenge mapping (from your DB list)
const CHALLENGE_ID_BY_EVENT_TYPE: Record<string, string> = {
  ftg_training: "f4218098-4bde-421b-8e46-067090a28776", // Find the Good Training
  lunch_learn: "433932cd-1119-4faa-9216-134ea4778223", // Lunch & Learn
};

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

function PeoplePicker({
  title,
  people,
  selectedIds,
  multi,
  onPickSingle,
  onToggleMulti,
  onClose,
}: {
  title: string;
  people: ProfileRow[];
  selectedIds: string[];
  multi: boolean;
  onPickSingle: (id: string) => void;
  onToggleMulti: (id: string) => void;
  onClose: () => void;
}) {
  const selectedSet = useMemo(() => new Set(selectedIds), [selectedIds]);

  return (
    <View style={styles.modalOverlay}>
      <View style={styles.modalCard}>
        <Text style={styles.modalTitle}>{title}</Text>

        <ScrollView style={{ maxHeight: 460 }} keyboardShouldPersistTaps="handled">
          {people.map((p) => {
            const name = (p.full_name || "Unknown").trim();
            const dept = (p.department || "").trim();
            const checked = selectedSet.has(p.id);

            return (
              <TouchableOpacity
                key={p.id}
                style={[styles.personRow, checked && styles.personRowActive]}
                onPress={() => {
                  if (multi) onToggleMulti(p.id);
                  else onPickSingle(p.id);
                }}
                activeOpacity={0.85}
              >
                <View style={{ flex: 1 }}>
                  <Text style={styles.personName}>{name}</Text>
                  {!!dept && <Text style={styles.personDept}>{dept}</Text>}
                </View>
                <Text style={styles.personCheck}>
                  {multi ? (checked ? "✅" : "⬜️") : "➡️"}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        <TouchableOpacity style={styles.modalCancel} onPress={onClose}>
          <Text style={styles.modalCancelText}>Done</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

export default function CreateEventScreen() {
  const router = useRouter();

  const dates = useMemo(() => buildNextNDates(90), []);
  const times = useMemo(() => buildTimes15MinFrom6am(), []);

  // ✅ must match DB constraint: lunch_learn, ftg_training
  const eventTypes: Option[] = useMemo(
    () => [
      { label: "Training", value: "ftg_training" },
      { label: "Lunch & Learn", value: "lunch_learn" },
    ],
    []
  );

  const [checking, setChecking] = useState(true);
  const [adminOk, setAdminOk] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  const [profiles, setProfiles] = useState<ProfileRow[]>([]);
  const [loadingPeople, setLoadingPeople] = useState(true);

  // Event fields
  const [typeOpt, setTypeOpt] = useState<Option | null>(eventTypes[0] ?? null);
  const [title, setTitle] = useState("");
  const [locationText, setLocationText] = useState("");
  const [selectedDate, setSelectedDate] = useState<Option | null>(dates[0] ?? null);
  const [selectedTime, setSelectedTime] = useState<Option | null>(null);
  const [durationMinutes, setDurationMinutes] = useState("60");

  const [leaderUserId, setLeaderUserId] = useState<string | null>(null);

  // Geocoded coords (from address)
  const [geoLat, setGeoLat] = useState<number | null>(null);
  const [geoLng, setGeoLng] = useState<number | null>(null);

  // Targeting
  const [targetMode, setTargetMode] = useState<"single" | "multiple" | "department" | "all">("single");
  const [singleUserId, setSingleUserId] = useState<string | null>(null);
  const [multiUserIds, setMultiUserIds] = useState<string[]>([]);
  const [departmentOpt, setDepartmentOpt] = useState<Option | null>(null);

  // Modals
  const [pickSingleOpen, setPickSingleOpen] = useState(false);
  const [pickMultiOpen, setPickMultiOpen] = useState(false);
  const [pickLeaderOpen, setPickLeaderOpen] = useState(false);

  const [submitting, setSubmitting] = useState(false);

  const peopleLabelById = useMemo(() => {
    const m = new Map<string, string>();
    profiles.forEach((p) => m.set(p.id, (p.full_name || "Unknown").trim()));
    return m;
  }, [profiles]);

  const departments = useMemo(() => {
    const set = new Set<string>();
    for (const p of profiles) {
      const d = (p.department || "").trim();
      if (d) set.add(d);
    }
    return Array.from(set)
      .sort((a, b) => a.localeCompare(b))
      .map((d) => ({ label: d, value: d }));
  }, [profiles]);

  const singleName = singleUserId ? peopleLabelById.get(singleUserId) || "Selected attendee" : null;
  const leaderName = leaderUserId ? peopleLabelById.get(leaderUserId) || "Leader selected" : null;

  const multiLabel = useMemo(() => {
    if (multiUserIds.length === 0) return null;
    if (multiUserIds.length === 1) return peopleLabelById.get(multiUserIds[0]) || "1 attendee selected";
    return `${multiUserIds.length} attendees selected`;
  }, [multiUserIds, peopleLabelById]);

  const durationOk = useMemo(() => {
    const n = parseInt(durationMinutes, 10);
    return Number.isFinite(n) && n >= 15 && n <= 12 * 60;
  }, [durationMinutes]);

  const targetingOk = useMemo(() => {
    if (targetMode === "all") return true;
    if (targetMode === "department") return !!departmentOpt?.value;
    if (targetMode === "single") return !!singleUserId;
    if (targetMode === "multiple") return multiUserIds.length > 0;
    return false;
  }, [targetMode, departmentOpt, singleUserId, multiUserIds]);

  const canSubmitBase =
    adminOk &&
    !!typeOpt &&
    title.trim().length > 0 &&
    locationText.trim().length > 0 &&
    !!selectedDate &&
    !!selectedTime &&
    durationOk;

  const canSubmit = canSubmitBase && targetingOk && !submitting;

  useEffect(() => {
    (async () => {
      setChecking(true);

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user?.id) {
        setChecking(false);
        setAdminOk(false);
        Alert.alert("Not signed in", "Please sign in and try again.");
        router.replace("/login");
        return;
      }

      setCurrentUserId(user.id);

      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .maybeSingle();

      const role = (profile?.role || "").toLowerCase();
      if (role !== "admin") {
        setChecking(false);
        setAdminOk(false);
        Alert.alert("Admins only", "You don’t have access to create events.", [
          { text: "OK", onPress: () => router.back() },
        ]);
        return;
      }

      setAdminOk(true);
      setChecking(false);
    })();
  }, []);

  useEffect(() => {
    (async () => {
      setLoadingPeople(true);
      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name, department, role")
        .order("full_name", { ascending: true });

      if (error) {
        setProfiles([]);
        setLoadingPeople(false);
        return;
      }

      setProfiles((data as any) || []);
      setLoadingPeople(false);
    })();
  }, []);

  // If location changes, invalidate previous geocode
  useEffect(() => {
    setGeoLat(null);
    setGeoLng(null);
  }, [locationText]);

  const buildStartEndIso = () => {
    const occurredDate = selectedDate!.value; // YYYY-MM-DD
    const [yy, mm, dd] = occurredDate.split("-").map((x) => parseInt(x, 10));
    const [hh, min] = selectedTime!.value.split(":").map((x) => parseInt(x, 10));

    const start = new Date(yy, mm - 1, dd, hh, min, 0);

    const dur = parseInt(durationMinutes, 10);
    const end = new Date(start);
    end.setMinutes(end.getMinutes() + dur);

    return { startIso: start.toISOString(), endIso: end.toISOString(), startLocal: start };
  };

  const resolveRecipientIds = () => {
    if (targetMode === "all") return profiles.map((p) => p.id);

    if (targetMode === "department") {
      const dep = (departmentOpt?.value || "").trim();
      return profiles.filter((p) => (p.department || "").trim() === dep).map((p) => p.id);
    }

    if (targetMode === "single") return singleUserId ? [singleUserId] : [];
    if (targetMode === "multiple") return multiUserIds;

    return [];
  };

  const geocodeAddress = async (address: string) => {
    try {
      const trimmed = address.trim();
      if (!trimmed) return { lat: null as number | null, lng: null as number | null };

      const results = await Location.geocodeAsync(trimmed);
      if (!results || results.length === 0) return { lat: null, lng: null };

      const best = results[0];
      return { lat: best.latitude ?? null, lng: best.longitude ?? null };
    } catch {
      return { lat: null, lng: null };
    }
  };

  const submit = async () => {
    if (!canSubmit || submitting) return;
    if (!currentUserId) return;

    setSubmitting(true);

    try {
      const { startIso, endIso, startLocal } = buildStartEndIso();

      // Address → lat/lng
      let lat = geoLat;
      let lng = geoLng;

      if (lat == null || lng == null) {
        const geo = await geocodeAddress(locationText);
        lat = geo.lat;
        lng = geo.lng;

        if (lat == null || lng == null) {
          throw new Error("Address not found. Use a full street address.");
        }

        setGeoLat(lat);
        setGeoLng(lng);
      }

      const typeVal = typeOpt!.value;
      const challengeId = CHALLENGE_ID_BY_EVENT_TYPE[typeVal];

      // 1) Create event
      const { data: createdEvent, error: evErr } = await supabase
        .from("events")
        .insert({
          type: typeVal,
          title: title.trim(),
          location: locationText.trim(),
          start_time: startIso,
          end_time: endIso,
          leader_user_id: leaderUserId || null,
          created_by: currentUserId,
          challenge_id: challengeId,
          lat: lat,
          lng: lng,
          radius_meters: STANDARD_RADIUS_METERS,
        })
        .select("id")
        .single();

      if (evErr || !createdEvent?.id) throw new Error(evErr?.message || "Could not create event.");
      const eventId = createdEvent.id as string;

      // 2) Create invites (also invite leader)
      const recipientIds = resolveRecipientIds();
      if (recipientIds.length === 0) throw new Error("No attendees selected.");

      const inviteSet = new Set<string>(recipientIds);
      if (leaderUserId) inviteSet.add(leaderUserId);
      const inviteUserIds = Array.from(inviteSet);

      const invites = inviteUserIds.map((rid) => ({
        event_id: eventId,
        user_id: rid,
        status: "invited",
      }));

      const { error: invErr } = await supabase.from("event_invites").insert(invites);
      if (invErr) throw new Error(invErr.message || "Could not create invites.");

      // 3) Create messages
      const whenText = startLocal.toLocaleString(undefined, {
        weekday: "short",
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit",
      });

      const msgBody =
        `📅 New Event: ${title.trim()}\n` +
        `Type: ${typeOpt!.label}\n` +
        `When: ${whenText}\n` +
        `Where: ${locationText.trim()}\n\n` +
        `Open the Events tab to view details and check in.`;

      const nowIso = new Date().toISOString();

      const msgs = inviteUserIds.map((rid) => ({
        recipient_id: rid,
        title: "New Event Invite",
        body: msgBody,
        is_read: false,
        source_type: "event",
        source_id: eventId,
        created_at: nowIso,
        is_locked: false,
      }));

      const { error: msgErr } = await supabase.from("messages").insert(msgs);
      if (msgErr) {
        Alert.alert("Event created", "Invites created, but messages failed to send.");
      } else {
        Alert.alert("Created", "Event created and invites sent.");
      }

      setSubmitting(false);
      router.back();
    } catch (e: any) {
      setSubmitting(false);
      Alert.alert("Couldn’t create event", e?.message || "Please try again.");
    }
  };

  return (
    <View style={styles.container}>
      <AppHeader />

      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          <View style={styles.headerText}>
            <Text style={styles.icon}>🗓️</Text>
            <Text style={styles.title}>Create Event</Text>
            <Text style={styles.subtitle}>
              {checking ? "Checking access…" : "Create an event and send invites."}
            </Text>
          </View>

          <View style={{ marginTop: 8 }}>
            <Dropdown
              label="Event Type"
              valueLabel={typeOpt?.label ?? null}
              placeholder="Select type"
              options={eventTypes}
              onSelect={(opt) => setTypeOpt(opt)}
              cardColor={Colors.cards.journal}
            />

            <TextInput
              style={styles.input}
              placeholder="Title"
              placeholderTextColor={Colors.textSecondary}
              value={title}
              onChangeText={setTitle}
            />

            <TextInput
              style={styles.input}
              placeholder="Location (full address)"
              placeholderTextColor={Colors.textSecondary}
              value={locationText}
              onChangeText={setLocationText}
            />

            {!!locationText.trim() && (
              <Text style={styles.helperHint}>
                {geoLat != null && geoLng != null
                  ? "Address verified ✅"
                  : "Address will be verified when you create the event."}
              </Text>
            )}

            <View style={styles.inlineRow}>
              <View style={{ flex: 1 }}>
                <Dropdown
                  label="Date"
                  valueLabel={selectedDate?.label ?? null}
                  placeholder="Select date"
                  options={dates}
                  onSelect={(opt) => setSelectedDate(opt)}
                  cardColor={Colors.cards.journal}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Dropdown
                  label="Time"
                  valueLabel={selectedTime?.label ?? null}
                  placeholder="Select time"
                  options={times}
                  onSelect={(opt) => setSelectedTime(opt)}
                  cardColor={Colors.cards.journal}
                />
              </View>
            </View>

            <Text style={styles.fieldLabel}>Duration (minutes)</Text>
            <TextInput
              style={styles.input}
              placeholder="60"
              placeholderTextColor={Colors.textSecondary}
              value={durationMinutes}
              onChangeText={setDurationMinutes}
              keyboardType="number-pad"
            />
            {!durationOk && <Text style={styles.helperBad}>Enter 15–720 minutes.</Text>}

            <Text style={styles.fieldLabel}>Leader (optional)</Text>
            <TouchableOpacity
              style={[styles.dropdownButton, { backgroundColor: Colors.cards.goals }]}
              onPress={() => setPickLeaderOpen(true)}
              activeOpacity={0.85}
              disabled={loadingPeople}
            >
              <Text style={[styles.dropdownText, !leaderName && styles.dropdownPlaceholder]}>
                {leaderName || (loadingPeople ? "Loading…" : "Select leader")}
              </Text>
              <Text style={styles.dropdownChevron}>▾</Text>
            </TouchableOpacity>

            <Text style={[styles.fieldLabel, { marginTop: 14 }]}>Invite Audience</Text>

            <View style={styles.radioRow}>
              {(
                [
                  { key: "single", label: "Single" },
                  { key: "multiple", label: "Multiple" },
                  { key: "department", label: "Department" },
                  { key: "all", label: "All" },
                ] as const
              ).map((x) => (
                <TouchableOpacity
                  key={x.key}
                  style={[styles.radioPill, targetMode === x.key && styles.radioPillActive]}
                  onPress={() => setTargetMode(x.key)}
                  activeOpacity={0.85}
                >
                  <Text style={[styles.radioText, targetMode === x.key && styles.radioTextActive]}>
                    {x.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {targetMode === "single" && (
              <>
                <Text style={styles.fieldLabel}>Select attendee</Text>
                <TouchableOpacity
                  style={[styles.dropdownButton, { backgroundColor: Colors.cards.journal }]}
                  onPress={() => setPickSingleOpen(true)}
                  activeOpacity={0.85}
                  disabled={loadingPeople}
                >
                  <Text style={[styles.dropdownText, !singleName && styles.dropdownPlaceholder]}>
                    {singleName || (loadingPeople ? "Loading…" : "Pick attendee")}
                  </Text>
                  <Text style={styles.dropdownChevron}>▾</Text>
                </TouchableOpacity>
              </>
            )}

            {targetMode === "multiple" && (
              <>
                <Text style={styles.fieldLabel}>Select attendees</Text>
                <TouchableOpacity
                  style={[styles.dropdownButton, { backgroundColor: Colors.cards.journal }]}
                  onPress={() => setPickMultiOpen(true)}
                  activeOpacity={0.85}
                  disabled={loadingPeople}
                >
                  <Text style={[styles.dropdownText, !multiLabel && styles.dropdownPlaceholder]}>
                    {multiLabel || (loadingPeople ? "Loading…" : "Pick attendees")}
                  </Text>
                  <Text style={styles.dropdownChevron}>▾</Text>
                </TouchableOpacity>
              </>
            )}

            {targetMode === "department" && (
              <Dropdown
                label="Department"
                valueLabel={departmentOpt?.label ?? null}
                placeholder="Select department"
                options={departments}
                onSelect={(opt) => setDepartmentOpt(opt)}
                cardColor={Colors.cards.journal}
              />
            )}
          </View>

          <TouchableOpacity
            style={[
              styles.submitButton,
              canSubmit && styles.submitReady,
              (!canSubmit || submitting) && styles.submitDisabled,
            ]}
            disabled={!canSubmit}
            onPress={submit}
            activeOpacity={0.9}
          >
            <Text style={styles.submitText}>{submitting ? "Creating…" : "Create Event"}</Text>
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

      <Modal visible={pickSingleOpen} transparent animationType="fade" onRequestClose={() => setPickSingleOpen(false)}>
        <PeoplePicker
          title="Pick an attendee"
          people={profiles}
          selectedIds={singleUserId ? [singleUserId] : []}
          multi={false}
          onPickSingle={(id) => {
            setSingleUserId(id);
            setPickSingleOpen(false);
          }}
          onToggleMulti={() => {}}
          onClose={() => setPickSingleOpen(false)}
        />
      </Modal>

      <Modal visible={pickMultiOpen} transparent animationType="fade" onRequestClose={() => setPickMultiOpen(false)}>
        <PeoplePicker
          title="Pick attendees"
          people={profiles}
          selectedIds={multiUserIds}
          multi={true}
          onPickSingle={() => {}}
          onToggleMulti={(id) => {
            setMultiUserIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
          }}
          onClose={() => setPickMultiOpen(false)}
        />
      </Modal>

      <Modal visible={pickLeaderOpen} transparent animationType="fade" onRequestClose={() => setPickLeaderOpen(false)}>
        <PeoplePicker
          title="Pick a leader"
          people={profiles}
          selectedIds={leaderUserId ? [leaderUserId] : []}
          multi={false}
          onPickSingle={(id) => {
            setLeaderUserId(id);
            setPickLeaderOpen(false);
          }}
          onToggleMulti={() => {}}
          onClose={() => setPickLeaderOpen(false)}
        />
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

  scrollContent: {
    paddingBottom: 40,
  },

  headerText: {
    alignItems: "center",
    marginBottom: 14,
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

  fieldLabel: {
    color: Colors.textSecondary,
    marginBottom: 8,
    marginTop: 10,
    fontWeight: "700",
  },

  input: {
    backgroundColor: Colors.cards.journal,
    color: Colors.textPrimary,
    padding: 12,
    borderRadius: Radius.card,
    marginBottom: 10,
  },

  helperBad: {
    marginTop: -6,
    marginBottom: 8,
    color: "rgba(255,120,120,0.95)",
    fontWeight: "700",
    fontSize: 12,
    textAlign: "center",
  },

  helperHint: {
    marginTop: -6,
    marginBottom: 8,
    color: "rgba(255,255,255,0.65)",
    fontWeight: "800",
    fontSize: 12,
    textAlign: "center",
  },

  inlineRow: {
    flexDirection: "row",
    gap: 12,
    alignItems: "flex-start",
  },

  dropdownButton: {
    borderRadius: Radius.card,
    paddingVertical: 14,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },

  dropdownText: {
    color: Colors.textPrimary,
    fontWeight: "800",
    flex: 1,
  },

  dropdownPlaceholder: {
    color: Colors.textSecondary,
    fontWeight: "700",
  },

  dropdownChevron: {
    color: Colors.textPrimary,
    marginLeft: 10,
    fontSize: 16,
    opacity: 0.8,
  },

  radioRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 8,
    flexWrap: "wrap",
  },

  radioPill: {
    minWidth: "23%",
    flexGrow: 1,
    backgroundColor: "rgba(255,255,255,0.08)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    borderRadius: Radius.card,
    paddingVertical: 10,
    paddingHorizontal: 10,
    alignItems: "center",
  },

  radioPillActive: {
    backgroundColor: Colors.cards.goals,
    borderColor: "rgba(255,255,255,0.20)",
  },

  radioText: {
    color: Colors.textSecondary,
    fontWeight: "900",
    fontSize: 12,
  },

  radioTextActive: {
    color: Colors.textPrimary,
  },

  submitButton: {
    backgroundColor: Colors.cards.complete,
    paddingVertical: 14,
    borderRadius: Radius.card,
    alignItems: "center",
    opacity: 0.55,
    transform: [{ scale: 0.99 }],
    marginTop: 6,
  },

  submitReady: {
    opacity: 1,
    transform: [{ scale: 1 }],
  },

  submitDisabled: {
    opacity: 0.35,
  },

  submitText: {
    color: Colors.textPrimary,
    fontWeight: "900",
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
    fontWeight: "900",
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
    fontWeight: "900",
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
    fontWeight: "800",
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
    fontWeight: "900",
  },

  personRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "rgba(255,255,255,0.08)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    borderRadius: Radius.card,
    paddingVertical: 12,
    paddingHorizontal: 12,
    marginBottom: 10,
  },

  personRowActive: {
    borderColor: "rgba(255,255,255,0.28)",
  },

  personName: {
    color: Colors.textPrimary,
    fontWeight: "900",
  },

  personDept: {
    color: Colors.textSecondary,
    marginTop: 2,
    fontWeight: "700",
    fontSize: 12,
  },

  personCheck: {
    fontSize: 18,
    marginLeft: 8,
  },
});
