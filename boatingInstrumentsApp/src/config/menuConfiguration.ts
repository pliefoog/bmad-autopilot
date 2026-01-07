/**
 * Menu Configuration for Hamburger Menu
 * Flat list of menu items with Ionicons (outline style)
 * Follows Apple HIG for menu lists (20px icons, flat structure)
 */

export interface MenuItem {
  id: string;
  label: string;
  icon: string; // Ionicon name (e.g., 'wifi-outline')
  action: string; // Action identifier to be mapped to actual functions
  badge?: string; // For status indicators
  disabled?: boolean;
  testId?: string;
  isDividerBefore?: boolean; // Show divider above this item
  devOnly?: boolean; // Only visible in development builds
}

// Flat menu items (no sections - per Apple HIG simplicity)
export const menuItems: MenuItem[] = [
  {
    id: 'nmea-connection',
    label: 'Connection',
    icon: 'wifi-outline',
    action: 'openConnectionSettings',
    testId: 'menu-nmea-connection',
  },
  {
    id: 'display-settings',
    label: 'Display',
    icon: 'settings-outline',
    action: 'openDisplayThemeSettings',
    testId: 'menu-display-settings',
  },
  {
    id: 'units',
    label: 'Units',
    icon: 'options-outline',
    action: 'openUnitsConfig',
    testId: 'menu-units',
  },
  {
    id: 'layout-settings',
    label: 'Layout',
    icon: 'grid-outline',
    action: 'openLayoutSettings',
    testId: 'menu-layout-settings',
  },
  {
    id: 'alarm-configuration',
    label: 'Alarms',
    icon: 'notifications-outline',
    action: 'openAlarmConfiguration',
    testId: 'menu-alarms',
  },
  {
    id: 'alarm-history',
    label: 'History',
    icon: 'time-outline',
    action: 'openAlarmHistory',
    testId: 'menu-alarm-history',
  },
  {
    id: 'help-faq',
    label: 'Help',
    icon: 'help-circle-outline',
    action: 'openHelp',
    testId: 'menu-help',
  },
  {
    id: 'about',
    label: 'About',
    icon: 'information-circle-outline',
    action: 'showAbout',
    testId: 'menu-about',
  },
  {
    id: 'terms-conditions',
    label: 'Terms',
    icon: 'document-text-outline',
    action: 'openTermsConditions',
    testId: 'menu-terms',
  },
  {
    id: 'factory-reset',
    label: 'Factory Reset',
    icon: 'refresh-outline',
    action: 'performFactoryReset',
    testId: 'menu-factory-reset',
  },
];

// Legacy export for backwards compatibility
export const menuConfiguration = {
  sections: [],
  devSections: [],
};
