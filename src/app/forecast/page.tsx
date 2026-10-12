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
  scenarios,
  subscribe,
  sum,
  yen,
  type ForecastSettings,
  type GradeSetting,
} from "@/lib/forecast";
import { NumberInput } from "./number-input";
import { RevenueChart } from "./revenue-chart";

const MONTHS = Array.from({ length: 12 }, (_, i) => i + 1);

const GRADE_COLUMNS: { key: keyof GradeSetting; label: string }[] = [
  { key: "monthlyFee", label: "月謝" },
  { key: "materialFee", label: "教材費(年)" },
  { key: "springFee", label: "春期講習" },
  { key: "summerFee", label: "夏期講習" },
  { key: "winterFee", label: "冬期講習" },
  { key: "startCount", label: "現在の在籍数" },
  { key: "annualNew", label: "年間新規見込み" },
];

const pct = (n: number) => `${n.toFixed(1)}%`;
const people = (n: number) => `${n.toFixed(1)}人`;

export default function ForecastPage() {
  const settings = useSyncExternalStore(subscribe, getSettings, getServerSettings);
  const { low, base, high } = useMemo(() => scenarios(settings), [settings]);

  const update = (patch: Partial<ForecastSettings>) => saveSettings({ ...settings, ...patch });
  const updateGrade = (index: number, patch: Partial<GradeSetting>) =>
    update({ grades: settings.grades.map((g, i) => (i === index ? { ...g, ...patch } : g)) });

  const months = base.months;
  const first = months[0];
  const last = months[months.length - 1];
  const avgStudents = sum(months.map((m) => sum(m.students))) / months.length;
  const achievement = settings.target > 0 ? (base.total / settings.target) * 100 : null;
  const gap = base.total - settings.target;
  const seasonSum = sum(settings.seasonality);

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
            label="在籍数(開始 → 12ヶ月目)"
            value={`${sum(first.students).toFixed(0)} → ${sum(last.students).toFixed(0)}人`}
            sub={`平均 ${people(avgStudents)}`}
          />
          <Stat
            label="生徒1人あたり年間売上"
            value={avgStudents > 0 ? man(base.total / avgStudents) : "—"}
            sub="年間売上 ÷ 平均在籍数"
          />
        </section>

        <section className="rounded-2xl bg-white p-4 shadow-sm">
          <h2 className="font-bold">シナリオ別の年間売上</h2>
          <p className="mt-1 text-xs text-gray-500">
            新規入塾 ±{settings.scenarioNewPct}%、月間退塾率 ±{settings.scenarioChurnPt}pt で幅を見ています
          </p>
          <div className="mt-3 grid grid-cols-3 gap-2 text-center">
            {[
              { label: "悲観", f: low },
              { label: "標準", f: base },
              { label: "楽観", f: high },
            ].map(({ label, f }) => (
              <div
                key={label}
                className={`rounded-xl p-3 ${label === "標準" ? "bg-blue-50 ring-1 ring-blue-200" : "bg-gray-50"}`}
              >
                <p className="text-xs text-gray-500">{label}</p>
                <p className="mt-1 font-bold tabular-nums sm:text-lg">{man(f.total)}</p>
                {settings.target > 0 && (
                  <p className="text-xs tabular-nums text-gray-500">目標比 {pct((f.total / settings.target) * 100)}</p>
                )}
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-2xl bg-white p-4 shadow-sm">
          <h2 className="mb-3 font-bold">月別の売上予測</h2>
          <RevenueChart months={months} monthlyTarget={settings.target / 12} />
        </section>

        <section className="rounded-2xl bg-white p-4 shadow-sm">
          <h2 className="mb-3 font-bold">月別明細</h2>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-sm tabular-nums">
              <thead>
                <tr className="border-b text-xs text-gray-500">
                  <th className="py-1 text-left font-medium">月</th>
                  <th className="py-1 text-right font-medium">在籍数</th>
                  <th className="py-1 text-right font-medium">新規</th>
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
                  <tr key={`${m.year}-${m.month}`} className="border-b border-gray-100">
                    <td className="py-1 whitespace-nowrap">
                      {m.year}/{m.month}
                    </td>
                    <td className="py-1 text-right">{sum(m.students).toFixed(1)}</td>
                    <td className="py-1 text-right">{m.newStudents.toFixed(1)}</td>
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
                  <td className="pt-2 text-right">{sum(months.map((m) => m.newStudents)).toFixed(1)}</td>
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
                  <th className="py-1 text-right font-medium">開始時</th>
                  <th className="py-1 text-right font-medium">12ヶ月目</th>
                  <th className="py-1 text-right font-medium">年間売上</th>
                  <th className="py-1 text-right font-medium">構成比</th>
                </tr>
              </thead>
              <tbody>
                {GRADES.map((g, i) => (
                  <tr key={g} className="border-b border-gray-100">
                    <td className="py-1">{g}</td>
                    <td className="py-1 text-right">{first.students[i].toFixed(1)}</td>
                    <td className="py-1 text-right">{last.students[i].toFixed(1)}</td>
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

        <h2 className="mt-4 text-lg font-bold">入力・前提条件</h2>

        <Card title="基本設定">
          <div className="grid gap-3 sm:grid-cols-4">
            <Field label="予測の開始月">
              <input
                type="month"
                value={settings.startMonth}
                onChange={(e) => e.target.value && update({ startMonth: e.target.value })}
                className="w-full rounded-md border border-gray-300 px-2 py-1"
              />
            </Field>
            <Field label="年間売上目標(円)">
              <NumberInput value={settings.target} onChange={(v) => update({ target: v })} />
            </Field>
            <Field label="入会金(円)">
              <NumberInput value={settings.enrollmentFee} onChange={(v) => update({ enrollmentFee: v })} />
            </Field>
            <Field label="管理費・設備費(円/月)">
              <NumberInput value={settings.adminFee} onChange={(v) => update({ adminFee: v })} />
            </Field>
          </div>
        </Card>

        <Card title="料金表と生徒数(学年別)" note="金額は1人あたり・税込で入力。在籍数は開始月の月初時点。">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-sm">
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
                          className={c.key === "startCount" || c.key === "annualNew" ? "bg-blue-50" : ""}
                        />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="text-xs text-gray-500">
                  <td className="pt-2" colSpan={6} />
                  <td className="px-1 pt-2 text-right">合計 {sum(settings.grades.map((g) => g.startCount))}人</td>
                  <td className="px-1 pt-2 text-right">合計 {sum(settings.grades.map((g) => g.annualNew))}人</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </Card>

        <Card title="前提条件">
          <div className="grid gap-3 sm:grid-cols-4">
            <Field label="月間退塾率(%)">
              <NumberInput value={settings.churnPct} onChange={(v) => update({ churnPct: v })} />
            </Field>
            <Field label="講習の受講率(%)">
              <NumberInput value={settings.courseRatePct} onChange={(v) => update({ courseRatePct: v })} />
            </Field>
            <Field label="進級時の継続率(%)">
              <NumberInput value={settings.progressionPct} onChange={(v) => update({ progressionPct: v })} />
            </Field>
            <Field label="小6→中1の継続率(%)">
              <NumberInput value={settings.elemToJuniorPct} onChange={(v) => update({ elemToJuniorPct: v })} />
            </Field>
            <MonthField label="新学年に切り替わる月" value={settings.newYearMonth} onChange={(v) => update({ newYearMonth: v })} />
            <MonthField label="春期講習の請求月" value={settings.springMonth} onChange={(v) => update({ springMonth: v })} />
            <MonthField label="夏期講習の請求月" value={settings.summerMonth} onChange={(v) => update({ summerMonth: v })} />
            <MonthField label="冬期講習の請求月" value={settings.winterMonth} onChange={(v) => update({ winterMonth: v })} />
          </div>
          <ul className="mt-3 list-disc pl-5 text-xs text-gray-500">
            <li>新学年の月に全員が1学年上がり、中3は前月末で卒業します。教材費(年)はその月に在籍者全員へ請求します。</li>
            <li>新規入塾者は入塾月から月謝・入会金・教材費が発生します。退塾は月末に退塾率の割合で発生します。</li>
          </ul>
        </Card>

        <Card
          title="新規入塾の月別配分"
          note={`学年別の「年間新規見込み」をこの比率で各月に割り振ります(合計 ${seasonSum})。`}
        >
          <div className="grid grid-cols-4 gap-2 sm:grid-cols-6 lg:grid-cols-12">
            {MONTHS.map((m) => (
              <Field key={m} label={`${m}月`}>
                <NumberInput
                  value={settings.seasonality[m - 1]}
                  onChange={(v) =>
                    update({ seasonality: settings.seasonality.map((x, i) => (i === m - 1 ? v : x)) })
                  }
                />
                <span className="text-right text-[10px] text-gray-400">
                  {seasonSum > 0 ? pct((settings.seasonality[m - 1] / seasonSum) * 100) : "—"}
                </span>
              </Field>
            ))}
          </div>
        </Card>

        <Card title="シナリオの幅">
          <div className="grid gap-3 sm:grid-cols-4">
            <Field label="新規入塾の増減(±%)">
              <NumberInput value={settings.scenarioNewPct} onChange={(v) => update({ scenarioNewPct: v })} />
            </Field>
            <Field label="月間退塾率の増減(±pt)">
              <NumberInput value={settings.scenarioChurnPt} onChange={(v) => update({ scenarioChurnPt: v })} />
            </Field>
          </div>
        </Card>

        <div className="flex flex-col items-start gap-2">
          <button
            onClick={() => {
              if (confirm("入力内容をすべて初期値に戻しますか?")) resetSettings();
            }}
            className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
          >
            初期値に戻す
          </button>
          <p className="text-xs text-gray-400">
            入力内容はこのブラウザ内に自動保存されます。初期値の料金・生徒数は仮の数字なので、自塾の実数に置き換えてください。
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
      <h3 className="font-bold">{title}</h3>
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
