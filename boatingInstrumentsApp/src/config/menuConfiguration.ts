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
      id: 'connection',
      title: 'Connection',
      icon: '📡',
      items: [
        {
          id: 'nmea-connection',
          label: 'NMEA Connection Settings',
          icon: '🔌',
          action: 'openConnectionSettings',
          testId: 'menu-nmea-connection',
        },
      ],
    },
    {
      id: 'display-theme',
      title: 'Display & Theme',
      icon: '🎨',
      items: [
        {
          id: 'display-settings',
          label: 'Display & Accessibility',
          icon: '👁️',
          action: 'openDisplayThemeSettings',
          testId: 'menu-display-settings',
        },
      ],
    },
    {
      id: 'units-formats',
      title: 'Units & Formats',
      icon: '📏',
      items: [
        {
          id: 'units',
          label: 'Unit Preferences',
          icon: '📐',
          action: 'openUnitsConfig',
          testId: 'menu-units',
        },
      ],
    },
    {
      id: 'widgets-layout',
      title: 'Widgets & Layout',
      icon: '📊',
      items: [
        {
          id: 'layout-settings',
          label: 'Layout Settings',
          icon: '📱',
          action: 'openLayoutSettings',
          testId: 'menu-layout-settings',
        },
      ],
    },
    {
      id: 'alarms',
      title: 'Alarms',
      icon: '🚨',
      items: [
        {
          id: 'alarm-configuration',
          label: 'Sensor Configuration',
          icon: '⚙️',
          action: 'openAlarmConfiguration',
          testId: 'menu-alarms',
        },
        {
          id: 'alarm-history',
          label: 'Alarm History & Clear',
          icon: '📋',
          action: 'openAlarmHistory',
          testId: 'menu-alarm-history',
        },
      ],
    },
    {
      id: 'about-system',
      title: 'About & System',
      icon: 'ℹ️',
      items: [
        {
          id: 'about',
          label: 'About BMad Autopilot',
          icon: '📱',
          action: 'showAbout',
          testId: 'menu-about',
        },
        {
          id: 'help-faq',
          label: 'Help & FAQ',
          icon: '❓',
          action: 'openHelp',
          testId: 'menu-help',
        },
        {
          id: 'terms-conditions',
          label: 'Terms & Conditions',
          icon: '📄',
          action: 'openTermsConditions',
          testId: 'menu-terms',
        },
        {
          id: 'factory-reset',
          label: 'Factory Reset',
          icon: '🔄',
          action: 'performFactoryReset',
          testId: 'menu-factory-reset',
        },
      ],
    },
  ],

  // Development tools (only visible in development builds)
  devSections: [
    {
      id: 'developer-options',
      title: 'Developer Options',
      icon: '⚡',
      items: [
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
