export const GRADES = ["小1", "小2", "小3", "小4", "小5", "小6", "中1", "中2", "中3"] as const;
const LAST = GRADES.length - 1; // 中3

/** 料金マスター(学年別・1人あたり) */
export type GradeFee = {
  monthlyFee: number; // 月謝
  materialFee: number; // 教材費(年額)
  springFee: number; // 春期講習費
  summerFee: number; // 夏期講習費
  winterFee: number; // 冬期講習費
  startCount: number; // 開始月の月初在籍数
};

/** 月×学年の人数。キーは "YYYY-MM"、値は学年順の配列(キーなし = 0人) */
export type MonthGradeValues = Record<string, number[]>;

export type Moves = {
  joins: MonthGradeValues; // 入塾(その月から月謝発生)
  leaves: MonthGradeValues; // 退塾(その月末で退塾。その月までは月謝発生)
};

export type MoveKind = keyof Moves;

export type ForecastSettings = {
  startMonth: string; // YYYY-MM
  target: number; // 年間売上目標
  enrollmentFee: number; // 入会金
  adminFee: number; // 月額の管理費・設備費(全学年共通)
  courseRatePct: number; // 講習受講率(%)
  newYearMonth: number; // 新学年に切り替わる月
  springMonth: number;
  summerMonth: number;
  winterMonth: number;
  grades: GradeFee[];
  moves: Moves;
};

export const ymKey = (year: number, month: number) => `${year}-${String(month).padStart(2, "0")}`;

const zeros = () => GRADES.map(() => 0);

function fee(
  monthlyFee: number,
  materialFee: number,
  [springFee, summerFee, winterFee]: [number, number, number],
  startCount: number
): GradeFee {
  return { monthlyFee, materialFee, springFee, summerFee, winterFee, startCount };
}

export function defaultSettings(): ForecastSettings {
  const now = new Date();
  return {
    startMonth: ymKey(now.getFullYear(), now.getMonth() + 1),
    target: 35_000_000,
    enrollmentFee: 20_000,
    adminFee: 0,
    courseRatePct: 80,
    newYearMonth: 4,
    springMonth: 3,
    summerMonth: 7,
    winterMonth: 12,
    grades: [
      fee(12_000, 10_000, [5_000, 20_000, 10_000], 1),
      fee(12_000, 10_000, [5_000, 20_000, 10_000], 2),
      fee(14_000, 10_000, [5_000, 20_000, 10_000], 3),
      fee(16_000, 10_000, [10_000, 40_000, 20_000], 5),
      fee(18_000, 10_000, [10_000, 40_000, 20_000], 7),
      fee(20_000, 10_000, [10_000, 40_000, 20_000], 8),
      fee(33_000, 20_000, [20_000, 80_000, 50_000], 16),
      fee(35_000, 20_000, [20_000, 80_000, 50_000], 17),
      fee(38_000, 20_000, [30_000, 100_000, 80_000], 20),
    ],
    moves: { joins: {}, leaves: {} },
  };
}

export type MonthResult = {
  year: number;
  month: number;
  key: string;
  isCourseMonth: boolean;
  students: number[]; // 学年別の在籍数(その月に月謝を請求する人数)
  joins: number[];
  leaves: number[];
  graduates: number; // この月の進級で卒業した中3
  overLeave: boolean[]; // 退塾数が在籍数を超えている学年
  tuition: number; // 月謝+管理費
  course: number; // 講習費
  enrollment: number; // 入会金
  material: number; // 教材費
  total: number;
};

export type Forecast = {
  months: MonthResult[];
  total: number;
  byGrade: number[]; // 学年別の年間売上
};

export function simulate(s: ForecastSettings): Forecast {
  const [startYear, startMonth] = s.startMonth.split("-").map(Number);
  const courseRate = s.courseRatePct / 100;

  let counts = s.grades.map((g) => g.startCount);
  const byGrade = zeros();
  const months: MonthResult[] = [];

  for (let i = 0; i < 12; i++) {
    const d = new Date(startYear, startMonth - 1 + i, 1);
    const year = d.getFullYear();
    const month = d.getMonth() + 1;
    const key = ymKey(year, month);
    const isNewYear = month === s.newYearMonth;

    // 新学年: 全員1学年上がり、中3は卒業。
    // 開始月が切替月の場合は、入力済みの在籍数を切替後とみなす。
    let graduates = 0;
    if (isNewYear && i > 0) {
      graduates = counts[LAST];
      counts = counts.map((_, g) => (g === 0 ? 0 : counts[g - 1]));
    }

    const joins = s.moves.joins[key] ?? zeros();
    const leaves = s.moves.leaves[key] ?? zeros();
    const students = counts.map((c, g) => c + joins[g]);

    const isCourseMonth = [s.springMonth, s.summerMonth, s.winterMonth].includes(month);
    let tuition = 0;
    let course = 0;
    let material = 0;
    let enrollment = 0;
    s.grades.forEach((g, idx) => {
      const c = students[idx];
      const t = c * (g.monthlyFee + s.adminFee);
      let k = 0;
      if (month === s.springMonth) k += c * courseRate * g.springFee;
      if (month === s.summerMonth) k += c * courseRate * g.summerFee;
      if (month === s.winterMonth) k += c * courseRate * g.winterFee;
      // 教材費: 新学年の月は在籍者全員、それ以外の月は入塾者のみ
      const m = (isNewYear ? c : joins[idx]) * g.materialFee;
      const e = joins[idx] * s.enrollmentFee;
      tuition += t;
      course += k;
      material += m;
      enrollment += e;
      byGrade[idx] += t + k + m + e;
    });

    months.push({
      year,
      month,
      key,
      isCourseMonth,
      students,
      joins,
      leaves,
      graduates,
      overLeave: students.map((c, g) => leaves[g] > c),
      tuition,
      course,
      enrollment,
      material,
      total: tuition + course + enrollment + material,
    });

    // 退塾は月末。翌月以降の在籍数から外れる
    counts = students.map((c, g) => Math.max(c - leaves[g], 0));
  }

  return { months, total: months.reduce((a, m) => a + m.total, 0), byGrade };
}

export const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0);

export const yen = (n: number) => `¥${Math.round(n).toLocaleString("ja-JP")}`;

/** ¥12,345,678 → 1,235万円 */
export const man = (n: number) => `${Math.round(n / 10_000).toLocaleString("ja-JP")}万円`;

// ---- 設定の保存(localStorage) ----

const STORAGE_KEY = "forecast-settings";
const listeners = new Set<() => void>();
let cache: ForecastSettings | null = null;
let serverCache: ForecastSettings | null = null;

const cleanValues = (v: unknown): MonthGradeValues =>
  v && typeof v === "object"
    ? Object.fromEntries(
        Object.entries(v as Record<string, unknown>)
          .filter(([, row]) => Array.isArray(row) && row.length === GRADES.length)
          .map(([k, row]) => [k, (row as unknown[]).map((x) => (typeof x === "number" ? x : 0))])
      )
    : {};

function load(): ForecastSettings {
  const base = defaultSettings();
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) return base;
  try {
    const saved = JSON.parse(raw) as Partial<ForecastSettings>;
    return {
      ...base,
      ...saved,
      grades:
        saved.grades?.length === GRADES.length
          ? saved.grades.map((g, i) => ({ ...base.grades[i], ...g }))
          : base.grades,
      moves: { joins: cleanValues(saved.moves?.joins), leaves: cleanValues(saved.moves?.leaves) },
    };
  } catch {
    return base;
  }
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

export function getSettings(): ForecastSettings {
  return (cache ??= load());
}

export function getServerSettings(): ForecastSettings {
  return (serverCache ??= defaultSettings());
}

export function saveSettings(next: ForecastSettings) {
  cache = next;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  listeners.forEach((l) => l());
}

export function resetSettings() {
  window.localStorage.removeItem(STORAGE_KEY);
  cache = defaultSettings();
  listeners.forEach((l) => l());
}
