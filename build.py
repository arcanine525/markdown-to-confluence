#!/usr/bin/env python3
"""
Build a self-contained HTML file from Markdown that you can open in a
browser and copy-paste directly into the Confluence editor.

Mermaid diagrams are pre-rendered to PNG and inlined as base64 data URIs,
so the clipboard carries the actual images -- no broken refs after paste.

Usage:
    python build.py path/to/doc.md
    python build.py path/to/doc.md --open      # also open in browser

Output:
    .build/<stem>/paste.html
"""
from __future__ import annotations

import argparse
import subprocess
import sys
from pathlib import Path

from converter import (
    inline_images_as_data_uris,
    md_to_html,
    render_mermaid_blocks,
)


PAGE_TEMPLATE = """<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8"/>
<title>{title}</title>
<style>
  body {{
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif;
    max-width: 880px;
    margin: 2rem auto;
    padding: 0 1rem;
    color: #172b4d;
    line-height: 1.6;
  }}
  h1, h2, h3, h4 {{ color: #091e42; }}
  code {{
    background: #f4f5f7;
    padding: 1px 4px;
    border-radius: 3px;
    font-family: "SF Mono", Menlo, Consolas, monospace;
    font-size: 0.9em;
  }}
  pre {{
    background: #f4f5f7;
    padding: 12px 16px;
    border-radius: 4px;
    overflow-x: auto;
  }}
  pre code {{ background: none; padding: 0; }}
  table {{ border-collapse: collapse; margin: 1em 0; }}
  th, td {{ border: 1px solid #dfe1e6; padding: 6px 12px; text-align: left; }}
  th {{ background: #f4f5f7; }}
  blockquote {{
    border-left: 4px solid #dfe1e6;
    margin: 1em 0;
    padding: 0.4em 1em;
    color: #5e6c84;
  }}
  img {{ max-width: 100%; height: auto; }}
  .copy-banner {{
    background: #deebff;
    border: 1px solid #4c9aff;
    border-radius: 4px;
    padding: 12px 16px;
    margin-bottom: 2rem;
    font-size: 0.9em;
  }}
  .copy-banner b {{ color: #0747a6; }}
  @media print {{ .copy-banner {{ display: none; }} }}
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
{body}
</body>
</html>
"""


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("md_file", help="Path to the Markdown file")
    parser.add_argument(
        "--title",
        help="Page title (defaults to filename or first H1)",
    )
    parser.add_argument(
        "--open",
        action="store_true",
        help="Open the resulting HTML in your default browser",
    )
    args = parser.parse_args()

    md_path = Path(args.md_file)
    if not md_path.exists():
        sys.exit(f"File not found: {md_path}")

    md_text = md_path.read_text()
    title = args.title or _guess_title(md_text) or md_path.stem

    out_dir = Path(".build") / md_path.stem
    out_dir.mkdir(parents=True, exist_ok=True)

    # 1. Render Mermaid blocks -> PNGs in out_dir, rewrite md
    md_with_imgs, images = render_mermaid_blocks(md_text, out_dir, fmt="png")

    # 2. Markdown -> HTML
    html_body = md_to_html(md_with_imgs)

    # 3. Inline images as data URIs so copy-paste carries them
    html_body = inline_images_as_data_uris(
        html_body,
        image_dir=out_dir,
        known_filenames=[img.name for img in images],
    )

    # 4. Wrap in a styled page
    page = PAGE_TEMPLATE.format(title=title, body=html_body)
    out_file = out_dir / "paste.html"
    out_file.write_text(page)

    print(f"✓ Wrote {out_file}")
    print(f"  Mermaid diagrams rendered: {len(images)}")
    print()
    print("Next steps:")
    print(f"  1. Open: {out_file}")
    print("  2. Select all below the banner, copy")
    print("  3. Paste into the Confluence editor")

    if args.open:
        _open_in_browser(out_file)


def _guess_title(md: str) -> str | None:
    for line in md.splitlines():
        line = line.strip()
        if line.startswith("# "):
            return line[2:].strip()
    return None


def _open_in_browser(path: Path) -> None:
    if sys.platform == "darwin":
        subprocess.run(["open", str(path)])
    elif sys.platform.startswith("linux"):
        subprocess.run(["xdg-open", str(path)])
    elif sys.platform == "win32":
        subprocess.run(["cmd", "/c", "start", "", str(path)], shell=False)


if __name__ == "__main__":
    main()
