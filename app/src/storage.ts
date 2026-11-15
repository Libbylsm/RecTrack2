import AsyncStorage from "@react-native-async-storage/async-storage";
import type { Insights, StoredReceipt } from "./types";

// Data is stored per user so each demo account has its own city.
const receiptsKey = (userId: string) => `rr.${userId}.receipts.v2`;
const insightsKey = (userId: string) => `rr.${userId}.insights.v2`;

export async function loadReceipts(userId: string): Promise<StoredReceipt[]> {
  try {
    const raw = await AsyncStorage.getItem(receiptsKey(userId));
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export async function saveReceipts(userId: string, receipts: StoredReceipt[]) {
  await AsyncStorage.setItem(receiptsKey(userId), JSON.stringify(receipts));
}

/** AI insights, keyed by month ("2026-11"). */
export type InsightsByMonth = Record<string, Insights>;

export async function loadInsights(userId: string): Promise<InsightsByMonth> {
  try {
    const raw = await AsyncStorage.getItem(insightsKey(userId));
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export async function saveInsights(userId: string, map: InsightsByMonth) {
  await AsyncStorage.setItem(insightsKey(userId), JSON.stringify(map));
}
