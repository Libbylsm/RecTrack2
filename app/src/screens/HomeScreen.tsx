import { useMemo } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import type { User } from "../auth";
import { buildCity, money } from "../city";
import CityView from "../CityView";
import { computeGame, XP_PER_LEVEL } from "../game";
import { currentMonthKey, daysLeftInMonth, groupByMonth, monthLabel } from "../month";
import { C, R, themed } from "../theme";
import { Bar, BeatBar, Card, Pill, SectionTitle, Vinyl } from "../ui";
import type { StoredReceipt } from "../types";

interface Props {
  user: User;
  receipts: StoredReceipt[];
  goTo: (tab: "scan" | "history" | "profile" | "insights") => void;
}

export default function HomeScreen({ user, receipts, goTo }: Props) {
  const months = useMemo(() => groupByMonth(receipts), [receipts]);
  const curKey = currentMonthKey();
  const cur = months.get(curKey) ?? [];
  const city = useMemo(() => buildCity(cur), [cur]);
  const game = useMemo(() => computeGame(receipts, user.monthlyBudget), [receipts, user.monthlyBudget]);

  const budget = user.monthlyBudget || 0;
  const used = budget ? city.totalSpend / budget : 0;
  const left = Math.max(0, budget - city.totalSpend);
  const daysLeft = daysLeftInMonth();
  const perDay = left / Math.max(1, daysLeft + 1);
  const over = budget > 0 && city.totalSpend > budget;

  const prevKey = [...months.keys()].find((k) => k < curKey);
  const prevTotal = prevKey ? buildCity(months.get(prevKey)!).totalSpend : 0;
  const recent = [...cur].sort((a, b) => b.scannedAt - a.scannedAt).slice(0, 3);

  return (
    <ScrollView style={{ flex: 1, backgroundColor: C.bg }} contentContainerStyle={styles.wrap}>
      {/* Top bar */}
      <View style={styles.topBar}>
        <Pressable onPress={() => goTo("profile")} style={styles.avatar}>
          <Text style={styles.avatarText}>{(user.name || "?").slice(0, 1).toUpperCase()}</Text>
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={styles.hello}>Hi, {user.name}</Text>
          <Text style={styles.helloSub}>Conductor of Receiptopolis</Text>
        </View>
        <Pill ion="flame" text={`${game.streak}`} color={C.gold} bg={C.goldSoft} />
        <Pill ion="musical-notes" text={`Lv ${game.level}`} color={C.accentText} bg={C.accentSoft} />
      </View>

      {/* Hero: this month's spending */}
      <LinearGradient colors={[C.heroFrom, C.card]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.hero}>
        <View style={{ flex: 1 }}>
          <Text style={styles.heroLabel}>Spent in {monthLabel(curKey).split(" ")[0]}</Text>
          <Text style={styles.heroTotal} adjustsFontSizeToFit numberOfLines={1}>
            {money(city.totalSpend, city.currency)}
          </Text>
          {budget > 0 && (
            <Text style={[styles.heroMeta, over && { color: C.bad }]}>
              {over
                ? `${money(city.totalSpend - budget, city.currency)} over budget`
                : `${money(left, city.currency)} left · ${money(perDay, city.currency)}/day`}
            </Text>
          )}
          <View style={styles.heroPills}>
            <Pill text={`${cur.length} receipts`} />
            <Pill text={`${daysLeft}d left`} />
            {city.totalSavings > 0 && (
              <Pill text={`Saved ${money(city.totalSavings, city.currency)}`} color={C.good} bg={C.goodSoft} />
            )}
          </View>
        </View>
        <Vinyl size={112} progress={used} color={over ? C.bad : used > 0.8 ? C.warn : C.accent}>
          <Text style={styles.ringPct}>{budget ? Math.round(used * 100) : 0}%</Text>
          <Text style={styles.ringSub}>of £{budget}</Text>
        </Vinyl>
      </LinearGradient>

      {/* New-month banner */}
      {cur.length === 0 && prevKey && (
        <Pressable onPress={() => goTo("history")}>
          <Card style={[styles.banner]}>
            <View style={styles.bannerIcon}>
              <Ionicons name="sunny" size={22} color={C.gold} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.bannerTitle}>A fresh month, a fresh city!</Text>
              <Text style={styles.bannerText}>
                {monthLabel(prevKey)} closed at {money(prevTotal)}. It's saved in History.
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={C.muted} />
          </Card>
        </Pressable>
      )}

      {/* Level / XP */}
      <Card style={{ marginTop: 14 }}>
        <View style={styles.levelRow}>
          <View style={styles.levelBadge}>
            <Text style={styles.levelNum}>{game.level}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.levelTitle}>{game.levelTitle}</Text>
            <Text style={styles.levelSub}>{game.xpIntoLevel} / {XP_PER_LEVEL} XP to level {game.level + 1}</Text>
          </View>
          <Text style={styles.xpTotal}>{game.xp} XP</Text>
        </View>
        <View style={{ marginTop: 14 }}>
          <BeatBar progress={game.levelProgress} />
        </View>
      </Card>

      {/* Quests, shown as a tracklist */}
      <SectionTitle title="Monthly quests" />
      <Card style={styles.tracklist}>
        {game.quests.map((q, i) => (
          <View key={q.id} style={[styles.quest, i < game.quests.length - 1 && styles.questDivider]}>
            <View style={styles.trackNum}>
              {q.done ? (
                <Ionicons name="checkmark-circle" size={22} color={C.good} />
              ) : (
                <Text style={styles.trackNumText}>{String(i + 1).padStart(2, "0")}</Text>
              )}
            </View>
            <View style={{ flex: 1, gap: 7 }}>
              <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 8 }}>
                <Text style={styles.questTitle}>{q.title}</Text>
                <Text style={styles.questXp}>+{q.xp} XP</Text>
              </View>
              <Bar progress={q.progress} color={q.done ? C.good : C.accent} height={6} />
              <Text style={styles.questLabel}>{q.label}</Text>
            </View>
          </View>
        ))}
      </Card>

      {/* City */}
      <SectionTitle title="Your city this month" action="History" onAction={() => goTo("history")} />
      <CityView receipts={cur} title={`${monthLabel(curKey)}`} />

      {/* Recent */}
      <SectionTitle title="Recent receipts" action="Scan" onAction={() => goTo("scan")} />
      {recent.length === 0 ? (
        <Text style={styles.muted}>Nothing scanned this month yet.</Text>
      ) : (
        recent.map((r) => (
          <View key={r.id} style={styles.recentRow}>
            <View style={styles.recentIcon}>
              <Ionicons name={r.receipt_type === "digital" ? "phone-portrait-outline" : "receipt-outline"} size={18} color={C.ink} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.recentName}>{r.merchant}</Text>
              <Text style={styles.recentMeta}>{r.date || "Undated"} · {r.items.length} items</Text>
            </View>
            <Text style={styles.recentAmt}>-{money(r.total, r.currency)}</Text>
          </View>
        ))
      )}
    </ScrollView>
  );
}

const styles = themed(() => ({
  wrap: { padding: 18, paddingBottom: 120 },
  topBar: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 18 },
  avatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: C.accent, alignItems: "center", justifyContent: "center" },
  avatarText: { color: "#fff", fontWeight: "900", fontSize: 18 },
  hello: { color: C.ink, fontWeight: "800", fontSize: 17 },
  helloSub: { color: C.muted, fontSize: 12, marginTop: 1 },
  hero: { borderRadius: R.lg, padding: 20, flexDirection: "row", alignItems: "center", gap: 12, borderWidth: 1, borderColor: C.accentSoft },
  heroLabel: { color: C.muted, fontWeight: "700", fontSize: 13, textTransform: "uppercase", letterSpacing: 1 },
  heroTotal: { color: C.ink, fontSize: 40, fontWeight: "900", letterSpacing: -1.5, marginTop: 4 },
  heroMeta: { color: C.accentText, fontWeight: "700", marginTop: 2 },
  heroPills: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 12 },
  ringPct: { color: C.onAccent, fontSize: 15, fontWeight: "900" },
  ringSub: { color: C.onAccent, fontSize: 8, fontWeight: "700", opacity: 0.9 },
  banner: { flexDirection: "row", alignItems: "center", gap: 12, marginTop: 14, borderColor: C.accent },
  bannerIcon: { width: 42, height: 42, borderRadius: 13, backgroundColor: C.goldSoft, alignItems: "center", justifyContent: "center" },
  bannerTitle: { color: C.ink, fontWeight: "800" },
  bannerText: { color: C.muted, marginTop: 2, fontSize: 13 },
  levelRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  levelBadge: { width: 44, height: 44, borderRadius: 14, backgroundColor: C.accentSoft, borderWidth: 2, borderColor: C.accent, alignItems: "center", justifyContent: "center" },
  levelNum: { color: C.ink, fontWeight: "900", fontSize: 18 },
  levelTitle: { color: C.ink, fontWeight: "800", fontSize: 16 },
  levelSub: { color: C.muted, fontSize: 12, marginTop: 2 },
  xpTotal: { color: C.accentText, fontWeight: "900" },
  tracklist: { padding: 0, overflow: "hidden" },
  quest: { flexDirection: "row", alignItems: "center", gap: 12, padding: 14 },
  questDivider: { borderBottomWidth: 1, borderBottomColor: C.line },
  trackNum: { width: 26, alignItems: "center" },
  trackNumText: { color: C.accentText, fontWeight: "900", fontSize: 14, fontVariant: ["tabular-nums"] },
  questTitle: { color: C.ink, fontWeight: "700", flex: 1 },
  questXp: { color: C.gold, fontWeight: "800", fontSize: 12 },
  questLabel: { color: C.muted, fontSize: 12 },
  muted: { color: C.muted },
  recentRow: { flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: C.card, borderRadius: R.md, padding: 12, marginBottom: 8, borderWidth: 1, borderColor: C.line },
  recentIcon: { width: 40, height: 40, borderRadius: 12, backgroundColor: C.cardHi, alignItems: "center", justifyContent: "center" },
  recentName: { color: C.ink, fontWeight: "700" },
  recentMeta: { color: C.muted, fontSize: 12, marginTop: 2 },
  recentAmt: { color: C.ink, fontWeight: "800" },
}));
