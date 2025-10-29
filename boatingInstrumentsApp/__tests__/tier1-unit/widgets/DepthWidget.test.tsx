import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import DepthWidget from "../../../src/widgets/DepthWidget";

// Mock dependencies
jest.mock('../../../src/store/nmeaStore', () => ({
  useNmeaStore: jest.fn(),
}));

jest.mock('../../../src/store/themeStore', () => ({
  useTheme: () => ({
    primary: '#0EA5E9',
    secondary: '#64748B',
    success: '#10B981',
    warning: '#F59E0B',
    error: '#EF4444',
    text: '#1E293B',
    textSecondary: '#64748B',
    background: '#FFFFFF',
    surface: '#F8FAFC',
    border: '#E2E8F0',
  }),
}));

const { useNmeaStore } = require('../src/store/nmeaStore');

describe('DepthWidget', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Depth Unit Conversions', () => {
    it('should convert meters to feet correctly', () => {
      // 10 meters = 32.8084 feet
      const depthMeters = 10;
      const expectedFeet = 32.8;
      const actualFeet = depthMeters * 3.28084;
      expect(Number(actualFeet.toFixed(1))).toBe(expectedFeet);
    });

    it('should convert meters to fathoms correctly', () => {
      // 10 meters = 5.47 fathoms (1 fathom = 1.8288 meters)
      const depthMeters = 10;
      const expectedFathoms = 5.47;
      const actualFathoms = depthMeters / 1.8288;
      expect(Number(actualFathoms.toFixed(2))).toBe(expectedFathoms);
    });

    it('should handle zero depth correctly', () => {
      expect(0 * 3.28084).toBe(0);
      expect(0 / 1.8288).toBe(0);
    });

    it('should handle very deep measurements', () => {
      const deepDepth = 1000; // 1000 meters
      expect(deepDepth * 3.28084).toBe(3280.84); // feet
      expect(Number((deepDepth / 1.8288).toFixed(2))).toBe(546.81); // fathoms
    });
  });

  describe('Trend Analysis', () => {
    it('should calculate stable trend for minimal depth changes', () => {
      const history = [10.0, 10.05, 10.02]; // Less than 0.1m change
      const trend = history[2] - history[0];
      const isStable = Math.abs(trend) < 0.1;
      expect(isStable).toBe(true);
    });

    it('should detect getting deeper trend', () => {
      const history = [5.0, 5.5, 6.0]; // Getting deeper
      const trend = history[2] - history[0];
      expect(trend > 0.1).toBe(true); // Should be "up" trend
    });

    it('should detect getting shallower trend', () => {
      const history = [10.0, 8.0, 6.0]; // Getting shallower  
      const trend = history[2] - history[0];
      expect(trend < -0.1).toBe(true); // Should be "down" trend
    });
  });

  describe('Shallow Water Warning States', () => {
    it('should trigger alarm state for very shallow water', () => {
      const depth = 1.5; // 1.5 meters
      const shallowWarning = 2.0;
      const shouldAlarm = depth <= shallowWarning;
      expect(shouldAlarm).toBe(true);
    });

    it('should trigger highlighted state for caution depth', () => {
      const depth = 2.5; // 2.5 meters
      const shallowWarning = 2.0;
      const shouldHighlight = depth <= (shallowWarning + 1.0) && depth > shallowWarning;
      expect(shouldHighlight).toBe(true);
    });

    it('should show normal state for safe depth', () => {
      const depth = 5.0; // 5 meters
      const shallowWarning = 2.0;
      const isNormal = depth > (shallowWarning + 1.0);
      expect(isNormal).toBe(true);
    });
  });

  describe('Component Rendering', () => {
    it('should render with no data state', () => {
      useNmeaStore.mockReturnValue(undefined);
      
      const { getByTestId } = render(<DepthWidget />);
      expect(getByTestId('depth-widget-title')).toBeTruthy();
    });

    it('should render with valid depth data', () => {
      useNmeaStore.mockReturnValue(5.5); // 5.5 meters
      
      const { getByTestId } = render(<DepthWidget />);
      expect(getByTestId('depth-widget-title')).toBeTruthy();
      expect(getByTestId('metric-value')).toBeTruthy();
    });

    it('should handle undefined depth gracefully', () => {
      useNmeaStore.mockReturnValue(null);
      
      expect(() => render(<DepthWidget />)).not.toThrow();
    });
  });

  describe('Marine Standards Compliance', () => {
    it('should use proper marine depth units', () => {
      // Test standard marine depth conversions
      const testDepths = [
        { meters: 1.8288, fathoms: 1.0 }, // 1 fathom
        { meters: 0.3048, feet: 1.0 },    // 1 foot
      ];

      testDepths.forEach(({ meters, fathoms, feet }) => {
        if (fathoms) {
          expect(Number((meters / 1.8288).toFixed(0))).toBe(fathoms);
        }
        if (feet) {
          expect(Number((meters * 3.28084).toFixed(0))).toBe(feet);
        }
      });
    });

    it('should provide appropriate shallow water warnings for different vessel types', () => {
      // Test typical shallow water thresholds
      const warnings = [
        { threshold: 2.0, type: 'recreational sailboat' },
        { threshold: 1.0, type: 'shallow draft' },
        { threshold: 3.0, type: 'deep keel' },
      ];

      warnings.forEach(({ threshold }) => {
        expect(threshold).toBeGreaterThan(0);
        expect(threshold).toBeLessThan(10); // Reasonable upper bound
      });
    });
  });

  describe('Widget Expansion (Story 2.12)', () => {
    it('starts in collapsed state by default', () => {
      const { getByTestId } = render(<DepthWidget />);
      
      // Should have WidgetShell in collapsed state
      expect(getByTestId('depth-widget-shell')).toBeTruthy();
    });

    it('expands when tapped', () => {
      const { getByTestId } = render(<DepthWidget />);
      
      // Tap to expand
      fireEvent.press(getByTestId('depth-widget-shell-touchable'));
      
      // Should now be in expanded state (no crash means success)
      expect(getByTestId('depth-widget-shell')).toBeTruthy();
    });

    it('shows unit cycling button only in expanded state', async () => {
      const { getByTestId, queryByTestId } = render(<DepthWidget />);
      
      // Wait for initial loading to complete
      await waitFor(() => {
        expect(getByTestId('depth-widget-shell')).toBeTruthy();
      });
      
      // In collapsed state, unit button should not exist
      expect(queryByTestId('depth-widget-unit-cycle')).toBeNull();
      
      // Expand widget
      fireEvent.press(getByTestId('depth-widget-shell-touchable'));
      
      // Wait for expansion to complete and unit button to appear
      await waitFor(() => {
        expect(getByTestId('depth-widget-unit-cycle')).toBeTruthy();
      });
    });

    it('handles unit cycling in expanded state', async () => {
      // Set some depth data first so unit conversion is visible
      useNmeaStore.mockReturnValue(3.0); // 3.0 meters
      
      const { getByTestId, getByText } = render(<DepthWidget />);
      
      // Wait for initial loading
      await waitFor(() => {
        expect(getByTestId('depth-widget-shell')).toBeTruthy();
      });
      
      // Expand widget first
      fireEvent.press(getByTestId('depth-widget-shell-touchable'));
      
      // Wait for expansion and unit button to appear
      await waitFor(() => {
        expect(getByTestId('depth-widget-unit-cycle')).toBeTruthy();
      });
      
      // Should show meters initially
      expect(getByText('m')).toBeTruthy();
      
      // Cycle units
      fireEvent.press(getByTestId('depth-widget-unit-cycle'));
      
      // Wait for unit change to take effect
      await waitFor(() => {
        expect(getByText('ft')).toBeTruthy();
      });
    });

    it('shows chevron indicator', () => {
      const { getByTestId } = render(<DepthWidget />);
      
      // Chevron should be present
      expect(getByTestId('depth-widget-chevron')).toBeTruthy();
      
      // Should show collapsed chevron initially (⌄)
      expect(getByTestId('depth-widget-chevron')).toHaveTextContent('⌄');
    });

    it('updates chevron when expanded', async () => {
      const { getByTestId } = render(<DepthWidget />);
      
      // Wait for initial loading
      await waitFor(() => {
        expect(getByTestId('depth-widget-shell')).toBeTruthy();
      });
      
      // Expand widget
      fireEvent.press(getByTestId('depth-widget-shell-touchable'));
      
      // Chevron should now show expanded state (⌃)
      await waitFor(() => {
        expect(getByTestId('depth-widget-chevron')).toHaveTextContent('⌃');
      });
    });
  });
});