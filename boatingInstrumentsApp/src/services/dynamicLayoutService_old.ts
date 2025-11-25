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
    if (screenWidth >= 1920) {
      columns = 8; // Large desktop (1920+)
    } else if (screenWidth >= 1280) {
      columns = 6; // Desktop (1280-1919)
    } else if (screenWidth >= 768) {
      columns = 4; // Tablet landscape (768-1279)
    } else if (screenWidth >= 600) {
      columns = 2; // Tablet portrait / large phone landscape (600-767)
    } else {
      columns = 1; // Phone portrait (< 600)
    }
    
    // Calculate widget width
    const totalSpacingWidth = spacing * (columns - 1);
    const widgetWidth = Math.floor((availableWidth - totalSpacingWidth) / columns);
    
    // Calculate rows to fill available height (minimum 1:1 aspect ratio)
    // Start with minimum height = widgetWidth (1:1 ratio)
    let rows = Math.floor(availableHeight / (widgetWidth + spacing));
    
    // If we can fit more rows with smaller height, do so
    if (rows < 1) {
      rows = 1;
    }
    
    // Calculate widget height to evenly fill vertical space
    const totalSpacingHeight = spacing * (rows - 1);
    const widgetHeight = Math.floor((availableHeight - totalSpacingHeight) / rows);
    
    return {
      columns,
      rows,
      widgetWidth,
      widgetHeight,
      spacing,
      margin,
      availableHeight,
      availableWidth,
    };
  }
    // Character width multipliers (relative to font size)
    const charWidths: Record<string, number> = {
      '0-9': 0.55,     // Digits
      '.': 0.3,        // Decimal point
      '°': 0.5,        // Degree symbol
      ' ': 0.3,        // Space
      'A-Z': 0.65,     // Uppercase letters
      'a-z': 0.55,     // Lowercase letters
      '%': 0.6,        // Percent
      '/': 0.4,        // Slash
      '-': 0.4,        // Minus/hyphen
      default: 0.6,    // Other characters
    };

    let totalWidth = 0;
    for (const char of text) {
      if (/[0-9]/.test(char)) {
        totalWidth += charWidths['0-9'] * fontSize;
      } else if (/[A-Z]/.test(char)) {
        totalWidth += charWidths['A-Z'] * fontSize;
      } else if (/[a-z]/.test(char)) {
        totalWidth += charWidths['a-z'] * fontSize;
      } else if (char in charWidths) {
        totalWidth += charWidths[char as keyof typeof charWidths] * fontSize;
      } else {
        totalWidth += charWidths['default'] * fontSize;
      }
    }
    
    return Math.ceil(totalWidth);
  }

  /**
   * Get maximum formatted text samples for each widget type
   * Returns array of text samples representing maximum display width scenarios
   */
  private static getMaxFormattedSamples(widgetId: string): string[] {
    const samples: string[] = [];
    
    switch (widgetId) {
      case 'speed':
        // Speed can show: knots, km/h, mph with decimals
        samples.push('888.8 knots');     // Longest unit name
        samples.push('888.8 km/h');
        samples.push('SOG: 888.8');      // Label + value
        samples.push('COG: 888.8°');
        break;
        
      case 'depth':
        // Depth: meters, feet, fathoms with decimals
        samples.push('8888.8 m');
        samples.push('8888.8 ft');
        samples.push('888.8 fathoms');   // Longest unit
        samples.push('Depth Below Keel');
        break;
        
      case 'wind':
        // Wind: speed + direction
        samples.push('888.8 knots');
        samples.push('Direction: 888°');
        samples.push('True/App: 888°');
        break;
        
      case 'gps':
        // GPS: Coordinates with high precision
        samples.push('Lat: -88.888888°'); // 6 decimal places
        samples.push('Lon: -188.888888°'); // 3 digit longitude
        samples.push('N 88° 88.8888\'');   // DMS format
        samples.push('W 188° 88.8888\'');
        break;
        
      case 'compass':
        // Compass: heading with decimals
        samples.push('Heading: 888.8°');
        samples.push('True: 888.8°');
        samples.push('Magnetic: 888°');
        break;
        
      case 'engine':
        // Engine: RPM, temp, pressure, hours
        samples.push('RPM: 8888');
        samples.push('Temp: 888.8°C');
        samples.push('Temp: 888.8°F');
        samples.push('Pressure: 888 PSI');
        samples.push('Hours: 88888.8');
        samples.push('Alternator: 88.8V');
        break;
        
      case 'battery':
        // Battery: voltage, current, percentage
        samples.push('Voltage: 88.88V');
        samples.push('Current: -888.8A');  // Negative for discharge
        samples.push('Charge: 100.0%');
        samples.push('Capacity: 888Ah');
        break;
        
      case 'tanks':
      case 'tank':
        // Tanks: level, capacity, volume
        samples.push('FRESH WATER');      // Longest tank name
        samples.push('Level: 100.0%');
        samples.push('Volume: 888.8L');
        samples.push('Volume: 888.8 gal');
        samples.push('Capacity: 8888L');
        break;
        
      case 'temperature':
      case 'watertemp':
        // Temperature: various sources
        samples.push('Sea Temp: 88.8°C');
        samples.push('Sea Temp: 888.8°F');
        samples.push('Engine Room: 88°');
        samples.push('Refrigerator: -88°');
        break;
        
      case 'autopilot':
        // Autopilot: mode, heading, commands
        samples.push('Target: 888.8°');
        samples.push('Heading: 888.8°');
        samples.push('Mode: Auto Wind');
        samples.push('Command: +10°');
        break;
        
      case 'rudder':
        // Rudder: angle
        samples.push('Rudder: -88.8°');
        samples.push('Port/Stbd: 88°');
        break;
        
      default:
        // Generic fallback
        samples.push('Value: 8888.88');
        samples.push('Status: Active');
        break;
    }
    
    return samples;
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
   * Calculate FIXED width requirements for a widget based on formatted text measurement
   * Uses actual formatted text samples with maximum values to determine required width
   * Accounts for platform differences, font scaling, and unit system variations
   */
  static calculateFixedWidgetWidth(widgetId: string): number {
    // Get all possible text samples for this widget type
    const samples = this.getMaxFormattedSamples(widgetId);
    
    // Font sizes used in widget rendering (adjust these to match actual widget styles)
    const titleFontSize = 14;
    const valueFontSize = 24;  // Large value display
    const labelFontSize = 12;  // Small labels/units
    
    // Measure each sample with appropriate font sizes
    let maxWidth = 0;
    for (const sample of samples) {
      // Determine font size based on text characteristics
      let fontSize: number;
      if (sample.includes(':')) {
        // Label: Value format - measure value part with value font
        const parts = sample.split(':');
        const labelWidth = this.estimateTextWidth(parts[0] + ': ', labelFontSize);
        const valueWidth = this.estimateTextWidth(parts[1].trim(), valueFontSize);
        maxWidth = Math.max(maxWidth, labelWidth + valueWidth);
      } else if (/^\d+/.test(sample)) {
        // Starts with number - likely a value display
        fontSize = valueFontSize;
        maxWidth = Math.max(maxWidth, this.estimateTextWidth(sample, fontSize));
      } else {
        // Title or label text
        fontSize = titleFontSize;
        maxWidth = Math.max(maxWidth, this.estimateTextWidth(sample, fontSize));
      }
    }
    
    // Add padding: 16px left + 16px right = 32px total
    const paddingWidth = 32;
    maxWidth += paddingWidth;
    
    // Apply platform-specific adjustments
    let platformMultiplier = 1.0;
    if (Platform.OS === 'android') {
      // Android needs extra width for font rendering + accessibility scaling
      const fontScale = PixelRatio.getFontScale();
      platformMultiplier = 1.1 * fontScale; // 10% extra + font scaling
    } else if (Platform.OS === 'web') {
      platformMultiplier = 1.05; // 5% extra for web
    }
    
    maxWidth = Math.ceil(maxWidth * platformMultiplier);
    
    // Apply reasonable bounds
    const minWidth = 120;  // Minimum usable widget width
    const maxWidthLimit = 350; // Maximum to prevent excessive width
    
    return Math.max(minWidth, Math.min(maxWidth, maxWidthLimit));
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