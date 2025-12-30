import React, { useMemo } from 'react';
import { View, Text } from 'react-native';
import { useNmeaStore } from '../store/nmeaStore';
import { useTheme } from '../store/themeStore';
import PrimaryMetricCell from '../components/PrimaryMetricCell';
import SecondaryMetricCell from '../components/SecondaryMetricCell';
import UniversalIcon from '../components/atoms/UniversalIcon';
import { WidgetMetadataRegistry } from '../registry/WidgetMetadataRegistry';
import { useResponsiveFontSize } from '../hooks/useResponsiveFontSize';
import { useResponsiveHeader } from '../hooks/useResponsiveHeader';
import { UnifiedWidgetGrid } from '../components/UnifiedWidgetGrid';
import { getSensorDisplayName } from '../utils/sensorDisplayName';
import { createMetricDisplay } from '../utils/metricDisplayHelpers';

interface BatteryWidgetProps {
  id: string;
  title: string;
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
  ({ id, title, width, height }) => {
    const theme = useTheme();
    const fontSize = useResponsiveFontSize(width || 0, height || 0);

    // Extract battery instance from widget ID (e.g., "battery-0", "battery-1")
    const instanceNumber = useMemo(() => {
      const match = id.match(/battery-(\d+)/);
      return match ? parseInt(match[1], 10) : 0;
    }, [id]);

    // NMEA data - Read SensorInstance once, then extract all metrics
    const batterySensorInstance = useNmeaStore(
      (state) => state.nmeaData.sensors.battery?.[instanceNumber]
    );

    // PERFORMANCE: Cache all metrics in single useMemo (reduces multiple timestamp dependencies)
    const metrics = useMemo(() => {
      if (!batterySensorInstance) return null;
      
      return {
        voltage: batterySensorInstance.getMetric('voltage'),
        nominalVoltage: batterySensorInstance.getMetric('nominalVoltage'),
        current: batterySensorInstance.getMetric('current'),
        temperature: batterySensorInstance.getMetric('temperature'),
        stateOfCharge: batterySensorInstance.getMetric('stateOfCharge'),
        capacity: batterySensorInstance.getMetric('capacity'),
        chemistry: batterySensorInstance.getMetric('chemistry')?.si_value ?? null,
        // Extract alarm states
        voltageAlarm: batterySensorInstance.getAlarmState('voltage') ?? 0,
        currentAlarm: batterySensorInstance.getAlarmState('current') ?? 0,
        temperatureAlarm: batterySensorInstance.getAlarmState('temperature') ?? 0,
        socAlarm: batterySensorInstance.getAlarmState('stateOfCharge') ?? 0,
      };
    }, [batterySensorInstance?.timestamp]);

    // Battery display values using shared createMetricDisplay utility
    const displays = useMemo(() => {
      if (!metrics) {
        return {
          voltage: createMetricDisplay('VLT', undefined, undefined, 0, { minWidth: 60, alignment: 'right' }),
          nominalVoltage: createMetricDisplay('NOM', undefined, undefined, 0, { minWidth: 60, alignment: 'right' }),
          current: createMetricDisplay('AMP', undefined, undefined, 0, { minWidth: 60, alignment: 'right' }),
          temperature: createMetricDisplay('TMP', undefined, undefined, 0, { minWidth: 60, alignment: 'right' }),
          stateOfCharge: createMetricDisplay('SOC', undefined, undefined, 0, { minWidth: 60, alignment: 'right' }),
          capacity: createMetricDisplay('CAP', undefined, undefined, 0, { minWidth: 60, alignment: 'right' }),
        };
      }
      
      return {
        voltage: createMetricDisplay('VLT', metrics.voltage?.formattedValue, metrics.voltage?.unit, metrics.voltageAlarm, { minWidth: 60, alignment: 'right' }),
        nominalVoltage: createMetricDisplay('NOM', metrics.nominalVoltage?.formattedValue, metrics.nominalVoltage?.unit, 0, { minWidth: 60, alignment: 'right' }),
        current: createMetricDisplay('AMP', metrics.current?.formattedValue, metrics.current?.unit, metrics.currentAlarm, { minWidth: 60, alignment: 'right' }),
        temperature: createMetricDisplay('TMP', metrics.temperature?.formattedValue, metrics.temperature?.unit, metrics.temperatureAlarm, { minWidth: 60, alignment: 'right' }),
        stateOfCharge: createMetricDisplay('SOC', metrics.stateOfCharge?.formattedValue, metrics.stateOfCharge?.unit, metrics.socAlarm, { minWidth: 60, alignment: 'right' }),
        capacity: createMetricDisplay('CAP', metrics.capacity?.formattedValue, metrics.capacity?.unit, 0, { minWidth: 60, alignment: 'right' }),
      };
    }, [metrics]);

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
              undefined, // TODO: SensorInstance doesn't expose configuration
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
          data={displays.voltage}
          fontSize={{
            mnemonic: fontSize.label,
            value: fontSize.value,
            unit: fontSize.unit,
          }}
        />
        <PrimaryMetricCell
          data={displays.current}
          fontSize={{
            mnemonic: fontSize.label,
            value: fontSize.value,
            unit: fontSize.unit,
          }}
        />
        {/* Row 2: TEMP | SOC */}
        <PrimaryMetricCell
          data={displays.temperature}
          fontSize={{
            mnemonic: fontSize.label,
            value: fontSize.value,
            unit: fontSize.unit,
          }}
        />
        <PrimaryMetricCell
          data={displays.stateOfCharge}
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
            mnemonic: displays.nominalVoltage.mnemonic,
            value: displays.nominalVoltage.value,
            unit: displays.nominalVoltage.unit,
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
            mnemonic: displays.capacity.mnemonic,
            value: displays.capacity.value,
            unit: displays.capacity.unit,
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
            value: metrics?.chemistry || 'Unknown',
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
