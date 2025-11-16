import React from 'react';
import { render } from '@testing-library/react-native';
import AutopilotControlScreen from "../../../src/widgets/AutopilotControlScreen";
import { useNmeaStore } from "../../../src/store/nmeaStore";
import { useTheme } from "../../../src/store/themeStore";

jest.mock('../../../src/store/nmeaStore');
jest.mock('../../../src/store/themeStore');
jest.mock('../../../src/services/autopilotService', () => ({
  AutopilotCommandManager: jest.fn().mockImplementation(() => ({
    engageCompassMode: jest.fn().mockResolvedValue(true),
    disengageAutopilot: jest.fn().mockResolvedValue(true),
    adjustHeading: jest.fn().mockResolvedValue(true),
    emergencyDisengage: jest.fn().mockResolvedValue(true),
  })),
}));

jest.mock('../../../src/components/atoms/HelpButton', () => ({
  HelpButton: () => null,
}));

jest.mock('../../../src/components/molecules/Tooltip', () => ({
  Tooltip: () => null,
}));

jest.mock('../../../src/components/atoms/UniversalIcon', () => ({
  UniversalIcon: () => null,
}));

jest.mock('../../../src/content/help-content', () => ({
  getHelpContent: jest.fn(() => null),
  getRelatedTopics: jest.fn(() => []),
}));

jest.mock('react-native-sound', () => {
  return class MockSound {
    static setCategory = jest.fn();
    static MAIN_BUNDLE = 'MAIN_BUNDLE';
    constructor(filename: string, basePath: string, callback?: (error: any) => void) {
      // Don't use setTimeout - call immediately
      if (callback) callback(null);
    }
    play = jest.fn((callback?: (success: boolean) => void) => {
      if (callback) callback(true);
      return this;
    });
    release = jest.fn();
  };
});

const mockUseNmeaStore = useNmeaStore as jest.MockedFunction<typeof useNmeaStore>;
const mockUseTheme = useTheme as jest.MockedFunction<typeof useTheme>;

describe('AutopilotControlScreen - Simple Test', () => {
  beforeEach(() => {
    mockUseTheme.mockReturnValue({
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
      iconSecondary: '#475569',
      iconAccent: '#059669',
      iconDisabled: '#94A3B8',
    });

    mockUseNmeaStore.mockImplementation((selector: any) => {
      const state = {
        getSensorData: (sensorType: string, instance: number) => {
          if (sensorType === 'autopilot') return {
            mode: 'COMPASS',
            engaged: false,
            active: false,
            currentHeading: 175,
            targetHeading: 180,
          };
          if (sensorType === 'compass') return { heading: 175 };
          return undefined;
        },
      };
      return selector(state);
    });
  });

  it('should render without crashing', () => {
    let result;
    try {
      result = render(
        <AutopilotControlScreen visible={true} onClose={() => {}} />
      );
    } catch (error) {
      console.log('Render error:', error);
      throw error;
    }
    
    console.log('Render result type:', typeof result);
    console.log('Render result keys:', Object.keys(result || {}));
    
    expect(result).toBeDefined();
    expect(result.getByText).toBeDefined();
    expect(result.getByText('AUTOPILOT CONTROL')).toBeTruthy();
  });
});
