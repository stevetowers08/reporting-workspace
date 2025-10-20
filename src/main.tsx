// ✅ ULTRA-AGGRESSIVE TDZ FIX: Set up error handling BEFORE any imports
import { createRoot } from "react-dom/client";

// Import App and CSS after React is initialized to prevent TDZ issues
import App from "./App";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import "./index.css";

// Initialize performance monitoring
import "@/lib/performanceMonitor";

const rootElement = document.getElementById("root");
if (!rootElement) {
  throw new Error("Root element not found");
}

const root = createRoot(rootElement);
root.render(
  <ErrorBoundary>
    <App />
  </ErrorBoundary>
);