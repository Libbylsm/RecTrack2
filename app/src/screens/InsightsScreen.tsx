import { useMemo, useState } from "react";
import { Alert, ScrollView, StyleSheet, Text, View } from "react-native";
import { fetchInsights } from "../api";
import type { User } from "../auth";
import { buildCity, money } from "../city";
import { currentMonthKey, groupByMonth, monthLabel } from "../month";
import { SAMPLE_INSIGHTS } from "../sampleData";
import { C, R, necessityColor, necessityLabel, themed } from "../theme";
import { Bar, Button, Card, SectionTitle } from "../ui";
import type { Insights, Necessity, StoredReceipt } from "../types";

interface Props {
  user: User;
  receipts: StoredReceipt[];
  insights: Insights | null;
  onInsights: (i: Insights) => void;
}

export default function InsightsScreen({ user, receipts, insights, onInsights }: Props) {
  const curKey = currentMonthKey();
  const cur = useMemo(() => groupByMonth(receipts).get(curKey) ?? [], [receipts]);
  const city = useMemo(() => buildCity(cur), [cur]);
  const [busy, setBusy] = useState(false);
  const cc = city.currency;

  const necessity = useMemo(() => {
    const t: Record<Necessity, number> = { essential: 0, nice_to_have: 0, impulse: 0 };
    cur.forEach((r) => r.items.forEach((i) => (t[i.necessity] += i.price)));
    return t;
  }, [cur]);

  async function analyse() {
    setBusy(true);
    try {
      onInsights(await fetchInsights(cur, user.monthlyBudget, monthLabel(curKey)));
    } catch (e: any) {
      Alert.alert("Analyst unavailable", `${e.message}\n\nShow demo insights instead?`, [
        { text: "No", style: "cancel" },
        { text: "Show demo", onPress: () => onInsights(SAMPLE_INSIGHTS) },
      ]);
    } finally {
      setBusy(false);
    }
  }

  if (cur.length === 0) {
    return (
      <View style={styles.center}>
        <Text style={{ fontSize: 56 }}>📊</Text>
        <Text style={styles.h2}>No data this month yet</Text>
        <Text style={styles.sub}>Scan a few receipts and your AI analyst will get to work.</Text>
      </View>
    );
  }

  const tipTotal = insights?.savings_tips.reduce((s, t) => s + t.estimated_monthly_saving, 0) ?? 0;

  return (
    <ScrollView style={{ flex: 1, backgroundColor: C.bg }} contentContainerStyle={styles.wrap}>
      <Text style={styles.h1}>Insights</Text>
      <Text style={styles.sub}>{monthLabel(curKey)}</Text>

      <View style={styles.statsRow}>
        <Stat label="Spent" value={money(city.totalSpend, cc)} />
        <Stat label="Saved" value={money(city.totalSavings, cc)} color={C.good} />
        <Stat label="Impulse" value={`${Math.round(city.impulseShare * 100)}%`} color={city.impulseShare > 0.2 ? C.bad : C.ink} />
      </View>

      <SectionTitle title="By district" />
      <Card>
        {city.districts.map((d) => (
          <View key={d.category} style={{ marginBottom: 12 }}>
            <View style={styles.barLabelRow}>
              <Text style={styles.barLabel}>{d.def.landmark}  {d.def.name}</Text>
              <Text style={styles.barValue}>{money(d.spend, cc)}</Text>
            </View>
            <Bar progress={d.spend / city.totalSpend} color={d.def.color} />
          </View>
        ))}
      </Card>

      <SectionTitle title="Need vs. want" />
      <Card>
        <View style={styles.stack}>
          {(Object.keys(necessity) as Necessity[]).map((k) =>
            necessity[k] > 0 ? <View key={k} style={{ flex: necessity[k], backgroundColor: necessityColor[k] }} /> : null,
          )}
        </View>
        {(Object.keys(necessity) as Necessity[]).map((k) => (
          <View key={k} style={styles.legendRow}>
            <View style={[styles.dot, { backgroundColor: necessityColor[k] }]} />
            <Text style={{ flex: 1, color: C.ink }}>{necessityLabel[k]}</Text>
            <Text style={styles.barValue}>{money(necessity[k], cc)}</Text>
          </View>
        ))}
      </Card>

      <Button
        title={insights ? "Re-run AI analyst" : "Ask the AI analyst"}
        icon={insights ? "refresh" : "sparkles"}
        loading={busy}
        onPress={analyse}
        style={{ marginTop: 22 }}
      />
      {busy && <Text style={styles.wait}>Crunching your receipts… this can take ~30s</Text>}

      {insights && (
        <>
          <Card style={styles.personaCard}>
            <Text style={{ fontSize: 60, textAlign: "center" }}>{insights.personality.emoji}</Text>
            <Text style={styles.youAre}>YOUR MONEY PERSONALITY</Text>
            <Text style={styles.archetype}>{insights.personality.archetype}</Text>
            <Text style={styles.tagline}>"{insights.personality.tagline}"</Text>
            <Text style={[styles.body, { textAlign: "center" }]}>{insights.personality.explanation}</Text>
          </Card>

          <SectionTitle title="🏛️ Mayor's report" />
          <Card><Text style={styles.body}>{insights.city_story}</Text></Card>

          <SectionTitle title="🔍 Patterns spotted" />
          <Card>
            {insights.patterns.map((p, i) => (
              <View key={i} style={{ marginBottom: i < insights.patterns.length - 1 ? 14 : 0 }}>
                <Text style={styles.itemTitle}>{p.title}</Text>
                <Text style={styles.body}>{p.detail}</Text>
              </View>
            ))}
          </Card>

          <SectionTitle title={`💰 Save up to ${money(tipTotal, cc)}/mo`} />
          <Card>
            {insights.savings_tips.map((t, i) => (
              <View key={i} style={styles.tipRow}>
                <Text style={{ flex: 1, color: C.ink, lineHeight: 20 }}>{t.tip}</Text>
                <Text style={styles.tipAmt}>+{money(t.estimated_monthly_saving, cc)}</Text>
              </View>
            ))}
          </Card>

          <SectionTitle title="👥 How you compare" />
          <Card>
            {insights.persona_comparison.map((p, i) => (
              <View key={i} style={{ marginBottom: i < insights.persona_comparison.length - 1 ? 14 : 0 }}>
                <Text style={styles.itemTitle}>vs. {p.persona}</Text>
                <Text style={styles.body}>{p.verdict}</Text>
              </View>
            ))}
          </Card>
        </>
      )}
    </ScrollView>
  );
}

function Stat({ label, value, color = C.ink }: { label: string; value: string; color?: string }) {
  return (
    <View style={styles.stat}>
      <Text style={[styles.statValue, { color }]} adjustsFontSizeToFit numberOfLines={1}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = themed(() => ({
  wrap: { padding: 18, paddingBottom: 120 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 32, backgroundColor: C.bg },
  h1: { color: C.ink, fontSize: 30, fontWeight: "900", letterSpacing: -0.8 },
  h2: { fontSize: 20, fontWeight: "800", color: C.ink, marginTop: 8 },
  sub: { color: C.muted, marginTop: 4, textAlign: "left" },
  statsRow: { flexDirection: "row", gap: 10, marginTop: 16 },
  stat: { flex: 1, backgroundColor: C.card, borderRadius: R.md, padding: 14, borderWidth: 1, borderColor: C.line },
  statValue: { fontSize: 20, fontWeight: "900" },
  statLabel: { color: C.muted, fontSize: 12, marginTop: 2 },
  barLabelRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 6 },
  barLabel: { color: C.ink, fontWeight: "600" },
  barValue: { color: C.ink, fontWeight: "800" },
  stack: { flexDirection: "row", height: 16, borderRadius: 8, overflow: "hidden", marginBottom: 14, gap: 3 },
  legendRow: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 8 },
  dot: { width: 10, height: 10, borderRadius: 5 },
  wait: { color: C.muted, textAlign: "center", marginTop: 10, fontSize: 12 },
  personaCard: { marginTop: 22, alignItems: "center", backgroundColor: C.accentSoft, borderColor: C.accent },
  youAre: { color: C.muted, marginTop: 6, fontSize: 11, fontWeight: "800", letterSpacing: 1.5 },
  archetype: { fontSize: 26, fontWeight: "900", color: C.accentText, textAlign: "center", marginTop: 4 },
  tagline: { fontStyle: "italic", color: C.ink, marginVertical: 10, textAlign: "center" },
  body: { color: C.ink, lineHeight: 21, opacity: 0.9 },
  itemTitle: { fontWeight: "800", color: C.ink, marginBottom: 3 },
  tipRow: { flexDirection: "row", gap: 12, alignItems: "center", paddingVertical: 8 },
  tipAmt: { color: C.good, fontWeight: "900" },
}));
