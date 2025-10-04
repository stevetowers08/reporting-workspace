import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// Ensure React is available globally
if (typeof window !== 'undefined') {
  (window as any).React = React;
}

const rootElement = document.getElementById("root");
if (!rootElement) {
  throw new Error("Root element not found");
}

// Clear any existing content in the root element
rootElement.innerHTML = '';

const root = createRoot(rootElement);
root.render(<App />);
