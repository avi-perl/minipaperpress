# MiniPaperPress

Design and print your own foldable paper documents — business-card-sized cards,
ruled notes, and other small layouts — then tile as many copies as fit onto a
standard 8.5 × 11 letter sheet, complete with cut borders and fold-line arrows.

It's a Google Docs–style editor in the browser: a WYSIWYG front/back canvas,
draggable fold guides, page templates, and a print/share preview. Everything is
client-side; documents live in the browser's `localStorage`.

## Tech stack

- **React 18** + **TypeScript**
- **Vite** for dev server and build
- No backend — state persists to `localStorage`

## Getting started

```bash
npm install
npm run dev        # start the dev server (http://localhost:5173)
```

Other scripts:

```bash
npm run build      # type-check and produce a production build in dist/
npm run preview    # serve the production build locally
npm run typecheck  # type-check without emitting
```

## How it works

A document has a **front** and a **back**, each an editable HTML surface. You
pick a page size (or set a custom one in inches/mm) and add **fold lines** that
mark where the printed sheet folds. On the **Share & Print** screen, the app
computes how many copies of the card fit on a letter sheet — trying both
orientations and picking whichever fits more — and renders front and back sheets
ready to print duplex (the back is column-mirrored so a long-edge flip lines up).

## Project structure

```
index.html              Vite entry
src/
  main.tsx              React mount
  App.tsx               Routing (home / editor / print) + WYSIWYG actions
  styles.css            All styling (Google Docs–inspired)
  lib/
    types.ts            Domain types (Doc, Store, Template, Fold, Layout…)
    templates.ts        Page templates, unit conversion, sheet-layout math, starters
    storage.ts          localStorage-backed multi-document store
  components/
    icons.tsx           Inline stroke icons
    Editable.tsx        contentEditable WYSIWYG surface
    TopBar.tsx          Editor top bar (title, Share & Print)
    Toolbar.tsx         Formatting toolbar + color picker
    Canvas.tsx          Front/back pages with draggable fold guides
    Rail.tsx            Dimensions, fold list, template picker
    HomePage.tsx        Document gallery + starter templates
    PrintPreview.tsx    Sheet composition, print/PDF, share dialog

project/                Original design prototype (HTML/CSS/JSX) kept for reference
```

The `project/` directory holds the original Claude Design prototype this app was
built from. It isn't part of the build — it's kept as the visual source of truth.
See `project/HANDOFF.md` for the original handoff notes.
