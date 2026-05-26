// Main app. Routes between Home, Editor, and Print Preview.
// Storage holds many documents in one keyed store (storage.jsx).

const { useState, useEffect, useRef, useMemo } = React;

function App() {
  const [store, setStore] = useState(loadStore);
  const [activeId, setActiveId] = useState(null);
  const [route, setRoute] = useState(() => store.order.length > 0 ? "home" : "home"); // "home" | "editor" | "print"
  const [activeEditor, setActiveEditor] = useState(null);
  const [selectedFoldId, setSelectedFoldId] = useState(null);
  const [, force] = useState(0);

  // Persist store on change
  useEffect(() => { saveStore(store); }, [store]);

  // Re-render on selection change so toolbar active-state updates
  useEffect(() => {
    const handler = () => force((n) => n + 1);
    document.addEventListener("selectionchange", handler);
    return () => document.removeEventListener("selectionchange", handler);
  }, []);

  const project = activeId ? store.documents[activeId] : null;

  const update = (patch) => {
    if (!activeId) return;
    setStore((s) => updateDoc(s, activeId, patch));
  };
  const updateFolds = (folds) => update({ folds });
  const moveFold = (foldId, newPos) => {
    if (!project) return;
    const folds = project.folds.map((f) => f.id === foldId ? { ...f, position: newPos } : f);
    update({ folds });
  };

  // Deselect fold when clicking anywhere outside fold UI
  useEffect(() => {
    if (!selectedFoldId) return;
    const onDown = (e) => {
      if (e.target.closest(".fold-line")) return;
      setSelectedFoldId(null);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [selectedFoldId]);

  const openDoc = (id) => { setActiveId(id); setRoute("editor"); };
  const goHome = () => { setActiveId(null); setRoute("home"); };

  const createDocAndOpen = ({ templateId, starter }) => {
    // From starter (with content) or just a sized template (blank).
    let factory;
    if (starter) {
      const t = templateById(starter.templateId);
      factory = () => newDocFromTemplate(t, {
        title: starter.name,
        frontHtml: starter.frontHtml,
        backHtml: starter.backHtml,
      });
    } else {
      const t = templateById(templateId);
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

  const handleDelete = (id) => {
    setStore((s) => deleteDoc(s, id));
  };

  // ===== WYSIWYG actions =====
  const exec = (cmd, value = null) => {
    if (!activeEditor) return;
    activeEditor.focus();
    document.execCommand(cmd, false, value);
    const ev = new Event("input", { bubbles: true });
    activeEditor.dispatchEvent(ev);
  };
  const queryActive = (cmd) => {
    try { return document.queryCommandState(cmd); } catch (e) { return false; }
  };
  const applyHeading = (tag) => {
    if (!activeEditor) return;
    activeEditor.focus();
    document.execCommand("formatBlock", false, tag);
    activeEditor.dispatchEvent(new Event("input", { bubbles: true }));
  };
  const applyFontSize = (px) => {
    if (!activeEditor) return;
    activeEditor.focus();
    document.execCommand("styleWithCSS", false, true);
    document.execCommand("fontSize", false, "7");
    const spans = activeEditor.querySelectorAll('font[size="7"], span[style*="font-size"]');
    spans.forEach((el) => {
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
    return (
      <HomePage
        store={store}
        onOpen={openDoc}
        onCreate={createDocAndOpen}
        onDelete={handleDelete}
      />
    );
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
      <Toolbar
        exec={exec}
        queryActive={queryActive}
        applyHeading={applyHeading}
        applyFontSize={applyFontSize}
      />
      <div className="workspace">
        <Rail
          project={project}
          update={update}
          updateFolds={updateFolds}
        />
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

// ============ TOP BAR ============
function TopBar({ title, onTitle, onPrint, onHome }) {
  return (
    <div className="topbar">
      <button className="home-back" onClick={onHome} title="Back to documents">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 12l9-9 9 9"/><path d="M5 10v10h14V10"/>
        </svg>
      </button>
      <div className="title-block">
        <input
          className="doc-title"
          value={title}
          onChange={(e) => onTitle(e.target.value)}
          spellCheck={false}
        />
      </div>
      <div className="topbar-right">
        <button className="btn btn-primary" onClick={onPrint}>
          <Icon.Print/> Share & Print
        </button>
      </div>
    </div>
  );
}

// ============ FORMATTING TOOLBAR ============
function Toolbar({ exec, queryActive, applyHeading, applyFontSize }) {
  const [fontSize, setFontSize] = useState("11");
  const [block, setBlock] = useState("p");

  return (
    <div className="toolbar">
      <div className="tb-group">
        <button className="tb-btn" title="Undo (⌘Z)" onClick={() => exec("undo")}><Icon.Undo/></button>
        <button className="tb-btn" title="Redo (⌘⇧Z)" onClick={() => exec("redo")}><Icon.Redo/></button>
      </div>
      <div className="tb-sep"/>
      <div className="tb-group">
        <select className="tb-select" value={block}
          onChange={(e) => { setBlock(e.target.value); applyHeading(e.target.value); }}
          style={{ width: 110 }}>
          <option value="p">Normal text</option>
          <option value="h1">Title</option>
          <option value="h2">Heading</option>
        </select>
      </div>
      <div className="tb-sep"/>
      <div className="tb-group">
        <select className="tb-select" defaultValue="Roboto" style={{ width: 110 }}>
          <option>Roboto</option>
          <option>Roboto Mono</option>
          <option>Georgia</option>
          <option>Courier</option>
        </select>
      </div>
      <div className="tb-sep"/>
      <div className="tb-group">
        <select className="tb-select" value={fontSize}
          onChange={(e) => { setFontSize(e.target.value); applyFontSize(e.target.value); }}
          style={{ width: 64 }}>
          {[8, 9, 10, 11, 12, 14, 16, 18, 20, 24, 28, 32].map((s) =>
            <option key={s} value={s}>{s}</option>)}
        </select>
      </div>
      <div className="tb-sep"/>
      <div className="tb-group">
        <button className={`tb-btn ${queryActive("bold") ? "is-active" : ""}`} title="Bold (⌘B)"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => exec("bold")}><Icon.Bold/></button>
        <button className={`tb-btn ${queryActive("italic") ? "is-active" : ""}`} title="Italic (⌘I)"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => exec("italic")}><Icon.Italic/></button>
        <button className={`tb-btn ${queryActive("underline") ? "is-active" : ""}`} title="Underline (⌘U)"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => exec("underline")}><Icon.Underline/></button>
        <ColorButton onPick={(c) => exec("foreColor", c)} />
      </div>
      <div className="tb-sep"/>
      <div className="tb-group">
        <button className="tb-btn" title="Align left"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => exec("justifyLeft")}><Icon.AlignLeft/></button>
        <button className="tb-btn" title="Align center"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => exec("justifyCenter")}><Icon.AlignCenter/></button>
        <button className="tb-btn" title="Align right"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => exec("justifyRight")}><Icon.AlignRight/></button>
      </div>
      <div className="tb-sep"/>
      <div className="tb-group">
        <button className="tb-btn" title="Bulleted list"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => exec("insertUnorderedList")}><Icon.Bullets/></button>
        <button className="tb-btn" title="Numbered list"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => exec("insertOrderedList")}><Icon.Numbered/></button>
        <button className="tb-btn" title="Horizontal line"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => exec("insertHorizontalRule")}><Icon.Divider/></button>
      </div>
    </div>
  );
}

function ColorButton({ onPick }) {
  const [open, setOpen] = useState(false);
  const [color, setColor] = useState("#202124");
  const ref = useRef(null);
  useEffect(() => {
    const close = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);
  const palette = [
    "#202124", "#5f6368", "#80868b", "#ffffff",
    "#d93025", "#ea8600", "#188038", "#1a73e8",
    "#9334e6", "#c5221f", "#b06000", "#0d652d",
  ];
  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button className="tb-color" title="Text color"
        style={{ "--swatch": color }}
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => setOpen(!open)}>
        <span style={{ fontFamily: "var(--mono)", fontSize: 11, lineHeight: 1, marginTop: 1 }}>A</span>
        <span className="swatch"/>
      </button>
      {open && (
        <div style={{
          position: "absolute", top: 32, left: 0, zIndex: 10,
          background: "#fff", border: "1px solid var(--border)", borderRadius: 6,
          padding: 8, boxShadow: "var(--shadow-2)",
          display: "grid", gridTemplateColumns: "repeat(4, 22px)", gap: 4,
        }}>
          {palette.map((c) => (
            <button key={c}
              style={{
                width: 22, height: 22, padding: 0,
                background: c, border: c === "#ffffff" ? "1px solid var(--border)" : "1px solid transparent",
                borderRadius: 4, cursor: "pointer",
              }}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => { setColor(c); onPick(c); setOpen(false); }}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ============ CANVAS ============
function Canvas({ project, update, onFocusEditor, selectedFoldId, onSelectFold, onMoveFold }) {
  const { pageW, pageH, folds, frontHtml, backHtml, unit } = project;

  // The on-screen scale (pixels per inch). Larger pages get scaled down to fit.
  const containerRef = useRef(null);
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
          <span><b>{fmt(pageW, unit)}</b> × <b>{fmt(pageH, unit)}</b></span>
          {folds.length > 0 && <span>· {folds.length} fold{folds.length === 1 ? "" : "s"}</span>}
        </div>
      </div>
    </div>
  );
}

function Page({ ppi, pageW, pageH, folds, html, onChangeHtml, onFocusEditor, unit, placeholder, selectedFoldId, onSelectFold, onMoveFold, sideLabel }) {
  const wPx = pageW * ppi;
  const hPx = pageH * ppi;
  const pageRef = useRef(null);

  const startDrag = (e, fold) => {
    e.preventDefault();
    e.stopPropagation();
    const pageEl = pageRef.current;
    if (!pageEl) return;
    const rect = pageEl.getBoundingClientRect();
    const isH = fold.axis === "h";
    const maxIn = isH ? pageH : pageW;

    const move = (ev) => {
      const v = isH
        ? (ev.clientY - rect.top) / ppi
        : (ev.clientX - rect.left) / ppi;
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
        <div className="page-natural" style={{
          position: "absolute", top: 0, left: 0,
          width: pageW * 96, height: pageH * 96,
          transform: `scale(${ppi / 96})`,
          transformOrigin: "top left",
        }}>
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
          const style = isH
            ? { top: f.position * ppi }
            : { left: f.position * ppi };
          const selected = selectedFoldId === f.id;
          return (
            <div
              key={f.id}
              className={`fold-line ${isH ? "h" : "v"} ${selected ? "selected" : ""}`}
              style={style}
            >
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
                        <circle cx="9" cy="6" r="1.6"/><circle cx="15" cy="6" r="1.6"/>
                        <circle cx="9" cy="12" r="1.6"/><circle cx="15" cy="12" r="1.6"/>
                        <circle cx="9" cy="18" r="1.6"/><circle cx="15" cy="18" r="1.6"/>
                      </g>
                    ) : (
                      <g>
                        <circle cx="6" cy="9" r="1.6"/><circle cx="12" cy="9" r="1.6"/><circle cx="18" cy="9" r="1.6"/>
                        <circle cx="6" cy="15" r="1.6"/><circle cx="12" cy="15" r="1.6"/><circle cx="18" cy="15" r="1.6"/>
                      </g>
                    )}
                  </svg>
                </span>
              )}
              {selected && (
                <span className="fold-pos">
                  {fmt(f.position, unit)}
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ============ RIGHT RAIL ============
function Rail({ project, update, updateFolds }) {
  const { templateId, pageW, pageH, unit, folds } = project;

  const setTemplate = (t) => {
    update({
      templateId: t.id,
      pageW: t.w, pageH: t.h,
      folds: (t.folds || []).map((f, i) => ({
        id: "f" + Math.random().toString(36).slice(2, 7) + i,
        ...f,
      })),
    });
  };

  const setCustom = (w, h) => {
    update({ templateId: "custom", pageW: w, pageH: h });
  };

  const setUnit = (u) => update({ unit: u });

  const addFold = (axis) => {
    const id = "f" + Math.random().toString(36).slice(2, 7);
    const pos = axis === "h" ? pageH / 2 : pageW / 2;
    updateFolds([...folds, { id, axis, position: round2(pos) }]);
  };
  const updateFold = (id, patch) => {
    updateFolds(folds.map((f) => f.id === id ? { ...f, ...patch } : f));
  };
  const removeFold = (id) => updateFolds(folds.filter((f) => f.id !== id));

  return (
    <div className="rail">
      {/* DIMENSIONS */}
      <div className="rail-section">
        <div className="rail-h">
          Dimensions
          <div className="unit-toggle">
            <button className={unit === "in" ? "active" : ""} onClick={() => setUnit("in")}>in</button>
            <button className={unit === "mm" ? "active" : ""} onClick={() => setUnit("mm")}>mm</button>
          </div>
        </div>
        <DimInputs pageW={pageW} pageH={pageH} unit={unit}
          onChange={(w, h) => setCustom(w, h)} />
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
            <FoldRow key={f.id} f={f} pageW={pageW} pageH={pageH} unit={unit}
              onChange={(patch) => updateFold(f.id, patch)}
              onRemove={() => removeFold(f.id)} />
          ))}
        </div>
        <div style={{ display: "flex", gap: 4 }}>
          <button className="add-fold" onClick={() => addFold("h")}>
            <Icon.Plus/> Horizontal fold
          </button>
          <button className="add-fold" onClick={() => addFold("v")}>
            <Icon.Plus/> Vertical fold
          </button>
        </div>
      </div>

      {/* TEMPLATE */}
      <div className="rail-section">
        <div className="rail-h">
          Page templates
          <button className="rail-h-action"
            onClick={() => update({ templateId: "custom" })}>
            Custom
          </button>
        </div>
        <div className="size-grid">
          {TEMPLATES.map((t) => (
            <SizeCard key={t.id} t={t} active={templateId === t.id} unit={unit}
              onClick={() => setTemplate(t)} />
          ))}
        </div>
      </div>
    </div>
  );
}

function TemplateDrawer({ project, update }) {
  const { templateId, unit } = project;
  const [open, setOpen] = useState(false);

  const setTemplate = (t) => {
    update({
      templateId: t.id,
      pageW: t.w, pageH: t.h,
      folds: (t.folds || []).map((f, i) => ({
        id: "f" + Math.random().toString(36).slice(2, 7) + i,
        ...f,
      })),
    });
  };

  return (
    <div className={`tpl-drawer ${open ? "open" : "peek"}`}>
      <button className="tpl-drawer-handle" onClick={() => setOpen((v) => !v)}>
        <span className="tpl-drawer-label">Page templates</span>
        <span className="tpl-drawer-meta">{TEMPLATES.length} sizes</span>
        <span className="tpl-drawer-caret">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
            style={{ transform: open ? "rotate(180deg)" : "none", transition: "transform .15s" }}>
            <polyline points="6 9 12 15 18 9"/>
          </svg>
        </span>
      </button>
      <div className="tpl-drawer-body">
        <div className="tpl-strip">
          {TEMPLATES.map((t) => (
            <SizeCard key={t.id} t={t} active={templateId === t.id} unit={unit}
              onClick={() => setTemplate(t)} />
          ))}
        </div>
      </div>
    </div>
  );
}

function SizeCard({ t, active, unit, onClick }) {
  // Thumb: scale so the largest dim ~ 64px, keeping aspect; render fold lines too.
  const maxDim = 64;
  const ratio = t.w / t.h;
  let tw, th;
  if (ratio >= 1) { tw = maxDim; th = maxDim / ratio; }
  else            { th = maxDim; tw = maxDim * ratio; }
  return (
    <button className={`size-card ${active ? "active" : ""}`} onClick={onClick}>
      <div className="size-thumb" style={{ height: maxDim + 4 }}>
        <div className="rect" style={{ width: tw, height: th, position: "relative" }}>
          {(t.folds || []).map((f, i) => {
            const isH = f.axis === "h";
            const pct = isH ? (f.position / t.h) * 100 : (f.position / t.w) * 100;
            return (
              <span key={i} style={{
                position: "absolute",
                ...(isH
                  ? { left: 0, right: 0, top: `${pct}%`, borderTop: "1px dashed currentColor", opacity: 0.5 }
                  : { top: 0, bottom: 0, left: `${pct}%`, borderLeft: "1px dashed currentColor", opacity: 0.5 }),
              }}/>
            );
          })}
        </div>
      </div>
      <div className="size-name">{t.name}</div>
      <div className="size-dims">
        {t.sub ? <>{t.sub} · </> : null}{fmt(t.w, unit)} × {fmt(t.h, unit)}
      </div>
    </button>
  );
}

function DimInputs({ pageW, pageH, unit, onChange }) {
  const toDisplay = (v) => unit === "mm" ? Math.round(inToMm(v)) : round2(v);
  const fromDisplay = (v) => unit === "mm" ? mmToIn(parseFloat(v) || 0) : (parseFloat(v) || 0);

  return (
    <div className="custom-row">
      <div className="dim-input">
        <input type="number" step={unit === "mm" ? "1" : "0.1"} value={toDisplay(pageW)}
          onChange={(e) => onChange(fromDisplay(e.target.value), pageH)} />
        <span className="unit">{unit === "mm" ? "mm" : "in"}</span>
      </div>
      <span className="x">×</span>
      <div className="dim-input">
        <input type="number" step={unit === "mm" ? "1" : "0.1"} value={toDisplay(pageH)}
          onChange={(e) => onChange(pageW, fromDisplay(e.target.value))} />
        <span className="unit">{unit === "mm" ? "mm" : "in"}</span>
      </div>
    </div>
  );
}

function FoldRow({ f, pageW, pageH, unit, onChange, onRemove }) {
  const max = f.axis === "h" ? pageH : pageW;
  const toDisplay = (v) => unit === "mm" ? Math.round(inToMm(v)) : round2(v);
  const fromDisplay = (v) => unit === "mm" ? mmToIn(parseFloat(v) || 0) : (parseFloat(v) || 0);

  return (
    <div className="fold-row">
      <span className="fold-icon">
        {f.axis === "h" ? <Icon.HFold/> : <Icon.VFold/>}
      </span>
      <select className="tb-select" value={f.axis}
        onChange={(e) => onChange({ axis: e.target.value, position: round2((e.target.value === "h" ? pageH : pageW) / 2) })}>
        <option value="h">Horizontal</option>
        <option value="v">Vertical</option>
      </select>
      <div className="pos-input">
        <input type="number" step={unit === "mm" ? "1" : "0.1"} min="0" max={toDisplay(max)}
          value={toDisplay(f.position)}
          onChange={(e) => {
            const v = Math.max(0, Math.min(max, fromDisplay(e.target.value)));
            onChange({ position: round2(v) });
          }} />
        <span className="unit">{unit === "mm" ? "mm" : "in"}</span>
      </div>
      <button className="remove" onClick={onRemove} title="Remove fold">
        <Icon.X/>
      </button>
    </div>
  );
}

// Mount
ReactDOM.createRoot(document.getElementById("root")).render(<App/>);
