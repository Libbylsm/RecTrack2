import { useMemo, useState } from "react";
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { fetchInsights } from "../api";
import { buildCity, money } from "../city";
import { SAMPLE_INSIGHTS } from "../sampleData";
import { C, necessityColor, necessityLabel } from "../theme";
import type { Insights, Necessity, StoredReceipt } from "../types";

interface Props {
  receipts: StoredReceipt[];
  insights: Insights | null;
  onInsights: (i: Insights) => void;
}

export default function InsightsScreen({ receipts, insights, onInsights }: Props) {
  const city = useMemo(() => buildCity(receipts), [receipts]);
  const [busy, setBusy] = useState(false);
  const cur = city.currency;

  const necessity = useMemo(() => {
    const t: Record<Necessity, number> = { essential: 0, nice_to_have: 0, impulse: 0 };
    receipts.forEach((r) => r.items.forEach((i) => (t[i.necessity] += i.price)));
    return t;
  }, [receipts]);

  async function analyse() {
    setBusy(true);
    try {
      onInsights(await fetchInsights(receipts));
    } catch (e: any) {
      Alert.alert("Analyst unavailable", `${e.message}\n\nShow demo insights instead?`, [
        { text: "No", style: "cancel" },
        { text: "Show demo", onPress: () => onInsights(SAMPLE_INSIGHTS) },
      ]);
    } finally {
      setBusy(false);
    }
  }

  if (receipts.length === 0) {
    return (
      <View style={[styles.center, { backgroundColor: C.bg }]}>
        <Text style={{ fontSize: 56 }}>📊</Text>
        <Text style={styles.h2}>No data yet</Text>
        <Text style={styles.sub}>Scan a few receipts first.</Text>
      </View>
    );
  }

  const tipTotal = insights?.savings_tips.reduce((s, t) => s + t.estimated_monthly_saving, 0) ?? 0;

  return (
    <ScrollView style={{ flex: 1, backgroundColor: C.bg }} contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
      <Text style={styles.h1}>Where it actually goes</Text>

      <View style={styles.statsRow}>
        <Stat label="Spent" value={money(city.totalSpend, cur)} />
        <Stat label="Saved by deals" value={money(city.totalSavings, cur)} />
        <Stat label="Impulse" value={`${Math.round(city.impulseShare * 100)}%`} />
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>By district</Text>
        {city.districts.map((d) => (
          <View key={d.category} style={{ marginBottom: 10 }}>
            <View style={styles.barLabelRow}>
              <Text style={styles.barLabel}>{d.def.landmark} {d.def.name}</Text>
              <Text style={styles.barValue}>{money(d.spend, cur)}</Text>
            </View>
            <View style={styles.barTrack}>
              <View style={[styles.barFill, { width: `${(d.spend / city.totalSpend) * 100}%`, backgroundColor: d.def.color }]} />
            </View>
          </View>
        ))}
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Need vs. want</Text>
        <View style={styles.stack}>
          {(Object.keys(necessity) as Necessity[]).map((k) =>
            necessity[k] > 0 ? (
              <View key={k} style={{ flex: necessity[k], backgroundColor: necessityColor[k] }} />
            ) : null,
          )}
        </View>
        {(Object.keys(necessity) as Necessity[]).map((k) => (
          <View key={k} style={styles.legendRow}>
            <View style={[styles.dot, { backgroundColor: necessityColor[k] }]} />
            <Text style={{ flex: 1, color: C.ink }}>{necessityLabel[k]}</Text>
            <Text style={styles.barValue}>{money(necessity[k], cur)}</Text>
          </View>
        ))}
      </View>

      <Pressable style={[styles.aiBtn, busy && { opacity: 0.7 }]} onPress={analyse} disabled={busy}>
        {busy ? <ActivityIndicator color="white" /> : (
          <Text style={styles.aiBtnText}>{insights ? "🔄 Re-run AI analyst" : "🤖 Ask the AI analyst"}</Text>
        )}
      </Pressable>

      {insights && (
        <>
          <View style={[styles.card, styles.personaCard]}>
            <Text style={{ fontSize: 60, textAlign: "center" }}>{insights.personality.emoji}</Text>
            <Text style={styles.youAre}>You are…</Text>
            <Text style={styles.archetype}>{insights.personality.archetype}</Text>
            <Text style={styles.tagline}>"{insights.personality.tagline}"</Text>
            <Text style={styles.body}>{insights.personality.explanation}</Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>🏛️ Mayor's report</Text>
            <Text style={styles.body}>{insights.city_story}</Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>🔍 Patterns spotted</Text>
            {insights.patterns.map((p, i) => (
              <View key={i} style={{ marginBottom: 10 }}>
                <Text style={styles.itemTitle}>{p.title}</Text>
                <Text style={styles.body}>{p.detail}</Text>
              </View>
            ))}
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>💰 Save up to {money(tipTotal, cur)}/month</Text>
            {insights.savings_tips.map((t, i) => (
              <View key={i} style={styles.tipRow}>
                <Text style={{ flex: 1, color: C.ink }}>{t.tip}</Text>
                <Text style={[styles.barValue, { color: C.good }]}>+{money(t.estimated_monthly_saving, cur)}</Text>
              </View>
            ))}
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>👥 How you compare</Text>
            {insights.persona_comparison.map((p, i) => (
              <View key={i} style={{ marginBottom: 10 }}>
                <Text style={styles.itemTitle}>vs. {p.persona}</Text>
                <Text style={styles.body}>{p.verdict}</Text>
              </View>
            ))}
          </View>
        </>
      )}
    </ScrollView>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 32 },
  h1: { fontSize: 28, fontWeight: "800", color: C.ink },
  h2: { fontSize: 20, fontWeight: "800", color: C.ink, marginTop: 8 },
  sub: { color: C.muted, marginTop: 4 },
  statsRow: { flexDirection: "row", gap: 8, marginTop: 14 },
  stat: { flex: 1, backgroundColor: C.card, borderRadius: 14, padding: 12, borderWidth: 1, borderColor: C.line },
  statValue: { fontSize: 18, fontWeight: "800", color: C.ink },
  statLabel: { color: C.muted, fontSize: 12, marginTop: 2 },
  card: { backgroundColor: C.card, borderRadius: 18, padding: 16, marginTop: 14, borderWidth: 1, borderColor: C.line },
  cardTitle: { fontSize: 17, fontWeight: "800", color: C.ink, marginBottom: 12 },
  barLabelRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 4 },
  barLabel: { color: C.ink, fontWeight: "600" },
  barValue: { color: C.ink, fontWeight: "700" },
  barTrack: { height: 10, backgroundColor: C.line, borderRadius: 5, overflow: "hidden" },
  barFill: { height: 10, borderRadius: 5 },
  stack: { flexDirection: "row", height: 18, borderRadius: 9, overflow: "hidden", marginBottom: 12, gap: 2 },
  legendRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 6 },
  dot: { width: 10, height: 10, borderRadius: 5 },
  aiBtn: { backgroundColor: C.accent, borderRadius: 16, padding: 18, alignItems: "center", marginTop: 18 },
  aiBtnText: { color: "white", fontWeight: "800", fontSize: 16 },
  personaCard: { backgroundColor: C.accentSoft, borderColor: C.accent, alignItems: "center" },
  youAre: { color: C.muted, marginTop: 4 },
  archetype: { fontSize: 26, fontWeight: "900", color: C.accent, textAlign: "center" },
  tagline: { fontStyle: "italic", color: C.ink, marginVertical: 8, textAlign: "center" },
  body: { color: C.ink, lineHeight: 21 },
  itemTitle: { fontWeight: "700", color: C.ink, marginBottom: 2 },
  tipRow: { flexDirection: "row", gap: 10, alignItems: "center", marginBottom: 10 },
});
