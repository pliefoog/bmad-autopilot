import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * UI State Store
 * 
 * Manages UI visibility states and user preferences for chrome elements.
 * Persists settings across app sessions.
 * 
 * Features:
 * - Auto-hide header for immersive instrument view
 * - Configurable timeout for auto-hide behavior
 * - User preference persistence
 * - Activity tracking for smart re-hide timing
 */

interface UIState {
  // Header visibility
  isHeaderVisible: boolean;
  lastHeaderInteraction: number;
  
  // User preferences
  autoHideEnabled: boolean;
  autoHideTimeoutMs: number; // Configurable timeout in milliseconds
  hasSeenHint: boolean;
  
  // Actions
  showHeader: () => void;
  hideHeader: () => void;
  toggleHeader: () => void;
  setAutoHideEnabled: (enabled: boolean) => void;
  setAutoHideTimeout: (timeoutMs: number) => void;
  markHintSeen: () => void;
}

export const useUIStore = create<UIState>()(
  persist(
    (set) => ({
      // Initial state
      isHeaderVisible: true,
      lastHeaderInteraction: Date.now(),
      autoHideEnabled: true,
      autoHideTimeoutMs: 5000, // Default 5 seconds
      hasSeenHint: false,
      
      // Show header and mark interaction time
      showHeader: () => set({ 
        isHeaderVisible: true, 
        lastHeaderInteraction: Date.now() 
      }),
      
      // Hide header
      hideHeader: () => set({ isHeaderVisible: false }),
      
      // Toggle header visibility
      toggleHeader: () => set((state) => ({ 
        isHeaderVisible: !state.isHeaderVisible,
        lastHeaderInteraction: Date.now()
      })),
      
      // Update auto-hide preference
      setAutoHideEnabled: (enabled: boolean) => set({ autoHideEnabled: enabled }),
      
      // Update auto-hide timeout
      setAutoHideTimeout: (timeoutMs: number) => set({ autoHideTimeoutMs: timeoutMs }),
      
      // Mark that user has seen the hint animation
      markHintSeen: () => set({ hasSeenHint: true }),
    }),
    {
      name: 'ui-state',
      storage: createJSONStorage(() => AsyncStorage),
      // Only persist user preferences, not runtime state
      partialize: (state) => ({
        autoHideEnabled: state.autoHideEnabled,
        autoHideTimeoutMs: state.autoHideTimeoutMs,
        hasSeenHint: state.hasSeenHint,
      }),
    }
  )
);
