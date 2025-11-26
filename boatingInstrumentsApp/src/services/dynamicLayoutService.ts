import { Dimensions } from 'react-native';
import { WidgetLayout } from './layoutService';

export interface GridConfig {
  columns: number;           // Number of columns (1, 2, 4, or 8)
  rows: number;              // Number of rows per page
  widgetWidth: number;       // Fixed width per widget
  widgetHeight: number;      // Fixed height per widget
  spacing: number;           // Spacing between widgets
  margin: number;            // Screen edge margin
  availableHeight: number;   // Available height for widgets
  availableWidth: number;    // Available width for widgets
}

export interface DynamicWidgetLayout extends WidgetLayout {
  page: number;              // Page number (0-indexed)
  gridPosition: { row: number; col: number }; // Position within page
  width: number;             // Fixed width in pixels
  height: number;            // Fixed height in pixels
  expanded: boolean;         // Always true in new system
}

export class DynamicLayoutService {
  private static getScreenDimensions() {
    return Dimensions.get('window');
  }

  /**
   * Calculate optimal grid configuration based on screen size and widget count
   * Returns fixed widget dimensions and grid layout
   * 
   * Breakpoints and behavior:
   * - < 600px: 1 column, vertical scroll (mobile portrait)
   * - 600-767px: 2 columns, vertical scroll (mobile landscape)
   * - 768-1023px: 3 columns, pagination (tablet portrait)
   * - 1024-1279px: 5 columns, pagination (tablet landscape)
   * - 1280-1919px: 6 columns, pagination (desktop)
   * - 1920+: 8 columns, pagination (large desktop)
   */
  static getGridConfig(headerHeight: number = 60, footerHeight: number = 88, widgetCount: number = 0): GridConfig {
    const { width: screenWidth, height: screenHeight } = this.getScreenDimensions();
    
    const spacing = 0;  // No spacing - widgets fill all space
    const margin = 0;   // No margin - widgets extend to edges
    
    // Calculate available space - use full viewport
    const availableWidth = screenWidth;
    const availableHeight = screenHeight - headerHeight - footerHeight;
    
    // Determine columns based on screen width
    let columns: number;
    let usePagination: boolean;
    
    if (screenWidth >= 1920) {
      columns = 8; // Large desktop (1920+)
      usePagination = true;
    } else if (screenWidth >= 1280) {
      columns = 6; // Desktop (1280-1919)
      usePagination = true;
    } else if (screenWidth >= 1024) {
      columns = 5; // Tablet landscape (1024-1279)
      usePagination = true;
    } else if (screenWidth >= 768) {
      columns = 3; // Tablet portrait (768-1023)
      usePagination = true;
    } else if (screenWidth >= 600) {
      columns = 2; // Mobile landscape (600-767)
      usePagination = false; // Vertical scroll
    } else {
      columns = 1; // Mobile portrait (< 600)
      usePagination = false; // Vertical scroll
    }
    
    // Calculate widget width - divide available space evenly by columns
    // But first, optimize columns based on widget count for better distribution
    let actualColumns = columns;
    
    if (usePagination && widgetCount > 0) {
      // Find optimal column count that minimizes wasted space
      // Try reducing columns to get more even distribution
      let bestColumns = columns;
      let bestWaste = widgetCount % columns; // Widgets left over in last row
      
      // Try each column count from max down to 1
      for (let testCols = columns; testCols >= 1; testCols--) {
        const testRows = Math.ceil(widgetCount / testCols);
        const testMaxRows = Math.floor(availableHeight / Math.floor(availableWidth / testCols));
        
        // Only consider if rows fit on screen
        if (testRows <= testMaxRows) {
          const waste = widgetCount % testCols;
          
          // Perfect fill (no waste) or better distribution
          if (waste === 0) {
            bestColumns = testCols;
            bestWaste = 0;
            break; // Perfect, stop searching
          } else if (waste < bestWaste) {
            bestColumns = testCols;
            bestWaste = waste;
          }
        }
      }
      
      actualColumns = bestColumns;
    }
    
    const widgetWidth = Math.floor(availableWidth / actualColumns);
    
    // Calculate rows based on actual widget count and screen mode
    let rows: number;
    let maxRowsForScreen: number;
    
    if (!usePagination) {
      // Mobile scroll mode: unlimited rows
      rows = 999;
      maxRowsForScreen = 999;
    } else {
      // Desktop/tablet pagination: Calculate max rows that fit with square aspect ratio
      maxRowsForScreen = Math.floor(availableHeight / widgetWidth);
      // Ensure at least 1 row
      if (maxRowsForScreen < 1) {
        maxRowsForScreen = 1;
      }
      
      // Calculate actual rows needed for widget count
      // Example: 18 widgets / 6 columns (optimized) = 3.0 → ceil = 3 rows needed
      const rowsNeeded = widgetCount > 0 ? Math.ceil(widgetCount / actualColumns) : maxRowsForScreen;
      
      // Use minimum of (rows needed, max rows that fit on screen)
      // Example: min(3, 4) = 3 rows → use 3 rows, not 4
      rows = Math.min(rowsNeeded, maxRowsForScreen);
    }
    
    // Calculate widget height to fill vertical space evenly
    // Divide available height by ACTUAL rows being used
    // Example: 800px / 3 rows = 266px per widget
    const widgetHeight = usePagination 
      ? Math.floor(availableHeight / rows)
      : widgetWidth;
    
    console.log('[DynamicLayoutService] Grid config calculated:', {
      screenWidth,
      screenHeight,
      availableWidth,
      availableHeight,
      maxColumns: columns,
      actualColumns,
      columnsOptimized: actualColumns !== columns,
      rows,
      maxRowsForScreen: usePagination ? maxRowsForScreen : 'unlimited',
      widgetCount,
      rowsNeeded: widgetCount > 0 ? Math.ceil(widgetCount / actualColumns) : 'unknown',
      usePagination,
      widgetWidth,
      widgetHeight,
      totalWidgetsPerPage: usePagination ? actualColumns * rows : 'unlimited',
      calculation: usePagination 
        ? `${widgetCount} widgets / ${actualColumns} cols = ${Math.ceil(widgetCount / actualColumns)} rows needed, min(needed, ${maxRowsForScreen} max) = ${rows} rows used, ${availableHeight}px / ${rows} rows = ${widgetHeight}px height`
        : `Square aspect: ${widgetWidth}px`
    });
    
    return {
      columns: actualColumns,
      rows: usePagination ? rows : 999, // Unlimited rows for scroll mode
      widgetWidth,
      widgetHeight,
      spacing,
      margin,
      availableHeight,
      availableWidth,
    };
  }

  /**
   * Convert widget layouts to grid-based dynamic layout with pagination or scrolling
   * Mobile (1-2 cols): Widgets flow vertically with scrolling, height fills screen
   * Tablet/Desktop (4-8 cols): Fixed pages, widgets sized to fill each page
   */
  static toDynamicLayout(layouts: WidgetLayout[], headerHeight: number = 60, footerHeight: number = 88): DynamicWidgetLayout[] {
    // Filter visible widgets first to get accurate count
    const visibleWidgets = layouts
      .filter(w => w.visible)
      .sort((a, b) => (a.order || 0) - (b.order || 0));
    
    const gridConfig = this.getGridConfig(headerHeight, footerHeight, visibleWidgets.length);
    const { columns, rows, widgetWidth, widgetHeight, spacing, availableHeight } = gridConfig;
    
    console.log('[DynamicLayoutService] toDynamicLayout using config:', {
      visibleWidgetCount: visibleWidgets.length,
      columns,
      rows,
      widgetWidth,
      widgetHeight,
      widgetsPerPage: columns * rows
    });
    
    const usePagination = rows < 999; // Pagination mode vs scroll mode
    
    if (usePagination) {
      // PAGINATION MODE (Tablet/Desktop): Fixed pages with rows × columns grid
      const widgetsPerPage = columns * rows;
      
      return visibleWidgets.map((layout, index) => {
        const page = Math.floor(index / widgetsPerPage);
        const indexInPage = index % widgetsPerPage;
        const row = Math.floor(indexInPage / columns);
        const col = indexInPage % columns;
        
        return {
          ...layout,
          page,
          gridPosition: { row, col },
          width: widgetWidth,
          height: widgetHeight,
          expanded: true,
          size: {
            width: widgetWidth,
            height: widgetHeight
          },
          position: { x: 0, y: 0 }
        };
      });
    } else {
      // SCROLL MODE (Mobile): Use widget width for height to maintain aspect ratio
      // Widgets fill full width and scroll vertically
      const reasonableHeight = widgetWidth; // Square aspect ratio for scrolling
      
      return visibleWidgets.map((layout, index) => {
        const page = 0; // Single page
        const row = Math.floor(index / columns);
        const col = index % columns;
        
        return {
          ...layout,
          page,
          gridPosition: { row, col },
          width: widgetWidth,
          height: reasonableHeight,
          expanded: true,
          size: {
            width: widgetWidth,
            height: reasonableHeight
          },
          position: { x: 0, y: 0 }
        };
      });
    }
  }

  /**
   * Get total number of pages needed for the given widgets
   * Returns 1 for mobile (scroll mode), multiple pages for tablet/desktop (pagination mode)
   */
  static getTotalPages(widgets: DynamicWidgetLayout[], headerHeight: number = 60, footerHeight: number = 88): number {
    const visibleWidgets = widgets.filter(w => w.visible);
    const gridConfig = this.getGridConfig(headerHeight, footerHeight, visibleWidgets.length);
    const usePagination = gridConfig.rows < 999;
    
    if (!usePagination) {
      return 1; // Mobile: single scrollable page
    }
    
    // Tablet/Desktop: calculate pages needed based on actual rows used per page
    const widgetsPerPage = gridConfig.columns * gridConfig.rows;
    return Math.max(1, Math.ceil(visibleWidgets.length / widgetsPerPage));
  }

  /**
   * Get widgets for a specific page
   */
  static getWidgetsForPage(widgets: DynamicWidgetLayout[], page: number): DynamicWidgetLayout[] {
    return widgets.filter(w => w.page === page);
  }

  /**
   * Legacy method for compatibility - always returns expanded layout now
   */
  static calculateFlowLayout(widgets: DynamicWidgetLayout[]): DynamicWidgetLayout[] {
    return widgets;
  }

  /**
   * Legacy method for compatibility - expansion is always on in new system
   */
  static handleWidgetExpansion(
    widgets: DynamicWidgetLayout[],
    expandedWidgetId: string,
    isExpanded: boolean
  ): DynamicWidgetLayout[] {
    // In the new system, all widgets are always expanded
    return widgets;
  }

  /**
   * Legacy method for compatibility
   */
  static migrateLegacyLayout(legacyLayouts: WidgetLayout[]): DynamicWidgetLayout[] {
    return this.toDynamicLayout(legacyLayouts);
  }
}
