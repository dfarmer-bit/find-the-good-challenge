// app/challenges/bonus/quizzes/[id].tsx
// FULL FILE REPLACEMENT — theme-aligned quiz UI + submit + points award (>=70%)

import { useEffect, useMemo, useState } from "react";
import { useLocalSearchParams, useRouter } from "expo-router";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { AppHeader } from "../../../../components/AppHeader";
import {
  Colors,
  Components,
  Layout,
  Radius,
  Spacing,
  Typography,
} from "../../../../constants/theme";
import { supabase } from "../../../../lib/supabase";

const QUIZ_BONUS_CHALLENGE_ID = "d4660236-2fb5-454f-af82-42648e21b6e3";
const PASSING_SCORE_PERCENT = 70;

type QuizRow = {
  id: string;
  title: string;
  description: string | null;
  points: number;
  status: string;
  publish_start: string | null;
  publish_end: string | null;
};

type QuestionRow = {
  id: string;
  quiz_id: string;
  sort_order: number;
  prompt: string;
  hint: string | null;
  explanation: string | null;
  correct_option_index: number; // 1..4
};

type OptionRow = {
  id: string;
  question_id: string;
  option_index: number; // 1..4
  option_text: string;
};

const QUESTION_COLORS = [
  Colors.cards.journal,
  Colors.cards.goals,
  Colors.cards.messages,
  Colors.cards.admin,
];

export default function TakeQuizScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const quizId = (id as string) || "";

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [quiz, setQuiz] = useState<QuizRow | null>(null);
  const [questions, setQuestions] = useState<QuestionRow[]>([]);
  const [options, setOptions] = useState<Record<string, OptionRow[]>>({});
  const [selected, setSelected] = useState<Record<string, number | null>>({});

  const [alreadySubmittedId, setAlreadySubmittedId] = useState<string | null>(
    null
  );

  const allAnswered = useMemo(() => {
    if (questions.length === 0) return false;
    return questions.every((q) => selected[q.id] != null);
  }, [questions, selected]);

  const scorePercent = useMemo(() => {
    if (questions.length === 0) return null;
    let correct = 0;
    for (const q of questions) {
      const chosen = selected[q.id];
      if (chosen != null && chosen === q.correct_option_index) correct += 1;
    }
    return Math.round((correct / questions.length) * 100);
  }, [questions, selected]);

  const isWithinWindow = useMemo(() => {
    if (!quiz?.publish_start || !quiz?.publish_end) return true;
    const now = Date.now();
    const start = new Date(quiz.publish_start).getTime();
    const end = new Date(quiz.publish_end).getTime();
    return now >= start && now < end;
  }, [quiz]);

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [quizId]);

  async function load() {
    try {
      setLoading(true);

      const {
        data: { user },
        error: userErr,
      } = await supabase.auth.getUser();
      if (userErr) throw userErr;

      if (!user) {
        setQuiz(null);
        setQuestions([]);
        setOptions({});
        setSelected({});
        setAlreadySubmittedId(null);
        return;
      }

      const { data: quizData, error: quizErr } = await supabase
        .from("quizzes")
        .select("id,title,description,points,status,publish_start,publish_end")
        .eq("id", quizId)
        .single();

      if (quizErr) throw quizErr;
      setQuiz(quizData as QuizRow);

      const { data: qData, error: qErr } = await supabase
        .from("quiz_questions")
        .select(
          "id,quiz_id,sort_order,prompt,hint,explanation,correct_option_index"
        )
        .eq("quiz_id", quizId)
        .order("sort_order");

      if (qErr) throw qErr;

      const qList = (qData ?? []) as QuestionRow[];
      setQuestions(qList);

      const questionIds = qList.map((x) => x.id);
      if (questionIds.length > 0) {
        const { data: oData, error: oErr } = await supabase
          .from("quiz_options")
          .select("id,question_id,option_index,option_text")
          .in("question_id", questionIds)
          .order("option_index");

        if (oErr) throw oErr;

        const grouped: Record<string, OptionRow[]> = {};
        (oData ?? []).forEach((opt: any) => {
          if (!grouped[opt.question_id]) grouped[opt.question_id] = [];
          grouped[opt.question_id].push(opt as OptionRow);
        });
        setOptions(grouped);
      } else {
        setOptions({});
      }

      const init: Record<string, number | null> = {};
      qList.forEach((x) => (init[x.id] = null));
      setSelected(init);

      const { data: subData, error: subErr } = await supabase
        .from("quiz_submissions")
        .select("id")
        .eq("quiz_id", quizId)
        .eq("user_id", user.id)
        .maybeSingle();

      if (subErr) throw subErr;
      setAlreadySubmittedId(subData?.id ?? null);
    } catch (e: any) {
      Alert.alert("Error", e?.message ?? "Could not load quiz.");
    } finally {
      setLoading(false);
    }
  }

  function choose(qid: string, index: number) {
    if (alreadySubmittedId) return;
    setSelected((p) => ({ ...p, [qid]: index }));
  }

  async function submitQuiz() {
    try {
      if (!quizId) return;

      const {
        data: { user },
        error: userErr,
      } = await supabase.auth.getUser();
      if (userErr) throw userErr;

      if (!user) {
        Alert.alert("Not signed in", "Please sign in again.");
        return;
      }

      if (!isWithinWindow) {
        Alert.alert("Unavailable", "This quiz is outside the weekly window.");
        return;
      }

      if (alreadySubmittedId) {
        Alert.alert("Completed", "You already submitted this quiz.");
        return;
      }

      if (!allAnswered || scorePercent == null) {
        Alert.alert("Incomplete", "Answer all questions before submitting.");
        return;
      }

      setSubmitting(true);

      // 1) Insert submission (unique quiz_id + user_id)
      const { data: subIns, error: subErr } = await supabase
        .from("quiz_submissions")
        .insert({
          quiz_id: quizId,
          user_id: user.id,
          score_percent: scorePercent,
          status: "submitted",
        })
        .select("id")
        .single();

      if (subErr) throw subErr;

      const submissionId = subIns.id as string;

      // 2) Insert answers
      const payload = questions.map((q) => ({
        submission_id: submissionId,
        question_id: q.id,
        selected_option_index: selected[q.id],
        is_correct: selected[q.id] === q.correct_option_index,
      }));

      const { error: ansErr } = await supabase
        .from("quiz_submission_answers")
        .insert(payload);

      if (ansErr) throw ansErr;

      // 3) Award points only if passing (>=70%)
      let pointsAwarded = false;

      if (scorePercent >= PASSING_SCORE_PERCENT) {
        const { error: actErr } = await supabase.from("challenge_activity").insert({
          user_id: user.id,
          challenge_id: QUIZ_BONUS_CHALLENGE_ID,
          status: "approved",
          occurred_at: new Date().toISOString(),
          activity_type: "bonus_quiz",
          metadata: {
            quiz_id: quizId,
            quiz_submission_id: submissionId,
            score_percent: scorePercent,
            passing_score_percent: PASSING_SCORE_PERCENT,
          },
        });

        if (actErr) {
          // Submission saved, answers saved, but points insert failed
          Alert.alert(
            "Submitted (points not awarded yet)",
            `Score: ${scorePercent}%\n\nYour quiz was submitted, but points could not be awarded.\n\n${actErr.message}`
          );
          setAlreadySubmittedId(submissionId);
          return;
        }

        pointsAwarded = true;
      }

      setAlreadySubmittedId(submissionId);

      Alert.alert(
        "Submitted",
        pointsAwarded
          ? `Score: ${scorePercent}%\n\n✅ Points awarded!`
          : `Score: ${scorePercent}%\n\nNo points (needs ${PASSING_SCORE_PERCENT}% or higher).`,
        [{ text: "OK", onPress: () => router.back() }]
      );
    } catch (e: any) {
      Alert.alert("Error", e?.message ?? "Could not submit quiz.");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <View style={styles.container}>
        <AppHeader />
        <View style={styles.center}>
          <ActivityIndicator />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <AppHeader />

      <View style={styles.headerText}>
        <Text style={styles.title}>{quiz?.title ?? "Quiz"}</Text>
        <Text style={styles.subtitle}>
          {alreadySubmittedId
            ? "Completed"
            : isWithinWindow
            ? "Open this week"
            : "Not currently available"}
        </Text>
      </View>

      {!isWithinWindow ? (
        <View style={styles.noticeCard}>
          <Text style={styles.noticeTitle}>Not available</Text>
          <Text style={styles.noticeText}>
            This quiz is outside the weekly window.
          </Text>
        </View>
      ) : null}

      <ScrollView contentContainerStyle={{ paddingBottom: 220 }}>
        {questions.map((q, i) => {
          const cardColor = QUESTION_COLORS[i % QUESTION_COLORS.length];
          const opts = options[q.id] ?? [];

          return (
            <View
              key={q.id}
              style={[styles.questionCard, { borderColor: cardColor }]}
            >
              <View style={[styles.questionHeader, { backgroundColor: cardColor }]}>
                <Text style={styles.questionNumber}>Question {i + 1}</Text>
                {alreadySubmittedId ? (
                  <Text style={styles.headerRight}>Locked</Text>
                ) : selected[q.id] != null ? (
                  <Text style={styles.headerRight}>Answered</Text>
                ) : (
                  <Text style={styles.headerRight}>Pick one</Text>
                )}
              </View>

              <Text style={styles.prompt}>{q.prompt}</Text>
              {q.hint && <Text style={styles.hint}>{q.hint}</Text>}

              {opts.map((o) => {
                const isSelected = selected[q.id] === o.option_index;

                return (
                  <TouchableOpacity
                    key={o.id}
                    onPress={() => choose(q.id, o.option_index)}
                    disabled={Boolean(alreadySubmittedId)}
                    style={[
                      styles.answerCard,
                      isSelected && styles.answerSelected,
                      Boolean(alreadySubmittedId) && styles.answerLocked,
                    ]}
                    activeOpacity={0.9}
                  >
                    <Text
                      style={[
                        styles.answerText,
                        isSelected && styles.answerTextSelected,
                      ]}
                    >
                      {o.option_text}
                    </Text>
                  </TouchableOpacity>
                );
              })}

              {alreadySubmittedId && q.explanation ? (
                <View style={styles.explainBox}>
                  <Text style={styles.explainTitle}>Explanation</Text>
                  <Text style={styles.explainText}>{q.explanation}</Text>
                </View>
              ) : null}
            </View>
          );
        })}
      </ScrollView>

      {/* Submit Bar */}
      <View style={styles.submitBar}>
        <TouchableOpacity
          style={[
            styles.submitButton,
            (!allAnswered ||
              submitting ||
              alreadySubmittedId ||
              !isWithinWindow) &&
              styles.submitDisabled,
          ]}
          onPress={submitQuiz}
          disabled={
            !allAnswered ||
            submitting ||
            Boolean(alreadySubmittedId) ||
            !isWithinWindow
          }
        >
          <Text style={styles.submitText}>
            {alreadySubmittedId
              ? "Completed"
              : submitting
              ? "Submitting..."
              : !allAnswered
              ? "Answer all questions"
              : "Submit Quiz"}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Bottom Nav */}
      <View style={styles.bottomBar}>
        <View style={styles.bottomButtonRow}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Text style={styles.backText}>⬅ Back</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.push("/main" as any)}
          >
            <Text style={styles.backText}>🏠 Home</Text>
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
    marginBottom: 14,
  },

  title: {
    fontSize: Typography.greeting.fontSize,
    fontWeight: Typography.greeting.fontWeight,
    color: Colors.textPrimary,
    textAlign: "center",
  },

  subtitle: {
    marginTop: 4,
    fontSize: Typography.quote.fontSize,
    color: Colors.textSecondary,
    textAlign: "center",
  },

  center: {
    flex: 1,
    justifyContent: "center",
  },

  noticeCard: {
    backgroundColor: "rgba(255,255,255,0.10)",
    borderRadius: Radius.card,
    padding: 14,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    marginBottom: 12,
  },

  noticeTitle: {
    color: Colors.textPrimary,
    fontWeight: "800",
    marginBottom: 6,
  },

  noticeText: {
    color: Colors.textSecondary,
    lineHeight: 20,
  },

  questionCard: {
    borderWidth: 2,
    borderRadius: Radius.card,
    marginBottom: Spacing.sectionGap,
    backgroundColor: "rgba(255,255,255,0.06)",
    overflow: "hidden",
  },

  questionHeader: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  questionNumber: {
    color: Colors.background,
    fontWeight: "900",
  },

  headerRight: {
    color: Colors.background,
    fontWeight: "900",
    opacity: 0.9,
  },

  prompt: {
    padding: 14,
    fontSize: 16,
    fontWeight: "700",
    color: Colors.textPrimary,
  },

  hint: {
    paddingHorizontal: 14,
    paddingBottom: 10,
    fontSize: 13,
    color: Colors.textSecondary,
  },

  answerCard: {
    marginHorizontal: 14,
    marginBottom: 10,
    padding: 14,
    borderRadius: Radius.card,
    backgroundColor: "rgba(255,255,255,0.10)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.14)",
  },

  answerSelected: {
    backgroundColor: Colors.accentPrimary,
    borderColor: "rgba(255,255,255,0.22)",
  },

  answerLocked: {
    opacity: 0.92,
  },

  answerText: {
    color: Colors.textPrimary,
    fontWeight: "700",
  },

  answerTextSelected: {
    fontWeight: "900",
  },

  explainBox: {
    marginHorizontal: 14,
    marginTop: 6,
    marginBottom: 14,
    padding: 12,
    borderRadius: Radius.card,
    backgroundColor: "rgba(255,255,255,0.08)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
  },

  explainTitle: {
    color: Colors.textPrimary,
    fontWeight: "900",
    marginBottom: 6,
  },

  explainText: {
    color: Colors.textSecondary,
    lineHeight: 19,
  },

  submitBar: {
    position: "absolute",
    left: Spacing.screenPadding,
    right: Spacing.screenPadding,
    bottom: Layout.bottomNavSpacing + 64,
  },

  submitButton: {
    backgroundColor: Colors.cards.complete,
    borderRadius: Radius.pill,
    paddingVertical: 14,
    alignItems: "center",
  },

  submitDisabled: {
    opacity: 0.55,
  },

  submitText: {
    color: Colors.background,
    fontWeight: "900",
    fontSize: 15,
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
  },

  backText: {
    color: "#fff",
    fontWeight: "700",
  },
});
