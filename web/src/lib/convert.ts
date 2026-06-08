/**
 * Browser port of build.py:main() — the full Markdown → standalone HTML
 * pipeline that produces a Confluence-paste-ready document.
 *
 * Pipeline order (mirrors converter.py + build.py):
 *   1. Extract ```mermaid blocks, swap each for a placeholder.
 *   2. Render each unique block to SVG (in-browser, cached by hash).
 *   3. Markdown → HTML via `marked` with GFM enabled.
 *   4. Substitute placeholders with <img src="data:image/svg+xml;base64,…">
 *      so the HTML is fully self-contained and survives the clipboard.
 *   5. Apply highlight.js to <pre><code class="language-x"> blocks.
 *   6. Wrap in the Confluence-friendly PAGE_TEMPLATE.
 */
import hljs from "highlight.js/lib/common";
import { marked } from "marked";

import { renderPage } from "./pageTemplate";
import { renderMermaid } from "./mermaid";

const MERMAID_RE = /```mermaid\n([\s\S]*?)\n```/g;

export interface ConvertResult {
  /** Full standalone HTML page — what the user downloads as paste.html. */
  html: string;
  /** Just the rendered body — what the live preview iframe shows. */
  bodyHtml: string;
  /** How many Mermaid diagrams were rendered (or attempted). */
  diagramCount: number;
  /** Per-diagram error messages, in source order. */
  diagramErrors: string[];
}

export async function convertMarkdown(
  md: string,
  title?: string,
): Promise<ConvertResult> {
  // ---- 1. Extract Mermaid blocks ----------------------------------
  const blocks: { token: string; source: string }[] = [];
  const mdWithPlaceholders = md.replace(MERMAID_RE, (_full, source: string) => {
    const token = `@@MERMAID_BLOCK_${blocks.length}@@`;
    blocks.push({ token, source });
    return token;
  });

  // ---- 2. Render Mermaid blocks to SVG (parallel, cached) ----------
  const rendered = await Promise.all(
    blocks.map(({ source }) => renderMermaid(source)),
  );

  // Build a map of placeholder → final HTML snippet (img or error box).
  const replacements = new Map<string, string>();
  const diagramErrors: string[] = [];
  blocks.forEach(({ token, source }, i) => {
    const { svg, error } = rendered[i];
    if (svg) {
      const dataUri = `data:image/svg+xml;base64,${encodeBase64(svg)}`;
      replacements.set(
        token,
        `<img alt="Mermaid diagram" src="${dataUri}"/>`,
      );
    } else {
      diagramErrors.push(error ?? "unknown error");
      const safe = escapeHtml(source);
      const errSafe = escapeHtml(error ?? "unknown error");
      replacements.set(
        token,
        `<div class="mermaid-error"><b>Mermaid render error:</b> ${errSafe}\n\n${safe}</div>`,
      );
    }
  });

  // ---- 3. Markdown → HTML -----------------------------------------
  marked.setOptions({ gfm: true, breaks: false });
  let bodyHtml = await marked.parse(mdWithPlaceholders);

  // ---- 4. Inline diagrams (replace placeholders) -------------------
  // `marked` typically wraps a placeholder line in <p>…</p>. Strip the
  // wrapping <p> so the resulting <img> sits at block level.
  for (const [token, snippet] of replacements) {
    bodyHtml = bodyHtml
      .replace(new RegExp(`<p>\\s*${escapeRegex(token)}\\s*</p>`, "g"), snippet)
      .replace(new RegExp(escapeRegex(token), "g"), snippet);
  }

  // ---- 5. Syntax highlighting -------------------------------------
  bodyHtml = highlightCodeBlocks(bodyHtml);

  // ---- 6. Wrap in page template -----------------------------------
  const finalTitle = title ?? guessTitle(md) ?? "Document";
  const html = renderPage({ title: finalTitle, body: bodyHtml });

  return {
    html,
    bodyHtml,
    diagramCount: blocks.length,
    diagramErrors,
  };
}

// ----------------------------------------------------------------
// Helpers
// ----------------------------------------------------------------

/** First "# Heading" in the doc, like build.py:_guess_title (lines 149-154). */
export function guessTitle(md: string): string | null {
  for (const raw of md.split("\n")) {
    const line = raw.trim();
    if (line.startsWith("# ")) return line.slice(2).trim();
  }
  return null;
}

function encodeBase64(s: string): string {
  // Safe UTF-8 → base64 (`btoa` alone breaks on non-Latin1 chars).
  const bytes = new TextEncoder().encode(s);
  let bin = "";
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin);
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/**
 * Walk <pre><code class="language-x">…</code></pre> blocks and apply
 * highlight.js. Done with a regex pass to avoid pulling in a full DOM
 * parser on the client. The shape we match is exactly what `marked`
 * emits for fenced code blocks.
 */
function highlightCodeBlocks(html: string): string {
  const re = /<pre><code class="language-([^"]+)">([\s\S]*?)<\/code><\/pre>/g;
  return html.replace(re, (_full, lang: string, code: string) => {
    const raw = unescapeHtml(code);
    let highlighted: string;
    try {
      highlighted = hljs.getLanguage(lang)
        ? hljs.highlight(raw, { language: lang, ignoreIllegals: true }).value
        : hljs.highlightAuto(raw).value;
    } catch {
      // Fall back to the original (still HTML-escaped) source.
      highlighted = code;
    }
    return `<pre><code class="hljs language-${lang}">${highlighted}</code></pre>`;
  });
}

function unescapeHtml(s: string): string {
  return s
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, "&");
}
