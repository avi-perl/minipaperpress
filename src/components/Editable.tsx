// WYSIWYG editor surface — contentEditable wired to the toolbar via document.execCommand.
import { useCallback, useEffect, useRef } from "react";

interface EditableProps {
  html: string;
  onChange: (html: string) => void;
  placeholder?: string;
  onFocusEditor?: (el: HTMLElement) => void;
}

export function Editable({ html, onChange, placeholder, onFocusEditor }: EditableProps) {
  const ref = useRef<HTMLDivElement>(null);

  // Sync prop -> DOM whenever the prop differs from what's currently in the editor.
  // (Compares against the live DOM, so initial content gets written on first mount.)
  useEffect(() => {
    if (!ref.current) return;
    const next = html || "";
    if (ref.current.innerHTML !== next) {
      ref.current.innerHTML = next;
    }
  }, [html]);

  const handleInput = useCallback(() => {
    if (!ref.current) return;
    onChange(ref.current.innerHTML);
  }, [onChange]);

  const handleFocus = useCallback(() => {
    if (onFocusEditor && ref.current) onFocusEditor(ref.current);
  }, [onFocusEditor]);

  const isEmpty = !html || html.replace(/<[^>]+>/g, "").trim() === "";

  return (
    <div
      ref={ref}
      className="editable"
      contentEditable
      suppressContentEditableWarning
      spellCheck={false}
      data-empty={isEmpty}
      data-placeholder={placeholder || "Start typing…"}
      onInput={handleInput}
      onFocus={handleFocus}
      onBlur={handleInput}
    />
  );
}
