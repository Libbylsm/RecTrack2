import { z } from "zod/v4";

// Each category becomes a district in the user's virtual city.
export const CATEGORIES = [
  "groceries",
  "dining",
  "transport",
  "entertainment",
  "household",
  "health",
  "clothing",
  "tech_subscriptions",
  "other",
] as const;

export const ReceiptItem = z.object({
  name: z.string().describe("Cleaned-up, human-readable product name (expand abbreviations like 'SEMI SKM MLK' -> 'Semi-skimmed milk')"),
  quantity: z.number(),
  price: z.number().describe("Total line price after any line discount"),
  category: z.enum(CATEGORIES),
  necessity: z
    .enum(["essential", "nice_to_have", "impulse"])
    .describe("essential = staples/bills; nice_to_have = reasonable treat; impulse = likely unplanned / low-value"),
});

export const Receipt = z.object({
  is_receipt: z.boolean().describe("false if the image is not a readable receipt, invoice or order confirmation"),
  receipt_type: z
    .enum(["paper", "digital"])
    .describe("paper = photo of a printed till receipt; digital = screenshot of an e-receipt, email, app order or invoice"),
  merchant: z.string(),
  date: z.string().describe("ISO date YYYY-MM-DD, or empty string if not visible"),
  currency: z.string().describe("ISO currency code, e.g. GBP"),
  total: z.number(),
  savings: z.number().describe("Total discounts / multibuy / loyalty savings shown on the receipt, 0 if none"),
  payment_method: z.string().describe("e.g. card, contactless, cash, or 'unknown'"),
  items: z.array(ReceiptItem),
  fun_fact: z.string().describe("One short, playful observation about this specific receipt"),
});
export type Receipt = z.infer<typeof Receipt>;

export const Insights = z.object({
  personality: z.object({
    archetype: z.enum([
      "The Impulse Buyer",
      "The Bargain Hunter",
      "The Subscription Collector",
      "The Budgeting Wizard",
      "The Foodie",
      "The Commuter",
      "The Treat Yourself-er",
    ]),
    emoji: z.string(),
    tagline: z.string().describe("Witty one-liner, max 12 words"),
    explanation: z.string().describe("2 sentences grounded in the actual data"),
  }),
  patterns: z
    .array(z.object({ title: z.string(), detail: z.string() }))
    .describe("3-4 specific, surprising patterns citing real items/merchants/amounts"),
  savings_tips: z
    .array(z.object({ tip: z.string(), estimated_monthly_saving: z.number() }))
    .describe("3 concrete, actionable tips with realistic monthly savings"),
  persona_comparison: z
    .array(z.object({ persona: z.string(), verdict: z.string() }))
    .describe("Compare the user against the 3 fictional personas provided"),
  city_story: z
    .string()
    .describe("2-3 sentence narration of the user's virtual city as a 'mayor's report', referencing districts"),
});
export type Insights = z.infer<typeof Insights>;
