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

    // NMEA data - Read SensorInstance once, then extract all metrics
    const batterySensorInstance = useNmeaStore(
      (state) => state.nmeaData.sensors.battery?.[instanceNumber],
      (a, b) => a === b,
    );

    // Extract all metrics from SensorInstance
    const voltageMetric = batterySensorInstance?.getMetric('voltage');
    const voltage = voltageMetric?.si_value ?? null;

    const nominalVoltageMetric = batterySensorInstance?.getMetric('nominalVoltage');
    const nominalVoltage = nominalVoltageMetric?.si_value ?? null;

    const currentMetric = batterySensorInstance?.getMetric('current');
    const current = currentMetric?.si_value ?? null;

    const temperatureMetric = batterySensorInstance?.getMetric('temperature');
    const temperature = temperatureMetric?.si_value ?? null;

    const stateOfChargeMetric = batterySensorInstance?.getMetric('soc');
    const stateOfCharge = stateOfChargeMetric?.si_value ?? null;

    const capacityMetric = batterySensorInstance?.getMetric('capacity');
    const capacity = capacityMetric?.si_value ?? null;

    // batteryChemistry is a text config field (no category, not numeric)
    const chemistry = batterySensorInstance?.getMetric('batteryChemistry')?.si_value ?? null;

    const batteryTimestamp = batterySensorInstance?.timestamp;

    // Helper function to create MetricDisplayData from MetricValue
    const getBatteryDisplay = useCallback(
      (
        metric: any,
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

        if (metric) {
          return {
            mnemonic: batteryMnemonic,
            value: metric.formattedValue,
            unit: metric.unit,
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
        }

        return {
          mnemonic: batteryMnemonic,
          value: '---',
          unit: fallbackSymbol,
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
            isValid: false,
            error: 'No metric',
            isFallback: true,
          },
        };
      },
      [],
    );

    // Battery display values with proper NMEA mnemonics using MetricValue
    const voltageDisplay = useMemo(
      () => getBatteryDisplay(voltageMetric, voltage, 'VLT', 'V'),
      [voltage, voltageMetric, getBatteryDisplay],
    );

    const nominalVoltageDisplay = useMemo(
      () => getBatteryDisplay(nominalVoltageMetric, nominalVoltage, 'NOM', 'V'),
      [nominalVoltage, nominalVoltageMetric, getBatteryDisplay],
    );

    const currentDisplay = useMemo(
      () => getBatteryDisplay(currentMetric, current, 'AMP', 'A'),
      [current, currentMetric, getBatteryDisplay],
    );

    const temperatureDisplay = useMemo(
      () => getBatteryDisplay(temperatureMetric, temperature, 'TMP', '°C'),
      [temperature, temperatureMetric, getBatteryDisplay],
    );

    const stateOfChargeDisplay = useMemo(() => {
      if (stateOfCharge === null) {
        return {
          mnemonic: 'SOC',
          value: '---',
          unit: '%',
          rawValue: 0,
          layout: { minWidth: 60, alignment: 'right' },
          presentation: { id: 'battery', name: 'SOC', pattern: 'xxx' },
          status: { isValid: false, error: 'No data', isFallback: true },
        };
      }
      // SOC has no category (raw percentage), but might have metric for formatting
      if (stateOfChargeMetric) {
        return {
          mnemonic: 'SOC',
          value: stateOfChargeMetric.formattedValue,
          unit: '%',
          rawValue: stateOfCharge,
          layout: { minWidth: 60, alignment: 'right' },
          presentation: { id: 'battery', name: 'SOC', pattern: 'xxx' },
          status: { isValid: true, isFallback: false },
        };
      }
      return {
        mnemonic: 'SOC',
        value: String(Math.round(stateOfCharge)),
        unit: '%',
        rawValue: stateOfCharge,
        layout: { minWidth: 60, alignment: 'right' },
        presentation: { id: 'battery', name: 'SOC', pattern: 'xxx' },
        status: { isValid: true, isFallback: false },
      };
    }, [stateOfCharge, stateOfChargeMetric]);

    const capacityDisplay = useMemo(() => {
      if (capacity === null) {
        return {
          mnemonic: 'CAP',
          value: '---',
          unit: 'Ah',
          rawValue: 0,
          layout: { minWidth: 60, alignment: 'right' },
          presentation: { id: 'battery', name: 'CAP', pattern: 'xxx' },
          status: { isValid: false, error: 'No data', isFallback: true },
        };
      }
      // Capacity has category, use metric if available
      if (capacityMetric) {
        return {
          mnemonic: 'CAP',
          value: capacityMetric.formattedValue,
          unit: capacityMetric.unit,
          rawValue: capacity,
          layout: { minWidth: 60, alignment: 'right' },
          presentation: { id: 'battery', name: 'CAP', pattern: 'xxx' },
          status: { isValid: true, isFallback: false },
        };
      }
      return {
        mnemonic: 'CAP',
        value: String(Math.round(capacity)),
        unit: 'Ah',
        rawValue: capacity,
        layout: { minWidth: 60, alignment: 'right' },
        presentation: { id: 'battery', name: 'CAP', pattern: 'xxx' },
        status: { isValid: true, isFallback: false },
      };
    }, [capacity, capacityMetric]);

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
              batterySensorInstance?.alarmThresholds,
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
          data={stateOfChargeDisplay}
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
          mnemonic={nominalVoltageDisplay.mnemonic}
          value={nominalVoltageDisplay.value}
          unit={nominalVoltageDisplay.unit}
          state="normal"
          compact={true}
          fontSize={{
            mnemonic: fontSize.label,
            value: fontSize.value,
            unit: fontSize.unit,
          }}
        />
        <SecondaryMetricCell
          mnemonic={capacityDisplay.mnemonic}
          value={capacityDisplay.value}
          unit={capacityDisplay.unit}
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
