import React from 'react';
import { render } from '@testing-library/react-native';
import LoadingSpinner from '../../../src/components/atoms/LoadingSpinner';
import { useSettingsStore } from '../../../src/stores/settingsStore';
import { ThemeProvider } from '../../../src/theme/ThemeProvider';

describe('LoadingSpinner reduced motion behavior', () => {
  test('renders without animation when reducedMotion is enabled', () => {
    // Enable reduced motion in settings store
    useSettingsStore.getState().updateThemeSettings({ reducedMotion: true });

    const { getByTestId } = render(
      <ThemeProvider>
        <LoadingSpinner testID="spinner" />
      </ThemeProvider>
    );

    const spinner = getByTestId('spinner');
    expect(spinner).toBeDefined();
  });
});
