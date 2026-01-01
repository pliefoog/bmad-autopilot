import React, { useMemo } from 'react';
import { View, Text } from 'react-native';
import Svg, { Polyline, Line, Text as SvgText } from 'react-native-svg';
import { useTheme } from '../store/themeStore';
import { useNmeaStore } from '../store/nmeaStore';
import { SensorType } from '../types/SensorData';
import { useCategoryPresentation } from '../presentation/useCategoryPresentation';
import { useAlarmThresholds } from '../hooks/useAlarmThresholds';
import { useSensorContext } from '../contexts/SensorContext';
import { ConversionRegistry } from '../utils/ConversionRegistry';
import { log } from '../utils/logging/logger';

// Default dimensions for TrendLine (baseline for responsive scaling)
const DEFAULT_TRENDLINE_WIDTH = 300;
const DEFAULT_TRENDLINE_HEIGHT = 60;

export interface DataPoint {
  value: number;
  timestamp: number;
}

export interface TrendLineProps {
  // Auto-fetch pattern via SensorContext (REQUIRED)
  metricKey: string; // The metric field name (e.g., 'pressure', 'airTemperature', 'depth')
  // Auto-fetches sensor/instance from SensorContext provided by TemplatedWidget

  timeWindowMs: number;

  // Dimensions (injected by TemplatedWidget/UnifiedWidgetGrid)
  cellWidth?: number;
  cellHeight?: number;

  // Axis configuration
  showXAxis?: boolean;
  showYAxis?: boolean;
  xAxisPosition?: 'top' | 'bottom'; // X-axis at top for depth charts
  yAxisDirection?: 'up' | 'down'; // Y-axis pointing down for depth

  // Time scale configuration
  timeWindowMinutes?: number; // 1, 5, 10, 15, 30, 60 minutes
  showTimeLabels?: boolean;

  // Value range configuration
  minValue?: number; // Force minimum value
  maxValue?: number; // Force maximum value
  forceZero?: boolean; // Force axis to include zero (useful for depth charts)

  // Threshold configuration (DEPRECATED - thresholds now auto-subscribed from alarm config)
  // NOTE: These props are ignored. Thresholds are now derived from CriticalAlarmConfiguration
  // and automatically converted to display units using the presentation system.
  usePrimaryLine?: boolean; // Use primary trendline color (default) vs secondary

  // Styling
  strokeWidth?: number;
  showGrid?: boolean;
  fontSize?: number;

  // Data point markers
  showDataPoints?: boolean;
  dataPointRadius?: number;
}

/**
 * TrendLine Component
 *
 * A configurable trend line chart with axis support for displaying time-series data.
 * MUST be used within TemplatedWidget (or other SensorContext provider).
 *
 * **Usage Pattern:**
 *    ```tsx
 *    <TrendLine metricKey="pressure" timeWindowMs={300000} showXAxis showYAxis />
 *    ```
 *    Automatically gets sensor/instance from SensorContext
 *
 * Features:
 * - Configurable X/Y axes with top/bottom and up/down orientations
 * - Time-based X-axis with configurable windows (1-60 minutes)
 * - Inverted Y-axis for depth charts (values increase downward)
 * - Optional grid lines
 * - Auto-scaling or fixed value ranges
 * - Responsive sizing
 */
export const TrendLine: React.FC<TrendLineProps> = ({
  metricKey,
  timeWindowMs,
  cellWidth,
  cellHeight,
  showXAxis = false,
  showYAxis = false,
  xAxisPosition = 'bottom',
  yAxisDirection = 'up',
  timeWindowMinutes = 5,
  showTimeLabels = false,
  minValue,
  maxValue,
  forceZero = false,
  usePrimaryLine = true,
  strokeWidth = 2,
  showGrid = false,
  fontSize = 9,
  showDataPoints = false,
  dataPointRadius = 3,
}) => {
  // Auto-fetch from SensorContext (provided by TemplatedWidget)
  const context = useSensorContext();

  // Get theme colors directly from store (MUST be called before any returns)
  const theme = useTheme();

  // Extract sensor/instance from context
  const sensor = context?.sensorType;
  const instance = context?.sensorInstance?.instance ?? 0;
  const metric = metricKey;

  // Get metric mnemonic from field config for label display
  const fieldConfig = useMemo(() => {
    if (!sensor || !metric) return null;
    try {
      const { getSensorField } = require('../registry/SensorConfigRegistry');
      return getSensorField(sensor, metric);
    } catch (error) {
      return null;
    }
  }, [sensor, metric]);

  const mnemonic = fieldConfig?.mnemonic ?? metric?.toUpperCase().slice(0, 5) ?? 'N/A';

  // Get current unit from MetricValue to display in label (like MetricCell)
  const currentMetric = context?.sensorInstance?.getMetric(metric);
  const unit = currentMetric?.unit ?? '';
  // Sanitize unit - ensure it's not just whitespace or a single period
  const sanitizedUnit = unit.trim();
  // Explicit boolean check to avoid text node leaks (per Critical React Native Rules)
  const hasUnit = sanitizedUnit !== '' && sanitizedUnit !== '.';

  // Use explicit dimensions provided by TemplatedWidget
  const width = cellWidth || DEFAULT_TRENDLINE_WIDTH;
  const height = cellHeight || DEFAULT_TRENDLINE_HEIGHT;

  // Calculate responsive scaling factors for all visual elements (needed for error states)
  const scaledDimensions: {
    gridStroke: number;
    axisStroke: number;
    warningStroke: number;
    alarmStroke: number;
    trendlineStroke: number;
    pointRadius: number;
    mnemonicFontSize: number;
    labelFontSize: number;
    errorFontSize: number;
    paddingLeft: number;
    paddingRight: number;
    paddingTop: number;
    paddingBottom: number;
    yLabelOffset: number;
    yLabelAdjust: number;
    xLabelTopOffset: number;
    xLabelBottomOffset: number;
    dashLength: number;
    gapLength: number;
    dashShort: number;
    gapLong: number;
  } = useMemo(() => {
    const BASE_WIDTH = DEFAULT_TRENDLINE_WIDTH;
    const BASE_HEIGHT = DEFAULT_TRENDLINE_HEIGHT;
    const BASE_AREA = BASE_WIDTH * BASE_HEIGHT;

    const widthScaleFactor = width / BASE_WIDTH;
    const heightScaleFactor = height / BASE_HEIGHT;
    const actualArea = width * height;
    const areaScale = Math.sqrt(actualArea / BASE_AREA);
    const paddingScale = Math.min(widthScaleFactor, heightScaleFactor);

    return {
      // Stroke widths (area-based for proportional visual weight)
      gridStroke: Math.max(0.5, 0.5 * areaScale),
      axisStroke: Math.max(0.5, 1 * areaScale),
      warningStroke: Math.max(0.5, 1.5 * areaScale),
      alarmStroke: Math.max(1, 2 * areaScale),
      trendlineStroke: Math.max(1, (strokeWidth || 2) * areaScale),

      // Radius (area-based)
      pointRadius: Math.max(2, (dataPointRadius || 3) * areaScale),

      // Font sizes (height-based for readability)
      // Match MetricCell sizing: base 12pt for mnemonic, 9pt for Y-axis values
      // Round to avoid sub-pixel rendering differences
      mnemonicFontSize: Math.max(8, Math.round(12 * heightScaleFactor)),
      labelFontSize: Math.max(6, Math.round(9 * heightScaleFactor)),
      errorFontSize: Math.max(6, 10 * heightScaleFactor),

      // Padding (conservative scaling prevents cramping)
      // Minimal left padding since Y-axis labels now render inside graph
      paddingLeft: showYAxis
        ? Math.max(2, 2 * paddingScale)
        : Math.max(2, 5 * paddingScale),
      paddingRight: Math.max(4, 6 * paddingScale), // Minimal right padding
      paddingTop: xAxisPosition === 'top'
        ? Math.max(2, 2 * paddingScale)
        : Math.max(2, 5 * paddingScale),
      paddingBottom: xAxisPosition === 'bottom'
        ? Math.max(2, 2 * paddingScale)
        : Math.max(2, 5 * paddingScale),

      // Label offsets
      yLabelOffset: Math.max(2, 5 * widthScaleFactor),
      yLabelAdjust: Math.max(1, 3 * heightScaleFactor),
      xLabelTopOffset: Math.max(2, 5 * heightScaleFactor),
      xLabelBottomOffset: Math.max(6, 14 * heightScaleFactor),

      // Dash patterns (width-based for temporal consistency)
      dashLength: Math.max(2, Math.round(4 * widthScaleFactor)),
      gapLength: Math.max(2, Math.round(4 * widthScaleFactor)),
      dashShort: Math.max(1, Math.round(2 * widthScaleFactor)),
      gapLong: Math.max(3, Math.round(6 * widthScaleFactor)),
    };
  }, [width, height, strokeWidth, dataPointRadius, fontSize, showYAxis, xAxisPosition]);

  // Get presentation system for this sensor (for unit conversion)
  // MUST be called unconditionally to satisfy React hooks rules
  const presentation = useCategoryPresentation(sensor);

  // Subscribe to sensor-instance alarm thresholds
  // MUST be called unconditionally to satisfy React hooks rules
  const alarmThresholds = useAlarmThresholds(sensor, instance);

  // Convert thresholds to display units if enabled
  const convertedWarningThreshold = useMemo(() => {
    if (!alarmThresholds.enabled || alarmThresholds.warning === undefined) {
      return undefined;
    }
    return presentation.isValid
      ? presentation.convert(alarmThresholds.warning)
      : alarmThresholds.warning;
  }, [alarmThresholds.enabled, alarmThresholds.warning, presentation]);

  const convertedAlarmThreshold = useMemo(() => {
    if (!alarmThresholds.enabled) {
      return undefined;
    }
    const criticalValue =
      alarmThresholds.thresholdType === 'min' ? alarmThresholds.min : alarmThresholds.max;
    if (criticalValue === undefined) {
      return undefined;
    }
    return presentation.isValid ? presentation.convert(criticalValue) : criticalValue;
  }, [
    alarmThresholds.enabled,
    alarmThresholds.min,
    alarmThresholds.max,
    alarmThresholds.thresholdType,
    presentation,
  ]);

  const thresholdType = alarmThresholds.thresholdType;

  // Subscribe to sensor timestamp to trigger updates when new data arrives
  const sensorTimestamp = useNmeaStore(
    (state) => {
      if (!sensor) return undefined;
      return state.nmeaData.sensors[sensor as import('../types/SensorData').SensorType]?.[instance]?.timestamp;
    }
  );

  // Get stable reference to getSensorHistory (won't change between renders)
  const getSensorHistory = useNmeaStore((state) => state.getSensorHistory);

  // Fetch history when sensor updates (memoized to prevent infinite loops)
  // Note: Use getSensorHistory which internally uses TimeSeriesBuffer.getInWindow()
  // for efficient windowed queries (optimized in Phase 4)
  const trendData = useMemo(() => {
    if (!sensor || instance === undefined || !metric) return [];
    const data = getSensorHistory(sensor, instance, metric, { timeWindowMs });

    // Conditional DEBUG logging for TrendLine history fetch
    log.uiTrendline('TrendLine history fetch', () => ({
      sensor: `${sensor}.${instance}.${metric}`,
      dataPoints: data.length,
      timeWindow: timeWindowMs,
      instanceFromContext: context?.sensorInstance?.instance,
      sensorTimestamp,
      firstPoint: data[0],
      lastPoint: data[data.length - 1],
      // For pressure debugging: show first 3 values
      sampleValues: data.slice(0, 3).map(p => p.value),
    }));

    return data;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sensor, instance, metric, timeWindowMs, sensorTimestamp]);

  // Get display-value stats from sensor instance (pre-computed min/max/avg in user's units)
  // This replaces manual min/max calculation from history data
  const displayStats = useMemo(() => {
    if (!context?.sensorInstance || !metric) return undefined;
    return context.sensorInstance.getDisplayValueStats(metric);
  }, [context?.sensorInstance, metric, sensorTimestamp]);

  // Derive all colors from theme
  const trendlineColor = usePrimaryLine ? theme.trendline.primary : theme.trendline.secondary;
  const warningColor = theme.trendline.thresholdWarning;
  // Use correct threshold color based on alarm configuration (max for overheat/overspeed, min for shallow water/low battery)
  const alarmColor =
    thresholdType === 'max' ? theme.trendline.thresholdMax : theme.trendline.thresholdMin;
  const normalColor = trendlineColor;
  const axisColor = theme.trendline.axis;
  const labelColor = theme.trendline.label;
  const gridColor = theme.trendline.grid;

  // Calculate axis dimensions using responsive padding
  const PADDING_LEFT = scaledDimensions.paddingLeft;
  const PADDING_RIGHT = scaledDimensions.paddingRight;
  const PADDING_TOP = scaledDimensions.paddingTop;
  const PADDING_BOTTOM = scaledDimensions.paddingBottom;

  const chartWidth = width - PADDING_LEFT - PADDING_RIGHT;
  const chartHeight = height - PADDING_TOP - PADDING_BOTTOM;
  const AXIS_MARGIN = PADDING_LEFT; // Left margin for Y-axis labels

  // Calculate data range and scaling (MUST be called unconditionally)
  const { dataMin, dataMax, range, pointsData, yLabels, thresholdPositions } = useMemo(() => {
    if (trendData.length < 2) {
      return {
        dataMin: 0,
        dataMax: 0,
        range: 1,
        pointsData: [] as { x: number; y: number; value: number; color: string }[],
        yLabels: [] as string[],
        thresholdPositions: { warning: undefined, alarm: undefined } as {
          warning?: number;
          alarm?: number;
        },
      };
    }

    // Data is already filtered by getInWindow() in Phase 4 optimization
    // No need to filter again - getSensorHistory uses TimeSeriesBuffer.getInWindow()
    const filteredData = trendData;

    if (filteredData.length < 2) {
      return {
        dataMin: 0,
        dataMax: 0,
        range: 1,
        pointsData: [] as { x: number; y: number; value: number; color: string }[],
        yLabels: [] as string[],
        thresholdPositions: { warning: undefined, alarm: undefined } as {
          warning?: number;
          alarm?: number;
        },
      };
    }

    // Calculate time window for X-axis positioning
    const now = Date.now();
    const timeWindowMs = timeWindowMinutes * 60 * 1000;

    // Use pre-computed stats from sensor instance instead of calculating from history
    // This ensures consistency with MetricCells and eliminates duplicate logic
    let dataMin: number;
    let dataMax: number;

    if (displayStats && displayStats.min !== undefined && displayStats.max !== undefined) {
      // Use pre-computed stats (preferred - consistent with MetricCells)
      dataMin = minValue !== undefined ? minValue : displayStats.min;
      dataMax = maxValue !== undefined ? maxValue : displayStats.max;

      log.uiTrendline('Using pre-computed stats for Y-axis', () => ({
        metric: `${sensor}.${metric}`,
        statsMin: displayStats.min,
        statsMax: displayStats.max,
        dataMin,
        dataMax,
        unit: displayStats.unit,
      }));
    } else {
      // Fallback: calculate from visible data (if stats not available)
      const values = filteredData.map((p) => p.value as number);
      dataMin = minValue !== undefined ? minValue : Math.min(...values);
      dataMax = maxValue !== undefined ? maxValue : Math.max(...values);

      log.uiTrendline('Fallback Y-axis calculation (no pre-computed stats)', () => ({
        metric: `${sensor}.${metric}`,
        valueCount: values.length,
        dataMin,
        dataMax,
      }));
    }

    // Force zero into the range if requested (BEFORE calculating thresholds)
    if (forceZero) {
      if (dataMin > 0) dataMin = 0;
      if (dataMax < 0) dataMax = 0;
    }

    const range = dataMax - dataMin || 1;

    // Generate Y-axis labels (min and max only) using proper category formatting
    // CRITICAL: Use ConversionRegistry to respect category's decimal precision
    // (e.g., atmospheric_pressure has 0 decimals, temperature has 1 decimal)
    // Get unitType from field config (single source of truth)
    let unitType;
    try {
      const { getSensorField } = require('../registry/SensorConfigRegistry');
      const fieldConfig = sensor && metric ? getSensorField(sensor, metric) : null;
      unitType = fieldConfig?.unitType;
    } catch (error) {
      unitType = undefined;
    }

    const yLabels: string[] = unitType
      ? [
        ConversionRegistry.format(dataMin, unitType, false), // false = no unit
        ConversionRegistry.format(dataMax, unitType, false),
      ]
      : [dataMin.toFixed(1), dataMax.toFixed(1)]; // Fallback if no unitType

    // Calculate threshold Y positions
    const calculateThresholdY = (thresholdValue: number): number => {
      let y: number;
      if (yAxisDirection === 'down') {
        y = ((thresholdValue - dataMin) / range) * chartHeight;
      } else {
        y = chartHeight - ((thresholdValue - dataMin) / range) * chartHeight;
      }
      if (xAxisPosition === 'top') {
        y += PADDING_TOP;
      }
      return y;
    };

    const thresholdPositions: { warning?: number; alarm?: number } = {};
    // Only show thresholds if they fall within the data range (auto-subscribed from alarm config)
    if (
      convertedWarningThreshold !== undefined &&
      convertedWarningThreshold >= dataMin &&
      convertedWarningThreshold <= dataMax
    ) {
      thresholdPositions.warning = calculateThresholdY(convertedWarningThreshold);
    }
    if (
      convertedAlarmThreshold !== undefined &&
      convertedAlarmThreshold >= dataMin &&
      convertedAlarmThreshold <= dataMax
    ) {
      thresholdPositions.alarm = calculateThresholdY(convertedAlarmThreshold);
    }

    // Calculate points for the line with colors
    // Right edge = NOW, left edge = timeWindowMinutes ago
    // X position based on age from current time (scrolling chart)
    // Note: 'now' and 'timeWindowMs' already declared above for filtering

    const pointsData = filteredData.map((point) => {
      // Calculate age of this data point (how long ago it was recorded)
      const age = now - point.timestamp;

      // X position: newer data (age=0) goes to right edge, older data goes left
      // age=0 → x=chartWidth (right edge)
      // age=timeWindowMs → x=0 (left edge)
      const x = ((timeWindowMs - age) / timeWindowMs) * chartWidth + AXIS_MARGIN;

      // Calculate Y position based on direction
      let y: number;
      if (yAxisDirection === 'down') {
        // Inverted: higher values move down
        y = ((point.value - dataMin) / range) * chartHeight;
      } else {
        // Standard: higher values move up
        y = chartHeight - ((point.value - dataMin) / range) * chartHeight;
      }

      // Adjust Y for axis position
      if (xAxisPosition === 'top') {
        y += PADDING_TOP;
      }

      return { x, y, value: point.value, color: trendlineColor };
    });

    return {
      dataMin,
      dataMax,
      range,
      pointsData,
      yLabels: yAxisDirection === 'down' ? yLabels : yLabels.reverse(),
      thresholdPositions,
    };
  }, [
    trendData,
    displayStats,
    minValue,
    maxValue,
    forceZero,
    convertedWarningThreshold,
    convertedAlarmThreshold,
    chartWidth,
    chartHeight,
    AXIS_MARGIN,
    yAxisDirection,
    xAxisPosition,
    PADDING_TOP,
    trendlineColor,
    timeWindowMinutes,
    sensor,
    metric,
  ]);

  // Generate time labels for X-axis (0 and max time only)
  const timeLabels = useMemo(() => {
    if (!showTimeLabels || trendData.length < 2) return [];

    const labels: { position: number; text: string }[] = [];

    // Start label (oldest time)
    labels.push({
      position: AXIS_MARGIN,
      text: `${timeWindowMinutes}m`,
    });

    // End label (current time = 0)
    labels.push({
      position: AXIS_MARGIN + chartWidth,
      text: '0',
    });

    return labels;
  }, [showTimeLabels, timeWindowMinutes, trendData.length, chartWidth, AXIS_MARGIN]);

  const xAxisY = xAxisPosition === 'top' ? PADDING_TOP : height - PADDING_BOTTOM;
  const chartStartY = xAxisPosition === 'top' ? PADDING_TOP : PADDING_TOP;

  // Validate we have required data (AFTER all hooks are called)
  if (!sensor || instance === undefined || !metric) {
    return (
      <View style={{ width, height, justifyContent: 'center', alignItems: 'center' }}>
        <Text style={{ color: theme.textSecondary, fontSize: scaledDimensions.errorFontSize }}>
          {metricKey ? 'Context required' : 'Props required'}
        </Text>
      </View>
    );
  }

  // Validate dimensions - if chart area is too small, show error
  if (chartWidth <= 0 || chartHeight <= 0) {
    return (
      <View style={{ width, height, justifyContent: 'center', alignItems: 'center' }}>
        <Text style={{ fontSize: scaledDimensions.errorFontSize, color: theme.textSecondary }}>
          Insufficient space
        </Text>
      </View>
    );
  }

  // Render SVG directly with explicit dimensions (no flex wrapper needed)
  // Width and height are provided explicitly by TemplatedWidget
  // Metric label shows mnemonic + unit like MetricCell
  return trendData.length >= 2 ? (
    <Svg width={width} height={height}>
      {/* === BACKGROUND LAYER: Render graph elements first === */}
      {/* Grid lines */}
      {showGrid && (
        <>
          {/* Horizontal grid lines */}
          {[0, 0.25, 0.5, 0.75, 1].map((ratio, idx) => {
            const y = chartStartY + ratio * chartHeight;
            return (
              <Line
                key={`h-grid-${idx}`}
                x1={AXIS_MARGIN}
                y1={y}
                x2={chartWidth + AXIS_MARGIN}
                y2={y}
                stroke={gridColor}
                strokeWidth={scaledDimensions.gridStroke}
                opacity="0.3"
              />
            );
          })}
          {/* Vertical grid lines */}
          {[0, 0.25, 0.5, 0.75, 1].map((ratio, idx) => {
            const x = AXIS_MARGIN + ratio * chartWidth;
            return (
              <Line
                key={`v-grid-${idx}`}
                x1={x}
                y1={chartStartY}
                x2={x}
                y2={chartStartY + chartHeight}
                stroke={gridColor}
                strokeWidth={scaledDimensions.gridStroke}
                opacity="0.3"
              />
            );
          })}
        </>
      )}

      {/* Y-axis line */}
      {showYAxis && (
        <Line
          x1={AXIS_MARGIN}
          y1={chartStartY}
          x2={AXIS_MARGIN}
          y2={chartStartY + chartHeight}
          stroke={axisColor}
          strokeWidth={scaledDimensions.axisStroke}
        />
      )}

      {/* X-axis line */}
      {showXAxis && (
        <Line
          x1={AXIS_MARGIN}
          y1={xAxisY}
          x2={chartWidth + AXIS_MARGIN}
          y2={xAxisY}
          stroke={axisColor}
          strokeWidth={scaledDimensions.axisStroke}
        />
      )}

      {/* Threshold lines */}
      {thresholdPositions.warning !== undefined && (
        <Line
          x1={AXIS_MARGIN}
          y1={thresholdPositions.warning}
          x2={chartWidth + AXIS_MARGIN}
          y2={thresholdPositions.warning}
          stroke={warningColor}
          strokeWidth={scaledDimensions.warningStroke}
          strokeDasharray={thresholdType === 'max' ? `${scaledDimensions.dashLength} ${scaledDimensions.gapLength}` : `${scaledDimensions.dashShort} ${scaledDimensions.gapLong}`}
          opacity={0.7}
        />
      )}
      {thresholdPositions.alarm !== undefined && (
        <Line
          x1={AXIS_MARGIN}
          y1={thresholdPositions.alarm}
          x2={chartWidth + AXIS_MARGIN}
          y2={thresholdPositions.alarm}
          stroke={alarmColor}
          strokeWidth={scaledDimensions.alarmStroke}
          strokeDasharray={thresholdType === 'max' ? `${scaledDimensions.dashLength} ${scaledDimensions.gapLength}` : `${scaledDimensions.dashShort} ${scaledDimensions.gapLong}`}
          opacity={0.8}
        />
      )}

      {/* Trendline segments */}
      {pointsData.map((point, index) => {
        if (index === 0) return null;
        const prevPoint = pointsData[index - 1];
        return (
          <Line
            key={`segment-${index}`}
            x1={prevPoint.x}
            y1={prevPoint.y}
            x2={point.x}
            y2={point.y}
            stroke={point.color}
            strokeWidth={scaledDimensions.trendlineStroke}
          />
        );
      })}

      {/* Data points */}
      {showDataPoints &&
        pointsData.map((point, index) => (
          <circle
            key={`point-${index}`}
            cx={point.x}
            cy={point.y}
            r={scaledDimensions.pointRadius}
            fill={point.color}
          />
        ))}

      {/* === FOREGROUND LAYER: Render text labels last (on top) === */}

      {/* Mnemonic + unit in upper right corner (exactly like MetricCell) */}
      {/* Render as separate text elements to match MetricCell's separate Text components */}
      <SvgText
        x={width - 2}
        y={2 + scaledDimensions.mnemonicFontSize * 0.85}
        fill={theme.textSecondary}
        fontSize={scaledDimensions.mnemonicFontSize}
        fontWeight="600"
        fontFamily="system-ui, -apple-system, sans-serif"
        letterSpacing={0.5}
        textAnchor="end"
      >
        {hasUnit ? `${mnemonic} (${sanitizedUnit})` : mnemonic}
      </SvgText>

      {/* Y-axis labels - positioned inside graph (right of Y-axis) */}
      {showYAxis && yLabels.map((label, idx) => {
        // Calculate Y position for label alignment
        // idx=0 is max (top), idx=yLabels.length-1 is min (bottom)
        const isTop = idx === 0;
        const isBottom = idx === yLabels.length - 1;

        let yPos;
        if (isTop) {
          // Top label: align TOP of text with TOP of Y-axis
          yPos = chartStartY + scaledDimensions.labelFontSize * 0.8;
        } else if (isBottom) {
          // Bottom label: align BOTTOM of text with BOTTOM of Y-axis  
          yPos = chartStartY + chartHeight - 2;
        } else {
          // Middle labels (if any)
          yPos = chartStartY + (idx / (yLabels.length - 1)) * chartHeight + scaledDimensions.yLabelAdjust;
        }

        return (
          <SvgText
            key={`y-label-${idx}`}
            x={AXIS_MARGIN + scaledDimensions.yLabelOffset}
            y={yPos}
            fontSize={scaledDimensions.labelFontSize}
            fill={labelColor}
            fontFamily="system-ui, -apple-system, sans-serif"
            textAnchor="start"
          >
            {label}
          </SvgText>
        );
      })}

      {/* X-axis time labels */}
      {showXAxis && timeLabels.map((label, idx) => (
        <SvgText
          key={`x-label-${idx}`}
          x={label.position}
          y={xAxisPosition === 'top' ? xAxisY - scaledDimensions.xLabelTopOffset : xAxisY + scaledDimensions.xLabelBottomOffset}
          fontSize={scaledDimensions.labelFontSize}
          fill={labelColor}
          fontFamily="system-ui, -apple-system, sans-serif"
          textAnchor="middle"
        >
          {label.text}
        </SvgText>
      ))}
    </Svg>
  ) : (
    <View style={{ width, height, justifyContent: 'center', alignItems: 'center' }}>
      <Text style={{ color: theme.textSecondary, fontSize: scaledDimensions.errorFontSize }}>
        No trend data
      </Text>
    </View>
  );
};

export default TrendLine;
