// Mirrors server/src/schemas.ts
export type Category =
  | "groceries"
  | "dining"
  | "transport"
  | "entertainment"
  | "household"
  | "health"
  | "clothing"
  | "tech_subscriptions"
  | "other";

export type Necessity = "essential" | "nice_to_have" | "impulse";

export interface ReceiptItem {
  name: string;
  quantity: number;
  price: number;
  category: Category;
  necessity: Necessity;
}

export interface Receipt {
  is_receipt: boolean;
  merchant: string;
  date: string;
  currency: string;
  total: number;
  savings: number;
  payment_method: string;
  items: ReceiptItem[];
  fun_fact: string;
}

/** A receipt as stored on the device. */
export interface StoredReceipt extends Receipt {
  id: string;
  scannedAt: number;
  imageUri?: string;
}

export interface Insights {
  personality: { archetype: string; emoji: string; tagline: string; explanation: string };
  patterns: { title: string; detail: string }[];
  savings_tips: { tip: string; estimated_monthly_saving: number }[];
  persona_comparison: { persona: string; verdict: string }[];
  city_story: string;
}
