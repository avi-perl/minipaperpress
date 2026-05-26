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

export function normalizeCardHtml(html: string): string {
  if (!html || typeof DOMParser === "undefined") return html || "";

  const doc = new DOMParser().parseFromString(html, "text/html");

  const isBlock = (n: Node | null): boolean =>
    !n || (n.nodeType === Node.ELEMENT_NODE && BLOCK_TAGS.has((n as Element).tagName));

  const walk = (el: Node) => {
    for (const node of Array.from(el.childNodes)) {
      if (node.nodeType === Node.TEXT_NODE) {
        const blank = (node.textContent || "").trim() === "";
        if (blank && (isBlock(node.previousSibling) || isBlock(node.nextSibling))) {
          node.parentNode?.removeChild(node);
        }
      } else if (node.nodeType === Node.ELEMENT_NODE) {
        const tag = (node as Element).tagName;
        // Preformatted content keeps its whitespace verbatim.
        if (tag !== "PRE" && tag !== "CODE") walk(node);
      }
    }
  };

  walk(doc.body);
  return doc.body.innerHTML;
}
