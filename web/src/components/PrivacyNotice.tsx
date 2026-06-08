/**
 * Small banner that makes the privacy story visible and verifiable.
 * The DevTools Network panel will back it up — see web/README.md.
 */
export function PrivacyNotice() {
  return (
    <div className="flex items-center gap-2 rounded-md border border-confluence-accentLine bg-confluence-accentBg px-3 py-1.5 text-sm text-confluence-accent">
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="h-4 w-4 shrink-0"
        aria-hidden="true"
      >
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      </svg>
      <span>
        Runs entirely in your browser — your Markdown is never uploaded.
      </span>
    </div>
  );
}
