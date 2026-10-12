"use client";

import { useState } from "react";
import { GRADES, sum, type MonthResult, type MoveKind, type Moves } from "@/lib/forecast";
import { OptionalNumberInput } from "./number-input";

type Tab = "students" | MoveKind;

const TABS: { key: Tab; label: string; note: string }[] = [
  {
    key: "students",
    label: "在籍数(自動計算)",
    note: "前月の在籍数 + 入塾 − 前月の退塾 で自動計算します。新学年の月に全員が1学年上がり、中3は卒業します。",
  },
  {
    key: "joins",
    label: "入塾",
    note: "入塾した月から月謝が発生し、退塾を入力するまで翌月以降も在籍し続けます。入会金・教材費もこの月に計上します。",
  },
  {
    key: "leaves",
    label: "退塾",
    note: "その月末で退塾する人数。その月までは月謝が発生し、翌月から在籍数が減ります。",
  },
];

export function MovesGrid({
  months,
  moves,
  onChange,
}: {
  months: MonthResult[];
  moves: Moves;
  onChange: (next: Moves) => void;
}) {
  const [tab, setTab] = useState<Tab>("joins");
  const current = TABS.find((t) => t.key === tab)!;

  function setCell(kind: MoveKind, key: string, g: number, v: number | null) {
    const values = moves[kind];
    const row = values[key] ? [...values[key]] : GRADES.map(() => 0);
    row[g] = v ?? 0;
    const next = { ...values };
    if (row.every((x) => x === 0)) delete next[key];
    else next[key] = row;
    onChange({ ...moves, [kind]: next });
  }

  function clearTab(kind: MoveKind) {
    if (!confirm(`表示中の12ヶ月の「${current.label}」をすべて消しますか?`)) return;
    const next = { ...moves[kind] };
    months.forEach((m) => delete next[m.key]);
    onChange({ ...moves, [kind]: next });
  }

  const overLeaves = months.flatMap((m) =>
    m.overLeave.flatMap((over, g) => (over ? [`${m.year}年${m.month}月 ${GRADES[g]}`] : []))
  );

  return (
    <section className="rounded-2xl bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-bold">月別・学年別の在籍計画</h2>
        {tab !== "students" && (
          <button onClick={() => clearTab(tab)} className="text-xs text-gray-500 hover:text-red-600">
            このタブの入力を消す
          </button>
        )}
      </div>

      <div className="mt-3 flex gap-1 rounded-lg bg-gray-100 p-1 text-sm">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex-1 rounded-md py-1.5 font-medium transition ${
              tab === t.key ? "bg-white text-gray-900 shadow-sm" : "text-gray-500"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <p className="mt-2 text-xs text-gray-500">{current.note}</p>

      {overLeaves.length > 0 && (
        <p className="mt-2 rounded-md bg-red-50 px-2 py-1 text-xs text-red-700">
          ⚠ 退塾数が在籍数を超えています: {overLeaves.join("、")}(在籍数は0人で計算)
        </p>
      )}

      <div className="mt-3 overflow-x-auto">
        <table className="w-full min-w-[760px] table-fixed text-sm tabular-nums">
          <thead>
            <tr className="text-xs text-gray-500">
              <th className="w-24 py-1 text-left font-medium">月</th>
              {GRADES.map((g) => (
                <th key={g} className="px-0.5 py-1 text-right font-medium">
                  {g}
                </th>
              ))}
              <th className="w-14 px-1 py-1 text-right font-medium">合計</th>
            </tr>
          </thead>
          <tbody>
            {months.map((m) => (
              <tr key={m.key} className="border-b border-gray-50">
                <td className="whitespace-nowrap py-0.5 pr-2">
                  {m.year}/{m.month}
                  {m.graduates > 0 && tab === "students" && (
                    <span className="ml-1 rounded bg-gray-100 px-1 text-[10px] text-gray-600">進級</span>
                  )}
                </td>
                {GRADES.map((g, gi) =>
                  tab === "students" ? (
                    <StudentCell key={g} m={m} g={gi} />
                  ) : (
                    <td key={g} className="px-0.5 py-0.5">
                      <OptionalNumberInput
                        value={m[tab][gi] || null}
                        onChange={(v) => setCell(tab, m.key, gi, v)}
                        aria-label={`${m.year}年${m.month}月 ${g} ${current.label}`}
                        className={
                          m[tab][gi] > 0
                            ? tab === "joins"
                              ? "border-blue-300 bg-blue-50 font-semibold"
                              : "border-red-300 bg-red-50 font-semibold"
                            : "bg-white"
                        }
                      />
                    </td>
                  )
                )}
                <td className="px-1 py-0.5 text-right font-semibold">
                  {sum(tab === "students" ? m.students : m[tab]) || (tab === "students" ? 0 : "")}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function StudentCell({ m, g }: { m: MonthResult; g: number }) {
  const join = m.joins[g];
  const leave = m.leaves[g];
  return (
    <td className={`px-1 py-1 text-right ${m.overLeave[g] ? "bg-red-50" : ""}`}>
      <span className={m.students[g] === 0 ? "text-gray-300" : "text-gray-900"}>{m.students[g]}</span>
      {(join > 0 || leave > 0) && (
        <span className="ml-1 text-[10px]">
          {join > 0 && <span className="text-blue-600">+{join}</span>}
          {leave > 0 && <span className="ml-0.5 text-red-600">−{leave}</span>}
        </span>
      )}
    </td>
  );
}
