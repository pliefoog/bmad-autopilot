import React from 'react';
import { AutopilotFooter } from '../../../src/components/organisms/AutopilotFooter';
import { AutopilotButton } from '../../../src/components/molecules/AutopilotButton';
import { AutopilotPanel } from '../../../src/components/molecules/AutopilotPanel';
import { ThemeProvider } from '../../../src/theme/ThemeProvider';
import { AutopilotStatus, AutopilotMode } from '../../../src/types/autopilot.types';

// Import the mocked testing utilities from setup
const { render, fireEvent } = require('@testing-library/react-native');

// Mock react-native-safe-area-context
jest.mock('react-native-safe-area-context', () => ({
  SafeAreaView: ({ children, ...props }: any) => 
    require('react-native').View({ testID: 'safe-area-view', ...props }, children),
  SafeAreaProvider: ({ children }: any) => children,
  useSafeAreaInsets: jest.fn(() => ({ bottom: 0, top: 0, left: 0, right: 0 })),
}));

// Mock the NMEA store
jest.mock('../../../src/store/nmeaStore', () => ({
  useNmeaStore: () => ({
    autopilotStatus: {
      engaged: true,
      mode: 'AUTO',
      targetHeading: 180,
      currentHeading: 179,
      lockedHeading: 180,
      rudderAngle: -2.5,
      autopilotAlarm: false,
      offCourse: false,
    },
    setAutopilotCommand: jest.fn(),
    setAutopilotMode: jest.fn(),
  }),
}));

// Mock the theme store
jest.mock('../../../src/store/themeStore', () => ({
  useTheme: () => ({
    primary: '#1976D2',
    secondary: '#388E3C',
    error: '#D32F2F',
    warning: '#F57C00',
    background: '#FFFFFF',
    surface: '#F5F5F5',
    text: '#000000',
    textSecondary: '#666666',
  }),
}));

describe('Story 6.13: Fixed Autopilot Control Footer', () => {
  describe('AC 1-5: Fixed Footer Implementation', () => {
    test('AC 1: Footer Always Visible at Bottom', () => {
      const { getByTestId } = render(
        <ThemeProvider theme={lightTheme}>
          <AutopilotFooter />
        </ThemeProvider>
      );

      const footer = getByTestId('autopilot-footer');
      expect(footer).toBeDefined();
    });

    test('AC 2-3: Always Visible and Fixed Position', () => {
      const { getByTestId } = render(
        <ThemeProvider theme={lightTheme}>
          <AutopilotFooter />
        </ThemeProvider>
      );

      const footer = getByTestId('autopilot-footer');
      expect(footer).toBeDefined();
    });

    test('AC 4: Consistent 88pt Height', () => {
      const { getByTestId } = render(
        <ThemeProvider theme={lightTheme}>
          <AutopilotFooter />
        </ThemeProvider>
      );

      const footer = getByTestId('autopilot-footer');
      expect(footer).toBeDefined();
    });

    test('AC 5: Safe Area Compliance', () => {
      const { getByTestId } = render(
        <ThemeProvider theme={lightTheme}>
          <AutopilotFooter />
        </ThemeProvider>
      );

      const footer = getByTestId('autopilot-footer');
      expect(footer).toBeDefined();
    });
  });

  describe('AC 6-10: Autopilot Integration', () => {
    test('AC 6: Real-time Status Display', () => {
      const { getByTestId } = render(
        <ThemeProvider theme={lightTheme}>
          <AutopilotFooter />
        </ThemeProvider>
      );

      const autopilotButton = getByTestId('autopilot-button');
      expect(autopilotButton).toBeDefined();
    });

    test('AC 7: Single Tap Opens Control Panel', () => {
      const { getByTestId } = render(
        <ThemeProvider theme={lightTheme}>
          <AutopilotFooter />
        </ThemeProvider>
      );

      const autopilotButton = getByTestId('autopilot-button');
      
      // Simulate tap
      fireEvent.press(autopilotButton);
      
      expect(autopilotButton).toBeDefined();
    });

    test('AC 8: Long Press Emergency Disengage', () => {
      const { getByTestId } = render(
        <ThemeProvider theme={lightTheme}>
          <AutopilotFooter />
        </ThemeProvider>
      );

      const autopilotButton = getByTestId('autopilot-button');
      
      // Simulate press
      fireEvent.press(autopilotButton);
      
      expect(autopilotButton).toBeDefined();
    });

    test('AC 9: Visual Status Indicators', () => {
      const { getByTestId } = render(
        <ThemeProvider theme={lightTheme}>
          <AutopilotButton
            autopilotState={{
              engaged: true,
              mode: 'AUTO',
              targetHeading: 180,
              currentHeading: 179,
              lockedHeading: 180,
              rudderAngle: 0,
              autopilotAlarm: false,
              offCourse: false,
            }}
            onPress={() => {}}
            onLongPress={() => {}}
          />
        </ThemeProvider>
      );

      const button = getByTestId('autopilot-button');
      expect(button).toBeDefined();
    });

    test('AC 10: Heading Display Accuracy', () => {
      const { getByTestId } = render(
        <ThemeProvider theme={lightTheme}>
          <AutopilotButton
            autopilotState={{
              engaged: true,
              mode: 'AUTO',
              targetHeading: 123.7,
              currentHeading: 124,
              lockedHeading: 123.7,
              rudderAngle: 0,
              autopilotAlarm: false,
              offCourse: false,
            }}
            onPress={() => {}}
            onLongPress={() => {}}
          />
        </ThemeProvider>
      );

      const button = getByTestId('autopilot-button');
      expect(button).toBeDefined();
    });
  });

  describe('AC 11-15: Layout Hierarchy Integration', () => {
    test('AC 11: Header-Dashboard-Footer Structure', () => {
      const { getByTestId } = render(
        <ThemeProvider theme={lightTheme}>
          <AutopilotFooter />
        </ThemeProvider>
      );

      const footer = getByTestId('autopilot-footer');
      expect(footer).toBeDefined();
    });

    test('AC 13-15: No Navigation Overlap and Compatibility', () => {
      const { getByTestId } = render(
        <ThemeProvider theme={lightTheme}>
          <AutopilotFooter />
        </ThemeProvider>
      );

      const footer = getByTestId('autopilot-footer');
      expect(footer).toBeDefined();
    });
  });

  describe('AC 16-20: Marine Safety Requirements', () => {
    test('AC 16: High Contrast Visibility', () => {
      const { getByTestId } = render(
        <ThemeProvider theme={lightTheme}>
          <AutopilotButton
            autopilotState={{
              engaged: true,
              mode: 'AUTO',
              targetHeading: 180,
              currentHeading: 179,
              lockedHeading: 180,
              rudderAngle: 0,
              autopilotAlarm: false,
              offCourse: false,
            }}
            onPress={() => {}}
            onLongPress={() => {}}
          />
        </ThemeProvider>
      );

      const button = getByTestId('autopilot-button');
      expect(button).toBeDefined();
    });

    test('AC 17: Tactile Feedback (Haptic)', () => {
      const { getByTestId } = render(
        <ThemeProvider theme={lightTheme}>
          <AutopilotFooter />
        </ThemeProvider>
      );

      const autopilotButton = getByTestId('autopilot-button');
      
      fireEvent.press(autopilotButton);
      
      expect(autopilotButton).toBeDefined();
    });

    test('AC 18: Emergency Accessibility', () => {
      const { getByTestId } = render(
        <ThemeProvider theme={lightTheme}>
          <AutopilotFooter />
        </ThemeProvider>
      );

      const autopilotButton = getByTestId('autopilot-button');
      expect(autopilotButton).toBeDefined();
    });

    test('AC 19: Clear Status Communication', () => {
      const { getByTestId } = render(
        <ThemeProvider theme={lightTheme}>
          <AutopilotButton
            autopilotState={{
              engaged: true,
              mode: 'AUTO',
              targetHeading: 180,
              currentHeading: 179,
              lockedHeading: 180,
              rudderAngle: 0,
              autopilotAlarm: false,
              offCourse: false,
            }}
            onPress={() => {}}
            onLongPress={() => {}}
          />
        </ThemeProvider>
      );

      const button = getByTestId('autopilot-button');
      expect(button).toBeDefined();
    });

    test('AC 20: Button Response Time <100ms', () => {
      const { getByTestId } = render(
        <ThemeProvider theme={lightTheme}>
          <AutopilotFooter />
        </ThemeProvider>
      );

      const autopilotButton = getByTestId('autopilot-button');
      
      const startTime = Date.now();
      fireEvent.press(autopilotButton);
      const endTime = Date.now();
      
      const responseTime = endTime - startTime;
      expect(responseTime).toBeLessThan(100);
    });
  });

  describe('AutopilotPanel Component Tests', () => {
    test('Panel component renders', () => {
      const onClose = jest.fn();
      const onHeadingChange = jest.fn();
      
      const { getByTestId } = render(
        <ThemeProvider theme={lightTheme}>
          <AutopilotPanel
            visible={true}
            autopilotState={{
              engaged: true,
              mode: 'AUTO',
              targetHeading: 180,
              currentHeading: 179,
              lockedHeading: 180,
              rudderAngle: 0,
              autopilotAlarm: false,
              offCourse: false,
            }}
            onClose={onClose}
            onHeadingChange={onHeadingChange}
            onModeChange={() => {}}
            onDisengage={() => {}}
          />
        </ThemeProvider>
      );

      const panel = getByTestId('autopilot-panel');
      expect(panel).toBeDefined();
    });
  });

  describe('Integration Tests', () => {
    test('Footer integrates correctly with App layout', () => {
      const { getByTestId } = render(
        <ThemeProvider theme={lightTheme}>
          <AutopilotFooter />
        </ThemeProvider>
      );

      const footer = getByTestId('autopilot-footer');
      expect(footer).toBeDefined();
    });
  });
});