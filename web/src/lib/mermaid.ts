/**
 * In-browser Mermaid renderer.
 *
 * Replaces the `mmdc` subprocess used by the Python CLI
 * (converter.py:render_mermaid_blocks). The npm `mermaid` package
 * produces SVG directly — no PNG conversion, no Node, no disk.
 *
 * Caching mirrors the content-hash filename trick in converter.py:42:
 * SHA-256 of the source, first 10 hex chars → cache key. Re-rendering
 * the same diagram is free. Cache lives only for the page session;
 * a reload starts fresh (consistent with the "no data kept" promise).
 */

const cache = new Map<string, string>();

let mermaidPromise: Promise<typeof import("mermaid").default> | null = null;

async function getMermaid() {
  if (!mermaidPromise) {
    // Dynamic import — keeps the initial bundle small. Mermaid itself
    // is ~400KB gzipped and only matters once the user has at least one
    // diagram to render.
    mermaidPromise = import("mermaid").then((m) => {
      m.default.initialize({
        startOnLoad: false,
        theme: "default",
        // `strict` disables HTML in labels and blocks <script> tags in
        // the diagram source. Important: the source is user-supplied.
        securityLevel: "strict",
        fontFamily:
          '-apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif',
      });
      return m.default;
    });
  }
  return mermaidPromise;
}

export async function hashSource(source: string): Promise<string> {
  const bytes = new TextEncoder().encode(source);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")
    .slice(0, 10);
}

export interface RenderedDiagram {
  hash: string;
  svg: string | null;
  error: string | null;
}

/**
 * Render a Mermaid source string to SVG. Errors are returned, not
 * thrown — one bad diagram should not blank the preview.
 */
export async function renderMermaid(source: string): Promise<RenderedDiagram> {
  const hash = await hashSource(source);
  const cached = cache.get(hash);
  if (cached !== undefined) {
    return { hash, svg: cached, error: null };
  }

  try {
    const mermaid = await getMermaid();
    // Mermaid needs a unique element id per render call.
    const id = `m-${hash}-${Math.floor(performance.now())}`;
    const { svg } = await mermaid.render(id, source);
    cache.set(hash, svg);
    return { hash, svg, error: null };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { hash, svg: null, error: message };
  }
}

export function clearMermaidCache() {
  cache.clear();
}
