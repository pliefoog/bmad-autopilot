/**
 * TroubleshootingGuide - Step-by-step troubleshooting with diagnostic integration
 * 
 * Features:
 * - Common issue troubleshooting flows
 * - Diagnostic integration
 * - Step-by-step resolution guides
 * - Direct links to relevant help content
 */

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useTheme } from '../../theme/ThemeProvider';
import DiagnosticCollector from '../../systems/help/DiagnosticCollector';

interface TroubleshootingIssue {
  id: string;
  title: string;
  description: string;
  category: 'connection' | 'performance' | 'display' | 'autopilot' | 'alarms';
  icon: string;
  steps: TroubleshootingStep[];
}

interface TroubleshootingStep {
  id: string;
  instruction: string;
  action?: 'check' | 'run-diagnostic' | 'open-settings' | 'contact-support';
  actionLabel?: string;
  successMessage?: string;
  failureMessage?: string;
}

interface TroubleshootingGuideProps {
  onContactSupport?: () => void;
  onOpenSettings?: (setting: string) => void;
}

/**
 * Common troubleshooting issues
 */
const commonIssues: TroubleshootingIssue[] = [
  {
    id: 'no-connection',
    title: 'No NMEA Connection',
    description: 'Unable to connect to WiFi bridge or no data receiving',
    category: 'connection',
    icon: '📡',
    steps: [
      {
        id: 'check-wifi',
        instruction: 'Verify your device is connected to the bridge WiFi network',
        action: 'check',
      },
      {
        id: 'check-power',
        instruction: 'Ensure the WiFi bridge is powered on and functioning',
        action: 'check',
      },
      {
        id: 'check-ip',
        instruction: 'Verify the IP address and port in Connection Settings',
        action: 'open-settings',
        actionLabel: 'Open Connection Settings',
      },
      {
        id: 'run-diagnostic',
        instruction: 'Run connection diagnostic to identify issues',
        action: 'run-diagnostic',
        actionLabel: 'Run Diagnostic',
        successMessage: 'Connection verified successfully!',
        failureMessage: 'Connection failed. Check your bridge configuration.',
      },
      {
        id: 'contact-support',
        instruction: 'If issue persists, contact support with diagnostic report',
        action: 'contact-support',
        actionLabel: 'Contact Support',
      },
    ],
  },
  {
    id: 'no-data',
    title: 'Connected But No Data',
    description: 'Connection shows active but no sensor data displaying',
    category: 'connection',
    icon: '📊',
    steps: [
      {
        id: 'check-instruments',
        instruction: 'Verify boat instruments are powered on and transmitting',
        action: 'check',
      },
      {
        id: 'check-bridge-data',
        instruction: 'Confirm the bridge is receiving data from NMEA network',
        action: 'check',
      },
      {
        id: 'check-sentence-filter',
        instruction: 'Check if sentence filtering is blocking required data',
        action: 'open-settings',
        actionLabel: 'Check Filter Settings',
      },
      {
        id: 'restart-connection',
        instruction: 'Disconnect and reconnect to refresh data stream',
        action: 'open-settings',
        actionLabel: 'Connection Settings',
      },
    ],
  },
  {
    id: 'slow-performance',
    title: 'App Running Slowly',
    description: 'Laggy interface or delayed data updates',
    category: 'performance',
    icon: '🐌',
    steps: [
      {
        id: 'check-widgets',
        instruction: 'Too many widgets can impact performance. Remove unused widgets.',
        action: 'check',
      },
      {
        id: 'restart-app',
        instruction: 'Close and restart the app to clear memory',
        action: 'check',
      },
      {
        id: 'check-battery',
        instruction: 'Low battery can throttle performance. Charge device or enable power saving mode.',
        action: 'check',
      },
      {
        id: 'run-diagnostic',
        instruction: 'Run performance diagnostic to identify issues',
        action: 'run-diagnostic',
        actionLabel: 'Run Diagnostic',
      },
    ],
  },
  {
    id: 'autopilot-not-responding',
    title: 'Autopilot Not Responding',
    description: 'Autopilot commands not working',
    category: 'autopilot',
    icon: '⚓',
    steps: [
      {
        id: 'check-compatibility',
        instruction: 'Verify your autopilot system is compatible (Raymarine or NMEA-compatible)',
        action: 'check',
      },
      {
        id: 'check-autopilot-power',
        instruction: 'Ensure autopilot system is powered on and in STBY mode',
        action: 'check',
      },
      {
        id: 'check-nmea-sentences',
        instruction: 'Verify autopilot is transmitting status sentences (e.g., $GPAPB, $STALK)',
        action: 'run-diagnostic',
        actionLabel: 'Check Data Stream',
      },
      {
        id: 'safety-warning',
        instruction: '⚠️ NEVER rely solely on remote autopilot control. Always maintain proper lookout.',
        action: 'check',
      },
    ],
  },
  {
    id: 'alarms-not-working',
    title: 'Alarms Not Triggering',
    description: 'Safety alarms not sounding when they should',
    category: 'alarms',
    icon: '🔔',
    steps: [
      {
        id: 'check-alarm-enabled',
        instruction: 'Verify the alarm is enabled in Alarm Settings',
        action: 'open-settings',
        actionLabel: 'Open Alarm Settings',
      },
      {
        id: 'check-alarm-threshold',
        instruction: 'Confirm alarm thresholds are set correctly for current conditions',
        action: 'check',
      },
      {
        id: 'check-volume',
        instruction: 'Ensure device volume is turned up and not in silent mode',
        action: 'check',
      },
      {
        id: 'test-alarm',
        instruction: 'Test alarm sound to verify it\'s working',
        action: 'open-settings',
        actionLabel: 'Test Alarm',
      },
    ],
  },
];

export const TroubleshootingGuide: React.FC<TroubleshootingGuideProps> = ({
  onContactSupport,
  onOpenSettings,
}) => {
  const { colors } = useTheme();
  const [selectedIssue, setSelectedIssue] = useState<TroubleshootingIssue | null>(null);
  const [currentStep, setCurrentStep] = useState(0);
  const [diagnosticRunning, setDiagnosticRunning] = useState(false);
  const [diagnosticResult, setDiagnosticResult] = useState<string | null>(null);

  const handleSelectIssue = useCallback((issue: TroubleshootingIssue) => {
    setSelectedIssue(issue);
    setCurrentStep(0);
    setDiagnosticResult(null);
  }, []);

  const handleBackToList = useCallback(() => {
    setSelectedIssue(null);
    setCurrentStep(0);
    setDiagnosticResult(null);
  }, []);

  const handleStepAction = useCallback(async (step: TroubleshootingStep) => {
    switch (step.action) {
      case 'run-diagnostic':
        setDiagnosticRunning(true);
        // Simulate diagnostic run
        await new Promise(resolve => setTimeout(resolve, 2000));
        const success = Math.random() > 0.3; // Simulate 70% success rate
        setDiagnosticResult(success ? step.successMessage || 'Check passed' : step.failureMessage || 'Check failed');
        setDiagnosticRunning(false);
        
        // Log diagnostic run
        DiagnosticCollector.logConnection(
          success ? 'info' : 'warning',
          'Troubleshooting',
          `Diagnostic: ${step.instruction}`,
          { result: success ? 'passed' : 'failed' }
        );
        break;

      case 'open-settings':
        if (onOpenSettings) {
          onOpenSettings(step.id);
        }
        break;

      case 'contact-support':
        if (onContactSupport) {
          onContactSupport();
        }
        break;

      case 'check':
      default:
        // Just move to next step
        break;
    }
  }, [onOpenSettings, onContactSupport]);

  const handleNextStep = useCallback(() => {
    if (selectedIssue && currentStep < selectedIssue.steps.length - 1) {
      setCurrentStep(currentStep + 1);
      setDiagnosticResult(null);
    }
  }, [selectedIssue, currentStep]);

  const handlePreviousStep = useCallback(() => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
      setDiagnosticResult(null);
    }
  }, [currentStep]);

  // Show issue list
  if (!selectedIssue) {
    return (
      <ScrollView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.text }]}>
            🔧 Troubleshooting
          </Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            Select an issue for step-by-step resolution
          </Text>
        </View>

        <View style={styles.issueList}>
          {commonIssues.map(issue => (
            <TouchableOpacity
              key={issue.id}
              style={[styles.issueCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
              onPress={() => handleSelectIssue(issue)}
              accessibilityRole="button"
              accessibilityLabel={issue.title}
            >
              <Text style={styles.issueIcon}>{issue.icon}</Text>
              <View style={styles.issueContent}>
                <Text style={[styles.issueTitle, { color: colors.text }]}>
                  {issue.title}
                </Text>
                <Text style={[styles.issueDescription, { color: colors.textSecondary }]}>
                  {issue.description}
                </Text>
              </View>
              <Text style={[styles.arrow, { color: colors.textSecondary }]}>→</Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    );
  }

  // Show step-by-step guide
  const step = selectedIssue.steps[currentStep];
  const isLastStep = currentStep === selectedIssue.steps.length - 1;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header with back button */}
      <View style={[styles.header, styles.stepHeader]}>
        <TouchableOpacity onPress={handleBackToList} style={styles.backButton}>
          <Text style={[styles.backText, { color: colors.primary }]}>← Back</Text>
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={styles.issueIconLarge}>{selectedIssue.icon}</Text>
          <Text style={[styles.stepTitle, { color: colors.text }]}>
            {selectedIssue.title}
          </Text>
        </View>
        <Text style={[styles.stepCounter, { color: colors.textSecondary }]}>
          Step {currentStep + 1} of {selectedIssue.steps.length}
        </Text>
      </View>

      {/* Step content */}
      <ScrollView style={styles.stepContent} contentContainerStyle={styles.stepContentContainer}>
        <Text style={[styles.stepInstruction, { color: colors.text }]}>
          {step.instruction}
        </Text>

        {/* Action button */}
        {step.action && step.actionLabel && (
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: colors.primary }]}
            onPress={() => handleStepAction(step)}
            disabled={diagnosticRunning}
            accessibilityRole="button"
            accessibilityLabel={step.actionLabel}
          >
            {diagnosticRunning ? (
              <ActivityIndicator color="#F3F4F6" />
            ) : (
              <Text style={styles.actionButtonText}>{step.actionLabel}</Text>
            )}
          </TouchableOpacity>
        )}

        {/* Diagnostic result */}
        {diagnosticResult && (
          <View
            style={[
              styles.diagnosticResult,
              {
                backgroundColor:
                  diagnosticResult === step.successMessage
                    ? colors.success + '20'
                    : colors.error + '20',
              },
            ]}
          >
            <Text
              style={[
                styles.diagnosticResultText,
                {
                  color:
                    diagnosticResult === step.successMessage ? colors.success : colors.error,
                },
              ]}
            >
              {diagnosticResult === step.successMessage ? '✓' : '✗'} {diagnosticResult}
            </Text>
          </View>
        )}
      </ScrollView>

      {/* Navigation */}
      <View style={[styles.navigation, { borderTopColor: colors.border }]}>
        <TouchableOpacity
          style={[styles.navButton, { borderColor: colors.border }]}
          onPress={handlePreviousStep}
          disabled={currentStep === 0}
          accessibilityRole="button"
          accessibilityLabel="Previous step"
        >
          <Text
            style={[
              styles.navButtonText,
              { color: currentStep === 0 ? colors.textSecondary : colors.text },
            ]}
          >
            ← Previous
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.navButton, styles.nextButton, { backgroundColor: colors.primary }]}
          onPress={isLastStep ? handleBackToList : handleNextStep}
          accessibilityRole="button"
          accessibilityLabel={isLastStep ? 'Finish' : 'Next step'}
        >
          <Text style={styles.nextButtonText}>{isLastStep ? 'Finish' : 'Next →'}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    padding: 20,
  },
  stepHeader: {
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
  },
  issueList: {
    padding: 16,
  },
  issueCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 12,
  },
  issueIcon: {
    fontSize: 32,
    marginRight: 16,
  },
  issueContent: {
    flex: 1,
  },
  issueTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  issueDescription: {
    fontSize: 14,
  },
  arrow: {
    fontSize: 20,
    marginLeft: 12,
  },
  backButton: {
    alignSelf: 'flex-start',
    marginBottom: 12,
  },
  backText: {
    fontSize: 16,
    fontWeight: '600',
  },
  headerContent: {
    alignItems: 'center',
    marginBottom: 8,
  },
  issueIconLarge: {
    fontSize: 48,
    marginBottom: 8,
  },
  stepTitle: {
    fontSize: 20,
    fontWeight: '600',
    textAlign: 'center',
  },
  stepCounter: {
    fontSize: 14,
    textAlign: 'center',
  },
  stepContent: {
    flex: 1,
  },
  stepContentContainer: {
    padding: 20,
  },
  stepInstruction: {
    fontSize: 18,
    lineHeight: 28,
    marginBottom: 24,
  },
  actionButton: {
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 10,
    alignItems: 'center',
    marginBottom: 16,
  },
  actionButtonText: {
    color: '#F3F4F6',
    fontSize: 16,
    fontWeight: '600',
  },
  diagnosticResult: {
    padding: 16,
    borderRadius: 8,
    marginTop: 8,
  },
  diagnosticResultText: {
    fontSize: 16,
    fontWeight: '600',
  },
  navigation: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
    borderTopWidth: 1,
  },
  navButton: {
    flex: 1,
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    minHeight: 48,
  },
  navButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  nextButton: {
    borderWidth: 0,
  },
  nextButtonText: {
    color: '#F3F4F6',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default TroubleshootingGuide;
