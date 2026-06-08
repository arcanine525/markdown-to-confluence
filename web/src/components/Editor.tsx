"use client";

import dynamic from "next/dynamic";
import { useCallback, useState } from "react";

// Lazy-load the CodeMirror editor — it bundles every fenced-code language
// grammar (~220KB gzipped), which shouldn't block the initial paint. The
// fallback shows a plain textarea so the page is usable instantly and the
// switchover is invisible to typing users.
const CodeMirrorEditor = dynamic(
  () => import("./CodeMirrorEditor").then((m) => m.CodeMirrorEditor),
  {
    ssr: false,
    loading: () => (
      <div className="h-full w-full animate-pulse rounded-md border border-confluence-border bg-confluence-surface" />
    ),
  },
);

interface EditorProps {
  value: string;
  onChange: (next: string) => void;
}

export function Editor({ value, onChange }: EditorProps) {
  const [isDragging, setIsDragging] = useState(false);

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === "string") onChange(reader.result);
      };
      reader.readAsText(file);
    },
    [onChange],
  );

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setIsDragging(true);
      }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={handleDrop}
      className={
        "relative h-full overflow-hidden rounded-md border bg-white shadow-sm transition-colors " +
        (isDragging
          ? "border-confluence-accentLine ring-2 ring-confluence-accentLine"
          : "border-confluence-border focus-within:border-confluence-accentLine focus-within:ring-2 focus-within:ring-confluence-accentLine")
      }
    >
      <CodeMirrorEditor value={value} onChange={onChange} />
      {isDragging && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-confluence-accentBg/80 text-sm font-medium text-confluence-accent">
          Drop the file to load it
        </div>
      )}
    </div>
  );
}
