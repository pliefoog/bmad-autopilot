import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Polyline, Line, Text as SvgText } from 'react-native-svg';
import { useTheme } from '../store/themeStore';
import { useNmeaStore } from '../store/nmeaStore';
import { SensorType } from '../types/SensorData';
import { useDataPresentation } from '../presentation/useDataPresentation';
import { useAlarmThresholds } from '../hooks/useAlarmThresholds';

export interface DataPoint {
  value: number;
  timestamp: number;
}

export interface TrendLineProps {
  // Self-subscribe to sensor history (new pattern - required)
  sensor: SensorType;
  instance: number;
  timeWindowMs: number;
  
  // Dimensions - accept both naming conventions
  width?: number; // From direct usage
  height?: number; // From direct usage
  maxWidth?: number; // From UnifiedWidgetGrid injection
  cellHeight?: number; // From UnifiedWidgetGrid injection
  
  // Axis configuration
  showXAxis?: boolean;
  showYAxis?: boolean;
  xAxisPosition?: 'top' | 'bottom'; // X-axis at top for depth charts
  yAxisDirection?: 'up' | 'down';   // Y-axis pointing down for depth
  
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
 * 
 * Features:
 * - Configurable X/Y axes with top/bottom and up/down orientations
 * - Time-based X-axis with configurable windows (1-60 minutes)
 * - Inverted Y-axis for depth charts (values increase downward)
 * - Optional grid lines
 * - Auto-scaling or fixed value ranges
 * - Responsive sizing
 * 
 * Use Cases:
 * - Temperature trends (standard orientation)
 * - Depth trends (inverted Y-axis with X-axis at top)
 * - Speed trends, wind trends, etc.
 */
export const TrendLine: React.FC<TrendLineProps> = ({
  sensor,
  instance,
  timeWindowMs,
  width: widthProp,
  height: heightProp,
  maxWidth,
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
  // Get theme colors directly from store
  const theme = useTheme();
  
  // Get presentation system for this sensor (for unit conversion)
  const presentation = useDataPresentation(sensor);
  
  // Subscribe to sensor-instance alarm thresholds
  const alarmThresholds = useAlarmThresholds(sensor, instance);
  
  // Convert thresholds to display units if enabled
  const convertedWarningThreshold = useMemo(() => {
    if (!alarmThresholds.enabled || alarmThresholds.warning === undefined) {
      return undefined;
    }
    return presentation.isValid ? presentation.convert(alarmThresholds.warning) : alarmThresholds.warning;
  }, [alarmThresholds.enabled, alarmThresholds.warning, presentation]);
  
  const convertedAlarmThreshold = useMemo(() => {
    if (!alarmThresholds.enabled) {
      return undefined;
    }
    const criticalValue = alarmThresholds.thresholdType === 'min' ? alarmThresholds.min : alarmThresholds.max;
    if (criticalValue === undefined) {
      return undefined;
    }
    return presentation.isValid ? presentation.convert(criticalValue) : criticalValue;
  }, [alarmThresholds.enabled, alarmThresholds.min, alarmThresholds.max, alarmThresholds.thresholdType, presentation]);
  
  const thresholdType = alarmThresholds.thresholdType;
  
  // Derive actual dimensions from either prop naming convention
  const width = widthProp ?? maxWidth ?? 300;
  const height = heightProp ?? cellHeight ?? 60;
  
  // Subscribe to sensor timestamp to trigger updates when new data arrives
  const sensorTimestamp = useNmeaStore((state) => 
    state.nmeaData.sensors[sensor]?.[instance]?.timestamp
  );
  
  // Get stable reference to getSensorHistory (won't change between renders)
  const getSensorHistory = useNmeaStore((state) => state.getSensorHistory);
  
  // Fetch history when sensor updates (memoized to prevent infinite loops)
  // Note: getSensorHistory is NOT in deps because it's a stable Zustand method
  const trendData = useMemo(() => {
    const data = getSensorHistory(sensor, instance, { timeWindowMs });
    // Debug logging disabled - was causing console spam
    // if (Math.random() < 0.05) {
    //   console.log(`📊 TrendLine(${sensor}[${instance}]): ${data.length} points, timestamp=${sensorTimestamp}`);
    // }
    return data;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sensor, instance, timeWindowMs, sensorTimestamp]);
  
  // Derive all colors from theme
  const trendlineColor = usePrimaryLine ? theme.trendline.primary : theme.trendline.secondary;
  const warningColor = theme.trendline.thresholdWarning;
  // Use correct threshold color based on alarm configuration (max for overheat/overspeed, min for shallow water/low battery)
  const alarmColor = thresholdType === 'max' ? theme.trendline.thresholdMax : theme.trendline.thresholdMin;
  const normalColor = trendlineColor;
  const axisColor = theme.trendline.axis;
  const labelColor = theme.trendline.label;
  const gridColor = theme.trendline.grid;
  
  // Guard against invalid dimensions
  if (!width || !height || width <= 0 || height <= 0) {
    return (
      <View style={{ width: width || 100, height: height || 60, justifyContent: 'center', alignItems: 'center' }}>
        <Text style={{ color: theme.textSecondary, fontSize: 10 }}>Loading...</Text>
      </View>
    );
  }

  // Calculate axis dimensions - use 5px padding on all sides
  const PADDING_LEFT = showYAxis ? 20 : 5;
  const PADDING_RIGHT = 5;
  const PADDING_TOP = xAxisPosition === 'top' ? 15 : 5;
  const PADDING_BOTTOM = xAxisPosition === 'bottom' ? 15 : 5;
  
  const chartWidth = width - PADDING_LEFT - PADDING_RIGHT;
  const chartHeight = height - PADDING_TOP - PADDING_BOTTOM;
  const AXIS_MARGIN = PADDING_LEFT;

  // Calculate data range and scaling
  const { dataMin, dataMax, range, pointsData, yLabels, thresholdPositions } = useMemo(() => {
    if (trendData.length < 2) {
      return { 
        dataMin: 0, 
        dataMax: 0, 
        range: 1, 
        pointsData: [] as { x: number; y: number; value: number; color: string }[],
        yLabels: [] as string[],
        thresholdPositions: { warning: undefined, alarm: undefined } as { warning?: number; alarm?: number }
      };
    }

    // Filter data to only include points within the time window
    const now = Date.now();
    const timeWindowMs = timeWindowMinutes * 60 * 1000;
    const filteredData = trendData.filter(point => point.timestamp > now - timeWindowMs);
    
    if (filteredData.length < 2) {
      return { 
        dataMin: 0, 
        dataMax: 0, 
        range: 1, 
        pointsData: [] as { x: number; y: number; value: number; color: string }[],
        yLabels: [] as string[],
        thresholdPositions: { warning: undefined, alarm: undefined } as { warning?: number; alarm?: number }
      };
    }

    const values = filteredData.map(p => p.value);
    let dataMin = minValue !== undefined ? minValue : Math.min(...values);
    let dataMax = maxValue !== undefined ? maxValue : Math.max(...values);
    
    // Force zero into the range if requested (BEFORE calculating thresholds)
    if (forceZero) {
      if (dataMin > 0) dataMin = 0;
      if (dataMax < 0) dataMax = 0;
    }
    
    const range = dataMax - dataMin || 1;

    // Generate Y-axis labels (min and max only)
    const yLabels: string[] = [dataMin.toFixed(1), dataMax.toFixed(1)]

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
    if (convertedWarningThreshold !== undefined && convertedWarningThreshold >= dataMin && convertedWarningThreshold <= dataMax) {
      thresholdPositions.warning = calculateThresholdY(convertedWarningThreshold);
    }
    if (convertedAlarmThreshold !== undefined && convertedAlarmThreshold >= dataMin && convertedAlarmThreshold <= dataMax) {
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
      thresholdPositions
    };
  }, [trendData, minValue, maxValue, forceZero, convertedWarningThreshold, convertedAlarmThreshold, chartWidth, chartHeight, AXIS_MARGIN, yAxisDirection, xAxisPosition, PADDING_TOP, trendlineColor, timeWindowMinutes]);

  // Generate time labels for X-axis (0 and max time only)
  const timeLabels = useMemo(() => {
    if (!showTimeLabels || trendData.length < 2) return [];
    
    const labels: { position: number; text: string }[] = [];
    
    // Start label (oldest time)
    labels.push({ 
      position: AXIS_MARGIN, 
      text: `${timeWindowMinutes}m` 
    });
    
    // End label (current time = 0)
    labels.push({ 
      position: AXIS_MARGIN + chartWidth, 
      text: '0' 
    });
    
    return labels;
  }, [showTimeLabels, timeWindowMinutes, trendData.length, chartWidth, AXIS_MARGIN]);

  if (trendData.length < 2) {
    return (
      <View style={{ width, height, justifyContent: 'center', alignItems: 'center' }}>
        <Text style={{ color: theme.textSecondary, fontSize: 10 }}>No trend data</Text>
      </View>
    );
  }

  const xAxisY = xAxisPosition === 'top' ? PADDING_TOP : height - PADDING_BOTTOM;
  const chartStartY = xAxisPosition === 'top' ? PADDING_TOP : PADDING_TOP;

  return (
    <View style={{ width, height }}>
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

        {/* Y-axis */}
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

        {/* X-axis */}
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

        {/* Threshold lines - different dash patterns for min vs max type */}
        {thresholdPositions.warning !== undefined && (
          <Line
            x1={AXIS_MARGIN}
            y1={thresholdPositions.warning}
            x2={chartWidth + AXIS_MARGIN}
            y2={thresholdPositions.warning}
            stroke={warningColor}
            strokeWidth="1.5"
            strokeDasharray={thresholdType === 'max' ? "4,4" : "2,6"}
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
            strokeDasharray={thresholdType === 'max' ? "4,4" : "2,6"}
            opacity={0.8}
          />
        )}

        {/* Trend line - colored segments based on thresholds */}
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

        {/* Data point markers */}
        {showDataPoints && pointsData.map((point, index) => (
          <circle
            key={`point-${index}`}
            cx={point.x}
            cy={point.y}
            r={dataPointRadius}
            fill={point.color}
          />
        ))}
      </Svg>
    </View>
  );
};

export default TrendLine;
