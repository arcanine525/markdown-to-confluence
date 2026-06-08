"use client";

interface PreviewProps {
  html: string;
  isConverting: boolean;
}

/**
 * Sandboxed iframe — we deliberately omit `allow-scripts` so user-supplied
 * Markdown can't execute JS even if it slips past the renderer. SVGs and
 * data URIs render fine without scripts.
 */
export function Preview({ html, isConverting }: PreviewProps) {
  return (
    <div className="relative h-full overflow-hidden rounded-md border border-confluence-border bg-white shadow-sm">
      {isConverting && (
        <div className="absolute right-3 top-3 z-10 rounded-full bg-confluence-accentBg px-2.5 py-0.5 text-xs font-medium text-confluence-accent">
          Converting…
        </div>
      )}
      <iframe
        title="Preview"
        srcDoc={html}
        sandbox="allow-same-origin"
        className="h-full w-full border-0"
      />
    </div>
  );
}
