// Editor top bar — home button, editable document title, Share & Print.
import { Icon } from "./icons";

interface TopBarProps {
  title: string;
  onTitle: (title: string) => void;
  onPrint: () => void;
  onHome: () => void;
}

export function TopBar({ title, onTitle, onPrint, onHome }: TopBarProps) {
  return (
    <div className="topbar">
      <button className="home-back" onClick={onHome} title="Back to documents">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 12l9-9 9 9" />
          <path d="M5 10v10h14V10" />
        </svg>
      </button>
      <div className="title-block">
        <input
          className="doc-title"
          value={title}
          onChange={(e) => onTitle(e.target.value)}
          spellCheck={false}
        />
      </div>
      <div className="topbar-right">
        <button className="btn btn-primary" onClick={onPrint}>
          <Icon.Print /> Share & Print
        </button>
      </div>
    </div>
  );
}
