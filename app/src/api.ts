import Constants from "expo-constants";
import type { Insights, Receipt, StoredReceipt } from "./types";

/**
 * Where the Node server lives. Defaults to the same machine that is serving
 * the Expo bundle (your laptop's LAN IP) on port 3001. Override with
 * EXPO_PUBLIC_API_URL in app/.env (e.g. when using `expo start --tunnel`).
 */
function resolveBaseUrl(): string {
  const fromEnv = process.env.EXPO_PUBLIC_API_URL;
  if (fromEnv) return fromEnv.replace(/\/$/, "");
  const hostUri = Constants.expoConfig?.hostUri; // e.g. "192.168.1.20:8081"
  const host = hostUri?.split(":")[0] ?? "localhost";
  return `http://${host}:3001`;
}

export const API_URL = resolveBaseUrl();

async function post<T>(path: string, body: unknown, timeoutMs = 150_000): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(`${API_URL}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(json.error ?? `Server error ${res.status}`);
    return json as T;
  } catch (e: any) {
    if (e?.name === "AbortError") throw new Error("The AI took too long to read this receipt. Please try again.");
    if (e instanceof TypeError) {
      throw new Error(
        `Couldn't talk to the server at ${API_URL} (${e.message}). Is it running, and is the phone on the same Wi-Fi?`,
      );
    }
    throw e;
  } finally {
    clearTimeout(timer);
  }
}

/** Quick reachability check so we fail fast instead of waiting on a long timeout. */
export async function checkServer(timeoutMs = 4000): Promise<boolean> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(`${API_URL}/health`, { signal: controller.signal });
    return res.ok;
  } catch {
    return false;
  } finally {
    clearTimeout(timer);
  }
}

export function scanReceipt(imageBase64: string, mediaType = "image/jpeg") {
  return post<Receipt>("/api/receipt", { imageBase64, mediaType });
}

export function fetchInsights(receipts: StoredReceipt[], monthlyBudget: number, monthLabel: string) {
  // Strip local-only fields before sending.
  const slim = receipts.map(({ id, scannedAt, source, ...r }) => r);
  return post<Insights>("/api/insights", { receipts: slim, monthlyBudget, month: monthLabel });
}
