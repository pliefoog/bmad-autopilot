// useWidgetConfig Hook
// Custom hook for widget configuration management, layout updates, and widget lifecycle

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useWidgetStore, WidgetConfig, WidgetLayout } from '../stores/widgetStore';

export interface UseWidgetConfigOptions {
  // Widget selection
  widgetId?: string;
  widgetType?: string;
  
  // Auto-save configuration
  autoSave?: boolean;
  saveDelay?: number;
  
  // Validation
  validateConfig?: boolean;
  validateLayout?: boolean;
  
  // Callbacks
  onConfigChange?: (config: WidgetConfig) => void;
  onLayoutChange?: (layout: WidgetLayout) => void;
  onError?: (error: string) => void;
  
  // Performance
  throttleUpdates?: boolean;
  throttleDelay?: number;
}

export interface UseWidgetConfigReturn {
  // Widget data
  widget?: WidgetConfig;
  layout?: WidgetLayout;
  isVisible: boolean;
  isLocked: boolean;
  
  // Widget status
  exists: boolean;
  isValid: boolean;
  validationErrors: string[];
  hasUnsavedChanges: boolean;
  
  // Configuration management
  updateConfig: (updates: Partial<WidgetConfig>) => void;
  updateSettings: (settings: Record<string, any>) => void;
  resetConfig: () => void;
  duplicateWidget: () => string | null;
  
  // Layout management
  updateLayout: (layout: Partial<WidgetLayout>) => void;
  updatePosition: (x: number, y: number) => void;
  updateDimensions: (width: number, height: number) => void;
  moveWidget: (deltaX: number, deltaY: number) => void;
  resizeWidget: (deltaWidth: number, deltaHeight: number) => void;
  
  // Widget state management
  toggleVisibility: () => void;
  toggleLock: () => void;
  bringToFront: () => void;
  sendToBack: () => void;
  
  // Widget lifecycle
  createWidget: (type: string, position?: { x: number; y: number }) => string;
  removeWidget: () => void;
  cloneWidget: (position?: { x: number; y: number }) => string | null;
  
  // Presets and templates
  saveAsPreset: (name: string, description?: string) => void;
  loadPreset: (presetId: string) => void;
  getAvailablePresets: () => Array<{ id: string; name: string; description?: string }>;
  
  // Validation and utilities
  validateCurrentConfig: () => { valid: boolean; errors: string[] };
  getConfigSummary: () => {
    type: string;
    size: string;
    position: string;
    settings: number;
  };
  
  // Data binding
  getDataSources: () => string[];
  updateDataSource: (source: string) => void;
  
  // Save and persistence
  saveConfig: () => Promise<void>;
  revertChanges: () => void;
  hasChanges: () => boolean;
}

export function useWidgetConfig(options: UseWidgetConfigOptions = {}): UseWidgetConfigReturn {
  const {
    widgetId,
    widgetType,
    autoSave = true,
    saveDelay = 1000,
    validateConfig = true,
    validateLayout = true,
    onConfigChange,
    onLayoutChange,
    onError,
    throttleUpdates = true,
    throttleDelay = 100,
  } = options;

  // Store access
  const widgetStore = useWidgetStore();
  const {
    dashboards,
    currentDashboard,
    addWidget,
    removeWidget: storeRemoveWidget,
    updateWidget,
    updateWidgetLayout,
  } = widgetStore;

  // Current dashboard and widgets
  const currentDashboardData = useMemo(() => {
    return dashboards.find(d => d.id === currentDashboard);
  }, [dashboards, currentDashboard]);

  const widgets = useMemo(() => {
    return currentDashboardData?.widgets || [];
  }, [currentDashboardData]);

  // Local state
  const [originalConfig, setOriginalConfig] = useState<WidgetConfig | null>(null);
  const [pendingChanges, setPendingChanges] = useState<Partial<WidgetConfig>>({});
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [lastSaveTime, setLastSaveTime] = useState<number>(0);

  // Find widget
  const widget = useMemo(() => {
    if (widgetId) {
      return widgets.find((w: WidgetConfig) => w.id === widgetId);
    }
    if (widgetType) {
      return widgets.find((w: WidgetConfig) => w.type === widgetType);
    }
    return undefined;
  }, [widgets, widgetId, widgetType]);

  // Widget properties
  const layout = useMemo(() => widget?.layout, [widget]);
  const isVisible = useMemo(() => layout?.visible ?? false, [layout]);
  const isLocked = useMemo(() => layout?.locked ?? false, [layout]);
  const exists = !!widget;

  // Validation
  const validateWidgetConfig = useCallback((config: WidgetConfig): { valid: boolean; errors: string[] } => {
    const errors: string[] = [];
    
    if (!config.type) {
      errors.push('Widget type is required');
    }
    
    if (!config.title) {
      errors.push('Widget title is required');
    }
    
    if (validateLayout && config.layout) {
      const { x, y, width, height } = config.layout;
      
      if (x < 0 || y < 0) {
        errors.push('Widget position cannot be negative');
      }
      
      if (width <= 0 || height <= 0) {
        errors.push('Widget dimensions must be positive');
      }
      
      if (width > 1000 || height > 1000) {
        errors.push('Widget dimensions are too large');
      }
    }
    
    return {
      valid: errors.length === 0,
      errors,
    };
  }, [validateLayout]);

  const isValid = useMemo(() => {
    if (!widget || !validateConfig) return true;
    const mergedConfig = { ...widget, ...pendingChanges };
    return validateWidgetConfig(mergedConfig).valid;
  }, [widget, pendingChanges, validateConfig, validateWidgetConfig]);

  const hasUnsavedChanges = useMemo(() => {
    return Object.keys(pendingChanges).length > 0;
  }, [pendingChanges]);

  // Configuration management
  const updateConfig = useCallback((updates: Partial<WidgetConfig>) => {
    if (!widget) return;
    
    setPendingChanges(prev => ({ ...prev, ...updates }));
    
    if (validateConfig) {
      const mergedConfig = { ...widget, ...pendingChanges, ...updates };
      const validation = validateWidgetConfig(mergedConfig);
      setValidationErrors(validation.errors);
      
      if (!validation.valid) {
        onError?.(validation.errors.join(', '));
        return;
      }
    }
    
    onConfigChange?.({ ...widget, ...pendingChanges, ...updates } as WidgetConfig);
    
    if (autoSave) {
      setTimeout(() => saveConfig(), saveDelay);
    }
  }, [widget, pendingChanges, validateConfig, validateWidgetConfig, onConfigChange, autoSave, saveDelay, onError]);

  const updateSettings = useCallback((settings: Record<string, any>) => {
    updateConfig({ settings });
  }, [updateConfig]);

  const resetConfig = useCallback(() => {
    if (!originalConfig) return;
    
    updateWidget(originalConfig.id, originalConfig);
    setPendingChanges({});
    setValidationErrors([]);
  }, [originalConfig, updateWidget]);

  const duplicateWidget = useCallback((): string | null => {
    if (!widget) return null;
    
    const newPosition = {
      x: widget.layout.x + 20,
      y: widget.layout.y + 20,
    };
    
    addWidget(widget.type, newPosition);
    return `${widget.type}-${Date.now()}`;
  }, [widget, addWidget]);

  // Layout management
  const updateLayout = useCallback((layoutUpdates: Partial<WidgetLayout>) => {
    if (!widget) return;
    
    updateWidgetLayout(widget.id, layoutUpdates);
    onLayoutChange?.({ ...widget.layout, ...layoutUpdates } as WidgetLayout);
  }, [widget, updateWidgetLayout, onLayoutChange]);

  const updatePosition = useCallback((x: number, y: number) => {
    updateLayout({ x, y });
  }, [updateLayout]);

  const updateDimensions = useCallback((width: number, height: number) => {
    updateLayout({ width, height });
  }, [updateLayout]);

  const moveWidget = useCallback((deltaX: number, deltaY: number) => {
    if (!widget) return;
    
    const newX = Math.max(0, widget.layout.x + deltaX);
    const newY = Math.max(0, widget.layout.y + deltaY);
    
    updatePosition(newX, newY);
  }, [widget, updatePosition]);

  const resizeWidget = useCallback((deltaWidth: number, deltaHeight: number) => {
    if (!widget) return;
    
    const newWidth = Math.max(50, widget.layout.width + deltaWidth);
    const newHeight = Math.max(50, widget.layout.height + deltaHeight);
    
    updateDimensions(newWidth, newHeight);
  }, [widget, updateDimensions]);

  // Widget state management
  const toggleVisibility = useCallback(() => {
    updateLayout({ visible: !isVisible });
  }, [updateLayout, isVisible]);

  const toggleLock = useCallback(() => {
    updateLayout({ locked: !isLocked });
  }, [updateLayout, isLocked]);

  const bringToFront = useCallback(() => {
    if (!widget) return;
    
    // Simplified since zIndex not in store layout
    updateLayout({ visible: true });
  }, [widget, updateLayout]);

  const sendToBack = useCallback(() => {
    if (!widget) return;
    
    // Simplified implementation
    updateLayout({ visible: true });
  }, [widget, updateLayout]);

  // Widget lifecycle
  const createWidget = useCallback((type: string, position: { x: number; y: number } = { x: 100, y: 100 }): string => {
    addWidget(type, position);
    return `${type}-${Date.now()}`;
  }, [addWidget]);

  const removeWidget = useCallback(() => {
    if (!widget) return;
    storeRemoveWidget(widget.id);
  }, [widget, storeRemoveWidget]);

  const cloneWidget = useCallback((position?: { x: number; y: number }): string | null => {
    if (!widget) return null;
    
    const clonePosition = position || {
      x: widget.layout.x + 30,
      y: widget.layout.y + 30,
    };
    
    return createWidget(widget.type, clonePosition);
  }, [widget, createWidget]);

  // Presets and templates (simplified implementation)
  const saveAsPreset = useCallback((name: string, description?: string) => {
    if (!widget) return;
    
    // In a real implementation, this would save to a presets store
    console.log('Saving widget preset:', { name, description, widget });
  }, [widget]);

  const loadPreset = useCallback((presetId: string) => {
    // In a real implementation, this would load from a presets store
    console.log('Loading widget preset:', presetId);
  }, []);

  const getAvailablePresets = useCallback(() => {
    // In a real implementation, this would return actual presets
    return [
      { id: 'default-gps', name: 'Default GPS Widget', description: 'Standard GPS display' },
      { id: 'compact-wind', name: 'Compact Wind Widget', description: 'Small wind display' },
    ];
  }, []);

  // Validation and utilities
  const validateCurrentConfig = useCallback(() => {
    if (!widget) return { valid: false, errors: ['No widget selected'] };
    
    const mergedConfig = { ...widget, ...pendingChanges };
    return validateWidgetConfig(mergedConfig);
  }, [widget, pendingChanges, validateWidgetConfig]);

  const getConfigSummary = useCallback(() => {
    if (!widget) {
      return {
        type: 'None',
        size: '0x0',
        position: '0,0',
        settings: 0,
      };
    }
    
    const { width, height, x, y } = widget.layout;
    
    return {
      type: widget.type,
      size: `${width}x${height}`,
      position: `${x},${y}`,
      settings: Object.keys(widget.settings || {}).length,
    };
  }, [widget]);

  // Data binding
  const getDataSources = useCallback((): string[] => {
    // In a real implementation, this would return available NMEA data sources
    return ['gps', 'wind', 'depth', 'engine', 'autopilot'];
  }, []);

  const updateDataSource = useCallback((source: string) => {
    updateConfig({ settings: { ...widget?.settings, dataSource: source } });
  }, [updateConfig, widget]);

  // Save and persistence
  const saveConfig = useCallback(async (): Promise<void> => {
    if (!widget || !hasUnsavedChanges) return;
    
    try {
      const mergedConfig = { ...widget, ...pendingChanges };
      
      if (validateConfig) {
        const validation = validateWidgetConfig(mergedConfig);
        if (!validation.valid) {
          throw new Error(validation.errors.join(', '));
        }
      }
      
      updateWidget(widget.id, mergedConfig);
      setPendingChanges({});
      setLastSaveTime(Date.now());
      setValidationErrors([]);
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to save widget config';
      onError?.(errorMessage);
    }
  }, [widget, hasUnsavedChanges, pendingChanges, validateConfig, validateWidgetConfig, updateWidget, onError]);

  const revertChanges = useCallback(() => {
    setPendingChanges({});
    setValidationErrors([]);
  }, []);

  const hasChanges = useCallback(() => {
    return hasUnsavedChanges;
  }, [hasUnsavedChanges]);

  // Initialize original config
  useEffect(() => {
    if (widget && !originalConfig) {
      setOriginalConfig({ ...widget });
    }
  }, [widget, originalConfig]);

  // Auto-save effect
  useEffect(() => {
    if (autoSave && hasUnsavedChanges) {
      const timer = setTimeout(saveConfig, saveDelay);
      return () => clearTimeout(timer);
    }
  }, [autoSave, hasUnsavedChanges, saveConfig, saveDelay]);

  return {
    // Widget data
    widget,
    layout,
    isVisible,
    isLocked,
    
    // Widget status
    exists,
    isValid,
    validationErrors,
    hasUnsavedChanges,
    
    // Configuration management
    updateConfig,
    updateSettings,
    resetConfig,
    duplicateWidget,
    
    // Layout management
    updateLayout,
    updatePosition,
    updateDimensions,
    moveWidget,
    resizeWidget,
    
    // Widget state management
    toggleVisibility,
    toggleLock,
    bringToFront,
    sendToBack,
    
    // Widget lifecycle
    createWidget,
    removeWidget,
    cloneWidget,
    
    // Presets and templates
    saveAsPreset,
    loadPreset,
    getAvailablePresets,
    
    // Validation and utilities
    validateCurrentConfig,
    getConfigSummary,
    
    // Data binding
    getDataSources,
    updateDataSource,
    
    // Save and persistence
    saveConfig,
    revertChanges,
    hasChanges,
  };
}