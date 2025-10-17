import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { WidgetCard } from './WidgetCard';
import { PrimaryMetricCell } from '../components/PrimaryMetricCell';
import { useNmeaStore } from '../core/nmeaStore';
import { useTheme } from '../core/themeStore';

interface BatteryWidgetProps {
  showMultipleBanks?: boolean;
}

export const BatteryWidget: React.FC<BatteryWidgetProps> = ({ showMultipleBanks = true }) => {
  const battery = useNmeaStore((state: any) => state.nmeaData.battery);
  const theme = useTheme();
  const [selectedView, setSelectedView] = useState<'overview' | 'details'>('overview');

  // Battery data with defaults
  const {
    house = undefined,
    engine = undefined,
    bow = undefined,
    houseCurrent = undefined,
    engineCurrent = undefined,
    houseStateOfCharge = undefined,
    engineStateOfCharge = undefined,
    alternatorOutput = undefined,
    chargingStatus = undefined,
    temperature = undefined
  } = battery || {};

  // Marine safety thresholds
  const getBatteryStatus = (voltage: number) => {
    if (voltage < 11.5) return 'critical'; // Deep discharge danger
    if (voltage < 12.0) return 'low';      // Low battery warning
    if (voltage < 12.4) return 'moderate'; // Needs charging
    if (voltage > 14.8) return 'high';     // Overcharge warning
    return 'normal';
  };

  const getStatusColor = (voltage: number) => {
    const status = getBatteryStatus(voltage);
    switch (status) {
      case 'critical': return theme.error;
      case 'low': return theme.warning;
      case 'high': return theme.warning;
      default: return theme.success;
    }
  };

  const getWidgetState = () => {
    if (house === undefined && engine === undefined) return 'no-data';
    
    const houseCritical = house < 11.5;
    const engineCritical = engine < 11.5;
    const overcharge = house > 14.8 || engine > 14.8;
    
    if (houseCritical || engineCritical || overcharge) return 'alarm';
    
    const houseLow = house < 12.0;
    const engineLow = engine < 12.0;
    
    if (houseLow || engineLow) return 'alarm';
    return 'normal';
  };

  const formatCurrent = (current: number) => {
    if (Math.abs(current) < 0.1) return '0.0A';
    return current > 0 ? `+${current.toFixed(1)}A` : `${current.toFixed(1)}A`;
  };

  const renderOverview = () => (
    <View style={styles.overview}>
      {/* PrimaryMetricCell Grid - 2x1 layout for battery voltages */}
      <View style={styles.metricGrid}>
        <PrimaryMetricCell
          mnemonic="HOUSE"
          value={house !== undefined ? house.toFixed(1) : '---'}
          unit="V"
          state={house !== undefined ? (
            getBatteryStatus(house) === 'critical' || getBatteryStatus(house) === 'low' ? 'alarm' :
            getBatteryStatus(house) === 'high' ? 'warning' : 'normal'
          ) : 'normal'}
          style={styles.metricCell}
        />
        <PrimaryMetricCell
          mnemonic="ENG"
          value={engine !== undefined ? engine.toFixed(1) : '---'}
          unit="V"
          state={engine !== undefined ? (
            getBatteryStatus(engine) === 'critical' || getBatteryStatus(engine) === 'low' ? 'alarm' :
            getBatteryStatus(engine) === 'high' ? 'warning' : 'normal'
          ) : 'normal'}
          style={styles.metricCell}
        />
      </View>

      {/* State of Charge Row */}
      {(houseStateOfCharge !== undefined || engineStateOfCharge !== undefined) && (
        <View style={styles.socRow}>
          {houseStateOfCharge !== undefined && (
            <Text style={[styles.socText, { color: theme.textSecondary }]}>
              House: {Math.round(houseStateOfCharge)}%
            </Text>
          )}
          {engineStateOfCharge !== undefined && (
            <Text style={[styles.socText, { color: theme.textSecondary }]}>
              Engine: {Math.round(engineStateOfCharge)}%
            </Text>
          )}
        </View>
      )}

      {/* Current Draw */}
      {houseCurrent !== undefined && (
        <View style={styles.currentRow}>
          <Text style={[styles.currentLabel, { color: theme.textSecondary }]}>
            House Current: 
          </Text>
          <Text style={[styles.currentValue, { 
            color: houseCurrent > 0 ? theme.success : houseCurrent < -5 ? theme.warning : theme.text 
          }]}>
            {formatCurrent(houseCurrent)}
          </Text>
        </View>
      )}

      {/* Alternator Output */}
      {alternatorOutput !== undefined && (
        <Text style={[styles.alternatorText, { color: theme.textSecondary }]}>
          Alt: {alternatorOutput.toFixed(1)}A
        </Text>
      )}
    </View>
  );

  const renderDetails = () => (
    <View style={styles.details}>
      <View style={styles.detailRow}>
        <Text style={[styles.detailLabel, { color: theme.textSecondary }]}>Charging:</Text>
        <Text style={[styles.detailValue, { color: theme.text }]}>
          {chargingStatus || 'Unknown'}
        </Text>
      </View>
      
      {temperature !== undefined && (
        <View style={styles.detailRow}>
          <Text style={[styles.detailLabel, { color: theme.textSecondary }]}>Temperature:</Text>
          <Text style={[styles.detailValue, { color: theme.text }]}>
            {temperature.toFixed(1)}°C
          </Text>
        </View>
      )}
      
      {bow !== undefined && (
        <View style={styles.detailRow}>
          <Text style={[styles.detailLabel, { color: theme.textSecondary }]}>Bow Thruster:</Text>
          <Text style={[styles.detailValue, { color: getStatusColor(bow) }]}>
            {bow.toFixed(1)}V
          </Text>
        </View>
      )}
    </View>
  );

  return (
    <TouchableOpacity 
      onPress={() => setSelectedView(selectedView === 'overview' ? 'details' : 'overview')}
      style={styles.container}
    >
      <WidgetCard 
        title="Battery"
        icon="battery-charging-outline"
        state={getWidgetState()}
      >
        {selectedView === 'overview' ? renderOverview() : renderDetails()}
      </WidgetCard>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  overview: {
    paddingVertical: 8,
  },
  metricGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: 4,
    paddingVertical: 8,
  },
  metricCell: {
    flex: 1,
    marginHorizontal: 4,
  },
  socRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginVertical: 4,
  },
  socText: {
    fontSize: 12,
    fontWeight: '500',
  },
  batteryRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 8,
  },
  batteryBank: {
    alignItems: 'center',
    flex: 1,
  },
  bankLabel: {
    fontSize: 10,
    marginBottom: 4,
  },
  voltageValue: {
    fontSize: 20,
    fontWeight: 'bold',
    fontFamily: 'monospace',
  },
  socValue: {
    fontSize: 11,
    marginTop: 2,
  },
  currentRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  currentLabel: {
    fontSize: 11,
  },
  currentValue: {
    fontSize: 11,
    fontWeight: 'bold',
    marginLeft: 4,
    fontFamily: 'monospace',
  },
  alternatorText: {
    fontSize: 11,
    textAlign: 'center',
  },
  details: {
    paddingVertical: 8,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 4,
  },
  detailLabel: {
    fontSize: 12,
  },
  detailValue: {
    fontSize: 12,
    fontWeight: 'bold',
    fontFamily: 'monospace',
  },
});
