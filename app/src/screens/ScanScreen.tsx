import { useEffect, useMemo, useRef, useState } from "react";
import { Alert, Animated, Easing, Image, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import * as ImagePicker from "expo-image-picker";
import { ImageManipulator, SaveFormat } from "expo-image-manipulator";
import { Ionicons } from "@expo/vector-icons";
import { API_URL, scanReceipt } from "../api";
import { DISTRICTS, money } from "../city";
import { currentMonthKey, groupByMonth, monthLabel, receiptMonth } from "../month";
import { makeDemoReceipts } from "../sampleData";
import { C, R, necessityColor, necessityLabel } from "../theme";
import { Button, Card, SectionTitle } from "../ui";
import type { StoredReceipt } from "../types";

interface Props {
  receipts: StoredReceipt[];
  onAdd: (r: StoredReceipt[]) => void;
  onDelete: (id: string) => void;
  goHome: () => void;
}

type Source = "camera" | "photo" | "screenshot";

/** Phone photos are 3-4MB; ~1200px wide is plenty to read and ~200KB. */
async function shrinkForUpload(uri: string, width: number) {
  const context = ImageManipulator.manipulate(uri);
  context.resize({ width: Math.min(width, 1200), height: null });
  const image = await context.renderAsync();
  const result = await image.saveAsync({ format: SaveFormat.JPEG, compress: 0.7, base64: true });
  if (!result.base64) throw new Error("Couldn't prepare the image for upload.");
  return result.base64;
}

export const xpForReceipt = (r: StoredReceipt) => 40 + r.items.length * 5 + Math.round((r.savings || 0) * 5);

function Roulette() {
  const spin = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(Animated.timing(spin, { toValue: 1, duration: 900, easing: Easing.linear, useNativeDriver: true }));
    loop.start();
    return () => loop.stop();
  }, []);
  const rotate = spin.interpolate({ inputRange: [0, 1], outputRange: ["0deg", "360deg"] });
  return <Animated.Text style={{ fontSize: 56, transform: [{ rotate }] }}>🎰</Animated.Text>;
}

export default function ScanScreen({ receipts, onAdd, onDelete, goHome }: Props) {
  const [busy, setBusy] = useState<null | { done: number; total: number }>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [results, setResults] = useState<StoredReceipt[]>([]);

  const thisMonth = useMemo(
    () => (groupByMonth(receipts).get(currentMonthKey()) ?? []).slice().sort((a, b) => b.scannedAt - a.scannedAt),
    [receipts],
  );

  async function pick(source: Source) {
    const perm =
      source === "camera"
        ? await ImagePicker.requestCameraPermissionsAsync()
        : await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert("Permission needed", `Allow ${source === "camera" ? "camera" : "photo library"} access to scan receipts.`);
      return;
    }
    const opts: ImagePicker.ImagePickerOptions = {
      mediaTypes: ["images"],
      quality: 1,
      allowsMultipleSelection: source === "screenshot",
      selectionLimit: source === "screenshot" ? 5 : 1,
    };
    const result =
      source === "camera" ? await ImagePicker.launchCameraAsync(opts) : await ImagePicker.launchImageLibraryAsync(opts);
    if (result.canceled || !result.assets?.length) return;

    const assets = result.assets;
    setResults([]);
    setBusy({ done: 0, total: assets.length });
    const added: StoredReceipt[] = [];
    const failures: string[] = [];
    for (let i = 0; i < assets.length; i++) {
      const a = assets[i];
      setPreview(a.uri);
      setBusy({ done: i, total: assets.length });
      try {
        const parsed = await scanReceipt(await shrinkForUpload(a.uri, a.width), "image/jpeg");
        if (!parsed.is_receipt || parsed.items.length === 0) {
          failures.push(`Image ${i + 1}: doesn't look like a receipt`);
          continue;
        }
        added.push({ ...parsed, id: `${Date.now()}-${i}`, scannedAt: Date.now(), source });
      } catch (e: any) {
        failures.push(`Image ${i + 1}: ${e.message ?? e}`);
        if (/server|reach|talk/i.test(e.message ?? "")) break; // no point retrying the rest
      }
    }
    setBusy(null);
    setPreview(null);
    if (added.length) {
      onAdd(added);
      setResults(added);
    }
    if (failures.length) Alert.alert(added.length ? "Some scans failed" : "Scan failed", failures.join("\n\n"));
  }

  function loadDemo() {
    Alert.alert("Load demo data?", "Adds sample receipts for this month and the two before it.", [
      { text: "Cancel", style: "cancel" },
      { text: "Load", onPress: () => { onAdd(makeDemoReceipts()); goHome(); } },
    ]);
  }

  return (
    <ScrollView style={{ flex: 1, backgroundColor: C.bg }} contentContainerStyle={styles.wrap}>
      <Text style={styles.h1}>Scan</Text>
      <Text style={styles.sub}>Paper receipts or e-receipt screenshots. AI reads every line and builds your city.</Text>

      <Pressable disabled={!!busy} onPress={() => pick("camera")} style={({ pressed }) => [styles.primary, pressed && { opacity: 0.9 }]}>
        <View style={styles.primaryIcon}>
          <Ionicons name="camera" size={28} color={C.limeInk} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.primaryTitle}>Snap a paper receipt</Text>
          <Text style={styles.primarySub}>Lay it flat, good light</Text>
        </View>
        <Ionicons name="arrow-forward" size={22} color={C.limeInk} />
      </Pressable>

      <View style={styles.row}>
        <Pressable disabled={!!busy} onPress={() => pick("screenshot")} style={styles.option}>
          <View style={[styles.optIcon, { backgroundColor: C.violetSoft }]}>
            <Ionicons name="phone-portrait-outline" size={22} color={C.violet} />
          </View>
          <Text style={styles.optTitle}>E-receipt</Text>
          <Text style={styles.optSub}>Screenshots of emails, Deliveroo, Amazon, Uber… up to 5</Text>
        </Pressable>
        <Pressable disabled={!!busy} onPress={() => pick("photo")} style={styles.option}>
          <View style={[styles.optIcon, { backgroundColor: "rgba(255,201,77,0.15)" }]}>
            <Ionicons name="images-outline" size={22} color={C.gold} />
          </View>
          <Text style={styles.optTitle}>From photos</Text>
          <Text style={styles.optSub}>A receipt photo you already took</Text>
        </Pressable>
      </View>

      {busy && (
        <Card style={{ marginTop: 16, alignItems: "center" }}>
          {preview && <Image source={{ uri: preview }} style={styles.preview} />}
          <Roulette />
          <Text style={styles.busyText}>
            Reading receipt{busy.total > 1 ? ` ${busy.done + 1} of ${busy.total}` : ""}…
          </Text>
          <Text style={styles.busySub}>Free AI models can take 20-40 seconds</Text>
        </Card>
      )}

      {results.map((r) => {
        const m = receiptMonth(r);
        return (
          <Card key={r.id} style={{ marginTop: 16 }}>
            <View style={styles.resHead}>
              <View style={{ flex: 1 }}>
                <Text style={styles.merchant}>{r.merchant}</Text>
                <Text style={styles.meta}>
                  {r.date || "Undated"} · {r.receipt_type === "digital" ? "E-receipt" : "Paper"}
                </Text>
              </View>
              <View style={{ alignItems: "flex-end" }}>
                <Text style={styles.total}>{money(r.total, r.currency)}</Text>
                <Text style={styles.xp}>+{xpForReceipt(r)} XP</Text>
              </View>
            </View>
            {m !== currentMonthKey() && (
              <Text style={styles.filed}>📁 Filed under {monthLabel(m)} (date on receipt)</Text>
            )}
            <Text style={styles.funFact}>💡 {r.fun_fact}</Text>
            {r.items.map((it, i) => (
              <View key={i} style={styles.itemRow}>
                <Text style={{ fontSize: 18 }}>{DISTRICTS[it.category]?.landmark ?? "📦"}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={styles.itemName}>{it.quantity > 1 ? `${it.quantity}× ` : ""}{it.name}</Text>
                  <Text style={[styles.tag, { color: necessityColor[it.necessity] }]}>
                    {necessityLabel[it.necessity]} · {DISTRICTS[it.category]?.name}
                  </Text>
                </View>
                <Text style={styles.itemPrice}>{money(it.price, r.currency)}</Text>
              </View>
            ))}
            {r.savings > 0 && <Text style={styles.saved}>You saved {money(r.savings, r.currency)} 🎉</Text>}
          </Card>
        );
      })}
      {results.length > 0 && <Button title="See what it built" icon="business" onPress={goHome} style={{ marginTop: 14 }} />}

      <SectionTitle title={`This month (${thisMonth.length})`} />
      {thisMonth.length === 0 && <Text style={styles.sub}>No receipts yet this month.</Text>}
      {thisMonth.map((r) => (
        <Pressable
          key={r.id}
          onLongPress={() =>
            Alert.alert("Delete receipt?", r.merchant, [
              { text: "Cancel", style: "cancel" },
              { text: "Delete", style: "destructive", onPress: () => onDelete(r.id) },
            ])
          }
          style={styles.historyRow}
        >
          <View style={styles.histIcon}>
            <Ionicons name={r.receipt_type === "digital" ? "phone-portrait-outline" : "receipt-outline"} size={18} color={C.ink} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.itemName}>{r.merchant}</Text>
            <Text style={styles.meta}>{r.date || "Undated"} · {r.items.length} items</Text>
          </View>
          <Text style={styles.itemPrice}>{money(r.total, r.currency)}</Text>
        </Pressable>
      ))}
      {thisMonth.length > 0 && <Text style={styles.hint}>Long-press a receipt to delete it</Text>}

      <Pressable style={styles.demo} onPress={loadDemo}>
        <Ionicons name="sparkles" size={16} color={C.lime} />
        <Text style={styles.demoText}>Load demo receipts</Text>
      </Pressable>
      <Text style={styles.server}>Server: {API_URL}</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  wrap: { padding: 18, paddingBottom: 120 },
  h1: { color: C.ink, fontSize: 30, fontWeight: "900", letterSpacing: -0.8 },
  sub: { color: C.muted, marginTop: 6, lineHeight: 20 },
  primary: { flexDirection: "row", alignItems: "center", gap: 14, backgroundColor: C.lime, borderRadius: R.lg, padding: 18, marginTop: 20 },
  primaryIcon: { width: 54, height: 54, borderRadius: 16, backgroundColor: "rgba(0,0,0,0.08)", alignItems: "center", justifyContent: "center" },
  primaryTitle: { color: C.limeInk, fontWeight: "900", fontSize: 18 },
  primarySub: { color: C.limeInk, opacity: 0.7, marginTop: 2 },
  row: { flexDirection: "row", gap: 12, marginTop: 12 },
  option: { flex: 1, backgroundColor: C.card, borderRadius: R.lg, padding: 16, borderWidth: 1, borderColor: C.line },
  optIcon: { width: 44, height: 44, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  optTitle: { color: C.ink, fontWeight: "800", fontSize: 16, marginTop: 12 },
  optSub: { color: C.muted, fontSize: 12, marginTop: 4, lineHeight: 17 },
  preview: { width: "100%", height: 160, borderRadius: R.sm, marginBottom: 10 },
  busyText: { color: C.ink, fontWeight: "800", marginTop: 8 },
  busySub: { color: C.muted, fontSize: 12, marginTop: 4 },
  resHead: { flexDirection: "row", alignItems: "flex-start" },
  merchant: { color: C.ink, fontSize: 20, fontWeight: "900" },
  meta: { color: C.muted, fontSize: 12, marginTop: 2 },
  total: { color: C.ink, fontSize: 20, fontWeight: "900" },
  xp: { color: C.lime, fontWeight: "800", fontSize: 12, marginTop: 2 },
  filed: { color: C.gold, fontSize: 12, marginTop: 8, fontWeight: "700" },
  funFact: { backgroundColor: C.violetSoft, color: C.ink, padding: 12, borderRadius: R.sm, marginVertical: 12, overflow: "hidden" },
  itemRow: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 9, borderBottomWidth: 1, borderBottomColor: C.line },
  itemName: { color: C.ink, fontWeight: "700" },
  itemPrice: { color: C.ink, fontWeight: "800" },
  tag: { fontSize: 12, fontWeight: "600", marginTop: 2 },
  saved: { color: C.good, fontWeight: "800", marginTop: 12, textAlign: "center" },
  historyRow: { flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: C.card, padding: 12, borderRadius: R.md, marginBottom: 8, borderWidth: 1, borderColor: C.line },
  histIcon: { width: 40, height: 40, borderRadius: 12, backgroundColor: C.cardHi, alignItems: "center", justifyContent: "center" },
  hint: { color: C.dim, textAlign: "center", fontSize: 12, marginTop: 4 },
  demo: { flexDirection: "row", gap: 8, alignItems: "center", justifyContent: "center", marginTop: 24, padding: 14, borderRadius: R.md, borderWidth: 1, borderColor: C.line, borderStyle: "dashed" },
  demoText: { color: C.lime, fontWeight: "800" },
  server: { color: C.dim, textAlign: "center", fontSize: 11, marginTop: 16 },
});
