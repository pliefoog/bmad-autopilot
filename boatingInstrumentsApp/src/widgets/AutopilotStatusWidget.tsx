import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { UniversalIcon } from '../components/atoms/UniversalIcon';
import { WidgetCard } from './WidgetCard';
import { PrimaryMetricCell } from '../components/PrimaryMetricCell';
import { useNmeaStore } from '../store/nmeaStore';
import { useTheme } from '../store/themeStore';
import { useMetricDisplay } from '../hooks/useMetricDisplay';
import { AutopilotCommandManager, AutopilotMode } from '../services/autopilotService';
import Svg, { Circle, Line, Path, Text as SvgText } from 'react-native-svg';

interface AutopilotStatusWidgetProps {
  showControls?: boolean;
}

export const AutopilotStatusWidget: React.FC<AutopilotStatusWidgetProps> = ({ showControls = false }) => {
  // Clean sensor data access - NMEA Store v2.0
  const autopilot = useNmeaStore((state) => state.getSensorData('autopilot', 0));
  const compass = useNmeaStore((state) => state.getSensorData('compass', 0));
  const theme = useTheme();
  
  // Extract heading data from compass or autopilot
  const currentHeading = autopilot?.actualHeading ?? compass?.heading ?? 0;
  // Metric display hooks for angles - using clean sensor data
  const actualHeadingDisplay = useMetricDisplay('angle', currentHeading);
  const targetHeadingDisplay = useMetricDisplay('angle', autopilot?.targetHeading ?? 0);
  const rudderPositionDisplay = useMetricDisplay('angle', autopilot?.rudderPosition ?? 0);
  const [selectedView, setSelectedView] = useState<'overview' | 'details' | 'controls'>('overview');
  const [isCommandPending, setIsCommandPending] = useState(false);
  const commandManager = useRef<AutopilotCommandManager | null>(null);

  // Initialize command manager
  useEffect(() => {
    if (!commandManager.current) {
      commandManager.current = new AutopilotCommandManager();
      // TODO: Connect to NMEA connection when available
    }
    
    return () => {
      if (commandManager.current) {
        commandManager.current.disconnect();
      }
    };
  }, []);

  // Autopilot data with defaults
  const {
    mode = 'STANDBY',
    engaged = false,
    active = false,
    targetHeading = undefined,
    actualHeading = undefined,
    rudderPosition = undefined,
    windAngle = undefined,
    crossTrackError = undefined,
    turnRate = undefined,
    headingSource = 'COMPASS',
    alarms = []
  } = autopilot || {};

  // Status color determination
  const getStatusColor = () => {
    if (alarms && alarms.length > 0) return theme.error;
    if (!active && !engaged) return theme.textSecondary;
    if (mode === 'AUTO' || mode === 'WIND' || mode === 'TRACK') return theme.success;
    return theme.warning;
  };

  const getWidgetState = () => {
    if (autopilot === undefined) return 'no-data';
    if (alarms && alarms.length > 0) return 'alarm';
    if ((active || engaged) && (mode === 'AUTO' || mode === 'WIND' || mode === 'TRACK')) return 'normal';
    if (active || engaged) return 'alarm';
    return 'normal';
  };

  // AC11: Deliberate user confirmation for engagement commands
  const showConfirmationDialog = (message: string, onConfirm: () => void): void => {
    Alert.alert(
      'Autopilot Command Confirmation',
      message,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Confirm', onPress: onConfirm, style: 'destructive' }
      ],
      { cancelable: true }
    );
  };

  // AC1: Engage autopilot in compass mode
  const handleEngage = async (): Promise<void> => {
    if (!commandManager.current) return;
    
    const currentHeading = heading || autopilot?.targetHeading;
    if (!currentHeading) {
      Alert.alert('Error', 'No heading available for autopilot engagement');
      return;
    }

    setIsCommandPending(true);
    try {
      const success = await commandManager.current.engageCompassMode(currentHeading);
      if (!success) {
        Alert.alert('Command Failed', 'Failed to engage autopilot');
      }
    } catch (error) {
      Alert.alert('Error', error instanceof Error ? error.message : 'Unknown error occurred');
    } finally {
      setIsCommandPending(false);
    }
  };

  // AC2: Disengage autopilot
  const handleDisengage = async (): Promise<void> => {
    if (!commandManager.current) return;
    
    setIsCommandPending(true);
    try {
      const success = await commandManager.current.disengageAutopilot();
      if (!success) {
        Alert.alert('Command Failed', 'Failed to disengage autopilot');
      }
    } catch (error) {
      Alert.alert('Error', error instanceof Error ? error.message : 'Unknown error occurred');
    } finally {
      setIsCommandPending(false);
    }
  };

  // AC3: Adjust heading in 1° and 10° increments
  const handleHeadingAdjust = async (degrees: number): Promise<void> => {
    if (!commandManager.current) return;
    
    setIsCommandPending(true);
    try {
      const success = await commandManager.current.adjustHeading(degrees);
      if (!success) {
        Alert.alert('Command Failed', `Failed to adjust heading by ${degrees}°`);
      }
    } catch (error) {
      Alert.alert('Error', error instanceof Error ? error.message : 'Unknown error occurred');
    } finally {
      setIsCommandPending(false);
    }
  };

  // AC5: Set standby mode
  const handleStandby = async (): Promise<void> => {
    if (!commandManager.current) return;
    
    setIsCommandPending(true);
    try {
      const success = await commandManager.current.setStandby();
      if (!success) {
        Alert.alert('Command Failed', 'Failed to set standby mode');
      }
    } catch (error) {
      Alert.alert('Error', error instanceof Error ? error.message : 'Unknown error occurred');
    } finally {
      setIsCommandPending(false);
    }
  };

  // AC14: Emergency disengage
  const handleEmergencyDisengage = async (): Promise<void> => {
    if (!commandManager.current) return;
    
    showConfirmationDialog(
      'EMERGENCY DISENGAGE - This will immediately stop autopilot control. Continue?',
      async () => {
        setIsCommandPending(true);
        try {
          const success = await commandManager.current?.emergencyDisengage();
          if (!success) {
            Alert.alert('Emergency Failed', 'Emergency disengage failed - use manual controls immediately');
          }
        } catch (error) {
          Alert.alert('Emergency Failed', 'Emergency disengage failed - use manual controls immediately');
        } finally {
          setIsCommandPending(false);
        }
      }
    );
  };

  const CompassRose: React.FC<{ actual?: number; target?: number; size: number }> = ({ 
    actual, 
    target, 
    size = 80 
  }) => {
    const center = size / 2;
    const radius = size * 0.4;

    return (
      <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {/* Outer compass ring */}
        <Circle 
          cx={center} 
          cy={center} 
          r={radius} 
          fill="none" 
          stroke={theme.border} 
          strokeWidth={1}
        />
        
        {/* Cardinal directions */}
        <SvgText x={center} y={center - radius + 8} textAnchor="middle" fill={theme.text} fontSize={10}>N</SvgText>
        <SvgText x={center + radius - 4} y={center + 3} textAnchor="middle" fill={theme.text} fontSize={10}>E</SvgText>
        <SvgText x={center} y={center + radius - 2} textAnchor="middle" fill={theme.text} fontSize={10}>S</SvgText>
        <SvgText x={center - radius + 4} y={center + 3} textAnchor="middle" fill={theme.text} fontSize={10}>W</SvgText>
        
        {/* Target heading */}
        {target !== undefined && (
          <Line
            x1={center}
            y1={center}
            x2={center + Math.sin((target * Math.PI) / 180) * (radius - 5)}
            y2={center - Math.cos((target * Math.PI) / 180) * (radius - 5)}
            stroke={theme.accent}
            strokeWidth={2}
            strokeDasharray="3,2"
          />
        )}
        
        {/* Actual heading */}
        {actual !== undefined && (
          <Line
            x1={center}
            y1={center}
            x2={center + Math.sin((actual * Math.PI) / 180) * radius}
            y2={center - Math.cos((actual * Math.PI) / 180) * radius}
            stroke={getStatusColor()}
            strokeWidth={3}
          />
        )}
        
        {/* Center dot */}
        <Circle cx={center} cy={center} r={2} fill={theme.text} />
      </Svg>
    );
  };

  // Get metric states for autopilot parameters
  const getHeadingMetricState = (): 'normal' | 'warning' | 'alarm' | undefined => {
    if (alarms && alarms.length > 0) return 'alarm';
    if (!(active || engaged)) return undefined; // No data when inactive
    return 'normal';
  };

  const getRudderMetricState = (): 'normal' | 'warning' | 'alarm' | undefined => {
    if (rudderPosition === undefined) return undefined;
    if (alarms && alarms.length > 0) return 'alarm';
    const absRudder = Math.abs(rudderPosition);
    if (absRudder > 20) return 'warning'; // High rudder angle
    return 'normal';
  };

  const renderOverview = () => (
    <View style={styles.overview}>
      <View style={styles.statusRow}>
        <Text style={[styles.modeText, { color: getStatusColor() }]}>
          {mode}
        </Text>
        <Text style={[styles.engagedText, { color: (active || engaged) ? theme.success : theme.textSecondary }]}>
          {(active || engaged) ? 'ACTIVE' : 'STANDBY'}
        </Text>
      </View>

      <View style={styles.metricGrid}>
        <PrimaryMetricCell
          mnemonic="ACTUAL"
          data={actualHeadingDisplay}
          state={getHeadingMetricState()}
          style={styles.metricCell}
        />
        <PrimaryMetricCell
          mnemonic="TARGET"
          data={targetHeadingDisplay}
          state={getHeadingMetricState()}
          style={styles.metricCell}
        />
        {rudderPosition !== undefined && (
          <PrimaryMetricCell
            mnemonic="RUD"
            data={rudderPositionDisplay}
            state={getRudderMetricState()}
            style={styles.metricCell}
          />
        )}
      </View>

      <View style={styles.compassContainer}>
        <CompassRose actual={actualHeading} target={targetHeading} size={80} />
      </View>

      {alarms && alarms.length > 0 && (
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
          <UniversalIcon name="warning-outline" size={14} color={theme.error} style={{ marginRight: 4 }} />
          <Text style={[styles.alarmText, { color: theme.error }]}>
            {alarms[0]}
          </Text>
        </View>
      )}
    </View>
  );

  const renderDetails = () => (
    <View style={styles.details}>
      <View style={styles.detailRow}>
        <Text style={[styles.detailLabel, { color: theme.textSecondary }]}>Heading Source:</Text>
        <Text style={[styles.detailValue, { color: theme.text }]}>
          {headingSource}
        </Text>
      </View>
      
      {windAngle !== undefined && (
        <View style={styles.detailRow}>
          <Text style={[styles.detailLabel, { color: theme.textSecondary }]}>Wind Angle:</Text>
          <Text style={[styles.detailValue, { color: theme.text }]}>
            {windAngle.toFixed(0)}°
          </Text>
        </View>
      )}
      
      {crossTrackError !== undefined && (
        <View style={styles.detailRow}>
          <Text style={[styles.detailLabel, { color: theme.textSecondary }]}>XTE:</Text>
          <Text style={[styles.detailValue, { 
            color: Math.abs(crossTrackError) > 50 ? theme.warning : theme.text 
          }]}>
            {`${crossTrackError > 0 ? 'STB' : 'PORT'} ${Math.abs(crossTrackError).toFixed(1)}m`}
          </Text>
        </View>
      )}
      
      {turnRate !== undefined && (
        <View style={styles.detailRow}>
          <Text style={[styles.detailLabel, { color: theme.textSecondary }]}>Turn Rate:</Text>
          <Text style={[styles.detailValue, { color: theme.text }]}>
            {`${turnRate > 0 ? '+' : ''}${turnRate.toFixed(1)}°/min`}
          </Text>
        </View>
      )}
    </View>
  );

  const renderControls = () => (
    <View style={styles.controls}>
      {/* AC13: Command status display */}
      {autopilot?.commandStatus && (
        <View style={[styles.commandStatus, { 
          backgroundColor: autopilot.commandStatus === 'success' ? theme.success + '20' : 
                           autopilot.commandStatus === 'error' ? theme.error + '20' :
                           theme.warning + '20'
        }]}>
          <Text style={[styles.commandStatusText, { 
            color: autopilot.commandStatus === 'success' ? theme.success :
                   autopilot.commandStatus === 'error' ? theme.error :
                   theme.warning
          }]}>
            {autopilot.commandMessage || 'Command in progress...'}
          </Text>
        </View>
      )}

      {/* Emergency Controls */}
      <View style={styles.emergencyRow}>
        <TouchableOpacity
          style={[styles.emergencyButton, { backgroundColor: theme.error }]}
          onPress={handleEmergencyDisengage}
          disabled={isCommandPending}
        >
          <Text style={[styles.emergencyButtonText, { color: theme.surface }]}>
            EMERGENCY STOP
          </Text>
        </TouchableOpacity>
      </View>

      {/* Main Controls */}
      <View style={styles.controlRow}>
        {!active && !engaged ? (
          <TouchableOpacity
            style={[styles.controlButton, styles.engageButton, { backgroundColor: theme.success }]}
            onPress={handleEngage}
            disabled={isCommandPending || !heading}
          >
            <Text style={[styles.controlButtonText, { color: theme.surface }]}>
              ENGAGE
            </Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={[styles.controlButton, styles.disengageButton, { backgroundColor: theme.warning }]}
            onPress={handleDisengage}
            disabled={isCommandPending}
          >
            <Text style={[styles.controlButtonText, { color: theme.surface }]}>
              DISENGAGE
            </Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={[styles.controlButton, { backgroundColor: theme.textSecondary }]}
          onPress={handleStandby}
          disabled={isCommandPending}
        >
          <Text style={[styles.controlButtonText, { color: theme.surface }]}>
            STANDBY
          </Text>
        </TouchableOpacity>
      </View>

      {/* Heading Adjustments - AC3: ±1° and ±10° increments */}
      {(active || engaged) && (
        <>
          <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>
            HEADING ADJUSTMENT
          </Text>
          
          <View style={styles.headingControls}>
            <View style={styles.headingRow}>
              <TouchableOpacity
                style={[styles.headingButton, { borderColor: theme.accent }]}
                onPress={() => handleHeadingAdjust(-10)}
                disabled={isCommandPending}
              >
                <Text style={[styles.headingButtonText, { color: theme.accent }]}>
                  -10°
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.headingButton, { borderColor: theme.accent }]}
                onPress={() => handleHeadingAdjust(-1)}
                disabled={isCommandPending}
              >
                <Text style={[styles.headingButtonText, { color: theme.accent }]}>
                  -1°
                </Text>
              </TouchableOpacity>

              <View style={styles.currentHeading}>
                <Text style={[styles.currentHeadingValue, { color: theme.text }]}>
                  {targetHeading ? Math.round(targetHeading) : '--'}°
                </Text>
              </View>

              <TouchableOpacity
                style={[styles.headingButton, { borderColor: theme.accent }]}
                onPress={() => handleHeadingAdjust(1)}
                disabled={isCommandPending}
              >
                <Text style={[styles.headingButtonText, { color: theme.accent }]}>
                  +1°
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.headingButton, { borderColor: theme.accent }]}
                onPress={() => handleHeadingAdjust(10)}
                disabled={isCommandPending}
              >
                <Text style={[styles.headingButtonText, { color: theme.accent }]}>
                  +10°
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </>
      )}
    </View>
  );

  const cycleView = () => {
    if (selectedView === 'overview') {
      setSelectedView('details');
    } else if (selectedView === 'details') {
      setSelectedView(showControls ? 'controls' : 'overview');
    } else {
      setSelectedView('overview');
    }
  };

  return (
    <TouchableOpacity 
      onPress={cycleView}
      style={styles.container}
    >
      <WidgetCard 
        title="Autopilot"
        icon="swap-horizontal-outline"
        state={getWidgetState()}
      >
        {selectedView === 'overview' && renderOverview()}
        {selectedView === 'details' && renderDetails()}
        {selectedView === 'controls' && renderControls()}
      </WidgetCard>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  metricGrid: {
    flexDirection: 'row',
    flex: 1,
    marginBottom: 8,
  },
  metricCell: {
    flex: 1,
  },
  overview: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: 8,
  },
  modeText: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  engagedText: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  compassContainer: {
    marginBottom: 8,
  },
  headingRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    marginBottom: 8,
  },
  headingItem: {
    alignItems: 'center',
  },
  headingLabel: {
    fontSize: 10,
  },
  headingValue: {
    fontSize: 16,
    fontWeight: 'bold',
    fontFamily: 'monospace',
  },
  rudderText: {
    fontSize: 11,
    marginBottom: 4,
  },
  alarmText: {
    fontSize: 11,
    fontWeight: 'bold',
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
  // Control styles for autopilot command interface
  controls: {
    paddingVertical: 8,
  },
  commandStatus: {
    padding: 8,
    borderRadius: 4,
    marginBottom: 8,
  },
  commandStatusText: {
    fontSize: 12,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  emergencyRow: {
    marginBottom: 12,
  },
  emergencyButton: {
    padding: 12,
    borderRadius: 6,
    alignItems: 'center',
  },
  emergencyButtonText: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  controlRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
    gap: 8,
  },
  controlButton: {
    flex: 1,
    padding: 10,
    borderRadius: 6,
    alignItems: 'center',
  },
  engageButton: {
    // Additional styles for engage button if needed
  },
  disengageButton: {
    // Additional styles for disengage button if needed
  },
  controlButtonText: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    marginBottom: 8,
    textAlign: 'center',
  },
  headingControls: {
    alignItems: 'center',
  },
  headingButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderRadius: 4,
    minWidth: 44, // AC6: Accessibility - 44pt touch targets
  },
  headingButtonText: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  currentHeading: {
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  currentHeadingValue: {
    fontSize: 18,
    fontWeight: 'bold',
    fontFamily: 'monospace',
  },
});
