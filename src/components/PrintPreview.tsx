// Print preview — composes the 8.5×11 sheet(s) with as many copies as fit.
import { useEffect, useMemo, useRef, useState } from "react";
import type { Doc, Fold, Layout } from "../lib/types";
import { computeLayout, fmt, round2 } from "../lib/templates";
import { Icon } from "./icons";

const SHEET_W_IN = 8.5;
const SHEET_H_IN = 11;

interface PrintPreviewProps {
  project: Doc;
  onClose: () => void;
}

export function PrintPreview({ project, onClose }: PrintPreviewProps) {
  const { pageW, pageH, folds, unit } = project;
  const [margin, setMargin] = useState(0.25); // inches
  const [gap, setGap] = useState(0.15);
  const [showFoldArrows, setShowFoldArrows] = useState(true);
  const [showCutBorder, setShowCutBorder] = useState(true);
  const [shareOpen, setShareOpen] = useState(false);
  const [pdfHintOpen, setPdfHintOpen] = useState(false);

  const layout = useMemo(
    () => computeLayout(pageW, pageH, SHEET_W_IN, SHEET_H_IN, margin, gap),
    [pageW, pageH, margin, gap],
  );

  // Scale = display-px per inch. Compute by fitting two sheets side-by-side in the stage.
  const stageRef = useRef<HTMLDivElement>(null);
  const [ppi, setPpi] = useState(40);

  useEffect(() => {
    function fit() {
      if (!stageRef.current) return;
      const r = stageRef.current.getBoundingClientRect();
      const padding = 64; // inner padding + labels + gaps
      // Two sheets side-by-side with gap between
      const sheetsAcross = 2;
      const totalWIn = SHEET_W_IN * sheetsAcross + 0.6; // 0.6in gutter
      const availW = r.width - padding;
      const availH = r.height - padding;
      const ppiW = availW / totalWIn;
      const ppiH = availH / SHEET_H_IN;
      setPpi(Math.max(20, Math.min(ppiW, ppiH, 110)));
    }
    fit();
    const ro = new ResizeObserver(fit);
    if (stageRef.current) ro.observe(stageRef.current);
    return () => ro.disconnect();
  }, []);

  const handlePrint = () => window.print();
  const handleSavePdf = () => {
    setPdfHintOpen(true);
    setTimeout(() => {
      window.print();
      setPdfHintOpen(false);
    }, 350);
  };

  return (
    <div className="print-page">
      <div className="print-topbar no-print">
        <div className="print-topbar-l">
          <button className="modal-close" onClick={onClose} title="Back to editor">
            <Icon.X />
          </button>
          <div className="modal-title">Share & Print</div>
          <div className="modal-sub">
            {layout.count} {layout.count === 1 ? "copy" : "copies"} per sheet
            {layout.rotated ? " · rotated 90°" : ""}
          </div>
        </div>
        <div className="print-topbar-r">
          <button className="btn btn-outline" onClick={onClose}>Back to editor</button>
        </div>
      </div>

      <div className="print-body">
        {/* Side options */}
        <div className="print-side no-print">
          <div className="rail-h" style={{ marginTop: 0 }}>Actions</div>
          <div className="action-list">
            <ActionButton
              icon={
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <path d="M14 2v6h6" />
                  <path d="M9 14h6" />
                  <path d="M9 18h6" />
                </svg>
              }
              title="Save as PDF"
              subtitle="Choose ‘Save as PDF’ in the dialog"
              onClick={handleSavePdf}
            />
            <ActionButton icon={<Icon.Print />} title="Print" subtitle="Send to your printer" primary onClick={handlePrint} />
            <ActionButton
              icon={
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="18" cy="5" r="3" />
                  <circle cx="6" cy="12" r="3" />
                  <circle cx="18" cy="19" r="3" />
                  <line x1="8.6" y1="13.5" x2="15.4" y2="17.5" />
                  <line x1="15.4" y1="6.5" x2="8.6" y2="10.5" />
                </svg>
              }
              title="Share for editing"
              subtitle="Invite someone with a link"
              onClick={() => setShareOpen(true)}
            />
          </div>

          <div className="rail-h">Sheet</div>
          <div className="print-stats">
            <div className="print-stat">
              <span className="n">{layout.count}</span>
              <span className="l">per sheet</span>
            </div>
            <div className="print-stat">
              <span className="n">{layout.cols}×{layout.rows}</span>
              <span className="l">grid</span>
            </div>
          </div>

          <div className="kv">
            <div className="k">Paper</div><div className="v">8.5 × 11 in</div>
            <div className="k">Card</div><div className="v">{fmt(pageW, unit)} × {fmt(pageH, unit)}</div>
            <div className="k">Orientation</div><div className="v">{layout.rotated ? "rotated 90°" : "upright"}</div>
            <div className="k">Folds</div><div className="v">{folds.length || "none"}</div>
          </div>

          <div className="rail-h">Spacing</div>
          <SliderRow label="Margin" value={margin} min={0} max={0.75} step={0.05} onChange={setMargin} format={(v) => round2(v) + "″"} />
          <SliderRow label="Gap" value={gap} min={0} max={0.5} step={0.05} onChange={setGap} format={(v) => round2(v) + "″"} />

          <div className="rail-h">Marks</div>
          <ToggleRow label="Cut border" checked={showCutBorder} onChange={setShowCutBorder} />
          <ToggleRow label="Fold arrows" checked={showFoldArrows} onChange={setShowFoldArrows} />

          {layout.count === 0 && (
            <div className="empty-hint">
              Card too large for the chosen margins. Reduce margin or pick a smaller template.
            </div>
          )}
        </div>

        {/* Stage */}
        <div className="print-stage" ref={stageRef}>
          <div className="sheets-row">
            <SheetCol label="Front" side="front" project={project} layout={layout} ppi={ppi} showCutBorder={showCutBorder} showFoldArrows={showFoldArrows} />
            <SheetCol label="Back" side="back" project={project} layout={layout} ppi={ppi} showCutBorder={showCutBorder} showFoldArrows={showFoldArrows} />
          </div>
        </div>
      </div>

      {shareOpen && <ShareDialog project={project} onClose={() => setShareOpen(false)} />}
      {pdfHintOpen && (
        <div className="pdf-hint no-print">
          In the dialog that opens, choose <b>Save as PDF</b> as the destination.
        </div>
      )}
    </div>
  );
}

interface ActionButtonProps {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  onClick: () => void;
  primary?: boolean;
}

function ActionButton({ icon, title, subtitle, onClick, primary }: ActionButtonProps) {
  return (
    <button className={"action-btn" + (primary ? " primary" : "")} onClick={onClick}>
      <span className="action-icon">{icon}</span>
      <span className="action-text">
        <span className="action-title">{title}</span>
        <span className="action-sub">{subtitle}</span>
      </span>
    </button>
  );
}

interface ShareDialogProps {
  project: Doc;
  onClose: () => void;
}

function ShareDialog({ project, onClose }: ShareDialogProps) {
  const link = `https://minipaperpress.app/d/${project.id}`;
  const [copied, setCopied] = useState(false);
  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch (e) {
      /* ignore */
    }
  };
  const downloadJson = () => {
    const blob = new Blob([JSON.stringify(project, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = (project.title || "document").replace(/[^a-z0-9-_]+/gi, "_") + ".ppfile.json";
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };
  return (
    <div className="share-backdrop no-print" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="share-dialog" role="dialog" aria-label="Share document">
        <div className="share-head">
          <div className="share-title">Share “{project.title}”</div>
          <button className="modal-close" onClick={onClose}><Icon.X /></button>
        </div>
        <div className="share-section">
          <div className="share-section-h">Anyone with the link can edit</div>
          <div className="share-link-row">
            <input className="share-link" readOnly value={link} onFocus={(e) => e.target.select()} />
            <button className="btn btn-primary" onClick={copyLink}>
              {copied ? "Copied" : "Copy link"}
            </button>
          </div>
        </div>
        <div className="share-section">
          <div className="share-section-h">Or send a file</div>
          <p className="share-p">Download a copy that someone else can open in MiniPaperPress.</p>
          <button className="btn btn-outline" onClick={downloadJson}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: 6 }}>
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            Download .ppfile
          </button>
        </div>
      </div>
    </div>
  );
}

interface SliderRowProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (value: number) => void;
  format: (value: number) => string;
}

function SliderRow({ label, value, min, max, step, onChange, format }: SliderRowProps) {
  return (
    <div className="slider-row">
      <div className="slider-row-h">
        <span>{label}</span>
        <span className="v">{format(value)}</span>
      </div>
      <input type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(parseFloat(e.target.value))} />
    </div>
  );
}

interface ToggleRowProps {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}

function ToggleRow({ label, checked, onChange }: ToggleRowProps) {
  return (
    <label className="opt-row" style={{ cursor: "pointer" }}>
      <span>{label}</span>
      <span className="switch">
        <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
        <span className="track" />
        <span className="knob" />
      </span>
    </label>
  );
}

type Side = "front" | "back";

interface SheetColProps {
  label: string;
  side: Side;
  project: Doc;
  layout: Layout;
  ppi: number;
  showCutBorder: boolean;
  showFoldArrows: boolean;
}

function SheetCol({ label, side, project, layout, ppi, showCutBorder, showFoldArrows }: SheetColProps) {
  return (
    <div className="sheet-col">
      <div className="sheet-label">{label} · 8.5 × 11 in</div>
      <Sheet side={side} project={project} layout={layout} ppi={ppi} showCutBorder={showCutBorder} showFoldArrows={showFoldArrows} />
    </div>
  );
}

interface SheetProps {
  side: Side;
  project: Doc;
  layout: Layout;
  ppi: number;
  showCutBorder: boolean;
  showFoldArrows: boolean;
}

function Sheet({ side, project, layout, ppi, showCutBorder, showFoldArrows }: SheetProps) {
  const { pageW, pageH, folds, frontHtml, backHtml } = project;
  const html = side === "front" ? frontHtml : backHtml;

  if (layout.count === 0) {
    return (
      <div className="sheet" style={{ "--ppi": ppi } as React.CSSProperties}>
        <div className="sheet-empty">Nothing to print — card is too large for the page.</div>
      </div>
    );
  }

  const { cols, rows, effectiveW, effectiveH, offsetX, offsetY, gap, rotated } = layout;

  const cells: React.ReactNode[] = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      // For the back, mirror columns horizontally so duplex flip-on-long-edge aligns.
      const xCard = side === "back" ? cols - 1 - c : c;
      const xIn = offsetX + xCard * (effectiveW + gap);
      const yIn = offsetY + r * (effectiveH + gap);
      cells.push(
        <SheetCell
          key={`${r}-${c}`}
          rotated={rotated}
          xIn={xIn}
          yIn={yIn}
          wIn={effectiveW}
          hIn={effectiveH}
          pageW={pageW}
          pageH={pageH}
          folds={folds}
          html={html}
          showCutBorder={showCutBorder}
          showFoldArrows={showFoldArrows}
          neighbors={{
            left: xCard > 0,
            right: xCard < cols - 1,
            top: r > 0,
            bottom: r < rows - 1,
          }}
        />,
      );
    }
  }

  return (
    <div className="sheet" style={{ "--ppi": ppi } as React.CSSProperties}>
      {cells}
    </div>
  );
}

interface Neighbors {
  left: boolean;
  right: boolean;
  top: boolean;
  bottom: boolean;
}

interface SheetCellProps {
  rotated: boolean;
  xIn: number;
  yIn: number;
  wIn: number;
  hIn: number;
  pageW: number;
  pageH: number;
  folds: Fold[];
  html: string;
  showCutBorder: boolean;
  showFoldArrows: boolean;
  neighbors: Neighbors;
}

function SheetCell({ rotated, xIn, yIn, wIn, hIn, pageW, pageH, folds, html, showCutBorder, showFoldArrows, neighbors }: SheetCellProps) {
  // All measurements stay in inches; converted to display px via `--ppi`.
  const px = (inches: number) => `calc(${inches} * var(--ppi) * 1px)`;

  // Outer cell — sized in inches (display via --ppi).
  const cellStyle: React.CSSProperties = {
    position: "absolute",
    left: px(xIn),
    top: px(yIn),
    width: px(wIn),
    height: px(hIn),
    outline: showCutBorder ? "1px dashed var(--cut)" : "none",
    overflow: "visible",
  };

  // Card rendered at NATURAL size (96 CSS px per inch) and scaled by transform
  // to fit the current --ppi. This makes editor preview and actual print pixel-identical.
  const NATURAL = 96;
  const cardNatW = pageW * NATURAL;
  const cardNatH = pageH * NATURAL;
  const SCALE = "var(--ppi-scale)";
  // Anchor card top-left to cell top-left, then scale (and optionally rotate) from there.
  const cardFrame: React.CSSProperties = {
    position: "absolute",
    top: 0,
    left: 0,
    width: cardNatW,
    height: cardNatH,
    background: "#fff",
    transformOrigin: "top left",
    transform: rotated
      ? `translate(calc(${cardNatH}px * ${SCALE}), 0) rotate(90deg) scale(${SCALE})`
      : `scale(${SCALE})`,
  };

  return (
    <div style={cellStyle}>
      <div style={cardFrame}>
        <div className="editable card-readonly" dangerouslySetInnerHTML={{ __html: html || "" }} />
        {showFoldArrows &&
          folds.map((f) => (
            <FoldArrowPair key={"a-" + f.id} fold={f} cardW={pageW} cardH={pageH} natural={NATURAL} rotated={rotated} neighbors={neighbors} />
          ))}
      </div>
    </div>
  );
}

type CardEdge = "left" | "right" | "top" | "bottom";

interface FoldArrowPairProps {
  fold: Fold;
  cardW: number;
  cardH: number;
  natural: number;
  rotated: boolean;
  neighbors: Neighbors;
}

function FoldArrowPair({ fold, cardW, cardH, natural, rotated, neighbors }: FoldArrowPairProps) {
  const offsetIn = 0.06;
  const isH = fold.axis === "h";
  const cellEdgeFor = (cardEdge: CardEdge): CardEdge => {
    if (!rotated) return cardEdge;
    return ({ left: "top", right: "bottom", top: "right", bottom: "left" } as Record<CardEdge, CardEdge>)[cardEdge];
  };
  const hideOn = (cardEdge: CardEdge) => neighbors && neighbors[cellEdgeFor(cardEdge)];
  const npx = (inches: number) => inches * natural;

  const arrows: React.ReactNode[] = [];
  if (isH) {
    if (!hideOn("left")) arrows.push(<ArrowHead key="L" direction="right" left={npx(-offsetIn)} top={npx(fold.position)} />);
    if (!hideOn("right")) arrows.push(<ArrowHead key="R" direction="left" left={npx(cardW + offsetIn)} top={npx(fold.position)} />);
  } else {
    if (!hideOn("top")) arrows.push(<ArrowHead key="T" direction="down" left={npx(fold.position)} top={npx(-offsetIn)} />);
    if (!hideOn("bottom")) arrows.push(<ArrowHead key="B" direction="up" left={npx(fold.position)} top={npx(cardH + offsetIn)} />);
  }
  return <>{arrows}</>;
}

type ArrowDirection = "right" | "left" | "down" | "up";

interface ArrowHeadProps {
  direction: ArrowDirection;
  left: number;
  top: number;
}

function ArrowHead({ direction, left, top }: ArrowHeadProps) {
  const size = 8;
  const pts = {
    right: `0,0 ${size},${size / 2} 0,${size}`,
    left: `${size},0 0,${size / 2} ${size},${size}`,
    down: `0,0 ${size / 2},${size} ${size},0`,
    up: `0,${size} ${size / 2},0 ${size},${size}`,
  }[direction];
  const style: React.CSSProperties = {
    position: "absolute",
    left,
    top,
    width: size,
    height: size,
    transform:
      direction === "right"
        ? "translate(-100%, -50%)"
        : direction === "left"
          ? "translate(0, -50%)"
          : direction === "down"
            ? "translate(-50%, -100%)"
            : "translate(-50%, 0)",
    pointerEvents: "none",
  };
  return (
    <svg style={style} viewBox={`0 0 ${size} ${size}`}>
      <polygon points={pts} fill="#5f6368" />
    </svg>
  );
}
