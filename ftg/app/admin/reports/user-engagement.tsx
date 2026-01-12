// FILE: app/admin/reports/user-engagement.tsx
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

type Row = {
  user_id: string;
  user_display: string;
  dept_abbrev: string;
  total_points: number;
  last_login: string | null;
  login_pct: number | string;
};

type RangeMode = "last7" | "last30" | "ytd";

export default function UserEngagementReport() {
  const router = useRouter();

  const [range, setRange] = useState<RangeMode>("last7");
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState<"pdf" | "csv" | null>(null);
  const [rows, setRows] = useState<Row[]>([]);

  const hasResults = rows.length > 0;

  const { startDate, endDate } = useMemo(() => {
    const now = new Date();
    const end = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    let start: Date;
    if (range === "ytd") {
      start = new Date(now.getFullYear(), 0, 1);
    } else {
      const days = range === "last7" ? 7 : 30;
      start = new Date(end);
      start.setDate(start.getDate() - (days - 1));
    }

    const toIso = (d: Date) => d.toISOString().split("T")[0];
    return { startDate: toIso(start), endDate: toIso(end) };
  }, [range]);

  const fmtRangeDate = (isoYYYYMMDD: string) => {
    try {
      const [y, m, d] = isoYYYYMMDD.split("-");
      if (!y || !m || !d) return isoYYYYMMDD;
      return `${m}/${d}/${y}`;
    } catch {
      return isoYYYYMMDD;
    }
  };

  const fmtLastLogin = (ts: string | null) => {
    if (!ts) return "—";
    try {
      const d = new Date(ts);
      const mm = String(d.getMonth() + 1).padStart(2, "0");
      const dd = String(d.getDate()).padStart(2, "0");
      const yy = String(d.getFullYear()).slice(-2);
      return `${mm}/${dd}/${yy}`;
    } catch {
      return "—";
    }
  };

  const fmtPct = (v: number | string) => {
    const n = typeof v === "string" ? Number(v) : v;
    if (!Number.isFinite(n)) return "—";
    return `${n.toFixed(1)}%`;
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

  // ✅ removes TS red underline by asserting the *module* shape (VS Code type glitch)
  const FS = FileSystem as any;

  const getWritableDir = (): string => {
    const base = FS.cacheDirectory ?? FS.documentDirectory;
    if (!base) throw new Error("File system unavailable on this device.");
    return String(base);
  };

  const runReport = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc("admin_user_engagement_report", {
        p_competition_year: new Date().getFullYear(),
        p_start_date: "2026-01-20",
      });

      if (error) throw error;

      setRows(((data ?? []) as Row[]) || []);
    } catch (e: any) {
      Alert.alert("Error", e?.message ?? "Failed to run report.");
    } finally {
      setLoading(false);
    }
  };

  const exportPdf = async () => {
    if (!hasResults) return;

    setExporting("pdf");
    try {
      const prettyRange = `${fmtRangeDate(startDate)} → ${fmtRangeDate(endDate)}`;
      const generatedOn = fmtRangeDate(new Date().toISOString().split("T")[0]);

      const html = `
        <!doctype html>
        <html>
          <head>
            <meta charset="utf-8" />
            <meta name="viewport" content="width=device-width, initial-scale=1" />
            <style>
              body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif; padding: 20px; color: #111; }
              h1 { margin: 0 0 6px 0; font-size: 18px; }
              .meta { margin: 0 0 14px 0; font-size: 12px; color: #444; }
              table { width: 100%; border-collapse: collapse; font-size: 12px; }
              th, td { border: 1px solid #ddd; padding: 8px; vertical-align: top; }
              th { background: #f5f5f5; text-align: left; }
              td.num, th.num { text-align: right; }
              .user { font-weight: 600; }
              .dept { font-size: 11px; color: #555; margin-top: 2px; text-transform: uppercase; }
            </style>
          </head>
          <body>
            <h1>User Engagement</h1>
            <p class="meta">Range: ${escapeHtml(prettyRange)} &nbsp;•&nbsp; Generated: ${escapeHtml(
        generatedOn
      )} &nbsp;•&nbsp; Users: ${escapeHtml(rows.length)}</p>

            <table>
              <thead>
                <tr>
                  <th style="width:48%">User</th>
                  <th class="num" style="width:14%">Pts</th>
                  <th class="num" style="width:20%">Last Login</th>
                  <th class="num" style="width:18%">Login %</th>
                </tr>
              </thead>
              <tbody>
                ${rows
                  .map((r) => {
                    const user = escapeHtml(r.user_display);
                    const dept = escapeHtml(String(r.dept_abbrev || ""));
                    const pts = escapeHtml(r.total_points ?? 0);
                    const last = escapeHtml(fmtLastLogin(r.last_login));
                    const pct = escapeHtml(fmtPct(r.login_pct));

                    return `
                      <tr>
                        <td>
                          <div class="user">${user}</div>
                          <div class="dept">${dept}</div>
                        </td>
                        <td class="num">${pts}</td>
                        <td class="num">${last}</td>
                        <td class="num">${pct}</td>
                      </tr>
                    `;
                  })
                  .join("")}
              </tbody>
            </table>
          </body>
        </html>
      `;

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
      Alert.alert("Export Error", e?.message ?? "Failed to export PDF.");
    } finally {
      setExporting(null);
    }
  };

  const exportCsv = async () => {
    if (!hasResults) return;

    setExporting("csv");
    try {
      const header = ["User", "Dept", "Pts", "LastLogin", "LoginPct"];
      const lines = [
        header.join(","),
        ...rows.map((r) => {
          const user = csvEscape(r.user_display);
          const dept = csvEscape(String(r.dept_abbrev || "").toLowerCase());
          const pts = csvEscape(r.total_points ?? 0);
          const last = csvEscape(fmtLastLogin(r.last_login));
          const pct = csvEscape(fmtPct(r.login_pct));
          return [user, dept, pts, last, pct].join(",");
        }),
      ];

      const csv = lines.join("\n");
      const filename = `user-engagement-${startDate}-to-${endDate}.csv`;
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
      Alert.alert("Export Error", e?.message ?? "Failed to export CSV.");
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
            <Text style={styles.title}>User Engagement</Text>
            <Text style={styles.subtitle}>Logins + points snapshot</Text>
          </View>

          <View style={styles.card}>
            <LinearGradient
              colors={["rgba(255,255,255,0.35)", "rgba(255,255,255,0.05)"]}
              start={{ x: 1, y: 0 }}
              end={{ x: 0, y: 1 }}
              style={styles.cornerBubble}
            >
              <Text style={styles.bubbleIcon}>👤</Text>
            </LinearGradient>

            <View style={styles.topSpacer} />

            <View style={styles.quickRow}>
              <QuickBtn
                label="Last 7"
                active={range === "last7"}
                onPress={() => setRange("last7")}
              />
              <QuickBtn
                label="Last 30"
                active={range === "last30"}
                onPress={() => setRange("last30")}
              />
              <QuickBtn
                label="YTD"
                active={range === "ytd"}
                onPress={() => setRange("ytd")}
              />
            </View>

            <Text style={styles.rangeText}>
              Range: {fmtRangeDate(startDate)} → {fmtRangeDate(endDate)}
            </Text>

            <TouchableOpacity
              onPress={runReport}
              disabled={isBusy}
              style={[styles.runBtn, isBusy && styles.runBtnDisabled]}
              activeOpacity={0.9}
            >
              <Text style={styles.runBtnText}>
                {loading ? "Running…" : "Run"}
              </Text>
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
                  <Text style={[styles.th, { flex: 1.8 }]}>User</Text>
                  <Text style={[styles.th, { width: 70, textAlign: "right" }]}>
                    Pts
                  </Text>
                  <Text style={[styles.th, { width: 95, textAlign: "right" }]}>
                    LastLogin
                  </Text>
                  <Text style={[styles.th, { width: 70, textAlign: "right" }]}>
                    %
                  </Text>
                </View>

                {rows.map((r) => (
                  <View key={r.user_id} style={styles.tr}>
                    <View style={{ flex: 1.8 }}>
                      <Text style={styles.userName} numberOfLines={1}>
                        {r.user_display}
                      </Text>
                      <Text style={styles.userDept} numberOfLines={1}>
                        {String(r.dept_abbrev || "").toLowerCase()}
                      </Text>
                    </View>

                    <Text style={[styles.td, { width: 70, textAlign: "right" }]}>
                      {r.total_points ?? 0}
                    </Text>

                    <Text style={[styles.td, { width: 95, textAlign: "right" }]}>
                      {fmtLastLogin(r.last_login)}
                    </Text>

                    <Text style={[styles.td, { width: 70, textAlign: "right" }]}>
                      {fmtPct(r.login_pct)}
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
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => router.back()}
            >
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
