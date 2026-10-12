"use client";

import Link from "next/link";
import { useMemo, useSyncExternalStore } from "react";
import {
  GRADES,
  getServerSettings,
  getSettings,
  man,
  resetSettings,
  saveSettings,
  simulate,
  subscribe,
  sum,
  yen,
  type ForecastSettings,
  type GradeFee,
} from "@/lib/forecast";
import { MovesGrid } from "./moves-grid";
import { NumberInput } from "./number-input";
import { RevenueChart } from "./revenue-chart";

const MONTHS = Array.from({ length: 12 }, (_, i) => i + 1);

const GRADE_COLUMNS: { key: keyof GradeFee; label: string }[] = [
  { key: "monthlyFee", label: "月謝" },
  { key: "materialFee", label: "教材費(年)" },
  { key: "springFee", label: "春期講習" },
  { key: "summerFee", label: "夏期講習" },
  { key: "winterFee", label: "冬期講習" },
  { key: "startCount", label: "開始月の在籍数" },
];

const pct = (n: number) => `${n.toFixed(1)}%`;

export default function ForecastPage() {
  const settings = useSyncExternalStore(subscribe, getSettings, getServerSettings);
  const base = useMemo(() => simulate(settings), [settings]);

  const update = (patch: Partial<ForecastSettings>) => saveSettings({ ...settings, ...patch });
  const updateGrade = (index: number, patch: Partial<GradeFee>) =>
    update({ grades: settings.grades.map((g, i) => (i === index ? { ...g, ...patch } : g)) });

  const months = base.months;
  const first = months[0];
  const last = months[months.length - 1];
  const avgStudents = sum(months.map((m) => sum(m.students))) / months.length;
  const achievement = settings.target > 0 ? (base.total / settings.target) * 100 : null;
  const gap = base.total - settings.target;

  return (
    <main className="flex-1 flex flex-col items-center pb-16">
      <div className="sticky top-0 z-30 w-full border-b border-gray-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-2">
          <Link href="/" className="text-sm font-medium text-blue-600">
            ← ホーム
          </Link>
          <div className="text-right">
            <p className="text-[11px] text-gray-500">
              年間売上予測({first.year}年{first.month}月〜{last.year}年{last.month}月)
            </p>
            <p className="text-lg font-bold tabular-nums">
              {man(base.total)}
              {achievement !== null && (
                <span className={`ml-2 text-sm ${achievement >= 100 ? "text-gray-600" : "text-red-600"}`}>
                  目標比 {pct(achievement)}
                </span>
              )}
            </p>
          </div>
        </div>
      </div>

      <div className="flex w-full max-w-5xl flex-col gap-6 px-4 pt-6">
        <h1 className="text-xl font-bold">授業料・年間売上シミュレーター</h1>

        <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Stat label="年間売上予測" value={man(base.total)} sub={yen(base.total)} />
          <Stat
            label="目標との差"
            value={`${gap >= 0 ? "+" : "−"}${man(Math.abs(gap))}`}
            sub={`目標 ${man(settings.target)}`}
            warn={gap < 0}
          />
          <Stat
            label="在籍数(開始月 → 12ヶ月目)"
            value={`${sum(first.students)} → ${sum(last.students)}人`}
            sub={`平均 ${avgStudents.toFixed(1)}人`}
          />
          <Stat
            label="生徒1人あたり年間売上"
            value={avgStudents > 0 ? man(base.total / avgStudents) : "—"}
            sub="年間売上 ÷ 平均在籍数"
          />
        </section>

        <Card title="料金マスター" note="学年別・1人あたりの税込金額。この金額 × 在籍数で売上を計算します。">
          <div className="grid gap-3 sm:grid-cols-4">
            <Field label="計画の開始月">
              <input
                type="month"
                value={settings.startMonth}
                onChange={(e) => e.target.value && update({ startMonth: e.target.value })}
                className="w-full rounded-md border border-gray-300 bg-white px-2 py-1"
              />
            </Field>
            <Field label="年間売上目標(円)">
              <NumberInput value={settings.target} onChange={(v) => update({ target: v })} />
            </Field>
            <Field label="入会金(円)">
              <NumberInput value={settings.enrollmentFee} onChange={(v) => update({ enrollmentFee: v })} />
            </Field>
            <Field label="管理費・設備費(円/月・全学年)">
              <NumberInput value={settings.adminFee} onChange={(v) => update({ adminFee: v })} />
            </Field>
          </div>

          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[720px] text-sm">
              <thead>
                <tr className="text-xs text-gray-500">
                  <th className="py-1 text-left font-medium">学年</th>
                  {GRADE_COLUMNS.map((c) => (
                    <th key={c.key} className="px-1 py-1 text-right font-medium">
                      {c.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {settings.grades.map((g, i) => (
                  <tr key={GRADES[i]}>
                    <td className="whitespace-nowrap py-1 pr-2 font-medium">{GRADES[i]}</td>
                    {GRADE_COLUMNS.map((c) => (
                      <td key={c.key} className="px-1 py-1">
                        <NumberInput
                          value={g[c.key]}
                          onChange={(v) => updateGrade(i, { [c.key]: v })}
                          aria-label={`${GRADES[i]} ${c.label}`}
                          className={c.key === "startCount" ? "bg-blue-50" : "bg-white"}
                        />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="text-xs text-gray-500">
                  <td colSpan={6} />
                  <td className="px-1 pt-2 text-right">合計 {sum(settings.grades.map((g) => g.startCount))}人</td>
                </tr>
              </tfoot>
            </table>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-4">
            <Field label="講習の受講率(%)">
              <NumberInput value={settings.courseRatePct} onChange={(v) => update({ courseRatePct: v })} />
            </Field>
            <MonthField label="春期講習の請求月" value={settings.springMonth} onChange={(v) => update({ springMonth: v })} />
            <MonthField label="夏期講習の請求月" value={settings.summerMonth} onChange={(v) => update({ summerMonth: v })} />
            <MonthField label="冬期講習の請求月" value={settings.winterMonth} onChange={(v) => update({ winterMonth: v })} />
            <MonthField label="新学年に切り替わる月" value={settings.newYearMonth} onChange={(v) => update({ newYearMonth: v })} />
          </div>
          <ul className="mt-3 list-disc pl-5 text-xs text-gray-500">
            <li>月謝 =(月謝 + 管理費)× 在籍数。講習費 = 講習月の在籍数 × 受講率 × 講習費。</li>
            <li>教材費(年)は新学年の月に在籍者全員、それ以外の月は入塾者に計上します。入会金は入塾者に計上します。</li>
          </ul>
        </Card>

        <MovesGrid months={months} moves={settings.moves} onChange={(moves) => update({ moves })} />

        <section className="rounded-2xl bg-white p-4 shadow-sm">
          <h2 className="mb-3 font-bold">月別の売上予測</h2>
          <RevenueChart months={months} monthlyTarget={settings.target / 12} />
        </section>

        <section className="rounded-2xl bg-white p-4 shadow-sm">
          <h2 className="mb-3 font-bold">月別明細</h2>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-sm tabular-nums">
              <thead>
                <tr className="border-b text-xs text-gray-500">
                  <th className="py-1 text-left font-medium">月</th>
                  <th className="py-1 text-right font-medium">在籍数</th>
                  <th className="py-1 text-right font-medium">入塾</th>
                  <th className="py-1 text-right font-medium">退塾</th>
                  <th className="py-1 text-right font-medium">月謝</th>
                  <th className="py-1 text-right font-medium">講習費</th>
                  <th className="py-1 text-right font-medium">入会金</th>
                  <th className="py-1 text-right font-medium">教材費</th>
                  <th className="py-1 text-right font-medium">合計</th>
                  <th className="py-1 text-right font-medium">累計</th>
                </tr>
              </thead>
              <tbody>
                {months.map((m, i) => (
                  <tr key={m.key} className="border-b border-gray-100">
                    <td className="whitespace-nowrap py-1">
                      {m.year}/{m.month}
                      {m.graduates > 0 && (
                        <span className="ml-1 text-[10px] text-gray-500">中3卒業 {m.graduates}</span>
                      )}
                    </td>
                    <td className="py-1 text-right">{sum(m.students)}</td>
                    <td className="py-1 text-right">{sum(m.joins) || ""}</td>
                    <td className="py-1 text-right">{sum(m.leaves) || ""}</td>
                    <td className="py-1 text-right">{yen(m.tuition)}</td>
                    <td className="py-1 text-right">{yen(m.course)}</td>
                    <td className="py-1 text-right">{yen(m.enrollment)}</td>
                    <td className="py-1 text-right">{yen(m.material)}</td>
                    <td className="py-1 text-right font-semibold">{yen(m.total)}</td>
                    <td className="py-1 text-right text-gray-500">
                      {yen(sum(months.slice(0, i + 1).map((x) => x.total)))}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="font-bold">
                  <td className="pt-2">合計</td>
                  <td />
                  <td className="pt-2 text-right">{sum(months.map((m) => sum(m.joins)))}</td>
                  <td className="pt-2 text-right">{sum(months.map((m) => sum(m.leaves)))}</td>
                  <td className="pt-2 text-right">{yen(sum(months.map((m) => m.tuition)))}</td>
                  <td className="pt-2 text-right">{yen(sum(months.map((m) => m.course)))}</td>
                  <td className="pt-2 text-right">{yen(sum(months.map((m) => m.enrollment)))}</td>
                  <td className="pt-2 text-right">{yen(sum(months.map((m) => m.material)))}</td>
                  <td className="pt-2 text-right">{yen(base.total)}</td>
                  <td />
                </tr>
              </tfoot>
            </table>
          </div>
        </section>

        <section className="rounded-2xl bg-white p-4 shadow-sm">
          <h2 className="mb-3 font-bold">学年別の年間売上</h2>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[480px] text-sm tabular-nums">
              <thead>
                <tr className="border-b text-xs text-gray-500">
                  <th className="py-1 text-left font-medium">学年</th>
                  <th className="py-1 text-right font-medium">開始月</th>
                  <th className="py-1 text-right font-medium">12ヶ月目</th>
                  <th className="py-1 text-right font-medium">年間売上</th>
                  <th className="py-1 text-right font-medium">構成比</th>
                </tr>
              </thead>
              <tbody>
                {GRADES.map((g, i) => (
                  <tr key={g} className="border-b border-gray-100">
                    <td className="py-1">{g}</td>
                    <td className="py-1 text-right">{first.students[i]}</td>
                    <td className="py-1 text-right">{last.students[i]}</td>
                    <td className="py-1 text-right">{yen(base.byGrade[i])}</td>
                    <td className="py-1 text-right">
                      {base.total > 0 ? pct((base.byGrade[i] / base.total) * 100) : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-2 text-xs text-gray-500">
            学年は請求した月の学年で集計しています(新学年に上がった生徒は新しい学年に計上)。
          </p>
        </section>

        <div className="flex flex-col items-start gap-2">
          <button
            onClick={() => {
              if (confirm("料金マスターと在籍計画をすべて初期値に戻しますか?")) resetSettings();
            }}
            className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
          >
            初期値に戻す
          </button>
          <p className="text-xs text-gray-400">
            入力内容はこのブラウザ内に自動保存されます。初期値の料金・在籍数は仮の数字なので、自塾の実数に置き換えてください。
          </p>
        </div>
      </div>
    </main>
  );
}

function Stat({ label, value, sub, warn }: { label: string; value: string; sub?: string; warn?: boolean }) {
  return (
    <div className="rounded-2xl bg-white p-3 shadow-sm">
      <p className="text-xs text-gray-500">{label}</p>
      <p className={`mt-1 text-lg font-bold tabular-nums ${warn ? "text-red-600" : "text-gray-900"}`}>{value}</p>
      {sub && <p className="text-xs tabular-nums text-gray-500">{sub}</p>}
    </div>
  );
}

function Card({ title, note, children }: { title: string; note?: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl bg-white p-4 shadow-sm">
      <h2 className="font-bold">{title}</h2>
      {note && <p className="mt-1 text-xs text-gray-500">{note}</p>}
      <div className="mt-3">{children}</div>
    </section>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1 text-xs text-gray-600">
      {label}
      {children}
    </label>
  );
}

function MonthField({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <Field label={label}>
      <select
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full rounded-md border border-gray-300 bg-white px-2 py-1 text-gray-900"
      >
        {MONTHS.map((m) => (
          <option key={m} value={m}>
            {m}月
          </option>
        ))}
      </select>
    </Field>
  );
}
