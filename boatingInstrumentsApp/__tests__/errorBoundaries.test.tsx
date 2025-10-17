// Basic Error Boundary Integration Test
// Verifies that error boundaries can be imported and basic functionality works

import React from 'react';
import { render } from '@testing-library/react-native';
import {
  BaseErrorBoundary,
  WidgetErrorBoundary,
  ConnectionErrorBoundary,
  DataErrorBoundary,
} from '../src/components/errorBoundaries/simpleErrorBoundaries';
import { Text } from 'react-native';

// Mock component that throws an error
const ThrowingComponent: React.FC = () => {
  throw new Error('Test error');
};

// Mock component that renders normally
const NormalComponent: React.FC = () => <Text>Normal component</Text>;

describe('Error Boundary Components', () => {
  // Suppress console.error for these tests since we're testing error scenarios
  const originalConsoleError = console.error;
  beforeAll(() => {
    console.error = jest.fn();
  });
  afterAll(() => {
    console.error = originalConsoleError;
  });

  describe('BaseErrorBoundary', () => {
    it('should render children when no error occurs', () => {
      const { getByText } = render(
        <BaseErrorBoundary>
          <NormalComponent />
        </BaseErrorBoundary>
      );
      
      expect(getByText('Normal component')).toBeTruthy();
    });

    it('should render fallback UI when error occurs', () => {
      const { getByText } = render(
        <BaseErrorBoundary>
          <ThrowingComponent />
        </BaseErrorBoundary>
      );
      
      // Should render the default error fallback UI
      expect(getByText(/Something went wrong/i)).toBeTruthy();
    });
  });

  describe('WidgetErrorBoundary', () => {
    it('should render children when no error occurs', () => {
      const { getByText } = render(
        <WidgetErrorBoundary widgetId="test-widget" widgetType="test">
          <NormalComponent />
        </WidgetErrorBoundary>
      );
      
      expect(getByText('Normal component')).toBeTruthy();
    });

    it('should render widget-specific fallback UI when error occurs', () => {
      const { getByText } = render(
        <WidgetErrorBoundary widgetId="test-widget" widgetType="test">
          <ThrowingComponent />
        </WidgetErrorBoundary>
      );
      
      // Should render widget error fallback UI
      expect(getByText(/Widget Error/i)).toBeTruthy();
    });
  });

  describe('ConnectionErrorBoundary', () => {
    it('should render children when no error occurs', () => {
      const { getByText } = render(
        <ConnectionErrorBoundary connectionType="wifi" hostAddress="192.168.1.100">
          <NormalComponent />
        </ConnectionErrorBoundary>
      );
      
      expect(getByText('Normal component')).toBeTruthy();
    });

    it('should render connection-specific fallback UI when error occurs', () => {
      const { getByText } = render(
        <ConnectionErrorBoundary connectionType="wifi" hostAddress="192.168.1.100">
          <ThrowingComponent />
        </ConnectionErrorBoundary>
      );
      
      // Should render connection error fallback UI
      expect(getByText(/Connection Error/i)).toBeTruthy();
    });
  });

  describe('DataErrorBoundary', () => {
    it('should render children when no error occurs', () => {
      const { getByText } = render(
        <DataErrorBoundary dataType="nmea0183" sourceId="test-source">
          <NormalComponent />
        </DataErrorBoundary>
      );
      
      expect(getByText('Normal component')).toBeTruthy();
    });

    it('should render data-specific fallback UI when error occurs', () => {
      const { getByText } = render(
        <DataErrorBoundary dataType="nmea0183" sourceId="test-source">
          <ThrowingComponent />
        </DataErrorBoundary>
      );
      
      // Should render data error fallback UI
      expect(getByText(/Data Processing Error/i)).toBeTruthy();
    });
  });
});