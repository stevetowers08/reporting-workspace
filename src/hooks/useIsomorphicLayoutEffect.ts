import { useEffect, useLayoutEffect } from 'react';

/**
 * Isomorphic useLayoutEffect hook that works in both SSR and client environments
 * 
 * In SSR environments (server-side), useLayoutEffect is not available and causes warnings.
 * This hook automatically falls back to useEffect in SSR environments.
 * 
 * @param effect - The effect function to run
 * @param deps - Optional dependency array
 */
export const useIsomorphicLayoutEffect = typeof window !== 'undefined' 
  ? useLayoutEffect 
  : useEffect;

export default useIsomorphicLayoutEffect;
