// Path-based routing — keeps URLs durable across refreshes.
//   /        → home
//   /e/<id>  → editor for that document
//
// On GitHub Pages the app is served from a sub-path (e.g. /minipaperpress/),
// so we strip Vite's BASE_URL before matching and prepend it when navigating.
//
// Print preview stays as an in-page sub-state of the editor.

import { useEffect, useState } from "react";

export type Route =
  | { kind: "home" }
  | { kind: "editor"; id: string };

// "/minipaperpress/" -> "/minipaperpress"; "/" -> ""
const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

function relativePath(): string {
  const p = window.location.pathname;
  if (BASE && p.startsWith(BASE)) return p.slice(BASE.length) || "/";
  return p || "/";
}

export function parseLocation(): Route {
  const m = relativePath().match(/^\/e\/([^/?#]+)\/?$/);
  if (m) return { kind: "editor", id: decodeURIComponent(m[1]) };
  return { kind: "home" };
}

export function useRoute(): [Route, (next: Route) => void] {
  const [route, setRoute] = useState<Route>(() => parseLocation());
  useEffect(() => {
    const on = () => setRoute(parseLocation());
    window.addEventListener("popstate", on);
    return () => window.removeEventListener("popstate", on);
  }, []);
  return [route, setRoute];
}

export function pathFor(route: Route): string {
  const rel = route.kind === "editor" ? `/e/${encodeURIComponent(route.id)}` : "/";
  return BASE + rel;
}

export function navigate(setRoute: (r: Route) => void, next: Route): void {
  const path = pathFor(next);
  if (window.location.pathname + window.location.search !== path) {
    window.history.pushState({}, "", path);
  }
  setRoute(next);
}

export function replace(setRoute: (r: Route) => void, next: Route): void {
  window.history.replaceState({}, "", pathFor(next));
  setRoute(next);
}
