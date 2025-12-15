// ftg/constants/theme.ts

export const Colors = {
  background: "#0E2A66",

  accentPrimary: "#3F7FFF",

  cards: {
    complete: "#4CC9FF",
    journal: "#A16EFF",
    goals: "#FF9F1C",
    messages: "#38E68E",
    admin: "#FF6B8A",
    settings: "#FFD447",
  },

  textPrimary: "#FFFFFF",
  textSecondary: "rgba(255,255,255,0.85)",
};

export const Spacing = {
  screenPadding: 20,
  sectionGap: 20,
  gridGap: 12,

  // Internal card padding only (NOT sizing)
  cardPadding: 6,
};

export const Radius = {
  card: 12,
  container: 20,
  pill: 999,
};

export const Typography = {
  greeting: {
    fontSize: 25,
    fontWeight: "700" as const,
  },
  quote: {
    fontSize: 15,
  },
  cardTitle: {
    fontSize: 13,
    fontWeight: "700" as const,
    lineHeight: 16,
  },
  pointsNumber: {
    fontSize: 44,
    fontWeight: "800" as const,
  },
  pointsLabel: {
    fontSize: 13,
  },
  footer: {
    fontSize: 14,
  },
};

export const Layout = {
  logo: {
    width: 210,
    height: 90,
  },

  // Card SCALE ONLY — geometry decided in pages
  cardScale: 0.75,

  // Standard screen spacing
  topScreenPadding: 60,
  bottomNavSpacing: 18,
};

export const Components = {
  backButton: {
    paddingVertical: 12,
    paddingHorizontal: 18,
    backgroundColor: Colors.accentPrimary,
    borderRadius: Radius.pill,
  },
};
