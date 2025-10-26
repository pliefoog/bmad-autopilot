import { useCallback } from 'react';
import { useToastStore, ToastOptions } from '../store/toastStore';

/**
 * Global toast management hook
 * Provides easy-to-use functions for showing different types of toasts
 */
export const useToast = () => {
  const { 
    addToast, 
    removeToast, 
    clearAllToasts, 
    clearNonPersistentToasts, 
    updateToast,
    toasts,
    hasToasts,
    hasCriticalToasts 
  } = useToastStore();

  const showSuccess = useCallback((message: string, options?: ToastOptions) => {
    return addToast({
      message,
      type: 'success',
      ...options,
      source: options?.source || 'app'
    });
  }, [addToast]);

  const showError = useCallback((message: string, options?: ToastOptions) => {
    return addToast({
      message,
      type: 'error',
      ...options,
      source: options?.source || 'app'
    });
  }, [addToast]);

  const showWarning = useCallback((message: string, options?: ToastOptions) => {
    return addToast({
      message,
      type: 'warning',
      ...options,
      source: options?.source || 'app'
    });
  }, [addToast]);

  const showInfo = useCallback((message: string, options?: ToastOptions) => {
    return addToast({
      message,
      type: 'info',
      ...options,
      source: options?.source || 'app'
    });
  }, [addToast]);

  const showAlarm = useCallback((message: string, options?: ToastOptions) => {
    return addToast({
      message,
      type: 'alarm',
      priority: 'critical',
      persistent: true,
      ...options,
      source: options?.source || 'alarm_system'
    });
  }, [addToast]);

  const dismiss = useCallback((id: string) => {
    removeToast(id);
  }, [removeToast]);

  const dismissAll = useCallback(() => {
    clearAllToasts();
  }, [clearAllToasts]);

  const dismissNonCritical = useCallback(() => {
    clearNonPersistentToasts();
  }, [clearNonPersistentToasts]);

  // Connection-specific helpers
  const showConnectionSuccess = useCallback((message: string) => {
    return showSuccess(message, { source: 'connection', duration: 3000 });
  }, [showSuccess]);

  const showConnectionError = useCallback((message: string) => {
    return showError(message, { source: 'connection', duration: 5000 });
  }, [showError]);

  // Navigation-specific helpers
  const showNavigationUpdate = useCallback((message: string) => {
    return showInfo(message, { source: 'navigation', duration: 3000 });
  }, [showInfo]);

  // System alarm helper
  const showSystemAlarm = useCallback((message: string, alarmLevel: 'warning' | 'critical' = 'warning') => {
    return addToast({
      message,
      type: 'alarm',
      priority: alarmLevel === 'critical' ? 'critical' : 'high',
      persistent: alarmLevel === 'critical',
      source: 'alarm_system',
      action: alarmLevel === 'critical' ? {
        label: 'Acknowledge',
        action: () => {
          // This will be handled by the toast component
        },
        style: 'destructive'
      } : undefined
    });
  }, [addToast]);

  return {
    // Basic toast functions
    showSuccess,
    showError,
    showWarning,
    showInfo,
    showAlarm,
    dismiss,
    dismissAll,
    dismissNonCritical,

    // Specialized helpers
    showConnectionSuccess,
    showConnectionError,
    showNavigationUpdate,
    showSystemAlarm,

    // Advanced functions
    updateToast,
    
    // State
    toasts,
    hasToasts,
    hasCriticalToasts,
  };
};