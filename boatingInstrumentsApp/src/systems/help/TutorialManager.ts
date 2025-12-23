/**
 * TutorialManager - Manages interactive tutorials and user progress
 *
 * Features:
 * - Tutorial lifecycle management (start, pause, complete, skip)
 * - Progress tracking with persistence
 * - Tutorial prerequisites and dependencies
 * - Completion statistics and analytics
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { Tutorial, TutorialProgress, TutorialStep } from './types';

const STORAGE_KEY = '@bmad:tutorial_progress';
const TUTORIALS_KEY = '@bmad:tutorials';

export class TutorialManager {
  private static instance: TutorialManager;
  private tutorials: Map<string, Tutorial> = new Map();
  private progress: Map<string, TutorialProgress> = new Map();
  private currentTutorial: string | null = null;
  private listeners: Set<(tutorialId: string, progress: TutorialProgress) => void> = new Set();

  private constructor() {}

  /**
   * Get singleton instance
   */
  public static getInstance(): TutorialManager {
    if (!TutorialManager.instance) {
      TutorialManager.instance = new TutorialManager();
    }
    return TutorialManager.instance;
  }

  /**
   * Initialize tutorial manager with available tutorials
   */
  public async initialize(tutorials: Tutorial[]): Promise<void> {
    // Register tutorials
    tutorials.forEach((tutorial) => {
      this.tutorials.set(tutorial.id, tutorial);
    });

    // Load saved progress
    await this.loadProgress();
  }

  /**
   * Register a single tutorial
   */
  public registerTutorial(tutorial: Tutorial): void {
    this.tutorials.set(tutorial.id, tutorial);
  }

  /**
   * Get all available tutorials
   */
  public getTutorials(): Tutorial[] {
    return Array.from(this.tutorials.values());
  }

  /**
   * Get tutorials by category
   */
  public getTutorialsByCategory(category: Tutorial['category']): Tutorial[] {
    return Array.from(this.tutorials.values()).filter((t) => t.category === category);
  }

  /**
   * Get tutorial by ID
   */
  public getTutorial(tutorialId: string): Tutorial | undefined {
    return this.tutorials.get(tutorialId);
  }

  /**
   * Start a tutorial
   */
  public async startTutorial(tutorialId: string): Promise<boolean> {
    const tutorial = this.tutorials.get(tutorialId);
    if (!tutorial) {
      console.error(`[TutorialManager] Tutorial not found: ${tutorialId}`);
      return false;
    }

    // Check prerequisites
    if (tutorial.prerequisites && tutorial.prerequisites.length > 0) {
      const unmetPrereqs = tutorial.prerequisites.filter(
        (prereqId) => !this.isTutorialCompleted(prereqId),
      );
      if (unmetPrereqs.length > 0) {
        console.warn(`[TutorialManager] Prerequisites not met for ${tutorialId}:`, unmetPrereqs);
        return false;
      }
    }

    // Initialize or reset progress
    const existingProgress = this.progress.get(tutorialId);
    const progress: TutorialProgress = {
      tutorialId,
      currentStep: 0,
      totalSteps: tutorial.steps.length,
      completed: false,
      startedAt: existingProgress?.startedAt || new Date(),
      skipped: false,
    };

    this.progress.set(tutorialId, progress);
    this.currentTutorial = tutorialId;
    await this.saveProgress();

    this.notifyListeners(tutorialId, progress);

    return true;
  }

  /**
   * Advance to next step in current tutorial
   */
  public async nextStep(tutorialId: string): Promise<boolean> {
    const progress = this.progress.get(tutorialId);
    if (!progress) {
      console.error(`[TutorialManager] No progress found for: ${tutorialId}`);
      return false;
    }

    const tutorial = this.tutorials.get(tutorialId);
    if (!tutorial) {
      console.error(`[TutorialManager] Tutorial not found: ${tutorialId}`);
      return false;
    }

    // Check if we can advance
    if (progress.currentStep >= tutorial.steps.length - 1) {
      // Tutorial complete
      return this.completeTutorial(tutorialId);
    }

    // Validate current step if validation exists
    const currentStep = tutorial.steps[progress.currentStep];
    if (currentStep.validation && !currentStep.validation()) {
      console.warn(`[TutorialManager] Step validation failed: ${currentStep.id}`);
      return false;
    }

    // Advance to next step
    progress.currentStep++;
    this.progress.set(tutorialId, progress);
    await this.saveProgress();

    this.notifyListeners(tutorialId, progress);

    return true;
  }

  /**
   * Go back to previous step
   */
  public async previousStep(tutorialId: string): Promise<boolean> {
    const progress = this.progress.get(tutorialId);
    if (!progress || progress.currentStep === 0) {
      return false;
    }

    progress.currentStep--;
    this.progress.set(tutorialId, progress);
    await this.saveProgress();

    this.notifyListeners(tutorialId, progress);

    return true;
  }

  /**
   * Complete a tutorial
   */
  public async completeTutorial(tutorialId: string): Promise<boolean> {
    const progress = this.progress.get(tutorialId);
    if (!progress) {
      console.error(`[TutorialManager] No progress found for: ${tutorialId}`);
      return false;
    }

    progress.completed = true;
    progress.completedAt = new Date();
    progress.currentStep = progress.totalSteps - 1;
    this.progress.set(tutorialId, progress);

    if (this.currentTutorial === tutorialId) {
      this.currentTutorial = null;
    }

    await this.saveProgress();
    this.notifyListeners(tutorialId, progress);

    return true;
  }

  /**
   * Skip a tutorial
   */
  public async skipTutorial(tutorialId: string): Promise<void> {
    const progress = this.progress.get(tutorialId) || {
      tutorialId,
      currentStep: 0,
      totalSteps: this.tutorials.get(tutorialId)?.steps.length || 0,
      completed: false,
      startedAt: new Date(),
      skipped: true,
    };

    progress.skipped = true;
    this.progress.set(tutorialId, progress);

    if (this.currentTutorial === tutorialId) {
      this.currentTutorial = null;
    }

    await this.saveProgress();
    this.notifyListeners(tutorialId, progress);
  }

  /**
   * Reset tutorial progress
   */
  public async resetTutorial(tutorialId: string): Promise<void> {
    this.progress.delete(tutorialId);

    if (this.currentTutorial === tutorialId) {
      this.currentTutorial = null;
    }

    await this.saveProgress();
  }

  /**
   * Get tutorial progress
   */
  public getTutorialProgress(tutorialId: string): TutorialProgress | undefined {
    return this.progress.get(tutorialId);
  }

  /**
   * Check if tutorial is completed
   */
  public isTutorialCompleted(tutorialId: string): boolean {
    const progress = this.progress.get(tutorialId);
    return progress?.completed || false;
  }

  /**
   * Get current active tutorial
   */
  public getCurrentTutorial(): string | null {
    return this.currentTutorial;
  }

  /**
   * Get completion statistics
   */
  public getCompletionStats(): {
    total: number;
    completed: number;
    skipped: number;
    inProgress: number;
    completionRate: number;
  } {
    const total = this.tutorials.size;
    const completed = Array.from(this.progress.values()).filter((p) => p.completed).length;
    const skipped = Array.from(this.progress.values()).filter((p) => p.skipped).length;
    const inProgress = Array.from(this.progress.values()).filter(
      (p) => !p.completed && !p.skipped,
    ).length;

    return {
      total,
      completed,
      skipped,
      inProgress,
      completionRate: total > 0 ? (completed / total) * 100 : 0,
    };
  }

  /**
   * Get recommended next tutorial
   */
  public getRecommendedTutorial(): Tutorial | null {
    // Find highest priority uncompleted tutorial with met prerequisites
    const incomplete = Array.from(this.tutorials.values()).filter(
      (t) => !this.isTutorialCompleted(t.id),
    );

    const eligible = incomplete.filter((t) => {
      if (!t.prerequisites || t.prerequisites.length === 0) {
        return true;
      }
      return t.prerequisites.every((prereqId) => this.isTutorialCompleted(prereqId));
    });

    // Sort by priority: required > recommended > optional
    const priorityOrder = { required: 0, recommended: 1, optional: 2 };
    eligible.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);

    return eligible[0] || null;
  }

  /**
   * Subscribe to tutorial progress updates
   */
  public subscribe(callback: (tutorialId: string, progress: TutorialProgress) => void): () => void {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  /**
   * Notify all listeners of progress update
   */
  private notifyListeners(tutorialId: string, progress: TutorialProgress): void {
    this.listeners.forEach((callback) => callback(tutorialId, progress));
  }

  /**
   * Load progress from storage
   */
  private async loadProgress(): Promise<void> {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      if (stored) {
        const data = JSON.parse(stored) as Record<string, TutorialProgress>;
        Object.entries(data).forEach(([id, progress]) => {
          // Convert date strings back to Date objects
          progress.startedAt = new Date(progress.startedAt);
          if (progress.completedAt) {
            progress.completedAt = new Date(progress.completedAt);
          }
          this.progress.set(id, progress);
        });
      }
    } catch (error) {
      console.error('[TutorialManager] Failed to load progress:', error);
    }
  }

  /**
   * Save progress to storage
   */
  private async saveProgress(): Promise<void> {
    try {
      const data: Record<string, TutorialProgress> = {};
      this.progress.forEach((progress, id) => {
        data[id] = progress;
      });
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (error) {
      console.error('[TutorialManager] Failed to save progress:', error);
    }
  }

  /**
   * Clear all tutorial data (for testing/reset)
   */
  public async clearAllData(): Promise<void> {
    this.progress.clear();
    this.currentTutorial = null;
    await AsyncStorage.removeItem(STORAGE_KEY);
  }
}

// Export singleton instance
export default TutorialManager.getInstance();
