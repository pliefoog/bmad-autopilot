/**
 * useMetricDisplay Hook
 *
 * Unified metric display hook replacing both legacy useUnitConversion and presentations.
 * Provides single source of truth: Settings → useMetricDisplay → Pre-formatted MetricDisplayData → Pure Components
 */

import { useMemo } from 'react';
import { useCurrentPresentation } from '../presentation/presentationStore';
import { MetricDisplayData, MetricDisplayOptions } from '../types/MetricDisplayData';
import {
  PRESENTATIONS,
  getDefaultPresentation,
  getConvertFunction,
  ensureFormatFunction,
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
  options?: MetricDisplayOptions,
): MetricDisplayData {
  // Story 9.6: Get presentation directly from presentation store (reactive)
  const presentation = useCurrentPresentation(category);

  return useMemo(() => {
    // Handle invalid inputs
    if (rawValue === null || rawValue === undefined || isNaN(rawValue)) {
      return createInvalidMetricDisplay(category, mnemonic, 'Invalid or missing value');
    }

    // Use current presentation from store, fallback to default
    const activePresentation = presentation || getDefaultPresentation(category);

    if (!activePresentation) {
      return createInvalidMetricDisplay(
        category,
        mnemonic,
        `No presentation found for category: ${category}`,
      );
    }

    try {
      // Convert and format the value with optional metadata
      const convertFn = getConvertFunction(activePresentation);
      const formatFn = ensureFormatFunction(activePresentation);
      const convertedValue = convertFn(rawValue);
      const formattedValue = formatFn(convertedValue, options?.metadata);

      // Calculate optimal width for layout stability
      const fontSize = options?.fontSize || 16;
      const fontFamily = options?.fontFamily || 'system';
      const fontWeight = options?.fontWeight || 'normal';

      const minWidth = FontMeasurementService.calculateOptimalWidth(
        activePresentation.formatSpec,
        fontSize,
        fontFamily,
        fontWeight,
      );

      return {
        mnemonic: mnemonic || activePresentation.symbol,
        value: formattedValue,
        unit: activePresentation.symbol, // Use symbol (DD, DDM, DMS) not full name
        rawValue,
        layout: {
          minWidth,
          alignment: getAlignmentForCategory(category),
          fontSize,
        },
        presentation: {
          id: activePresentation.id,
          name: activePresentation.name,
          pattern: activePresentation.formatSpec.pattern,
        },
        status: {
          isValid: true,
          isFallback: !presentation, // Mark as fallback if using default
        },
      };
    } catch (error) {
      return createInvalidMetricDisplay(
        category,
        mnemonic,
        `Conversion error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }, [category, rawValue, mnemonic, presentation, options]);
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
  error?: string,
): MetricDisplayData {
  return {
    mnemonic: mnemonic || '?',
    value: '---',
    unit: 'Invalid',
    rawValue: 0,
    layout: {
      minWidth: 40,
      alignment: 'center',
    },
    presentation: {
      id: 'invalid',
      name: 'Invalid',
      pattern: '---',
    },
    status: {
      isValid: false,
      error: error || 'Unknown error',
      isFallback: true,
    },
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
