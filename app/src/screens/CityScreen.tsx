import { useEffect, useMemo, useRef, useState } from "react";
import { Animated, Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { buildCity, District, money, skyColors } from "../city";
import { C, necessityColor } from "../theme";
import type { StoredReceipt } from "../types";

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

export default function CityScreen({ receipts }: { receipts: StoredReceipt[] }) {
  const city = useMemo(() => buildCity(receipts), [receipts]);
  const [top, bottom] = skyColors(city.health);
  const [open, setOpen] = useState<District | null>(null);

  const healthLabel =
    city.health >= 75 ? "Thriving" : city.health >= 50 ? "Hazy" : city.health >= 25 ? "Smoggy" : "Choking";

  return (
    <ScrollView style={{ flex: 1, backgroundColor: C.bg }} contentContainerStyle={{ paddingBottom: 32 }}>
      {/* Sky */}
      <View style={[styles.sky, { backgroundColor: top }]}>
        <View style={[styles.skyLower, { backgroundColor: bottom }]} />
        <View style={styles.skyRow}>
          <Text style={{ fontSize: 40, opacity: city.health >= 50 ? 1 : 0.35 }}>☀️</Text>
          {Array.from({ length: city.pollution }).map((_, i) => (
            <Drift key={i} offset={i}>
              <Text style={{ fontSize: 30 }}>{i % 2 ? "🌫️" : "☁️"}</Text>
            </Drift>
          ))}
        </View>
        <Text style={styles.cityTitle}>Receiptopolis</Text>
        <Text style={styles.citySub}>
          {receipts.length} receipts · {city.itemCount} citizens · {money(city.totalSpend, city.currency)}
        </Text>
        <View style={styles.healthBarOuter}>
          <View
            style={[
              styles.healthBarInner,
              { width: `${city.health}%`, backgroundColor: city.health >= 50 ? C.good : city.health >= 25 ? C.warn : C.bad },
            ]}
          />
        </View>
        <Text style={styles.healthText}>
          Air quality: {healthLabel} ({city.health}/100) · Impulse {Math.round(city.impulseShare * 100)}%
        </Text>
        <Text style={styles.trees}>{"🌳".repeat(city.trees) || " "}</Text>
      </View>

      {receipts.length === 0 ? (
        <View style={styles.empty}>
          <Text style={{ fontSize: 56 }}>🏜️</Text>
          <Text style={styles.emptyTitle}>An empty plot of land…</Text>
          <Text style={styles.emptyText}>
            Scan your first receipt and watch your city grow. Every purchase builds something - but impulse buys
            build factories that pollute your skyline.
          </Text>
        </View>
      ) : (
        <View style={styles.grid}>
          {city.districts.map((d) => (
            <Pressable
              key={d.category}
              onPress={() => setOpen(d)}
              style={({ pressed }) => [styles.plot, { borderColor: d.def.color, opacity: pressed ? 0.8 : 1 }]}
            >
              <View style={[styles.plotHeader, { backgroundColor: d.def.color }]}>
                <Text style={styles.plotLandmark}>{d.def.landmark}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={styles.plotName} numberOfLines={1}>{d.def.name}</Text>
                  <Text style={styles.plotMeta}>Lv {d.level} · {money(d.spend, city.currency)}</Text>
                </View>
              </View>
              <View style={styles.buildings}>
                {d.buildings.map((b, i) => (
                  <PopIn key={`${receipts.length}-${i}`} delay={i * 60}>
                    <Text style={styles.building}>{b}</Text>
                  </PopIn>
                ))}
              </View>
            </Pressable>
          ))}
        </View>
      )}

      <Text style={styles.legend}>Every {money(4, city.currency)} spent = 1 building · 🏭 = impulse spending · 🌳 = essentials & savings</Text>

      <Modal visible={!!open} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setOpen(null)}>
        {open && (
          <DistrictDetail district={open} receipts={receipts} currency={city.currency} onClose={() => setOpen(null)} />
        )}
      </Modal>
    </ScrollView>
  );
}

function DistrictDetail({
  district, receipts, currency, onClose,
}: { district: District; receipts: StoredReceipt[]; currency: string; onClose: () => void }) {
  const items = receipts.flatMap((r) =>
    r.items.filter((i) => i.category === district.category).map((i) => ({ ...i, merchant: r.merchant })),
  );
  return (
    <ScrollView style={{ flex: 1, backgroundColor: C.bg }} contentContainerStyle={{ padding: 20 }}>
      <Text style={{ fontSize: 56, textAlign: "center" }}>{district.def.landmark}</Text>
      <Text style={styles.modalTitle}>{district.def.name}</Text>
      <Text style={styles.modalSub}>
        {money(district.spend, currency)} across {district.itemCount} items ·{" "}
        {money(district.impulseSpend, currency)} impulse
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
        <Text style={{ color: "white", fontWeight: "700" }}>Back to city</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  sky: { paddingTop: 16, paddingBottom: 12, paddingHorizontal: 16, overflow: "hidden" },
  skyLower: { position: "absolute", left: 0, right: 0, bottom: 0, height: "55%" },
  skyRow: { flexDirection: "row", alignItems: "center", gap: 6, minHeight: 48, flexWrap: "wrap" },
  cityTitle: { fontSize: 30, fontWeight: "800", color: C.ink, marginTop: 4 },
  citySub: { color: C.ink, opacity: 0.75, marginTop: 2 },
  healthBarOuter: { height: 10, backgroundColor: "rgba(255,255,255,0.6)", borderRadius: 5, marginTop: 12, overflow: "hidden" },
  healthBarInner: { height: 10, borderRadius: 5 },
  healthText: { marginTop: 6, color: C.ink, fontWeight: "600", fontSize: 13 },
  trees: { fontSize: 22, marginTop: 8, letterSpacing: 2 },
  grid: { flexDirection: "row", flexWrap: "wrap", padding: 10, gap: 10 },
  plot: { width: "47.5%", backgroundColor: C.card, borderRadius: 16, borderWidth: 2, overflow: "hidden" },
  plotHeader: { flexDirection: "row", alignItems: "center", padding: 8, gap: 6 },
  plotLandmark: { fontSize: 26 },
  plotName: { fontWeight: "800", color: C.ink, fontSize: 14 },
  plotMeta: { color: C.ink, opacity: 0.8, fontSize: 12 },
  buildings: { flexDirection: "row", flexWrap: "wrap", padding: 8, gap: 2, minHeight: 70 },
  building: { fontSize: 24 },
  legend: { textAlign: "center", color: C.muted, fontSize: 12, paddingHorizontal: 24, marginTop: 8 },
  empty: { alignItems: "center", padding: 32 },
  emptyTitle: { fontSize: 20, fontWeight: "700", marginTop: 8, color: C.ink },
  emptyText: { textAlign: "center", color: C.muted, marginTop: 8, lineHeight: 20 },
  modalTitle: { fontSize: 26, fontWeight: "800", textAlign: "center", color: C.ink },
  modalSub: { textAlign: "center", color: C.muted, marginBottom: 16, marginTop: 4 },
  itemRow: { flexDirection: "row", alignItems: "center", backgroundColor: C.card, padding: 12, borderRadius: 12, marginBottom: 8, gap: 10 },
  dot: { width: 10, height: 10, borderRadius: 5 },
  itemName: { fontWeight: "600", color: C.ink },
  itemMerchant: { color: C.muted, fontSize: 12 },
  itemPrice: { fontWeight: "700", color: C.ink },
  closeBtn: { backgroundColor: C.accent, padding: 14, borderRadius: 12, alignItems: "center", marginTop: 16 },
});
