import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, Alert, Animated, Easing, Image, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import * as ImagePicker from "expo-image-picker";
import { ImageManipulator, SaveFormat } from "expo-image-manipulator";
import { API_URL, scanReceipt } from "../api";
import { DISTRICTS, money } from "../city";
import { SAMPLE_RECEIPTS } from "../sampleData";
import { C, necessityColor, necessityLabel } from "../theme";
import type { StoredReceipt } from "../types";

interface Props {
  receipts: StoredReceipt[];
  onAdd: (r: StoredReceipt) => void;
  onAddMany: (r: StoredReceipt[]) => void;
  onDelete: (id: string) => void;
  onReset: () => void;
  goToCity: () => void;
}

/** Phone photos are 3-4MB; ~1200px wide is plenty to read a receipt and ~200KB. */
async function shrinkForUpload(uri: string, width: number) {
  const context = ImageManipulator.manipulate(uri);
  context.resize({ width: Math.min(width, 1200), height: null });
  const image = await context.renderAsync();
  const result = await image.saveAsync({ format: SaveFormat.JPEG, compress: 0.7, base64: true });
  if (!result.base64) throw new Error("Couldn't prepare the photo for upload.");
  return result.base64;
}

function Roulette() {
  const spin = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(Animated.timing(spin, { toValue: 1, duration: 900, easing: Easing.linear, useNativeDriver: true }));
    loop.start();
    return () => loop.stop();
  }, []);
  const rotate = spin.interpolate({ inputRange: [0, 1], outputRange: ["0deg", "360deg"] });
  return <Animated.Text style={{ fontSize: 64, transform: [{ rotate }] }}>🎰</Animated.Text>;
}

export default function ScanScreen({ receipts, onAdd, onAddMany, onDelete, onReset, goToCity }: Props) {
  const [busy, setBusy] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [last, setLast] = useState<StoredReceipt | null>(null);

  async function pick(source: "camera" | "library") {
    const perm =
      source === "camera"
        ? await ImagePicker.requestCameraPermissionsAsync()
        : await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert("Permission needed", `Allow ${source} access to scan receipts.`);
      return;
    }
    const opts: ImagePicker.ImagePickerOptions = { mediaTypes: ["images"], quality: 1 };
    const result =
      source === "camera" ? await ImagePicker.launchCameraAsync(opts) : await ImagePicker.launchImageLibraryAsync(opts);
    if (result.canceled || !result.assets?.[0]) return;

    const asset = result.assets[0];
    setPreview(asset.uri);
    setLast(null);
    setBusy(true);
    try {
      const base64 = await shrinkForUpload(asset.uri, asset.width);
      const parsed = await scanReceipt(base64, "image/jpeg");
      if (!parsed.is_receipt || parsed.items.length === 0) {
        Alert.alert("Hmm 🤔", "That doesn't look like a receipt. Try a flatter, well-lit photo.");
        return;
      }
      const stored: StoredReceipt = { ...parsed, id: `${Date.now()}`, scannedAt: Date.now(), imageUri: asset.uri };
      onAdd(stored);
      setLast(stored);
    } catch (e: any) {
      Alert.alert("Scan failed", e.message ?? String(e));
    } finally {
      setBusy(false);
    }
  }

  function loadSamples() {
    const fresh = SAMPLE_RECEIPTS.map((r) => ({ ...r, id: `${r.id}-${Date.now()}` }));
    onAddMany(fresh);
    goToCity();
  }

  return (
    <ScrollView style={{ flex: 1, backgroundColor: C.bg }} contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
      <Text style={styles.h1}>Spin the receipt 🎰</Text>
      <Text style={styles.sub}>Snap a receipt - AI reads every line, sorts it into districts and judges your snacks.</Text>

      <View style={styles.row}>
        <Pressable disabled={busy} style={[styles.bigBtn, { backgroundColor: C.accent }]} onPress={() => pick("camera")}>
          <Text style={styles.bigBtnIcon}>📸</Text>
          <Text style={styles.bigBtnText}>Take photo</Text>
        </Pressable>
        <Pressable disabled={busy} style={[styles.bigBtn, { backgroundColor: C.ink }]} onPress={() => pick("library")}>
          <Text style={styles.bigBtnIcon}>🖼️</Text>
          <Text style={styles.bigBtnText}>From photos</Text>
        </Pressable>
      </View>

      {busy && (
        <View style={styles.card}>
          {preview && <Image source={{ uri: preview }} style={styles.preview} />}
          <View style={{ alignItems: "center", paddingVertical: 12 }}>
            <Roulette />
            <Text style={styles.busyText}>Reading your receipt…</Text>
            <Text style={styles.meta}>Free AI models can take 20-40 seconds</Text>
            <ActivityIndicator style={{ marginTop: 8 }} />
          </View>
        </View>
      )}

      {last && !busy && (
        <View style={styles.card}>
          <Text style={styles.merchant}>{last.merchant}</Text>
          <Text style={styles.meta}>
            {last.date || "Undated"} · {money(last.total, last.currency)}
            {last.savings > 0 ? ` · saved ${money(last.savings, last.currency)}` : ""}
          </Text>
          <Text style={styles.funFact}>💡 {last.fun_fact}</Text>
          {last.items.map((it, i) => (
            <View key={i} style={styles.itemRow}>
              <Text style={{ fontSize: 20 }}>{DISTRICTS[it.category]?.landmark ?? "📦"}</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.itemName}>{it.quantity > 1 ? `${it.quantity}× ` : ""}{it.name}</Text>
                <Text style={[styles.tag, { color: necessityColor[it.necessity] }]}>
                  {necessityLabel[it.necessity]} · {DISTRICTS[it.category]?.name}
                </Text>
              </View>
              <Text style={styles.itemPrice}>{money(it.price, last.currency)}</Text>
            </View>
          ))}
          <Pressable style={[styles.smallBtn, { backgroundColor: C.accent }]} onPress={goToCity}>
            <Text style={styles.smallBtnText}>See what it built 🏗️</Text>
          </Pressable>
        </View>
      )}

      <Pressable style={styles.sampleBtn} onPress={loadSamples}>
        <Text style={styles.sampleText}>✨ Load 5 demo receipts</Text>
      </Pressable>

      <Text style={styles.h2}>Your receipts ({receipts.length})</Text>
      {receipts.length === 0 && <Text style={styles.sub}>None yet.</Text>}
      {[...receipts].reverse().map((r) => (
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
          <Text style={{ fontSize: 22 }}>🧾</Text>
          <View style={{ flex: 1 }}>
            <Text style={styles.itemName}>{r.merchant}</Text>
            <Text style={styles.meta}>{r.date || "Undated"} · {r.items.length} items</Text>
          </View>
          <Text style={styles.itemPrice}>{money(r.total, r.currency)}</Text>
        </Pressable>
      ))}
      {receipts.length > 0 && (
        <Pressable
          onPress={() =>
            Alert.alert("Demolish the city?", "This deletes all receipts.", [
              { text: "Cancel", style: "cancel" },
              { text: "Demolish", style: "destructive", onPress: onReset },
            ])
          }
        >
          <Text style={styles.reset}>Long-press a receipt to delete · Tap here to reset everything</Text>
        </Pressable>
      )}
      <Text style={styles.server}>Server: {API_URL}</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  h1: { fontSize: 28, fontWeight: "800", color: C.ink },
  h2: { fontSize: 18, fontWeight: "800", color: C.ink, marginTop: 24, marginBottom: 8 },
  sub: { color: C.muted, marginTop: 4, lineHeight: 20 },
  row: { flexDirection: "row", gap: 12, marginTop: 16 },
  bigBtn: { flex: 1, borderRadius: 18, paddingVertical: 22, alignItems: "center" },
  bigBtnIcon: { fontSize: 32 },
  bigBtnText: { color: "white", fontWeight: "700", marginTop: 6, fontSize: 16 },
  card: { backgroundColor: C.card, borderRadius: 18, padding: 16, marginTop: 16, borderWidth: 1, borderColor: C.line },
  preview: { width: "100%", height: 180, borderRadius: 12, resizeMode: "cover" },
  busyText: { fontWeight: "700", color: C.ink, marginTop: 8 },
  merchant: { fontSize: 22, fontWeight: "800", color: C.ink },
  meta: { color: C.muted, fontSize: 13, marginTop: 2 },
  funFact: { backgroundColor: C.accentSoft, color: C.ink, padding: 10, borderRadius: 10, marginVertical: 12 },
  itemRow: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: C.line },
  itemName: { fontWeight: "600", color: C.ink },
  itemPrice: { fontWeight: "700", color: C.ink },
  tag: { fontSize: 12, fontWeight: "600", marginTop: 2 },
  smallBtn: { borderRadius: 12, padding: 14, alignItems: "center", marginTop: 14 },
  smallBtnText: { color: "white", fontWeight: "700" },
  sampleBtn: { marginTop: 16, borderRadius: 14, padding: 14, alignItems: "center", borderWidth: 2, borderColor: C.accent, borderStyle: "dashed" },
  sampleText: { color: C.accent, fontWeight: "700" },
  historyRow: { flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: C.card, padding: 12, borderRadius: 12, marginBottom: 8 },
  reset: { color: C.muted, textAlign: "center", fontSize: 12, marginTop: 8 },
  server: { color: C.muted, textAlign: "center", fontSize: 11, marginTop: 20 },
});
