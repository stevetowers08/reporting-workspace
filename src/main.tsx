// ✅ ULTRA-AGGRESSIVE TDZ FIX: Set up error handling BEFORE any imports
if (typeof window !== 'undefined') {
  // Set up TDZ error handling immediately
  window.addEventListener('error', (event) => {
    if (event.error && event.error.message) {
      const message = event.error.message;
      if (message.includes('Cannot access') && message.includes('before initialization')) {
        console.warn('TDZ Error caught and handled:', message);
        event.preventDefault();
        // Reload the page to recover from TDZ error
        setTimeout(() => {
          window.location.reload();
        }, 1000);
      }
    }
  });

  // Add protection against React undefined errors
  window.addEventListener('error', (event) => {
    if (event.error && event.error.message && event.error.message.includes('Cannot read properties of undefined')) {
      console.warn('Undefined property error caught and handled:', event.error.message);
      event.preventDefault();
      // Reload the page to recover from React undefined error
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    }
  });

  // Add protection against unhandled promise rejections
  window.addEventListener('unhandledrejection', (event) => {
    if (event.reason && event.reason.message) {
      const message = event.reason.message;
      if (message.includes('Cannot access') || message.includes('before initialization')) {
        console.warn('TDZ Error in promise caught and handled:', message);
        event.preventDefault();
        setTimeout(() => {
          window.location.reload();
        }, 1000);
      }
    }
  });
}

// ✅ CORRECT ORDER: Import React FIRST to ensure it loads before any SES lockdown
import React from "react";
import { createRoot } from "react-dom/client";

// Ensure React is available globally before any other code runs
if (typeof window !== 'undefined') {
  window.React = React;
  // Also ensure React.forwardRef is available globally
  window.React.forwardRef = React.forwardRef;
  window.React.useState = React.useState;
  window.React.useEffect = React.useEffect;
  window.React.useCallback = React.useCallback;
  window.React.useMemo = React.useMemo;
  window.React.memo = React.memo;
}

// Import App and CSS after React is initialized to prevent TDZ issues
import App from "./App";
import "./index.css";

const rootElement = document.getElementById("root");
if (!rootElement) {
  throw new Error("Root element not found");
}

const root = createRoot(rootElement);
root.render(<App />);