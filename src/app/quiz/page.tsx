"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { categories, words, type Word } from "@/data/words";
import { shuffle } from "@/lib/shuffle";
import { saveQuizResult } from "@/lib/progress";

const QUESTIONS_PER_ROUND = 10;

type Question = {
  word: Word;
  choices: string[];
};

function buildQuestions(pool: Word[], allWords: Word[]): Question[] {
  const questionWords = shuffle(pool).slice(
    0,
    Math.min(QUESTIONS_PER_ROUND, pool.length)
  );

  return questionWords.map((word) => {
    const distractors = shuffle(
      allWords.filter((w) => w.id !== word.id)
    ).slice(0, 3);
    const choices = shuffle([word.ja, ...distractors.map((d) => d.ja)]);
    return { word, choices };
  });
}

export default function QuizPage() {
  const [category, setCategory] = useState<string>("すべて");
  const [questions, setQuestions] = useState<Question[] | null>(null);
  const [qIndex, setQIndex] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [finished, setFinished] = useState(false);

  const pool = useMemo(
    () =>
      category === "すべて"
        ? words
        : words.filter((w) => w.category === category),
    [category]
  );

  function startQuiz() {
    setQuestions(buildQuestions(pool, words));
    setQIndex(0);
    setCorrectCount(0);
    setSelected(null);
    setFinished(false);
  }

  function chooseAnswer(choice: string) {
    if (selected || !questions) return;
    setSelected(choice);
    const isCorrect = choice === questions[qIndex].word.ja;
    if (isCorrect) setCorrectCount((c) => c + 1);
  }

  function nextQuestion() {
    if (!questions) return;
    if (qIndex + 1 >= questions.length) {
      saveQuizResult({
        category,
        correct: correctCount,
        total: questions.length,
        playedAt: new Date().toISOString(),
      });
      setFinished(true);
      return;
    }
    setQIndex((i) => i + 1);
    setSelected(null);
  }

  return (
    <main className="flex-1 flex flex-col items-center px-6 py-10 gap-6">
      <div className="w-full max-w-md flex items-center justify-between">
        <Link href="/" className="text-sm font-medium text-blue-600">
          ← ホームに戻る
        </Link>
        <h1 className="text-lg font-bold">クイズ</h1>
        <div className="w-16" />
      </div>

      {!questions && (
        <>
          <div className="w-full max-w-md flex flex-wrap gap-2 justify-center">
            <CategoryButton
              label="すべて"
              active={category === "すべて"}
              onClick={() => setCategory("すべて")}
            />
            {categories.map((c) => (
              <CategoryButton
                key={c}
                label={c}
                active={category === c}
                onClick={() => setCategory(c)}
              />
            ))}
          </div>
          <p className="text-sm text-gray-500">
            「{category}」から{Math.min(QUESTIONS_PER_ROUND, pool.length)}問出題します
          </p>
          <button
            onClick={startQuiz}
            className="w-full max-w-md rounded-2xl bg-amber-500 py-4 text-lg font-semibold text-white shadow-md active:scale-[0.98]"
          >
            クイズを始める
          </button>
        </>
      )}

      {questions && !finished && (
        <>
          <p className="text-sm text-gray-500">
            問題 {qIndex + 1} / {questions.length}
          </p>
          <div className="w-full max-w-md rounded-3xl bg-white shadow-lg border border-gray-200 p-8 flex items-center justify-center">
            <span className="text-3xl font-bold text-gray-900">
              {questions[qIndex].word.en}
            </span>
          </div>

          <div className="w-full max-w-md grid grid-cols-1 gap-3">
            {questions[qIndex].choices.map((choice) => {
              const isCorrectChoice = choice === questions[qIndex].word.ja;
              const isSelected = choice === selected;
              let style =
                "bg-white border border-gray-300 text-gray-800";
              if (selected) {
                if (isCorrectChoice) {
                  style = "bg-green-500 border-green-500 text-white";
                } else if (isSelected) {
                  style = "bg-red-500 border-red-500 text-white";
                } else {
                  style = "bg-white border-gray-200 text-gray-400";
                }
              }
              return (
                <button
                  key={choice}
                  onClick={() => chooseAnswer(choice)}
                  disabled={!!selected}
                  className={`rounded-xl px-4 py-4 text-lg font-medium transition active:scale-[0.98] ${style}`}
                >
                  {choice}
                </button>
              );
            })}
          </div>

          {selected && (
            <button
              onClick={nextQuestion}
              className="w-full max-w-md rounded-2xl bg-blue-600 py-4 text-lg font-semibold text-white shadow-md active:scale-[0.98]"
            >
              {qIndex + 1 >= questions.length ? "結果を見る" : "次の問題へ"}
            </button>
          )}
        </>
      )}

      {questions && finished && (
        <div className="w-full max-w-md flex flex-col items-center gap-6 text-center">
          <div className="rounded-3xl bg-white shadow-lg border border-gray-200 p-8 w-full">
            <p className="text-sm text-gray-500">結果</p>
            <p className="mt-2 text-4xl font-bold text-amber-600">
              {correctCount} / {questions.length}
            </p>
            <p className="mt-1 text-gray-600">
              正解率 {Math.round((correctCount / questions.length) * 100)}%
            </p>
          </div>
          <div className="w-full flex gap-3">
            <button
              onClick={startQuiz}
              className="flex-1 rounded-xl bg-amber-500 py-3 font-semibold text-white active:scale-[0.98]"
            >
              もう一度
            </button>
            <button
              onClick={() => setQuestions(null)}
              className="flex-1 rounded-xl bg-gray-200 py-3 font-semibold text-gray-700 active:scale-[0.98]"
            >
              カテゴリー選択に戻る
            </button>
          </div>
        </div>
      )}
    </main>
  );
}

function CategoryButton({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`rounded-full px-4 py-1.5 text-sm font-medium transition ${
        active
          ? "bg-amber-500 text-white"
          : "bg-white text-gray-600 border border-gray-300"
      }`}
    >
      {label}
    </button>
  );
}
