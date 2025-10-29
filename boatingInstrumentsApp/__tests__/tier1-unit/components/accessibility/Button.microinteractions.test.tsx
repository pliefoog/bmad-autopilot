import React from 'react';
import { render, fireEvent, act } from '@testing-library/react-native';
import Button from '../../../src/components/atoms/Button';
import { ThemeProvider } from '../../../src/theme/ThemeProvider';
import { useSettingsStore } from '../../../src/store/settingsStore';
import { Vibration, Animated } from 'react-native';

describe('Button micro-interactions', () => {
  beforeEach(() => {
    // Reset any theme settings to defaults first
    useSettingsStore.getState().updateThemeSettings({ reducedMotion: false, largeText: false, hapticFeedback: true });
  });

  test('triggers vibration on press when hapticFeedback enabled', () => {
    const vibrateSpy = jest.spyOn(Vibration, 'vibrate').mockImplementation(() => {});

    const { getByTestId } = render(
      <ThemeProvider>
        <Button title="Tap" onPress={() => {}} testID="btn-micro" />
      </ThemeProvider>
    );

    fireEvent.press(getByTestId('btn-micro'));

    expect(vibrateSpy).toHaveBeenCalled();

    vibrateSpy.mockRestore();
  });

  test('does not start animation when reducedMotion is enabled', () => {
    const springSpy = jest.spyOn(Animated, 'spring');

    // Enable reduced motion
    useSettingsStore.getState().updateThemeSettings({ reducedMotion: true });

    const { getByTestId } = render(
      <ThemeProvider>
        <Button title="Tap" onPress={() => {}} testID="btn-micro" />
      </ThemeProvider>
    );

    // Simulate pressIn which would trigger animateTo
    act(() => {
      fireEvent(getByTestId('btn-micro'), 'pressIn');
      fireEvent(getByTestId('btn-micro'), 'pressOut');
    });

    expect(springSpy).not.toHaveBeenCalled();

    springSpy.mockRestore();
  });
});
