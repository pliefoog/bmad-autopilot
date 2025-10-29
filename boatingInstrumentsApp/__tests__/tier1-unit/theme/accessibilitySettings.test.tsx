import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { ThemeProvider, useTheme } from "../../../src/theme/ThemeProvider";
import { useSettingsStore } from "../../../src/store/settingsStore";

const Consumer: React.FC = () => {
  const theme = useTheme();
  return (
    <>
      <Text testID="reducedMotion">{String(theme.reducedMotion)}</Text>
      <Text testID="largeText">{String(theme.largeText)}</Text>
      <Text testID="marineMode">{String(theme.marineMode)}</Text>
      <Text testID="voiceOver">{String(theme.voiceOverAnnouncements)}</Text>
      <Text testID="haptic">{String(theme.hapticFeedback)}</Text>
    </>
  );
};

import { Text } from 'react-native';

describe('ThemeProvider accessibility flags', () => {
  test('exposes accessibility settings from store', () => {
    const prev = useSettingsStore.getState().themeSettings;

    // Enable accessibility flags
    useSettingsStore.getState().updateThemeSettings({
      reducedMotion: true,
      largeText: true,
      marineMode: true,
      voiceOverAnnouncements: true,
      hapticFeedback: false,
    });

    const { getByTestId } = render(
      <ThemeProvider>
        <Consumer />
      </ThemeProvider>
    );

    expect(getByTestId('reducedMotion').props.children).toBe('true');
    expect(getByTestId('largeText').props.children).toBe('true');
    expect(getByTestId('marineMode').props.children).toBe('true');
    expect(getByTestId('voiceOver').props.children).toBe('true');
    expect(getByTestId('haptic').props.children).toBe('false');

    // Restore original settings to avoid polluting other tests
    useSettingsStore.getState().updateThemeSettings(prev as any);
  });
});
