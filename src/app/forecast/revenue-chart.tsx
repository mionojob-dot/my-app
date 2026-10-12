"use client";

import { useState } from "react";
import { man, yen, type MonthResult } from "@/lib/forecast";

const SERIES = [
  { key: "tuition", label: "月謝", color: "#2a78d6" },
  { key: "course", label: "講習費", color: "#eb6834" },
  { key: "enrollment", label: "入会金", color: "#1baf7a" },
  { key: "material", label: "教材費", color: "#eda100" },
] as const;

const HEIGHT = 220;

function niceMax(v: number) {
  if (v <= 0) return 1_000_000;
  const step = 10 ** Math.floor(Math.log10(v));
  for (const m of [1, 1.5, 2, 2.5, 3, 4, 5, 6, 8, 10]) if (m * step >= v) return m * step;
  return 10 * step;
}

export function RevenueChart({ months, monthlyTarget }: { months: MonthResult[]; monthlyTarget: number }) {
  const [hover, setHover] = useState<number | null>(null);
  const max = niceMax(Math.max(...months.map((m) => m.total), monthlyTarget));
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((r) => r * max);
  const h = (v: number) => (v / max) * HEIGHT;

  return (
    <div>
      <ul className="mb-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-600">
        {SERIES.map((s) => (
          <li key={s.key} className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-sm" style={{ background: s.color }} />
            {s.label}
          </li>
        ))}
        <li className="flex items-center gap-1.5">
          <span className="w-4 border-t-2 border-dashed border-gray-500" />
          目標の月平均
        </li>
      </ul>

      <div className="flex">
        <div className="relative w-14 shrink-0 text-right text-[10px] text-gray-400" style={{ height: HEIGHT }}>
          {ticks.map((t) => (
            <span key={t} className="absolute right-2 translate-y-1/2" style={{ bottom: h(t) }}>
              {Math.round(t / 10_000).toLocaleString("ja-JP")}万
            </span>
          ))}
        </div>

        <div className="relative flex-1">
          <div className="relative" style={{ height: HEIGHT }}>
            {ticks.map((t) => (
              <div key={t} className="absolute inset-x-0 border-t border-gray-100" style={{ bottom: h(t) }} />
            ))}
            {monthlyTarget > 0 && (
              <div
                className="pointer-events-none absolute inset-x-0 z-10 border-t-2 border-dashed border-gray-500"
                style={{ bottom: h(monthlyTarget) }}
              />
            )}
            <div className="absolute inset-0 flex items-end gap-[2px]">
              {months.map((m, i) => (
                <div
                  key={`${m.year}-${m.month}`}
                  className="relative flex h-full flex-1 cursor-default flex-col-reverse items-center"
                  onMouseEnter={() => setHover(i)}
                  onMouseLeave={() => setHover(null)}
                  onClick={() => setHover(hover === i ? null : i)}
                >
                  <div
                    className="flex w-full max-w-9 flex-col-reverse gap-[2px] transition-opacity"
                    style={{ opacity: hover === null || hover === i ? 1 : 0.45 }}
                  >
                    {SERIES.map((s, si) => {
                      const v = m[s.key];
                      if (v <= 0) return null;
                      const isTop = SERIES.slice(si + 1).every((n) => m[n.key] <= 0);
                      return (
                        <div
                          key={s.key}
                          className={isTop ? "rounded-t" : ""}
                          style={{ height: Math.max(h(v) - 2, 1), background: s.color }}
                        />
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>

            {hover !== null && (
              <Tooltip m={months[hover]} index={hover} count={months.length} />
            )}
          </div>

          <div className="mt-1 flex gap-[2px] text-center text-[10px] text-gray-500">
            {months.map((m) => (
              <span key={`${m.year}-${m.month}`} className="flex-1">
                {m.month}
                <span className="hidden sm:inline">月</span>
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function Tooltip({ m, index, count }: { m: MonthResult; index: number; count: number }) {
  const left = index < count / 2;
  return (
    <div
      className="pointer-events-none absolute top-0 z-20 w-44 rounded-lg border border-gray-200 bg-white p-2 text-xs shadow-lg"
      style={
        left
          ? { left: `calc(${((index + 1) / count) * 100}% + 4px)` }
          : { right: `calc(${((count - index) / count) * 100}% + 4px)` }
      }
    >
      <p className="mb-1 font-bold text-gray-900">
        {m.year}年{m.month}月 <span className="font-normal text-gray-500">{man(m.total)}</span>
      </p>
      {SERIES.map((s) => (
        <p key={s.key} className="flex items-center justify-between gap-2 text-gray-700">
          <span className="flex items-center gap-1">
            <span className="h-2 w-2 rounded-sm" style={{ background: s.color }} />
            {s.label}
          </span>
          <span className="tabular-nums">{yen(m[s.key])}</span>
        </p>
      ))}
    </div>
  );
}
