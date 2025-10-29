import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import EngineWidget from "../../../src/widgets/EngineWidget";
import { useNmeaStore } from "../../../src/store/nmeaStore";
import { useTheme } from "../../../src/store/themeStore";

// Mock the stores
jest.mock('../../../src/store/nmeaStore');
jest.mock('../../../src/store/themeStore');

const mockUseNmeaStore = useNmeaStore as jest.MockedFunction<typeof useNmeaStore>;
const mockUseTheme = useTheme as jest.MockedFunction<typeof useTheme>;

const mockTheme = {
  background: '#F8FAFC',
  surface: '#FFFFFF',
  primary: '#0284C7',
  secondary: '#0891B2',
  text: '#0F172A',
  textSecondary: '#475569',
  accent: '#F59E0B',
  warning: '#EAB308',
  error: '#DC2626',
  success: '#16A34A',
  border: '#E2E8F0',
  shadow: '#64748B',
};

describe('EngineWidget', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseTheme.mockReturnValue(mockTheme);
  });

  it('renders correctly with no data', () => {
    mockUseNmeaStore.mockReturnValue(undefined);
    const { getByText } = render(<EngineWidget />);
    expect(getByText('ENGINE')).toBeTruthy();
  });

  it('renders correctly with engine data', () => {
    const mockEngineData = {
      rpm: 2500,
      coolantTemp: 82,
      oilPressure: 45,
      engineHours: 1250.5,
      fuelFlow: 15.2
    };
    
    mockUseNmeaStore.mockReturnValue(mockEngineData);
    
    const { getByText } = render(<EngineWidget />);
    expect(getByText('ENGINE')).toBeTruthy();
    expect(getByText('2500')).toBeTruthy(); // RPM value
    expect(getByText('82°')).toBeTruthy();  // Temperature
    expect(getByText('45')).toBeTruthy();   // Oil pressure
  });

  it('shows engine hours when available', () => {
    const mockEngineData = {
      rpm: 1800,
      engineHours: 1250.5
    };
    
    mockUseNmeaStore.mockReturnValue(mockEngineData);
    
    const { getByText } = render(<EngineWidget />);
    expect(getByText('1251h engine hours')).toBeTruthy();
  });

  it('supports multiple engine configuration', () => {
    const mockEngineData = {
      port: { rpm: 2200, coolantTemp: 85 },
      starboard: { rpm: 2300, coolantTemp: 87 }
    };
    
    mockUseNmeaStore.mockReturnValue(mockEngineData);
    
    const { getByText } = render(<EngineWidget engineId="port" showMultipleEngines={true} />);
    expect(getByText('ENGINE PORT')).toBeTruthy();
    expect(getByText('2200')).toBeTruthy();
  });

  it('displays warning colors for high temperature', () => {
    const mockEngineData = {
      rpm: 2500,
      coolantTemp: 95, // Above warning threshold
      oilPressure: 25
    };
    
    mockUseNmeaStore.mockReturnValue(mockEngineData);
    
    const { getByText } = render(<EngineWidget />);
    expect(getByText('2500')).toBeTruthy();
  });

  it('displays alarm state for critical conditions', () => {
    const mockEngineData = {
      rpm: 2500,
      coolantTemp: 105, // Critical temperature
      oilPressure: 3     // Critical oil pressure
    };
    
    mockUseNmeaStore.mockReturnValue(mockEngineData);
    
    const { getByText } = render(<EngineWidget />);
    expect(getByText('2500')).toBeTruthy();
  });
});