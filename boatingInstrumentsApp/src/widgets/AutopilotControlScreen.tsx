import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Dimensions,
  Vibration,
  Modal,
} from 'react-native';
import { useNmeaStore } from '../core/nmeaStore';
import { useTheme } from '../core/themeStore';
import Svg, { Circle, Line, Path, Text as SvgText } from 'react-native-svg';

interface AutopilotControlScreenProps {
  onClose?: () => void;
}

export const AutopilotControlScreen: React.FC<AutopilotControlScreenProps> = ({ onClose }) => {
  const autopilot = useNmeaStore((state: any) => state.nmeaData.autopilot);
  const heading = useNmeaStore((state: any) => state.nmeaData.heading);
  const theme = useTheme();
  const { width, height } = Dimensions.get('window');
  const isLandscape = width > height;
  
  // Local state for UI interactions
  const [showEngageConfirmation, setShowEngageConfirmation] = useState(false);
  const [pendingCommand, setPendingCommand] = useState<string | null>(null);
  const [isCommandPending, setIsCommandPending] = useState(false);

  // Autopilot data with defaults
  const {
    mode = 'STANDBY',
    engaged = false,
    active = false,
    targetHeading = heading || 0,
    rudderPosition = 0,
  } = autopilot || {};

  const currentHeading = heading || 0;

  // Haptic feedback for all interactions
  const triggerHaptic = useCallback(() => {
    Vibration.vibrate(50); // Short vibration
  }, []);

  // Safety confirmation modal for engagement
  const handleEngageRequest = useCallback(() => {
    triggerHaptic();
    setShowEngageConfirmation(true);
  }, [triggerHaptic]);

  // Confirmed engagement
  const handleEngageConfirm = useCallback(() => {
    triggerHaptic();
    setShowEngageConfirmation(false);
    setIsCommandPending(true);
    setPendingCommand('ENGAGE');
    // TODO: Send engage command via autopilot service
    setTimeout(() => {
      setIsCommandPending(false);
      setPendingCommand(null);
    }, 2000);
  }, [triggerHaptic]);

  // Emergency disengage - no confirmation needed
  const handleEmergencyDisengage = useCallback(() => {
    triggerHaptic();
    Vibration.vibrate([100, 50, 100]); // Pattern for emergency
    setIsCommandPending(true);
    setPendingCommand('DISENGAGE');
    // TODO: Send emergency disengage command
    setTimeout(() => {
      setIsCommandPending(false);
      setPendingCommand(null);
    }, 1000);
  }, [triggerHaptic]);

  // Heading adjustment
  const adjustHeading = useCallback((adjustment: number) => {
    triggerHaptic();
    const newTargetHeading = (targetHeading + adjustment + 360) % 360;
    setIsCommandPending(true);
    setPendingCommand(`ADJUST ${adjustment > 0 ? '+' : ''}${adjustment}°`);
    // TODO: Send heading adjustment command
    setTimeout(() => {
      setIsCommandPending(false);
      setPendingCommand(null);
    }, 1000);
  }, [triggerHaptic, targetHeading]);

  // Status colors based on engagement state
  const getStatusColor = () => {
    if (engaged && active) return theme.success;
    if (engaged && !active) return theme.warning;
    return theme.textSecondary;
  };

  const getStatusText = () => {
    if (engaged && active) return 'ENGAGED';
    if (engaged && !active) return 'STANDBY';
    return 'OFF';
  };

  // Large touch target button component
  const TouchButton: React.FC<{
    title: string;
    onPress: () => void;
    backgroundColor: string;
    textColor?: string;
    disabled?: boolean;
    size?: 'small' | 'medium' | 'large' | 'emergency';
    style?: any;
  }> = ({ title, onPress, backgroundColor, textColor, disabled, size = 'medium', style }) => {
    const buttonSizes = {
      small: { width: 80, height: 60 },
      medium: { width: 120, height: 80 },
      large: { width: 160, height: 100 },
      emergency: { width: 140, height: 140 },
    };

    const buttonSize = buttonSizes[size];
    
    return (
      <TouchableOpacity
        style={[
          styles.touchButton,
          {
            backgroundColor: disabled ? theme.border : backgroundColor,
            ...buttonSize,
          },
          style,
        ]}
        onPress={onPress}
        disabled={disabled}
        activeOpacity={0.7}
      >
        <Text
          style={[
            styles.touchButtonText,
            {
              color: textColor || theme.text,
              fontSize: size === 'emergency' ? 16 : size === 'large' ? 18 : 16,
            },
          ]}
        >
          {title}
        </Text>
      </TouchableOpacity>
    );
  };

  // Heading display component
  const HeadingDisplay: React.FC = () => {
    const compassSize = isLandscape ? 200 : 160;
    const centerX = compassSize / 2;
    const centerY = compassSize / 2;
    
    return (
      <View style={styles.headingContainer}>
        <Text style={[styles.headingLabel, { color: theme.text }]}>
          HEADING
        </Text>
        <View style={styles.compassContainer}>
          <Svg width={compassSize} height={compassSize}>
            {/* Compass circle */}
            <Circle
              cx={centerX}
              cy={centerY}
              r={compassSize / 2 - 10}
              fill="none"
              stroke={theme.border}
              strokeWidth="2"
            />
            
            {/* Current heading indicator */}
            <Line
              x1={centerX}
              y1={10}
              x2={centerX}
              y2={30}
              stroke={theme.success}
              strokeWidth="4"
              strokeLinecap="round"
            />
            
            {/* Target heading indicator (if different) */}
            {Math.abs(currentHeading - targetHeading) > 1 && (
              <Line
                x1={centerX + Math.sin((targetHeading * Math.PI) / 180) * (compassSize / 2 - 15)}
                y1={centerY - Math.cos((targetHeading * Math.PI) / 180) * (compassSize / 2 - 15)}
                x2={centerX + Math.sin((targetHeading * Math.PI) / 180) * (compassSize / 2 - 35)}
                y2={centerY - Math.cos((targetHeading * Math.PI) / 180) * (compassSize / 2 - 35)}
                stroke={theme.warning}
                strokeWidth="3"
                strokeLinecap="round"
              />
            )}
            
            {/* Compass markings for cardinal directions */}
            <SvgText
              x={centerX}
              y={20}
              fontSize="14"
              fill={theme.text}
              textAnchor="middle"
            >
              N
            </SvgText>
          </Svg>
        </View>
        
        <View style={styles.headingValues}>
          <View style={styles.headingValue}>
            <Text style={[styles.headingValueLabel, { color: theme.textSecondary }]}>
              CURRENT
            </Text>
            <Text style={[styles.headingValueText, { color: theme.success }]}>
              {Math.round(currentHeading)}°
            </Text>
          </View>
          
          <View style={styles.headingValue}>
            <Text style={[styles.headingValueLabel, { color: theme.textSecondary }]}>
              TARGET
            </Text>
            <Text style={[styles.headingValueText, { color: theme.warning }]}>
              {Math.round(targetHeading)}°
            </Text>
          </View>
        </View>
      </View>
    );
  };

  // Portrait layout
  if (!isLandscape) {
    return (
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        {/* Header with close button */}
        <View style={styles.header}>
          <Text style={[styles.title, { color: theme.text }]}>
            AUTOPILOT CONTROL
          </Text>
          {onClose && (
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Text style={[styles.closeButtonText, { color: theme.text }]}>
                ✕
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Status indicator */}
        <View style={styles.statusContainer}>
          <View style={[styles.statusIndicator, { backgroundColor: getStatusColor() }]} />
          <Text style={[styles.statusText, { color: theme.text }]}>
            {getStatusText()}
          </Text>
          <Text style={[styles.modeText, { color: theme.textSecondary }]}>
            {mode}
          </Text>
        </View>

        {/* Heading display */}
        <HeadingDisplay />

        {/* Main control buttons */}
        <View style={styles.mainControls}>
          {!engaged ? (
            <TouchButton
              title="ENGAGE AUTOPILOT"
              onPress={handleEngageRequest}
              backgroundColor={theme.success}
              textColor={theme.background}
              size="large"
              disabled={isCommandPending}
            />
          ) : (
            <TouchButton
              title="STANDBY"
              onPress={handleEmergencyDisengage}
              backgroundColor={theme.warning}
              textColor={theme.background}
              size="large"
              disabled={isCommandPending}
            />
          )}
        </View>

        {/* Heading adjustment controls */}
        <View style={styles.headingAdjustments}>
          <View style={styles.adjustmentRow}>
            <TouchButton
              title="-10°"
              onPress={() => adjustHeading(-10)}
              backgroundColor={theme.surface}
              size="small"
              disabled={!engaged || isCommandPending}
            />
            <TouchButton
              title="-1°"
              onPress={() => adjustHeading(-1)}
              backgroundColor={theme.surface}
              size="small"
              disabled={!engaged || isCommandPending}
            />
            <TouchButton
              title="+1°"
              onPress={() => adjustHeading(1)}
              backgroundColor={theme.surface}
              size="small"
              disabled={!engaged || isCommandPending}
            />
            <TouchButton
              title="+10°"
              onPress={() => adjustHeading(10)}
              backgroundColor={theme.surface}
              size="small"
              disabled={!engaged || isCommandPending}
            />
          </View>
        </View>

        {/* Emergency disengage - always visible */}
        <View style={styles.emergencyContainer}>
          <TouchButton
            title="EMERGENCY DISENGAGE"
            onPress={handleEmergencyDisengage}
            backgroundColor={theme.error}
            textColor={theme.background}
            size="emergency"
            disabled={isCommandPending}
          />
        </View>

        {/* Command feedback */}
        {isCommandPending && (
          <View style={styles.commandFeedback}>
            <Text style={[styles.commandText, { color: theme.accent }]}>
              {pendingCommand}
            </Text>
          </View>
        )}

        {/* Engagement confirmation modal */}
        <Modal
          visible={showEngageConfirmation}
          transparent={true}
          animationType="fade"
        >
          <View style={styles.modalOverlay}>
            <View style={[styles.confirmationModal, { backgroundColor: theme.surface }]}>
              <Text style={[styles.confirmationTitle, { color: theme.text }]}>
                ENGAGE AUTOPILOT
              </Text>
              <Text style={[styles.confirmationText, { color: theme.textSecondary }]}>
                Are you ready to engage autopilot on heading {Math.round(targetHeading)}°?
              </Text>
              
              <View style={styles.confirmationButtons}>
                <TouchButton
                  title="CANCEL"
                  onPress={() => setShowEngageConfirmation(false)}
                  backgroundColor={theme.border}
                  size="medium"
                />
                <TouchButton
                  title="ENGAGE"
                  onPress={handleEngageConfirm}
                  backgroundColor={theme.success}
                  textColor={theme.background}
                  size="medium"
                />
              </View>
            </View>
          </View>
        </Modal>
      </View>
    );
  }

  // Landscape layout (similar structure but optimized for horizontal space)
  return (
    <View style={[styles.container, styles.landscapeContainer, { backgroundColor: theme.background }]}>
      {/* Left side - Status and heading */}
      <View style={styles.leftPanel}>
        <View style={styles.header}>
          <Text style={[styles.title, { color: theme.text }]}>
            AUTOPILOT
          </Text>
          {onClose && (
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Text style={[styles.closeButtonText, { color: theme.text }]}>
                ✕
              </Text>
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.statusContainer}>
          <View style={[styles.statusIndicator, { backgroundColor: getStatusColor() }]} />
          <Text style={[styles.statusText, { color: theme.text }]}>
            {getStatusText()}
          </Text>
        </View>

        <HeadingDisplay />
      </View>

      {/* Right side - Controls */}
      <View style={styles.rightPanel}>
        <View style={styles.mainControls}>
          {!engaged ? (
            <TouchButton
              title="ENGAGE AUTOPILOT"
              onPress={handleEngageRequest}
              backgroundColor={theme.success}
              textColor={theme.background}
              size="large"
              disabled={isCommandPending}
            />
          ) : (
            <TouchButton
              title="STANDBY"
              onPress={handleEmergencyDisengage}
              backgroundColor={theme.warning}
              textColor={theme.background}
              size="large"
              disabled={isCommandPending}
            />
          )}
        </View>

        <View style={styles.headingAdjustments}>
          <View style={styles.adjustmentRow}>
            <TouchButton
              title="-10°"
              onPress={() => adjustHeading(-10)}
              backgroundColor={theme.surface}
              size="medium"
              disabled={!engaged || isCommandPending}
            />
            <TouchButton
              title="-1°"
              onPress={() => adjustHeading(-1)}
              backgroundColor={theme.surface}
              size="medium"
              disabled={!engaged || isCommandPending}
            />
          </View>
          <View style={styles.adjustmentRow}>
            <TouchButton
              title="+1°"
              onPress={() => adjustHeading(1)}
              backgroundColor={theme.surface}
              size="medium"
              disabled={!engaged || isCommandPending}
            />
            <TouchButton
              title="+10°"
              onPress={() => adjustHeading(10)}
              backgroundColor={theme.surface}
              size="medium"
              disabled={!engaged || isCommandPending}
            />
          </View>
        </View>

        <View style={styles.emergencyContainer}>
          <TouchButton
            title="EMERGENCY DISENGAGE"
            onPress={handleEmergencyDisengage}
            backgroundColor={theme.error}
            textColor={theme.background}
            size="emergency"
            disabled={isCommandPending}
          />
        </View>
      </View>

      {/* Command feedback */}
      {isCommandPending && (
        <View style={styles.commandFeedback}>
          <Text style={[styles.commandText, { color: theme.accent }]}>
            {pendingCommand}
          </Text>
        </View>
      )}

      {/* Engagement confirmation modal (same as portrait) */}
      <Modal
        visible={showEngageConfirmation}
        transparent={true}
        animationType="fade"
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.confirmationModal, { backgroundColor: theme.surface }]}>
            <Text style={[styles.confirmationTitle, { color: theme.text }]}>
              ENGAGE AUTOPILOT
            </Text>
            <Text style={[styles.confirmationText, { color: theme.textSecondary }]}>
              Are you ready to engage autopilot on heading {Math.round(targetHeading)}°?
            </Text>
            
            <View style={styles.confirmationButtons}>
              <TouchButton
                title="CANCEL"
                onPress={() => setShowEngageConfirmation(false)}
                backgroundColor={theme.border}
                size="medium"
              />
              <TouchButton
                title="ENGAGE"
                onPress={handleEngageConfirm}
                backgroundColor={theme.success}
                textColor={theme.background}
                size="medium"
              />
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
  },
  landscapeContainer: {
    flexDirection: 'row',
  },
  leftPanel: {
    flex: 1,
    marginRight: 20,
  },
  rightPanel: {
    flex: 1,
    justifyContent: 'space-around',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  closeButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonText: {
    fontSize: 20,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  statusIndicator: {
    width: 20,
    height: 20,
    borderRadius: 10,
    marginRight: 12,
  },
  statusText: {
    fontSize: 18,
    fontWeight: 'bold',
    marginRight: 12,
  },
  modeText: {
    fontSize: 14,
  },
  headingContainer: {
    alignItems: 'center',
    marginBottom: 30,
  },
  headingLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  compassContainer: {
    marginBottom: 15,
  },
  headingValues: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
  },
  headingValue: {
    alignItems: 'center',
  },
  headingValueLabel: {
    fontSize: 12,
    marginBottom: 4,
  },
  headingValueText: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  mainControls: {
    alignItems: 'center',
    marginBottom: 30,
  },
  headingAdjustments: {
    alignItems: 'center',
    marginBottom: 30,
  },
  adjustmentRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 10,
  },
  emergencyContainer: {
    alignItems: 'center',
    marginTop: 'auto',
  },
  touchButton: {
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 12,
    marginHorizontal: 8,
    marginVertical: 4,
    // Minimum 44pt touch target for accessibility
    minWidth: 44,
    minHeight: 44,
    // Enhanced for marine conditions
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  touchButtonText: {
    fontWeight: 'bold',
    textAlign: 'center',
  },
  commandFeedback: {
    position: 'absolute',
    top: 100,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  commandText: {
    fontSize: 16,
    fontWeight: 'bold',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  confirmationModal: {
    margin: 20,
    borderRadius: 20,
    padding: 30,
    alignItems: 'center',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  confirmationTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 15,
  },
  confirmationText: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 25,
  },
  confirmationButtons: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
  },
});