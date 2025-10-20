// ✅ ULTRA-AGGRESSIVE TDZ FIX: Set up error handling BEFORE any imports
import React from "react";
import { createRoot } from "react-dom/client";

// ✅ SES COMPATIBILITY: Ensure React is properly initialized
// This prevents SES from interfering with React's internal state
if (typeof window !== 'undefined') {
  // Ensure React is available globally for SES compatibility
  (window as any).React = React;
}

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