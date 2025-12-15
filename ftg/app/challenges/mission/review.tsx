import { AppHeader } from "@/components/AppHeader";
import {
  Colors,
  Components,
  Layout,
  Radius,
  Spacing,
} from "@/constants/theme";
import { supabase } from "@/lib/supabase";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

export default function MissionReview() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [missionText, setMissionText] = useState<string | null>(null);

  useEffect(() => {
    const loadMission = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setLoading(false);
        return;
      }

      const { data } = await supabase
        .from("personal_missions")
        .select("mission_text")
        .eq("user_id", user.id)
        .maybeSingle();

      if (data?.mission_text) {
        // Collapse newlines into a clean paragraph
        const normalized = data.mission_text
          .replace(/\n+/g, " ")
          .replace(/\s+/g, " ")
          .trim();

        setMissionText(normalized);
      } else {
        setMissionText(null);
      }

      setLoading(false);
    };

    loadMission();
  }, []);

  if (loading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <AppHeader />

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.progress}>Your Mission</Text>

        <Text style={styles.title}>
          Personal Mission Statement
        </Text>

        <View style={styles.missionCard}>
          <Text style={styles.missionText}>
            {missionText || "No mission statement found."}
          </Text>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity
          style={Components.backButton}
          onPress={() => router.back()}
        >
          <Text style={styles.backText}>⬅ Back</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Colors.background,
    paddingTop: Layout.topScreenPadding,
  },

  loading: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },

  scroll: {
    paddingHorizontal: Spacing.screenPadding,
    paddingBottom: 120,
  },

  progress: {
    marginTop: 16,
    marginBottom: 8,
    color: Colors.textSecondary,
    fontSize: 13,
  },

  title: {
    fontSize: 22,
    fontWeight: "700",
    color: Colors.textPrimary,
    marginBottom: 20,
  },

  missionCard: {
    backgroundColor: Colors.cards.journal,
    borderRadius: Radius.card,
    padding: 18,
  },

  missionText: {
    color: Colors.textPrimary,
    fontSize: 15,
    lineHeight: 23,
    textAlign: "left",
  },

  footer: {
    position: "absolute",
    bottom: Layout.bottomNavSpacing,
    left: Spacing.screenPadding,
    right: Spacing.screenPadding,
    alignItems: "center",
  },

  backText: {
    color: Colors.textPrimary,
    fontSize: 16,
    fontWeight: "700",
  },
});
