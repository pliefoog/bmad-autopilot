// Widget Types
// Centralized type definitions for widget system, layout, and configuration

import { ReactNode } from 'react';

/**
 * Core widget positioning and layout types
 */
export interface WidgetPosition {
  x: number;
  y: number;
}

export interface WidgetDimensions {
  width: number;
  height: number;
}

export interface WidgetLayout {
  id: string;
  type: string;
  position: WidgetPosition;
  dimensions: WidgetDimensions;
  zIndex?: number;
  visible: boolean;
  locked?: boolean;
  minimized?: boolean;
}

/**
 * Widget configuration and metadata
 */
export interface WidgetConfig {
  id: string;
  type: string;
  title: string;
  enabled: boolean;
  settings: Record<string, any>;
  layout: WidgetLayout;
  dataSource?: string;
  refreshRate?: number;
  alarmThresholds?: Record<string, number>;
}

/**
 * Widget component props and state
 */
export interface WidgetProps {
  id: string;
  config: WidgetConfig;
  data?: any;
  isEditing?: boolean;
  onConfigChange?: (config: Partial<WidgetConfig>) => void;
  onRemove?: () => void;
  className?: string;
  style?: Record<string, any>;
}

export interface WidgetMeta {
  type: string;
  name: string;
  description: string;
  icon: string;
  category: WidgetCategory;
  defaultSize: WidgetDimensions;
  minSize: WidgetDimensions;
  maxSize?: WidgetDimensions;
  resizable: boolean;
  configurable: boolean;
  dataRequirements: string[];
  supportedUnits?: string[];
}

/**
 * Widget categories for organization
 */
export type WidgetCategory = 
  | 'navigation' 
  | 'engine' 
  | 'environment' 
  | 'communication' 
  | 'safety' 
  | 'autopilot' 
  | 'utility';

/**
 * Widget states for visual feedback
 */
export type WidgetState = 
  | 'normal' 
  | 'alarm' 
  | 'warning'
  | 'no-data' 
  | 'highlighted' 
  | 'error'
  | 'loading';

/**
 * Widget component types
 */
export type WidgetComponent<T extends WidgetProps = WidgetProps> = React.FC<T>;

export interface BaseWidgetComponentProps extends WidgetProps {
  state: WidgetState;
  children?: ReactNode;
  onStateChange?: (state: WidgetState) => void;
}

/**
 * Widget registry and management
 */
export interface RegisteredWidget {
  meta: WidgetMeta;
  component: WidgetComponent;
  configComponent?: WidgetComponent;
  previewComponent?: WidgetComponent;
}

export interface WidgetRegistry {
  [widgetType: string]: RegisteredWidget;
}

/**
 * Dashboard layout and management
 */
export interface DashboardConfig {
  id: string;
  name: string;
  description?: string;
  widgets: WidgetConfig[];
  layout: DashboardLayoutConfig;
  theme?: string;
  createdAt: number;
  updatedAt: number;
}

export interface DashboardLayoutConfig {
  columns: number;
  rows: number;
  gridSize: number;
  margins: {
    top: number;
    right: number;
    bottom: number;
    left: number;
  };
  responsive: boolean;
  snapToGrid: boolean;
}

/**
 * Widget presets and templates
 */
export interface WidgetPreset {
  id: string;
  name: string;
  description: string;
  category: WidgetCategory;
  widgets: Omit<WidgetConfig, 'id'>[];
  thumbnail?: string;
}

export interface WidgetTemplate {
  id: string;
  name: string;
  description: string;
  widgetType: string;
  defaultConfig: Partial<WidgetConfig>;
  configSchema?: Record<string, any>;
}

/**
 * Widget data and update types
 */
export interface WidgetDataUpdate {
  widgetId: string;
  data: any;
  timestamp: number;
  source?: string;
}

export interface WidgetError {
  widgetId: string;
  error: string;
  timestamp: number;
  level: 'warning' | 'error' | 'critical';
}

/**
 * Widget interaction events
 */
export interface WidgetEvent {
  type: 'click' | 'double-click' | 'long-press' | 'drag' | 'resize';
  widgetId: string;
  data?: any;
  timestamp: number;
}

/**
 * Export utility types
 */
export type WidgetType = string;
export type WidgetId = string;
export type DashboardId = string;