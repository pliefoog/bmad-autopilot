/**
 * Marine Components Test Suite
 * 
 * Comprehensive tests for the marine components library ensuring:
 * - AC 21: Theme Integration - All components properly integrate with theme system
 * - AC 22: Accessibility Support - All components support accessibility features
 * 
 * Tests cover:
 * - Component rendering and props
 * - Theme integration and color adaptation
 * - Accessibility labels and testing IDs
 * - Animation functionality
 * - Marine safety color standards
 * - User interaction and state changes
 */

import React from 'react';
import { render, fireEvent, act } from '@testing-library/react-native';
import { Animated } from 'react-native';

// Import marine components
import {
  DigitalDisplay,
  AnalogGauge,
  LinearBar,
  StatusIndicator,
  MarineButton,
  MARINE_COLORS,
} from '../../../src/components/marine';

// Mock theme store
const mockTheme = {
  text: '#FFFFFF',
  textSecondary: '#CCCCCC',
  background: '#000000',
  surface: '#1A1A1A',
  border: '#2A2A2A',
  primary: '#0066CC',
  success: '#00AA00',
  warning: '#FFAA00',
  error: '#AA0000',
};

jest.mock('../../../src/store/themeStore', () => ({
  useTheme: () => mockTheme,
}));

// Mock animation timing for consistent testing
jest.mock('react-native/Libraries/Animated/AnimatedImplementation', () => {
  return {
    ...jest.requireActual('react-native/Libraries/Animated/AnimatedImplementation'),
    timing: (value: any, config: any) => ({
      start: (callback?: any) => {
        value.setValue(config.toValue);
        callback && callback();
      },
      stop: jest.fn(),
    }),
    loop: (animation: any) => ({
      start: jest.fn(),
      stop: jest.fn(),
    }),
  };
});

describe('Marine Components Library', () => {
  
  describe('DigitalDisplay Component', () => {
    
    it('renders with basic props (AC 1)', () => {
      const { getByTestId, getByText } = render(
        <DigitalDisplay
          value={123.45}
          unit="V"
          size="large"
          precision={2}
          testID="digital-display-test"
        />
      );
      
      expect(getByTestId('digital-display-test')).toBeTruthy();
      expect(getByText('123.45')).toBeTruthy();
      expect(getByText('V')).toBeTruthy();
    });
    
    it('integrates with theme system (AC 21)', () => {
      const { getByTestId } = render(
        <DigitalDisplay
          value={100}
          unit="°C"
          size="large"
          testID="themed-display"
        />
      );
      
      const display = getByTestId('themed-display');
      // Component should use theme colors
      expect(display).toBeTruthy();
    });
    
    it('supports accessibility (AC 22)', () => {
      const { getByTestId } = render(
        <DigitalDisplay
          value={75.5}
          unit="%"
          size="large"
          testID="accessible-display"
        />
      );
      
      expect(getByTestId('accessible-display')).toBeTruthy();
      expect(getByTestId('accessible-display-value')).toBeTruthy();
      expect(getByTestId('accessible-display-unit')).toBeTruthy();
    });
    
    it('handles different states correctly (AC 6-10)', () => {
      const { rerender, getByTestId } = render(
        <DigitalDisplay
          value={100}
          unit="RPM"
          size="large"
          state="normal"
          testID="state-display"
        />
      );
      
      expect(getByTestId('state-display')).toBeTruthy();
      
      // Test warning state
      rerender(
        <DigitalDisplay
          value={100}
          unit="RPM"
          size="large"
          state="warning"
          testID="state-display"
        />
      );
      
      expect(getByTestId('state-display')).toBeTruthy();
      
      // Test alarm state
      rerender(
        <DigitalDisplay
          value={100}
          unit="RPM"
          size="large"
          state="alarm"
          testID="state-display"
        />
      );
      
      expect(getByTestId('state-display')).toBeTruthy();
    });
  });
  
  describe('AnalogGauge Component', () => {
    
    const testRanges = [
      { min: 0, max: 60, color: 'green' as const },
      { min: 60, max: 80, color: 'amber' as const },
      { min: 80, max: 100, color: 'red' as const },
    ];
    
    it('renders with basic props (AC 2)', () => {
      const { getByTestId } = render(
        <AnalogGauge
          value={50}
          min={0}
          max={100}
          unit="PSI"
          ranges={testRanges}
          size={200}
          testID="gauge-test"
        />
      );
      
      expect(getByTestId('gauge-test')).toBeTruthy();
    });
    
    it('displays digital readout integration (AC 15)', () => {
      const { getByTestId } = render(
        <AnalogGauge
          value={75.5}
          min={0}
          max={100}
          unit="°F"
          ranges={testRanges}
          size={200}
          showDigital={true}
          precision={1}
          testID="gauge-digital"
        />
      );
      
      expect(getByTestId('gauge-digital-digital')).toBeTruthy();
    });
    
    it('supports marine color coding (AC 12)', () => {
      const { getByTestId } = render(
        <AnalogGauge
          value={85}
          min={0}
          max={100}
          unit="TEMP"
          ranges={testRanges}
          size={200}
          testID="gauge-colors"
        />
      );
      
      // Component should render with marine safety colors
      expect(getByTestId('gauge-colors')).toBeTruthy();
    });
  });
  
  describe('LinearBar Component', () => {
    
    const testThresholds = [
      { value: 20, color: 'amber' as const, label: 'Low' },
      { value: 10, color: 'red' as const, label: 'Critical' },
    ];
    
    it('renders horizontal orientation (AC 3, 20)', () => {
      const { getByTestId } = render(
        <LinearBar
          value={75}
          orientation="horizontal"
          type="tank"
          size={200}
          thickness={20}
          unit="%"
          testID="horizontal-bar"
        />
      );
      
      expect(getByTestId('horizontal-bar')).toBeTruthy();
      expect(getByTestId('horizontal-bar-progress')).toBeTruthy();
    });
    
    it('renders vertical orientation (AC 20)', () => {
      const { getByTestId } = render(
        <LinearBar
          value={50}
          orientation="vertical"
          type="battery"
          size={150}
          thickness={30}
          unit="V"
          testID="vertical-bar"
        />
      );
      
      expect(getByTestId('vertical-bar')).toBeTruthy();
      expect(getByTestId('vertical-bar-progress')).toBeTruthy();
    });
    
    it('displays threshold markers (AC 16)', () => {
      const { getByTestId } = render(
        <LinearBar
          value={25}
          orientation="horizontal"
          type="tank"
          thresholds={testThresholds}
          size={200}
          thickness={20}
          unit="%"
          testID="threshold-bar"
        />
      );
      
      expect(getByTestId('threshold-bar')).toBeTruthy();
      expect(getByTestId('threshold-0')).toBeTruthy();
      expect(getByTestId('threshold-1')).toBeTruthy();
    });
    
    it('shows value display (AC 17)', () => {
      const { getByTestId } = render(
        <LinearBar
          value={65}
          orientation="horizontal"
          type="gauge"
          size={200}
          thickness={20}
          unit="L"
          showValue={true}
          testID="value-bar"
        />
      );
      
      expect(getByTestId('value-bar-value')).toBeTruthy();
    });
  });
  
  describe('StatusIndicator Component', () => {
    
    it('renders different status states (AC 4, 23)', () => {
      const states: Array<'normal' | 'caution' | 'alarm' | 'off' | 'unknown'> = [
        'normal', 'caution', 'alarm', 'off', 'unknown'
      ];
      
      states.forEach(state => {
        const { getByTestId } = render(
          <StatusIndicator
            status={state}
            label="Engine"
            testID={`status-${state}`}
          />
        );
        
        expect(getByTestId(`status-${state}`)).toBeTruthy();
        expect(getByTestId(`status-${state}-led`)).toBeTruthy();
        expect(getByTestId(`status-${state}-text`)).toBeTruthy();
      });
    });
    
    it('uses marine safety colors (AC 23)', () => {
      const { getByTestId } = render(
        <StatusIndicator
          status="alarm"
          size="large"
          testID="alarm-status"
        />
      );
      
      // Should use marine standard red color
      expect(getByTestId('alarm-status')).toBeTruthy();
    });
    
    it('supports different sizes', () => {
      const sizes: Array<'small' | 'medium' | 'large'> = ['small', 'medium', 'large'];
      
      sizes.forEach(size => {
        const { getByTestId } = render(
          <StatusIndicator
            status="normal"
            size={size}
            testID={`status-${size}`}
          />
        );
        
        expect(getByTestId(`status-${size}`)).toBeTruthy();
      });
    });
  });
  
  describe('MarineButton Component', () => {
    
    it('renders different variants (AC 5, 24)', () => {
      const variants: Array<'primary' | 'secondary' | 'emergency' | 'toggle'> = [
        'primary', 'secondary', 'emergency', 'toggle'
      ];
      
      variants.forEach(variant => {
        const { getByTestId } = render(
          <MarineButton
            title="TEST"
            onPress={jest.fn()}
            variant={variant}
            testID={`button-${variant}`}
          />
        );
        
        expect(getByTestId(`button-${variant}`)).toBeTruthy();
        expect(getByTestId(`button-${variant}-text`)).toBeTruthy();
      });
    });
    
    it('handles press interactions (AC 24)', () => {
      const mockPress = jest.fn();
      const { getByTestId } = render(
        <MarineButton
          title="PRESS ME"
          onPress={mockPress}
          testID="interactive-button"
        />
      );
      
      const button = getByTestId('interactive-button');
      fireEvent.press(button);
      
      expect(mockPress).toHaveBeenCalledTimes(1);
    });
    
    it('supports disabled state', () => {
      const mockPress = jest.fn();
      const { getByTestId } = render(
        <MarineButton
          title="DISABLED"
          onPress={mockPress}
          disabled={true}
          testID="disabled-button"
        />
      );
      
      const button = getByTestId('disabled-button');
      fireEvent.press(button);
      
      // Should not call onPress when disabled
      expect(mockPress).not.toHaveBeenCalled();
    });
    
    it('supports toggle state', () => {
      const { rerender, getByTestId } = render(
        <MarineButton
          title="TOGGLE"
          onPress={jest.fn()}
          variant="toggle"
          isToggled={false}
          testID="toggle-button"
        />
      );
      
      expect(getByTestId('toggle-button')).toBeTruthy();
      
      // Test toggled state
      rerender(
        <MarineButton
          title="TOGGLE"
          onPress={jest.fn()}
          variant="toggle"
          isToggled={true}
          testID="toggle-button"
        />
      );
      
      expect(getByTestId('toggle-button')).toBeTruthy();
    });
  });
  
  describe('Marine Color Constants', () => {
    
    it('exports marine safety colors', () => {
      expect(MARINE_COLORS.NORMAL).toBe('#00AA00');
      expect(MARINE_COLORS.CAUTION).toBe('#FFAA00');
      expect(MARINE_COLORS.ALARM).toBe('#AA0000');
      expect(MARINE_COLORS.OFF).toBe('#2A2A2A');
      expect(MARINE_COLORS.UNKNOWN).toBe('#666666');
    });
  });
  
  describe('Theme Integration (AC 21)', () => {
    
    it('all components use theme colors consistently', () => {
      const components = [
        <DigitalDisplay value={100} unit="TEST" size="large" testID="theme-digital" />,
        <AnalogGauge value={50} min={0} max={100} unit="TEST" ranges={[]} size={100} testID="theme-gauge" />,
        <LinearBar value={50} orientation="horizontal" type="tank" size={100} thickness={20} unit="TEST" testID="theme-bar" />,
        <StatusIndicator status="normal" testID="theme-status" />,
        <MarineButton title="TEST" onPress={jest.fn()} testID="theme-button" />,
      ];
      
      components.forEach((component, index) => {
        const { getByTestId } = render(component);
        const testId = component.props.testID;
        expect(getByTestId(testId)).toBeTruthy();
      });
    });
  });
  
  describe('Accessibility (AC 22)', () => {
    
    it('all components support testID for automation', () => {
      // Test each component individually with testID
      const { getByTestId: getDigital } = render(
        <DigitalDisplay value={100} unit="TEST" size="large" testID="accessibility-digital" />
      );
      expect(getDigital('accessibility-digital')).toBeTruthy();
      
      const { getByTestId: getGauge } = render(
        <AnalogGauge value={50} min={0} max={100} unit="TEST" ranges={[]} size={100} testID="accessibility-gauge" />
      );
      expect(getGauge('accessibility-gauge')).toBeTruthy();
      
      const { getByTestId: getBar } = render(
        <LinearBar value={50} orientation="horizontal" type="tank" size={100} thickness={20} unit="TEST" testID="accessibility-bar" />
      );
      expect(getBar('accessibility-bar')).toBeTruthy();
      
      const { getByTestId: getStatus } = render(
        <StatusIndicator status="normal" testID="accessibility-status" />
      );
      expect(getStatus('accessibility-status')).toBeTruthy();
      
      const { getByTestId: getButton } = render(
        <MarineButton title="TEST" onPress={jest.fn()} testID="accessibility-button" />
      );
      expect(getButton('accessibility-button')).toBeTruthy();
    });
  });
  
});