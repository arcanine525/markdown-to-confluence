# markdown-to-confluence

> Publish Markdown files to Confluence pages with formatting preserved — including Mermaid diagrams. Copy-paste mode for one-off pages, REST API mode for repeatable CI publishing.

Convert Markdown files (including Mermaid diagrams) into Confluence pages,
preserving formatting. Two output modes:

| Mode | Script | What you get |
|---|---|---|
| **Copy-paste** | `build.py` | A self-contained HTML file you open in a browser and paste into the Confluence editor. Diagrams are embedded as base64 images so they survive the clipboard. |
| **API publish** | `publish.py` | Pushes the page directly to Confluence Cloud via REST API. Idempotent: re-running updates the existing page. |

## Prerequisites

```bash
# Python deps
pip install -r requirements.txt

# Mermaid CLI (renders ```mermaid blocks to PNG)
npm install -g @mermaid-js/mermaid-cli

# Pandoc (Markdown -> HTML)
brew install pandoc           # macOS
# or: sudo apt-get install pandoc
```

## Quick start: Copy-paste mode

```bash
python build.py docs/example.md --open
```

This:

1. Renders every `` ```mermaid `` block to a PNG under `.build/example/`
2. Converts the Markdown to HTML with pandoc
3. Inlines the PNGs as base64 data URIs
4. Writes `.build/example/paste.html` and opens it in your browser

In the browser: **select all below the banner → copy → paste into Confluence.**
The diagrams come along as embedded images — no broken refs.

## Quick start: API publish mode

1. Copy `.env.example` to `.env` and fill in your Confluence credentials.
   Generate a token at: <https://id.atlassian.com/manage-profile/security/api-tokens>
2. Run:

```bash
python publish.py docs/example.md
# or specify a title:
python publish.py docs/example.md "Architecture Overview"
```

This creates the page (or updates it if a page with the same title exists in
the space), uploads Mermaid PNGs as attachments, and prints the page URL.

## What's preserved

| Markdown feature | Result |
|---|---|
| Headings, bold, italic, links | ✅ Native |
| Tables | ✅ Native |
| Bullet & numbered lists (nested) | ✅ Native |
| Code blocks with language tag | ✅ Confluence code macro (API mode) / styled `<pre>` (paste mode) |
| **Mermaid diagrams** | ✅ Rendered to PNG, embedded/attached |
| Inline code | ✅ Native |
| Blockquotes | ✅ Native |
| Local image refs | ✅ Inlined (paste mode) / attached (API mode) |

## Project layout

```
.
├── converter.py        # Shared MD -> HTML logic
├── build.py            # Copy-paste HTML generator
├── publish.py          # Direct Confluence API publisher
├── requirements.txt
├── .env.example
├── docs/
│   └── example.md      # Sample doc with Mermaid + code + table
└── .build/             # Generated output (gitignored)
```

## Tips

- **Mermaid filenames are content-hashed**, so re-running on unchanged
  diagrams skips re-rendering. Safe in CI.
- **Same title = update**, in API mode. Idempotent.
- **For higher-fidelity diagrams**, switch the format to SVG in
  `converter.py:render_mermaid_blocks` (change `fmt="png"` to `fmt="svg"`).
- **Front-matter, admonitions, and multi-file trees** are easy extensions —
  see comments in `converter.py`.

## Troubleshooting

| Error | Fix |
|---|---|
| `mmdc not found` | `npm install -g @mermaid-js/mermaid-cli` |
| `pandoc not found` | `brew install pandoc` |
| Confluence 401 | Use an API token (not your password) as `CONFLUENCE_TOKEN` |
| Confluence 404 | Double-check `CONFLUENCE_SPACE` key (the short code, not the name) |
| Paste loses code highlighting | Expected — re-wrap as `/code` macro in Confluence after paste |
