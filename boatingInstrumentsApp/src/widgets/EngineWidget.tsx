import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { WidgetCard } from './WidgetCard';
import { useNmeaStore } from '../core/nmeaStore';
import { useTheme } from '../core/themeStore';

interface EngineWidgetProps {
  engineId?: 'port' | 'starboard' | 'main';
  showMultipleEngines?: boolean;
}

export const EngineWidget: React.FC<EngineWidgetProps> = ({ 
  engineId = 'main',
  showMultipleEngines = false 
}) => {
  const engine = useNmeaStore((state: any) => state.nmeaData.engine);
  const theme = useTheme();
  const [selectedView, setSelectedView] = useState<'overview' | 'details'>('overview');

  // Engine data with defaults and multiple engine support
  const engineData = engine?.[engineId] || engine || {};
  const {
    rpm = undefined,
    coolantTemp = undefined,
    oilPressure = undefined,
    fuelFlow = undefined,
    engineHours = undefined,
    alternatorVoltage = undefined,
    boostPressure = undefined,
    engineLoad = undefined
  } = engineData;

  // Marine safety thresholds
  const getStatusColor = () => {
    const tempHigh = coolantTemp > 90; // °C
    const tempCritical = coolantTemp > 100;
    const oilLow = oilPressure < 10; // psi
    const oilCritical = oilPressure < 5;
    const rpmHigh = rpm > 3800;
    const rpmOverrev = rpm > 4200;

    if (tempCritical || oilCritical || rpmOverrev) return theme.error;
    if (tempHigh || oilLow || rpmHigh) return theme.warning;
    if (rpm !== undefined && rpm > 0) return theme.success;
    return theme.text;
  };

  const getWidgetState = () => {
    if (rpm === undefined) return 'no-data';
    if (coolantTemp > 100 || oilPressure < 5 || rpm > 4200) return 'alarm';
    if (coolantTemp > 90 || oilPressure < 10 || rpm > 3800) return 'alarm';
    if (rpm > 0) return 'normal';
    return 'normal';
  };

  const formatEngineHours = (hours: number) => {
    if (hours < 100) return `${hours.toFixed(1)}h`;
    return `${Math.round(hours)}h`;
  };

  const renderOverview = () => (
    <View style={styles.overview}>
      <View style={styles.primaryRow}>
        <Text style={[styles.rpmValue, { color: getStatusColor() }]}>
          {rpm !== undefined ? Math.round(rpm) : '--'}
        </Text>
        <Text style={[styles.rpmLabel, { color: theme.textSecondary }]}>RPM</Text>
      </View>
      
      <View style={styles.secondaryRow}>
        <View style={styles.metric}>
          <Text style={[styles.metricValue, { color: theme.text }]}>
            {coolantTemp !== undefined ? `${Math.round(coolantTemp)}°` : '--'}
          </Text>
          <Text style={[styles.metricLabel, { color: theme.textSecondary }]}>TEMP</Text>
        </View>
        
        <View style={styles.metric}>
          <Text style={[styles.metricValue, { color: theme.text }]}>
            {oilPressure !== undefined ? Math.round(oilPressure) : '--'}
          </Text>
          <Text style={[styles.metricLabel, { color: theme.textSecondary }]}>PSI</Text>
        </View>
      </View>

      {engineHours !== undefined && (
        <Text style={[styles.hours, { color: theme.textSecondary }]}>
          {formatEngineHours(engineHours)} engine hours
        </Text>
      )}
    </View>
  );

  const renderDetails = () => (
    <View style={styles.details}>
      <View style={styles.detailRow}>
        <Text style={[styles.detailLabel, { color: theme.textSecondary }]}>Fuel Flow:</Text>
        <Text style={[styles.detailValue, { color: theme.text }]}>
          {fuelFlow !== undefined ? `${fuelFlow.toFixed(1)} L/h` : '--'}
        </Text>
      </View>
      
      <View style={styles.detailRow}>
        <Text style={[styles.detailLabel, { color: theme.textSecondary }]}>Alternator:</Text>
        <Text style={[styles.detailValue, { color: theme.text }]}>
          {alternatorVoltage !== undefined ? `${alternatorVoltage.toFixed(1)}V` : '--'}
        </Text>
      </View>
      
      <View style={styles.detailRow}>
        <Text style={[styles.detailLabel, { color: theme.textSecondary }]}>Boost:</Text>
        <Text style={[styles.detailValue, { color: theme.text }]}>
          {boostPressure !== undefined ? `${boostPressure.toFixed(1)} psi` : '--'}
        </Text>
      </View>
      
      <View style={styles.detailRow}>
        <Text style={[styles.detailLabel, { color: theme.textSecondary }]}>Load:</Text>
        <Text style={[styles.detailValue, { color: theme.text }]}>
          {engineLoad !== undefined ? `${Math.round(engineLoad)}%` : '--'}
        </Text>
      </View>
    </View>
  );

  const title = showMultipleEngines ? 
    `Engine ${engineId.charAt(0).toUpperCase() + engineId.slice(1)}` : 
    'Engine';

  return (
    <TouchableOpacity 
      onPress={() => setSelectedView(selectedView === 'overview' ? 'details' : 'overview')}
      style={styles.container}
    >
      <WidgetCard 
        title={title}
        icon="car-outline"
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
    alignItems: 'center',
    paddingVertical: 8,
  },
  primaryRow: {
    alignItems: 'center',
    marginBottom: 8,
  },
  rpmValue: {
    fontSize: 32,
    fontWeight: 'bold',
    fontFamily: 'monospace',
  },
  rpmLabel: {
    fontSize: 12,
    marginTop: -4,
  },
  secondaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    marginBottom: 8,
  },
  metric: {
    alignItems: 'center',
  },
  metricValue: {
    fontSize: 18,
    fontWeight: 'bold',
    fontFamily: 'monospace',
  },
  metricLabel: {
    fontSize: 10,
    marginTop: 2,
  },
  hours: {
    fontSize: 11,
    fontStyle: 'italic',
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
