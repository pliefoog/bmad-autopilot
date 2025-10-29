import React from 'react';
import { render } from '@testing-library/react-native';
import Button from '../../../src/components/atoms/Button';

describe('Accessible Button', () => {
  test('has accessibility role and label, and enforces minimum touch target', () => {
    const { getByTestId } = render(
      <Button
        title="Press me"
        onPress={() => {}}
        size="small"
        testID="btn-press"
        accessibilityLabel="Press me label"
        accessibilityHint="Performs an important action"
      />
    );

    const pressable = getByTestId('btn-press');

    // Accessibility props
    expect(pressable.props.accessibilityRole).toBe('button');
    expect(pressable.props.accessibilityLabel).toBe('Press me label');
    expect(pressable.props.accessibilityHint).toBe('Performs an important action');
    expect(pressable.props.accessibilityState).toEqual({ disabled: false });

    // hitSlop should be present to help with touchability in marine conditions
    expect(pressable.props.hitSlop).toBeDefined();

    // The style prop on Pressable is a function; call it with pressed=false to obtain styles
    const styleFn = pressable.props.style;
    const resolved = typeof styleFn === 'function' ? styleFn({ pressed: false }) : pressable.props.style;

    // resolved is typically an array of styles - flatten if needed
    const combined = Array.isArray(resolved) ? Object.assign({}, ...resolved) : resolved;

    // Check container minHeight meets the 44pt minimum
    expect(combined.minHeight).toBeGreaterThanOrEqual(44);
  });
});
