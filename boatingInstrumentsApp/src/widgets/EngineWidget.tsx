import React, { useState, useMemo } from 'react';
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
import { createMetricDisplay } from '../utils/metricDisplayHelpers';

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

    const coolantTempMetric = useMemo(
      () => engineSensorInstance?.getMetric('coolantTemp'),
      [engineSensorInstance?.timestamp],
    );

    const oilPressureMetric = useMemo(
      () => engineSensorInstance?.getMetric('oilPressure'),
      [engineSensorInstance?.timestamp],
    );

    const alternatorVoltageMetric = useMemo(
      () => engineSensorInstance?.getMetric('alternatorVoltage'),
      [engineSensorInstance?.timestamp],
    );

    const fuelRateMetric = useMemo(
      () => engineSensorInstance?.getMetric('fuelRate'),
      [engineSensorInstance?.timestamp],
    );

    const hoursMetric = useMemo(
      () => engineSensorInstance?.getMetric('hours'),
      [engineSensorInstance?.timestamp],
    );

    const shaftRpmMetric = useMemo(
      () => engineSensorInstance?.getMetric('shaftRpm'),
      [engineSensorInstance?.timestamp],
    );

    // Engine display values using shared createMetricDisplay utility
    const rpmDisplay = useMemo(
      () => createMetricDisplay('RPM', rpmMetric?.formattedValue, rpmMetric?.unit, 0, { minWidth: 60, alignment: 'right' }),
      [rpmMetric],
    );

    const coolantTempDisplay = useMemo(
      () => createMetricDisplay('ECT', coolantTempMetric?.formattedValue, coolantTempMetric?.unit, 0, { minWidth: 60, alignment: 'right' }),
      [coolantTempMetric],
    );

    const oilPressureDisplay = useMemo(
      () => createMetricDisplay('EOP', oilPressureMetric?.formattedValue, oilPressureMetric?.unit, 0, { minWidth: 60, alignment: 'right' }),
      [oilPressureMetric],
    );

    const alternatorVoltageDisplay = useMemo(
      () => createMetricDisplay('ALT', alternatorVoltageMetric?.formattedValue, alternatorVoltageMetric?.unit, 0, { minWidth: 60, alignment: 'right' }),
      [alternatorVoltageMetric],
    );

    const fuelFlowDisplay = useMemo(
      () => createMetricDisplay('EFF', fuelRateMetric?.formattedValue, fuelRateMetric?.unit, 0, { minWidth: 60, alignment: 'right' }),
      [fuelRateMetric],
    );

    const engineHoursDisplay = useMemo(
      () => createMetricDisplay('EHR', hoursMetric?.formattedValue, hoursMetric?.unit, 0, { minWidth: 60, alignment: 'right' }),
      [hoursMetric],
    );

    const shaftRpmDisplay = useMemo(
      () => createMetricDisplay('SRPM', shaftRpmMetric?.formattedValue, shaftRpmMetric?.unit, 0, { minWidth: 60, alignment: 'right' }),
      [shaftRpmMetric],
    );

    const isStale = !engineSensorInstance?.timestamp;

    // Get alarm levels from SensorInstance (Phase 5 refactor)
    const rpmAlarmLevel = engineSensorInstance?.getAlarmState('rpm') ?? 0;
    const tempAlarmLevel = engineSensorInstance?.getAlarmState('temperature') ?? 0;
    const oilAlarmLevel = engineSensorInstance?.getAlarmState('oilPressure') ?? 0;
    const voltAlarmLevel = engineSensorInstance?.getAlarmState('alternatorVoltage') ?? 0;

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
