import React, { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, Vibration, Alert } from 'react-native';
import { UniversalIcon } from '../components/atoms/UniversalIcon';
import Sound from 'react-native-sound';
import { useNmeaStore } from '../store/nmeaStore';
import { AutopilotCommandManager } from '../services/autopilotService';
import Svg, { Circle, Line, Text as SvgText, Path } from 'react-native-svg';
import { HelpButton } from '../components/atoms/HelpButton';
import { Tooltip } from '../components/molecules/Tooltip';
import { getHelpContent, getRelatedTopics } from '../content/help-content';
import { useTheme, ThemeColors } from '../store/themeStore';

interface AutopilotControlScreenProps {
  visible: boolean;
  onClose: () => void;
}

/**
 * P70-Inspired Autopilot Control Dialog
 *
 * Designed to match the Raymarine P70 Control Unit interface:
 * - Grid-based button layout for +/- 1° and +/-10° course adjustments
 * - Large, accessible touch targets optimized for marine conditions
 * - Central heading display with compass visualization
 * - Primary ENGAGE/STANDBY controls
 * - Emergency disengage always accessible
 */
export const AutopilotControlScreen: React.FC<AutopilotControlScreenProps> = ({
  visible,
  onClose,
}) => {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  // Clean sensor data access - NMEA Store v2.0 with SensorInstance
  const autopilotInstance = useNmeaStore(
    (state) => state.nmeaData.sensors.autopilot?.[0]
  );
  const compassInstance = useNmeaStore(
    (state) => state.nmeaData.sensors.compass?.[0]
  );

  // Autopilot service instance
  const commandManager = useRef<AutopilotCommandManager | null>(null);

  // Audio alerts
  const engageSound = useRef<Sound | null>(null);
  const disengageSound = useRef<Sound | null>(null);
  const alertSound = useRef<Sound | null>(null);

  // Initialize command manager and audio
  useEffect(() => {
    commandManager.current = new AutopilotCommandManager();

    // Initialize audio alerts (using system sounds for reliability)
    Sound.setCategory('Playback');

    engageSound.current = new Sound('engage_autopilot.wav', Sound.MAIN_BUNDLE, (error) => {
      if (error) {
        console.log('Custom engage sound not available, using system sound');
      }
    });

    disengageSound.current = new Sound('disengage_autopilot.wav', Sound.MAIN_BUNDLE, (error) => {
      if (error) {
        console.log('Custom disengage sound not available, using system sound');
      }
    });

    alertSound.current = new Sound('autopilot_alert.wav', Sound.MAIN_BUNDLE, (error) => {
      if (error) {
        console.log('Custom alert sound not available, using system sound');
      }
    });

    return () => {
      commandManager.current = null;
      engageSound.current?.release();
      disengageSound.current?.release();
      alertSound.current?.release();
    };
  }, []);

  // Local state for UI interactions
  const [showEngageConfirmation, setShowEngageConfirmation] = useState(false);
  const [isCommandPending, setIsCommandPending] = useState(false);
  const [commandError, setCommandError] = useState<string | null>(null);
  const [activeHelpId, setActiveHelpId] = useState<string | null>(null);

  // Safety confirmation system for large heading changes
  const [cumulativeHeadingChange, setCumulativeHeadingChange] = useState(0);
  const [showLargeChangeConfirmation, setShowLargeChangeConfirmation] = useState(false);
  const [pendingHeadingAdjustment, setPendingHeadingAdjustment] = useState<number>(0);

  // Extract metrics from SensorInstance
  // Priority: autopilot.actualHeading → compass.magneticHeading → compass.trueHeading
  const currentHeading = (
    autopilotInstance?.getMetric('actualHeading')?.si_value ??
    compassInstance?.getMetric('magneticHeading')?.si_value ??
    compassInstance?.getMetric('trueHeading')?.si_value ??
    0
  ) as number;
  const mode = autopilotInstance?.getMetric('mode')?.si_value ?? 'STANDBY';
  const engaged = autopilotInstance?.getMetric('engaged')?.si_value ?? false;
  const active = autopilotInstance?.getMetric('active')?.si_value ?? false;
  const targetHeading = (autopilotInstance?.getMetric('targetHeading')?.si_value ?? currentHeading) as number;

  // Haptic feedback for all interactions
  const triggerHaptic = useCallback(() => {
    Vibration.vibrate(50);
  }, []);

  // Audio alerts for autopilot state changes
  const playEngageAlert = useCallback(() => {
    engageSound.current?.play((success) => {
      if (!success) {
        console.log('Failed to play engage sound');
      }
    });
  }, []);

  const playDisengageAlert = useCallback(() => {
    disengageSound.current?.play((success) => {
      if (!success) {
        console.log('Failed to play disengage sound');
      }
    });
  }, []);

  const playErrorAlert = useCallback(() => {
    alertSound.current?.play((success) => {
      if (!success) {
        console.log('Failed to play error alert sound');
      }
    });
  }, []);

  // Reset cumulative heading tracking when engagement changes or after timeout
  useEffect(() => {
    // Reset tracking when autopilot is disengaged
    if (!engaged) {
      setCumulativeHeadingChange(0);
    }
  }, [engaged]);

  // Auto-reset cumulative tracking after 5 minutes of inactivity
  useEffect(() => {
    if (cumulativeHeadingChange !== 0) {
      const resetTimer = setTimeout(() => {
        setCumulativeHeadingChange(0);
      }, 5 * 60 * 1000); // 5 minutes

      return () => clearTimeout(resetTimer);
    }
  }, [cumulativeHeadingChange]);

  // Safety confirmation modal for engagement
  const handleEngageRequest = useCallback(() => {
    triggerHaptic();
    setShowEngageConfirmation(true);
  }, [triggerHaptic]);

  // Confirmed engagement
  const handleEngageConfirm = useCallback(async () => {
    triggerHaptic();
    setShowEngageConfirmation(false);
    setIsCommandPending(true);
    setCommandError(null);

    try {
      if (commandManager.current) {
        const success = await commandManager.current.engageCompassMode(currentHeading);
        if (success) {
          playEngageAlert();
        } else {
          setCommandError('Failed to engage autopilot');
          playErrorAlert();
        }
      }
    } catch (error) {
      setCommandError(error instanceof Error ? error.message : 'Autopilot engagement failed');
      playErrorAlert();
    } finally {
      setIsCommandPending(false);
    }
  }, [triggerHaptic, currentHeading, playEngageAlert, playErrorAlert]);

  // Emergency disengage - no confirmation needed
  const handleEmergencyDisengage = useCallback(async () => {
    triggerHaptic();
    Vibration.vibrate([100, 50, 100]); // Pattern for emergency
    setIsCommandPending(true);
    setCommandError(null);

    try {
      if (commandManager.current) {
        const success = await commandManager.current.emergencyDisengage();
        if (success) {
          playDisengageAlert();
        } else {
          setCommandError('Emergency disengage failed');
          playErrorAlert();
        }
      }
    } catch (error) {
      setCommandError(error instanceof Error ? error.message : 'Emergency disengage failed');
      playErrorAlert();
    } finally {
      setIsCommandPending(false);
    }
  }, [triggerHaptic, playDisengageAlert, playErrorAlert]);

  // Heading adjustment with cumulative safety tracking
  const adjustHeading = useCallback(
    async (adjustment: number) => {
      triggerHaptic();

      // Check if this adjustment would exceed the safety threshold
      const newCumulativeChange = Math.abs(cumulativeHeadingChange + adjustment);

      if (newCumulativeChange > 20) {
        // Show safety confirmation for large cumulative changes
        setPendingHeadingAdjustment(adjustment);
        setShowLargeChangeConfirmation(true);
        return;
      }

      // Proceed with normal adjustment
      await executeHeadingAdjustment(adjustment);
    },
    [cumulativeHeadingChange, triggerHaptic],
  );

  // Execute the actual heading adjustment (separated for confirmation workflow)
  const executeHeadingAdjustment = useCallback(
    async (adjustment: number) => {
      setIsCommandPending(true);
      setCommandError(null);

      try {
        if (commandManager.current) {
          const success = await commandManager.current.adjustHeading(adjustment);
          if (success) {
            // Update cumulative tracking on successful adjustment
            setCumulativeHeadingChange((prev) => prev + adjustment);
          } else {
            setCommandError(`Failed to adjust heading ${adjustment > 0 ? '+' : ''}${adjustment}°`);
            playErrorAlert();
          }
        }
      } catch (error) {
        setCommandError(error instanceof Error ? error.message : 'Heading adjustment failed');
        playErrorAlert();
      } finally {
        setIsCommandPending(false);
      }
    },
    [playErrorAlert],
  );

  // Confirmation handlers for large heading changes
  const handleLargeChangeConfirm = useCallback(async () => {
    setShowLargeChangeConfirmation(false);
    await executeHeadingAdjustment(pendingHeadingAdjustment);
    // Reset cumulative tracking after large confirmed change
    setCumulativeHeadingChange(0);
    setPendingHeadingAdjustment(0);
  }, [pendingHeadingAdjustment, executeHeadingAdjustment]);

  const handleLargeChangeCancel = useCallback(() => {
    setShowLargeChangeConfirmation(false);
    setPendingHeadingAdjustment(0);
    // Don't reset cumulative tracking - user may try smaller adjustments
  }, []);

  // Status colors based on engagement state (theme-aware for marine safety)
  const getStatusColor = () => {
    if (engaged && active) return theme.success; // Green in day/night, red in red-night mode
    if (engaged && !active) return theme.warning; // Amber
    return theme.textSecondary; // Gray
  };

  const getStatusText = () => {
    if (engaged && active) return 'ENGAGED';
    if (engaged && !active) return 'STANDBY';
    return 'OFF';
  };

  // Help system handlers
  const showHelp = (helpId: string) => {
    setActiveHelpId(helpId);
  };

  const closeHelp = () => {
    setActiveHelpId(null);
  };

  const navigateToRelatedTopic = (helpId: string) => {
    setActiveHelpId(helpId);
  };

  // Dynamic theme-aware styles for marine safety compliance
  const dynamicStyles = useMemo(
    () => ({
      headingValueCurrent: {
        fontSize: 32,
        fontWeight: 'bold' as const,
        color: theme.success, // Theme-aware (red in red-night mode)
        fontFamily: 'monospace',
      },
      engageButton: {
        backgroundColor: theme.success, // Theme-aware (red in red-night mode)
      },
      confirmEngageButton: {
        flex: 1,
        padding: 15,
        borderRadius: 8,
        backgroundColor: theme.success, // Theme-aware (red in red-night mode)
        alignItems: 'center' as const,
      },
    }),
    [theme],
  );

  // Get current help content
  const helpContent = activeHelpId ? getHelpContent(activeHelpId) : null;
  const relatedTopics = activeHelpId ? getRelatedTopics(activeHelpId) : [];

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        <View style={styles.dragHandle} />
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.headerButton}>
            <Text style={styles.headerButtonText}>Done</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Autopilot</Text>
          <HelpButton
            helpId="autopilot-modes"
            onPress={() => showHelp('autopilot-modes')}
            size={24}
            style={styles.helpButton}
          />
        </View>

        <View style={styles.content}>
          {/* Status Display */}
          <View style={styles.statusContainer}>
            <View style={[styles.statusIndicator, { backgroundColor: getStatusColor() }]} />
            <View style={styles.statusTextContainer}>
              <Text style={styles.statusText}>{getStatusText()}</Text>
              <Text style={styles.modeText}>{mode}</Text>
            </View>
          </View>

          {/* Error Display */}
          {commandError && (
            <View style={styles.errorContainer}>
              <View style={styles.errorMessageContainer}>
                <UniversalIcon name="warning-outline" size={16} color={theme.text} />
                <Text style={styles.errorText}>{commandError}</Text>
              </View>
              <TouchableOpacity
                onPress={() => setCommandError(null)}
                style={styles.errorCloseButton}
              >
                <UniversalIcon name="close-outline" size={16} color={theme.text} />
              </TouchableOpacity>
            </View>
          )}
          <View style={styles.headingDisplay}>
            <Text style={styles.headingLabel}>HEADING</Text>

            {/* Simple Compass Circle */}
            <View style={styles.compassContainer}>
              <Svg width={180} height={180}>
                <Circle cx={90} cy={90} r={75} fill="none" stroke={theme.border} strokeWidth="2" />
                {/* North indicator */}
                <Line
                  x1={90}
                  y1={20}
                  x2={90}
                  y2={40}
                  stroke={theme.success}
                  strokeWidth="4"
                  strokeLinecap="round"
                />
                <SvgText
                  x={90}
                  y={18}
                  fontSize="14"
                  fill={theme.text}
                  textAnchor="middle"
                  fontWeight="bold"
                >
                  N
                </SvgText>
              </Svg>
            </View>

            {/* Heading Values */}
            <View style={styles.headingValues}>
              <View style={styles.headingValue}>
                <Text style={styles.headingValueLabel}>CURRENT</Text>
                <Text style={dynamicStyles.headingValueCurrent}>{Math.round(currentHeading)}°</Text>
              </View>
              <View style={styles.headingValue}>
                <Text style={styles.headingValueLabel}>TARGET</Text>
                <Text style={styles.headingValueTarget}>{Math.round(targetHeading)}°</Text>
              </View>
            </View>
          </View>

          {/* P70-Inspired Control Grid */}
          <View style={styles.controlGrid}>
            {/* Primary Engage/Standby Control */}
            <View style={styles.primaryControlRow}>
              {!engaged ? (
                <TouchableOpacity
                  style={[styles.primaryButton, dynamicStyles.engageButton]}
                  onPress={handleEngageRequest}
                  disabled={isCommandPending}
                  activeOpacity={0.7}
                >
                  <Text style={styles.primaryButtonText}>ENGAGE</Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  style={[styles.primaryButton, styles.standbyButton]}
                  onPress={handleEmergencyDisengage}
                  disabled={isCommandPending}
                  activeOpacity={0.7}
                >
                  <Text style={styles.primaryButtonText}>STANDBY</Text>
                </TouchableOpacity>
              )}
            </View>

            {/* Course Adjustment Grid - P70 Style Layout */}
            <View style={styles.adjustmentGrid}>
              <Text style={styles.adjustmentLabel}>COURSE ADJUSTMENT</Text>

              {/* Top Row: -10° and +10° */}
              <View style={styles.adjustmentRow}>
                <TouchableOpacity
                  style={[styles.adjustButton, styles.adjustButtonLarge]}
                  onPress={() => adjustHeading(-10)}
                  disabled={!engaged || isCommandPending}
                  activeOpacity={0.7}
                >
                  <Text style={styles.adjustButtonText}>-10°</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.adjustButton, styles.adjustButtonLarge]}
                  onPress={() => adjustHeading(10)}
                  disabled={!engaged || isCommandPending}
                  activeOpacity={0.7}
                >
                  <Text style={styles.adjustButtonText}>+10°</Text>
                </TouchableOpacity>
              </View>

              {/* Bottom Row: -1° and +1° */}
              <View style={styles.adjustmentRow}>
                <TouchableOpacity
                  style={[styles.adjustButton, styles.adjustButtonSmall]}
                  onPress={() => adjustHeading(-1)}
                  disabled={!engaged || isCommandPending}
                  activeOpacity={0.7}
                >
                  <Text style={styles.adjustButtonText}>-1°</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.adjustButton, styles.adjustButtonSmall]}
                  onPress={() => adjustHeading(1)}
                  disabled={!engaged || isCommandPending}
                  activeOpacity={0.7}
                >
                  <Text style={styles.adjustButtonText}>+1°</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>

        {/* Footer with Emergency Control */}
        <View style={styles.footer}>
          <TouchableOpacity
            style={styles.emergencyButton}
            onPress={handleEmergencyDisengage}
            disabled={isCommandPending}
            activeOpacity={0.7}
          >
            <Text style={styles.emergencyButtonText}>EMERGENCY DISENGAGE</Text>
          </TouchableOpacity>
        </View>

        {/* Engagement Confirmation Modal */}
        <Modal
          visible={showEngageConfirmation}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setShowEngageConfirmation(false)}
        >
          <View style={styles.confirmationOverlay}>
            <View style={styles.confirmationDialog}>
              <Text style={styles.confirmationTitle}>ENGAGE AUTOPILOT</Text>
              <Text style={styles.confirmationMessage}>
                Engage autopilot on heading {Math.round(currentHeading)}°?
              </Text>

              <View style={styles.confirmationButtons}>
                <TouchableOpacity
                  style={styles.confirmCancelButton}
                  onPress={() => setShowEngageConfirmation(false)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.confirmCancelText}>CANCEL</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={dynamicStyles.confirmEngageButton}
                  onPress={handleEngageConfirm}
                  activeOpacity={0.7}
                >
                  <Text style={styles.confirmEngageText}>ENGAGE</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        {/* Large Heading Change Confirmation Modal */}
        <Modal
          visible={showLargeChangeConfirmation}
          transparent={true}
          animationType="fade"
          onRequestClose={handleLargeChangeCancel}
        >
          <View style={styles.confirmationOverlay}>
            <View style={styles.confirmationDialog}>
              <Text style={styles.confirmationTitle}>LARGE HEADING CHANGE</Text>
              <Text style={styles.confirmationMessage}>
                Adjusting {pendingHeadingAdjustment > 0 ? '+' : ''}
                {pendingHeadingAdjustment}° will result in a total change of{' '}
                {Math.abs(cumulativeHeadingChange + pendingHeadingAdjustment)}°.
              </Text>
              <Text style={styles.confirmationDetails}>
                Current: {Math.round(currentHeading)}° → Target:{' '}
                {Math.round(currentHeading + cumulativeHeadingChange + pendingHeadingAdjustment)}°
              </Text>

              <View style={styles.confirmationButtons}>
                <TouchableOpacity
                  style={styles.confirmCancelButton}
                  onPress={handleLargeChangeCancel}
                  activeOpacity={0.7}
                >
                  <Text style={styles.confirmCancelText}>CANCEL</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={dynamicStyles.confirmEngageButton}
                  onPress={handleLargeChangeConfirm}
                  activeOpacity={0.7}
                >
                  <Text style={styles.confirmEngageText}>CONFIRM</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        {/* Help Tooltip */}
        {helpContent && (
          <Tooltip
            visible={!!activeHelpId}
            onDismiss={closeHelp}
            title={helpContent.title}
            content={helpContent.content}
            tips={helpContent.tips}
            relatedTopics={relatedTopics.map((t) => ({
              title: t.title,
              onPress: () => navigateToRelatedTopic(t.id),
            }))}
          />
        )}
      </View>
    </Modal>
  );
};

// Theme-aware style factory
const createStyles = (theme: ThemeColors) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.surface,
    },
    dragHandle: {
      width: 36,
      height: 5,
      backgroundColor: theme.overlay,
      borderRadius: 3,
      alignSelf: 'center',
      marginTop: 5,
      marginBottom: 5,
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: theme.border,
    },
    headerButton: {
      padding: 8,
      minWidth: 60,
    },
    headerButtonText: {
      color: theme.primary,
      fontSize: 17,
      fontWeight: '400',
    },
    helpButton: {
      padding: 8,
      minWidth: 60,
    },
    title: {
      fontSize: 17,
      fontWeight: '600',
      color: theme.text,
      flex: 1,
      textAlign: 'center',
    },
    content: {
      flex: 1,
      padding: 20,
    },

    // Status Display
    statusContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 20,
      backgroundColor: theme.surfaceDim,
      padding: 15,
      borderRadius: 8,
    },
    statusIndicator: {
      width: 16,
      height: 16,
      borderRadius: 8,
      marginRight: 12,
    },
    statusTextContainer: {
      flex: 1,
    },
    statusText: {
      fontSize: 18,
      fontWeight: 'bold',
      color: theme.text,
    },
    modeText: {
      fontSize: 14,
      color: theme.textSecondary,
      marginTop: 2,
    },

    // Error Display
    errorContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      backgroundColor: theme.error,
      borderRadius: 8,
      padding: 12,
      marginBottom: 15,
    },
    errorMessageContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      flex: 1,
      gap: 8,
    },
    errorText: {
      flex: 1,
      fontSize: 14,
      fontWeight: 'bold',
      color: theme.text,
    },
    errorCloseButton: {
      width: 24,
      height: 24,
      justifyContent: 'center',
      alignItems: 'center',
      marginLeft: 8,
    },
    errorCloseText: {
      fontSize: 16,
      fontWeight: 'bold',
      color: theme.text,
    },

    // Heading Display
    headingDisplay: {
      alignItems: 'center',
      marginBottom: 30,
    },
    headingLabel: {
      fontSize: 14,
      fontWeight: 'bold',
      color: theme.textSecondary,
      marginBottom: 15,
      letterSpacing: 1,
    },
    compassContainer: {
      marginBottom: 20,
    },
    headingValues: {
      flexDirection: 'row',
      justifyContent: 'space-around',
      width: '100%',
      gap: 20,
    },
    headingValue: {
      alignItems: 'center',
      flex: 1,
    },
    headingValueLabel: {
      fontSize: 12,
      color: theme.textTertiary,
      marginBottom: 8,
      fontWeight: '600',
    },
    headingValueCurrent: {
      fontSize: 32,
      fontWeight: 'bold',
      color: theme.text,
      fontFamily: 'monospace',
    },
    headingValueTarget: {
      fontSize: 32,
      fontWeight: 'bold',
      color: theme.warning,
      fontFamily: 'monospace',
    },

    // Control Grid
    controlGrid: {
      marginTop: 20,
    },
    primaryControlRow: {
      marginBottom: 30,
    },
    primaryButton: {
      padding: 20,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: 70,
    },
    engageButton: {
      backgroundColor: theme.interactive,
    },
    standbyButton: {
      backgroundColor: theme.warning,
    },
    primaryButtonText: {
      fontSize: 20,
      fontWeight: 'bold',
      color: theme.text,
      letterSpacing: 1,
    },

    // Adjustment Grid
    adjustmentGrid: {
      backgroundColor: theme.surfaceDim,
      padding: 20,
      borderRadius: 12,
    },
    adjustmentLabel: {
      fontSize: 12,
      fontWeight: 'bold',
      color: theme.textSecondary,
      marginBottom: 15,
      letterSpacing: 1,
      textAlign: 'center',
    },
    adjustmentRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginBottom: 12,
      gap: 12,
    },
    adjustButton: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: 8,
      backgroundColor: theme.interactive,
      minHeight: 60,
    },
    adjustButtonLarge: {
      minHeight: 70,
    },
    adjustButtonSmall: {
      minHeight: 60,
    },
    adjustButtonText: {
      fontSize: 18,
      fontWeight: 'bold',
      color: theme.text,
      fontFamily: 'monospace',
    },

    // Footer
    footer: {
      padding: 20,
      borderTopWidth: 1,
      borderTopColor: theme.border,
    },
    emergencyButton: {
      backgroundColor: theme.error,
      padding: 20,
      borderRadius: 12,
      alignItems: 'center',
      minHeight: 70,
      justifyContent: 'center',
    },
    emergencyButtonText: {
      fontSize: 18,
      fontWeight: 'bold',
      color: theme.text,
      letterSpacing: 1,
    },

    // Confirmation Modal
    confirmationOverlay: {
      flex: 1,
      backgroundColor: theme.overlayDark,
      justifyContent: 'center',
      alignItems: 'center',
    },
    confirmationDialog: {
      backgroundColor: theme.surfaceDim,
      borderRadius: 16,
      padding: 30,
      margin: 20,
      minWidth: 300,
      maxWidth: 400,
    },
    confirmationTitle: {
      fontSize: 20,
      fontWeight: 'bold',
      color: theme.text,
      marginBottom: 15,
      textAlign: 'center',
    },
    confirmationMessage: {
      fontSize: 16,
      color: theme.textSecondary,
      marginBottom: 15,
      textAlign: 'center',
      lineHeight: 24,
    },
    confirmationDetails: {
      fontSize: 14,
      color: theme.textTertiary,
      marginBottom: 25,
      textAlign: 'center',
      fontWeight: '500',
    },
    confirmationButtons: {
      flexDirection: 'row',
      gap: 15,
    },
    confirmCancelButton: {
      flex: 1,
      padding: 15,
      borderRadius: 8,
      backgroundColor: theme.surfaceHighlight,
      alignItems: 'center',
    },
    confirmCancelText: {
      color: theme.text,
      fontSize: 16,
      fontWeight: '600',
    },
    confirmEngageButton: {
      flex: 1,
      padding: 15,
      borderRadius: 8,
      backgroundColor: theme.interactive,
      alignItems: 'center',
    },
    confirmEngageText: {
      color: theme.text,
      fontSize: 16,
      fontWeight: '600',
    },
  });

// Default export for compatibility with existing tests
export default AutopilotControlScreen;
