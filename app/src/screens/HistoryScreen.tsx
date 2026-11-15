import { useMemo, useState } from "react";
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { User } from "../auth";
import { buildCity, money } from "../city";
import CityView from "../CityView";
import { currentMonthKey, groupByMonth, monthLabel } from "../month";
import type { InsightsByMonth } from "../storage";
import { C, R } from "../theme";
import { Card, SectionTitle } from "../ui";
import type { StoredReceipt } from "../types";

interface Props {
  user: User;
  receipts: StoredReceipt[];
  insights: InsightsByMonth;
}

export default function HistoryScreen({ user, receipts, insights }: Props) {
  const months = useMemo(() => groupByMonth(receipts), [receipts]);
  const curKey = currentMonthKey();
  const past = [...months.entries()].filter(([k]) => k !== curKey);
  const [open, setOpen] = useState<string | null>(null);
  const budget = user.monthlyBudget;

  // Spending trend: current month + up to 5 previous, oldest on the left.
  const trendKeys = [curKey, ...past.map(([k]) => k)].slice(0, 6).reverse();
  const totals = trendKeys.map((k) => buildCity(months.get(k) ?? []).totalSpend);
  const maxTotal = Math.max(budget, ...totals, 1);

  return (
    <ScrollView style={{ flex: 1, backgroundColor: C.bg }} contentContainerStyle={styles.wrap}>
      <Text style={styles.h1}>History</Text>
      <Text style={styles.sub}>Every month starts a fresh city. Past cities are archived here.</Text>

      <Card style={{ marginTop: 18 }}>
        <Text style={styles.cardTitle}>Monthly spending</Text>
        <View style={styles.chart}>
          {budget > 0 && (
            <View style={[styles.budgetLine, { bottom: (budget / maxTotal) * 120 }]}>
              <Text style={styles.budgetLabel}>£{budget}</Text>
            </View>
          )}
          {trendKeys.map((k, i) => (
            <View key={k} style={styles.barCol}>
              <Text style={styles.barAmt}>£{Math.round(totals[i])}</Text>
              <View
                style={[
                  styles.bar,
                  {
                    height: Math.max(4, (totals[i] / maxTotal) * 120),
                    backgroundColor: k === curKey ? C.lime : budget && totals[i] > budget ? C.bad : C.violet,
                  },
                ]}
              />
              <Text style={[styles.barMonth, k === curKey && { color: C.lime }]}>{monthLabel(k, true).split(" ")[0]}</Text>
            </View>
          ))}
        </View>
      </Card>

      <SectionTitle title="Past months" />
      {past.length === 0 && (
        <Card style={{ alignItems: "center" }}>
          <Text style={{ fontSize: 36 }}>🗄️</Text>
          <Text style={styles.emptyText}>Nothing archived yet. When {monthLabel(curKey).split(" ")[0]} ends, its city lands here.</Text>
        </Card>
      )}
      {past.map(([k, rs]) => {
        const city = buildCity(rs);
        const under = budget > 0 && city.totalSpend <= budget;
        const ins = insights[k];
        return (
          <Pressable key={k} onPress={() => setOpen(k)} style={({ pressed }) => [styles.monthRow, pressed && { opacity: 0.85 }]}>
            <View style={styles.monthIcon}>
              <Text style={{ fontSize: 22 }}>{ins?.personality.emoji ?? (under ? "🏆" : "🏙️")}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.monthName}>{monthLabel(k)}</Text>
              <Text style={styles.monthMeta}>
                {rs.length} receipts · {city.districts.length} districts · air {city.health}/100
              </Text>
            </View>
            <View style={{ alignItems: "flex-end" }}>
              <Text style={styles.monthTotal}>{money(city.totalSpend, city.currency)}</Text>
              {budget > 0 && (
                <Text style={[styles.monthBudget, { color: under ? C.good : C.bad }]}>
                  {under ? "Under budget" : "Over budget"}
                </Text>
              )}
            </View>
            <Ionicons name="chevron-forward" size={18} color={C.dim} />
          </Pressable>
        );
      })}

      <Modal visible={!!open} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setOpen(null)}>
        {open && (
          <ScrollView style={{ flex: 1, backgroundColor: C.bg }} contentContainerStyle={{ padding: 18, paddingBottom: 40 }}>
            <View style={styles.modalHead}>
              <Text style={styles.h1}>{monthLabel(open)}</Text>
              <Pressable onPress={() => setOpen(null)} hitSlop={12} style={styles.close}>
                <Ionicons name="close" size={22} color={C.ink} />
              </Pressable>
            </View>
            <Text style={styles.sub}>
              Spent {money(buildCity(months.get(open) ?? []).totalSpend)} across {(months.get(open) ?? []).length} receipts
            </Text>
            {insights[open] && (
              <Card style={{ marginTop: 14, flexDirection: "row", alignItems: "center", gap: 12 }}>
                <Text style={{ fontSize: 34 }}>{insights[open].personality.emoji}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: C.lime, fontWeight: "900" }}>{insights[open].personality.archetype}</Text>
                  <Text style={{ color: C.muted, marginTop: 2 }}>{insights[open].personality.tagline}</Text>
                </View>
              </Card>
            )}
            <View style={{ marginTop: 14 }}>
              <CityView receipts={months.get(open) ?? []} title={`${monthLabel(open, true)} city`} />
            </View>
            <SectionTitle title="Receipts" />
            {(months.get(open) ?? []).map((r) => (
              <View key={r.id} style={styles.rRow}>
                <Text style={{ color: C.ink, fontWeight: "700", flex: 1 }}>{r.merchant}</Text>
                <Text style={{ color: C.muted, marginRight: 10 }}>{r.date}</Text>
                <Text style={{ color: C.ink, fontWeight: "800" }}>{money(r.total, r.currency)}</Text>
              </View>
            ))}
          </ScrollView>
        )}
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  wrap: { padding: 18, paddingBottom: 120 },
  h1: { color: C.ink, fontSize: 30, fontWeight: "900", letterSpacing: -0.8 },
  sub: { color: C.muted, marginTop: 6, lineHeight: 20 },
  cardTitle: { color: C.ink, fontWeight: "800", fontSize: 16, marginBottom: 14 },
  chart: { flexDirection: "row", alignItems: "flex-end", justifyContent: "space-around", height: 170, paddingTop: 10 },
  budgetLine: { position: "absolute", left: 0, right: 0, borderTopWidth: 1, borderColor: C.gold, borderStyle: "dashed", marginBottom: 22 },
  budgetLabel: { color: C.gold, fontSize: 10, fontWeight: "800", position: "absolute", right: 0, top: -14 },
  barCol: { alignItems: "center", flex: 1 },
  barAmt: { color: C.muted, fontSize: 10, marginBottom: 4, fontWeight: "700" },
  bar: { width: 22, borderRadius: 8 },
  barMonth: { color: C.muted, fontSize: 11, marginTop: 6, fontWeight: "700" },
  emptyText: { color: C.muted, textAlign: "center", marginTop: 8, lineHeight: 20 },
  monthRow: { flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: C.card, borderRadius: R.md, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: C.line },
  monthIcon: { width: 46, height: 46, borderRadius: 14, backgroundColor: C.cardHi, alignItems: "center", justifyContent: "center" },
  monthName: { color: C.ink, fontWeight: "800", fontSize: 16 },
  monthMeta: { color: C.muted, fontSize: 12, marginTop: 3 },
  monthTotal: { color: C.ink, fontWeight: "900", fontSize: 16 },
  monthBudget: { fontSize: 11, fontWeight: "800", marginTop: 3 },
  modalHead: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 6 },
  close: { width: 36, height: 36, borderRadius: 18, backgroundColor: C.card, alignItems: "center", justifyContent: "center" },
  rRow: { flexDirection: "row", alignItems: "center", backgroundColor: C.card, padding: 12, borderRadius: R.sm, marginBottom: 6 },
});
