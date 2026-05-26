// Editing canvas — front and back pages side by side, with draggable fold guides.
import { useCallback, useEffect, useRef, useState } from "react";
import type { Editor } from "@tiptap/react";
import type { Doc, Fold, Unit } from "../lib/types";
import { fmt, round2 } from "../lib/templates";
import { Editable } from "./Editable";

type ZoomMode = "fit" | "fill" | "zoom";

const MIN_PPI = 20;
const MAX_PPI = 480;
const ZOOM_STEPS = [0.5, 0.75, 1, 1.25, 1.5, 2];

interface CanvasProps {
  project: Doc;
  update: (patch: Partial<Doc>) => void;
  onFocusEditor: (editor: Editor) => void;
  onInitEditor: (editor: Editor) => void;
  selectedFoldId: string | null;
  onSelectFold: (id: string | null) => void;
  onMoveFold: (foldId: string, newPos: number) => void;
}

export function Canvas({ project, update, onFocusEditor, onInitEditor, selectedFoldId, onSelectFold, onMoveFold }: CanvasProps) {
  const { pageW, pageH, folds, frontHtml, backHtml, unit } = project;

  // The on-screen scale (pixels per inch).
  //  • fit  — both pages fit fully in view (default; current behavior)
  //  • fill — both pages fill the available width; user scrolls vertically
  //  • zoom — explicit scale set by the user (popup / +/- / Ctrl+wheel)
  const containerRef = useRef<HTMLDivElement>(null);
  const [zoomMode, setZoomMode] = useState<ZoomMode>("fit");
  const [customPpi, setCustomPpi] = useState(96);
  const [autoPpi, setAutoPpi] = useState(96);
  const ppi = zoomMode === "zoom" ? customPpi : autoPpi;
  // The hijack handlers and +/- buttons scale from the *current effective*
  // ppi, so the transition from fit/fill into zoom feels continuous. A ref
  // avoids re-binding the listeners on every ppi change.
  const ppiRef = useRef(ppi);
  ppiRef.current = ppi;

  // Per-side overflow flags. Pages measure their own content and report up here
  // so the warning bar can summarize doc-level issues in one place. Stable
  // useState setters are passed down — no extra useCallback wrapping needed.
  const [frontOverflow, setFrontOverflow] = useState(false);
  const [backOverflow, setBackOverflow] = useState(false);
  const anyOverflow = frontOverflow || backOverflow;
  const onFrontOverflow = useCallback((v: boolean) => setFrontOverflow(v), []);
  const onBackOverflow = useCallback((v: boolean) => setBackOverflow(v), []);

  useEffect(() => {
    function recompute() {
      if (!containerRef.current) return;
      const r = containerRef.current.getBoundingClientRect();
      // Side-by-side: divide available width by 2 pages, full height per page.
      const availW = (r.width - 100) / 2;
      const availH = r.height - 140;
      const sW = availW / pageW;
      const sH = availH / pageH;
      // Fill uses width only; fit (and the value cached for zoom-mode toggle)
      // uses both axes.
      const p = zoomMode === "fill" ? sW : Math.min(sW, sH);
      setAutoPpi(Math.max(MIN_PPI, Math.min(p, MAX_PPI)));
    }
    recompute();
    const ro = new ResizeObserver(recompute);
    if (containerRef.current) ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, [pageW, pageH, zoomMode]);

  // Hijack browser zoom while the editor is mounted: Ctrl/Cmd + wheel / = / -
  // scales only the document; Ctrl/Cmd + 0 resets to Fit. Surrounding chrome
  // (toolbar, rail, topbar) stays at 100%.
  useEffect(() => {
    const adjust = (factor: number) => {
      const next = Math.max(MIN_PPI, Math.min(MAX_PPI, ppiRef.current * factor));
      setCustomPpi(next);
      setZoomMode("zoom");
    };
    const onWheel = (e: WheelEvent) => {
      if (!(e.ctrlKey || e.metaKey)) return;
      e.preventDefault();
      adjust(e.deltaY > 0 ? 0.9 : 1.1);
    };
    const onKey = (e: KeyboardEvent) => {
      if (!(e.ctrlKey || e.metaKey)) return;
      if (e.key === "=" || e.key === "+") { e.preventDefault(); adjust(1.1); }
      else if (e.key === "-") { e.preventDefault(); adjust(0.9); }
      else if (e.key === "0") { e.preventDefault(); setZoomMode("fit"); }
    };
    window.addEventListener("wheel", onWheel, { passive: false });
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("wheel", onWheel);
      window.removeEventListener("keydown", onKey);
    };
  }, []);

  const stepZoom = (factor: number) => {
    const next = Math.max(MIN_PPI, Math.min(MAX_PPI, ppiRef.current * factor));
    setCustomPpi(next);
    setZoomMode("zoom");
  };
  const zoomTo = (p: number) => {
    setCustomPpi(Math.max(MIN_PPI, Math.min(MAX_PPI, p)));
    setZoomMode("zoom");
  };

  return (
    <div className="canvas-area" ref={containerRef}>
      {anyOverflow && (
        <div className="canvas-warning-bar" role="status">
          <span className="warning-dot" aria-hidden="true">!</span>
          Document is being clipped — too much content for the page size.
        </div>
      )}
      <div className="canvas-inner">
        <div className="page-stack">
          <div className="page-block">
            <Page
              key={project.id + "-front"}
              ppi={ppi}
              pageW={pageW}
              pageH={pageH}
              folds={folds}
              unit={unit}
              html={frontHtml}
              onChangeHtml={(h) => update({ frontHtml: h })}
              onFocusEditor={onFocusEditor}
              onInitEditor={onInitEditor}
              placeholder="Click to design the front…"
              selectedFoldId={selectedFoldId}
              onSelectFold={onSelectFold}
              onMoveFold={onMoveFold}
              onOverflowChange={onFrontOverflow}
              sideLabel="Front"
            />
          </div>
          <div className="page-block">
            <Page
              key={project.id + "-back"}
              ppi={ppi}
              pageW={pageW}
              pageH={pageH}
              folds={folds}
              unit={unit}
              html={backHtml}
              onChangeHtml={(h) => update({ backHtml: h })}
              onFocusEditor={onFocusEditor}
              onInitEditor={onInitEditor}
              placeholder="Click to design the back…"
              selectedFoldId={selectedFoldId}
              onSelectFold={onSelectFold}
              onMoveFold={onMoveFold}
              onOverflowChange={onBackOverflow}
              sideLabel="Back"
            />
          </div>
        </div>

        <div className="page-meta">
          <span>
            <b>{fmt(pageW, unit)}</b> × <b>{fmt(pageH, unit)}</b>
          </span>
          {folds.length > 0 && (
            <span>
              {" "}· {folds.length} fold{folds.length === 1 ? "" : "s"}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

interface PageProps {
  ppi: number;
  pageW: number;
  pageH: number;
  folds: Fold[];
  html: string;
  onChangeHtml: (html: string) => void;
  onFocusEditor: (editor: Editor) => void;
  onInitEditor: (editor: Editor) => void;
  unit: Unit;
  placeholder?: string;
  selectedFoldId: string | null;
  onSelectFold: (id: string | null) => void;
  onMoveFold: (foldId: string, newPos: number) => void;
  onOverflowChange?: (overflow: boolean) => void;
  sideLabel?: string;
}

function Page({
  ppi,
  pageW,
  pageH,
  folds,
  html,
  onChangeHtml,
  onFocusEditor,
  onInitEditor,
  unit,
  placeholder,
  selectedFoldId,
  onSelectFold,
  onMoveFold,
  onOverflowChange,
  sideLabel,
}: PageProps) {
  // The page grows vertically to enclose its content (min = chosen height), so
  // what you design is never clipped and matches the print output. naturalH is
  // in natural px (96/in); the page box is that scaled to the on-screen ppi.
  const naturalRef = useRef<HTMLDivElement>(null);
  const [naturalH, setNaturalH] = useState(pageH * 96);
  useEffect(() => {
    const root = naturalRef.current;
    if (!root) return;
    let ro: ResizeObserver | null = null;
    let raf = 0;
    const attach = () => {
      const pm = root.querySelector(".editable") as HTMLElement | null;
      if (!pm) {
        raf = requestAnimationFrame(attach);
        return;
      }
      const measure = () => setNaturalH(Math.max(pageH * 96, pm.scrollHeight));
      measure();
      ro = new ResizeObserver(measure);
      ro.observe(pm);
    };
    raf = requestAnimationFrame(attach);
    return () => {
      cancelAnimationFrame(raf);
      ro?.disconnect();
    };
  }, [pageH]);

  const wPx = pageW * ppi;
  const hPx = (naturalH * ppi) / 96;
  const pageRef = useRef<HTMLDivElement>(null);

  const startDrag = (e: React.MouseEvent, fold: Fold) => {
    e.preventDefault();
    e.stopPropagation();
    const pageEl = pageRef.current;
    if (!pageEl) return;
    const rect = pageEl.getBoundingClientRect();
    const isH = fold.axis === "h";
    const maxIn = isH ? pageH : pageW;

    const move = (ev: MouseEvent) => {
      const v = isH ? (ev.clientY - rect.top) / ppi : (ev.clientX - rect.left) / ppi;
      const clamped = Math.max(0, Math.min(maxIn, v));
      onMoveFold(fold.id, round2(clamped));
    };
    const up = () => {
      window.removeEventListener("mousemove", move);
      window.removeEventListener("mouseup", up);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
    window.addEventListener("mousemove", move);
    window.addEventListener("mouseup", up);
    document.body.style.cursor = isH ? "ns-resize" : "ew-resize";
    document.body.style.userSelect = "none";
  };

  const overflow = naturalH > pageH * 96;
  useEffect(() => {
    onOverflowChange?.(overflow);
  }, [overflow, onOverflowChange]);

  return (
    <div className="page-wrap">
      {sideLabel && <div className="page-side-label">{sideLabel}</div>}
      <div className="page" style={{ width: wPx, height: hPx }} ref={pageRef}>
        <div
          className="page-natural"
          ref={naturalRef}
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: pageW * 96,
            height: naturalH,
            transform: `scale(${ppi / 96})`,
            transformOrigin: "top left",
          }}
        >
          <Editable
            html={html}
            onChange={onChangeHtml}
            onFocusEditor={onFocusEditor}
            onInitEditor={onInitEditor}
            placeholder={placeholder || "Click to start designing this side…"}
          />
          {overflow && (
            <div
              className="overflow-marker"
              style={{ top: pageH * 96, height: naturalH - pageH * 96 }}
              title={`Content below ${fmt(pageH, unit)} will be clipped when printed`}
            />
          )}
        </div>
        {/* Fold lines on top, in display coordinates */}
        {folds.map((f) => {
          const isH = f.axis === "h";
          const style: React.CSSProperties = isH ? { top: f.position * ppi } : { left: f.position * ppi };
          const selected = selectedFoldId === f.id;
          return (
            <div key={f.id} className={`fold-line ${isH ? "h" : "v"} ${selected ? "selected" : ""}`} style={style}>
              <span
                className="fold-label"
                onMouseDown={(e) => {
                  // Always select first; if already selected, the handle handles drag.
                  e.stopPropagation();
                  if (!selected) onSelectFold(f.id);
                  else onSelectFold(null);
                }}
                role="button"
                tabIndex={0}
              >
                FOLD
              </span>
              {selected && (
                <span
                  className="fold-drag"
                  title={isH ? "Drag to move vertically" : "Drag to move horizontally"}
                  onMouseDown={(e) => startDrag(e, f)}
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                    {isH ? (
                      <g>
                        <circle cx="9" cy="6" r="1.6" /><circle cx="15" cy="6" r="1.6" />
                        <circle cx="9" cy="12" r="1.6" /><circle cx="15" cy="12" r="1.6" />
                        <circle cx="9" cy="18" r="1.6" /><circle cx="15" cy="18" r="1.6" />
                      </g>
                    ) : (
                      <g>
                        <circle cx="6" cy="9" r="1.6" /><circle cx="12" cy="9" r="1.6" /><circle cx="18" cy="9" r="1.6" />
                        <circle cx="6" cy="15" r="1.6" /><circle cx="12" cy="15" r="1.6" /><circle cx="18" cy="15" r="1.6" />
                      </g>
                    )}
                  </svg>
                </span>
              )}
              {selected && <span className="fold-pos">{fmt(f.position, unit)}</span>}
            </div>
          );
        })}
      </div>
    </div>
  );
}
