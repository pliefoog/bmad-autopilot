import React, { useMemo } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { useNmeaStore } from '../store/nmeaStore';
import { useTheme } from '../store/themeStore';
import { useWidgetStore } from '../store/widgetStore';
import { useMetricDisplay } from '../hooks/useMetricDisplay';
import { useResponsiveFontSize } from '../hooks/useResponsiveFontSize';
import { useResponsiveHeader } from '../hooks/useResponsiveHeader';
import PrimaryMetricCell from '../components/PrimaryMetricCell';
import SecondaryMetricCell from '../components/SecondaryMetricCell';
import { UniversalIcon } from '../components/atoms/UniversalIcon';
import { WidgetMetadataRegistry } from '../registry/WidgetMetadataRegistry';
import { UnifiedWidgetGrid } from '../components/UnifiedWidgetGrid';

interface TemperatureWidgetProps {
  id: string;
  title: string;
  width?: number;
  height?: number;
}

/**
 * Temperature Widget - Multi-sensor temperature display
 * Primary Grid (2×1): Water temperature + Engine temperature
 * Secondary Grid (2×1): Cabin temperature + Outside temperature
 */
export const TemperatureWidget: React.FC<TemperatureWidgetProps> = React.memo(({ id, title, width, height }) => {
  const theme = useTheme();
  const fontSize = useResponsiveFontSize(width || 0, height || 0);
  const { iconSize: headerIconSize, fontSize: headerFontSize } = useResponsiveHeader(height);
  
  // Widget state management
  const pinned = useWidgetStore((state) => state.isWidgetPinned ? state.isWidgetPinned(id) : false);
  const toggleWidgetPin = useWidgetStore((state) => state.toggleWidgetPin);
  
  // NMEA data selectors - temperature sensors by location
  const seawaterTemp = useNmeaStore((state) => {
    // Look for seawater temperature sensor (instance 0)
    const sensors = state.nmeaData.sensors.temperature || {};
    for (const instance in sensors) {
      if (sensors[instance]?.location === 'seawater') {
        return sensors[instance]?.value;
      }
    }
    return undefined;
  });
  
  const engineTemp = useNmeaStore((state) => {
    const sensors = state.nmeaData.sensors.temperature || {};
    for (const instance in sensors) {
      if (sensors[instance]?.location === 'engine') {
        return sensors[instance]?.value;
      }
    }
    return undefined;
  });
  
  const cabinTemp = useNmeaStore((state) => {
    const sensors = state.nmeaData.sensors.temperature || {};
    for (const instance in sensors) {
      if (sensors[instance]?.location === 'cabin') {
        return sensors[instance]?.value;
      }
    }
    return undefined;
  });
  
  const outsideTemp = useNmeaStore((state) => {
    const sensors = state.nmeaData.sensors.temperature || {};
    for (const instance in sensors) {
      if (sensors[instance]?.location === 'outside') {
        return sensors[instance]?.value;
      }
    }
    return undefined;
  });
  
  const tempTimestamp = useNmeaStore((state) => {
    const sensors = state.nmeaData.sensors.temperature || {};
    const instances = Object.keys(sensors);
    return instances.length > 0 ? sensors[parseInt(instances[0], 10)]?.timestamp : undefined;
  });
  
  // Use metric display system for temperature conversion
  const waterMetric = useMetricDisplay('temperature', seawaterTemp ?? undefined, 'WATR');
  const engineMetric = useMetricDisplay('temperature', engineTemp ?? undefined, 'ENG');
  const cabinMetric = useMetricDisplay('temperature', cabinTemp ?? undefined, 'CABIN');
  const outsideMetric = useMetricDisplay('temperature', outsideTemp ?? undefined, 'OUT');
  
  // Format displays for PrimaryMetricCell
  const waterDisplay = {
    mnemonic: waterMetric.mnemonic || 'WATR',
    value: waterMetric.value || '---',
    unit: waterMetric.unit || '°C'
  };
  
  const engineDisplay = {
    mnemonic: engineMetric.mnemonic || 'ENG',
    value: engineMetric.value || '---',
    unit: engineMetric.unit || '°C'
  };
  
  const cabinDisplay = {
    mnemonic: cabinMetric.mnemonic || 'CABIN',
    value: cabinMetric.value || '---',
    unit: cabinMetric.unit || '°C'
  };
  
  const outsideDisplay = {
    mnemonic: outsideMetric.mnemonic || 'OUT',
    value: outsideMetric.value || '---',
    unit: outsideMetric.unit || '°C'
  };
  
  // Data staleness detection (>30s = stale for temperature)
  const isStale = tempTimestamp ? (Date.now() - tempTimestamp) > 30000 : true;
  
  // Widget header component
  const headerComponent = (
    <View style={{
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      width: '100%',
      paddingHorizontal: 16,
    }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <UniversalIcon 
          name={WidgetMetadataRegistry.getMetadata('temperature')?.icon || 'thermometer-outline'} 
          size={headerIconSize} 
          color={theme.primary}
        />
        <Text style={{
          fontSize: headerFontSize,
          fontWeight: 'bold',
          letterSpacing: 0.5,
          color: theme.textSecondary,
          textTransform: 'uppercase',
        }}>{title}</Text>
      </View>
      
      {pinned && (
        <TouchableOpacity
          onPress={() => toggleWidgetPin(id)}
          style={{ padding: 4, minWidth: 24, alignItems: 'center' }}
          testID={`pin-button-${id}`}
        >
          <UniversalIcon name="pin" size={headerIconSize} color={theme.primary} />
        </TouchableOpacity>
      )}
    </View>
  );
  
  return (
    <UnifiedWidgetGrid
      theme={theme}
      header={headerComponent}
      widgetWidth={width || 200}
      widgetHeight={height || 200}
      primaryRows={2}
      secondaryRows={2}
      columns={1}
      testID={`temperature-widget-${id}`}
    >
      {/* Primary Row 1: Water Temperature */}
      <PrimaryMetricCell
        mnemonic={waterDisplay.mnemonic}
        value={waterDisplay.value}
        unit={waterDisplay.unit}
        state={isStale ? 'warning' : 'normal'}
        fontSize={{
          mnemonic: fontSize.label,
          value: fontSize.value,
          unit: fontSize.unit,
        }}
      />
      
      {/* Primary Row 2: Engine Temperature */}
      <PrimaryMetricCell
        mnemonic={engineDisplay.mnemonic}
        value={engineDisplay.value}
        unit={engineDisplay.unit}
        state={isStale ? 'warning' : 'normal'}
        fontSize={{
          mnemonic: fontSize.label,
          value: fontSize.value,
          unit: fontSize.unit,
        }}
      />
      
      {/* Secondary Row 1: Cabin Temperature */}
      <SecondaryMetricCell
        mnemonic={cabinDisplay.mnemonic}
        value={cabinDisplay.value}
        state="normal"
        compact={true}
        fontSize={{
          mnemonic: fontSize.label,
          value: fontSize.value,
          unit: fontSize.unit,
        }}
      />
      
      {/* Secondary Row 2: Outside Temperature */}
      <SecondaryMetricCell
        mnemonic={outsideDisplay.mnemonic}
        value={outsideDisplay.value}
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
});

TemperatureWidget.displayName = 'TemperatureWidget';

export default TemperatureWidget;
