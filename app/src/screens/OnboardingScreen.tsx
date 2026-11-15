import { useState } from "react";
import { Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { User } from "../auth";
import { C, R, themed } from "../theme";
import { Button } from "../ui";

const BUDGETS = [300, 500, 800, 1200];

export default function OnboardingScreen({ user, onDone }: { user: User; onDone: (u: User) => void }) {
  const [name, setName] = useState(user.name);
  const [budget, setBudget] = useState(user.monthlyBudget ? String(user.monthlyBudget) : "500");

  function finish() {
    const b = Number(budget);
    if (!name.trim()) return Alert.alert("What should we call you?", "Enter a name for your mayor profile.");
    if (!b || b <= 0) return Alert.alert("Monthly budget", "Enter a monthly budget in pounds.");
    onDone({ ...user, name: name.trim(), monthlyBudget: Math.round(b) });
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: C.bg }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView contentContainerStyle={styles.wrap} keyboardShouldPersistTaps="handled">
        <Text style={{ fontSize: 48 }}>🏗️</Text>
        <Text style={styles.h1}>Set up your city</Text>
        <Text style={styles.sub}>Two quick things and you're the mayor.</Text>

        <Text style={styles.label}>Your name</Text>
        <TextInput
          style={styles.input} value={name} onChangeText={setName} placeholder="e.g. Alex"
          placeholderTextColor={C.dim} autoFocus
        />

        <Text style={styles.label}>Monthly spending budget</Text>
        <View style={styles.budgetInput}>
          <Text style={styles.pound}>£</Text>
          <TextInput
            style={[styles.input, { flex: 1, borderWidth: 0, paddingLeft: 0 }]} value={budget}
            onChangeText={(t) => setBudget(t.replace(/[^0-9]/g, ""))} keyboardType="number-pad"
          />
        </View>
        <View style={styles.chips}>
          {BUDGETS.map((b) => (
            <Pressable key={b} onPress={() => setBudget(String(b))} style={[styles.chip, budget === String(b) && styles.chipOn]}>
              <Text style={[styles.chipText, budget === String(b) && { color: C.onAccent }]}>£{b}</Text>
            </Pressable>
          ))}
        </View>
        <Text style={styles.hint}>Finish a month under budget to earn +300 XP and the 🎯 On Target badge.</Text>

        <Button title="Build my city" icon="arrow-forward" onPress={finish} style={{ marginTop: 28 }} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = themed(() => ({
  wrap: { padding: 22, paddingTop: 90 },
  h1: { color: C.ink, fontSize: 32, fontWeight: "900", letterSpacing: -0.8, marginTop: 12 },
  sub: { color: C.muted, fontSize: 16, marginTop: 6 },
  label: { color: C.muted, fontWeight: "700", marginTop: 28, marginBottom: 8, textTransform: "uppercase", fontSize: 12, letterSpacing: 1 },
  input: { color: C.ink, fontSize: 18, fontWeight: "700", backgroundColor: C.card, borderRadius: R.md, padding: 16, borderWidth: 1, borderColor: C.line },
  budgetInput: { flexDirection: "row", alignItems: "center", backgroundColor: C.card, borderRadius: R.md, borderWidth: 1, borderColor: C.line, paddingLeft: 16 },
  pound: { color: C.accentText, fontSize: 22, fontWeight: "900", marginRight: 4 },
  chips: { flexDirection: "row", gap: 8, marginTop: 12 },
  chip: { flex: 1, paddingVertical: 10, borderRadius: 999, backgroundColor: C.card, alignItems: "center", borderWidth: 1, borderColor: C.line },
  chipOn: { backgroundColor: C.accent, borderColor: C.accent },
  chipText: { color: C.ink, fontWeight: "800" },
  hint: { color: C.dim, marginTop: 14, lineHeight: 19 },
}));
