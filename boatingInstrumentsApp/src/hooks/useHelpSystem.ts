/**
 * useHelpSystem - React Hook for help system integration
 * 
 * Provides easy access to tutorials, help content, and contextual help
 * throughout the application.
 */

import { useState, useEffect, useCallback } from 'react';
import TutorialManager from '../systems/help/TutorialManager';
import HelpContentProvider from '../systems/help/HelpContentProvider';
import {
  Tutorial,
  TutorialProgress,
  HelpContent,
  HelpSearchResult,
} from '../systems/help/types';

export interface UseHelpSystemReturn {
  // Tutorial functions
  startTutorial: (tutorialId: string) => Promise<boolean>;
  completeTutorial: (tutorialId: string) => Promise<boolean>;
  skipTutorial: (tutorialId: string) => Promise<void>;
  getTutorial: (tutorialId: string) => Tutorial | undefined;
  getTutorialProgress: (tutorialId: string) => TutorialProgress | undefined;
  isTutorialCompleted: (tutorialId: string) => boolean;
  getRecommendedTutorial: () => Tutorial | null;
  
  // Help content functions
  getHelpContent: (contentId: string, language?: string) => Promise<HelpContent | null>;
  searchHelpContent: (query: string, limit?: number) => Promise<HelpSearchResult[]>;
  updateHelpContent: () => Promise<boolean>;
  
  // State
  isInitialized: boolean;
  currentTutorial: string | null;
  completionStats: {
    total: number;
    completed: number;
    skipped: number;
    inProgress: number;
    completionRate: number;
  };
}

/**
 * Hook to access help system throughout the app
 */
export function useHelpSystem(): UseHelpSystemReturn {
  const [isInitialized, setIsInitialized] = useState(false);
  const [currentTutorial, setCurrentTutorial] = useState<string | null>(null);
  const [completionStats, setCompletionStats] = useState({
    total: 0,
    completed: 0,
    skipped: 0,
    inProgress: 0,
    completionRate: 0,
  });

  // Initialize on mount
  useEffect(() => {
    const initialized = TutorialManager.getTutorials().length > 0 && HelpContentProvider.isReady();
    setIsInitialized(initialized);

    if (initialized) {
      setCurrentTutorial(TutorialManager.getCurrentTutorial());
      setCompletionStats(TutorialManager.getCompletionStats());
    }
  }, []);

  // Subscribe to tutorial updates
  useEffect(() => {
    const unsubscribe = TutorialManager.subscribe((tutorialId, progress) => {
      setCurrentTutorial(TutorialManager.getCurrentTutorial());
      setCompletionStats(TutorialManager.getCompletionStats());
    });

    return unsubscribe;
  }, []);

  // Tutorial functions
  const startTutorial = useCallback(async (tutorialId: string): Promise<boolean> => {
    const success = await TutorialManager.startTutorial(tutorialId);
    if (success) {
      setCurrentTutorial(tutorialId);
      setCompletionStats(TutorialManager.getCompletionStats());
    }
    return success;
  }, []);

  const completeTutorial = useCallback(async (tutorialId: string): Promise<boolean> => {
    const success = await TutorialManager.completeTutorial(tutorialId);
    if (success) {
      setCurrentTutorial(null);
      setCompletionStats(TutorialManager.getCompletionStats());
    }
    return success;
  }, []);

  const skipTutorial = useCallback(async (tutorialId: string): Promise<void> => {
    await TutorialManager.skipTutorial(tutorialId);
    setCurrentTutorial(null);
    setCompletionStats(TutorialManager.getCompletionStats());
  }, []);

  const getTutorial = useCallback((tutorialId: string): Tutorial | undefined => {
    return TutorialManager.getTutorial(tutorialId);
  }, []);

  const getTutorialProgress = useCallback((tutorialId: string): TutorialProgress | undefined => {
    return TutorialManager.getTutorialProgress(tutorialId);
  }, []);

  const isTutorialCompleted = useCallback((tutorialId: string): boolean => {
    return TutorialManager.isTutorialCompleted(tutorialId);
  }, []);

  const getRecommendedTutorial = useCallback((): Tutorial | null => {
    return TutorialManager.getRecommendedTutorial();
  }, []);

  // Help content functions
  const getHelpContent = useCallback(
    async (contentId: string, language?: string): Promise<HelpContent | null> => {
      return await HelpContentProvider.getHelpContent(contentId, language);
    },
    []
  );

  const searchHelpContent = useCallback(
    async (query: string, limit?: number): Promise<HelpSearchResult[]> => {
      return await HelpContentProvider.searchHelpContent(query, limit);
    },
    []
  );

  const updateHelpContent = useCallback(async (): Promise<boolean> => {
    return await HelpContentProvider.updateHelpContent();
  }, []);

  return {
    // Tutorial functions
    startTutorial,
    completeTutorial,
    skipTutorial,
    getTutorial,
    getTutorialProgress,
    isTutorialCompleted,
    getRecommendedTutorial,
    
    // Help content functions
    getHelpContent,
    searchHelpContent,
    updateHelpContent,
    
    // State
    isInitialized,
    currentTutorial,
    completionStats,
  };
}

export default useHelpSystem;
