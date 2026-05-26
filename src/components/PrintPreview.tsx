// Print preview — composes the 8.5×11 sheet(s) with as many copies as fit.
import { useEffect, useMemo, useRef, useState } from "react";
import type { Doc, Fold, Layout } from "../lib/types";
import { computeLayout, fmt, round2 } from "../lib/templates";
import { normalizeCardHtml } from "../lib/cardHtml";
import { buildShareHtml, shareFilename } from "../lib/shareFile";
import { Icon } from "./icons";

const SHEET_W_IN = 8.5;
const SHEET_H_IN = 11;

// Which physical edge the duplex flip happens on (matches the printer's
// "print on both sides" setting). It decides how the back is mirrored so each
// back card lands exactly behind its front card.
type FlipEdge = "long" | "short";

interface PrintPreviewProps {
  project: Doc;
  onClose: () => void;
}

export function PrintPreview({ project, onClose }: PrintPreviewProps) {
  const { pageW, pageH, folds, unit, frontHtml, backHtml } = project;
  const [margin, setMargin] = useState(0.25); // inches
  const [gap, setGap] = useState(0.15);
  const [showFoldArrows, setShowFoldArrows] = useState(true);
  const [showCutBorder, setShowCutBorder] = useState(true);
  const [flipEdge, setFlipEdge] = useState<FlipEdge>("long"); // duplex flip axis
  const [shareOpen, setShareOpen] = useState(false);
  const [pdfHintOpen, setPdfHintOpen] = useState(false);
  const [sideOpen, setSideOpen] = useState(false); // mobile-only overlay
  useEffect(() => {
    if (!sideOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, [sideOpen]);

  // The editor strips insignificant whitespace between blocks; the static print
  // render must do the same, or stray newlines in the stored HTML show up as
  // blank lines and the spacing no longer matches the editor.
  const frontHtmlNorm = useMemo(() => normalizeCardHtml(frontHtml), [frontHtml]);
  const backHtmlNorm = useMemo(() => normalizeCardHtml(backHtml), [backHtml]);

  // Print boundary = the chosen page size. Content past pageH is hard-clipped
  // here so the user sees exactly what will print. The editor's overflow marker
  // + warning bar already tell them content is being lost, so we don't need to
  // visualize it again on the sheet.
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
      const isMobile = window.matchMedia("(max-width: 768px)").matches;
      const padding = isMobile ? 24 : 64;
      // Mobile stacks the two sheets vertically; desktop puts them side-by-side.
      const sheetsAcross = isMobile ? 1 : 2;
      const totalWIn = SHEET_W_IN * sheetsAcross + (isMobile ? 0 : 0.6);
      const availW = r.width - padding;
      const availH = r.height - padding;
      const ppiW = availW / totalWIn;
      const ppiH = availH / SHEET_H_IN;
      // On mobile, width is the binding constraint and we let users scroll
      // vertically through both sheets.
      const next = isMobile ? ppiW : Math.min(ppiW, ppiH);
      setPpi(Math.max(20, Math.min(next, 110)));
    }
    fit();
    const ro = new ResizeObserver(fit);
    if (stageRef.current) ro.observe(stageRef.current);
    window.addEventListener("resize", fit);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", fit);
    };
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
          <button className="btn btn-outline btn-back-mobile-hide" onClick={onClose}>Back to editor</button>
          <button className="home-back menu-toggle" onClick={() => setSideOpen(true)} title="Print options" aria-label="Print options">
            <Icon.Menu />
          </button>
        </div>
      </div>

      <div className="print-body">
        <div className={`rail-scrim ${sideOpen ? "is-open" : ""}`} onClick={() => setSideOpen(false)} aria-hidden="true" />
        {/* Side options */}
        <div className={`print-side no-print ${sideOpen ? "is-open" : ""}`}>
          <div className="rail-mobile-head">
            <span style={{ fontSize: 14, fontWeight: 500 }}>Print options</span>
            <button className="rail-mobile-close" onClick={() => setSideOpen(false)} aria-label="Close">
              <Icon.X />
            </button>
          </div>
          <div className="rail-h" style={{ marginTop: 0 }}>Actions</div>
          <div className="action-list">
            <ActionButton icon={<Icon.Print />} title="Print" subtitle="Two-sided · Margins: None · 100%" primary onClick={handlePrint} />
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
              subtitle="Margins: None · Scale: 100%"
              onClick={handleSavePdf}
            />
            <ActionButton
              icon={
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="7 10 12 15 17 10" />
                  <line x1="12" y1="15" x2="12" y2="3" />
                </svg>
              }
              title="Share a copy"
              subtitle="Download a file someone else can open"
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

          <div className="rail-h">Duplex</div>
          <div className="opt-row">
            <span>Back flips on</span>
            <span className="unit-toggle">
              <button className={flipEdge === "long" ? "active" : ""} onClick={() => setFlipEdge("long")}>
                Long edge
              </button>
              <button className={flipEdge === "short" ? "active" : ""} onClick={() => setFlipEdge("short")}>
                Short edge
              </button>
            </span>
          </div>
          <div className="empty-hint" style={{ paddingTop: 0 }}>
            Match this to your printer’s two-sided setting so the back lines up behind the front.
          </div>

          {layout.count === 0 && (
            <div className="empty-hint">
              Card too large for the chosen margins. Reduce margin or pick a smaller template.
            </div>
          )}
        </div>

        {/* Stage */}
        <div className="print-stage" ref={stageRef}>
          <div className="sheets-row">
            <SheetCol label="Front" side="front" project={project} html={frontHtmlNorm} layout={layout} ppi={ppi} flipEdge={flipEdge} showCutBorder={showCutBorder} showFoldArrows={showFoldArrows} />
            <SheetCol label="Back" side="back" project={project} html={backHtmlNorm} layout={layout} ppi={ppi} flipEdge={flipEdge} showCutBorder={showCutBorder} showFoldArrows={showFoldArrows} />
          </div>
        </div>
      </div>

      {shareOpen && <ShareDialog project={project} onClose={() => setShareOpen(false)} />}
      {pdfHintOpen && (
        <div className="pdf-hint no-print">
          In the print dialog: set <b>Destination → Save as PDF</b>, <b>Margins → None</b>,{" "}
          <b>Scale → 100%</b>, and turn on <b>Background graphics</b> so colors and
          highlights match this preview.
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
  const origin = window.location.origin;
  const downloadHtml = () => {
    const html = buildShareHtml(project, origin);
    const blob = new Blob([html], { type: "text/html;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = shareFilename(project.title);
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
          <p className="share-p">
            Download a small HTML file that opens this document in MiniPaperPress at <code>{origin}</code>.
          </p>
          <button className="btn btn-primary" onClick={downloadHtml}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: 6 }}>
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            Download .html
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
  html: string; // normalized card HTML for this side
  layout: Layout;
  ppi: number;
  flipEdge: FlipEdge;
  showCutBorder: boolean;
  showFoldArrows: boolean;
}

function SheetCol({ label, side, project, html, layout, ppi, flipEdge, showCutBorder, showFoldArrows }: SheetColProps) {
  const subLabel =
    side === "back"
      ? `Back · mirrored (${flipEdge === "long" ? "long-edge" : "short-edge"} flip)`
      : `${label} · 8.5 × 11 in`;
  return (
    <div className="sheet-col">
      <div className="sheet-label">{subLabel}</div>
      <Sheet side={side} project={project} html={html} layout={layout} ppi={ppi} flipEdge={flipEdge} showCutBorder={showCutBorder} showFoldArrows={showFoldArrows} />
    </div>
  );
}

interface SheetProps {
  side: Side;
  project: Doc;
  html: string; // normalized card HTML for this side
  layout: Layout;
  ppi: number;
  flipEdge: FlipEdge;
  showCutBorder: boolean;
  showFoldArrows: boolean;
}

function Sheet({ side, project, html, layout, ppi, flipEdge, showCutBorder, showFoldArrows }: SheetProps) {
  const { pageW, pageH, folds } = project;

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
      // The back is the front mirrored across the duplex flip axis, so every
      // back card lands exactly behind its front card once the sheet is turned
      // over. Because the grid is centered, mirroring the grid index is the
      // exact geometric mirror of the card's position on the sheet.
      //  - long-edge flip  → mirror left/right (columns)
      //  - short-edge flip → mirror top/bottom (rows)
      let vc = c;
      let vr = r;
      if (side === "back") {
        if (flipEdge === "long") vc = cols - 1 - c;
        else vr = rows - 1 - r;
      }
      const xIn = offsetX + vc * (effectiveW + gap);
      const yIn = offsetY + vr * (effectiveH + gap);
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
            left: vc > 0,
            right: vc < cols - 1,
            top: vr > 0,
            bottom: vr < rows - 1,
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
  pageH: number; // chosen page height in inches (the print boundary)
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
  // to fit the current --ppi. The card is exactly pageW × pageH — content past
  // that boundary is clipped by .editable's overflow:hidden, matching what the
  // printer will produce. The editor's warning bar tells the user about it.
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
