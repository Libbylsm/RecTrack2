import type { Category, StoredReceipt } from "./types";

export interface DistrictDef {
  name: string;
  landmark: string;
  buildings: string[];
  color: string;
}

export const DISTRICTS: Record<Category, DistrictDef> = {
  groceries: { name: "Food Kingdom", landmark: "🏰", buildings: ["🌾", "🍎", "🥖", "🧀", "🥕", "🥛"], color: "#7BC67E" },
  dining: { name: "Restaurant Row", landmark: "🍽️", buildings: ["🍔", "🍕", "🍜", "☕", "🌮", "🍣"], color: "#F4A261" },
  transport: { name: "Transit Network", landmark: "🚉", buildings: ["🚌", "🚆", "🚲", "⛽", "🚕", "🛴"], color: "#6FA8DC" },
  entertainment: { name: "Fun District", landmark: "🎡", buildings: ["🎬", "🎮", "🎢", "🎤", "🎳", "🎟️"], color: "#C77DFF" },
  household: { name: "Homestead", landmark: "🏡", buildings: ["🏠", "🧺", "🧽", "🪴", "🛋️", "🕯️"], color: "#E9C46A" },
  health: { name: "Wellness Quarter", landmark: "🏥", buildings: ["💊", "🧴", "🧘", "🪥", "🏋️", "🍵"], color: "#80CED7" },
  clothing: { name: "Fashion Avenue", landmark: "🛍️", buildings: ["👕", "👟", "👗", "🧥", "👜", "🧢"], color: "#F28482" },
  tech_subscriptions: { name: "Silicon Strip", landmark: "🏙️", buildings: ["📱", "💻", "📺", "🎧", "📡", "🔋"], color: "#8D99AE" },
  other: { name: "The Wildlands", landmark: "🗺️", buildings: ["📦", "🎁", "🧩", "🪄", "🗿", "🧭"], color: "#B5838D" },
};

export interface District {
  category: Category;
  def: DistrictDef;
  spend: number;
  itemCount: number;
  impulseSpend: number;
  buildings: string[]; // emojis to render, in order
  level: number;
}

export interface CityState {
  totalSpend: number;
  totalSavings: number;
  itemCount: number;
  impulseShare: number; // 0..1
  essentialShare: number; // 0..1
  health: number; // 0..100
  pollution: number; // number of smog clouds 0..6
  trees: number;
  districts: District[]; // sorted by spend desc, only non-empty
  currency: string;
}

const SPEND_PER_BUILDING = 4; // every £4 builds one tile
const MAX_BUILDINGS = 15;

export function buildCity(receipts: StoredReceipt[]): CityState {
  const byCat = new Map<Category, District>();
  let total = 0;
  let impulse = 0;
  let essential = 0;
  let items = 0;
  let savings = 0;

  for (const r of receipts) {
    savings += r.savings || 0;
    for (const it of r.items) {
      const price = Math.max(0, it.price || 0);
      const cat = (DISTRICTS[it.category] ? it.category : "other") as Category;
      let d = byCat.get(cat);
      if (!d) {
        d = { category: cat, def: DISTRICTS[cat], spend: 0, itemCount: 0, impulseSpend: 0, buildings: [], level: 0 };
        byCat.set(cat, d);
      }
      d.spend += price;
      d.itemCount += 1;
      if (it.necessity === "impulse") {
        d.impulseSpend += price;
        impulse += price;
      }
      if (it.necessity === "essential") essential += price;
      total += price;
      items += 1;
    }
  }

  const districts = [...byCat.values()].sort((a, b) => b.spend - a.spend);
  for (const d of districts) {
    const n = Math.min(MAX_BUILDINGS, Math.max(1, Math.ceil(d.spend / SPEND_PER_BUILDING)));
    // Impulse spending turns some buildings into factories.
    const factories = Math.min(n, Math.round((d.impulseSpend / Math.max(d.spend, 1)) * n));
    d.buildings = Array.from({ length: n }, (_, i) =>
      i >= n - factories ? "🏭" : d.def.buildings[i % d.def.buildings.length],
    );
    d.level = Math.min(5, 1 + Math.floor(d.spend / 20));
  }

  const impulseShare = total ? impulse / total : 0;
  const essentialShare = total ? essential / total : 0;
  const savingsBonus = total ? Math.min(15, (savings / total) * 100) : 0;
  const health = Math.round(
    Math.max(0, Math.min(100, 85 - impulseShare * 120 + essentialShare * 15 + savingsBonus)),
  );

  return {
    totalSpend: total,
    totalSavings: savings,
    itemCount: items,
    impulseShare,
    essentialShare,
    health: receipts.length ? health : 100,
    pollution: Math.min(6, Math.round(impulseShare * 12)),
    trees: Math.min(10, Math.round(essentialShare * 10) + Math.round(savingsBonus / 3)),
    districts,
    currency: receipts[0]?.currency ?? "GBP",
  };
}

export function money(amount: number, currency = "GBP") {
  const sym: Record<string, string> = { GBP: "£", USD: "$", EUR: "€", JPY: "¥" };
  return `${sym[currency] ?? currency + " "}${amount.toFixed(2)}`;
}

export function skyColors(health: number): [string, string] {
  if (health >= 75) return ["#3B6FD8", "#6C5CE7"]; // clear twilight blue -> violet
  if (health >= 50) return ["#4A5A7A", "#6B5F8F"]; // hazy
  if (health >= 25) return ["#5E554A", "#6E6253"]; // smoggy brown
  return ["#3A3532", "#554C45"]; // choking
}
