import type { Config } from "tailwindcss";

// Tailwind config — Confluence brand palette mirrored from
// build.py:30-92 so the app chrome and the rendered preview feel
// like one continuous surface.
const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        confluence: {
          ink: "#172b4d",
          deep: "#091e42",
          muted: "#5e6c84",
          border: "#dfe1e6",
          surface: "#f4f5f7",
          accent: "#0747a6",
          accentBg: "#deebff",
          accentLine: "#4c9aff",
        },
      },
      fontFamily: {
        sans: [
          "-apple-system",
          "BlinkMacSystemFont",
          '"Segoe UI"',
          "Helvetica",
          "Arial",
          "sans-serif",
        ],
        mono: ['"SF Mono"', "Menlo", "Consolas", "monospace"],
      },
    },
  },
  plugins: [],
};

export default config;
