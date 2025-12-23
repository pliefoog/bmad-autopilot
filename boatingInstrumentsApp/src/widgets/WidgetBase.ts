import React from 'react';

export interface WidgetProps {
  id: string;
  title: string;
  position?: { x: number; y: number };
  size?: { width: number; height: number };
  dataSource?: string[];
  refreshRate?: number;
}

export interface WidgetMeta {
  id: string;
  title: string;
  icon: string;
  description: string;
  category: 'navigation' | 'engine' | 'electrical' | 'environment' | 'autopilot';
  defaultSize: { width: number; height: number };
  configurable: boolean;
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
