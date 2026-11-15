import type { StoredReceipt } from "./types";

export function keyOf(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export function currentMonthKey() {
  return keyOf(new Date());
}

/**
 * Which month a receipt belongs to: the date printed on it if it's plausible,
 * otherwise when it was scanned.
 */
export function receiptMonth(r: StoredReceipt): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(r.date ?? "");
  if (m) {
    const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
    const now = Date.now();
    const twoYears = 2 * 365 * 86_400_000;
    if (!isNaN(d.getTime()) && d.getTime() <= now + 86_400_000 && now - d.getTime() < twoYears) {
      return keyOf(d);
    }
  }
  return keyOf(new Date(r.scannedAt));
}

export function monthLabel(key: string, short = false) {
  const [y, m] = key.split("-").map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString("en-GB", {
    month: short ? "short" : "long",
    year: "numeric",
  });
}

export function groupByMonth(receipts: StoredReceipt[]): Map<string, StoredReceipt[]> {
  const map = new Map<string, StoredReceipt[]>();
  for (const r of receipts) {
    const k = receiptMonth(r);
    if (!map.has(k)) map.set(k, []);
    map.get(k)!.push(r);
  }
  return new Map([...map.entries()].sort((a, b) => (a[0] < b[0] ? 1 : -1))); // newest first
}

export function daysLeftInMonth() {
  const now = new Date();
  const last = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  return last - now.getDate();
}
