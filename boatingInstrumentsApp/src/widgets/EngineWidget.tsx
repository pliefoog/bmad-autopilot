import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { WidgetCard } from './WidgetCard';
import { WidgetShell } from '../components/WidgetShell';
import { PrimaryMetricCell } from '../components/PrimaryMetricCell';
import { useNmeaStore } from '../core/nmeaStore';
import { useTheme } from '../core/themeStore';
import { createThemedStyles, getStateColor } from '../styles/theme.stylesheet';
import { useWidgetExpanded } from '../hooks/useWidgetExpanded';

interface EngineWidgetProps {
  engineId?: 'port' | 'starboard' | 'main';
  showMultipleEngines?: boolean;
  widgetId?: string; // For layout persistence
}

export const EngineWidget: React.FC<EngineWidgetProps> = ({ 
  engineId = 'main',
  showMultipleEngines = false,
  widgetId = 'engine-widget'
}) => {
  const engine = useNmeaStore((state: any) => state.nmeaData.engine);
  const theme = useTheme();
  const styles = useMemo(() => createThemedStyles(theme), [theme]);
  
  // AC 3: State persists per widget in layout storage
  const [expanded, toggleExpanded] = useWidgetExpanded(widgetId);

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

  // Marine safety thresholds - Conservative for reliability
  const RPM_CAUTION = 2000;  // Orange warning threshold
  const RPM_CRITICAL = 3800; // Red alarm threshold
  const RPM_OVERREV = 4200;  // Flashing red critical
  
  const getWidgetState = () => {
    if (rpm === undefined) return 'no-data';
    
    // Critical alarms - immediate attention required
    if (coolantTemp > 100 || oilPressure < 5 || rpm > RPM_OVERREV) return 'alarm';
    
    // Warning conditions - attention needed
    if (coolantTemp > 90 || oilPressure < 10 || rpm > RPM_CRITICAL) return 'highlighted';
    
    return 'normal';
  };

  // Individual metric state functions for PrimaryMetricCell
  const getRpmState = () => {
    if (rpm === undefined) return 'normal';
    if (rpm > RPM_OVERREV) return 'alarm';
    if (rpm > RPM_CRITICAL) return 'warning';
    return 'normal';
  };

  const getTempState = () => {
    if (coolantTemp === undefined) return 'normal';
    if (coolantTemp > 100) return 'alarm';
    if (coolantTemp > 90) return 'warning';
    return 'normal';
  };

  const getPressureState = () => {
    if (oilPressure === undefined) return 'normal';
    if (oilPressure < 5) return 'alarm';
    if (oilPressure < 10) return 'warning';
    return 'normal';
  };

  const getRpmDisplay = () => {
    if (rpm === undefined) return '---';
    
    const state = getWidgetState();
    const rpmText = Math.round(rpm).toString();
    
    // Add flashing effect for over-rev
    if (state === 'alarm' && rpm > RPM_OVERREV) {
      return rpmText; // Flashing handled by widget state
    }
    
    return rpmText;
  };

  const getEngineStatus = () => {
    if (rpm === undefined) return 'No Engine Data';
    if (rpm === 0) return 'Engine Off';
    if (rpm > RPM_OVERREV) return 'OVER-REV!';
    if (rpm > RPM_CRITICAL) return 'High RPM';
    if (rpm > RPM_CAUTION) return 'Elevated RPM';
    if (rpm < 500) return 'Idle';
    return 'Running';
  };

  const formatEngineHours = (hours: number) => {
    if (hours < 100) return `${hours.toFixed(1)}h`;
    return `${Math.round(hours)}h`;
  };

  // AC 9: EngineWidget collapsed: 3 key metrics (RPM, TEMP, PRESS only)
  const renderCollapsedView = () => (
    <View style={styles.grid2x2}>
      {/* First Row: RPM and TEMP */}
      <View style={styles.gridRow}>
        <PrimaryMetricCell
          mnemonic="RPM"
          value={getRpmDisplay()}
          unit="rpm"
          state={getRpmState()}
          style={styles.gridCell}
        />
        <PrimaryMetricCell
          mnemonic="TEMP"
          value={coolantTemp !== undefined ? Math.round(coolantTemp) : '---'}
          unit="°C"
          state={getTempState()}
          style={styles.gridCell}
        />
      </View>
      
      {/* Second Row: PRESS only (centered) */}
      <View style={styles.gridRow}>
        <PrimaryMetricCell
          mnemonic="PRESS"
          value={oilPressure !== undefined ? Math.round(oilPressure) : '---'}
          unit="psi"
          state={getPressureState()}
          style={styles.gridCellCentered}
        />
      </View>

      <Text style={styles.secondary}>
        {getEngineStatus()}
      </Text>
    </View>
  );

  // AC 16: Expanded shows all 7 metrics (RPM, TEMP, PRESS, HOURS + FUEL, ALT, BOOST, LOAD)
  const renderExpandedView = () => (
    <View style={styles.grid2x2}>
      {/* First Row */}
      <View style={styles.gridRow}>
        <PrimaryMetricCell
          mnemonic="RPM"
          value={getRpmDisplay()}
          unit="rpm"
          state={getRpmState()}
          style={styles.gridCell}
        />
        <PrimaryMetricCell
          mnemonic="TEMP"
          value={coolantTemp !== undefined ? Math.round(coolantTemp) : '---'}
          unit="°C"
          state={getTempState()}
          style={styles.gridCell}
        />
      </View>
      
      {/* Second Row */}
      <View style={styles.gridRow}>
        <PrimaryMetricCell
          mnemonic="PRESS"
          value={oilPressure !== undefined ? Math.round(oilPressure) : '---'}
          unit="psi"
          state={getPressureState()}
          style={styles.gridCell}
        />
        <PrimaryMetricCell
          mnemonic="HOURS"
          value={engineHours !== undefined ? formatEngineHours(engineHours) : '---'}
          unit="h"
          state="normal"
          style={styles.gridCell}
        />
      </View>

      <Text style={styles.secondary}>
        {getEngineStatus()}
      </Text>

      {/* Additional expanded metrics */}
      <View style={styles.grid2x2}>
        <Text style={styles.secondary}>
          Additional Metrics
        </Text>
        
        {/* Third Row */}
        <View style={styles.gridRow}>
          <PrimaryMetricCell
            mnemonic="FUEL"
            value={fuelFlow !== undefined ? fuelFlow.toFixed(1) : '---'}
            unit="L/h"
            state="normal"
            style={styles.gridCell}
          />
          <PrimaryMetricCell
            mnemonic="ALT"
            value={alternatorVoltage !== undefined ? alternatorVoltage.toFixed(1) : '---'}
            unit="V"
            state="normal"
            style={styles.gridCell}
          />
        </View>
        
        {/* Fourth Row */}
        <View style={styles.gridRow}>
          <PrimaryMetricCell
            mnemonic="BOOST"
            value={boostPressure !== undefined ? boostPressure.toFixed(1) : '---'}
            unit="psi"
            state="normal"
            style={styles.gridCell}
          />
          <PrimaryMetricCell
            mnemonic="LOAD"
            value={engineLoad !== undefined ? Math.round(engineLoad) : '---'}
            unit="%"
            state="normal"
            style={styles.gridCell}
          />
        </View>
      </View>
    </View>
  );

  // Legacy render function for reference - to be removed
  const renderDetails = () => (
    <View style={styles.spacer}>
      <View style={styles.gridRow}>
        <Text style={styles.secondary}>Fuel Flow:</Text>
        <Text style={styles.valueSmall}>
          {fuelFlow !== undefined ? `${fuelFlow.toFixed(1)} L/h` : '--'}
        </Text>
      </View>
      
      <View style={styles.gridRow}>
        <Text style={styles.secondary}>Alternator:</Text>
        <Text style={styles.valueSmall}>
          {alternatorVoltage !== undefined ? `${alternatorVoltage.toFixed(1)}V` : '--'}
        </Text>
      </View>
      
      <View style={styles.gridRow}>
        <Text style={styles.secondary}>Boost:</Text>
        <Text style={styles.valueSmall}>
          {boostPressure !== undefined ? `${boostPressure.toFixed(1)} psi` : '--'}
        </Text>
      </View>
      
      <View style={styles.gridRow}>
        <Text style={styles.secondary}>Load:</Text>
        <Text style={styles.valueSmall}>
          {engineLoad !== undefined ? `${Math.round(engineLoad)}%` : '--'}
        </Text>
      </View>
    </View>
  );

  const title = showMultipleEngines ? 
    `Engine ${engineId.charAt(0).toUpperCase() + engineId.slice(1)}` : 
    'Engine';

  // AC 2: Handle tap to toggle expanded state
  const handleToggleExpanded = () => {
    toggleExpanded();
  };

  return (
    <WidgetShell
      expanded={expanded}
      onToggle={handleToggleExpanded}
      testID={`${widgetId}-shell`}
    >
      <WidgetCard 
        title={title}
        icon="car-outline"
        state={getWidgetState()}
        expanded={expanded}
        testID={widgetId}
      >
        {/* AC 9: Collapsed shows 3 metrics (RPM, TEMP, PRESS), AC 16: Expanded shows 7 total metrics */}
        {expanded ? renderExpandedView() : renderCollapsedView()}
      </WidgetCard>
    </WidgetShell>
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
  unitLabel: {
    fontSize: 14,
    marginLeft: 4,
    // Color now set dynamically using theme
  },
  statusText: {
    fontSize: 13,
    fontWeight: '600',
    marginVertical: 4,
    textAlign: 'center',
  },
  // AC 7: Four metrics: 2×2 grid
  // AC 9: Grid cells equal-sized, 8pt gap between cells
  gridContainer: {
    width: '100%',
    paddingHorizontal: 4,
  },
  gridRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 4, // 8pt gap between rows
  },
  gridCell: {
    flex: 1,
    marginHorizontal: 4, // 8pt gap between cells
  },
  // AC 9: Single cell centered in collapsed view
  collapsedCenterCell: {
    flex: 0.6, // Narrower than full row
    alignSelf: 'center',
  },
  // AC 16: Expanded view additional metrics
  expandedMetrics: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
  },
  expandedLabel: {
    fontSize: 11,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 8,
  },
  expandedGrid: {
    width: '100%',
    paddingHorizontal: 4,
  },
});
