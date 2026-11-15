// Dark, neon-accented "gamified finance" look.
export const C = {
  bg: "#0D0E12",
  card: "#17181E",
  cardHi: "#1F2128",
  line: "#2A2C35",
  ink: "#F4F5F7",
  muted: "#8B8F9C",
  dim: "#5D6170",
  lime: "#C6F432",
  limeInk: "#11140A", // text on lime
  violet: "#8B7BFF",
  violetSoft: "rgba(139,123,255,0.16)",
  gold: "#FFC94D",
  good: "#3DDC84",
  warn: "#FFB347",
  bad: "#FF5D6C",
};

export const R = { sm: 12, md: 18, lg: 26 };

export const necessityColor = {
  essential: C.good,
  nice_to_have: C.warn,
  impulse: C.bad,
} as const;

export const necessityLabel = {
  essential: "Essential",
  nice_to_have: "Nice to have",
  impulse: "Impulse",
} as const;
