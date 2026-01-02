/**
 * Critical Alarm Visual Indicators - High-contrast marine display system
 * Provides visual alerts with flashing animations and escalation levels
 */

import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Dimensions,
  Platform,
  ViewStyle,
  TextStyle,
} from 'react-native';
import { useTheme, ThemeColors } from '../../store/themeStore';
import { useAlarmStore, Alarm, AlarmLevel } from '../../store/alarmStore';

// Marine safety color standards for high visibility
// CRITICAL SAFETY: These specific hex colors meet IMO SOLAS visibility requirements
// and must remain fixed for marine safety compliance. They work with theme.text overlay.
const MARINE_COLORS = {
  // Critical navigation hazards - Pure Red (IMO standard)
  CRITICAL_RED: '#FF0000',
  CRITICAL_RED_FLASH: '#FF3333',

  // Warning conditions - Amber/Yellow (IMO standard)
  WARNING_AMBER: '#FFA500',
  WARNING_AMBER_FLASH: '#FFD700',

  // Information - Blue (IMO standard)
  INFO_BLUE: '#0066FF',
  INFO_BLUE_FLASH: '#3399FF',

  // High contrast text - Black (for amber backgrounds)
  TEXT_BLACK: '#000000',

  // Overlay transparency for critical alerts
  OVERLAY_CRITICAL: 'rgba(255, 0, 0, 0.2)',
};

// Marine visibility requirements - high contrast ratios
const MARINE_STYLES = {
  fontSize: {
    critical: 28,
    warning: 24,
    info: 20,
  },
  borderWidth: {
    critical: 3,
    warning: 2,
    info: 1,
  },
  shadowRadius: 8,
  shadowOpacity: 0.8,
};

interface CriticalAlarmOverlayProps {
  alarm: Alarm;
  onAcknowledge?: (alarmId: string) => void;
  style?: ViewStyle;
}

interface FlashingAnimationProps {
  level: AlarmLevel;
  children: React.ReactNode;
  enabled: boolean;
}

/**
 * Flashing animation component for marine visibility
 * Uses different flash rates based on alarm severity
 */
const FlashingAnimation: React.FC<FlashingAnimationProps> = ({ level, children, enabled }) => {
  const opacity = useRef(new Animated.Value(1)).current;
  const animationRef = useRef<Animated.CompositeAnimation | null>(null);

  useEffect(() => {
    if (!enabled) {
      opacity.setValue(1);
      animationRef.current?.stop();
      return;
    }

    // Marine flash rates based on severity
    const flashDuration = level === 'critical' ? 300 : level === 'warning' ? 500 : 800;

    const flash = () => {
      animationRef.current = Animated.loop(
        Animated.sequence([
          Animated.timing(opacity, {
            toValue: 0.2,
            duration: flashDuration,
            useNativeDriver: true,
          }),
          Animated.timing(opacity, {
            toValue: 1,
            duration: flashDuration,
            useNativeDriver: true,
          }),
        ]),
      );
      animationRef.current.start();
    };

    flash();

    return () => {
      animationRef.current?.stop();
    };
  }, [level, enabled, opacity]);

  return <Animated.View style={{ opacity: enabled ? opacity : 1 }}>{children}</Animated.View>;
};

/**
 * Critical Alarm Visual Indicator
 * High-contrast display for individual alarms with marine safety standards
 */
export const CriticalAlarmIndicator: React.FC<CriticalAlarmOverlayProps> = ({
  alarm,
  onAcknowledge,
  style,
}) => {
  const theme = useTheme();
  const [showFlashing, setShowFlashing] = useState(true);

  // Stop flashing after 30 seconds for critical, 20s for warning, 10s for info
  useEffect(() => {
    const flashDuration =
      alarm.level === 'critical' ? 30000 : alarm.level === 'warning' ? 20000 : 10000;

    const timer = setTimeout(() => {
      setShowFlashing(false);
    }, flashDuration);

    return () => clearTimeout(timer);
  }, [alarm.level]);

  const getAlarmColors = (level: AlarmLevel) => {
    switch (level) {
      case 'critical':
        return {
          background: MARINE_COLORS.CRITICAL_RED,
          backgroundFlash: MARINE_COLORS.CRITICAL_RED_FLASH,
          text: theme.text,
          border: theme.text,
        };
      case 'warning':
        return {
          background: MARINE_COLORS.WARNING_AMBER,
          backgroundFlash: MARINE_COLORS.WARNING_AMBER_FLASH,
          text: MARINE_COLORS.TEXT_BLACK,
          border: MARINE_COLORS.TEXT_BLACK,
        };
      case 'info':
      default:
        return {
          background: MARINE_COLORS.INFO_BLUE,
          backgroundFlash: MARINE_COLORS.INFO_BLUE_FLASH,
          text: theme.text,
          border: theme.text,
        };
    }
  };

  const colors = getAlarmColors(alarm.level);

  const dynamicStyles = StyleSheet.create({
    container: {
      backgroundColor: colors.background,
      borderColor: colors.border,
      borderWidth: MARINE_STYLES.borderWidth[alarm.level],
      borderRadius: 8,
      padding: 16,
      margin: 8,
      minHeight: 80,
      justifyContent: 'center',
      shadowColor: colors.background,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: MARINE_STYLES.shadowOpacity,
      shadowRadius: MARINE_STYLES.shadowRadius,
      elevation: 8, // Android shadow
    },
    titleText: {
      color: colors.text,
      fontSize: MARINE_STYLES.fontSize[alarm.level],
      fontWeight: 'bold',
      textAlign: 'center',
      marginBottom: 8,
      textShadowColor:
        colors.background === MARINE_COLORS.WARNING_AMBER ? theme.text : MARINE_COLORS.TEXT_BLACK,
      textShadowOffset: { width: 1, height: 1 },
      textShadowRadius: 2,
    },
    messageText: {
      color: colors.text,
      fontSize: MARINE_STYLES.fontSize[alarm.level] - 4,
      textAlign: 'center',
      lineHeight: MARINE_STYLES.fontSize[alarm.level],
    },
    levelBadge: {
      position: 'absolute',
      top: 8,
      right: 8,
      backgroundColor: colors.text,
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 4,
    },
    levelText: {
      color: colors.background,
      fontSize: 12,
      fontWeight: 'bold',
    },
    timestamp: {
      position: 'absolute',
      bottom: 8,
      left: 8,
      color: colors.text,
      fontSize: 10,
      opacity: 0.8,
    },
  });

  const formatTimestamp = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString();
  };

  return (
    <FlashingAnimation level={alarm.level} enabled={showFlashing && !alarm.acknowledged}>
      <View style={[dynamicStyles.container, style]} testID="critical-alarm-indicator">
        <View style={dynamicStyles.levelBadge}>
          <Text style={dynamicStyles.levelText}>{alarm.level.toUpperCase()}</Text>
        </View>

        <Text style={dynamicStyles.titleText} testID="alarm-title">
          {alarm.level === 'critical'
            ? '⚠️ CRITICAL ALARM'
            : alarm.level === 'warning'
            ? '⚠️ WARNING'
            : 'ℹ️ INFO'}
        </Text>

        <Text style={dynamicStyles.messageText} testID="alarm-message">
          {alarm.message}
        </Text>

        {alarm.value !== undefined && alarm.threshold !== undefined ? (
          <Text
            style={[
              dynamicStyles.messageText,
              { marginTop: 4, fontSize: MARINE_STYLES.fontSize[alarm.level] - 6 },
            ]}
          >
            Value: {alarm.value} | Threshold: {alarm.threshold}
          </Text>
        ) : null}

        <Text style={dynamicStyles.timestamp}>{formatTimestamp(alarm.timestamp)}</Text>

        {alarm.acknowledged && (
          <View
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: theme.overlayDark,
              justifyContent: 'center',
              alignItems: 'center',
              borderRadius: 8,
            }}
          >
            <Text
              style={{
                color: theme.text,
                fontSize: 16,
                fontWeight: 'bold',
              }}
            >
              ✓ ACKNOWLEDGED
            </Text>
          </View>
        )}
      </View>
    </FlashingAnimation>
  );
};

/**
 * Alarm Overlay System - Full screen overlay for critical alarms
 * Displays over any screen content with marine safety priority
 */
interface AlarmOverlaySystemProps {
  children: React.ReactNode;
}

export const AlarmOverlaySystem: React.FC<AlarmOverlaySystemProps> = ({ children }) => {
  const theme = useTheme();
  const { alarms, acknowledgeAlarm } = useAlarmStore();
  const unacknowledgedAlarms = activeAlarms.filter((alarm) => !alarm.acknowledged);

  // Prioritize critical alarms for overlay display
  const criticalAlarms = unacknowledgedAlarms.filter((alarm) => alarm.level === 'critical');
  const warningAlarms = unacknowledgedAlarms.filter((alarm) => alarm.level === 'warning');
  const infoAlarms = unacknowledgedAlarms.filter((alarm) => alarm.level === 'info');

  const prioritizedAlarms = [...criticalAlarms, ...warningAlarms, ...infoAlarms];
  const shouldShowOverlay = prioritizedAlarms.length > 0;

  const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

  const overlayStyles = StyleSheet.create({
    overlay: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: MARINE_COLORS.OVERLAY_DARK,
      zIndex: 9999,
      justifyContent: 'center',
      alignItems: 'center',
      padding: 20,
    },
    overlayContent: {
      maxWidth: screenWidth * 0.9,
      maxHeight: screenHeight * 0.8,
      width: '100%',
    },
    scrollContainer: {
      flexGrow: 1,
    },
    acknowledgeButton: {
      backgroundColor: theme.surface,
      padding: 12,
      borderRadius: 8,
      marginTop: 8,
      alignItems: 'center',
    },
    acknowledgeText: {
      color: MARINE_COLORS.TEXT_BLACK,
      fontSize: 16,
      fontWeight: 'bold',
    },
    dismissButton: {
      backgroundColor: 'transparent',
      borderWidth: 2,
      borderColor: theme.border,
      padding: 12,
      borderRadius: 8,
      marginTop: 8,
      alignItems: 'center',
    },
    dismissText: {
      color: theme.text,
      fontSize: 16,
      fontWeight: 'bold',
    },
  });

  const handleAcknowledgeAll = () => {
    prioritizedAlarms.forEach((alarm) => {
      acknowledgeAlarm(alarm.id);
    });
  };

  return (
    <View style={{ flex: 1 }}>
      {children}

      {shouldShowOverlay && (
        <View style={overlayStyles.overlay} testID="alarm-overlay-system">
          <View style={overlayStyles.overlayContent}>
            {prioritizedAlarms.slice(0, 3).map(
              (
                alarm, // Show max 3 alarms
              ) => (
                <CriticalAlarmIndicator
                  key={alarm.id}
                  alarm={alarm}
                  onAcknowledge={acknowledgeAlarm}
                />
              ),
            )}

            {prioritizedAlarms.length > 3 && (
              <View
                style={{
                  backgroundColor: MARINE_COLORS.INFO_BLUE,
                  padding: 12,
                  borderRadius: 8,
                  margin: 8,
                  alignItems: 'center',
                }}
              >
                <Text
                  style={{
                    color: theme.text,
                    fontSize: 16,
                    fontWeight: 'bold',
                  }}
                >
                  + {prioritizedAlarms.length - 3} more alarms
                </Text>
              </View>
            )}

            <View style={overlayStyles.acknowledgeButton}>
              <Text
                style={overlayStyles.acknowledgeText}
                onPress={handleAcknowledgeAll}
                testID="acknowledge-all-button"
              >
                ACKNOWLEDGE ALL ({prioritizedAlarms.length})
              </Text>
            </View>
          </View>
        </View>
      )}
    </View>
  );
};

/**
 * Compact Alarm Indicator Bar - For normal operation display
 * Shows alarm count and highest priority level without blocking UI
 */
interface CompactAlarmBarProps {
  style?: ViewStyle;
  onPress?: () => void;
}

export const CompactAlarmBar: React.FC<CompactAlarmBarProps> = ({ style, onPress }) => {
  const { activeAlarms } = useAlarmStore();
  const unacknowledgedAlarms = activeAlarms.filter((alarm) => !alarm.acknowledged);

  if (unacknowledgedAlarms.length === 0) {
    return null;
  }

  const criticalCount = unacknowledgedAlarms.filter((a) => a.level === 'critical').length;
  const warningCount = unacknowledgedAlarms.filter((a) => a.level === 'warning').length;
  const infoCount = unacknowledgedAlarms.filter((a) => a.level === 'info').length;

  const highestLevel = criticalCount > 0 ? 'critical' : warningCount > 0 ? 'warning' : 'info';

  const colors =
    highestLevel === 'critical'
      ? { bg: MARINE_COLORS.CRITICAL_RED, text: theme.text }
      : highestLevel === 'warning'
      ? { bg: MARINE_COLORS.WARNING_AMBER, text: MARINE_COLORS.TEXT_BLACK }
      : { bg: MARINE_COLORS.INFO_BLUE, text: theme.text };

  const compactStyles = StyleSheet.create({
    container: {
      backgroundColor: colors.bg,
      paddingVertical: 8,
      paddingHorizontal: 16,
      borderRadius: 20,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      minWidth: 120,
      shadowColor: colors.bg,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.6,
      shadowRadius: 4,
      elevation: 4,
    },
    text: {
      color: colors.text,
      fontSize: 14,
      fontWeight: 'bold',
      textAlign: 'center',
    },
  });

  const getAlarmSummary = () => {
    const parts = [];
    if (criticalCount > 0) parts.push(`${criticalCount} CRITICAL`);
    if (warningCount > 0) parts.push(`${warningCount} WARNING`);
    if (infoCount > 0) parts.push(`${infoCount} INFO`);
    return parts.join(' | ');
  };

  return (
    <FlashingAnimation level={highestLevel} enabled={true}>
      <View
        style={[compactStyles.container, style]}
        testID="compact-alarm-bar"
        onTouchStart={onPress}
      >
        <Text style={compactStyles.text} testID="alarm-summary">
          🚨 {getAlarmSummary()}
        </Text>
      </View>
    </FlashingAnimation>
  );
};

export default {
  CriticalAlarmIndicator,
  AlarmOverlaySystem,
  CompactAlarmBar,
  FlashingAnimation,
};
