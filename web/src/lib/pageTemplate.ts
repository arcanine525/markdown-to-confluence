/**
 * Standalone HTML wrapper for the converted Markdown.
 *
 * Ported verbatim from build.py PAGE_TEMPLATE (lines 30-92 of the CLI's
 * build.py). The styling is what makes a copy-paste from a browser land
 * cleanly in the Confluence editor: matching brand palette, banner that
 * carries instructions to the human, code block padding the editor
 * respects, print rule that hides the banner when exported as PDF.
 *
 * DO NOT redesign without testing the resulting paste in Confluence.
 */
export interface RenderPageInput {
  title: string;
  body: string;
}

export function renderPage({ title, body }: RenderPageInput): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8"/>
<title>${escapeHtml(title)}</title>
<style>
  body {
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif;
    max-width: 880px;
    margin: 2rem auto;
    padding: 0 1rem;
    color: #172b4d;
    line-height: 1.6;
  }
  h1, h2, h3, h4 { color: #091e42; }
  code {
    background: #f4f5f7;
    padding: 1px 4px;
    border-radius: 3px;
    font-family: "SF Mono", Menlo, Consolas, monospace;
    font-size: 0.9em;
  }
  pre {
    background: #f4f5f7;
    padding: 12px 16px;
    border-radius: 4px;
    overflow-x: auto;
  }
  pre code { background: none; padding: 0; }
  table { border-collapse: collapse; margin: 1em 0; }
  th, td { border: 1px solid #dfe1e6; padding: 6px 12px; text-align: left; }
  th { background: #f4f5f7; }
  blockquote {
    border-left: 4px solid #dfe1e6;
    margin: 1em 0;
    padding: 0.4em 1em;
    color: #5e6c84;
  }
  img { max-width: 100%; height: auto; }
  .copy-banner {
    background: #deebff;
    border: 1px solid #4c9aff;
    border-radius: 4px;
    padding: 12px 16px;
    margin-bottom: 2rem;
    font-size: 0.9em;
  }
  .copy-banner b { color: #0747a6; }
  .mermaid-error {
    background: #ffebe6;
    border: 1px solid #ff5630;
    color: #bf2600;
    border-radius: 4px;
    padding: 10px 14px;
    font-family: "SF Mono", Menlo, Consolas, monospace;
    font-size: 0.85em;
    white-space: pre-wrap;
  }
  @media print { .copy-banner { display: none; } }
</style>
</head>
<body>
<div class="copy-banner">
  <b>Copy-paste instructions:</b>
  Select all (⌘A / Ctrl+A) below this banner &rarr; copy (⌘C / Ctrl+C) &rarr;
  paste into the Confluence editor. Mermaid diagrams are embedded as images
  and will travel with the paste.
</div>
<hr/>
${body}
</body>
</html>
`;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
