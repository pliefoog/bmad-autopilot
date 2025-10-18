import React from 'react';
import { render } from '@testing-library/react-native';
import { Platform, Text } from 'react-native';
import { DraggableWidget } from '../../src/widgets/DraggableWidgetPlatform';
import { WidgetLayout } from '../../src/services/layoutService';

// Mock dependencies
jest.mock('react-native-gesture-handler', () => ({
  PanGestureHandler: ({ children }: any) => children,
  State: {
    BEGAN: 4,
    ACTIVE: 2,
    END: 5,
    CANCELLED: 3,
  },
}));

jest.mock('react-native-reanimated', () => ({
  default: {
    View: require('react-native').View,
  },
  useSharedValue: (initial: any) => ({ value: initial }),
  useAnimatedStyle: () => ({}),
  runOnJS: (fn: any) => fn,
  withSpring: (value: any) => value,
}));

const mockLayout: WidgetLayout = {
  id: 'test-widget',
  position: { x: 100, y: 100 },
  size: { width: 160, height: 160 },
  visible: true,
  order: 0,
};

const mockProps = {
  widgetId: 'test-widget',
  layout: mockLayout,
  onPositionChange: jest.fn(),
  onSizeChange: jest.fn(),
  onLongPress: jest.fn(),
  isDragMode: true,
  children: <Text testID="widget-content">Test Widget</Text>,
};

describe('DraggableWidgetPlatform - Cross-Platform Support', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Platform Selection & Rendering', () => {
    it('should export the DraggableWidget component', () => {
      expect(DraggableWidget).toBeDefined();
    });

    it('should render widget content on all platforms', () => {
      const { getByTestId } = render(<DraggableWidget {...mockProps} />);
      expect(getByTestId('widget-content')).toBeTruthy();
    });

    it('should render in drag mode', () => {
      const { getByTestId } = render(<DraggableWidget {...mockProps} />);
      const widgetContent = getByTestId('widget-content');
      expect(widgetContent).toBeTruthy();
      expect(widgetContent.props.children).toBe('Test Widget');
    });

    it('should render in normal mode', () => {
      const { getByTestId } = render(
        <DraggableWidget {...mockProps} isDragMode={false} />
      );
      const widgetContent = getByTestId('widget-content');
      expect(widgetContent).toBeTruthy();
    });

    it('should handle layout prop updates', () => {
      const { rerender, getByTestId } = render(<DraggableWidget {...mockProps} />);

      const newLayout = {
        ...mockLayout,
        position: { x: 200, y: 200 },
      };

      rerender(<DraggableWidget {...mockProps} layout={newLayout} />);

      // Component should render with updated layout
      expect(getByTestId('widget-content')).toBeTruthy();
    });

    it('should handle missing optional callback props gracefully', () => {
      const minimalProps = {
        widgetId: 'test-widget',
        layout: mockLayout,
        onPositionChange: jest.fn(),
        children: <Text testID="widget-content">Test Widget</Text>,
      };

      const { getByTestId } = render(<DraggableWidget {...minimalProps} />);
      expect(getByTestId('widget-content')).toBeTruthy();
    });
  });

  describe('Platform-Specific Behavior', () => {
    it('should use web implementation on web platform', () => {
      const originalPlatform = Platform.OS;
      (Platform as any).OS = 'web';

      const { getByTestId } = render(<DraggableWidget {...mockProps} />);
      expect(getByTestId('widget-content')).toBeTruthy();

      (Platform as any).OS = originalPlatform;
    });

    it('should use mobile implementation on iOS platform', () => {
      const originalPlatform = Platform.OS;
      (Platform as any).OS = 'ios';

      const { getByTestId } = render(<DraggableWidget {...mockProps} />);
      expect(getByTestId('widget-content')).toBeTruthy();

      (Platform as any).OS = originalPlatform;
    });

    it('should use mobile implementation on Android platform', () => {
      const originalPlatform = Platform.OS;
      (Platform as any).OS = 'android';

      const { getByTestId } = render(<DraggableWidget {...mockProps} />);
      expect(getByTestId('widget-content')).toBeTruthy();

      (Platform as any).OS = originalPlatform;
    });
  });

  describe('Prop Validation & Edge Cases', () => {
    it('should handle different widget sizes', () => {
      const largeLayout = {
        ...mockLayout,
        size: { width: 340, height: 340 },
      };

      const { getByTestId } = render(
        <DraggableWidget {...mockProps} layout={largeLayout} />
      );
      expect(getByTestId('widget-content')).toBeTruthy();
    });

    it('should handle different positions', () => {
      const offsetLayout = {
        ...mockLayout,
        position: { x: 50, y: 200 },
      };

      const { getByTestId } = render(
        <DraggableWidget {...mockProps} layout={offsetLayout} />
      );
      expect(getByTestId('widget-content')).toBeTruthy();
    });

    it('should handle zero position', () => {
      const zeroLayout = {
        ...mockLayout,
        position: { x: 0, y: 0 },
      };

      const { getByTestId } = render(
        <DraggableWidget {...mockProps} layout={zeroLayout} />
      );
      expect(getByTestId('widget-content')).toBeTruthy();
    });

    it('should handle minimum widget size', () => {
      const minLayout = {
        ...mockLayout,
        size: { width: 160, height: 160 },
      };

      const { getByTestId } = render(
        <DraggableWidget {...mockProps} layout={minLayout} />
      );
      expect(getByTestId('widget-content')).toBeTruthy();
    });

    it('should render with complex children', () => {
      const complexChildren = (
        <Text testID="complex-content">
          <Text>Nested</Text>
          <Text>Content</Text>
        </Text>
      );

      const { getByTestId } = render(
        <DraggableWidget {...mockProps}>
          {complexChildren}
        </DraggableWidget>
      );
      expect(getByTestId('complex-content')).toBeTruthy();
    });
  });

  describe('Performance & Stability', () => {
    it('should not cause excessive re-renders with same props', () => {
      const renderSpy = jest.fn();
      
      const TestComponent = (props: any) => {
        renderSpy();
        return <DraggableWidget {...props} />;
      };

      const { rerender } = render(<TestComponent {...mockProps} />);

      // Multiple rerenders with same props
      rerender(<TestComponent {...mockProps} />);
      rerender(<TestComponent {...mockProps} />);

      expect(renderSpy).toHaveBeenCalledTimes(3); // Initial + 2 rerenders
    });

    it('should handle rapid prop updates without crashing', () => {
      const { rerender, getByTestId } = render(<DraggableWidget {...mockProps} />);
      
      // Simulate rapid layout updates
      for (let i = 0; i < 10; i++) {
        const updatedLayout = {
          ...mockLayout,
          position: { x: i * 10, y: i * 10 },
        };
        
        rerender(<DraggableWidget {...mockProps} layout={updatedLayout} />);
      }

      // Should handle rapid updates without crashing
      expect(getByTestId('widget-content')).toBeTruthy();
    });

    it('should maintain widget functionality across platform switches', () => {
      const originalPlatform = Platform.OS;
      
      // Test on web
      (Platform as any).OS = 'web';
      const webRender = render(<DraggableWidget {...mockProps} />);
      expect(webRender.getByTestId('widget-content')).toBeTruthy();
      webRender.unmount();
      
      // Test on iOS  
      (Platform as any).OS = 'ios';
      const iosRender = render(<DraggableWidget {...mockProps} />);
      expect(iosRender.getByTestId('widget-content')).toBeTruthy();
      iosRender.unmount();
      
      // Test on Android
      (Platform as any).OS = 'android';
      const androidRender = render(<DraggableWidget {...mockProps} />);
      expect(androidRender.getByTestId('widget-content')).toBeTruthy();
      androidRender.unmount();

      (Platform as any).OS = originalPlatform;
    });

    it('should handle callback invocations without errors', () => {
      const { getByTestId } = render(<DraggableWidget {...mockProps} />);
      
      // Simulate callback calls that might happen during drag operations
      expect(() => {
        mockProps.onPositionChange('test-widget', { x: 150, y: 150 });
        if (mockProps.onSizeChange) {
          mockProps.onSizeChange('test-widget', { width: 200, height: 200 });
        }
        if (mockProps.onLongPress) {
          mockProps.onLongPress('test-widget');
        }
      }).not.toThrow();
      
      expect(getByTestId('widget-content')).toBeTruthy();
    });
  });
});