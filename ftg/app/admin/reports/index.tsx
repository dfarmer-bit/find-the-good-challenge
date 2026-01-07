import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import React from "react";
import { Dimensions, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { AppHeader } from "../../../components/AppHeader";
import { Colors, Layout, Radius, Spacing, Typography } from "../../../constants/theme";

type ReportCard = {
  label: string;
  icon: string;
  color: string;
  route: string;
};

export default function AdminReportsIndex() {
  const router = useRouter();
  const screenWidth = Dimensions.get("window").width;

  const baseSize =
    (screenWidth - Spacing.screenPadding * 2 - Spacing.gridGap) / 2;

  const cardWidth = baseSize * Layout.cardScale;
  const cardHeight = cardWidth * 0.9;

  const cards: ReportCard[] = [
    {
      label: "Points\nLedger",
      icon: "🧾",
      color: Colors.cards.complete,
      route: "/admin/reports/points-ledger",
    },
    {
      label: "Challenge\nActivity",
      icon: "📌",
      color: Colors.cards.goals,
      route: "/admin/reports/challenge-activity",
    },
    {
      label: "Participation\nSummary",
      icon: "👥",
      color: Colors.cards.journal,
      route: "/admin/reports/participation-summary",
    },
    {
      label: "Events\nAttendance",
      icon: "📅",
      color: Colors.cards.messages,
      route: "/admin/reports/events-attendance",
    },
    {
      label: "Bonus\nPoints",
      icon: "🎁",
      color: "#FF5DA2",
      route: "/admin/reports/bonus-points",
    },
    {
      label: "Leaderboard\nSnapshot",
      icon: "🏆",
      color: Colors.cards.admin,
      route: "/admin/reports/leaderboard-snapshot",
    },
  ];

  return (
    <View style={styles.container}>
      <View style={styles.headerWrapper}>
        <AppHeader />
      </View>

      <View style={styles.titleBlock}>
        <Text style={styles.title}>Reports</Text>
        <Text style={styles.subtitle}>View, export, and share admin reports</Text>
      </View>

      <View style={styles.cardGrid}>
        {cards.map((card, idx) => (
          <TouchableOpacity
            key={idx}
            onPress={() => router.push(card.route as any)}
            style={[
              styles.card,
              { width: cardWidth, height: cardHeight, backgroundColor: card.color },
            ]}
            activeOpacity={0.9}
          >
            <LinearGradient
              colors={["rgba(255,255,255,0.35)", "rgba(255,255,255,0.05)"]}
              start={{ x: 1, y: 0 }}
              end={{ x: 0, y: 1 }}
              style={styles.cornerBubble}
            >
              <Text style={styles.bubbleIcon}>{card.icon}</Text>
            </LinearGradient>

            <Text style={styles.cardTitle}>{card.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.bottomHint}>
        <Text style={styles.hintText}>Exports available inside each report.</Text>
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
    marginBottom: Spacing.sectionGap,
  },
  titleBlock: {
    alignItems: "center",
    marginBottom: 14,
  },
  title: {
    fontSize: 22,
    fontWeight: "800",
    color: Colors.textPrimary,
    textAlign: "center",
    marginBottom: 4,
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
    paddingTop: 4,
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
  cardTitle: {
    fontSize: Typography.cardTitle.fontSize,
    fontWeight: Typography.cardTitle.fontWeight,
    lineHeight: Typography.cardTitle.lineHeight,
    color: Colors.textPrimary,
    textAlign: "left",
  },
  bottomHint: {
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
  hintText: {
    fontSize: 13,
    color: Colors.textSecondary,
    textAlign: "center",
  },
});
