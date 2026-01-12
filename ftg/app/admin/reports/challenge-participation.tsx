// FILE: app/admin/reports/challenge-particpation.tsx
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

// ✅ You have a known VS Code typing glitch for expo-file-system; keep this pattern.
const FS = FileSystem as any;

type Challenge = {
  id: string;
  name: string;
  active?: boolean | null;
};

type RangeKey = "7" | "30" | "ytd";

type ReportResult = {
  total_users: number;
  completed_users: number;
  completion_percent: number;
};

export default function ChallengeParticipationReport() {
  const router = useRouter();

  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState<"pdf" | "csv" | null>(null);

  const [rangeKey, setRangeKey] = useState<RangeKey>("7");

  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [selectedChallengeId, setSelectedChallengeId] = useState<string | null>(
    null
  );

  const [result, setResult] = useState<ReportResult | null>(null);
  const [lastRunLabel, setLastRunLabel] = useState<string>("");

  const isBusy = loading || exporting !== null;

  const hasResults = useMemo(() => {
    return !!result && result.total_users > 0 && selectedChallengeId;
  }, [result, selectedChallengeId]);

  const selectedChallenge = useMemo(() => {
    return challenges.find((c) => c.id === selectedChallengeId) || null;
  }, [challenges, selectedChallengeId]);

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

    // Range includes today: last N days = (N-1) days ago through today
    const start = new Date(todayStart);
    start.setDate(start.getDate() - (days - 1));

    return {
      start,
      end: todayEnd,
      label: `Last ${days} Days (${fmtMMDDYYYY(start)} – ${fmtMMDDYYYY(now)})`,
    };
  };

  const loadChallenges = async () => {
    // Load once if empty
    if (challenges.length > 0) return;

    try {
      const { data, error } = await supabase
        .from("challenges")
        .select("id,name,active")
        .eq("active", true)
        .order("name", { ascending: true });

      if (error) throw error;

      const list = (data ?? []) as any[];
      const mapped: Challenge[] = list.map((x) => ({
        id: String(x.id),
        name: String(x.name ?? "Unnamed Challenge"),
        active: x.active ?? true,
      }));

      setChallenges(mapped);

      // Pick first if none selected
      if (!selectedChallengeId && mapped.length > 0) {
        setSelectedChallengeId(mapped[0].id);
      }
    } catch (e: any) {
      Alert.alert("Error", e?.message ?? "Failed to load challenges.");
    }
  };

  const runReport = async () => {
    if (isBusy) return;

    await loadChallenges();

    if (!selectedChallengeId) {
      Alert.alert("Missing challenge", "Please select a challenge.");
      return;
    }

    setLoading(true);
    try {
      const { start, end, label } = computeRange(rangeKey);

      // 1) Total registered users (excluding admins)
      const { data: profs, error: profErr } = await supabase
        .from("profiles")
        .select("id,role");

      if (profErr) throw profErr;

      const profiles = (profs ?? []) as any[];
      const eligibleUserIds = profiles
        .filter((p) => String(p?.role ?? "").toLowerCase() !== "admin")
        .map((p) => String(p.id));

      const total_users = eligibleUserIds.length;

      if (total_users === 0) {
        setResult({ total_users: 0, completed_users: 0, completion_percent: 0 });
        setLastRunLabel(label);
        return;
      }

      // 2) Completed users for selected challenge within range
      // Use occurred_at timestamp if present.
      const { data: acts, error: actErr } = await supabase
        .from("challenge_activity")
        .select("user_id")
        .eq("challenge_id", selectedChallengeId)
        .eq("status", "approved")
        .gte("occurred_at", start.toISOString())
        .lte("occurred_at", end.toISOString());

      if (actErr) throw actErr;

      const completedSet = new Set<string>();
      for (const r of acts ?? []) {
        const uid = String((r as any).user_id ?? "");
        if (!uid) continue;
        if (eligibleUserIds.includes(uid)) completedSet.add(uid);
      }

      const completed_users = completedSet.size;
      const completion_percent =
        total_users > 0 ? Math.round((completed_users / total_users) * 1000) / 10 : 0; // 1 decimal

      setResult({ total_users, completed_users, completion_percent });
      setLastRunLabel(label);
    } catch (e: any) {
      Alert.alert("Error", e?.message ?? "Failed to run report.");
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

  const buildHtml = () => {
    const rangeLabel = lastRunLabel || "—";
    const challengeName = selectedChallenge?.name ?? "—";
    const total = result?.total_users ?? 0;
    const completed = result?.completed_users ?? 0;
    const pct = result?.completion_percent ?? 0;

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
      .big { font-size: 18px; font-weight: 800; }
    </style>
  </head>
  <body>
    <h1>Challenge Participation</h1>
    <div class="sub">Completion percentage for selected challenge</div>

    <div class="filters">
      <div>${escapeHtml(`Challenge: ${challengeName}`)}</div>
      <div>${escapeHtml(`Range: ${rangeLabel}`)}</div>
      <div>${escapeHtml(`Registered Users (non-admin): ${total}`)}</div>
    </div>

    <table>
      <thead>
        <tr>
          <th>Metric</th>
          <th style="text-align:right;">Value</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>Completed Users</td>
          <td style="text-align:right;">${completed}</td>
        </tr>
        <tr>
          <td>Completion %</td>
          <td style="text-align:right;"><span class="big">${pct}%</span></td>
        </tr>
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
      const html = buildHtml();
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
      const challengeName = selectedChallenge?.name ?? "";
      const total = result?.total_users ?? 0;
      const completed = result?.completed_users ?? 0;
      const pct = result?.completion_percent ?? 0;

      const header = ["Challenge", "Range", "RegisteredUsers", "CompletedUsers", "CompletionPercent"];
      const line = [
        csvEscape(challengeName),
        csvEscape(lastRunLabel || ""),
        csvEscape(total),
        csvEscape(completed),
        csvEscape(pct),
      ].join(",");

      const csv = [header.join(","), line].join("\n");
      const filename = `challenge-participation-${rangeKey}-${new Date()
        .toISOString()
        .slice(0, 10)}.csv`;
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
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          onTouchStart={loadChallenges}
        >
          <View style={styles.titleRow}>
            <Text style={styles.title}>Challenge Participation</Text>
            <Text style={styles.subtitle}>Select range + challenge • % completed</Text>
          </View>

          <View style={styles.card}>
            <LinearGradient
              colors={["rgba(255,255,255,0.35)", "rgba(255,255,255,0.05)"]}
              start={{ x: 1, y: 0 }}
              end={{ x: 0, y: 1 }}
              style={styles.cornerBubble}
            >
              <Text style={styles.bubbleIcon}>📊</Text>
            </LinearGradient>

            <View style={styles.topSpacer} />

            <View style={styles.quickRow}>
              <QuickBtn
                label="7 Days"
                active={rangeKey === "7"}
                onPress={() => setRangeKey("7")}
              />
              <QuickBtn
                label="30 Days"
                active={rangeKey === "30"}
                onPress={() => setRangeKey("30")}
              />
              <QuickBtn
                label="YTD"
                active={rangeKey === "ytd"}
                onPress={() => setRangeKey("ytd")}
              />
            </View>

            <Text style={styles.rangeText}>{computeRange(rangeKey).label}</Text>

            <View style={styles.dropdownWrap}>
              <Text style={styles.dropdownLabel}>Challenge</Text>

              <View style={styles.dropdownRow}>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.pillsRow}
                >
                  {(challenges.length ? challenges : [{ id: "loading", name: "Tap to load…" }]).map(
                    (c) => {
                      const isSelected = c.id === selectedChallengeId;
                      const isLoading = c.id === "loading";
                      return (
                        <TouchableOpacity
                          key={c.id}
                          disabled={isLoading || isBusy}
                          onPress={() => setSelectedChallengeId(c.id)}
                          style={[
                            styles.pill,
                            isSelected && styles.pillActive,
                            (isLoading || isBusy) && styles.pillDisabled,
                          ]}
                          activeOpacity={0.9}
                        >
                          <Text style={styles.pillText} numberOfLines={1}>
                            {c.name}
                          </Text>
                        </TouchableOpacity>
                      );
                    }
                  )}
                </ScrollView>
              </View>

              <Text style={styles.subtitle}>
                Selected: {selectedChallenge?.name ?? "—"}
              </Text>
            </View>

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
                {result ? "Loaded" : "Run to load"}
              </Text>
            </View>

            {!result ? (
              <View style={styles.emptyBox}>
                <Text style={styles.emptyText}>No results yet.</Text>
              </View>
            ) : (
              <View style={styles.kpiWrap}>
                <View style={styles.kpiRow}>
                  <Kpi label="Registered" value={result.total_users} />
                  <Kpi label="Completed" value={result.completed_users} />
                </View>

                <View style={styles.kpiBig}>
                  <Text style={styles.kpiBigLabel}>Completion</Text>
                  <Text style={styles.kpiBigValue}>
                    {result.completion_percent}%
                  </Text>
                  <Text style={styles.kpiBigSub}>
                    {lastRunLabel || computeRange(rangeKey).label}
                  </Text>
                </View>
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

function Kpi({ label, value }: { label: string; value: number }) {
  return (
    <View style={styles.kpi}>
      <Text style={styles.kpiLabel}>{label}</Text>
      <Text style={styles.kpiValue}>{value}</Text>
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

  dropdownWrap: {
    marginTop: 12,
  },
  dropdownLabel: {
    color: Colors.textSecondary,
    fontSize: 12,
    fontWeight: "900",
    marginBottom: 8,
  },
  dropdownRow: {
    borderRadius: 14,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
    backgroundColor: "rgba(0,0,0,0.12)",
  },
  pillsRow: {
    paddingVertical: 10,
    paddingHorizontal: 10,
    gap: 10,
  },
  pill: {
    backgroundColor: "rgba(255,255,255,0.08)",
    borderRadius: 999,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
    maxWidth: 240,
  },
  pillActive: {
    backgroundColor: "rgba(255,255,255,0.14)",
    borderColor: "rgba(255,255,255,0.20)",
  },
  pillDisabled: {
    opacity: 0.6,
  },
  pillText: {
    color: Colors.textPrimary,
    fontSize: 12,
    fontWeight: "900",
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

  kpiWrap: {
    gap: 12,
  },
  kpiRow: {
    flexDirection: "row",
    gap: 10,
  },
  kpi: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.18)",
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    alignItems: "center",
  },
  kpiLabel: {
    color: Colors.textSecondary,
    fontSize: 12,
    fontWeight: "900",
    marginBottom: 6,
  },
  kpiValue: {
    color: Colors.textPrimary,
    fontSize: 20,
    fontWeight: "900",
  },
  kpiBig: {
    backgroundColor: "rgba(255,255,255,0.08)",
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    alignItems: "center",
  },
  kpiBigLabel: {
    color: Colors.textSecondary,
    fontSize: 12,
    fontWeight: "900",
  },
  kpiBigValue: {
    color: Colors.textPrimary,
    fontSize: 34,
    fontWeight: "900",
    marginTop: 6,
  },
  kpiBigSub: {
    marginTop: 6,
    color: Colors.textSecondary,
    fontSize: 12,
    fontWeight: "800",
    textAlign: "center",
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
