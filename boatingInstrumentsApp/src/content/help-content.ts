/**
 * Help Content
 * Story 4.4 AC12: Centralized contextual help content
 *
 * Marine-specific help content for all app features with accurate
 * terminology and accessibility-friendly descriptions.
 */

export interface HelpContent {
  title: string;
  content: string | string[];
  tips?: string[];
  relatedTopics?: string[]; // IDs of related help topics
}

/**
 * Centralized help content database
 * Add new help topics here to make them available throughout the app
 */
export const HELP_CONTENT: Record<string, HelpContent> = {
  // Connection & Setup
  'connection-setup': {
    title: 'WiFi Bridge Connection',
    content: [
      "Connect to your boat's WiFi bridge to receive real-time NMEA 0183 and NMEA 2000 data.",
      'Most marine WiFi bridges create their own wireless network. Connect your device to this network, then configure the bridge IP address and port.',
      'Common bridge IP addresses: 192.168.1.1, 192.168.4.1, or 10.0.0.1. Default port is typically 10110 for TCP or 10110 for UDP.',
    ],
    tips: [
      'Ensure WiFi is enabled on your device',
      'Check that the bridge has power',
      "Verify your boat's instruments are transmitting NMEA data",
      'Some bridges require authentication - check manufacturer documentation',
    ],
    relatedTopics: ['nmea-data', 'connection-troubleshooting'],
  },

  'nmea-data': {
    title: 'NMEA Data Types',
    content: [
      'NMEA (National Marine Electronics Association) data provides standardized marine instrument information.',
      'NMEA 0183 uses text-based sentences like $GPRMC for GPS or $SDDPT for depth. NMEA 2000 uses binary PGN (Parameter Group Number) messages.',
      'This app automatically detects and parses both formats to display your marine data.',
    ],
    tips: [
      'Most modern instruments support NMEA 2000',
      'Older instruments typically use NMEA 0183',
      'Check your instrument manuals for supported sentence types',
    ],
    relatedTopics: ['connection-setup', 'widget-data'],
  },

  'connection-troubleshooting': {
    title: 'Connection Troubleshooting',
    content: [
      "If you're having trouble connecting, try these common solutions:",
      "1. Verify your device is connected to the bridge's WiFi network (not cellular or another WiFi)",
      '2. Check the bridge IP address and port number are correct',
      '3. Ensure the bridge has power and is functioning (look for status LEDs)',
      '4. Try rebooting the WiFi bridge',
      '5. Check that your instruments are powered and transmitting data',
    ],
    tips: [
      'Use the ping test feature to verify network connectivity',
      'Check bridge manufacturer documentation for default settings',
      'Some bridges need firmware updates for compatibility',
    ],
    relatedTopics: ['connection-setup', 'nmea-data'],
  },

  // Widgets & Display
  'widget-customization': {
    title: 'Widget Customization',
    content: [
      'Widgets display real-time marine instrument data. You can customize which widgets appear and their arrangement.',
      'Tap a widget to expand it for more details. Long-press to pin a widget in expanded state.',
      'Rearrange widgets by dragging them to your preferred positions.',
    ],
    tips: [
      'Start with essential widgets: Depth, Speed, Wind, GPS',
      'Expand widgets temporarily to view trends and additional data',
      'Pin critical widgets (like Depth) for constant monitoring',
    ],
    relatedTopics: ['widget-data', 'alarm-configuration'],
  },

  'widget-data': {
    title: 'Understanding Widget Data',
    content: [
      'Each widget displays specific marine data with contextual information:',
      'DEPTH: Shows water depth with trend indicators (deepening/shoaling)',
      'SPEED: Displays speed over ground (SOG) and course over ground (COG)',
      'WIND: Shows wind speed and direction with Beaufort scale classifications',
      'GPS: Displays position coordinates and fix quality',
      'COMPASS: Shows vessel heading and rate of turn',
    ],
    tips: [
      'Tap units (m/ft/fth, kn/mph) to cycle between measurement systems',
      'Watch for trend indicators to anticipate changes',
      'No-data states indicate missing sensor information',
    ],
    relatedTopics: ['widget-customization', 'alarm-configuration'],
  },

  // Alarms & Safety
  'alarm-configuration': {
    title: 'Alarm Configuration',
    content: [
      'Set up alarms to alert you of critical conditions like shallow water, high wind, or system failures.',
      'Configure threshold values for each alarm type. Alarms trigger when values exceed (or fall below) your thresholds.',
      'Critical alarms (shallow water, autopilot failure, GPS loss) cannot be disabled for safety.',
    ],
    tips: [
      "Set shallow water alarm 2-3 meters above your vessel's draft",
      "Configure high wind alarm based on your vessel's capabilities",
      'Test alarms before relying on them at sea',
      'Keep alarm sound enabled even with haptic feedback',
    ],
    relatedTopics: ['alarm-types', 'alarm-acknowledgment'],
  },

  'alarm-types': {
    title: 'Alarm Types',
    content: [
      'The app monitors several critical marine conditions:',
      'SHALLOW WATER: Alerts when depth falls below your configured minimum',
      'ENGINE OVERHEAT: Warns of coolant temperature exceeding safe limits',
      'LOW BATTERY: Indicates voltage dropping below operational threshold',
      'AUTOPILOT FAILURE: Critical alert for autopilot system disconnection',
      'GPS SIGNAL LOSS: Warns when GPS fix is lost',
    ],
    tips: [
      'Critical alarms (shallow water, autopilot, GPS) use assertive alerts',
      'All alarms provide audio, visual, and haptic feedback',
      'Screen readers announce alarms with priority levels',
    ],
    relatedTopics: ['alarm-configuration', 'alarm-acknowledgment'],
  },

  'alarm-acknowledgment': {
    title: 'Acknowledging Alarms',
    content: [
      'When an alarm triggers, you must acknowledge it to silence the audio alert.',
      'Tap the alarm banner or use the acknowledge button. Critical alarms may require confirmation.',
      "Acknowledging an alarm doesn't clear the underlying condition - fix the problem!",
    ],
    tips: [
      "Don't ignore alarms - they indicate real safety issues",
      'After acknowledging, check the source of the alarm immediately',
      'Some critical alarms escalate if not addressed',
      'Screen reader users receive confirmation when alarms are acknowledged',
    ],
    relatedTopics: ['alarm-types', 'alarm-configuration'],
  },

  // Autopilot (if applicable)
  'autopilot-modes': {
    title: 'Autopilot Modes',
    content: [
      'The app displays and controls your Raymarine autopilot with several operating modes:',
      'STANDBY: Autopilot is off, manual steering active',
      'AUTO: Maintains heading on a specific compass course',
      'WIND: Maintains angle relative to apparent wind',
      'TRACK: Follows GPS waypoints and routes',
    ],
    tips: [
      'Always ensure clear water before engaging autopilot',
      'Monitor autopilot performance - never leave helm unattended',
      'Disengage autopilot in heavy traffic or adverse conditions',
      'Test autopilot response in safe conditions first',
    ],
    relatedTopics: ['autopilot-control', 'alarm-types'],
  },

  'autopilot-control': {
    title: 'Autopilot Control',
    content: [
      'Control your autopilot directly from the app with course adjustments and mode changes.',
      'Use +1°/-1° buttons for small course corrections, +10°/-10° for larger adjustments.',
      'The STANDBY button immediately disengages the autopilot for manual control.',
    ],
    tips: [
      'Always have line-of-sight to the helm when making changes',
      'Course changes may take several seconds to execute',
      'Keep manual override controls accessible at all times',
      'Monitor heading deviation after course changes',
    ],
    relatedTopics: ['autopilot-modes', 'alarm-types'],
  },

  // Accessibility
  'accessibility-features': {
    title: 'Accessibility Features',
    content: [
      'The app includes comprehensive accessibility support:',
      'VoiceOver/TalkBack: Screen reader compatible with marine-specific announcements',
      'High Contrast: Automatically detects and adapts to system high contrast mode',
      'Large Text: Supports system text scaling plus app-specific enlargement',
      'Motor Accessibility: All touch targets meet 44px minimum size',
      'Haptic Feedback: Tactile alerts for critical alarms and confirmations',
    ],
    tips: [
      'Enable VoiceOver (iOS) or TalkBack (Android) in system settings',
      'Critical alarms interrupt screen readers immediately',
      'Haptic patterns differentiate warning vs critical alarms',
      'All widgets provide detailed accessibility labels',
    ],
    relatedTopics: ['alarm-types', 'widget-data'],
  },

  // Settings & Preferences
  'theme-settings': {
    title: 'Theme & Display',
    content: [
      'Choose between Day, Night, and Red Night themes for optimal visibility.',
      'Day theme: High contrast for bright sunlight conditions',
      'Night theme: Reduced brightness to preserve night vision',
      'Red Night theme: Red-only colors preserve night-adapted vision',
    ],
    tips: [
      'Switch to Red Night theme before sunset for offshore passages',
      'Day theme works best in direct sunlight',
      'Theme changes apply immediately across all screens',
      'Large text and high contrast modes work with all themes',
    ],
    relatedTopics: ['accessibility-features', 'marine-optimization'],
  },

  'marine-optimization': {
    title: 'Marine Environment Use',
    content: [
      'This app is optimized for challenging marine conditions:',
      'Touch targets are enlarged for use with wet hands or gloves',
      'High contrast ratios ensure visibility in direct sunlight',
      'Critical information uses redundant indicators (color + icon + text)',
      "Haptic feedback confirms actions even when screen isn't visible",
    ],
    tips: [
      'Keep screen brightness at maximum in sunlight',
      'Use landscape orientation for maximum visibility',
      'Enable haptic feedback for tactile confirmation',
      'Test all features in calm conditions before relying on them at sea',
    ],
    relatedTopics: ['theme-settings', 'accessibility-features'],
  },
};

/**
 * Get help content by ID
 */
export function getHelpContent(helpId: string): HelpContent | undefined {
  return HELP_CONTENT[helpId];
}

/**
 * Get related help topics for a given help ID
 */
export function getRelatedTopics(helpId: string): { id: string; title: string }[] {
  const content = HELP_CONTENT[helpId];
  if (!content || !content.relatedTopics) {
    return [];
  }

  return content.relatedTopics
    .map((id) => {
      const related = HELP_CONTENT[id];
      return related ? { id, title: related.title } : null;
    })
    .filter((item): item is { id: string; title: string } => item !== null);
}
