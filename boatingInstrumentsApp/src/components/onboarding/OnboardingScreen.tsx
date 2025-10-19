/**
 * Onboarding Screen Component
 * Story 4.4 AC11: First-run experience for new users
 * 
 * Provides a 5-screen walkthrough covering:
 * 1. Welcome & app introduction
 * 2. Connection setup guidance
 * 3. Widget customization overview
 * 4. Alarm configuration importance
 * 5. Accessibility features
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  SafeAreaView,
  Dimensions,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useTheme } from '../../theme/ThemeProvider';

interface OnboardingScreenProps {
  visible: boolean;
  onComplete: () => void;
  onSkip: () => void;
}

type OnboardingStep = 'welcome' | 'connection' | 'widgets' | 'alarms' | 'accessibility';

const ONBOARDING_STEPS: OnboardingStep[] = [
  'welcome',
  'connection',
  'widgets',
  'alarms',
  'accessibility',
];

export const OnboardingScreen: React.FC<OnboardingScreenProps> = ({
  visible,
  onComplete,
  onSkip,
}) => {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const theme = useTheme();
  const { width } = Dimensions.get('window');

  const currentStep = ONBOARDING_STEPS[currentStepIndex];
  const isFirstStep = currentStepIndex === 0;
  const isLastStep = currentStepIndex === ONBOARDING_STEPS.length - 1;
  const progress = ((currentStepIndex + 1) / ONBOARDING_STEPS.length) * 100;

  const handleNext = () => {
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
        return <WelcomeStep />;
      case 'connection':
        return <ConnectionStep />;
      case 'widgets':
        return <WidgetsStep />;
      case 'alarms':
        return <AlarmsStep />;
      case 'accessibility':
        return <AccessibilityStep />;
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
      <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
        {/* Header with Skip Button */}
        <View style={styles.header}>
          <View style={styles.progressContainer}>
            <View style={styles.progressTrack}>
              <View style={[styles.progressBar, { width: `${progress}%`, backgroundColor: theme.colors.primary }]} />
            </View>
            <Text style={[styles.progressText, { color: theme.colors.textSecondary }]}>
              {currentStepIndex + 1} of {ONBOARDING_STEPS.length}
            </Text>
          </View>
          {!isLastStep && (
            <TouchableOpacity onPress={handleSkip} style={styles.skipButton}>
              <Text style={[styles.skipText, { color: theme.colors.primary }]}>Skip</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Step Content */}
        <View style={styles.content}>
          {renderStepContent()}
        </View>

        {/* Footer Navigation */}
        <View style={styles.footer}>
          {!isFirstStep && (
            <TouchableOpacity
              onPress={handleBack}
              style={[styles.footerButton, styles.backButton, { borderColor: theme.colors.border }]}
              accessibilityLabel="Go back to previous step"
              accessibilityRole="button"
            >
              <Ionicons name="arrow-back" size={20} color={theme.colors.text} />
              <Text style={[styles.footerButtonText, { color: theme.colors.text }]}>Back</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            onPress={handleNext}
            style={[
              styles.footerButton,
              styles.nextButton,
              { backgroundColor: theme.colors.primary },
              isFirstStep && styles.footerButtonFull,
            ]}
            accessibilityLabel={isLastStep ? 'Complete onboarding' : 'Continue to next step'}
            accessibilityRole="button"
          >
            <Text style={[styles.footerButtonText, styles.nextButtonText]}>
              {isLastStep ? "Get Started" : "Next"}
            </Text>
            {!isLastStep && <Ionicons name="arrow-forward" size={20} color="#FFFFFF" />}
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </Modal>
  );
};

// Placeholder step components - will be implemented individually
const WelcomeStep: React.FC = () => {
  const theme = useTheme();
  return (
    <View style={styles.stepContainer}>
      <View style={styles.iconContainer}>
        <Ionicons name="boat-outline" size={80} color={theme.colors.primary} />
      </View>
      <Text style={[styles.stepTitle, { color: theme.colors.text }]}>
        Welcome to BMad Autopilot
      </Text>
      <Text style={[styles.stepDescription, { color: theme.colors.textSecondary }]}>
        Transform your device into a comprehensive marine display with real-time NMEA data, 
        autopilot control, and critical alarm monitoring.
      </Text>
      <View style={styles.featureList}>
        <FeatureItem icon="wifi" text="WiFi bridge connectivity" theme={theme} />
        <FeatureItem icon="speedometer" text="Real-time marine instruments" theme={theme} />
        <FeatureItem icon="notifications" text="Critical safety alarms" theme={theme} />
        <FeatureItem icon="compass" text="Raymarine autopilot control" theme={theme} />
      </View>
    </View>
  );
};

const ConnectionStep: React.FC = () => {
  const theme = useTheme();
  return (
    <View style={styles.stepContainer}>
      <View style={styles.iconContainer}>
        <Ionicons name="wifi" size={80} color={theme.colors.primary} />
      </View>
      <Text style={[styles.stepTitle, { color: theme.colors.text }]}>
        Connect to Your Boat
      </Text>
      <Text style={[styles.stepDescription, { color: theme.colors.textSecondary }]}>
        Connect to your marine WiFi bridge to receive real-time NMEA 0183 and NMEA 2000 data 
        from your boat's instruments.
      </Text>
      <View style={styles.instructionList}>
        <InstructionItem number="1" text="Connect to your boat's WiFi network" theme={theme} />
        <InstructionItem number="2" text="Enter bridge IP address (e.g., 192.168.1.1)" theme={theme} />
        <InstructionItem number="3" text="Configure port (typically 10110)" theme={theme} />
        <InstructionItem number="4" text="Test connection and start receiving data" theme={theme} />
      </View>
    </View>
  );
};

const WidgetsStep: React.FC = () => {
  const theme = useTheme();
  return (
    <View style={styles.stepContainer}>
      <View style={styles.iconContainer}>
        <Ionicons name="grid-outline" size={80} color={theme.colors.primary} />
      </View>
      <Text style={[styles.stepTitle, { color: theme.colors.text }]}>
        Customize Your Display
      </Text>
      <Text style={[styles.stepDescription, { color: theme.colors.textSecondary }]}>
        Add and arrange marine instrument widgets to create your perfect dashboard. 
        Monitor depth, speed, wind, GPS, heading, and more.
      </Text>
      <View style={styles.widgetGrid}>
        <WidgetPreview icon="water" label="Depth" theme={theme} />
        <WidgetPreview icon="speedometer" label="Speed" theme={theme} />
        <WidgetPreview icon="navigate" label="Wind" theme={theme} />
        <WidgetPreview icon="location" label="GPS" theme={theme} />
      </View>
      <Text style={[styles.tipText, { color: theme.colors.warning }]}>
        💡 Tap widgets to expand, long-press to pin important ones
      </Text>
    </View>
  );
};

const AlarmsStep: React.FC = () => {
  const theme = useTheme();
  return (
    <View style={styles.stepContainer}>
      <View style={styles.iconContainer}>
        <Ionicons name="alert-circle-outline" size={80} color={theme.colors.error} />
      </View>
      <Text style={[styles.stepTitle, { color: theme.colors.text }]}>
        Marine Safety Alarms
      </Text>
      <Text style={[styles.stepDescription, { color: theme.colors.textSecondary }]}>
        Configure critical alarms to alert you of dangerous conditions. 
        The app monitors depth, engine temperature, battery voltage, and more.
      </Text>
      <View style={styles.alarmList}>
        <AlarmItem 
          icon="water" 
          title="Shallow Water" 
          description="Alerts when depth falls below your minimum"
          theme={theme}
        />
        <AlarmItem 
          icon="flame" 
          title="Engine Overheat" 
          description="Warns of dangerous coolant temperatures"
          theme={theme}
        />
        <AlarmItem 
          icon="compass" 
          title="Autopilot Failure" 
          description="Critical alert for autopilot disconnection"
          theme={theme}
        />
      </View>
      <Text style={[styles.warningText, { color: theme.colors.error }]}>
        ⚠️ Critical alarms cannot be disabled for safety
      </Text>
    </View>
  );
};

const AccessibilityStep: React.FC = () => {
  const theme = useTheme();
  return (
    <View style={styles.stepContainer}>
      <View style={styles.iconContainer}>
        <Ionicons name="accessibility-outline" size={80} color={theme.colors.success} />
      </View>
      <Text style={[styles.stepTitle, { color: theme.colors.text }]}>
        Accessible for Everyone
      </Text>
      <Text style={[styles.stepDescription, { color: theme.colors.textSecondary }]}>
        Comprehensive accessibility features ensure everyone can use the app safely, 
        including support for screen readers, high contrast, and marine conditions.
      </Text>
      <View style={styles.accessibilityList}>
        <AccessibilityFeature 
          icon="volume-high" 
          title="Screen Reader Support" 
          description="VoiceOver and TalkBack compatible"
          theme={theme}
        />
        <AccessibilityFeature 
          icon="contrast" 
          title="High Contrast Mode" 
          description="Enhanced visibility in all conditions"
          theme={theme}
        />
        <AccessibilityFeature 
          icon="text" 
          title="Large Text Support" 
          description="Scalable fonts for readability"
          theme={theme}
        />
        <AccessibilityFeature 
          icon="hand-left" 
          title="Marine Touch Targets" 
          description="Large buttons for wet hands & gloves"
          theme={theme}
        />
      </View>
    </View>
  );
};

// Helper Components
interface FeatureItemProps {
  icon: string;
  text: string;
  theme: any;
}

const FeatureItem: React.FC<FeatureItemProps> = ({ icon, text, theme }) => (
  <View style={styles.featureItem}>
    <Ionicons name={icon as any} size={24} color={theme.colors.primary} />
    <Text style={[styles.featureText, { color: theme.colors.text }]}>{text}</Text>
  </View>
);

interface InstructionItemProps {
  number: string;
  text: string;
  theme: any;
}

const InstructionItem: React.FC<InstructionItemProps> = ({ number, text, theme }) => (
  <View style={styles.instructionItem}>
    <View style={[styles.instructionNumber, { backgroundColor: theme.colors.primary }]}>
      <Text style={styles.instructionNumberText}>{number}</Text>
    </View>
    <Text style={[styles.instructionText, { color: theme.colors.text }]}>{text}</Text>
  </View>
);

interface WidgetPreviewProps {
  icon: string;
  label: string;
  theme: any;
}

const WidgetPreview: React.FC<WidgetPreviewProps> = ({ icon, label, theme }) => (
  <View style={[styles.widgetPreview, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
    <Ionicons name={icon as any} size={32} color={theme.colors.primary} />
    <Text style={[styles.widgetLabel, { color: theme.colors.text }]}>{label}</Text>
  </View>
);

interface AlarmItemProps {
  icon: string;
  title: string;
  description: string;
  theme: any;
}

const AlarmItem: React.FC<AlarmItemProps> = ({ icon, title, description, theme }) => (
  <View style={[styles.alarmItem, { backgroundColor: theme.colors.surface }]}>
    <Ionicons name={icon as any} size={24} color={theme.colors.error} />
    <View style={styles.alarmContent}>
      <Text style={[styles.alarmTitle, { color: theme.colors.text }]}>{title}</Text>
      <Text style={[styles.alarmDescription, { color: theme.colors.textSecondary }]}>{description}</Text>
    </View>
  </View>
);

interface AccessibilityFeatureProps {
  icon: string;
  title: string;
  description: string;
  theme: any;
}

const AccessibilityFeature: React.FC<AccessibilityFeatureProps> = ({ icon, title, description, theme }) => (
  <View style={[styles.accessibilityFeature, { backgroundColor: theme.colors.surface }]}>
    <Ionicons name={icon as any} size={24} color={theme.colors.success} />
    <View style={styles.accessibilityContent}>
      <Text style={[styles.accessibilityTitle, { color: theme.colors.text }]}>{title}</Text>
      <Text style={[styles.accessibilityDescription, { color: theme.colors.textSecondary }]}>{description}</Text>
    </View>
  </View>
);

const styles = StyleSheet.create({
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
    color: '#FFFFFF',
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
  nextButtonText: {
    color: '#FFFFFF',
  },
});
