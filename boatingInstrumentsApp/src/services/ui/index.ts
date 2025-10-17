// UI Domain Services  
// Services responsible for layout management, widget positioning, and user interface state

// Core UI services
export { layoutService } from './layoutService';

// UI utilities
export * from './widgetManager';
export * from './themeManager';
export * from './navigationHelper';

// Domain types
export type {
  LayoutConfig,
  WidgetPosition,
  ThemeState,
  NavigationState,
} from './types';