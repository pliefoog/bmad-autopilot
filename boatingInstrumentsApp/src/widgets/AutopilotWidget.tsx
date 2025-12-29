import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { View, Text, TouchableOpacity, Alert } from 'react-native';
import { UniversalIcon } from '../components/atoms/UniversalIcon';
import { UnifiedWidgetGrid } from '../components/UnifiedWidgetGrid';
import { PrimaryMetricCell } from '../components/PrimaryMetricCell';
import { SecondaryMetricCell } from '../components/SecondaryMetricCell';
import { useNmeaStore } from '../store/nmeaStore';
import { useTheme } from '../store/themeStore';
import { AutopilotCommandManager, AutopilotMode } from '../services/autopilotService';
import { useResponsiveHeader } from '../hooks/useResponsiveHeader';
import { useResponsiveFontSize } from '../hooks/useResponsiveFontSize';

interface AutopilotWidgetProps {
  id: string;
  title: string;
  width?: number;
  height?: number;
  showControls?: boolean;
}

export const AutopilotWidget: React.FC<AutopilotWidgetProps> = ({
  id,
  title,
  width,
  height,
  showControls = false,
}) => {
  // Sensor subscriptions (separate for reactivity)
  const autopilotInstance = useNmeaStore((state) => state.nmeaData.sensors.autopilot?.[0]);
  const compassInstance = useNmeaStore((state) => state.nmeaData.sensors.compass?.[0]);
  const navigationInstance = useNmeaStore((state) => state.nmeaData.sensors.navigation?.[0]);
  const windInstance = useNmeaStore((state) => state.nmeaData.sensors.wind?.[0]);
  const theme = useTheme();

  // Extract metrics from SensorInstance (memoized for performance)
  // Priority for actualHeading: autopilot.actualHeading (if set) → compass.magneticHeading → compass.trueHeading
  // Note: Most autopilots don't broadcast actualHeading; widget reads from compass sensor
  const actualHeadingMetric = useMemo(
    () => autopilotInstance?.getMetric('actualHeading') ?? compassInstance?.getMetric('magneticHeading') ?? compassInstance?.getMetric('trueHeading'),
    [autopilotInstance, compassInstance],
  );
  const targetHeadingMetric = useMemo(
    () => autopilotInstance?.getMetric('targetHeading'),
    [autopilotInstance],
  );
  const rudderMetric = useMemo(
    () => autopilotInstance?.getMetric('rudderAngle'),
    [autopilotInstance],
  );
  const turnRateMetric = useMemo(
    () => compassInstance?.getMetric('rateOfTurn'),
    [compassInstance],
  );

  // Extract SI values for logic (ensure numbers)
  const actualHeading = typeof actualHeadingMetric?.si_value === 'number' ? actualHeadingMetric.si_value : 0;
  const targetHeading = typeof targetHeadingMetric?.si_value === 'number' ? targetHeadingMetric.si_value : 0;
  const rudderPosition = typeof rudderMetric?.si_value === 'number' ? rudderMetric.si_value : 0;
  const [isCommandPending, setIsCommandPending] = useState(false);
  const commandManager = useRef<AutopilotCommandManager | null>(null);

  // Responsive sizing
  const { iconSize: headerIconSize, fontSize: headerFontSize } = useResponsiveHeader(height);
  const fontSize = useResponsiveFontSize(width, height);

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

  // Autopilot data with defaults - extracted from SensorInstance
  const mode = autopilotInstance?.getMetric('mode')?.si_value as string | undefined ?? 'STANDBY';
  const engaged = autopilotInstance?.getMetric('engaged')?.si_value ?? false;
  const active = autopilotInstance?.getMetric('active')?.si_value ?? false;
  const headingSource = autopilotInstance?.getMetric('headingSource')?.si_value ?? 'COMPASS';
  const alarm = autopilotInstance?.getMetric('alarm')?.si_value ?? false;

  // Conditional metrics based on mode (from correct sensors)
  const windAngleMetric = useMemo(
    () => mode === 'WIND' || mode === 'wind' ? windInstance?.getMetric('direction') : undefined,
    [mode, windInstance],
  );
  const crossTrackErrorMetric = useMemo(
    () => (mode === 'NAV' || mode === 'nav' || mode === 'TRACK' || mode === 'track') ? navigationInstance?.getMetric('crossTrackError') : undefined,
    [mode, navigationInstance],
  );

  // Alarm states
  const headingAlarm = autopilotInstance?.getAlarmState('actualHeading') ?? 0;
  const rudderAlarm = autopilotInstance?.getAlarmState('rudderAngle') ?? 0;
  const turnRateAlarm = compassInstance?.getAlarmState('rateOfTurn') ?? 0;
  const hasAlarms = alarm;

  // Status color determination
  const getStatusColor = () => {
    if (hasAlarms) return theme.error;
    if (!active && !engaged) return theme.textSecondary;
    const modeUpper = mode?.toUpperCase();
    if (modeUpper === 'AUTO' || modeUpper === 'WIND' || modeUpper === 'TRACK' || modeUpper === 'NAV') return theme.success;
    return theme.warning;
  };

  const getWidgetState = () => {
    if (autopilotInstance === undefined) return 'no-data';
    if (hasAlarms) return 'alarm';
    const modeUpper = mode?.toUpperCase();
    if ((active || engaged) && (modeUpper === 'AUTO' || modeUpper === 'WIND' || modeUpper === 'TRACK'))
      return 'normal';
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
        { text: 'Confirm', onPress: onConfirm, style: 'destructive' },
      ],
      { cancelable: true },
    );
  };

  // AC1: Engage autopilot in compass mode
  const handleEngage = async (): Promise<void> => {
    if (!commandManager.current) return;

    const headingToUse = actualHeading || targetHeading;
    if (!headingToUse) {
      Alert.alert('Error', 'No heading available for autopilot engagement');
      return;
    }

    setIsCommandPending(true);
    try {
      const success = await commandManager.current.engageCompassMode(actualHeading);
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
            Alert.alert(
              'Emergency Failed',
              'Emergency disengage failed - use manual controls immediately',
            );
          }
        } catch (error) {
          Alert.alert(
            'Emergency Failed',
            'Emergency disengage failed - use manual controls immediately',
          );
        } finally {
          setIsCommandPending(false);
        }
      },
    );
  };

  // Header component with responsive sizing
  const headerComponent = useMemo(() => (
    <View
      style={{
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        width: '100%',
        paddingHorizontal: 16,
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <UniversalIcon
          name="swap-horizontal-outline"
          size={headerIconSize}
          color={theme.iconPrimary}
        />
        <Text
          style={{
            fontSize: headerFontSize,
            fontWeight: 'bold',
            letterSpacing: 0.5,
            color: theme.textSecondary,
            textTransform: 'uppercase',
          }}
        >
          {title}
        </Text>
      </View>
    </View>
  ), [headerIconSize, headerFontSize, theme, title]);

  return (
    <UnifiedWidgetGrid
      theme={theme}
      header={headerComponent}
      widgetWidth={width || 400}
      widgetHeight={height || 300}
      columns={2}
      primaryRows={2}
      secondaryRows={2}
      columnSpans={[1, 1, 1, 1, 2, 2]}
      testID={`autopilot-widget-${id}`}
    >
      {/* Row 1: Actual Heading | Target Heading */}
      <PrimaryMetricCell
        data={{
          mnemonic: 'HDG',
          value: actualHeadingMetric?.formattedValue,
          unit: actualHeadingMetric?.unit,
          alarmState: headingAlarm,
        }}
        fontSize={{
          mnemonic: fontSize.label,
          value: fontSize.value,
          unit: fontSize.unit,
        }}
      />
      <PrimaryMetricCell
        data={{
          mnemonic: 'TGT',
          value: targetHeadingMetric?.formattedValue,
          unit: targetHeadingMetric?.unit,
          alarmState: headingAlarm,
        }}
        fontSize={{
          mnemonic: fontSize.label,
          value: fontSize.value,
          unit: fontSize.unit,
        }}
      />

      {/* Row 2: Rudder Position | Turn Rate */}
      <PrimaryMetricCell
        data={{
          mnemonic: 'RUDR',
          value: rudderMetric?.formattedValue,
          unit: rudderMetric?.unit,
          alarmState: rudderAlarm,
        }}
        fontSize={{
          mnemonic: fontSize.label,
          value: fontSize.value,
          unit: fontSize.unit,
        }}
      />
      <PrimaryMetricCell
        data={{
          mnemonic: 'TURN',
          value: turnRateMetric?.formattedValue,
          unit: turnRateMetric?.unit,
          alarmState: turnRateAlarm,
        }}
        fontSize={{
          mnemonic: fontSize.label,
          value: fontSize.value,
          unit: fontSize.unit,
        }}
      />

      {/* Row 3 (Secondary): Autopilot Mode with Engagement Status */}
      <SecondaryMetricCell
        data={{
          mnemonic: 'MODE',
          value: mode,
          unit: (active || engaged) ? '(ACTIVE)' : '',
          alarmState: hasAlarms ? 2 : 0,
        }}
        fontSize={{
          mnemonic: fontSize.label * 0.7,
          value: fontSize.value * 0.7,
          unit: fontSize.unit * 0.7,
        }}
      />

      {/* Row 4 (Secondary): Heading Source or Alarm */}
      <SecondaryMetricCell
        data={{
          mnemonic: hasAlarms ? 'ALARM' : 'HDG SRC',
          value: hasAlarms ? 'CHECK SYSTEM' : (headingSource as string || 'COMPASS'),
          unit: '',
          alarmState: hasAlarms ? 2 : 0,
        }}
        fontSize={{
          mnemonic: fontSize.label * 0.7,
          value: fontSize.value * 0.7,
          unit: fontSize.unit * 0.7,
        }}
      />
    </UnifiedWidgetGrid>
  );
};

export default AutopilotWidget;
