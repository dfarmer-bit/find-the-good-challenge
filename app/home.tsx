import { router } from "expo-router";
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import BottomBanner from "../components/BottomBanner";
import { theme } from "../theme";

type CardItem = {
  label: string;
  icon: string;
  color: string;
};

export default function Home() {
  const cards: CardItem[] = [
    { label: "Physical Health", icon: "💪", color: theme.colors.blue },
    { label: "Mental Health", icon: "🧠", color: theme.colors.pink },
    { label: "Emotional Health", icon: "❤️", color: theme.colors.green },
    { label: "Spiritual Health", icon: "🕊️", color: theme.colors.yellow },
    { label: "Quizzes", icon: "❓", color: theme.colors.purple },
    { label: "Writing Assignments", icon: "✍️", color: theme.colors.blue },
    { label: "Journal & Goals", icon: "📝", color: theme.colors.pink },
    { label: "Lunch & Learns", icon: "🍽️", color: theme.colors.green },
    { label: "Mission Statement", icon: "🚀", color: theme.colors.yellow },
    { label: "My Messages", icon: "💬", color: theme.colors.purple },
  ];

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={styles.container}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backButtonText}>⬅️ Back</Text>
        </TouchableOpacity>

        <Text style={styles.title}>Find the Good Challenge</Text>
        <Text style={styles.subtitle}>Choose an area to begin</Text>

        <View style={styles.grid}>
          {cards.map((item, index) => (
            <TouchableOpacity
              key={index}
              style={[styles.card, { backgroundColor: item.color }]}
            >
              <Text style={styles.emoji}>{item.icon}</Text>
              <Text style={styles.cardText}>{item.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

      {/* FIXED BOTTOM BANNER */}
      <BottomBanner />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  container: {
    paddingVertical: 30,
    paddingHorizontal: 20,
    backgroundColor: theme.colors.navy,
    minHeight: "100%",
    paddingBottom: 100,
  },
  backButton: {
    alignSelf: "flex-start",
    backgroundColor: theme.colors.blue,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 12,
    marginTop: 12,
    marginBottom: 10,
  },
  backButtonText: {
    color: "white",
    fontSize: 14,
    fontWeight: "bold",
  },
  title: {
    fontSize: 26,
    color: "white",
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 15,
    color: "white",
    opacity: 0.9,
    textAlign: "center",
    marginBottom: 20,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  card: {
    width: theme.card.width,
    height: theme.card.height,
    borderRadius: theme.card.borderRadius,
    padding: theme.card.padding,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 18,
  },
  emoji: {
    fontSize: theme.emoji.size,
    marginBottom: 6,
  },
  cardText: {
    color: "white",
    fontSize: theme.text.titleSize,
    fontWeight: "bold",
    textAlign: "center",
  },
});
