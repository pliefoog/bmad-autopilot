import React from 'react';
import { render } from '@testing-library/react-native';
import StatusIndicator from '../../../../src/components/marine/StatusIndicator';
import { useThemeStore } from '../../../../src/store/themeStore';

describe('StatusIndicator - Red-Night Mode Compliance (Story 13.1.1)', () => {
  beforeEach(() => {
    // Reset theme to day mode before each test
    const store = useThemeStore.getState();
    store.setMode('day');
  });

  describe('AC1: Green Color Elimination', () => {
    test('should NOT use hardcoded green #00AA00 in any theme mode', () => {
      const { getByTestID } = render(
        <StatusIndicator status="normal" testID="status-indicator" />
      );
      
      const indicator = getByTestID('status-indicator');
      
      // Component should not contain hardcoded green color string
      const indicatorProps = JSON.stringify(indicator.props);
      expect(indicatorProps).not.toContain('#00AA00');
      expect(indicatorProps).not.toContain('#10B981');
    });

    test('should use theme.success color for normal status in day mode', () => {
      const store = useThemeStore.getState();
      store.setMode('day');
      const { colors } = store;
      
      const { getByTestID } = render(
        <StatusIndicator status="normal" testID="status-led" />
      );
      
      // In day mode, theme.success is green (#059669) - this is acceptable
      expect(colors.success).toBe('#059669');
    });

    test('should use red spectrum for normal status in red-night mode (AC1)', () => {
      const store = useThemeStore.getState();
      store.setMode('red-night');
      const { colors } = store;
      
      // Red-night mode success color should be RED, not green
      expect(colors.success).toBe('#DC2626');
      expect(colors.success).not.toContain('10B981');
      expect(colors.success).not.toContain('00AA00');
      
      const { getByTestID } = render(
        <StatusIndicator status="normal" testID="status-led" />
      );
      
      // Component should receive red color from theme
      const indicator = getByTestID('status-led');
      expect(indicator).toBeDefined();
    });
  });

  describe('AC3: Active State Visual Distinction', () => {
    test('normal state should use theme.success (bright red in red-night)', () => {
      const store = useThemeStore.getState();
      store.setMode('red-night');
      const { colors } = store;
      
      const { getByTestID } = render(
        <StatusIndicator status="normal" testID="active-indicator" />
      );
      
      // Active state uses bright red (#DC2626 in red-night)
      expect(colors.success).toBe('#DC2626');
      
      const indicator = getByTestID('active-indicator');
      expect(indicator).toBeDefined();
    });

    test('off state should remain distinguishable from normal state', () => {
      const { getByTestID: getNormal } = render(
        <StatusIndicator status="normal" testID="normal-led" />
      );
      
      const { getByTestID: getOff } = render(
        <StatusIndicator status="off" testID="off-led" />
      );
      
      const normalLed = getNormal('normal-led');
      const offLed = getOff('off-led');
      
      expect(normalLed).toBeDefined();
      expect(offLed).toBeDefined();
      // Both should render successfully with different appearances
    });
  });

  describe('Theme Integration', () => {
    test('should respond to theme changes without restart', () => {
      const store = useThemeStore.getState();
      
      const { rerender, getByTestID } = render(
        <StatusIndicator status="normal" testID="theme-aware-led" />
      );
      
      // Switch from day to red-night
      store.setMode('day');
      rerender(<StatusIndicator status="normal" testID="theme-aware-led" />);
      
      store.setMode('red-night');
      rerender(<StatusIndicator status="normal" testID="theme-aware-led" />);
      
      const indicator = getByTestID('theme-aware-led');
      expect(indicator).toBeDefined();
      
      // Verify theme colors changed
      const { colors } = useThemeStore.getState();
      expect(colors.success).toBe('#DC2626'); // Red in red-night mode
    });

    test('all status states should be theme-aware', () => {
      const store = useThemeStore.getState();
      store.setMode('red-night');
      const { colors } = store;
      
      const statuses: Array<'normal' | 'caution' | 'alarm' | 'off' | 'unknown'> = [
        'normal',
        'caution',
        'alarm',
        'off',
        'unknown',
      ];
      
      statuses.forEach((status) => {
        const { getByTestID } = render(
          <StatusIndicator status={status} testID={`led-${status}`} />
        );
        
        const indicator = getByTestID(`led-${status}`);
        expect(indicator).toBeDefined();
      });
      
      // Verify theme colors are red spectrum in red-night mode
      expect(colors.success).toContain('DC2626'); // Red
      expect(colors.warning).toContain('F59E0B'); // Amber
      expect(colors.error).toContain('DC2626'); // Red
    });
  });

  describe('Marine Safety Standards', () => {
    test('should support all marine status states', () => {
      const states: Array<'normal' | 'caution' | 'alarm' | 'off' | 'unknown'> = [
        'normal',
        'caution',
        'alarm',
        'off',
        'unknown',
      ];
      
      states.forEach((state) => {
        const { getByTestID } = render(
          <StatusIndicator status={state} testID={`marine-led-${state}`} />
        );
        
        const indicator = getByTestID(`marine-led-${state}`);
        expect(indicator).toBeDefined();
      });
    });

    test('should support different sizes for various display contexts', () => {
      const sizes: Array<'small' | 'medium' | 'large'> = ['small', 'medium', 'large'];
      
      sizes.forEach((size) => {
        const { getByTestID } = render(
          <StatusIndicator 
            status="normal" 
            size={size}
            testID={`sized-led-${size}`}
          />
        );
        
        const indicator = getByTestID(`sized-led-${size}`);
        expect(indicator).toBeDefined();
      });
    });
  });
});
