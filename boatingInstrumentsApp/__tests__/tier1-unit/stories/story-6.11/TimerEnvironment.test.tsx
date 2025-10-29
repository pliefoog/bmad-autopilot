/**
 * Story 6.11: Timer Environment Test
 * Tests that the React Native Testing Library environment works correctly
 */

import React from 'react';
import { render } from '@testing-library/react-native';
import { View, Text } from 'react-native';

// Simple component to test basic rendering
const TestComponent = ({ message }: { message: string }) => (
  <View testID="test-component">
    <Text testID="test-message">{message}</Text>
  </View>
);

describe('Timer Environment Validation', () => {
  test('React Native Testing Library works without timeout errors', () => {
    const { getByTestId } = render(
      <TestComponent message="Testing environment works!" />
    );

    const component = getByTestId('test-component');
    const message = getByTestId('test-message');
    
    expect(component).toBeTruthy();
    expect(message).toBeTruthy();
  });
});