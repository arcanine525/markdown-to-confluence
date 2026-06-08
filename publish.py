#!/usr/bin/env python3
"""
Publish a Markdown file (with Mermaid) directly to Confluence via the REST
API. Mermaid blocks are rendered to PNG and uploaded as page attachments.

Usage:
    python publish.py path/to/doc.md "Page Title"
    python publish.py path/to/doc.md             # title inferred from H1
"""
from __future__ import annotations

import argparse
import os
import sys
from pathlib import Path

from atlassian import Confluence
from dotenv import load_dotenv

from converter import (
    md_to_html,
    render_mermaid_blocks,
    rewrite_images_for_confluence,
    wrap_code_blocks_for_confluence,
)


def _require_env(name: str) -> str:
    val = os.environ.get(name)
    if not val:
        sys.exit(f"Missing env var: {name} (see .env.example)")
    return val


def main() -> None:
    load_dotenv()
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("md_file", help="Path to the Markdown file")
    parser.add_argument(
        "title",
        nargs="?",
        default=None,
        help="Confluence page title (defaults to first H1 in file)",
    )
    args = parser.parse_args()

    md_path = Path(args.md_file)
    if not md_path.exists():
        sys.exit(f"File not found: {md_path}")

    url = _require_env("CONFLUENCE_URL")
    user = _require_env("CONFLUENCE_USER")
    token = _require_env("CONFLUENCE_TOKEN")
    space = _require_env("CONFLUENCE_SPACE")
    parent_id = os.environ.get("CONFLUENCE_PARENT_ID") or None

    md_text = md_path.read_text()
    title = args.title or _guess_title(md_text) or md_path.stem

    out_dir = Path(".build") / md_path.stem
    out_dir.mkdir(parents=True, exist_ok=True)

    # 1. Render Mermaid blocks -> PNGs
    md_with_imgs, images = render_mermaid_blocks(md_text, out_dir, fmt="png")

    # 2. Markdown -> HTML (pandoc GFM)
    html = md_to_html(md_with_imgs)

    # 3. Convert code fences -> Confluence code macro
    html = wrap_code_blocks_for_confluence(html)

    # 4. Rewrite <img> -> Confluence attachment refs
    html = rewrite_images_for_confluence(html, {img.name for img in images})

    # 5. Push to Confluence
    confluence = Confluence(
        url=url, username=user, password=token, cloud=True,
    )

    existing = confluence.get_page_by_title(space=space, title=title)
    if existing:
        page_id = existing["id"]
        confluence.update_page(
            page_id=page_id,
            title=title,
            body=html,
            representation="storage",
        )
        print(f"✓ Updated page: {title} (id={page_id})")
    else:
        result = confluence.create_page(
            space=space,
            title=title,
            body=html,
            parent_id=parent_id,
            representation="storage",
        )
        page_id = result["id"]
        print(f"✓ Created page: {title} (id={page_id})")

    for img in images:
        confluence.attach_file(
            filename=str(img),
            name=img.name,
            content_type="image/png",
            page_id=page_id,
        )
        print(f"  ↳ attached {img.name}")

    page_url = f"{url.rstrip('/')}/spaces/{space}/pages/{page_id}"
    print(f"\nView: {page_url}")


def _guess_title(md: str) -> str | None:
    for line in md.splitlines():
        line = line.strip()
        if line.startswith("# "):
            return line[2:].strip()
    return None


if __name__ == "__main__":
    main()
