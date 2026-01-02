import React, { createContext, useContext, useMemo } from 'react';

/**
 * Widget Visibility Context - Render Optimization
 * 
 * Provides visibility state to widgets to prevent off-screen updates.
 * Only visible widgets (on current page) should subscribe to store updates.
 * 
 * **Problem Solved:**
 * - Without visibility tracking: All widgets subscribe to nmeaStore updates
 * - Result: 50 widgets = 50 re-renders per NMEA message
 * - With visibility: Only 4-6 visible widgets re-render
 * - Performance: 10-12x reduction in render overhead
 * 
 * **Usage Pattern:**
 * ```tsx
 * // ResponsiveDashboard sets context per page
 * <WidgetVisibilityProvider pageIndex={0} currentPage={currentPage}>
 *   <DepthWidget id="depth-0" />
 * </WidgetVisibilityProvider>
 * 
 * // Widget checks visibility before subscribing
 * const { isVisible } = useWidgetVisibility();
 * const depthData = useNmeaStore(
 *   (state) => isVisible ? state.nmeaData.sensors.depth?.[0] : null
 * );
 * ```
 * 
 * **Architecture:**
 * - Provider wraps each page in ResponsiveDashboard
 * - Hook returns isVisible boolean
 * - Widgets conditionally subscribe based on visibility
 * - Off-screen widgets render null or frozen state
 */

interface WidgetVisibilityContextValue {
  /** Whether widgets on this page are currently visible */
  isVisible: boolean;
  /** Current page index (for debugging) */
  pageIndex: number;
  /** Active page index (for debugging) */
  currentPage: number;
}

const WidgetVisibilityContext = createContext<WidgetVisibilityContextValue | undefined>(undefined);

interface WidgetVisibilityProviderProps {
  /** Page index this provider manages */
  pageIndex: number;
  /** Current active page */
  currentPage: number;
  /** Optional: preload adjacent pages (default: 0) */
  preloadBuffer?: number;
  children: React.ReactNode;
}

/**
 * Provider that tracks whether widgets on a specific page are visible
 * 
 * @param pageIndex - The page this provider manages
 * @param currentPage - The currently visible page
 * @param preloadBuffer - Number of adjacent pages to keep active (0 = current only)
 */
export const WidgetVisibilityProvider: React.FC<WidgetVisibilityProviderProps> = ({
  pageIndex,
  currentPage,
  preloadBuffer = 0,
  children,
}) => {
  const value = useMemo(() => {
    // Page is visible if within buffer range of current page
    const isVisible = Math.abs(pageIndex - currentPage) <= preloadBuffer;
    
    return {
      isVisible,
      pageIndex,
      currentPage,
    };
  }, [pageIndex, currentPage, preloadBuffer]);

  return (
    <WidgetVisibilityContext.Provider value={value}>
      {children}
    </WidgetVisibilityContext.Provider>
  );
};

/**
 * Hook to check if current widget is visible
 * 
 * Returns visibility state for conditional store subscriptions
 * 
 * @throws Error if used outside WidgetVisibilityProvider
 * 
 * @example
 * ```tsx
 * const { isVisible } = useWidgetVisibility();
 * 
 * // Conditional subscription
 * const depth = useNmeaStore(
 *   (state) => isVisible ? state.nmeaData.sensors.depth?.[0] : null
 * );
 * 
 * // Early return for off-screen widgets
 * if (!isVisible) return null;
 * ```
 */
export const useWidgetVisibility = (): WidgetVisibilityContextValue => {
  const context = useContext(WidgetVisibilityContext);
  
  if (context === undefined) {
    throw new Error('useWidgetVisibility must be used within WidgetVisibilityProvider');
  }
  
  return context;
};

/**
 * Optional: Hook with graceful fallback (always visible if no provider)
 * Use this for widgets that can exist outside ResponsiveDashboard
 */
export const useWidgetVisibilityOptional = (): WidgetVisibilityContextValue => {
  const context = useContext(WidgetVisibilityContext);
  
  // Default to visible if no provider (standalone widget use case)
  return context ?? {
    isVisible: true,
    pageIndex: 0,
    currentPage: 0,
  };
};
