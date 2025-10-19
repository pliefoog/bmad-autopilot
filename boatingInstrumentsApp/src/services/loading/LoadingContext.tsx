import React, { createContext, useContext, useCallback, useMemo, useState } from 'react';

type LoadingKey = string;

interface LoadingContextValue {
  startLoading: (key?: LoadingKey) => void;
  stopLoading: (key?: LoadingKey) => void;
  isLoading: (key?: LoadingKey) => boolean;
  anyLoading: boolean;
}

const LoadingContext = createContext<LoadingContextValue | undefined>(undefined);

export const LoadingProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [activeKeys, setActiveKeys] = useState<Record<LoadingKey, number>>({});

  const startLoading = useCallback((key: LoadingKey = 'global') => {
    setActiveKeys((prev) => ({ ...prev, [key]: (prev[key] || 0) + 1 }));
  }, []);

  const stopLoading = useCallback((key: LoadingKey = 'global') => {
    setActiveKeys((prev) => {
      const count = (prev[key] || 0) - 1;
      const next = { ...prev };
      if (count <= 0) {
        delete next[key];
      } else {
        next[key] = count;
      }
      return next;
    });
  }, []);

  const isLoading = useCallback((key?: LoadingKey) => {
    if (!key) {
      return Object.keys(activeKeys).length > 0;
    }
    return !!activeKeys[key];
  }, [activeKeys]);

  const anyLoading = useMemo(() => Object.keys(activeKeys).length > 0, [activeKeys]);

  const value = useMemo(() => ({ startLoading, stopLoading, isLoading, anyLoading }), [startLoading, stopLoading, isLoading, anyLoading]);

  return <LoadingContext.Provider value={value}>{children}</LoadingContext.Provider>;
};

export const useLoading = (): LoadingContextValue => {
  const ctx = useContext(LoadingContext);
  if (!ctx) {
    throw new Error('useLoading must be used within a LoadingProvider');
  }
  return ctx;
};

/**
 * Helper to wrap an async function and automatically start/stop loading for the given key
 */
export const withLoading = async <T extends any>(fn: () => Promise<T>, helpers: { start: (k?: LoadingKey) => void; stop: (k?: LoadingKey) => void; key?: LoadingKey } ) : Promise<T> => {
  const k = helpers.key || 'global';
  helpers.start(k);
  try {
    return await fn();
  } finally {
    helpers.stop(k);
  }
};

export default LoadingContext;
