/**
 * Onboarding Screen Component
 * Story 4.4 AC11: First-run experience for new users
 *
 * Provides a 5-screen walkthrough covering:
 * 1. Welcome & app introduction
 * 2. Smart widget auto-discovery
 * 3. Alarm configuration importance
 * 4. Display themes for marine conditions
 * 5. Connection setup (optional)
 */

import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme, ThemeColors } from '../../store/themeStore';
import { ConnectionConfigDialog } from '../dialogs/ConnectionConfigDialog';
import { getConnectionDefaults, connectNmea, disconnectNmea } from '../../services/connectionDefaults';
import { useNmeaStore } from '../../store/nmeaStore';

interface OnboardingScreenProps {
  visible: boolean;
  onComplete: () => void;
  onSkip: () => void;
}

type OnboardingStep = 'welcome' | 'widgets' | 'alarms' | 'themes' | 'connection';

const ONBOARDING_STEPS: OnboardingStep[] = [
  'welcome',
  'widgets',
  'alarms',
  'themes',
  'connection',
];

export const OnboardingScreen: React.FC<OnboardingScreenProps> = ({
  visible,
  onComplete,
  onSkip,
}) => {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [showConnectionDialog, setShowConnectionDialog] = useState(false);
  const [connectionTested, setConnectionTested] = useState(false);
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { width } = Dimensions.get('window');
  
  // Subscribe to connection status to detect auto-connect
  const connectionStatus = useNmeaStore((state) => state.connectionStatus);
  const isConnected = connectionStatus === 'connected';

  const currentStep = ONBOARDING_STEPS[currentStepIndex];
  const isFirstStep = currentStepIndex === 0;
  const isLastStep = currentStepIndex === ONBOARDING_STEPS.length - 1;
  const progress = ((currentStepIndex + 1) / ONBOARDING_STEPS.length) * 100;

  // Connection handlers for onboarding Step 2
  const handleConnect = async (config: {
    ip: string;
    port: number;
    protocol: 'tcp' | 'udp' | 'websocket';
  }) => {
    // Actually establish the connection (not just set flag)
    try {
      const success = await connectNmea({
        ip: config.ip,
        port: config.port,
        protocol: config.protocol as 'tcp' | 'udp' | 'websocket',
      });
      
      if (success) {
        setConnectionTested(true);
        setShowConnectionDialog(false);
      }
    } catch (error) {
      console.error('[Wizard] Connection failed:', error);
      // Dialog stays open so user can try again
    }
  };

  const handleDisconnect = async () => {
    try {
      await disconnectNmea();
      // Clear the connectionTested flag so user must reconnect to proceed
      setConnectionTested(false);
    } catch (error) {
      console.error('[Wizard] Disconnect failed:', error);
    }
  };

  const handleNext = () => {
    // Connection is optional - users can proceed without it and set up later
    if (isLastStep) {
      onComplete();
    } else {
      setCurrentStepIndex(currentStepIndex + 1);
    }
  };

  const handleBack = () => {
    if (!isFirstStep) {
      setCurrentStepIndex(currentStepIndex - 1);
    }
  };

  const handleSkip = () => {
    onSkip();
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 'welcome':
        return <WelcomeStep styles={styles} />;
      case 'widgets':
        return <WidgetsStep styles={styles} />;
      case 'alarms':
        return <AlarmsStep styles={styles} />;
      case 'themes':
        return <ThemesStep styles={styles} />;
      case 'connection':
        return (
          <ConnectionStep
            styles={styles}
            showDialog={showConnectionDialog}
            setShowDialog={setShowConnectionDialog}
            connectionTested={connectionTested}
            onConnect={handleConnect}
          />
        );
      default:
        return null;
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="fade"
      presentationStyle="fullScreen"
      onRequestClose={handleSkip}
    >
      <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
        {/* Header with Skip Button */}
        <View style={styles.header}>
          <View style={styles.progressContainer}>
            <View style={styles.progressTrack}>
              <View
                style={[
                  styles.progressBar,
                  { width: `${progress}%`, backgroundColor: theme.primary },
                ]}
              />
            </View>
            <Text style={[styles.progressText, { color: theme.textSecondary }]}>
              {currentStepIndex + 1} of {ONBOARDING_STEPS.length}
            </Text>
          </View>
          {!isLastStep && (
            <TouchableOpacity onPress={handleSkip} style={styles.skipButton}>
              <Text style={[styles.skipText, { color: theme.primary }]}>Skip</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Step Content */}
        <View style={styles.content}>{renderStepContent()}</View>

        {/* Footer Navigation */}
        <View style={styles.footer}>
          {!isFirstStep && (
            <TouchableOpacity
              onPress={handleBack}
              style={[styles.footerButton, styles.backButton, { borderColor: theme.border }]}
              accessibilityLabel="Go back to previous step"
              accessibilityRole="button"
            >
              <Ionicons name="arrow-back" size={20} color={theme.text} />
              <Text style={[styles.footerButtonText, { color: theme.text }]}>Back</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            onPress={handleNext}
            style={[
              styles.footerButton,
              styles.nextButton,
              { backgroundColor: theme.primary },
              isFirstStep && styles.footerButtonFull,
            ]}
            accessibilityLabel={isLastStep ? 'Complete onboarding' : 'Continue to next step'}
            accessibilityRole="button"
          >
            <Text style={[styles.footerButtonText, styles.nextButtonText]}>
              {isLastStep ? 'Get Started' : 'Next'}
            </Text>
            {!isLastStep && <Ionicons name="arrow-forward" size={20} color={theme.surface} />}
          </TouchableOpacity>
        </View>

        {/* Connection Dialog - Shows on Step 2 */}
        {currentStep === 'connection' && showConnectionDialog ? (
          <ConnectionConfigDialog
            visible={showConnectionDialog}
            onClose={() => setShowConnectionDialog(false)}
            onConnect={handleConnect}
            onDisconnect={handleDisconnect}
            currentConfig={getConnectionDefaults()}
          />
        ) : null}
      </SafeAreaView>
    </Modal>
  );
};

// Placeholder step components - will be implemented individually
interface StepProps {
  styles: ReturnType<typeof createStyles>;
}

interface ConnectionStepProps extends StepProps {
  showDialog: boolean;
  setShowDialog: (show: boolean) => void;
  connectionTested: boolean;
  onConnect: (config: { ip: string; port: number; protocol: 'tcp' | 'udp' | 'websocket' }) => void;
}

const WelcomeStep: React.FC<StepProps> = ({ styles }) => {
  const theme = useTheme();
  return (
    <View style={styles.stepContainer}>
      <View style={styles.iconContainer}>
        <Ionicons name="boat-outline" size={80} color={theme.primary} />
      </View>
      <Text style={[styles.stepTitle, { color: theme.text }]}>Welcome to easyNAV.pro</Text>
      <Text style={[styles.stepDescription, { color: theme.textSecondary }]}>
        Transform your device into a comprehensive marine display with real-time NMEA data,
        autopilot control, and critical alarm monitoring.
      </Text>
      <View style={styles.featureList}>
        <FeatureItem
          icon="wifi-outline"
          text="WiFi bridge connectivity"
          theme={theme}
          styles={styles}
        />
        <FeatureItem
          icon="speedometer-outline"
          text="Real-time marine instruments"
          theme={theme}
          styles={styles}
        />
        <FeatureItem
          icon="notifications-outline"
          text="Critical safety alarms"
          theme={theme}
          styles={styles}
        />
        <FeatureItem
          icon="compass-outline"
          text="Raymarine autopilot control"
          theme={theme}
          styles={styles}
        />
      </View>
    </View>
  );
};

const ConnectionStep: React.FC<ConnectionStepProps> = ({
  styles,
  showDialog,
  setShowDialog,
  connectionTested,
  onConnect,
}) => {
  const theme = useTheme();
  // Subscribe to connection status to show when auto-connected
  const connectionStatus = useNmeaStore((state) => state.connectionStatus);
  const isConnected = connectionStatus === 'connected';
  const showSuccess = connectionTested || isConnected;
  
  return (
    <View style={styles.stepContainer}>
      <View style={styles.iconContainer}>
        <Ionicons
          name="wifi-outline"
          size={80}
          color={theme.primary}
        />
      </View>
      <Text style={[styles.stepTitle, { color: theme.text }]}>Connect to Your Boat</Text>
      <Text style={[styles.stepDescription, { color: theme.textSecondary }]}>
        Connect to your marine WiFi bridge to receive real-time NMEA data from your boat's
        instruments. You can skip this step and configure your connection later from the settings menu.
      </Text>

      {!showDialog && !showSuccess ? (
        <>
          <View style={styles.instructionList}>
            <InstructionItem
              number="1"
              text="Connect to your boat's WiFi network"
              theme={theme}
              styles={styles}
            />
            <InstructionItem
              number="2"
              text="Tap 'Configure Connection' below"
              theme={theme}
              styles={styles}
            />
            <InstructionItem
              number="3"
              text="Enter bridge IP and port"
              theme={theme}
              styles={styles}
            />
            <InstructionItem
              number="4"
              text="Test connection or skip to configure later"
              theme={theme}
              styles={styles}
            />
          </View>

          <TouchableOpacity
            style={[styles.configureButton, { backgroundColor: theme.primary }]}
            onPress={() => setShowDialog(true)}
          >
            <Ionicons name="settings-outline" size={24} color={theme.surface} />
            <Text style={[styles.configureButtonText, { color: theme.surface }]}>
              Configure Connection
            </Text>
          </TouchableOpacity>
        </>
      ) : null}
      {showSuccess && (
        <TouchableOpacity
          style={[styles.changeSettingsButton, { borderColor: theme.border }]}
          onPress={() => setShowDialog(true)}
        >
          <Ionicons name="settings-outline" size={20} color={theme.text} />
          <Text style={[styles.changeSettingsText, { color: theme.text }]}>
            Change Connection Settings
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

const WidgetsStep: React.FC<StepProps> = ({ styles }) => {
  const theme = useTheme();
  return (
    <View style={styles.stepContainer}>
      <View style={styles.iconContainer}>
        <Ionicons name="grid-outline" size={80} color={theme.primary} />
      </View>
      <Text style={[styles.stepTitle, { color: theme.text }]}>Smart Dashboard</Text>
      <Text style={[styles.stepDescription, { color: theme.textSecondary }]}>
        Widgets automatically appear as NMEA sensors are detected from your boat's network in the
        order data is received. They dynamically scale to fit your screen size and orientation -
        from phone to tablet to desktop.
      </Text>
      <View style={styles.widgetGrid}>
        <WidgetPreview icon="water-outline" label="Depth" theme={theme} styles={styles} />
        <WidgetPreview icon="speedometer-outline" label="Speed" theme={theme} styles={styles} />
        <WidgetPreview icon="navigate-outline" label="Wind" theme={theme} styles={styles} />
        <WidgetPreview icon="location-outline" label="GPS" theme={theme} styles={styles} />
        <WidgetPreview icon="speedometer-outline" label="Engine" theme={theme} styles={styles} />
        <WidgetPreview icon="battery-half-outline" label="Battery" theme={theme} styles={styles} />
        <WidgetPreview icon="compass-outline" label="Compass" theme={theme} styles={styles} />
        <WidgetPreview icon="water-outline" label="Tanks" theme={theme} styles={styles} />
      </View>
      <Text style={[styles.tipText, { color: theme.primary }]}>
        ✨ Long-press any widget header to drag and rearrange your dashboard
      </Text>
    </View>
  );
};

const AlarmsStep: React.FC<StepProps> = ({ styles }) => {
  const theme = useTheme();
  return (
    <View style={styles.stepContainer}>
      <View style={styles.iconContainer}>
        <Ionicons name="alert-circle-outline" size={80} color={theme.error} />
      </View>
      <Text style={[styles.stepTitle, { color: theme.text }]}>Marine Safety Alarms</Text>
      <Text style={[styles.stepDescription, { color: theme.textSecondary }]}>
        Configure warning and critical alarm thresholds for numerical metrics like depth, speed,
        temperature, and battery voltage. Each threshold triggers distinct visual and audio alerts.
      </Text>
      <View style={styles.alarmList}>
        <AlarmItem
          icon="water-outline"
          title="Warning: Yellow border + Morse U"
          description="Early warning before reaching critical threshold"
          theme={theme}
          styles={styles}
        />
        <AlarmItem
          icon="flame-outline"
          title="Critical: Red border + Rapid pulse"
          description="Immediate attention required - flashing display"
          theme={theme}
          styles={styles}
        />
        <AlarmItem
          icon="time-outline"
          title="Stale: Grayed out + No audio"
          description="Data too old to trust - check sensor connection"
          theme={theme}
          styles={styles}
        />
      </View>
      <Text style={[styles.tipText, { color: theme.textSecondary }]}>
        💡 Audio alarms follow ISO 9692 maritime conventions - rapid pulse, morse U, warble patterns
      </Text>
    </View>
  );
};

const ThemesStep: React.FC<StepProps> = ({ styles }) => {
  const theme = useTheme();
  return (
    <View style={styles.stepContainer}>
      <View style={styles.iconContainer}>
        <Ionicons name="color-palette-outline" size={80} color={theme.primary} />
      </View>
      <Text style={[styles.stepTitle, { color: theme.text }]}>Built for Marine Conditions</Text>
      <Text style={[styles.stepDescription, { color: theme.textSecondary }]}>
        Choose the perfect display mode for your conditions. Dark mode for night sailing, bright
        mode for daylight, or red-night vision to preserve night adaptation.
      </Text>
      <View style={styles.accessibilityList}>
        <ThemeFeature
          icon="moon-outline"
          title="Dark Mode"
          description="Easy on eyes for night sailing"
          theme={theme}
          styles={styles}
        />
        <ThemeFeature
          icon="sunny-outline"
          title="Light Mode"
          description="Clear visibility in bright sunlight"
          theme={theme}
          styles={styles}
        />
        <ThemeFeature
          icon="eye-outline"
          title="Red-Night Vision"
          description="Preserves night vision adaptation"
          theme={theme}
          styles={styles}
        />
      </View>
      <Text style={[styles.tipText, { color: theme.textSecondary }]}>
        💡 Switch themes anytime from the Theme Widget!
      </Text>
    </View>
  );
};

// Helper Components
interface FeatureItemProps {
  icon: string;
  text: string;
  theme: any;
  styles: ReturnType<typeof createStyles>;
}

const FeatureItem: React.FC<FeatureItemProps> = ({ icon, text, theme, styles }) => (
  <View style={styles.featureItem}>
    <Ionicons name={icon as any} size={24} color={theme.primary} />
    <Text style={[styles.featureText, { color: theme.text }]}>{text}</Text>
  </View>
);

interface InstructionItemProps {
  number: string;
  text: string;
  theme: any;
  styles: ReturnType<typeof createStyles>;
}

const InstructionItem: React.FC<InstructionItemProps> = ({ number, text, theme, styles }) => (
  <View style={styles.instructionItem}>
    <View style={[styles.instructionNumber, { backgroundColor: theme.primary }]}>
      <Text style={styles.instructionNumberText}>{number}</Text>
    </View>
    <Text style={[styles.instructionText, { color: theme.text }]}>{text}</Text>
  </View>
);

interface WidgetPreviewProps {
  icon: string;
  label: string;
  theme: any;
  styles: ReturnType<typeof createStyles>;
}

const WidgetPreview: React.FC<WidgetPreviewProps> = ({ icon, label, theme, styles }) => (
  <View
    style={[styles.widgetPreview, { backgroundColor: theme.surface, borderColor: theme.border }]}
  >
    <Ionicons name={icon as any} size={32} color={theme.primary} />
    <Text style={[styles.widgetLabel, { color: theme.text }]}>{label}</Text>
  </View>
);

interface AlarmItemProps {
  icon: string;
  title: string;
  description: string;
  theme: any;
  styles: ReturnType<typeof createStyles>;
}

const AlarmItem: React.FC<AlarmItemProps> = ({ icon, title, description, theme, styles }) => (
  <View style={[styles.alarmItem, { backgroundColor: theme.surface }]}>
    <Ionicons name={icon as any} size={24} color={theme.error} />
    <View style={styles.alarmContent}>
      <Text style={[styles.alarmTitle, { color: theme.text }]}>{title}</Text>
      <Text style={[styles.alarmDescription, { color: theme.textSecondary }]}>{description}</Text>
    </View>
  </View>
);

interface ThemeFeatureProps {
  icon: string;
  title: string;
  description: string;
  theme: any;
  styles: ReturnType<typeof createStyles>;
}

const ThemeFeature: React.FC<ThemeFeatureProps> = ({
  icon,
  title,
  description,
  theme,
  styles,
}) => (
  <View style={[styles.accessibilityFeature, { backgroundColor: theme.surface }]}>
    <Ionicons name={icon as any} size={24} color={theme.primary} />
    <View style={styles.accessibilityContent}>
      <Text style={[styles.accessibilityTitle, { color: theme.text }]}>{title}</Text>
      <Text style={[styles.accessibilityDescription, { color: theme.textSecondary }]}>
        {description}
      </Text>
    </View>
  </View>
);

const createStyles = (theme: ThemeColors) =>
  StyleSheet.create({
    container: {
      flex: 1,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 20,
      paddingVertical: 16,
    },
    progressContainer: {
      flex: 1,
      marginRight: 16,
    },
    progressTrack: {
      height: 4,
      backgroundColor: '#333',
      borderRadius: 2,
      overflow: 'hidden',
      marginBottom: 8,
    },
    progressBar: {
      height: '100%',
      borderRadius: 2,
    },
    progressText: {
      fontSize: 12,
      fontWeight: '600',
    },
    skipButton: {
      padding: 8,
    },
    skipText: {
      fontSize: 16,
      fontWeight: '600',
    },
    content: {
      flex: 1,
      paddingHorizontal: 24,
    },
    stepContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
    iconContainer: {
      marginBottom: 24,
    },
    stepTitle: {
      fontSize: 28,
      fontWeight: 'bold',
      marginBottom: 16,
      textAlign: 'center',
    },
    stepDescription: {
      fontSize: 16,
      lineHeight: 24,
      textAlign: 'center',
      marginBottom: 32,
      paddingHorizontal: 16,
    },
    featureList: {
      width: '100%',
      maxWidth: 400,
    },
    featureItem: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 12,
      paddingHorizontal: 16,
    },
    featureText: {
      fontSize: 16,
      marginLeft: 16,
      flex: 1,
    },
    instructionList: {
      width: '100%',
      maxWidth: 400,
    },
    instructionItem: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 16,
    },
    instructionNumber: {
      width: 32,
      height: 32,
      borderRadius: 16,
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: 16,
    },
    instructionNumberText: {
      color: theme.surface,
      fontSize: 16,
      fontWeight: 'bold',
    },
    instructionText: {
      fontSize: 15,
      flex: 1,
    },
    widgetGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      justifyContent: 'center',
      gap: 16,
      marginBottom: 24,
      maxWidth: 500,
    },
    widgetPreview: {
      width: 120,
      height: 100,
      borderRadius: 12,
      borderWidth: 2,
      justifyContent: 'center',
      alignItems: 'center',
      padding: 12,
    },
    widgetLabel: {
      fontSize: 14,
      fontWeight: '600',
      marginTop: 8,
    },
    tipText: {
      fontSize: 14,
      textAlign: 'center',
      fontStyle: 'italic',
    },
    alarmList: {
      width: '100%',
      maxWidth: 400,
      marginBottom: 24,
    },
    alarmItem: {
      flexDirection: 'row',
      padding: 16,
      borderRadius: 12,
      marginBottom: 12,
    },
    alarmContent: {
      flex: 1,
      marginLeft: 16,
    },
    alarmTitle: {
      fontSize: 16,
      fontWeight: 'bold',
      marginBottom: 4,
    },
    alarmDescription: {
      fontSize: 14,
      lineHeight: 20,
    },
    warningText: {
      fontSize: 14,
      fontWeight: '600',
      textAlign: 'center',
    },
    accessibilityList: {
      width: '100%',
      maxWidth: 400,
    },
    accessibilityFeature: {
      flexDirection: 'row',
      padding: 16,
      borderRadius: 12,
      marginBottom: 12,
    },
    accessibilityContent: {
      flex: 1,
      marginLeft: 16,
    },
    accessibilityTitle: {
      fontSize: 16,
      fontWeight: 'bold',
      marginBottom: 4,
    },
    accessibilityDescription: {
      fontSize: 14,
      lineHeight: 20,
    },
    footer: {
      flexDirection: 'row',
      paddingHorizontal: 20,
      paddingVertical: 16,
      gap: 12,
    },
    footerButton: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 16,
      paddingHorizontal: 24,
      borderRadius: 12,
      minHeight: 56,
    },
    footerButtonFull: {
      flex: 1,
    },
    backButton: {
      backgroundColor: 'transparent',
      borderWidth: 2,
    },
    nextButton: {
      gap: 8,
    },
    footerButtonText: {
      fontSize: 18,
      fontWeight: 'bold',
    },
    footerButtonDisabled: {
      opacity: 0.5,
    },
    configureButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 16,
      paddingHorizontal: 24,
      borderRadius: 12,
      marginTop: 24,
      gap: 8,
    },
    configureButtonText: {
      fontSize: 18,
      fontWeight: 'bold',
    },
    successBanner: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 20,
      borderRadius: 12,
      marginTop: 24,
      gap: 12,
    },
    successText: {
      flex: 1,
      fontSize: 16,
      fontWeight: '600',
      lineHeight: 22,
    },
    changeSettingsButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 12,
      paddingHorizontal: 20,
      borderRadius: 8,
      borderWidth: 1,
      marginTop: 16,
      gap: 8,
    },
    changeSettingsText: {
      fontSize: 16,
      fontWeight: '500',
    },
    nextButtonText: {
      color: theme.surface,
    },
  });
