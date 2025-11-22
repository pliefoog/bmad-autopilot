/**
 * Story 13.1.1: Badge Theme Compliance Tests
 * Validates that Badge component uses theme-aware colors for marine safety
 */
import React from 'react';
import { render } from '@testing-library/react-native';
import Badge from '../../../src/components/atoms/Badge';
import { useTheme } from '../../../src/store/themeStore';

// Mock useTheme hook
jest.mock('../../../src/store/themeStore', () => ({
  useTheme: jest.fn(),
}));

describe('Badge - Theme Compliance (Story 13.1.1)', () => {
  const mockUseTheme = useTheme as jest.MockedFunction<typeof useTheme>;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Day Theme', () => {
    beforeEach(() => {
      mockUseTheme.mockReturnValue({
        primary: '#3B82F6',
        secondary: '#6B7280',
        success: '#10B981', // Green in day mode
        warning: '#F59E0B',
        error: '#EF4444',
        surface: '#F3F4F6',
        border: '#D1D5DB',
        text: '#374151',
      } as any);
    });

    it('uses theme.success for success variant (green in day mode)', () => {
      const { getByTestId } = render(
        <Badge variant="success" testID="badge">Connected</Badge>
      );
      const badge = getByTestId('badge');
      expect(badge.props.style).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ backgroundColor: '#10B981' }),
        ])
      );
    });
  });

  describe('Red-Night Theme', () => {
    beforeEach(() => {
      mockUseTheme.mockReturnValue({
        primary: '#DC2626',
        secondary: '#991B1B',
        success: '#DC2626', // Red in red-night mode (marine safety)
        warning: '#F59E0B',
        error: '#DC2626',
        surface: '#1F1917',
        border: '#7F1D1D',
        text: '#FCA5A5',
      } as any);
    });

    it('uses theme.success for success variant (red in red-night mode)', () => {
      const { getByTestId } = render(
        <Badge variant="success" testID="badge">Connected</Badge>
      );
      const badge = getByTestId('badge');
      expect(badge.props.style).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ backgroundColor: '#DC2626' }),
        ])
      );
    });

    it('CRITICAL: success badge has ZERO green light in red-night mode', () => {
      const { getByTestId } = render(
        <Badge variant="success" testID="badge">Connected</Badge>
      );
      const badge = getByTestId('badge');
      const backgroundColor = badge.props.style.find(
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
        primary: '#3B82F6',
        secondary: '#6B7280',
        success: '#10B981',
        warning: '#F59E0B',
        error: '#EF4444',
        surface: '#F3F4F6',
        border: '#D1D5DB',
        text: '#374151',
      } as any);

      const { getByTestId, rerender } = render(
        <Badge variant="success" testID="badge">Connected</Badge>
      );
      let badge = getByTestId('badge');
      expect(badge.props.style).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ backgroundColor: '#10B981' }),
        ])
      );

      // Switch to red-night theme
      mockUseTheme.mockReturnValue({
        primary: '#DC2626',
        secondary: '#991B1B',
        success: '#DC2626',
        warning: '#F59E0B',
        error: '#DC2626',
        surface: '#1F1917',
        border: '#7F1D1D',
        text: '#FCA5A5',
      } as any);

      rerender(<Badge variant="success" testID="badge">Connected</Badge>);
      badge = getByTestId('badge');
      expect(badge.props.style).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ backgroundColor: '#DC2626' }),
        ])
      );
    });
  });

  describe('All Badge Variants', () => {
    beforeEach(() => {
      mockUseTheme.mockReturnValue({
        primary: '#DC2626',
        secondary: '#991B1B',
        success: '#DC2626',
        warning: '#F59E0B',
        error: '#DC2626',
        surface: '#1F1917',
        border: '#7F1D1D',
        text: '#FCA5A5',
      } as any);
    });

    it('uses theme.primary for primary variant', () => {
      const { getByTestId } = render(
        <Badge variant="primary" testID="badge">Primary</Badge>
      );
      const badge = getByTestId('badge');
      expect(badge.props.style).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ backgroundColor: '#DC2626' }),
        ])
      );
    });

    it('uses theme.secondary for secondary variant', () => {
      const { getByTestId } = render(
        <Badge variant="secondary" testID="badge">Secondary</Badge>
      );
      const badge = getByTestId('badge');
      expect(badge.props.style).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ backgroundColor: '#991B1B' }),
        ])
      );
    });

    it('uses theme.success for success variant', () => {
      const { getByTestId } = render(
        <Badge variant="success" testID="badge">Success</Badge>
      );
      const badge = getByTestId('badge');
      expect(badge.props.style).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ backgroundColor: '#DC2626' }),
        ])
      );
    });

    it('uses theme.warning for warning variant', () => {
      const { getByTestId } = render(
        <Badge variant="warning" testID="badge">Warning</Badge>
      );
      const badge = getByTestId('badge');
      expect(badge.props.style).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ backgroundColor: '#F59E0B' }),
        ])
      );
    });

    it('uses theme.error for danger variant', () => {
      const { getByTestId } = render(
        <Badge variant="danger" testID="badge">Danger</Badge>
      );
      const badge = getByTestId('badge');
      expect(badge.props.style).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ backgroundColor: '#DC2626' }),
        ])
      );
    });

    it('uses theme.surface and border for default variant', () => {
      const { getByTestId } = render(
        <Badge variant="default" testID="badge">Default</Badge>
      );
      const badge = getByTestId('badge');
      expect(badge.props.style).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            backgroundColor: '#1F1917',
            borderColor: '#7F1D1D',
          }),
        ])
      );
    });
  });
});
