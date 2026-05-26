// Normalize stored card HTML for the static (read-only) print/preview render.
//
// The editor is a ProseMirror surface: when it parses HTML it discards
// insignificant whitespace between block nodes. The print/preview card renders
// the stored HTML string directly with `white-space: break-spaces`, so any
// newline left between block tags (common in authored or pasted HTML) would
// show up as a blank line and inflate the spacing — making print not match the
// editor. This mirrors ProseMirror by dropping whitespace-only text nodes that
// sit between (or at the edges of) block elements, while leaving real text —
// including intentional runs of spaces inside a block — untouched.

const BLOCK_TAGS = new Set([
  "P", "H1", "H2", "H3", "H4", "H5", "H6",
  "UL", "OL", "LI", "HR", "BLOCKQUOTE",
  "PRE", "TABLE", "THEAD", "TBODY", "TFOOT", "TR", "TD", "TH",
  "DIV", "FIGURE", "FIGCAPTION",
]);

// Block tags that ProseMirror's contenteditable renders with a trailing
// `<br class="ProseMirror-trailingBreak">` decoration when empty, so the block
// still occupies a full line of height. The static print render is just
// dangerouslySetInnerHTML with no decoration, so empty blocks would otherwise
// collapse — making empty `<p></p>` spacers (used heavily as visual gaps
// between sections) silently disappear in print while still pushing content
// down in the editor.
const FILL_EMPTY_TAGS = new Set([
  "P", "H1", "H2", "H3", "H4", "H5", "H6", "LI",
]);

export function normalizeCardHtml(html: string): string {
  if (!html || typeof DOMParser === "undefined") return html || "";

  const doc = new DOMParser().parseFromString(html, "text/html");

  const isBlock = (n: Node | null): boolean =>
    !n || (n.nodeType === Node.ELEMENT_NODE && BLOCK_TAGS.has((n as Element).tagName));

  const isEmptyBlock = (el: Element): boolean => {
    // An "empty" block has no element children and no non-whitespace text.
    for (const child of Array.from(el.childNodes)) {
      if (child.nodeType === Node.ELEMENT_NODE) return false;
      if (child.nodeType === Node.TEXT_NODE && (child.textContent || "") !== "") return false;
    }
    return true;
  };

  const walk = (el: Node) => {
    for (const node of Array.from(el.childNodes)) {
      if (node.nodeType === Node.TEXT_NODE) {
        const blank = (node.textContent || "").trim() === "";
        if (blank && (isBlock(node.previousSibling) || isBlock(node.nextSibling))) {
          node.parentNode?.removeChild(node);
        }
      } else if (node.nodeType === Node.ELEMENT_NODE) {
        const el = node as Element;
        const tag = el.tagName;
        // Preformatted content keeps its whitespace verbatim.
        if (tag !== "PRE" && tag !== "CODE") walk(node);
        if (FILL_EMPTY_TAGS.has(tag) && isEmptyBlock(el)) {
          el.appendChild(doc.createElement("br"));
        }
      }
    }
  };

  walk(doc.body);
  return doc.body.innerHTML;
}
