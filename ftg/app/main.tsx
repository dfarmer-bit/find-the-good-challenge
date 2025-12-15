import { Ionicons } from "@expo/vector-icons";
import { useRouter, type Href } from "expo-router";
import { useEffect, useState } from "react";
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

export default function HomeScreen() {
  const router = useRouter();
  const screenWidth = Dimensions.get("window").width;

  const [loginStreak, setLoginStreak] = useState<number>(0);
  const [unreadCount, setUnreadCount] = useState<number>(0);

  const baseSize =
    (screenWidth - Spacing.screenPadding * 2 - Spacing.gridGap) / 2;

  const cardWidth = baseSize * Layout.cardScale;
  const cardHeight = cardWidth * 0.9;

  useEffect(() => {
    const loadData = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) return;

      const today = new Date().toISOString().split("T")[0];

      const { data: existing } = await supabase
        .from("challenge_activity")
        .select("id")
        .eq("user_id", user.id)
        .eq("activity_type", "login_streak")
        .eq("occurred_date", today)
        .maybeSingle();

      if (!existing) {
        await supabase.from("challenge_activity").insert({
          user_id: user.id,
          activity_type: "login_streak",
          occurred_date: today,
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
    };

    loadData();
  }, []);

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
    { label: "Events", icon: "📅", color: Colors.cards.goals },
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
      route: "/challenges/goals", // 👈 added
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
        <Text style={styles.greeting}>Hi, Friend</Text>
        <Text style={styles.quote}>Small steps count.</Text>
      </View>

      <View style={styles.cardGrid}>
        {cards.map((card, index) => {
          const isMessages = card.label === "Messages";

          return (
            <TouchableOpacity
              key={index}
              onPress={() => {
                if (card.route) router.push(card.route);
              }}
              style={[
                styles.card,
                {
                  width: cardWidth,
                  height: cardHeight,
                  backgroundColor: card.color,
                },
              ]}
            >
              {isMessages && unreadCount > 0 && <View style={styles.badge} />}

              <Text style={styles.cardEmoji}>{card.icon}</Text>
              <Text style={styles.cardTitle}>{card.label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <View style={styles.streakBox}>
        <Text style={styles.streakPrimary}>🔥 {loginStreak}-Day Streak</Text>
        <Text style={styles.streakSecondary}>
          Earn points every 5 consecutive days
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
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: Spacing.cardPadding,
  },
  badge: {
    position: "absolute",
    top: 10,
    right: 12,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#FF4D4F",
  },
  cardEmoji: {
    fontSize: 26,
    marginBottom: 4,
  },
  cardTitle: {
    fontSize: Typography.cardTitle.fontSize,
    fontWeight: Typography.cardTitle.fontWeight,
    lineHeight: Typography.cardTitle.lineHeight,
    color: Colors.textPrimary,
    textAlign: "center",
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
