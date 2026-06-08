/**
 * Sample Markdown bundled with the app, identical to docs/example.md in
 * the parent repo. Loaded by the "Load sample" toolbar button so visitors
 * can see the full pipeline in action with one click.
 */
export const SAMPLE_MARKDOWN = `# Architecture Overview

A sample document to exercise every formatting path in the Markdown →
Confluence pipeline: headings, lists, tables, code blocks, blockquotes,
inline formatting, links, and **Mermaid diagrams**.

If this page renders cleanly in Confluence, the pipeline works end-to-end.

---

## 1. Goals

We want a publishing flow that is:

- **Idempotent** — re-running updates the page instead of duplicating it.
- **Format-preserving** — what you see in the \`.md\` is what you get on
  the Confluence page.
- **Diagram-aware** — Mermaid blocks become real diagrams, not raw text.
- **CI-friendly** — no GUI steps, deterministic output.

### 1.1 Non-goals

1. Two-way sync (Confluence → Markdown).
2. Real-time collaboration on the source \`.md\`.
3. Custom Confluence apps or marketplace plugins.

---

## 2. System Architecture

The high-level shape:

\`\`\`mermaid
graph TD
    A[Author writes doc.md] -->|git push| B[CI Runner]
    B --> C{Has Mermaid?}
    C -->|yes| D[mmdc renders PNG]
    C -->|no| E[pandoc: MD → HTML]
    D --> E
    E --> F[Wrap code blocks<br/>as Confluence macros]
    F --> G[Confluence REST API]
    G --> H[(Confluence Page)]
\`\`\`

### 2.1 Request flow

\`\`\`mermaid
sequenceDiagram
    participant U as User
    participant API as API Gateway
    participant SVC as Order Service
    participant DB as Database
    participant Q as Queue

    U->>API: POST /orders
    API->>SVC: forward request
    SVC->>DB: INSERT order
    DB-->>SVC: order_id
    SVC->>Q: enqueue fulfillment job
    Q-->>SVC: ack
    SVC-->>API: 201 Created
    API-->>U: { "id": "ord_123" }
\`\`\`

### 2.2 State machine

\`\`\`mermaid
stateDiagram-v2
    [*] --> Draft
    Draft --> Submitted: submit()
    Submitted --> Approved: approve()
    Submitted --> Rejected: reject()
    Approved --> Published: publish()
    Rejected --> Draft: revise()
    Published --> [*]
\`\`\`

---

## 3. Configuration

All settings can be overridden via environment variables.

| Setting       | Env var          | Default | Description                          |
| ------------- | ---------------- | ------- | ------------------------------------ |
| \`timeout\`     | \`APP_TIMEOUT\`    | \`30s\`   | HTTP request timeout                 |
| \`retries\`     | \`APP_RETRIES\`    | \`3\`     | Retry attempts on transient failure  |
| \`cache_ttl\`   | \`APP_CACHE_TTL\`  | \`5m\`    | In-memory cache time-to-live         |
| \`log_level\`   | \`APP_LOG_LEVEL\`  | \`info\`  | One of \`debug\`, \`info\`, \`warn\`, \`error\` |
| \`max_workers\` | \`APP_WORKERS\`    | \`8\`     | Worker pool size                     |

> **Note**
> The defaults are tuned for staging. Production overrides live in
> \`infra/prod/values.yaml\`.

---

## 4. Code Samples

### 4.1 Python — a tiny client

\`\`\`python
from dataclasses import dataclass
from typing import Iterable

import httpx


@dataclass
class Order:
    id: str
    total_cents: int
    currency: str = "USD"


class OrderClient:
    """Thin wrapper around the Order Service HTTP API."""

    def __init__(self, base_url: str, token: str) -> None:
        self._client = httpx.Client(
            base_url=base_url,
            headers={"Authorization": f"Bearer {token}"},
            timeout=30,
        )

    def list_recent(self, limit: int = 20) -> Iterable[Order]:
        r = self._client.get("/orders", params={"limit": limit})
        r.raise_for_status()
        for row in r.json()["data"]:
            yield Order(
                id=row["id"],
                total_cents=row["total_cents"],
                currency=row.get("currency", "USD"),
            )
\`\`\`

### 4.2 Bash — deploy script

\`\`\`bash
#!/usr/bin/env bash
set -euo pipefail

ENV="\${1:?usage: deploy.sh <env> <tag>}"
TAG="\${2:?missing image tag}"

echo "→ deploying \${TAG} to \${ENV}"
kubectl --context "\${ENV}" set image \\
    deployment/order-service \\
    api="ghcr.io/acme/order-service:\${TAG}"

kubectl --context "\${ENV}" rollout status deployment/order-service \\
    --timeout=180s
\`\`\`

### 4.3 SQL — useful query

\`\`\`sql
SELECT
    date_trunc('day', created_at) AS day,
    count(*)                      AS orders,
    sum(total_cents) / 100.0      AS revenue_usd
FROM orders
WHERE created_at >= now() - interval '30 days'
  AND status = 'paid'
GROUP BY 1
ORDER BY 1 DESC;
\`\`\`

### 4.4 JSON — sample payload

\`\`\`json
{
  "id": "ord_01HXYZ",
  "customer": { "id": "cus_42", "email": "alex@example.com" },
  "items": [
    { "sku": "SKU-001", "qty": 2, "price_cents": 1299 },
    { "sku": "SKU-007", "qty": 1, "price_cents":  499 }
  ],
  "total_cents": 3097,
  "currency": "USD"
}
\`\`\`

---

## 5. Inline formatting cheat-sheet

This paragraph mixes **bold**, *italic*, ***bold-italic***, \`inline code\`,
~~strikethrough~~, and a [link to the docs](https://example.com/docs).

Keyboard hint: press <kbd>Cmd</kbd> + <kbd>K</kbd> to open the command
palette.

A short math-y bit: \`O(n log n)\` is the cost of sorting \`n\` items.

---

## 6. Lists

### Unordered, nested

- Pipeline stage one — **extract**
  - Find \`\` \`\`\`mermaid \`\` blocks
  - Hash their contents (\`sha256\` → first 10 chars)
  - Reuse PNGs whose hash already exists
- Pipeline stage two — **transform**
  - Run \`pandoc -f gfm -t html\`
  - Rewrite \`<img src>\` for Confluence
  - Wrap \`<pre><code>\` as code macros
- Pipeline stage three — **load**
  - Create or update the page
  - Attach all referenced images

### Ordered

1. Author edits \`docs/architecture.md\`.
2. Commit lands on \`main\`.
3. GitHub Actions runs \`python publish.py\`.
4. Page appears (or updates) in Confluence within ~30 seconds.

### Task list

- [x] Render Mermaid as PNG
- [x] Convert code fences to Confluence macros
- [ ] Add SVG output option
- [ ] Multi-file directory walker

---

## 7. Blockquotes

> "Plain text is the most durable file format I have ever used."
> — every long-suffering documentarian

Nested:

> Top-level point.
>
> > A more specific clarification, indented one level deeper.

---

## 8. Horizontal rule

Use \`---\` between major sections, like the one below.

---

## 9. Troubleshooting

| Symptom                              | Likely cause                          | Fix                                          |
| ------------------------------------ | ------------------------------------- | -------------------------------------------- |
| \`mmdc: command not found\`            | Mermaid CLI not installed             | \`npm install -g @mermaid-js/mermaid-cli\`     |
| \`pandoc: command not found\`          | Pandoc not installed                  | \`brew install pandoc\`                        |
| \`401 Unauthorized\` from Confluence   | Wrong token, or used password         | Generate an **API token**, not your password |
| \`404 Not Found\` on \`create_page\`     | Wrong \`CONFLUENCE_SPACE\` key          | Use the short space *key*, not the name      |
| Page updates but diagrams are stale  | Old PNGs cached locally               | \`rm -rf .build/\` and re-run                  |

---

## 10. Next steps

- Run \`python build.py docs/example.md --open\` and paste into Confluence.
- Or run \`python publish.py docs/example.md\` to publish via the API.
- If both work on this file, your real docs will, too.

*Last updated: 2026-06-08.*
`;
