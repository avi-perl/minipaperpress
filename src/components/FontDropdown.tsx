// Font picker for the editor toolbar.
//
// Native <select> elements can't style their <option> rows with per-row font
// families in Chromium, so we render a custom trigger + popover where every
// row is shown IN ITS OWN FONT (and the trigger shows the current font in
// that font too). The catalog and lazy Google Fonts loader live in lib/fonts.
import { useEffect, useRef, useState } from "react";
import { FONTS, ensureGoogleFontsLoaded, lookupFont, primaryFamily } from "../lib/fonts";

interface FontDropdownProps {
  value: string;
  disabled?: boolean;
  onChange: (family: string) => void;
}

export function FontDropdown({ value, disabled, onChange }: FontDropdownProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Make sure the bundled Google Fonts stylesheet is present so previews
  // (and the editor itself) can render in the chosen face.
  useEffect(() => {
    ensureGoogleFontsLoaded();
  }, []);

  useEffect(() => {
    const close = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  const known = lookupFont(value);
  const primary = primaryFamily(value);
  // If the stored family isn't in the catalog (legacy or pasted content), still
  // show its name rendered in that face — never silently fall back to "Default".
  const triggerLabel = known?.label || primary || "Default";
  const triggerFont = known?.family || (primary ? `"${primary}"` : "var(--sans)");

  const pick = (family: string) => {
    onChange(family);
    setOpen(false);
  };

  return (
    <div ref={ref} className="tb-font">
      <button
        className="tb-font-trigger"
        type="button"
        title="Font"
        disabled={disabled}
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => setOpen((v) => !v)}
        style={{ fontFamily: triggerFont }}
      >
        <span className="tb-font-label">{triggerLabel}</span>
      </button>
      {open && (
        <div className="tb-popover tb-font-pop" role="listbox">
          <button
            type="button"
            className={"tb-font-row" + (value === "" ? " is-active" : "")}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => pick("")}
          >
            Default
          </button>
          {FONTS.map((f) => (
            <button
              key={f.label}
              type="button"
              className={"tb-font-row" + (f.family === value ? " is-active" : "")}
              style={{ fontFamily: f.family }}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => pick(f.family)}
            >
              {f.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
