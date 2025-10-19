import React from 'react';
import { render } from '@testing-library/react-native';
import ProgressBar from '../../../src/components/atoms/ProgressBar';

describe('ProgressBar', () => {
  test('renders fill with correct width percentage', () => {
    const { getByTestId } = render(<ProgressBar progress={37} testID="task-progress" />);
    const fill = getByTestId('task-progress-fill');
    expect(fill.props.style).toBeDefined();
    // The style includes width as a string like '37%'
    const style = Array.isArray(fill.props.style) ? Object.assign({}, ...fill.props.style) : fill.props.style;
    expect(style.width).toBe('37%');
  });
});
