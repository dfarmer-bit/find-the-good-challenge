import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  Alert,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { AppHeader } from "../../components/AppHeader";
import {
  Colors,
  Components,
  Layout,
  Radius,
  Spacing,
  Typography,
} from "../../constants/theme";
import { supabase } from "../../lib/supabase";

type Message = {
  id: string;
  title: string;
  body: string;
  is_read: boolean;
  is_locked: boolean;
  created_at: string;
};

export default function MessagesScreen() {
  const router = useRouter();
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user || !mounted) return;

      const { data } = await supabase
        .from("messages")
        .select(
          "id, title, body, is_read, is_locked, created_at"
        )
        .eq("recipient_id", user.id)
        .order("created_at", { ascending: false });

      if (mounted) {
        setMessages(data ?? []);
        setLoading(false);
      }
    };

    load();

    const { data: sub } =
      supabase.auth.onAuthStateChange(() => {
        load();
      });

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  const markRead = async (id: string) => {
    await supabase
      .from("messages")
      .update({ is_read: true })
      .eq("id", id);

    setMessages((prev) =>
      prev.map((m) =>
        m.id === id ? { ...m, is_read: true } : m
      )
    );
  };

  const lockMessage = (id: string) => {
    Alert.alert(
      "Save Message",
      "Saved messages cannot be deleted. Continue?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Save",
          onPress: async () => {
            await supabase
              .from("messages")
              .update({ is_locked: true })
              .eq("id", id);

            setMessages((prev) =>
              prev.map((m) =>
                m.id === id
                  ? { ...m, is_locked: true }
                  : m
              )
            );
          },
        },
      ]
    );
  };

  const deleteMessage = (id: string, locked: boolean) => {
    if (locked) {
      Alert.alert(
        "Locked",
        "This message is saved and cannot be deleted."
      );
      return;
    }

    Alert.alert(
      "Delete Message",
      "This cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            await supabase
              .from("messages")
              .delete()
              .eq("id", id);

            setMessages((prev) =>
              prev.filter((m) => m.id !== id)
            );
          },
        },
      ]
    );
  };

  return (
    <View style={styles.container}>
      <AppHeader />

      <View style={styles.header}>
        <Text style={styles.title}>💬 Messages</Text>
        <Text style={styles.subtitle}>
          System notifications & point records
        </Text>
      </View>

      {loading ? (
        <Text style={styles.loading}>Loading…</Text>
      ) : messages.length === 0 ? (
        <Text style={styles.empty}>No messages yet.</Text>
      ) : (
        <FlatList
          data={messages}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingBottom: 140 }}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[
                styles.card,
                !item.is_read && styles.unread,
              ]}
              onPress={() => markRead(item.id)}
            >
              <Text style={styles.cardTitle}>
                {item.title}
              </Text>
              <Text style={styles.body}>{item.body}</Text>

              <View style={styles.actions}>
                {!item.is_locked && (
                  <TouchableOpacity
                    onPress={() =>
                      lockMessage(item.id)
                    }
                  >
                    <Text style={styles.save}>
                      🔒 Save
                    </Text>
                  </TouchableOpacity>
                )}

                <TouchableOpacity
                  onPress={() =>
                    deleteMessage(
                      item.id,
                      item.is_locked
                    )
                  }
                >
                  <Text
                    style={[
                      styles.delete,
                      item.is_locked && styles.disabled,
                    ]}
                  >
                    🗑 Delete
                  </Text>
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          )}
        />
      )}

      <View style={styles.bottomBar}>
        <TouchableOpacity
          style={Components.backButton}
          onPress={() => router.back()}
        >
          <Text style={styles.backText}>
            ⬅️ Back
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={Components.backButton}
          onPress={() => router.push("/main")}
        >
          <Text style={styles.backText}>
            🏠 Home
          </Text>
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
  header: { alignItems: "center", marginBottom: 16 },
  title: {
    fontSize: Typography.greeting.fontSize,
    fontWeight: Typography.greeting.fontWeight,
    color: Colors.textPrimary,
  },
  subtitle: { color: Colors.textSecondary },
  loading: {
    textAlign: "center",
    marginTop: 40,
    color: Colors.textSecondary,
  },
  empty: {
    textAlign: "center",
    marginTop: 60,
    color: Colors.textSecondary,
  },
  card: {
    backgroundColor: Colors.cards.messages,
    borderRadius: Radius.card,
    padding: 14,
    marginBottom: 12,
  },
  unread: {
    borderWidth: 1,
    borderColor: Colors.cards.complete,
  },
  cardTitle: {
    fontWeight: "700",
    color: Colors.textPrimary,
    marginBottom: 6,
  },
  body: { color: Colors.textPrimary },
  actions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 16,
    marginTop: 12,
  },
  save: { color: Colors.textPrimary, fontWeight: "600" },
  delete: { color: "#E63946", fontWeight: "600" },
  disabled: { opacity: 0.4 },
  bottomBar: {
    position: "absolute",
    bottom: Layout.bottomNavSpacing,
    left: Spacing.screenPadding,
    right: Spacing.screenPadding,
    flexDirection: "row",
    justifyContent: "center",
    gap: 16,
  },
  backText: {
    color: Colors.textPrimary,
    fontWeight: "700",
  },
});
