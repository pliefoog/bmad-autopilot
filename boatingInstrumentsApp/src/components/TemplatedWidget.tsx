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
import type { SensorInstance } from '../types/SensorInstance';
import type { SensorType } from '../types/SensorData';
import {
  getGridTemplate,
  validateTemplateCellCount,
  type GridSection,
} from '../registry/GridTemplateRegistry';
import { useTheme } from '../store/themeStore';

/**
 * TemplatedWidget Props
 */
interface TemplatedWidgetProps {
  /** Grid template name (e.g., "2Rx2C-SEP-2Rx2C") */
  template: string;

  /** Sensor instance with live data */
  sensorInstance: SensorInstance | null | undefined;

  /** Sensor type identifier (battery, engine, etc.) */
  sensorType: SensorType;

  /** Metric cells to render (PrimaryMetricCell, SecondaryMetricCell) */
  children: ReactElement | ReactElement[];

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
  children,
  style,
  testID,
}) => {
  const theme = useTheme();

  // Normalize children to array
  const childArray = React.Children.toArray(children) as ReactElement[];

  // Get grid template
  const template = getGridTemplate(templateName);

  // Validate cell count matches template
  validateTemplateCellCount(templateName, childArray.length);

  // Calculate cell distribution
  const primaryCellCount = template.primaryGrid.rows * template.primaryGrid.columns;
  const secondaryCellCount = template.secondaryGrid
    ? template.secondaryGrid.rows * template.secondaryGrid.columns
    : 0;

  // Split children into primary and secondary sections
  const primaryChildren = childArray.slice(0, primaryCellCount);
  const secondaryChildren = childArray.slice(primaryCellCount);

  // Create styles
  const styles = createStyles(theme);

  return (
    <SensorContext.Provider value={{ sensorInstance, sensorType }}>
      <View style={[styles.container, style]} testID={testID || `widget-${sensorType}`}>
        {/* Primary Grid */}
        <GridSectionRenderer
          section={template.primaryGrid}
          children={primaryChildren}
          testID="primary-section"
        />

        {/* Separator (if template has secondary grid) */}
        {template.showSeparator && template.secondaryGrid && (
          <View style={styles.separator} />
        )}

        {/* Secondary Grid */}
        {template.secondaryGrid && (
          <GridSectionRenderer
            section={template.secondaryGrid}
            children={secondaryChildren}
            testID="secondary-section"
          />
        )}
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
  testID,
}) => {
  const theme = useTheme();
  const styles = createStyles(theme);

  // Calculate grid dimensions
  const { rows, columns, cellSpans } = section;

  // Create row groups
  const rowGroups: ReactElement[][] = [];
  for (let row = 0; row < rows; row++) {
    const rowCells: ReactElement[] = [];
    for (let col = 0; col < columns; col++) {
      const cellIndex = row * columns + col;
      if (cellIndex < children.length) {
        const cell = children[cellIndex];
        
        // Check if this cell should span full width
        const shouldSpan = cellSpans?.includes(cellIndex) ?? false;
        
        // Clone cell with spatial props injected
        const cellWithProps = React.cloneElement(cell, {
          // Inject cell width constraint for dynamic sizing
          maxWidth: shouldSpan ? undefined : `${100 / columns}%`,
          // Note: cellHeight can be added if needed for vertical scaling
          key: `cell-${cellIndex}`,
        } as any);
        
        rowCells.push(cellWithProps);
      }
    }
    rowGroups.push(rowCells);
  }

  return (
    <View style={styles.section} testID={testID}>
      {rowGroups.map((rowCells, rowIndex) => (
        <View key={`row-${rowIndex}`} style={styles.row}>
          {rowCells}
        </View>
      ))}
    </View>
  );
};

/**
 * Styles
 */
const createStyles = (theme: any) =>
  StyleSheet.create({
    container: {
      flex: 1,
      flexDirection: 'column',
      backgroundColor: theme.widgetBackground,
      borderRadius: 8,
      padding: 12,
    },
    section: {
      flexDirection: 'column',
      gap: 8,
    },
    row: {
      flexDirection: 'row',
      gap: 8,
      minHeight: 60, // Minimum row height for readability
    },
    separator: {
      height: 1,
      backgroundColor: theme.border,
      marginVertical: 12,
    },
  });

export default TemplatedWidget;
