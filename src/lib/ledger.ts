const STORAGE_KEY = "ledger-entries";

export type EntryType = "income" | "expense";

export type Entry = {
  id: string;
  type: EntryType;
  date: string; // YYYY-MM-DD
  category: string;
  amount: number;
  memo: string;
};

export const incomeCategories = [
  "授業料",
  "入会金",
  "季節講習費",
  "教材販売",
  "その他収入",
];

export const expenseCategories = [
  "人件費",
  "家賃",
  "広告宣伝費",
  "教材仕入",
  "水道光熱費",
  "通信・システム費",
  "その他経費",
];

const EMPTY: Entry[] = [];
const listeners = new Set<() => void>();
let cache: Entry[] | null = null;

function read(): Entry[] {
  if (cache) return cache;
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) return (cache = EMPTY);
  try {
    cache = JSON.parse(raw) as Entry[];
  } catch {
    cache = EMPTY;
  }
  return cache;
}

function write(entries: Entry[]) {
  cache = entries;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
  listeners.forEach((l) => l());
}

export function subscribe(listener: () => void) {
  listeners.add(listener);
  const onStorage = (e: StorageEvent) => {
    if (e.key !== STORAGE_KEY) return;
    cache = null;
    listener();
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

export function getEntries(): Entry[] {
  return read();
}

export function getServerEntries(): Entry[] {
  return EMPTY;
}

export function addEntry(entry: Omit<Entry, "id">) {
  const id =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  write([...read(), { ...entry, id }]);
}

export function deleteEntry(id: string) {
  write(read().filter((e) => e.id !== id));
}

export type Summary = {
  income: number;
  expense: number;
  profit: number;
  margin: number | null; // 利益率(%)。売上0のときは null
};

export function summarize(entries: Entry[]): Summary {
  let income = 0;
  let expense = 0;
  for (const e of entries) {
    if (e.type === "income") income += e.amount;
    else expense += e.amount;
  }
  const profit = income - expense;
  return {
    income,
    expense,
    profit,
    margin: income > 0 ? (profit / income) * 100 : null,
  };
}

export function totalsByCategory(entries: Entry[], type: EntryType) {
  const totals = new Map<string, number>();
  for (const e of entries) {
    if (e.type !== type) continue;
    totals.set(e.category, (totals.get(e.category) ?? 0) + e.amount);
  }
  return [...totals.entries()]
    .map(([category, amount]) => ({ category, amount }))
    .sort((a, b) => b.amount - a.amount);
}

export function toCsv(entries: Entry[]): string {
  const escape = (s: string) => `"${s.replace(/"/g, '""')}"`;
  const rows = entries.map((e) =>
    [
      e.date,
      e.type === "income" ? "収入" : "支出",
      escape(e.category),
      e.amount,
      escape(e.memo),
    ].join(",")
  );
  return ["日付,区分,カテゴリ,金額,メモ", ...rows].join("\n");
}

export const yen = (n: number) => `¥${Math.round(n).toLocaleString("ja-JP")}`;
