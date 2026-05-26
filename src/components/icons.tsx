// Minimal stroke icons used across the toolbar + rail.
export const Icon = {
  Undo: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 7v6h6" /><path d="M21 17a9 9 0 0 0-15-6.7L3 13" /></svg>
  ),
  Redo: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 7v6h-6" /><path d="M3 17a9 9 0 0 1 15-6.7L21 13" /></svg>
  ),
  Print: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 9V3h12v6" /><rect x="3" y="9" width="18" height="9" rx="1" /><rect x="6" y="14" width="12" height="7" /></svg>
  ),
  Bold: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M7 4h6a4 4 0 0 1 0 8H7z" /><path d="M7 12h7a4 4 0 0 1 0 8H7z" /></svg>
  ),
  Italic: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="19" y1="4" x2="10" y2="4" /><line x1="14" y1="20" x2="5" y2="20" /><line x1="15" y1="4" x2="9" y2="20" /></svg>
  ),
  Underline: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M6 3v8a6 6 0 0 0 12 0V3" /><line x1="5" y1="21" x2="19" y2="21" /></svg>
  ),
  AlignLeft: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="12" x2="15" y2="12" /><line x1="3" y1="18" x2="18" y2="18" /></svg>
  ),
  AlignCenter: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="3" y1="6" x2="21" y2="6" /><line x1="6" y1="12" x2="18" y2="12" /><line x1="5" y1="18" x2="19" y2="18" /></svg>
  ),
  AlignRight: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="3" y1="6" x2="21" y2="6" /><line x1="9" y1="12" x2="21" y2="12" /><line x1="6" y1="18" x2="21" y2="18" /></svg>
  ),
  Bullets: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="5" cy="6" r="1" fill="currentColor" /><circle cx="5" cy="12" r="1" fill="currentColor" /><circle cx="5" cy="18" r="1" fill="currentColor" /><line x1="10" y1="6" x2="20" y2="6" /><line x1="10" y1="12" x2="20" y2="12" /><line x1="10" y1="18" x2="20" y2="18" /></svg>
  ),
  Numbered: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><text x="2" y="9" fontFamily="ui-monospace, monospace" fontSize="7" fill="currentColor" stroke="none">1.</text><text x="2" y="16" fontFamily="ui-monospace, monospace" fontSize="7" fill="currentColor" stroke="none">2.</text><text x="2" y="22" fontFamily="ui-monospace, monospace" fontSize="7" fill="currentColor" stroke="none">3.</text><line x1="10" y1="7" x2="20" y2="7" /><line x1="10" y1="14" x2="20" y2="14" /><line x1="10" y1="21" x2="20" y2="21" /></svg>
  ),
  Divider: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="3" y1="12" x2="21" y2="12" /></svg>
  ),
  Plus: () => (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
  ),
  X: () => (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><line x1="6" y1="6" x2="18" y2="18" /><line x1="18" y1="6" x2="6" y2="18" /></svg>
  ),
  HFold: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><rect x="3" y="6" width="18" height="12" rx="1" /><line x1="3" y1="12" x2="21" y2="12" strokeDasharray="2 2" /></svg>
  ),
  VFold: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><rect x="6" y="3" width="12" height="18" rx="1" /><line x1="12" y1="3" x2="12" y2="21" strokeDasharray="2 2" /></svg>
  ),
  Pages: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><rect x="4" y="5" width="13" height="16" rx="1" /><path d="M8 3h11a1 1 0 0 1 1 1v14" /></svg>
  ),
  Strike: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 6.5C16 5 14 4 12 4 9.5 4 8 5.2 8 7c0 1.4 1 2.2 2.6 2.8" /><path d="M8 17.5C8 19 10 20 12 20c2.5 0 4-1.2 4-3" /><line x1="4" y1="12" x2="20" y2="12" /></svg>
  ),
  Code: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="16 18 22 12 16 6" /><polyline points="8 6 2 12 8 18" /></svg>
  ),
  CodeBlock: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="16" rx="2" /><polyline points="9 9 7 12 9 15" /><polyline points="15 9 17 12 15 15" /></svg>
  ),
  Quote: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="6" x2="5" y2="18" /><line x1="10" y1="8" x2="20" y2="8" /><line x1="10" y1="12" x2="20" y2="12" /><line x1="10" y1="16" x2="16" y2="16" /></svg>
  ),
  Link: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10 13a5 5 0 0 0 7.07 0l2.83-2.83a5 5 0 0 0-7.07-7.07l-1.41 1.41" /><path d="M14 11a5 5 0 0 0-7.07 0L4.1 13.83a5 5 0 0 0 7.07 7.07l1.41-1.41" /></svg>
  ),
  Highlight: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><line x1="4" y1="21" x2="20" y2="21" /><path d="M9.5 17.5L5 13l8-8 4.5 4.5-8 8z" /><line x1="13" y1="5" x2="17.5" y2="9.5" /></svg>
  ),
  Subscript: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 6l7 9M11 6l-7 9" /><text x="13" y="20" fontFamily="ui-monospace, monospace" fontSize="8" fill="currentColor" stroke="none">2</text></svg>
  ),
  Superscript: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 9l7 9M11 9l-7 9" /><text x="13" y="11" fontFamily="ui-monospace, monospace" fontSize="8" fill="currentColor" stroke="none">2</text></svg>
  ),
  AlignJustify: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="18" x2="21" y2="18" /></svg>
  ),
  Table: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="16" rx="1" /><line x1="3" y1="10" x2="21" y2="10" /><line x1="3" y1="15" x2="21" y2="15" /><line x1="9" y1="4" x2="9" y2="20" /><line x1="15" y1="4" x2="15" y2="20" /></svg>
  ),
  Image: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.5" /><path d="M21 15l-5-5L5 21" /></svg>
  ),
  Tasks: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6l2 2 3.5-3.5" /><path d="M3 15l2 2 3.5-3.5" /><line x1="12" y1="6" x2="21" y2="6" /><line x1="12" y1="15" x2="21" y2="15" /></svg>
  ),
  ClearFormat: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 6V5h11v1" /><line x1="11" y1="5" x2="9" y2="15" /><line x1="6" y1="19" x2="12" y2="19" /><line x1="14.5" y1="14.5" x2="20.5" y2="20.5" /><line x1="20.5" y1="14.5" x2="14.5" y2="20.5" /></svg>
  ),
  Chevron: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9" /></svg>
  ),
};
