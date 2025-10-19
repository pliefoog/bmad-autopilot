import React from 'react';
import { render, act } from '@testing-library/react-native';
import { LoadingProvider, useLoading } from '../../../src/services/loading/LoadingContext';
import { Text } from 'react-native';

describe('LoadingContext', () => {
  test('start and stop loading updates anyLoading and keyed loading', () => {
    const helpers: any = {};

    const Consumer: React.FC = () => {
      const { startLoading, stopLoading, isLoading, anyLoading } = useLoading();
      React.useEffect(() => {
        helpers.start = startLoading;
        helpers.stop = stopLoading;
        helpers.isLoading = isLoading;
      }, [startLoading, stopLoading, isLoading]);
      return <Text testID="any">{String(anyLoading)}</Text>;
    };

    const { getByTestId } = render(
      <LoadingProvider>
        <Consumer />
      </LoadingProvider>
    );

    // Initially not loading
    expect(getByTestId('any').props.children).toBe('false');

    act(() => {
      helpers.start('op1');
    });

    // Now loading
    expect(getByTestId('any').props.children).toBe('true');

    act(() => {
      helpers.stop('op1');
    });

    // Back to not loading
    expect(getByTestId('any').props.children).toBe('false');
  });
});
