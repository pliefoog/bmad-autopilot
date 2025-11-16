import React from 'react';
import { render } from '@testing-library/react-native';
import { AlarmBanner } from '../../../src/widgets/AlarmBanner';
import { Alarm } from '../../../src/store/nmeaStore';

// Mock the stores
jest.mock('../../../src/store/settingsStore', () => ({
  useSettingsStore: jest.fn(),
}));

jest.mock('../../../src/store/themeStore', () => ({
  useTheme: jest.fn(),
}));

import { useSettingsStore } from '../../../src/store/settingsStore';
import { useTheme } from '../../../src/store/themeStore';

describe('AlarmBanner Theme Integration', () => {
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
    {
      id: 'alarm-3', 
      message: 'Test info alarm',
      level: 'info',
      timestamp: Date.now(),
    },
  ];

  const mockDayTheme = {
    primary: '#0284C7',
    secondary: '#0891B2',
    background: '#F8FAFC',
    surface: '#FFFFFF',
    appBackground: '#F3F4F6',
    text: '#0F172A',
    textSecondary: '#475569',
    accent: '#059669',
    warning: '#D97706',
    error: '#DC2626',
    success: '#059669',
    border: '#CBD5E1',
    shadow: '#00000020',
    iconPrimary: '#0F172A',
    iconSecondary: '#64748B',
    iconAccent: '#0284C7',
    iconDisabled: '#CBD5E1'
  };

  const mockNightTheme = {
    primary: '#38BDF8',
    secondary: '#22D3EE',
    background: '#0F172A',
    surface: '#1E293B',
    appBackground: '#000000',
    text: '#F1F5F9',
    textSecondary: '#94A3B8',
    accent: '#34D399',
    warning: '#FBBF24',
    error: '#F87171',
    success: '#34D399',
    border: '#334155',
    shadow: '#00000040',
    iconPrimary: '#F1F5F9',
    iconSecondary: '#94A3B8',
    iconAccent: '#38BDF8',
    iconDisabled: '#64748B'
  };

  const mockRedNightTheme = {
    primary: '#DC2626',
    secondary: '#991B1B',
    background: '#000000',
    surface: '#1F1917',
    appBackground: '#000000',
    text: '#FCA5A5',
    textSecondary: '#DC2626',
    accent: '#EF4444',
    warning: '#F59E0B',
    error: '#DC2626',
    success: '#DC2626',
    border: '#7F1D1D',
    shadow: '#00000060',
    iconPrimary: '#FCA5A5',
    iconSecondary: '#DC2626',
    iconAccent: '#EF4444',
    iconDisabled: '#7F1D1D'
  };

  beforeEach(() => {
    (useSettingsStore as unknown as jest.Mock).mockReturnValue({
      themeSettings: {
        highContrast: false,
      },
    });
  });

  describe('AC3: Theme System Compatibility', () => {
    it('AC3.1: renders correctly in day theme mode', () => {
      (useTheme as unknown as jest.Mock).mockReturnValue(mockDayTheme);

      const { getByText } = render(<AlarmBanner alarms={mockAlarms} />);
      
      expect(getByText('Test critical alarm')).toBeTruthy();
      expect(getByText('Test warning alarm')).toBeTruthy();
      expect(getByText('Test info alarm')).toBeTruthy();
    });

    it('AC3.2: renders correctly in night theme mode', () => {
      (useTheme as unknown as jest.Mock).mockReturnValue(mockNightTheme);

      const { getByText } = render(<AlarmBanner alarms={mockAlarms} />);
      
      expect(getByText('Test critical alarm')).toBeTruthy();
      expect(getByText('Test warning alarm')).toBeTruthy();
      expect(getByText('Test info alarm')).toBeTruthy();
    });

    it('AC3.3: renders correctly in red-night theme mode', () => {
      (useTheme as unknown as jest.Mock).mockReturnValue(mockRedNightTheme);

      const { getByText } = render(<AlarmBanner alarms={mockAlarms} />);
      
      expect(getByText('Test critical alarm')).toBeTruthy();
      expect(getByText('Test warning alarm')).toBeTruthy();
      expect(getByText('Test info alarm')).toBeTruthy();
    });

    it('AC3.4: high contrast mode compatibility maintained across all themes', () => {
      // Test high contrast with day theme
      (useSettingsStore as unknown as jest.Mock).mockReturnValue({
        themeSettings: {
          highContrast: true,
        },
      });
      (useTheme as unknown as jest.Mock).mockReturnValue(mockDayTheme);

      const { rerender, getByText } = render(<AlarmBanner alarms={mockAlarms} />);
      
      expect(getByText('Test critical alarm')).toBeTruthy();

      // Test high contrast with night theme
      (useTheme as unknown as jest.Mock).mockReturnValue(mockNightTheme);
      rerender(<AlarmBanner alarms={mockAlarms} />);
      
      expect(getByText('Test critical alarm')).toBeTruthy();

      // Test high contrast with red-night theme
      (useTheme as unknown as jest.Mock).mockReturnValue(mockRedNightTheme);
      rerender(<AlarmBanner alarms={mockAlarms} />);
      
      expect(getByText('Test critical alarm')).toBeTruthy();
    });
  });
});