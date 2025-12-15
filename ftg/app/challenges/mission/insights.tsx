// app/challenges/mission/insights.tsx

import { AppHeader } from "@/components/AppHeader";
import {
    Colors,
    Components,
    Layout,
    Radius,
    Spacing,
    Typography,
} from "@/constants/theme";
import { supabase } from "@/lib/supabase";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";

export default function MissionInsightsScreen() {
  const router = useRouter();
  const [reflection, setReflection] = useState<string | null>(null);

  useEffect(() => {
    const loadInsights = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) return;

      const { data } = await supabase
        .from("personal_missions")
        .select("reflection_text")
        .eq("user_id", user.id)
        .maybeSingle();

      if (data?.reflection_text) {
        setReflection(data.reflection_text);
      }
    };

    loadInsights();
  }, []);

  return (
    <View style={styles.container}>
      <AppHeader />

      <View style={styles.headerText}>
        <Text style={styles.title}>Mission Insights</Text>
        <Text style={styles.subtitle}>
          A reflection based on your responses
        </Text>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.card}>
          <Text style={styles.reflectionText}>
            {reflection ??
              "Your mission insights will appear here once they are available."}
          </Text>
        </View>
      </ScrollView>

      <View style={styles.bottomBar}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Text style={styles.backIcon}>⬅️</Text>
          <Text style={styles.backText}>Back</Text>
        </TouchableOpacity>
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
    marginBottom: 20,
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

  scrollContent: {
    paddingBottom: 120,
  },

  card: {
    backgroundColor: Colors.cards.default,
    borderRadius: Radius.card,
    padding: Spacing.cardPadding,
  },

  reflectionText: {
    fontSize: 15,
    lineHeight: 22,
    color: Colors.textPrimary,
  },

  bottomBar: {
    position: "absolute",
    bottom: Layout.bottomNavSpacing,
    left: Spacing.screenPadding,
    right: Spacing.screenPadding,
    alignItems: "center",
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
