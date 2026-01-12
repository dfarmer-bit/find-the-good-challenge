// FILE: app/admin/reports/event-attendance.tsx
// Paste this entire file.

import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import React, { useState } from "react";
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

// ✅ VS Code typing glitch workaround
const FS = FileSystem as any;

type RangeKey = "7" | "30" | "ytd";

type EventRow = {
  event_id: string;
  title: string;
  start_time: string; // kept for sorting/export meta if needed
  invited: number;
  checked_in: number;
  attendance_percent: number;
};

export default function EventAttendanceReport() {
  const router = useRouter();

  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState<"pdf" | "csv" | null>(null);

  const [rangeKey, setRangeKey] = useState<RangeKey>("7");
  const [rows, setRows] = useState<EventRow[]>([]);
  const [lastRunLabel, setLastRunLabel] = useState<string>("");

  const isBusy = loading || exporting !== null;
  const hasResults = rows.length > 0;

  const getWritableDir = (): string => {
    const base = FS.cacheDirectory ?? FS.documentDirectory;
    if (!base) throw new Error("File system unavailable on this device.");
    return String(base);
  };

  const pad2 = (n: number) => String(n).padStart(2, "0");
  const fmtMMDDYYYY = (d: Date) =>
    `${pad2(d.getMonth() + 1)}/${pad2(d.getDate())}/${d.getFullYear()}`;

  const startOfDay = (d: Date) =>
    new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0);
  const endOfDay = (d: Date) =>
    new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);

  const computeRange = (key: RangeKey) => {
    const now = new Date();
    const todayStart = startOfDay(now);
    const todayEnd = endOfDay(now);

    if (key === "ytd") {
      const start = new Date(now.getFullYear(), 0, 1, 0, 0, 0, 0);
      return {
        start,
        end: todayEnd,
        label: `YTD (${fmtMMDDYYYY(start)} – ${fmtMMDDYYYY(now)})`,
      };
    }

    const days = key === "7" ? 7 : 30;
    const start = new Date(todayStart);
    start.setDate(start.getDate() - (days - 1));

    return {
      start,
      end: todayEnd,
      label: `Last ${days} Days (${fmtMMDDYYYY(start)} – ${fmtMMDDYYYY(now)})`,
    };
  };

  const runReport = async () => {
    if (isBusy) return;

    setLoading(true);
    try {
      const { start, end, label } = computeRange(rangeKey);

      // ✅ Your schema:
      // events: id, title, type, start_time, cancelled_at
      // event_invites: event_id, user_id, checked_in_at, status
      const { data: evts, error: evtErr } = await supabase
        .from("events")
        .select("id,title,start_time,cancelled_at")
        .gte("start_time", start.toISOString())
        .lte("start_time", end.toISOString())
        .order("start_time", { ascending: false });

      if (evtErr) throw evtErr;

      // Exclude cancelled events
      const eventsList = (evts ?? []).filter((e: any) => !e?.cancelled_at);

      if (eventsList.length === 0) {
        setRows([]);
        setLastRunLabel(label);
        return;
      }

      const eventIds = eventsList.map((e: any) => String(e.id));

      const { data: invites, error: invErr } = await supabase
        .from("event_invites")
        .select("event_id,user_id,checked_in_at,status")
        .in("event_id", eventIds);

      if (invErr) throw invErr;

      // Exclude admins like other reports
      const { data: profs, error: profErr } = await supabase
        .from("profiles")
        .select("id,role");

      if (profErr) throw profErr;

      const eligible = new Set<string>(
        (profs ?? [])
          .filter((p: any) => String(p?.role ?? "").toLowerCase() !== "admin")
          .map((p: any) => String(p.id))
      );

      const byEvent = new Map<string, { invited: Set<string>; checked: Set<string> }>();
      for (const id of eventIds) byEvent.set(id, { invited: new Set(), checked: new Set() });

      for (const r of invites ?? []) {
        const eid = String((r as any).event_id ?? "");
        const uid = String((r as any).user_id ?? "");
        if (!eid || !uid) continue;
        if (!eligible.has(uid)) continue;

        const status = String((r as any).status ?? "").toLowerCase();
        if (status === "cancelled" || status === "revoked") continue;

        const bucket = byEvent.get(eid);
        if (!bucket) continue;

        bucket.invited.add(uid);
        if ((r as any).checked_in_at) bucket.checked.add(uid);
      }

      const out: EventRow[] = eventsList.map((e: any) => {
        const id = String(e.id);
        const title = String(e.title ?? "Event");
        const start_time = String(e.start_time ?? "");

        const agg = byEvent.get(id) ?? { invited: new Set(), checked: new Set() };
        const invited = agg.invited.size;
        const checked_in = agg.checked.size;
        const attendance_percent =
          invited > 0 ? Math.round((checked_in / invited) * 1000) / 10 : 0;

        return {
          event_id: id,
          title,
          start_time,
          invited,
          checked_in,
          attendance_percent,
        };
      });

      setRows(out);
      setLastRunLabel(label);
    } catch (e: any) {
      Alert.alert("Error", e?.message ?? "Failed to run event attendance.");
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

  const buildHtml = (data: EventRow[]) => {
    const tableRows = data
      .map(
        (r) => `
<tr>
  <td>${escapeHtml(r.title)}</td>
  <td style="text-align:right;">${r.invited}</td>
  <td style="text-align:right;">${r.checked_in}</td>
  <td style="text-align:right;">${r.attendance_percent}%</td>
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
    <h1>Event Attendance</h1>
    <div class="sub">Invited vs Checked-In (non-admin users)</div>

    <div class="filters">
      <div>${escapeHtml(`Range: ${lastRunLabel || "—"}`)}</div>
      <div>${escapeHtml(`Events: ${data.length}`)}</div>
    </div>

    <table>
      <thead>
        <tr>
          <th>Event</th>
          <th style="text-align:right;">Inv</th>
          <th style="text-align:right;">In</th>
          <th style="text-align:right;">%</th>
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
      const header = ["Event", "Invited", "CheckedIn", "AttendancePercent"];
      const lines = [
        header.join(","),
        ...rows.map((r) =>
          [
            csvEscape(r.title),
            csvEscape(r.invited),
            csvEscape(r.checked_in),
            csvEscape(r.attendance_percent),
          ].join(",")
        ),
      ];

      const csv = lines.join("\n");
      const filename = `event-attendance-${rangeKey}-${new Date().toISOString().slice(0, 10)}.csv`;
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

  return (
    <View style={styles.container}>
      <View style={styles.headerWrapper}>
        <AppHeader />
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          <View style={styles.titleRow}>
            <Text style={styles.title}>Event Attendance</Text>
            <Text style={styles.subtitle}>Invited vs Checked-In • % attendance</Text>
          </View>

          <View style={styles.card}>
            <LinearGradient
              colors={["rgba(255,255,255,0.35)", "rgba(255,255,255,0.05)"]}
              start={{ x: 1, y: 0 }}
              end={{ x: 0, y: 1 }}
              style={styles.cornerBubble}
            >
              <Text style={styles.bubbleIcon}>🗓️</Text>
            </LinearGradient>

            <View style={styles.topSpacer} />

            <View style={styles.quickRow}>
              <QuickBtn label="7 Days" active={rangeKey === "7"} onPress={() => setRangeKey("7")} />
              <QuickBtn label="30 Days" active={rangeKey === "30"} onPress={() => setRangeKey("30")} />
              <QuickBtn label="YTD" active={rangeKey === "ytd"} onPress={() => setRangeKey("ytd")} />
            </View>

            <Text style={styles.rangeText}>{computeRange(rangeKey).label}</Text>

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
                style={[styles.exportBtn, (!hasResults || isBusy) && styles.exportBtnDisabled]}
                activeOpacity={0.9}
              >
                <Text style={styles.exportBtnText}>
                  {exporting === "pdf" ? "Exporting…" : "Export PDF"}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={exportCsv}
                disabled={!hasResults || isBusy}
                style={[styles.exportBtn, (!hasResults || isBusy) && styles.exportBtnDisabled]}
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
                {hasResults ? `${rows.length} events` : "Run to load"}
              </Text>
            </View>

            {!hasResults ? (
              <View style={styles.emptyBox}>
                <Text style={styles.emptyText}>No results yet.</Text>
              </View>
            ) : (
              <View style={styles.tableWrap}>
                <View style={styles.tableHeader}>
                  <Text style={[styles.th, { flex: 1 }]}>Event</Text>

                  <Text style={[styles.th, { width: 76, textAlign: "right" }]}>
                    Inv
                  </Text>
                  <Text style={[styles.th, { width: 66, textAlign: "right" }]}>
                    In
                  </Text>
                  <Text style={[styles.th, { width: 66, textAlign: "right" }]}>
                    %
                  </Text>
                </View>

                {rows.map((r) => (
                  <View key={r.event_id} style={styles.tr}>
                    <Text style={[styles.td, { flex: 1 }]} numberOfLines={1}>
                      {r.title}
                    </Text>

                    <Text style={[styles.td, { width: 76, textAlign: "right" }]}>
                      {r.invited}
                    </Text>
                    <Text style={[styles.td, { width: 66, textAlign: "right" }]}>
                      {r.checked_in}
                    </Text>
                    <Text style={[styles.td, { width: 66, textAlign: "right" }]}>
                      {r.attendance_percent}%
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

            <TouchableOpacity style={styles.backButton} onPress={() => router.push("/main" as any)}>
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
  headerWrapper: { marginBottom: Spacing.sectionGap },
  scrollContent: {},

  titleRow: { alignItems: "center", marginBottom: 12 },
  title: {
    fontSize: Typography.greeting.fontSize,
    fontWeight: Typography.greeting.fontWeight,
    color: Colors.textPrimary,
    marginBottom: 4,
  },
  subtitle: { fontSize: Typography.quote.fontSize, color: Colors.textSecondary },

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
  bubbleIcon: { fontSize: 22 },
  topSpacer: { height: 52 },

  quickRow: { flexDirection: "row", gap: 10, marginTop: 2 },
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
  quickBtnText: { color: Colors.textPrimary, fontSize: 12, fontWeight: "800" },

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
  runBtnDisabled: { opacity: 0.5 },
  runBtnText: { color: Colors.textPrimary, fontSize: 14, fontWeight: "900", letterSpacing: 0.2 },

  exportRow: { flexDirection: "row", gap: 10, marginTop: 10 },
  exportBtn: {
    flex: 1,
    backgroundColor: "rgba(255,255,255,0.10)",
    borderRadius: 16,
    paddingVertical: 11,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.14)",
  },
  exportBtnDisabled: { opacity: 0.45 },
  exportBtnText: { color: Colors.textPrimary, fontSize: 13, fontWeight: "900", letterSpacing: 0.2 },

  resultsHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    marginBottom: 10,
  },
  resultsTitle: { color: Colors.textPrimary, fontSize: 16, fontWeight: "900" },
  resultsSub: { color: Colors.textSecondary, fontSize: 12, fontWeight: "800" },

  emptyBox: {
    backgroundColor: "rgba(0,0,0,0.18)",
    borderRadius: 14,
    paddingVertical: 18,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    alignItems: "center",
  },
  emptyText: { color: Colors.textSecondary, fontSize: 13, fontWeight: "700" },

  tableWrap: { borderRadius: 14, overflow: "hidden", borderWidth: 1, borderColor: "rgba(255,255,255,0.10)" },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: "rgba(255,255,255,0.06)",
    paddingVertical: 10,
    paddingHorizontal: 10,
    alignItems: "center",
  },
  th: { color: Colors.textSecondary, fontSize: 12, fontWeight: "900" },
  tr: {
    flexDirection: "row",
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.06)",
    backgroundColor: "rgba(0,0,0,0.12)",
    alignItems: "center",
  },
  td: { color: Colors.textPrimary, fontSize: 12, fontWeight: "800" },

  bottomBar: {
    position: "absolute",
    bottom: Layout.bottomNavSpacing,
    left: Spacing.screenPadding,
    right: Spacing.screenPadding,
    alignItems: "center",
  },
  bottomButtonRow: { flexDirection: "row", gap: 16 },
  backButton: { ...Components.backButton, flexDirection: "row", alignItems: "center" },
  backIcon: { fontSize: 18, marginRight: 8 },
  backText: { color: Colors.textPrimary, fontSize: 16, fontWeight: "700" },
});
