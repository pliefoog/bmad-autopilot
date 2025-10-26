import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Vibration,
  Alert,
} from 'react-native';
import { UniversalIcon } from '../components/atoms/UniversalIcon';
import Sound from 'react-native-sound';
import { useNmeaStore } from '../store/nmeaStore';
import { AutopilotCommandManager } from '../services/autopilotService';
import Svg, { Circle, Line, Text as SvgText, Path } from 'react-native-svg';
import { HelpButton } from '../components/atoms/HelpButton';
import { Tooltip } from '../components/molecules/Tooltip';
import { getHelpContent, getRelatedTopics } from '../content/help-content';

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
  onClose
}) => {
  // Clean sensor data access - NMEA Store v2.0
  const autopilotData = useNmeaStore((state) => state.getSensorData('autopilot', 0));
  const compassData = useNmeaStore((state) => state.getSensorData('compass', 0));

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

  // Extract sensor data with proper typing and defaults
  const autopilot = autopilotData as any; // Type assertion for legacy compatibility
  const compass = compassData as any;
  
  // Extract heading from compass or autopilot
  const currentHeading = autopilot?.currentHeading ?? compass?.heading ?? 0;
  
  // Autopilot status with defaults  
  const {
    mode = 'STANDBY',
    engaged = false,
    active = false,
    targetHeading = currentHeading,
  } = autopilot || {};

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

  // Heading adjustment
  const adjustHeading = useCallback(async (adjustment: number) => {
    triggerHaptic();
    setIsCommandPending(true);
    setCommandError(null);

    try {
      if (commandManager.current) {
        const success = await commandManager.current.adjustHeading(adjustment);
        if (!success) {
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
  }, [triggerHaptic, playErrorAlert]);

  // Status colors based on engagement state
  const getStatusColor = () => {
    if (engaged && active) return '#10b981'; // Green
    if (engaged && !active) return '#f59e0b'; // Amber
    return '#6b7280'; // Gray
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
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>AUTOPILOT CONTROL</Text>
          <View style={styles.headerActions}>
            <HelpButton 
              helpId="autopilot-modes" 
              onPress={() => showHelp('autopilot-modes')}
              size={24}
              style={styles.helpButton}
            />
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Text style={styles.closeButtonText}>✕</Text>
            </TouchableOpacity>
          </View>
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
                <UniversalIcon name="warning-outline" size={16} color="#DC2626" />
                <Text style={styles.errorText}>{commandError}</Text>
              </View>
              <TouchableOpacity
                onPress={() => setCommandError(null)}
                style={styles.errorCloseButton}
              >
                <UniversalIcon name="close-outline" size={16} color="#DC2626" />
              </TouchableOpacity>
            </View>
          )}

          {/* Heading Display with Compass */}
          <View style={styles.headingDisplay}>
            <Text style={styles.headingLabel}>HEADING</Text>

            {/* Simple Compass Circle */}
            <View style={styles.compassContainer}>
              <Svg width={180} height={180}>
                <Circle
                  cx={90}
                  cy={90}
                  r={75}
                  fill="none"
                  stroke="#4b5563"
                  strokeWidth="2"
                />
                {/* North indicator */}
                <Line
                  x1={90}
                  y1={20}
                  x2={90}
                  y2={40}
                  stroke="#10b981"
                  strokeWidth="4"
                  strokeLinecap="round"
                />
                <SvgText
                  x={90}
                  y={18}
                  fontSize="14"
                  fill="#fff"
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
                <Text style={styles.headingValueCurrent}>{Math.round(currentHeading)}°</Text>
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
                  style={[styles.primaryButton, styles.engageButton]}
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
                  style={styles.confirmEngageButton}
                  onPress={handleEngageConfirm}
                  activeOpacity={0.7}
                >
                  <Text style={styles.confirmEngageText}>ENGAGE</Text>
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
            relatedTopics={relatedTopics.map(t => ({
              title: t.title,
              onPress: () => navigateToRelatedTopic(t.id),
            }))}
          />
        )}
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a1a',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  helpButton: {
    marginRight: 4,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  closeButton: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#333',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
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
    backgroundColor: '#2a2a2a',
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
    color: '#fff',
  },
  modeText: {
    fontSize: 14,
    color: '#9ca3af',
    marginTop: 2,
  },

  // Error Display
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#dc2626',
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
    color: '#fff',
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
    color: '#fff',
  },

  // Heading Display
  headingDisplay: {
    alignItems: 'center',
    marginBottom: 30,
  },
  headingLabel: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#9ca3af',
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
    color: '#6b7280',
    marginBottom: 8,
    fontWeight: '600',
  },
  headingValueCurrent: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#10b981',
    fontFamily: 'monospace',
  },
  headingValueTarget: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#f59e0b',
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
    backgroundColor: '#10b981',
  },
  standbyButton: {
    backgroundColor: '#f59e0b',
  },
  primaryButtonText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    letterSpacing: 1,
  },

  // Adjustment Grid
  adjustmentGrid: {
    backgroundColor: '#2a2a2a',
    padding: 20,
    borderRadius: 12,
  },
  adjustmentLabel: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#9ca3af',
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
    backgroundColor: '#3b82f6',
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
    color: '#fff',
    fontFamily: 'monospace',
  },

  // Footer
  footer: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#333',
  },
  emergencyButton: {
    backgroundColor: '#dc2626',
    padding: 20,
    borderRadius: 12,
    alignItems: 'center',
    minHeight: 70,
    justifyContent: 'center',
  },
  emergencyButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    letterSpacing: 1,
  },

  // Confirmation Modal
  confirmationOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  confirmationDialog: {
    backgroundColor: '#2a2a2a',
    borderRadius: 16,
    padding: 30,
    margin: 20,
    minWidth: 300,
    maxWidth: 400,
  },
  confirmationTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 15,
    textAlign: 'center',
  },
  confirmationMessage: {
    fontSize: 16,
    color: '#9ca3af',
    marginBottom: 25,
    textAlign: 'center',
    lineHeight: 24,
  },
  confirmationButtons: {
    flexDirection: 'row',
    gap: 15,
  },
  confirmCancelButton: {
    flex: 1,
    padding: 15,
    borderRadius: 8,
    backgroundColor: '#3b3b3b',
    alignItems: 'center',
  },
  confirmCancelText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  confirmEngageButton: {
    flex: 1,
    padding: 15,
    borderRadius: 8,
    backgroundColor: '#10b981',
    alignItems: 'center',
  },
  confirmEngageText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
