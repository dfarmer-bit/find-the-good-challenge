// app/admin/index.tsx
// FULL FILE REPLACEMENT
// Remove Assign Training card
// Route Send Alert card to: /admin/send-alert/alert

import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { AppHeader } from "../../components/AppHeader";
import {
  Colors,
  Components,
  Layout,
  Radius,
  Spacing,
  Typography,
} from "../../constants/theme";
import { supabase } from "../../lib/supabase";

type AdminCard = {
  key: string;
  label?: string;
  icon?: string;
  color: string;
  route?: string;
  count?: number;
};

export default function AdminDashboardScreen() {
  const router = useRouter();
  const [authorized, setAuthorized] = useState(false);

  const [gymCount, setGymCount] = useState(0);
  const [spotlightCount, setSpotlightCount] = useState(0);
  const [otherCount, setOtherCount] = useState(0);

  useEffect(() => {
    const init = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.replace("/");
        return;
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();

      if (profile?.role !== "admin") {
        Alert.alert(
          "Restricted Access",
          "For admin use only",
          [{ text: "OK", onPress: () => router.replace("/main") }],
          { cancelable: false }
        );
        return;
      }

      setAuthorized(true);
      loadGymCount();
      loadSpotlightBadge();
      loadOtherCount();
    };

    init();
  }, []);

  const loadGymCount = async () => {
    const { data: gymChallenges } = await supabase
      .from("challenges")
      .select("id")
      .eq("sub_category", "gym")
      .eq("active", true);

    if (!gymChallenges?.length) return;

    const gymIds = gymChallenges.map((c) => c.id);

    const { count } = await supabase
      .from("challenge_activity")
      .select("*", { count: "exact", head: true })
      .eq("status", "pending")
      .in("challenge_id", gymIds);

    setGymCount(count ?? 0);
  };

  const loadSpotlightBadge = async () => {
    const { data } = await supabase.rpc("spotlight_review_required");
    setSpotlightCount(data === true ? 1 : 0);
  };

  const loadOtherCount = async () => {
    const { count } = await supabase
      .from("challenge_activity")
      .select(
        `
        id,
        challenges!inner (
          challenge_rules!inner (
            requires_approval
          )
        )
      `,
        { count: "exact", head: true }
      )
      .eq("status", "pending")
      .eq("challenges.challenge_rules.requires_approval", true);

    setOtherCount(count ?? 0);
  };

  const cards: AdminCard[] = useMemo(
    () => [
      {
        key: "gym",
        label: "Gym\nReview",
        icon: "🏋️",
        color: Colors.cards.complete,
        route: "/admin/gym-review",
        count: gymCount,
      },
      {
        key: "spotlight",
        label: "Spotlight\nReview",
        icon: "🌟",
        color: Colors.cards.journal,
        route: "/admin/spotlight-review",
        count: spotlightCount,
      },
      {
        key: "other",
        label: "Other\nReview",
        icon: "📋",
        color: Colors.cards.goals,
        route: "/admin/other-review",
        count: otherCount,
      },
      {
        key: "reassign-leader",
        label: "Re-Assign\nEvent Leader",
        icon: "🧑‍🏫",
        color: Colors.cards.admin,
        route: "/admin/events/reassign-leader",
      },
      {
        key: "add-event",
        label: "Add\nEvent",
        icon: "➕",
        color: "#2EC4B6",
        route: "/admin/events/create",
      },
      {
        key: "reports",
        label: "Reports",
        icon: "📊",
        color: "#6D2E8A",
        route: "/admin/reports",
      },
      {
        key: "send-message",
        label: "Send\nMessage",
        icon: "✉️",
        color: "#D67A2F",
        route: "/admin/messages/send",
      },

      // ✅ New: Send Alert
      {
        key: "send-alert",
        label: "Send\nAlert",
        icon: "🚨",
        color: "#E11D48",
        route: "/admin/send-alert/alert",
      },
    ],
    [gymCount, spotlightCount, otherCount]
  );

  if (!authorized) return null;

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        bounces={false}
      >
        <AppHeader />

        <View style={styles.headerText}>
          <Text style={styles.title}>Admin Dashboard</Text>
          <Text style={styles.subtitle}>Administrative tools</Text>
        </View>

        <View style={styles.cardGrid}>
          {cards.map((card) => (
            <TouchableOpacity
              key={card.key}
              onPress={() => card.route && router.push(card.route as any)}
              style={[styles.card, { backgroundColor: card.color }]}
              activeOpacity={card.route ? 0.85 : 1}
            >
              <>
                <LinearGradient
                  colors={[
                    "rgba(255,255,255,0.35)",
                    "rgba(255,255,255,0.05)",
                  ]}
                  start={{ x: 1, y: 0 }}
                  end={{ x: 0, y: 1 }}
                  style={styles.cornerBubble}
                >
                  <Text style={styles.bubbleIcon}>{card.icon}</Text>
                </LinearGradient>

                {typeof card.count === "number" && card.count > 0 && (
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>{card.count}</Text>
                  </View>
                )}

                <Text style={styles.cardTitle}>{card.label}</Text>
              </>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

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
    paddingHorizontal: Math.round(Spacing.screenPadding * 1.15),
  },

  scroll: {
    flex: 1,
  },

  scrollContent: {
    paddingBottom: Layout.bottomNavSpacing + 130,
  },

  headerText: {
    alignItems: "center",
    marginBottom: 12,
  },
  title: {
    fontSize: Typography.greeting.fontSize,
    fontWeight: Typography.greeting.fontWeight,
    color: Colors.textPrimary,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: Typography.quote.fontSize,
    color: Colors.textSecondary,
  },

  cardGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    rowGap: Spacing.gridGap,
  },

  card: {
    flexBasis: "47%",
    height: 107,
    borderRadius: Radius.card,
    paddingBottom: 10,
    paddingLeft: 10,
    justifyContent: "flex-end",
    overflow: "hidden",
  },

  cornerBubble: {
    position: "absolute",
    top: -19,
    right: -19,
    width: 77,
    height: 77,
    borderRadius: 22,
    justifyContent: "flex-end",
    alignItems: "flex-start",
    padding: 14,
  },
  bubbleIcon: {
    fontSize: 20,
  },

  badge: {
    position: "absolute",
    top: 7,
    right: 9,
    backgroundColor: "#E63946",
    borderRadius: 12,
    minWidth: 22,
    height: 22,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 6,
  },
  badgeText: {
    color: "#FFF",
    fontSize: 12,
    fontWeight: "700",
  },

  cardTitle: {
    fontSize: Typography.cardTitle.fontSize,
    fontWeight: Typography.cardTitle.fontWeight,
    lineHeight: Typography.cardTitle.lineHeight,
    color: Colors.textPrimary,
  },

  bottomBar: {
    position: "absolute",
    bottom: Layout.bottomNavSpacing,
    left: Math.round(Spacing.screenPadding * 1.15),
    right: Math.round(Spacing.screenPadding * 1.15),
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
