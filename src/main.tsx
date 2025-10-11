// ✅ CORRECT ORDER: Import React FIRST to ensure it loads before any SES lockdown
import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

// Ensure React is available globally before any other code runs
if (typeof window !== 'undefined') {
  window.React = React;
}

const rootElement = document.getElementById("root");
if (!rootElement) {
  throw new Error("Root element not found");
}

const root = createRoot(rootElement);
root.render(<App />);