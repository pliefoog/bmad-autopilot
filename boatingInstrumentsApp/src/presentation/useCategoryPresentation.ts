/**
 * Category Presentation Hook
 * 
 * Simplified replacement for useDataPresentation that works with SensorPresentationCache.
 * Provides convert/convertBack functions for unit conversions in forms and dialogs.
 * 
 * **Usage:**
 * ```typescript
 * const voltage = useCategoryPresentation('voltage');
 * const displayValue = voltage.convert(12.6); // SI -> display units
 * const siValue = voltage.convertBack(12.6); // display -> SI units
 * const symbol = voltage.symbol; // 'V'
 * ```
 */

import { useMemo } from 'react';
import { DataCategory } from './categories';
import { useCurrentPresentation } from './presentationStore';

export interface CategoryPresentationResult {
  /** Unit symbol (e.g., 'V', '°F', 'kts') */
  symbol: string;
  
  /** Convert SI value to display units */
  convert: (siValue: number) => number;
  
  /** Convert display units back to SI */
  convertBack: (displayValue: number) => number;
  
  /** Whether this presentation is valid (has data) */
  isValid: boolean;
}

/**
 * Get presentation functions for a specific category
 * 
 * @param category - Data category (voltage, temperature, etc.)
 * @returns Presentation result with convert/convertBack functions
 */
export function useCategoryPresentation(category: DataCategory): CategoryPresentationResult {
  const presentation = useCurrentPresentation(category);
  
  return useMemo(() => {
    if (!presentation) {
      // Fallback when no presentation is available
      const identity = (x: number) => x;
      return {
        symbol: '',
        convert: identity,
        convertBack: identity,
        isValid: false,
      };
    }
    
    return {
      symbol: presentation.symbol,
      convert: presentation.convert,
      convertBack: presentation.convertBack,
      isValid: true,
    };
  }, [presentation]);
}
