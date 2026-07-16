const STORAGE_KEY = "eitango-quiz-results";

export type QuizResult = {
  category: string;
  correct: number;
  total: number;
  playedAt: string;
};

export function saveQuizResult(result: QuizResult) {
  if (typeof window === "undefined") return;
  const results = getQuizResults();
  results.push(result);
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(results.slice(-50)));
}

export function getQuizResults(): QuizResult[] {
  if (typeof window === "undefined") return [];
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) return [];
  try {
    return JSON.parse(raw) as QuizResult[];
  } catch {
    return [];
  }
}

export function getBestScore(category: string): number {
  const results = getQuizResults().filter((r) => r.category === category);
  if (results.length === 0) return 0;
  return Math.max(...results.map((r) => (r.correct / r.total) * 100));
}
