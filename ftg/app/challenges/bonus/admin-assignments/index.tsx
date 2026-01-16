// app/challenges/bonus/admin-assignments/index.tsx
// FULL FILE REPLACEMENT
// Fixes:
// - Open / In Progress / Completed buckets based on submissions.submitted_at
// - No more “row exists = completed” (because we create a submission on first view)

import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { AppHeader } from "../../../../components/AppHeader";
import { Colors, Layout, Radius, Spacing, Typography } from "../../../../constants/theme";
import { supabase } from "../../../../lib/supabase";

type Assignment = {
  id: string;
  title: string;
  description: string | null;
  points: number;
};

type SubmissionRow = {
  admin_assignment_id: string;
  submitted_at: string | null;
  status: string | null;
};

export default function AdminAssignmentsScreen() {
  const router = useRouter();

  const [openAssignments, setOpenAssignments] = useState<Assignment[]>([]);
  const [inProgressAssignments, setInProgressAssignments] = useState<Assignment[]>([]);
  const [completedAssignments, setCompletedAssignments] = useState<Assignment[]>([]);

  useEffect(() => {
    (async () => {
      await loadAssignments();
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadAssignments = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    // 1) All published assignments
    const { data: allPublished, error: aErr } = await supabase
      .from("admin_assignments")
      .select("id, title, description, points")
      .eq("status", "published")
      .order("created_at", { ascending: false });

    if (aErr) return;

    const published = (allPublished ?? []) as Assignment[];
    const ids = published.map((a) => a.id);

    // 2) Submissions for this user for these assignments
    let subs: SubmissionRow[] = [];
    if (ids.length > 0) {
      const { data: sRows } = await supabase
        .from("admin_assignment_submissions")
        .select("admin_assignment_id, submitted_at, status")
        .eq("user_id", user.id)
        .in("admin_assignment_id", ids);

      subs = (sRows ?? []) as any as SubmissionRow[];
    }

    const subById: Record<string, SubmissionRow> = {};
    for (const s of subs) subById[s.admin_assignment_id] = s;

    // 3) Bucket logic:
    // - Completed: submitted_at is set OR status is approved
    // - In Progress: submission exists but submitted_at is null
    // - Open: no submission row yet
    const open: Assignment[] = [];
    const inProg: Assignment[] = [];
    const done: Assignment[] = [];

    for (const a of published) {
      const s = subById[a.id];
      const isCompleted = !!s?.submitted_at || s?.status === "approved";
      const isInProgress = !!s && !s.submitted_at && s.status !== "approved";

      if (isCompleted) done.push(a);
      else if (isInProgress) inProg.push(a);
      else open.push(a);
    }

    setOpenAssignments(open);
    setInProgressAssignments(inProg);
    setCompletedAssignments(done);
  };

  const goToQuestions = (id: string) => {
    router.push(`/challenges/bonus/admin-assignments/${id}/questions` as any);
  };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <AppHeader />

        <View style={styles.headerText}>
          <Text style={styles.icon}>🗂️</Text>
          <Text style={styles.title}>Admin Assignments</Text>
          <Text style={styles.subtitle}>
            <Text style={styles.subtitleBold}>Standard Format{"\n"}</Text>
            3 ratings (1–5) + 3 short responses.
          </Text>
        </View>

        {openAssignments.length === 0 &&
          inProgressAssignments.length === 0 &&
          completedAssignments.length === 0 && (
            <View style={styles.emptyWrap}>
              <Text style={styles.emptyTitle}>No assignments right now</Text>
              <Text style={styles.emptySub}>Check back later.</Text>
            </View>
          )}

        {/* OPEN */}
        {openAssignments.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>Open</Text>
            {openAssignments.map((a) => (
              <AssignmentCard
                key={a.id}
                title={a.title}
                description={`+${a.points} Points`}
                color={Colors.cards.admin}
                onPress={() => goToQuestions(a.id)}
              />
            ))}
          </>
        )}

        {/* IN PROGRESS */}
        {inProgressAssignments.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>In Progress</Text>
            {inProgressAssignments.map((a) => (
              <AssignmentCard
                key={a.id}
                title={a.title}
                description="Continue"
                color={"rgba(255,255,255,0.10)"}
                onPress={() => goToQuestions(a.id)}
              />
            ))}
          </>
        )}

        {/* COMPLETED */}
        {completedAssignments.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>Completed</Text>
            {completedAssignments.map((a) => (
              <AssignmentCard
                key={a.id}
                title={a.title}
                description="Completed ✅"
                color={Colors.cards.complete}
                onPress={() => goToQuestions(a.id)}
              />
            ))}
          </>
        )}
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
    </View>
  );
}

function AssignmentCard({
  title,
  description,
  color,
  onPress,
}: {
  title: string;
  description: string;
  color: string;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      style={[styles.card, { backgroundColor: color }]}
      onPress={onPress}
      activeOpacity={0.85}
    >
      <LinearGradient
        colors={["rgba(255,255,255,0.35)", "rgba(255,255,255,0.05)"]}
        start={{ x: 1, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={styles.cornerBubble}
      >
        <Text style={styles.bubbleIcon}>📝</Text>
      </LinearGradient>

      <Text style={styles.cardTitle}>{title}</Text>
      <Text style={styles.cardSubtitle}>{description}</Text>
    </TouchableOpacity>
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
    paddingBottom: 140,
  },

  headerText: {
    alignItems: "center",
    marginBottom: 16,
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

  emptyWrap: {
    marginTop: 18,
    padding: 16,
    borderRadius: Radius.card,
    backgroundColor: "rgba(255,255,255,0.08)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    alignItems: "center",
  },
  emptyTitle: {
    color: Colors.textPrimary,
    fontSize: 16,
    fontWeight: "800",
    marginBottom: 6,
    textAlign: "center",
  },
  emptySub: {
    color: Colors.textSecondary,
    fontSize: 13,
    fontWeight: "700",
    textAlign: "center",
  },

  sectionTitle: {
    marginTop: 18,
    marginBottom: 10,
    fontSize: 16,
    fontWeight: "700",
    color: Colors.textPrimary,
  },
  card: {
    borderRadius: Radius.card,
    padding: 14,
    marginBottom: 12,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
  },
  cornerBubble: {
    position: "absolute",
    top: -20,
    right: -20,
    width: 72,
    height: 72,
    borderRadius: 22,
    justifyContent: "flex-end",
    alignItems: "flex-start",
    padding: 14,
  },
  bubbleIcon: {
    fontSize: 20,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: Colors.textPrimary,
    marginBottom: 4,
  },
  cardSubtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
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
    backgroundColor: "rgba(255,255,255,0.10)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.16)",
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 14,
    minWidth: 130,
    alignItems: "center",
  },
  backText: {
    color: Colors.textPrimary,
    fontSize: 15,
    fontWeight: "700",
  },
});
