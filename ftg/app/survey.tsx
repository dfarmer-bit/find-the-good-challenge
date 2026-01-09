// app/survey.tsx
// FULL FILE REPLACEMENT
// - Friendly date in subtitle
// - If user already submitted for the open week, hide the survey and show completion state

import { LinearGradient } from "expo-linear-gradient";
import { useRouter, type Href } from "expo-router";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  Dimensions,
  Easing,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { AppHeader } from "../components/AppHeader";
import { Colors, Components, Layout, Radius, Spacing } from "../constants/theme";
import { supabase } from "../lib/supabase";

type SurveyInstance = {
  week_start_date: string; // YYYY-MM-DD
  focus_prompt: string;
};

type OptionDef = {
  question_key: string;
  option_key: string;
  option_label: string;
  sort_order: number;
};

type FocusOption = {
  week_start_date: string;
  option_key: string;
  option_label: string;
  sort_order: number;
};

const QUESTION_KEYS = [
  "workload",
  "staffing",
  "barriers",
  "clarity",
  "focus",
  "concern",
  "concern_category",
] as const;

function formatWeekStart(yyyyMmDd: string) {
  // Treat as local date (avoid timezone shifting)
  const d = new Date(`${yyyyMmDd}T00:00:00`);
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "America/Chicago",
  });
}

export default function SurveyScreen() {
  const router = useRouter();
  const screenWidth = Dimensions.get("window").width;

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [instance, setInstance] = useState<SurveyInstance | null>(null);
  const [hasSubmitted, setHasSubmitted] = useState(false);

  const [optionDefs, setOptionDefs] = useState<Record<string, OptionDef[]>>({});
  const [focusOptions, setFocusOptions] = useState<FocusOption[]>([]);

  const [answers, setAnswers] = useState<Record<string, string>>({
    workload: "",
    staffing: "",
    barriers: "",
    clarity: "",
    focus: "",
    concern: "no",
    concern_category: "",
  });

  const nowIso = useMemo(() => new Date().toISOString(), []);

  // --- tiny sparkle twinkle (matches home vibe)
  const twinkle = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(twinkle, {
          toValue: 1,
          duration: 1800,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(twinkle, {
          toValue: 0,
          duration: 1800,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
      ])
    );
    anim.start();
    return () => anim.stop();
  }, [twinkle]);

  const twinkleOpacity = twinkle.interpolate({
    inputRange: [0, 1],
    outputRange: [0.22, 0.65],
  });

  useEffect(() => {
    let mounted = true;

    async function load() {
      try {
        setLoading(true);

        // Open week
        const { data: inst, error: instErr } = await supabase
          .from("weekly_survey_instances")
          .select(
            "week_start_date, focus_prompt, publish_start, publish_end, is_active"
          )
          .eq("is_active", true)
          .lte("publish_start", nowIso)
          .gte("publish_end", nowIso)
          .order("week_start_date", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (instErr) throw instErr;

        if (!inst) {
          if (mounted) {
            setInstance(null);
            setHasSubmitted(false);
          }
          return;
        }

        if (mounted) {
          setInstance({
            week_start_date: inst.week_start_date,
            focus_prompt: inst.focus_prompt,
          });
        }

        // Check if THIS user already submitted this week
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (user) {
          const { data: existing, error: subErr } = await supabase
            .from("weekly_survey_submissions")
            .select("id")
            .eq("user_id", user.id)
            .eq("week_start_date", inst.week_start_date)
            .limit(1)
            .maybeSingle();

          if (subErr) throw subErr;
          if (mounted) setHasSubmitted(!!existing);
        } else {
          if (mounted) setHasSubmitted(false);
        }

        // Option defs (fixed)
        const { data: oDefs, error: oErr } = await supabase
          .from("weekly_survey_option_defs")
          .select("question_key, option_key, option_label, sort_order")
          .in("question_key", [
            "workload",
            "staffing",
            "barriers",
            "clarity",
            "concern",
            "concern_category",
          ])
          .order("question_key", { ascending: true })
          .order("sort_order", { ascending: true });

        if (oErr) throw oErr;

        const oMap: Record<string, OptionDef[]> = {};
        (oDefs || []).forEach((o: any) => {
          if (!oMap[o.question_key]) oMap[o.question_key] = [];
          oMap[o.question_key].push(o);
        });

        if (mounted) setOptionDefs(oMap);

        // Focus options (per open week)
        const { data: fOpts, error: fErr } = await supabase
          .from("weekly_survey_focus_options")
          .select("week_start_date, option_key, option_label, sort_order")
          .eq("week_start_date", inst.week_start_date)
          .order("sort_order", { ascending: true });

        if (fErr) throw fErr;

        if (mounted) setFocusOptions((fOpts || []) as any);
      } catch {
        Alert.alert(
          "Weekly Survey",
          "We couldn’t load the survey right now. Please try again shortly."
        );
      } finally {
        if (mounted) setLoading(false);
      }
    }

    load();
    return () => {
      mounted = false;
    };
  }, [nowIso]);

  const setAnswer = (key: string, value: string) => {
    setAnswers((prev) => {
      const next = { ...prev, [key]: value };
      if (key === "concern" && value === "no") next.concern_category = "";
      return next;
    });
  };

  const canSubmit = useMemo(() => {
    if (!instance) return false;
    if (hasSubmitted) return false;
    if (!answers.workload) return false;
    if (!answers.staffing) return false;
    if (!answers.barriers) return false;
    if (!answers.clarity) return false;
    if (!answers.focus) return false;
    if (!answers.concern) return false;
    if (answers.concern === "yes" && !answers.concern_category) return false;
    return true;
  }, [answers, instance, hasSubmitted]);

  const onSubmit = async () => {
    if (!instance) return;
    if (hasSubmitted) return;

    if (!canSubmit) {
      Alert.alert(
        "Weekly Survey",
        "Please answer all required questions before submitting."
      );
      return;
    }

    try {
      setSubmitting(true);

      const { error } = await supabase.rpc("submit_weekly_survey", {
        p_week_start_date: instance.week_start_date,
        p_workload: answers.workload,
        p_staffing: answers.staffing,
        p_barriers: answers.barriers,
        p_clarity: answers.clarity,
        p_focus: answers.focus,
        p_concern: answers.concern,
        p_concern_category: answers.concern === "yes" ? answers.concern_category : "",
      });

      if (error) throw error;

      setHasSubmitted(true);

      Alert.alert("Weekly Survey", "Thanks — your survey was submitted.", [
        { text: "OK" },
      ]);
    } catch {
      Alert.alert(
        "Weekly Survey",
        "We couldn’t submit your survey. Please try again."
      );
    } finally {
      setSubmitting(false);
    }
  };

  const cardWidth = useMemo(() => {
    const maxW = 520;
    return Math.min(maxW, screenWidth - Spacing.screenPadding * 2);
  }, [screenWidth]);

  const renderChoiceRow = (
    questionKey: string,
    opt: { option_key: string; option_label: string }
  ) => {
    const selected = answers[questionKey] === opt.option_key;
    return (
      <TouchableOpacity
        key={opt.option_key}
        activeOpacity={0.9}
        onPress={() => setAnswer(questionKey, opt.option_key)}
        style={[styles.choiceRow, selected && styles.choiceRowSelected]}
      >
        <View style={[styles.choiceDot, selected && styles.choiceDotSelected]} />
        <Text style={styles.choiceText}>{opt.option_label}</Text>
      </TouchableOpacity>
    );
  };

  const SectionCard = ({
    title,
    prompt,
    questionKey,
    options,
  }: {
    title: string;
    prompt: string;
    questionKey: string;
    options: { option_key: string; option_label: string }[];
  }) => {
    return (
      <View style={[styles.card, { width: cardWidth }]}>
        <View style={styles.cardHeaderRow}>
          <Text style={styles.cardTitle}>{title}</Text>
          <View style={styles.requiredPill}>
            <Text style={styles.requiredText}>Required</Text>
          </View>
        </View>
        <Text style={styles.cardPrompt}>{prompt}</Text>

        <View style={styles.choiceList}>
          {options.map((o) => renderChoiceRow(questionKey, o))}
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.container}>
          <View style={styles.headerWrapper}>
            <AppHeader greeting="Weekly Survey" subtitle="Loading…" />
          </View>

          <View style={styles.center}>
            <ActivityIndicator />
            <Text style={styles.muted}>Loading survey…</Text>
          </View>

          <View style={styles.bottomBar}>
            <TouchableOpacity
              style={Components.backButton}
              onPress={() => router.back()}
            >
              <Text style={styles.backText}>⬅️ Back</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={Components.backButton}
              onPress={() => router.replace("/main" as Href)}
            >
              <Text style={styles.backText}>🏠 Home</Text>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  if (!instance) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.container}>
          <View style={styles.headerWrapper}>
            <AppHeader greeting="Weekly Survey" subtitle="Not available" />
          </View>

          <View style={[styles.card, { width: cardWidth }]}>
            <Text style={styles.cardTitle}>No survey right now</Text>
            <Text style={styles.cardPrompt}>
              Please check back later when a new survey is available.
            </Text>
          </View>

          <View style={styles.bottomBar}>
            <TouchableOpacity
              style={Components.backButton}
              onPress={() => router.back()}
            >
              <Text style={styles.backText}>⬅️ Back</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={Components.backButton}
              onPress={() => router.replace("/main" as Href)}
            >
              <Text style={styles.backText}>🏠 Home</Text>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  const weekLabel = `Week of ${formatWeekStart(instance.week_start_date)}`;

  // If already submitted, show completion state instead of the survey
  if (hasSubmitted) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.container}>
          <View pointerEvents="none" style={StyleSheet.absoluteFill}>
            <LinearGradient
              colors={[
                "rgba(14,42,102,0.45)",
                "rgba(109,168,255,0.10)",
                "rgba(255,93,162,0.06)",
                "rgba(0,0,0,0)",
              ]}
              start={{ x: 0.1, y: 0.0 }}
              end={{ x: 0.9, y: 1 }}
              style={StyleSheet.absoluteFill}
            />
            <LinearGradient
              colors={["rgba(139,92,246,0.12)", "rgba(0,0,0,0)"]}
              start={{ x: 0, y: 1 }}
              end={{ x: 1, y: 0 }}
              style={StyleSheet.absoluteFill}
            />
            <View style={[styles.bgOrb, styles.bgOrb1]} />
            <View style={[styles.bgOrb, styles.bgOrb2]} />
            <View style={[styles.bgOrb, styles.bgOrb3]} />

            <Animated.View style={[styles.spark, styles.spark1, { opacity: twinkleOpacity }]} />
            <Animated.View style={[styles.spark, styles.spark2, { opacity: twinkleOpacity }]} />
            <Animated.View style={[styles.spark, styles.spark3, { opacity: twinkleOpacity }]} />
            <Animated.View style={[styles.spark, styles.spark4, { opacity: twinkleOpacity }]} />
            <Animated.View style={[styles.spark, styles.spark5, { opacity: twinkleOpacity }]} />
          </View>

          <View style={styles.headerWrapper}>
            <AppHeader greeting="Weekly Survey" subtitle={weekLabel} />
          </View>

          <View style={[styles.card, { width: cardWidth }]}>
            <Text style={styles.cardTitle}>✅ Completed</Text>
            <Text style={styles.cardPrompt}>
              Thanks — you already submitted this week’s survey.
            </Text>
          </View>

          <View style={styles.bottomBar}>
            <TouchableOpacity style={Components.backButton} onPress={() => router.back()}>
              <Text style={styles.backText}>⬅️ Back</Text>
            </TouchableOpacity>

            <TouchableOpacity style={Components.backButton} onPress={() => router.replace("/main" as Href)}>
              <Text style={styles.backText}>🏠 Home</Text>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  const workloadOpts = optionDefs.workload || [];
  const staffingOpts = optionDefs.staffing || [];
  const barriersOpts = optionDefs.barriers || [];
  const clarityOpts = optionDefs.clarity || [];

  const concernOpts = optionDefs.concern || [];
  const concernCatOpts = optionDefs.concern_category || [];

  const focusOpts = focusOptions.map((f) => ({
    option_key: f.option_key,
    option_label: f.option_label,
  }));

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        {/* Background (matches home vibe) */}
        <View pointerEvents="none" style={StyleSheet.absoluteFill}>
          <LinearGradient
            colors={[
              "rgba(14,42,102,0.45)",
              "rgba(109,168,255,0.10)",
              "rgba(255,93,162,0.06)",
              "rgba(0,0,0,0)",
            ]}
            start={{ x: 0.1, y: 0.0 }}
            end={{ x: 0.9, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
          <LinearGradient
            colors={["rgba(139,92,246,0.12)", "rgba(0,0,0,0)"]}
            start={{ x: 0, y: 1 }}
            end={{ x: 1, y: 0 }}
            style={StyleSheet.absoluteFill}
          />
          <View style={[styles.bgOrb, styles.bgOrb1]} />
          <View style={[styles.bgOrb, styles.bgOrb2]} />
          <View style={[styles.bgOrb, styles.bgOrb3]} />

          <Animated.View style={[styles.spark, styles.spark1, { opacity: twinkleOpacity }]} />
          <Animated.View style={[styles.spark, styles.spark2, { opacity: twinkleOpacity }]} />
          <Animated.View style={[styles.spark, styles.spark3, { opacity: twinkleOpacity }]} />
          <Animated.View style={[styles.spark, styles.spark4, { opacity: twinkleOpacity }]} />
          <Animated.View style={[styles.spark, styles.spark5, { opacity: twinkleOpacity }]} />
        </View>

        <View style={styles.headerWrapper}>
          <AppHeader greeting="Weekly Survey" subtitle={weekLabel} />
        </View>

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <SectionCard
            title="1"
            prompt="My workload felt manageable this week."
            questionKey="workload"
            options={workloadOpts.map((o) => ({ option_key: o.option_key, option_label: o.option_label }))}
          />

          <SectionCard
            title="2"
            prompt="We had enough staff this week to do the job safely."
            questionKey="staffing"
            options={staffingOpts.map((o) => ({ option_key: o.option_key, option_label: o.option_label }))}
          />

          <SectionCard
            title="3"
            prompt="Problems (paperwork, schedules, meds, transport, equipment, etc.) got in the way of my work this week."
            questionKey="barriers"
            options={barriersOpts.map((o) => ({ option_key: o.option_key, option_label: o.option_label }))}
          />

          <SectionCard
            title="4"
            prompt="Expectations and communication from leaders were clear this week."
            questionKey="clarity"
            options={clarityOpts.map((o) => ({ option_key: o.option_key, option_label: o.option_label }))}
          />

          <View style={[styles.card, { width: cardWidth }]}>
            <View style={styles.cardHeaderRow}>
              <Text style={styles.cardTitle}>5</Text>
              <View style={styles.requiredPill}>
                <Text style={styles.requiredText}>Required</Text>
              </View>
            </View>
            <Text style={styles.cardPrompt}>{instance.focus_prompt}</Text>

            <View style={styles.choiceList}>
              {focusOpts.length > 0 ? (
                focusOpts.map((o) => renderChoiceRow("focus", o))
              ) : (
                <View style={styles.emptyInner}>
                  <Text style={styles.muted}>No options are set for this week yet.</Text>
                </View>
              )}
            </View>
          </View>

          <View style={[styles.card, { width: cardWidth }]}>
            <View style={styles.cardHeaderRow}>
              <Text style={styles.cardTitle}>6</Text>
              <View style={styles.requiredPill}>
                <Text style={styles.requiredText}>Required</Text>
              </View>
            </View>
            <Text style={styles.cardPrompt}>
              Did you see anything this week that could seriously harm a client, a coworker, or the program if not fixed?
            </Text>

            <View style={styles.choiceList}>
              {concernOpts.map((o) =>
                renderChoiceRow("concern", { option_key: o.option_key, option_label: o.option_label })
              )}
            </View>

            {answers.concern === "yes" && (
              <View style={styles.subCard}>
                <Text style={styles.subCardTitle}>What type?</Text>
                <View style={styles.choiceList}>
                  {concernCatOpts.map((o) =>
                    renderChoiceRow("concern_category", { option_key: o.option_key, option_label: o.option_label })
                  )}
                </View>
              </View>
            )}
          </View>

          <TouchableOpacity
            activeOpacity={0.9}
            onPress={onSubmit}
            disabled={!canSubmit || submitting}
            style={[
              styles.submitBtn,
              { width: cardWidth },
              (!canSubmit || submitting) && styles.submitBtnDisabled,
            ]}
          >
            <LinearGradient
              colors={["rgba(255,255,255,0.22)", "rgba(255,255,255,0.05)", "rgba(255,255,255,0.02)"]}
              start={{ x: 1, y: 0 }}
              end={{ x: 0, y: 1 }}
              style={styles.submitOverlay}
            />
            <Text style={styles.submitText}>{submitting ? "Submitting…" : "Submit"}</Text>
          </TouchableOpacity>

          <View style={{ height: 140 }} />
        </ScrollView>

        <View style={styles.bottomBar}>
          <TouchableOpacity style={Components.backButton} onPress={() => router.back()}>
            <Text style={styles.backText}>⬅️ Back</Text>
          </TouchableOpacity>

          <TouchableOpacity style={Components.backButton} onPress={() => router.replace("/main" as Href)}>
            <Text style={styles.backText}>🏠 Home</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  container: {
    flex: 1,
    paddingTop: Layout.topScreenPadding,
    paddingHorizontal: Spacing.screenPadding,
  },

  // background accents (match main.tsx)
  bgOrb: {
    position: "absolute",
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.06)",
  },
  bgOrb1: {
    width: 230,
    height: 230,
    top: -80,
    left: -80,
    backgroundColor: "rgba(109,168,255,0.10)",
  },
  bgOrb2: {
    width: 200,
    height: 200,
    top: 150,
    right: -70,
    backgroundColor: "rgba(255,93,162,0.07)",
  },
  bgOrb3: {
    width: 280,
    height: 280,
    bottom: -140,
    left: 10,
    backgroundColor: "rgba(139,92,246,0.06)",
  },
  spark: {
    position: "absolute",
    width: 3,
    height: 3,
    borderRadius: 2,
    backgroundColor: "rgba(255,255,255,0.90)",
  },
  spark1: { top: 110, left: 40 },
  spark2: { top: 210, right: 34 },
  spark3: { top: 320, left: 24 },
  spark4: { bottom: 210, right: 64 },
  spark5: { bottom: 160, left: 80 },

  headerWrapper: {
    marginBottom: Spacing.sectionGap - 6,
  },

  scrollContent: {
    paddingBottom: 0,
    alignItems: "center",
  },

  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },

  muted: {
    color: "rgba(255,255,255,0.72)",
    fontSize: 13,
    fontWeight: "700",
    textAlign: "center",
  },

  card: {
    marginTop: 10,
    borderRadius: Radius.card,
    paddingVertical: 12,
    paddingHorizontal: 14,
    backgroundColor: "rgba(255,255,255,0.08)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.16)",
    overflow: "hidden",
  },

  cardHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 6,
  },

  cardTitle: {
    color: Colors.textPrimary,
    fontSize: 16,
    fontWeight: "900",
  },

  requiredPill: {
    height: 22,
    paddingHorizontal: 10,
    borderRadius: 11,
    backgroundColor: "rgba(255,255,255,0.10)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.14)",
    alignItems: "center",
    justifyContent: "center",
  },
  requiredText: {
    color: "rgba(255,255,255,0.86)",
    fontSize: 11,
    fontWeight: "900",
    includeFontPadding: false,
  },

  cardPrompt: {
    color: "rgba(255,255,255,0.88)",
    fontSize: 13,
    fontWeight: "800",
    lineHeight: 18,
    marginBottom: 10,
  },

  choiceList: {
    gap: 10,
  },

  choiceRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.14)",
    backgroundColor: "rgba(0,0,0,0.15)",
  },
  choiceRowSelected: {
    borderColor: "rgba(109,168,255,0.65)",
    backgroundColor: "rgba(109,168,255,0.12)",
  },
  choiceDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.55)",
  },
  choiceDotSelected: {
    borderColor: "#6DA8FF",
    backgroundColor: "#6DA8FF",
  },
  choiceText: {
    flex: 1,
    color: "rgba(255,255,255,0.92)",
    fontSize: 13,
    fontWeight: "800",
    lineHeight: 16,
  },

  subCard: {
    marginTop: 12,
    borderRadius: 18,
    padding: 12,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
  },
  subCardTitle: {
    color: Colors.textPrimary,
    fontSize: 13,
    fontWeight: "900",
    marginBottom: 10,
  },

  emptyInner: {
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    backgroundColor: "rgba(0,0,0,0.12)",
  },

  submitBtn: {
    marginTop: 12,
    height: 52,
    borderRadius: Radius.card,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#6DA8FF",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
    overflow: "hidden",
  },
  submitBtnDisabled: {
    opacity: 0.45,
  },
  submitOverlay: {
    ...StyleSheet.absoluteFillObject,
  },
  submitText: {
    color: "#081225",
    fontSize: 15,
    fontWeight: "900",
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
