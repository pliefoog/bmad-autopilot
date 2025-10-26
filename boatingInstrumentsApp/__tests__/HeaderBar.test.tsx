import React from 'react';
import { View } from 'react-native';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import HeaderBar from '../src/components/HeaderBar';
import { useNmeaStore } from '../src/store/nmeaStore';
import { useTheme } from '../src/store/themeStore';

// Mock the stores
jest.mock('../src/store/nmeaStore');
jest.mock('../src/store/themeStore');

// Mock the components that HeaderBar imports
jest.mock('../src/components/HamburgerMenu', () => {
  const React = require('react');
  const { View, Text } = require('react-native');
  return ({ visible, onClose }: any) =>
    visible ? (
      <View testID="hamburger-menu-modal">
        <Text>Hamburger Menu</Text>
      </View>
    ) : null;
});

const mockUseNmeaStore = useNmeaStore as jest.MockedFunction<typeof useNmeaStore>;
const mockUseTheme = useTheme as jest.MockedFunction<typeof useTheme>;

const mockTheme = {
  surface: '#FFFFFF',
  border: '#E5E7EB',
  text: '#1F2937',
  textSecondary: '#6B7280',
  background: '#F9FAFB',
  error: '#EF4444',
  warning: '#F59E0B',
  success: '#10B981',
  primary: '#3B82F6',
  secondary: '#6B7280',
  accent: '#8B5CF6',
  shadow: '#00000020',
};

describe('HeaderBar Component', () => {
  beforeEach(() => {
    mockUseTheme.mockReturnValue(mockTheme);
    mockUseNmeaStore.mockReturnValue({
      connectionStatus: 'disconnected',
    } as any);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // AC 1: Header height: 60pt
  it('should render with 60pt height', () => {
    const { getByTestId } = render(<HeaderBar />);
    const headerBar = getByTestId('header-container');
    
    expect(headerBar.props.style).toEqual(
      expect.objectContaining({
        height: 60,
      })
    );
  });

  // AC 2: Left hamburger menu icon (24×24pt, touchable 44×44pt)
  it('should render hamburger menu button with correct dimensions', () => {
    const { getByTestId } = render(<HeaderBar />);
    const hamburgerButton = getByTestId('hamburger-menu-button');
    
    expect(hamburgerButton.props.style).toEqual(
      expect.objectContaining({
        width: 44,
        height: 44,
      })
    );
    expect(hamburgerButton.props.accessibilityRole).toBe('button');
    expect(hamburgerButton.props.accessibilityLabel).toBe('Open navigation menu');
  });

  // AC 3: Center app title "BMad Instruments" (16pt, semibold, theme.text)
  it('should display app title with correct styling', () => {
    const { getByText } = render(<HeaderBar />);
    const title = getByText('BMad Instruments');
    
    expect(title.props.style).toEqual(
      expect.objectContaining({
        fontSize: 16,
        fontWeight: '600',
        color: mockTheme.text,
        textAlign: 'center',
      })
    );
  });

  // AC 4: Right connection status LED only (12pt diameter, no text label)
  it('should render connection LED without text label', () => {
    const { getByTestId, queryByText } = render(<HeaderBar />);
    const connectionLED = getByTestId('connection-status-led');
    
    // Should have LED circle
    expect(connectionLED).toBeTruthy();
    
    // Should NOT have text label like "DISCONNECTED"
    expect(queryByText('DISCONNECTED')).toBeNull();
    expect(queryByText('CONNECTED')).toBeNull();
    expect(queryByText('CONNECTING')).toBeNull();
  });

  // AC 5: Background uses theme.surface with theme.border
  it('should use theme colors for background and border', () => {
    const { getByTestId } = render(<HeaderBar />);
    const headerBar = getByTestId('header-container');
    
    expect(headerBar.props.style).toEqual(
      expect.objectContaining({
        backgroundColor: mockTheme.surface,
        borderBottomColor: mockTheme.border,
        borderBottomWidth: 1,
      })
    );
  });

  // AC 6-7: Connection LED colors (Red, Orange, Green) with states
  it('should show red LED when disconnected', () => {
    mockUseNmeaStore.mockReturnValue({
      connectionStatus: 'disconnected',
    } as any);

    const { getByTestId } = render(<HeaderBar />);
    const connectionLED = getByTestId('connection-status-led');
    const ledCircle = connectionLED.findByType(View);
    
    expect(ledCircle.props.style).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          backgroundColor: mockTheme.error, // Red
        }),
      ])
    );
  });

  it('should show orange LED when connecting', () => {
    mockUseNmeaStore.mockReturnValue({
      connectionStatus: 'connecting',
    } as any);

    const { getByTestId } = render(<HeaderBar />);
    const connectionLED = getByTestId('connection-status-led');
    const ledCircle = connectionLED.findByType(View);
    
    expect(ledCircle.props.style).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          backgroundColor: mockTheme.warning, // Orange
          opacity: 0.5, // Pulsing effect when connecting
        }),
      ])
    );
  });

  it('should show green LED when active with data', () => {
    mockUseNmeaStore.mockReturnValue({
      connectionStatus: 'no-data', // Maps to active state
    } as any);

    const { getByTestId } = render(<HeaderBar />);
    const connectionLED = getByTestId('connection-status-led');
    const ledCircle = connectionLED.findByType(View);
    
    expect(ledCircle.props.style).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          backgroundColor: mockTheme.success, // Green
        }),
      ])
    );
  });

  // AC 8: Tap LED opens connection settings modal
  it('should call onShowConnectionSettings when LED tapped', () => {
    const mockShowConnectionSettings = jest.fn();
    const { getByTestId } = render(
      <HeaderBar onShowConnectionSettings={mockShowConnectionSettings} />
    );
    
    const connectionLED = getByTestId('connection-status-led');
    fireEvent.press(connectionLED);
    
    expect(mockShowConnectionSettings).toHaveBeenCalledTimes(1);
  });

  // AC 9: Accessible label for connection status
  it('should have accessible labels for different connection states', () => {
    const states = [
      { status: 'disconnected', label: 'Connection status: disconnected' },
      { status: 'connecting', label: 'Connection status: connecting' },
      { status: 'connected', label: 'Connection status: connected, no data' },
      { status: 'no-data', label: 'Connection status: active with data' },
    ];

    states.forEach(({ status, label }) => {
      mockUseNmeaStore.mockReturnValue({
        connectionStatus: status,
      } as any);

      const { getByTestId } = render(<HeaderBar />);
      const connectionLED = getByTestId('connection-status-led');
      
      expect(connectionLED.props.accessibilityLabel).toBe(label);
    });
  });

  // AC 10-14: Toast message system
  it('should display toast message when provided', () => {
    const toastMessage = {
      message: 'Connection failed',
      type: 'error' as const,
    };

    const { getByText, queryByText } = render(
      <HeaderBar toastMessage={toastMessage} />
    );
    
    // Should show toast message instead of title
    expect(getByText('Connection failed')).toBeTruthy();
    expect(queryByText('BMad Instruments')).toBeNull();
  });

  it('should show app title when no toast message', () => {
    const { getByText, queryByText } = render(<HeaderBar />);
    
    // Should show title, no toast
    expect(getByText('BMad Instruments')).toBeTruthy();
    expect(queryByText('Connection failed')).toBeFalsy();
  });

  // AC 15-18: Hamburger menu functionality
  it('should open hamburger menu when hamburger button pressed', async () => {
    const { getByTestId, queryByTestId } = render(<HeaderBar />);
    
    // Initially menu should be hidden
    expect(queryByTestId('hamburger-menu-modal')).toBeNull();
    
    // Press hamburger button
    const hamburgerButton = getByTestId('hamburger-menu-button');
    fireEvent.press(hamburgerButton);
    
    // Menu should now be visible
    await waitFor(() => {
      expect(queryByTestId('hamburger-menu-modal')).toBeTruthy();
    });
  });

  // Test ID attributes for all interactive elements
  it('should have proper testID attributes', () => {
    const { getByTestId } = render(<HeaderBar />);
    
    expect(getByTestId('hamburger-menu-button')).toBeTruthy();
    expect(getByTestId('connection-status-led')).toBeTruthy();
  });

  // Ensure no hardcoded colors (theme integration)
  it('should use only theme colors, no hardcoded values', () => {
    const { getByTestId } = render(<HeaderBar />);
    const headerBar = getByTestId('header-container');
    
    // Should use theme.surface and theme.border values from mock
    expect(headerBar.props.style.backgroundColor).toBe(mockTheme.surface);
    expect(headerBar.props.style.borderBottomColor).toBe(mockTheme.border);
    
    // Verify it's using the exact theme values, not some other hardcoded color
    expect(headerBar.props.style.backgroundColor).toBe('#FFFFFF');
    expect(headerBar.props.style.borderBottomColor).toBe('#E5E7EB');
  });
});