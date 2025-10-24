import React, { useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useNmeaStore } from '../store/nmeaStore';
import { useTheme } from '../store/themeStore';
import { useWidgetStore } from '../store/widgetStore';
import { useMetricDisplay } from '../hooks/useMetricDisplay';
import PrimaryMetricCell from '../components/PrimaryMetricCell';
import SecondaryMetricCell from '../components/SecondaryMetricCell';

interface BatteryWidgetProps {
  id: string;
  title: string;
  batteryInstance?: string; // 'house', 'engine', 'thruster', etc.
}

/**
 * Battery Widget - Multi-Instance Battery Display per ui-architecture.md v2.3
 * Primary Grid (2×2): VOLT, CURR, TEMP, SOC
 * Secondary Grid (1×3): Nominal Voltage, Capacity, Chemistry
 * Supports multi-instance detection via NMEA battery instances
 */
export const BatteryWidget: React.FC<BatteryWidgetProps> = React.memo(({ id, title, batteryInstance = 'house' }) => {
  const theme = useTheme();
  
  // Widget state management
  const expanded = useWidgetStore((state) => state.widgetExpanded[id] || false);
  const pinned = useWidgetStore((state) => state.isWidgetPinned ? state.isWidgetPinned(id) : false);
  const toggleWidgetExpansion = useWidgetStore((state) => state.toggleWidgetExpanded);
  const toggleWidgetPin = useWidgetStore((state) => state.toggleWidgetPin);
  const updateWidgetInteraction = useWidgetStore((state) => state.updateWidgetInteraction);
  
  // NMEA data selectors - Battery data with multi-instance support
  const battery = useNmeaStore(useCallback((state: any) => state.nmeaData.battery, []));
  
  // Multi-instance battery data extraction based on NMEA instance
  const getBatteryData = useCallback(() => {
    if (!battery) return null;
    
    // If we have extended multi-instance battery data
    if (Array.isArray(battery.banks)) {
      const bank = battery.banks.find((b: any) => b.instance === batteryInstance);
      if (bank) return bank;
    }
    
    // Fallback to simple structure based on instance type
    switch (batteryInstance) {
      case 'house':
        return {
          voltage: battery.house,
          current: battery.current,
          temperature: battery.temperature,
          stateOfCharge: battery.stateOfCharge,
          nominalVoltage: battery.nominalVoltage || 12.0,
          capacity: battery.capacity,
          chemistry: battery.chemistry || 'Unknown',
          instance: 'house'
        };
      case 'engine':
        return {
          voltage: battery.engine,
          current: battery.engineCurrent,
          temperature: battery.engineTemperature,
          stateOfCharge: battery.engineSOC,
          nominalVoltage: 12.0,
          capacity: battery.engineCapacity,
          chemistry: battery.engineChemistry || 'Lead Acid',
          instance: 'engine'
        };
      case 'thruster':
        return {
          voltage: battery.thruster,
          current: battery.thrusterCurrent,
          temperature: battery.thrusterTemperature,
          stateOfCharge: battery.thrusterSOC,
          nominalVoltage: 12.0,
          capacity: battery.thrusterCapacity,
          chemistry: battery.thrusterChemistry || 'AGM',
          instance: 'thruster'
        };
      default:
        // Generic instance fallback
        return {
          voltage: battery[batteryInstance] || battery.house,
          current: battery.current,
          temperature: battery.temperature,
          stateOfCharge: battery.stateOfCharge,
          nominalVoltage: 12.0,
          capacity: battery.capacity,
          chemistry: 'Unknown',
          instance: batteryInstance
        };
    }
  }, [battery, batteryInstance]);

  const batteryData = getBatteryData();
  
  // Extract values with defaults
  const voltage = batteryData?.voltage || null;
  const current = batteryData?.current || null;
  const temperature = batteryData?.temperature || null;
  const stateOfCharge = batteryData?.stateOfCharge || null;
  const nominalVoltage = batteryData?.nominalVoltage || 12.0;
  const capacity = batteryData?.capacity || null;
  const chemistry = batteryData?.chemistry || 'Unknown';
  
  // Metric display hooks for battery values
  const voltageDisplay = useMetricDisplay('voltage', voltage);
  const currentDisplay = useMetricDisplay('current', current !== null ? Math.abs(current) : null);
  const temperatureDisplay = useMetricDisplay('temperature', temperature);
  const nominalVoltageDisplay = useMetricDisplay('voltage', nominalVoltage);
  
  const isStale = !batteryData || voltage === null;

  // Marine safety thresholds for battery monitoring
  const getBatteryState = useCallback((voltage: number | null, soc: number | null) => {
    if (voltage === null) return 'warning';
    
    // Critical conditions for marine batteries
    if (voltage < 10.5) return 'alarm';     // Deep discharge danger
    if (voltage < 11.8) return 'warning';   // Low battery warning
    if (voltage > 15.0) return 'alarm';     // Dangerous overcharge
    if (voltage > 14.8) return 'warning';   // Overcharge warning
    
    // State of charge warnings (if available)
    if (soc !== null) {
      if (soc < 20) return 'warning';       // Low SOC
      if (soc < 10) return 'alarm';         // Critical SOC
    }
    
    return 'normal';
  }, []);

  // Individual metric states for enhanced monitoring
  const getVoltageState = useCallback(() => getBatteryState(voltage, stateOfCharge), [voltage, stateOfCharge, getBatteryState]);
  
  const getCurrentState = useCallback(() => {
    if (current === null) return 'normal';
    if (Math.abs(current) > 100) return 'warning'; // High current draw/charge
    if (Math.abs(current) > 200) return 'alarm';   // Dangerous current
    return 'normal';
  }, [current]);
  
  const getTempState = useCallback(() => {
    if (temperature === null) return 'normal';
    if (temperature > 50) return 'alarm';    // Dangerous temperature
    if (temperature > 40) return 'warning';  // High temperature
    if (temperature < 0) return 'warning';   // Freezing
    return 'normal';
  }, [temperature]);
  
  const getSOCState = useCallback(() => {
    if (stateOfCharge === null) return 'normal';
    if (stateOfCharge < 10) return 'alarm';    // Critical SOC
    if (stateOfCharge < 20) return 'warning';  // Low SOC
    return 'normal';
  }, [stateOfCharge]);

  const batteryState = getBatteryState(voltage, stateOfCharge);

  // Widget interaction handlers
  const handlePress = useCallback(() => {
    updateWidgetInteraction(id);
    toggleWidgetExpansion(id);
  }, [id, updateWidgetInteraction, toggleWidgetExpansion]);

  const handleLongPress = useCallback(() => {
    toggleWidgetPin(id);
  }, [id, toggleWidgetPin]);

  // Auto-generate appropriate title based on instance and location
  const getDisplayTitle = useCallback(() => {
    // If custom title provided, use it
    if (title !== 'BATTERY') return title;
    
    // Auto-generate based on instance
    switch (batteryInstance) {
      case 'house': return 'HOUSE BATTERY';
      case 'engine': return 'START BATTERY';
      case 'thruster': return 'THRUSTER BATTERY';
      case 'bow': return 'BOW BATTERY';
      case 'stern': return 'STERN BATTERY';
      case 'generator': return 'GENERATOR BATTERY';
      default: return `${batteryInstance.toUpperCase()} BATTERY`;
    }
  }, [title, batteryInstance]);

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
      testID={`battery-widget-${id}`}
    >
      {/* Widget Header with Title and Controls */}
      <View style={styles.header}>
        <Text style={styles.title}>{getDisplayTitle()}</Text>
        
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

      {/* Primary Grid (2×2): VOLT, CURR, TEMP, SOC */}
      <View style={styles.primaryGrid}>
          <PrimaryMetricCell
            mnemonic="VOLT"
            data={voltageDisplay}
            state={getVoltageState()}
          />
          <PrimaryMetricCell
            mnemonic="CURR"
            data={currentDisplay}
            state={getCurrentState()}
          />
          <PrimaryMetricCell
            mnemonic="TEMP"
            data={temperatureDisplay}
            state={getTempState()}
          />
          <PrimaryMetricCell
            mnemonic="SOC"
            value={stateOfCharge !== null ? `${stateOfCharge.toFixed(0)}%` : '---'}
            unit=""
            state={getSOCState()}
          />
        </View>

      {/* Secondary Grid (1×3): Nominal Voltage, Capacity, Chemistry */}
      {expanded && (
        <View style={styles.secondaryGrid}>
            <SecondaryMetricCell
              mnemonic="NOM"
              data={nominalVoltageDisplay}
              state="normal"
              compact={true}
            />
            <SecondaryMetricCell
              mnemonic="CAP"
              value={capacity !== null ? capacity.toFixed(0) : '---'}
              unit="Ah"
              state="normal"
              compact={true}
            />
            <SecondaryMetricCell
              mnemonic="CHEM"
              value={chemistry}
              unit=""
              state="normal"
              compact={true}
            />
        </View>
      )}
    </TouchableOpacity>
  );
});

export default BatteryWidget;