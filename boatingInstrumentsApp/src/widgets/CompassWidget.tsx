import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import Svg, { Circle, Line, Text as SvgText, G } from 'react-native-svg';
import { useNmeaStore } from '../store/nmeaStore';
import { useTheme } from '../store/themeStore';
import { useWidgetStore } from '../store/widgetStore';
import { MetricDisplayData } from '../types/MetricDisplayData';
import PrimaryMetricCell from '../components/PrimaryMetricCell';
import SecondaryMetricCell from '../components/SecondaryMetricCell';
import { UniversalIcon } from '../components/atoms/UniversalIcon';
import { WidgetMetadataRegistry } from '../registry/WidgetMetadataRegistry';
import { useResponsiveFontSize } from '../hooks/useResponsiveFontSize';
import { useResponsiveHeader } from '../hooks/useResponsiveHeader';
import { UnifiedWidgetGrid } from '../components/UnifiedWidgetGrid';

interface CompassWidgetProps {
  id: string;
  title: string;
  width?: number; // Widget width for responsive scaling
  height?: number; // Widget height for responsive scaling
}

type CompassMode = 'TRUE' | 'MAGNETIC';

/**
 * Compass Widget - Interactive per ui-architecture.md v2.3
 * Primary Grid (2×1): True Heading + Magnetic Heading
 * Secondary Grid (2×1): Variation and Deviation (if available)
 */
export const CompassWidget: React.FC<CompassWidgetProps> = React.memo(
  ({ id, title, width, height }) => {
    const theme = useTheme();
    const fontSize = useResponsiveFontSize(width || 0, height || 0);

    // Widget state management per ui-architecture.md v2.3

    // NMEA data selectors - Using SensorInstance pattern with getMetric()
    const compassSensorData = useNmeaStore(
      (state) => state.nmeaData.sensors.compass?.[0],
      (a, b) => a === b,
    );

    // Extract MetricValues for all compass data
    const magneticHeadingMetric = compassSensorData?.getMetric('magneticHeading');
    const magneticHeading = magneticHeadingMetric?.si_value;

    const trueHeadingMetric = compassSensorData?.getMetric('trueHeading');
    const trueHeading = trueHeadingMetric?.si_value;

    const variationMetric = compassSensorData?.getMetric('variation');
    const variation = variationMetric?.si_value;

    const deviationMetric = compassSensorData?.getMetric('deviation');
    const deviation = deviationMetric?.si_value;

    const compassTimestamp = compassSensorData?.timestamp;
    const headingTimestamp = compassTimestamp; // Use sensor timestamp

    // Create display data from MetricValues (pre-enriched with user formatting)
    const variationMetricDisplay = compassSensorData?.getMetric('variation');
    const variationDisplay: MetricDisplayData = {
      mnemonic: 'VAR',
      value: variationMetricDisplay?.formattedValue,
      unit: variationMetricDisplay?.unit,
      alarmState: 0,
    };

    const deviationMetricDisplay = compassSensorData?.getMetric('deviation');
    const deviationDisplay: MetricDisplayData = {
      mnemonic: 'DEV',
      value: deviationMetricDisplay?.formattedValue,
      unit: deviationMetricDisplay?.unit,
      alarmState: 0,
    };

    // Compass mode state with toggle capability
    const [compassMode, setCompassMode] = useState<CompassMode>('TRUE'); // Default to TRUE per marine standards

    const handleLongPressOnPin = useCallback(() => {}, [id]);

    // Responsive header sizing using proper base-size scaling
    const { iconSize: headerIconSize, fontSize: headerFontSize } = useResponsiveHeader(height);

    // Mode toggle handler (tap compass to switch TRUE ↔ MAGNETIC)
    const handleModeToggle = useCallback(() => {
      setCompassMode((prev) => (prev === 'TRUE' ? 'MAGNETIC' : 'TRUE'));
    }, []);

    // Current heading based on selected mode
    const currentHeading = useMemo(() => {
      switch (compassMode) {
        case 'TRUE':
          // Prefer trueHeading if available, otherwise calculate from magnetic + variation
          return (
            trueHeading ?? (magneticHeading && variation ? magneticHeading + variation : magneticHeading)
          );
        case 'MAGNETIC':
          // Prefer magneticHeading if available, otherwise calculate from true - variation
          return magneticHeading ?? (trueHeading && variation ? trueHeading - variation : trueHeading);
        default:
          return trueHeading ?? magneticHeading;
      }
    }, [trueHeading, magneticHeading, variation, compassMode]);

    // Data staleness detection (>5s = stale)
    const isStale = headingTimestamp ? Date.now() - headingTimestamp > 5000 : true;

    // Heading display formatting
    const headingDisplay = useMemo(() => {
      if (currentHeading === undefined || currentHeading === null) {
        return '---°';
      }
      return `${Math.round(currentHeading).toString().padStart(3, '0')}°`;
    }, [currentHeading]);

    // Cardinal direction
    const cardinalDirection = useMemo(() => {
      if (currentHeading === undefined || currentHeading === null) return '';

      const directions = [
        'N',
        'NNE',
        'NE',
        'ENE',
        'E',
        'ESE',
        'SE',
        'SSE',
        'S',
        'SSW',
        'SW',
        'WSW',
        'W',
        'WNW',
        'NW',
        'NNW',
      ];
      const index = Math.round(currentHeading / 22.5) % 16;
      return directions[index];
    }, [currentHeading]);

    // Header component for UnifiedWidgetGrid v2
    const headerComponent = (
      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          width: '100%',
          paddingHorizontal: 16,
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <UniversalIcon
            name={WidgetMetadataRegistry.getMetadata('compass')?.icon || 'compass-outline'}
            size={headerIconSize}
            color={theme.iconPrimary}
          />
          <Text
            style={{
              fontSize: headerFontSize,
              fontWeight: 'bold',
              letterSpacing: 0.5,
              color: theme.textSecondary,
              textTransform: 'uppercase',
            }}
          >
            {title}
          </Text>
        </View>
      </View>
    );

    return (
      <UnifiedWidgetGrid
        theme={theme}
        header={headerComponent}
        widgetWidth={width || 400}
        widgetHeight={height || 300}
        columns={1}
        primaryRows={2}
        secondaryRows={2}
        testID={`compass-widget-${id}`}
      >
        {/* Row 1: True Heading */}
        <PrimaryMetricCell
          data={{
            mnemonic: 'TRUE',
            value:
              currentHeading !== null && currentHeading !== undefined
                ? Math.round(currentHeading).toString().padStart(3, '0')
                : '---',
            unit: '°',
            alarmState: isStale ? 1 : 0,
          }}
          fontSize={{
            mnemonic: fontSize.label,
            value: fontSize.value,
            unit: fontSize.unit,
          }}
        />
        {/* Row 2: Magnetic Heading */}
        <PrimaryMetricCell
          data={{
            mnemonic: 'MAG',
            value:
              magneticHeading !== null && magneticHeading !== undefined
                ? Math.round(magneticHeading).toString().padStart(3, '0')
                : trueHeading && variation
                ? Math.round(trueHeading - variation)
                    .toString()
                    .padStart(3, '0')
                : '---',
            unit: '°',
            alarmState: isStale ? 1 : 0,
          }}
          fontSize={{
            mnemonic: fontSize.label,
            value: fontSize.value,
            unit: fontSize.unit,
          }}
        />
        {/* Separator after row 2 */}
        {/* Row 3: Variation */}
        <SecondaryMetricCell
          data={{ ...variationDisplay, alarmState: 0 }}
          compact={true}
          fontSize={{
            mnemonic: fontSize.label,
            value: fontSize.value,
            unit: fontSize.unit,
          }}
        />
        {/* Row 4: Deviation */}
        <SecondaryMetricCell
          data={{ ...deviationDisplay, alarmState: 0 }}
          compact={true}
          fontSize={{
            mnemonic: fontSize.label,
            value: fontSize.value,
            unit: fontSize.unit,
          }}
        />
      </UnifiedWidgetGrid>
    );
  },
);

// SVG Compass Rose Component
interface CompassRoseProps {
  heading: number;
  theme: any;
  isStale: boolean;
}

const CompassRose: React.FC<CompassRoseProps> = React.memo(({ heading, theme, isStale }) => {
  const size = 120;
  const center = size / 2;
  const radius = 45;

  // Compass rose color based on state
  const strokeColor = isStale ? theme.textSecondary : theme.iconPrimary;
  const fillColor = isStale ? theme.textSecondary : theme.text;

  // Calculate rotation (north up, heading rotates clockwise)
  const rotation = -heading; // Negative because we want the rose to rotate opposite to heading

  return (
    <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <G transform={`rotate(${rotation}, ${center}, ${center})`}>
        {/* Outer circle */}
        <Circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke={strokeColor}
          strokeWidth="2"
        />

        {/* Cardinal direction markers */}
        {[0, 90, 180, 270].map((angle, index) => {
          const radian = (angle * Math.PI) / 180;
          const x1 = center + (radius - 10) * Math.sin(radian);
          const y1 = center - (radius - 10) * Math.cos(radian);
          const x2 = center + radius * Math.sin(radian);
          const y2 = center - radius * Math.cos(radian);

          return (
            <Line
              key={angle}
              x1={x1}
              y1={y1}
              x2={x2}
              y2={y2}
              stroke={strokeColor}
              strokeWidth="3"
              strokeLinecap="round"
            />
          );
        })}
        {[45, 135, 225, 315].map((angle) => {
          const radian = (angle * Math.PI) / 180;
          const x1 = center + (radius - 5) * Math.sin(radian);
          const y1 = center - (radius - 5) * Math.cos(radian);
          const x2 = center + radius * Math.sin(radian);
          const y2 = center - radius * Math.cos(radian);

          return (
            <Line
              key={angle}
              x1={x1}
              y1={y1}
              x2={x2}
              y2={y2}
              stroke={strokeColor}
              strokeWidth="2"
              strokeLinecap="round"
            />
          );
        })}
        <G>
          <Line
            x1={center}
            y1={center - radius + 15}
            x2={center}
            y2={center - 8}
            stroke={fillColor}
            strokeWidth="3"
            strokeLinecap="round"
          />
          {/* Arrow head */}
          <Line
            x1={center}
            y1={center - radius + 15}
            x2={center - 5}
            y2={center - radius + 25}
            stroke={fillColor}
            strokeWidth="2"
            strokeLinecap="round"
          />
          <Line
            x1={center}
            y1={center - radius + 15}
            x2={center + 5}
            y2={center - radius + 25}
            stroke={fillColor}
            strokeWidth="2"
            strokeLinecap="round"
          />
        </G>

        {/* Center dot */}
        <Circle cx={center} cy={center} r="3" fill={fillColor} />
      </G>
    </Svg>
  );
});

CompassWidget.displayName = 'CompassWidget';

export default CompassWidget;
