import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Polyline, Line, Text as SvgText } from 'react-native-svg';
import { useTheme } from '../store/themeStore';

export interface DataPoint {
  value: number;
  timestamp: number;
}

export interface TrendLineProps {
  data: DataPoint[];
  width: number; // Required: cell width from parent
  height: number; // Required: cell height from parent
  
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
  
  // Threshold configuration
  warningThreshold?: number; // Warning level threshold
  alarmThreshold?: number; // Alarm/critical level threshold
  thresholdType?: 'min' | 'max'; // Whether values above or below threshold trigger alarm
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
  data,
  width,
  height,
  showXAxis = false,
  showYAxis = false,
  xAxisPosition = 'bottom',
  yAxisDirection = 'up',
  timeWindowMinutes = 5,
  showTimeLabels = false,
  minValue,
  maxValue,
  forceZero = false,
  warningThreshold,
  alarmThreshold,
  thresholdType = 'min',
  usePrimaryLine = true,
  strokeWidth = 2,
  showGrid = false,
  fontSize = 9,
  showDataPoints = false,
  dataPointRadius = 3,
}) => {
  // Get theme colors directly from store
  const theme = useTheme();
  
  // Derive all colors from theme
  const trendlineColor = usePrimaryLine ? theme.trendline.primary : theme.trendline.secondary;
  const warningColor = theme.trendline.thresholdWarning;
  // Use correct threshold color based on type (max for overheat/overspeed, min for shallow water/low battery)
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
    if (data.length < 2) {
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
    const filteredData = data.filter(point => point.timestamp > now - timeWindowMs);
    
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
    
    // Include thresholds in the data range so they're always visible and positioned correctly
    if (warningThreshold !== undefined) {
      dataMin = Math.min(dataMin, warningThreshold);
      dataMax = Math.max(dataMax, warningThreshold);
    }
    if (alarmThreshold !== undefined) {
      dataMin = Math.min(dataMin, alarmThreshold);
      dataMax = Math.max(dataMax, alarmThreshold);
    }
    
    // Force zero into the range if requested (AFTER including thresholds)
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
    // Thresholds are now always in range because we expanded dataMin/dataMax to include them
    if (warningThreshold !== undefined) {
      thresholdPositions.warning = calculateThresholdY(warningThreshold);
    }
    if (alarmThreshold !== undefined) {
      thresholdPositions.alarm = calculateThresholdY(alarmThreshold);
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
  }, [data, minValue, maxValue, forceZero, warningThreshold, alarmThreshold, chartWidth, chartHeight, AXIS_MARGIN, yAxisDirection, xAxisPosition, PADDING_TOP, trendlineColor, timeWindowMinutes]);

  // Generate time labels for X-axis (0 and max time only)
  const timeLabels = useMemo(() => {
    if (!showTimeLabels || data.length < 2) return [];
    
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
  }, [showTimeLabels, timeWindowMinutes, data.length, chartWidth, AXIS_MARGIN]);

  if (data.length < 2) {
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
