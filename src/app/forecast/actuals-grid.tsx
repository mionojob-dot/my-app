"use client";

import { useState } from "react";
import { GRADES, sum, ymKey, type ActualKind, type Actuals, type MonthResult } from "@/lib/forecast";
import { OptionalNumberInput } from "./number-input";

const TABS: { kind: ActualKind; label: string; note: string }[] = [
  {
    kind: "students",
    label: "在籍数",
    note: "その月に月謝を請求する人数(新規入塾者を含む)。入力した月は、翌月以降の予測の起点になります。",
  },
  {
    kind: "newStudents",
    label: "新規入塾数",
    note: "その月に入塾した人数。入会金・教材費の計算に使います。",
  },
  {
    kind: "course",
    label: "講習受講者数",
    note: "講習の請求月だけ入力できます。空欄の月は「在籍数 × 受講率」で計算します。",
  },
];

const cellValue = (m: MonthResult, kind: ActualKind, g: number) =>
  kind === "students" ? m.students[g] : kind === "newStudents" ? m.newByGrade[g] : m.courseByGrade[g];

const fmt = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(1));

export function ActualsGrid({
  months,
  actuals,
  onChange,
}: {
  months: MonthResult[];
  actuals: Actuals;
  onChange: (next: Actuals) => void;
}) {
  const [kind, setKind] = useState<ActualKind>("students");
  const tab = TABS.find((t) => t.kind === kind)!;
  const values = actuals[kind];
  const keys = months.map((m) => ymKey(m.year, m.month));
  const enteredCount = keys.reduce((n, k) => n + (values[k]?.filter((v) => v !== null).length ?? 0), 0);

  function setRow(key: string, row: (number | null)[]) {
    const next = { ...values };
    if (row.every((v) => v === null)) delete next[key];
    else next[key] = row;
    onChange({ ...actuals, [kind]: next });
  }

  function setCell(key: string, g: number, v: number | null) {
    const row = values[key] ? [...values[key]] : GRADES.map(() => null);
    row[g] = v;
    setRow(key, row);
  }

  function copyPrevious(i: number) {
    const prev = months[i - 1];
    setRow(keys[i], GRADES.map((_, g) => Math.round(cellValue(prev, kind, g))));
  }

  function clearTab() {
    if (!confirm(`「${tab.label}」の入力をすべて消して予測値に戻しますか?`)) return;
    const next = { ...values };
    keys.forEach((k) => delete next[k]);
    onChange({ ...actuals, [kind]: next });
  }

  return (
    <section className="rounded-2xl bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-bold">月別・学年別の入力</h2>
        <button onClick={clearTab} disabled={enteredCount === 0} className="text-xs text-gray-500 hover:text-red-600 disabled:text-gray-300">
          このタブの入力を消す
        </button>
      </div>

      <div className="mt-3 flex gap-1 rounded-lg bg-gray-100 p-1 text-sm">
        {TABS.map((t) => (
          <button
            key={t.kind}
            onClick={() => setKind(t.kind)}
            className={`flex-1 rounded-md py-1.5 font-medium transition ${
              kind === t.kind ? "bg-white text-gray-900 shadow-sm" : "text-gray-500"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <p className="mt-2 text-xs text-gray-500">{tab.note}</p>
      <p className="mt-1 flex flex-wrap items-center gap-3 text-xs text-gray-500">
        <span className="flex items-center gap-1">
          <span className="inline-block h-3 w-5 rounded border border-blue-300 bg-blue-50" />
          入力済み(実数)
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block h-3 w-5 rounded border border-gray-300 bg-white" />
          <span className="text-gray-400">灰色の数字</span> = 予測値(空欄のまま)
        </span>
        <span>入力済み {enteredCount}マス</span>
      </p>

      <div className="mt-3 overflow-x-auto">
        <table className="w-full min-w-[820px] text-sm">
          <thead>
            <tr className="text-xs text-gray-500">
              <th className="py-1 text-left font-medium">月</th>
              {GRADES.map((g) => (
                <th key={g} className="px-0.5 py-1 text-right font-medium">
                  {g}
                </th>
              ))}
              <th className="px-1 py-1 text-right font-medium">合計</th>
              <th className="w-16" />
            </tr>
          </thead>
          <tbody>
            {months.map((m, i) => {
              const key = keys[i];
              const row = values[key];
              const disabled = kind === "course" && !m.isCourseMonth;
              const total = sum(GRADES.map((_, g) => cellValue(m, kind, g)));
              return (
                <tr key={key} className={disabled ? "text-gray-300" : ""}>
                  <td className="whitespace-nowrap py-0.5 pr-2 tabular-nums">
                    {m.year}/{m.month}
                  </td>
                  {GRADES.map((g, gi) => {
                    const entered = row?.[gi] ?? null;
                    return (
                      <td key={g} className="px-0.5 py-0.5">
                        <OptionalNumberInput
                          value={disabled ? null : entered}
                          onChange={(v) => setCell(key, gi, v)}
                          placeholder={disabled ? "—" : fmt(cellValue(m, kind, gi))}
                          disabled={disabled}
                          aria-label={`${m.year}年${m.month}月 ${g} ${tab.label}`}
                          className={entered !== null ? "border-blue-300 bg-blue-50 font-semibold" : "bg-white"}
                        />
                      </td>
                    );
                  })}
                  <td className="px-1 py-0.5 text-right tabular-nums text-gray-600">
                    {disabled ? "" : fmt(Math.round(total * 10) / 10)}
                  </td>
                  <td className="py-0.5 pl-1 text-right">
                    {i > 0 && kind !== "course" && (
                      <button
                        onClick={() => copyPrevious(i)}
                        className="whitespace-nowrap text-xs text-blue-600 hover:underline"
                        title="前月の値(予測値を含む)をこの月にコピー"
                      >
                        前月コピー
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
