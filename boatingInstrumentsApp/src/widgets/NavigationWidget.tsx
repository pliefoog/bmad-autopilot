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

interface NavigationWidgetProps {
  id: string;
  title: string;
  width?: number;
  height?: number;
}

/**
 * Navigation Widget - Waypoint Navigation Display
 * Primary Grid (2×2): Bearing, Distance, XTE, VMG
 * Secondary Grid (2×1): Waypoint info and ETA
 */
export const NavigationWidget: React.FC<NavigationWidgetProps> = React.memo(({ id, title, width, height }) => {
  const theme = useTheme();
  const fontSize = useResponsiveFontSize(width || 0, height || 0);
  
  const { iconSize: headerIconSize, fontSize: headerFontSize } = useResponsiveHeader(height);
  
  // Widget state management
  const pinned = useWidgetStore((state) => state.isWidgetPinned ? state.isWidgetPinned(id) : false);
  const toggleWidgetPin = useWidgetStore((state) => state.toggleWidgetPin);
  
  // NMEA data selectors - navigation sensor
  const waypointId = useNmeaStore((state) => state.nmeaData.sensors.navigation?.[0]?.waypointId);
  const waypointName = useNmeaStore((state) => state.nmeaData.sensors.navigation?.[0]?.waypointName);
  const bearingToWaypoint = useNmeaStore((state) => state.nmeaData.sensors.navigation?.[0]?.bearingToWaypoint);
  const distanceToWaypoint = useNmeaStore((state) => state.nmeaData.sensors.navigation?.[0]?.distanceToWaypoint);
  const crossTrackError = useNmeaStore((state) => state.nmeaData.sensors.navigation?.[0]?.crossTrackError);
  const velocityMadeGood = useNmeaStore((state) => state.nmeaData.sensors.navigation?.[0]?.velocityMadeGood);
  const steerDirection = useNmeaStore((state) => state.nmeaData.sensors.navigation?.[0]?.steerDirection);
  const timeToWaypoint = useNmeaStore((state) => state.nmeaData.sensors.navigation?.[0]?.timeToWaypoint);
  const navTimestamp = useNmeaStore((state) => state.nmeaData.sensors.navigation?.[0]?.timestamp);
  
  // Use metric display system for navigation metrics
  const bearingMetric = useMetricDisplay('angle', bearingToWaypoint ?? undefined, 'BRG');
  const distanceMetric = useMetricDisplay('distance', distanceToWaypoint ?? undefined, 'DIST');
  const xteMetric = useMetricDisplay('distance', typeof crossTrackError === 'number' ? Math.abs(crossTrackError) : undefined, 'XTE');
  const vmgMetric = useMetricDisplay('speed', velocityMadeGood ?? undefined, 'VMG');
  
  // Format displays for PrimaryMetricCell
  const bearingDisplay = {
    mnemonic: bearingMetric.mnemonic || 'BRG',
    value: bearingMetric.value || '---',
    unit: bearingMetric.unit || '°'
  };
  
  const distanceDisplay = {
    mnemonic: distanceMetric.mnemonic || 'DIST',
    value: distanceMetric.value || '---',
    unit: distanceMetric.unit || 'nm'
  };
  
  const xteDisplay = {
    mnemonic: xteMetric.mnemonic || 'XTE',
    value: xteMetric.value || '---',
    unit: xteMetric.unit || 'nm'
  };
  
  const vmgDisplay = {
    mnemonic: vmgMetric.mnemonic || 'VMG',
    value: vmgMetric.value || '---',
    unit: vmgMetric.unit || 'kts'
  };
  
  // Format waypoint display
  const waypointDisplay = useMemo(() => {
    if (!waypointId) return 'No Waypoint';
    return waypointName || waypointId;
  }, [waypointId, waypointName]);
  
  // Format ETA
  const etaDisplay = useMemo(() => {
    if (typeof timeToWaypoint !== 'number') return '---';
    const hours = Math.floor(timeToWaypoint / 3600);
    const minutes = Math.floor((timeToWaypoint % 3600) / 60);
    return `${hours}h ${minutes}m`;
  }, [timeToWaypoint]);
  
  // Data staleness detection
  const isStale = navTimestamp ? (Date.now() - navTimestamp) > 10000 : true;
  
  const handleLongPressOnPin = () => {
    if (toggleWidgetPin) {
      toggleWidgetPin(id);
    }
  };
  
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
          name={WidgetMetadataRegistry.getMetadata('navigation')?.icon || 'navigate-circle-outline'} 
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
          onLongPress={handleLongPressOnPin}
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
      columns={2}
      testID={`navigation-widget-${id}`}
    >
        {/* Primary Grid Row 1: Bearing and Distance */}
        <PrimaryMetricCell
          mnemonic={bearingDisplay.mnemonic}
          value={bearingDisplay.value}
          unit={bearingDisplay.unit}
          state={isStale ? 'warning' : 'normal'}
          fontSize={{
            mnemonic: fontSize.label,
            value: fontSize.value,
            unit: fontSize.unit,
          }}
        />
        <PrimaryMetricCell
          mnemonic={distanceDisplay.mnemonic}
          value={distanceDisplay.value}
          unit={distanceDisplay.unit}
          state={isStale ? 'warning' : 'normal'}
          fontSize={{
            mnemonic: fontSize.label,
            value: fontSize.value,
            unit: fontSize.unit,
          }}
        />
        {/* Primary Grid Row 2: XTE and VMG */}
        <PrimaryMetricCell
          mnemonic={xteDisplay.mnemonic}
          value={xteDisplay.value}
          unit={xteDisplay.unit}
          state={isStale ? 'warning' : 'normal'}
          fontSize={{
            mnemonic: fontSize.label,
            value: fontSize.value,
            unit: fontSize.unit,
          }}
        />
        <PrimaryMetricCell
          mnemonic={vmgDisplay.mnemonic}
          value={vmgDisplay.value}
          unit={vmgDisplay.unit}
          state={isStale ? 'warning' : 'normal'}
          fontSize={{
            mnemonic: fontSize.label,
            value: fontSize.value,
            unit: fontSize.unit,
          }}
        />
        {/* Secondary Grid Row 1: Waypoint */}
        <SecondaryMetricCell
          mnemonic="WAYPOINT"
          value={waypointDisplay}
          state="normal"
          compact={true}
          fontSize={{
            mnemonic: fontSize.label,
            value: fontSize.value,
            unit: fontSize.unit,
          }}
        />
        {/* Secondary Grid Row 2: ETA */}
        <SecondaryMetricCell
          mnemonic="ETA"
          value={etaDisplay}
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

NavigationWidget.displayName = 'NavigationWidget';

export default NavigationWidget;
