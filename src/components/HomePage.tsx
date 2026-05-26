// Home page — list documents, create new, browse premade starters.
import { useMemo } from "react";
import type { Doc, Starter, Store, Template } from "../lib/types";
import { STARTERS, fmt, templateById } from "../lib/templates";
import { normalizeCardHtml } from "../lib/cardHtml";
import { Icon } from "./icons";

interface CreateArg {
  templateId?: string;
  starter?: Starter;
}

interface HomePageProps {
  store: Store;
  onOpen: (id: string) => void;
  onCreate: (arg: CreateArg) => void;
  onDelete: (id: string) => void;
}

export function HomePage({ store, onOpen, onCreate, onDelete }: HomePageProps) {
  const docs = useMemo(
    () => store.order.map((id) => store.documents[id]).filter(Boolean),
    [store],
  );

  return (
    <div className="home">
      <div className="home-topbar">
        <div className="brand"><div className="brand-mark" /></div>
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
            <NewCard label="Blank document" onClick={() => onCreate({ templateId: "biz2" })} />
            {docs.map((d) => (
              <DocCard key={d.id} doc={d} onOpen={() => onOpen(d.id)} onDelete={() => onDelete(d.id)} />
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
              <StarterCard key={s.id} starter={s} onClick={() => onCreate({ starter: s })} />
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}

interface NewCardProps {
  label: string;
  onClick: () => void;
}

function NewCard({ label, onClick }: NewCardProps) {
  return (
    <button className="new-card" onClick={onClick}>
      <div className="new-card-thumb">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <line x1="12" y1="5" x2="12" y2="19" />
          <line x1="5" y1="12" x2="19" y2="12" />
        </svg>
      </div>
      <div className="new-card-label">{label}</div>
    </button>
  );
}

interface DocCardProps {
  doc: Doc;
  onOpen: () => void;
  onDelete: () => void;
}

function DocCard({ doc, onOpen, onDelete }: DocCardProps) {
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
      <button
        className="doc-card-menu"
        onClick={(e) => {
          e.stopPropagation();
          if (window.confirm(`Delete “${doc.title}”?`)) onDelete();
        }}
        title="Delete"
      >
        <Icon.X />
      </button>
    </div>
  );
}

interface DocThumbProps {
  doc: Doc;
  t: Template;
}

function DocThumb({ doc }: DocThumbProps) {
  // The thumbnail is a true scaled-down view of the front card — same .editable
  // styling, same normalized HTML, same 96px natural canvas — so fonts and
  // spacing match the editor and print exactly, just shrunk to fit.
  const maxW = 168;
  const maxH = 200;
  const ratio = doc.pageW / doc.pageH;
  const w = ratio >= maxW / maxH ? maxW : maxH * ratio;
  const h = ratio >= maxW / maxH ? maxW / ratio : maxH;
  const natW = doc.pageW * 96;
  const natH = doc.pageH * 96;
  const scale = w / natW;
  const isEmpty = !doc.frontHtml || doc.frontHtml.replace(/<[^>]+>/g, "").trim() === "";
  const normalized = useMemo(() => normalizeCardHtml(doc.frontHtml || ""), [doc.frontHtml]);

  return (
    <div className="doc-thumb-page" style={{ width: w, height: h, position: "relative", overflow: "hidden" }}>
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: natW,
          height: natH,
          background: "#fff",
          transform: `scale(${scale})`,
          transformOrigin: "top left",
        }}
      >
        <div
          className="editable card-readonly"
          style={{ position: "absolute", inset: 0 }}
          dangerouslySetInnerHTML={{ __html: normalized }}
        />
        {(doc.folds || []).map((f) => {
          const isH = f.axis === "h";
          return (
            <span
              key={f.id}
              style={{
                position: "absolute",
                ...(isH
                  ? { left: 0, right: 0, top: f.position * 96, borderTop: "1px dashed #d0d2d6" }
                  : { top: 0, bottom: 0, left: f.position * 96, borderLeft: "1px dashed #d0d2d6" }),
              }}
            />
          );
        })}
      </div>
      {isEmpty && <div className="doc-thumb-empty">Empty</div>}
    </div>
  );
}

interface StarterCardProps {
  starter: Starter;
  onClick: () => void;
}

function StarterCard({ starter, onClick }: StarterCardProps) {
  const t = templateById(starter.templateId);
  const maxW = 160;
  const maxH = 180;
  const ratio = t.w / t.h;
  const w = ratio >= maxW / maxH ? maxW : maxH * ratio;
  const h = ratio >= maxW / maxH ? maxW / ratio : maxH;
  const natW = t.w * 96;
  const natH = t.h * 96;
  const scale = w / natW;
  const normalized = useMemo(() => normalizeCardHtml(starter.frontHtml || ""), [starter.frontHtml]);

  return (
    <button className="starter-card" onClick={onClick}>
      <div className="starter-thumb">
        <div className="starter-thumb-page" style={{ width: w, height: h, position: "relative", overflow: "hidden" }}>
          <div
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              width: natW,
              height: natH,
              background: "#fff",
              transform: `scale(${scale})`,
              transformOrigin: "top left",
            }}
          >
            <div
              className="editable card-readonly"
              style={{ position: "absolute", inset: 0 }}
              dangerouslySetInnerHTML={{ __html: normalized }}
            />
            {(t.folds || []).map((f, i) => {
              const isH = f.axis === "h";
              return (
                <span
                  key={i}
                  style={{
                    position: "absolute",
                    ...(isH
                      ? { left: 0, right: 0, top: f.position * 96, borderTop: "1px dashed #d0d2d6" }
                      : { top: 0, bottom: 0, left: f.position * 96, borderLeft: "1px dashed #d0d2d6" }),
                  }}
                />
              );
            })}
          </div>
        </div>
      </div>
      <div className="starter-meta">
        <div className="starter-name">{starter.name}</div>
        <div className="starter-desc">{starter.description}</div>
      </div>
    </button>
  );
}

function relTime(ts: number): string {
  if (!ts) return "—";
  const diff = (Date.now() - ts) / 1000;
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 86400 * 7) return `${Math.floor(diff / 86400)}d ago`;
  const d = new Date(ts);
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}
