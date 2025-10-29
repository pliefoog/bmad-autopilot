import React from 'react';
import { render } from '@testing-library/react-native';
import SecondaryMetricCell from "../../../src/components/SecondaryMetricCell";
import { useTheme } from "../../../src/store/themeStore";

// Mock theme store
jest.mock('../../../src/store/themeStore');

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

describe('SecondaryMetricCell Component', () => {
  const mockUseTheme = useTheme as jest.MockedFunction<typeof useTheme>;

  beforeEach(() => {
    mockUseTheme.mockReturnValue(mockTheme);
  });

  describe('Basic Rendering', () => {
    test('should render mnemonic, value, and unit correctly', () => {
      const { getByTestId, getByText } = render(
        <SecondaryMetricCell 
          mnemonic="AVG" 
          value="8.2" 
          unit="kts" 
        />
      );

      expect(getByTestId('secondary-metric-cell')).toBeTruthy();
      expect(getByText('AVG')).toBeTruthy();
      expect(getByText('8.2')).toBeTruthy();
      expect(getByText('(kts)')).toBeTruthy();
    });

    test('should handle numeric values with precision', () => {
      const { getByText } = render(
        <SecondaryMetricCell 
          mnemonic="MAX" 
          value={12.456} 
          unit="ft"
          precision={2}
        />
      );

      expect(getByText('12.46')).toBeTruthy();
    });

    test('should display --- for undefined/null values', () => {
      const { getByText } = render(
        <SecondaryMetricCell 
          mnemonic="MIN" 
          value={null} 
          unit="m" 
        />
      );

      expect(getByText('---')).toBeTruthy();
    });

    test('should work without unit', () => {
      const { getByText, queryByText } = render(
        <SecondaryMetricCell 
          mnemonic="COUNT" 
          value="42" 
        />
      );

      expect(getByText('COUNT')).toBeTruthy();
      expect(getByText('42')).toBeTruthy();
      expect(queryByText(/\(/)).toBeNull(); // No parentheses without unit
    });
  });

  describe('State-based Styling', () => {
    test('should apply warning state color', () => {
      const { getByTestId } = render(
        <SecondaryMetricCell 
          mnemonic="TEMP" 
          value="85" 
          unit="°F"
          state="warning"
        />
      );

      const value = getByTestId('secondary-metric-value');
      expect(value.props.style).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ color: mockTheme.warning })
        ])
      );
    });

    test('should apply alarm state color', () => {
      const { getByTestId } = render(
        <SecondaryMetricCell 
          mnemonic="PRESS" 
          value="95" 
          unit="psi"
          state="alarm"
        />
      );

      const value = getByTestId('secondary-metric-value');
      expect(value.props.style).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ color: mockTheme.error })
        ])
      );
    });
  });

  describe('Compact Mode', () => {
    test('should apply compact styling', () => {
      const { getByTestId } = render(
        <SecondaryMetricCell 
          mnemonic="RPM" 
          value="2500" 
          unit="rpm"
          compact={true}
        />
      );

      const container = getByTestId('secondary-metric-cell');
      expect(container.props.style).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ 
            paddingVertical: 2,
            paddingHorizontal: 4,
            minHeight: 50
          })
        ])
      );
    });
  });

  describe('Typography Specifications', () => {
    test('should have correct mnemonic typography', () => {
      const { getByTestId } = render(
        <SecondaryMetricCell 
          mnemonic="test" 
          value="123" 
          unit="unit" 
        />
      );

      const mnemonic = getByTestId('secondary-metric-mnemonic');
      expect(mnemonic.props.style).toEqual(
        expect.objectContaining({
          fontSize: 10,
          fontWeight: '600',
          color: mockTheme.textSecondary,
          textTransform: 'uppercase'
        })
      );
    });

    test('should have correct value typography', () => {
      const { getByTestId } = render(
        <SecondaryMetricCell 
          mnemonic="TEST" 
          value="123" 
          unit="unit" 
        />
      );

      const value = getByTestId('secondary-metric-value');
      expect(value.props.style).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            fontSize: 24,
            fontWeight: '700',
            fontFamily: 'monospace'
          })
        ])
      );
    });

    test('should have correct unit typography', () => {
      const { getByTestId } = render(
        <SecondaryMetricCell 
          mnemonic="TEST" 
          value="123" 
          unit="unit" 
        />
      );

      const unit = getByTestId('secondary-metric-unit');
      expect(unit.props.style).toEqual(
        expect.objectContaining({
          fontSize: 10,
          fontWeight: '400',
          color: mockTheme.textSecondary
        })
      );
    });
  });

  describe('Edge Cases', () => {
    test('should handle zero values', () => {
      const { getByText } = render(
        <SecondaryMetricCell 
          mnemonic="MIN" 
          value={0} 
          unit="m" 
        />
      );

      expect(getByText('0.0')).toBeTruthy();
    });

    test('should handle empty string values', () => {
      const { getByText } = render(
        <SecondaryMetricCell 
          mnemonic="VAL" 
          value="" 
          unit="m" 
        />
      );

      expect(getByText('---')).toBeTruthy();
    });

    test('should convert mnemonic to uppercase', () => {
      const { getByText } = render(
        <SecondaryMetricCell 
          mnemonic="avg" 
          value="5.5" 
          unit="m" 
        />
      );

      expect(getByText('AVG')).toBeTruthy();
    });
  });
});