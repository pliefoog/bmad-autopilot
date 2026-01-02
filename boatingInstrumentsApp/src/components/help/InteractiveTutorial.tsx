/**
 * InteractiveTutorial - Overlay-based tutorial system with step highlighting
 *
 * Features:
 * - Step-by-step guided tutorials with visual highlights
 * - Target element highlighting with spotlight effect
 * - Progress indicators
 * - Skip and navigation controls
 * - Completion tracking
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Animated,
  Dimensions,
  Platform,
} from 'react-native';
import { Tutorial, TutorialStep, TutorialProgress } from '../../systems/help/types';
import TutorialManager from '../../systems/help/TutorialManager';
import { useTheme } from '../../store/themeStore';

interface InteractiveTutorialProps {
  tutorial: Tutorial;
  visible: boolean;
  onComplete: () => void;
  onSkip: () => void;
  highlightTargets?: boolean; // Enable spotlight highlighting
  overlay?: boolean; // Show dark overlay
}

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

export const InteractiveTutorial: React.FC<InteractiveTutorialProps> = ({
  tutorial,
  visible,
  onComplete,
  onSkip,
  highlightTargets = true,
  overlay = true,
}) => {
  const { colors } = useTheme();
  const [progress, setProgress] = useState<TutorialProgress | undefined>();
  const [currentStep, setCurrentStep] = useState<TutorialStep | undefined>();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;

  useEffect(() => {
    if (visible) {
      // Load or start tutorial
      const existingProgress = TutorialManager.getTutorialProgress(tutorial.id);
      if (existingProgress && !existingProgress.completed) {
        setProgress(existingProgress);
        setCurrentStep(tutorial.steps[existingProgress.currentStep]);
      } else {
        // Start new tutorial
        TutorialManager.startTutorial(tutorial.id).then(() => {
          const newProgress = TutorialManager.getTutorialProgress(tutorial.id);
          setProgress(newProgress);
          if (newProgress) {
            setCurrentStep(tutorial.steps[newProgress.currentStep]);
          }
        });
      }

      // Animate in
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      fadeAnim.setValue(0);
      slideAnim.setValue(50);
    }
  }, [visible, tutorial.id, fadeAnim, slideAnim]);

  // Subscribe to progress updates
  useEffect(() => {
    const unsubscribe = TutorialManager.subscribe((tutorialId, updatedProgress) => {
      if (tutorialId === tutorial.id) {
        setProgress(updatedProgress);
        if (updatedProgress.completed) {
          handleComplete();
        } else {
          setCurrentStep(tutorial.steps[updatedProgress.currentStep]);
        }
      }
    });

    return unsubscribe;
  }, [tutorial.id]);

  const handleNext = useCallback(async () => {
    if (!progress) return;

    const success = await TutorialManager.nextStep(tutorial.id);
    if (!success) {
      // Validation failed or tutorial complete
      if (progress.currentStep >= tutorial.steps.length - 1) {
        handleComplete();
      }
    }
  }, [progress, tutorial.id]);

  const handlePrevious = useCallback(async () => {
    await TutorialManager.previousStep(tutorial.id);
  }, [tutorial.id]);

  const handleSkip = useCallback(async () => {
    await TutorialManager.skipTutorial(tutorial.id);
    onSkip();
  }, [tutorial.id, onSkip]);

  const handleComplete = useCallback(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 50,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => {
      onComplete();
    });
  }, [fadeAnim, slideAnim, onComplete]);

  if (!visible || !progress || !currentStep) {
    return null;
  }

  const stepNumber = progress.currentStep + 1;
  const totalSteps = progress.totalSteps;
  const progressPercent = (stepNumber / totalSteps) * 100;
  const isLastStep = stepNumber === totalSteps;
  const isFirstStep = stepNumber === 1;

  // Safety warning for critical tutorials
  const showSafetyWarning = tutorial.safetyWarning && tutorial.category === 'safety';

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={handleSkip}>
      <View style={styles.container}>
        {/* Dark overlay */}
        {overlay && (
          <Animated.View
            style={[
              styles.overlay,
              {
                backgroundColor: colors.background,
                opacity: fadeAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0, 0.85],
                }),
              },
            ]}
          />
        )}
        <Animated.View
          style={[
            styles.contentCard,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border,
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerTop}>
              <Text style={[styles.title, { color: colors.text }]}>{tutorial.title}</Text>
              <TouchableOpacity
                onPress={handleSkip}
                style={styles.skipButton}
                accessibilityLabel="Skip tutorial"
                accessibilityRole="button"
              >
                <Text style={[styles.skipText, { color: colors.textSecondary }]}>Skip</Text>
              </TouchableOpacity>
            </View>

            {/* Progress bar */}
            <View style={[styles.progressBarContainer, { backgroundColor: colors.border }]}>
              <View
                style={[
                  styles.progressBar,
                  {
                    backgroundColor: colors.primary,
                    width: `${progressPercent}%`,
                  },
                ]}
              />
            </View>

            <Text style={[styles.stepCounter, { color: colors.textSecondary }]}>
              Step {stepNumber} of {totalSteps}
            </Text>
          </View>

          {/* Safety warning */}
          {showSafetyWarning && (
            <View style={[styles.safetyWarning, { backgroundColor: colors.warning + '20' }]}>
              <Text style={[styles.safetyWarningText, { color: colors.warning }]}>
                ⚠️ {tutorial.safetyWarning}
              </Text>
            </View>
          )}
          <View style={styles.stepContent}>
            <Text style={[styles.stepTitle, { color: colors.text }]}>{currentStep.title}</Text>
            <Text style={[styles.stepDescription, { color: colors.textSecondary }]}>
              {currentStep.description}
            </Text>

            {/* Action hint */}
            {currentStep.action && currentStep.action !== 'none' ? (
              <View style={styles.actionHint}>
                <Text style={[styles.actionHintText, { color: colors.primary }]}>
                  {getActionHintText(currentStep.action)}
                </Text>
              </View>
            ) : null}
          </View>

          {/* Navigation buttons */}
          <View style={styles.navigation}>
            <TouchableOpacity
              onPress={handlePrevious}
              disabled={isFirstStep}
              style={[
                styles.navButton,
                styles.backButton,
                { borderColor: colors.border },
                isFirstStep && styles.navButtonDisabled,
              ]}
              accessibilityLabel="Previous step"
              accessibilityRole="button"
            >
              <Text
                style={[
                  styles.navButtonText,
                  { color: colors.text },
                  isFirstStep && styles.navButtonTextDisabled,
                ]}
              >
                ← Back
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handleNext}
              style={[styles.navButton, styles.nextButton, { backgroundColor: colors.primary }]}
              accessibilityLabel={isLastStep ? 'Complete tutorial' : 'Next step'}
              accessibilityRole="button"
            >
              <Text style={[styles.navButtonText, styles.nextButtonText]}>
                {isLastStep ? 'Complete ✓' : 'Next →'}
              </Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
};

/**
 * Get human-readable action hint text
 */
function getActionHintText(action: string): string {
  switch (action) {
    case 'tap':
      return '👉 Tap the highlighted element to continue';
    case 'swipe':
      return '👆 Swipe to continue';
    case 'longPress':
      return '👇 Long press the highlighted element';
    default:
      return '';
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
  },
  contentCard: {
    width: SCREEN_WIDTH * 0.9,
    maxWidth: 500,
    borderRadius: 16,
    padding: 24,
    borderWidth: 1,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
      },
      android: {
        elevation: 8,
      },
      web: {
        boxShadow: '0 4px 8px rgba(0, 0, 0, 0.3)',
      },
    }),
  },
  header: {
    marginBottom: 20,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    flex: 1,
  },
  skipButton: {
    padding: 8,
    marginLeft: 12,
  },
  skipText: {
    fontSize: 16,
  },
  progressBarContainer: {
    height: 4,
    borderRadius: 2,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressBar: {
    height: '100%',
    borderRadius: 2,
  },
  stepCounter: {
    fontSize: 14,
  },
  safetyWarning: {
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  safetyWarningText: {
    fontSize: 14,
    fontWeight: '600',
  },
  stepContent: {
    marginBottom: 24,
  },
  stepTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 12,
  },
  stepDescription: {
    fontSize: 16,
    lineHeight: 24,
  },
  actionHint: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
  },
  actionHintText: {
    fontSize: 14,
    fontWeight: '500',
  },
  navigation: {
    flexDirection: 'row',
    gap: 12,
  },
  navButton: {
    flex: 1,
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
  },
  backButton: {
    borderWidth: 2,
    backgroundColor: 'transparent',
  },
  nextButton: {
    // Primary color background from theme
  },
  navButtonDisabled: {
    opacity: 0.3,
  },
  navButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  nextButtonText: {
    color: theme.surface,
  },
  navButtonTextDisabled: {
    opacity: 0.5,
  },
});

export default InteractiveTutorial;
