/**
 * Critical Alarm Visual System Tests
 * Tests for marine-grade visual indicators with high contrast and flashing animations
 */

import React from 'react';
import { render } from '@testing-library/react-native';
import { Text } from 'react-native';
import {
  CriticalAlarmIndicator,
  AlarmOverlaySystem,
  CompactAlarmBar,
} from '../../../src/components/alarms/CriticalAlarmVisuals';
import type { Alarm, AlarmLevel } from '../../../src/stores/alarmStore';

// Mock the alarm store
jest.mock('../../../src/stores/alarmStore', () => ({
  useAlarmStore: jest.fn(),
}));

import { useAlarmStore } from '../../../src/stores/alarmStore';

// Mock alarm creator
const createMockAlarm = (level: AlarmLevel, id?: string): Alarm => ({
  id: id || `alarm-${Date.now()}-${Math.random()}`,
  message: `Test ${level} alarm`,
  level,
  timestamp: Date.now(),
  source: 'test',
  value: 10,
  threshold: 5,
  acknowledged: false,
  acknowledgedAt: undefined,
  acknowledgedBy: undefined,
});

describe('CriticalAlarmVisuals', () => {
  const mockAlarmStore = {
    activeAlarms: [] as Alarm[],
    acknowledgeAlarm: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockAlarmStore.activeAlarms = [];
    (useAlarmStore as unknown as jest.Mock).mockReturnValue(mockAlarmStore);
  });

  describe('CriticalAlarmIndicator', () => {
    it('renders without crashing when no alarms present', () => {
      const mockAlarm = createMockAlarm('critical');
      const { getByTestId } = render(<CriticalAlarmIndicator alarm={mockAlarm} />);
      expect(getByTestId('critical-alarm-indicator')).toBeTruthy();
    });
  });

  describe('CompactAlarmBar', () => {
    it('renders nothing when no alarms present', () => {
      const { toJSON } = render(<CompactAlarmBar />);
      expect(toJSON()).toBeNull();
    });

    it('renders alarm bar when alarms are present', () => {
      mockAlarmStore.activeAlarms = [createMockAlarm('critical')];
      const { getByTestId } = render(<CompactAlarmBar />);
      expect(getByTestId('compact-alarm-bar')).toBeTruthy();
    });
  });

  describe('AlarmOverlaySystem', () => {
    it('renders children when no alarms present', () => {
      const { getByText } = render(
        <AlarmOverlaySystem>
          <Text>Test Content</Text>
        </AlarmOverlaySystem>
      );
      expect(getByText('Test Content')).toBeTruthy();
    });

    it('shows overlay when critical alarm is active', () => {
      mockAlarmStore.activeAlarms = [createMockAlarm('critical')];
      const { getByTestId } = render(
        <AlarmOverlaySystem>
          <Text>Test Content</Text>
        </AlarmOverlaySystem>
      );
      expect(getByTestId('alarm-overlay-system')).toBeTruthy();
    });
  });
});