import { useEffect, useState } from "react";
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

type Styles = {
  container: ViewStyle;
  sideSlot: ViewStyle;
  centerSlot: ViewStyle;
  logo: ImageStyle;
  pointsNumber: TextStyle;
  pointsLabel: TextStyle;
};

export function AppHeader() {
  const [points, setPoints] = useState<number | null>(null);

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
        const total = data.reduce(
          (sum, row) => sum + (row.points || 0),
          0
        );
        setPoints(total);
      }
    };

    loadPoints();
  }, []);

  return (
    <View style={styles.container}>
      <View style={styles.sideSlot} />

      <View style={styles.centerSlot}>
        <Image source={FTGLogo} style={styles.logo} resizeMode="contain" />
      </View>

      <View style={styles.sideSlot}>
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
    paddingHorizontal: 16,
    paddingVertical: 14,
    flexDirection: "row",
    alignItems: "center",

    // ✅ NEW — space BELOW header (global fix)
    marginBottom: 24,
  },

  sideSlot: {
    width: 72,
    alignItems: "center",
  },

  centerSlot: {
    flex: 1,
    alignItems: "center",
  },

  logo: {
    width: Layout.logo.width,
    height: Layout.logo.height,
  },

  pointsNumber: {
    fontSize: Typography.pointsNumber.fontSize,
    fontWeight: Typography.pointsNumber.fontWeight,
    color: Colors.textPrimary,
  },

  pointsLabel: {
    fontSize: Typography.pointsLabel.fontSize,
    color: Colors.textSecondary,
    marginTop: -2,
  },
});
