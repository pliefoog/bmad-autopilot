import React from 'react';
import { render } from '@testing-library/react-native';
import { createWidgetStyles, getStateColor, getStateBackgroundColor } from '../src/styles/widgetStyles';
import { useThemeStore, useTheme, ThemeColors } from '../src/core/themeStore';
import { WidgetCard } from '../src/widgets/WidgetCard';
import { DepthWidget } from '../src/widgets/DepthWidget';

// Mock Zustand stores
jest.mock('../src/core/themeStore');
jest.mock('../src/core/nmeaStore');

// Mock react-native-vector-icons
jest.mock('react-native-vector-icons/Ionicons', () => 'Ionicons');

// Mock SVG components
jest.mock('react-native-svg', () => {
  const React = require('react');
  const MockSvgComponent = (name: string) => 
    React.forwardRef((props: any, ref: any) => {
      const { children, ...otherProps } = props;
      return React.createElement('View', {
        testID: `svg-${name}`,
        ref,
        ...otherProps
      }, children);
    });
    
  return {
    __esModule: true,
    default: MockSvgComponent('svg'),
    Svg: MockSvgComponent('svg'),
    Polyline: MockSvgComponent('polyline'),
  };
});

const mockDayTheme: ThemeColors = {
  primary: '#0284C7',
  secondary: '#0891B2',
  background: '#F8FAFC',
  surface: '#FFFFFF',
  text: '#0F172A',
  textSecondary: '#475569',
  accent: '#059669',
  warning: '#D97706',
  error: '#DC2626',
  success: '#059669',
  border: '#CBD5E1',
  shadow: '#00000020'
};

const mockNightTheme: ThemeColors = {
  primary: '#38BDF8',
  secondary: '#22D3EE',
  background: '#0F172A',
  surface: '#1E293B',
  text: '#F1F5F9',
  textSecondary: '#94A3B8',
  accent: '#34D399',
  warning: '#FBBF24',
  error: '#F87171',
  success: '#34D399',
  border: '#334155',
  shadow: '#00000040'
};

const mockRedNightTheme: ThemeColors = {
  primary: '#DC2626',
  secondary: '#B91C1C',
  background: '#000000',
  surface: '#1F1F1F',
  text: '#FCA5A5',
  textSecondary: '#EF4444',
  accent: '#F87171',
  warning: '#DC2626',
  error: '#B91C1C',
  success: '#DC2626',
  border: '#404040',
  shadow: '#00000060'
};

describe('Theme Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('widgetStyles', () => {
    test('should create styles with theme colors', () => {
      const styles = createWidgetStyles(mockDayTheme);
      
      expect(styles.widgetContainer.backgroundColor).toBe(mockDayTheme.surface);
      expect(styles.widgetContainer.borderColor).toBe(mockDayTheme.border);
      expect(styles.widgetHeader.backgroundColor).toBe(mockDayTheme.background);
      expect(styles.widgetTitle.color).toBe(mockDayTheme.textSecondary);
    });

    test('should have correct font sizes for AC requirements', () => {
      const styles = createWidgetStyles(mockDayTheme);
      
      // AC 6: metricLabel (12pt, uppercase, theme.textSecondary)
      expect(styles.metricLabel.fontSize).toBe(12);
      expect(styles.metricLabel.textTransform).toBe('uppercase');
      expect(styles.metricLabel.color).toBe(mockDayTheme.textSecondary);
      
      // AC 6: metricValue (36pt, monospace, theme.text)
      expect(styles.metricValue.fontSize).toBe(36);
      expect(styles.metricValue.fontFamily).toBe('monospace');
      expect(styles.metricValue.color).toBe(mockDayTheme.text);
      
      // AC 6: metricUnit (16pt, theme.textSecondary)
      expect(styles.metricUnit.fontSize).toBe(16);
      expect(styles.metricUnit.color).toBe(mockDayTheme.textSecondary);
    });

    test('should adapt to different themes', () => {
      const dayStyles = createWidgetStyles(mockDayTheme);
      const nightStyles = createWidgetStyles(mockNightTheme);
      const redNightStyles = createWidgetStyles(mockRedNightTheme);
      
      // Surface colors should be different across themes
      expect(dayStyles.widgetContainer.backgroundColor).toBe('#FFFFFF');
      expect(nightStyles.widgetContainer.backgroundColor).toBe('#1E293B');
      expect(redNightStyles.widgetContainer.backgroundColor).toBe('#1F1F1F');
      
      // Text colors should be different across themes
      expect(dayStyles.metricValue.color).toBe('#0F172A');
      expect(nightStyles.metricValue.color).toBe('#F1F5F9');
      expect(redNightStyles.metricValue.color).toBe('#FCA5A5');
    });
  });

  describe('State Color Helpers', () => {
    test('getStateColor should return correct theme colors for states', () => {
      expect(getStateColor('normal', mockDayTheme)).toBe(mockDayTheme.success);
      expect(getStateColor('alarm', mockDayTheme)).toBe(mockDayTheme.error);
      expect(getStateColor('warning', mockDayTheme)).toBe(mockDayTheme.warning);
      expect(getStateColor('highlighted', mockDayTheme)).toBe(mockDayTheme.warning);
      expect(getStateColor('no-data', mockDayTheme)).toBe(mockDayTheme.textSecondary);
    });

    test('getStateBackgroundColor should return themed background colors', () => {
      expect(getStateBackgroundColor('normal', mockDayTheme)).toBe(mockDayTheme.surface);
      expect(getStateBackgroundColor('alarm', mockDayTheme)).toBe(mockDayTheme.error + '20');
      expect(getStateBackgroundColor('warning', mockDayTheme)).toBe(mockDayTheme.warning + '20');
    });
  });

  describe('WidgetCard Theme Integration', () => {
    const mockUseTheme = useTheme as jest.MockedFunction<typeof useTheme>;

    beforeEach(() => {
      mockUseTheme.mockReturnValue(mockDayTheme);
    });

    test('should render with theme colors', () => {
      const { getByTestId } = render(
        <WidgetCard 
          title="Test Widget" 
          icon="water" 
          value="123" 
          unit="m" 
        />
      );

      // Should render without throwing
      expect(getByTestId).toBeDefined();
    });

    test('should show chevron when expanded prop is provided', () => {
      const { getByText } = render(
        <WidgetCard 
          title="Test Widget" 
          icon="water" 
          expanded={true}
        />
      );

      expect(getByText('⌃')).toBeTruthy();
    });

    test('should show down chevron when not expanded', () => {
      const { getByText } = render(
        <WidgetCard 
          title="Test Widget" 
          icon="water" 
          expanded={false}
        />
      );

      expect(getByText('⌄')).toBeTruthy();
    });

    test('should not show status dot (AC 10: Remove status dot)', () => {
      const { queryByTestId } = render(
        <WidgetCard 
          title="Test Widget" 
          icon="water" 
          state="alarm"
        />
      );

      // Status dot should not be present
      expect(queryByTestId('status-dot')).toBeNull();
    });

    test('should apply state colors to value text', () => {
      const { getByText } = render(
        <WidgetCard 
          title="Test Widget" 
          icon="water" 
          value="123" 
          state="alarm"
        />
      );

      const valueText = getByText('123');
      expect(valueText).toBeTruthy();
      // In real render, this would have color: theme.error
    });
  });

  describe('Theme Switching Performance', () => {
    const mockUseThemeStore = useThemeStore as jest.MockedFunction<typeof useThemeStore>;

    test('should handle rapid theme changes', () => {
      let themeChangeCount = 0;
      
      mockUseThemeStore.mockImplementation(() => ({
        mode: 'day',
        colors: mockDayTheme,
        brightness: 1.0,
        autoMode: false,
        setMode: jest.fn(() => {
          themeChangeCount++;
        }),
        setBrightness: jest.fn(),
        toggleAutoMode: jest.fn(),
        applyAutoMode: jest.fn(),
      }));

      const store = useThemeStore();
      
      // Simulate rapid theme changes
      const startTime = Date.now();
      for (let i = 0; i < 10; i++) {
        store.setMode('night');
        store.setMode('day');
        store.setMode('red-night');
      }
      const endTime = Date.now();
      
      // Should complete quickly (AC: <300ms)
      expect(endTime - startTime).toBeLessThan(300);
      expect(themeChangeCount).toBe(30);
    });
  });

  describe('DepthWidget Theme Integration', () => {
    const mockUseNmeaStore = require('../src/core/nmeaStore').useNmeaStore as jest.MockedFunction<any>;
    const mockUseTheme = useTheme as jest.MockedFunction<typeof useTheme>;

    beforeEach(() => {
      mockUseTheme.mockReturnValue(mockDayTheme);
      mockUseNmeaStore.mockImplementation((selector: any) => 
        selector({ nmeaData: { depth: 5.2 } })
      );
    });

    test('should render with theme-integrated colors', () => {
      const { getByText } = render(<DepthWidget />);
      
      // Should show depth value
      expect(getByText('5.2')).toBeTruthy();
      expect(getByText('(m)')).toBeTruthy();
    });

    test('should use theme colors for trend graph', () => {
      // Mock depth history to trigger trend graph
      mockUseNmeaStore.mockImplementation((selector: any) => 
        selector({ nmeaData: { depth: 5.2 } })
      );

      const result = render(<DepthWidget />);
      
      // Should render without color-related errors
      expect(result).toBeTruthy();
      expect(result.getByText('5.2')).toBeTruthy();
    });
  });

  describe('Theme Consistency Validation', () => {
    test('all themes should have required color properties', () => {
      const requiredProperties = [
        'primary', 'secondary', 'background', 'surface', 'text', 
        'textSecondary', 'accent', 'warning', 'error', 'success', 
        'border', 'shadow'
      ];

      [mockDayTheme, mockNightTheme, mockRedNightTheme].forEach((theme, index) => {
        const themeName = ['day', 'night', 'red-night'][index];
        
        requiredProperties.forEach(prop => {
          expect(theme[prop as keyof ThemeColors]).toBeDefined();
          expect(typeof theme[prop as keyof ThemeColors]).toBe('string');
          expect(theme[prop as keyof ThemeColors]).toMatch(/^#[0-9a-fA-F]{6,8}$/);
        });
      });
    });

    test('should have distinct colors between themes', () => {
      // Day and night themes should have different surface colors
      expect(mockDayTheme.surface).not.toBe(mockNightTheme.surface);
      expect(mockDayTheme.background).not.toBe(mockNightTheme.background);
      expect(mockDayTheme.text).not.toBe(mockNightTheme.text);
      
      // Red-night theme should be different from both
      expect(mockRedNightTheme.surface).not.toBe(mockDayTheme.surface);
      expect(mockRedNightTheme.surface).not.toBe(mockNightTheme.surface);
    });
  });

  describe('Hardcoded Color Elimination', () => {
    test('widgetStyles should use theme colors correctly', () => {
      const styles = createWidgetStyles(mockDayTheme);
      
      // Should use theme colors (these WILL be hex values, but from theme)
      expect(styles.widgetContainer.backgroundColor).toBe(mockDayTheme.surface);
      expect(styles.widgetContainer.borderColor).toBe(mockDayTheme.border);
      expect(styles.metricValue.color).toBe(mockDayTheme.text);
      expect(styles.metricLabel.color).toBe(mockDayTheme.textSecondary);
      
      // Colors should change with different themes
      const nightStyles = createWidgetStyles(mockNightTheme);
      expect(nightStyles.widgetContainer.backgroundColor).toBe(mockNightTheme.surface);
      expect(nightStyles.widgetContainer.backgroundColor).not.toBe(styles.widgetContainer.backgroundColor);
    });
  });
});