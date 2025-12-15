// app/challenges/mission/step-6.tsx

import { AppHeader } from "@/components/AppHeader";
import {
  Colors,
  Components,
  Layout,
  Radius,
  Spacing,
} from "@/constants/theme";
import { useRouter, type Href } from "expo-router";
import { useState } from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useMission } from "./MissionContext";

const DOMAINS = [
  "Work / Career",
  "Home / Family",
  "Health / Wellness",
  "Relationships",
  "Personal Growth",
  "Community Service",
  "Somewhere Else",
];

export default function MissionStep6() {
  const router = useRouter();
  const { setAnswer, answers } = useMission();

  const [selected, setSelected] = useState<string | null>(
    answers.step6_domain ?? null
  );

  const canContinue = !!selected;

  const handleContinue = () => {
    if (!selected) return;
    setAnswer("step6_domain", selected);
    router.push("./step-7" as Href);
  };

  return (
    <View style={styles.screen}>
      <AppHeader />

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.progress}>Step 6 of 10</Text>

        <Text style={styles.title}>
          Where would defining my personal mission have the most impact right now?
        </Text>

        <Text style={styles.subtitle}>
          This helps focus your mission where it can make the biggest difference.
        </Text>

        <View style={styles.grid}>
          {DOMAINS.map((item) => {
            const isSelected = selected === item;

            return (
              <TouchableOpacity
                key={item}
                style={[styles.card, isSelected && styles.cardSelected]}
                onPress={() => setSelected(item)}
                activeOpacity={0.85}
              >
                <Text
                  style={[
                    styles.cardText,
                    isSelected && styles.cardTextSelected,
                  ]}
                >
                  {item}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>

      {/* FOOTER */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={Components.backButton}
          onPress={() => router.back()}
        >
          <Text style={styles.backText}>⬅ Back</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.continueButton,
            !canContinue && styles.continueDisabled,
          ]}
          disabled={!canContinue}
          onPress={handleContinue}
        >
          <Text style={styles.continueText}>Continue</Text>
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

  scroll: {
    paddingHorizontal: Spacing.screenPadding,
    paddingBottom: 140,
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
    marginBottom: 6,
  },

  subtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginBottom: 20,
  },

  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    rowGap: 14,
  },

  card: {
    width: "48%",
    backgroundColor: Colors.cards.journal,
    borderRadius: Radius.card,
    paddingVertical: 20,
    paddingHorizontal: 12,
    alignItems: "center",
    justifyContent: "center",
  },

  cardSelected: {
    backgroundColor: Colors.cards.complete,
  },

  cardText: {
    color: Colors.textPrimary,
    fontSize: 15,
    fontWeight: "600",
    textAlign: "center",
  },

  cardTextSelected: {
    fontWeight: "700",
  },

  footer: {
    position: "absolute",
    bottom: Layout.bottomNavSpacing,
    left: Spacing.screenPadding,
    right: Spacing.screenPadding,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  backText: {
    color: Colors.textPrimary,
    fontSize: 16,
    fontWeight: "700",
  },

  continueButton: {
    backgroundColor: Colors.cards.complete,
    borderRadius: Radius.card,
    paddingHorizontal: 22,
    paddingVertical: 12,
  },

  continueDisabled: {
    opacity: 0.4,
  },

  continueText: {
    color: Colors.textPrimary,
    fontSize: 16,
    fontWeight: "700",
  },
});
