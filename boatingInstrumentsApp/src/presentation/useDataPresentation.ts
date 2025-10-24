/**
 * Data Presentation Hook
 * 
 * Simple, clean replacement for the 1800-line useUnitConversion hook.
 * 
 * Provides convert/format functions for any data category
 * based on user's presentation preferences.
 */

import { useMemo } from 'react';
import { DataCategory } from './categories';
import { useCurrentPresentation } from './presentationStore';

export interface DataPresentationResult {
  // The selected presentation details
  presentation: {
    id: string;
    name: string;
    symbol: string;
    description: string;
  } | null;
  
  // Convert raw value to display value
  convert: (rawValue: number) => number;
  
  // Format display value as string
  format: (displayValue: number) => string;
  
  // Convert + format in one step
  convertAndFormat: (rawValue: number) => string;
  
  // Get formatted string with symbol
  formatWithSymbol: (rawValue: number) => string;
  
  // Reverse conversion (for inputs)
  convertBack: (displayValue: number) => number;
  
  // Validation
  isValid: boolean;
}

/**
 * Primary hook for data presentation
 * 
 * Usage examples:
 * ```ts
 * const depth = useDataPresentation('depth');
 * const displayValue = depth.convertAndFormat(5.2); // "5.2 m"
 * 
 * const speed = useDataPresentation('speed'); 
 * const knots = speed.convert(2.5); // 4.9 (m/s to knots)
 * const display = speed.formatWithSymbol(2.5); // "4.9 kts"
 * ```
 */
export function useDataPresentation(category: DataCategory): DataPresentationResult {
  const presentation = useCurrentPresentation(category);
  
  return useMemo(() => {
    if (!presentation) {
      // Fallback when no presentation is available
      return {
        presentation: null,
        convert: (value: number) => value,
        format: (value: number) => value.toString(),
        convertAndFormat: (value: number) => value.toString(),
        formatWithSymbol: (value: number) => value.toString(),
        convertBack: (value: number) => value,
        isValid: false
      };
    }
    
    const { convert, format, convertBack } = presentation;
    
    return {
      presentation: {
        id: presentation.id,
        name: presentation.name,
        symbol: presentation.symbol,
        description: presentation.description
      },
      
      convert,
      format,
      
      convertAndFormat: (rawValue: number) => {
        const converted = convert(rawValue);
        return format(converted);
      },
      
      formatWithSymbol: (rawValue: number) => {
        const converted = convert(rawValue);
        const formatted = format(converted);
        return `${formatted} ${presentation.symbol}`;
      },
      
      convertBack,
      
      isValid: true
    };
  }, [presentation]);
}

/**
 * Convenience hook for depth presentation
 */
export function useDepthPresentation() {
  return useDataPresentation('depth');
}

/**
 * Convenience hook for speed presentation  
 */
export function useSpeedPresentation() {
  return useDataPresentation('speed');
}

/**
 * Convenience hook for wind presentation
 */
export function useWindPresentation() {
  return useDataPresentation('wind');
}

/**
 * Convenience hook for temperature presentation
 */
export function useTemperaturePresentation() {
  return useDataPresentation('temperature');
}

/**
 * Hook for presenting multiple values of the same category
 * 
 * Useful for widgets that show min/max/avg etc.
 */
export function useMultiValuePresentation(
  category: DataCategory, 
  values: Record<string, number>
): Record<string, string> {
  const presentation = useDataPresentation(category);
  
  return useMemo(() => {
    if (!presentation.isValid) {
      return Object.fromEntries(
        Object.entries(values).map(([key, value]) => [key, value.toString()])
      );
    }
    
    return Object.fromEntries(
      Object.entries(values).map(([key, value]) => [
        key, 
        presentation.convertAndFormat(value)
      ])
    );
  }, [presentation, values]);
}

/**
 * Hook for batch conversion (performance optimization)
 * 
 * Useful when converting many values of same category at once.
 */
export function useBatchPresentation(
  category: DataCategory,
  values: number[]
): string[] {
  const presentation = useDataPresentation(category);
  
  return useMemo(() => {
    if (!presentation.isValid) {
      return values.map(v => v.toString());
    }
    
    return values.map(value => presentation.convertAndFormat(value));
  }, [presentation, values]);
}

// ===== UTILITY FUNCTIONS =====

/**
 * Direct conversion without hooks (for use outside React components)
 */
export function convertValue(
  category: DataCategory, 
  rawValue: number, 
  presentationId?: string
): { 
  converted: number; 
  formatted: string; 
  withSymbol: string; 
} {
  // Note: This would need access to the store outside React context
  // For now, this is a placeholder for future non-React usage
  console.warn('convertValue: Not implemented for non-React usage yet');
  return {
    converted: rawValue,
    formatted: rawValue.toString(),
    withSymbol: rawValue.toString()
  };
}

/**
 * Type guard for checking if a category has presentations available
 */
export function hasPresentations(category: DataCategory): boolean {
  // This could be enhanced to check the actual presentations registry
  const implementedCategories: DataCategory[] = ['depth', 'speed', 'wind', 'temperature'];
  return implementedCategories.includes(category);
}
