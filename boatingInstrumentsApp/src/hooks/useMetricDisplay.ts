/**
 * useMetricDisplay Hook
 * 
 * Unified metric display hook replacing both legacy useUnitConversion and presentations.
 * Provides single source of truth: Settings → useMetricDisplay → Pre-formatted MetricDisplayData → Pure Components
 */

import { useMemo } from 'react';
import { useSettingsStore } from '../store/settingsStore';
import { MetricDisplayData, MetricDisplayOptions } from '../types/MetricDisplayData';
import { 
  PRESENTATIONS, 
  findPresentation, 
  getDefaultPresentation 
} from '../presentation/presentations';
import { DataCategory } from '../presentation/categories';
import { FontMeasurementService } from '../services/FontMeasurementService';

/**
 * Main useMetricDisplay hook - single interface for all metric displays
 */
export function useMetricDisplay(
  category: DataCategory,
  rawValue: number | null | undefined,
  mnemonic?: string,
  options?: MetricDisplayOptions
): MetricDisplayData {
  const { units } = useSettingsStore();
  
  return useMemo(() => {
    // Handle invalid inputs
    if (rawValue === null || rawValue === undefined || isNaN(rawValue)) {
      return createInvalidMetricDisplay(category, mnemonic, 'Invalid or missing value');
    }

    // Get current unit preference from settings
    const unitPreference = getUnitPreferenceForCategory(category, units);
    
    // Find presentation based on preference or options
    let presentation = options?.presentationId 
      ? findPresentation(category, options.presentationId)
      : findPresentation(category, unitPreference);
    
    // Fall back to default if not found
    if (!presentation) {
      presentation = getDefaultPresentation(category);
    }
    
    if (!presentation) {
      return createInvalidMetricDisplay(category, mnemonic, `No presentation found for category: ${category}`);
    }

    try {
      // Convert and format the value
      const convertedValue = presentation.convert(rawValue);
      const formattedValue = presentation.format(convertedValue);
      
      // Calculate optimal width for layout stability
      const fontSize = options?.fontSize || 16;
      const fontFamily = options?.fontFamily || 'system';
      const fontWeight = options?.fontWeight || 'normal';
      
      const minWidth = FontMeasurementService.calculateOptimalWidth(
        presentation.formatSpec,
        fontSize,
        fontFamily,
        fontWeight
      );

      return {
        mnemonic: mnemonic || presentation.symbol,
        value: formattedValue,
        unit: presentation.name,
        rawValue,
        layout: {
          minWidth,
          alignment: getAlignmentForCategory(category),
          fontSize
        },
        presentation: {
          id: presentation.id,
          name: presentation.name,
          pattern: presentation.formatSpec.pattern
        },
        status: {
          isValid: true,
          isFallback: false
        }
      };
      
    } catch (error) {
      return createInvalidMetricDisplay(
        category, 
        mnemonic, 
        `Conversion error: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }, [category, rawValue, mnemonic, units, options]);
}

/**
 * Get unit preference for a data category from settings
 */
function getUnitPreferenceForCategory(
  category: DataCategory, 
  units: any
): string {
  switch (category) {
    case 'depth':
      const depthUnit = units.depth;
      return depthUnit === 'meters' ? 'm_1' :
             depthUnit === 'feet' ? 'ft_1' :
             depthUnit === 'fathoms' ? 'fth_1' : 'm_1';
             
    case 'speed':
      const speedUnit = units.speed;
      return speedUnit === 'knots' ? 'kts_1' :
             speedUnit === 'kmh' ? 'kmh_1' :
             speedUnit === 'mph' ? 'mph_1' : 'kts_1';
             
    case 'wind':
      const windUnit = units.wind;
      return windUnit === 'knots' ? 'wind_kts_1' :
             windUnit === 'beaufort' ? 'bf_desc' :
             windUnit === 'kmh' ? 'kmh_0' : 'wind_kts_1';
             
    case 'temperature':
      const tempUnit = units.temperature;
      return tempUnit === 'celsius' ? 'c_1' :
             tempUnit === 'fahrenheit' ? 'f_1' : 'c_1';
             
    default:
      // Return first available presentation for unknown categories
      const presentations = PRESENTATIONS[category]?.presentations;
      return presentations?.[0]?.id || 'unknown';
  }
}

/**
 * Get text alignment preference for category
 */
function getAlignmentForCategory(category: DataCategory): 'left' | 'center' | 'right' {
  // Most marine instruments use right-aligned numbers for consistent decimal alignment
  return category === 'coordinates' ? 'center' : 'right';
}

/**
 * Create error/invalid metric display data
 */
function createInvalidMetricDisplay(
  category: DataCategory, 
  mnemonic?: string, 
  error?: string
): MetricDisplayData {
  return {
    mnemonic: mnemonic || '?',
    value: '---',
    unit: 'Invalid',
    rawValue: 0,
    layout: {
      minWidth: 40,
      alignment: 'center'
    },
    presentation: {
      id: 'invalid',
      name: 'Invalid',
      pattern: '---'
    },
    status: {
      isValid: false,
      error: error || 'Unknown error',
      isFallback: true
    }
  };
}

/**
 * Convenience hooks for specific categories
 */
export const useSpeedDisplay = (rawValue: number | null, options?: MetricDisplayOptions) =>
  useMetricDisplay('speed', rawValue, 'SPD', options);

export const useDepthDisplay = (rawValue: number | null, options?: MetricDisplayOptions) =>
  useMetricDisplay('depth', rawValue, 'DPT', options);

export const useWindSpeedDisplay = (rawValue: number | null, options?: MetricDisplayOptions) =>
  useMetricDisplay('wind', rawValue, 'AWS', options);

export const useTemperatureDisplay = (rawValue: number | null, options?: MetricDisplayOptions) =>
  useMetricDisplay('temperature', rawValue, 'TMP', options);

/**
 * Hook for getting all available presentations for a category
 */
export function useAvailablePresentations(category: DataCategory) {
  return useMemo(() => {
    return PRESENTATIONS[category]?.presentations || [];
  }, [category]);
}

/**
 * Hook for preloading font measurements for better performance
 */
export function useFontMeasurementPreload(fontSize: number = 16, fontFamily: string = 'system') {
  useMemo(() => {
    // Preload common marine measurements in background
    FontMeasurementService.preloadMarineMeasurements(fontSize, fontFamily);
  }, [fontSize, fontFamily]);
}