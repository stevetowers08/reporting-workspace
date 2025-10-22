/**
 * React Polyfill for SSR/Hydration Compatibility
 * 
 * This module ensures React hooks are available consistently across
 * server-side rendering and client-side hydration environments.
 * 
 * Based on latest React 18 best practices for preventing hydration errors.
 */

import React from 'react';

// Ensure React is globally available
if (typeof window !== 'undefined') {
  // @ts-ignore
  window.React = React;
  
  // Fix for hydration errors - ensure useLayoutEffect is available
  if (!React.useLayoutEffect) {
    React.useLayoutEffect = React.useEffect;
  }
  
  // Ensure all React hooks are available
  const requiredHooks = [
    'useState',
    'useEffect', 
    'useLayoutEffect',
    'useCallback',
    'useMemo',
    'useRef',
    'useContext',
    'useReducer',
    'useImperativeHandle',
    'useDebugValue'
  ];
  
  requiredHooks.forEach(hookName => {
    if (!React[hookName as keyof typeof React]) {
      console.warn(`React hook ${hookName} is not available, this may cause hydration errors`);
    }
  });
}

// Export React for consistent imports
export default React;
export * from 'react';
