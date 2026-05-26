// Formatting toolbar — drives the focused TipTap editor.
// A dense always-visible row of common tools; a "More" toggle reveals the rest.
import { useEffect, useRef, useState } from "react";
import type { Editor } from "@tiptap/react";
import { Icon } from "./icons";

interface ToolbarProps {
  editor: Editor | null;
}

// Re-render the toolbar whenever the active editor's state changes so that
// active/disabled states stay in sync with the selection.
function useEditorRev(editor: Editor | null) {
  const [, setRev] = useState(0);
  useEffect(() => {
    if (!editor || editor.isDestroyed) return;
    const update = () => setRev((r) => r + 1);
    editor.on("transaction", update);
    editor.on("selectionUpdate", update);
    editor.on("focus", update);
    editor.on("blur", update);
    return () => {
      editor.off("transaction", update);
      editor.off("selectionUpdate", update);
      editor.off("focus", update);
      editor.off("blur", update);
    };
  }, [editor]);
}

const FONT_FAMILIES = [
  { label: "Default", value: "" },
  { label: "Roboto", value: "Roboto, sans-serif" },
  { label: "Roboto Mono", value: "'Roboto Mono', monospace" },
  { label: "Georgia", value: "Georgia, serif" },
  { label: "Courier", value: "'Courier New', monospace" },
  { label: "Arial", value: "Arial, sans-serif" },
  { label: "Times", value: "'Times New Roman', serif" },
];

const FONT_SIZES = [8, 9, 10, 11, 12, 14, 16, 18, 20, 24, 28, 32, 40, 48, 64];

const TEXT_COLORS = [
  "#202124", "#5f6368", "#80868b", "#ffffff",
  "#d93025", "#ea8600", "#188038", "#1a73e8",
  "#9334e6", "#c5221f", "#b06000", "#0d652d",
];

const HIGHLIGHT_COLORS = [
  "#fff475", "#fbbc04", "#ffd6a5", "#fdcfe8",
  "#a7ffeb", "#cbf0f8", "#aecbfa", "#d7aefb",
  "#e6c9a8", "#e8eaed", "#ccff90", "#fdd663",
];

export function Toolbar({ editor: rawEditor }: ToolbarProps) {
  useEditorRev(rawEditor);
  // Never operate on a destroyed editor (can happen during dev StrictMode remounts).
  const editor = rawEditor && !rawEditor.isDestroyed ? rawEditor : null;
  const [expanded, setExpanded] = useState(false);

  const disabled = !editor;
  const chain = () => editor!.chain().focus();

  const currentBlock = !editor
    ? "p"
    : editor.isActive("heading", { level: 1 })
      ? "h1"
      : editor.isActive("heading", { level: 2 })
        ? "h2"
        : editor.isActive("heading", { level: 3 })
          ? "h3"
          : "p";

  const setBlock = (v: string) => {
    if (!editor) return;
    if (v === "p") chain().setParagraph().run();
    else chain().setHeading({ level: Number(v.slice(1)) as 1 | 2 | 3 }).run();
  };

  const currentFontFamily = editor?.getAttributes("textStyle").fontFamily || "";
  const setFontFamily = (v: string) => {
    if (!editor) return;
    if (v) chain().setFontFamily(v).run();
    else chain().unsetFontFamily().run();
  };

  const currentFontSize = editor?.getAttributes("textStyle").fontSize as string | undefined;
  const currentFontSizeNum = currentFontSize ? String(parseInt(currentFontSize, 10)) : "";
  const setFontSize = (v: string) => {
    if (!editor) return;
    if (v) chain().setFontSize(v + "px").run();
    else chain().unsetFontSize().run();
  };

  const inTable = !!editor?.isActive("table");

  return (
    <div className="toolbar">
      {/* ===== Row 1 — the everyday tools ===== */}
      <div className="toolbar-row">
        <div className="tb-group">
          <button className="tb-btn" title="Undo (⌘Z)" disabled={disabled || !editor!.can().undo()} onMouseDown={(e) => e.preventDefault()} onClick={() => chain().undo().run()}><Icon.Undo /></button>
          <button className="tb-btn" title="Redo (⌘⇧Z)" disabled={disabled || !editor!.can().redo()} onMouseDown={(e) => e.preventDefault()} onClick={() => chain().redo().run()}><Icon.Redo /></button>
        </div>
        <div className="tb-sep" />
        <div className="tb-group">
          <select className="tb-select" style={{ width: 116 }} value={currentBlock} disabled={disabled} onChange={(e) => setBlock(e.target.value)}>
            <option value="p">Normal text</option>
            <option value="h1">Title</option>
            <option value="h2">Heading</option>
            <option value="h3">Subheading</option>
          </select>
        </div>
        <div className="tb-sep" />
        <div className="tb-group">
          <select className="tb-select" style={{ width: 112 }} value={currentFontFamily} disabled={disabled} onChange={(e) => setFontFamily(e.target.value)}>
            {FONT_FAMILIES.map((f) => (
              <option key={f.label} value={f.value}>{f.label}</option>
            ))}
          </select>
          <select className="tb-select" style={{ width: 62 }} value={currentFontSizeNum} disabled={disabled} onChange={(e) => setFontSize(e.target.value)}>
            <option value="">Auto</option>
            {FONT_SIZES.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>
        <div className="tb-sep" />
        <div className="tb-group">
          <TbBtn editor={editor} title="Bold (⌘B)" active={editor?.isActive("bold")} onClick={() => chain().toggleBold().run()}><Icon.Bold /></TbBtn>
          <TbBtn editor={editor} title="Italic (⌘I)" active={editor?.isActive("italic")} onClick={() => chain().toggleItalic().run()}><Icon.Italic /></TbBtn>
          <TbBtn editor={editor} title="Underline (⌘U)" active={editor?.isActive("underline")} onClick={() => chain().toggleUnderline().run()}><Icon.Underline /></TbBtn>
          <TbBtn editor={editor} title="Strikethrough" active={editor?.isActive("strike")} onClick={() => chain().toggleStrike().run()}><Icon.Strike /></TbBtn>
        </div>
        <div className="tb-sep" />
        <div className="tb-group">
          <PaletteButton
            editor={editor}
            title="Text color"
            colors={TEXT_COLORS}
            glyph="A"
            current={(editor?.getAttributes("textStyle").color as string) || "#202124"}
            onPick={(c) => chain().setColor(c).run()}
            onClear={() => chain().unsetColor().run()}
          />
          <PaletteButton
            editor={editor}
            title="Highlight"
            colors={HIGHLIGHT_COLORS}
            icon={<Icon.Highlight />}
            active={editor?.isActive("highlight")}
            current={(editor?.getAttributes("highlight").color as string) || "#fff475"}
            onPick={(c) => chain().toggleHighlight({ color: c }).run()}
            onClear={() => chain().unsetHighlight().run()}
          />
        </div>
        <div className="tb-sep" />
        <div className="tb-group">
          <TbBtn editor={editor} title="Align left" active={editor?.isActive({ textAlign: "left" })} onClick={() => chain().setTextAlign("left").run()}><Icon.AlignLeft /></TbBtn>
          <TbBtn editor={editor} title="Align center" active={editor?.isActive({ textAlign: "center" })} onClick={() => chain().setTextAlign("center").run()}><Icon.AlignCenter /></TbBtn>
          <TbBtn editor={editor} title="Align right" active={editor?.isActive({ textAlign: "right" })} onClick={() => chain().setTextAlign("right").run()}><Icon.AlignRight /></TbBtn>
          <TbBtn editor={editor} title="Justify" active={editor?.isActive({ textAlign: "justify" })} onClick={() => chain().setTextAlign("justify").run()}><Icon.AlignJustify /></TbBtn>
        </div>
        <div className="tb-sep" />
        <div className="tb-group">
          <TbBtn editor={editor} title="Bulleted list" active={editor?.isActive("bulletList")} onClick={() => chain().toggleBulletList().run()}><Icon.Bullets /></TbBtn>
          <TbBtn editor={editor} title="Numbered list" active={editor?.isActive("orderedList")} onClick={() => chain().toggleOrderedList().run()}><Icon.Numbered /></TbBtn>
          <TbBtn editor={editor} title="Task list" active={editor?.isActive("taskList")} onClick={() => chain().toggleTaskList().run()}><Icon.Tasks /></TbBtn>
        </div>
        <div className="tb-sep" />
        <div className="tb-group">
          <LinkButton editor={editor} />
        </div>

        <button
          className={`tb-more ${expanded ? "is-active" : ""}`}
          title={expanded ? "Fewer options" : "More options"}
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => setExpanded((v) => !v)}
        >
          More
          <span style={{ display: "inline-flex", transform: expanded ? "rotate(180deg)" : "none", transition: "transform .15s" }}>
            <Icon.Chevron />
          </span>
        </button>
      </div>

      {expanded && (
        <div className="toolbar-row">
          <div className="tb-group">
            <TbBtn editor={editor} title="Inline code" active={editor?.isActive("code")} onClick={() => chain().toggleCode().run()}><Icon.Code /></TbBtn>
            <TbBtn editor={editor} title="Superscript" active={editor?.isActive("superscript")} onClick={() => chain().toggleSuperscript().run()}><Icon.Superscript /></TbBtn>
            <TbBtn editor={editor} title="Subscript" active={editor?.isActive("subscript")} onClick={() => chain().toggleSubscript().run()}><Icon.Subscript /></TbBtn>
            <TbBtn editor={editor} title="Clear formatting" onClick={() => chain().unsetAllMarks().clearNodes().run()}><Icon.ClearFormat /></TbBtn>
          </div>
          <div className="tb-sep" />
          <div className="tb-group">
            <TbBtn editor={editor} title="Quote" active={editor?.isActive("blockquote")} onClick={() => chain().toggleBlockquote().run()}><Icon.Quote /></TbBtn>
            <TbBtn editor={editor} title="Code block" active={editor?.isActive("codeBlock")} onClick={() => chain().toggleCodeBlock().run()}><Icon.CodeBlock /></TbBtn>
            <TbBtn editor={editor} title="Horizontal line" onClick={() => chain().setHorizontalRule().run()}><Icon.Divider /></TbBtn>
          </div>
          <div className="tb-sep" />
          <div className="tb-group">
            <TbBtn editor={editor} title="Insert image" onClick={() => insertImage(editor)}><Icon.Image /></TbBtn>
            <TbBtn editor={editor} title="Insert table" onClick={() => chain().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()}><Icon.Table /></TbBtn>
          </div>

          {inTable && (
            <>
              <div className="tb-sep" />
              <div className="tb-group tb-table-tools">
                <button className="tb-text-btn" onMouseDown={(e) => e.preventDefault()} onClick={() => chain().addColumnAfter().run()}>+ Col</button>
                <button className="tb-text-btn" onMouseDown={(e) => e.preventDefault()} onClick={() => chain().addRowAfter().run()}>+ Row</button>
                <button className="tb-text-btn" onMouseDown={(e) => e.preventDefault()} onClick={() => chain().deleteColumn().run()}>− Col</button>
                <button className="tb-text-btn" onMouseDown={(e) => e.preventDefault()} onClick={() => chain().deleteRow().run()}>− Row</button>
                <button className="tb-text-btn" onMouseDown={(e) => e.preventDefault()} onClick={() => chain().toggleHeaderRow().run()}>Header</button>
                <button className="tb-text-btn danger" onMouseDown={(e) => e.preventDefault()} onClick={() => chain().deleteTable().run()}>Delete table</button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

// ===== Generic toolbar button =====
interface TbBtnProps {
  editor: Editor | null;
  title: string;
  active?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}

function TbBtn({ editor, title, active, onClick, children }: TbBtnProps) {
  return (
    <button
      className={`tb-btn ${active ? "is-active" : ""}`}
      title={title}
      disabled={!editor}
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
    >
      {children}
    </button>
  );
}

// ===== Color / highlight palette button =====
interface PaletteButtonProps {
  editor: Editor | null;
  title: string;
  colors: string[];
  glyph?: string;
  icon?: React.ReactNode;
  active?: boolean;
  current: string;
  onPick: (color: string) => void;
  onClear: () => void;
}

function PaletteButton({ editor, title, colors, glyph, icon, active, current, onPick, onClear }: PaletteButtonProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const close = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button
        className={`tb-color ${active ? "is-active" : ""}`}
        title={title}
        disabled={!editor}
        style={{ "--swatch": current } as React.CSSProperties}
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => setOpen((v) => !v)}
      >
        {glyph ? <span style={{ fontFamily: "var(--mono)", fontSize: 11, lineHeight: 1, marginTop: 1 }}>{glyph}</span> : icon}
        <span className="swatch" />
      </button>
      {open && (
        <div className="tb-popover">
          <div className="tb-swatch-grid">
            {colors.map((c) => (
              <button
                key={c}
                className="tb-swatch"
                style={{ background: c, border: c.toLowerCase() === "#ffffff" ? "1px solid var(--border)" : "1px solid transparent" }}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => {
                  onPick(c);
                  setOpen(false);
                }}
              />
            ))}
          </div>
          <button
            className="tb-popover-clear"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => {
              onClear();
              setOpen(false);
            }}
          >
            Remove
          </button>
        </div>
      )}
    </div>
  );
}

// ===== Link button with URL popover =====
function LinkButton({ editor }: { editor: Editor | null }) {
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState("");
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const close = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  const openPopover = () => {
    if (!editor) return;
    setValue((editor.getAttributes("link").href as string) || "");
    setOpen(true);
  };

  const apply = () => {
    if (!editor) return;
    const href = value.trim();
    if (href) {
      editor.chain().focus().extendMarkRange("link").setLink({ href }).run();
    } else {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
    }
    setOpen(false);
  };

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button
        className={`tb-btn ${editor?.isActive("link") ? "is-active" : ""}`}
        title="Link"
        disabled={!editor}
        onMouseDown={(e) => e.preventDefault()}
        onClick={openPopover}
      >
        <Icon.Link />
      </button>
      {open && (
        <div className="tb-popover tb-link-pop">
          <input
            className="tb-link-input"
            placeholder="https://example.com"
            value={value}
            autoFocus
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") apply();
              if (e.key === "Escape") setOpen(false);
            }}
          />
          <button className="btn btn-primary" style={{ padding: "6px 12px" }} onMouseDown={(e) => e.preventDefault()} onClick={apply}>
            Apply
          </button>
        </div>
      )}
    </div>
  );
}

function insertImage(editor: Editor | null) {
  if (!editor) return;
  const url = window.prompt("Image URL");
  if (url) editor.chain().focus().setImage({ src: url }).run();
}
