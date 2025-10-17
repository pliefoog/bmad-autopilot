import { useState, useEffect, useCallback } from 'react';
import { LayoutService } from '../services/layoutService';

/**
 * Custom hook for managing widget expanded state with persistence
 * 
 * Usage:
 * ```tsx
 * const [expanded, toggleExpanded] = useWidgetExpanded('depth-widget');
 * ```
 */
export const useWidgetExpanded = (widgetId: string): [boolean, () => void] => {
  const [expanded, setExpanded] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Load initial expanded state from layout service
  useEffect(() => {
    const loadInitialState = async () => {
      try {
        const initialExpanded = await LayoutService.getWidgetExpanded(widgetId);
        setExpanded(initialExpanded);
      } catch (error) {
        console.error(`Failed to load expanded state for ${widgetId}:`, error);
        // Default to collapsed on error
        setExpanded(false);
      } finally {
        setIsLoading(false);
      }
    };

    loadInitialState();
  }, [widgetId]);

  // AC 3: Toggle function that persists state
  const toggleExpanded = useCallback(async () => {
    if (isLoading) return; // Prevent toggle during loading
    
    const newExpanded = !expanded;
    setExpanded(newExpanded);
    
    try {
      await LayoutService.updateWidgetExpanded(widgetId, newExpanded);
    } catch (error) {
      console.error(`Failed to persist expanded state for ${widgetId}:`, error);
      // Revert on error
      setExpanded(expanded);
    }
  }, [widgetId, expanded, isLoading]);

  return [expanded, toggleExpanded];
};