export const C = {
  bg: "#F6F4EF",
  card: "#FFFFFF",
  ink: "#1F2328",
  muted: "#6B7280",
  line: "#E5E1D8",
  accent: "#5B4BDB",
  accentSoft: "#ECE9FF",
  good: "#2E9E5B",
  warn: "#D9822B",
  bad: "#D64545",
};

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
