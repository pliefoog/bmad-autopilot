import React from 'react';
import { render, act } from '@testing-library/react-native';
import LoadingOverlay from '../../../src/components/molecules/LoadingOverlay';
import { LoadingProvider, useLoading } from '../../../src/services/loading/LoadingContext';
import { ThemeProvider } from '../../../src/theme/ThemeProvider';
import { Text } from 'react-native';

describe('LoadingOverlay', () => {
  test('shows and hides when loading is started/stopped', () => {
    const helpers: any = {};

    const Consumer: React.FC = () => {
      const { startLoading, stopLoading } = useLoading();
      React.useEffect(() => {
        helpers.start = startLoading;
        helpers.stop = stopLoading;
      }, [startLoading, stopLoading]);
      return <Text>consumer</Text>;
    };

    const { queryByTestId, getByText } = render(
      <ThemeProvider>
        <LoadingProvider>
          <LoadingOverlay />
          <Consumer />
        </LoadingProvider>
      </ThemeProvider>
    );

    // Initially hidden
    expect(queryByTestId('global-loading-overlay')).toBeNull();

    act(() => {
      helpers.start('test');
    });

    // Now visible
    expect(queryByTestId('global-loading-overlay')).toBeTruthy();

    act(() => {
      helpers.stop('test');
    });

    // Hidden again
    expect(queryByTestId('global-loading-overlay')).toBeNull();
  });
});
