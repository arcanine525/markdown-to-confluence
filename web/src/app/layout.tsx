import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Markdown → Confluence — browser-only converter",
  description:
    "Convert Markdown (with Mermaid diagrams) into a copy-paste-ready Confluence page. Runs entirely in your browser — nothing is uploaded.",
  // Intentionally no analytics, no third-party fonts, no trackers.
  robots: { index: true, follow: true },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="font-sans antialiased">{children}</body>
    </html>
  );
}
