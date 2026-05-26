// A sample document that only exists while developing.
//
// It is injected into the in-memory store when running the dev server
// (import.meta.env.DEV) and stripped before persisting, so it:
//   - always shows up fresh on the home page during development,
//   - never lands in localStorage, and
//   - never ships in a production build (the dev branch is dead-code-eliminated).
import type { Doc, Store } from "./types";

export const DEV_DOC_ID = "__dev_sample__";

const FRONT_HTML = `
<h1>Editor test sheet</h1>
<p>This document only appears in <strong>development</strong>. It exercises the editor with <em>italic</em>, <u>underline</u>, <s>strikethrough</s>, <code>inline code</code>, a <a href="https://example.com">link</a>, <mark style="background-color: #fff475">highlight</mark>, and <span style="color: #1a73e8">colored text</span>. Water is H<sub>2</sub>O and E = mc<sup>2</sup>.</p>
<hr>
<h2>Headings &amp; sizes</h2>
<h3>A subheading</h3>
<p><span style="font-size: 18px">Big text</span>, normal text, and <span style="font-size: 9px">small text</span>. <span style="font-family: Georgia, serif">Georgia serif</span> next to <span style="font-family: 'Roboto Mono', monospace">monospace</span>.</p>
<hr>
<h2>Lists</h2>
<ul><li>Bulleted item one</li><li>Bulleted item two</li></ul>
<ol><li>Numbered item one</li><li>Numbered item two</li></ol>
<ul data-type="taskList">
  <li data-type="taskItem" data-checked="true"><label><input type="checkbox" checked="checked"><span></span></label><div><p>Completed task</p></div></li>
  <li data-type="taskItem" data-checked="false"><label><input type="checkbox"><span></span></label><div><p>Pending task</p></div></li>
</ul>
`.trim();

const BACK_HTML = `
<h1>Blocks &amp; layout</h1>
<blockquote><p>“A quote block — for testing blockquote rendering.”</p></blockquote>
<pre><code>function hello() {
  return "code block";
}</code></pre>
<hr>
<h2>Alignment</h2>
<p style="text-align: center">Centered paragraph</p>
<p style="text-align: right">Right-aligned paragraph</p>
<hr>
<h2>Table</h2>
<table><tbody>
<tr><th>Item</th><th>Qty</th><th>Note</th></tr>
<tr><td>Cards</td><td>12</td><td>per sheet</td></tr>
<tr><td>Folds</td><td>1</td><td>horizontal</td></tr>
</tbody></table>
<hr>
<h2>Ruled lines</h2>
<hr>
<hr>
<hr>
`.trim();

function makeDevDoc(): Doc {
  const now = Date.now();
  return {
    id: DEV_DOC_ID,
    title: "Dev test document",
    createdAt: now,
    updatedAt: now,
    templateId: "biz3",
    pageW: 3.5,
    pageH: 6,
    unit: "in",
    folds: [
      { id: "dev-fold-1", axis: "h", position: 2 },
      { id: "dev-fold-2", axis: "h", position: 4 },
    ],
    frontHtml: FRONT_HTML,
    backHtml: BACK_HTML,
  };
}

/** Add the dev sample document to a store (dev builds only). */
export function withDevDoc(store: Store): Store {
  if (!import.meta.env.DEV) return store;
  if (store.documents[DEV_DOC_ID]) return store;
  return {
    documents: { ...store.documents, [DEV_DOC_ID]: makeDevDoc() },
    order: [DEV_DOC_ID, ...store.order],
  };
}

/** Remove the dev sample document before persisting so it never reaches storage. */
export function stripDevDoc(store: Store): Store {
  if (!store.documents[DEV_DOC_ID]) return store;
  const { [DEV_DOC_ID]: _omit, ...documents } = store.documents;
  return {
    documents,
    order: store.order.filter((id) => id !== DEV_DOC_ID),
  };
}
