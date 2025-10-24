import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useNmeaStore } from '../store/nmeaStore';
import { useTheme } from '../store/themeStore';
import { useWidgetStore } from '../store/widgetStore';
import { useMetricDisplay } from '../hooks/useMetricDisplay';
import PrimaryMetricCell from '../components/PrimaryMetricCell';
import SecondaryMetricCell from '../components/SecondaryMetricCell';

interface EngineWidgetProps {
  id: string;
  title: string;
}

/**
 * Engine Widget - Multi-Instance Engine Display per ui-architecture.md v2.3
 * Primary Grid (2×2): RPM, TEMP, OIL, VOLT
 * Secondary Grid (1×2): Fuel Rate, Engine Hours
 * Supports multi-instance detection via NMEA engine instances
 */
export const EngineWidget: React.FC<EngineWidgetProps> = React.memo(({ id, title }) => {
  const theme = useTheme();

  
  // Widget state management per ui-architecture.md v2.3
  const expanded = useWidgetStore((state) => state.widgetExpanded[id] || false);
  const pinned = useWidgetStore((state) => state.isWidgetPinned ? state.isWidgetPinned(id) : false);
  const toggleWidgetExpansion = useWidgetStore((state) => state.toggleWidgetExpanded);
  const toggleWidgetPin = useWidgetStore((state) => state.toggleWidgetPin);
  const updateWidgetInteraction = useWidgetStore((state) => state.updateWidgetInteraction);
  
  // NMEA data selectors - Engine data
  const engine = useNmeaStore(useCallback((state: any) => state.nmeaData.engine, []));
  
  // Extract engine data with defaults for multi-instance support
  const rpm = engine?.rpm || null;
  const coolantTemp = engine?.coolantTemp || null;
  const oilPressure = engine?.oilPressure || null;
  const alternatorVoltage = engine?.alternatorVoltage || null;
  const fuelFlow = engine?.fuelFlow || null;
  const engineHours = engine?.engineHours || null;
  
  // Metric display hooks for engine values
  const coolantTempDisplay = useMetricDisplay('temperature', coolantTemp);
  const oilPressureDisplay = useMetricDisplay('pressure', oilPressure);
  const alternatorVoltageDisplay = useMetricDisplay('voltage', alternatorVoltage);
  const fuelFlowDisplay = useMetricDisplay('volume', fuelFlow);
  const engineHoursDisplay = useMetricDisplay('time', engineHours);
  
  // Marine safety thresholds for engine monitoring
  const getEngineState = useCallback((rpm: number | null, temp: number | null, oil: number | null) => {
    if (rpm === null && temp === null && oil === null) return 'warning';
    
    // Critical alarms - immediate attention required
    if (temp && temp > 100) return 'critical'; // Overheating
    if (oil && oil < 5) return 'critical';     // Low oil pressure
    if (rpm && rpm > 4200) return 'critical';  // Over-rev
    
    // Warning conditions
    if (temp && temp > 85) return 'warning';   // High temp warning
    if (oil && oil < 10) return 'warning';     // Low oil warning
    if (rpm && rpm > 3800) return 'warning';   // High RPM warning
    
    return 'normal';
  }, []);

  const engineState = getEngineState(rpm, coolantTemp, oilPressure);
  const isStale = !engine;

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

  // Widget interaction handlers
  const handlePress = useCallback(() => {
    updateWidgetInteraction(id);
    toggleWidgetExpansion(id);
  }, [id, updateWidgetInteraction, toggleWidgetExpansion]);

  const handleLongPress = useCallback(() => {
    toggleWidgetPin(id);
  }, [id, toggleWidgetPin]);

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
    primaryGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
      marginBottom: 8,
    },
    secondaryGrid: {
      flexDirection: 'row',
      gap: 8,
      marginTop: 12,
      paddingTop: 12,
      borderTopWidth: 1,
      borderTopColor: '#E5E7EB',
    },
  });

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={handlePress}
      activeOpacity={0.8}
      testID={`engine-widget-${id}`}
    >
      {/* Widget Header with Title and Controls */}
      <View style={styles.header}>
        <Text style={styles.title}>{title}</Text>
        
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

      {/* Primary Grid (2×2): RPM, TEMP, OIL, VOLT */}
      <View style={styles.primaryGrid}>
          <PrimaryMetricCell
            mnemonic="RPM"
            value={rpm !== null ? Math.round(rpm).toString() : '---'}
            unit=""
            state={getRpmState()}
          />
          <PrimaryMetricCell
            mnemonic="TEMP"
            data={coolantTempDisplay}
            state={getTempState()}
          />
          <PrimaryMetricCell
            mnemonic="OIL"
            data={oilPressureDisplay}
            state={getOilState()}
          />
          <PrimaryMetricCell
            mnemonic="VOLT"
            data={alternatorVoltageDisplay}
            state={getVoltState()}
          />
        </View>

      {/* Secondary Grid (1×2): Fuel Rate, Engine Hours */}
      {expanded && (
        <View style={styles.secondaryGrid}>
            <SecondaryMetricCell
              mnemonic="FUEL"
              data={fuelFlowDisplay}
              state="normal"
              compact={true}
            />
            <SecondaryMetricCell
              mnemonic="HRS"
              data={engineHoursDisplay}
              state="normal"
              compact={true}
            />
        </View>
      )}
    </TouchableOpacity>
  );
});

export default EngineWidget;