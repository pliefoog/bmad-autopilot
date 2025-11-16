import React, { useState, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useNmeaStore } from '../store/nmeaStore';
import { useTheme } from '../store/themeStore';
import { useWidgetStore } from '../store/widgetStore';
import { useDataPresentation, useTemperaturePresentation } from '../presentation/useDataPresentation';
import { MetricDisplayData } from '../types/MetricDisplayData';
import { usePresentationStore } from '../presentation/presentationStore';
import { findPresentation } from '../presentation/presentations';
import PrimaryMetricCell from '../components/PrimaryMetricCell';
import SecondaryMetricCell from '../components/SecondaryMetricCell';
import { UniversalIcon } from '../components/atoms/UniversalIcon';
import { WidgetMetadataRegistry } from '../registry/WidgetMetadataRegistry';

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

  // Extract engine instance from widget ID (e.g., "engine-0", "engine-1")
  const instanceNumber = useMemo(() => {
    const match = id.match(/engine-(\d+)/);
    return match ? parseInt(match[1], 10) : 0;
  }, [id]);
  
  // Widget state management per ui-architecture.md v2.3
  const expanded = useWidgetStore((state) => state.widgetExpanded[id] || false);
  const pinned = useWidgetStore((state) => state.isWidgetPinned ? state.isWidgetPinned(id) : false);
  const toggleWidgetExpansion = useWidgetStore((state) => state.toggleWidgetExpanded);
  const toggleWidgetPin = useWidgetStore((state) => state.toggleWidgetPin);
  const updateWidgetInteraction = useWidgetStore((state) => state.updateWidgetInteraction);
  
  // NMEA data selectors - Multi-instance Engine data
  // FIXED: Use empty dependency array like other widgets to prevent selector recreation
  const engineData = useNmeaStore(useCallback((state: any) => state.nmeaData.sensors.engine[instanceNumber], []));
  
  // Extract engine data with defaults for multi-instance support - match WindWidget pattern exactly
  // Convert undefined to null to prevent toFixed() errors
  const rpm = engineData?.rpm ?? null;
  const coolantTemp = engineData?.coolantTemp ?? null;
  const oilPressure = engineData?.oilPressure ?? null;
  const alternatorVoltage = engineData?.alternatorVoltage ?? null;
  const fuelFlow = engineData?.fuelFlow ?? null;
  const engineHours = engineData?.engineHours ?? null;
  
  // Debug logging to diagnose flickering
  React.useEffect(() => {
    console.log(`🔧 [EngineWidget-${instanceNumber}] Store data:`, {
      hasEngineData: !!engineData,
      rpm,
      coolantTemp,
      oilPressure,
      alternatorVoltage,
      timestamp: engineData?.timestamp
    });
  }, [instanceNumber, engineData, rpm, coolantTemp, oilPressure, alternatorVoltage]);
  
  // Epic 9 Enhanced Presentation System for engine values
  const frequencyPresentation = useDataPresentation('frequency');
  const temperaturePresentation = useTemperaturePresentation();
  const pressurePresentation = useDataPresentation('pressure');
  const voltagePresentation = useDataPresentation('voltage');
  const volumePresentation = useDataPresentation('volume');
  const timePresentation = useDataPresentation('time');

  // Engine display data using Epic 9 presentation system
  const getEngineDisplay = useCallback((
    presentation: any,
    value: number | null,
    engineMnemonic: string,
    fallbackSymbol: string = '',
    fallbackName: string = ''
  ): MetricDisplayData => {
    const presDetails = presentation.presentation;
    
    // Check for both null and undefined to prevent toFixed() errors
    if (value === null || value === undefined) {
      return {
        mnemonic: engineMnemonic, // NMEA source abbreviation 
        value: '---',
        unit: fallbackSymbol, // Fallback presentation symbol
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
        mnemonic: engineMnemonic, // NMEA source abbreviation
        value: value.toFixed(1),
        unit: fallbackSymbol, // Fallback presentation symbol
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
          isValid: true,
          isFallback: true
        }
      };
    }
    
    return {
      mnemonic: engineMnemonic, // NMEA source abbreviation like "TEMP", "OIL", "VOLT"
      value: presentation.convertAndFormat(value),
      unit: presDetails.symbol, // Presentation symbol like "°C", "bar", "V"
      rawValue: value,
      layout: {
        minWidth: 60,
        alignment: 'right'
      },
      presentation: {
        id: presDetails.id,
        name: presDetails.name,
        pattern: 'xxx.x' // Default pattern
      },
      status: {
        isValid: true,
        isFallback: false
      }
    };
  }, []);

  const rpmDisplay = useMemo(() => 
    getEngineDisplay(frequencyPresentation, rpm, 'RPM', 'rpm', 'RPM'), // Engine Revolution Per Minute
    [frequencyPresentation, rpm, getEngineDisplay]
  );

  const coolantTempDisplay = useMemo(() => 
    getEngineDisplay(temperaturePresentation, coolantTemp, 'ECT', '°C', 'Celsius'), // Engine Coolant Temperature
    [temperaturePresentation, coolantTemp, getEngineDisplay]
  );

  const oilPressureDisplay = useMemo(() =>
    getEngineDisplay(pressurePresentation, oilPressure, 'EOP', 'bar', 'Bar'), // Engine Oil Pressure
    [pressurePresentation, oilPressure, getEngineDisplay]
  );

  const alternatorVoltageDisplay = useMemo(() =>
    getEngineDisplay(voltagePresentation, alternatorVoltage, 'ALT', 'V', 'Volts'), // Alternator Voltage
    [voltagePresentation, alternatorVoltage, getEngineDisplay]
  );

  const fuelFlowDisplay = useMemo(() =>
    getEngineDisplay(volumePresentation, fuelFlow, 'EFF', 'L/h', 'Liters per Hour'), // Engine Fuel Flow
    [volumePresentation, fuelFlow, getEngineDisplay]
  );

  const engineHoursDisplay = useMemo(() =>
    getEngineDisplay(timePresentation, engineHours, 'EHR', 'h', 'Hours'), // Engine Hours
    [timePresentation, engineHours, getEngineDisplay]
  );
  
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
  const isStale = !engineData;

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
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <UniversalIcon 
            name={WidgetMetadataRegistry.getMetadata('engine')?.icon || 'car-outline'} 
            size={12} 
            color={theme.textSecondary}
            style={{ marginRight: 6 }}
          />
          <Text style={styles.title}>{title}</Text>
        </View>
        
        {/* Expansion Caret and Pin Controls */}
        <View style={styles.controls}>
          {pinned ? (
            <TouchableOpacity
              onLongPress={handleLongPress}
              style={styles.controlButton}
              testID={`pin-button-${id}`}
            >
              <UniversalIcon name="pin" size={16} color={theme.primary} />
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
            data={rpmDisplay}
            state={getRpmState()}
          />
          <PrimaryMetricCell
            data={coolantTempDisplay}
            state={getTempState()}
          />
          <PrimaryMetricCell
            data={oilPressureDisplay}
            state={getOilState()}
          />
          <PrimaryMetricCell
            data={alternatorVoltageDisplay}
            state={getVoltState()}
          />
        </View>

      {/* Secondary Grid (1×2): Fuel Rate, Engine Hours */}
      {expanded && (
        <View style={styles.secondaryGrid}>
            <SecondaryMetricCell
              data={fuelFlowDisplay}
              state="normal"
              compact={true}
            />
            <SecondaryMetricCell
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