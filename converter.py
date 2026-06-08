"""
Shared conversion logic: Markdown (with Mermaid) -> HTML.

Used by both:
  - build.py    -> standalone copy-paste HTML
  - publish.py  -> Confluence storage format, posted via API
"""
from __future__ import annotations

import base64
import hashlib
import os
import re
import subprocess
import tempfile
from pathlib import Path
from typing import Iterable

MERMAID_RE = re.compile(r"```mermaid\n(.*?)\n```", re.DOTALL)


# --------------------------------------------------------------------------
# Mermaid rendering
# --------------------------------------------------------------------------
def render_mermaid_blocks(
    md_text: str,
    out_dir: Path,
    fmt: str = "png",
) -> tuple[str, list[Path]]:
    """
    Find every ```mermaid block, render to <fmt> via mmdc, and replace the
    block with a Markdown image reference.

    Returns: (rewritten_md, [paths_to_rendered_images])

    Filenames are content-hashed so re-running with unchanged source skips
    re-rendering -- safe for CI and idempotent publishing.
    """
    out_dir.mkdir(parents=True, exist_ok=True)
    images: list[Path] = []

    def replace(match: re.Match) -> str:
        source = match.group(1)
        digest = hashlib.sha256(source.encode()).hexdigest()[:10]
        filename = f"mermaid-{digest}.{fmt}"
        img_path = out_dir / filename

        if not img_path.exists():
            with tempfile.NamedTemporaryFile(
                "w", suffix=".mmd", delete=False
            ) as tf:
                tf.write(source)
                mmd_path = tf.name
            try:
                subprocess.run(
                    [
                        "mmdc",
                        "-i", mmd_path,
                        "-o", str(img_path),
                        "-b", "white",
                        "-s", "2",
                    ],
                    check=True,
                    capture_output=True,
                )
            except FileNotFoundError:
                raise SystemExit(
                    "mmdc not found. Install with:\n"
                    "  npm install -g @mermaid-js/mermaid-cli"
                )
            except subprocess.CalledProcessError as e:
                raise SystemExit(
                    f"Mermaid render failed:\n{e.stderr.decode()}"
                )
            finally:
                os.unlink(mmd_path)

        images.append(img_path)
        return f"![Mermaid diagram]({filename})"

    new_md = MERMAID_RE.sub(replace, md_text)
    return new_md, images


# --------------------------------------------------------------------------
# Markdown -> HTML
# --------------------------------------------------------------------------
def md_to_html(md_text: str) -> str:
    """Convert Markdown to HTML using pandoc (GFM flavor)."""
    try:
        result = subprocess.run(
            ["pandoc", "-f", "gfm", "-t", "html"],
            input=md_text,
            capture_output=True,
            text=True,
            check=True,
        )
    except FileNotFoundError:
        raise SystemExit(
            "pandoc not found. Install with:\n"
            "  brew install pandoc   (macOS)\n"
            "  apt-get install pandoc (Linux)"
        )
    return result.stdout


# --------------------------------------------------------------------------
# Confluence storage format helpers
# --------------------------------------------------------------------------
CODE_BLOCK_RE = re.compile(
    r'<pre><code(?: class="([^"]*)")?>(.*?)</code></pre>',
    re.DOTALL,
)


def _unescape_html(s: str) -> str:
    return (
        s.replace("&lt;", "<")
         .replace("&gt;", ">")
         .replace("&quot;", '"')
         .replace("&#39;", "'")
         .replace("&amp;", "&")
    )


def wrap_code_blocks_for_confluence(html: str) -> str:
    """Convert <pre><code class="language-x"> to Confluence code macros."""
    def replace(match: re.Match) -> str:
        cls = match.group(1) or ""
        m = re.search(r"language-(\w+)", cls)
        lang = m.group(1) if m else "none"
        code = _unescape_html(match.group(2))
        return (
            '<ac:structured-macro ac:name="code">'
            f'<ac:parameter ac:name="language">{lang}</ac:parameter>'
            f'<ac:plain-text-body><![CDATA[{code}]]></ac:plain-text-body>'
            '</ac:structured-macro>'
        )

    return CODE_BLOCK_RE.sub(replace, html)


def rewrite_images_for_confluence(html: str, attachment_names: set[str]) -> str:
    """Replace <img src="x.png"> with Confluence attachment image macros."""
    def replace(match: re.Match) -> str:
        src = match.group(1)
        filename = Path(src).name
        if filename in attachment_names:
            return (
                '<ac:image>'
                f'<ri:attachment ri:filename="{filename}"/>'
                '</ac:image>'
            )
        return match.group(0)

    return re.sub(r'<img[^>]+src="([^"]+)"[^>]*/?>', replace, html)


# --------------------------------------------------------------------------
# Copy-paste HTML helpers (inline images as data URIs)
# --------------------------------------------------------------------------
def inline_images_as_data_uris(
    html: str,
    image_dir: Path,
    known_filenames: Iterable[str],
) -> str:
    """
    Replace <img src="x.png"> references with base64 data URIs so the HTML
    is fully self-contained -- safe to copy-paste from a browser without
    Confluence losing the images.
    """
    known = set(known_filenames)

    def replace(match: re.Match) -> str:
        src = match.group(1)
        filename = Path(src).name
        if filename not in known:
            return match.group(0)
        path = image_dir / filename
        if not path.exists():
            return match.group(0)
        mime = "image/svg+xml" if path.suffix == ".svg" else "image/png"
        data = base64.b64encode(path.read_bytes()).decode("ascii")
        return f'<img alt="diagram" src="data:{mime};base64,{data}"/>'

    return re.sub(r'<img[^>]+src="([^"]+)"[^>]*/?>', replace, html)
