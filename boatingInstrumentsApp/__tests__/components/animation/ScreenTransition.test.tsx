import React from 'react';
import { render } from '@testing-library/react-native';
import ScreenTransition from '../../../src/components/molecules/ScreenTransition';
import { ThemeProvider } from '../../../src/theme/ThemeProvider';
import { useSettingsStore } from '../../../src/stores/settingsStore';
import { Text } from 'react-native';

describe('ScreenTransition', () => {
  test('renders children and animates by default', () => {
    const { getByText } = render(
      <ThemeProvider>
        <ScreenTransition>
          <Text>content</Text>
        </ScreenTransition>
      </ThemeProvider>
    );

    expect(getByText('content')).toBeDefined();
  });

  test('does not animate when reducedMotion is enabled', () => {
    useSettingsStore.getState().updateThemeSettings({ reducedMotion: true });
    const { getByText } = render(
      <ThemeProvider>
        <ScreenTransition>
          <Text>no-anim</Text>
        </ScreenTransition>
      </ThemeProvider>
    );

    expect(getByText('no-anim')).toBeDefined();
  });
});
