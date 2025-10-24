import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useNmeaStore } from '../store/nmeaStore';
import { useTheme } from '../store/themeStore';
import { useWidgetStore } from '../store/widgetStore';
import { useMetricDisplay } from '../hooks/useMetricDisplay';
import PrimaryMetricCell from '../components/PrimaryMetricCell';
import SecondaryMetricCell from '../components/SecondaryMetricCell';
import Svg, { Rect, Path } from 'react-native-svg';

interface TanksWidgetProps {
  id: string;
  title: string;
  showUsageRate?: boolean;
}

/**
 * TanksWidget - Multi-tank monitoring display per ui-architecture.md v2.3
 * Primary Grid (1×3): Fuel, Water, Waste levels
 * Secondary Grid: Tank capacities, usage rates, additional tanks (gray/black water)
 * Features: Visual tank gauges, marine safety thresholds, multi-instance support
 */
export const TanksWidget: React.FC<TanksWidgetProps> = React.memo(({ id, title, showUsageRate = true }) => {
  const theme = useTheme();

  
  // Widget state management per ui-architecture.md v2.3
  const expanded = useWidgetStore((state) => state.widgetExpanded[id] || false);
  const pinned = useWidgetStore((state) => state.isWidgetPinned ? state.isWidgetPinned(id) : false);
  const toggleWidgetExpansion = useWidgetStore((state) => state.toggleWidgetExpanded);
  const toggleWidgetPin = useWidgetStore((state) => state.toggleWidgetPin);
  const updateWidgetInteraction = useWidgetStore((state) => state.updateWidgetInteraction);
  
  // NMEA data selectors - Tank data
  const tanks = useNmeaStore(useCallback((state: any) => state.nmeaData.tanks, []));
  
  // Extract tank data with defaults for multi-instance support
  const {
    fuel = undefined,
    freshWater = undefined,
    wasteWater = undefined,
    grayWater = undefined,
    blackWater = undefined,
    fuelUsageRate = undefined,
    waterUsageRate = undefined,
    fuelCapacity = undefined,
    waterCapacity = undefined
  } = tanks || {};

  const isStale = !tanks;

  // Metric display hooks for tank values
  const fuelCapacityDisplay = useMetricDisplay('volume', fuelCapacity);
  const waterCapacityDisplay = useMetricDisplay('volume', waterCapacity);
  const fuelUsageRateDisplay = useMetricDisplay('volume', fuelUsageRate);
  const waterUsageRateDisplay = useMetricDisplay('volume', waterUsageRate);

  // Marine safety thresholds for tank management
  const getTankStatus = useCallback((level: number, type: 'fuel' | 'water' | 'waste') => {
    if (type === 'fuel') {
      if (level < 10) return 'critical'; // Reserve fuel
      if (level < 25) return 'low';
      return 'normal';
    } else if (type === 'water') {
      if (level < 15) return 'low';
      return 'normal';
    } else { // waste
      if (level > 90) return 'critical'; // Need pumpout
      if (level > 75) return 'high';
      return 'normal';
    }
  }, []);

  const getStatusColor = useCallback((level: number, type: 'fuel' | 'water' | 'waste') => {
    const status = getTankStatus(level, type);
    switch (status) {
      case 'critical': return theme.error;
      case 'low': return theme.warning;
      case 'high': return theme.warning;
      default: return theme.success;
    }
  }, [theme, getTankStatus]);

  const getWidgetState = useCallback(() => {
    if (fuel === undefined && freshWater === undefined && wasteWater === undefined) return 'warning';
    
    const fuelCritical = fuel !== undefined && fuel < 10;
    const waterLow = freshWater !== undefined && freshWater < 15;
    const wasteFull = wasteWater !== undefined && wasteWater > 90;
    
    if (fuelCritical || wasteFull) return 'alarm';
    if ((fuel !== undefined && fuel < 25) || waterLow || (wasteWater !== undefined && wasteWater > 75)) return 'warning';
    return 'normal';
  }, [fuel, freshWater, wasteWater]);

  // Get metric state for tank levels
  const getTankMetricState = useCallback((level: number | undefined, type: 'fuel' | 'water' | 'waste'): 'normal' | 'warning' | 'alarm' => {
    if (level === undefined) return 'normal';
    const status = getTankStatus(level, type);
    switch (status) {
      case 'critical': return 'alarm';
      case 'low': return 'warning';
      case 'high': return 'warning';
      default: return 'normal';
    }
  }, [getTankStatus]);

  const tankState = getWidgetState();

  // Widget interaction handlers
  const handlePress = useCallback(() => {
    updateWidgetInteraction(id);
    toggleWidgetExpansion(id);
  }, [id, updateWidgetInteraction, toggleWidgetExpansion]);

  const handleLongPress = useCallback(() => {
    toggleWidgetPin(id);
  }, [id, toggleWidgetPin]);

  // Tank gauge component for visual display
  const TankGauge: React.FC<{ level: number; color: string; type: string }> = useCallback(({ level, color, type }) => (
    <View style={styles.gauge}>
      <Svg width={40} height={60} viewBox="0 0 40 60">
        {/* Tank outline */}
        <Rect x={5} y={5} width={30} height={50} rx={3} fill="none" stroke={'#E5E7EB'} strokeWidth={1.5} />
        {/* Fill level */}
        <Rect 
          x={7} 
          y={7 + (48 * (100 - level) / 100)} 
          width={26} 
          height={48 * level / 100} 
          rx={1} 
          fill={color} 
          opacity={0.7}
        />
        {/* Level markers */}
        <Path d={`M5 ${5 + 12} L35 ${5 + 12}`} stroke={'#E5E7EB'} strokeWidth={0.5} opacity={0.5} />
        <Path d={`M5 ${5 + 24} L35 ${5 + 24}`} stroke={'#E5E7EB'} strokeWidth={0.5} opacity={0.5} />
        <Path d={`M5 ${5 + 36} L35 ${5 + 36}`} stroke={'#E5E7EB'} strokeWidth={0.5} opacity={0.5} />
      </Svg>
      <Text style={[styles.gaugeLabel, { color: theme.textSecondary }]}>{type}</Text>
    </View>
  ), [theme]);

  const styles = StyleSheet.create({
    container: {
      backgroundColor: theme.surface,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: '#E5E7EB',
      padding: 16,
      marginBottom: 8,
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 12,
    },
    title: {
      fontSize: 11,
      fontWeight: 'bold',
      letterSpacing: 0.5,
      color: theme.textSecondary,
      textTransform: 'uppercase',
    },
    controls: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    controlButton: {
      padding: 4,
      minWidth: 24,
      alignItems: 'center',
    },
    caret: {
      fontSize: 14,
      fontWeight: 'bold',
      color: theme.textSecondary,
    },
    pinIcon: {
      fontSize: 12,
      color: theme.primary,
    },
    primaryContainer: {
      padding: 12,
      borderRadius: 6,
      borderWidth: 1,
      borderColor: tankState === 'alarm' ? theme.error :
                   tankState === 'warning' ? theme.warning :
                   '#E5E7EB',
      minHeight: 100,
    },
    primaryGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
    },
    secondaryGrid: {
      marginTop: 12,
      gap: 8,
    },
    statusIndicator: {
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor: tankState === 'alarm' ? theme.error :
                       tankState === 'warning' ? theme.warning :
                       theme.success,
      opacity: isStale ? 0.3 : 1,
    },
    tanksRow: {
      flexDirection: 'row',
      justifyContent: 'space-around',
      marginTop: 12,
      gap: 8,
    },
    tankItem: {
      alignItems: 'center',
      flex: 1,
    },
    gauge: {
      alignItems: 'center',
      marginBottom: 4,
    },
    gaugeLabel: {
      fontSize: 9,
      marginTop: 2,
      textAlign: 'center',
    },
    capacityRow: {
      flexDirection: 'row',
      gap: 8,
      marginBottom: 8,
    },
    usageRow: {
      flexDirection: 'row',
      gap: 8,
    },
    detailRow: {
      flexDirection: 'row',
      gap: 8,
      marginBottom: 8,
    },
  });

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={handlePress}
      onLongPress={handleLongPress}
      activeOpacity={0.8}
    >
      {/* Widget Header with Title and Controls */}
      <View style={styles.header}>
        <Text style={[styles.title, { fontSize: 11, fontWeight: 'bold', letterSpacing: 0.5, textTransform: 'uppercase', color: theme.textSecondary }]}>{title}</Text>
        
        {/* Expansion Caret and Pin Controls */}
        <View style={styles.controls}>
          {pinned ? (
            <TouchableOpacity
              onLongPress={handleLongPress}
              style={styles.controlButton}
              testID={`pin-button-${id}`}
            >
              <Text style={styles.pinIcon}>📌</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              onPress={handlePress}
              onLongPress={handleLongPress}
              style={styles.controlButton}
              testID={`caret-button-${id}`}
            >
              <Text style={styles.caret}>
                {expanded ? '⌃' : '⌄'}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
      
      {/* Primary Grid (1×3): Main tank levels */}
      <View style={styles.primaryGrid}>
        {fuel !== undefined && (
          <PrimaryMetricCell
            mnemonic="FUEL"
            value={Math.round(fuel).toString()}
            unit="%"
            state={getTankMetricState(fuel, 'fuel')}
          />
        )}
        
        {freshWater !== undefined && (
          <PrimaryMetricCell
            mnemonic="WATER"
            value={Math.round(freshWater).toString()}
            unit="%"
            state={getTankMetricState(freshWater, 'water')}
          />
        )}
        
        {wasteWater !== undefined && (
          <PrimaryMetricCell
            mnemonic="WASTE"
            value={Math.round(wasteWater).toString()}
            unit="%"
            state={getTankMetricState(wasteWater, 'waste')}
          />
        )}
      </View>

      {/* Visual tank gauges */}
      <View style={styles.tanksRow}>
        {fuel !== undefined && (
          <View style={styles.tankItem}>
            <TankGauge level={fuel} color={getStatusColor(fuel, 'fuel')} type="FUEL" />
          </View>
        )}
        
        {freshWater !== undefined && (
          <View style={styles.tankItem}>
            <TankGauge level={freshWater} color={getStatusColor(freshWater, 'water')} type="H2O" />
          </View>
        )}
        
        {wasteWater !== undefined && (
          <View style={styles.tankItem}>
            <TankGauge level={wasteWater} color={getStatusColor(wasteWater, 'waste')} type="WASTE" />
          </View>
        )}
      </View>

      {/* Secondary Grid: Capacities, usage rates, additional tanks */}
      {expanded && (
        <View style={styles.secondaryGrid}>
          {/* Tank capacities */}
          {(fuelCapacity !== undefined || waterCapacity !== undefined) && (
            <View style={styles.capacityRow}>
              {fuelCapacity !== undefined && (
                <SecondaryMetricCell
                  mnemonic="FUEL CAP"
                  data={fuelCapacityDisplay}
                />
              )}
              {waterCapacity !== undefined && (
                <SecondaryMetricCell
                  mnemonic="H2O CAP"
                  data={waterCapacityDisplay}
                />
              )}
            </View>
          )}

          {/* Usage rates */}
          {(fuelUsageRate !== undefined || waterUsageRate !== undefined) && showUsageRate && (
            <View style={styles.usageRow}>
              {fuelUsageRate !== undefined && (
                <SecondaryMetricCell
                  mnemonic="FUEL USE"
                  data={fuelUsageRateDisplay}
                />
              )}
              {waterUsageRate !== undefined && (
                <SecondaryMetricCell
                  mnemonic="H2O USE"
                  data={waterUsageRateDisplay}
                />
              )}
            </View>
          )}

          {/* Additional tanks */}
          {(grayWater !== undefined || blackWater !== undefined) && (
            <View style={styles.detailRow}>
              {grayWater !== undefined && (
                <SecondaryMetricCell
                  mnemonic="GRAY"
                  value={Math.round(grayWater).toString()}
                  unit="%"
                />
              )}
              {blackWater !== undefined && (
                <SecondaryMetricCell
                  mnemonic="BLACK"
                  value={Math.round(blackWater).toString()}
                  unit="%"
                />
              )}
            </View>
          )}
        </View>
      )}
    </TouchableOpacity>
  );
});

export default TanksWidget;
