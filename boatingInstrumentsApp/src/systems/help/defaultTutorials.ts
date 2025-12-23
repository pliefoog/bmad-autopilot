/**
 * Default Tutorials - Predefined tutorial content for the app
 *
 * Tutorials for:
 * - NMEA connection setup
 * - Widget configuration
 * - Autopilot control (with safety emphasis)
 * - Alarm configuration
 */

import { Tutorial } from './types';

/**
 * NMEA Connection Setup Tutorial
 */
export const nmeaConnectionTutorial: Tutorial = {
  id: 'nmea-connection-setup',
  title: 'Connect to NMEA Network',
  description: "Learn how to connect your device to a boat's NMEA network via WiFi bridge",
  category: 'onboarding',
  priority: 'required',
  estimatedMinutes: 5,
  steps: [
    {
      id: 'welcome',
      title: 'Welcome to BMad Autopilot',
      description:
        "This tutorial will guide you through connecting to your boat's NMEA network. You'll need a WiFi-enabled NMEA bridge (like ActisenseW2K or similar) already installed on your boat.",
      action: 'none',
      position: 'center',
    },
    {
      id: 'check-bridge',
      title: 'Check Your WiFi Bridge',
      description:
        'Make sure your NMEA WiFi bridge is powered on and its WiFi network is visible. Common bridge names include "NMEA2000", "ActisenseW2K", or "SeaSmart".',
      action: 'none',
      position: 'center',
    },
    {
      id: 'open-settings',
      title: 'Open Connection Settings',
      description: 'Tap the hamburger menu (☰) in the top-right corner, then select "Connection".',
      targetRef: 'hamburger-menu',
      action: 'tap',
      position: 'top',
    },
    {
      id: 'enter-ip',
      title: 'Enter Bridge IP Address',
      description:
        "Enter your WiFi bridge's IP address. Common defaults are 192.168.1.1 or 10.0.0.1. Check your bridge documentation for the correct address.",
      targetRef: 'ip-address-input',
      action: 'tap',
      position: 'bottom',
    },
    {
      id: 'enter-port',
      title: 'Enter TCP Port',
      description:
        'Enter the TCP port number (typically 10110 for NMEA 0183, or 2597 for NMEA 2000). Your bridge documentation will specify the correct port.',
      targetRef: 'port-input',
      action: 'tap',
      position: 'bottom',
    },
    {
      id: 'connect',
      title: 'Connect to Bridge',
      description:
        'Tap "Connect" to establish the connection. The status indicator will turn green when connected.',
      targetRef: 'connect-button',
      action: 'tap',
      position: 'bottom',
    },
    {
      id: 'verify-data',
      title: 'Verify Data Flow',
      description:
        'Once connected, you should see live data appearing on your dashboard widgets. If no data appears, check your connection settings and bridge configuration.',
      action: 'none',
      position: 'center',
    },
  ],
};

/**
 * Widget Configuration Tutorial
 */
export const widgetConfigTutorial: Tutorial = {
  id: 'widget-configuration',
  title: 'Configure Dashboard Widgets',
  description: 'Learn how to add, arrange, and customize widgets on your dashboard',
  category: 'feature',
  priority: 'recommended',
  estimatedMinutes: 4,
  prerequisites: ['nmea-connection-setup'],
  steps: [
    {
      id: 'dashboard-overview',
      title: 'Dashboard Overview',
      description:
        'Your dashboard displays real-time marine data through customizable widgets. Each widget shows specific NMEA data like speed, depth, heading, wind, etc.',
      action: 'none',
      position: 'center',
    },
    {
      id: 'add-widget',
      title: 'Add a New Widget',
      description: 'Tap the "+" button (Add Widget FAB) to open the widget selection menu.',
      targetRef: 'add-widget-fab',
      action: 'tap',
      position: 'top',
    },
    {
      id: 'choose-widget-type',
      title: 'Choose Widget Type',
      description:
        'Select a widget type from the list. Popular choices include Speed, Depth, Compass, and Wind. Each widget displays specific marine data.',
      targetRef: 'widget-picker',
      action: 'tap',
      position: 'bottom',
    },
    {
      id: 'position-widget',
      title: 'Position Your Widget',
      description:
        'Drag the widget to your desired position on the dashboard. Widgets can be arranged in a grid layout.',
      action: 'swipe',
      position: 'center',
    },
    {
      id: 'customize-widget',
      title: 'Customize Widget Settings',
      description:
        'Long press any widget to open its configuration menu. You can adjust display units, precision, colors, and  more.',
      action: 'longPress',
      position: 'center',
    },
    {
      id: 'save-layout',
      title: 'Save Your Layout',
      description:
        'Your widget layout is automatically saved. You can create multiple layouts and switch between them in the Layouts menu.',
      action: 'none',
      position: 'center',
    },
  ],
};

/**
 * Autopilot Control Tutorial (with safety emphasis)
 */
export const autopilotControlTutorial: Tutorial = {
  id: 'autopilot-control',
  title: 'Autopilot Control',
  description: "Learn how to safely control your boat's autopilot system",
  category: 'safety',
  priority: 'required',
  estimatedMinutes: 8,
  prerequisites: ['nmea-connection-setup'],
  safetyWarning:
    'ALWAYS maintain proper lookout and be ready to take manual control. Never rely solely on autopilot.',
  steps: [
    {
      id: 'safety-intro',
      title: '⚠️ Safety First',
      description:
        'Autopilot control is a powerful feature that requires responsible use. You must always maintain a proper lookout, monitor weather conditions, and be ready to take manual control at any time. Never use autopilot in restricted waters, heavy traffic, or poor visibility.',
      action: 'none',
      position: 'center',
    },
    {
      id: 'compatible-systems',
      title: 'Compatible Systems',
      description:
        'This app supports autopilot control for Raymarine and compatible NMEA autopilot systems. Verify your autopilot is connected to your NMEA network and communicating properly.',
      action: 'none',
      position: 'center',
    },
    {
      id: 'add-autopilot-widget',
      title: 'Add Autopilot Widget',
      description:
        'Add the Autopilot Control widget to your dashboard. This widget displays autopilot status and provides control buttons.',
      targetRef: 'add-widget-fab',
      action: 'tap',
      position: 'top',
    },
    {
      id: 'autopilot-modes',
      title: 'Autopilot Modes',
      description:
        'The autopilot can operate in several modes: STANDBY (off), AUTO (maintains heading), WIND (maintains wind angle), and TRACK (follows route). Always start in STANDBY.',
      action: 'none',
      position: 'center',
    },
    {
      id: 'engage-autopilot',
      title: 'Engaging Autopilot',
      description:
        'To engage autopilot: 1) Verify clear waters ahead, 2) Establish steady course, 3) Tap "AUTO" to engage. The autopilot will maintain your current heading.',
      targetRef: 'autopilot-auto-button',
      action: 'tap',
      position: 'bottom',
    },
    {
      id: 'course-adjustments',
      title: 'Making Course Adjustments',
      description:
        'Use +1° and +10° buttons to adjust course in small or large increments. Always verify your new course is safe before adjusting.',
      targetRef: 'autopilot-adjust-buttons',
      action: 'tap',
      position: 'bottom',
    },
    {
      id: 'disengage-autopilot',
      title: 'Disengaging Autopilot',
      description:
        'To disengage autopilot, tap "STANDBY". The autopilot will immediately release steering control. You can also disengage by turning the wheel (if configured on your autopilot).',
      targetRef: 'autopilot-standby-button',
      action: 'tap',
      position: 'bottom',
    },
    {
      id: 'emergency-procedures',
      title: 'Emergency Procedures',
      description:
        'In an emergency, immediately tap STANDBY or turn the wheel. Always have a backup plan for steering failure. Keep a manual tiller or wheel cover accessible.',
      action: 'none',
      position: 'center',
    },
  ],
};

/**
 * Alarm Configuration Tutorial
 */
export const alarmConfigTutorial: Tutorial = {
  id: 'alarm-configuration',
  title: 'Configure Safety Alarms',
  description: 'Set up alarms for depth, anchor drag, speed, and other critical conditions',
  category: 'feature',
  priority: 'recommended',
  estimatedMinutes: 5,
  prerequisites: ['nmea-connection-setup'],
  steps: [
    {
      id: 'alarm-intro',
      title: 'Safety Alarms',
      description:
        'Alarms alert you to important conditions like shallow water, anchor drag, excessive speed, or loss of GPS signal. Proper alarm configuration is essential for safe navigation.',
      action: 'none',
      position: 'center',
    },
    {
      id: 'open-alarms',
      title: 'Open Alarm Settings',
      description: 'Tap the hamburger menu (☰) and select "Alarms" to access alarm configuration.',
      targetRef: 'hamburger-menu',
      action: 'tap',
      position: 'top',
    },
    {
      id: 'depth-alarm',
      title: 'Configure Depth Alarm',
      description:
        "Set a minimum depth alarm to alert you when entering shallow water. Consider your boat's draft plus a safety margin (typically draft + 3ft or 1m).",
      targetRef: 'depth-alarm-setting',
      action: 'tap',
      position: 'bottom',
    },
    {
      id: 'anchor-alarm',
      title: 'Configure Anchor Alarm',
      description:
        'Set an anchor drag alarm radius when anchored. Typical values are 50-100 meters depending on conditions. The alarm triggers if your boat moves beyond this radius.',
      targetRef: 'anchor-alarm-setting',
      action: 'tap',
      position: 'bottom',
    },
    {
      id: 'speed-alarm',
      title: 'Configure Speed Alarms',
      description:
        'Set maximum speed alarms for safe operation in restricted areas or to monitor excessive speed. Useful for no-wake zones or fuel economy.',
      targetRef: 'speed-alarm-setting',
      action: 'tap',
      position: 'bottom',
    },
    {
      id: 'alarm-sounds',
      title: 'Test Alarm Sounds',
      description:
        'Test each alarm sound to ensure you can hear them clearly. Alarms use distinctive tones to differentiate between warning types.',
      targetRef: 'test-alarm-button',
      action: 'tap',
      position: 'bottom',
    },
    {
      id: 'alarm-summary',
      title: 'Alarm Best Practices',
      description:
        "Review and test your alarms regularly. Adjust thresholds based on local conditions. Never ignore alarms - they're designed to keep you safe.",
      action: 'none',
      position: 'center',
    },
  ],
};

/**
 * All default tutorials
 */
export const defaultTutorials: Tutorial[] = [
  nmeaConnectionTutorial,
  widgetConfigTutorial,
  autopilotControlTutorial,
  alarmConfigTutorial,
];

export default defaultTutorials;
