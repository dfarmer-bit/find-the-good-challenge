import * as MailComposer from "expo-mail-composer";
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import React, { useMemo, useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { AppHeader } from "../../../../components/AppHeader";
import { Colors, Layout, Radius, Spacing } from "../../../../constants/theme";

type Row = {
  date: string;
  user: string;
  department: string;
  challenge: string;
  points: number;
  reason: string;
  source_type: string;
};

export default function PointsLedgerReport() {
  const router = useRouter();

  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [department, setDepartment] = useState("");
  const [userSearch, setUserSearch] = useState("");

  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState<Row[]>([]);

  const isReadyToRun = useMemo(
    () => startDate.trim() !== "" && endDate.trim() !== "",
    [startDate, endDate]
  );

  const hasResults = rows.length > 0;

  const onQuickRange = (mode: "last7" | "last30" | "ytd") => {
    const now = new Date();
    const end = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    let start: Date;
    if (mode === "ytd") {
      start = new Date(now.getFullYear(), 0, 1);
    } else {
      const days = mode === "last7" ? 7 : 30;
      start = new Date(end);
      start.setDate(start.getDate() - (days - 1));
    }

    const toIso = (d: Date) => d.toISOString().split("T")[0];
    setStartDate(toIso(start));
    setEndDate(toIso(end));
  };

  const runReportMock = async () => {
    if (!isReadyToRun) return;

    setLoading(true);
    try {
      const sample: Row[] = [
        {
          date: startDate,
          user: "Sample User",
          department: department || "Operations",
          challenge: "Bonus Quiz Completion",
          points: 50,
          reason: "Score >= 70%",
          source_type: "bonus_quiz",
        },
        {
          date: endDate,
          user: "Sample User",
          department: department || "Operations",
          challenge: "Mindfulness & Meditation",
          points: 20,
          reason: "Weekly cap applied",
          source_type: "challenge_activity",
        },
      ];

      const filtered = sample.filter((r) => {
        const userOk = userSearch
          ? r.user.toLowerCase().includes(userSearch.toLowerCase())
          : true;
        return userOk;
      });

      setRows(filtered);
    } catch (e: any) {
      Alert.alert("Error", e?.message ?? "Failed to run report.");
    } finally {
      setLoading(false);
    }
  };

  const buildHtml = (data: Row[]) => {
    const filters = [
      `Date Range: ${startDate} → ${endDate}`,
      department ? `Department: ${department}` : "",
      userSearch ? `User Filter: ${userSearch}` : "",
      `Rows: ${data.length}`,
    ].filter(Boolean);

    const tableRows = data
      .map(
        (r) => `
<tr>
  <td>${escapeHtml(r.date)}</td>
  <td>${escapeHtml(r.user)}</td>
  <td>${escapeHtml(r.department)}</td>
  <td>${escapeHtml(r.challenge)}</td>
  <td style="text-align:right;">${r.points}</td>
  <td>${escapeHtml(r.reason)}</td>
  <td>${escapeHtml(r.source_type)}</td>
</tr>`
      )
      .join("");

    return `
<html>
  <head>
    <meta charset="utf-8" />
    <style>
      body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif; padding: 24px; }
      h1 { margin: 0 0 6px 0; font-size: 20px; }
      .sub { color: #666; font-size: 12px; margin-bottom: 14px; }
      .filters { margin: 12px 0 18px 0; padding: 12px; background: #f6f6f6; border-radius: 10px; font-size: 12px; }
      .filters div { margin: 2px 0; }
      table { width: 100%; border-collapse: collapse; font-size: 12px; }
      th, td { border-bottom: 1px solid #e6e6e6; padding: 8px 6px; vertical-align: top; }
      th { text-align: left; background: #fafafa; }
      .meta { margin-top: 10px; color: #666; font-size: 11px; }
    </style>
  </head>
  <body>
    <h1>Points Ledger Report</h1>
    <div class="sub">Export generated from the app</div>

    <div class="filters">
      ${filters.map((f) => `<div>${escapeHtml(f)}</div>`).join("")}
    </div>

    <table>
      <thead>
        <tr>
          <th>Date</th>
          <th>User</th>
          <th>Department</th>
          <th>Challenge</th>
          <th style="text-align:right;">Points</th>
          <th>Reason</th>
          <th>Source</th>
        </tr>
      </thead>
      <tbody>
        ${tableRows || `<tr><td colspan="7">No rows</td></tr>`}
      </tbody>
    </table>

    <div class="meta">Generated: ${new Date().toLocaleString()}</div>
  </body>
</html>`;
  };

  const exportPdf = async () => {
    if (!hasResults) return;
    try {
      const html = buildHtml(rows);
      const file = await Print.printToFileAsync({ html });
      await Sharing.shareAsync(file.uri);
    } catch (e: any) {
      Alert.alert("Export failed", e?.message ?? "Could not export PDF.");
    }
  };

  const emailPdf = async () => {
    if (!hasResults) return;
    try {
      const html = buildHtml(rows);
      const file = await Print.printToFileAsync({ html });

      const available = await MailComposer.isAvailableAsync();
      if (!available) {
        Alert.alert("Email not available", "Email is not available on this device.");
        return;
      }

      await MailComposer.composeAsync({
        subject: `Points Ledger Report (${startDate} to ${endDate})`,
        body: `Attached: Points Ledger Report\nDate Range: ${startDate} to ${endDate}\nRows: ${rows.length}`,
        attachments: [file.uri],
      });
    } catch (e: any) {
      Alert.alert("Email failed", e?.message ?? "Could not open email composer.");
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.headerWrapper}>
        <AppHeader />
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.titleRow}>
            <Text style={styles.title}>Points Report</Text>
          </View>

          <View style={styles.card}>
            <LinearGradient
              colors={["rgba(255,255,255,0.35)", "rgba(255,255,255,0.05)"]}
              start={{ x: 1, y: 0 }}
              end={{ x: 0, y: 1 }}
              style={styles.cornerBubble}
            >
              <Text style={styles.bubbleIcon}>📈</Text>
            </LinearGradient>

            {/* ✅ Push fields below the icon bubble */}
            <View style={styles.topSpacer} />

            <View style={styles.row2}>
              <TextInput
                value={startDate}
                onChangeText={setStartDate}
                placeholder="Start date"
                placeholderTextColor={Colors.textSecondary}
                style={styles.input}
                autoCapitalize="none"
              />
              <TextInput
                value={endDate}
                onChangeText={setEndDate}
                placeholder="End date"
                placeholderTextColor={Colors.textSecondary}
                style={styles.input}
                autoCapitalize="none"
              />
            </View>

            {/* ✅ Buttons: Last 7, Last 30, YTD */}
            <View style={styles.quickRow}>
              <QuickBtn label="Last 7" onPress={() => onQuickRange("last7")} />
              <QuickBtn label="Last 30" onPress={() => onQuickRange("last30")} />
              <QuickBtn label="YTD" onPress={() => onQuickRange("ytd")} />
            </View>

            <View style={styles.row2}>
              <TextInput
                value={department}
                onChangeText={setDepartment}
                placeholder="Department (optional)"
                placeholderTextColor={Colors.textSecondary}
                style={styles.input}
              />
              <TextInput
                value={userSearch}
                onChangeText={setUserSearch}
                placeholder="User (optional)"
                placeholderTextColor={Colors.textSecondary}
                style={styles.input}
              />
            </View>

            <TouchableOpacity
              onPress={runReportMock}
              disabled={!isReadyToRun || loading}
              style={[
                styles.runBtn,
                (!isReadyToRun || loading) && styles.runBtnDisabled,
              ]}
              activeOpacity={0.9}
            >
              <Text style={styles.runBtnText}>
                {loading ? "Running…" : "Run"}
              </Text>
            </TouchableOpacity>

            <Text style={styles.helperText}>
              Tip: leave Department/User blank to view all.
            </Text>
          </View>

          <View style={styles.card}>
            <View style={styles.resultsHeader}>
              <Text style={styles.resultsTitle}>Results</Text>
              <Text style={styles.resultsSub}>
                {hasResults ? `${rows.length} rows` : "Run to load"}
              </Text>
            </View>

            {!hasResults ? (
              <View style={styles.emptyBox}>
                <Text style={styles.emptyText}>No results yet.</Text>
              </View>
            ) : (
              <View style={styles.tableWrap}>
                <View style={styles.tableHeader}>
                  <Text style={[styles.th, { flex: 1.1 }]}>Date</Text>
                  <Text style={[styles.th, { flex: 1.2 }]}>User</Text>
                  <Text style={[styles.th, { flex: 1.2 }]}>Challenge</Text>
                  <Text style={[styles.th, { width: 70, textAlign: "right" }]}>
                    Pts
                  </Text>
                </View>

                {rows.map((r, idx) => (
                  <View key={idx} style={styles.tr}>
                    <Text style={[styles.td, { flex: 1.1 }]} numberOfLines={1}>
                      {r.date}
                    </Text>
                    <Text style={[styles.td, { flex: 1.2 }]} numberOfLines={1}>
                      {r.user}
                    </Text>
                    <Text style={[styles.td, { flex: 1.2 }]} numberOfLines={1}>
                      {r.challenge}
                    </Text>
                    <Text
                      style={[styles.td, { width: 70, textAlign: "right" }]}
                    >
                      {r.points}
                    </Text>
                  </View>
                ))}
              </View>
            )}

            <View style={styles.actionsRow}>
              <TouchableOpacity
                onPress={exportPdf}
                disabled={!hasResults}
                style={[
                  styles.actionBtn,
                  !hasResults && styles.actionBtnDisabled,
                ]}
                activeOpacity={0.9}
              >
                <Text style={styles.actionBtnText}>PDF</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={emailPdf}
                disabled={!hasResults}
                style={[
                  styles.actionBtn,
                  !hasResults && styles.actionBtnDisabled,
                ]}
                activeOpacity={0.9}
              >
                <Text style={styles.actionBtnText}>Email</Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={{ height: 92 }} />
        </ScrollView>

        <View style={styles.bottomBar}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.bottomBtn}
            activeOpacity={0.9}
          >
            <Text style={styles.bottomBtnText}>Back</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => router.push("/main" as any)}
            style={styles.bottomBtn}
            activeOpacity={0.9}
          >
            <Text style={styles.bottomBtnText}>Home</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

function QuickBtn({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      style={styles.quickBtn}
      activeOpacity={0.9}
    >
      <Text style={styles.quickBtnText}>{label}</Text>
    </TouchableOpacity>
  );
}

function escapeHtml(input: string) {
  return String(input)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
    paddingTop: Layout.topScreenPadding,
    paddingHorizontal: Spacing.screenPadding,
  },
  headerWrapper: {
    marginBottom: Spacing.sectionGap,
  },
  scrollContent: {},

  titleRow: {
    alignItems: "center",
    marginBottom: 12,
  },
  title: {
    fontSize: 22,
    fontWeight: "800",
    color: Colors.textPrimary,
  },

  card: {
    backgroundColor: "rgba(255,255,255,0.06)",
    borderRadius: Radius.card,
    padding: 14,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
    marginBottom: Spacing.gridGap,
    overflow: "hidden",
  },

  cornerBubble: {
    position: "absolute",
    top: -22,
    right: -22,
    width: 86,
    height: 86,
    borderRadius: 26,
    justifyContent: "flex-end",
    alignItems: "flex-start",
    padding: 16,
  },
  bubbleIcon: {
    fontSize: 22,
  },

  // ✅ pushes fields below the bubble footprint
  topSpacer: {
    height: 44,
  },

  row2: {
    flexDirection: "row",
    gap: 10,
    marginTop: 10,
  },

  input: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.20)",
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: Platform.OS === "ios" ? 12 : 10,
    color: Colors.textPrimary,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
  },

  quickRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 10,
  },
  quickBtn: {
    flex: 1,
    backgroundColor: "rgba(255,255,255,0.08)",
    borderRadius: 14,
    paddingVertical: 10,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
  },
  quickBtnText: {
    color: Colors.textPrimary,
    fontSize: 12,
    fontWeight: "800",
  },

  runBtn: {
    marginTop: 12,
    backgroundColor: Colors.cards.complete,
    borderRadius: 16,
    paddingVertical: 12,
    alignItems: "center",
  },
  runBtnDisabled: {
    opacity: 0.5,
  },
  runBtnText: {
    color: Colors.textPrimary,
    fontSize: 14,
    fontWeight: "900",
    letterSpacing: 0.2,
  },

  helperText: {
    marginTop: 10,
    color: Colors.textSecondary,
    fontSize: 12,
    textAlign: "center",
    fontWeight: "700",
    opacity: 0.95,
  },

  resultsHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    marginBottom: 10,
  },
  resultsTitle: {
    color: Colors.textPrimary,
    fontSize: 16,
    fontWeight: "900",
  },
  resultsSub: {
    color: Colors.textSecondary,
    fontSize: 12,
    fontWeight: "800",
  },

  emptyBox: {
    backgroundColor: "rgba(0,0,0,0.18)",
    borderRadius: 14,
    paddingVertical: 18,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    alignItems: "center",
  },
  emptyText: {
    color: Colors.textSecondary,
    fontSize: 13,
    fontWeight: "700",
  },

  tableWrap: {
    borderRadius: 14,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
  },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: "rgba(255,255,255,0.06)",
    paddingVertical: 10,
    paddingHorizontal: 10,
  },
  th: {
    color: Colors.textSecondary,
    fontSize: 12,
    fontWeight: "900",
  },
  tr: {
    flexDirection: "row",
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.06)",
    backgroundColor: "rgba(0,0,0,0.12)",
  },
  td: {
    color: Colors.textPrimary,
    fontSize: 12,
    fontWeight: "700",
  },

  actionsRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 12,
  },
  actionBtn: {
    flex: 1,
    backgroundColor: "rgba(255,255,255,0.10)",
    borderRadius: 16,
    paddingVertical: 12,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
  },
  actionBtnDisabled: {
    opacity: 0.45,
  },
  actionBtnText: {
    color: Colors.textPrimary,
    fontSize: 13,
    fontWeight: "900",
  },

  bottomBar: {
    position: "absolute",
    left: Spacing.screenPadding,
    right: Spacing.screenPadding,
    bottom: 16,
    flexDirection: "row",
    gap: 12,
  },
  bottomBtn: {
    flex: 1,
    backgroundColor: "rgba(255,255,255,0.08)",
    borderRadius: 18,
    paddingVertical: 12,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
  },
  bottomBtnText: {
    color: Colors.textPrimary,
    fontSize: 14,
    fontWeight: "900",
  },
});
