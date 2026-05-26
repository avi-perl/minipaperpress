// Editing canvas — front and back pages side by side, with draggable fold guides.
import { useEffect, useRef, useState } from "react";
import type { Doc, Fold, Unit } from "../lib/types";
import { fmt, round2 } from "../lib/templates";
import { Editable } from "./Editable";

interface CanvasProps {
  project: Doc;
  update: (patch: Partial<Doc>) => void;
  onFocusEditor: (el: HTMLElement) => void;
  selectedFoldId: string | null;
  onSelectFold: (id: string | null) => void;
  onMoveFold: (foldId: string, newPos: number) => void;
}

export function Canvas({ project, update, onFocusEditor, selectedFoldId, onSelectFold, onMoveFold }: CanvasProps) {
  const { pageW, pageH, folds, frontHtml, backHtml, unit } = project;

  // The on-screen scale (pixels per inch). Larger pages get scaled down to fit.
  const containerRef = useRef<HTMLDivElement>(null);
  const [ppi, setPpi] = useState(96);

  useEffect(() => {
    function fit() {
      if (!containerRef.current) return;
      const r = containerRef.current.getBoundingClientRect();
      // Side-by-side: divide available width by 2 pages, full height per page.
      const availW = (r.width - 100) / 2;
      const availH = r.height - 140;
      const sW = availW / pageW;
      const sH = availH / pageH;
      const fitPpi = Math.min(sW, sH);
      setPpi(Math.max(60, Math.min(fitPpi, 200)));
    }
    fit();
    const ro = new ResizeObserver(fit);
    if (containerRef.current) ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, [pageW, pageH]);

  return (
    <div className="canvas-area" ref={containerRef}>
      <div className="canvas-inner">
        <div className="page-stack">
          <div className="page-block">
            <Page
              ppi={ppi}
              pageW={pageW}
              pageH={pageH}
              folds={folds}
              unit={unit}
              html={frontHtml}
              onChangeHtml={(h) => update({ frontHtml: h })}
              onFocusEditor={onFocusEditor}
              placeholder="Click to design the front…"
              selectedFoldId={selectedFoldId}
              onSelectFold={onSelectFold}
              onMoveFold={onMoveFold}
              sideLabel="Front"
            />
          </div>
          <div className="page-block">
            <Page
              ppi={ppi}
              pageW={pageW}
              pageH={pageH}
              folds={folds}
              unit={unit}
              html={backHtml}
              onChangeHtml={(h) => update({ backHtml: h })}
              onFocusEditor={onFocusEditor}
              placeholder="Click to design the back…"
              selectedFoldId={selectedFoldId}
              onSelectFold={onSelectFold}
              onMoveFold={onMoveFold}
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
  onFocusEditor: (el: HTMLElement) => void;
  unit: Unit;
  placeholder?: string;
  selectedFoldId: string | null;
  onSelectFold: (id: string | null) => void;
  onMoveFold: (foldId: string, newPos: number) => void;
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
  unit,
  placeholder,
  selectedFoldId,
  onSelectFold,
  onMoveFold,
  sideLabel,
}: PageProps) {
  const wPx = pageW * ppi;
  const hPx = pageH * ppi;
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

  return (
    <div className="page-wrap">
      {sideLabel && <div className="page-side-label">{sideLabel}</div>}
      <div className="page" style={{ width: wPx, height: hPx }} ref={pageRef}>
        <div
          className="page-natural"
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: pageW * 96,
            height: pageH * 96,
            transform: `scale(${ppi / 96})`,
            transformOrigin: "top left",
          }}
        >
          <Editable
            html={html}
            onChange={onChangeHtml}
            onFocusEditor={onFocusEditor}
            placeholder={placeholder || "Click to start designing this side…"}
          />
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
