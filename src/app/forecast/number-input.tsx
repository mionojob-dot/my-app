"use client";

import { useState } from "react";

const format = (n: number | null) =>
  n === null ? "" : n.toLocaleString("ja-JP", { maximumFractionDigits: 2 });

/** カンマ・全角数字を受け付ける。空欄は null、数値にならない/負の値は undefined */
function parse(raw: string): number | null | undefined {
  const normalized = raw
    .replace(/[０-９．]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0xfee0))
    .replace(/[,，\s]/g, "");
  if (normalized === "") return null;
  const n = Number(normalized);
  return Number.isFinite(n) && n >= 0 ? n : undefined;
}

type InputProps = {
  className?: string;
  placeholder?: string;
  disabled?: boolean;
  "aria-label"?: string;
};

/** 入力途中の文字列を保持する数値入力。value が null のときは空欄。 */
function BaseInput({
  value,
  onChange,
  className = "",
  ...rest
}: InputProps & { value: number | null; onChange: (value: number | null) => void }) {
  const [text, setText] = useState(() => format(value));
  const [synced, setSynced] = useState(value);

  // 外部(リセット等)で値が変わったときだけ表示を同期する
  if (value !== synced) {
    setSynced(value);
    setText(format(value));
  }

  return (
    <input
      inputMode="decimal"
      value={text}
      onChange={(e) => {
        setText(e.target.value);
        const n = parse(e.target.value);
        if (n === undefined) return;
        setSynced(n);
        onChange(n);
      }}
      onBlur={() => setText(format(value))}
      className={`w-full rounded-md border border-gray-300 px-2 py-1 text-right tabular-nums text-gray-900 placeholder:text-gray-400 disabled:border-transparent disabled:bg-transparent ${className}`}
      {...rest}
    />
  );
}

export function NumberInput({
  value,
  onChange,
  className = "bg-white",
  ...rest
}: InputProps & { value: number; onChange: (value: number) => void }) {
  return <BaseInput value={value} onChange={(v) => onChange(v ?? 0)} className={className} {...rest} />;
}

/** 空欄を許す数値入力(空欄 = 未入力) */
export function OptionalNumberInput(
  props: InputProps & { value: number | null; onChange: (value: number | null) => void }
) {
  return <BaseInput {...props} />;
}
