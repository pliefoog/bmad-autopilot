import React, { useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useNmeaStore } from '../store/nmeaStore';
import { useTheme } from '../store/themeStore';
import { useWidgetStore } from '../store/widgetStore';
import { MetricDisplayData } from '../types/MetricDisplayData';
import PrimaryMetricCell from '../components/PrimaryMetricCell';
import SecondaryMetricCell from '../components/SecondaryMetricCell';
import UniversalIcon from '../components/atoms/UniversalIcon';
import { WidgetMetadataRegistry } from '../registry/WidgetMetadataRegistry';
import { useResponsiveFontSize } from '../hooks/useResponsiveFontSize';
import { useResponsiveHeader } from '../hooks/useResponsiveHeader';
import { UnifiedWidgetGrid } from '../components/UnifiedWidgetGrid';
import { getSensorDisplayName } from '../utils/sensorDisplayName';

interface BatteryWidgetProps {
  id: string;
  title: string;
  batteryInstance?: string; // 'house', 'engine', 'thruster', etc.
  width?: number; // Widget width for responsive scaling
  height?: number; // Widget height for responsive scaling
}

/**
 * Battery Widget - Multi-Instance Battery Display per ui-architecture.md v2.3
 * Primary Grid (2×2): VOLT, CURR, TEMP, SOC
 * Secondary Grid (2×2): Nominal Voltage, Capacity, Chemistry, Status
 * Supports multi-instance detection via NMEA battery instances
 */
export const BatteryWidget: React.FC<BatteryWidgetProps> = React.memo(
  ({ id, title, batteryInstance = 'house', width, height }) => {
    const theme = useTheme();
    const fontSize = useResponsiveFontSize(width || 0, height || 0);

    // Extract battery instance from widget ID (e.g., "battery-0", "battery-1")
    const instanceNumber = useMemo(() => {
      const match = id.match(/battery-(\d+)/);
      return match ? parseInt(match[1], 10) : 0;
    }, [id]);

    // Widget state management

    // NMEA data selectors - Phase 1 Optimization: Selective field subscriptions with shallow equality
    const voltage = useNmeaStore(
      (state) => state.nmeaData.sensors.battery?.[instanceNumber]?.voltage ?? null,
      (a, b) => a === b,
    );
    const current = useNmeaStore(
      (state) => state.nmeaData.sensors.battery?.[instanceNumber]?.current ?? null,
      (a, b) => a === b,
    );
    const temperature = useNmeaStore(
      (state) => state.nmeaData.sensors.battery?.[instanceNumber]?.temperature ?? null,
      (a, b) => a === b,
    );
    const stateOfCharge = useNmeaStore(
      (state) => state.nmeaData.sensors.battery?.[instanceNumber]?.stateOfCharge ?? null,
      (a, b) => a === b,
    );
    const nominalVoltage = useNmeaStore(
      (state) => state.nmeaData.sensors.battery?.[instanceNumber]?.nominalVoltage ?? null,
      (a, b) => a === b,
    );
    const capacity = useNmeaStore(
      (state) => state.nmeaData.sensors.battery?.[instanceNumber]?.capacity ?? null,
      (a, b) => a === b,
    );
    const chemistry = useNmeaStore(
      (state) => state.nmeaData.sensors.battery?.[instanceNumber]?.chemistry ?? null,
      (a, b) => a === b,
    );
    const batteryTimestamp = useNmeaStore(
      (state) => state.nmeaData.sensors.battery?.[instanceNumber]?.timestamp,
      (a, b) => a === b,
    );
    const batterySensorData = useNmeaStore(
      (state) => state.nmeaData.sensors.battery?.[instanceNumber],
      (a, b) => a === b,
    );

    // NEW: Use cached display info from sensor.display (Phase 3 migration)
    // Helper function to create MetricDisplayData from sensor display
    const getBatteryDisplay = useCallback(
      (
        displayInfo: any,
        value: number | null,
        batteryMnemonic: string,
        fallbackSymbol: string = '',
      ): MetricDisplayData => {
        if (value === null) {
          return {
            mnemonic: batteryMnemonic,
            value: '---',
            unit: fallbackSymbol,
            rawValue: 0,
            layout: {
              minWidth: 60,
              alignment: 'right',
            },
            presentation: {
              id: 'default',
              name: batteryMnemonic,
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
          mnemonic: batteryMnemonic,
          value: displayInfo?.value ?? (value !== null ? value.toFixed(1) : '---'),
          unit: displayInfo?.unit ?? fallbackSymbol,
          rawValue: value,
          layout: {
            minWidth: 60,
            alignment: 'right',
          },
          presentation: {
            id: 'battery',
            name: batteryMnemonic,
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

    // Battery display values with proper NMEA mnemonics using sensor.display cache
    const voltageDisplay = useMemo(
      () => getBatteryDisplay(batterySensorData?.display?.voltage, voltage, 'VLT', 'V'),
      [voltage, getBatteryDisplay, batterySensorData],
    );

    const currentDisplay = useMemo(
      () => getBatteryDisplay(
        batterySensorData?.display?.current,
        current !== null ? Math.abs(current) : null,
        'AMP',
        'A',
      ),
      [current, getBatteryDisplay, batterySensorData],
    );

    const temperatureDisplay = useMemo(
      () => getBatteryDisplay(batterySensorData?.display?.temperature, temperature, 'TMP', '°C'),
      [temperature, getBatteryDisplay, batterySensorData],
    );

    const nominalVoltageDisplay = useMemo(
      () => getBatteryDisplay(batterySensorData?.display?.voltage, nominalVoltage, 'NOM', 'V'),
      [nominalVoltage, getBatteryDisplay, batterySensorData],
    );

    const isStale = !batteryTimestamp || voltage === null;

    // Marine safety thresholds for battery monitoring
    const getBatteryState = useCallback((voltage: number | null, soc: number | null) => {
      if (voltage === null) return 'warning';

      // Critical conditions for marine batteries
      if (voltage < 10.5) return 'alarm'; // Deep discharge danger
      if (voltage < 11.8) return 'warning'; // Low battery warning
      if (voltage > 15.0) return 'alarm'; // Dangerous overcharge
      if (voltage > 14.8) return 'warning'; // Overcharge warning

      // State of charge warnings (if available)
      if (soc !== null) {
        if (soc < 20) return 'warning'; // Low SOC
        if (soc < 10) return 'alarm'; // Critical SOC
      }

      return 'normal';
    }, []);

    // Individual metric states for enhanced monitoring
    const getVoltageState = useCallback(
      () => getBatteryState(voltage, stateOfCharge),
      [voltage, stateOfCharge, getBatteryState],
    );

    const getCurrentState = useCallback(() => {
      if (current === null) return 'normal';
      if (Math.abs(current) > 100) return 'warning'; // High current draw/charge
      if (Math.abs(current) > 200) return 'alarm'; // Dangerous current
      return 'normal';
    }, [current]);

    const getTempState = useCallback(() => {
      if (temperature === null) return 'normal';
      if (temperature > 50) return 'alarm'; // Dangerous temperature
      if (temperature > 40) return 'warning'; // High temperature
      if (temperature < 0) return 'warning'; // Freezing
      return 'normal';
    }, [temperature]);

    const getSOCState = useCallback(() => {
      if (stateOfCharge === null) return 'normal';
      if (stateOfCharge < 10) return 'alarm'; // Critical SOC
      if (stateOfCharge < 20) return 'warning'; // Low SOC
      return 'normal';
    }, [stateOfCharge]);

    const batteryState = getBatteryState(voltage, stateOfCharge);

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
            name={WidgetMetadataRegistry.getMetadata('battery')?.icon || 'battery-charging-outline'}
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
              'battery',
              instanceNumber,
              batterySensorData?.alarmThresholds,
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
        testID={`battery-widget-${id}`}
      >
        {/* Row 1: VOLT | CURR */}
        <PrimaryMetricCell
          data={voltageDisplay}
          state={getVoltageState()}
          fontSize={{
            mnemonic: fontSize.label,
            value: fontSize.value,
            unit: fontSize.unit,
          }}
        />
        <PrimaryMetricCell
          data={currentDisplay}
          state={getCurrentState()}
          fontSize={{
            mnemonic: fontSize.label,
            value: fontSize.value,
            unit: fontSize.unit,
          }}
        />
        {/* Row 2: TEMP | SOC */}
        <PrimaryMetricCell
          data={temperatureDisplay}
          state={getTempState()}
          fontSize={{
            mnemonic: fontSize.label,
            value: fontSize.value,
            unit: fontSize.unit,
          }}
        />
        <PrimaryMetricCell
          mnemonic="SOC"
          value={stateOfCharge !== null ? `${stateOfCharge.toFixed(0)}%` : '---'}
          unit="%"
          state={getSOCState()}
          fontSize={{
            mnemonic: fontSize.label,
            value: fontSize.value,
            unit: fontSize.unit,
          }}
        />
        {/* Separator after row 2 */}
        {/* Row 3: NOM | CAP */}
        <SecondaryMetricCell
          mnemonic="NOM"
          value={nominalVoltage !== null ? nominalVoltage.toFixed(1) : '---'}
          unit="V"
          state="normal"
          compact={true}
          fontSize={{
            mnemonic: fontSize.label,
            value: fontSize.value,
            unit: fontSize.unit,
          }}
        />
        <SecondaryMetricCell
          mnemonic="CAP"
          value={capacity !== null ? capacity.toFixed(0) : '---'}
          unit="Ah"
          state="normal"
          compact={true}
          fontSize={{
            mnemonic: fontSize.label,
            value: fontSize.value,
            unit: fontSize.unit,
          }}
        />
        {/* Row 4: CHEM | INST */}
        <SecondaryMetricCell
          mnemonic="CHEM"
          value={chemistry || 'Unknown'}
          unit=""
          state="normal"
          compact={true}
          fontSize={{
            mnemonic: fontSize.label,
            value: fontSize.value,
            unit: fontSize.unit,
          }}
        />
        <SecondaryMetricCell
          mnemonic="INST"
          value={`#${instanceNumber}`}
          unit=""
          state="normal"
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

export default BatteryWidget;
