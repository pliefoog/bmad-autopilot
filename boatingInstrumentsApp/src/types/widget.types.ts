// Widget Types
// Centralized type definitions for widget system, layout, and configuration

import { ReactNode } from 'react';

/**
 * Widget configuration - matches widgetStore.ts
 * Array index = position (no layout metadata)
 */
export interface WidgetConfig {
  id: string;
  type: string;
  title: string;
  settings: Record<string, any>;
  isSystemWidget?: boolean;
  createdAt?: number;
  lastDataUpdate?: number;
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
 * Dashboard configuration - matches widgetStore.ts
 */
export interface DashboardConfig {
  widgets: WidgetConfig[];
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
 * Specific widget types supported by the marine instrument system
 */
export type WidgetType =
  | 'depth' | 'speed' | 'wind' | 'compass' | 'autopilot'
  | 'gps' | 'temperature' | 'voltage' | 'engine' | 'alarm'
  | 'battery' | 'tanks' | 'rudder';

/**
 * Base props for widget components as specified in Story 6.6
 */
export interface BaseWidgetProps {
  widgetId: string;
  expanded?: boolean;
  onToggleExpanded?: () => void;
  onLongPress?: () => void;
}

/**
 * Widget card props for consistent card interface
 */
export interface WidgetCardProps {
  title: string;
  icon?: string;
  state?: 'normal' | 'warning' | 'critical';
  children: React.ReactNode;
}

/**
 * Export utility types
 */
export type WidgetId = string;
export type DashboardId = string;