/**
 * VIP Platform Feature Flags
 *
 * Progressive rollout system for Epic 13 VIP Platform features.
 * All flags default to false (disabled) for safe production deployment.
 *
 * Epic 13 Phase Structure:
 * - Phase 0: Critical fixes & infrastructure (13.1.x)
 * - Phase 1: Unified Settings System (13.2.x)
 * - Phase 2: Navigation Session & Glove Mode (13.3.x)
 * - Phase 3: Platform-Native Navigation (13.4.x)
 * - Phase 4: Multi-Device Coordination (13.5.x)
 * - Phase 5: TV Platform Support (13.6.x)
 */

export interface FeatureFlags {
  // Phase 0: Infrastructure (always enabled after implementation)
  USE_FEATURE_FLAG_SYSTEM: boolean;

  // Phase 1: Unified Settings System (Epic 13.2)
  USE_UNIFIED_SETTINGS_MODALS: boolean;
  USE_PLATFORM_INPUT_COMPONENTS: boolean;
  USE_UNIFIED_CONNECTION_SETTINGS: boolean;
  USE_UNIFIED_UNITS_ALARMS_SETTINGS: boolean;

  // Phase 2: Navigation Session & Glove Mode (Epic 13.3)
  USE_NAVIGATION_SESSION_STORE: boolean;
  USE_CONSOLIDATED_STORE_ARCHITECTURE: boolean;
  USE_UI_DENSITY_SYSTEM: boolean;
  USE_DASHBOARD_DENSITY_INTEGRATION: boolean;

  // Phase 3: Platform-Native Navigation (Epic 13.4)
  USE_PLATFORM_NAVIGATION: boolean;
  USE_IOS_TAB_BAR_NAVIGATION: boolean;
  USE_ANDROID_DRAWER_NAVIGATION: boolean;
  USE_WEB_SIDEBAR_NAVIGATION: boolean;

  // Phase 4: Multi-Device Coordination (Epic 13.5)
  USE_BLE_PROXIMITY_DETECTION: boolean;
  USE_MULTI_DEVICE_STATE_SYNC: boolean;
  USE_PROXIMITY_DASHBOARD_SWITCHING: boolean;

  // Phase 5: TV Platform Support (Epic 13.6)
  USE_TV_PLATFORM_SUPPORT: boolean;
  USE_TV_DPAD_NAVIGATION: boolean;
  USE_TV_10_FOOT_UI: boolean;
  USE_TV_AMBIENT_DISPLAY: boolean;
}

/**
 * Default feature flag configuration
 * All VIP Platform features disabled by default for safe rollout
 */
export const DEFAULT_FEATURE_FLAGS: FeatureFlags = {
  // Phase 0
  USE_FEATURE_FLAG_SYSTEM: true, // Self-referential flag for system validation

  // Phase 1
  USE_UNIFIED_SETTINGS_MODALS: false,
  USE_PLATFORM_INPUT_COMPONENTS: false,
  USE_UNIFIED_CONNECTION_SETTINGS: false,
  USE_UNIFIED_UNITS_ALARMS_SETTINGS: false,

  // Phase 2
  USE_NAVIGATION_SESSION_STORE: false,
  USE_CONSOLIDATED_STORE_ARCHITECTURE: false,
  USE_UI_DENSITY_SYSTEM: false,
  USE_DASHBOARD_DENSITY_INTEGRATION: false,

  // Phase 3
  USE_PLATFORM_NAVIGATION: false,
  USE_IOS_TAB_BAR_NAVIGATION: false,
  USE_ANDROID_DRAWER_NAVIGATION: false,
  USE_WEB_SIDEBAR_NAVIGATION: false,

  // Phase 4
  USE_BLE_PROXIMITY_DETECTION: false,
  USE_MULTI_DEVICE_STATE_SYNC: false,
  USE_PROXIMITY_DASHBOARD_SWITCHING: false,

  // Phase 5
  USE_TV_PLATFORM_SUPPORT: false,
  USE_TV_DPAD_NAVIGATION: false,
  USE_TV_10_FOOT_UI: false,
  USE_TV_AMBIENT_DISPLAY: false,
};

/**
 * Feature flag descriptions for developer menu
 */
export const FEATURE_FLAG_DESCRIPTIONS: Record<keyof FeatureFlags, string> = {
  USE_FEATURE_FLAG_SYSTEM: 'Feature flag infrastructure (always enabled)',

  USE_UNIFIED_SETTINGS_MODALS: 'Phase 1: Base settings modal foundation',
  USE_PLATFORM_INPUT_COMPONENTS: 'Phase 1: Platform-specific input components',
  USE_UNIFIED_CONNECTION_SETTINGS: 'Phase 1: Unified connection settings pattern',
  USE_UNIFIED_UNITS_ALARMS_SETTINGS: 'Phase 1: Refactored units/alarms settings',

  USE_NAVIGATION_SESSION_STORE: 'Phase 2: Navigation session state management',
  USE_CONSOLIDATED_STORE_ARCHITECTURE: 'Phase 2: Consolidated store architecture',
  USE_UI_DENSITY_SYSTEM: 'Phase 2: UI density system (glove mode)',
  USE_DASHBOARD_DENSITY_INTEGRATION: 'Phase 2: Dashboard density integration',

  USE_PLATFORM_NAVIGATION: 'Phase 3: Platform-native navigation (master toggle)',
  USE_IOS_TAB_BAR_NAVIGATION: 'Phase 3: iOS tab bar navigation',
  USE_ANDROID_DRAWER_NAVIGATION: 'Phase 3: Android drawer navigation',
  USE_WEB_SIDEBAR_NAVIGATION: 'Phase 3: Web sidebar navigation',

  USE_BLE_PROXIMITY_DETECTION: 'Phase 4: BLE proximity detection',
  USE_MULTI_DEVICE_STATE_SYNC: 'Phase 4: Multi-device state synchronization',
  USE_PROXIMITY_DASHBOARD_SWITCHING: 'Phase 4: Proximity-based dashboard switching',

  USE_TV_PLATFORM_SUPPORT: 'Phase 5: TV platform support (master toggle)',
  USE_TV_DPAD_NAVIGATION: 'Phase 5: D-pad navigation system',
  USE_TV_10_FOOT_UI: 'Phase 5: 10-foot UI dashboard',
  USE_TV_AMBIENT_DISPLAY: 'Phase 5: Ambient display mode',
};

/**
 * Feature flag phase grouping for organized display
 */
export const FEATURE_FLAG_PHASES = [
  {
    phase: 'Phase 0: Infrastructure',
    flags: ['USE_FEATURE_FLAG_SYSTEM'] as const,
  },
  {
    phase: 'Phase 1: Unified Settings',
    flags: [
      'USE_UNIFIED_SETTINGS_MODALS',
      'USE_PLATFORM_INPUT_COMPONENTS',
      'USE_UNIFIED_CONNECTION_SETTINGS',
      'USE_UNIFIED_UNITS_ALARMS_SETTINGS',
    ] as const,
  },
  {
    phase: 'Phase 2: Navigation Session & Glove Mode',
    flags: [
      'USE_NAVIGATION_SESSION_STORE',
      'USE_CONSOLIDATED_STORE_ARCHITECTURE',
      'USE_UI_DENSITY_SYSTEM',
      'USE_DASHBOARD_DENSITY_INTEGRATION',
    ] as const,
  },
  {
    phase: 'Phase 3: Platform Navigation',
    flags: [
      'USE_PLATFORM_NAVIGATION',
      'USE_IOS_TAB_BAR_NAVIGATION',
      'USE_ANDROID_DRAWER_NAVIGATION',
      'USE_WEB_SIDEBAR_NAVIGATION',
    ] as const,
  },
  {
    phase: 'Phase 4: Multi-Device Coordination',
    flags: [
      'USE_BLE_PROXIMITY_DETECTION',
      'USE_MULTI_DEVICE_STATE_SYNC',
      'USE_PROXIMITY_DASHBOARD_SWITCHING',
    ] as const,
  },
  {
    phase: 'Phase 5: TV Platform',
    flags: [
      'USE_TV_PLATFORM_SUPPORT',
      'USE_TV_DPAD_NAVIGATION',
      'USE_TV_10_FOOT_UI',
      'USE_TV_AMBIENT_DISPLAY',
    ] as const,
  },
];
