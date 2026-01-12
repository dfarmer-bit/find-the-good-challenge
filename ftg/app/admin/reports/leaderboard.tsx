// FILE: app/admin/reports/leaderboard.tsx
// Paste this entire file.

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
  TouchableOpacity,
  View,
} from "react-native";
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import * as FileSystem from "expo-file-system";
import { AppHeader } from "../../../components/AppHeader";
import {
  Colors,
  Components,
  Layout,
  Radius,
  Spacing,
  Typography,
} from "../../../constants/theme";
import { supabase } from "../../../lib/supabase";

type RawTotal = {
  user_id: string;
  full_name: string;
  department: string;
  total_points: number;
};

type Row = {
  rank: number;
  user_id: string;
  full_name: string;
  department: string;
  total_points: number;
};

type SortMode = "points" | "dept";

export default function LeaderboardReport() {
  const router = useRouter();

  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState<"pdf" | "csv" | null>(null);
  const [rowsRaw, setRowsRaw] = useState<RawTotal[]>([]);
  const [sortMode, setSortMode] = useState<SortMode>("points");

  const hasResults = rowsRaw.length > 0;

  const rows: Row[] = useMemo(() => {
    const list = [...rowsRaw];

    const normDept = (d: string) => (d || "").trim().toLowerCase();
    const normName = (n: string) => (n || "").trim().toLowerCase();

    if (sortMode === "dept") {
      list.sort((a, b) => {
        const da = normDept(a.department);
        const db = normDept(b.department);
        if (da < db) return -1;
        if (da > db) return 1;

        if (b.total_points !== a.total_points) return b.total_points - a.total_points;

        const na = normName(a.full_name);
        const nb = normName(b.full_name);
        if (na < nb) return -1;
        if (na > nb) return 1;
        return 0;
      });
    } else {
      list.sort((a, b) => {
        if (b.total_points !== a.total_points) return b.total_points - a.total_points;

        const na = normName(a.full_name);
        const nb = normName(b.full_name);
        if (na < nb) return -1;
        if (na > nb) return 1;
        return 0;
      });
    }

    return list.map((x, idx) => ({
      rank: idx + 1,
      user_id: x.user_id,
      full_name: x.full_name || "Unknown",
      department: x.department || "",
      total_points: x.total_points || 0,
    }));
  }, [rowsRaw, sortMode]);

  // ✅ removes TS red underline by asserting the *module* shape (VS Code type glitch)
  const FS = FileSystem as any;

  const getWritableDir = (): string => {
    const base = FS.cacheDirectory ?? FS.documentDirectory;
    if (!base) throw new Error("File system unavailable on this device.");
    return String(base);
  };

  const runReport = async () => {
    if (loading) return;

    setLoading(true);
    try {
      const year = new Date().getFullYear();

      const { data, error } = await supabase
        .from("points_ledger")
        .select(
          `
          user_id,
          points,
          competition_year,
          profiles:profiles!points_ledger_user_id_fkey (
            id,
            full_name,
            department,
            role
          )
        `
        )
        .eq("competition_year", year);

      if (error) throw error;

      const totals = new Map<
        string,
        { user_id: string; full_name: string; department: string; total_points: number }
      >();

      for (const r of data ?? []) {
        const uid = (r as any).user_id as string;
        const pts = Number((r as any).points ?? 0) || 0;

        const prof: any = (r as any).profiles ?? null;
        const role = (prof?.role ?? null) as string | null;

        if (role?.toLowerCase() === "admin") continue;

        const full_name = (prof?.full_name ?? "Unknown").toString();
        const department = (prof?.department ?? "").toString();

        const existing = totals.get(uid);
        if (existing) existing.total_points += pts;
        else totals.set(uid, { user_id: uid, full_name, department, total_points: pts });
      }

      setRowsRaw(Array.from(totals.values()));
    } catch (e: any) {
      Alert.alert("Error", e?.message ?? "Failed to run leaderboard.");
    } finally {
      setLoading(false);
    }
  };

  const escapeHtml = (s: any) => {
    const str = String(s ?? "");
    return str
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  };

  const csvEscape = (val: any) => {
    const s = String(val ?? "");
    if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
    return s;
  };

  const buildHtml = (data: Row[]) => {
    const year = new Date().getFullYear();
    const sortLabel =
      sortMode === "dept" ? "Department (A–Z), then Points" : "Points (High–Low)";

    const tableRows = data
      .map(
        (r) => `
<tr>
  <td style="text-align:right;">${r.rank}</td>
  <td>${escapeHtml(r.full_name)}</td>
  <td>${escapeHtml(r.department || "")}</td>
  <td style="text-align:right;">${r.total_points}</td>
</tr>`
      )
      .join("");

    return `
<html>
  <head>
    <meta charset="utf-8" />
    <style>
      body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif; padding: 24px; color: #111; }
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
    <h1>Leaderboard</h1>
    <div class="sub">All users • Points totals</div>

    <div class="filters">
      <div>${escapeHtml(`Competition Year: ${year}`)}</div>
      <div>${escapeHtml(`Sort: ${sortLabel}`)}</div>
      <div>${escapeHtml(`Users: ${data.length}`)}</div>
    </div>

    <table>
      <thead>
        <tr>
          <th style="text-align:right;">#</th>
          <th>User</th>
          <th>Department</th>
          <th style="text-align:right;">Points</th>
        </tr>
      </thead>
      <tbody>
        ${tableRows || `<tr><td colspan="4">No rows</td></tr>`}
      </tbody>
    </table>

    <div class="meta">Generated: ${escapeHtml(new Date().toLocaleString())}</div>
  </body>
</html>`;
  };

  const exportPdf = async () => {
    if (!hasResults) return;

    setExporting("pdf");
    try {
      const html = buildHtml(rows);
      const file = await Print.printToFileAsync({ html });

      if (!(await Sharing.isAvailableAsync())) {
        Alert.alert("Sharing not available", "Cannot share files on this device.");
        return;
      }

      await Sharing.shareAsync(file.uri, {
        mimeType: "application/pdf",
        dialogTitle: "Export PDF",
      });
    } catch (e: any) {
      Alert.alert("Export failed", e?.message ?? "Could not export PDF.");
    } finally {
      setExporting(null);
    }
  };

  const exportCsv = async () => {
    if (!hasResults) return;

    setExporting("csv");
    try {
      const header = ["Rank", "User", "Department", "Points"];
      const lines = [
        header.join(","),
        ...rows.map((r) =>
          [
            csvEscape(r.rank),
            csvEscape(r.full_name),
            csvEscape(r.department),
            csvEscape(r.total_points),
          ].join(",")
        ),
      ];

      const csv = lines.join("\n");
      const filename = `leaderboard-${new Date().getFullYear()}-${sortMode}.csv`;
      const uri = `${getWritableDir()}${filename}`;

      await FileSystem.writeAsStringAsync(uri, csv);

      if (!(await Sharing.isAvailableAsync())) {
        Alert.alert("Sharing not available", "Cannot share files on this device.");
        return;
      }

      await Sharing.shareAsync(uri, {
        mimeType: "text/csv",
        dialogTitle: "Export CSV",
      });
    } catch (e: any) {
      Alert.alert("Export failed", e?.message ?? "Could not export CSV.");
    } finally {
      setExporting(null);
    }
  };

  const isBusy = loading || exporting !== null;

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
            <Text style={styles.title}>Leaderboard</Text>
            <Text style={styles.subtitle}>All users + total points</Text>
          </View>

          <View style={styles.card}>
            <LinearGradient
              colors={["rgba(255,255,255,0.35)", "rgba(255,255,255,0.05)"]}
              start={{ x: 1, y: 0 }}
              end={{ x: 0, y: 1 }}
              style={styles.cornerBubble}
            >
              <Text style={styles.bubbleIcon}>🏆</Text>
            </LinearGradient>

            <View style={styles.topSpacer} />

            <View style={styles.quickRow}>
              <QuickBtn
                label="Points"
                active={sortMode === "points"}
                onPress={() => setSortMode("points")}
              />
              <QuickBtn
                label="Dept"
                active={sortMode === "dept"}
                onPress={() => setSortMode("dept")}
              />
            </View>

            <Text style={styles.subtitle}>
              Sort:{" "}
              {sortMode === "dept"
                ? "Select Points or Dept for Sort"
                : "Points (High–Low)"}
            </Text>

            <TouchableOpacity
              onPress={runReport}
              disabled={isBusy}
              style={[styles.runBtn, isBusy && styles.runBtnDisabled]}
              activeOpacity={0.9}
            >
              <Text style={styles.runBtnText}>{loading ? "Running…" : "Run"}</Text>
            </TouchableOpacity>

            <View style={styles.exportRow}>
              <TouchableOpacity
                onPress={exportPdf}
                disabled={!hasResults || isBusy}
                style={[
                  styles.exportBtn,
                  (!hasResults || isBusy) && styles.exportBtnDisabled,
                ]}
                activeOpacity={0.9}
              >
                <Text style={styles.exportBtnText}>
                  {exporting === "pdf" ? "Exporting…" : "Export PDF"}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={exportCsv}
                disabled={!hasResults || isBusy}
                style={[
                  styles.exportBtn,
                  (!hasResults || isBusy) && styles.exportBtnDisabled,
                ]}
                activeOpacity={0.9}
              >
                <Text style={styles.exportBtnText}>
                  {exporting === "csv" ? "Exporting…" : "Export CSV"}
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.card}>
            <View style={styles.resultsHeader}>
              <Text style={styles.resultsTitle}>Results</Text>
              <Text style={styles.resultsSub}>
                {hasResults ? `${rows.length} users` : "Run to load"}
              </Text>
            </View>

            {!hasResults ? (
              <View style={styles.emptyBox}>
                <Text style={styles.emptyText}>No results yet.</Text>
              </View>
            ) : (
              <View style={styles.tableWrap}>
                <View style={styles.tableHeader}>
                  <Text style={[styles.th, { width: 52, textAlign: "right" }]}>
                    #
                  </Text>
                  <Text style={[styles.th, { flex: 1.6 }]}>User</Text>
                  <Text style={[styles.th, { flex: 1.1 }]}>Dept</Text>
                  <Text style={[styles.th, { width: 86, textAlign: "right" }]}>
                    Pts
                  </Text>
                </View>

                {rows.map((r) => (
                  <View key={r.user_id} style={styles.tr}>
                    <Text style={[styles.td, { width: 52, textAlign: "right" }]}>
                      {r.rank}
                    </Text>
                    <Text style={[styles.td, { flex: 1.6 }]} numberOfLines={1}>
                      {r.full_name}
                    </Text>
                    <Text style={[styles.td, { flex: 1.1 }]} numberOfLines={1}>
                      {r.department || "—"}
                    </Text>
                    <Text style={[styles.td, { width: 86, textAlign: "right" }]}>
                      {r.total_points}
                    </Text>
                  </View>
                ))}
              </View>
            )}
          </View>

          <View style={{ height: 110 }} />
        </ScrollView>

        <View style={styles.bottomBar}>
          <View style={styles.bottomButtonRow}>
            <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
              <Text style={styles.backIcon}>⬅️</Text>
              <Text style={styles.backText}>Back</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.backButton}
              onPress={() => router.push("/main" as any)}
            >
              <Text style={styles.backIcon}>🏠</Text>
              <Text style={styles.backText}>Home</Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

function QuickBtn({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      style={[styles.quickBtn, active && styles.quickBtnActive]}
      activeOpacity={0.9}
    >
      <Text style={styles.quickBtnText}>{label}</Text>
    </TouchableOpacity>
  );
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
    fontSize: Typography.greeting.fontSize,
    fontWeight: Typography.greeting.fontWeight,
    color: Colors.textPrimary,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: Typography.quote.fontSize,
    color: Colors.textSecondary,
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

  topSpacer: {
    height: 52,
  },

  quickRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 2,
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
  quickBtnActive: {
    backgroundColor: "rgba(255,255,255,0.14)",
    borderColor: "rgba(255,255,255,0.18)",
  },
  quickBtnText: {
    color: Colors.textPrimary,
    fontSize: 12,
    fontWeight: "800",
  },

  rangeText: {
    marginTop: 10,
    color: Colors.textSecondary,
    fontSize: 12,
    textAlign: "center",
    fontWeight: "700",
    opacity: 0.95,
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

  exportRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 10,
  },
  exportBtn: {
    flex: 1,
    backgroundColor: "rgba(255,255,255,0.10)",
    borderRadius: 16,
    paddingVertical: 11,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.14)",
  },
  exportBtnDisabled: {
    opacity: 0.45,
  },
  exportBtnText: {
    color: Colors.textPrimary,
    fontSize: 13,
    fontWeight: "900",
    letterSpacing: 0.2,
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
    alignItems: "center",
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
    alignItems: "center",
  },
  td: {
    color: Colors.textPrimary,
    fontSize: 12,
    fontWeight: "800",
  },
  userName: {
    color: Colors.textPrimary,
    fontSize: 13,
    fontWeight: "900",
  },
  userDept: {
    marginTop: 2,
    color: Colors.textSecondary,
    fontSize: 11,
    fontWeight: "800",
    textTransform: "uppercase",
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
