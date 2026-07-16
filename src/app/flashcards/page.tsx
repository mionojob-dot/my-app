"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { categories, words } from "@/data/words";
import { shuffle } from "@/lib/shuffle";

export default function FlashcardsPage() {
  const [category, setCategory] = useState<string>("すべて");
  const [deck, setDeck] = useState(() => words);
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);

  const filtered = useMemo(
    () =>
      category === "すべて"
        ? words
        : words.filter((w) => w.category === category),
    [category]
  );

  const card = deck[index] ?? filtered[0];

  function selectCategory(next: string) {
    setCategory(next);
    const list = next === "すべて" ? words : words.filter((w) => w.category === next);
    setDeck(list);
    setIndex(0);
    setFlipped(false);
  }

  function goNext() {
    setFlipped(false);
    setIndex((i) => (i + 1) % deck.length);
  }

  function goPrev() {
    setFlipped(false);
    setIndex((i) => (i - 1 + deck.length) % deck.length);
  }

  function reshuffle() {
    setDeck(shuffle(filtered));
    setIndex(0);
    setFlipped(false);
  }

  return (
    <main className="flex-1 flex flex-col items-center px-6 py-10 gap-6">
      <div className="w-full max-w-md flex items-center justify-between">
        <Link href="/" className="text-sm font-medium text-blue-600">
          ← ホームに戻る
        </Link>
        <h1 className="text-lg font-bold">フラッシュカード</h1>
        <div className="w-16" />
      </div>

      <div className="w-full max-w-md flex flex-wrap gap-2 justify-center">
        <CategoryButton
          label="すべて"
          active={category === "すべて"}
          onClick={() => selectCategory("すべて")}
        />
        {categories.map((c) => (
          <CategoryButton
            key={c}
            label={c}
            active={category === c}
            onClick={() => selectCategory(c)}
          />
        ))}
      </div>

      {deck.length > 0 && card ? (
        <>
          <p className="text-sm text-gray-500">
            {index + 1} / {deck.length}
          </p>

          <button
            onClick={() => setFlipped((f) => !f)}
            className="w-full max-w-md aspect-[4/3] rounded-3xl bg-white shadow-lg border border-gray-200 flex items-center justify-center p-8 active:scale-[0.98] transition"
          >
            {flipped ? (
              <span className="text-3xl font-bold text-amber-600 text-center">
                {card.ja}
              </span>
            ) : (
              <span className="text-4xl font-bold text-gray-900 text-center">
                {card.en}
              </span>
            )}
          </button>
          <p className="text-xs text-gray-400">タップして意味を{flipped ? "隠す" : "見る"}</p>

          <div className="w-full max-w-md flex items-center gap-3">
            <button
              onClick={goPrev}
              className="flex-1 rounded-xl bg-gray-200 py-3 font-semibold text-gray-700 active:scale-[0.98]"
            >
              ← 前へ
            </button>
            <button
              onClick={reshuffle}
              className="rounded-xl bg-gray-100 px-4 py-3 font-semibold text-gray-600 active:scale-[0.98]"
              title="シャッフル"
            >
              🔀
            </button>
            <button
              onClick={goNext}
              className="flex-1 rounded-xl bg-blue-600 py-3 font-semibold text-white active:scale-[0.98]"
            >
              次へ →
            </button>
          </div>
        </>
      ) : (
        <p className="text-gray-500">このカテゴリーには単語がありません</p>
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
          ? "bg-blue-600 text-white"
          : "bg-white text-gray-600 border border-gray-300"
      }`}
    >
      {label}
    </button>
  );
}
