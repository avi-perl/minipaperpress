import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./styles.css";
import { ensureGoogleFontsLoaded } from "./lib/fonts";

// Pull in the editor's font catalog up front so existing documents that use a
// Google font render correctly on first paint (the dropdown also calls this).
ensureGoogleFontsLoaded();

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
