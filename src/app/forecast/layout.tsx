import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "授業料・年間売上シミュレーター",
  description: "学年別の料金マスターと月別の入塾・退塾計画から、塾の年間売上を計算するアプリ",
};

export default function ForecastLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return children;
}
