/**
 * QuickStartGuide - First-run experience with guided workflows
 * 
 * Features:
 * - Step-by-step onboarding checklist
 * - Progress tracking
 * - Direct links to tutorials
 * - Dismissible when complete
 * - Re-accessible from settings
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
  Modal,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { QuickStartStep, QuickStartProgress } from '../../systems/help/types';
import { useTheme } from '../../theme/ThemeProvider';

const STORAGE_KEY = '@bmad:quick_start_progress';

interface QuickStartGuideProps {
  visible: boolean;
  onClose: () => void;
  onStepAction: (step: QuickStartStep) => void;
  steps: QuickStartStep[];
}

export const QuickStartGuide: React.FC<QuickStartGuideProps> = ({
  visible,
  onClose,
  onStepAction,
  steps: providedSteps,
}) => {
  const { colors } = useTheme();
  const [progress, setProgress] = useState<QuickStartProgress>({
    started: false,
    currentStep: 0,
    totalSteps: providedSteps.length,
    stepsCompleted: [],
    dismissed: false,
  });
  const [steps, setSteps] = useState<QuickStartStep[]>(providedSteps);

  // Load saved progress
  useEffect(() => {
    loadProgress();
  }, []);

  // Save progress when it changes
  useEffect(() => {
    if (progress.started) {
      saveProgress();
    }
  }, [progress]);

  const loadProgress = async () => {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      if (stored) {
        const savedProgress = JSON.parse(stored) as QuickStartProgress;
        setProgress(savedProgress);

        // Update steps with completion status
        const updatedSteps = providedSteps.map(step => ({
          ...step,
          completed: savedProgress.stepsCompleted.includes(step.id),
        }));
        setSteps(updatedSteps);
      }
    } catch (error) {
      console.error('[QuickStartGuide] Failed to load progress:', error);
    }
  };

  const saveProgress = async () => {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
    } catch (error) {
      console.error('[QuickStartGuide] Failed to save progress:', error);
    }
  };

  const handleStepComplete = useCallback((stepId: string) => {
    setProgress(prev => {
      const newCompleted = [...prev.stepsCompleted, stepId];
      const allCompleted = newCompleted.length === prev.totalSteps;

      return {
        ...prev,
        stepsCompleted: newCompleted,
        completedAt: allCompleted ? new Date() : prev.completedAt,
      };
    });

    setSteps(prev =>
      prev.map(step =>
        step.id === stepId ? { ...step, completed: true } : step
      )
    );
  }, []);

  const handleStepPress = useCallback((step: QuickStartStep) => {
    if (!step.completed) {
      // Start progress if not started
      if (!progress.started) {
        setProgress(prev => ({
          ...prev,
          started: true,
          currentStep: steps.findIndex(s => s.id === step.id),
        }));
      }

      // Execute step action
      if (step.action) {
        step.action();
      }

      // Trigger parent callback
      onStepAction(step);
    }
  }, [progress.started, steps, onStepAction]);

  const handleDismiss = useCallback(() => {
    setProgress(prev => ({
      ...prev,
      dismissed: true,
    }));
    onClose();
  }, [onClose]);

  const handleRestart = useCallback(async () => {
    const resetProgress: QuickStartProgress = {
      started: false,
      currentStep: 0,
      totalSteps: providedSteps.length,
      stepsCompleted: [],
      dismissed: false,
    };
    setProgress(resetProgress);
    setSteps(providedSteps.map(s => ({ ...s, completed: false })));
    await AsyncStorage.removeItem(STORAGE_KEY);
  }, [providedSteps]);

  if (!visible) {
    return null;
  }

  const completedCount = progress.stepsCompleted.length;
  const progressPercent = (completedCount / progress.totalSteps) * 100;
  const isComplete = completedCount === progress.totalSteps;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        {/* Header */}
        <View style={[styles.header, { borderBottomColor: colors.border }]}>
          <View style={styles.headerContent}>
            <Text style={[styles.title, { color: colors.text }]}>
              🚀 Quick Start Guide
            </Text>
            <TouchableOpacity
              onPress={onClose}
              style={styles.closeButton}
              accessibilityLabel="Close quick start guide"
              accessibilityRole="button"
            >
              <Text style={[styles.closeText, { color: colors.textSecondary }]}>✕</Text>
            </TouchableOpacity>
          </View>

          {/* Progress */}
          <View style={styles.progressSection}>
            <View style={styles.progressInfo}>
              <Text style={[styles.progressText, { color: colors.textSecondary }]}>
                {completedCount} of {progress.totalSteps} completed
              </Text>
              {isComplete && (
                <Text style={[styles.completeText, { color: colors.success }]}>
                  ✓ All Done!
                </Text>
              )}
            </View>
            <View style={[styles.progressBarContainer, { backgroundColor: colors.border }]}>
              <View
                style={[
                  styles.progressBar,
                  {
                    backgroundColor: isComplete ? colors.success : colors.primary,
                    width: `${progressPercent}%`,
                  },
                ]}
              />
            </View>
          </View>
        </View>

        {/* Steps List */}
        <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
          {steps.map((step, index) => (
            <TouchableOpacity
              key={step.id}
              style={[
                styles.stepItem,
                { backgroundColor: colors.surface, borderColor: colors.border },
                step.completed && styles.stepItemCompleted,
              ]}
              onPress={() => handleStepPress(step)}
              disabled={step.completed}
              accessibilityRole="button"
              accessibilityLabel={`Step ${index + 1}: ${step.title}${step.completed ? ' - Completed' : ''}`}
              accessibilityState={{ disabled: step.completed }}
            >
              {/* Step Number / Checkmark */}
              <View
                style={[
                  styles.stepNumber,
                  { borderColor: colors.border },
                  step.completed && { backgroundColor: colors.success, borderColor: colors.success },
                ]}
              >
                {step.completed ? (
                  <Text style={styles.checkmark}>✓</Text>
                ) : (
                  <Text style={[styles.stepNumberText, { color: colors.textSecondary }]}>
                    {index + 1}
                  </Text>
                )}
              </View>

              {/* Step Content */}
              <View style={styles.stepContent}>
                <View style={styles.stepHeader}>
                  {step.icon && <Text style={styles.stepIcon}>{step.icon}</Text>}
                  <Text
                    style={[
                      styles.stepTitle,
                      { color: colors.text },
                      step.completed && styles.stepTitleCompleted,
                    ]}
                  >
                    {step.title}
                  </Text>
                </View>
                <Text
                  style={[
                    styles.stepDescription,
                    { color: colors.textSecondary },
                    step.completed && styles.stepDescriptionCompleted,
                  ]}
                >
                  {step.description}
                </Text>
              </View>

              {/* Arrow */}
              {!step.completed && (
                <Text style={[styles.arrow, { color: colors.textSecondary }]}>→</Text>
              )}
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Footer Actions */}
        <View style={[styles.footer, { borderTopColor: colors.border }]}>
          {isComplete ? (
            <>
              <TouchableOpacity
                style={[styles.footerButton, { borderColor: colors.border }]}
                onPress={handleRestart}
                accessibilityLabel="Restart quick start guide"
                accessibilityRole="button"
              >
                <Text style={[styles.footerButtonText, { color: colors.text }]}>
                  ↻ Restart
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.footerButton, styles.primaryButton, { backgroundColor: colors.primary }]}
                onPress={handleDismiss}
                accessibilityLabel="Finish and close"
                accessibilityRole="button"
              >
                <Text style={styles.primaryButtonText}>Finish</Text>
              </TouchableOpacity>
            </>
          ) : (
            <TouchableOpacity
              style={[styles.footerButton, { borderColor: colors.border }]}
              onPress={handleDismiss}
              accessibilityLabel="Skip quick start guide"
              accessibilityRole="button"
            >
              <Text style={[styles.footerButtonText, { color: colors.textSecondary }]}>
                Skip for Now
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingTop: Platform.OS === 'ios' ? 60 : 20,
    paddingHorizontal: 20,
    paddingBottom: 20,
    borderBottomWidth: 1,
  },
  headerContent: {
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
    padding: 8,
  },
  closeText: {
    fontSize: 24,
  },
  progressSection: {
    // Progress container
  },
  progressInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  progressText: {
    fontSize: 14,
  },
  completeText: {
    fontSize: 14,
    fontWeight: '600',
  },
  progressBarContainer: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    borderRadius: 3,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 20,
  },
  stepItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 12,
  },
  stepItemCompleted: {
    opacity: 0.6,
  },
  stepNumber: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  stepNumberText: {
    fontSize: 14,
    fontWeight: '600',
  },
  checkmark: {
    fontSize: 16,
    color: '#FFFFFF',
  },
  stepContent: {
    flex: 1,
  },
  stepHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  stepIcon: {
    fontSize: 20,
    marginRight: 8,
  },
  stepTitle: {
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
  },
  stepTitleCompleted: {
    textDecorationLine: 'line-through',
  },
  stepDescription: {
    fontSize: 14,
    lineHeight: 20,
  },
  stepDescriptionCompleted: {
    textDecorationLine: 'line-through',
  },
  arrow: {
    fontSize: 20,
    marginLeft: 8,
  },
  footer: {
    flexDirection: 'row',
    padding: 20,
    gap: 12,
    borderTopWidth: 1,
  },
  footerButton: {
    flex: 1,
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    minHeight: 48,
  },
  footerButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  primaryButton: {
    borderWidth: 0,
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});

export default QuickStartGuide;
