export const GRADES = ["小1", "小2", "小3", "小4", "小5", "小6", "中1", "中2", "中3"] as const;
const ELEM_6 = 5; // 小6 の index

export type GradeSetting = {
  monthlyFee: number; // 月謝
  materialFee: number; // 教材費(年額)
  springFee: number; // 春期講習費
  summerFee: number; // 夏期講習費
  winterFee: number; // 冬期講習費
  startCount: number; // 開始月時点の在籍数
  annualNew: number; // 年間の新規入塾見込み
};

export type ForecastSettings = {
  startMonth: string; // YYYY-MM
  target: number; // 年間売上目標
  enrollmentFee: number; // 入会金
  adminFee: number; // 月額の管理費・設備費(全学年共通)
  churnPct: number; // 月間退塾率(%)
  courseRatePct: number; // 講習受講率(%)
  progressionPct: number; // 進級時の継続率(%)
  elemToJuniorPct: number; // 小6→中1 の継続率(%)
  newYearMonth: number; // 新学年に切り替わる月
  springMonth: number;
  summerMonth: number;
  winterMonth: number;
  seasonality: number[]; // 新規入塾の月別配分。index 0 = 1月
  scenarioNewPct: number; // シナリオ幅: 新規入塾数の増減(%)
  scenarioChurnPt: number; // シナリオ幅: 退塾率の増減(pt)
  grades: GradeSetting[];
  actuals: Actuals;
};

/** 月×学年の実数入力。キーは "YYYY-MM"、値は学年順の配列(null = 未入力 → 予測で補完) */
export type MonthGradeValues = Record<string, (number | null)[]>;

export type Actuals = {
  students: MonthGradeValues; // 在籍数(その月の請求対象人数。新規を含む)
  newStudents: MonthGradeValues; // 新規入塾数
  course: MonthGradeValues; // 講習受講者数
};

export type ActualKind = keyof Actuals;

export const emptyActuals = (): Actuals => ({ students: {}, newStudents: {}, course: {} });

export const ymKey = (year: number, month: number) => `${year}-${String(month).padStart(2, "0")}`;

function grade(
  monthlyFee: number,
  materialFee: number,
  [springFee, summerFee, winterFee]: [number, number, number],
  startCount: number,
  annualNew: number
): GradeSetting {
  return { monthlyFee, materialFee, springFee, summerFee, winterFee, startCount, annualNew };
}

export function defaultSettings(): ForecastSettings {
  const now = new Date();
  return {
    startMonth: `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`,
    target: 35_000_000,
    enrollmentFee: 20_000,
    adminFee: 0,
    churnPct: 1.5,
    courseRatePct: 80,
    progressionPct: 95,
    elemToJuniorPct: 80,
    newYearMonth: 3,
    springMonth: 3,
    summerMonth: 7,
    winterMonth: 12,
    seasonality: [6, 12, 16, 10, 5, 6, 14, 4, 8, 7, 6, 6],
    scenarioNewPct: 20,
    scenarioChurnPt: 0.5,
    actuals: emptyActuals(),
    grades: [
      grade(12_000, 10_000, [5_000, 20_000, 10_000], 1, 2),
      grade(12_000, 10_000, [5_000, 20_000, 10_000], 2, 2),
      grade(14_000, 10_000, [5_000, 20_000, 10_000], 3, 3),
      grade(16_000, 10_000, [10_000, 40_000, 20_000], 5, 4),
      grade(18_000, 10_000, [10_000, 40_000, 20_000], 7, 5),
      grade(20_000, 10_000, [10_000, 40_000, 20_000], 8, 4),
      grade(33_000, 20_000, [20_000, 80_000, 50_000], 16, 8),
      grade(35_000, 20_000, [20_000, 80_000, 50_000], 17, 5),
      grade(38_000, 20_000, [30_000, 100_000, 80_000], 20, 3),
    ],
  };
}

export type MonthResult = {
  year: number;
  month: number;
  isCourseMonth: boolean;
  students: number[]; // 学年別の在籍数(その月の請求対象)
  newByGrade: number[];
  courseByGrade: number[]; // 学年別の講習受講者数
  newStudents: number;
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

export type Scenario = { newMult: number; churnAdd: number };

export function simulate(s: ForecastSettings, scenario: Scenario = { newMult: 1, churnAdd: 0 }): Forecast {
  const [startYear, startMonth] = s.startMonth.split("-").map(Number);
  const churn = Math.min(Math.max((s.churnPct + scenario.churnAdd) / 100, 0), 1);
  const courseRate = s.courseRatePct / 100;
  const weightSum = s.seasonality.reduce((a, b) => a + b, 0);

  let counts = s.grades.map((g) => g.startCount);
  const byGrade = s.grades.map(() => 0);
  const months: MonthResult[] = [];

  for (let i = 0; i < 12; i++) {
    const d = new Date(startYear, startMonth - 1 + i, 1);
    const year = d.getFullYear();
    const month = d.getMonth() + 1;
    const isNewYear = month === s.newYearMonth;

    // 新学年: 中3 は卒業、他は継続率を掛けて1学年上がる。
    // 開始月が切替月の場合は、入力済みの在籍数を切替後とみなす。
    if (isNewYear && i > 0) {
      counts = counts.map((_, g) => {
        if (g === 0) return 0;
        const rate = g - 1 === ELEM_6 ? s.elemToJuniorPct : s.progressionPct;
        return counts[g - 1] * (rate / 100);
      });
    }

    const weight = weightSum > 0 ? s.seasonality[month - 1] / weightSum : 0;
    const key = ymKey(year, month);
    const actStudents = s.actuals.students[key];
    const actNew = s.actuals.newStudents[key];
    const actCourse = s.actuals.course[key];

    // 実数が入力されていればそれを使い、なければ予測値で補完する
    const newByGrade = s.grades.map(
      (g, idx) => actNew?.[idx] ?? g.annualNew * scenario.newMult * weight
    );
    counts = counts.map((c, idx) => actStudents?.[idx] ?? c + newByGrade[idx]);

    const isCourseMonth = [s.springMonth, s.summerMonth, s.winterMonth].includes(month);
    const courseByGrade = counts.map((c, idx) =>
      isCourseMonth ? actCourse?.[idx] ?? c * courseRate : 0
    );

    let tuition = 0;
    let course = 0;
    let material = 0;
    let enrollment = 0;
    s.grades.forEach((g, idx) => {
      const c = counts[idx];
      const t = c * (g.monthlyFee + s.adminFee);
      let k = 0;
      if (month === s.springMonth) k += courseByGrade[idx] * g.springFee;
      if (month === s.summerMonth) k += courseByGrade[idx] * g.summerFee;
      if (month === s.winterMonth) k += courseByGrade[idx] * g.winterFee;
      // 教材費: 新学年の月に在籍者全員、それ以外は新規入塾者のみ
      const m = (isNewYear ? c : newByGrade[idx]) * g.materialFee;
      const e = newByGrade[idx] * s.enrollmentFee;
      tuition += t;
      course += k;
      material += m;
      enrollment += e;
      byGrade[idx] += t + k + m + e;
    });

    months.push({
      year,
      month,
      isCourseMonth,
      students: counts,
      newByGrade,
      courseByGrade,
      newStudents: newByGrade.reduce((a, b) => a + b, 0),
      tuition,
      course,
      enrollment,
      material,
      total: tuition + course + enrollment + material,
    });

    counts = counts.map((c) => c * (1 - churn));
  }

  return { months, total: months.reduce((a, m) => a + m.total, 0), byGrade };
}

export function scenarios(s: ForecastSettings) {
  const n = s.scenarioNewPct / 100;
  const c = s.scenarioChurnPt;
  return {
    low: simulate(s, { newMult: 1 - n, churnAdd: c }),
    base: simulate(s),
    high: simulate(s, { newMult: 1 + n, churnAdd: -c }),
  };
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

function load(): ForecastSettings {
  const base = defaultSettings();
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) return base;
  try {
    const saved = JSON.parse(raw) as Partial<ForecastSettings>;
    return {
      ...base,
      ...saved,
      actuals: { ...emptyActuals(), ...saved.actuals },
      seasonality: saved.seasonality?.length === 12 ? saved.seasonality : base.seasonality,
      grades:
        saved.grades?.length === GRADES.length
          ? saved.grades.map((g, i) => ({ ...base.grades[i], ...g }))
          : base.grades,
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
