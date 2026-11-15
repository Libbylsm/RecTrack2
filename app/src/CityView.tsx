import { useEffect, useMemo, useRef, useState } from "react";
import { Animated, Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { buildCity, District, money, skyColors } from "./city";
import { C, R, necessityColor, themed } from "./theme";
import { Bar } from "./ui";
import type { StoredReceipt } from "./types";

function PopIn({ children, delay }: { children: React.ReactNode; delay: number }) {
  const scale = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.spring(scale, { toValue: 1, delay, friction: 5, useNativeDriver: true }).start();
  }, []);
  return <Animated.View style={{ transform: [{ scale }] }}>{children}</Animated.View>;
}

function Drift({ children, offset }: { children: React.ReactNode; offset: number }) {
  const x = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(x, { toValue: 12, duration: 2500 + offset * 300, useNativeDriver: true }),
        Animated.timing(x, { toValue: -12, duration: 2500 + offset * 300, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, []);
  return <Animated.View style={{ transform: [{ translateX: x }] }}>{children}</Animated.View>;
}

/** The virtual city for one set of receipts (normally one month). */
export default function CityView({ receipts, title = "Receiptopolis" }: { receipts: StoredReceipt[]; title?: string }) {
  const city = useMemo(() => buildCity(receipts), [receipts]);
  const [top, bottom] = skyColors(city.health);
  const [open, setOpen] = useState<District | null>(null);
  const healthLabel =
    city.health >= 75 ? "Clear skies" : city.health >= 50 ? "Hazy" : city.health >= 25 ? "Smoggy" : "Choking";
  const healthColor = city.health >= 75 ? C.good : city.health >= 50 ? C.warn : C.bad;

  return (
    <View>
      <LinearGradient colors={[top, bottom]} style={styles.sky}>
        <View style={styles.skyRow}>
          <Text style={{ fontSize: 34, opacity: city.health >= 50 ? 1 : 0.35 }}>☀️</Text>
          {Array.from({ length: city.pollution }).map((_, i) => (
            <Drift key={i} offset={i}>
              <Text style={{ fontSize: 26 }}>☁️</Text>
            </Drift>
          ))}
        </View>
        <Text style={styles.cityTitle}>{title}</Text>
        <View style={styles.airRow}>
          <Ionicons name="leaf" size={14} color={healthColor} />
          <Text style={[styles.airText, { color: healthColor }]}>{healthLabel} · {city.health}/100</Text>
          <Text style={styles.airMeta}>Impulse {Math.round(city.impulseShare * 100)}%</Text>
        </View>
        <View style={{ marginTop: 8 }}>
          <Bar progress={city.health / 100} color={healthColor} height={6} />
        </View>
        <Text style={styles.trees}>{"🌳".repeat(city.trees) || " "}</Text>
      </LinearGradient>

      {receipts.length === 0 ? (
        <View style={styles.empty}>
          <Text style={{ fontSize: 48 }}>🏜️</Text>
          <Text style={styles.emptyTitle}>Fresh land, fresh month</Text>
          <Text style={styles.emptyText}>
            Scan a receipt to lay the first brick. Impulse buys build factories 🏭, essentials and deals plant trees 🌳.
          </Text>
        </View>
      ) : (
        <View style={styles.grid}>
          {city.districts.map((d) => (
            <Pressable
              key={d.category}
              onPress={() => setOpen(d)}
              style={({ pressed }) => [styles.plot, { opacity: pressed ? 0.8 : 1 }]}
            >
              <View style={styles.plotHeader}>
                <View style={[styles.landmarkBubble, { backgroundColor: d.def.color + "33" }]}>
                  <Text style={{ fontSize: 18 }}>{d.def.landmark}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.plotName} numberOfLines={1}>{d.def.name}</Text>
                  <Text style={styles.plotMeta}>Lv {d.level} · {money(d.spend, city.currency)}</Text>
                </View>
              </View>
              <View style={styles.buildings}>
                {d.buildings.map((b, i) => (
                  <PopIn key={`${receipts.length}-${i}`} delay={i * 50}>
                    <Text style={styles.building}>{b}</Text>
                  </PopIn>
                ))}
              </View>
            </Pressable>
          ))}
        </View>
      )}

      <Modal visible={!!open} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setOpen(null)}>
        {open && <DistrictDetail district={open} receipts={receipts} currency={city.currency} onClose={() => setOpen(null)} />}
      </Modal>
    </View>
  );
}

function DistrictDetail({
  district, receipts, currency, onClose,
}: { district: District; receipts: StoredReceipt[]; currency: string; onClose: () => void }) {
  const items = receipts.flatMap((r) =>
    r.items.filter((i) => i.category === district.category).map((i) => ({ ...i, merchant: r.merchant })),
  );
  return (
    <ScrollView style={{ flex: 1, backgroundColor: C.bg }} contentContainerStyle={{ padding: 20, paddingBottom: 40 }}>
      <View style={styles.grabber} />
      <Text style={{ fontSize: 56, textAlign: "center", marginTop: 12 }}>{district.def.landmark}</Text>
      <Text style={styles.modalTitle}>{district.def.name}</Text>
      <Text style={styles.modalSub}>
        {money(district.spend, currency)} · {district.itemCount} items · {money(district.impulseSpend, currency)} impulse
      </Text>
      {items.map((it, idx) => (
        <View key={idx} style={styles.itemRow}>
          <View style={[styles.dot, { backgroundColor: necessityColor[it.necessity] }]} />
          <View style={{ flex: 1 }}>
            <Text style={styles.itemName}>{it.name}</Text>
            <Text style={styles.itemMerchant}>{it.merchant}</Text>
          </View>
          <Text style={styles.itemPrice}>{money(it.price, currency)}</Text>
        </View>
      ))}
      <Pressable onPress={onClose} style={styles.closeBtn}>
        <Text style={{ color: C.onAccent, fontWeight: "800" }}>Back to city</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = themed(() => ({
  sky: { borderRadius: R.lg, padding: 16, overflow: "hidden" },
  skyRow: { flexDirection: "row", alignItems: "center", gap: 6, minHeight: 40, flexWrap: "wrap" },
  cityTitle: { fontSize: 24, fontWeight: "900", color: "#fff", marginTop: 4, letterSpacing: -0.5 },
  airRow: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 4 },
  airText: { fontWeight: "800", fontSize: 13 },
  airMeta: { color: "rgba(255,255,255,0.7)", fontSize: 13, marginLeft: "auto" },
  trees: { fontSize: 20, marginTop: 8, letterSpacing: 2 },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginTop: 10 },
  plot: { width: "48.4%", backgroundColor: C.card, borderRadius: R.md, borderWidth: 1, borderColor: C.line, padding: 10 },
  plotHeader: { flexDirection: "row", alignItems: "center", gap: 8 },
  landmarkBubble: { width: 34, height: 34, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  plotName: { fontWeight: "800", color: C.ink, fontSize: 13 },
  plotMeta: { color: C.muted, fontSize: 12, marginTop: 1 },
  buildings: { flexDirection: "row", flexWrap: "wrap", gap: 1, marginTop: 8, minHeight: 56 },
  building: { fontSize: 22 },
  empty: { alignItems: "center", padding: 24, backgroundColor: C.card, borderRadius: R.lg, marginTop: 10, borderWidth: 1, borderColor: C.line },
  emptyTitle: { fontSize: 18, fontWeight: "800", marginTop: 6, color: C.ink },
  emptyText: { textAlign: "center", color: C.muted, marginTop: 6, lineHeight: 20 },
  grabber: { width: 40, height: 5, borderRadius: 3, backgroundColor: C.line, alignSelf: "center" },
  modalTitle: { fontSize: 26, fontWeight: "900", textAlign: "center", color: C.ink },
  modalSub: { textAlign: "center", color: C.muted, marginBottom: 16, marginTop: 4 },
  itemRow: { flexDirection: "row", alignItems: "center", backgroundColor: C.card, padding: 14, borderRadius: R.sm, marginBottom: 8, gap: 10 },
  dot: { width: 10, height: 10, borderRadius: 5 },
  itemName: { fontWeight: "700", color: C.ink },
  itemMerchant: { color: C.muted, fontSize: 12, marginTop: 2 },
  itemPrice: { fontWeight: "800", color: C.ink },
  closeBtn: { backgroundColor: C.accent, padding: 16, borderRadius: R.md, alignItems: "center", marginTop: 16 },
}));
