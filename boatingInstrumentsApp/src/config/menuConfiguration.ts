/**
 * Menu Configuration for Hamburger Menu
 * Defines all menu sections and items with environment-based visibility
 */

export interface MenuItem {
  id: string;
  label: string;
  icon: string;
  action: string; // Action identifier to be mapped to actual functions
  badge?: string; // For status indicators
  disabled?: boolean;
  testId?: string;
}

export interface MenuSectionConfig {
  id: string;
  title: string;
  icon: string;
  items: MenuItem[];
}

export interface MenuConfiguration {
  sections: MenuSectionConfig[];
  devSections?: MenuSectionConfig[];
}

// Primary navigation sections (always visible)
export const menuConfiguration: MenuConfiguration = {
  sections: [
    {
      id: 'vessel-config',
      title: 'Vessel Configuration',
      icon: '⚓',
      items: [
        {
          id: 'nmea-connection',
          label: 'NMEA Connection',
          icon: '🔌',
          action: 'openConnectionSettings',
          testId: 'menu-nmea-connection',
        },
        {
          id: 'network-setup',
          label: 'Network Setup',
          icon: '📡',
          action: 'openNetworkSetup',
          testId: 'menu-network-setup',
        },
        {
          id: 'device-config',
          label: 'Device Configuration',
          icon: '⚙️',
          action: 'openDeviceConfig',
          testId: 'menu-device-config',
        },
      ],
    },
    {
      id: 'display-settings',
      title: 'Display Settings',
      icon: '🎨',
      items: [
        {
          id: 'theme-selection',
          label: 'Theme',
          icon: '🌙',
          action: 'cycleTheme',
          testId: 'menu-theme-selection',
        },
        {
          id: 'brightness',
          label: 'Brightness',
          icon: '☀️',
          action: 'adjustBrightness',
          testId: 'menu-brightness',
        },
        {
          id: 'layout-prefs',
          label: 'Layout Preferences',
          icon: '📱',
          action: 'openLayoutPrefs',
          testId: 'menu-layout-prefs',
        },
      ],
    },
    {
      id: 'widget-management',
      title: 'Widget Management',
      icon: '📊',
      items: [
        {
          id: 'add-widgets',
          label: 'Add/Remove Widgets',
          icon: '➕',
          action: 'openWidgetSelector',
          testId: 'menu-add-widgets',
        },
        {
          id: 'widget-config',
          label: 'Widget Configuration',
          icon: '🔧',
          action: 'openWidgetConfig',
          testId: 'menu-widget-config',
        },
        {
          id: 'dashboard-layout',
          label: 'Dashboard Layout',
          icon: '📐',
          action: 'openLayoutEditor',
          testId: 'menu-dashboard-layout',
        },
      ],
    },
    {
      id: 'system-info',
      title: 'System Information',
      icon: 'ℹ️',
      items: [
        {
          id: 'app-version',
          label: 'App Version',
          icon: '📋',
          action: 'showAppVersion',
          testId: 'menu-app-version',
        },
        {
          id: 'connection-status',
          label: 'Connection Status',
          icon: '📶',
          action: 'showConnectionStatus',
          testId: 'menu-connection-status',
        },
        {
          id: 'diagnostics',
          label: 'System Diagnostics',
          icon: '🔍',
          action: 'runDiagnostics',
          testId: 'menu-diagnostics',
        },
      ],
    },
    {
      id: 'user-preferences',
      title: 'User Preferences',
      icon: '👤',
      items: [
        {
          id: 'units',
          label: 'Units (Metric/Imperial)',
          icon: '📏',
          action: 'toggleUnits',
          testId: 'menu-units',
        },
        {
          id: 'language',
          label: 'Language',
          icon: '🌐',
          action: 'selectLanguage',
          testId: 'menu-language',
        },
        {
          id: 'notifications',
          label: 'Notification Settings',
          icon: '🔔',
          action: 'openNotificationSettings',
          testId: 'menu-notifications',
        },
      ],
    },
  ],

  // Development tools (only visible in development builds)
  devSections: [
    {
      id: 'nmea-simulator',
      title: 'NMEA Simulator',
      icon: '🛠️',
      items: [
        {
          id: 'start-simulator',
          label: 'Start Simulator',
          icon: '▶️',
          action: 'startSimulator',
          testId: 'dev-start-simulator',
        },
        {
          id: 'stop-simulator',
          label: 'Stop Simulator',
          icon: '⏹️',
          action: 'stopSimulator',
          testId: 'dev-stop-simulator',
        },
        {
          id: 'load-recording',
          label: 'Load Recording',
          icon: '📁',
          action: 'loadRecording',
          testId: 'dev-load-recording',
        },
        {
          id: 'connection-test',
          label: 'Connection Test',
          icon: '🧪',
          action: 'testConnection',
          testId: 'dev-connection-test',
        },
      ],
    },
    {
      id: 'debug-tools',
      title: 'Debug Tools',
      icon: '🐛',
      items: [
        {
          id: 'nmea-viewer',
          label: 'NMEA Data Viewer',
          icon: '📄',
          action: 'openNmeaViewer',
          testId: 'dev-nmea-viewer',
        },
        {
          id: 'parsing-logs',
          label: 'Parsing Logs',
          icon: '📝',
          action: 'showParsingLogs',
          testId: 'dev-parsing-logs',
        },
        {
          id: 'connection-logs',
          label: 'Connection Diagnostics',
          icon: '🔗',
          action: 'showConnectionLogs',
          testId: 'dev-connection-logs',
        },
      ],
    },
    {
      id: 'testing-tools',
      title: 'Testing Tools',
      icon: '🧪',
      items: [
        {
          id: 'widget-test-mode',
          label: 'Widget Test Mode',
          icon: '🎯',
          action: 'enableWidgetTestMode',
          testId: 'dev-widget-test-mode',
        },
        {
          id: 'theme-preview',
          label: 'Theme Preview',
          icon: '🎨',
          action: 'openThemePreview',
          testId: 'dev-theme-preview',
        },
        {
          id: 'layout-debug',
          label: 'Layout Debugging',
          icon: '📐',
          action: 'enableLayoutDebug',
          testId: 'dev-layout-debug',
        },
      ],
    },
    {
      id: 'developer-options',
      title: 'Developer Options',
      icon: '⚡',
      items: [
        {
          id: 'performance-monitor',
          label: 'Performance Monitor',
          icon: '📈',
          action: 'openPerformanceMonitor',
          testId: 'dev-performance-monitor',
        },
        {
          id: 'error-logging',
          label: 'Error Logging',
          icon: '🚨',
          action: 'openErrorLogging',
          testId: 'dev-error-logging',
        },
        {
          id: 'feature-flags',
          label: 'Feature Flags',
          icon: '🚩',
          action: 'openFeatureFlags',
          testId: 'dev-feature-flags',
        },
      ],
    },
  ],
};