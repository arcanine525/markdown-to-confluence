"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import { Editor } from "@/components/Editor";
import { Preview } from "@/components/Preview";
import { PrivacyNotice } from "@/components/PrivacyNotice";
import { Toolbar } from "@/components/Toolbar";
import { convertMarkdown, guessTitle } from "@/lib/convert";

const DEBOUNCE_MS = 200;
const EMPTY_PREVIEW = "<p style='color:#5e6c84;font-family:sans-serif;padding:1rem'>Preview will appear here once you load some Markdown.</p>";

export default function HomePage() {
  const [markdown, setMarkdown] = useState("");
  const [html, setHtml] = useState("");
  const [previewHtml, setPreviewHtml] = useState(EMPTY_PREVIEW);
  const [diagramCount, setDiagramCount] = useState(0);
  const [diagramErrorCount, setDiagramErrorCount] = useState(0);
  const [isConverting, setIsConverting] = useState(false);

  // Track the last conversion we kicked off — if the user types again
  // before it finishes, we drop the stale result.
  const runIdRef = useRef(0);

  useEffect(() => {
    if (!markdown.trim()) {
      setHtml("");
      setPreviewHtml(EMPTY_PREVIEW);
      setDiagramCount(0);
      setDiagramErrorCount(0);
      return;
    }
    const myRun = ++runIdRef.current;
    setIsConverting(true);
    const timer = window.setTimeout(async () => {
      try {
        const result = await convertMarkdown(markdown);
        if (runIdRef.current !== myRun) return;
        setHtml(result.html);
        setPreviewHtml(result.html);
        setDiagramCount(result.diagramCount);
        setDiagramErrorCount(result.diagramErrors.length);
      } finally {
        if (runIdRef.current === myRun) setIsConverting(false);
      }
    }, DEBOUNCE_MS);
    return () => window.clearTimeout(timer);
  }, [markdown]);

  const filename = useMemo(() => {
    const title = guessTitle(markdown) ?? "paste";
    return slugify(title) + ".html";
  }, [markdown]);

  return (
    <main className="flex h-screen flex-col bg-confluence-surface">
      <header className="border-b border-confluence-border bg-white px-4 py-3">
        <div className="flex flex-wrap items-center gap-3">
          <div>
            <h1 className="text-base font-semibold text-confluence-deep">
              Markdown → Confluence
            </h1>
            <p className="text-xs text-confluence-muted">
              Paste, preview, download a copy-paste-ready HTML file. Mermaid
              diagrams included.
            </p>
          </div>
          <div className="ml-auto">
            <PrivacyNotice />
          </div>
        </div>
        <div className="mt-3">
          <Toolbar
            hasContent={markdown.length > 0}
            html={html}
            filename={filename}
            diagramCount={diagramCount}
            diagramErrorCount={diagramErrorCount}
            onLoadMarkdown={setMarkdown}
          />
        </div>
      </header>

      <section className="grid flex-1 grid-cols-1 gap-3 overflow-hidden p-3 md:grid-cols-2">
        <Editor value={markdown} onChange={setMarkdown} />
        <Preview html={previewHtml} isConverting={isConverting} />
      </section>
    </main>
  );
}

function slugify(s: string): string {
  return (
    s
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 60) || "paste"
  );
}
