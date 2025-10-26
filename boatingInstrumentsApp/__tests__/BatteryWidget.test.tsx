import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { BatteryWidget } from '../src/widgets/BatteryWidget';
import { useNmeaStore } from '../src/store/nmeaStore';
import { useTheme } from '../src/store/themeStore';

// Mock the stores
jest.mock('../src/store/nmeaStore');
jest.mock('../src/store/themeStore');

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

describe('BatteryWidget', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseTheme.mockReturnValue(mockTheme);
  });

  it('renders correctly with no data', () => {
    mockUseNmeaStore.mockReturnValue(undefined);
    const { getByText, getAllByText } = render(<BatteryWidget />);
    expect(getByText('BATTERY')).toBeTruthy();
    expect(getAllByText('--').length).toBeGreaterThan(0);
  });

  it('renders correctly with battery data', () => {
    const mockBatteryData = {
      house: 12.6,
      engine: 13.2,
      houseStateOfCharge: 75,
      engineStateOfCharge: 85,
      houseCurrent: -8.5,
      alternatorOutput: 25.0
    };
    
    mockUseNmeaStore.mockReturnValue(mockBatteryData);
    
    const { getByText } = render(<BatteryWidget />);
    expect(getByText('BATTERY')).toBeTruthy();
    expect(getByText('12.6V')).toBeTruthy(); // House voltage
    expect(getByText('13.2V')).toBeTruthy(); // Engine voltage
    expect(getByText('75%')).toBeTruthy();   // House SOC
    expect(getByText('85%')).toBeTruthy();   // Engine SOC
  });

  it('displays current flow information', () => {
    const mockBatteryData = {
      house: 12.2,
      engine: 13.8,
      houseCurrent: -12.5, // Discharging
      alternatorOutput: 45.0
    };
    
    mockUseNmeaStore.mockReturnValue(mockBatteryData);
    
    const { getByText } = render(<BatteryWidget />);
    expect(getByText('House Current:')).toBeTruthy();
    expect(getByText('-12.5A')).toBeTruthy();
    expect(getByText('Alt: 45.0A')).toBeTruthy();
  });

  it('switches between overview and details view', () => {
    const mockBatteryData = {
      house: 12.6,
      engine: 13.2,
      chargingStatus: 'BULK',
      temperature: 22.5,
      bow: 12.1
    };
    
    mockUseNmeaStore.mockReturnValue(mockBatteryData);
    
    const { getByText, queryByText } = render(<BatteryWidget />);
    
    // Initially shows overview
    expect(getByText('12.6V')).toBeTruthy();
    expect(queryByText('Charging:')).toBeNull();
    
    // Tap to switch to details
    fireEvent.press(getByText('BATTERY'));
    
    // Now shows details
    expect(getByText('Charging:')).toBeTruthy();
    expect(getByText('BULK')).toBeTruthy();
    expect(getByText('Temperature:')).toBeTruthy();
    expect(getByText('22.5°C')).toBeTruthy();
  });

  it('shows critical state for low voltage', () => {
    const mockBatteryData = {
      house: 11.2, // Critical low voltage
      engine: 13.2
    };
    
    mockUseNmeaStore.mockReturnValue(mockBatteryData);
    
    const { getByText } = render(<BatteryWidget />);
    expect(getByText('11.2V')).toBeTruthy();
  });

  it('shows warning for moderate discharge', () => {
    const mockBatteryData = {
      house: 12.1, // Low but not critical
      engine: 13.2
    };
    
    mockUseNmeaStore.mockReturnValue(mockBatteryData);
    
    const { getByText } = render(<BatteryWidget />);
    expect(getByText('12.1V')).toBeTruthy();
  });
});