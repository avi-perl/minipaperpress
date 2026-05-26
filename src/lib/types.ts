// Shared domain types for MiniPaperPress.

export type Unit = "in" | "mm";

// 'h' = horizontal cut across the page (constant y).
// 'v' = vertical cut down the page (constant x).
export type FoldAxis = "h" | "v";

export interface TemplateFold {
  axis: FoldAxis;
  position: number; // inches from the top (h) or left (v) edge
}

export interface Fold extends TemplateFold {
  id: string;
}

export interface Template {
  id: string;
  name: string;
  sub?: string;
  w: number; // inches
  h: number; // inches
  folds?: TemplateFold[];
}

export interface Doc {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
  templateId: string;
  pageW: number; // inches
  pageH: number; // inches
  unit: Unit;
  folds: Fold[];
  frontHtml: string;
  backHtml: string;
}

export interface Store {
  documents: Record<string, Doc>;
  order: string[];
}

export interface Starter {
  id: string;
  name: string;
  description: string;
  templateId: string;
  frontHtml: string;
  backHtml: string;
}

// Result of laying copies of a card out on a letter sheet.
export interface Layout {
  cols: number;
  rows: number;
  count: number;
  rotated: boolean;
  effectiveW: number;
  effectiveH: number;
  sheetW: number;
  sheetH: number;
  margin: number;
  gap: number;
  totalW: number;
  totalH: number;
  offsetX: number;
  offsetY: number;
}
