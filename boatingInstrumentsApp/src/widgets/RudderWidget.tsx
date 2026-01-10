import React, { useMemo } from 'react';
import { View, Text } from 'react-native';
import Svg, { Circle, Line, Polygon, Text as SvgText } from 'react-native-svg';
import { useTheme } from '../store/themeStore';
import { useNmeaStore } from '../store/nmeaStore';
import { TemplatedWidget } from '../components/TemplatedWidget';
import PrimaryMetricCell from '../components/PrimaryMetricCell';

interface RudderWidgetProps {
  id: string;
  instanceNumber?: number;
}

/**
 * RudderWidget - Registry-First Declarative Implementation with SVG Visualization
 *
 * **Before (313 lines):**
 * - Manual metric extraction from autopilot sensor
 * - Manual display value creation and formatting
 * - Manual alarm state extraction
 * - Complex TouchableOpacity container with styling
 * - Manual separator and layout management
 *
 * **After (~110 lines):**
 * - Pure declarative configuration for metrics
 * - Auto-fetch via MetricCell
 * - TemplatedWidget handles layout
 * - SVG RudderIndicator component preserved (unique to rudder)
 *
 * **Layout:** 2Rx1C primary (rudderAngle) + Custom secondary (SVG visualization)
 *
 * **Unique Features:**
 * - SVG rudder indicator with boat outline
 * - Visual feedback for angle (color-coded: green=0°, yellow>20°, red>30°)
 * - Port/Starboard labels
 *
 * NO SUBSCRIPTIONS: Widget is pure layout, TemplatedWidget handles store access
 */
export const RudderWidget: React.FC<RudderWidgetProps> = React.memo(({ id }) => {
  const theme = useTheme();

  // Extract instance number from widget ID
  const instanceNumber = useMemo(() => {
    const match = id.match(/rudder-(\d+)/);
    return match ? parseInt(match[1], 10) : 0;
  }, [id]);

  return (
    <TemplatedWidget
      template="2Rx1C-SEP-NONE"
      sensorType="autopilot"
      instanceNumber={instanceNumber}
      testID={`rudder-widget-${instanceNumber}`}
    >
      {/* Primary Grid: Rudder Angle */}
      <PrimaryMetricCell sensorType="autopilot" instance={instanceNumber} metricKey="rudderAngle" />

      {/* Secondary: Custom SVG Visualization */}
      <RudderVisualization sensorType="autopilot" instance={instanceNumber} />
    </TemplatedWidget>
  );
});

/**
 * RudderVisualization - Reads rudder angle from store
 */
interface RudderVisualizationProps {
  sensorType: 'autopilot';
  instance: number;
}

const RudderVisualization: React.FC<RudderVisualizationProps> = ({ sensorType, instance }) => {
  const theme = useTheme();
  const sensorInstance = useNmeaStore(
    (state) => state.getSensorInstance(sensorType, instance),
    (a, b) => a === b
  );
  
  // Get rudder angle for visualization
  const rudderAngle = (sensorInstance?.getMetric('rudderAngle')?.si_value as number) ?? 0;

  return (
    <View style={{ alignItems: 'center', marginTop: 16, paddingBottom: 8 }}>
      <RudderIndicator angle={rudderAngle} theme={theme} />
      <Text
        style={{
          fontSize: 11,
          fontWeight: '600',
          textAlign: 'center',
          marginTop: 8,
          color: theme.textSecondary,
        }}
      >
        {Math.abs(rudderAngle) > 30
          ? 'EXTREME ANGLE'
          : Math.abs(rudderAngle) > 20
          ? 'High Angle'
          : rudderAngle === 0
          ? 'Centered'
          : 'Normal'}
      </Text>
    </View>
  );
};

/**
 * RudderIndicator - SVG visualization of rudder position
 * Shows boat hull outline with rudder angle indicator
 * Color-coded by angle: green (0°), yellow (>20°), red (>30°)
 */
interface RudderIndicatorProps {
  angle: number;
  theme: any;
}

const RudderIndicator: React.FC<RudderIndicatorProps> = ({ angle, theme }) => {
  const size = 80;
  const center = size / 2;

  // Clamp angle to ±45 degrees for visualization
  const clampedAngle = Math.max(-45, Math.min(45, angle));

  // Convert angle to SVG rotation (negative for correct direction)
  const rotation = -clampedAngle;

  // Color based on angle magnitude
  const rudderColor =
    angle === 0
      ? theme.success
      : Math.abs(angle) > 30
      ? theme.error
      : Math.abs(angle) > 20
      ? theme.warning
      : theme.primary;

  return (
    <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      {/* Boat hull outline (triangle pointing up) */}
      <Polygon
        points={`${center},5 ${center - 15},${size - 10} ${center + 15},${size - 10}`}
        fill="none"
        stroke={theme.border}
        strokeWidth="2"
      />

      {/* Center point (rudder pivot) */}
      <Circle cx={center} cy={center + 10} r="2" fill={theme.text} />

      {/* Rudder indicator (rotates around center) */}
      <Line
        x1={center}
        y1={center + 10}
        x2={center}
        y2={center + 25}
        stroke={rudderColor}
        strokeWidth="4"
        strokeLinecap="round"
        transform={`rotate(${rotation} ${center} ${center + 10})`}
      />

      {/* Angle reference marks (port and starboard limits) */}
      <Line
        x1={center - 20}
        y1={center + 10}
        x2={center - 15}
        y2={center + 10}
        stroke={theme.border}
        strokeWidth="1"
      />
      <Line
        x1={center + 15}
        y1={center + 10}
        x2={center + 20}
        y2={center + 10}
        stroke={theme.border}
        strokeWidth="1"
      />

      {/* Port/Starboard labels */}
      <SvgText
        x={center - 25}
        y={center + 15}
        fontSize="8"
        fill={theme.textSecondary}
        textAnchor="middle"
      >
        P
      </SvgText>
      <SvgText
        x={center + 25}
        y={center + 15}
        fontSize="8"
        fill={theme.textSecondary}
        textAnchor="middle"
      >
        S
      </SvgText>
    </Svg>
  );
};

RudderWidget.displayName = 'RudderWidget';

export default RudderWidget;
