import { AppHeader } from "@/components/AppHeader";
import {
  Colors,
  Layout,
  Radius,
  Spacing,
  Typography,
  Components,
} from "@/constants/theme";
import { supabase } from "@/lib/supabase";
import { useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Alert,
} from "react-native";
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";

function escapeHtml(input: string) {
  return input
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

export default function MissionView() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [missionText, setMissionText] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    const load = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setMissionText(null);
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from("personal_missions")
        .select("mission_text")
        .eq("user_id", user.id)
        .maybeSingle();

      if (error) {
        setMissionText(null);
        setLoading(false);
        return;
      }

      setMissionText(data?.mission_text ?? null);
      setLoading(false);
    };

    load();
  }, []);

  const pdfHtml = useMemo(() => {
    const safeText = escapeHtml(missionText ?? "");
    return `
      <html>
        <head>
          <meta charset="utf-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1.0" />
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif; padding: 24px; color: #111; }
            h1 { font-size: 20px; margin: 0 0 16px; }
            .box { border: 1px solid #ddd; border-radius: 12px; padding: 16px; }
            p { font-size: 14px; line-height: 1.6; margin: 0; white-space: pre-wrap; }
          </style>
        </head>
        <body>
          <h1>Personal Mission Statement</h1>
          <div class="box">
            <p>${safeText}</p>
          </div>
        </body>
      </html>
    `;
  }, [missionText]);

  const handleExportPdf = async () => {
    if (!missionText) return;
    if (exporting) return;

    try {
      setExporting(true);

      const { uri } = await Print.printToFileAsync({
        html: pdfHtml,
        base64: false,
      });

      const canShare = await Sharing.isAvailableAsync();
      if (!canShare) {
        Alert.alert("Sharing not available on this device.");
        setExporting(false);
        return;
      }

      await Sharing.shareAsync(uri, {
        mimeType: "application/pdf",
        dialogTitle: "Export Mission Statement (PDF)",
        UTI: "com.adobe.pdf",
      });
    } catch (e) {
      Alert.alert("Export failed", "Please try again.");
    } finally {
      setExporting(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <AppHeader />

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.title}>Personal Mission Statement</Text>

        {missionText ? (
          <>
            <TouchableOpacity
              style={[styles.exportButton, exporting && styles.exportDisabled]}
              onPress={handleExportPdf}
              disabled={exporting}
              activeOpacity={0.85}
            >
              <Text style={styles.exportText}>
                {exporting ? "Preparing PDF..." : "Export / Share PDF"}
              </Text>
            </TouchableOpacity>

            <View style={styles.card}>
              <Text style={styles.missionText}>{missionText}</Text>
            </View>
          </>
        ) : (
          <View style={styles.emptyWrap}>
            <Text style={styles.emptyTitle}>No mission statement found</Text>
            <Text style={styles.emptySubtitle}>
              Start your mission statement to unlock viewing and insights.
            </Text>

            <TouchableOpacity
              style={[
                styles.startButton,
                { backgroundColor: Colors.cards.complete },
              ]}
              onPress={() => router.push("/challenges/mission/step-1")}
              activeOpacity={0.85}
            >
              <Text style={styles.startButtonText}>Start My Personal Mission</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      {/* Bottom Navigation (match Spiritual Health pattern) */}
      <View style={styles.bottomBar}>
        <View style={styles.bottomButtonRow}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Text style={styles.backIcon}>⬅️</Text>
            <Text style={styles.backText}>Back</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.push("/main")}
          >
            <Text style={styles.backIcon}>🏠</Text>
            <Text style={styles.backText}>Home</Text>
          </TouchableOpacity>
        </View>
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

  loading: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: Colors.background,
  },

  scroll: {
    paddingBottom: 180,
    paddingTop: 28,
  },

  title: {
    fontSize: Typography.greeting.fontSize,
    fontWeight: Typography.greeting.fontWeight,
    color: Colors.textPrimary,
    textAlign: "center",
    marginBottom: 14,
  },

  exportButton: {
    backgroundColor: Colors.cards.complete,
    borderRadius: Radius.card,
    paddingVertical: 12,
    alignItems: "center",
    marginBottom: 14,
  },

  exportDisabled: {
    opacity: 0.45,
  },

  exportText: {
    color: Colors.textPrimary,
    fontSize: 16,
    fontWeight: "800",
  },

  card: {
    backgroundColor: Colors.cards.journal,
    borderRadius: Radius.card,
    padding: 18,
  },

  missionText: {
    color: Colors.textPrimary,
    fontSize: 15,
    lineHeight: 24,
    textAlign: "left",
  },

  emptyWrap: {
    alignItems: "center",
    paddingTop: 10,
  },

  emptyTitle: {
    color: Colors.textPrimary,
    fontSize: 18,
    fontWeight: "800",
    textAlign: "center",
    marginBottom: 6,
  },

  emptySubtitle: {
    color: Colors.textSecondary,
    fontSize: 13,
    textAlign: "center",
    marginBottom: 16,
    lineHeight: 18,
    maxWidth: 320,
  },

  startButton: {
    borderRadius: Radius.card,
    paddingVertical: 14,
    paddingHorizontal: 18,
    alignItems: "center",
    width: "100%",
  },

  startButtonText: {
    color: Colors.textPrimary,
    fontSize: 16,
    fontWeight: "800",
  },

  bottomBar: {
    position: "absolute",
    bottom: Layout.bottomNavSpacing,
    left: Spacing.screenPadding,
    right: Spacing.screenPadding,
    alignItems: "center",
  },

  bottomButtonRow: {
    flexDirection: "row",
    gap: 16,
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
