import { useMemo, useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { User } from "../auth";
import { computeGame, XP_PER_LEVEL } from "../game";
import { C, R } from "../theme";
import { Bar, Button, Card, SectionTitle } from "../ui";
import type { StoredReceipt } from "../types";

interface Props {
  user: User;
  receipts: StoredReceipt[];
  onUpdateUser: (u: User) => void;
  onSignOut: () => void;
  onResetData: () => void;
}

const PROVIDER = {
  apple: { icon: "logo-apple", label: "Apple ID" },
  google: { icon: "logo-google", label: "Google" },
  email: { icon: "mail", label: "Email" },
} as const;

export default function ProfileScreen({ user, receipts, onUpdateUser, onSignOut, onResetData }: Props) {
  const game = useMemo(() => computeGame(receipts, user.monthlyBudget), [receipts, user.monthlyBudget]);
  const [budget, setBudget] = useState(String(user.monthlyBudget));
  const unlocked = game.achievements.filter((a) => a.unlocked).length;
  const p = PROVIDER[user.provider];

  return (
    <ScrollView style={{ flex: 1, backgroundColor: C.bg }} contentContainerStyle={styles.wrap}>
      <View style={styles.head}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{(user.name || "?").slice(0, 1).toUpperCase()}</Text>
          <View style={styles.lvl}><Text style={styles.lvlText}>{game.level}</Text></View>
        </View>
        <Text style={styles.name}>{user.name}</Text>
        <Text style={styles.title}>{game.levelTitle}</Text>
        <View style={styles.provider}>
          <Ionicons name={p.icon} size={14} color={C.muted} />
          <Text style={styles.providerText}>{p.label} · {user.email}</Text>
        </View>
      </View>

      <View style={styles.statsRow}>
        <Stat value={`${game.xp}`} label="Total XP" color={C.violet} />
        <Stat value={`🔥 ${game.streak}`} label="Day streak" color={C.gold} />
        <Stat value={`${receipts.length}`} label="Receipts" />
      </View>

      <Card style={{ marginTop: 12 }}>
        <Text style={styles.cardLabel}>Level {game.level} → {game.level + 1}</Text>
        <View style={{ marginVertical: 10 }}><Bar progress={game.levelProgress} color={C.violet} height={10} /></View>
        <Text style={styles.cardSub}>{XP_PER_LEVEL - game.xpIntoLevel} XP to go · scan receipts, save with deals and finish quests to level up</Text>
      </Card>

      <SectionTitle title={`Badges ${unlocked}/${game.achievements.length}`} />
      <View style={styles.badges}>
        {game.achievements.map((a) => (
          <View key={a.id} style={[styles.badge, !a.unlocked && { opacity: 0.35 }]}>
            <View style={[styles.badgeIcon, a.unlocked && { borderColor: C.lime }]}>
              <Text style={{ fontSize: 26 }}>{a.unlocked ? a.icon : "🔒"}</Text>
            </View>
            <Text style={styles.badgeTitle} numberOfLines={1}>{a.title}</Text>
            <Text style={styles.badgeDesc} numberOfLines={2}>{a.desc}</Text>
          </View>
        ))}
      </View>

      <SectionTitle title="Settings" />
      <Card>
        <Text style={styles.cardLabel}>Monthly budget</Text>
        <View style={styles.budgetRow}>
          <Text style={styles.pound}>£</Text>
          <TextInput
            style={styles.budgetInput} value={budget} keyboardType="number-pad"
            onChangeText={(t) => setBudget(t.replace(/[^0-9]/g, ""))}
          />
          <Pressable
            style={styles.save}
            onPress={() => {
              const b = Number(budget);
              if (!b) return Alert.alert("Enter a budget above £0");
              onUpdateUser({ ...user, monthlyBudget: b });
              Alert.alert("Saved", `Monthly budget set to £${b}.`);
            }}
          >
            <Text style={{ color: C.limeInk, fontWeight: "800" }}>Save</Text>
          </Pressable>
        </View>
      </Card>

      <Button title="Sign out" icon="log-out-outline" variant="ghost" onPress={onSignOut} style={{ marginTop: 18 }} />
      <Pressable
        onPress={() =>
          Alert.alert("Demolish every city?", "Deletes all receipts and insights for this account.", [
            { text: "Cancel", style: "cancel" },
            { text: "Delete all", style: "destructive", onPress: onResetData },
          ])
        }
      >
        <Text style={styles.reset}>Reset all data</Text>
      </Pressable>
      <Text style={styles.demoNote}>Demo build · sign-in is simulated for presentation</Text>
    </ScrollView>
  );
}

function Stat({ value, label, color = C.ink }: { value: string; label: string; color?: string }) {
  return (
    <View style={styles.stat}>
      <Text style={[styles.statValue, { color }]} adjustsFontSizeToFit numberOfLines={1}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { padding: 18, paddingBottom: 120 },
  head: { alignItems: "center", marginTop: 10 },
  avatar: { width: 92, height: 92, borderRadius: 46, backgroundColor: C.violet, alignItems: "center", justifyContent: "center", borderWidth: 3, borderColor: C.lime },
  avatarText: { color: "#fff", fontSize: 38, fontWeight: "900" },
  lvl: { position: "absolute", bottom: -6, right: -2, backgroundColor: C.lime, borderRadius: 12, paddingHorizontal: 8, paddingVertical: 2, borderWidth: 3, borderColor: C.bg },
  lvlText: { color: C.limeInk, fontWeight: "900", fontSize: 13 },
  name: { color: C.ink, fontSize: 26, fontWeight: "900", marginTop: 14 },
  title: { color: C.lime, fontWeight: "800", marginTop: 2 },
  provider: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 8, backgroundColor: C.card, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999 },
  providerText: { color: C.muted, fontSize: 12 },
  statsRow: { flexDirection: "row", gap: 10, marginTop: 22 },
  stat: { flex: 1, backgroundColor: C.card, borderRadius: R.md, padding: 14, alignItems: "center", borderWidth: 1, borderColor: C.line },
  statValue: { fontSize: 20, fontWeight: "900" },
  statLabel: { color: C.muted, fontSize: 12, marginTop: 2 },
  cardLabel: { color: C.ink, fontWeight: "800" },
  cardSub: { color: C.muted, fontSize: 12, lineHeight: 17 },
  badges: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  badge: { width: "23%", alignItems: "center" },
  badgeIcon: { width: 62, height: 62, borderRadius: 20, backgroundColor: C.card, alignItems: "center", justifyContent: "center", borderWidth: 2, borderColor: C.line },
  badgeTitle: { color: C.ink, fontWeight: "800", fontSize: 11, marginTop: 6 },
  badgeDesc: { color: C.muted, fontSize: 10, textAlign: "center", marginTop: 2 },
  budgetRow: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 10 },
  pound: { color: C.lime, fontSize: 22, fontWeight: "900" },
  budgetInput: { flex: 1, color: C.ink, fontSize: 20, fontWeight: "800", backgroundColor: C.cardHi, borderRadius: R.sm, padding: 12 },
  save: { backgroundColor: C.lime, borderRadius: R.sm, paddingVertical: 14, paddingHorizontal: 18 },
  reset: { color: C.bad, textAlign: "center", marginTop: 18, fontWeight: "700" },
  demoNote: { color: C.dim, textAlign: "center", fontSize: 11, marginTop: 14 },
});
