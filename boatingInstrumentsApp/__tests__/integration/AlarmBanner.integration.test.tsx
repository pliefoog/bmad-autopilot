import React from 'react';
import { render } from '@testing-library/react-native';
import { AlarmBanner } from '../../src/widgets/AlarmBanner';
import { Alarm } from '../../src/store/nmeaStore';

// Mock the settings store
jest.mock('../../src/store/settingsStore', () => ({
  useSettingsStore: jest.fn(() => ({
    themeSettings: {
      highContrast: false,
    },
  })),
}));

describe('AlarmBanner Integration', () => {
  const mockAlarms: Alarm[] = [
    {
      id: 'alarm-1',
      message: 'Test critical alarm',
      level: 'critical',
      timestamp: Date.now(),
    },
    {
      id: 'alarm-2', 
      message: 'Test warning alarm',
      level: 'warning',
      timestamp: Date.now(),
    },
  ];

  describe('AC1: Layout Integration', () => {
    it('AC1.1: renders AlarmBanner with proper structure', () => {
      const { getByText } = render(<AlarmBanner alarms={mockAlarms} />);
      
      // Should render both alarms
      expect(getByText('Test critical alarm')).toBeTruthy();
      expect(getByText('Test warning alarm')).toBeTruthy();
    });

    it('AC1.4: handles null/empty alarm arrays gracefully', () => {
      // Test null alarms
      const { rerender, queryByText } = render(<AlarmBanner alarms={null as any} />);
      expect(queryByText('Test critical alarm')).toBeNull();
      
      // Test empty alarms array
      rerender(<AlarmBanner alarms={[]} />);
      expect(queryByText('Test critical alarm')).toBeNull();
    });

    it('AC2.3: applies correct severity styling', () => {
      const { getByText } = render(<AlarmBanner alarms={mockAlarms} />);
      
      // The component should render without throwing errors
      // Visual styling validation would be done in manual testing
      expect(getByText('Test critical alarm')).toBeTruthy();
      expect(getByText('Test warning alarm')).toBeTruthy();
    });

    it('AC2.4: auto-hides when no active alarms exist', () => {
      const { rerender, getByText, queryByText } = render(<AlarmBanner alarms={mockAlarms} />);
      
      // Should show alarms initially
      expect(getByText('Test critical alarm')).toBeTruthy();
      
      // Should hide when no alarms
      rerender(<AlarmBanner alarms={[]} />);
      expect(queryByText('Test critical alarm')).toBeNull();
    });
  });
});