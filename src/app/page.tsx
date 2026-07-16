import Link from "next/link";

export default function Home() {
  return (
    <main className="flex-1 flex flex-col items-center justify-center gap-8 px-6 py-16 text-center">
      <div>
        <p className="text-sm font-semibold tracking-wide text-blue-600 uppercase">
          中学英単語アプリ
        </p>
        <h1 className="mt-2 text-4xl font-bold text-gray-900">
          Eitan<span className="text-blue-600">go</span>
        </h1>
        <p className="mt-3 text-gray-600">
          中学1・2年の基本英単語をカードとクイズで覚えよう
        </p>
      </div>

      <div className="flex w-full max-w-sm flex-col gap-4">
        <Link
          href="/flashcards"
          className="rounded-2xl bg-blue-600 px-6 py-5 text-lg font-semibold text-white shadow-md transition hover:bg-blue-700 active:scale-[0.98]"
        >
          📇 フラッシュカードで覚える
        </Link>
        <Link
          href="/quiz"
          className="rounded-2xl bg-amber-500 px-6 py-5 text-lg font-semibold text-white shadow-md transition hover:bg-amber-600 active:scale-[0.98]"
        >
          📝 クイズに挑戦する
        </Link>
      </div>
    </main>
  );
}
