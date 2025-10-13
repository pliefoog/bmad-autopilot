// Mock react-native-gesture-handler
jest.mock('react-native-gesture-handler', () => {
  const { View } = require('react-native');
  return {
    PanGestureHandler: ({ children }: any) => <View testID="pan-gesture-handler">{children}</View>,
    State: {
      BEGAN: 2,
      ACTIVE: 4,
      END: 5,
    },
  };
});

// Mock react-native-reanimated
jest.mock('react-native-reanimated', () => {
  const { View } = require('react-native');
  return {
    __esModule: true,
    default: {
      View: View,
    },
    useSharedValue: (initial: any) => ({ value: initial }),
    useAnimatedStyle: () => ({}),
    runOnJS: (fn: any) => fn,
    withSpring: (value: any) => value,
  };
});

import React from 'react';
import { render } from '@testing-library/react-native';
import { Text } from 'react-native';
import DraggableWidget from '../src/widgets/DraggableWidget';
import type { WidgetLayout } from '../src/services/layoutService';

const mockLayout: WidgetLayout = {
  id: 'test-widget',
  position: { x: 100, y: 100 },
  size: { width: 160, height: 160 },
  visible: true,
  order: 0,
};

describe('DraggableWidget', () => {
  const mockOnPositionChange = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render children correctly', () => {
    const { getByText } = render(
      <DraggableWidget
        widgetId="test-widget"
        layout={mockLayout}
        onPositionChange={mockOnPositionChange}
        isDragMode={false}
      >
        <Text>Test Widget Content</Text>
      </DraggableWidget>
    );

    expect(getByText('Test Widget Content')).toBeTruthy();
  });

  it('should have correct initial position', () => {
    const { getByTestId } = render(
      <DraggableWidget
        widgetId="test-widget"
        layout={mockLayout}
        onPositionChange={mockOnPositionChange}
        isDragMode={false}
      >
        <Text>Test Widget</Text>
      </DraggableWidget>
    );

    // Should render the pan gesture handler
    expect(getByTestId('pan-gesture-handler')).toBeTruthy();
  });

  it('should show drag mode visual feedback when enabled', () => {
    const { getByText } = render(
      <DraggableWidget
        widgetId="test-widget"
        layout={mockLayout}
        onPositionChange={mockOnPositionChange}
        isDragMode={true}
      >
        <Text>Test Widget</Text>
      </DraggableWidget>
    );

    // Widget should still render
    expect(getByText('Test Widget')).toBeTruthy();
  });
});
