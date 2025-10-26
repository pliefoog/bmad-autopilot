import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';

export interface ToastAction {
  label: string;
  action: () => void;
  style?: 'default' | 'destructive' | 'primary';
}

export interface ToastData {
  id: string;
  message: string;
  type: 'error' | 'warning' | 'success' | 'info' | 'alarm';
  duration?: number;
  timestamp: number;
  priority?: 'low' | 'normal' | 'high' | 'critical';
  persistent?: boolean; // For critical alarms that require acknowledgment
  action?: ToastAction;
  source?: string; // For tracking where toast originated
}

export interface ToastOptions {
  duration?: number;
  priority?: 'low' | 'normal' | 'high' | 'critical';
  persistent?: boolean;
  action?: ToastAction;
  source?: string;
}

interface ToastStore {
  toasts: ToastData[];
  
  // Actions
  addToast: (toast: Omit<ToastData, 'id' | 'timestamp'>) => string;
  removeToast: (id: string) => void;
  clearAllToasts: () => void;
  clearNonPersistentToasts: () => void;
  updateToast: (id: string, updates: Partial<ToastData>) => void;
  
  // Getters
  getToastById: (id: string) => ToastData | undefined;
  getToastsByType: (type: ToastData['type']) => ToastData[];
  getToastsByPriority: (priority: ToastData['priority']) => ToastData[];
  hasToasts: () => boolean;
  hasCriticalToasts: () => boolean;
}

// Default durations by type
const getDefaultDuration = (type: ToastData['type'], priority?: ToastData['priority']): number => {
  if (priority === 'critical') return 0; // Never auto-dismiss critical
  
  switch (type) {
    case 'success':
      return 3000;
    case 'info':
      return 4000;
    case 'warning':
      return 5000;
    case 'error':
      return 5000;
    case 'alarm':
      return 0; // Alarms should be acknowledged manually
    default:
      return 4000;
  }
};

// Generate unique ID
const generateId = (): string => {
  return `toast_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

export const useToastStore = create<ToastStore>()(
  subscribeWithSelector((set, get) => ({
    toasts: [],

    addToast: (toastData) => {
      // Circuit breaker: prevent too many toasts in short time
      const currentState = get();
      const now = Date.now();
      const RATE_LIMIT_WINDOW = 1000; // 1 second
      const MAX_TOASTS_PER_WINDOW = 3;
      
      const recentToasts = currentState.toasts.filter(
        toast => (now - toast.timestamp) < RATE_LIMIT_WINDOW
      );
      
      if (recentToasts.length >= MAX_TOASTS_PER_WINDOW) {
        console.warn('[ToastStore] Rate limit exceeded, blocking toast:', toastData.message);
        return 'rate_limited'; // Return dummy ID
      }
      const id = generateId();
      const timestamp = Date.now();
      
      const toast: ToastData = {
        ...toastData,
        id,
        timestamp,
        duration: toastData.duration ?? getDefaultDuration(toastData.type, toastData.priority),
        priority: toastData.priority ?? 'normal',
      };

      // Check for duplicates before adding
      const stateForDuplicateCheck = get();
      const DUPLICATE_WINDOW = 1000;
      const recentDuplicate = stateForDuplicateCheck.toasts.find(existing => 
        existing.message === toast.message && 
        existing.type === toast.type &&
        (timestamp - existing.timestamp) < DUPLICATE_WINDOW
      );
      
      if (recentDuplicate) {
        console.log('[ToastStore] Blocked duplicate toast:', toast.message);
        return recentDuplicate.id; // Return existing ID instead of creating new toast
      }

      set((state) => {
        const newToasts = [...state.toasts, toast];
        
        // Limit maximum toasts to prevent UI overload (keep most recent)
        const MAX_TOASTS = 5;
        const limitedToasts = newToasts.length > MAX_TOASTS 
          ? newToasts.slice(-MAX_TOASTS) 
          : newToasts;
          
        return { toasts: limitedToasts };
      });

      // Auto-remove non-persistent toasts (only for newly created toasts)
      if (toast.duration && toast.duration > 0 && !toast.persistent) {
        setTimeout(() => {
          const currentToasts = get().toasts;
          const toastStillExists = currentToasts.some(t => t.id === id);
          if (toastStillExists) {
            get().removeToast(id);
          }
        }, toast.duration);
      }

      console.log('[ToastStore] Added toast:', { id, type: toast.type, message: toast.message });
      return id;
    },

    removeToast: (id) => {
      set((state) => ({
        toasts: state.toasts.filter(toast => toast.id !== id)
      }));
      console.log('[ToastStore] Removed toast:', id);
    },

    clearAllToasts: () => {
      set({ toasts: [] });
      console.log('[ToastStore] Cleared all toasts');
    },

    clearNonPersistentToasts: () => {
      set((state) => ({
        toasts: state.toasts.filter(toast => toast.persistent)
      }));
      console.log('[ToastStore] Cleared non-persistent toasts');
    },

    updateToast: (id, updates) => {
      set((state) => ({
        toasts: state.toasts.map(toast => 
          toast.id === id ? { ...toast, ...updates } : toast
        )
      }));
      console.log('[ToastStore] Updated toast:', id, updates);
    },

    // Getters
    getToastById: (id) => {
      return get().toasts.find(toast => toast.id === id);
    },

    getToastsByType: (type) => {
      return get().toasts.filter(toast => toast.type === type);
    },

    getToastsByPriority: (priority) => {
      return get().toasts.filter(toast => toast.priority === priority);
    },

    hasToasts: () => {
      return get().toasts.length > 0;
    },

    hasCriticalToasts: () => {
      return get().toasts.some(toast => toast.priority === 'critical');
    },
  }))
);