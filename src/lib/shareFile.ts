// Sharing format: a tiny HTML file that embeds the document JSON (base64url)
// and the origin of the site that generated it. Opening the file in a browser
// redirects to `<origin>/#doc=<base64url>`, where the app decodes it, writes it
// to local storage, and replaces the URL with `/e/<id>`.

import type { Doc } from "./types";

function toB64Url(bytes: Uint8Array): string {
  let bin = "";
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromB64Url(s: string): Uint8Array {
  const pad = s.length % 4 === 0 ? "" : "=".repeat(4 - (s.length % 4));
  const b64 = s.replace(/-/g, "+").replace(/_/g, "/") + pad;
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

export function encodeDocPayload(doc: Doc): string {
  const json = JSON.stringify(doc);
  const bytes = new TextEncoder().encode(json);
  return toB64Url(bytes);
}

export function decodeDocPayload(payload: string): Doc {
  const bytes = fromB64Url(payload);
  const json = new TextDecoder().decode(bytes);
  return JSON.parse(json) as Doc;
}

function htmlEscape(s: string): string {
  return s.replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" } as Record<string, string>)[c],
  );
}

export function shareFilename(title: string): string {
  const base = (title || "document").replace(/[^a-z0-9-_]+/gi, "_").replace(/^_+|_+$/g, "");
  return (base || "document") + ".minipaperpress.html";
}

export function buildShareHtml(doc: Doc, origin: string): string {
  const payload = encodeDocPayload(doc);
  const title = doc.title || "MiniPaperPress document";
  return `<!doctype html>
<html lang="en">
<meta charset="utf-8">
<title>${htmlEscape(title)} · MiniPaperPress</title>
<style>
  body { font: 14px/1.5 -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; color: #202124; margin: 48px auto; max-width: 560px; padding: 0 16px; }
  a { color: #1a73e8; word-break: break-all; }
  .small { color: #5f6368; font-size: 12.5px; margin-top: 24px; }
  code { font: 12.5px ui-monospace, SFMono-Regular, Menlo, monospace; color: #3c4043; }
</style>
<p>Opening <strong>${htmlEscape(title)}</strong> in MiniPaperPress…</p>
<p>If nothing happens, <a id="open">open it manually</a>.</p>
<p class="small">This file contains a MiniPaperPress document. It opens at <code id="host"></code>.</p>
<script>
(function () {
  var ORIGIN = ${JSON.stringify(origin)};
  var PAYLOAD = ${JSON.stringify(payload)};
  var url = ORIGIN + "/#doc=" + PAYLOAD;
  var link = document.getElementById("open");
  link.href = url;
  document.getElementById("host").textContent = ORIGIN;
  location.replace(url);
})();
</script>
</html>
`;
}
