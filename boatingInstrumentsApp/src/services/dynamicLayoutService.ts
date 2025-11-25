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
   * Calculate optimal grid configuration based on screen size and available space
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
  static getGridConfig(headerHeight: number = 60, footerHeight: number = 88): GridConfig {
    const { width: screenWidth, height: screenHeight } = this.getScreenDimensions();
    
    const spacing = 8;  // Spacing between widgets
    const margin = 8;   // Screen edge margin
    
    // Calculate available space
    const availableWidth = screenWidth - (2 * margin);
    const availableHeight = screenHeight - headerHeight - footerHeight - (2 * margin);
    
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
    
    // Calculate widget width
    const totalSpacingWidth = spacing * (columns - 1);
    const widgetWidth = Math.floor((availableWidth - totalSpacingWidth) / columns);
    
    // Calculate rows that fit in available height
    // Use square aspect ratio as baseline (height = width)
    const minWidgetHeight = widgetWidth;
    let rows = Math.floor(availableHeight / (minWidgetHeight + spacing));
    
    // Ensure at least 1 row
    if (rows < 1) {
      rows = 1;
    }
    
    // For mobile (no pagination), use flexible row count
    // For tablet/desktop (with pagination), fix rows per page
    if (!usePagination) {
      rows = 999; // Unlimited rows for vertical scroll
    }
    
    // Calculate widget height to fill vertical space evenly
    const totalSpacingHeight = spacing * (Math.min(rows, 10) - 1); // Cap at 10 for calculation
    const widgetHeight = Math.floor((availableHeight - totalSpacingHeight) / Math.min(rows, 10));
    
    return {
      columns,
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
    const gridConfig = this.getGridConfig(headerHeight, footerHeight);
    const { columns, rows, widgetWidth, widgetHeight, spacing, availableHeight } = gridConfig;
    
    // Filter visible widgets and sort by order
    const visibleWidgets = layouts
      .filter(w => w.visible)
      .sort((a, b) => (a.order || 0) - (b.order || 0));
    
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
      // SCROLL MODE (Mobile): Use reasonable fixed height for each widget
      // Don't try to fit all widgets on screen - let them scroll naturally
      const reasonableHeight = Math.max(widgetWidth * 1.2, 280); // At least 1.2:1 aspect ratio or 280px minimum
      
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
    const gridConfig = this.getGridConfig(headerHeight, footerHeight);
    const usePagination = gridConfig.rows < 999;
    
    if (!usePagination) {
      return 1; // Mobile: single scrollable page
    }
    
    // Tablet/Desktop: calculate pages needed
    const widgetsPerPage = gridConfig.columns * gridConfig.rows;
    const visibleWidgets = widgets.filter(w => w.visible);
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
