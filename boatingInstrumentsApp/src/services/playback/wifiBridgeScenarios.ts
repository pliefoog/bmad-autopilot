/**
 * WiFi Bridge Simulator Test Scenarios
 * For Story 7.1: VIP Platform Refactor - Glove Mode Testing
 *
 * These scenarios provide predefined NMEA data streams to test:
 * - Navigation session auto-start/stop
 * - Glove mode activation/deactivation
 * - UI density switching (44pt ↔ 64pt)
 * - Alarm handling in glove mode
 */

export interface ScenarioNMEAData {
  // Speed & Position
  sog?: number;          // Speed Over Ground (knots)
  stw?: number;          // Speed Through Water (knots)
  cog?: number;          // Course Over Ground (degrees)
  heading?: number;      // Magnetic heading (degrees)
  latitude?: number;
  longitude?: number;

  // Depth
  depth?: number;        // Depth below transducer (feet or meters based on settings)

  // Wind
  wind_speed?: number;   // Apparent wind speed (knots)
  wind_angle?: number;   // Apparent wind angle (degrees)

  // Engine
  engine_rpm?: number;   // Engine RPM
  engine_temp?: number;  // Engine temperature (°C or °F)
  engine_oil_pressure?: number;  // PSI

  // Autopilot
  autopilot_engaged?: boolean;
  autopilot_heading?: number;  // Target heading (degrees)

  // Battery & Electrical
  battery_voltage?: number;  // Volts
  battery_current?: number;  // Amps

  // Alarms
  alarm_active?: boolean;
  alarm_type?: 'shallow_water' | 'deep_water' | 'wind_speed' | 'battery_low' | null;
}

export interface ScenarioExpectedUI {
  navigationSessionActive: boolean;
  gloveModeActive: boolean;
  touchTargetSize: 44 | 64;
  gridSpacing: 8 | 16;
  fontSize: {
    body: 16 | 18;
    heading: 20 | 24;
    value: 36 | 48;
  };
  gloveIndicatorVisible: boolean;
  alarmBannerVisible?: boolean;
}

export interface WiFiBridgeScenario {
  id: string;
  name: string;
  description: string;
  duration: number;  // milliseconds
  nmeaData: ScenarioNMEAData;
  expectedUI: ScenarioExpectedUI;
  testInstructions?: string;
}

/**
 * Scenario 1: Idle at Marina
 * Purpose: Test native density mode (no navigation session)
 *
 * Expected Behavior:
 * - Navigation session should NOT auto-start (SOG = 0)
 * - Glove mode should be OFF
 * - Touch targets should be 44pt (standard)
 * - Grid spacing should be 8pt (compact)
 */
export const SCENARIO_IDLE_AT_MARINA: WiFiBridgeScenario = {
  id: 'idle-at-marina',
  name: 'Idle at Marina',
  description: 'Boat stationary, engine off, no navigation session. Tests native UI density.',
  duration: 60000, // 1 minute

  nmeaData: {
    sog: 0.0,
    stw: 0.0,
    cog: 0,
    heading: 280,
    latitude: 41.4,
    longitude: -70.2,
    depth: 8.5,
    wind_speed: 5.0,
    wind_angle: 45,
    engine_rpm: 0,
    engine_temp: 20, // Ambient temperature
    autopilot_engaged: false,
    battery_voltage: 12.6,
    battery_current: -0.5, // Small discharge
    alarm_active: false,
  },

  expectedUI: {
    navigationSessionActive: false,
    gloveModeActive: false,
    touchTargetSize: 44,
    gridSpacing: 8,
    fontSize: {
      body: 16,
      heading: 20,
      value: 36,
    },
    gloveIndicatorVisible: false,
    alarmBannerVisible: false,
  },

  testInstructions: `
    1. Load this scenario from Settings → Developer Tools → Load Scenario
    2. Verify: Navigation session indicator shows "Inactive" or "Idle"
    3. Verify: No glove icon (🧤) in header
    4. Verify: Autopilot footer buttons are normal size (~44pt)
    5. Verify: Dashboard grid has tight spacing (8pt gaps)
    6. Measure: Tap a widget - touch target should be ~44×44pt
  `,
};

/**
 * Scenario 2: Underway - Manual Steering
 * Purpose: Test glove mode auto-activation via SOG threshold
 *
 * Expected Behavior:
 * - Navigation session should AUTO-START (SOG = 6.5 > 2.0)
 * - Glove mode should activate within 5 seconds
 * - Touch targets should grow to 64pt
 * - Grid spacing should increase to 16pt
 * - Glove icon (🧤) should appear in header
 */
export const SCENARIO_UNDERWAY_MANUAL: WiFiBridgeScenario = {
  id: 'underway-manual',
  name: 'Underway - Manual Steering',
  description: 'Boat moving under manual steering. Tests navigation session auto-start and glove mode activation.',
  duration: 300000, // 5 minutes

  nmeaData: {
    sog: 6.5,  // Above 2.0 threshold → should trigger navigation session
    stw: 6.3,
    cog: 280,
    heading: 282,
    latitude: 41.45,
    longitude: -70.18,
    depth: 42.5,
    wind_speed: 15.0,
    wind_angle: 45,
    engine_rpm: 2400,
    engine_temp: 85,
    autopilot_engaged: false,  // Manual steering
    battery_voltage: 13.2,
    battery_current: 15.0,
    alarm_active: false,
  },

  expectedUI: {
    navigationSessionActive: true,  // AUTO-STARTED
    gloveModeActive: true,          // AUTO-ACTIVATED
    touchTargetSize: 64,
    gridSpacing: 16,
    fontSize: {
      body: 18,
      heading: 24,
      value: 48,
    },
    gloveIndicatorVisible: true,
    alarmBannerVisible: false,
  },

  testInstructions: `
    1. Load this scenario
    2. Wait 5 seconds for navigation session to auto-start
    3. Verify: Navigation session indicator shows "Active" or "Underway"
    4. Verify: Glove icon (🧤) appears in header
    5. Verify: Autopilot footer buttons are large (~64pt)
    6. Verify: Dashboard grid has wide spacing (16pt gaps)
    7. Verify: Widget values are large font (48pt)
    8. Measure: Tap a widget - touch target should be ~64×64pt
  `,
};

/**
 * Scenario 3: Underway - Autopilot Engaged
 * Purpose: Test autopilot control in glove mode
 *
 * Expected Behavior:
 * - Navigation session active (autopilot engagement triggers it)
 * - Glove mode active
 * - Autopilot +/-10° buttons should be large (64pt)
 * - Heading adjustments should work reliably
 */
export const SCENARIO_UNDERWAY_AUTOPILOT: WiFiBridgeScenario = {
  id: 'underway-autopilot',
  name: 'Underway - Autopilot Engaged',
  description: 'Boat moving with autopilot engaged. Tests autopilot controls in glove mode.',
  duration: 300000, // 5 minutes

  nmeaData: {
    sog: 6.2,
    stw: 6.0,
    cog: 280,
    heading: 280,  // Autopilot maintaining heading
    latitude: 41.50,
    longitude: -70.15,
    depth: 38.0,
    wind_speed: 12.0,
    wind_angle: 35,
    engine_rpm: 2200,
    engine_temp: 82,
    autopilot_engaged: true,  // AUTOPILOT ON
    autopilot_heading: 280,
    battery_voltage: 13.0,
    battery_current: 12.0,
    alarm_active: false,
  },

  expectedUI: {
    navigationSessionActive: true,
    gloveModeActive: true,
    touchTargetSize: 64,
    gridSpacing: 16,
    fontSize: {
      body: 18,
      heading: 24,
      value: 48,
    },
    gloveIndicatorVisible: true,
    alarmBannerVisible: false,
  },

  testInstructions: `
    1. Load this scenario
    2. Verify: Autopilot footer shows "280°" and "AUTOPILOT ENGAGED"
    3. Verify: +10° and -10° buttons are large (64pt)
    4. Test: Tap +10° button → Heading should adjust to 290°
    5. Test: Tap -10° button → Heading should adjust to 270°
    6. Verify: All buttons work with gloves (64pt touch targets)
    7. Verify: Haptic feedback on button press (if enabled)
  `,
};

/**
 * Scenario 4: Shallow Water Alarm
 * Purpose: Test alarm handling in glove mode
 *
 * Expected Behavior:
 * - Navigation session active (underway)
 * - Glove mode active
 * - Alarm banner should be visible
 * - Dismiss button should be large (64pt) and glove-friendly
 * - Visual flashing indicator
 * - Audio alert (if enabled)
 */
export const SCENARIO_SHALLOW_WATER_ALARM: WiFiBridgeScenario = {
  id: 'shallow-water-alarm',
  name: 'Shallow Water Alarm',
  description: 'Boat in shallow water with active alarm. Tests alarm dismissal in glove mode.',
  duration: 120000, // 2 minutes (until alarm dismissed)

  nmeaData: {
    sog: 5.0,
    stw: 4.8,
    cog: 285,
    heading: 285,
    latitude: 41.42,
    longitude: -70.20,
    depth: 4.5,  // BELOW 10ft threshold → ALARM!
    wind_speed: 10.0,
    wind_angle: 30,
    engine_rpm: 1800,
    engine_temp: 80,
    autopilot_engaged: false,
    battery_voltage: 12.8,
    battery_current: 10.0,
    alarm_active: true,  // ALARM ACTIVE
    alarm_type: 'shallow_water',
  },

  expectedUI: {
    navigationSessionActive: true,
    gloveModeActive: true,
    touchTargetSize: 64,
    gridSpacing: 16,
    fontSize: {
      body: 18,
      heading: 24,
      value: 48,
    },
    gloveIndicatorVisible: true,
    alarmBannerVisible: true,  // ALARM VISIBLE
  },

  testInstructions: `
    1. Load this scenario
    2. Verify: Alarm banner appears at top with "⚠️ SHALLOW WATER - 4.5 ft"
    3. Verify: Alarm banner has red background and flashing animation
    4. Verify: "Dismiss" button is large (64pt) and easy to tap with gloves
    5. Test: Tap "Dismiss" button → Alarm should clear
    6. Verify: Depth widget shows red/warning state
    7. Verify: Audio alert plays (if enabled in settings)
  `,
};

/**
 * Scenario 5: End Navigation Session (Return to Marina)
 * Purpose: Test glove mode deactivation and UI density return
 *
 * Expected Behavior:
 * - After 10 minutes of SOG < 0.5, navigation session should auto-end
 * - Glove mode should deactivate
 * - Touch targets should shrink back to 44pt
 * - Grid spacing should return to 8pt
 * - Glove icon should disappear
 */
export const SCENARIO_END_NAVIGATION: WiFiBridgeScenario = {
  id: 'end-navigation',
  name: 'End Navigation - Return to Marina',
  description: 'Boat returned to marina, stopped. Tests navigation session auto-end and glove mode deactivation.',
  duration: 600000, // 10 minutes (for auto-end trigger)

  nmeaData: {
    sog: 0.5,  // Below 0.5 for 10 min → should trigger auto-end
    stw: 0.3,
    cog: 0,
    heading: 320,
    latitude: 41.4,
    longitude: -70.2,
    depth: 9.0,
    wind_speed: 3.0,
    wind_angle: 90,
    engine_rpm: 0,  // Engine off
    engine_temp: 40, // Cooling down
    autopilot_engaged: false,
    battery_voltage: 12.5,
    battery_current: -1.0,
    alarm_active: false,
  },

  expectedUI: {
    navigationSessionActive: false,  // AUTO-ENDED after 10 min
    gloveModeActive: false,          // AUTO-DEACTIVATED
    touchTargetSize: 44,
    gridSpacing: 8,
    fontSize: {
      body: 16,
      heading: 20,
      value: 36,
    },
    gloveIndicatorVisible: false,
    alarmBannerVisible: false,
  },

  testInstructions: `
    1. Load this scenario
    2. Wait 10 minutes (or use time acceleration if available)
    3. Verify: Navigation session indicator shows "Ended" or "Idle"
    4. Verify: Glove icon (🧤) disappears from header
    5. Verify: Autopilot footer buttons return to normal size (~44pt)
    6. Verify: Dashboard grid spacing tightens (8pt gaps)
    7. Verify: Widget values return to standard font (36pt)
    8. Measure: Tap a widget - touch target should be ~44×44pt
    9. Verify: Transition is smooth (not jarring)
  `,
};

/**
 * All scenarios for easy iteration
 */
export const ALL_SCENARIOS: Record<string, WiFiBridgeScenario> = {
  'idle-at-marina': SCENARIO_IDLE_AT_MARINA,
  'underway-manual': SCENARIO_UNDERWAY_MANUAL,
  'underway-autopilot': SCENARIO_UNDERWAY_AUTOPILOT,
  'shallow-water-alarm': SCENARIO_SHALLOW_WATER_ALARM,
  'end-navigation': SCENARIO_END_NAVIGATION,
};

/**
 * Get scenario by ID
 */
export const getScenario = (scenarioId: string): WiFiBridgeScenario | null => {
  return ALL_SCENARIOS[scenarioId] || null;
};

/**
 * Get all scenario IDs for UI picker
 */
export const getScenarioIds = (): string[] => {
  return Object.keys(ALL_SCENARIOS);
};

/**
 * Get scenario names for UI picker
 */
export const getScenarioNames = (): { id: string; name: string; description: string }[] => {
  return Object.entries(ALL_SCENARIOS).map(([id, scenario]) => ({
    id,
    name: scenario.name,
    description: scenario.description,
  }));
};

/**
 * Load scenario into WiFi Bridge playback service
 *
 * Usage:
 *   import { loadScenario } from './wifiBridgeScenarios';
 *   loadScenario('underway-manual');
 */
export const loadScenario = (scenarioId: string): boolean => {
  const scenario = getScenario(scenarioId);
  if (!scenario) {
    console.error(`[WiFiBridge] Scenario not found: ${scenarioId}`);
    return false;
  }

  console.log(`[WiFiBridge] Loading scenario: ${scenario.name}`);
  console.log(`[WiFiBridge] Duration: ${scenario.duration / 1000}s`);
  console.log(`[WiFiBridge] NMEA Data:`, scenario.nmeaData);
  console.log(`[WiFiBridge] Expected UI:`, scenario.expectedUI);

  // TODO: Integrate with playbackService
  // playbackService.loadScenario(scenario);

  return true;
};

/**
 * Validate current UI state matches expected state for scenario
 *
 * Usage in tests:
 *   const isValid = validateUIState('underway-manual', currentUIState);
 */
export const validateUIState = (
  scenarioId: string,
  currentUIState: Partial<ScenarioExpectedUI>
): { valid: boolean; errors: string[] } => {
  const scenario = getScenario(scenarioId);
  if (!scenario) {
    return { valid: false, errors: ['Scenario not found'] };
  }

  const errors: string[] = [];
  const expected = scenario.expectedUI;

  // Check each field
  if (currentUIState.navigationSessionActive !== expected.navigationSessionActive) {
    errors.push(
      `Navigation session: expected ${expected.navigationSessionActive}, got ${currentUIState.navigationSessionActive}`
    );
  }

  if (currentUIState.gloveModeActive !== expected.gloveModeActive) {
    errors.push(
      `Glove mode: expected ${expected.gloveModeActive}, got ${currentUIState.gloveModeActive}`
    );
  }

  if (currentUIState.touchTargetSize !== expected.touchTargetSize) {
    errors.push(
      `Touch target size: expected ${expected.touchTargetSize}pt, got ${currentUIState.touchTargetSize}pt`
    );
  }

  if (currentUIState.gridSpacing !== expected.gridSpacing) {
    errors.push(
      `Grid spacing: expected ${expected.gridSpacing}pt, got ${currentUIState.gridSpacing}pt`
    );
  }

  if (currentUIState.gloveIndicatorVisible !== expected.gloveIndicatorVisible) {
    errors.push(
      `Glove indicator: expected ${expected.gloveIndicatorVisible ? 'visible' : 'hidden'}, got ${
        currentUIState.gloveIndicatorVisible ? 'visible' : 'hidden'
      }`
    );
  }

  return {
    valid: errors.length === 0,
    errors,
  };
};
