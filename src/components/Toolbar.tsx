// Formatting toolbar — wires buttons to the active editor through execCommand.
import { useEffect, useRef, useState } from "react";
import { Icon } from "./icons";

interface ToolbarProps {
  exec: (cmd: string, value?: string) => void;
  queryActive: (cmd: string) => boolean;
  applyHeading: (tag: string) => void;
  applyFontSize: (px: string) => void;
}

export function Toolbar({ exec, queryActive, applyHeading, applyFontSize }: ToolbarProps) {
  const [fontSize, setFontSize] = useState("11");
  const [block, setBlock] = useState("p");

  return (
    <div className="toolbar">
      <div className="tb-group">
        <button className="tb-btn" title="Undo (⌘Z)" onClick={() => exec("undo")}><Icon.Undo /></button>
        <button className="tb-btn" title="Redo (⌘⇧Z)" onClick={() => exec("redo")}><Icon.Redo /></button>
      </div>
      <div className="tb-sep" />
      <div className="tb-group">
        <select
          className="tb-select"
          value={block}
          onChange={(e) => {
            setBlock(e.target.value);
            applyHeading(e.target.value);
          }}
          style={{ width: 110 }}
        >
          <option value="p">Normal text</option>
          <option value="h1">Title</option>
          <option value="h2">Heading</option>
        </select>
      </div>
      <div className="tb-sep" />
      <div className="tb-group">
        <select className="tb-select" defaultValue="Roboto" style={{ width: 110 }}>
          <option>Roboto</option>
          <option>Roboto Mono</option>
          <option>Georgia</option>
          <option>Courier</option>
        </select>
      </div>
      <div className="tb-sep" />
      <div className="tb-group">
        <select
          className="tb-select"
          value={fontSize}
          onChange={(e) => {
            setFontSize(e.target.value);
            applyFontSize(e.target.value);
          }}
          style={{ width: 64 }}
        >
          {[8, 9, 10, 11, 12, 14, 16, 18, 20, 24, 28, 32].map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      </div>
      <div className="tb-sep" />
      <div className="tb-group">
        <button
          className={`tb-btn ${queryActive("bold") ? "is-active" : ""}`}
          title="Bold (⌘B)"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => exec("bold")}
        >
          <Icon.Bold />
        </button>
        <button
          className={`tb-btn ${queryActive("italic") ? "is-active" : ""}`}
          title="Italic (⌘I)"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => exec("italic")}
        >
          <Icon.Italic />
        </button>
        <button
          className={`tb-btn ${queryActive("underline") ? "is-active" : ""}`}
          title="Underline (⌘U)"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => exec("underline")}
        >
          <Icon.Underline />
        </button>
        <ColorButton onPick={(c) => exec("foreColor", c)} />
      </div>
      <div className="tb-sep" />
      <div className="tb-group">
        <button className="tb-btn" title="Align left" onMouseDown={(e) => e.preventDefault()} onClick={() => exec("justifyLeft")}><Icon.AlignLeft /></button>
        <button className="tb-btn" title="Align center" onMouseDown={(e) => e.preventDefault()} onClick={() => exec("justifyCenter")}><Icon.AlignCenter /></button>
        <button className="tb-btn" title="Align right" onMouseDown={(e) => e.preventDefault()} onClick={() => exec("justifyRight")}><Icon.AlignRight /></button>
      </div>
      <div className="tb-sep" />
      <div className="tb-group">
        <button className="tb-btn" title="Bulleted list" onMouseDown={(e) => e.preventDefault()} onClick={() => exec("insertUnorderedList")}><Icon.Bullets /></button>
        <button className="tb-btn" title="Numbered list" onMouseDown={(e) => e.preventDefault()} onClick={() => exec("insertOrderedList")}><Icon.Numbered /></button>
        <button className="tb-btn" title="Horizontal line" onMouseDown={(e) => e.preventDefault()} onClick={() => exec("insertHorizontalRule")}><Icon.Divider /></button>
      </div>
    </div>
  );
}

interface ColorButtonProps {
  onPick: (color: string) => void;
}

function ColorButton({ onPick }: ColorButtonProps) {
  const [open, setOpen] = useState(false);
  const [color, setColor] = useState("#202124");
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const close = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
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
      <button
        className="tb-color"
        title="Text color"
        style={{ "--swatch": color } as React.CSSProperties}
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => setOpen(!open)}
      >
        <span style={{ fontFamily: "var(--mono)", fontSize: 11, lineHeight: 1, marginTop: 1 }}>A</span>
        <span className="swatch" />
      </button>
      {open && (
        <div
          style={{
            position: "absolute",
            top: 32,
            left: 0,
            zIndex: 10,
            background: "#fff",
            border: "1px solid var(--border)",
            borderRadius: 6,
            padding: 8,
            boxShadow: "var(--shadow-2)",
            display: "grid",
            gridTemplateColumns: "repeat(4, 22px)",
            gap: 4,
          }}
        >
          {palette.map((c) => (
            <button
              key={c}
              style={{
                width: 22,
                height: 22,
                padding: 0,
                background: c,
                border: c === "#ffffff" ? "1px solid var(--border)" : "1px solid transparent",
                borderRadius: 4,
                cursor: "pointer",
              }}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => {
                setColor(c);
                onPick(c);
                setOpen(false);
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
