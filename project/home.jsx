// Home page — list documents, create new, browse premade starters.
const { useMemo: homeMemo } = React;

function HomePage({ store, onOpen, onCreate, onDelete }) {
  const docs = homeMemo(
    () => store.order.map((id) => store.documents[id]).filter(Boolean),
    [store]
  );

  return (
    <div className="home">
      <div className="home-topbar">
        <div className="brand"><div className="brand-mark"/></div>
        <div className="brand-name">MiniPaperPress</div>
      </div>

      <div className="home-scroll">
        <section className="home-section">
          <div className="home-h">
            <h2>Your documents</h2>
            <span className="home-h-meta">
              {docs.length} {docs.length === 1 ? "document" : "documents"}
            </span>
          </div>
          <div className="doc-grid">
            <NewCard label="Blank document"
              onClick={() => onCreate({ templateId: "biz2" })} />
            {docs.map((d) => (
              <DocCard key={d.id} doc={d}
                onOpen={() => onOpen(d.id)}
                onDelete={() => onDelete(d.id)} />
            ))}
          </div>
        </section>

        <section className="home-section home-section--templates">
          <div className="home-h">
            <h2>Templates</h2>
            <span className="home-h-meta">Start with a layout</span>
          </div>
          <div className="starter-row">
            {STARTERS.map((s) => (
              <StarterCard key={s.id} starter={s}
                onClick={() => onCreate({ starter: s })} />
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}

function NewCard({ label, onClick }) {
  return (
    <button className="new-card" onClick={onClick}>
      <div className="new-card-thumb">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <line x1="12" y1="5" x2="12" y2="19"/>
          <line x1="5" y1="12" x2="19" y2="12"/>
        </svg>
      </div>
      <div className="new-card-label">{label}</div>
    </button>
  );
}

function DocCard({ doc, onOpen, onDelete }) {
  const t = templateById(doc.templateId);
  return (
    <div className="doc-card">
      <button className="doc-card-thumb" onClick={onOpen} aria-label={`Open ${doc.title}`}>
        <DocThumb doc={doc} t={t} />
      </button>
      <div className="doc-card-meta">
        <div className="doc-card-title" title={doc.title} onClick={onOpen}>{doc.title}</div>
        <div className="doc-card-sub">
          <span>{fmt(doc.pageW, doc.unit)} × {fmt(doc.pageH, doc.unit)}</span>
          <span> · </span>
          <span>{relTime(doc.updatedAt)}</span>
        </div>
      </div>
      <button className="doc-card-menu" onClick={(e) => {
        e.stopPropagation();
        if (confirm(`Delete “${doc.title}”?`)) onDelete();
      }} title="Delete">
        <Icon.X/>
      </button>
    </div>
  );
}

function DocThumb({ doc, t }) {
  // Render a tiny preview of the FRONT side, scaled to fit the thumb.
  // Thumb area: ~196 × 220 px box; fit page aspect inside it.
  const maxW = 168, maxH = 200;
  const ratio = doc.pageW / doc.pageH;
  let w, h;
  if (ratio >= maxW / maxH) { w = maxW; h = maxW / ratio; }
  else                       { h = maxH; w = maxH * ratio; }
  return (
    <div className="doc-thumb-page" style={{ width: w, height: h, position: "relative" }}>
      <div className="doc-thumb-content"
        style={{
          position: "absolute", inset: 0,
          fontSize: Math.max(4, Math.round(w / 22)),
          padding: 6, overflow: "hidden",
        }}
        dangerouslySetInnerHTML={{ __html: doc.frontHtml || "" }} />
      {(doc.folds || []).map((f, i) => {
        const isH = f.axis === "h";
        const pct = isH ? (f.position / doc.pageH) * 100 : (f.position / doc.pageW) * 100;
        return (
          <span key={i} style={{
            position: "absolute",
            ...(isH
              ? { left: 0, right: 0, top: `${pct}%`, borderTop: "1px dashed #d0d2d6" }
              : { top: 0, bottom: 0, left: `${pct}%`, borderLeft: "1px dashed #d0d2d6" }),
          }}/>
        );
      })}
      {(!doc.frontHtml || doc.frontHtml.replace(/<[^>]+>/g, "").trim() === "") && (
        <div className="doc-thumb-empty">Empty</div>
      )}
    </div>
  );
}

function StarterCard({ starter, onClick }) {
  const t = templateById(starter.templateId);
  const maxW = 160, maxH = 180;
  const ratio = t.w / t.h;
  let w, h;
  if (ratio >= maxW / maxH) { w = maxW; h = maxW / ratio; }
  else                       { h = maxH; w = maxH * ratio; }
  return (
    <button className="starter-card" onClick={onClick}>
      <div className="starter-thumb">
        <div className="starter-thumb-page" style={{ width: w, height: h, position: "relative" }}>
          <div style={{
            position: "absolute", inset: 0,
            padding: 5, fontSize: Math.max(4, Math.round(w / 22)),
            overflow: "hidden",
          }} dangerouslySetInnerHTML={{ __html: starter.frontHtml || "" }} />
          {(t.folds || []).map((f, i) => {
            const isH = f.axis === "h";
            const pct = isH ? (f.position / t.h) * 100 : (f.position / t.w) * 100;
            return (
              <span key={i} style={{
                position: "absolute",
                ...(isH
                  ? { left: 0, right: 0, top: `${pct}%`, borderTop: "1px dashed #d0d2d6" }
                  : { top: 0, bottom: 0, left: `${pct}%`, borderLeft: "1px dashed #d0d2d6" }),
              }}/>
            );
          })}
        </div>
      </div>
      <div className="starter-meta">
        <div className="starter-name">{starter.name}</div>
        <div className="starter-desc">{starter.description}</div>
      </div>
    </button>
  );
}

function relTime(ts) {
  if (!ts) return "—";
  const diff = (Date.now() - ts) / 1000;
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 86400 * 7) return `${Math.floor(diff / 86400)}d ago`;
  const d = new Date(ts);
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

Object.assign(window, { HomePage });
