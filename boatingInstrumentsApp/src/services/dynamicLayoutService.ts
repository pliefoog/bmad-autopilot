import { Dimensions } from 'react-native';
import { WidgetLayout } from './layoutService';

export interface GridConfig {
  baseUnitWidth: number;
  baseUnitHeight: number;
  spacing: number;
  margin: number;
  minColumns: number;
  maxColumns: number;
}

export interface DynamicWidgetLayout extends WidgetLayout {
  gridPosition: { row: number; col: number }; // Grid position (not pixels)
  gridSize: { width: number; height: number }; // Grid units (1x1 or 1x2)
  fixedWidth: number; // Fixed width determined by content analysis
  expanded: boolean;
}

export class DynamicLayoutService {
  private static getScreenDimensions() {
    return Dimensions.get('window');
  }

  /**
   * Calculate optimal grid configuration based on screen size
   * FIXED: Standardized heights only - content must adapt to fit
   */
  static getGridConfig(): GridConfig {
    const { width: screenWidth } = this.getScreenDimensions();
    
    // FIXED: Only two heights allowed
    const baseUnitHeight = 140; // Collapsed height (fixed)
    const spacing = 12; // Spacing between widgets
    const margin = 16; // Screen edge margin
    
    // Calculate responsive columns
    const availableWidth = screenWidth - (2 * margin);
    let columns: number;
    
    if (screenWidth >= 1024) {
      columns = 5; // Large screens
    } else if (screenWidth >= 768) {
      columns = 4; // Tablets
    } else if (screenWidth >= 480) {
      columns = 3; // Large phones
    } else {
      columns = 2; // Small phones
    }
    
    // Base unit width is just for reference - actual widths are content-determined
    const baseUnitWidth = Math.floor((availableWidth - (spacing * (columns - 1))) / columns);
    
    return {
      baseUnitWidth,
      baseUnitHeight,
      spacing,
      margin,
      minColumns: 2,
      maxColumns: columns,
    };
  }

  /**
   * Calculate FIXED width requirements for a widget based on content analysis
   * FIXED: Width determined by maximum content needs (collapsed OR expanded)
   */
  static calculateFixedWidgetWidth(widgetId: string): number {
    // Analyze both collapsed and expanded content to determine maximum width needed
    switch (widgetId) {
      case 'engine':
        // Engine: Multiple metrics in grid (RPM, Temp, Pressure, etc.)
        return 200; // Wide enough for 2x2 metric grid
        
      case 'tanks':
        // Tanks: Multiple tank levels with labels
        return 180; // Wide enough for tank labels + levels
        
      case 'gps':
        // GPS: Long coordinate strings (48.63665°, -122.02334°)
        return 220; // Wide enough for full coordinates
        
      case 'autopilot':
        // Autopilot: Controls and status display
        return 190; // Wide enough for control buttons
        
      case 'wind':
        // Wind: Direction + speed, possibly with arrow
        return 160; // Standard width for wind display
        
      case 'compass':
        // Compass: Heading + compass rose
        return 160; // Standard width for compass
        
      case 'depth':
        // Depth: Value + trend + history
        return 150; // Standard width for depth
        
      case 'speed':
        // Speed: Value + units
        return 140; // Standard width for speed
        
      case 'battery':
        // Battery: Voltage + percentage
        return 140; // Standard width for battery
        
      default:
        // Default width for unknown widgets
        return 150;
    }
  }

  /**
   * Convert widget layout to grid-based dynamic layout
   * FIXED: Standardized heights + fixed widths + proper grid positioning
   */
  static toDynamicLayout(layouts: WidgetLayout[]): DynamicWidgetLayout[] {
    const gridConfig = this.getGridConfig();
    
    return layouts.map((layout, index) => {
      // FIXED: Only two heights allowed (1 or 2 units)
      const gridHeight = layout.expanded ? 2 : 1;
      
      // FIXED: Width is fixed per widget type (never changes on expand/collapse)
      const fixedWidth = this.calculateFixedWidgetWidth(layout.id);
      
      // FIXED: Standardized pixel heights only
      const pixelHeight = gridHeight * gridConfig.baseUnitHeight + (gridHeight - 1) * gridConfig.spacing;
      
      return {
        ...layout,
        gridPosition: { row: 0, col: 0 }, // Will be calculated by layout algorithm
        gridSize: { width: 1, height: gridHeight }, // Grid units (always 1 wide, 1-2 tall)
        fixedWidth,
        expanded: layout.expanded || false,
        size: {
          width: fixedWidth,
          height: pixelHeight
        }
      };
    });
  }

  /**
   * Calculate optimal flow layout positions for widgets  
   * FIXED: Simple left-to-right, top-to-bottom flow with proper spacing
   */
  static calculateFlowLayout(widgets: DynamicWidgetLayout[]): DynamicWidgetLayout[] {
    const gridConfig = this.getGridConfig();
    const { margin, spacing } = gridConfig;
    const screenWidth = this.getScreenDimensions().width;
    const maxRowWidth = screenWidth - (2 * margin);
    
    // Sort widgets by order preference
    const sortedWidgets = [...widgets].filter(w => w.visible)
      .sort((a, b) => (a.order || 0) - (b.order || 0));
    
    // Since we're now using flexbox layout, we don't need to calculate exact positions
    // Just ensure all widgets have their correct fixed widths and heights
    const positionedWidgets = sortedWidgets.map((widget, index) => {
      return {
        ...widget,
        position: { x: 0, y: 0 }, // Not used in flexbox layout
        gridPosition: { 
          row: 0, 
          col: index 
        }
      };
    });
    
    return positionedWidgets;
  }

  /**
   * Calculate row height needed for a set of widgets
   * FIXED: Simple height calculation based on tallest widget in row
   */
  private static calculateRowHeight(widgets: DynamicWidgetLayout[]): number {
    if (widgets.length === 0) return 0;
    return Math.max(...widgets.map(w => w.size.height));
  }

  /**
   * Handle widget expansion - recalculate layout for affected widgets
   * FIXED: Only height changes, width stays the same, recalculate positions
   */
  static handleWidgetExpansion(
    widgets: DynamicWidgetLayout[],
    expandedWidgetId: string,
    isExpanded: boolean
  ): DynamicWidgetLayout[] {
    const gridConfig = this.getGridConfig();
    
    // Update the expanded widget - ONLY height changes, width stays fixed
    const updatedWidgets = widgets.map(widget => {
      if (widget.id === expandedWidgetId) {
        const gridHeight = isExpanded ? 2 : 1;
        const pixelHeight = gridHeight * gridConfig.baseUnitHeight + (gridHeight - 1) * gridConfig.spacing;
        
        return {
          ...widget,
          expanded: isExpanded,
          gridSize: { width: 1, height: gridHeight },
          size: {
            width: widget.fixedWidth, // FIXED: Width never changes
            height: pixelHeight
          }
        };
      }
      return widget;
    });
    
    // Recalculate flow layout for all widgets (positions may change due to height change)
    return this.calculateFlowLayout(updatedWidgets);
  }

  /**
   * Get standardized widget dimensions
   * FIXED: Returns only the two allowed heights
   */
  static getStandardWidgetDimensions(expanded: boolean): { width: number; height: number } {
    const gridConfig = this.getGridConfig();
    return {
      width: gridConfig.baseUnitWidth, // This is just for reference, actual widths are fixed per widget
      height: expanded 
        ? 2 * gridConfig.baseUnitHeight + gridConfig.spacing  // Expanded: 2 units
        : gridConfig.baseUnitHeight                           // Collapsed: 1 unit
    };
  }

  /**
   * Get the fixed height for a widget in a specific state
   * FIXED: Only two heights possible
   */
  static getWidgetHeight(expanded: boolean): number {
    const gridConfig = this.getGridConfig();
    return expanded 
      ? 2 * gridConfig.baseUnitHeight + gridConfig.spacing
      : gridConfig.baseUnitHeight;
  }

  /**
   * Convert legacy layout to dynamic layout
   */
  static migrateLegacyLayout(legacyLayouts: WidgetLayout[]): DynamicWidgetLayout[] {
    const dynamicLayouts = this.toDynamicLayout(legacyLayouts);
    return this.calculateFlowLayout(dynamicLayouts);
  }
}