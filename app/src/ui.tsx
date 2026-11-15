import { ReactNode } from "react";
import { ActivityIndicator, Pressable, StyleProp, StyleSheet, Text, View, ViewStyle } from "react-native";
import Svg, { Circle } from "react-native-svg";
import { Ionicons } from "@expo/vector-icons";
import { C, R, themed } from "./theme";

export function Card({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[s.card, style]}>{children}</View>;
}

export function SectionTitle({ title, action, onAction }: { title: string; action?: string; onAction?: () => void }) {
  return (
    <View style={s.sectionRow}>
      <Text style={s.sectionTitle}>{title}</Text>
      {action && (
        <Pressable onPress={onAction} hitSlop={10}>
          <Text style={s.sectionAction}>{action}</Text>
        </Pressable>
      )}
    </View>
  );
}

export function Ring({
  size = 120, stroke = 12, progress, color = C.accent, track = C.line, children,
}: { size?: number; stroke?: number; progress: number; color?: string; track?: string; children?: ReactNode }) {
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const p = Math.max(0, Math.min(1, progress));
  return (
    <View style={{ width: size, height: size, alignItems: "center", justifyContent: "center" }}>
      <Svg width={size} height={size} style={StyleSheet.absoluteFill}>
        <Circle cx={size / 2} cy={size / 2} r={r} stroke={track} strokeWidth={stroke} fill="none" />
        <Circle
          cx={size / 2} cy={size / 2} r={r} stroke={color} strokeWidth={stroke} fill="none"
          strokeDasharray={`${circ} ${circ}`} strokeDashoffset={circ * (1 - p)} strokeLinecap="round"
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </Svg>
      {children}
    </View>
  );
}

/** Budget ring drawn as a vinyl record: progress arc outside, grooves and an accent label inside. */
export function Vinyl({
  size = 112, progress, color = C.accent, children,
}: { size?: number; progress: number; color?: string; children?: ReactNode }) {
  const c = size / 2;
  const stroke = 6;
  const r = c - stroke / 2 - 1;
  const circ = 2 * Math.PI * r;
  const p = Math.max(0, Math.min(1, progress));
  const disc = r - stroke / 2 - 4;
  return (
    <View style={{ width: size, height: size, alignItems: "center", justifyContent: "center" }}>
      <Svg width={size} height={size} style={StyleSheet.absoluteFill}>
        <Circle cx={c} cy={c} r={r} stroke={C.line} strokeWidth={stroke} fill="none" />
        <Circle
          cx={c} cy={c} r={r} stroke={color} strokeWidth={stroke} fill="none"
          strokeDasharray={`${circ} ${circ}`} strokeDashoffset={circ * (1 - p)} strokeLinecap="round"
          transform={`rotate(-90 ${c} ${c})`}
        />
        <Circle cx={c} cy={c} r={disc} fill={C.vinyl} />
        {[0.88, 0.75, 0.62].map((k) => (
          <Circle key={k} cx={c} cy={c} r={disc * k} stroke={C.groove} strokeWidth={1} fill="none" />
        ))}
        <Circle cx={c} cy={c} r={disc * 0.47} fill={color} />
        <Circle cx={c} cy={c} r={2.5} fill={C.vinyl} />
      </Svg>
      {children}
    </View>
  );
}

/** XP progress as a row of equaliser "beats". */
export function BeatBar({ progress, color = C.accent, beats = 20 }: { progress: number; color?: string; beats?: number }) {
  const lit = Math.round(Math.max(0, Math.min(1, progress)) * beats);
  const heights = [10, 16, 22, 14, 18, 22, 12, 20, 16, 22];
  return (
    <View style={{ flexDirection: "row", alignItems: "flex-end", gap: 3, height: 22 }}>
      {Array.from({ length: beats }).map((_, i) => (
        <View
          key={i}
          style={{ flex: 1, height: heights[i % heights.length], borderRadius: 2, backgroundColor: i < lit ? color : C.line }}
        />
      ))}
    </View>
  );
}

export function Bar({ progress, color = C.accent, height = 8 }: { progress: number; color?: string; height?: number }) {
  return (
    <View style={{ height, backgroundColor: C.line, borderRadius: height / 2, overflow: "hidden" }}>
      <View style={{ width: `${Math.max(0, Math.min(1, progress)) * 100}%`, height, backgroundColor: color, borderRadius: height / 2 }} />
    </View>
  );
}

export function Pill({ icon, text, color = C.ink, bg = C.cardHi }: { icon?: string; text: string; color?: string; bg?: string }) {
  return (
    <View style={[s.pill, { backgroundColor: bg }]}>
      {icon && <Text style={{ fontSize: 13 }}>{icon}</Text>}
      <Text style={[s.pillText, { color }]}>{text}</Text>
    </View>
  );
}

export function Button({
  title, onPress, variant = "accent", icon, loading, disabled, style,
}: {
  title: string; onPress: () => void; variant?: "accent" | "dark" | "white" | "ghost";
  icon?: keyof typeof Ionicons.glyphMap; loading?: boolean; disabled?: boolean; style?: StyleProp<ViewStyle>;
}) {
  const bg = { accent: C.accent, dark: C.cardHi, white: C.ink, ghost: "transparent" }[variant];
  const fg = { accent: C.onAccent, dark: C.ink, white: C.bg, ghost: C.ink }[variant];
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        s.btn, { backgroundColor: bg, opacity: disabled ? 0.5 : pressed ? 0.85 : 1 },
        variant === "ghost" && { borderWidth: 1, borderColor: C.line }, style,
      ]}
    >
      {loading ? <ActivityIndicator color={fg} /> : (
        <>
          {icon && <Ionicons name={icon} size={20} color={fg} />}
          <Text style={[s.btnText, { color: fg }]}>{title}</Text>
        </>
      )}
    </Pressable>
  );
}

export const s = themed(() => ({
  card: { backgroundColor: C.card, borderRadius: R.lg, padding: 18, borderWidth: 1, borderColor: C.line },
  sectionRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 26, marginBottom: 12 },
  sectionTitle: { color: C.ink, fontSize: 19, fontWeight: "800", letterSpacing: -0.3 },
  sectionAction: { color: C.accentText, fontWeight: "700" },
  pill: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999 },
  pillText: { fontWeight: "700", fontSize: 13 },
  btn: { flexDirection: "row", gap: 10, alignItems: "center", justifyContent: "center", paddingVertical: 16, borderRadius: R.md },
  btnText: { fontWeight: "800", fontSize: 16 },
  h1: { color: C.ink, fontSize: 30, fontWeight: "900", letterSpacing: -0.8 },
  muted: { color: C.muted },
}));
