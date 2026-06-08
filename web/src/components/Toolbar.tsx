"use client";

import { useEffect, useRef, useState } from "react";

import { SAMPLE_MARKDOWN } from "@/lib/sample";

interface ToolbarProps {
  hasContent: boolean;
  html: string;
  filename: string;
  diagramCount: number;
  diagramErrorCount: number;
  onLoadMarkdown: (md: string) => void;
}

type CopyState = "idle" | "copied" | "error";

export function Toolbar({
  hasContent,
  html,
  filename,
  diagramCount,
  diagramErrorCount,
  onLoadMarkdown,
}: ToolbarProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [copyState, setCopyState] = useState<CopyState>("idle");

  // Reset the "Copied!" label after a short pause.
  useEffect(() => {
    if (copyState === "idle") return;
    const t = window.setTimeout(() => setCopyState("idle"), 1500);
    return () => window.clearTimeout(t);
  }, [copyState]);

  const handleFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") onLoadMarkdown(reader.result);
    };
    reader.readAsText(file);
  };

  const handleDownload = () => {
    const blob = new Blob([html], { type: "text/html;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  /**
   * Two-format clipboard write: the rich HTML body for paste targets
   * that accept formatted content (the Confluence editor), and a plain
   * text fallback for editors that only take text. Falls back to a
   * legacy `execCommand` path if the Async Clipboard API is missing.
   */
  const handleCopyHtml = async () => {
    try {
      if (
        typeof ClipboardItem !== "undefined" &&
        navigator.clipboard?.write
      ) {
        await navigator.clipboard.write([
          new ClipboardItem({
            "text/html": new Blob([html], { type: "text/html" }),
            "text/plain": new Blob([html], { type: "text/plain" }),
          }),
        ]);
      } else if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(html);
      } else {
        legacyCopy(html);
      }
      setCopyState("copied");
    } catch {
      setCopyState("error");
    }
  };

  const handleReset = () => {
    if (!hasContent || confirm("Discard the current document?")) {
      onLoadMarkdown("");
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      <button
        type="button"
        onClick={() => fileInputRef.current?.click()}
        className="rounded-md border border-confluence-border bg-white px-3 py-1.5 text-sm font-medium text-confluence-ink shadow-sm hover:bg-confluence-surface"
      >
        Upload .md
      </button>
      <input
        ref={fileInputRef}
        type="file"
        accept=".md,.markdown,.txt"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFile(file);
          e.target.value = "";
        }}
      />

      <button
        type="button"
        onClick={() => onLoadMarkdown(SAMPLE_MARKDOWN)}
        className="rounded-md border border-confluence-border bg-white px-3 py-1.5 text-sm font-medium text-confluence-ink shadow-sm hover:bg-confluence-surface"
      >
        Load sample
      </button>

      <button
        type="button"
        onClick={handleReset}
        disabled={!hasContent}
        className="rounded-md border border-confluence-border bg-white px-3 py-1.5 text-sm font-medium text-confluence-ink shadow-sm hover:bg-confluence-surface disabled:cursor-not-allowed disabled:opacity-50"
      >
        Reset
      </button>

      <div className="ml-auto flex flex-wrap items-center gap-3">
        {diagramCount > 0 && (
          <span className="text-xs text-confluence-muted">
            {diagramCount} diagram{diagramCount === 1 ? "" : "s"}
            {diagramErrorCount > 0 && (
              <span className="ml-1 text-red-600">
                ({diagramErrorCount} error
                {diagramErrorCount === 1 ? "" : "s"})
              </span>
            )}
          </span>
        )}
        <button
          type="button"
          onClick={handleCopyHtml}
          disabled={!hasContent}
          className={
            "rounded-md border px-3 py-1.5 text-sm font-medium shadow-sm transition-colors disabled:cursor-not-allowed disabled:opacity-50 " +
            (copyState === "copied"
              ? "border-green-500 bg-green-50 text-green-700"
              : copyState === "error"
                ? "border-red-500 bg-red-50 text-red-700"
                : "border-confluence-border bg-white text-confluence-ink hover:bg-confluence-surface")
          }
          aria-live="polite"
        >
          {copyState === "copied"
            ? "✓ Copied!"
            : copyState === "error"
              ? "Copy failed"
              : "Copy HTML"}
        </button>
        <button
          type="button"
          onClick={handleDownload}
          disabled={!hasContent}
          className="rounded-md bg-confluence-accent px-4 py-1.5 text-sm font-semibold text-white shadow-sm hover:bg-confluence-deep disabled:cursor-not-allowed disabled:opacity-50"
        >
          Download paste.html
        </button>
      </div>
    </div>
  );
}

/** Last-resort fallback for browsers without the Async Clipboard API. */
function legacyCopy(text: string) {
  const ta = document.createElement("textarea");
  ta.value = text;
  ta.style.position = "fixed";
  ta.style.opacity = "0";
  document.body.appendChild(ta);
  ta.select();
  try {
    document.execCommand("copy");
  } finally {
    document.body.removeChild(ta);
  }
}
