import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { ThemeColors } from '../store/themeStore';

export interface UnifiedWidgetGridProps {
  theme: ThemeColors;
  children: React.ReactNode;
  header: React.ReactNode; // Widget header component
  widgetWidth: number; // Total widget width
  widgetHeight: number; // Total widget height
  columns: number; // Number of columns in the grid (1 or 2)
  primaryRows: number; // Always 2 for standard layout
  secondaryRows: number; // 0, 1, or 2
  columnSpans?: number[]; // Optional: How many columns each child should span
  testID?: string; // Optional test ID
}

/**
 * Unified Widget Grid Component v2.0
 *
 * Full-widget layout system with header, footer, margins, and centered grid.
 *
 * Layout Structure:
 * - Header: Scales with available space, contains widget title/icon/controls
 * - Footer: Matches header height for symmetry
 * - Horizontal Margins: 10% left + 10% right
 * - Central Grid: 80% width, extends from left to right margin
 * - Primary Section: Always 2 rows
 * - Secondary Section: 0, 1, or 2 rows (optional)
 * - Column Width: Consistent across 1-column and 2-column layouts
 *
 * Example usage:
 * <UnifiedWidgetGrid
 *   theme={theme}
 *   header={<WidgetHeader />}
 *   widgetWidth={400}
 *   widgetHeight={300}
 *   columns={2}
 *   primaryRows={2}
 *   secondaryRows={2}
 * >
 *   <Cell 1 /> <Cell 2 /> <Cell 3 /> <Cell 4 /> // Primary (2 rows)
 *   <Cell 5 /> <Cell 6 /> <Cell 7 /> <Cell 8 /> // Secondary (2 rows)
 * </UnifiedWidgetGrid>
 */
export const UnifiedWidgetGrid: React.FC<UnifiedWidgetGridProps> = ({
  theme,
  children,
  header,
  widgetWidth,
  widgetHeight,
  columns,
  primaryRows,
  secondaryRows,
  columnSpans,
  testID,
}) => {
  const childArray = React.Children.toArray(children);

  // Calculate layout dimensions
  const HORIZONTAL_MARGIN_PERCENT = 0.05; // 5% each side
  const leftMargin = widgetWidth * HORIZONTAL_MARGIN_PERCENT;
  const rightMargin = widgetWidth * HORIZONTAL_MARGIN_PERCENT;
  const centralGridWidth = widgetWidth * (1 - 2 * HORIZONTAL_MARGIN_PERCENT); // 90%

  // Header and footer heights scale with widget height
  const headerFooterHeight = Math.max(30, widgetHeight * 0.1); // 10% of height, min 30px

  // Calculate available height for grid
  const availableGridHeight = widgetHeight - (headerFooterHeight + headerFooterHeight / 3); // Footer is 1/3 header

  // Calculate gaps with minimums
  const MIN_ROW_GAP = 12;
  const MIN_COL_GAP = 16;

  const totalRows = primaryRows + secondaryRows;
  const hasSecondary = secondaryRows > 0;
  const separatorHeight = hasSecondary ? 3 : 0;
  const separatorMargin = hasSecondary ? 16 : 0; // Fixed margin around separator
  const headerMargin = 12; // Fixed margin below header

  // Row gap scales but has minimum
  const rowGap = Math.max(MIN_ROW_GAP, availableGridHeight * 0.05);

  // Calculate row heights - all rows get equal height for consistent separator positioning
  const totalRowGaps =
    (totalRows - 1) * rowGap +
    (hasSecondary ? separatorMargin * 2 + separatorHeight : 0) +
    headerMargin;
  const availableForRows = availableGridHeight - totalRowGaps;
  const rowHeight = availableForRows / totalRows;

  const primaryRowHeight = rowHeight;
  const secondaryRowHeight = rowHeight;

  // Column gap scales but has minimum
  const colGap = Math.max(MIN_COL_GAP, centralGridWidth * 0.04);

  // Calculate column width
  // For 2-column: each column is half the grid width (minus gap)
  // For 1-column: use full grid width (no gap deduction needed)
  const singleColumnWidth = columns === 2 ? (centralGridWidth - colGap) / 2 : centralGridWidth;

  // For 1-column layout, no centering padding (match 2-column behavior)
  const oneColumnCenterPadding = 0;

  if (columnSpans && columnSpans.length !== childArray.length) {
    console.warn('UnifiedWidgetGrid: columnSpans length must match children length');
  }

  // Group children into rows based on columns and spans
  const rows: { cells: React.ReactNode[]; spans: number[]; isPrimary: boolean }[] = [];
  let currentRow: React.ReactNode[] = [];
  let currentSpans: number[] = [];
  let currentColumnsUsed = 0;
  let rowCount = 0;

  childArray.forEach((child, index) => {
    const span = columnSpans?.[index] || 1;

    // If adding this cell would exceed column count, start new row
    if (currentColumnsUsed + span > columns && currentRow.length > 0) {
      rows.push({
        cells: currentRow,
        spans: currentSpans,
        isPrimary: rowCount < primaryRows,
      });
      currentRow = [];
      currentSpans = [];
      currentColumnsUsed = 0;
      rowCount++;
    }

    currentRow.push(child);
    currentSpans.push(span);
    currentColumnsUsed += span;

    // If we've filled the row exactly, start new row
    if (currentColumnsUsed === columns) {
      rows.push({
        cells: currentRow,
        spans: currentSpans,
        isPrimary: rowCount < primaryRows,
      });
      currentRow = [];
      currentSpans = [];
      currentColumnsUsed = 0;
      rowCount++;
    }
  });

  // Add any remaining cells as final row
  if (currentRow.length > 0) {
    rows.push({
      cells: currentRow,
      spans: currentSpans,
      isPrimary: rowCount < primaryRows,
    });
  }

  // Calculate cell max width for text sizing
  const calculateCellMaxWidth = (span: number): number => {
    const spanGaps = (span - 1) * colGap;
    return singleColumnWidth * span + spanGaps;
  };

  // Create wrapper for potential onPress handling
  const containerContent = (
    <View
      style={[
        styles.container,
        {
          width: widgetWidth,
          height: widgetHeight,
          backgroundColor: theme.surface,
          borderRadius: 8,
          borderWidth: 1,
          borderColor: theme.border,
        },
      ]}
    >
      <View style={[styles.header, { height: headerFooterHeight }]}>{header}</View>
      <View
        style={[
          styles.gridArea,
          {
            paddingLeft: leftMargin,
            paddingRight: rightMargin,
            paddingTop: headerMargin,
            flex: 1,
            pointerEvents: 'box-none',
          },
        ]}
      >
        <View
          style={[
            styles.centralGrid,
            columns === 1 && { paddingHorizontal: oneColumnCenterPadding },
            { pointerEvents: 'box-none' },
          ]}
        >
          {rows.map((row, rowIndex) => {
            const isPrimaryEnd = rowIndex === primaryRows - 1 && hasSecondary;

            return (
              <React.Fragment key={`row-${rowIndex}`}>
                <View
                  style={[
                    styles.row,
                    {
                      height: row.isPrimary ? primaryRowHeight : secondaryRowHeight,
                      gap: colGap,
                      pointerEvents: 'box-none',
                    },
                  ]}
                >
                  {row.cells.map((cell, cellIndex) => {
                    const span = row.spans[cellIndex];
                    const cellMaxWidth = calculateCellMaxWidth(span);
                    const cellHeight = row.isPrimary ? primaryRowHeight : secondaryRowHeight;

                    // Clone child and inject maxWidth and cellHeight props
                    const enhancedCell = React.isValidElement(cell)
                      ? React.cloneElement(cell as React.ReactElement<any>, {
                          maxWidth: cellMaxWidth,
                          cellHeight: cellHeight,
                        })
                      : cell;

                    return (
                      <View
                        key={`cell-${rowIndex}-${cellIndex}`}
                        style={[styles.cell, { width: cellMaxWidth, pointerEvents: 'box-none' }]}
                      >
                        {React.isValidElement(enhancedCell) ||
                        enhancedCell === null ||
                        enhancedCell === undefined
                          ? enhancedCell
                          : null}
                      </View>
                    );
                  })}
                </View>
                {isPrimaryEnd && (
                  <View style={{ marginVertical: separatorMargin, width: '100%' }}>
                    <View
                      style={[
                        styles.separator,
                        {
                          backgroundColor: theme.text,
                          height: separatorHeight,
                          opacity: 0.3,
                        },
                      ]}
                    />
                  </View>
                )}
                {rowIndex < rows.length - 1 && !isPrimaryEnd ? <View style={{ height: rowGap }} /> : null}
              </React.Fragment>
            );
          })}
        </View>
      </View>
      <View style={[styles.footer, { height: headerFooterHeight / 3 }]} />
    </View>
  );

  return containerContent;
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'transparent',
    borderWidth: 0,
    borderColor: 'transparent',
  },
  header: {
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 0,
    borderColor: 'transparent',
  },
  footer: {
    width: '100%',
    borderWidth: 0,
    borderColor: 'transparent',
  },
  gridArea: {
    width: '100%',
    borderWidth: 0,
    borderColor: 'transparent',
  },
  centralGrid: {
    width: '100%',
    alignItems: 'center',
    borderWidth: 0,
    borderColor: 'transparent',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'stretch',
    width: '100%',
    borderWidth: 0,
    borderColor: 'transparent',
  },
  cell: {
    justifyContent: 'center',
    alignItems: 'flex-end',
    height: '100%',
    borderWidth: 0,
    borderColor: 'transparent',
  },
  separator: {
    height: 2,
    width: '100%',
    opacity: 1,
  },
});
