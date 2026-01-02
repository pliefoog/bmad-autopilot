/**
 * TemplatedWidget - Registry-First Declarative Widget Renderer
 * 
 * Renders widgets using grid templates and auto-fetch metric cells.
 * Eliminates 200+ lines of boilerplate from each widget by providing:
 * - Grid template lookup and rendering
 * - SensorContext provision to all cells
 * - Cell count validation
 * - Error boundary for graceful failures
 * 
 * **Registry-First Architecture:**
 * Widgets are now pure configuration - just specify template + metric keys.
 * All layout, data fetching, and display logic handled here.
 * 
 * **For AI Agents:**
 * This is the foundation of declarative widgets. Widgets become simple
 * configuration with template name and list of metric keys.
 */

import React, { ReactElement } from 'react';
import { View, StyleSheet } from 'react-native';
import { SensorContext } from '../contexts/SensorContext';
import { useWidgetVisibilityOptional } from '../contexts/WidgetVisibilityContext';
import type { SensorInstance } from '../types/SensorInstance';
import type { SensorType } from '../types/SensorData';
import { log } from '../utils/logging/logger';
import {
  getGridTemplate,
  validateTemplateCellCount,
  type GridSection,
} from '../registry/GridTemplateRegistry';
import { useTheme } from '../store/themeStore';
import WidgetHeader from './molecules/WidgetHeader';
import WidgetFooter from './molecules/WidgetFooter';
import { WIDGET_METADATA_REGISTRY } from '../registry/WidgetMetadataRegistry';

// Debug border width constants (used in styles and calculations)
const DEBUG_WRAPPER_BORDER = 3;
const DEBUG_GRID_BORDER = 2;
const DEBUG_CELL_BORDER = 2;
const NORMAL_WRAPPER_BORDER = 1;

/**
 * Additional sensor configuration for multi-sensor widgets
 */
interface AdditionalSensor {
  /** Sensor type identifier (gps, speed, etc.) */
  sensorType: SensorType;
  
  /** Explicit instance number to use */
  instance: number;
}

/**
 * TemplatedWidget Props
 */
interface TemplatedWidgetProps {
  /** Grid template name (e.g., "2Rx2C-SEP-2Rx2C") */
  template: string;

  /** Primary sensor instance with live data */
  sensorInstance: SensorInstance | null | undefined;

  /** Primary sensor type identifier (battery, engine, etc.) */
  sensorType: SensorType;

  /** Widget ID for header lookup (optional, defaults to sensorType) */
  widgetId?: string;

  /** Debug mode - shows colored borders on all grid elements */
  debugLayout?: boolean;

  /** Metric cells to render (PrimaryMetricCell, SecondaryMetricCell) */
  children: ReactElement | ReactElement[];

  /**
   * Additional sensors for multi-sensor widgets (e.g., SpeedWidget needs both speed + gps)
   * 
   * TODO: Implement master instance selection mechanism
   * Currently requires explicit instance numbers. Future enhancement:
   * - Add sensor priority/master designation in settingsStore
   * - Allow marking one GPS/speed sensor as "primary" in settings
   * - Auto-resolve "master" instance instead of hardcoding instance numbers
   * - Example: additionalSensors: [{ sensorType: 'gps', useMaster: true }]
   */
  additionalSensors?: AdditionalSensor[];

  /** Optional container styling */
  style?: any;

  /** Optional testID for testing */
  testID?: string;
}

/**
 * TemplatedWidget Component
 * 
 * Renders a widget using a grid template and auto-fetch metric cells.
 */
export const TemplatedWidget: React.FC<TemplatedWidgetProps> = ({
  template: templateName,
  sensorInstance,
  sensorType,
  widgetId,
  debugLayout = false,
  additionalSensors,
  children,
  style,
  testID,
}) => {
  const theme = useTheme();

  // Measure widget dimensions using onLayout
  const [widgetDimensions, setWidgetDimensions] = React.useState({ width: 0, height: 0 });
  
  const handleWidgetLayout = (event: any) => {
    const { width, height } = event.nativeEvent.layout;
    if (width !== widgetDimensions.width || height !== widgetDimensions.height) {
      setWidgetDimensions({ width, height });
    }
  };

  // Get widget metadata for header
  const widgetMetadata = WIDGET_METADATA_REGISTRY[widgetId ?? sensorType];
  const instanceNumber = sensorInstance?.instance ?? 0;
  
  // Get sensor name from metrics (user-defined or default "sensorType-instance")
  const sensorName = React.useMemo(() => {
    if (!sensorInstance) return undefined;
    const nameMetric = sensorInstance.getMetric('name');
    return nameMetric?.formattedValue;
  }, [sensorInstance]);
  
  // Build header title: "Battery - House Bank" or "Battery 2 - battery-1"
  const baseTitle = widgetMetadata?.type === 'multi' && instanceNumber > 0
    ? `${widgetMetadata.title} ${instanceNumber + 1}`
    : widgetMetadata?.title ?? sensorType.toUpperCase();
  
  const headerTitle = sensorName ? `${baseTitle} - ${sensorName}` : baseTitle;

  // Normalize children to array
  const childArray = React.Children.toArray(children) as ReactElement[];

  // Get grid template
  const template = getGridTemplate(templateName);

  // Validate cell count matches template
  validateTemplateCellCount(templateName, childArray.length);

  // Build additional sensors map for multi-sensor widgets
  const additionalSensorsMap = React.useMemo(() => {
    if (!additionalSensors || additionalSensors.length === 0) {
      return undefined;
    }
    
    const map = new Map<SensorType, SensorInstance | null | undefined>();
    
    // Import useNmeaStore dynamically to avoid circular dependencies
    const { useNmeaStore } = require('../store/nmeaStore');
    const nmeaState = useNmeaStore.getState();
    
    additionalSensors.forEach(({ sensorType: addlSensorType, instance }) => {
      const addlInstance = nmeaState.nmeaData.sensors[addlSensorType]?.[instance];
      map.set(addlSensorType, addlInstance);
    });
    
    return map;
  }, [additionalSensors]);

  // Calculate cell distribution
  const primaryCellCount = template.primaryGrid.rows * template.primaryGrid.columns;
  const secondaryCellCount = template.secondaryGrid
    ? template.secondaryGrid.rows * template.secondaryGrid.columns
    : 0;

  // Split children into primary and secondary sections
  const primaryChildren = childArray.slice(0, primaryCellCount);
  const secondaryChildren = childArray.slice(primaryCellCount);

  // Calculate row dimensions (like UnifiedWidgetGrid did)
  const headerFooterHeight = Math.max(30, widgetDimensions.height * 0.10);
  const footerHeight = headerFooterHeight / 3;
  const gridPadding = 12;
  const separatorHeight = template.showSeparator && template.secondaryGrid ? 1 : 0;
  const separatorMargin = template.showSeparator && template.secondaryGrid ? 24 : 0; // 12px top + 12px bottom
  
  const availableGridHeight = widgetDimensions.height - headerFooterHeight - footerHeight - (gridPadding * 2) - separatorHeight - separatorMargin;
  
  // Total rows across both sections
  const totalRows = template.primaryGrid.rows + (template.secondaryGrid?.rows || 0);
  const rowGap = 8;
  const sectionGap = (template.secondaryGrid && template.primaryGrid.rows > 0) ? 8 : 0;
  const totalRowGaps = ((totalRows - 1) * rowGap) + sectionGap;
  
  // Calculate row height - all rows get equal height
  const rowHeight = totalRows > 0 ? (availableGridHeight - totalRowGaps) / totalRows : 60;

  // Calculate available width for grid (subtract wrapper borders)
  // widgetDimensions.width includes wrapper borders (box-sizing: border-box)
  const wrapperBorderWidth = debugLayout ? DEBUG_WRAPPER_BORDER : NORMAL_WRAPPER_BORDER;
  const availableWidgetWidth = widgetDimensions.width - (wrapperBorderWidth * 2);

  // Create styles
  const styles = createStyles(theme, debugLayout);

  return (
    <SensorContext.Provider 
      value={{ 
        sensorInstance, 
        sensorType,
        additionalSensors: additionalSensorsMap,
      }}
    >
      <View 
        style={[styles.wrapper, style]} 
        testID={testID || `widget-${sensorType}`}
        onLayout={handleWidgetLayout}
      >
        {/* Widget Header - Full Width */}
        {widgetMetadata && (
          <WidgetHeader
            title={headerTitle}
            iconName={widgetMetadata.icon}
            testID={testID ? `${testID}-header` : undefined}
          />
        )}

        {/* Grid Content - Padded */}
        <View style={styles.gridContainer}>
          {/* Primary Grid */}
          <GridSectionRenderer
            section={template.primaryGrid}
            children={primaryChildren}
            rowHeight={rowHeight}
            widgetWidth={availableWidgetWidth}
            debugLayout={debugLayout}
            testID="primary-section"
          />

          {/* Separator (if template has secondary grid) */}
          {template.showSeparator && template.secondaryGrid ? (
            <View style={styles.separator} />
          ) : null}

          {/* Secondary Grid */}
          {template.secondaryGrid && (
            <GridSectionRenderer
              section={template.secondaryGrid}
              children={secondaryChildren}
              rowHeight={rowHeight}
              widgetWidth={availableWidgetWidth}
              debugLayout={debugLayout}
              testID="secondary-section"
            />
          )}
        </View>

        {/* Widget Footer - Visual spacing for balance */}
        <WidgetFooter testID={testID ? `${testID}-footer` : undefined} />
      </View>
    </SensorContext.Provider>
  );
};

/**
 * GridSectionRenderer Props
 */
interface GridSectionRendererProps {
  section: GridSection;
  children: ReactElement[];
  rowHeight: number;
  widgetWidth: number;
  debugLayout?: boolean;
  testID?: string;
}

/**
 * GridSectionRenderer - Renders a grid section (primary or secondary)
 * 
 * Creates the grid layout and injects spatial props (maxWidth, cellHeight)
 * into each cell for responsive sizing.
 */
const GridSectionRenderer: React.FC<GridSectionRendererProps> = ({
  section,
  children,
  rowHeight,
  widgetWidth,
  debugLayout = false,
  testID,
}) => {
  const theme = useTheme();
  const styles = createStyles(theme, debugLayout);

  // Calculate cell width
  // Note: gridContainer already has padding: 12, so available width is reduced by 24px
  const { rows, columns } = section;
  const GRID_PADDING = 12; // Must match gridContainer padding in styles
  
  // Account for debug borders if enabled (React Native uses box-sizing: border-box)
  const gridBorderWidth = debugLayout ? DEBUG_GRID_BORDER : 0;
  const cellBorderWidth = debugLayout ? DEBUG_CELL_BORDER : 0;
  
  let availableWidth = widgetWidth - (GRID_PADDING * 2) - (gridBorderWidth * 2); // Width inside gridContainer minus grid borders
  
  const colGap = 8;
  
  // Calculate width for each cell (border-box: borders are included)
  const cellWidth = columns === 1 
    ? availableWidth  // Single column takes full width (borders included)
    : (availableWidth - colGap) / 2;  // Two columns share width minus gap
  
  // Child component receives content width (accounting for cell borders)
  const contentWidth = cellWidth - (cellBorderWidth * 2);

  // Create row groups
  const { cellSpans } = section;
  const rowGroups: ReactElement[][] = [];
  for (let row = 0; row < rows; row++) {
    const rowCells: ReactElement[] = [];
    for (let col = 0; col < columns; col++) {
      const cellIndex = row * columns + col;
      if (cellIndex < children.length) {
        const cell = children[cellIndex];
        
        // Check if this cell should span full width
        const shouldSpan = cellSpans?.includes(cellIndex) ?? false;
        
        // Clone element and inject dimensions
        // Child fills wrapper's content area (cellWidth is already the content area)
        const enhancedCell = React.cloneElement(cell as ReactElement<any>, {
          cellWidth: contentWidth,
          cellHeight: rowHeight,
        });
        
        // Wrap cell in container View for proper constraint
        const isSingleColumn = columns === 1;
        const cellWithContainer = (
          <View 
            key={`cell-${cellIndex}`}
            style={[
              styles.cell,
              { height: rowHeight, width: cellWidth },
              isSingleColumn && styles.cellFullWidth,
              shouldSpan && styles.cellSpan,
            ]}
          >
            {enhancedCell}
          </View>
        );
        
        rowCells.push(cellWithContainer);
      }
    }
    rowGroups.push(rowCells);
  }

  return (
    <View style={styles.section} testID={testID}>
      {rowGroups.map((rowCells, rowIndex) => (
        <View key={`row-${rowIndex}`} style={[styles.row, { height: rowHeight }]}>
          {rowCells}
        </View>
      ))}
    </View>
  );
};

/**
 * Styles
 */
const createStyles = (theme: any, debugLayout: boolean = false) =>
  StyleSheet.create({
    wrapper: {
      flex: 1,
      flexDirection: 'column',
      backgroundColor: theme.widgetBackground,
      borderRadius: 8,
      borderWidth: debugLayout ? DEBUG_WRAPPER_BORDER : NORMAL_WRAPPER_BORDER,
      borderColor: debugLayout ? '#FF0000' : theme.border,
      overflow: 'hidden',
    },
    gridContainer: {
      flexGrow: 1,
      flexShrink: 1,
      padding: 12,
      ...(debugLayout && { borderWidth: DEBUG_GRID_BORDER, borderColor: '#00FF00' }),
    },
    section: {
      flexDirection: 'column',
      gap: 8,
      ...(debugLayout && { borderWidth: 2, borderColor: '#0000FF' }),
    },
    row: {
      // Height set explicitly by GridSectionRenderer based on calculated rowHeight
      flexDirection: 'row',
      gap: 8,
      alignSelf: 'stretch',
      ...(debugLayout && { borderWidth: 2, borderColor: '#FFFF00' }),
    },
    cell: {
      flex: 1,
      minWidth: 0,
      ...(debugLayout && { borderWidth: DEBUG_CELL_BORDER, borderColor: '#FF00FF' }),
    },
    cellFullWidth: {
      width: '100%',
      alignSelf: 'stretch',
      ...(debugLayout && { borderWidth: 2, borderColor: '#00FFFF' }),
    },
    cellSpan: {
      flexGrow: 999, // Span full width by having much larger flex value
    },
    separator: {
      height: 1,
      backgroundColor: theme.border,
      marginVertical: 12,
    },
  });

export default TemplatedWidget;
