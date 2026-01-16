// app/main.tsx
// FULL FILE REPLACEMENT
// ONLY change: Events badge moves to bottom-center (not top-right)

import { LinearGradient } from "expo-linear-gradient";
import { useFocusEffect, useRouter, type Href } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Animated,
  Dimensions,
  Easing,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { AppHeader } from "../components/AppHeader";
import { Colors, Layout, Radius, Spacing } from "../constants/theme";
import { supabase } from "../lib/supabase";
import { registerForPushNotifications } from "../lib/registerNotifications";

type CardItem = {
  key: string;
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
  "Keep it simple. \nKeep going.",
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
  "Small effort. \nBig impact.",
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

  // ✅ Goals badge state (open goals = completed_at is NULL)
  const [openGoalsCount, setOpenGoalsCount] = useState<number>(0);

  // ✅ Survey badge state
  const [surveyAvailable, setSurveyAvailable] = useState<boolean>(false);

  // ✅ Events badge state (upcoming invites not checked-in)
  const [upcomingEventsCount, setUpcomingEventsCount] = useState<number>(0);

  // featured rotation index (hub only)
  const [featuredIndex, setFeaturedIndex] = useState<number>(0);

  const dailyQuote = useMemo(() => {
    const dayIndex = new Date().getDate() % DAILY_QUOTES.length;
    return DAILY_QUOTES[dayIndex];
  }, []);

  // --- subtle “gamey” pulse for featured (design only)
  const pulse = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1,
          duration: 1400,
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 0,
          duration: 1400,
          useNativeDriver: true,
        }),
      ])
    );
    anim.start();
    return () => anim.stop();
  }, [pulse]);

  // --- tiny sparkle twinkle (design only)
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

  // --- subtle drift for the center logo (design only)
  const logoFloat = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(logoFloat, {
          toValue: 1,
          duration: 2400,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(logoFloat, {
          toValue: 0,
          duration: 2400,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
      ])
    );
    anim.start();
    return () => anim.stop();
  }, [logoFloat]);

  // ✅ ensure we only register once per app session
  const didRegisterPush = useRef(false);

  const loadData = useCallback(async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return;

    // ✅ One-time push registration/token save
    if (!didRegisterPush.current) {
      didRegisterPush.current = true;
      registerForPushNotifications();
    }

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

    // ✅ Goals badge count = goals where completed_at IS NULL
    const { count: goalsOpenCount } = await supabase
      .from("goals")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .is("completed_at", null);

    setOpenGoalsCount(goalsOpenCount ?? 0);

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
      if (!subsErr && Array.isArray(subs))
        subs.forEach((s: any) => submitted.add(s.quiz_id));

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
      if (!subsErr && Array.isArray(subs))
        subs.forEach((s: any) => submitted.add(s.assignment_id));

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
      if (!subsErr && Array.isArray(subs))
        subs.forEach((s: any) => submitted.add(s.mission_id));

      openTotal += ids.filter((mid) => !submitted.has(mid)).length;
    }

    setBonusCount(openTotal);

    // ✅ Survey badge: open week exists AND user has not submitted it
    let showSurvey = false;

    const { data: openSurveyWeek, error: surveyWeekErr } = await supabase
      .from("weekly_survey_instances")
      .select("week_start_date")
      .eq("is_active", true)
      .lte("publish_start", nowIso)
      .gte("publish_end", nowIso)
      .order("week_start_date", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!surveyWeekErr && openSurveyWeek?.week_start_date) {
      const { data: submittedSurvey, error: surveySubErr } = await supabase
        .from("weekly_survey_submissions")
        .select("id")
        .eq("user_id", user.id)
        .eq("week_start_date", openSurveyWeek.week_start_date)
        .maybeSingle();

      if (!surveySubErr && !submittedSurvey) {
        showSurvey = true;
      }
    }

    setSurveyAvailable(showSurvey);

    // ✅ Events badge: upcoming invites (RLS-safe, no joins)
    const { data: invites } = await supabase
      .from("event_invites")
      .select("event_id")
      .eq("user_id", user.id)
      .is("checked_in_at", null);

    if (!invites || invites.length === 0) {
      setUpcomingEventsCount(0);
    } else {
      const eventIds = invites.map((i) => i.event_id);
      const nowIso2 = new Date().toISOString();

      const { count } = await supabase
        .from("events")
        .select("id", { count: "exact", head: true })
        .in("id", eventIds)
        .gt("start_time", nowIso2)
        .is("cancelled_at", null);

      setUpcomingEventsCount(count ?? 0);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const handleLogout = useCallback(async () => {
    await supabase.auth.signOut();
    router.replace("/login" as Href);
  }, [router]);

  // --- Hub (these 5) — one-word labels
  const wheelCards: CardItem[] = useMemo(
    () => [
      {
        key: "events",
        label: "Events",
        icon: "📅",
        color: Colors.cards.goals,
        route: "/events" as Href,
      },
      {
        key: "complete",
        label: "Challenges",
        icon: "⭐",
        color: Colors.cards.complete,
        route: "/complete-challenge" as Href,
      },
      {
        key: "bonus",
        label: "Bonuses",
        icon: "🎁",
        color: "#FF5DA2",
        route: "/challenges/bonus" as Href,
      },
      {
        key: "goals",
        label: "Goals",
        icon: "🎯",
        color: "#2EC4B6",
        route: "/challenges/goals" as Href,
      },
      {
        key: "spotlight",
        label: "Spotlight",
        icon: "🌟",
        color: Colors.cards.journal,
        route: "/spotlight" as Href,
      },
    ],
    []
  );

  // --- Featured rotates ONLY among hub items (design only)
  const featuredWheelCard = useMemo(() => {
    const safeIndex =
      ((featuredIndex % wheelCards.length) + wheelCards.length) %
      wheelCards.length;
    return wheelCards[safeIndex];
  }, [featuredIndex, wheelCards]);

  useEffect(() => {
    const t = setInterval(() => {
      setFeaturedIndex((i) => (i + 1) % wheelCards.length);
    }, 8000);
    return () => clearInterval(t);
  }, [wheelCards.length]);

  const pulseScale = pulse.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.018],
  });

  const twinkleOpacity = twinkle.interpolate({
    inputRange: [0, 1],
    outputRange: [0.22, 0.65],
  });

  const logoFloatY = logoFloat.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -6],
  });

  const renderBadge = (cardKey: string) => {
    if (cardKey === "messages" && unreadCount > 0)
      return <View style={styles.badgeDot} />;

    // ✅ Events badge now bottom-center
    if (cardKey === "events" && upcomingEventsCount > 0)
      return (
        <View style={styles.countBadgeBottomCenter}>
          <Text style={styles.countBadgeText}>
            {upcomingEventsCount > 99 ? "99+" : String(upcomingEventsCount)}
          </Text>
        </View>
      );

    if (cardKey === "bonus" && bonusCount > 0)
      return (
        <View style={styles.countBadge}>
          <Text style={styles.countBadgeText}>
            {bonusCount > 99 ? "99+" : String(bonusCount)}
          </Text>
        </View>
      );

    if (cardKey === "survey" && surveyAvailable)
      return <View style={styles.badgeDot} />;

    if (cardKey === "goals" && openGoalsCount > 0)
      return <View style={styles.badgeDot} />;

    return null;
  };

  // --- Hub sizing (kept as-is from your latest approach)
  const hubSize = Math.min(320, screenWidth - Spacing.screenPadding * 2);

  // bubbles
  const bubbleSize = Math.max(70, Math.min(88, hubSize * 0.26));
  const bubbleRadius = bubbleSize / 2;

  // TRUE circle layout: 5 evenly spaced points, starting at 12 o’clock
  const hubSlots = useMemo(() => {
    const ringRadius = Math.round(hubSize * 0.38);
    const step = (2 * Math.PI) / 5;
    const start = -Math.PI / 2;

    return Array.from({ length: 5 }).map((_, i) => {
      const angle = start + i * step;
      return {
        dx: Math.round(Math.cos(angle) * ringRadius),
        dy: Math.round(Math.sin(angle) * ringRadius),
      };
    });
  }, [hubSize]);

  const positionedHub = useMemo(() => {
    return wheelCards.map((card, i) => {
      const s = hubSlots[i];
      return { card, dx: s.dx, dy: s.dy };
    });
  }, [wheelCards, hubSlots]);

  return (
    <View style={styles.container}>
      {/* Game-like wallpaper background (design only) */}
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

        {/* sparkles */}
        <Animated.View
          style={[styles.spark, styles.spark1, { opacity: twinkleOpacity }]}
        />
        <Animated.View
          style={[styles.spark, styles.spark2, { opacity: twinkleOpacity }]}
        />
        <Animated.View
          style={[styles.spark, styles.spark3, { opacity: twinkleOpacity }]}
        />
        <Animated.View
          style={[styles.spark, styles.spark4, { opacity: twinkleOpacity }]}
        />
        <Animated.View
          style={[styles.spark, styles.spark5, { opacity: twinkleOpacity }]}
        />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        bounces={false}
      >
        <View style={styles.headerWrapper}>
          <AppHeader
            greeting={`Hi${firstName ? `, ${firstName}` : ""}`}
            subtitle={dailyQuote}
          />
        </View>

        {/* Featured row: Logout square + Featured card */}
        <Animated.View
          style={[styles.featuredWrap, { transform: [{ scale: pulseScale }] }]}
        >
          <View style={styles.featuredRow}>
            <TouchableOpacity
              activeOpacity={0.9}
              onPress={handleLogout}
              style={styles.logoutButton}
            >
              <LinearGradient
                colors={[
                  "rgba(255,255,255,0.20)",
                  "rgba(255,255,255,0.06)",
                  "rgba(255,255,255,0.03)",
                ]}
                start={{ x: 1, y: 0 }}
                end={{ x: 0, y: 1 }}
                style={StyleSheet.absoluteFill}
              />
              <Text style={[styles.featuredTap, styles.logoutIcon]}>🚪</Text>
              <Text style={styles.featuredTap}>Log out</Text>
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.9}
              onPress={() =>
                featuredWheelCard.route && router.push(featuredWheelCard.route)
              }
              style={[
                styles.featuredCard,
                { backgroundColor: featuredWheelCard.color },
              ]}
            >
              <LinearGradient
                colors={[
                  "rgba(255,255,255,0.26)",
                  "rgba(255,255,255,0.05)",
                  "rgba(255,255,255,0.02)",
                ]}
                start={{ x: 1, y: 0 }}
                end={{ x: 0, y: 1 }}
                style={styles.featuredOverlay}
              />

              <View style={styles.featuredLeft}>
                <Text style={styles.featuredKicker} numberOfLines={1}>
                  Featured
                </Text>
                <Text style={styles.featuredTitle} numberOfLines={1}>
                  {featuredWheelCard.label}
                </Text>
              </View>

              <View style={styles.featuredRight}>
                <View style={styles.featuredIconBubble}>
                  <Text style={styles.featuredIcon}>
                    {featuredWheelCard.icon}
                  </Text>
                </View>

                {featuredWheelCard.key === "bonus" && renderBadge("bonus")}
                {featuredWheelCard.key === "events" && renderBadge("events")}
                {featuredWheelCard.key !== "bonus" &&
                  featuredWheelCard.key !== "events" && (
                    <Text style={styles.featuredTap}>Tap</Text>
                  )}
              </View>
            </TouchableOpacity>
          </View>
        </Animated.View>

        {/* Hub */}
        <View style={[styles.hubWrap, { height: hubSize }]}>
          <View style={[styles.hubStage, { width: hubSize, height: hubSize }]}>
            {/* center logo */}
            <Animated.View
              style={[
                styles.hubCore,
                { transform: [{ translateY: logoFloatY }, { translateY: 16 }] },
              ]}
            >
              <Image
                source={require("../assets/images/FTG1.png")}
                style={styles.hubLogo}
                resizeMode="contain"
              />
            </Animated.View>

            {/* bubbles around logo */}
            {positionedHub.map(({ card, dx, dy }) => {
              const isFeatured = card.key === featuredWheelCard.key;
              const center = hubSize / 2;

              // true center positioning
              const left = center + dx - bubbleRadius;
              const top = center + dy - bubbleRadius;

              return (
                <TouchableOpacity
                  key={card.key}
                  activeOpacity={0.9}
                  onPress={() => card.route && router.push(card.route)}
                  style={[styles.hubItem, { left, top }]}
                >
                  <View
                    style={[
                      styles.hubBubble,
                      {
                        width: bubbleSize,
                        height: bubbleSize,
                        borderRadius: bubbleRadius,
                        backgroundColor: card.color,
                        opacity: isFeatured ? 1 : 0.94,
                        transform: [{ scale: isFeatured ? 1.08 : 1 }],
                      },
                    ]}
                  >
                    <LinearGradient
                      colors={[
                        "rgba(255,255,255,0.34)",
                        "rgba(255,255,255,0.08)",
                        "rgba(255,255,255,0.03)",
                      ]}
                      start={{ x: 1, y: 0 }}
                      end={{ x: 0, y: 1 }}
                      style={styles.hubBubbleOverlay}
                    />
                    <View style={styles.hubBubbleHighlight} />
                    <Text style={styles.hubEmoji}>{card.icon}</Text>
                    {renderBadge(card.key)}
                  </View>

                  <Text
                    style={[
                      styles.hubLabel,
                      isFeatured && styles.hubLabelFeatured,
                    ]}
                    numberOfLines={1}
                  >
                    {card.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Bottom area */}
        <View style={styles.bottomArea}>
          {/* Row 1: Survey + Messages (now same size/shape as Admin/Settings) */}
          <View style={styles.miniRow2}>
            <TouchableOpacity
              activeOpacity={0.9}
              onPress={() => router.push("/survey" as Href)}
              style={[styles.miniCardWide, { backgroundColor: "#6DA8FF" }]}
            >
              <Text style={styles.miniIcon}>📝</Text>
              {renderBadge("survey")}
              <Text style={styles.miniTitle}>Survey</Text>
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.9}
              onPress={() => router.push("/messages" as Href)}
              style={[
                styles.miniCardWide,
                { backgroundColor: Colors.cards.messages },
              ]}
            >
              <Text style={styles.miniIcon}>💬</Text>
              {renderBadge("messages")}
              <Text style={styles.miniTitle}>Messages</Text>
            </TouchableOpacity>
          </View>

          {/* Row 2: Admin + Settings */}
          <View style={styles.miniRow2}>
            <TouchableOpacity
              activeOpacity={0.9}
              onPress={() => router.push("/admin" as Href)}
              style={[
                styles.miniCardWide,
                { backgroundColor: Colors.cards.admin },
              ]}
            >
              <Text style={styles.miniIcon}>🛠️</Text>
              <Text style={styles.miniTitle}>Admin</Text>
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.9}
              onPress={() => router.push("/settings" as Href)}
              style={[
                styles.miniCardWide,
                { backgroundColor: Colors.cards.settings },
              ]}
            >
              <Text style={styles.miniIcon}>⚙️</Text>
              <Text style={styles.miniTitle}>Settings</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.streakInline}>
            <Text style={styles.streakPrimary}>🔥 {loginStreak}-Day Streak</Text>
            <Text style={styles.streakSecondary}>
              Points awarded for 5 consecutive days of login
            </Text>
          </View>
        </View>
      </ScrollView>
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

  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 44,
  },

  // background accents
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
    position: "relative",
    marginBottom: Spacing.sectionGap - 6,
  },

  featuredWrap: {
    marginBottom: 12,
    marginTop: -24,
  },

  featuredRow: {
    flexDirection: "row",
    gap: 10,
    alignItems: "center",
  },

  logoutButton: {
    width: 82,
    height: 82,
    borderRadius: 18,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
  },
  logoutIcon: {
    fontSize: 32,
    opacity: 0.95,
  },

  featuredCard: {
    flex: 1,
    height: 82,
    borderRadius: Radius.card,
    overflow: "hidden",
    paddingVertical: 10,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  featuredOverlay: {
    ...StyleSheet.absoluteFillObject,
  },
  featuredLeft: {
    flex: 1,
    paddingRight: 12,
  },
  featuredKicker: {
    color: "rgba(255,255,255,0.90)",
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.6,
    marginBottom: 4,
    textTransform: "uppercase",
  },
  featuredTitle: {
    color: Colors.textPrimary,
    fontSize: 18,
    fontWeight: "900",
    lineHeight: 20,
  },
  featuredRight: {
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  featuredIconBubble: {
    width: 46,
    height: 46,
    borderRadius: 16,
    backgroundColor: "rgba(0,0,0,0.18)",
    alignItems: "center",
    justifyContent: "center",
  },
  featuredIcon: {
    fontSize: 24,
  },
  featuredTap: {
    color: "rgba(255,255,255,0.92)",
    fontSize: 12,
    fontWeight: "800",
  },

  hubWrap: {
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 6,
    marginTop: 12,
  },
  hubStage: {
    alignItems: "center",
    justifyContent: "center",
  },

  hubCore: {
    position: "absolute",
    width: 93,
    height: 93,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.07)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.16)",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    shadowColor: "#000",
    shadowOpacity: 0.28,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 10 },
  },
  hubLogo: {
    width: 64,
    height: 64,
    opacity: 0.98,
  },

  hubItem: {
    position: "absolute",
    alignItems: "center",
    justifyContent: "flex-start",
  },
  hubBubble: {
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.16)",
    shadowColor: "#000",
    shadowOpacity: 0.28,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 10 },
  },
  hubBubbleOverlay: {
    ...StyleSheet.absoluteFillObject,
  },
  hubBubbleHighlight: {
    position: "absolute",
    top: 8,
    left: 10,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: "rgba(255,255,255,0.22)",
  },
  hubEmoji: {
    fontSize: 30,
  },
  hubLabel: {
    marginTop: 8,
    maxWidth: 124,
    color: "rgba(255,255,255,0.92)",
    fontSize: 12,
    fontWeight: "900",
    textAlign: "center",
    lineHeight: 14,
    textShadowColor: "rgba(0,0,0,0.35)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  hubLabelFeatured: {
    color: "#FFFFFF",
  },

  badgeDot: {
    position: "absolute",
    top: 8,
    right: 10,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#FF4D4F",
  },
  countBadge: {
    position: "absolute",
    bottom: 8,
    right: 8,
    minWidth: 22,
    height: 22,
    paddingHorizontal: 6,
    borderRadius: 11,
    backgroundColor: "#FF4D4F",
    alignItems: "center",
    justifyContent: "center",
  },

  // ✅ NEW: Events badge bottom-center
  countBadgeBottomCenter: {
    position: "absolute",
    bottom: 8,
    left: "50%",
    transform: [{ translateX: -11 }],
    minWidth: 22,
    height: 22,
    paddingHorizontal: 6,
    borderRadius: 11,
    backgroundColor: "#FF4D4F",
    alignItems: "center",
    justifyContent: "center",
  },

  countBadgeTopRight: {
    position: "absolute",
    top: 6,
    right: 6,
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

  bottomArea: {
    paddingBottom: 6,
    marginTop: 18,
  },
  miniRow2: {
    flexDirection: "row",
    gap: 10,
    justifyContent: "space-between",
    marginBottom: 12,
  },
  miniCardWide: {
    flex: 1,
    borderRadius: 18,
    paddingVertical: 11,
    paddingHorizontal: 12,
    overflow: "hidden",
    minHeight: 60,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
  },
  miniIcon: {
    fontSize: 18,
  },
  miniTitle: {
    color: Colors.textPrimary,
    fontSize: 13,
    fontWeight: "900",
    lineHeight: 15,
  },

  streakInline: {
    backgroundColor: "rgba(255,255,255,0.06)",
    borderRadius: 18,
    paddingVertical: 9,
    paddingHorizontal: 14,
    alignItems: "center",
    marginBottom: 8,
  },
  streakPrimary: {
    fontSize: 14,
    fontWeight: "800",
    color: Colors.textPrimary,
    marginBottom: 2,
  },
  streakSecondary: {
    fontSize: 12,
    color: "rgba(255,255,255,0.78)",
    textAlign: "center",
  },
});
