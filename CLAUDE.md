# MiniPaperPress

A client-side React SPA for designing and printing foldable paper documents
(business cards, ruled notes, etc.). Users edit a front/back canvas, drop fold
guides, and on **Share & Print** the app tiles as many copies as fit on an
8.5×11 letter sheet, with the back column-mirrored for long-edge duplex.

No backend. State lives in `localStorage`. Deploys to GitHub Pages.

## Stack

- **React 18** + **TypeScript** + **Vite 6**
- **TipTap** (ProseMirror) — rich-text editor; one instance per page side
- **Playwright** (Chromium headless only — `page.pdf()` constraint)

## Commands

```bash
npm run dev        # vite dev server on :5173
npm run build      # tsc -b && vite build → dist/
npm run preview    # serve dist/
npm run typecheck  # tsc -b --noEmit
npm test           # playwright test (boots its own dev server)
```

## Routing

Path-based via `src/lib/router.ts`:
- `/`        → `HomePage`
- `/e/<id>`  → editor for that doc
- `/#doc=<base64url>` → import shared doc, then `replace` to `/e/<id>`

Print preview is an **in-page sub-state** of the editor (`printOpen` in
`App.tsx`), not a separate route — back/forward closes it.

Vite `base` is `/minipaperpress/` (GitHub Pages sub-path). The router strips
`import.meta.env.BASE_URL` before matching and re-prepends it on navigate, so
the same code works on dev (`/`) and Pages.

GitHub Pages workflow copies `dist/index.html` → `dist/404.html` so hard
refreshes on sub-paths still boot the SPA.

## Data model (`src/lib/types.ts`)

- `Doc` — `{ id, title, templateId, pageW, pageH, unit, folds[], frontHtml, backHtml }`. Sizes always stored in **inches**; `unit` is display preference only.
- `Fold` — `{ id, axis: "h"|"v", position }`. `h` = horizontal cut (constant y from top in inches); `v` = vertical (constant x from left).
- `Store` — `{ documents: Record<id, Doc>, order: id[] }` persisted to `localStorage` under `minipaperpress-docs-v2`.
- `Template` — preset page sizes + default folds (`biz2`, `biz3` in `templates.ts`).
- `Layout` — output of `computeLayout()`: best of portrait vs landscape sheet packing.

## Key modules

- `src/App.tsx` — routing, store wiring, editor registration. The toolbar
  binds to whichever TipTap editor is focused (front or back); `registerEditor`
  defaults it to the front on mount and replaces stale refs after StrictMode
  remounts.
- `src/lib/storage.ts` — multi-doc store + migration from older keys
  (`paperpress-docs-v2`, `paperpress-project-v1`).
- `src/lib/templates.ts` — `computeLayout()` does the sheet-packing math (tries
  both orientations, picks whichever fits more copies).
- `src/lib/devDoc.ts` — sample document injected only when
  `import.meta.env.DEV`. Stripped before every `saveStore()` so it never
  reaches localStorage or production. Shows up fresh on the home page in dev.
- `src/lib/shareFile.ts` — share format is a tiny self-redirecting HTML file
  with the doc JSON encoded as base64url; opening it bounces to
  `<origin>/#doc=<payload>`.
- `src/lib/cardHtml.ts` — `normalizeCardHtml()`. **Important:** the editor
  strips insignificant whitespace between blocks; PrintPreview must run the
  same normalization or stray `\n`s show up as blank lines and spacing drifts
  from what the user saw in the editor.
- `src/components/Canvas.tsx` — front+back side-by-side, draggable fold
  guides, three zoom modes (`fit` / `fill` / `zoom`). Hijacks Ctrl+wheel and
  Ctrl±/0 so browser zoom scales only the document, not the chrome.
- `src/components/PrintPreview.tsx` — composes the sheet; back is mirrored
  based on `flipEdge` ("long" or "short" — matches the printer's duplex setting).
- `src/lib/editorExtensions.ts` + `src/lib/fontSize.ts` — TipTap setup. Custom
  `fontSize` mark since TipTap doesn't ship one.

## Conventions

- Sizes in storage are **always inches**; `unit` only affects display.
- Prefer `Edit` over `Write` on existing files.
- One concise rationale comment per non-obvious decision; no narration of what
  the code does. Existing files follow this style — match it.
- `project/` directory (if present locally) is the original design prototype
  and is **not part of the build** — visual reference only.

## Gotchas

- **TipTap editor lifecycle:** StrictMode in dev double-mounts editors. App
  guards against stale `Editor` refs in `registerEditor` — don't pass an editor
  up without checking `isDestroyed`.
- **Dev sample doc:** `withDevDoc`/`stripDevDoc` wrap every load/save. If you
  add new persistence sites, wrap them too or the sample will leak into prod
  storage (or vanish from dev).
- **Print whitespace parity:** if you touch print rendering, route the HTML
  through `normalizeCardHtml()` — the editor does the same.
- **`page.pdf()` is Chromium-headless only** — don't add other Playwright
  projects without conditionalizing PDF assertions.
