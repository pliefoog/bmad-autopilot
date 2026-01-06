import { useEffect, useRef } from 'react';
import { Dimensions } from 'react-native';
import { useUIStore } from '../store/uiStore';
import { useNmeaStore } from '../store/nmeaStore';

/**
 * useAutoHideHeader Hook
 * 
 * Manages automatic header hiding behavior with smart timing.
 * Only hides header when appropriate (data flowing, no dialogs, user idle).
 * 
 * Trigger Conditions:
 * - Auto-hide enabled in settings
 * - NMEA connection established with data flowing
 * - 5 seconds of no header interaction
 * - No dialogs currently open
 * - Screen height < 1000px (small/medium screens only)
 * 
 * @param isAnyDialogOpen - Whether any modal dialog is currently visible
 */
export const useAutoHideHeader = (isAnyDialogOpen: boolean = false) => {
  const { 
    hideHeader, 
    isHeaderVisible, 
    autoHideEnabled, 
    lastHeaderInteraction 
  } = useUIStore();
  
  const connectionStatus = useNmeaStore((state) => state.connectionStatus);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  
  // Get screen dimensions to determine if auto-hide should be active
  // Enable on laptops/tablets (< 1800px), disable on large desktop monitors
  const screenHeight = Dimensions.get('window').height;
  const shouldAutoHide = autoHideEnabled && screenHeight < 1800;
  
  useEffect(() => {
    // Clear any existing timer
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    
    // Debug logging
    console.log('[AUTO-HIDE] Conditions check:', {
      shouldAutoHide,
      autoHideEnabled,
      screenHeight,
      connectionStatus,
      isAnyDialogOpen,
      isHeaderVisible,
    });
    
    // Don't auto-hide if:
    // - Feature disabled by user
    // - Screen is large (>= 1000px height)
    // - Not connected with active data
    // - Any dialog is open
    // - Header already hidden
    if (!shouldAutoHide || 
        connectionStatus !== 'connected' || 
        isAnyDialogOpen || 
        !isHeaderVisible) {
      console.log('[AUTO-HIDE] Not hiding - conditions not met');
      return;
    }
    
    // Calculate time since last interaction
    const timeSinceInteraction = Date.now() - lastHeaderInteraction;
    const remainingTime = Math.max(0, 5000 - timeSinceInteraction);
    
    console.log('[AUTO-HIDE] Setting timer:', { timeSinceInteraction, remainingTime });
    
    // Set timer to hide header after remaining time
    timerRef.current = setTimeout(() => {
      console.log('[AUTO-HIDE] Hiding header now');
      hideHeader();
      timerRef.current = null;
    }, remainingTime);
    
    // Cleanup on unmount or dependency change
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [
    shouldAutoHide,
    connectionStatus,
    isAnyDialogOpen,
    isHeaderVisible,
    lastHeaderInteraction,
    hideHeader,
  ]);
  
  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, []);
};
