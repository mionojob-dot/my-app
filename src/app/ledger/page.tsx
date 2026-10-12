"use client";

import Link from "next/link";
import { useMemo, useState, useSyncExternalStore } from "react";
import {
  addEntry,
  deleteEntry,
  expenseCategories,
  getEntries,
  getServerEntries,
  incomeCategories,
  subscribe,
  summarize,
  toCsv,
  totalsByCategory,
  yen,
  type Entry,
  type EntryType,
} from "@/lib/ledger";

function today() {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export default function LedgerPage() {
  const entries = useSyncExternalStore(subscribe, getEntries, getServerEntries);
  const [month, setMonth] = useState(() => today().slice(0, 7));
  const year = month.slice(0, 4);

  const monthEntries = useMemo(
    () =>
      entries
        .filter((e) => e.date.startsWith(month))
        .sort((a, b) => b.date.localeCompare(a.date)),
    [entries, month]
  );
  const summary = summarize(monthEntries);

  const yearly = useMemo(() => {
    const rows = Array.from({ length: 12 }, (_, i) => {
      const m = `${year}-${String(i + 1).padStart(2, "0")}`;
      return { month: m, ...summarize(entries.filter((e) => e.date.startsWith(m))) };
    });
    return { rows, total: summarize(entries.filter((e) => e.date.startsWith(year))) };
  }, [entries, year]);

  function shiftMonth(delta: number) {
    const [y, m] = month.split("-").map(Number);
    const d = new Date(y, m - 1 + delta, 1);
    setMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
  }

  function exportCsv() {
    const blob = new Blob(["﻿" + toCsv([...entries].sort((a, b) => a.date.localeCompare(b.date)))], {
      type: "text/csv;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `収支_${today()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <main className="flex-1 flex flex-col items-center px-4 py-8 gap-6">
      <div className="w-full max-w-3xl flex items-center justify-between">
        <Link href="/" className="text-sm font-medium text-blue-600">
          ← ホームに戻る
        </Link>
        <h1 className="text-lg font-bold">収支計算</h1>
        <button
          onClick={exportCsv}
          disabled={entries.length === 0}
          className="text-sm font-medium text-blue-600 disabled:text-gray-300"
        >
          CSV出力
        </button>
      </div>

      <EntryForm />

      <section className="w-full max-w-3xl flex flex-col gap-4">
        <div className="flex items-center justify-center gap-3">
          <button
            onClick={() => shiftMonth(-1)}
            className="rounded-lg border border-gray-300 bg-white px-3 py-1 text-sm"
          >
            ◀
          </button>
          <input
            type="month"
            value={month}
            onChange={(e) => e.target.value && setMonth(e.target.value)}
            className="rounded-lg border border-gray-300 bg-white px-3 py-1 text-base font-semibold"
          />
          <button
            onClick={() => shiftMonth(1)}
            className="rounded-lg border border-gray-300 bg-white px-3 py-1 text-sm"
          >
            ▶
          </button>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Stat label="収入" value={yen(summary.income)} className="text-blue-600" />
          <Stat label="支出" value={yen(summary.expense)} className="text-red-600" />
          <Stat
            label="利益"
            value={yen(summary.profit)}
            className={summary.profit >= 0 ? "text-gray-900" : "text-red-600"}
          />
          <Stat
            label="利益率"
            value={summary.margin === null ? "—" : `${summary.margin.toFixed(1)}%`}
            className={summary.margin !== null && summary.margin < 0 ? "text-red-600" : "text-gray-900"}
          />
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <Breakdown title="収入の内訳" entries={monthEntries} type="income" barClass="bg-blue-500" />
          <Breakdown title="支出の内訳" entries={monthEntries} type="expense" barClass="bg-red-500" />
        </div>

        <EntryList entries={monthEntries} />
      </section>

      <section className="w-full max-w-3xl rounded-2xl bg-white p-4 shadow-sm">
        <h2 className="mb-3 font-bold">{year}年 月別推移</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm tabular-nums">
            <thead>
              <tr className="border-b text-gray-500">
                <th className="py-1 text-left font-medium">月</th>
                <th className="py-1 text-right font-medium">収入</th>
                <th className="py-1 text-right font-medium">支出</th>
                <th className="py-1 text-right font-medium">利益</th>
                <th className="py-1 text-right font-medium">利益率</th>
              </tr>
            </thead>
            <tbody>
              {yearly.rows.map((r) => (
                <tr
                  key={r.month}
                  onClick={() => setMonth(r.month)}
                  className={`cursor-pointer border-b border-gray-100 hover:bg-gray-50 ${
                    r.month === month ? "bg-blue-50" : ""
                  }`}
                >
                  <td className="py-1">{Number(r.month.slice(5))}月</td>
                  <td className="py-1 text-right">{yen(r.income)}</td>
                  <td className="py-1 text-right">{yen(r.expense)}</td>
                  <td className={`py-1 text-right ${r.profit < 0 ? "text-red-600" : ""}`}>
                    {yen(r.profit)}
                  </td>
                  <td className="py-1 text-right">
                    {r.margin === null ? "—" : `${r.margin.toFixed(1)}%`}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="font-bold">
                <td className="pt-2">合計</td>
                <td className="pt-2 text-right">{yen(yearly.total.income)}</td>
                <td className="pt-2 text-right">{yen(yearly.total.expense)}</td>
                <td className={`pt-2 text-right ${yearly.total.profit < 0 ? "text-red-600" : ""}`}>
                  {yen(yearly.total.profit)}
                </td>
                <td className="pt-2 text-right">
                  {yearly.total.margin === null ? "—" : `${yearly.total.margin.toFixed(1)}%`}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </section>

      <p className="max-w-3xl text-xs text-gray-400">
        データはこのブラウザ内にのみ保存されます。端末の変更やブラウザのデータ削除で消えるため、定期的にCSV出力でバックアップしてください。
      </p>
    </main>
  );
}

function EntryForm() {
  const [type, setType] = useState<EntryType>("income");
  const [date, setDate] = useState(today);
  const [category, setCategory] = useState(incomeCategories[0]);
  const [amount, setAmount] = useState("");
  const [memo, setMemo] = useState("");

  const categories = type === "income" ? incomeCategories : expenseCategories;
  const parsed = Number(amount.replace(/[,，]/g, ""));
  const valid = Number.isFinite(parsed) && parsed > 0 && date !== "";

  function switchType(next: EntryType) {
    setType(next);
    setCategory((next === "income" ? incomeCategories : expenseCategories)[0]);
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!valid) return;
    addEntry({ type, date, category, amount: Math.round(parsed), memo: memo.trim() });
    setAmount("");
    setMemo("");
  }

  return (
    <form
      onSubmit={submit}
      className="w-full max-w-3xl rounded-2xl bg-white p-4 shadow-sm flex flex-col gap-3"
    >
      <div className="grid grid-cols-2 gap-2">
        {(["income", "expense"] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => switchType(t)}
            className={`rounded-lg py-2 font-semibold transition ${
              type === t
                ? t === "income"
                  ? "bg-blue-600 text-white"
                  : "bg-red-600 text-white"
                : "bg-gray-100 text-gray-600"
            }`}
          >
            {t === "income" ? "収入" : "支出"}
          </button>
        ))}
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <label className="flex flex-col gap-1 text-sm text-gray-600">
          日付
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="rounded-lg border border-gray-300 px-3 py-2 text-base text-gray-900"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm text-gray-600">
          カテゴリ
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="rounded-lg border border-gray-300 px-3 py-2 text-base text-gray-900"
          >
            {categories.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm text-gray-600">
          金額(円)
          <input
            inputMode="numeric"
            placeholder="例: 25000"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="rounded-lg border border-gray-300 px-3 py-2 text-base text-gray-900 tabular-nums"
          />
        </label>
      </div>

      <label className="flex flex-col gap-1 text-sm text-gray-600">
        メモ(任意)
        <input
          value={memo}
          onChange={(e) => setMemo(e.target.value)}
          placeholder="例: 中3 山田さん 10月分"
          className="rounded-lg border border-gray-300 px-3 py-2 text-base text-gray-900"
        />
      </label>

      <button
        type="submit"
        disabled={!valid}
        className="rounded-xl bg-gray-900 py-3 font-semibold text-white transition hover:bg-gray-700 disabled:bg-gray-300"
      >
        追加する
      </button>
    </form>
  );
}

function Stat({ label, value, className }: { label: string; value: string; className: string }) {
  return (
    <div className="rounded-2xl bg-white p-3 shadow-sm">
      <p className="text-xs text-gray-500">{label}</p>
      <p className={`mt-1 text-lg font-bold tabular-nums ${className}`}>{value}</p>
    </div>
  );
}

function Breakdown({
  title,
  entries,
  type,
  barClass,
}: {
  title: string;
  entries: Entry[];
  type: EntryType;
  barClass: string;
}) {
  const totals = totalsByCategory(entries, type);
  const max = totals[0]?.amount ?? 0;

  return (
    <div className="rounded-2xl bg-white p-4 shadow-sm">
      <h2 className="mb-2 text-sm font-bold">{title}</h2>
      {totals.length === 0 ? (
        <p className="text-sm text-gray-400">記録なし</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {totals.map((t) => (
            <li key={t.category} className="text-sm">
              <div className="flex justify-between">
                <span>{t.category}</span>
                <span className="tabular-nums">{yen(t.amount)}</span>
              </div>
              <div className="mt-1 h-1.5 rounded-full bg-gray-100">
                <div
                  className={`h-1.5 rounded-full ${barClass}`}
                  style={{ width: `${(t.amount / max) * 100}%` }}
                />
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function EntryList({ entries }: { entries: Entry[] }) {
  return (
    <div className="rounded-2xl bg-white p-4 shadow-sm">
      <h2 className="mb-2 text-sm font-bold">明細({entries.length}件)</h2>
      {entries.length === 0 ? (
        <p className="text-sm text-gray-400">この月の記録はまだありません</p>
      ) : (
        <ul className="divide-y divide-gray-100">
          {entries.map((e) => (
            <li key={e.id} className="flex items-center gap-3 py-2 text-sm">
              <span className="w-12 shrink-0 text-gray-500 tabular-nums">
                {Number(e.date.slice(5, 7))}/{Number(e.date.slice(8))}
              </span>
              <div className="min-w-0 flex-1">
                <p className="font-medium">{e.category}</p>
                {e.memo && <p className="truncate text-xs text-gray-500">{e.memo}</p>}
              </div>
              <span
                className={`shrink-0 font-semibold tabular-nums ${
                  e.type === "income" ? "text-blue-600" : "text-red-600"
                }`}
              >
                {e.type === "income" ? "+" : "−"}
                {yen(e.amount)}
              </span>
              <button
                onClick={() => {
                  if (confirm(`${e.category} ${yen(e.amount)} を削除しますか?`)) deleteEntry(e.id);
                }}
                className="shrink-0 text-xs text-gray-400 hover:text-red-600"
                aria-label="削除"
              >
                削除
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
