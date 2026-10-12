import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "授業料・年間売上シミュレーター",
  description: "学年別の料金表と生徒数から、塾の年間売上を月別に予測するアプリ",
};

export default function ForecastLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return children;
}
