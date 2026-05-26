// Templates + unit conversion + default page styling.

// Templates carry their default fold lines too.
// "fold" axis: 'h' = horizontal cut across the page (constant y), 'v' = vertical (constant x).
const TEMPLATES = [
  {
    id: "biz2",
    name: "Two-card fold",
    sub: "2 business cards · 1 fold",
    w: 3.5, h: 4.0,
    folds: [{ axis: "h", position: 2.0 }],
  },
  {
    id: "biz3",
    name: "Three-card fold",
    sub: "3 business cards · 2 folds",
    w: 3.5, h: 6.0,
    folds: [
      { axis: "h", position: 2.0 },
      { axis: "h", position: 4.0 },
    ],
  },
];

const DEFAULT_FRONT_HTML = "";
const DEFAULT_BACK_HTML = "";

// inch <-> mm helpers
const inToMm = (v) => v * 25.4;
const mmToIn = (v) => v / 25.4;
const round2 = (v) => Math.round(v * 100) / 100;

function fmt(v, unit) {
  if (unit === "mm") return `${Math.round(inToMm(v))} mm`;
  // pretty inch like 3.5"
  return `${round2(v)}″`;
}

// On an 8.5x11 sheet with given margin (in) and gap (in),
// figure out how many pages fit in landscape OR portrait orientation; pick max.
function computeLayout(pageW, pageH, sheetW = 8.5, sheetH = 11, margin = 0.25, gap = 0.15) {
  const usableW = sheetW - margin * 2;
  const usableH = sheetH - margin * 2;
  function tryOrient(pw, ph) {
    if (pw <= 0 || ph <= 0) return { cols: 0, rows: 0, count: 0 };
    const cols = Math.max(0, Math.floor((usableW + gap) / (pw + gap)));
    const rows = Math.max(0, Math.floor((usableH + gap) / (ph + gap)));
    return { cols, rows, count: cols * rows };
  }
  const A = tryOrient(pageW, pageH); A.rotated = false;
  const B = tryOrient(pageH, pageW); B.rotated = true;
  const best = (B.count > A.count) ? B : A;
  const eW = best.rotated ? pageH : pageW;
  const eH = best.rotated ? pageW : pageH;
  return {
    ...best,
    effectiveW: eW,
    effectiveH: eH,
    sheetW, sheetH, margin, gap,
    totalW: best.cols * eW + Math.max(0, best.cols - 1) * gap,
    totalH: best.rows * eH + Math.max(0, best.rows - 1) * gap,
    offsetX: (sheetW - (best.cols * eW + Math.max(0, best.cols - 1) * gap)) / 2,
    offsetY: (sheetH - (best.rows * eH + Math.max(0, best.rows - 1) * gap)) / 2,
  };
}

// Starters: premade documents you can spin up from the home page.
const NOTES_HTML = `
<h1 style="text-align:center;margin:0 0 6px;letter-spacing:0.02em">Notes</h1>
${Array.from({ length: 26 }).map(() =>
  `<hr style="border:none;border-top:1px solid #c8cacd;margin:14px 0"/>`
).join("")}
`.trim();

const STARTERS = [
  {
    id: "notes",
    name: "Notes",
    description: "Ruled notes · 3.5 × 6 in · 2 folds",
    templateId: "biz3",
    frontHtml: NOTES_HTML,
    backHtml:  NOTES_HTML,
  },
];

function templateById(id) {
  return TEMPLATES.find((t) => t.id === id) || TEMPLATES[0];
}

Object.assign(window, {
  TEMPLATES, DEFAULT_FRONT_HTML, DEFAULT_BACK_HTML,
  inToMm, mmToIn, round2, fmt, computeLayout,
  STARTERS, templateById,
});
