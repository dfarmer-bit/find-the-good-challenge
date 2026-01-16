// FILE: app/admin/reports/leaderboard.tsx

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
      .map((r) => {
        const parts = (r.full_name || "").split(" ");
        const first = parts[0] || "";
        const last = parts.slice(1).join(" ");
        return `
<tr>
  <td style="text-align:right;">${r.rank}</td>
  <td>${escapeHtml(first)}<br/>${escapeHtml(last)}</td>
  <td>${escapeHtml(r.department || "")}</td>
  <td style="text-align:right;">${r.total_points}</td>
</tr>`;
      })
      .join("");

    return `
<html>
<head>
<meta charset="utf-8" />
<style>
body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif; padding: 24px; color: #111; }
table { width: 100%; border-collapse: collapse; font-size: 12px; }
th, td { border-bottom: 1px solid #e6e6e6; padding: 8px 6px; vertical-align: top; }
th { background: #fafafa; text-align: left; }
</style>
</head>
<body>
<h1>Leaderboard</h1>
<p>Year: ${year} • Sort: ${sortLabel}</p>
<table>
<thead>
<tr>
<th>#</th>
<th>User</th>
<th>Department</th>
<th style="text-align:right;">Points</th>
</tr>
</thead>
<tbody>
${tableRows || `<tr><td colspan="4">No rows</td></tr>`}
</tbody>
</table>
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
        Alert.alert("Sharing not available");
        return;
      }

      await Sharing.shareAsync(file.uri, { mimeType: "application/pdf" });
    } finally {
      setExporting(null);
    }
  };

  const exportCsv = async () => {
    if (!hasResults) return;
    setExporting("csv");

    try {
      const header = ["Rank", "First", "Last", "Department", "Points"];
      const lines = [
        header.join(","),
        ...rows.map((r) => {
          const parts = (r.full_name || "").split(" ");
          const first = parts[0] || "";
          const last = parts.slice(1).join(" ");
          return [
            csvEscape(r.rank),
            csvEscape(first),
            csvEscape(last),
            csvEscape(r.department),
            csvEscape(r.total_points),
          ].join(",");
        }),
      ];

      const csv = lines.join("\n");
      const filename = `leaderboard-${new Date().getFullYear()}-${sortMode}.csv`;
      const uri = `${getWritableDir()}${filename}`;

      await FileSystem.writeAsStringAsync(uri, csv);

      if (!(await Sharing.isAvailableAsync())) {
        Alert.alert("Sharing not available");
        return;
      }

      await Sharing.shareAsync(uri, { mimeType: "text/csv" });
    } finally {
      setExporting(null);
    }
  };

  const isBusy = loading || exporting !== null;

  return (
    <View style={styles.container}>
      <AppHeader />

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView contentContainerStyle={{ paddingBottom: 120 }}>
          <View style={styles.titleRow}>
            <Text style={styles.title}>Leaderboard</Text>
            <Text style={styles.subtitle}>All users + total points</Text>
          </View>

          <View style={styles.card}>
            <View style={styles.quickRow}>
              <QuickBtn label="Points" active={sortMode === "points"} onPress={() => setSortMode("points")} />
              <QuickBtn label="Dept" active={sortMode === "dept"} onPress={() => setSortMode("dept")} />
            </View>

            <TouchableOpacity onPress={runReport} disabled={isBusy} style={styles.runBtn}>
              <Text style={styles.runBtnText}>{loading ? "Running…" : "Run"}</Text>
            </TouchableOpacity>

            <View style={styles.exportRow}>
              <TouchableOpacity onPress={exportPdf} disabled={!hasResults || isBusy} style={styles.exportBtn}>
                <Text style={styles.exportBtnText}>Export PDF</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={exportCsv} disabled={!hasResults || isBusy} style={styles.exportBtn}>
                <Text style={styles.exportBtnText}>Export CSV</Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.card}>
            {!hasResults ? (
              <Text style={styles.emptyText}>Run to load results</Text>
            ) : (
              rows.map((r) => {
                const parts = (r.full_name || "").split(" ");
                const first = parts[0] || "";
                const last = parts.slice(1).join(" ");
                return (
                  <View key={r.user_id} style={styles.tr}>
                    <Text style={[styles.td, { width: 40, textAlign: "right" }]}>{r.rank}</Text>
                    <View style={{ flex: 1.6 }}>
                      <Text style={styles.userName}>{first}</Text>
                      <Text style={styles.userLast}>{last}</Text>
                    </View>
                    <Text style={[styles.td, { flex: 1.1 }]} numberOfLines={1}>
                      {r.department || "—"}
                    </Text>
                    <Text style={[styles.td, { width: 70, textAlign: "right" }]}>{r.total_points}</Text>
                  </View>
                );
              })
            )}
          </View>
        </ScrollView>

        <View style={styles.bottomBar}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Text style={styles.backText}>⬅️ Back</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.backButton} onPress={() => router.push("/main" as any)}>
            <Text style={styles.backText}>🏠 Home</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

function QuickBtn({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
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
  container: { flex: 1, backgroundColor: Colors.background, paddingTop: Layout.topScreenPadding, paddingHorizontal: Spacing.screenPadding },
  titleRow: { alignItems: "center", marginBottom: 12 },
  title: { fontSize: Typography.greeting.fontSize, fontWeight: Typography.greeting.fontWeight, color: Colors.textPrimary },
  subtitle: { color: Colors.textSecondary },

  card: {
    backgroundColor: "rgba(255,255,255,0.06)",
    borderRadius: Radius.card,
    padding: 14,
    marginBottom: Spacing.gridGap,
  },

  quickRow: { flexDirection: "row", gap: 10 },
  quickBtn: { flex: 1, paddingVertical: 10, borderRadius: 14, alignItems: "center", backgroundColor: "rgba(255,255,255,0.08)" },
  quickBtnActive: { backgroundColor: "rgba(255,255,255,0.14)" },
  quickBtnText: { color: Colors.textPrimary, fontWeight: "800" },

  runBtn: { marginTop: 12, backgroundColor: Colors.cards.complete, paddingVertical: 12, borderRadius: 16, alignItems: "center" },
  runBtnText: { color: Colors.textPrimary, fontWeight: "900" },

  exportRow: { flexDirection: "row", gap: 10, marginTop: 10 },
  exportBtn: { flex: 1, paddingVertical: 11, borderRadius: 16, alignItems: "center", backgroundColor: "rgba(255,255,255,0.10)" },
  exportBtnText: { color: Colors.textPrimary, fontWeight: "900" },

  tr: { flexDirection: "row", paddingVertical: 10, alignItems: "center", borderTopWidth: 1, borderTopColor: "rgba(255,255,255,0.06)" },
  td: { color: Colors.textPrimary, fontSize: 12, fontWeight: "800" },

  userName: { color: Colors.textPrimary, fontSize: 13, fontWeight: "900" },
  userLast: { color: Colors.textSecondary, fontSize: 12, fontWeight: "800" },

  emptyText: { textAlign: "center", color: Colors.textSecondary },

  bottomBar: { position: "absolute", bottom: Layout.bottomNavSpacing, left: Spacing.screenPadding, right: Spacing.screenPadding, flexDirection: "row", justifyContent: "center", gap: 16 },
  backButton: { ...Components.backButton },
  backText: { color: Colors.textPrimary, fontWeight: "700" },
});
