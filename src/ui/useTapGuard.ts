import { useCallback, useRef } from 'react';

/**
 * Protège contre les doubles appuis accidentels : un second appui arrivé moins de `delayMs`
 * après le précédent est ignoré, quel que soit le bouton du groupe.
 */
export function useTapGuard(delayMs = 250) {
  const last = useRef(0);
  return useCallback(
    <A extends unknown[]>(action: (...args: A) => void) =>
      (...args: A) => {
        const now = performance.now();
        if (now - last.current < delayMs) return;
        last.current = now;
        action(...args);
      },
    [delayMs],
  );
}
