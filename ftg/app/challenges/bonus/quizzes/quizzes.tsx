// app/challenges/bonus/quizzes/quizzes.tsx
// FULL FILE REPLACEMENT — subtitle + open on top + completed section at bottom

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "expo-router";
import {
  ActivityIndicator,
  RefreshControl,
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

type QuizRow = {
  id: string;
  title: string;
  description: string | null;
  points: number;
  status: string;
  publish_start: string | null;
  publish_end: string | null;
};

export default function BonusQuizzesScreen() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [quizzes, setQuizzes] = useState<QuizRow[]>([]);
  const [completedIds, setCompletedIds] = useState<Set<string>>(new Set());

  const load = useCallback(async () => {
    try {
      setLoading(true);

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setQuizzes([]);
        setCompletedIds(new Set());
        return;
      }

      // Open window quizzes
      const nowIso = new Date().toISOString();

      const { data: quizData } = await supabase
        .from("quizzes")
        .select("id,title,description,points,status,publish_start,publish_end")
        .eq("status", "published")
        .lte("publish_start", nowIso)
        .gt("publish_end", nowIso)
        .order("publish_start", { ascending: true });

      const list = (quizData ?? []) as QuizRow[];
      setQuizzes(list);

      if (list.length === 0) {
        setCompletedIds(new Set());
        return;
      }

      const ids = list.map((q) => q.id);

      const { data: subs } = await supabase
        .from("quiz_submissions")
        .select("quiz_id")
        .eq("user_id", user.id)
        .in("quiz_id", ids);

      const set = new Set<string>();
      (subs ?? []).forEach((s: any) => set.add(s.quiz_id));
      setCompletedIds(set);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  const openQuizzes = useMemo(
    () => quizzes.filter((q) => !completedIds.has(q.id)),
    [quizzes, completedIds]
  );

  const doneQuizzes = useMemo(
    () => quizzes.filter((q) => completedIds.has(q.id)),
    [quizzes, completedIds]
  );

  return (
    <View style={styles.container}>
      <AppHeader />

      <View style={styles.headerText}>
        <Text style={styles.title}>Quizzes</Text>
        <Text style={styles.subtitle}>
          Weekly quizzes appear every Monday, and remain for one week. Quizzes
          with a 70% successful completion are awarded 50 points.
        </Text>
      </View>

      <View style={styles.content}>
        {loading ? (
          <View style={styles.centerBlock}>
            <ActivityIndicator />
            <Text style={styles.centerText}>Loading…</Text>
          </View>
        ) : quizzes.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>No quizzes available</Text>
            <Text style={styles.emptyText}>
              When a quiz is released, it will show up here.
            </Text>
          </View>
        ) : (
          <ScrollView
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
            }
            contentContainerStyle={{ paddingBottom: 120 }}
          >
            {/* OPEN */}
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionHeader}>Open Quizzes</Text>
              <Text style={styles.sectionMeta}>{openQuizzes.length}</Text>
            </View>

            {openQuizzes.length === 0 ? (
              <View style={styles.miniCard}>
                <Text style={styles.miniText}>No open quizzes right now.</Text>
              </View>
            ) : (
              openQuizzes.map((q) => (
                <TouchableOpacity
                  key={q.id}
                  style={styles.quizCard}
                  activeOpacity={0.9}
                  onPress={() => router.push(`/challenges/bonus/quizzes/${q.id}` as any)}
                >
                  <View style={styles.quizTopRow}>
                    <Text style={styles.quizTitle}>{q.title}</Text>
                    <View style={styles.pillOpen}>
                      <Text style={styles.pillOpenText}>OPEN</Text>
                    </View>
                  </View>

                  {q.description ? (
                    <Text style={styles.quizDesc}>{q.description}</Text>
                  ) : null}

                  <Text style={styles.quizTap}>Tap to take quiz</Text>
                </TouchableOpacity>
              ))
            )}

            {/* COMPLETED */}
            <View style={{ height: 14 }} />

            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionHeader}>Completed Quizzes</Text>
              <Text style={styles.sectionMeta}>{doneQuizzes.length}</Text>
            </View>

            {doneQuizzes.length === 0 ? (
              <View style={styles.miniCard}>
                <Text style={styles.miniText}>
                  You haven’t completed any quizzes this week yet.
                </Text>
              </View>
            ) : (
              doneQuizzes.map((q) => (
                <TouchableOpacity
                  key={q.id}
                  style={[styles.quizCard, styles.quizCardDone]}
                  activeOpacity={0.9}
                  onPress={() => router.push(`/challenges/bonus/quizzes/${q.id}` as any)}
                >
                  <View style={styles.quizTopRow}>
                    <Text style={styles.quizTitle}>{q.title}</Text>
                    <View style={styles.pillDone}>
                      <Text style={styles.pillDoneText}>COMPLETED</Text>
                    </View>
                  </View>

                  {q.description ? (
                    <Text style={styles.quizDesc}>{q.description}</Text>
                  ) : null}

                  <Text style={styles.quizTap}>Tap to review</Text>
                </TouchableOpacity>
              ))
            )}
          </ScrollView>
        )}
      </View>

      {/* Bottom Navigation */}
      <View style={styles.bottomBar}>
        <View style={styles.bottomButtonRow}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Text style={styles.backIcon}>⬅️</Text>
            <Text style={styles.backText}>Back</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.push("/main" as any)}
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

  headerText: {
    alignItems: "center",
    marginBottom: 18,
  },

  title: {
    fontSize: Typography.greeting.fontSize,
    fontWeight: Typography.greeting.fontWeight,
    color: Colors.textPrimary,
    marginBottom: 6,
    textAlign: "center",
  },

  subtitle: {
    fontSize: Typography.quote.fontSize,
    color: Colors.textSecondary,
    textAlign: "center",
    lineHeight: 20,
  },

  content: {
    flex: 1,
  },

  centerBlock: {
    backgroundColor: "rgba(255,255,255,0.08)",
    borderRadius: Radius.card,
    paddingVertical: 18,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
    alignItems: "center",
  },

  centerText: {
    marginTop: 10,
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: "center",
  },

  emptyCard: {
    backgroundColor: "rgba(255,255,255,0.08)",
    borderRadius: Radius.card,
    paddingVertical: 18,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
    alignItems: "center",
  },

  emptyTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: Colors.textPrimary,
    textAlign: "center",
    marginBottom: 6,
  },

  emptyText: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: "center",
    lineHeight: 20,
  },

  sectionHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
    paddingHorizontal: 2,
  },

  sectionHeader: {
    color: Colors.textPrimary,
    fontSize: 14,
    fontWeight: "900",
  },

  sectionMeta: {
    color: Colors.textSecondary,
    fontSize: 13,
    fontWeight: "800",
  },

  quizCard: {
    backgroundColor: "rgba(255,255,255,0.08)",
    borderRadius: Radius.card,
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
    marginBottom: 12,
  },

  quizCardDone: {
    opacity: 0.9,
  },

  quizTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    marginBottom: 8,
  },

  quizTitle: {
    flex: 1,
    color: Colors.textPrimary,
    fontSize: 15,
    fontWeight: "900",
  },

  quizDesc: {
    color: Colors.textSecondary,
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 10,
  },

  quizTap: {
    color: Colors.textSecondary,
    fontSize: 12,
    fontWeight: "800",
  },

  pillOpen: {
    backgroundColor: Colors.cards.complete,
    borderRadius: Radius.pill,
    paddingVertical: 6,
    paddingHorizontal: 10,
  },

  pillOpenText: {
    color: Colors.background,
    fontSize: 12,
    fontWeight: "900",
  },

  pillDone: {
    backgroundColor: Colors.cards.settings,
    borderRadius: Radius.pill,
    paddingVertical: 6,
    paddingHorizontal: 10,
  },

  pillDoneText: {
    color: Colors.background,
    fontSize: 12,
    fontWeight: "900",
  },

  miniCard: {
    backgroundColor: "rgba(255,255,255,0.06)",
    borderRadius: Radius.card,
    paddingVertical: 14,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
    marginBottom: 12,
  },

  miniText: {
    color: Colors.textSecondary,
    fontSize: 13,
    lineHeight: 18,
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
});
