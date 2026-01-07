import { useEffect, useRef } from 'react';
import { Dimensions } from 'react-native';
import { useUIStore } from '../store/uiStore';
import { useNmeaStore } from '../store/nmeaStore';

/**
 * useAutoHideHeader Hook - REFACTORED to prevent infinite loops
 * 
 * Manages automatic header hiding with a single-fire timer approach.
 * Timer starts when header becomes visible and all conditions are met.
 * 
 * Trigger Conditions:
 * - Auto-hide enabled in settings
 * - NMEA connection established
 * - Configurable idle timeout (default 5 seconds)
 * - No dialogs open
 * - Screen height < 1800px (laptops/tablets)
 * 
 * @param isAnyDialogOpen - Whether any modal dialog is currently visible
 */
export const useAutoHideHeader = (isAnyDialogOpen: boolean = false) => {
  const isHeaderVisible = useUIStore((state) => state.isHeaderVisible);
  const autoHideEnabled = useUIStore((state) => state.autoHideEnabled);
  const autoHideTimeoutMs = useUIStore((state) => state.autoHideTimeoutMs);
  
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  
  // Get screen dimensions - only check once
  const screenHeight = Dimensions.get('window').height;
  const shouldEnableAutoHide = autoHideEnabled && screenHeight < 1800;
  
  // Single effect that runs only when header visibility changes or dialogs open/close
  useEffect(() => {
    // Clear any existing timer
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    
    // Don't set timer if:
    // - Feature disabled or screen too large
    // - Any dialog is open
    // - Header already hidden
    if (!shouldEnableAutoHide || isAnyDialogOpen || !isHeaderVisible) {
      return;
    }
    
    // Set timer to hide header after configured timeout
    // Get fresh values from store when timer fires (not from closure)
    timerRef.current = setTimeout(() => {
      const { hideHeader } = useUIStore.getState();
      const { connectionStatus } = useNmeaStore.getState();
      
      // Double-check conditions at execution time
      if (connectionStatus === 'connected') {
        hideHeader();
      }
      
      timerRef.current = null;
    }, autoHideTimeoutMs);
    
    // Cleanup
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
    // CRITICAL: Minimal deps - only UI state that should trigger timer reset
    // autoHideTimeoutMs changes trigger new timer with updated duration
  }, [shouldEnableAutoHide, isAnyDialogOpen, isHeaderVisible, autoHideTimeoutMs]);
};
