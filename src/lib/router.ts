// Path-based routing — keeps URLs durable across refreshes.
//   /        → home
//   /e/<id>  → editor for that document
//
// Print preview stays as an in-page sub-state of the editor.

import { useEffect, useState } from "react";

export type Route =
  | { kind: "home" }
  | { kind: "editor"; id: string };

export function parseLocation(): Route {
  const m = window.location.pathname.match(/^\/e\/([^/?#]+)\/?$/);
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
  if (route.kind === "editor") return `/e/${encodeURIComponent(route.id)}`;
  return "/";
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
