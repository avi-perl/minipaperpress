// WYSIWYG editor surface — contentEditable with toolbar wiring through document.execCommand.
const { useEffect, useRef, useState, useCallback } = React;

function Editable({ html, onChange, placeholder, onFocusEditor }) {
  const ref = useRef(null);

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

Object.assign(window, { Editable });
