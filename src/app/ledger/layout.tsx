import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "収支計算",
  description: "塾の収入・支出を記録して月次の利益と利益率を計算するアプリ",
};

export default function LedgerLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return children;
}
