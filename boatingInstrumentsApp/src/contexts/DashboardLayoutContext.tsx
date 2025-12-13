import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { LayoutChangeEvent } from 'react-native';

/**
 * DashboardLayoutContext
 * 
 * Provides measured dashboard container dimensions to all descendants.
 * This context serves multiple purposes:
 * 
 * 1. **Accurate Dimensions**: Provides actual measured container space (not screen size)
 *    - Widgets use these for responsive sizing and font scaling
 *    - Layout calculations use real available space
 * 
 * 2. **Drag-and-Drop Coordination** (future):
 *    - Shared coordinate space for all draggable widgets
 *    - Page boundary calculations for multi-page drops
 *    - Drop zone validation against measured dimensions
 * 
 * 3. **Footer Support**: When footer is added, dimensions automatically adjust
 *    - No code changes needed in consumers
 *    - onLayout re-measures and updates context
 * 
 * Usage:
 * ```tsx
 * // Provider (in App.tsx)
 * <DashboardLayoutProvider>
 *   <View onLayout={handleLayout}>
 *     <DynamicDashboard />
 *   </View>
 * </DashboardLayoutProvider>
 * 
 * // Consumer (in any child component)
 * const { width, height } = useDashboardLayout();
 * ```
 */

interface DashboardLayoutContextValue {
  /** Measured container width in pixels */
  width: number;
  
  /** Measured container height in pixels */
  height: number;
  
  /** Whether initial layout measurement is complete */
  isReady: boolean;
  
  /** Callback to update dimensions from onLayout event */
  updateLayout: (event: LayoutChangeEvent) => void;
}

const DashboardLayoutContext = createContext<DashboardLayoutContextValue | undefined>(undefined);

interface DashboardLayoutProviderProps {
  children: ReactNode;
}

export const DashboardLayoutProvider: React.FC<DashboardLayoutProviderProps> = ({ children }) => {
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const [isReady, setIsReady] = useState(false);

  const updateLayout = useCallback((event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;
    
    // TEMP 4K DEBUG: Log measured dimensions
    if (width >= 1920) {
      console.log('📐 CONTEXT DIMENSIONS:', { width, height, ratio: (width/height).toFixed(2) });
    }
    
    // Only update if dimensions actually changed (avoid unnecessary re-renders)
    setDimensions(prev => {
      if (prev.width !== width || prev.height !== height) {
        if (!isReady) {
          setIsReady(true);
        }
        return { width, height };
      }
      return prev;
    });
  }, [isReady]);

  return (
    <DashboardLayoutContext.Provider 
      value={{ 
        width: dimensions.width, 
        height: dimensions.height, 
        isReady,
        updateLayout 
      }}
    >
      {children}
    </DashboardLayoutContext.Provider>
  );
};

/**
 * Hook to access dashboard layout dimensions
 * 
 * @throws {Error} If used outside DashboardLayoutProvider
 * @returns {DashboardLayoutContextValue} Current layout dimensions and ready state
 * 
 * @example
 * ```tsx
 * function MyWidget() {
 *   const { width, height, isReady } = useDashboardLayout();
 *   
 *   if (!isReady) {
 *     return <LoadingSpinner />;
 *   }
 *   
 *   return <View style={{ width, height }}>...</View>;
 * }
 * ```
 */
export const useDashboardLayout = (): DashboardLayoutContextValue => {
  const context = useContext(DashboardLayoutContext);
  
  if (context === undefined) {
    throw new Error('useDashboardLayout must be used within a DashboardLayoutProvider');
  }
  
  return context;
};
