import type { Insights, StoredReceipt } from "./types";

const now = Date.now();
const day = 86_400_000;

/** Pre-parsed receipts so the demo works even without a camera or network. */
export const SAMPLE_RECEIPTS: StoredReceipt[] = [
  {
    id: "sample-1", scannedAt: now - 6 * day, is_receipt: true,
    merchant: "Tesco Express", date: "2026-11-08", currency: "GBP", total: 23.85, savings: 3.1,
    payment_method: "contactless",
    fun_fact: "You bought three different kinds of crisps in one trip. Bold.",
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
  {
    id: "sample-2", scannedAt: now - 4 * day, is_receipt: true,
    merchant: "Pret A Manger", date: "2026-11-10", currency: "GBP", total: 14.6, savings: 0,
    payment_method: "card",
    fun_fact: "Two flat whites before 9am - your Restaurant Row is fuelled by caffeine.",
    items: [
      { name: "Flat white", quantity: 2, price: 7.3, category: "dining", necessity: "nice_to_have" },
      { name: "Chicken avocado sandwich", quantity: 1, price: 4.95, category: "dining", necessity: "nice_to_have" },
      { name: "Cookie", quantity: 1, price: 2.35, category: "dining", necessity: "impulse" },
    ],
  },
  {
    id: "sample-3", scannedAt: now - 3 * day, is_receipt: true,
    merchant: "Trainline", date: "2026-11-11", currency: "GBP", total: 31.4, savings: 10.45,
    payment_method: "card",
    fun_fact: "Your railcard saved you a third - the Transit Network salutes you.",
    items: [
      { name: "Durham -> Newcastle return (railcard)", quantity: 1, price: 9.4, category: "transport", necessity: "essential" },
      { name: "Durham -> York off-peak return", quantity: 1, price: 22.0, category: "transport", necessity: "essential" },
    ],
  },
  {
    id: "sample-4", scannedAt: now - 2 * day, is_receipt: true,
    merchant: "Odeon Cinema", date: "2026-11-12", currency: "GBP", total: 27.5, savings: 0,
    payment_method: "card",
    fun_fact: "The large popcorn cost more than the ticket. Classic.",
    items: [
      { name: "Adult ticket", quantity: 1, price: 11.5, category: "entertainment", necessity: "nice_to_have" },
      { name: "Large popcorn", quantity: 1, price: 8.9, category: "entertainment", necessity: "impulse" },
      { name: "Large fizzy drink", quantity: 1, price: 7.1, category: "entertainment", necessity: "impulse" },
    ],
  },
  {
    id: "sample-5", scannedAt: now - 1 * day, is_receipt: true,
    merchant: "Boots", date: "2026-11-13", currency: "GBP", total: 18.97, savings: 2.0,
    payment_method: "contactless",
    fun_fact: "Meal deal + toothpaste: the most British receipt possible.",
    items: [
      { name: "Toothpaste", quantity: 1, price: 2.5, category: "health", necessity: "essential" },
      { name: "Paracetamol", quantity: 1, price: 0.89, category: "health", necessity: "essential" },
      { name: "Meal deal", quantity: 1, price: 3.99, category: "dining", necessity: "nice_to_have" },
      { name: "Fancy face mask set", quantity: 1, price: 11.59, category: "health", necessity: "impulse" },
    ],
  },
];

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
    { title: "Popcorn > movie", detail: "At the Odeon, snacks (£16.00) cost more than the ticket itself (£11.50)." },
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
