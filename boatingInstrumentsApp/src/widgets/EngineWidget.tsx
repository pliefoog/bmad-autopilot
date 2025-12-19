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

    // NMEA data selectors - Phase 1 Optimization: Selective field subscriptions with shallow equality
    const rpm = useNmeaStore(
      (state) => state.nmeaData.sensors.engine?.[instanceNumber]?.rpm ?? null,
      (a, b) => a === b,
    );
    const coolantTemp = useNmeaStore(
      (state) => state.nmeaData.sensors.engine?.[instanceNumber]?.coolantTemp ?? null,
      (a, b) => a === b,
    );
    const oilPressure = useNmeaStore(
      (state) => state.nmeaData.sensors.engine?.[instanceNumber]?.oilPressure ?? null,
      (a, b) => a === b,
    );
    const alternatorVoltage = useNmeaStore(
      (state) => state.nmeaData.sensors.engine?.[instanceNumber]?.alternatorVoltage ?? null,
      (a, b) => a === b,
    );
    const fuelFlow = useNmeaStore(
      (state) => state.nmeaData.sensors.engine?.[instanceNumber]?.fuelFlow ?? null,
      (a, b) => a === b,
    );
    const engineHours = useNmeaStore(
      (state) => state.nmeaData.sensors.engine?.[instanceNumber]?.engineHours ?? null,
      (a, b) => a === b,
    );
    const engineTimestamp = useNmeaStore(
      (state) => state.nmeaData.sensors.engine?.[instanceNumber]?.timestamp,
      (a, b) => a === b,
    );
    const engineSensorData = useNmeaStore(
      (state) => state.nmeaData.sensors.engine?.[instanceNumber],
      (a, b) => a === b,
    );

    // NEW: Use cached display info from sensor.display (Phase 3 migration)
    // Helper function to create MetricDisplayData from sensor display
    const getEngineDisplay = useCallback(
      (
        displayInfo: any,
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
            rawValue: 0,
            layout: {
              minWidth: 60,
              alignment: 'right',
            },
            presentation: {
              id: 'default',
              name: engineMnemonic,
              pattern: 'xxx',
            },
            status: {
              isValid: false,
              error: 'No data',
              isFallback: true,
            },
          };
        }

        return {
          mnemonic: engineMnemonic,
          value: displayInfo?.value ?? (value !== null ? value.toFixed(1) : '---'),
          unit: displayInfo?.unit ?? fallbackSymbol,
          rawValue: value,
          layout: {
            minWidth: 60,
            alignment: 'right',
          },
          presentation: {
            id: 'engine',
            name: engineMnemonic,
            pattern: 'xxx.x',
          },
          status: {
            isValid: true,
            isFallback: false,
          },
        };
      },
      [],
    );

    // Engine display values using sensor.display cache
    const rpmDisplay = useMemo(
      () => getEngineDisplay(engineSensorData?.display?.rpm, rpm, 'RPM', 'rpm'),
      [rpm, getEngineDisplay, engineSensorData],
    );

    const coolantTempDisplay = useMemo(
      () => getEngineDisplay(engineSensorData?.display?.temperature, coolantTemp, 'ECT', '°C'),
      [coolantTemp, getEngineDisplay, engineSensorData],
    );

    const oilPressureDisplay = useMemo(
      () => getEngineDisplay(engineSensorData?.display?.oilPressure, oilPressure, 'EOP', 'bar'),
      [oilPressure, getEngineDisplay, engineSensorData],
    );

    const alternatorVoltageDisplay = useMemo(
      () => getEngineDisplay(engineSensorData?.display?.alternatorVoltage, alternatorVoltage, 'ALT', 'V'),
      [alternatorVoltage, getEngineDisplay, engineSensorData],
    );

    const fuelFlowDisplay = useMemo(
      () => getEngineDisplay(engineSensorData?.display?.fuelRate, fuelFlow, 'EFF', 'L/h'),
      [fuelFlow, getEngineDisplay, engineSensorData],
    );

    const engineHoursDisplay = useMemo(
      () => getEngineDisplay(engineSensorData?.display?.hours, engineHours, 'EHR', 'h'),
      [engineHours, getEngineDisplay, engineSensorData],
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

    // Individual metric state functions for PrimaryMetricCell
    const getRpmState = useCallback(() => {
      if (rpm === null) return 'normal';
      if (rpm > 4200) return 'alarm';
      if (rpm > 3800) return 'warning';
      return 'normal';
    }, [rpm]);

    const getTempState = useCallback(() => {
      if (coolantTemp === null) return 'normal';
      if (coolantTemp > 100) return 'alarm';
      if (coolantTemp > 85) return 'warning';
      return 'normal';
    }, [coolantTemp]);

    const getOilState = useCallback(() => {
      if (oilPressure === null) return 'normal';
      if (oilPressure < 5) return 'alarm';
      if (oilPressure < 10) return 'warning';
      return 'normal';
    }, [oilPressure]);

    const getVoltState = useCallback(() => {
      if (alternatorVoltage === null) return 'normal';
      if (alternatorVoltage < 11.8 || alternatorVoltage > 14.8) return 'warning';
      if (alternatorVoltage < 11.0 || alternatorVoltage > 15.5) return 'alarm';
      return 'normal';
    }, [alternatorVoltage]);

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
              engineSensorData?.alarmThresholds,
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
          data={rpmDisplay}
          state={getRpmState()}
          fontSize={{
            mnemonic: fontSize.label,
            value: fontSize.value,
            unit: fontSize.unit,
          }}
        />
        <PrimaryMetricCell
          data={coolantTempDisplay}
          state={getTempState()}
          fontSize={{
            mnemonic: fontSize.label,
            value: fontSize.value,
            unit: fontSize.unit,
          }}
        />
        {/* Row 2: OIL | VOLT */}
        <PrimaryMetricCell
          data={oilPressureDisplay}
          state={getOilState()}
          fontSize={{
            mnemonic: fontSize.label,
            value: fontSize.value,
            unit: fontSize.unit,
          }}
        />
        <PrimaryMetricCell
          data={alternatorVoltageDisplay}
          state={getVoltState()}
          fontSize={{
            mnemonic: fontSize.label,
            value: fontSize.value,
            unit: fontSize.unit,
          }}
        />
        {/* Separator after row 2 */}
        {/* Row 3: Fuel Rate (spans 2 columns) */}
        <SecondaryMetricCell
          data={fuelFlowDisplay}
          state="normal"
          compact={true}
          fontSize={{
            mnemonic: fontSize.label,
            value: fontSize.value,
            unit: fontSize.unit,
          }}
        />
        <SecondaryMetricCell
          data={engineHoursDisplay}
          state="normal"
          compact={true}
          fontSize={{
            mnemonic: fontSize.label,
            value: fontSize.value,
            unit: fontSize.unit,
          }}
        />

        {/* Row 4: Empty space for consistent 4-row layout */}
        <View />
        <View />
      </UnifiedWidgetGrid>
    );
  },
);

export default EngineWidget;
