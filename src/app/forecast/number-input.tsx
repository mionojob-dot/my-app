"use client";

import { useState } from "react";

const format = (n: number) => n.toLocaleString("ja-JP", { maximumFractionDigits: 2 });

/** カンマ入り・全角数字も受け付ける数値入力。入力途中の文字列を保持する。 */
export function NumberInput({
  value,
  onChange,
  className = "",
  ...rest
}: {
  value: number;
  onChange: (value: number) => void;
  className?: string;
  "aria-label"?: string;
}) {
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
        const raw = e.target.value;
        setText(raw);
        const normalized = raw
          .replace(/[０-９．]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0xfee0))
          .replace(/[,，\s]/g, "");
        const n = normalized === "" ? 0 : Number(normalized);
        if (Number.isFinite(n) && n >= 0) {
          setSynced(n);
          onChange(n);
        }
      }}
      onBlur={() => setText(format(value))}
      className={`w-full rounded-md border border-gray-300 bg-white px-2 py-1 text-right tabular-nums text-gray-900 ${className}`}
      {...rest}
    />
  );
}
