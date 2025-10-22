// Import React polyfill first to ensure compatibility
import '@/lib/reactPolyfill';

import { createRoot } from "react-dom/client";

console.log('🚀 main.tsx: Starting React app');

// Import App and CSS after React is initialized to prevent TDZ issues
import { AppErrorBoundary } from "@/components/error/AppErrorBoundary";
import App from "./App";
import "./index.css";

console.log('📦 main.tsx: Imports loaded, initializing React root');

// Initialize performance monitoring
import "@/lib/performanceMonitor";

const rootElement = document.getElementById("root");
if (!rootElement) {
  console.error('❌ Root element not found');
  throw new Error("Root element not found");
}

console.log('🎯 main.tsx: Creating React root and rendering App');
const root = createRoot(rootElement);
root.render(
  <AppErrorBoundary>
    <App />
  </AppErrorBoundary>
);

console.log('✅ main.tsx: App rendered successfully');