/**
 * Story 13.1.1: StatusIndicator Theme Compliance Tests
 * Validates that StatusIndicator uses theme-aware colors for marine safety
 */
import React from 'react';
import { render } from '@testing-library/react-native';
import StatusIndicator from '../../../src/components/atoms/StatusIndicator';
import { useTheme } from '../../../src/store/themeStore';

// Mock useTheme hook
jest.mock('../../../src/store/themeStore', () => ({
  useTheme: jest.fn(),
}));

describe('StatusIndicator - Theme Compliance (Story 13.1.1)', () => {
  const mockUseTheme = useTheme as jest.MockedFunction<typeof useTheme>;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Day Theme', () => {
    beforeEach(() => {
      mockUseTheme.mockReturnValue({
        success: '#10B981', // Green in day mode
        warning: '#F59E0B',
        error: '#EF4444',
        textSecondary: '#6B7280',
      } as any);
    });

    it('uses theme.success for connected status (green in day mode)', () => {
      const { getByTestId } = render(
        <StatusIndicator status="connected" testID="indicator" />
      );
      const indicator = getByTestId('indicator');
      expect(indicator.props.style).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ backgroundColor: '#10B981' }),
        ])
      );
    });
  });

  describe('Red-Night Theme', () => {
    beforeEach(() => {
      mockUseTheme.mockReturnValue({
        success: '#DC2626', // Red in red-night mode (marine safety)
        warning: '#F59E0B',
        error: '#DC2626',
        textSecondary: '#DC2626',
      } as any);
    });

    it('uses theme.success for connected status (red in red-night mode)', () => {
      const { getByTestId } = render(
        <StatusIndicator status="connected" testID="indicator" />
      );
      const indicator = getByTestId('indicator');
      expect(indicator.props.style).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ backgroundColor: '#DC2626' }),
        ])
      );
    });

    it('CRITICAL: connected indicator has ZERO green light in red-night mode', () => {
      const { getByTestId } = render(
        <StatusIndicator status="connected" testID="indicator" />
      );
      const indicator = getByTestId('indicator');
      const backgroundColor = indicator.props.style.find(
        (s: any) => s?.backgroundColor
      )?.backgroundColor;
      
      // Verify it's red (#DC2626), not green (#10B981)
      expect(backgroundColor).toBe('#DC2626');
      expect(backgroundColor).not.toContain('B981'); // No green wavelengths
    });
  });

  describe('Theme Awareness', () => {
    it('reacts to theme changes', () => {
      // Start with day theme
      mockUseTheme.mockReturnValue({
        success: '#10B981',
        warning: '#F59E0B',
        error: '#EF4444',
        textSecondary: '#6B7280',
      } as any);

      const { getByTestId, rerender } = render(
        <StatusIndicator status="connected" testID="indicator" />
      );
      let indicator = getByTestId('indicator');
      expect(indicator.props.style).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ backgroundColor: '#10B981' }),
        ])
      );

      // Switch to red-night theme
      mockUseTheme.mockReturnValue({
        success: '#DC2626',
        warning: '#F59E0B',
        error: '#DC2626',
        textSecondary: '#DC2626',
      } as any);

      rerender(<StatusIndicator status="connected" testID="indicator" />);
      indicator = getByTestId('indicator');
      expect(indicator.props.style).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ backgroundColor: '#DC2626' }),
        ])
      );
    });
  });

  describe('All Status Variants', () => {
    beforeEach(() => {
      mockUseTheme.mockReturnValue({
        success: '#DC2626',
        warning: '#F59E0B',
        error: '#DC2626',
        textSecondary: '#DC2626',
      } as any);
    });

    it('uses theme.success for connected status', () => {
      const { getByTestId } = render(
        <StatusIndicator status="connected" testID="indicator" />
      );
      const indicator = getByTestId('indicator');
      expect(indicator.props.style).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ backgroundColor: '#DC2626' }),
        ])
      );
    });

    it('uses theme.warning for connecting status', () => {
      const { getByTestId } = render(
        <StatusIndicator status="connecting" testID="indicator" />
      );
      const indicator = getByTestId('indicator');
      expect(indicator.props.style).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ backgroundColor: '#F59E0B' }),
        ])
      );
    });

    it('uses theme.warning for warning status', () => {
      const { getByTestId } = render(
        <StatusIndicator status="warning" testID="indicator" />
      );
      const indicator = getByTestId('indicator');
      expect(indicator.props.style).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ backgroundColor: '#F59E0B' }),
        ])
      );
    });

    it('uses theme.error for error status', () => {
      const { getByTestId } = render(
        <StatusIndicator status="error" testID="indicator" />
      );
      const indicator = getByTestId('indicator');
      expect(indicator.props.style).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ backgroundColor: '#DC2626' }),
        ])
      );
    });

    it('uses theme.textSecondary for disconnected status', () => {
      const { getByTestId } = render(
        <StatusIndicator status="disconnected" testID="indicator" />
      );
      const indicator = getByTestId('indicator');
      expect(indicator.props.style).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ backgroundColor: '#DC2626' }),
        ])
      );
    });
  });
});
