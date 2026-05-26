// Main app. Routes between Home, Editor, and Print Preview.
// Storage holds many documents in one keyed store (lib/storage.ts).
import { useEffect, useState } from "react";
import type { Doc, Fold, Starter, Store } from "./lib/types";
import { loadStore, newDocFromTemplate, saveStore, updateDoc, deleteDoc } from "./lib/storage";
import { templateById } from "./lib/templates";
import { HomePage } from "./components/HomePage";
import { TopBar } from "./components/TopBar";
import { Toolbar } from "./components/Toolbar";
import { Canvas } from "./components/Canvas";
import { Rail } from "./components/Rail";
import { PrintPreview } from "./components/PrintPreview";

type Route = "home" | "editor" | "print";

interface CreateArg {
  templateId?: string;
  starter?: Starter;
}

export default function App() {
  const [store, setStore] = useState<Store>(loadStore);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [route, setRoute] = useState<Route>("home");
  const [activeEditor, setActiveEditor] = useState<HTMLElement | null>(null);
  const [selectedFoldId, setSelectedFoldId] = useState<string | null>(null);
  const [, force] = useState(0);

  // Persist store on change
  useEffect(() => {
    saveStore(store);
  }, [store]);

  // Re-render on selection change so toolbar active-state updates
  useEffect(() => {
    const handler = () => force((n) => n + 1);
    document.addEventListener("selectionchange", handler);
    return () => document.removeEventListener("selectionchange", handler);
  }, []);

  const project = activeId ? store.documents[activeId] : null;

  const update = (patch: Partial<Doc>) => {
    if (!activeId) return;
    setStore((s) => updateDoc(s, activeId, patch));
  };
  const updateFolds = (folds: Fold[]) => update({ folds });
  const moveFold = (foldId: string, newPos: number) => {
    if (!project) return;
    const folds = project.folds.map((f) => (f.id === foldId ? { ...f, position: newPos } : f));
    update({ folds });
  };

  // Deselect fold when clicking anywhere outside fold UI
  useEffect(() => {
    if (!selectedFoldId) return;
    const onDown = (e: MouseEvent) => {
      if ((e.target as Element).closest(".fold-line")) return;
      setSelectedFoldId(null);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [selectedFoldId]);

  const openDoc = (id: string) => {
    setActiveId(id);
    setRoute("editor");
  };
  const goHome = () => {
    setActiveId(null);
    setRoute("home");
  };

  const createDocAndOpen = ({ templateId, starter }: CreateArg) => {
    // From starter (with content) or just a sized template (blank).
    let factory: () => Doc;
    if (starter) {
      const t = templateById(starter.templateId);
      factory = () =>
        newDocFromTemplate(t, {
          title: starter.name,
          frontHtml: starter.frontHtml,
          backHtml: starter.backHtml,
        });
    } else {
      const t = templateById(templateId || "");
      factory = () => newDocFromTemplate(t, { title: "Untitled document" });
    }
    const tmpDoc = factory();
    setStore((s) => ({
      documents: { ...s.documents, [tmpDoc.id]: tmpDoc },
      order: [tmpDoc.id, ...s.order],
    }));
    setActiveId(tmpDoc.id);
    setRoute("editor");
  };

  const handleDelete = (id: string) => {
    setStore((s) => deleteDoc(s, id));
  };

  // ===== WYSIWYG actions =====
  const exec = (cmd: string, value?: string) => {
    if (!activeEditor) return;
    activeEditor.focus();
    document.execCommand(cmd, false, value);
    const ev = new Event("input", { bubbles: true });
    activeEditor.dispatchEvent(ev);
  };
  const queryActive = (cmd: string) => {
    try {
      return document.queryCommandState(cmd);
    } catch (e) {
      return false;
    }
  };
  const applyHeading = (tag: string) => {
    if (!activeEditor) return;
    activeEditor.focus();
    document.execCommand("formatBlock", false, tag);
    activeEditor.dispatchEvent(new Event("input", { bubbles: true }));
  };
  const applyFontSize = (px: string) => {
    if (!activeEditor) return;
    activeEditor.focus();
    document.execCommand("styleWithCSS", false, "true");
    document.execCommand("fontSize", false, "7");
    const spans = activeEditor.querySelectorAll('font[size="7"], span[style*="font-size"]');
    spans.forEach((node) => {
      const el = node as HTMLElement;
      if (el.tagName === "FONT") {
        const span = document.createElement("span");
        span.style.fontSize = px + "px";
        span.innerHTML = el.innerHTML;
        el.replaceWith(span);
      } else {
        el.style.fontSize = px + "px";
      }
    });
    activeEditor.dispatchEvent(new Event("input", { bubbles: true }));
  };

  // ===== render =====
  if (route === "home" || !project) {
    return <HomePage store={store} onOpen={openDoc} onCreate={createDocAndOpen} onDelete={handleDelete} />;
  }
  if (route === "print") {
    return <PrintPreview project={project} onClose={() => setRoute("editor")} />;
  }
  return (
    <div className="app">
      <TopBar
        title={project.title}
        onTitle={(t) => update({ title: t })}
        onPrint={() => setRoute("print")}
        onHome={goHome}
      />
      <Toolbar exec={exec} queryActive={queryActive} applyHeading={applyHeading} applyFontSize={applyFontSize} />
      <div className="workspace">
        <Rail project={project} update={update} updateFolds={updateFolds} />
        <Canvas
          project={project}
          update={update}
          onFocusEditor={setActiveEditor}
          selectedFoldId={selectedFoldId}
          onSelectFold={setSelectedFoldId}
          onMoveFold={moveFold}
        />
      </div>
    </div>
  );
}
