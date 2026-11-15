import AsyncStorage from "@react-native-async-storage/async-storage";
import type { Insights, StoredReceipt } from "./types";

const RECEIPTS_KEY = "rr.receipts.v1";
const INSIGHTS_KEY = "rr.insights.v1";

export async function loadReceipts(): Promise<StoredReceipt[]> {
  try {
    const raw = await AsyncStorage.getItem(RECEIPTS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export async function saveReceipts(receipts: StoredReceipt[]) {
  await AsyncStorage.setItem(RECEIPTS_KEY, JSON.stringify(receipts));
}

export async function loadInsights(): Promise<Insights | null> {
  try {
    const raw = await AsyncStorage.getItem(INSIGHTS_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export async function saveInsights(insights: Insights | null) {
  if (insights) await AsyncStorage.setItem(INSIGHTS_KEY, JSON.stringify(insights));
  else await AsyncStorage.removeItem(INSIGHTS_KEY);
}
