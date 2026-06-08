# markdown-to-confluence — web app

A browser-only converter: paste or upload Markdown (with Mermaid diagrams),
preview live, download a self-contained `.html` file, and paste it into the
Confluence editor.

**Nothing leaves your browser.** No backend, no auth, no analytics, no
database. The static export has no server runtime, so there's nothing to
deploy that could leak data.

## Quick start

```bash
cd web
npm install
npm run dev
# open http://localhost:3000
```

## Build & deploy

```bash
npm run build      # produces ./out/ — a fully static site
npm run preview    # serves ./out/ locally for a final smoke test
```

Drop `out/` on Vercel, Netlify, GitHub Pages, Cloudflare Pages, S3 — any
static host. There is no server-side code.

### Deploy to Firebase Hosting

The repo ships a ready-to-use `firebase.json` configured for static
Next.js output (immutable cache for `_next/static`, must-revalidate for
HTML, defense-in-depth security headers).

**One-time setup**

```bash
npm install -g firebase-tools
firebase login

# Create a project at https://console.firebase.google.com first, then:
firebase use --add
# pick the project, alias as "default"
```

This writes the project ID into `.firebaserc` (currently a placeholder).

**Deploy**

```bash
npm run deploy            # build + push to live channel
# → https://<project>.web.app
```

**Preview channel (recommended for review)**

```bash
npm run deploy:preview    # 7-day temporary URL, doesn't replace live
# → https://<project>--preview-xxxxxxxx.web.app
```

**Custom domain**

In the Firebase console → Hosting → Add custom domain. Firebase
provisions the cert automatically (Let's Encrypt).

**Automated deploy from GitHub**

Once `firebase init hosting` has been run locally, you can also run:

```bash
firebase init hosting:github
```

It generates `.github/workflows/firebase-hosting-merge.yml` (live deploy
on `main`) and `firebase-hosting-pull-request.yml` (preview channel per
PR), and creates the `FIREBASE_SERVICE_ACCOUNT_*` GitHub secret it
needs. No manual token handling.

## How it works

| Step | What runs | Where |
|---|---|---|
| 1. Extract ` ```mermaid ` blocks | regex (mirrors `converter.py:MERMAID_RE`) | browser |
| 2. Render each diagram → SVG | `mermaid` npm package, `securityLevel: "strict"` | browser |
| 3. Markdown → HTML | `marked` (GFM enabled) | browser |
| 4. Inline SVGs as `data:image/svg+xml;base64,…` | `TextEncoder` + `btoa` | browser |
| 5. Syntax-highlight code blocks | `highlight.js` | browser |
| 6. Wrap in Confluence-friendly CSS | `pageTemplate.ts` (ported from `build.py:PAGE_TEMPLATE`) | browser |

The result is a single `<html>` file with every diagram embedded as a
base64 image. When you copy-paste from a browser tab, the diagrams travel
with the clipboard.

## Project layout

```
web/
├── src/
│   ├── app/
│   │   ├── layout.tsx        # root layout, no third-party fonts/trackers
│   │   ├── page.tsx          # editor + preview, 200ms debounced convert
│   │   └── globals.css       # Tailwind base
│   ├── components/
│   │   ├── Editor.tsx        # <textarea> + drag-and-drop file upload
│   │   ├── Preview.tsx       # sandboxed iframe (no allow-scripts)
│   │   ├── Toolbar.tsx       # upload / sample / reset / download
│   │   └── PrivacyNotice.tsx # the headline trust signal
│   └── lib/
│       ├── convert.ts        # the pipeline
│       ├── mermaid.ts        # dynamic import + SHA-256 cache
│       ├── pageTemplate.ts   # CSS ported from build.py:30-92
│       └── sample.ts         # bundled copy of docs/example.md
├── next.config.mjs           # output: 'export'
└── package.json
```

## Verifying the privacy claim

1. Open DevTools → Network tab → enable "Preserve log".
2. Reload the page. You'll see the static assets load.
3. **Type, paste, edit Mermaid blocks, click Download.** No further
   requests should appear.

The Mermaid renderer is dynamically imported on first use — that's one
extra request to the bundled `mermaid` chunk on your origin, **not** to a
Mermaid server.

## Tested formatting features

The "Load sample" button populates the editor with `docs/example.md` from
the parent repo, which exercises:

- 3 Mermaid diagrams (flowchart, sequence, state machine)
- 4 code blocks (Python, Bash, SQL, JSON) — syntax-highlighted
- GFM tables, nested lists, task lists (`- [x]`)
- Blockquotes (incl. nested)
- Inline `code`, **bold**, *italic*, ~~strikethrough~~, `<kbd>` tags
- Horizontal rules, H1–H4 headings

If this sample round-trips into Confluence cleanly, your real docs will.

## Why not also publish directly to Confluence?

That mode exists as a CLI (`../publish.py`). It needs your Confluence API
token, which would mean either:

- holding it server-side here (defeats the no-data promise), or
- shipping it from the browser to Atlassian directly, which Atlassian
  Cloud's CORS policy doesn't permit.

For automated, idempotent publishing, use the Python CLI in CI. For one-off
pages and humans, this web app is the right tool.

## Future work

- CodeMirror 6 editor with Markdown syntax highlighting
- "Copy HTML to clipboard" button (alternative to file download)
- Mermaid theme picker (`default` / `dark` / `neutral`)
- Optional opt-in PWA install for offline use
