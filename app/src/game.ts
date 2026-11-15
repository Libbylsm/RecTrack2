import { buildCity } from "./city";
import { currentMonthKey, groupByMonth } from "./month";
import type { StoredReceipt } from "./types";

export const XP_PER_LEVEL = 400;

export const LEVEL_TITLES = [
  "Pocket Rookie", "Receipt Rambler", "Coin Counter", "Budget Builder",
  "Savings Strategist", "Money Mayor", "Finance Architect", "Legend of Ledgers",
];

export interface Achievement {
  id: string;
  icon: string;
  title: string;
  desc: string;
  unlocked: boolean;
}

export interface Quest {
  id: string;
  icon: string;
  title: string;
  progress: number; // 0..1
  label: string;
  xp: number;
  done: boolean;
}

export interface GameState {
  xp: number;
  level: number;
  levelTitle: string;
  levelProgress: number; // 0..1
  xpIntoLevel: number;
  streak: number; // consecutive days with a scan, ending today or yesterday
  achievements: Achievement[];
  quests: Quest[];
}

function dayKey(t: number) {
  const d = new Date(t);
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

function scanStreak(receipts: StoredReceipt[]) {
  const days = new Set(receipts.filter((r) => r.source !== "demo").map((r) => dayKey(r.scannedAt)));
  if (days.size === 0) return 0;
  const d = new Date();
  if (!days.has(dayKey(d.getTime()))) d.setDate(d.getDate() - 1); // streak survives until tonight
  let n = 0;
  while (days.has(dayKey(d.getTime()))) {
    n++;
    d.setDate(d.getDate() - 1);
  }
  return n;
}

export function computeGame(all: StoredReceipt[], budget: number): GameState {
  const months = groupByMonth(all);
  const cur = months.get(currentMonthKey()) ?? [];
  const city = buildCity(cur);

  // Monthly quests
  const scanTarget = 10;
  const impulsePct = Math.round(city.impulseShare * 100);
  const quests: Quest[] = [
    {
      id: "scan10", icon: "receipt-outline", title: `Scan ${scanTarget} receipts`,
      progress: Math.min(1, cur.length / scanTarget), label: `${Math.min(cur.length, scanTarget)}/${scanTarget}`,
      xp: 150, done: cur.length >= scanTarget,
    },
    {
      id: "impulse", icon: "leaf-outline", title: "Keep impulse buys under 15%",
      progress: cur.length ? Math.max(0, Math.min(1, (30 - impulsePct) / 15)) : 0,
      label: cur.length ? `${impulsePct}% now` : "No data yet",
      xp: 200, done: cur.length >= 3 && impulsePct < 15,
    },
    {
      id: "budget", icon: "shield-checkmark-outline", title: "Stay under budget",
      progress: budget ? Math.max(0, 1 - city.totalSpend / budget) : 0,
      label: budget ? `${Math.round(Math.max(0, 1 - city.totalSpend / budget) * 100)}% left` : "Set a budget",
      xp: 300, done: false, // only awarded once the month closes
    },
  ];

  // XP: scanning + items + savings + completed quests + past months under budget
  let xp = 0;
  for (const r of all) xp += 40 + r.items.length * 5 + Math.round((r.savings || 0) * 5);
  xp += quests.filter((q) => q.done).reduce((s, q) => s + q.xp, 0);
  let monthsUnderBudget = 0;
  for (const [k, rs] of months) {
    if (k === currentMonthKey() || !budget) continue;
    if (buildCity(rs).totalSpend <= budget) {
      monthsUnderBudget++;
      xp += 300;
    }
  }

  const streak = scanStreak(all);
  const level = 1 + Math.floor(xp / XP_PER_LEVEL);
  const totalSavings = all.reduce((s, r) => s + (r.savings || 0), 0);

  const achievements: Achievement[] = [
    { id: "first", icon: "🧾", title: "First Receipt", desc: "Scan your first receipt", unlocked: all.length >= 1 },
    { id: "ten", icon: "📚", title: "Paper Trail", desc: "Scan 10 receipts", unlocked: all.length >= 10 },
    { id: "screen", icon: "📱", title: "Digital Native", desc: "Scan an e-receipt screenshot", unlocked: all.some((r) => r.source === "screenshot" || r.receipt_type === "digital") },
    { id: "streak", icon: "🔥", title: "On Fire", desc: "3-day scanning streak", unlocked: streak >= 3 },
    { id: "deals", icon: "🏷️", title: "Deal Hunter", desc: "Save £10 with offers", unlocked: totalSavings >= 10 },
    { id: "planner", icon: "🏙️", title: "City Planner", desc: "5 districts in one month", unlocked: [...months.values()].some((rs) => buildCity(rs).districts.length >= 5) },
    { id: "clean", icon: "🌿", title: "Clean Air", desc: "Air quality 80+ this month", unlocked: cur.length >= 3 && city.health >= 80 },
    { id: "budget", icon: "🎯", title: "On Target", desc: "Finish a month under budget", unlocked: monthsUnderBudget > 0 },
  ];

  return {
    xp,
    level,
    levelTitle: LEVEL_TITLES[Math.min(level - 1, LEVEL_TITLES.length - 1)],
    levelProgress: (xp % XP_PER_LEVEL) / XP_PER_LEVEL,
    xpIntoLevel: xp % XP_PER_LEVEL,
    streak,
    achievements,
    quests,
  };
}
