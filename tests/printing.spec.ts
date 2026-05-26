// End-to-end tests for the Share & Print pipeline.
//
// Every assertion here mirrors something verified by hand while overhauling the
// printer: exactly two Letter pages (never the old four), each page clipped to
// 8.5x11in, front/back cards that register for duplex, a readable (non-flipped)
// back, a working long/short-edge flip toggle, and backgrounds that survive the
// print color pass. The document under test is a template owned by this file —
// it does not depend on the app's built-in templates or the dev sample doc.
import { test, expect, type Page } from "@playwright/test";
import zlib from "node:zlib";

// ---------------------------------------------------------------------------
// Test-owned template + document fixture
// ---------------------------------------------------------------------------
const STORAGE_KEY = "minipaperpress-docs-v2";

interface TestTemplate {
  pageW: number; // inches
  pageH: number; // inches
  folds: { axis: "h" | "v"; position: number }[];
}

// The framework's own template: the two-up folded card that originally
// reproduced the four-page bug (3.5 x 6in, two horizontal folds).
const TEST_TEMPLATE: TestTemplate = {
  pageW: 3.5,
  pageH: 6,
  folds: [
    { axis: "h", position: 2 },
    { axis: "h", position: 4 },
  ],
};

// Pure, distinct fill colors so we can find them in the PDF content stream:
//   front marker #ff0000 -> "1 0 0 rg"
//   back  marker #00ff00 -> "0 1 0 rg"
const FRONT_FILL = "1 0 0 rg";
const BACK_FILL = "0 1 0 rg";

type TestDoc = ReturnType<typeof buildDoc>;

interface DocOverrides extends Partial<TestTemplate> {
  id?: string;
  title?: string;
  frontHtml?: string;
  backHtml?: string;
}

function buildDoc(overrides: DocOverrides = {}) {
  const tpl: TestTemplate = {
    pageW: overrides.pageW ?? TEST_TEMPLATE.pageW,
    pageH: overrides.pageH ?? TEST_TEMPLATE.pageH,
    folds: overrides.folds ?? TEST_TEMPLATE.folds,
  };
  const now = Date.now();
  return {
    id: overrides.id ?? "pw-print-doc",
    title: overrides.title ?? "Playwright Print Fixture",
    createdAt: now,
    updatedAt: now,
    templateId: "pw-test-template",
    pageW: tpl.pageW,
    pageH: tpl.pageH,
    unit: "in" as const,
    folds: tpl.folds.map((f, i) => ({ id: `pw-f${i}`, ...f })),
    frontHtml:
      overrides.frontHtml ??
      `<div data-marker="front" style="background:#ff0000;color:#fff;padding:2px 6px;font-weight:700">FRONT</div>` +
        `<p>front body</p>`,
    backHtml:
      overrides.backHtml ??
      `<div data-marker="back" style="background:#00ff00;color:#000;padding:2px 6px;font-weight:700">BACK</div>` +
        `<p>back body</p>`,
  };
}

/** Seed the store with only our fixture doc, then open its print preview. */
async function openPrintPreview(page: Page, doc: TestDoc) {
  await page.addInitScript(
    ([key, value]) => window.localStorage.setItem(key, value),
    [STORAGE_KEY, JSON.stringify({ documents: { [doc.id]: doc }, order: [doc.id] })] as const,
  );
  await page.goto("/");
  await page.getByRole("button", { name: `Open ${doc.title}` }).click();
  await page.getByRole("button", { name: "Share & Print" }).click();
  await expect(page.locator(".sheet").first()).toBeVisible();
  await expect(page.locator(".sheet")).toHaveCount(2);
}

// ---------------------------------------------------------------------------
// Minimal PDF inspection helpers (no extra deps)
// ---------------------------------------------------------------------------

/** Count page objects (`/Type /Page`, excluding the `/Pages` tree node). */
function pdfPageCount(pdf: Buffer): number {
  const s = pdf.toString("latin1");
  const m = s.match(/\/Type\s*\/Page[^s]/g);
  return m ? m.length : 0;
}

/** Every /MediaBox in the file, converted from PDF points (72/in) to inches. */
function pdfMediaBoxesInInches(pdf: Buffer): { w: number; h: number }[] {
  const s = pdf.toString("latin1");
  const re = /\/MediaBox\s*\[\s*([\d.]+)\s+([\d.]+)\s+([\d.]+)\s+([\d.]+)\s*\]/g;
  const boxes: { w: number; h: number }[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(s)) !== null) {
    boxes.push({ w: (+m[3] - +m[1]) / 72, h: (+m[4] - +m[2]) / 72 });
  }
  return boxes;
}

/** Inflate every FlateDecode stream and concatenate the decoded operators. */
function pdfContentStreams(pdf: Buffer): string {
  const s = pdf.toString("latin1");
  let text = "";
  const re = /stream\r?\n/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(s)) !== null) {
    const start = m.index + m[0].length;
    const end = s.indexOf("endstream", start);
    if (end < 0) continue;
    try {
      text += zlib.inflateSync(pdf.subarray(start, end)).toString("latin1");
    } catch {
      // not a flate stream (fonts, etc.) — skip
    }
  }
  return text;
}

/** Sorted list of each cell's inch-offset style, per sheet (front, back). */
async function cardPositions(page: Page) {
  return page.evaluate(() => {
    const read = (sheet: Element) =>
      [...sheet.children]
        .map((c) => `${(c as HTMLElement).style.left}/${(c as HTMLElement).style.top}`)
        .sort();
    const sheets = document.querySelectorAll(".sheet");
    return { front: read(sheets[0]), back: read(sheets[1]) };
  });
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
test.describe("Share & Print", () => {
  test("prints exactly two Letter pages — front + back, never more", async ({ page }) => {
    await openPrintPreview(page, buildDoc());

    const pdf = await page.pdf({ preferCSSPageSize: true });

    expect(pdfPageCount(pdf)).toBe(2);
    const boxes = pdfMediaBoxesInInches(pdf);
    expect(boxes).toHaveLength(2);
    for (const b of boxes) {
      expect(b.w).toBeCloseTo(8.5, 2);
      expect(b.h).toBeCloseTo(11, 2);
    }
  });

  test("a dense multi-up layout still prints exactly two pages", async ({ page }) => {
    // A small card tiles many copies per sheet (≈3×4).
    await openPrintPreview(page, buildDoc({ pageW: 2, pageH: 2.5, folds: [] }));

    const cellCount = await page.locator(".sheet").first().locator("> div").count();
    expect(cellCount).toBeGreaterThan(4);

    const pdf = await page.pdf({ preferCSSPageSize: true });
    expect(pdfPageCount(pdf)).toBe(2);
  });

  test("a card larger than the sheet yields two empty pages and never overflows", async ({ page }) => {
    await openPrintPreview(page, buildDoc({ pageW: 20, pageH: 30, folds: [] }));

    // The UI reports that nothing fits.
    await expect(page.locator(".print-stats .n").first()).toHaveText("0");

    const pdf = await page.pdf({ preferCSSPageSize: true });
    expect(pdfPageCount(pdf)).toBe(2);
    for (const b of pdfMediaBoxesInInches(pdf)) {
      expect(b.w).toBeCloseTo(8.5, 2);
      expect(b.h).toBeCloseTo(11, 2);
    }
  });

  test("front and back cards occupy identical positions (duplex registration)", async ({ page }) => {
    await openPrintPreview(page, buildDoc());

    const { front, back } = await cardPositions(page);
    expect(front.length).toBeGreaterThan(0);
    expect(back).toEqual(front);
  });

  test("back content renders readable, not horizontally flipped", async ({ page }) => {
    await openPrintPreview(page, buildDoc());

    const back = page.locator(".sheet").nth(1);
    await expect(back.getByText("BACK").first()).toBeVisible();

    // The card-scaling frame must not apply a negative horizontal scale, which
    // would mirror the glyphs and make the back unreadable.
    const horizontalScale = await page.evaluate(() => {
      const backSheet = document.querySelectorAll(".sheet")[1];
      const frame = backSheet.querySelector(".card-readonly")?.parentElement as HTMLElement;
      return new DOMMatrixReadOnly(getComputedStyle(frame).transform).a;
    });
    expect(horizontalScale).toBeGreaterThan(0);
  });

  test("the duplex flip toggle relabels the back and preserves registration", async ({ page }) => {
    await openPrintPreview(page, buildDoc());

    const backLabel = page.locator(".sheet-label").nth(1);
    await expect(backLabel).toContainText("long-edge");

    await page.getByRole("button", { name: "Short edge" }).click();
    await expect(backLabel).toContainText("short-edge");

    // Cards still line up after switching the flip axis.
    const { front, back } = await cardPositions(page);
    expect(back).toEqual(front);
  });

  test("backgrounds print even with the browser's background graphics off", async ({ page }) => {
    await openPrintPreview(page, buildDoc());

    // printBackground:false mirrors Chrome's default "Background graphics" being
    // unchecked. print-color-adjust: exact must still force the fills through.
    const pdf = await page.pdf({ preferCSSPageSize: true, printBackground: false });
    const content = pdfContentStreams(pdf);

    expect(content).toContain(FRONT_FILL); // red front marker
    expect(content).toContain(BACK_FILL); // green back marker
  });

  test("tall content is shown in full — the card grows and nothing is clipped", async ({ page }) => {
    // Content far taller than the nominal 6in card. The very last block carries
    // a unique blue background (#0000ff -> "0 0 1 rg") so we can prove the bottom
    // of the content actually reached the printed PDF and was not clipped away.
    const END_FILL = "0 0 1 rg";
    let body = "<h1>Tall content</h1>";
    for (let i = 1; i <= 40; i++) body += `<p>Line ${i} — paragraph number ${i}.</p>`;
    body += `<p data-marker="end" style="background:#0000ff;color:#fff">END OF CONTENT</p>`;

    await openPrintPreview(
      page,
      buildDoc({ id: "pw-tall", title: "Playwright Tall Fixture", folds: [], frontHtml: body, backHtml: body }),
    );

    const card = page.locator(".sheet").first().locator(".card-readonly").first();

    // The content genuinely overflows the nominal 6in card...
    const metrics = await card.evaluate((el) => ({
      clientH: (el as HTMLElement).clientHeight,
      scrollH: (el as HTMLElement).scrollHeight,
      nominalPx: 6 * 96,
    }));
    expect(metrics.scrollH).toBeGreaterThan(metrics.nominalPx);
    // ...yet the card box grew to contain it, so nothing is clipped.
    expect(metrics.scrollH - metrics.clientH).toBeLessThanOrEqual(1);

    // The last block sits fully within the card bounds (not cut off).
    const lastInside = await card.evaluate((el) => {
      const end = el.querySelector('[data-marker="end"]') as HTMLElement;
      return end.getBoundingClientRect().bottom <= el.getBoundingClientRect().bottom + 0.5;
    });
    expect(lastInside).toBe(true);

    // End to end: the bottom marker's fill color is present in the printed PDF
    // (if the content were clipped, this color would never be painted), and the
    // output is still a valid pair of Letter pages.
    const pdf = await page.pdf({ preferCSSPageSize: true, printBackground: false });
    expect(pdfContentStreams(pdf)).toContain(END_FILL);
    expect(pdfPageCount(pdf)).toBe(2);
    for (const b of pdfMediaBoxesInInches(pdf)) {
      expect(b.w).toBeCloseTo(8.5, 2);
      expect(b.h).toBeCloseTo(11, 2);
    }
  });

  test("editor and print render identical block spacing", async ({ page }) => {
    // HTML authored with newlines between block tags. ProseMirror strips that
    // whitespace; the static print render must too, or the print spacing drifts
    // (each inter-block newline used to add a blank line). We assert the
    // top-level block offsets are pixel-identical in the editor and in print.
    const html = [
      "<h1>Title</h1>",
      "<p>Paragraph one with a few words.</p>",
      "<hr>",
      "<h2>Section</h2>",
      "<p>Paragraph two with more words to wrap.</p>",
      "<ul>",
      "<li>First item</li>",
      "<li>Second item</li>",
      "</ul>",
    ].join("\n");

    const doc = buildDoc({ id: "pw-spacing", title: "Playwright Spacing Fixture", folds: [], frontHtml: html, backHtml: html });
    await page.addInitScript(
      ([key, value]) => window.localStorage.setItem(key, value),
      [STORAGE_KEY, JSON.stringify({ documents: { [doc.id]: doc }, order: [doc.id] })] as const,
    );
    await page.goto("/");
    await page.getByRole("button", { name: `Open ${doc.title}` }).click();

    // Reader runs in the page: "TAG@offsetTop" for each non-empty top-level block.
    const readBlocks = (el: Element) =>
      [...el.children]
        .filter((c) => c.tagName === "HR" || (c.textContent || "").trim() !== "")
        .map((c) => `${c.tagName}@${(c as HTMLElement).offsetTop}`);

    const editorBlocks = await page
      .locator(".page-natural")
      .first()
      .locator(".editable")
      .first()
      .evaluate(readBlocks);

    await page.getByRole("button", { name: "Share & Print" }).click();
    await expect(page.locator(".sheet").first()).toBeVisible();

    const printBlocks = await page
      .locator(".sheet")
      .first()
      .locator(".card-readonly")
      .first()
      .evaluate(readBlocks);

    expect(editorBlocks.length).toBeGreaterThanOrEqual(5);
    expect(printBlocks).toEqual(editorBlocks);
  });

  test("empty paragraph spacers occupy the same height in editor and print", async ({ page }) => {
    // Empty <p></p> blocks are commonly authored as visual spacers between
    // sections. ProseMirror gives every empty block a trailing-break
    // decoration so it renders at full line-height; the static print render
    // has no such decoration, so an empty <p></p> collapses to ~0px unless
    // the normalizer fills it. If parity is broken, content that overflows
    // in the editor will appear to fit in print — a silent WYSIWYG failure.
    const html =
      "<h1>Title</h1>" +
      "<p>First section line.</p>" +
      "<p></p>" +
      "<p>Second section line.</p>" +
      "<p></p>" +
      "<p></p>" +
      "<p>Third section line.</p>";

    const doc = buildDoc({
      id: "pw-empty-spacers",
      title: "Playwright Empty Spacer Fixture",
      folds: [],
      frontHtml: html,
      backHtml: html,
    });
    await page.addInitScript(
      ([key, value]) => window.localStorage.setItem(key, value),
      [STORAGE_KEY, JSON.stringify({ documents: { [doc.id]: doc }, order: [doc.id] })] as const,
    );
    await page.goto("/");
    await page.getByRole("button", { name: `Open ${doc.title}` }).click();

    // Capture every top-level block's offsetTop — including empty ones, which
    // the existing spacing test deliberately filters out.
    const readBlocks = (el: Element) =>
      [...el.children].map((c) => `${c.tagName}@${(c as HTMLElement).offsetTop}`);

    const editorBlocks = await page
      .locator(".page-natural")
      .first()
      .locator(".editable")
      .first()
      .evaluate(readBlocks);

    await page.getByRole("button", { name: "Share & Print" }).click();
    await expect(page.locator(".sheet").first()).toBeVisible();

    const printBlocks = await page
      .locator(".sheet")
      .first()
      .locator(".card-readonly")
      .first()
      .evaluate(readBlocks);

    // Same number of top-level blocks (7), same vertical position for each —
    // including each empty <p> spacer.
    expect(editorBlocks).toHaveLength(7);
    expect(printBlocks).toEqual(editorBlocks);

    // Belt-and-braces: the very last block must sit well below the top —
    // proving the empty spacers actually contributed real vertical space in
    // print. The editor lays them out at ~21px (1.5em line-height @ 14px) +
    // 4px paragraph margin; three spacers therefore push the last block down
    // by ~70px or more.
    const lastOffset = Number(printBlocks.at(-1)!.split("@")[1]);
    expect(lastOffset).toBeGreaterThan(100);
  });

  test("print media hides editor chrome and clips each sheet to 8.5×11in", async ({ page }) => {
    await openPrintPreview(page, buildDoc());
    await page.emulateMedia({ media: "print" });

    // Options panel, top bar, and per-sheet labels do not print.
    const display = (sel: string) =>
      page.locator(sel).first().evaluate((el) => getComputedStyle(el).display);
    expect(await display(".print-side")).toBe("none");
    expect(await display(".print-topbar")).toBe("none");
    expect(await display(".sheet-label")).toBe("none");

    // The sheet itself is exactly Letter-sized and clipped.
    const box = await page.locator(".sheet").first().evaluate((el) => {
      const r = el.getBoundingClientRect();
      return { w: r.width, h: r.height, overflow: getComputedStyle(el).overflow };
    });
    expect(box.w).toBeCloseTo(816, 0); // 8.5in × 96
    expect(box.h).toBeCloseTo(1056, 0); // 11in × 96
    expect(box.overflow).toBe("hidden");

    // The column wrapper carries the page break so the sheet is never split,
    // and the last column does not force a trailing blank page.
    const breaks = await page.evaluate(() => {
      const cols = document.querySelectorAll(".sheet-col");
      return {
        first: getComputedStyle(cols[0]).breakAfter,
        last: getComputedStyle(cols[cols.length - 1]).breakAfter,
      };
    });
    expect(breaks.first).toBe("page");
    expect(breaks.last).toBe("auto");

    await page.emulateMedia({ media: null });
  });
});
