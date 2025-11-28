import React from 'react';

export interface WidgetProps {
  id: string;
  title: string;
  position?: { x: number; y: number };
  size?: { width: number; height: number };
  dataSource?: string[];
  refreshRate?: number;
}

// Widget lifecycle categories
export enum WidgetCategory {
  SYSTEM = 'system',        // Always present (ThemeSwitcher, Settings)
  NAVIGATION = 'navigation', // Data-driven (GPS, Speed, Compass, Depth)
  ENVIRONMENT = 'environment', // Data-driven (Wind, Temperature)
  ENGINE = 'engine',        // Multi-instance (Engine widgets)
  ELECTRICAL = 'electrical', // Multi-instance (Battery, Tank)
  AUTOPILOT = 'autopilot'   // Data-driven (Autopilot, Rudder)
}

export interface WidgetMeta {
  id: string;
  title: string;
  icon: string;
  description: string;
  category: 'navigation' | 'engine' | 'electrical' | 'environment' | 'autopilot' | 'system';
  defaultSize: { width: number; height: number };
  configurable: boolean;
  // Widget lifecycle metadata
  isPermanent?: boolean;     // Always present regardless of data
  requiresNmeaData?: boolean; // Created only when NMEA data available
  isMultiInstance?: boolean;  // Supports multiple instances
  canBeRemoved?: boolean;     // User can manually remove (default true)
}

export abstract class BaseWidget<T extends WidgetProps = WidgetProps> {
  abstract meta: WidgetMeta;
  abstract render(props: T): React.ReactElement;
  
  // Common lifecycle methods
  onMount?(): void;
  onUnmount?(): void;
  onDataUpdate?(data: any): void;
  
  // Default configuration
  getDefaultProps(): Partial<T> {
    return {
      size: this.meta.defaultSize,
      refreshRate: 1000, // 1 second default
    } as Partial<T>;
  }
  
  // Validation
  validateProps(props: T): boolean {
    return !!(props.id && props.title);
  }
}

// Utility type for widget components
export type WidgetComponent<T extends WidgetProps = WidgetProps> = React.FC<T>;

// Common widget states
export type WidgetState = 'normal' | 'alarm' | 'no-data' | 'highlighted' | 'error';

// Base props for all widget implementations
export interface BaseWidgetComponentProps {
  state?: WidgetState;
  onError?: (error: Error) => void;
}