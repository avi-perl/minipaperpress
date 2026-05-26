// Curated set of Google Fonts surfaced in the editor's font dropdown.
//
// A single bundled stylesheet is requested lazily on first use. The CSS itself
// is tiny; the woff2 files are only downloaded when text is actually rendered
// in that family (so the dropdown's preview rows trigger loads, not the
// stylesheet link). `display=swap` keeps the UI usable while fonts arrive.

export interface FontDef {
  /** Human label shown in the dropdown row (also used as accessible name). */
  label: string;
  /** Full CSS font-family value, with quotes and a generic fallback. */
  family: string;
  /** Google Fonts URL slug (spaces as `+`). Omit for system-only fonts. */
  google?: string;
  /** Weight axis spec for css2, e.g. "400;700". Defaults to "400;700". */
  weights?: string;
}

const W = "400;700";

export const FONTS: FontDef[] = [
  // ── Sans ─────────────────────────────────────────────────────────────
  { label: "Inter", family: '"Inter", sans-serif', google: "Inter", weights: W },
  { label: "Roboto", family: '"Roboto", sans-serif', google: "Roboto", weights: W },
  { label: "Open Sans", family: '"Open Sans", sans-serif', google: "Open+Sans", weights: W },
  { label: "Lato", family: '"Lato", sans-serif', google: "Lato", weights: W },
  { label: "Montserrat", family: '"Montserrat", sans-serif', google: "Montserrat", weights: W },
  { label: "Poppins", family: '"Poppins", sans-serif', google: "Poppins", weights: W },
  { label: "Nunito", family: '"Nunito", sans-serif', google: "Nunito", weights: W },
  { label: "Work Sans", family: '"Work Sans", sans-serif', google: "Work+Sans", weights: W },
  { label: "Source Sans 3", family: '"Source Sans 3", sans-serif', google: "Source+Sans+3", weights: W },
  { label: "Raleway", family: '"Raleway", sans-serif', google: "Raleway", weights: W },
  { label: "Oswald", family: '"Oswald", sans-serif', google: "Oswald", weights: W },
  { label: "PT Sans", family: '"PT Sans", sans-serif', google: "PT+Sans", weights: W },

  // ── Serif ────────────────────────────────────────────────────────────
  { label: "Merriweather", family: '"Merriweather", serif', google: "Merriweather", weights: W },
  { label: "Playfair Display", family: '"Playfair Display", serif', google: "Playfair+Display", weights: W },
  { label: "Lora", family: '"Lora", serif', google: "Lora", weights: W },
  { label: "EB Garamond", family: '"EB Garamond", serif', google: "EB+Garamond", weights: W },
  { label: "Source Serif 4", family: '"Source Serif 4", serif', google: "Source+Serif+4", weights: W },
  { label: "Cormorant Garamond", family: '"Cormorant Garamond", serif', google: "Cormorant+Garamond", weights: W },
  { label: "Crimson Text", family: '"Crimson Text", serif', google: "Crimson+Text", weights: W },
  { label: "PT Serif", family: '"PT Serif", serif', google: "PT+Serif", weights: W },

  // ── Display ──────────────────────────────────────────────────────────
  { label: "Bebas Neue", family: '"Bebas Neue", sans-serif', google: "Bebas+Neue", weights: "400" },
  { label: "Abril Fatface", family: '"Abril Fatface", serif', google: "Abril+Fatface", weights: "400" },
  { label: "Anton", family: '"Anton", sans-serif', google: "Anton", weights: "400" },
  { label: "Pacifico", family: '"Pacifico", cursive', google: "Pacifico", weights: "400" },

  // ── Handwriting / script ────────────────────────────────────────────
  { label: "Caveat", family: '"Caveat", cursive', google: "Caveat", weights: W },
  { label: "Dancing Script", family: '"Dancing Script", cursive', google: "Dancing+Script", weights: W },
  { label: "Indie Flower", family: '"Indie Flower", cursive', google: "Indie+Flower", weights: "400" },
  { label: "Permanent Marker", family: '"Permanent Marker", cursive', google: "Permanent+Marker", weights: "400" },
  { label: "Sacramento", family: '"Sacramento", cursive', google: "Sacramento", weights: "400" },
  { label: "Shadows Into Light", family: '"Shadows Into Light", cursive', google: "Shadows+Into+Light", weights: "400" },

  // ── Monospace ────────────────────────────────────────────────────────
  { label: "Roboto Mono", family: '"Roboto Mono", monospace', google: "Roboto+Mono", weights: W },
  { label: "JetBrains Mono", family: '"JetBrains Mono", monospace', google: "JetBrains+Mono", weights: W },
  { label: "Fira Code", family: '"Fira Code", monospace', google: "Fira+Code", weights: W },
  { label: "IBM Plex Mono", family: '"IBM Plex Mono", monospace', google: "IBM+Plex+Mono", weights: W },
  { label: "Source Code Pro", family: '"Source Code Pro", monospace', google: "Source+Code+Pro", weights: W },
];

const LINK_ID = "mpp-google-fonts";
let loaded = false;

/** Inject the bundled Google Fonts stylesheet once. Safe to call repeatedly. */
export function ensureGoogleFontsLoaded(): void {
  if (loaded || typeof document === "undefined") return;
  loaded = true;
  if (document.getElementById(LINK_ID)) return;

  const families = FONTS.filter((f) => f.google)
    .map((f) => `family=${f.google}:wght@${f.weights || W}`)
    .join("&");
  const link = document.createElement("link");
  link.id = LINK_ID;
  link.rel = "stylesheet";
  link.href = `https://fonts.googleapis.com/css2?${families}&display=swap`;
  document.head.appendChild(link);
}

/** Extract the first family name from a CSS font-family string (no quotes). */
export function primaryFamily(css: string): string {
  if (!css) return "";
  const first = css.split(",")[0].trim();
  return first.replace(/^["']|["']$/g, "");
}

/** Find a catalog entry whose primary family matches the stored CSS value. */
export function lookupFont(css: string): FontDef | undefined {
  const want = primaryFamily(css).toLowerCase();
  if (!want) return undefined;
  return FONTS.find((f) => primaryFamily(f.family).toLowerCase() === want);
}
