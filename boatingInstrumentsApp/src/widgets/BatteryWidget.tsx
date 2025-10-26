import React, { useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useNmeaStore } from '../store/nmeaStore';
import { useTheme } from '../store/themeStore';
import { useWidgetStore } from '../store/widgetStore';
import { useDataPresentation, useTemperaturePresentation } from '../presentation/useDataPresentation';
import { MetricDisplayData } from '../types/MetricDisplayData';
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

  // Extract battery instance from widget ID (e.g., "battery-0", "battery-1")
  const instanceNumber = useMemo(() => {
    const match = id.match(/battery-(\d+)/);
    return match ? parseInt(match[1], 10) : 0;
  }, [id]);
  
  // Widget state management
  const expanded = useWidgetStore((state) => state.widgetExpanded[id] || false);
  const pinned = useWidgetStore((state) => state.isWidgetPinned ? state.isWidgetPinned(id) : false);
  const toggleWidgetExpansion = useWidgetStore((state) => state.toggleWidgetExpanded);
  const toggleWidgetPin = useWidgetStore((state) => state.toggleWidgetPin);
  const updateWidgetInteraction = useWidgetStore((state) => state.updateWidgetInteraction);
  
  // NMEA data selectors - Multi-instance Battery data
  const batteryData = useNmeaStore(useCallback((state: any) => state.getBatteryData(instanceNumber), [instanceNumber]));
  
  // Extract battery data - now comes directly from NMEA store
  const currentBatteryData = useMemo(() => {
    if (batteryData) {
      return {
        voltage: batteryData.voltage,
        current: batteryData.current,
        temperature: batteryData.temperature,
        stateOfCharge: batteryData.stateOfCharge,
        nominalVoltage: 12.0, // Default nominal voltage
        capacity: batteryData.capacity,
        chemistry: 'Unknown', // Could be extended from NMEA data
        instance: instanceNumber
      };
    }
    return null;
  }, [batteryData, instanceNumber]);
  
  // Extract values with defaults
  const voltage = currentBatteryData?.voltage || null;
  const current = currentBatteryData?.current || null;
  const temperature = currentBatteryData?.temperature || null;
  const stateOfCharge = currentBatteryData?.stateOfCharge || null;
  const nominalVoltage = currentBatteryData?.nominalVoltage || 12.0;
  const capacity = currentBatteryData?.capacity || null;
  const chemistry = currentBatteryData?.chemistry || 'Unknown';
  
  // Epic 9 Enhanced Presentation System for battery values
  const voltagePresentation = useDataPresentation('voltage');
  const currentPresentation = useDataPresentation('current');
  const temperaturePresentation = useTemperaturePresentation();
  const capacityPresentation = useDataPresentation('capacity');
  
  // Battery display functions using Epic 9 system
  const getBatteryDisplay = useCallback((
    presentation: any,
    value: number | null,
    batteryMnemonic: string,
    fallbackSymbol: string = '',
    fallbackName: string = ''
  ): MetricDisplayData => {
    const presDetails = presentation.presentation;
    
    if (value === null) {
      return {
        mnemonic: batteryMnemonic,
        value: '---',
        unit: fallbackSymbol,
        rawValue: 0,
        layout: {
          minWidth: 60,
          alignment: 'right'
        },
        presentation: {
          id: presDetails?.id || 'default',
          name: fallbackName,
          pattern: 'xxx'
        },
        status: {
          isValid: false,
          error: 'No data',
          isFallback: true
        }
      };
    }

    if (!presentation.isValid || !presDetails) {
      return {
        mnemonic: batteryMnemonic,
        value: value.toFixed(1),
        unit: fallbackSymbol,
        rawValue: value,
        layout: {
          minWidth: 60,
          alignment: 'right'
        },
        presentation: {
          id: 'fallback',
          name: fallbackName,
          pattern: 'xxx.x'
        },
        status: {
          isValid: false,
          isFallback: true
        }
      };
    }

    return {
      mnemonic: batteryMnemonic,
      value: presentation.format(presentation.convert(value)),
      unit: presDetails.symbol,
      rawValue: value,
      layout: {
        minWidth: 60,
        alignment: 'right'
      },
      presentation: {
        id: presDetails.id,
        name: presDetails.name,
        pattern: 'xxx.x'
      },
      status: {
        isValid: true
      }
    };
  }, []);

  // Battery display values with proper NMEA mnemonics
  const voltageDisplay = useMemo(() => 
    getBatteryDisplay(voltagePresentation, voltage, 'VLT', 'V', 'Volts'),
    [voltagePresentation, voltage, getBatteryDisplay]
  );

  const currentDisplay = useMemo(() => 
    getBatteryDisplay(currentPresentation, current !== null ? Math.abs(current) : null, 'AMP', 'A', 'Amperes'),
    [currentPresentation, current, getBatteryDisplay]
  );

  const temperatureDisplay = useMemo(() => 
    getBatteryDisplay(temperaturePresentation, temperature, 'TMP', '°C', 'Celsius'),
    [temperaturePresentation, temperature, getBatteryDisplay]
  );

  const nominalVoltageDisplay = useMemo(() => 
    getBatteryDisplay(voltagePresentation, nominalVoltage, 'NOM', 'V', 'Nominal Volts'),
    [voltagePresentation, nominalVoltage, getBatteryDisplay]
  );
  
  const isStale = !currentBatteryData || voltage === null;

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
            data={voltageDisplay}
            state={getVoltageState()}
          />
          <PrimaryMetricCell
            data={currentDisplay}
            state={getCurrentState()}
          />
          <PrimaryMetricCell
            data={temperatureDisplay}
            state={getTempState()}
          />
          <PrimaryMetricCell
            mnemonic="SOC"
            value={stateOfCharge !== null ? `${stateOfCharge.toFixed(0)}%` : '---'}
            unit="%"
            state={getSOCState()}
          />
        </View>

      {/* Secondary Grid (1×3): Nominal Voltage, Capacity, Chemistry */}
      {expanded && (
        <View style={styles.secondaryGrid}>
            <SecondaryMetricCell
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