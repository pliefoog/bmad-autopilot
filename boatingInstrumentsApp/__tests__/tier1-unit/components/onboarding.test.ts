/**
 * Onboarding System Tests
 * Story 4.4 AC11: Test first-run detection, completion, and navigation
 */

import React from 'react';
import { renderHook, act, waitFor } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useOnboarding } from "../../../src/hooks/useOnboarding";

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
}));

describe('useOnboarding Hook', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('First-run detection', () => {
    it('should show onboarding for new users', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);

      const { result } = renderHook(() => useOnboarding());

      expect(result.current.isLoading).toBe(true);

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.isOnboardingVisible).toBe(true);
      expect(AsyncStorage.getItem).toHaveBeenCalledWith('@bmad_autopilot:has_completed_onboarding');
    });

    it('should not show onboarding for returning users', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue('true');

      const { result } = renderHook(() => useOnboarding());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.isOnboardingVisible).toBe(false);
    });

    it('should not show onboarding on AsyncStorage error', async () => {
      (AsyncStorage.getItem as jest.Mock).mockRejectedValue(new Error('Storage error'));
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      const { result } = renderHook(() => useOnboarding());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.isOnboardingVisible).toBe(false);
      expect(consoleSpy).toHaveBeenCalled();

      consoleSpy.mockRestore();
    });
  });

  describe('Onboarding completion', () => {
    it('should mark onboarding as complete and hide it', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
      (AsyncStorage.setItem as jest.Mock).mockResolvedValue(undefined);

      const { result } = renderHook(() => useOnboarding());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.isOnboardingVisible).toBe(true);

      await act(async () => {
        await result.current.completeOnboarding();
      });

      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        '@bmad_autopilot:has_completed_onboarding',
        'true'
      );
      expect(result.current.isOnboardingVisible).toBe(false);
    });

    it('should hide onboarding even if save fails', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
      (AsyncStorage.setItem as jest.Mock).mockRejectedValue(new Error('Save error'));
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      const { result } = renderHook(() => useOnboarding());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        await result.current.completeOnboarding();
      });

      expect(result.current.isOnboardingVisible).toBe(false);
      expect(consoleSpy).toHaveBeenCalled();

      consoleSpy.mockRestore();
    });
  });

  describe('Skip functionality', () => {
    it('should mark onboarding complete when skipped', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
      (AsyncStorage.setItem as jest.Mock).mockResolvedValue(undefined);

      const { result } = renderHook(() => useOnboarding());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        await result.current.skipOnboarding();
      });

      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        '@bmad_autopilot:has_completed_onboarding',
        'true'
      );
      expect(result.current.isOnboardingVisible).toBe(false);
    });
  });

  describe('Manual show/replay', () => {
    it('should show onboarding when manually triggered', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue('true');

      const { result } = renderHook(() => useOnboarding());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.isOnboardingVisible).toBe(false);

      act(() => {
        result.current.showOnboarding();
      });

      expect(result.current.isOnboardingVisible).toBe(true);
    });

    it('should replay onboarding from settings', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue('true');

      const { result } = renderHook(() => useOnboarding());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.isOnboardingVisible).toBe(false);

      act(() => {
        result.current.replayOnboarding();
      });

      expect(result.current.isOnboardingVisible).toBe(true);
    });
  });

  describe('Reset utility', () => {
    it('should reset onboarding status', async () => {
      (AsyncStorage.removeItem as jest.Mock).mockResolvedValue(undefined);
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      await resetOnboardingStatus();

      expect(AsyncStorage.removeItem).toHaveBeenCalledWith(
        '@bmad_autopilot:has_completed_onboarding'
      );
      expect(consoleSpy).toHaveBeenCalledWith(
        'Onboarding status reset - app will show onboarding on next launch'
      );

      consoleSpy.mockRestore();
    });

    it('should throw error on reset failure', async () => {
      const error = new Error('Remove failed');
      (AsyncStorage.removeItem as jest.Mock).mockRejectedValue(error);
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      await expect(resetOnboardingStatus()).rejects.toThrow('Remove failed');
      expect(consoleSpy).toHaveBeenCalled();

      consoleSpy.mockRestore();
    });
  });
});

describe('OnboardingScreen Component', () => {
  // Component tests would go here
  // These would test:
  // - Step navigation (Next/Back buttons)
  // - Progress indicators update correctly
  // - Skip button calls onSkip
  // - "Get Started" on final step calls onComplete
  // - All 5 steps render correctly
  // - Accessibility labels present
  // - Touch targets meet 56px minimum for marine use
  
  it.todo('should render 5 onboarding steps');
  it.todo('should navigate forward through steps');
  it.todo('should navigate backward through steps');
  it.todo('should show progress (1 of 5, 2 of 5, etc.)');
  it.todo('should call onSkip when Skip button pressed');
  it.todo('should call onComplete when Get Started pressed');
  it.todo('should have accessible touch targets (>56px)');
  it.todo('should announce steps to screen readers');
});
