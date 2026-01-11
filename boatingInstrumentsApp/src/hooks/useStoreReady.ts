/**
 * useStoreReady Hook - Store Initialization Safety Guard
 *
 * Ensures Zustand stores are fully initialized before components access them.
 * Prevents race conditions during app startup that cause "Cannot read properties of undefined" errors.
 *
 * Usage:
 * ```typescript
 * const isStoreReady = useStoreReady();
 * if (!isStoreReady) return <LoadingSpinner />;
 * // Safe to render widgets that use store
 * ```
 */

import { useState, useEffect } from 'react';
import { useNmeaStore } from '../store/nmeaStore';

/**
 * Check if NMEA store is fully initialized and safe to access
 * Returns true only when store structure is confirmed valid
 */
export function useStoreReady(): boolean {
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    // Check store initialization
    const checkStoreReady = () => {
      try {
        const state = useNmeaStore.getState();

        // Verify store structure exists (registry-based architecture)
        const ready = !!(
          state &&
          state.nmeaData &&
          typeof state.nmeaData === 'object'
        );

        if (ready && !isReady) {
          setIsReady(true);
        }

        return ready;
      } catch (error) {
        console.warn('[useStoreReady] Store access error during initialization:', error);
        return false;
      }
    };

    // Initial check
    if (checkStoreReady()) {
      return;
    }

    // Poll until ready (should be immediate after first render)
    const pollInterval = setInterval(() => {
      if (checkStoreReady()) {
        clearInterval(pollInterval);
      }
    }, 10);

    // Cleanup
    return () => clearInterval(pollInterval);
  }, [isReady]);

  return isReady;
}
