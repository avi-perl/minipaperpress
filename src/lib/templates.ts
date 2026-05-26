// Templates + unit conversion + sheet-layout math + premade starters.

import type { Layout, Starter, Template, Unit } from "./types";

// Templates carry their default fold lines too.
export const TEMPLATES: Template[] = [
  {
    id: "biz2",
    name: "Two-card fold",
    sub: "2 business cards · 1 fold",
    w: 3.5,
    h: 4.0,
    folds: [{ axis: "h", position: 2.0 }],
  },
  {
    id: "biz3",
    name: "Three-card fold",
    sub: "3 business cards · 2 folds",
    w: 3.5,
    h: 6.0,
    folds: [
      { axis: "h", position: 2.0 },
      { axis: "h", position: 4.0 },
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
const NOTES_HTML = `
<h1 style="text-align:center;margin:0 0 6px;letter-spacing:0.02em">Notes</h1>
${Array.from({ length: 26 })
  .map(() => `<hr style="border:none;border-top:1px solid #c8cacd;margin:14px 0"/>`)
  .join("")}
`.trim();

export const STARTERS: Starter[] = [
  {
    id: "notes",
    name: "Notes",
    description: "Ruled notes · 3.5 × 6 in · 2 folds",
    templateId: "biz3",
    frontHtml: NOTES_HTML,
    backHtml: NOTES_HTML,
  },
];

export function templateById(id: string): Template {
  return TEMPLATES.find((t) => t.id === id) || TEMPLATES[0];
}
