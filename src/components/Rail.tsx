// Left rail — dimensions, fold-line list, and page templates.
import type { Doc, Fold, FoldAxis, Template, Unit } from "../lib/types";
import { TEMPLATES, fmt, inToMm, mmToIn, round2 } from "../lib/templates";
import { Icon } from "./icons";

interface RailProps {
  project: Doc;
  update: (patch: Partial<Doc>) => void;
  updateFolds: (folds: Fold[]) => void;
  open: boolean;
  onClose: () => void;
  onHome: () => void;
}

export function Rail({ project, update, updateFolds, open, onClose, onHome }: RailProps) {
  const { templateId, pageW, pageH, unit, folds } = project;

  const setTemplate = (t: Template) => {
    update({
      templateId: t.id,
      pageW: t.w,
      pageH: t.h,
      folds: (t.folds || []).map((f, i) => ({
        id: "f" + Math.random().toString(36).slice(2, 7) + i,
        ...f,
      })),
    });
  };

  const setCustom = (w: number, h: number) => {
    update({ templateId: "custom", pageW: w, pageH: h });
  };

  const setUnit = (u: Unit) => update({ unit: u });

  const addFold = (axis: FoldAxis) => {
    const id = "f" + Math.random().toString(36).slice(2, 7);
    const pos = axis === "h" ? pageH / 2 : pageW / 2;
    updateFolds([...folds, { id, axis, position: round2(pos) }]);
  };
  const updateFold = (id: string, patch: Partial<Fold>) => {
    updateFolds(folds.map((f) => (f.id === id ? { ...f, ...patch } : f)));
  };
  const removeFold = (id: string) => updateFolds(folds.filter((f) => f.id !== id));

  return (
    <>
      <div className={`rail-scrim ${open ? "is-open" : ""}`} onClick={onClose} aria-hidden="true" />
      <div className={`rail ${open ? "is-open" : ""}`}>
        <div className="rail-mobile-head">
          <button className="rail-mobile-home" onClick={() => { onClose(); onHome(); }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 12l9-9 9 9" />
              <path d="M5 10v10h14V10" />
            </svg>
            Back to documents
          </button>
          <button className="rail-mobile-close" onClick={onClose} aria-label="Close menu">
            <Icon.X />
          </button>
        </div>
      {/* DIMENSIONS */}
      <div className="rail-section">
        <div className="rail-h">
          Dimensions
          <div className="unit-toggle">
            <button className={unit === "in" ? "active" : ""} onClick={() => setUnit("in")}>in</button>
            <button className={unit === "mm" ? "active" : ""} onClick={() => setUnit("mm")}>mm</button>
          </div>
        </div>
        <DimInputs pageW={pageW} pageH={pageH} unit={unit} onChange={(w, h) => setCustom(w, h)} />
      </div>

      {/* FOLD LINES */}
      <div className="rail-section">
        <div className="rail-h">Fold lines</div>
        {folds.length === 0 && (
          <div className="empty-hint">
            Add fold lines to mark where the printed page folds. Faint guides will appear on the canvas, and arrows will be printed on the cut edges.
          </div>
        )}
        <div className="fold-list">
          {folds.map((f) => (
            <FoldRow
              key={f.id}
              f={f}
              pageW={pageW}
              pageH={pageH}
              unit={unit}
              onChange={(patch) => updateFold(f.id, patch)}
              onRemove={() => removeFold(f.id)}
            />
          ))}
        </div>
        <div style={{ display: "flex", gap: 4 }}>
          <button className="add-fold" onClick={() => addFold("h")}>
            <Icon.Plus /> Horizontal fold
          </button>
          <button className="add-fold" onClick={() => addFold("v")}>
            <Icon.Plus /> Vertical fold
          </button>
        </div>
      </div>

      {/* TEMPLATE */}
      <div className="rail-section">
        <div className="rail-h">
          Page templates
          <button className="rail-h-action" onClick={() => update({ templateId: "custom" })}>
            Custom
          </button>
        </div>
        <div className="size-grid">
          {TEMPLATES.map((t) => (
            <SizeCard key={t.id} t={t} active={templateId === t.id} unit={unit} onClick={() => setTemplate(t)} />
          ))}
        </div>
      </div>
      </div>
    </>
  );
}

interface SizeCardProps {
  t: Template;
  active: boolean;
  unit: Unit;
  onClick: () => void;
}

function SizeCard({ t, active, unit, onClick }: SizeCardProps) {
  // Thumb: scale so the largest dim ~ 64px, keeping aspect; render fold lines too.
  const maxDim = 64;
  const ratio = t.w / t.h;
  let tw: number;
  let th: number;
  if (ratio >= 1) {
    tw = maxDim;
    th = maxDim / ratio;
  } else {
    th = maxDim;
    tw = maxDim * ratio;
  }
  return (
    <button className={`size-card ${active ? "active" : ""}`} onClick={onClick}>
      <div className="size-thumb" style={{ height: maxDim + 4 }}>
        <div className="rect" style={{ width: tw, height: th, position: "relative" }}>
          {(t.folds || []).map((f, i) => {
            const isH = f.axis === "h";
            const pct = isH ? (f.position / t.h) * 100 : (f.position / t.w) * 100;
            return (
              <span
                key={i}
                style={{
                  position: "absolute",
                  ...(isH
                    ? { left: 0, right: 0, top: `${pct}%`, borderTop: "1px dashed currentColor", opacity: 0.5 }
                    : { top: 0, bottom: 0, left: `${pct}%`, borderLeft: "1px dashed currentColor", opacity: 0.5 }),
                }}
              />
            );
          })}
        </div>
      </div>
      <div className="size-name">{t.name}</div>
      <div className="size-dims">
        {t.sub ? <>{t.sub} · </> : null}
        {fmt(t.w, unit)} × {fmt(t.h, unit)}
      </div>
    </button>
  );
}

interface DimInputsProps {
  pageW: number;
  pageH: number;
  unit: Unit;
  onChange: (w: number, h: number) => void;
}

function DimInputs({ pageW, pageH, unit, onChange }: DimInputsProps) {
  const toDisplay = (v: number) => (unit === "mm" ? Math.round(inToMm(v)) : round2(v));
  const fromDisplay = (v: string) => (unit === "mm" ? mmToIn(parseFloat(v) || 0) : parseFloat(v) || 0);

  return (
    <div className="custom-row">
      <div className="dim-input">
        <input
          type="number"
          step={unit === "mm" ? "1" : "0.1"}
          value={toDisplay(pageW)}
          onChange={(e) => onChange(fromDisplay(e.target.value), pageH)}
        />
        <span className="unit">{unit === "mm" ? "mm" : "in"}</span>
      </div>
      <span className="x">×</span>
      <div className="dim-input">
        <input
          type="number"
          step={unit === "mm" ? "1" : "0.1"}
          value={toDisplay(pageH)}
          onChange={(e) => onChange(pageW, fromDisplay(e.target.value))}
        />
        <span className="unit">{unit === "mm" ? "mm" : "in"}</span>
      </div>
    </div>
  );
}

interface FoldRowProps {
  f: Fold;
  pageW: number;
  pageH: number;
  unit: Unit;
  onChange: (patch: Partial<Fold>) => void;
  onRemove: () => void;
}

function FoldRow({ f, pageW, pageH, unit, onChange, onRemove }: FoldRowProps) {
  const max = f.axis === "h" ? pageH : pageW;
  const toDisplay = (v: number) => (unit === "mm" ? Math.round(inToMm(v)) : round2(v));
  const fromDisplay = (v: string) => (unit === "mm" ? mmToIn(parseFloat(v) || 0) : parseFloat(v) || 0);

  return (
    <div className="fold-row">
      <span className="fold-icon">{f.axis === "h" ? <Icon.HFold /> : <Icon.VFold />}</span>
      <select
        className="tb-select"
        value={f.axis}
        onChange={(e) => {
          const axis = e.target.value as FoldAxis;
          onChange({ axis, position: round2((axis === "h" ? pageH : pageW) / 2) });
        }}
      >
        <option value="h">Horizontal</option>
        <option value="v">Vertical</option>
      </select>
      <div className="pos-input">
        <input
          type="number"
          step={unit === "mm" ? "1" : "0.1"}
          min="0"
          max={toDisplay(max)}
          value={toDisplay(f.position)}
          onChange={(e) => {
            const v = Math.max(0, Math.min(max, fromDisplay(e.target.value)));
            onChange({ position: round2(v) });
          }}
        />
        <span className="unit">{unit === "mm" ? "mm" : "in"}</span>
      </div>
      <button className="remove" onClick={onRemove} title="Remove fold">
        <Icon.X />
      </button>
    </div>
  );
}
