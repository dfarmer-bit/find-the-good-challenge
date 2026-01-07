// app/main.tsx
// FULL FILE REPLACEMENT
// Change: Bonus badge = open quizzes + open admin assignments + open growth missions (not submitted)

import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useFocusEffect, useRouter, type Href } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Dimensions,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { AppHeader } from "../components/AppHeader";
import { Colors, Layout, Radius, Spacing, Typography } from "../constants/theme";
import { supabase } from "../lib/supabase";

type CardItem = {
  label: string;
  icon: string;
  color: string;
  route?: Href;
};

const DAILY_QUOTES = [
  "Progress beats perfection.",
  "Small steps add up.",
  "Consistency creates change.",
  "Do one thing well today.",
  "Momentum starts now.",
  "You’re building something good.",
  "Show up for yourself.",
  "Today counts.",
  "Little wins matter.",
  "Forward is forward.",
  "You’re closer than you think.",
  "One choice can change today.",
  "Keep it simple. Keep going.",
  "Discipline builds freedom.",
  "Trust the process.",
  "Action creates motivation.",
  "Focus on what you can do.",
  "Your effort matters.",
  "Keep moving.",
  "Progress lives in repetition.",
  "This is how habits form.",
  "Your future thanks you.",
  "Do the next right thing.",
  "Energy follows action.",
  "Small effort. Big impact.",
  "You’re on track.",
  "Stay steady.",
  "Build, don’t rush.",
  "One day at a time.",
  "Today is a good day to try.",
];

export default function HomeScreen() {
  const router = useRouter();
  const screenWidth = Dimensions.get("window").width;

  const [loginStreak, setLoginStreak] = useState<number>(0);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [firstName, setFirstName] = useState<string>("");

  const [bonusCount, setBonusCount] = useState<number>(0);

  const baseSize =
    (screenWidth - Spacing.screenPadding * 2 - Spacing.gridGap) / 2;

  const cardWidth = baseSize * Layout.cardScale;
  const cardHeight = cardWidth * 0.85;

  const dailyQuote = useMemo(() => {
    const dayIndex = new Date().getDate() % DAILY_QUOTES.length;
    return DAILY_QUOTES[dayIndex];
  }, []);

  const loadData = useCallback(async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return;

    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name")
      .eq("id", user.id)
      .single();

    if (profile?.full_name) {
      setFirstName(profile.full_name.split(" ")[0]);
    }

    const now = new Date();
    const localDate = new Date(now.getFullYear(), now.getMonth(), now.getDate())
      .toISOString()
      .split("T")[0];

    const { data: existing } = await supabase
      .from("challenge_activity")
      .select("id")
      .eq("user_id", user.id)
      .eq("activity_type", "login_streak")
      .eq("occurred_date", localDate)
      .maybeSingle();

    if (!existing) {
      await supabase.from("challenge_activity").insert({
        user_id: user.id,
        activity_type: "login_streak",
        occurred_date: localDate,
        status: "approved",
      });
    }

    const { data: streak } = await supabase.rpc("get_login_streak", {
      p_user_id: user.id,
    });

    if (typeof streak === "number") {
      setLoginStreak(streak);
    }

    const { count } = await supabase
      .from("messages")
      .select("id", { count: "exact", head: true })
      .eq("recipient_id", user.id)
      .eq("is_read", false);

    setUnreadCount(count ?? 0);

    // ✅ Bonus badge count = open items across all three bonus areas
    const nowIso = new Date().toISOString();
    let openTotal = 0;

    // -------- Quizzes (open published in window minus submissions)
    const { data: openQuizzes, error: quizErr } = await supabase
      .from("quizzes")
      .select("id")
      .eq("status", "published")
      .lte("publish_start", nowIso)
      .gt("publish_end", nowIso);

    if (!quizErr && Array.isArray(openQuizzes) && openQuizzes.length > 0) {
      const ids = openQuizzes.map((q: any) => q.id);

      const { data: subs, error: subsErr } = await supabase
        .from("quiz_submissions")
        .select("quiz_id")
        .eq("user_id", user.id)
        .in("quiz_id", ids);

      const submitted = new Set<string>();
      if (!subsErr && Array.isArray(subs)) subs.forEach((s: any) => submitted.add(s.quiz_id));

      openTotal += ids.filter((qid) => !submitted.has(qid)).length;
    }

    // -------- Admin Assignments (open published in window minus submissions)
    const { data: openAdmin, error: adminErr } = await supabase
      .from("admin_assignments")
      .select("id")
      .eq("status", "published")
      .lte("publish_start", nowIso)
      .gt("publish_end", nowIso);

    if (!adminErr && Array.isArray(openAdmin) && openAdmin.length > 0) {
      const ids = openAdmin.map((a: any) => a.id);

      const { data: subs, error: subsErr } = await supabase
        .from("admin_assignment_submissions")
        .select("assignment_id")
        .eq("user_id", user.id)
        .in("assignment_id", ids);

      const submitted = new Set<string>();
      if (!subsErr && Array.isArray(subs)) subs.forEach((s: any) => submitted.add(s.assignment_id));

      openTotal += ids.filter((aid) => !submitted.has(aid)).length;
    }

    // -------- Growth Missions (open published in window minus submissions)
    const { data: openGrowth, error: growthErr } = await supabase
      .from("growth_missions")
      .select("id")
      .eq("status", "published")
      .lte("publish_start", nowIso)
      .gt("publish_end", nowIso);

    if (!growthErr && Array.isArray(openGrowth) && openGrowth.length > 0) {
      const ids = openGrowth.map((g: any) => g.id);

      const { data: subs, error: subsErr } = await supabase
        .from("growth_mission_submissions")
        .select("mission_id")
        .eq("user_id", user.id)
        .in("mission_id", ids);

      const submitted = new Set<string>();
      if (!subsErr && Array.isArray(subs)) subs.forEach((s: any) => submitted.add(s.mission_id));

      openTotal += ids.filter((mid) => !submitted.has(mid)).length;
    }

    setBonusCount(openTotal);
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.replace("/");
  };

  const cards: CardItem[] = [
    {
      label: "Complete\nChallenge",
      icon: "⭐",
      color: Colors.cards.complete,
      route: "/complete-challenge",
    },
    {
      label: "Events",
      icon: "📅",
      color: Colors.cards.goals,
      route: "/events",
    },
    {
      label: "Spotlight",
      icon: "🌟",
      color: Colors.cards.journal,
      route: "/spotlight",
    },
    {
      label: "Goals",
      icon: "🎯",
      color: "#2EC4B6",
      route: "/challenges/goals",
    },
    {
      label: "Messages",
      icon: "💬",
      color: Colors.cards.messages,
      route: "/messages",
    },
    {
      label: "Bonus\nPoints",
      icon: "🎁",
      color: "#FF5DA2",
      route: "/challenges/bonus",
    },
    {
      label: "Admin\nDashboard",
      icon: "🛠️",
      color: Colors.cards.admin,
      route: "/admin",
    },
    { label: "Settings", icon: "⚙️", color: Colors.cards.settings },
  ];

  return (
    <View style={styles.container}>
      <View style={styles.headerWrapper}>
        <AppHeader />

        <TouchableOpacity onPress={handleLogout} style={styles.logoutButton}>
          <Ionicons name="log-out-outline" size={26} color="#FFFFFF" />
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.headerText}>
        <Text style={styles.greeting}>
          Hi{firstName ? `, ${firstName}` : ""}
        </Text>
        <Text style={styles.quote}>{dailyQuote}</Text>
      </View>

      <View style={styles.cardGrid}>
        {cards.map((card, index) => {
          const isMessages = card.label === "Messages";
          const isBonus = card.label === "Bonus\nPoints";

          return (
            <TouchableOpacity
              key={index}
              onPress={() => card.route && router.push(card.route)}
              style={[
                styles.card,
                {
                  width: cardWidth,
                  height: cardHeight,
                  backgroundColor: card.color,
                },
              ]}
            >
              <LinearGradient
                colors={["rgba(255,255,255,0.35)", "rgba(255,255,255,0.05)"]}
                start={{ x: 1, y: 0 }}
                end={{ x: 0, y: 1 }}
                style={styles.cornerBubble}
              >
                <Text style={styles.bubbleIcon}>{card.icon}</Text>
              </LinearGradient>

              {isMessages && unreadCount > 0 && <View style={styles.badgeDot} />}

              {isBonus && bonusCount > 0 && (
                <View style={styles.countBadge}>
                  <Text style={styles.countBadgeText}>
                    {bonusCount > 99 ? "99+" : String(bonusCount)}
                  </Text>
                </View>
              )}

              <Text style={styles.cardTitle}>{card.label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <View style={styles.streakBox}>
        <Text style={styles.streakPrimary}>🔥 {loginStreak}-Day Streak</Text>
        <Text style={styles.streakSecondary}>
          Points awarded for 5 consecutive days of login
        </Text>
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
  headerWrapper: {
    position: "relative",
    marginBottom: Spacing.sectionGap,
  },
  logoutButton: {
    position: "absolute",
    left: 16,
    top: "50%",
    transform: [{ translateY: -18 }],
    alignItems: "center",
  },
  logoutText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "600",
    marginTop: 2,
  },
  headerText: {
    alignItems: "center",
    marginBottom: 14,
  },
  greeting: {
    fontSize: Typography.greeting.fontSize,
    fontWeight: Typography.greeting.fontWeight,
    color: Colors.textPrimary,
    marginBottom: 4,
    textAlign: "center",
  },
  quote: {
    fontSize: Typography.quote.fontSize,
    color: Colors.textSecondary,
    textAlign: "center",
  },
  cardGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    columnGap: Spacing.gridGap,
    rowGap: Spacing.gridGap,
  },
  card: {
    borderRadius: Radius.card,
    justifyContent: "flex-end",
    alignItems: "flex-start",
    paddingBottom: 14,
    paddingLeft: 14,
    overflow: "hidden",
  },
  cornerBubble: {
    position: "absolute",
    top: -24,
    right: -24,
    width: 96,
    height: 96,
    borderRadius: 28,
    justifyContent: "flex-end",
    alignItems: "flex-start",
    padding: 18,
  },
  bubbleIcon: {
    fontSize: 24,
  },

  badgeDot: {
    position: "absolute",
    top: 10,
    right: 12,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#FF4D4F",
  },

  countBadge: {
    position: "absolute",
    bottom: 10,
    right: 10,
    minWidth: 22,
    height: 22,
    paddingHorizontal: 6,
    borderRadius: 11,
    backgroundColor: "#FF4D4F",
    alignItems: "center",
    justifyContent: "center",
  },

  countBadgeText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "900",
    includeFontPadding: false,
  },

  cardTitle: {
    fontSize: Typography.cardTitle.fontSize,
    fontWeight: Typography.cardTitle.fontWeight,
    lineHeight: Typography.cardTitle.lineHeight,
    color: Colors.textPrimary,
    textAlign: "left",
  },
  streakBox: {
    position: "absolute",
    bottom: 16,
    left: Spacing.screenPadding,
    right: Spacing.screenPadding,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderRadius: 18,
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: "center",
  },
  streakPrimary: {
    fontSize: 16,
    fontWeight: "700",
    color: Colors.textPrimary,
    marginBottom: 2,
  },
  streakSecondary: {
    fontSize: 13,
    color: Colors.textSecondary,
    textAlign: "center",
  },
});
