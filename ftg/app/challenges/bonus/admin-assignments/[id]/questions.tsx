// app/challenges/bonus/admin-assignments/[id]/questions.tsx
// FULL FILE REPLACEMENT
// Fixes:
// - Uses standardized question_type: 'rating' | 'text'
// - Uses standardized answer_type: 'rating' | 'text'
// - READ-ONLY mode when already submitted/approved (no re-submits, no re-points)

import { LinearGradient } from "expo-linear-gradient";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { AppHeader } from "../../../../../components/AppHeader";
import {
  Colors,
  Components,
  Layout,
  Radius,
  Spacing,
  Typography,
} from "../../../../../constants/theme";
import { supabase } from "../../../../../lib/supabase";

const ADMIN_ASSIGNMENT_CHALLENGE_ID = "57de6344-ff1c-4ad1-9d88-e22fdbdf5f6e";

type Assignment = {
  id: string;
  title: string;
  description: string | null;
  points: number;
};

type Question = {
  id: string;
  admin_assignment_id: string;
  question_order: number;
  question_text: string;
  question_type: "rating" | "text";
};

type Option = {
  id: string;
  question_id: string;
  option_label: string;
  option_value: number;
  option_order: number;
};

type Submission = {
  id: string;
  admin_assignment_id: string;
  user_id: string;
  status: string | null;
  started_at: string | null;
  submitted_at: string | null;
  current_question_order: number | null;
};

type AnswerRow = {
  id?: string;
  admin_assignment_id: string;
  question_id: string;
  user_id: string;
  answer_type: "rating" | "text";
  answer_text: string | null;
  answer_value: any | null;
};

function extractUuid(input: any) {
  const raw = Array.isArray(input) ? String(input[0] ?? "") : String(input ?? "");
  const m = raw.match(
    /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i
  );
  return m ? m[0] : "";
}

export default function AdminAssignmentQuestionsScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const adminAssignmentId = extractUuid((params as any)?.id);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [userId, setUserId] = useState<string | null>(null);
  const [assignment, setAssignment] = useState<Assignment | null>(null);
  const [submission, setSubmission] = useState<Submission | null>(null);

  const [questions, setQuestions] = useState<Question[]>([]);
  const [optionsByQuestionId, setOptionsByQuestionId] = useState<Record<string, Option[]>>(
    {}
  );

  const [ratingAnswers, setRatingAnswers] = useState<Record<string, number>>({});
  const [textAnswers, setTextAnswers] = useState<Record<string, string>>({});

  const orderedQuestions = useMemo(() => {
    return [...questions].sort((a, b) => a.question_order - b.question_order);
  }, [questions]);

  const [qIndex, setQIndex] = useState(0);
  const currentQuestion = orderedQuestions[qIndex] || null;

  const isCompleted = !!submission?.submitted_at || submission?.status === "approved";

  useEffect(() => {
    if (!adminAssignmentId) {
      setLoading(false);
      return;
    }
    (async () => {
      await loadEverything();
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [adminAssignmentId]);

  const safeCreateSubmissionIfMissing = async (uid: string, firstOrder: number) => {
    const { data: subRow } = await supabase
      .from("admin_assignment_submissions")
      .select(
        "id, admin_assignment_id, user_id, status, started_at, submitted_at, current_question_order"
      )
      .eq("admin_assignment_id", adminAssignmentId)
      .eq("user_id", uid)
      .maybeSingle();

    if (subRow) return subRow as Submission;

    const { data: newSub } = await supabase
      .from("admin_assignment_submissions")
      .insert({
        admin_assignment_id: adminAssignmentId,
        user_id: uid,
        started_at: new Date().toISOString(),
        current_question_order: firstOrder,
      })
      .select(
        "id, admin_assignment_id, user_id, status, started_at, submitted_at, current_question_order"
      )
      .maybeSingle();

    return (newSub as any) ?? null;
  };

  const loadEverything = async () => {
    setLoading(true);

    const {
      data: { user },
      error: userErr,
    } = await supabase.auth.getUser();

    if (userErr) {
      Alert.alert("Auth error", userErr.message);
      setLoading(false);
      return;
    }

    if (!user) {
      setLoading(false);
      Alert.alert("Not logged in", "Please log in again.");
      router.replace("/" as any);
      return;
    }

    setUserId(user.id);

    const { data: aRow, error: aErr } = await supabase
      .from("admin_assignments")
      .select("id, title, description, points")
      .eq("id", adminAssignmentId)
      .maybeSingle();

    if (aErr) Alert.alert("Couldn't load assignment", aErr.message);
    setAssignment((aRow as any) ?? null);

    const { data: qRows, error: qErr } = await supabase
      .from("admin_assignment_questions")
      .select("id, admin_assignment_id, question_order, question_text, question_type")
      .eq("admin_assignment_id", adminAssignmentId)
      .order("question_order", { ascending: true });

    if (qErr) Alert.alert("Couldn't load questions", qErr.message);

    const qs = (qRows ?? []) as Question[];
    setQuestions(qs);

    const qIds = qs.map((q) => q.id);
    const optionsMap: Record<string, Option[]> = {};

    if (qIds.length > 0) {
      const { data: oRows, error: oErr } = await supabase
        .from("admin_assignment_question_options")
        .select("id, question_id, option_label, option_value, option_order")
        .in("question_id", qIds)
        .order("option_order", { ascending: true });

      if (oErr) Alert.alert("Couldn't load options", oErr.message);

      for (const opt of (oRows ?? []) as Option[]) {
        if (!optionsMap[opt.question_id]) optionsMap[opt.question_id] = [];
        optionsMap[opt.question_id].push(opt);
      }
    }

    setOptionsByQuestionId(optionsMap);

    const firstOrder = qs[0]?.question_order ?? 1;
    const sub = await safeCreateSubmissionIfMissing(user.id, firstOrder);
    setSubmission(sub);

    const { data: ansRows } = await supabase
      .from("admin_assignment_answers")
      .select("admin_assignment_id, question_id, user_id, answer_type, answer_text, answer_value")
      .eq("admin_assignment_id", adminAssignmentId)
      .eq("user_id", user.id);

    const ratings: Record<string, number> = {};
    const texts: Record<string, string> = {};

    for (const r of (ansRows ?? []) as any as AnswerRow[]) {
      if (r.answer_type === "rating") {
        const arr = Array.isArray(r.answer_value) ? r.answer_value : [];
        const v = arr.length ? Number(arr[0]) : NaN;
        if (!Number.isNaN(v)) ratings[r.question_id] = v;
      }
      if (r.answer_type === "text") {
        texts[r.question_id] = (r.answer_text ?? "") as string;
      }
    }

    setRatingAnswers(ratings);
    setTextAnswers(texts);

    const desiredOrder = sub?.current_question_order ?? firstOrder;
    const idx = qs.findIndex((q) => q.question_order === desiredOrder);
    setQIndex(idx >= 0 ? idx : 0);

    setLoading(false);
  };

  const saveCurrentAnswer = async () => {
    if (!userId || !currentQuestion) return true;
    if (isCompleted) return true; // read-only

    const q = currentQuestion;

    let answer_type: "rating" | "text";
    let answer_text: string | null = null;
    let answer_value: number[] | null = null;

    if (q.question_type === "rating") {
      const v = ratingAnswers[q.id];
      if (typeof v !== "number") {
        Alert.alert("Rate 1–5", "Please choose a rating to continue.");
        return false;
      }
      answer_type = "rating";
      answer_value = [v];
      answer_text = null;
    } else {
      const t = (textAnswers[q.id] ?? "").trim();
      if (!t) {
        Alert.alert("Required", "Please enter a short response to continue.");
        return false;
      }
      answer_type = "text";
      answer_text = t;
      answer_value = null;
    }

    const { data: existing, error: selErr } = await supabase
      .from("admin_assignment_answers")
      .select("id")
      .eq("admin_assignment_id", adminAssignmentId)
      .eq("question_id", q.id)
      .eq("user_id", userId)
      .maybeSingle();

    if (selErr) {
      Alert.alert("Couldn't save", selErr.message);
      return false;
    }

    if (existing?.id) {
      const { error: updErr } = await supabase
        .from("admin_assignment_answers")
        .update({
          answer_type,
          answer_text,
          answer_value,
        } as any)
        .eq("id", existing.id);

      if (updErr) {
        Alert.alert("Couldn't save", updErr.message);
        return false;
      }

      return true;
    }

    const { error: insErr } = await supabase.from("admin_assignment_answers").insert({
      admin_assignment_id: adminAssignmentId,
      question_id: q.id,
      user_id: userId,
      answer_type,
      answer_text,
      answer_value,
      created_at: new Date().toISOString(),
    } as any);

    if (insErr) {
      Alert.alert("Couldn't save", insErr.message);
      return false;
    }

    return true;
  };

  const setSubmissionOrder = async (order: number) => {
    if (!submission?.id) return;
    if (isCompleted) return;
    await supabase
      .from("admin_assignment_submissions")
      .update({ current_question_order: order })
      .eq("id", submission.id);
  };

  const finishAssignment = async () => {
    if (!userId || !assignment) return false;
    if (isCompleted) return true;

    if (submission?.id) {
      const { error: subErr } = await supabase
        .from("admin_assignment_submissions")
        .update({
          status: "submitted",
          submitted_at: new Date().toISOString(),
          current_question_order:
            orderedQuestions[orderedQuestions.length - 1]?.question_order ?? 1,
        })
        .eq("id", submission.id);

      if (subErr) {
        Alert.alert("Couldn't submit", subErr.message);
        return false;
      }
    }

    // idempotent by DB unique index (user_id + admin_assignment_id in metadata)
    const { data: existing } = await supabase
      .from("challenge_activity")
      .select("id")
      .eq("user_id", userId)
      .eq("challenge_id", ADMIN_ASSIGNMENT_CHALLENGE_ID)
      .contains("metadata", { admin_assignment_id: adminAssignmentId })
      .limit(1);

    if ((existing ?? []).length === 0) {
      const { error: caErr } = await supabase.from("challenge_activity").insert({
        user_id: userId,
        challenge_id: ADMIN_ASSIGNMENT_CHALLENGE_ID,
        status: "approved",
        occurred_at: new Date().toISOString(),
        activity_type: "admin_assignment",
        metadata: {
          admin_assignment_id: adminAssignmentId,
          submission_id: submission?.id ?? null,
          title: assignment.title,
        },
      });

      if (caErr) {
        Alert.alert("Submitted, but no points", caErr.message);
        return true;
      }
    }

    return true;
  };

  const goNext = async () => {
    if (!currentQuestion || saving) return;

    // If already completed, just bounce back to list
    if (isCompleted) {
      router.replace("/challenges/bonus/admin-assignments" as any);
      return;
    }

    setSaving(true);

    const ok = await saveCurrentAnswer();
    if (!ok) {
      setSaving(false);
      return;
    }

    const nextIndex = qIndex + 1;
    if (nextIndex < orderedQuestions.length) {
      const nextOrder = orderedQuestions[nextIndex].question_order;
      await setSubmissionOrder(nextOrder);
      setQIndex(nextIndex);
      setSaving(false);
      return;
    }

    const finished = await finishAssignment();
    setSaving(false);

    if (finished) {
      Alert.alert("Submitted ✅", "Your Admin Assignment has been submitted.", [
        {
          text: "OK",
          onPress: () => router.replace("/challenges/bonus/admin-assignments" as any),
        },
      ]);
    }
  };

  const goBack = async () => {
    if (!currentQuestion || qIndex === 0 || saving) return;
    setSaving(true);

    if (!isCompleted) {
      await saveCurrentAnswer().catch(() => {});
      const prevIndex = qIndex - 1;
      const prevOrder = orderedQuestions[prevIndex].question_order;
      await setSubmissionOrder(prevOrder);
      setQIndex(prevIndex);
      setSaving(false);
      return;
    }

    // completed: just navigate without saving
    setQIndex(qIndex - 1);
    setSaving(false);
  };

  const renderAnswerUI = () => {
    if (!currentQuestion) return null;

    const q = currentQuestion;

    if (q.question_type === "rating") {
      const opts = optionsByQuestionId[q.id] ?? [];
      const selected = ratingAnswers[q.id];

      return (
        <View style={{ gap: 10 }}>
          {opts.map((o) => {
            const isOn = selected === o.option_value;
            return (
              <TouchableOpacity
                key={o.id}
                style={[styles.optionRow, isOn && styles.optionRowOn, isCompleted && { opacity: 0.7 }]}
                onPress={() => {
                  if (isCompleted) return;
                  setRatingAnswers((prev) => ({ ...prev, [q.id]: o.option_value }));
                }}
                disabled={isCompleted}
                activeOpacity={0.9}
              >
                <Text style={styles.optionLabel}>{o.option_label}</Text>
                <Text style={[styles.pill, isOn && styles.pillOn]}>{isOn ? "Selected" : "Tap"}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      );
    }

    return (
      <View>
        <TextInput
          value={textAnswers[q.id] ?? ""}
          onChangeText={(t) => {
            if (isCompleted) return;
            setTextAnswers((prev) => ({ ...prev, [q.id]: t }));
          }}
          placeholder="Type your response..."
          placeholderTextColor={Colors.textSecondary}
          style={[styles.textInput, isCompleted && { opacity: 0.7 }]}
          multiline
          editable={!isCompleted}
        />
      </View>
    );
  };

  if (loading) {
    return (
      <View style={[styles.container, { justifyContent: "center" }]}>
        <Text style={{ color: Colors.textSecondary, textAlign: "center" }}>Loading…</Text>
      </View>
    );
  }

  if (!adminAssignmentId || !assignment || !orderedQuestions.length || !currentQuestion) {
    return (
      <View style={[styles.container, { justifyContent: "center" }]}>
        <Text style={{ color: Colors.textSecondary, textAlign: "center" }}>
          Assignment not available.
        </Text>
        <View style={{ marginTop: 16, alignItems: "center" }}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Text style={styles.backText}>⬅️ Back</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const isLast = qIndex === orderedQuestions.length - 1;

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <AppHeader />

        <View style={styles.headerText}>
          <Text style={styles.icon}>📋</Text>
          <Text style={styles.title}>{assignment.title}</Text>
          <Text style={styles.subtitle}>
            <Text style={styles.subtitleBold}>+{assignment.points} Points{"\n"}</Text>
            {isCompleted ? "Completed ✅ (read-only)" : "Complete all questions to submit."}
          </Text>
        </View>

        <View style={styles.progressRow}>
          <Text style={styles.progressText}>
            Question {qIndex + 1} of {orderedQuestions.length}
          </Text>

          <LinearGradient
            colors={["rgba(255,255,255,0.20)", "rgba(255,255,255,0.06)"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.progressPill}
          >
            <Text style={styles.progressPillText}>
              {currentQuestion.question_type === "rating" ? "Rate 1–5" : "Short response"}
            </Text>
          </LinearGradient>
        </View>

        <View style={styles.card}>
          <Text style={styles.questionText}>{currentQuestion.question_text}</Text>
          <View style={{ height: 14 }} />
          {renderAnswerUI()}
        </View>

        <View style={{ height: 18 }} />

        <View style={styles.actionRow}>
          <TouchableOpacity
            style={[styles.actionBtn, qIndex === 0 && { opacity: 0.45 }]}
            onPress={goBack}
            disabled={qIndex === 0 || saving}
            activeOpacity={0.9}
          >
            <Text style={styles.actionBtnText}>⬅️ Back</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionBtnPrimary, saving && { opacity: 0.7 }]}
            onPress={goNext}
            disabled={saving}
            activeOpacity={0.9}
          >
            <Text style={styles.actionBtnText}>
              {isCompleted ? "Done ✅" : isLast ? "Submit ✅" : "Next ➡️"}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      <View style={styles.bottomBar}>
        <View style={styles.bottomButtonRow}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Text style={styles.backText}>⬅️ Back</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.backButton} onPress={() => router.push("/main" as any)}>
            <Text style={styles.backText}>🏠 Home</Text>
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
    paddingTop: Layout.topScreenPadding,
    paddingHorizontal: Math.round(Spacing.screenPadding * 1.15),
  },
  scrollContent: {
    paddingBottom: 160,
  },

  headerText: {
    alignItems: "center",
    marginBottom: 14,
  },
  icon: {
    fontSize: 36,
    marginBottom: 6,
  },
  title: {
    fontSize: Typography.greeting.fontSize,
    fontWeight: Typography.greeting.fontWeight as any,
    color: Colors.textPrimary,
    textAlign: "center",
  },
  subtitle: {
    fontSize: Typography.quote.fontSize,
    color: Colors.textSecondary,
    marginTop: 4,
    textAlign: "center",
  },
  subtitleBold: {
    fontWeight: "800",
    color: Colors.textPrimary,
    textAlign: "center",
  },

  progressRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  progressText: {
    color: Colors.textSecondary,
    fontSize: 13,
    fontWeight: "700",
  },
  progressPill: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.14)",
  },
  progressPillText: {
    color: Colors.textPrimary,
    fontSize: 12,
    fontWeight: "800",
  },

  card: {
    backgroundColor: "rgba(255,255,255,0.08)",
    borderRadius: Radius.card,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    padding: 14,
    overflow: "hidden",
  },
  questionText: {
    color: Colors.textPrimary,
    fontSize: 16,
    fontWeight: "800",
    lineHeight: 22,
  },

  optionRow: {
    backgroundColor: "rgba(0,0,0,0.18)",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    paddingVertical: 12,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  optionRowOn: {
    borderColor: "rgba(255,255,255,0.28)",
    backgroundColor: "rgba(255,255,255,0.10)",
  },
  optionLabel: {
    flex: 1,
    color: Colors.textPrimary,
    fontSize: 14,
    fontWeight: "700",
  },
  pill: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.10)",
    color: Colors.textSecondary,
    fontWeight: "800",
    fontSize: 12,
  },
  pillOn: {
    color: Colors.textPrimary,
    backgroundColor: "rgba(255,255,255,0.18)",
  },

  textInput: {
    minHeight: 110,
    borderRadius: 14,
    padding: 12,
    backgroundColor: "rgba(0,0,0,0.18)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    color: Colors.textPrimary,
    textAlignVertical: "top",
  },

  actionRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
  },
  actionBtn: {
    flex: 1,
    backgroundColor: "rgba(255,255,255,0.10)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.16)",
    paddingVertical: 12,
    borderRadius: 14,
    alignItems: "center",
  },
  actionBtnPrimary: {
    flex: 1,
    backgroundColor: Colors.cards.admin,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.18)",
    paddingVertical: 12,
    borderRadius: 14,
    alignItems: "center",
  },
  actionBtnText: {
    color: Colors.textPrimary,
    fontSize: 15,
    fontWeight: "800",
  },

  bottomBar: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    paddingBottom: 18,
    paddingTop: 10,
    paddingHorizontal: Math.round(Spacing.screenPadding * 1.15),
  },
  bottomButtonRow: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 12,
  },
  backButton: {
    ...Components.backButton,
    flexDirection: "row",
    alignItems: "center",
    minWidth: 130,
    justifyContent: "center",
  },
  backText: {
    color: Colors.textPrimary,
    fontSize: 15,
    fontWeight: "800",
  },
});
