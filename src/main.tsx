import React from "react";
import ReactDOM from "react-dom";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

// Make React globally available for external components
// This ensures Radix UI and other libraries can access React.forwardRef
if (typeof window !== 'undefined') {
  (window as any).React = React;
  (window as any).ReactDOM = ReactDOM;
}

// Also make it available on globalThis for broader compatibility
if (typeof globalThis !== 'undefined') {
  (globalThis as any).React = React;
  (globalThis as any).ReactDOM = ReactDOM;
}

const rootElement = document.getElementById("root");
if (!rootElement) {
  throw new Error("Root element not found");
}

const root = createRoot(rootElement);
root.render(<App />);