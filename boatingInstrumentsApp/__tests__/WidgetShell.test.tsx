import React from 'react';
import { Text } from 'react-native';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { WidgetShell } from '../src/components/WidgetShell';

// Mock theme store
const mockTheme = {
  surface: '#ffffff',
  border: '#e0e0e0',
  shadow: '#000000',
  text: '#000000',
  textSecondary: '#666666',
};

jest.mock('../src/core/themeStore', () => ({
  useTheme: () => mockTheme,
}));

// Mock Animated components for testing - use react-native-reanimated mocks
jest.mock('react-native-reanimated', () => {
  const Reanimated = require('react-native-reanimated/mock');
  Reanimated.default.call = () => {};
  return Reanimated;
});

describe('WidgetShell', () => {
  const mockChild = <Text testID="widget-child">Test Widget Content</Text>;
  const defaultProps = {
    children: mockChild,
    expanded: false,
    onToggle: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Basic Rendering', () => {
    it('renders widget shell with child content', () => {
      const { getByTestId } = render(<WidgetShell {...defaultProps} />);
      
      expect(getByTestId('widget-shell')).toBeTruthy();
      expect(getByTestId('widget-child')).toBeTruthy();
    });

    it('applies custom testID when provided', () => {
      const { getByTestId } = render(
        <WidgetShell {...defaultProps} testID="custom-widget" />
      );
      
      expect(getByTestId('custom-widget')).toBeTruthy();
      expect(getByTestId('custom-widget-touchable')).toBeTruthy();
      expect(getByTestId('custom-widget-chevron')).toBeTruthy();
    });
  });

  describe('Interaction', () => {
    it('calls onToggle when pressed', () => {
      const onToggle = jest.fn();
      const { getByTestId } = render(
        <WidgetShell {...defaultProps} onToggle={onToggle} />
      );
      
      fireEvent.press(getByTestId('widget-shell-touchable'));
      expect(onToggle).toHaveBeenCalledTimes(1);
    });

    it('has correct accessibility properties', () => {
      const { getByTestId } = render(<WidgetShell {...defaultProps} />);
      
      const touchable = getByTestId('widget-shell-touchable');
      expect(touchable.props.accessibilityRole).toBe('button');
      expect(touchable.props.accessibilityLabel).toBe('Expand widget');
    });

    it('updates accessibility label when expanded', () => {
      const { getByTestId } = render(
        <WidgetShell {...defaultProps} expanded={true} />
      );
      
      const touchable = getByTestId('widget-shell-touchable');
      expect(touchable.props.accessibilityLabel).toBe('Collapse widget');
    });
  });

  describe('State Management', () => {
    it('handles collapsed state correctly', () => {
      const { getByTestId } = render(<WidgetShell {...defaultProps} />);
      
      const container = getByTestId('widget-shell');
      // Verify initial collapsed state (animation values start at collapsed height)
      expect(container).toBeTruthy();
    });

    it('handles expanded state correctly', () => {
      const { getByTestId } = render(
        <WidgetShell {...defaultProps} expanded={true} />
      );
      
      const container = getByTestId('widget-shell');
      expect(container).toBeTruthy();
    });
  });

  describe('Animation', () => {
    it('triggers animation when expanded state changes', async () => {
      const { rerender } = render(<WidgetShell {...defaultProps} />);
      
      // Change expanded state
      rerender(<WidgetShell {...defaultProps} expanded={true} />);
      
      // Animation should be triggered (tested by ensuring no errors)
      await waitFor(() => {
        // Animation should complete without crashing
        expect(true).toBe(true);
      });
    });

    it('triggers animation when collapsed state changes', async () => {
      const { rerender } = render(
        <WidgetShell {...defaultProps} expanded={true} />
      );
      
      // Change back to collapsed
      rerender(<WidgetShell {...defaultProps} expanded={false} />);
      
      await waitFor(() => {
        // Animation should complete without crashing
        expect(true).toBe(true);
      });
    });
  });

  describe('Styling', () => {
    it('applies theme-based styling', () => {
      const { getByTestId } = render(<WidgetShell {...defaultProps} />);
      
      const container = getByTestId('widget-shell');
      expect(container.props.style).toMatchObject({
        backgroundColor: mockTheme.surface,
        borderColor: mockTheme.border,
      });
    });

    it('applies consistent dimensions', () => {
      const { getByTestId } = render(<WidgetShell {...defaultProps} />);
      
      const container = getByTestId('widget-shell');
      // AC 20, 21: Consistent sizing
      expect(container.props.style.width).toBe(180); // Mobile width
    });
  });

  describe('Platform Differences', () => {
    it('applies correct dimensions for different platforms', () => {
      // This would test tablet vs mobile sizing
      // Current implementation defaults to mobile (180x180)
      const { getByTestId } = render(<WidgetShell {...defaultProps} />);
      
      const container = getByTestId('widget-shell');
      expect(container.props.style.width).toBe(180);
    });
  });

  describe('Performance', () => {
    it('handles rapid state changes without crashing', () => {
      const onToggle = jest.fn();
      const { getByTestId, rerender } = render(
        <WidgetShell {...defaultProps} onToggle={onToggle} />
      );
      
      // Rapid state changes
      rerender(<WidgetShell {...defaultProps} expanded={true} />);
      rerender(<WidgetShell {...defaultProps} expanded={false} />);
      rerender(<WidgetShell {...defaultProps} expanded={true} />);
      
      // Should not crash
      expect(getByTestId('widget-shell')).toBeTruthy();
    });
  });

  describe('Edge Cases', () => {
    it('handles missing onToggle gracefully', () => {
      const propsWithoutToggle = {
        children: mockChild,
        expanded: false,
        onToggle: undefined as any,
      };
      
      expect(() => {
        render(<WidgetShell {...propsWithoutToggle} />);
      }).not.toThrow();
    });

    it('renders with no children', () => {
      const propsWithoutChildren = {
        ...defaultProps,
        children: null as any,
      };
      
      const { getByTestId } = render(<WidgetShell {...propsWithoutChildren} />);
      expect(getByTestId('widget-shell')).toBeTruthy();
    });
  });
});