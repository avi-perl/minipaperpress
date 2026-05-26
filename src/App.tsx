// Main app. URL-driven routing:
//   /        → Home
//   /e/<id>  → Editor for that document
// Print preview is an in-page sub-state of the editor (it doesn't add to history).
// Incoming shared files land at /#doc=<base64url>, which is imported on startup
// and replaced with /e/<id>.
import { useEffect, useState } from "react";
import type { Editor } from "@tiptap/react";
import type { Doc, Fold, Starter, Store } from "./lib/types";
import { loadStore, newDocFromTemplate, saveStore, updateDoc, deleteDoc, importIncomingDoc } from "./lib/storage";
import { templateById } from "./lib/templates";
import { withDevDoc, stripDevDoc } from "./lib/devDoc";
import { HomePage } from "./components/HomePage";
import { TopBar } from "./components/TopBar";
import { Toolbar } from "./components/Toolbar";
import { Canvas } from "./components/Canvas";
import { Rail } from "./components/Rail";
import { PrintPreview } from "./components/PrintPreview";
import { useRoute, navigate, replace } from "./lib/router";
import { decodeDocPayload } from "./lib/shareFile";

interface CreateArg {
  templateId?: string;
  starter?: Starter;
}

export default function App() {
  const [store, setStore] = useState<Store>(() => withDevDoc(loadStore()));
  const [route, setRoute] = useRoute();
  const [printOpen, setPrintOpen] = useState(false);
  const [activeEditor, setActiveEditor] = useState<Editor | null>(null);
  const [selectedFoldId, setSelectedFoldId] = useState<string | null>(null);
  const [railOpen, setRailOpen] = useState(false);
  // Mobile-only: hide top bar on scroll-down, show on scroll-up. Always true at
  // viewport top so users see chrome before they scroll. The Canvas owns the
  // scrolling container; we find it by class.
  const [topBarHidden, setTopBarHidden] = useState(false);

  // Persist store on change (the dev sample document is never written to storage)
  useEffect(() => {
    saveStore(stripDevDoc(store));
  }, [store]);

  // Handle a shared document landing at /#doc=<payload>. Decode, persist, and
  // navigate to /e/<id>. Runs once on mount; the hash is replaced so a second
  // StrictMode pass (or any later reload) won't re-import.
  useEffect(() => {
    const hash = window.location.hash;
    if (!hash.startsWith("#doc=")) return;
    const payload = hash.slice("#doc=".length);
    try {
      const incoming = decodeDocPayload(payload);
      const current = loadStore();
      const { store: nextStore, id } = importIncomingDoc(current, incoming);
      setStore(withDevDoc(nextStore));
      replace(setRoute, { kind: "editor", id });
    } catch (e) {
      // Bad payload — drop the hash and fall through to wherever the path points.
      window.history.replaceState({}, "", window.location.pathname);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Close the print overlay if the user navigates away (back/forward).
  useEffect(() => {
    if (route.kind !== "editor") setPrintOpen(false);
  }, [route]);

  // Close the rail overlay when leaving the editor route.
  useEffect(() => {
    if (route.kind !== "editor") setRailOpen(false);
  }, [route]);

  // Auto-hide the top bar based on scroll direction inside the canvas-area.
  // Only relevant on mobile (CSS pins the bar fixed there), but the listener
  // is harmless on desktop.
  useEffect(() => {
    if (route.kind !== "editor") return;
    const el = document.querySelector(".canvas-area") as HTMLElement | null;
    if (!el) return;
    let lastY = el.scrollTop;
    let ticking = false;
    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        const y = el.scrollTop;
        const dy = y - lastY;
        if (y < 24) setTopBarHidden(false);
        else if (dy > 6) setTopBarHidden(true);
        else if (dy < -6) setTopBarHidden(false);
        lastY = y;
        ticking = false;
      });
    };
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, [route, printOpen]);

  // Lock body scroll while the rail overlay is open on mobile.
  useEffect(() => {
    if (!railOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, [railOpen]);

  const activeId = route.kind === "editor" ? route.id : null;
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
    setActiveEditor(null);
    navigate(setRoute, { kind: "editor", id });
  };
  const goHome = () => {
    setActiveEditor(null);
    navigate(setRoute, { kind: "home" });
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
    setActiveEditor(null);
    const tmpDoc = factory();
    setStore((s) => ({
      documents: { ...s.documents, [tmpDoc.id]: tmpDoc },
      order: [tmpDoc.id, ...s.order],
    }));
    navigate(setRoute, { kind: "editor", id: tmpDoc.id });
  };

  const handleDelete = (id: string) => {
    setStore((s) => deleteDoc(s, id));
  };

  // Bind the toolbar to an editor as soon as one is created (defaults to the
  // front page) so the toolbar is live on arrival. Focusing a page switches it.
  // Replace any stale/destroyed reference (e.g. after StrictMode remounts).
  const registerEditor = (editor: Editor) => {
    setActiveEditor((prev) => (prev && !prev.isDestroyed ? prev : editor));
  };

  // ===== render =====
  if (route.kind === "home" || !project) {
    return <HomePage store={store} onOpen={openDoc} onCreate={createDocAndOpen} onDelete={handleDelete} />;
  }
  if (printOpen) {
    return <PrintPreview project={project} onClose={() => setPrintOpen(false)} />;
  }
  return (
    <div className={`app ${topBarHidden ? "topbar-hidden" : ""}`}>
      <TopBar
        title={project.title}
        onTitle={(t) => update({ title: t })}
        onPrint={() => setPrintOpen(true)}
        onHome={goHome}
        onOpenMenu={() => setRailOpen(true)}
      />
      <Toolbar editor={activeEditor} />
      <div className="workspace">
        <Rail
          project={project}
          update={update}
          updateFolds={updateFolds}
          open={railOpen}
          onClose={() => setRailOpen(false)}
          onHome={goHome}
        />
        <Canvas
          project={project}
          update={update}
          onFocusEditor={setActiveEditor}
          onInitEditor={registerEditor}
          selectedFoldId={selectedFoldId}
          onSelectFold={setSelectedFoldId}
          onMoveFold={moveFold}
        />
      </div>
    </div>
  );
}
