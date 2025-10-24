/**
 * Unit tests for PaginationDots component
 * Tests AC 6: Page Indicator Dots functionality
 */

import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { PaginationDots } from '../../../src/components/molecules/PaginationDots';

// Mock theme
jest.mock('../../../src/store/themeStore', () => ({
  useTheme: () => ({
    primary: '#007AFF',
    textSecondary: '#666666',
  }),
}));

describe('PaginationDots Component', () => {
  const defaultProps = {
    currentPage: 0,
    totalPages: 3,
    onPagePress: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('renders correct number of dots', () => {
    const { getByTestId } = render(
      <PaginationDots {...defaultProps} testID="pagination" />
    );

    expect(getByTestId('pagination-dot-0')).toBeTruthy();
    expect(getByTestId('pagination-dot-1')).toBeTruthy();
    expect(getByTestId('pagination-dot-2')).toBeTruthy();
  });

  test('highlights current page dot', () => {
    const { getByTestId } = render(
      <PaginationDots {...defaultProps} currentPage={1} testID="pagination" />
    );

    const activeDot = getByTestId('pagination-dot-1');
    expect(activeDot.props.accessibilityState.selected).toBe(true);
  });

  test('calls onPagePress when dot is pressed', () => {
    const onPagePress = jest.fn();
    const { getByTestId } = render(
      <PaginationDots {...defaultProps} onPagePress={onPagePress} testID="pagination" />
    );

    fireEvent.press(getByTestId('pagination-dot-2'));
    expect(onPagePress).toHaveBeenCalledWith(2);
  });

  test('does not render when totalPages is 1 or less', () => {
    const { queryByTestId } = render(
      <PaginationDots {...defaultProps} totalPages={1} testID="pagination" />
    );

    expect(queryByTestId('pagination')).toBeNull();
  });

  test('provides proper accessibility labels', () => {
    const { getByTestId } = render(
      <PaginationDots {...defaultProps} currentPage={1} totalPages={3} testID="pagination" />
    );

    const container = getByTestId('pagination');
    expect(container.props.accessibilityLabel).toBe('Page 2 of 3');
    
    const dot = getByTestId('pagination-dot-0');
    expect(dot.props.accessibilityLabel).toBe('Go to page 1 of 3');
  });
});