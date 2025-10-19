/**
 * Onboarding Hook
 * Story 4.4 AC11: First-run detection and onboarding state management
 * 
 * Manages onboarding flow state using AsyncStorage to detect first-run users.
 * Provides methods to trigger onboarding, mark complete, and replay from settings.
 */

import { useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const ONBOARDING_STORAGE_KEY = '@bmad_autopilot:has_completed_onboarding';

interface UseOnboardingReturn {
  /** Whether onboarding is currently visible */
  isOnboardingVisible: boolean;
  /** Whether initial check is complete */
  isLoading: boolean;
  /** Show onboarding flow */
  showOnboarding: () => void;
  /** Mark onboarding as complete */
  completeOnboarding: () => Promise<void>;
  /** Skip onboarding (also marks complete) */
  skipOnboarding: () => Promise<void>;
  /** Replay onboarding from settings */
  replayOnboarding: () => void;
}

export const useOnboarding = (): UseOnboardingReturn => {
  const [isOnboardingVisible, setIsOnboardingVisible] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    checkOnboardingStatus();
  }, []);

  const checkOnboardingStatus = async () => {
    try {
      const hasCompleted = await AsyncStorage.getItem(ONBOARDING_STORAGE_KEY);
      
      if (hasCompleted !== 'true') {
        // First-run user - show onboarding
        setIsOnboardingVisible(true);
      }
    } catch (error) {
      console.error('Failed to check onboarding status:', error);
      // On error, don't show onboarding to avoid blocking the app
    } finally {
      setIsLoading(false);
    }
  };

  const showOnboarding = () => {
    setIsOnboardingVisible(true);
  };

  const completeOnboarding = async () => {
    try {
      await AsyncStorage.setItem(ONBOARDING_STORAGE_KEY, 'true');
      setIsOnboardingVisible(false);
    } catch (error) {
      console.error('Failed to save onboarding completion:', error);
      // Still hide onboarding even if save fails
      setIsOnboardingVisible(false);
    }
  };

  const skipOnboarding = async () => {
    // Skipping also marks as complete so user isn't prompted again
    await completeOnboarding();
  };

  const replayOnboarding = () => {
    setIsOnboardingVisible(true);
  };

  return {
    isOnboardingVisible,
    isLoading,
    showOnboarding,
    completeOnboarding,
    skipOnboarding,
    replayOnboarding,
  };
};

/**
 * Reset onboarding status (for testing)
 * Call this to simulate first-run experience
 */
export const resetOnboardingStatus = async (): Promise<void> => {
  try {
    await AsyncStorage.removeItem(ONBOARDING_STORAGE_KEY);
    console.log('Onboarding status reset - app will show onboarding on next launch');
  } catch (error) {
    console.error('Failed to reset onboarding status:', error);
    throw error;
  }
};
