import { Appearance, StyleSheet } from "react-native";

export type Scheme = "light" | "dark";

/** Brand: near-black #0b0c0c + orchid #ac34bd. Light mode inverts the neutrals and keeps the orchid. */
const PALETTES = {
  dark: {
    bg: "#0B0C0C",
    card: "#161818",
    cardHi: "#202323",
    line: "#2B2E2E",
    ink: "#F4F4F5",
    muted: "#8F9494",
    dim: "#5F6464",
    accent: "#AC34BD",
    accentText: "#D07BDD", // accent used as text on the dark background (more legible)
    onAccent: "#FFFFFF",
    accentSoft: "rgba(172,52,189,0.18)",
    accent2: "#8C8FFF", // XP / secondary
    accent2Soft: "rgba(140,143,255,0.16)",
    gold: "#FFC94D",
    goldSoft: "rgba(255,201,77,0.15)",
    good: "#3DDC84",
    warn: "#FFB347",
    bad: "#FF5D6C",
    tabBar: "#101111",
    heroFrom: "#3A1640",
    heroBorder: "#4A2251",
    loginGlow: "#2A0F30",
    goodSoft: "rgba(61,220,132,0.15)",
    glow: "rgba(172,52,189,0.55)",
    // Vinyl budget ring
    vinyl: "#0B0C0C",
    groove: "#2E3030",
    // Skyline (city × nature × music)
    skyTop: "#1D1024",
    skyBottom: "#311641",
    skyInk: "#FFFFFF",
    skyMuted: "#CDB7D6",
    bldg: "#4A2357",
    bldgBack: "#2F1838",
    eq: "#D07BDD",
    windowLit: "#F3D58A",
    moon: "#F3E6F6",
    note: "rgba(208,123,221,0.75)",
    trunk: "#5A4636",
    leaf: "#3DDC84",
    ground: "#16301F",
    smog: "rgba(160,150,140,0.55)",
    player: "rgba(11,12,12,0.72)",
  },
  light: {
    bg: "#F6F3F7",
    card: "#FFFFFF",
    cardHi: "#F0EAF2",
    line: "#E4DCE7",
    ink: "#0B0C0C",
    muted: "#626768",
    dim: "#9A9FA0",
    accent: "#AC34BD",
    accentText: "#8E2A9C",
    onAccent: "#FFFFFF",
    accentSoft: "rgba(172,52,189,0.10)",
    accent2: "#5B5FD9",
    accent2Soft: "rgba(91,95,217,0.12)",
    gold: "#B87A00",
    goldSoft: "rgba(214,150,0,0.14)",
    good: "#1E9E5A",
    warn: "#D97A00",
    bad: "#D93448",
    tabBar: "#FFFFFF",
    heroFrom: "#F3DDF6",
    heroBorder: "#E7C6EC",
    loginGlow: "#EBCDF0",
    goodSoft: "rgba(30,158,90,0.12)",
    glow: "rgba(172,52,189,0.35)",
    vinyl: "#1A141C",
    groove: "#3A3140",
    skyTop: "#F6E9FB",
    skyBottom: "#E3C9EF",
    skyInk: "#0B0C0C",
    skyMuted: "#6B4F75",
    bldg: "#C58BD1",
    bldgBack: "#DCB6E5",
    eq: "#AC34BD",
    windowLit: "#FFFFFF",
    moon: "#F7C95C",
    note: "rgba(142,42,156,0.6)",
    trunk: "#8B6A50",
    leaf: "#1E9E5A",
    ground: "#BFE3CC",
    smog: "rgba(120,110,100,0.45)",
    player: "rgba(255,255,255,0.85)",
  },
};

export type Palette = typeof PALETTES.dark;

let scheme: Scheme = Appearance.getColorScheme() === "light" ? "light" : "dark";
let version = 0;

/** The live palette. Always read colours as C.x at render time, never copy them into module constants. */
export const C: Palette = { ...PALETTES[scheme] };

export function currentScheme() {
  return scheme;
}

/** Switch palettes; App re-renders the tree afterwards. */
export function applyScheme(next: Scheme) {
  if (next === scheme) return;
  scheme = next;
  version++;
  Object.assign(C, PALETTES[next]);
}

/**
 * Like StyleSheet.create, but rebuilt whenever the scheme changes.
 * Usage: const styles = themed(() => ({ box: { backgroundColor: C.card } }));
 */
type Styles = Parameters<typeof StyleSheet.create>[0];

export function themed<T extends Styles>(factory: () => T & Styles): Readonly<T> {
  let built = -1;
  let cache = {} as Readonly<T>;
  const out = {} as T;
  for (const key of Object.keys(factory()) as (keyof T)[]) {
    Object.defineProperty(out, key, {
      enumerable: true,
      get() {
        if (built !== version) {
          cache = StyleSheet.create(factory());
          built = version;
        }
        return cache[key];
      },
    });
  }
  return out;
}

export const R = { sm: 12, md: 18, lg: 26 };

export const necessityColor = {
  get essential() { return C.good; },
  get nice_to_have() { return C.warn; },
  get impulse() { return C.bad; },
};

export const necessityLabel = {
  essential: "Essential",
  nice_to_have: "Nice to have",
  impulse: "Impulse",
} as const;
