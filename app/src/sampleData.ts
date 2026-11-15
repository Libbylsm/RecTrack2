import type { Insights, ReceiptItem, StoredReceipt } from "./types";

type Template = { merchant: string; savings: number; payment: string; fact: string; items: ReceiptItem[] };

const T: Record<string, Template> = {
  tesco: {
    merchant: "Tesco Express", savings: 3.1, payment: "contactless",
    fact: "You bought three different kinds of crisps in one trip. Bold.",
    items: [
      { name: "Semi-skimmed milk 2L", quantity: 1, price: 1.65, category: "groceries", necessity: "essential" },
      { name: "Wholemeal bread", quantity: 1, price: 1.4, category: "groceries", necessity: "essential" },
      { name: "Free-range eggs x12", quantity: 1, price: 3.2, category: "groceries", necessity: "essential" },
      { name: "Chicken breast fillets", quantity: 1, price: 4.75, category: "groceries", necessity: "essential" },
      { name: "Sharing bag crisps", quantity: 3, price: 4.5, category: "groceries", necessity: "impulse" },
      { name: "Chocolate bar", quantity: 2, price: 2.2, category: "groceries", necessity: "impulse" },
      { name: "Washing-up liquid", quantity: 1, price: 1.35, category: "household", necessity: "essential" },
      { name: "Energy drink", quantity: 2, price: 4.8, category: "groceries", necessity: "impulse" },
    ],
  },
  pret: {
    merchant: "Pret A Manger", savings: 0, payment: "card",
    fact: "Two flat whites before 9am - your Restaurant Row runs on caffeine.",
    items: [
      { name: "Flat white", quantity: 2, price: 7.3, category: "dining", necessity: "nice_to_have" },
      { name: "Chicken avocado sandwich", quantity: 1, price: 4.95, category: "dining", necessity: "nice_to_have" },
      { name: "Cookie", quantity: 1, price: 2.35, category: "dining", necessity: "impulse" },
    ],
  },
  train: {
    merchant: "Trainline", savings: 10.45, payment: "card",
    fact: "Your railcard saved you a third - the Transit Network salutes you.",
    items: [
      { name: "Durham to Newcastle return (railcard)", quantity: 1, price: 9.4, category: "transport", necessity: "essential" },
      { name: "Durham to York off-peak return", quantity: 1, price: 22.0, category: "transport", necessity: "essential" },
    ],
  },
  odeon: {
    merchant: "Odeon Cinema", savings: 0, payment: "card",
    fact: "The large popcorn cost almost as much as the ticket. Classic.",
    items: [
      { name: "Adult ticket", quantity: 1, price: 11.5, category: "entertainment", necessity: "nice_to_have" },
      { name: "Large popcorn", quantity: 1, price: 8.9, category: "entertainment", necessity: "impulse" },
      { name: "Large fizzy drink", quantity: 1, price: 7.1, category: "entertainment", necessity: "impulse" },
    ],
  },
  boots: {
    merchant: "Boots", savings: 2.0, payment: "contactless",
    fact: "Meal deal + toothpaste: the most British receipt possible.",
    items: [
      { name: "Toothpaste", quantity: 1, price: 2.5, category: "health", necessity: "essential" },
      { name: "Paracetamol", quantity: 1, price: 0.89, category: "health", necessity: "essential" },
      { name: "Meal deal", quantity: 1, price: 3.99, category: "dining", necessity: "nice_to_have" },
      { name: "Fancy face mask set", quantity: 1, price: 11.59, category: "health", necessity: "impulse" },
    ],
  },
  deliveroo: {
    merchant: "Deliveroo", savings: 0, payment: "Apple Pay",
    fact: "The delivery and service fees cost more than the fries.",
    items: [
      { name: "Burger meal", quantity: 1, price: 12.49, category: "dining", necessity: "nice_to_have" },
      { name: "Loaded fries", quantity: 1, price: 4.99, category: "dining", necessity: "impulse" },
      { name: "Delivery & service fee", quantity: 1, price: 5.48, category: "dining", necessity: "impulse" },
    ],
  },
  spotify: {
    merchant: "Spotify", savings: 0, payment: "card",
    fact: "Your city has a permanent soundtrack.",
    items: [{ name: "Spotify Premium Student", quantity: 1, price: 5.99, category: "tech_subscriptions", necessity: "nice_to_have" }],
  },
  aldi: {
    merchant: "Aldi", savings: 4.2, payment: "card",
    fact: "A proper big shop - the Food Kingdom is stocked for weeks.",
    items: [
      { name: "Pasta 1kg", quantity: 2, price: 1.7, category: "groceries", necessity: "essential" },
      { name: "Chopped tomatoes", quantity: 4, price: 1.56, category: "groceries", necessity: "essential" },
      { name: "Bananas", quantity: 1, price: 0.95, category: "groceries", necessity: "essential" },
      { name: "Porridge oats", quantity: 1, price: 0.89, category: "groceries", necessity: "essential" },
      { name: "Frozen veg mix", quantity: 2, price: 2.3, category: "groceries", necessity: "essential" },
      { name: "Shower gel", quantity: 1, price: 1.29, category: "health", necessity: "essential" },
    ],
  },
  primark: {
    merchant: "Primark", savings: 0, payment: "contactless",
    fact: "Came in for socks. Left with a hoodie.",
    items: [
      { name: "Socks 5-pack", quantity: 1, price: 4.0, category: "clothing", necessity: "essential" },
      { name: "Oversized hoodie", quantity: 1, price: 14.0, category: "clothing", necessity: "impulse" },
    ],
  },
};

function iso(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function make(t: Template, date: Date, idx: number): StoredReceipt {
  const total = Math.round(t.items.reduce((s, i) => s + i.price, 0) * 100) / 100;
  return {
    id: `demo-${idx}-${Date.now()}`, scannedAt: date.getTime(), source: "demo", is_receipt: true,
    receipt_type: ["deliveroo", "spotify", "train"].some((k) => T[k] === t) ? "digital" : "paper",
    merchant: t.merchant, date: iso(date), currency: "GBP", total, savings: t.savings,
    payment_method: t.payment, fun_fact: t.fact, items: t.items,
  };
}

/**
 * Demo receipts dated relative to today: a few for this month plus two
 * previous months, so History has something to show.
 */
export function makeDemoReceipts(): StoredReceipt[] {
  const now = new Date();
  const at = (monthsAgo: number, day: number) => {
    const d = new Date(now.getFullYear(), now.getMonth() - monthsAgo, 1, 12);
    const lastDay = monthsAgo === 0 ? now.getDate() : new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
    d.setDate(Math.max(1, Math.min(day, lastDay)));
    return d;
  };
  const plan: [string, number, number][] = [
    // this month (days are clamped to today)
    ["tesco", 0, now.getDate() - 6], ["pret", 0, now.getDate() - 4], ["train", 0, now.getDate() - 3],
    ["odeon", 0, now.getDate() - 2], ["boots", 0, now.getDate() - 1],
    // last month
    ["aldi", 1, 3], ["spotify", 1, 5], ["deliveroo", 1, 9], ["tesco", 1, 14], ["primark", 1, 18],
    ["pret", 1, 21], ["deliveroo", 1, 26],
    // two months ago
    ["aldi", 2, 2], ["spotify", 2, 5], ["train", 2, 11], ["boots", 2, 19], ["aldi", 2, 24],
  ];
  return plan.map(([k, ago, day], i) => make(T[k], at(ago, day), i));
}

/** Offline fallback so the Insights tab never shows a blank screen in a demo. */
export const SAMPLE_INSIGHTS: Insights = {
  personality: {
    archetype: "The Treat Yourself-er",
    emoji: "🍿",
    tagline: "Essentials on lock, snacks completely unsupervised.",
    explanation:
      "Your groceries and travel are sensible - railcard savings and staple foods. But about a quarter of your spend is impulse: crisps, energy drinks and an £8.90 popcorn.",
  },
  patterns: [
    { title: "The snack tax", detail: "£11.50 of your Tesco shop was crisps, chocolate and energy drinks - nearly half the basket." },
    { title: "Popcorn vs. movie", detail: "At the Odeon, snacks (£16.00) cost more than the ticket itself (£11.50)." },
    { title: "Railcard hero", detail: "You saved £10.45 on trains - your best saving by far." },
  ],
  savings_tips: [
    { tip: "Bring snacks to the cinema or skip the large combo", estimated_monthly_saving: 16 },
    { tip: "Swap one Pret coffee run a week for a home brew", estimated_monthly_saving: 14 },
    { tip: "Buy multipack crisps instead of sharing bags at Express prices", estimated_monthly_saving: 8 },
  ],
  persona_comparison: [
    { persona: "Student Sam", verdict: "You out-snack Sam, which is genuinely impressive." },
    { persona: "Frugal Fiona", verdict: "Fiona would approve of your railcard, then confiscate your popcorn." },
    { persona: "City Chris", verdict: "You're less of a convenience addict than Chris, but your coffee habit is catching up." },
  ],
  city_story:
    "Mayor's report: the Transit Network is thriving thanks to shrewd railcard deals, and the Food Kingdom is well stocked. However, factories are springing up in the Fun District, and a faint popcorn-scented smog hangs over the skyline.",
};
