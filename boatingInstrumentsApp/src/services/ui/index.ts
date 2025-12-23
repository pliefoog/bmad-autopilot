// UI Domain Services
// Services responsible for layout management, widget positioning, and user interface state

// REMOVED: layoutService - deleted during architectural cleanup
// Layout now handled by ResponsiveDashboard + useResponsiveGrid

// UI utilities
export * from './widgetManager';
export * from './themeManager';
export * from './navigationHelper';

// Domain types
export type { LayoutConfig, WidgetPosition, ThemeState, NavigationState } from './types';
