import { useEffect, useMemo, useRef, useState } from "react";
import { Animated, Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import Svg, { Circle, G, Rect } from "react-native-svg";
import { buildCity, CityState, District, money } from "./city";
import { C, R, necessityColor, themed } from "./theme";
import type { StoredReceipt } from "./types";
import CityMusic from "./CityMusic";

// Slots along the street: [x, width]. Districts fill the front row by spend; the rest is background skyline.
const FRONT: [number, number][] = [[120, 34], [226, 32], [30, 30], [160, 30], [264, 30], [66, 28], [300, 28]];
const BACK: [number, number, number][] = [[8, 26, 78], [96, 22, 100], [196, 24, 86], [326, 22, 70]];
const TREE_X = [22, 106, 205, 318, 160, 290, 62, 250, 140, 340];

/** Icon per district (replaces the landmark emoji on the city). */
const DISTRICT_ICON: Record<string, keyof typeof Ionicons.glyphMap> = {
  groceries: "basket",
  dining: "restaurant",
  transport: "train",
  entertainment: "film",
  household: "home",
  health: "medkit",
  clothing: "shirt",
  tech_subscriptions: "phone-portrait",
  other: "cube",
};
const BAR_H = [62, 84, 48, 92, 70, 56, 88, 42, 76, 66, 94, 52, 80, 60, 86];

/** The month's city as a skyline: rooftops are equaliser bars, essentials plant trees, impulse adds smog. */
function Skyline({ city }: { city: CityState }) {
  const maxSpend = Math.max(1, ...city.districts.map((d) => d.spend));
  const front = FRONT.map(([x, w], i) => {
    const d = city.districts[i];
    const h = d ? 46 + (d.spend / maxSpend) * 80 : 28; // empty plots stay low
    const factory = !!d && d.impulseSpend / Math.max(d.spend, 1) > 0.3;
    return { x, w, h, d, factory };
  });
  const trees = TREE_X.slice(0, Math.max(city.districts.length ? 2 : 0, city.trees));
  return (
    <Svg width="100%" height={150} viewBox="0 0 354 170" preserveAspectRatio="xMidYMax meet">
      <Circle cx={300} cy={34} r={14} fill={C.moon} opacity={city.health >= 50 ? 1 : 0.4} />
      <Circle cx={306} cy={30} r={12} fill={C.skyTop} opacity={city.health >= 50 ? 1 : 0.4} />
      {city.health >= 50 && (
        <G fill={C.note}>
          <Circle cx={58} cy={30} r={3.5} />
          <Rect x={60.5} y={14} width={1.6} height={16} />
          <Circle cx={210} cy={22} r={3} />
          <Circle cx={226} cy={28} r={3} />
          <Rect x={212} y={9} width={1.4} height={13} />
          <Rect x={228} y={15} width={1.4} height={13} />
          <Rect x={212} y={9} width={17.4} height={1.6} />
        </G>
      )}
      {BACK.map(([x, w, h]) => (
        <Rect key={x} x={x} y={170 - h} width={w} height={h} rx={3} fill={C.bldgBack} />
      ))}
      {front.map(({ x, w, h, d, factory }) => (
        <G key={x}>
          {factory && <Rect x={x + w - 9} y={170 - h - 14} width={6} height={14} fill={C.bldg} />}
          <Rect x={x} y={170 - h} width={w} height={h} rx={4} fill={C.bldg} />
          {d && <Rect x={x} y={170 - h - 8} width={w} height={4} rx={2} fill={C.eq} />}
          {d && d.level >= 3 && <Rect x={x} y={170 - h - 16} width={w} height={4} rx={2} fill={C.eq} opacity={0.55} />}
          {d &&
            Array.from({ length: Math.min(6, Math.floor(h / 22)) }).map((_, r) => (
              <Rect
                key={r}
                x={x + (r % 2 ? w - 13 : 7)}
                y={170 - h + 10 + r * 16}
                width={6}
                height={7}
                rx={1}
                fill={C.windowLit}
                opacity={factory && r % 2 ? 0.35 : 0.9}
              />
            ))}
        </G>
      ))}
      {trees.map((x) => (
        <G key={x}>
          <Rect x={x - 1.5} y={150} width={3} height={16} fill={C.trunk} />
          <Circle cx={x} cy={144} r={10} fill={C.leaf} />
        </G>
      ))}
      <Rect x={0} y={164} width={354} height={6} fill={C.ground} />
    </Svg>
  );
}

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
  const [open, setOpen] = useState<District | null>(null);
  const healthLabel =
    city.health >= 75 ? "Clear skies" : city.health >= 50 ? "Hazy" : city.health >= 25 ? "Smoggy" : "Choking";
  const healthColor = city.health >= 75 ? C.good : city.health >= 50 ? C.warn : C.bad;

  return (
    <View>
      <LinearGradient colors={[C.skyTop, C.skyBottom]} style={styles.sky}>
        <View style={styles.skyHead}>
          <View style={{ flex: 1 }}>
            <Text style={styles.skyLabel}>Impulse {Math.round(city.impulseShare * 100)}% · {city.trees} trees</Text>
            <Text style={styles.cityTitle} numberOfLines={1}>{title}</Text>
          </View>
          <View style={[styles.airPill, { backgroundColor: healthColor + "26" }]}>
            <Ionicons name="leaf" size={13} color={healthColor} />
            <Text style={[styles.airText, { color: healthColor }]}>{healthLabel} · {city.health}</Text>
          </View>
        </View>

        <View>
          <Skyline city={city} />
          {/* Smog drifts over the skyline, one cloud per impulse-heavy step */}
          <View style={styles.smogLayer} pointerEvents="none">
            {Array.from({ length: city.pollution }).map((_, i) => (
              <Drift key={i} offset={i}>
                <View style={[styles.smog, { width: 34 + (i % 3) * 10, marginTop: (i % 2) * 14 }]} />
              </Drift>
            ))}
          </View>
        </View>

        <CityMusic city={city} />
      </LinearGradient>

      {receipts.length === 0 ? (
        <View style={styles.empty}>
          <View style={styles.emptyIcon}>
            <Ionicons name="musical-notes" size={28} color={C.accentText} />
          </View>
          <Text style={styles.emptyTitle}>Fresh land, fresh month</Text>
          <Text style={styles.emptyText}>
            Scan a receipt to lay the first brick. Impulse buys build factories and smog, essentials and deals plant trees.
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
                  <Ionicons name={DISTRICT_ICON[d.category] ?? "cube"} size={17} color={d.def.color} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.plotName} numberOfLines={1}>{d.def.name}</Text>
                  <Text style={styles.plotMeta}>Lv {d.level} · {money(d.spend, city.currency)}</Text>
                </View>
              </View>
              {/* One bar per building: district colour, coral for impulse factories */}
              <View style={styles.buildings}>
                {d.buildings.map((b, i) => (
                  <PopIn key={`${receipts.length}-${i}`} delay={i * 50}>
                    <View
                      style={[
                        styles.building,
                        { height: Math.round((44 * BAR_H[i % BAR_H.length]) / 100), backgroundColor: b === "🏭" ? C.bad : d.def.color },
                      ]}
                    />
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
      <View style={[styles.detailIcon, { backgroundColor: district.def.color + "33" }]}>
        <Ionicons name={DISTRICT_ICON[district.category] ?? "cube"} size={34} color={district.def.color} />
      </View>
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
  sky: { borderRadius: R.lg, padding: 14, paddingTop: 16, overflow: "hidden", borderWidth: 1, borderColor: C.line },
  skyHead: { flexDirection: "row", alignItems: "flex-start", gap: 10, marginBottom: 4 },
  skyLabel: { color: C.skyMuted, fontSize: 11, fontWeight: "800", letterSpacing: 0.8, textTransform: "uppercase" },
  cityTitle: { fontSize: 24, fontWeight: "900", color: C.skyInk, marginTop: 2, letterSpacing: -0.5 },
  airPill: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999 },
  airText: { fontWeight: "800", fontSize: 12 },
  smogLayer: { position: "absolute", top: 18, left: 0, right: 0, flexDirection: "row", flexWrap: "wrap", gap: 18, paddingHorizontal: 20 },
  smog: { height: 16, borderRadius: 8, backgroundColor: C.smog },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginTop: 10 },
  plot: { width: "48.4%", backgroundColor: C.card, borderRadius: R.md, borderWidth: 1, borderColor: C.line, padding: 10, paddingTop: 12 },
  plotHeader: { flexDirection: "row", alignItems: "center", gap: 8 },
  landmarkBubble: { width: 34, height: 34, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  plotName: { fontWeight: "800", color: C.ink, fontSize: 13 },
  plotMeta: { color: C.muted, fontSize: 12, marginTop: 1 },
  buildings: { flexDirection: "row", alignItems: "flex-end", gap: 3, marginTop: 10, height: 44 },
  building: { width: 6, borderRadius: 3, borderBottomLeftRadius: 1, borderBottomRightRadius: 1 },
  emptyIcon: { width: 56, height: 56, borderRadius: 18, backgroundColor: C.accentSoft, alignItems: "center", justifyContent: "center" },
  detailIcon: { width: 72, height: 72, borderRadius: 22, alignItems: "center", justifyContent: "center", alignSelf: "center", marginTop: 12 },
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
