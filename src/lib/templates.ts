// Templates + unit conversion + sheet-layout math + premade starters.

import type { Layout, Starter, Template, Unit } from "./types";

// Templates carry their default fold lines too.
// Panel size is a standard ISO/IEC 7810 ID-1 credit card: 3.375 × 2.125 in.
export const TEMPLATES: Template[] = [
  {
    id: "cc2",
    name: "Two-panel fold",
    sub: "2 credit cards · 1 fold",
    w: 3.375,
    h: 4.25,
    folds: [{ axis: "h", position: 2.125 }],
  },
  {
    id: "cc3",
    name: "Three-panel fold",
    sub: "3 credit cards · 2 folds",
    w: 3.375,
    h: 6.375,
    folds: [
      { axis: "h", position: 2.125 },
      { axis: "h", position: 4.25 },
    ],
  },
  {
    id: "cc4",
    name: "Four-panel fold",
    sub: "4 credit cards · 3 folds",
    w: 3.375,
    h: 8.5,
    folds: [
      { axis: "h", position: 2.125 },
      { axis: "h", position: 4.25 },
      { axis: "h", position: 6.375 },
    ],
  },
];

export const DEFAULT_FRONT_HTML = "";
export const DEFAULT_BACK_HTML = "";

// inch <-> mm helpers
export const inToMm = (v: number) => v * 25.4;
export const mmToIn = (v: number) => v / 25.4;
export const round2 = (v: number) => Math.round(v * 100) / 100;

export function fmt(v: number, unit: Unit): string {
  if (unit === "mm") return `${Math.round(inToMm(v))} mm`;
  // pretty inch like 3.5″
  return `${round2(v)}″`;
}

// On an 8.5×11 sheet with the given margin (in) and gap (in), figure out how
// many copies fit in landscape OR portrait orientation; pick whichever is more.
export function computeLayout(
  pageW: number,
  pageH: number,
  sheetW = 8.5,
  sheetH = 11,
  margin = 0.25,
  gap = 0.15,
): Layout {
  const usableW = sheetW - margin * 2;
  const usableH = sheetH - margin * 2;
  function tryOrient(pw: number, ph: number) {
    if (pw <= 0 || ph <= 0) return { cols: 0, rows: 0, count: 0, rotated: false };
    const cols = Math.max(0, Math.floor((usableW + gap) / (pw + gap)));
    const rows = Math.max(0, Math.floor((usableH + gap) / (ph + gap)));
    return { cols, rows, count: cols * rows, rotated: false };
  }
  const A = tryOrient(pageW, pageH);
  A.rotated = false;
  const B = tryOrient(pageH, pageW);
  B.rotated = true;
  const best = B.count > A.count ? B : A;
  const eW = best.rotated ? pageH : pageW;
  const eH = best.rotated ? pageW : pageH;
  return {
    ...best,
    effectiveW: eW,
    effectiveH: eH,
    sheetW,
    sheetH,
    margin,
    gap,
    totalW: best.cols * eW + Math.max(0, best.cols - 1) * gap,
    totalH: best.rows * eH + Math.max(0, best.rows - 1) * gap,
    offsetX: (sheetW - (best.cols * eW + Math.max(0, best.cols - 1) * gap)) / 2,
    offsetY: (sheetH - (best.rows * eH + Math.max(0, best.rows - 1) * gap)) / 2,
  };
}

// Starters: premade documents you can spin up from the home page.
// 17 lines × ~0.5 in spacing fills the 8.5 in tall four-panel sheet without
// crowding — handwriting-comfortable on a 3.375 in wide pocket notepad.
const NOTES_LINE_COUNT = 17;
const NOTES_HTML = Array.from({ length: NOTES_LINE_COUNT })
  .map(() => `<hr style="border:none;border-top:1px solid #c8cacd;margin:24px 0"/>`)
  .join("");

export const STARTERS: Starter[] = [
  {
    id: "notes",
    name: "Pocket notepad",
    description: "Ruled notes · 3.375 × 8.5 in · 3 folds · double-sided",
    templateId: "cc4",
    frontHtml: NOTES_HTML,
    backHtml: NOTES_HTML,
  },
];

export function templateById(id: string): Template {
  return TEMPLATES.find((t) => t.id === id) || TEMPLATES[0];
}
