// Storage layer — supports multiple documents.
// Schema: { documents: { [id]: Doc }, order: [id, ...] }

const DOCS_KEY = "minipaperpress-docs-v2";
const OLD_DOCS_KEYS = ["paperpress-docs-v2"]; // migrate from prior names
const OLD_PROJECT_KEY = "paperpress-project-v1"; // legacy single-doc, migrated once

function uid() {
  return "d" + Math.random().toString(36).slice(2, 9) + Date.now().toString(36).slice(-4);
}

function newDocFromTemplate(t, opts = {}) {
  const id = uid();
  const now = Date.now();
  return {
    id,
    title: opts.title || "Untitled document",
    createdAt: now,
    updatedAt: now,
    templateId: t.id,
    pageW: t.w,
    pageH: t.h,
    unit: opts.unit || "in",
    folds: (t.folds || []).map((f, i) => ({ id: "f" + i, ...f })),
    frontHtml: opts.frontHtml ?? "",
    backHtml:  opts.backHtml  ?? "",
  };
}

function loadStore() {
  try {
    const raw = localStorage.getItem(DOCS_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {}
  // Migrate from any older docs key.
  for (const oldKey of OLD_DOCS_KEYS) {
    try {
      const raw = localStorage.getItem(oldKey);
      if (raw) {
        const parsed = JSON.parse(raw);
        saveStore(parsed);
        localStorage.removeItem(oldKey);
        return parsed;
      }
    } catch (e) {}
  }
  // Migrate single old project (if any) into a doc.
  try {
    const oldRaw = localStorage.getItem(OLD_PROJECT_KEY);
    if (oldRaw) {
      const p = JSON.parse(oldRaw);
      // Defensive: ensure templateId still valid.
      const tpl = TEMPLATES.find((t) => t.id === p.templateId) || TEMPLATES[0];
      const id = uid();
      const now = Date.now();
      // Clear stale demo content from earlier defaults
      const OLD_FRONT_MARKER = "The Carry Card";
      const OLD_BACK_MARKER = "Keep dry, do not bend";
      const front = (p.frontHtml || "").includes(OLD_FRONT_MARKER) ? "" : (p.frontHtml || "");
      const back  = (p.backHtml  || "").includes(OLD_BACK_MARKER)  ? "" : (p.backHtml  || "");
      const doc = {
        id,
        title: p.title || "Untitled document",
        createdAt: now, updatedAt: now,
        templateId: tpl.id,
        pageW: p.pageW ?? tpl.w,
        pageH: p.pageH ?? tpl.h,
        unit: p.unit || "in",
        folds: p.folds && p.folds.length
          ? p.folds.map((f, i) => ({ id: f.id || "f" + i, ...f }))
          : (tpl.folds || []).map((f, i) => ({ id: "f" + i, ...f })),
        frontHtml: front,
        backHtml: back,
      };
      const store = { documents: { [id]: doc }, order: [id] };
      saveStore(store);
      localStorage.removeItem(OLD_PROJECT_KEY);
      return store;
    }
  } catch (e) {}
  return { documents: {}, order: [] };
}

function saveStore(store) {
  try { localStorage.setItem(DOCS_KEY, JSON.stringify(store)); } catch (e) {}
}

function createDoc(store, factory) {
  const doc = factory();
  return {
    documents: { ...store.documents, [doc.id]: doc },
    order: [doc.id, ...store.order],
  };
}

function updateDoc(store, id, patch) {
  const cur = store.documents[id];
  if (!cur) return store;
  const next = { ...cur, ...patch, updatedAt: Date.now() };
  return { ...store, documents: { ...store.documents, [id]: next } };
}

function deleteDoc(store, id) {
  const { [id]: _, ...rest } = store.documents;
  return { documents: rest, order: store.order.filter((x) => x !== id) };
}

Object.assign(window, {
  loadStore, saveStore, createDoc, updateDoc, deleteDoc,
  newDocFromTemplate, uid,
});
