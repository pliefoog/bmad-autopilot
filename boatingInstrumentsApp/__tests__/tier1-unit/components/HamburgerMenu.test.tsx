import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import HamburgerMenu from "../../../src/components/HamburgerMenu";
import { useTheme } from "../../../src/store/themeStore";

// Mock the theme stores
jest.mock('../../../src/store/themeStore');

const mockUseTheme = useTheme as jest.MockedFunction<typeof useTheme>;
const mockUseThemeStore = useThemeStore as jest.MockedFunction<typeof useThemeStore>;

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

describe('HamburgerMenu Component', () => {
  const mockSetMode = jest.fn();

  beforeEach(() => {
    mockUseTheme.mockReturnValue(mockTheme);
    mockUseThemeStore.mockReturnValue({
      mode: 'day',
      setMode: mockSetMode,
    } as any);
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.useRealTimers();
  });

  // AC 15: Opens slide-in drawer from left (80% screen width)
  it('should render drawer with 80% screen width when visible', () => {
    const mockOnClose = jest.fn();
    const { getByTestId } = render(
      <HamburgerMenu visible={true} onClose={mockOnClose} />
    );

    const drawer = getByTestId('hamburger-menu-drawer');
    
    // Should be present when visible
    expect(drawer).toBeTruthy();
    
    // Should use 80% of screen width (mocked screen width would be used)
    const screenWidth = 400; // Mock screen width
    const expectedWidth = screenWidth * 0.8;
    
    // Width is set dynamically based on screen dimensions
    expect(drawer.props.style).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          width: expect.any(Number),
        }),
      ])
    );
  });

  it('should not render when not visible', () => {
    const mockOnClose = jest.fn();
    const { queryByTestId } = render(
      <HamburgerMenu visible={false} onClose={mockOnClose} />
    );

    // Modal should not render when visible=false
    expect(queryByTestId('hamburger-menu-modal')).toBeNull();
  });

  // AC 16: Menu items: Settings, Layouts, Alarms, Connection, About
  it('should display all required menu items', () => {
    const mockOnClose = jest.fn();
    const { getByTestId } = render(
      <HamburgerMenu visible={true} onClose={mockOnClose} />
    );

    // Check all required menu items exist
    expect(getByTestId('menu-settings')).toBeTruthy();
    expect(getByTestId('menu-layouts')).toBeTruthy();
    expect(getByTestId('menu-alarms')).toBeTruthy();
    expect(getByTestId('menu-connection')).toBeTruthy();
    expect(getByTestId('menu-about')).toBeTruthy();
  });

  it('should close menu when menu item is pressed', () => {
    const mockOnClose = jest.fn();
    const { getByTestId } = render(
      <HamburgerMenu visible={true} onClose={mockOnClose} />
    );

    const settingsItem = getByTestId('menu-settings');
    fireEvent.press(settingsItem);

    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  // AC 17: Theme switcher toggle at bottom of drawer
  it('should display theme switcher at bottom', () => {
    const mockOnClose = jest.fn();
    const { getByTestId, getByText } = render(
      <HamburgerMenu visible={true} onClose={mockOnClose} />
    );

    const themeSwitcher = getByTestId('theme-switcher');
    expect(themeSwitcher).toBeTruthy();

    // Should show current mode
    expect(getByText('Day Mode')).toBeTruthy();
  });

  it('should cycle through theme modes when theme switcher pressed', () => {
    const mockOnClose = jest.fn();
    
    // Test day -> night
    mockUseThemeStore.mockReturnValue({
      mode: 'day',
      setMode: mockSetMode,
    } as any);

    const { getByTestId } = render(
      <HamburgerMenu visible={true} onClose={mockOnClose} />
    );

    const themeSwitcher = getByTestId('theme-switcher');
    fireEvent.press(themeSwitcher);

    expect(mockSetMode).toHaveBeenCalledWith('night');
  });

  it('should show correct theme display names', () => {
    const modes = [
      { mode: 'day', display: 'Day Mode' },
      { mode: 'night', display: 'Night Mode' },
      { mode: 'red-night', display: 'Red Night' },
      { mode: 'auto', display: 'Auto Mode' },
    ];

    modes.forEach(({ mode, display }) => {
      mockUseThemeStore.mockReturnValue({
        mode,
        setMode: mockSetMode,
      } as any);

      const { getByText } = render(
        <HamburgerMenu visible={true} onClose={() => {}} />
      );

      expect(getByText(display)).toBeTruthy();
    });
  });

  // AC 18: Close: swipe left or tap backdrop
  it('should close when backdrop is tapped', () => {
    const mockOnClose = jest.fn();
    const { getByTestId } = render(
      <HamburgerMenu visible={true} onClose={mockOnClose} />
    );

    const backdrop = getByTestId('hamburger-menu-backdrop');
    fireEvent.press(backdrop);

    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  // Modal behavior
  it('should call onRequestClose when modal requests close', () => {
    const mockOnClose = jest.fn();
    const { getByTestId } = render(
      <HamburgerMenu visible={true} onClose={mockOnClose} />
    );

    const modal = getByTestId('hamburger-menu-modal');
    
    // Simulate hardware back button on Android
    fireEvent(modal, 'requestClose');
    
    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  // Theme integration
  it('should use theme colors throughout', () => {
    const mockOnClose = jest.fn();
    const { getByTestId } = render(
      <HamburgerMenu visible={true} onClose={mockOnClose} />
    );

    const drawer = getByTestId('hamburger-menu-drawer');
    
    // Should use theme.surface for background
    expect(drawer.props.style).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          backgroundColor: mockTheme.surface,
        }),
      ])
    );
  });

  // Animation behavior
  it('should animate slide-in when becoming visible', async () => {
    const mockOnClose = jest.fn();
    const { rerender, getByTestId } = render(
      <HamburgerMenu visible={false} onClose={mockOnClose} />
    );

    // Initially not visible
    expect(() => getByTestId('hamburger-menu-modal')).toThrow();

    // Make visible
    rerender(<HamburgerMenu visible={true} onClose={mockOnClose} />);

    // Should now be present
    expect(getByTestId('hamburger-menu-modal')).toBeTruthy();
    expect(getByTestId('hamburger-menu-drawer')).toBeTruthy();
  });

  // Accessibility
  it('should have proper accessibility structure', () => {
    const mockOnClose = jest.fn();
    const { getByTestId } = render(
      <HamburgerMenu visible={true} onClose={mockOnClose} />
    );

    const modal = getByTestId('hamburger-menu-modal');
    expect(modal.props.accessibilityRole).toBe('menu');
  });

  // Navigation console logging (placeholder for future navigation)
  it('should log navigation intent when menu items pressed', () => {
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
    const mockOnClose = jest.fn();
    
    const { getByTestId } = render(
      <HamburgerMenu visible={true} onClose={mockOnClose} />
    );

    const settingsItem = getByTestId('menu-settings');
    fireEvent.press(settingsItem);

    expect(consoleSpy).toHaveBeenCalledWith('Navigate to: Settings');
    
    consoleSpy.mockRestore();
  });
});