import { useRouter, type Href } from "expo-router";
import { useEffect, useState } from "react";
import {
  Alert,
  Dimensions,
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
  label: string;
  icon: string;
  color: string;
  route?: Href;
  count?: number;
};

export default function AdminDashboardScreen() {
  const router = useRouter();
  const screenWidth = Dimensions.get("window").width;
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

    if (!gymChallenges || gymChallenges.length === 0) {
      setGymCount(0);
      return;
    }

    const gymIds = gymChallenges.map((c) => c.id);

    const { count } = await supabase
      .from("challenge_activity")
      .select("*", { count: "exact", head: true })
      .eq("status", "pending")
      .in("challenge_id", gymIds);

    setGymCount(count ?? 0);
  };

  const loadSpotlightBadge = async () => {
    const { data } = await supabase.rpc(
      "spotlight_review_required"
    );

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

  if (!authorized) return null;

  const baseSize =
    (screenWidth - Spacing.screenPadding * 2 - Spacing.gridGap) / 2;

  const cardWidth = baseSize * Layout.cardScale;
  const cardHeight = cardWidth * 0.9;

  const cards: AdminCard[] = [
    {
      key: "gym",
      label: "GYM\nFor Review",
      icon: "🏋️",
      color: Colors.cards.complete,
      route: "/admin/gym-review",
      count: gymCount,
    },
    {
      key: "spotlight",
      label: "Spotlight\nFor Review",
      icon: "🌟",
      color: Colors.cards.journal,
      route: "/admin/spotlight-review",
      count: spotlightCount,
    },
    {
      key: "other",
      label: "Other\nFor Review",
      icon: "📋",
      color: Colors.cards.goals,
      route: "/admin/other-review",
      count: otherCount,
    },
    {
      key: "leader",
      label: "Assign\nLeader",
      icon: "🧑‍🏫",
      color: Colors.cards.admin,
    },
    {
      key: "points",
      label: "Point\nCorrection",
      icon: "➕",
      color: "#FF9F1C",
    },
    {
      key: "reports",
      label: "Reports",
      icon: "📊",
      color: "#6DA8FF",
    },
    {
      key: "notifications",
      label: "Notifications",
      icon: "🔔",
      color: Colors.cards.messages,
    },
    {
      key: "message",
      label: "Send\nMessage",
      icon: "✉️",
      color: "#9B5DE5",
    },
  ];

  return (
    <View style={styles.container}>
      <AppHeader />

      <View style={styles.headerText}>
        <Text style={styles.title}>Admin Dashboard</Text>
        <Text style={styles.subtitle}>Administrative tools</Text>
      </View>

      <View style={styles.cardGrid}>
        {cards.map((card) => (
          <TouchableOpacity
            key={card.key}
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
            {typeof card.count === "number" && card.count > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>
                  {card.count}
                </Text>
              </View>
            )}

            <Text style={styles.cardEmoji}>{card.icon}</Text>
            <Text style={styles.cardTitle}>{card.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

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
    marginBottom: 4,
    textAlign: "center",
  },
  subtitle: {
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
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: Spacing.cardPadding,
  },
  badge: {
    position: "absolute",
    top: 10,
    right: 12,
    backgroundColor: "#E63946",
    borderRadius: 12,
    minWidth: 24,
    height: 24,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 6,
  },
  badgeText: {
    color: "#FFF",
    fontSize: 12,
    fontWeight: "700",
  },
  cardEmoji: {
    fontSize: 26,
    marginBottom: 6,
  },
  cardTitle: {
    fontSize: Typography.cardTitle.fontSize,
    fontWeight: Typography.cardTitle.fontWeight,
    lineHeight: Typography.cardTitle.lineHeight,
    color: Colors.textPrimary,
    textAlign: "center",
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
