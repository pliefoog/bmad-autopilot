import React from 'react';
import { render, act } from '@testing-library/react-native';
import App from '../../src/mobile/App';
import { useAlarmStore } from '../../src/store/alarmStore';

// Mock all the required dependencies
jest.mock('../../src/store/themeStore', () => ({
  useTheme: () => ({
    appBackground: '#0f1419',
  }),
}));

jest.mock('../../src/store/nmeaStore', () => ({
  useNmeaStore: () => ({
    connectionStatus: 'disconnected',
    lastError: null,
  }),
}));

jest.mock('../../src/store/widgetStore', () => ({
  useWidgetStore: () => ({
    dashboards: [],
    currentDashboard: 0,
  }),
}));

jest.mock('../../src/hooks/useOnboarding', () => ({
  useOnboarding: () => ({
    isOnboardingVisible: false,
    isLoading: false,
    completeOnboarding: jest.fn(),
    skipOnboarding: jest.fn(),
  }),
}));

jest.mock('../../src/hooks/useToast', () => ({
  useToast: () => ({
    showSuccess: jest.fn(),
    showError: jest.fn(),
    showConnectionSuccess: jest.fn(),
    showConnectionError: jest.fn(),
  }),
}));

// Mock various components
jest.mock('../../src/widgets/DynamicDashboard', () => ({
  DynamicDashboard: () => null,
}));

jest.mock('../../src/components/HeaderBar', () => ({
  __esModule: true,
  default: () => null,
}));

jest.mock('../../src/components/toast', () => ({
  ToastContainer: () => null,
}));

jest.mock('../../src/components/organisms/AutopilotFooter', () => ({
  AutopilotFooter: () => null,
}));

jest.mock('../../src/components/dialogs/ConnectionConfigDialog', () => ({
  ConnectionConfigDialog: () => null,
}));

jest.mock('../../src/widgets/AutopilotControlScreen', () => ({
  AutopilotControlScreen: () => null,
}));

jest.mock('../../src/components/dialogs/UnitsConfigDialog', () => ({
  UnitsConfigDialog: () => null,
}));

jest.mock('../../src/components/dialogs/FactoryResetDialog', () => ({
  FactoryResetDialog: () => null,
}));

jest.mock('../../src/services/connectionDefaults', () => ({
  getConnectionDefaults: () => ({
    ip: '192.168.1.1',
    port: 8080,
    protocol: 'websocket',
  }),
  connectNmea: jest.fn(),
  disconnectNmea: jest.fn(),
  shouldEnableConnectButton: jest.fn(() => true),
  getCurrentConnectionConfig: jest.fn(() => null),
  initializeConnection: jest.fn(),
}));

describe('AlarmBanner App Integration', () => {
  describe('AC2: Alarm Display Functionality', () => {
    it('AC2.1: alarm triggering from store displays visual indicators correctly', async () => {
      // Mock the AlarmBanner component to verify it receives alarms
      const mockAlarmBanner = jest.fn(() => null);
      jest.doMock('../../src/widgets/AlarmBanner', () => ({
        AlarmBanner: mockAlarmBanner,
      }));

      const { rerender } = render(<App />);

      // Trigger an alarm using the store
      act(() => {
        useAlarmStore.getState().addAlarm({
          message: 'Test integration alarm',
          level: 'critical',
          source: 'integration-test',
        });
      });

      // Re-render to trigger React updates
      rerender(<App />);

      // Verify the AlarmBanner was called with the alarm
      expect(mockAlarmBanner).toHaveBeenCalledWith(
        expect.objectContaining({
          alarms: expect.arrayContaining([
            expect.objectContaining({
              message: 'Test integration alarm',
              level: 'critical',
            }),
          ]),
        }),
        expect.any(Object)
      );
    });

    it('AC2.2: multiple alarms display properly', async () => {
      // Clear existing alarms first
      act(() => {
        useAlarmStore.getState().clearAllAlarms();
      });

      // Add multiple alarms
      act(() => {
        useAlarmStore.getState().addAlarm({
          message: 'First alarm',
          level: 'warning',
        });
        useAlarmStore.getState().addAlarm({
          message: 'Second alarm',
          level: 'critical',
        });
      });

      // Verify the alarms are stored correctly
      const alarms = useAlarmStore.getState().activeAlarms;
      expect(alarms).toHaveLength(2);
      expect(alarms[0].message).toBe('First alarm');
      expect(alarms[1].message).toBe('Second alarm');
    });
  });
});