// ✅ ULTRA-AGGRESSIVE TDZ FIX: Set up error handling BEFORE any imports
// Import React polyfills first
import "@/polyfills/react-polyfill";
import React from "react";
import { createRoot } from "react-dom/client";

// Import App and CSS after React is initialized to prevent TDZ issues
import { AppErrorBoundary } from "@/components/error/AppErrorBoundary";
import App from "./App";
import "./index.css";

// Initialize performance monitoring
import "@/lib/performanceMonitor";

const rootElement = document.getElementById("root");
if (!rootElement) {
  throw new Error("Root element not found");
}

const root = createRoot(rootElement);
root.render(
  <AppErrorBoundary>
    <App />
  </AppErrorBoundary>
);