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
