import React, { useMemo } from 'react';
import { View, Text } from 'react-native';
import Svg, { Polyline, Line, Text as SvgText } from 'react-native-svg';
import { useTheme } from '../store/themeStore';
import { useNmeaStore } from '../store/nmeaStore';
import { SensorType } from '../types/SensorData';
import { useCategoryPresentation } from '../presentation/useCategoryPresentation';
import { useAlarmThresholds } from '../hooks/useAlarmThresholds';
import { useSensorContext } from '../contexts/SensorContext';
import { log } from '../utils/logging/logger';

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
  const instance = context?.sensorInstance?.instanceNumber ?? 0;
  const metric = metricKey;

  // Get presentation system for this sensor (for unit conversion)
  const presentation = useCategoryPresentation(sensor);

  // Subscribe to sensor-instance alarm thresholds
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

  // Use explicit dimensions provided by TemplatedWidget
  // These are already calculated based on available widget space
  const width = cellWidth || 300;
  const height = cellHeight || 60;

  // Subscribe to sensor timestamp to trigger updates when new data arrives
  const sensorTimestamp = useNmeaStore(
    (state) => state.nmeaData.sensors[sensor]?.[instance]?.timestamp,
  );

  // Get stable reference to getSensorHistory (won't change between renders)
  const getSensorHistory = useNmeaStore((state) => state.getSensorHistory);

  // Fetch history when sensor updates (memoized to prevent infinite loops)
  // Note: Use getSensorHistory which internally uses TimeSeriesBuffer.getInWindow()
  // for efficient windowed queries (optimized in Phase 4)
  const trendData = useMemo(() => {
    if (!sensor || instance === undefined || !metric) return [];
    const data = getSensorHistory(sensor, instance, metric, { timeWindowMs });
    
    // Conditional DEBUG logging for TrendLine history
    log.uiLayout('TrendLine history fetch', () => ({
      sensor: `${sensor}.${instance}.${metric}`,
      dataPoints: data.length,
      timeWindow: timeWindowMs,
      sensorTimestamp,
      firstPoint: data[0],
      lastPoint: data[data.length - 1],
    }));
    
    return data;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sensor, instance, metric, timeWindowMs, sensorTimestamp]);

  // Validate we have required data (AFTER all hooks are called)
  if (!sensor || instance === undefined || !metric) {
    return (
      <View style={{ width: 100, height: 60, justifyContent: 'center', alignItems: 'center' }}>
        <Text style={{ color: theme.textSecondary, fontSize: 10 }}>
          {metricKey ? 'Context required' : 'Props required'}
        </Text>
      </View>
    );
  }

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

  // Calculate axis dimensions - use 5px padding on all sides
  const PADDING_LEFT = showYAxis ? 20 : 5;
  const PADDING_RIGHT = 5;
  const PADDING_TOP = xAxisPosition === 'top' ? 15 : 5;
  const PADDING_BOTTOM = xAxisPosition === 'bottom' ? 15 : 5;

  const chartWidth = width - PADDING_LEFT - PADDING_RIGHT;
  const chartHeight = height - PADDING_TOP - PADDING_BOTTOM;
  const AXIS_MARGIN = PADDING_LEFT; // Left margin for Y-axis labels

  // Calculate data range and scaling
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

    const values = filteredData.map((p) => p.value);
    let dataMin = minValue !== undefined ? minValue : Math.min(...values);
    let dataMax = maxValue !== undefined ? maxValue : Math.max(...values);

    // Force zero into the range if requested (BEFORE calculating thresholds)
    if (forceZero) {
      if (dataMin > 0) dataMin = 0;
      if (dataMax < 0) dataMax = 0;
    }

    const range = dataMax - dataMin || 1;

    // Generate Y-axis labels (min and max only)
    const yLabels: string[] = [dataMin.toFixed(1), dataMax.toFixed(1)];

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

  // Render SVG directly with explicit dimensions (no flex wrapper needed)
  // Width and height are provided explicitly by TemplatedWidget
  return trendData.length >= 2 ? (
    <Svg width={width} height={height}>
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
                  strokeWidth="0.5"
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
                  strokeWidth="0.5"
                  opacity="0.3"
                />
              );
            })}
          </>
        )}
        {showYAxis && (
          <>
            <Line
              x1={AXIS_MARGIN}
              y1={chartStartY}
              x2={AXIS_MARGIN}
              y2={chartStartY + chartHeight}
              stroke={axisColor}
              strokeWidth="1"
            />
            {/* Y-axis labels */}
            {yLabels.map((label, idx) => {
              const yPos = chartStartY + (idx / (yLabels.length - 1)) * chartHeight;
              return (
                <SvgText
                  key={`y-label-${idx}`}
                  x={AXIS_MARGIN - 5}
                  y={yPos + 3}
                  fontSize={fontSize}
                  fill={labelColor}
                  textAnchor="end"
                >
                  {label}
                </SvgText>
              );
            })}
          </>
        )}
        {showXAxis && (
          <>
            <Line
              x1={AXIS_MARGIN}
              y1={xAxisY}
              x2={chartWidth + AXIS_MARGIN}
              y2={xAxisY}
              stroke={axisColor}
              strokeWidth="1"
            />
            {/* X-axis time labels */}
            {timeLabels.map((label, idx) => (
              <SvgText
                key={`x-label-${idx}`}
                x={label.position}
                y={xAxisPosition === 'top' ? xAxisY - 5 : xAxisY + 14}
                fontSize={fontSize}
                fill={labelColor}
                textAnchor="middle"
              >
                {label.text}
              </SvgText>
            ))}
          </>
        )}
        {thresholdPositions.warning !== undefined && (
          <Line
            x1={AXIS_MARGIN}
            y1={thresholdPositions.warning}
            x2={chartWidth + AXIS_MARGIN}
            y2={thresholdPositions.warning}
            stroke={warningColor}
            strokeWidth="1.5"
            strokeDasharray={thresholdType === 'max' ? '4,4' : '2,6'}
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
            strokeWidth="2"
            strokeDasharray={thresholdType === 'max' ? '4,4' : '2,6'}
            opacity={0.8}
          />
        )}
        {pointsData.map((point, index) => {
          if (index === 0) return null; // Skip first point (need pairs)

          const prevPoint = pointsData[index - 1];

          return (
            <Line
              key={`segment-${index}`}
              x1={prevPoint.x}
              y1={prevPoint.y}
              x2={point.x}
              y2={point.y}
              stroke={point.color}
              strokeWidth={strokeWidth}
            />
          );
        })}
        {showDataPoints &&
          pointsData.map((point, index) => (
            <circle
              key={`point-${index}`}
              cx={point.x}
              cy={point.y}
              r={dataPointRadius}
              fill={point.color}
            />
          ))}
      </Svg>
  ) : (
    <View style={{ width, height, justifyContent: 'center', alignItems: 'center' }}>
      <Text style={{ color: theme.textSecondary, fontSize: 10 }}>
        No trend data
      </Text>
    </View>
  );
};

export default TrendLine;
