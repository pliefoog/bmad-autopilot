import React from 'react';
import { render } from '@testing-library/react-native';
import { PrimaryMetricCell } from '../src/components/PrimaryMetricCell';
import { useTheme } from '../src/core/themeStore';

// Mock theme store
jest.mock('../src/core/themeStore');

const mockTheme = {
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
  shadow: '#00000020',
  iconPrimary: '#0F172A',
  iconSecondary: '#475569',
  iconAccent: '#059669',
  iconDisabled: '#CBD5E1'
};

describe('PrimaryMetricCell Component', () => {
  const mockUseTheme = useTheme as jest.MockedFunction<typeof useTheme>;

  beforeEach(() => {
    mockUseTheme.mockReturnValue(mockTheme);
  });

  describe('Basic Rendering', () => {
    test('should render mnemonic, value, and unit correctly', () => {
      const { getByTestId, getByText } = render(
        <PrimaryMetricCell 
          mnemonic="DEPTH" 
          value="12.4" 
          unit="m" 
        />
      );

      expect(getByTestId('primary-metric-cell')).toBeTruthy();
      expect(getByTestId('metric-mnemonic')).toBeTruthy();
      expect(getByTestId('metric-value')).toBeTruthy();
      expect(getByTestId('metric-unit')).toBeTruthy();
      
      expect(getByText('DEPTH')).toBeTruthy();
      expect(getByText('12.4')).toBeTruthy();
      expect(getByText('(m)')).toBeTruthy();
    });

    test('should convert mnemonic to uppercase', () => {
      const { getByText } = render(
        <PrimaryMetricCell 
          mnemonic="depth" 
          value="12.4" 
          unit="m" 
        />
      );

      expect(getByText('DEPTH')).toBeTruthy();
    });

    test('should handle numeric values', () => {
      const { getByText } = render(
        <PrimaryMetricCell 
          mnemonic="RPM" 
          value={2500} 
          unit="rpm" 
        />
      );

      expect(getByText('2500')).toBeTruthy();
    });

    test('should display --- for undefined/null values', () => {
      const { getByText } = render(
        <PrimaryMetricCell 
          mnemonic="DEPTH" 
          value={undefined as any} 
          unit="m" 
        />
      );

      expect(getByText('---')).toBeTruthy();
    });
  });

  describe('State-based Styling', () => {
    test('should apply normal state color by default', () => {
      const { getByTestId } = render(
        <PrimaryMetricCell 
          mnemonic="DEPTH" 
          value="12.4" 
          unit="m" 
        />
      );

      const valueText = getByTestId('metric-value');
      expect(valueText.props.style).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ color: mockTheme.text })
        ])
      );
    });

    test('should apply alarm state color', () => {
      const { getByTestId } = render(
        <PrimaryMetricCell 
          mnemonic="DEPTH" 
          value="1.2" 
          unit="m" 
          state="alarm"
        />
      );

      const valueText = getByTestId('metric-value');
      expect(valueText.props.style).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ color: mockTheme.error })
        ])
      );
    });

    test('should apply warning state color', () => {
      const { getByTestId } = render(
        <PrimaryMetricCell 
          mnemonic="DEPTH" 
          value="2.1" 
          unit="m" 
          state="warning"
        />
      );

      const valueText = getByTestId('metric-value');
      expect(valueText.props.style).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ color: mockTheme.warning })
        ])
      );
    });
  });

  describe('Typography Specifications (AC 2)', () => {
    test('should have correct mnemonic typography', () => {
      const { getByTestId } = render(
        <PrimaryMetricCell 
          mnemonic="DEPTH" 
          value="12.4" 
          unit="m" 
        />
      );

      const mnemonicText = getByTestId('metric-mnemonic');
      expect(mnemonicText.props.style).toEqual(
        expect.objectContaining({
          fontSize: 12,
          fontWeight: '600', // Semibold
          color: mockTheme.textSecondary,
          textTransform: 'uppercase',
          letterSpacing: 0.5,
        })
      );
    });

    test('should have correct value typography', () => {
      const { getByTestId } = render(
        <PrimaryMetricCell 
          mnemonic="DEPTH" 
          value="12.4" 
          unit="m" 
        />
      );

      const valueText = getByTestId('metric-value');
      expect(valueText.props.style).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            fontSize: 36,
            fontWeight: '700', // Bold
            fontFamily: 'monospace', // AC 16: monospace to prevent jitter
            letterSpacing: 0,
            lineHeight: 40,
          })
        ])
      );
    });

    test('should have correct unit typography', () => {
      const { getByTestId } = render(
        <PrimaryMetricCell 
          mnemonic="DEPTH" 
          value="12.4" 
          unit="m" 
        />
      );

      const unitText = getByTestId('metric-unit');
      expect(unitText.props.style).toEqual(
        expect.objectContaining({
          fontSize: 16,
          fontWeight: '400', // Regular
          color: mockTheme.textSecondary,
          letterSpacing: 0,
        })
      );
    });
  });

  describe('Layout and Spacing (AC 3-4)', () => {
    test('should use left-aligned layout', () => {
      const { getByTestId } = render(
        <PrimaryMetricCell 
          mnemonic="DEPTH" 
          value="12.4" 
          unit="m" 
        />
      );

      const container = getByTestId('primary-metric-cell');
      expect(container.props.style).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            alignItems: 'flex-start', // AC 3: left-aligned
          })
        ])
      );
    });

    test('should apply proper spacing between elements', () => {
      const { getByTestId } = render(
        <PrimaryMetricCell 
          mnemonic="DEPTH" 
          value="12.4" 
          unit="m" 
        />
      );

      const mnemonicText = getByTestId('metric-mnemonic');
      expect(mnemonicText.props.style).toEqual(
        expect.objectContaining({
          marginBottom: 4, // AC 4: 4pt between mnemonic and value
        })
      );

      const unitText = getByTestId('metric-unit');
      expect(unitText.props.style).toEqual(
        expect.objectContaining({
          marginLeft: 6, // AC 4: spacing between value and unit
        })
      );
    });
  });

  describe('Monospace Font (AC 16)', () => {
    test('should use monospace font to prevent jitter during updates', () => {
      const { getByTestId } = render(
        <PrimaryMetricCell 
          mnemonic="RPM" 
          value="2500" 
          unit="rpm" 
        />
      );

      const valueText = getByTestId('metric-value');
      expect(valueText.props.style).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            fontFamily: 'monospace'
          })
        ])
      );
    });

    test('should maintain consistent width with different values', () => {
      const { rerender, getByTestId } = render(
        <PrimaryMetricCell 
          mnemonic="RPM" 
          value="1000" 
          unit="rpm" 
        />
      );

      const valueText1 = getByTestId('metric-value');
      const style1 = valueText1.props.style;

      rerender(
        <PrimaryMetricCell 
          mnemonic="RPM" 
          value="9999" 
          unit="rpm" 
        />
      );

      const valueText2 = getByTestId('metric-value');
      const style2 = valueText2.props.style;

      // Should have same font properties for consistent width
      expect(style1).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            fontFamily: 'monospace',
            fontSize: 36,
            letterSpacing: 0
          })
        ])
      );
      expect(style2).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            fontFamily: 'monospace',
            fontSize: 36,
            letterSpacing: 0
          })
        ])
      );
    });
  });

  describe('Custom Styling', () => {
    test('should apply custom style prop', () => {
      const customStyle = { marginTop: 10, backgroundColor: 'red' };
      
      const { getByTestId } = render(
        <PrimaryMetricCell 
          mnemonic="DEPTH" 
          value="12.4" 
          unit="m" 
          style={customStyle}
        />
      );

      const container = getByTestId('primary-metric-cell');
      expect(container.props.style).toEqual(
        expect.arrayContaining([
          expect.objectContaining(customStyle)
        ])
      );
    });
  });

  describe('Edge Cases', () => {
    test('should handle zero values', () => {
      const { getByText } = render(
        <PrimaryMetricCell 
          mnemonic="DEPTH" 
          value={0} 
          unit="m" 
        />
      );

      expect(getByText('0')).toBeTruthy();
    });

    test('should handle empty string values', () => {
      const { getByText } = render(
        <PrimaryMetricCell 
          mnemonic="DEPTH" 
          value="" 
          unit="m" 
        />
      );

      expect(getByText('---')).toBeTruthy();
    });

    test('should handle very long values', () => {
      const { getByText } = render(
        <PrimaryMetricCell 
          mnemonic="TEST" 
          value="123456789.123456789" 
          unit="unit" 
        />
      );

      expect(getByText('123456789.123456789')).toBeTruthy();
    });

    test('should handle special characters in mnemonic', () => {
      const { getByText } = render(
        <PrimaryMetricCell 
          mnemonic="GPS-FIX" 
          value="12" 
          unit="sats" 
        />
      );

      expect(getByText('GPS-FIX')).toBeTruthy();
    });
  });

  describe('Theme Integration', () => {
    test('should respond to theme changes', () => {
      const darkTheme = {
        ...mockTheme,
        text: '#F1F5F9',
        textSecondary: '#94A3B8'
      };

      mockUseTheme.mockReturnValue(darkTheme);

      const { getByTestId } = render(
        <PrimaryMetricCell 
          mnemonic="DEPTH" 
          value="12.4" 
          unit="m" 
        />
      );

      const valueText = getByTestId('metric-value');
      expect(valueText.props.style).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ color: darkTheme.text })
        ])
      );

      const mnemonicText = getByTestId('metric-mnemonic');
      expect(mnemonicText.props.style).toEqual(
        expect.objectContaining({ color: darkTheme.textSecondary })
      );
    });
  });
});