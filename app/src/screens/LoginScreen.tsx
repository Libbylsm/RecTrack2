import { useState } from "react";
import { Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { signInWithEmail, signInWithProvider, User } from "../auth";
import { C, R } from "../theme";
import { Button } from "../ui";

export default function LoginScreen({ onSignedIn }: { onSignedIn: (u: User) => void }) {
  const [mode, setMode] = useState<"choose" | "email">("choose");
  const [creating, setCreating] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState<null | "apple" | "google" | "email">(null);

  async function provider(p: "apple" | "google") {
    setBusy(p);
    try {
      onSignedIn(await signInWithProvider(p));
    } finally {
      setBusy(null);
    }
  }

  async function submitEmail() {
    setBusy("email");
    try {
      onSignedIn(await signInWithEmail(email, password, creating));
    } catch (e: any) {
      Alert.alert(creating ? "Couldn't create account" : "Couldn't sign in", e.message);
    } finally {
      setBusy(null);
    }
  }

  return (
    <LinearGradient colors={["#1B1640", C.bg, C.bg]} style={{ flex: 1 }}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView contentContainerStyle={styles.wrap} keyboardShouldPersistTaps="handled">
          <View style={styles.hero}>
            <View style={styles.logo}>
              <Text style={{ fontSize: 44 }}>🎰</Text>
            </View>
            <Text style={styles.brand}>Receipt Roulette</Text>
            <Text style={styles.tagline}>Turn every receipt into a city.{"\n"}Level up your money habits.</Text>
            <View style={styles.featureRow}>
              {[["🏙️", "Build"], ["⚡", "Earn XP"], ["🏆", "Unlock"]].map(([i, t]) => (
                <View key={t} style={styles.feature}>
                  <Text style={{ fontSize: 18 }}>{i}</Text>
                  <Text style={styles.featureText}>{t}</Text>
                </View>
              ))}
            </View>
          </View>

          {mode === "choose" ? (
            <View style={{ gap: 12 }}>
              <Button title="Continue with Apple" icon="logo-apple" variant="white" loading={busy === "apple"} disabled={!!busy} onPress={() => provider("apple")} />
              <Button title="Continue with Google" icon="logo-google" variant="dark" loading={busy === "google"} disabled={!!busy} onPress={() => provider("google")} />
              <Button title="Continue with Email" icon="mail" variant="lime" disabled={!!busy} onPress={() => setMode("email")} />
            </View>
          ) : (
            <View style={{ gap: 12 }}>
              <Text style={styles.formTitle}>{creating ? "Create your account" : "Welcome back"}</Text>
              <View style={styles.inputWrap}>
                <Ionicons name="mail-outline" size={18} color={C.muted} />
                <TextInput
                  style={styles.input} placeholder="Email" placeholderTextColor={C.dim}
                  autoCapitalize="none" keyboardType="email-address" autoComplete="email"
                  value={email} onChangeText={setEmail}
                />
              </View>
              <View style={styles.inputWrap}>
                <Ionicons name="lock-closed-outline" size={18} color={C.muted} />
                <TextInput
                  style={styles.input} placeholder="Password (6+ characters)" placeholderTextColor={C.dim}
                  secureTextEntry value={password} onChangeText={setPassword} onSubmitEditing={submitEmail}
                />
              </View>
              <Button title={creating ? "Create account" : "Sign in"} loading={busy === "email"} onPress={submitEmail} />
              <Pressable onPress={() => setCreating(!creating)}>
                <Text style={styles.switch}>
                  {creating ? "Already have an account? " : "New here? "}
                  <Text style={{ color: C.lime, fontWeight: "800" }}>{creating ? "Sign in" : "Create an account"}</Text>
                </Text>
              </Pressable>
              <Pressable onPress={() => setMode("choose")}>
                <Text style={styles.switch}>← Other sign-in options</Text>
              </Pressable>
            </View>
          )}

          <Text style={styles.legal}>By continuing you agree to let a tiny AI judge your snack purchases.</Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  wrap: { flexGrow: 1, justifyContent: "flex-end", padding: 22, paddingTop: 80, paddingBottom: 40 },
  hero: { alignItems: "center", marginBottom: 36, flex: 1, justifyContent: "center" },
  logo: { width: 92, height: 92, borderRadius: 28, backgroundColor: C.lime, alignItems: "center", justifyContent: "center", transform: [{ rotate: "-8deg" }] },
  brand: { color: C.ink, fontSize: 34, fontWeight: "900", letterSpacing: -1, marginTop: 22 },
  tagline: { color: C.muted, textAlign: "center", marginTop: 8, fontSize: 16, lineHeight: 23 },
  featureRow: { flexDirection: "row", gap: 10, marginTop: 24 },
  feature: { backgroundColor: C.card, borderRadius: R.sm, paddingVertical: 10, paddingHorizontal: 14, alignItems: "center", borderWidth: 1, borderColor: C.line },
  featureText: { color: C.ink, fontWeight: "700", fontSize: 12, marginTop: 4 },
  formTitle: { color: C.ink, fontSize: 22, fontWeight: "900", marginBottom: 4 },
  inputWrap: { flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: C.card, borderRadius: R.md, paddingHorizontal: 14, borderWidth: 1, borderColor: C.line },
  input: { flex: 1, color: C.ink, paddingVertical: 16, fontSize: 16 },
  switch: { color: C.muted, textAlign: "center", marginTop: 4 },
  legal: { color: C.dim, textAlign: "center", fontSize: 12, marginTop: 24 },
});
