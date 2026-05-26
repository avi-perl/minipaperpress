// Workflow coverage for the editor: create → rename → populate → resize →
// fold-line CRUD + drag → share/export → reimport → print-to-PDF. The print
// pipeline already has its own focused suite (printing.spec.ts); this file
// covers the everyday user journey end-to-end.
import { test, expect, type Page } from "@playwright/test";
import { promises as fs } from "node:fs";

const STORAGE_KEY = "minipaperpress-docs-v2";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

interface StoredDoc {
  id: string;
  title: string;
  pageW: number;
  pageH: number;
  unit: "in" | "mm";
  folds: { id: string; axis: "h" | "v"; position: number }[];
  frontHtml: string;
  backHtml: string;
}

/** Read the persisted store from localStorage. The dev sample doc is stripped
 *  before saving, so this only contains user-created documents. */
async function readUserDocs(page: Page): Promise<StoredDoc[]> {
  return await page.evaluate((key) => {
    const raw = window.localStorage.getItem(key);
    if (!raw) return [];
    const store = JSON.parse(raw) as { documents: Record<string, StoredDoc>; order: string[] };
    return store.order.map((id) => store.documents[id]).filter(Boolean);
  }, STORAGE_KEY);
}

/** Wait until the most recent persisted store matches `predicate`. Storage is
 *  written on every state change, so this is a stable signal that user input
 *  has been committed. */
async function expectStoreEventually(page: Page, predicate: (docs: StoredDoc[]) => boolean) {
  await expect.poll(async () => predicate(await readUserDocs(page))).toBe(true);
}

// The fold list in the rail is the single source of truth for the doc's
// folds — the canvas renders each fold twice (front + back), so counting
// `.fold-line` directly doubles up. The rail's `.fold-row` count is exact.
function foldRows(page: Page) {
  return page.locator(".fold-row");
}
function foldLinesOnFront(page: Page, axis?: "h" | "v") {
  const root = page.locator(".page-block").first();
  return axis ? root.locator(`.fold-line.${axis}`) : root.locator(".fold-line");
}

/** The "Blank document" button on the home page creates a `cc2` doc and
 *  navigates straight into the editor. */
async function createBlankAndOpen(page: Page) {
  await page.goto("/");
  await page.getByRole("button", { name: "Blank document" }).click();
  await expect(page).toHaveURL(/\/e\//);
  // Wait for both TipTap editors to mount. In dev (StrictMode) they remount
  // once; `expect.toHaveCount` polls, so it settles on the final pair.
  await expect(page.locator(".page-natural .editable")).toHaveCount(2);
}

/** Type into one of the two TipTap surfaces. Index 0 = front, 1 = back. */
async function typeInto(page: Page, side: 0 | 1, text: string) {
  const editor = page.locator(".page-natural").nth(side).locator(".editable");
  await editor.click();
  await page.keyboard.type(text);
  await expect(editor).toContainText(text);
}

/** Select a fold by dispatching a `mousedown` on its label. The label's
 *  `onMouseDown` handler is what selects/deselects the fold; we use
 *  `dispatchEvent` rather than `.click()` because the front-page fold label
 *  sits in the gutter between front and back, where the back page's
 *  contenteditable can intercept synthesized mouse hits. */
async function selectFold(page: Page, axis: "h" | "v") {
  // Both front and back render the same fold; selecting either flips state
  // for both. We dispatch on the front-page label.
  const label = page.locator(".page-block").first().locator(`.fold-line.${axis} .fold-label`).first();
  await label.dispatchEvent("mousedown");
  await expect(page.locator(`.fold-line.${axis}.selected`).first()).toBeVisible();
}

/** Drag a fold's handle by an absolute screen-pixel delta. Uses the back-page
 *  handle because it sits past the back page's right/top edge in canvas
 *  whitespace, where no editor intercepts hits. The new position is read
 *  back from the store (rounded to .01 by the app). */
async function dragFold(page: Page, axis: "h" | "v", deltaPx: number) {
  const handle = page.locator(".page-block").nth(1).locator(`.fold-line.${axis} .fold-drag`).first();
  await expect(handle).toBeVisible();
  const box = await handle.boundingBox();
  if (!box) throw new Error("fold handle has no bounding box");
  const startX = box.x + box.width / 2;
  const startY = box.y + box.height / 2;
  await page.mouse.move(startX, startY);
  await page.mouse.down();
  if (axis === "h") {
    await page.mouse.move(startX, startY + deltaPx, { steps: 8 });
  } else {
    await page.mouse.move(startX + deltaPx, startY, { steps: 8 });
  }
  await page.mouse.up();
}

/** The persisted position of the first fold with the given axis. */
async function foldPosition(page: Page, axis: "h" | "v"): Promise<number> {
  const docs = await readUserDocs(page);
  const fold = docs[0].folds.find((f) => f.axis === axis);
  if (!fold) throw new Error(`no ${axis}-fold in store`);
  return fold.position;
}

/** Count `/Type /Page` objects in a PDF (excluding the `/Pages` tree node). */
function pdfPageCount(pdf: Buffer): number {
  const m = pdf.toString("latin1").match(/\/Type\s*\/Page[^s]/g);
  return m ? m.length : 0;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
test.describe("Basic editor workflows", () => {
  test("creates a blank document from the home page and opens the editor", async ({ page }) => {
    await page.goto("/");
    const before = await readUserDocs(page);
    await page.getByRole("button", { name: "Blank document" }).click();

    await expect(page).toHaveURL(/\/e\//);
    await expect(page.locator(".doc-title")).toHaveValue("Untitled document");
    // Default template is cc2 (two-panel fold): 3.375 × 4.25 in, one h-fold.
    await expect(page.locator(".page-meta")).toContainText(/3\.38″\s*×\s*4\.25″/);
    await expect(foldRows(page)).toHaveCount(1);
    await expect(foldLinesOnFront(page, "h")).toHaveCount(1);

    await expectStoreEventually(page, (docs) => docs.length === before.length + 1);
  });

  test("renames the document and the title persists", async ({ page }) => {
    await createBlankAndOpen(page);
    const newTitle = "My business card draft";
    await page.locator(".doc-title").fill(newTitle);
    await expect(page.locator(".doc-title")).toHaveValue(newTitle);

    await expectStoreEventually(page, (docs) => docs.some((d) => d.title === newTitle));

    // Reload — the title survives a full page refresh.
    await page.reload();
    await expect(page.locator(".doc-title")).toHaveValue(newTitle);
  });

  test("populates front and back content and persists it", async ({ page }) => {
    await createBlankAndOpen(page);
    await typeInto(page, 0, "FRONT MARKER 42");
    await typeInto(page, 1, "BACK MARKER 99");

    await expectStoreEventually(page, (docs) => {
      const d = docs.find((x) => x.frontHtml.includes("FRONT MARKER 42"));
      return !!d && d.backHtml.includes("BACK MARKER 99");
    });

    // Reload — both sides come back with the same text.
    await page.reload();
    await expect(page.locator(".page-natural").first()).toContainText("FRONT MARKER 42");
    await expect(page.locator(".page-natural").nth(1)).toContainText("BACK MARKER 99");
  });

  test("switches page size via templates and via the custom W/H inputs", async ({ page }) => {
    await createBlankAndOpen(page);

    // Pick the three-panel fold template (cc3): 3.375 × 6.375, two h-folds.
    await page.locator(".size-card").nth(1).click();
    await expect(page.locator(".size-card.active").first()).toContainText("Three-panel fold");
    await expect(page.locator(".page-meta")).toContainText(/3\.38″\s*×\s*6\.38″/);
    await expect(foldLinesOnFront(page, "h")).toHaveCount(2);

    // Custom dimensions: set width 5, height 7. The page-meta updates and the
    // store reflects the new inch values.
    await page.getByRole("button", { name: "Custom" }).click();
    const dimInputs = page.locator(".custom-row .dim-input input");
    await dimInputs.first().fill("5");
    await dimInputs.nth(1).fill("7");
    await expect(page.locator(".page-meta")).toContainText(/5″\s*×\s*7″/);

    await expectStoreEventually(page, (docs) => {
      const d = docs[0];
      return Math.abs(d.pageW - 5) < 0.001 && Math.abs(d.pageH - 7) < 0.001;
    });
  });

  test("adds and removes horizontal and vertical fold lines", async ({ page }) => {
    await createBlankAndOpen(page);

    // The cc2 default ships with one horizontal fold. Remove it to start clean.
    await page.locator(".fold-row .remove").first().click();
    await expect(foldRows(page)).toHaveCount(0);
    await expect(foldLinesOnFront(page)).toHaveCount(0);

    // Add one of each direction.
    await page.getByRole("button", { name: "Horizontal fold" }).click();
    await page.getByRole("button", { name: "Vertical fold" }).click();
    await expect(foldLinesOnFront(page, "h")).toHaveCount(1);
    await expect(foldLinesOnFront(page, "v")).toHaveCount(1);

    // Add another horizontal — three folds total now.
    await page.getByRole("button", { name: "Horizontal fold" }).click();
    await expect(foldRows(page)).toHaveCount(3);
    await expect(foldLinesOnFront(page)).toHaveCount(3);

    await expectStoreEventually(
      page,
      (docs) =>
        docs[0].folds.filter((f) => f.axis === "h").length === 2 &&
        docs[0].folds.filter((f) => f.axis === "v").length === 1,
    );

    // Remove all folds one by one.
    for (let i = 0; i < 3; i++) {
      await page.locator(".fold-row .remove").first().click();
    }
    await expect(foldRows(page)).toHaveCount(0);
    await expect(foldLinesOnFront(page)).toHaveCount(0);
    await expectStoreEventually(page, (docs) => docs[0].folds.length === 0);
  });

  test("drags a horizontal fold to a new position", async ({ page }) => {
    await createBlankAndOpen(page);

    // Default cc2 has one h-fold at y = 2.125in.
    const before = await foldPosition(page, "h");
    expect(before).toBeCloseTo(2.125, 2);

    await selectFold(page, "h");
    await dragFold(page, "h", 80);

    await expectStoreEventually(page, (docs) => {
      const f = docs[0].folds.find((x) => x.axis === "h");
      return !!f && f.position > before && f.position <= 4.25; // <= pageH (cc2)
    });
  });

  test("drags a vertical fold to a new position", async ({ page }) => {
    await createBlankAndOpen(page);
    // cc2 has no v-folds by default — add one centered at pageW/2 = 1.6875.
    await page.getByRole("button", { name: "Vertical fold" }).click();
    await expect(foldLinesOnFront(page, "v")).toHaveCount(1);

    const before = await foldPosition(page, "v");
    expect(before).toBeCloseTo(1.69, 2);

    await selectFold(page, "v");
    await dragFold(page, "v", -40);

    await expectStoreEventually(page, (docs) => {
      const f = docs[0].folds.find((x) => x.axis === "v");
      return !!f && f.position < before && f.position >= 0;
    });
  });

  test("end-to-end: build a document, export it, reopen the share file, and assert all values are preserved", async ({ page, context }) => {
    await createBlankAndOpen(page);

    // Build a document with non-default values across every dimension we care
    // about: title, page size, fold set, front HTML, back HTML.
    const TITLE = "Roundtrip fixture · 2026";
    await page.locator(".doc-title").fill(TITLE);

    // Switch to the three-panel template, then customize width.
    await page.locator(".size-card").nth(1).click();
    await page.getByRole("button", { name: "Custom" }).click();
    await page.locator(".custom-row .dim-input input").first().fill("4");

    // Fold set: start clean, then add one of each axis.
    await page.locator(".fold-row .remove").first().click();
    await page.locator(".fold-row .remove").first().click();
    await page.getByRole("button", { name: "Horizontal fold" }).click();
    await page.getByRole("button", { name: "Vertical fold" }).click();

    await typeInto(page, 0, "FRONT ROUNDTRIP TEXT");
    await typeInto(page, 1, "BACK ROUNDTRIP TEXT");

    // Snapshot the source-of-truth values before exporting.
    const beforeDocs = await readUserDocs(page);
    const source = beforeDocs.find((d) => d.title === TITLE)!;
    expect(source).toBeTruthy();
    expect(source.pageW).toBeCloseTo(4, 2);
    expect(source.folds).toHaveLength(2);

    // Open Share & Print → Share a copy → Download .html, and capture the file.
    await page.getByRole("button", { name: "Share & Print" }).click();
    await page.getByRole("button", { name: "Share a copy" }).click();
    const downloadPromise = page.waitForEvent("download");
    await page.getByRole("button", { name: "Download .html" }).click();
    const download = await downloadPromise;
    const dlPath = await download.path();
    expect(dlPath).toBeTruthy();
    const shareHtml = await fs.readFile(dlPath!, "utf8");

    // The share file embeds the document as a base64url payload literal.
    const payloadMatch = shareHtml.match(/PAYLOAD\s*=\s*"([^"]+)"/);
    expect(payloadMatch, "share file should embed a PAYLOAD literal").not.toBeNull();
    const payload = payloadMatch![1];

    // Simulate a fresh recipient: open the share URL in a clean context (no
    // existing localStorage) and assert the doc materializes.
    const freshContext = await context.browser()!.newContext();
    const recipient = await freshContext.newPage();
    await recipient.goto(`/#doc=${payload}`);
    // The app decodes the hash, persists the doc, and replaces with /e/<id>.
    await expect(recipient).toHaveURL(/\/e\//);
    await expect(recipient.locator(".doc-title")).toHaveValue(TITLE);

    const recipientDocs = await readUserDocs(recipient);
    const imported = recipientDocs.find((d) => d.title === TITLE)!;
    expect(imported).toBeTruthy();
    expect(imported.pageW).toBeCloseTo(source.pageW, 2);
    expect(imported.pageH).toBeCloseTo(source.pageH, 2);
    expect(imported.folds.map((f) => f.axis).sort()).toEqual(source.folds.map((f) => f.axis).sort());
    expect(imported.frontHtml).toContain("FRONT ROUNDTRIP TEXT");
    expect(imported.backHtml).toContain("BACK ROUNDTRIP TEXT");

    // The editor on the recipient side renders the imported content.
    await expect(recipient.locator(".page-natural").first()).toContainText("FRONT ROUNDTRIP TEXT");
    await expect(recipient.locator(".page-natural").nth(1)).toContainText("BACK ROUNDTRIP TEXT");

    await freshContext.close();
  });

  test("prints the populated document to a two-page Letter PDF", async ({ page }) => {
    await createBlankAndOpen(page);
    await page.locator(".doc-title").fill("PDF print fixture");
    await typeInto(page, 0, "PRINTABLE FRONT");
    await typeInto(page, 1, "PRINTABLE BACK");

    await page.getByRole("button", { name: "Share & Print" }).click();
    await expect(page.locator(".sheet").first()).toBeVisible();
    await expect(page.locator(".sheet")).toHaveCount(2);

    const pdf = await page.pdf({ preferCSSPageSize: true });
    expect(pdfPageCount(pdf)).toBe(2);

    // Each sheet is Letter-sized (8.5 × 11 in → 612 × 792 pt). Read /MediaBox
    // values straight from the PDF and convert to inches.
    const boxes = [...pdf.toString("latin1").matchAll(/\/MediaBox\s*\[\s*([\d.]+)\s+([\d.]+)\s+([\d.]+)\s+([\d.]+)\s*\]/g)];
    expect(boxes).toHaveLength(2);
    for (const m of boxes) {
      expect((+m[3] - +m[1]) / 72).toBeCloseTo(8.5, 2);
      expect((+m[4] - +m[2]) / 72).toBeCloseTo(11, 2);
    }
  });
});
