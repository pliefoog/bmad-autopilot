/**
 * useMetricDisplay Hook Tests
 * 
 * Comprehensive tests for the unified metric display system
 */

import React, { useState } from 'react';
import { render, act, renderHook } from '@testing-library/react-native';
import { Text, View } from 'react-native';
import { 
  useMetricDisplay, 
  useSpeedDisplay, 
  useDepthDisplay, 
  useWindSpeedDisplay,
  useTemperatureDisplay,
  useAvailablePresentations 
} from "../../../src/hooks/useMetricDisplay";
import { useSettingsStore } from "../../../src/store/settingsStore";

// Mock the settings store
jest.mock('../../../src/store/settingsStore');
const mockUseSettingsStore = useSettingsStore as jest.MockedFunction<typeof useSettingsStore>;

// Test wrapper component to test hooks
function TestComponent({ hookFunction, ...props }) {
  const result = hookFunction(props);
  return (
    <View testID="test-wrapper">
      <Text testID="test-result">{JSON.stringify(result)}</Text>
    </View>
  );
}

// Mock FontMeasurementService
jest.mock('../../../src/services/FontMeasurementService', () => ({
  FontMeasurementService: {
    calculateOptimalWidth: jest.fn(() => 50),
    preloadMarineMeasurements: jest.fn()
  }
}));

describe('useMetricDisplay', () => {
  const defaultUnits = {
    depth: 'meters',
    speed: 'knots',
    wind: 'knots',
    temperature: 'celsius'
  };

  beforeEach(() => {
    mockUseSettingsStore.mockReturnValue({
      units: defaultUnits
    } as any);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Basic Functionality', () => {
    it('should return valid metric display data for speed', () => {
      const { result } = renderHook(() => 
        useMetricDisplay('speed', 15.5, 'SPD')
      );

      expect(result.current.status.isValid).toBe(true);
      expect(result.current.mnemonic).toBe('SPD');
      expect(result.current.value).toBe('15.5');
      expect(result.current.presentation.id).toBe('kts_1');
      expect(result.current.layout.minWidth).toBe(50);
    });

    it('should return valid metric display data for depth', () => {
      const { result } = renderHook(() => 
        useMetricDisplay('depth', 12.8, 'DPT')
      );

      expect(result.current.status.isValid).toBe(true);
      expect(result.current.mnemonic).toBe('DPT');
      expect(result.current.value).toBe('12.8');
      expect(result.current.presentation.id).toBe('m_1');
    });

    it('should handle invalid input values gracefully', () => {
      const { result } = renderHook(() => 
        useMetricDisplay('speed', null, 'SPD')
      );

      expect(result.current.status.isValid).toBe(false);
      expect(result.current.value).toBe('---');
      expect(result.current.status.error).toBeDefined();
    });
  });

  describe('Unit Conversion Integration', () => {
    it('should use imperial units when configured', () => {
      mockUseSettingsStore.mockReturnValue({
        units: { ...defaultUnits, depth: 'feet' }
      } as any);

      const { result } = renderHook(() => 
        useMetricDisplay('depth', 10, 'DPT') // 10 meters
      );

      expect(result.current.presentation.id).toBe('ft_1');
      expect(parseFloat(result.current.value)).toBeCloseTo(32.8, 1); // ~32.8 feet
    });

    it('should use Beaufort scale for wind when configured', () => {
      mockUseSettingsStore.mockReturnValue({
        units: { ...defaultUnits, wind: 'beaufort' }
      } as any);

      const { result } = renderHook(() => 
        useMetricDisplay('wind', 15, 'AWS') // 15 knots ~ 4 Bf
      );

      expect(result.current.presentation.id).toBe('bf_desc');
      expect(result.current.value).toContain('Bf (');
    });

    it('should handle temperature conversion correctly', () => {
      mockUseSettingsStore.mockReturnValue({
        units: { ...defaultUnits, temperature: 'fahrenheit' }
      } as any);

      const { result } = renderHook(() => 
        useMetricDisplay('temperature', 20, 'TMP') // 20°C
      );

      expect(result.current.presentation.id).toBe('f_1');
      expect(parseFloat(result.current.value)).toBeCloseTo(68.0, 1); // 68°F
    });
  });

  describe('Presentation Override Options', () => {
    it('should respect presentationId override', () => {
      const { result } = renderHook(() => 
        useMetricDisplay('speed', 15.5, 'SPD', { presentationId: 'kts_0' })
      );

      expect(result.current.presentation.id).toBe('kts_0');
      expect(result.current.value).toBe('16'); // Rounded to integer
    });

    it('should use custom font settings for width calculation', () => {
      const { result } = renderHook(() => 
        useMetricDisplay('speed', 15.5, 'SPD', { fontSize: 24, fontFamily: 'Arial' })
      );

      expect(result.current.layout.fontSize).toBe(24);
      expect(result.current.layout.minWidth).toBe(50); // Mocked return value
    });
  });

  describe('Marine Format Patterns', () => {
    it('should format speed with xxx.x pattern', () => {
      const { result } = renderHook(() => 
        useMetricDisplay('speed', 5.23, 'SPD')
      );

      expect(result.current.value).toBe('5.2');
      expect(result.current.presentation.pattern).toBe('xxx.x');
    });

    it('should format Beaufort with description pattern', () => {
      const { result } = renderHook(() => 
        useMetricDisplay('wind', 15, 'AWS', { presentationId: 'bf_desc' })
      );

      expect(result.current.value).toMatch(/\d+ Bf \(.+\)/);
      expect(result.current.presentation.pattern).toBe('x Bf (Description)');
    });
  });

  describe('Layout Stability', () => {
    it('should provide consistent layout information', () => {
      const { result: result1 } = renderHook(() => 
        useMetricDisplay('speed', 5.2, 'SPD')
      );
      
      const { result: result2 } = renderHook(() => 
        useMetricDisplay('speed', 25.8, 'SPD')
      );

      // Same presentation should have same layout properties
      expect(result1.current.layout.minWidth).toBe(result2.current.layout.minWidth);
      expect(result1.current.layout.alignment).toBe(result2.current.layout.alignment);
    });

    it('should use right alignment for numeric values', () => {
      const { result } = renderHook(() => 
        useMetricDisplay('speed', 15.5, 'SPD')
      );

      expect(result.current.layout.alignment).toBe('right');
    });
  });

  describe('Convenience Hooks', () => {
    it('should provide speed-specific hook', () => {
      const { result } = renderHook(() => useSpeedDisplay(15.5));

      expect(result.current.mnemonic).toBe('SPD');
      expect(result.current.status.isValid).toBe(true);
    });

    it('should provide depth-specific hook', () => {
      const { result } = renderHook(() => useDepthDisplay(12.8));

      expect(result.current.mnemonic).toBe('DPT');
      expect(result.current.status.isValid).toBe(true);
    });

    it('should provide wind-specific hook', () => {
      const { result } = renderHook(() => useWindSpeedDisplay(18.2));

      expect(result.current.mnemonic).toBe('AWS');
      expect(result.current.status.isValid).toBe(true);
    });

    it('should provide temperature-specific hook', () => {
      const { result } = renderHook(() => useTemperatureDisplay(22.5));

      expect(result.current.mnemonic).toBe('TMP');
      expect(result.current.status.isValid).toBe(true);
    });
  });

  describe('Available Presentations Hook', () => {
    it('should return available presentations for a category', () => {
      const { result } = renderHook(() => useAvailablePresentations('speed'));

      expect(Array.isArray(result.current)).toBe(true);
      expect(result.current.length).toBeGreaterThan(0);
      expect(result.current[0]).toHaveProperty('id');
      expect(result.current[0]).toHaveProperty('name');
    });
  });

  describe('Error Handling', () => {
    it('should handle missing presentations gracefully', () => {
      const { result } = renderHook(() => 
        useMetricDisplay('depth', 10, 'DPT', { presentationId: 'nonexistent' })
      );

      // Should fall back to default presentation
      expect(result.current.status.isValid).toBe(true);
      expect(result.current.presentation.id).toBe('m_1');
    });

    it('should handle conversion errors gracefully', () => {
      const { result } = renderHook(() => 
        useMetricDisplay('speed', Infinity, 'SPD')
      );

      expect(result.current.status.isValid).toBe(false);
      expect(result.current.value).toBe('---');
    });

    it('should handle NaN values', () => {
      const { result } = renderHook(() => 
        useMetricDisplay('speed', NaN, 'SPD')
      );

      expect(result.current.status.isValid).toBe(false);
      expect(result.current.status.error).toContain('Invalid or missing value');
    });
  });

  describe('Performance and Caching', () => {
    it('should memoize results for same inputs', () => {
      const TestComponent = ({ value }: { value: number }) => {
        return useMetricDisplay('speed', value, 'SPD');
      };

      const { result, rerender } = renderHook(TestComponent, {
        initialProps: { value: 15.5 }
      });

      const firstResult = result.current;
      
      // Re-render with same props
      rerender({ value: 15.5 });
      
      // Should be same object reference (memoized)
      expect(result.current).toBe(firstResult);
    });

    it('should update when settings change', () => {
      const { result, rerender } = renderHook(() => 
        useMetricDisplay('speed', 15.5, 'SPD')
      );

      const initialResult = result.current;

      // Change units setting
      mockUseSettingsStore.mockReturnValue({
        units: { ...defaultUnits, speed: 'mph' }
      } as any);

      rerender({});

      // Should have different result
      expect(result.current.presentation.id).not.toBe(initialResult.presentation.id);
    });
  });

  describe('Marine Precision Standards', () => {
    it('should maintain marine precision for speed (1 decimal)', () => {
      const { result } = renderHook(() => 
        useMetricDisplay('speed', 15.567, 'SPD')
      );

      expect(result.current.value).toBe('15.6');
    });

    it('should maintain marine precision for depth (1 decimal)', () => {
      const { result } = renderHook(() => 
        useMetricDisplay('depth', 12.847, 'DPT')
      );

      expect(result.current.value).toBe('12.8');
    });
  });
});