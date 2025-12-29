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

    // PERFORMANCE: Cache MetricValue objects with timestamp-based dependencies (fine-grained)
    const voltageMetric = useMemo(
      () => batterySensorInstance?.getMetric('voltage'),
      [batterySensorInstance?.timestamp],
    );
    const voltage = voltageMetric?.si_value ?? null;

    const nominalVoltageMetric = useMemo(
      () => batterySensorInstance?.getMetric('nominalVoltage'),
      [batterySensorInstance?.timestamp],
    );
    const nominalVoltage = nominalVoltageMetric?.si_value ?? null;

    const currentMetric = useMemo(
      () => batterySensorInstance?.getMetric('current'),
      [batterySensorInstance?.timestamp],
    );
    const current = currentMetric?.si_value ?? null;

    const temperatureMetric = useMemo(
      () => batterySensorInstance?.getMetric('temperature'),
      [batterySensorInstance?.timestamp],
    );
    const temperature = temperatureMetric?.si_value ?? null;

    const stateOfChargeMetric = useMemo(
      () => batterySensorInstance?.getMetric('soc'),
      [batterySensorInstance?.timestamp],
    );
    const stateOfCharge = stateOfChargeMetric?.si_value ?? null;

    const capacityMetric = useMemo(
      () => batterySensorInstance?.getMetric('capacity'),
      [batterySensorInstance?.timestamp],
    );
    const capacity = capacityMetric?.si_value ?? null;

    // batteryChemistry is a text config field (no unitType, not numeric)
    const chemistry = batterySensorInstance?.getMetric('batteryChemistry')?.si_value ?? null;

    const batteryTimestamp = batterySensorInstance?.timestamp;

    // Extract alarm levels for battery metrics
    const voltageAlarmLevel = batterySensorInstance?.getAlarmState('voltage') ?? 0;
    const currentAlarmLevel = batterySensorInstance?.getAlarmState('current') ?? 0;
    const temperatureAlarmLevel = batterySensorInstance?.getAlarmState('temperature') ?? 0;
    const socAlarmLevel = batterySensorInstance?.getAlarmState('soc') ?? 0;

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
            alarmState: 0,
            layout: {
              minWidth: 60,
              alignment: 'right',
            },
          };
        }

        if (metric) {
          return {
            mnemonic: batteryMnemonic,
            value: metric.formattedValue,
            unit: metric.unit,
            alarmState: 0,
            layout: {
              minWidth: 60,
              alignment: 'right',
            },
          };
        }

        return {
          mnemonic: batteryMnemonic,
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

    // Battery display values with proper NMEA mnemonics using MetricValue
    const voltageDisplay = useMemo(
      () => getBatteryDisplay(voltageMetric, voltage, 'VLT', 'V'),
      [voltage, voltageMetric],
    );

    const nominalVoltageDisplay = useMemo(
      () => getBatteryDisplay(nominalVoltageMetric, nominalVoltage, 'NOM', 'V'),
      [nominalVoltage, nominalVoltageMetric],
    );

    const currentDisplay = useMemo(
      () => getBatteryDisplay(currentMetric, current, 'AMP', 'A'),
      [current, currentMetric],
    );

    const temperatureDisplay = useMemo(
      () => getBatteryDisplay(temperatureMetric, temperature, 'TMP', '°C'),
      [temperature, temperatureMetric],
    );

    const stateOfChargeDisplay = useMemo(() => {
      if (stateOfCharge === null) {
        return {
          mnemonic: 'SOC',
          value: '---',
          unit: '%',
          alarmState: 0,
          layout: { minWidth: 60, alignment: 'right' },
        };
      }
      // SOC has no category (raw percentage), but might have metric for formatting
      if (stateOfChargeMetric) {
        return {
          mnemonic: 'SOC',
          value: stateOfChargeMetric.formattedValue,
          unit: '%',
          alarmState: 0,
          layout: { minWidth: 60, alignment: 'right' },
        };
      }
      return {
        mnemonic: 'SOC',
        value: String(Math.round(stateOfCharge)),
        unit: '%',
        alarmState: 0,
        layout: { minWidth: 60, alignment: 'right' },
      };
    }, [stateOfCharge, stateOfChargeMetric]);

    const capacityDisplay = useMemo(() => {
      if (capacity === null) {
        return {
          mnemonic: 'CAP',
          value: '---',
          unit: 'Ah',
          alarmState: 0,
          layout: { minWidth: 60, alignment: 'right' },
        };
      }
      // Capacity has category, use metric if available
      if (capacityMetric) {
        return {
          mnemonic: 'CAP',
          value: capacityMetric.formattedValue,
          unit: capacityMetric.unit,
          alarmState: 0,
          layout: { minWidth: 60, alignment: 'right' },
        };
      }
      return {
        mnemonic: 'CAP',
        value: String(Math.round(capacity)),
        unit: 'Ah',
        alarmState: 0,
        layout: { minWidth: 60, alignment: 'right' },
      };
    }, [capacity, capacityMetric]);

    const isStale = !batteryTimestamp || voltage === null;

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
          data={{ ...voltageDisplay, alarmState: voltageAlarmLevel }}
          fontSize={{
            mnemonic: fontSize.label,
            value: fontSize.value,
            unit: fontSize.unit,
          }}
        />
        <PrimaryMetricCell
          data={{ ...currentDisplay, alarmState: currentAlarmLevel }}
          fontSize={{
            mnemonic: fontSize.label,
            value: fontSize.value,
            unit: fontSize.unit,
          }}
        />
        {/* Row 2: TEMP | SOC */}
        <PrimaryMetricCell
          data={{ ...temperatureDisplay, alarmState: temperatureAlarmLevel }}
          fontSize={{
            mnemonic: fontSize.label,
            value: fontSize.value,
            unit: fontSize.unit,
          }}
        />
        <PrimaryMetricCell
          data={{ ...stateOfChargeDisplay, alarmState: socAlarmLevel }}
          fontSize={{
            mnemonic: fontSize.label,
            value: fontSize.value,
            unit: fontSize.unit,
          }}
        />
        {/* Separator after row 2 */}
        {/* Row 3: NOM | CAP */}
        <SecondaryMetricCell
          data={{
            mnemonic: nominalVoltageDisplay.mnemonic,
            value: nominalVoltageDisplay.value,
            unit: nominalVoltageDisplay.unit,
          }}
          state="normal"
          compact={true}
          fontSize={{
            mnemonic: fontSize.label,
            value: fontSize.value,
            unit: fontSize.unit,
          }}
        />
        <SecondaryMetricCell
          data={{
            mnemonic: capacityDisplay.mnemonic,
            value: capacityDisplay.value,
            unit: capacityDisplay.unit,
          }}
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
          data={{
            mnemonic: 'CHEM',
            value: chemistry || 'Unknown',
            unit: '',
          }}
          state="normal"
          compact={true}
          fontSize={{
            mnemonic: fontSize.label,
            value: fontSize.value,
            unit: fontSize.unit,
          }}
        />
        <SecondaryMetricCell
          data={{
            mnemonic: 'INST',
            value: `#${instanceNumber}`,
            unit: '',
          }}
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
