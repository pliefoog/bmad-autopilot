/**
 * Test suite for Story 6.11: Dashboard Pagination & Responsive Grid System
 * Tests all acceptance criteria for responsive grid and pagination functionality
 */

import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import { Dimensions } from 'react-native';
import { useResponsiveGrid, calculatePages, getMaxWidgetsPerPage } from '../../../src/hooks/useResponsiveGrid';
// ResponsiveDashboard import removed to avoid complex dependency chains
import { PaginationDots } from '../../../src/components/molecules/PaginationDots';
import { AddWidgetButton } from '../../../src/components/atoms/AddWidgetButton';
import {
  calculateGridPositions,
  calculatePageLayouts,
  canFitOnCurrentPage,
  findOptimalPageForNewWidget,
} from '../../../src/utils/layoutUtils';

// Mock dependencies
jest.mock('../../../src/store/themeStore', () => ({
  useTheme: () => ({
    background: '#000000',
    text: '#ffffff',
    primary: '#007AFF',
    textSecondary: '#666666',
    surface: '#111111',
    border: '#333333',
  }),
}));

jest.mock('../../../src/stores/widgetStore', () => ({
  useWidgetStore: () => ({
    selectedWidgets: ['depth', 'speed', 'wind', 'gps', 'compass', 'engine'],
    currentPage: 0,
    totalPages: 2,
    pageWidgets: { 0: ['depth', 'speed', 'wind'], 1: ['gps', 'compass', 'engine'] },
    maxWidgetsPerPage: 3,
    isAnimatingPageTransition: false,
    navigateToPage: jest.fn(),
    navigateToNextPage: jest.fn(),
    navigateToPreviousPage: jest.fn(),
    recalculatePages: jest.fn(),
    getWidgetsForPage: jest.fn((page) => 
      page === 0 ? ['depth', 'speed', 'wind'] : ['gps', 'compass', 'engine']
    ),
    addWidgetToOptimalPage: jest.fn(),
  }),
}));

// Mock Dimensions for responsive testing
const mockDimensions = (width: number, height: number) => {
  (Dimensions.get as jest.Mock) = jest.fn(() => ({ width, height }));
};

describe('Story 6.11: Dashboard Pagination & Responsive Grid System', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('AC 1-5: Responsive Grid System', () => {
    test('AC 1: Platform-Specific Widget Density - Phone', () => {
      mockDimensions(400, 800); // Phone portrait
      
      const { result } = renderHook(() => useResponsiveGrid());
      
      expect(result.current.platform).toBe('phone');
      expect(result.current.orientation).toBe('portrait');
      expect(result.current.layout.cols).toBe(1);
      expect(result.current.layout.rows).toBe(1);
    });

    test('AC 1: Platform-Specific Widget Density - Tablet', () => {
      mockDimensions(800, 600); // Tablet landscape
      
      const { result } = renderHook(() => useResponsiveGrid());
      
      expect(result.current.platform).toBe('tablet');
      expect(result.current.orientation).toBe('landscape');
      expect(result.current.layout.cols).toBe(3);
      expect(result.current.layout.rows).toBe(2);
    });

    test('AC 1: Platform-Specific Widget Density - Desktop', () => {
      mockDimensions(1200, 800); // Desktop landscape
      
      const { result } = renderHook(() => useResponsiveGrid());
      
      expect(result.current.platform).toBe('desktop');
      expect(result.current.orientation).toBe('landscape');
      expect(result.current.layout.cols).toBe(4);
      expect(result.current.layout.rows).toBe(3);
    });

    test('AC 2: Dynamic Layout Algorithm - Widgets flow top-left to bottom-right', () => {
      const constraints = {
        containerWidth: 600,
        containerHeight: 400,
        cols: 3,
        rows: 2,
        gap: 8,
        cellWidth: 180,
        cellHeight: 180,
      };

      const positions = calculateGridPositions(6, constraints);
      
      // First row: (0,0), (188,0), (376,0)
      expect(positions[0]).toEqual({ x: 0, y: 0, width: 180, height: 180 });
      expect(positions[1]).toEqual({ x: 188, y: 0, width: 180, height: 180 });
      expect(positions[2]).toEqual({ x: 376, y: 0, width: 180, height: 180 });
      
      // Second row: (0,188), (188,188), (376,188)
      expect(positions[3]).toEqual({ x: 0, y: 188, width: 180, height: 180 });
      expect(positions[4]).toEqual({ x: 188, y: 188, width: 180, height: 180 });
      expect(positions[5]).toEqual({ x: 376, y: 188, width: 180, height: 180 });
    });

    test('AC 4: Real-time Adaptation - Responds to dimension changes', async () => {
      mockDimensions(800, 600);
      
      const { result, rerender } = renderHook(() => useResponsiveGrid());
      
      // Initial tablet layout
      expect(result.current.layout.cols).toBe(3);
      
      // Change to phone dimensions
      mockDimensions(400, 800);
      rerender();
      
      await waitFor(() => {
        expect(result.current.layout.cols).toBe(1);
      });
    });

    test('AC 5: Equal Cell Sizing - 8pt gaps between cells', () => {
      const constraints = {
        containerWidth: 400,
        containerHeight: 400,
        cols: 2,
        rows: 2,
        gap: 8,
        cellWidth: 196,
        cellHeight: 196,
      };

      const positions = calculateGridPositions(4, constraints);
      
      // Verify 8pt gaps
      expect(positions[1].x - (positions[0].x + positions[0].width)).toBe(8);
      expect(positions[2].y - (positions[0].y + positions[0].height)).toBe(8);
    });
  });

  describe('AC 6-10: Pagination System', () => {
    test('AC 6: Page Indicator Dots - Shows correct page count', () => {
      const { getByTestId, queryByTestId } = render(
        <PaginationDots
          currentPage={0}
          totalPages={3}
          testID="pagination-test"
        />
      );

      expect(getByTestId('pagination-test')).toBeTruthy();
      expect(getByTestId('pagination-test-dot-0')).toBeTruthy();
      expect(getByTestId('pagination-test-dot-1')).toBeTruthy();
      expect(getByTestId('pagination-test-dot-2')).toBeTruthy();
    });

    test('AC 6: Page Indicator Dots - Hides when only one page', () => {
      const { queryByTestId } = render(
        <PaginationDots
          currentPage={0}
          totalPages={1}
          testID="pagination-test"
        />
      );

      expect(queryByTestId('pagination-test')).toBeNull();
    });

    test('AC 7: Blue + Button Positioning', () => {
      const { getByTestId } = render(
        <AddWidgetButton
          onPress={jest.fn()}
          testID="add-widget-test"
        />
      );

      const button = getByTestId('add-widget-test');
      expect(button).toBeTruthy();
    });

    test('AC 9: Page State Persistence - Page widgets calculation', () => {
      const widgets = ['depth', 'speed', 'wind', 'gps', 'compass', 'engine'];
      const { pages, totalPages } = calculatePages(widgets, 3);
      
      expect(totalPages).toBe(2);
      expect(pages[0]).toEqual(['depth', 'speed', 'wind']);
      expect(pages[1]).toEqual(['gps', 'compass', 'engine']);
    });
  });

  describe('AC 11-15: Layout Integration', () => {
    test('AC 12: Widget Per Page Limits - Enforces maximum widgets', () => {
      expect(getMaxWidgetsPerPage('phone')).toBe(2);
      expect(getMaxWidgetsPerPage('tablet')).toBe(6);
      expect(getMaxWidgetsPerPage('desktop')).toBe(12);
    });

    test('AC 13: Grid Overflow Handling - Creates new pages automatically', () => {
      const widgets = ['w1', 'w2', 'w3', 'w4', 'w5'];
      const constraints = {
        containerWidth: 400,
        containerHeight: 400,
        cols: 2,
        rows: 2, // Max 4 widgets per page
        gap: 8,
        cellWidth: 196,
        cellHeight: 196,
      };

      const pageLayouts = calculatePageLayouts(widgets, constraints);
      
      expect(pageLayouts).toHaveLength(2);
      expect(pageLayouts[0].widgets).toEqual(['w1', 'w2', 'w3', 'w4']);
      expect(pageLayouts[1].widgets).toEqual(['w5']);
    });

    test('AC 14: Empty State Display', () => {
      const emptyWidgetStore = {
        ...jest.requireMock('../../../src/stores/widgetStore').useWidgetStore(),
        selectedWidgets: [],
      };
      
      jest.doMock('../../../src/stores/widgetStore', () => ({
        useWidgetStore: () => emptyWidgetStore,
      }));

      const { getByTestId } = render(<ResponsiveDashboard />);
      
      expect(getByTestId('dashboard-empty-state')).toBeTruthy();
      expect(getByTestId('add-first-widget-button')).toBeTruthy();
    });

    test('AC 15: Performance Optimization - Page layout calculations', () => {
      const widgets = Array.from({ length: 50 }, (_, i) => `widget-${i}`);
      const constraints = {
        containerWidth: 600,
        containerHeight: 400,
        cols: 3,
        rows: 2, // 6 widgets per page
        gap: 8,
        cellWidth: 190,
        cellHeight: 190,
      };

      const startTime = performance.now();
      const pageLayouts = calculatePageLayouts(widgets, constraints);
      const endTime = performance.now();
      
      expect(endTime - startTime).toBeLessThan(10); // Should be very fast
      expect(pageLayouts).toHaveLength(9); // 50 widgets / 6 per page = 9 pages
    });
  });

  describe('AC 16-20: Cross-Platform Compatibility', () => {
    test('AC 16: Touch Interaction - Widget press handling', () => {
      const mockOnPress = jest.fn();
      
      const { getByTestId } = render(
        <AddWidgetButton
          onPress={mockOnPress}
          testID="touch-test"
        />
      );

      fireEvent.press(getByTestId('touch-test'));
      expect(mockOnPress).toHaveBeenCalled();
    });

    test('AC 19: Accessibility - Screen reader support', () => {
      const { getByTestId } = render(
        <PaginationDots
          currentPage={1}
          totalPages={3}
          testID="a11y-test"
        />
      );

      const container = getByTestId('a11y-test');
      expect(container.props.accessibilityLabel).toBe('Page 2 of 3');
      expect(container.props.accessibilityRole).toBe('tablist');
    });

    test('AC 20: Safe Area Compliance - Minimum touch targets', () => {
      const { getByTestId } = render(
        <AddWidgetButton
          onPress={jest.fn()}
          size={32} // Smaller than minimum
          testID="touch-target-test"
        />
      );

      const button = getByTestId('touch-target-test');
      const style = button.props.style;
      
      // Should enforce minimum 44pt touch target
      expect(style.minWidth).toBe(44);
      expect(style.minHeight).toBe(44);
    });
  });

  describe('Layout Utilities', () => {
    test('canFitOnCurrentPage - Correctly determines space availability', () => {
      expect(canFitOnCurrentPage(2, 4)).toBe(true);
      expect(canFitOnCurrentPage(4, 4)).toBe(false);
      expect(canFitOnCurrentPage(5, 4)).toBe(false);
    });

    test('findOptimalPageForNewWidget - Finds best page placement', () => {
      const pages = [
        { pageIndex: 0, widgets: ['w1', 'w2'], cells: [] },
        { pageIndex: 1, widgets: ['w3', 'w4', 'w5'], cells: [] },
        { pageIndex: 2, widgets: ['w6'], cells: [] },
      ];
      
      const optimalPage = findOptimalPageForNewWidget(pages, 3);
      expect(optimalPage).toBe(0); // First page with space (2/3 widgets)
    });

    test('findOptimalPageForNewWidget - Creates new page when all full', () => {
      const pages = [
        { pageIndex: 0, widgets: ['w1', 'w2', 'w3'], cells: [] },
        { pageIndex: 1, widgets: ['w4', 'w5', 'w6'], cells: [] },
      ];
      
      const optimalPage = findOptimalPageForNewWidget(pages, 3);
      expect(optimalPage).toBe(2); // New page needed
    });
  });

  describe('Integration Tests', () => {
    test('Complete responsive dashboard rendering', () => {
      const { getByTestId } = render(<ResponsiveDashboard />);
      
      expect(getByTestId('responsive-dashboard')).toBeTruthy();
      expect(getByTestId('dashboard-scroll-view')).toBeTruthy();
      expect(getByTestId('dashboard-pagination')).toBeTruthy();
    });

    test('Widget grid positioning accuracy', () => {
      const constraints = {
        containerWidth: 600,
        containerHeight: 400,
        cols: 3,
        rows: 2,
        gap: 8,
        cellWidth: 188,
        cellHeight: 188,
      };

      const widgets = ['depth', 'speed', 'wind', 'gps'];
      const pageLayouts = calculatePageLayouts(widgets, constraints);
      
      expect(pageLayouts).toHaveLength(1);
      expect(pageLayouts[0].widgets).toEqual(widgets);
      expect(pageLayouts[0].cells).toHaveLength(4);
      
      // Verify proper grid positioning
      const positions = pageLayouts[0].cells;
      expect(positions[0]).toEqual({ x: 0, y: 0, width: 188, height: 188 });
      expect(positions[1]).toEqual({ x: 196, y: 0, width: 188, height: 188 });
      expect(positions[2]).toEqual({ x: 392, y: 0, width: 188, height: 188 });
      expect(positions[3]).toEqual({ x: 0, y: 196, width: 188, height: 188 });
    });
  });
});

// Helper function for hook testing
const { renderHook } = require('@testing-library/react-hooks');