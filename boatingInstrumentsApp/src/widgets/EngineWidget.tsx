import React, { useState, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
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
import { getSensorDisplayName } from '../utils/sensorDisplayName';

interface EngineWidgetProps {
  id: string;
  title: string;
  width?: number; // Widget width for responsive scaling
  height?: number; // Widget height for responsive scaling
}

/**
 * Engine Widget - Single-Instance Engine Display per ui-architecture.md v2.3
 * Primary Grid (2×2): RPM, TEMP, OIL, VOLT
 * Secondary Grid (2×1): Fuel Rate, Engine Hours
 * Supports multi-instance detection via NMEA engine instances
 */
export const EngineWidget: React.FC<EngineWidgetProps> = React.memo(
  ({ id, title, width, height }) => {
    const theme = useTheme();
    const fontSize = useResponsiveFontSize(width || 0, height || 0);

    // Extract engine instance from widget ID (e.g., "engine-0", "engine-1")
    const instanceNumber = useMemo(() => {
      const match = id.match(/engine-(\d+)/);
      return match ? parseInt(match[1], 10) : 0;
    }, [id]);

    // Widget state management per ui-architecture.md v2.3

    // NMEA data selectors - Read SensorInstance and extract metrics
    const engineSensorInstance = useNmeaStore(
      (state) => state.nmeaData.sensors.engine?.[instanceNumber],
      (a, b) => a === b,
    );

    // PERFORMANCE: Cache MetricValue objects with timestamp-based dependencies (fine-grained)
    const rpmMetric = useMemo(
      () => engineSensorInstance?.getMetric('rpm'),
      [engineSensorInstance?.timestamp],
    );
    const rpm = rpmMetric?.si_value ?? null;

    const coolantTempMetric = useMemo(
      () => engineSensorInstance?.getMetric('coolantTemp'),
      [engineSensorInstance?.timestamp],
    );
    const coolantTemp = coolantTempMetric?.si_value ?? null;

    const oilPressureMetric = useMemo(
      () => engineSensorInstance?.getMetric('oilPressure'),
      [engineSensorInstance?.timestamp],
    );
    const oilPressure = oilPressureMetric?.si_value ?? null;

    const alternatorVoltageMetric = useMemo(
      () => engineSensorInstance?.getMetric('alternatorVoltage'),
      [engineSensorInstance?.timestamp],
    );
    const alternatorVoltage = alternatorVoltageMetric?.si_value ?? null;

    const fuelRateMetric = useMemo(
      () => engineSensorInstance?.getMetric('fuelRate'),
      [engineSensorInstance?.timestamp],
    );
    const fuelRate = fuelRateMetric?.si_value ?? null;

    const hoursMetric = useMemo(
      () => engineSensorInstance?.getMetric('hours'),
      [engineSensorInstance?.timestamp],
    );
    const hours = hoursMetric?.si_value ?? null;

    const shaftRpmMetric = useMemo(
      () => engineSensorInstance?.getMetric('shaftRpm'),
      [engineSensorInstance?.timestamp],
    );
    const shaftRpm = shaftRpmMetric?.si_value ?? null;

    const engineTimestamp = engineSensorInstance?.timestamp;

    // NEW: Use cached display info from sensor.display (Phase 3 migration)
    // Helper function to create MetricDisplayData from sensor display
    const getEngineDisplay = useCallback(
      (
        metric: any,
        value: number | null,
        engineMnemonic: string,
        fallbackSymbol: string = '',
      ): MetricDisplayData => {
        // Check for both null and undefined to prevent toFixed() errors
        if (value === null || value === undefined) {
          return {
            mnemonic: engineMnemonic,
            value: '---',
            unit: fallbackSymbol,
            alarmState: 0,
            layout: {
              minWidth: 60,
              alignment: 'right',
            },
          };
        }

        // Use MetricValue's pre-enriched display values
        if (metric) {
          return {
            mnemonic: engineMnemonic,
            value: metric.formattedValue, // Already formatted without unit
            unit: metric.unit,
            alarmState: 0,
            layout: {
              minWidth: 60,
              alignment: 'right',
            },
          };
        }

        // Fallback to raw value formatting
        return {
          mnemonic: engineMnemonic,
          value: '---',
          unit: fallbackSymbol,
          alarmState: 0,
          layout: {
            minWidth: 60,
            alignment: 'right',
          },
        };
      },
      [],
    );

    // Engine display values using MetricValue from SensorInstance (Phase 4)
    const rpmDisplay = useMemo(
      () => getEngineDisplay(rpmMetric, rpm, 'RPM', 'rpm'),
      [rpm, rpmMetric],
    );

    const coolantTempDisplay = useMemo(
      () => getEngineDisplay(coolantTempMetric, coolantTemp, 'ECT', '°C'),
      [coolantTemp, coolantTempMetric],
    );

    const oilPressureDisplay = useMemo(
      () => getEngineDisplay(oilPressureMetric, oilPressure, 'EOP', 'bar'),
      [oilPressure, oilPressureMetric],
    );

    const alternatorVoltageDisplay = useMemo(
      () => getEngineDisplay(alternatorVoltageMetric, alternatorVoltage, 'ALT', 'V'),
      [alternatorVoltage, alternatorVoltageMetric],
    );

    const fuelFlowDisplay = useMemo(
      () => getEngineDisplay(fuelRateMetric, fuelRate, 'EFF', 'L/h'),
      [fuelRate, fuelRateMetric],
    );

    const engineHoursDisplay = useMemo(
      () => getEngineDisplay(hoursMetric, hours, 'EHR', 'h'),
      [hours, hoursMetric],
    );

    const shaftRpmDisplay = useMemo(
      () => getEngineDisplay(shaftRpmMetric, shaftRpm, 'SRPM', 'rpm'),
      [shaftRpm, shaftRpmMetric],
    );

    // Marine safety thresholds for engine monitoring
    const getEngineState = useCallback(
      (rpm: number | null, temp: number | null, oil: number | null) => {
        if (rpm === null && temp === null && oil === null) return 'warning';

        // Critical alarms - immediate attention required
        if (temp && temp > 100) return 'critical'; // Overheating
        if (oil && oil < 5) return 'critical'; // Low oil pressure
        if (rpm && rpm > 4200) return 'critical'; // Over-rev

        // Warning conditions
        if (temp && temp > 85) return 'warning'; // High temp warning
        if (oil && oil < 10) return 'warning'; // Low oil warning
        if (rpm && rpm > 3800) return 'warning'; // High RPM warning

        return 'normal';
      },
      [],
    );

    const engineState = getEngineState(rpm, coolantTemp, oilPressure);
    const isStale = !engineTimestamp;

    // Get alarm levels from SensorInstance (Phase 5 refactor)
    const rpmAlarmLevel = engineSensorInstance?.getAlarmState('rpm') ?? 0;
    const tempAlarmLevel = engineSensorInstance?.getAlarmState('temperature') ?? 0;
    const oilAlarmLevel = engineSensorInstance?.getAlarmState('oilPressure') ?? 0;
    const voltAlarmLevel = engineSensorInstance?.getAlarmState('alternatorVoltage') ?? 0;

    const handleLongPressOnPin = useCallback(() => {}, [id]);

    // Responsive header sizing using proper base-size scaling
    const { iconSize: headerIconSize, fontSize: headerFontSize } = useResponsiveHeader(height);

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
            name={WidgetMetadataRegistry.getMetadata('engine')?.icon || 'car-outline'}
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
            {getSensorDisplayName(
              'engine',
              instanceNumber,
              engineSensorInstance?.alarmThresholds,
              title,
            )}
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
        columns={2}
        primaryRows={2}
        secondaryRows={2}
        testID={`engine-widget-${id}`}
      >
        {/* Row 1: RPM | TEMP */}
        <PrimaryMetricCell
          data={{ ...rpmDisplay, alarmState: rpmAlarmLevel }}
          fontSize={{
            mnemonic: fontSize.label,
            value: fontSize.value,
            unit: fontSize.unit,
          }}
        />
        <PrimaryMetricCell
          data={{ ...coolantTempDisplay, alarmState: tempAlarmLevel }}
          fontSize={{
            mnemonic: fontSize.label,
            value: fontSize.value,
            unit: fontSize.unit,
          }}
        />
        {/* Row 2: OIL | VOLT */}
        <PrimaryMetricCell
          data={{ ...oilPressureDisplay, alarmState: oilAlarmLevel }}
          fontSize={{
            mnemonic: fontSize.label,
            value: fontSize.value,
            unit: fontSize.unit,
          }}
        />
        <PrimaryMetricCell
          data={{ ...alternatorVoltageDisplay, alarmState: voltAlarmLevel }}
          fontSize={{
            mnemonic: fontSize.label,
            value: fontSize.value,
            unit: fontSize.unit,
          }}
        />
        {/* Separator after row 2 */}
        {/* Row 3: Fuel Rate (spans 2 columns) */}
        <SecondaryMetricCell
          data={{ ...fuelFlowDisplay, alarmState: 0 }}
          compact={true}
          fontSize={{
            mnemonic: fontSize.label,
            value: fontSize.value,
            unit: fontSize.unit,
          }}
        />
        <SecondaryMetricCell
          data={{ ...engineHoursDisplay, alarmState: 0 }}
          compact={true}
          fontSize={{
            mnemonic: fontSize.label,
            value: fontSize.value,
            unit: fontSize.unit,
          }}
        />

        {/* Row 4: Shaft RPM (spans 2 columns) */}
        <SecondaryMetricCell
          data={{ ...shaftRpmDisplay, alarmState: 0 }}
          compact={true}
          fontSize={{
            mnemonic: fontSize.label,
            value: fontSize.value,
            unit: fontSize.unit,
          }}
        />
        <View />
      </UnifiedWidgetGrid>
    );
  },
);

export default EngineWidget;
