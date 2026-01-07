// app/admin/index.tsx
// FULL FILE REPLACEMENT
// Change:
// - Remove the duplicate Reports card
// - Replace bottom two cards (Reports duplicate + placeholder) with ONE full-width animated FTG1.png logo card
// - Animate on screen load + every 30 seconds

import { LinearGradient } from "expo-linear-gradient";
import { useRouter, type Href } from "expo-router";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  Animated,
  Image,
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
  route?: Href;
  count?: number;
};

export default function AdminDashboardScreen() {
  const router = useRouter();
  const [authorized, setAuthorized] = useState(false);

  const [gymCount, setGymCount] = useState(0);
  const [spotlightCount, setSpotlightCount] = useState(0);
  const [otherCount, setOtherCount] = useState(0);

  // Logo animation
  const logoScale = useRef(new Animated.Value(0.98)).current;
  const logoOpacity = useRef(new Animated.Value(0.9)).current;

  const pulseLogo = () => {
    logoScale.setValue(0.98);
    logoOpacity.setValue(0.9);

    Animated.sequence([
      Animated.parallel([
        Animated.timing(logoScale, {
          toValue: 1.02,
          duration: 650,
          useNativeDriver: true,
        }),
        Animated.timing(logoOpacity, {
          toValue: 1,
          duration: 650,
          useNativeDriver: true,
        }),
      ]),
      Animated.parallel([
        Animated.timing(logoScale, {
          toValue: 1.0,
          duration: 650,
          useNativeDriver: true,
        }),
        Animated.timing(logoOpacity, {
          toValue: 0.92,
          duration: 650,
          useNativeDriver: true,
        }),
      ]),
    ]).start();
  };

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

  useEffect(() => {
    if (!authorized) return;

    // animate once when screen becomes active
    pulseLogo();

    const id = setInterval(() => {
      pulseLogo();
    }, 30000);

    return () => clearInterval(id);
  }, [authorized]);

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
      // Reports removed for now (admin-only feature to be added later)
    ],
    [gymCount, spotlightCount, otherCount]
  );

  if (!authorized) return null;

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
            style={[styles.card, { backgroundColor: card.color }]}
            activeOpacity={card.route ? 0.85 : 1}
          >
            <>
              <LinearGradient
                colors={["rgba(255,255,255,0.35)", "rgba(255,255,255,0.05)"]}
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

        {/* Full-width animated logo card */}
        <View style={[styles.card, styles.cardFullWidth, styles.logoCard]}>
          <Animated.View
            style={{
              transform: [{ scale: logoScale }],
              opacity: logoOpacity,
            }}
          >
            <Image
              source={require("../../assets/images/FTG1.png")}
              style={styles.logo}
              resizeMode="contain"
            />
          </Animated.View>
        </View>
      </View>

      <View style={styles.bottomBar}>
        <View style={styles.bottomButtonRow}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
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
    flexBasis: "48%",
    height: 126,
    borderRadius: Radius.card,
    paddingBottom: 12,
    paddingLeft: 12,
    justifyContent: "flex-end",
    overflow: "hidden",
  },
  cardFullWidth: {
    flexBasis: "100%",
    paddingLeft: 0,
    paddingBottom: 0,
    justifyContent: "center",
    alignItems: "center",
  },
  logoCard: {
    backgroundColor: "rgba(255,255,255,0.06)",
  },
  cornerBubble: {
    position: "absolute",
    top: -22,
    right: -22,
    width: 90,
    height: 90,
    borderRadius: 26,
    justifyContent: "flex-end",
    alignItems: "flex-start",
    padding: 16,
  },
  bubbleIcon: {
    fontSize: 22,
  },
  logo: {
    width: 120,
    height: 120,
    opacity: 0.9,
  },
  badge: {
    position: "absolute",
    top: 8,
    right: 10,
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
