// app/challenges/bonus/admin-assignments/index.tsx
// FULL FILE REPLACEMENT

import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { AppHeader } from "../../../../components/AppHeader";
import {
  Colors,
  Layout,
  Radius,
  Spacing,
  Typography,
} from "../../../../constants/theme";
import { supabase } from "../../../../lib/supabase";

type Assignment = {
  id: string;
  title: string;
  description: string;
};

export default function AdminAssignmentsScreen() {
  const router = useRouter();
  const [openAssignments, setOpenAssignments] = useState<Assignment[]>([]);
  const [completedAssignments, setCompletedAssignments] = useState<Assignment[]>(
    []
  );

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

    // 1) Get completed assignment IDs for this user (row exists = completed)
    const { data: completedSubs } = await supabase
      .from("admin_assignment_submissions")
      .select("assignment_id")
      .eq("user_id", user.id);

    const completedIds = (completedSubs ?? [])
      .map((s: any) => s.assignment_id as string)
      .filter(Boolean);

    // 2) Completed assignments details
    let completed: Assignment[] = [];
    if (completedIds.length > 0) {
      const { data: completedRows } = await supabase
        .from("admin_assignments")
        .select("id, title, description")
        .in("id", completedIds);

      completed = (completedRows ?? []) as Assignment[];
    }

    // 3) Open assignments = published minus completedIds
    let open: Assignment[] = [];

    if (completedIds.length > 0) {
      // PostgREST expects an "in.(...)" list string inside .not(...)
      const inList = `(${completedIds.map((id) => `"${id}"`).join(",")})`;

      const { data: openRows } = await supabase
        .from("admin_assignments")
        .select("id, title, description")
        .eq("status", "published")
        .not("id", "in", inList);

      open = (openRows ?? []) as Assignment[];
    } else {
      const { data: openRows } = await supabase
        .from("admin_assignments")
        .select("id, title, description")
        .eq("status", "published");

      open = (openRows ?? []) as Assignment[];
    }

    setOpenAssignments(open);
    setCompletedAssignments(completed);
  };

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <AppHeader />

        <View style={styles.headerText}>
          <Text style={styles.icon}>🗂️</Text>
          <Text style={styles.title}>Admin Assignments</Text>
          <Text style={styles.subtitle}>
            <Text style={styles.subtitleBold}>+100 Points{"\n"}</Text>
            Required administrative submissions.
          </Text>
        </View>

        {/* OPEN */}
        {openAssignments.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>Open</Text>
            {openAssignments.map((a) => (
              <AssignmentCard
                key={a.id}
                title={a.title}
                description={a.description}
                color={Colors.cards.admin}
                onPress={() =>
                  router.push(
                    `/challenges/bonus/admin-assignments/${a.id}` as any
                  )
                }
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
                description="Completed"
                color={Colors.cards.complete}
                onPress={() =>
                  router.push(
                    `/challenges/bonus/admin-assignments/${a.id}` as any
                  )
                }
              />
            ))}
          </>
        )}
      </ScrollView>

      {/* Bottom Navigation */}
      <View style={styles.bottomBar}>
        <View style={styles.bottomButtonRow}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Text style={styles.backText}>⬅️ Back</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.push("/main")}
          >
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

  // ✅ Standard header block
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

  // Bottom Nav styles
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
