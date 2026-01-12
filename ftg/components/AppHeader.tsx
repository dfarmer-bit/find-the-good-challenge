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
import { Colors, Radius, Typography } from "../constants/theme";
import { supabase } from "../lib/supabase";

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

      {/* Center: Greeting + Subtitle */}
      <View style={styles.centerSlot}>
        {showCenterText ? (
          <>
            <Text style={styles.greeting} numberOfLines={1}>
              {greeting ?? ""}
            </Text>
            <Text style={styles.subtitle}>
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

const LOGO_W = 80;
const RIGHT_W = 84;

const styles = StyleSheet.create<Styles>({
  container: {
    backgroundColor: Colors.accentPrimary,
    borderRadius: Radius.container,
    paddingHorizontal: 14,
    paddingVertical: 14,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 24,
  },

  leftSlot: {
    width: LOGO_W,
    alignItems: "flex-start",
    justifyContent: "center",
  },

  centerSlot: {
    flex: 1,
    minWidth: 0,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 10,
  },

  rightSlot: {
    width: RIGHT_W,
    alignItems: "flex-end",
    justifyContent: "center",
  },

  logo: {
    width: LOGO_W,
    height: 80,
  },

  greeting: {
    color: Colors.textPrimary,
    fontSize: 18.5,
    fontWeight: "900",
    lineHeight: 19,
    includeFontPadding: false,
    textAlign: "center",
  },

  // ✅ subtitle now wraps automatically
  subtitle: {
    color: Colors.textSecondary,
    fontSize: 11.5,
    fontWeight: "700",
    lineHeight: 14,
    includeFontPadding: false,
    marginTop: 2,
    textAlign: "center",
    maxWidth: "100%",
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
