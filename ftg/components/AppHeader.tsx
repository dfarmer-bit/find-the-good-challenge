// components/AppHeader.tsx
// FULL FILE REPLACEMENT

import { useEffect, useMemo, useState } from "react";
import {
  Image,
  ImageStyle,
  StyleSheet,
  Text,
  TextStyle,
  View,
  ViewStyle,
} from "react-native";
import { Colors, Layout, Radius, Typography } from "../constants/theme";
import { supabase } from "../lib/supabase";

// Expo + TS safe asset reference
const FTGLogo = require("../assets/images/FTG1.png");

type AppHeaderProps = {
  greeting?: string;
  subtitle?: string;
};

type Styles = {
  container: ViewStyle;
  leftSlot: ViewStyle;
  centerSlot: ViewStyle;
  rightSlot: ViewStyle;
  logo: ImageStyle;
  greeting: TextStyle;
  subtitle: TextStyle;
  pointsNumber: TextStyle;
  pointsLabel: TextStyle;
};

export function AppHeader({ greeting, subtitle }: AppHeaderProps) {
  const [points, setPoints] = useState<number | null>(null);

  const showCenterText = useMemo(() => {
    return Boolean(
      (greeting && greeting.trim()) || (subtitle && subtitle.trim())
    );
  }, [greeting, subtitle]);

  useEffect(() => {
    const loadPoints = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase
        .from("points_ledger")
        .select("points")
        .eq("user_id", user.id);

      if (data) {
        const total = data.reduce((sum, row) => sum + (row.points || 0), 0);
        setPoints(total);
      }
    };

    loadPoints();
  }, []);

  return (
    <View style={styles.container}>
      {/* Left: Logo */}
      <View style={styles.leftSlot}>
        <Image source={FTGLogo} style={styles.logo} resizeMode="contain" />
      </View>

      {/* Center: Greeting + Quote (optional) */}
      <View style={styles.centerSlot}>
        {showCenterText ? (
          <>
            <Text style={styles.greeting} numberOfLines={1}>
              {greeting ?? ""}
            </Text>
            <Text style={styles.subtitle} numberOfLines={1}>
              {subtitle ?? ""}
            </Text>
          </>
        ) : null}
      </View>

      {/* Right: Points */}
      <View style={styles.rightSlot}>
        <Text
          style={styles.pointsNumber}
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={0.6}
        >
          {points === null ? "—" : points}
        </Text>
        <Text style={styles.pointsLabel}>Points</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create<Styles>({
  container: {
    backgroundColor: Colors.accentPrimary,
    borderRadius: Radius.container,
    paddingHorizontal: 14, // tighter so logo can sit further left
    paddingVertical: 14, // keep height stable
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 24,
  },

  // Make logo truly left-aligned, no extra padding
  leftSlot: {
    width: 56, // narrower so center has room (prevents overlap)
    alignItems: "flex-start",
    justifyContent: "center",
  },

  // Center gets the real remaining space
  centerSlot: {
    flex: 1,
    minWidth: 0, // critical: allows text to shrink/ellipsize instead of overlapping
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 8,
  },

  rightSlot: {
    width: 72,
    alignItems: "flex-end",
    justifyContent: "center",
  },

  // Smaller logo footprint + pushed visually left by container padding
  logo: {
    width: 80,
    height: 80,
  },

  // Bigger "Hi Dennis"
  greeting: {
    color: Colors.textPrimary,
    fontSize: 18.5,
    fontWeight: "900",
    lineHeight: 19,
    includeFontPadding: false,
    textAlign: "center",
  },

  subtitle: {
    color: Colors.textSecondary,
    fontSize: 11.5,
    fontWeight: "700",
    lineHeight: 13,
    includeFontPadding: false,
    marginTop: 2,
    textAlign: "center",
  },

  pointsNumber: {
    fontSize: Typography.pointsNumber.fontSize,
    fontWeight: Typography.pointsNumber.fontWeight,
    color: Colors.textPrimary,
    textAlign: "right",
  },

  pointsLabel: {
    fontSize: Typography.pointsLabel.fontSize,
    color: Colors.textSecondary,
    marginTop: -2,
    textAlign: "right",
  },
});
