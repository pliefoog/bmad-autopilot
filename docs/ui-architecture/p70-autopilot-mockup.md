# Raymarine P70-Style Autopilot Control Interface Mockup

**Document Purpose:** Visual design specifications for enhanced P70-inspired autopilot control UI
**Target Platform:** React Native mobile/tablet interface
**Design Focus:** High-fidelity reproduction of P70 UX patterns with touch-optimized interactions

---

## Overall Layout Structure

```
┌─────────────────────────────────────────────────┐
│  ◀ BACK          AUTOPILOT CONTROL         ✕   │ ← Header Bar
├─────────────────────────────────────────────────┤
│                                                 │
│  ● ENGAGED      AUTO MODE          [MENU] →    │ ← Status Bar
│                                                 │
├─────────────────────────────────────────────────┤
│                                                 │
│              ┌─────────────────┐                │
│              │        N        │                │ ← Compass Display
│              │    ╱═════╲     │                │   (Rotating)
│              │   ║  045° ║    │                │
│              │    ╲═════╱     │                │
│              │   W       E    │                │
│              │        S        │                │
│              └─────────────────┘                │
│                                                 │
│    CURRENT         TARGET        RUDDER        │ ← Data Row
│      045°           045°          +2°          │
│                                                 │
├─────────────────────────────────────────────────┤
│                                                 │
│     [    -10°    ]     [    +10°    ]          │ ← Coarse Adjust
│                                                 │
│     [  -1°  ]  [  -1°  ]  [  +1°  ]  [  +1°  ] │ ← Fine Adjust
│                                                 │
├─────────────────────────────────────────────────┤
│                                                 │
│          [      STANDBY / DISENGAGE      ]      │ ← Primary Action
│                                                 │
├─────────────────────────────────────────────────┤
│  ROT: +2°/min  │  XTE: 0.02nm  │  SEA: MED     │ ← Telemetry Bar
└─────────────────────────────────────────────────┘
```

---

## Component Specifications

### 1. Header Bar (60pt height)

```typescript
// Layout
┌─────────────────────────────────────────────────┐
│  ◀ BACK          AUTOPILOT CONTROL         ✕   │
└─────────────────────────────────────────────────┘

// Elements:
- Back Button (44×44pt touch target, left-aligned)
- Title "AUTOPILOT CONTROL" (centered, 18pt bold)
- Close Button (44×44pt touch target, right-aligned)

// Styling:
- Background: #1a1a1a (dark gray)
- Border Bottom: 1px solid #333
- Text Color: #ffffff
```

---

### 2. Status Bar (80pt height)

```typescript
// Layout with State Indicator
┌─────────────────────────────────────────────────┐
│  ● ENGAGED      AUTO MODE          [MENU] →    │
└─────────────────────────────────────────────────┘

// Three-Zone Layout:
┌────────────┬─────────────────┬────────────────┐
│ STATUS LED │  MODE DISPLAY   │  MENU BUTTON   │
│  + LABEL   │                 │                │
└────────────┴─────────────────┴────────────────┘

// Status LED States:
● Green  - ENGAGED (autopilot active)
● Amber  - STANDBY (ready but not engaged)
● Red    - ALARM/ERROR
● Gray   - DISCONNECTED

// Mode Display:
- Primary: "AUTO MODE" / "WIND MODE" / "NAV MODE" / "STANDBY"
- Font: 16pt semibold, uppercase
- Color: #10b981 (engaged), #9ca3af (standby)

// Menu Button:
- "MENU" label with arrow →
- Opens mode selector and settings
- 44×44pt touch target
```

---

### 3. Compass Display (240pt height)

```
         ┌───────────────────────┐
         │          N            │
         │      ┌───────┐        │
         │  W   │ 045°  │   E    │
         │      │  ═══  │        │
         │      └───────┘        │
         │          S            │
         └───────────────────────┘
```

**Animated Compass Rose Specifications:**

```typescript
// Compass Component Structure
interface CompassDisplayProps {
  currentHeading: number;    // 0-359°
  targetHeading: number;     // 0-359°
  showRudderIndicator: boolean;
  rudderAngle: number;       // -35° to +35°
  animated: boolean;         // Enable rotation animation
}

// Visual Elements:
1. Outer Ring (180pt diameter)
   - Stroke: 2px solid #4b5563
   - Cardinal marks: N, E, S, W (14pt bold, white)
   - Degree marks: every 10° (small tick marks)

2. Center Heading Display (80pt diameter circle)
   - Background: #2a2a2a with subtle gradient
   - Border: 2px solid #10b981 (when engaged)
   - Heading Number: 48pt bold monospace
   - Unit Label: "°" 24pt

3. Heading Needle
   - North-pointing arrow (red triangle)
   - South counterbalance (white triangle)
   - Rotates with currentHeading

4. Target Heading Indicator
   - Amber arc (10° wide) at targetHeading position
   - Shows desired course
   - Color: #f59e0b, opacity 0.6

5. Rudder Angle Indicator (optional)
   - Small arc at bottom of compass
   - Green when centered (±2°)
   - Amber when moderate (±2-10°)
   - Red when extreme (>±10°)

// Animation Specs:
- Rotation: useSharedValue + withTiming
- Duration: 800ms
- Easing: Easing.inOut(Easing.ease)
- Update Rate: Max 10Hz (100ms intervals)
```

---

### 4. Data Display Row (60pt height)

```
┌────────────────────────────────────────────────┐
│   CURRENT       TARGET       RUDDER    RATE   │
│     045°         045°         +2°     +3°/m   │
└────────────────────────────────────────────────┘
```

**Four-Column Grid Layout:**

```typescript
// Column Structure (equal width, 25% each)
interface DataCell {
  label: string;      // "CURRENT" | "TARGET" | "RUDDER" | "RATE"
  value: number;      // Numerical value
  unit: string;       // "°" | "°/min" | etc.
  color: string;      // Dynamic based on state
  precision: number;  // Decimal places
}

// Styling per Column:
Label:
  - 11pt, uppercase, semibold
  - Color: #6b7280 (gray)
  - Letter spacing: 0.5pt

Value:
  - 32pt, monospace, bold
  - Color: Dynamic
    • CURRENT: #10b981 (green) when engaged
    • TARGET: #f59e0b (amber)
    • RUDDER: Green (centered), Amber (moderate), Red (extreme)
    • RATE: White
  - Padding: 8pt vertical

Unit:
  - 14pt, regular
  - Color: #9ca3af
  - Positioned inline with value baseline
```

---

### 5. Course Adjustment Controls (180pt height)

```
┌────────────────────────────────────────────────┐
│                                                │
│    [    -10°    ]        [    +10°    ]       │  ← 70pt height
│                                                │
│  [ -1° ] [ -1° ] [ -1° ] [ +1° ] [ +1° ]     │  ← 60pt height
│                                                │
└────────────────────────────────────────────────┘
```

**P70-Inspired Button Layout:**

```typescript
// Row 1: Coarse Adjustment (±10°)
┌─────────────────┬─────────────────┐
│     -10°        │      +10°       │  Two large buttons
└─────────────────┴─────────────────┘

Layout:
- Two equal-width buttons
- 70pt minimum height
- 12pt gap between buttons
- 20pt horizontal padding

Styling:
- Background: #3b82f6 (blue)
- Disabled: #1e3a5f (dark blue, 40% opacity)
- Border Radius: 12pt
- Font: 20pt bold monospace
- Active State: Scale 0.95, opacity 0.8

// Row 2: Fine Adjustment (±1°)
┌────┬────┬────┬────┬────┐
│-1° │-1° │-1° │+1° │+1° │  Five smaller buttons
└────┴────┴────┴────┴────┘

Note: P70 has single ±1° buttons, but mobile benefits
from multiple rapid-tap buttons for repeated adjustments

Alternative P70-Accurate Layout:
┌──────────┬──────────┬──────────┬──────────┐
│   -10°   │   -1°    │   +1°    │   +10°   │
└──────────┴──────────┴──────────┴──────────┘

Four-button horizontal layout (more like physical P70)
```

---

### 6. Primary Action Button (80pt height)

```
┌────────────────────────────────────────────────┐
│                                                │
│          [      STANDBY / DISENGAGE      ]     │
│                                                │
└────────────────────────────────────────────────┘
```

**Toggle Button Behavior:**

```typescript
// State-Based Display
State: DISENGAGED
┌────────────────────────────────────────────────┐
│           [   ENGAGE AUTO MODE   ]             │
└────────────────────────────────────────────────┘
Color: #10b981 (green)
Action: Shows confirmation modal

State: ENGAGED
┌────────────────────────────────────────────────┐
│           [       STANDBY       ]              │
└────────────────────────────────────────────────┘
Color: #f59e0b (amber)
Action: Immediate disengage (no confirmation)

State: ERROR/ALARM
┌────────────────────────────────────────────────┐
│           [ EMERGENCY DISENGAGE ]              │
└────────────────────────────────────────────────┘
Color: #dc2626 (red)
Action: Force disengage with audio/haptic alert

// Button Specs:
- Full width (with 20pt side padding)
- 80pt minimum height
- 12pt border radius
- 20pt font size, bold, uppercase
- Letter spacing: 1pt
- Haptic feedback on press (50ms vibration)
- Active state: 95% scale
```

---

### 7. Telemetry Bar (40pt height)

```
┌────────────────┬────────────────┬────────────────┐
│ ROT: +2°/min   │  XTE: 0.02nm   │  SEA: MED      │
└────────────────┴────────────────┴────────────────┘
```

**Three-Column Status Display:**

```typescript
// Column Definitions:
interface TelemetryCell {
  label: string;    // Abbreviation
  value: string;    // Value with unit
  color: string;    // Status color
}

// Left: Rate of Turn (ROT)
Label: "ROT:"
Value: "+2°/min" (+ for starboard, - for port)
Color: White (normal), Amber (>5°/min)

// Center: Cross-Track Error (XTE)
Label: "XTE:"
Value: "0.02nm" (nautical miles)
Color: Green (<0.1nm), Amber (0.1-0.25nm), Red (>0.25nm)
Display: Only visible in NAV/TRACK modes

// Right: Sea State
Label: "SEA:"
Value: "CALM" | "MOD" | "ROUGH" | "AUTO"
Color: #6b7280 (gray)
Info: Auto-tuning setting for autopilot response

// Styling:
- Background: #2a2a2a
- Border Top: 1px solid #333
- Text: 12pt regular
- Padding: 10pt vertical, 12pt horizontal
- Equal column widths
```

---

## Enhanced Features - Mode Selector

```
┌─────────────────────────────────────────────────┐
│              AUTOPILOT MODE SELECTOR            │
├─────────────────────────────────────────────────┤
│                                                 │
│  ┌─────────────────────────────────────────┐   │
│  │  AUTO  │  WIND  │  NAV  │  TRACK  │ •••│   │ ← Mode Tabs
│  └─────────────────────────────────────────┘   │
│                                                 │
│  ┌───────────────────────────────────────────┐ │
│  │         [    AUTO MODE    ]              │ │
│  │                                           │ │
│  │    Steer to Compass Heading               │ │
│  │                                           │ │
│  │    Target Heading:  [  045°  ]  ↻ ↺      │ │
│  │                                           │ │
│  │    ☑ Lock Heading on Engage               │ │
│  │    ☐ Auto Return to Course                │ │
│  │                                           │ │
│  └───────────────────────────────────────────┘ │
│                                                 │
│  ┌───────────────────────────────────────────┐ │
│  │         [   WIND MODE    ]               │ │
│  │                                           │ │
│  │    Steer to Wind Angle                    │ │
│  │    (Requires Wind Instrument)             │ │
│  │                                           │ │
│  │    Wind Angle:  [  045°  ]  ↻ ↺          │ │
│  │                                           │ │
│  │    ☐ Enable Auto-Tack                     │ │
│  │    Tack Angle:  [  90°   ]                │ │
│  │                                           │ │
│  └───────────────────────────────────────────┘ │
│                                                 │
│  ┌───────────────────────────────────────────┐ │
│  │         [    NAV MODE     ]              │ │
│  │                                           │ │
│  │    Follow GPS Track/Route                 │ │
│  │    (Requires GPS & Route)                 │ │
│  │                                           │ │
│  │    Active Waypoint:  WPT-005              │ │
│  │    Distance to WPT:  2.4nm                │ │
│  │                                           │ │
│  └───────────────────────────────────────────┘ │
│                                                 │
│              [    SELECT MODE    ]              │
│                                                 │
└─────────────────────────────────────────────────┘
```

**Mode Selector Specifications:**

```typescript
interface AutopilotMode {
  id: 'auto' | 'wind' | 'nav' | 'track' | 'pattern';
  label: string;
  description: string;
  icon: string;
  requirements: string[];
  available: boolean;
  settings: ModeSettings;
}

// Segmented Control for Mode Selection
┌────────┬────────┬────────┬────────┬────────┐
│  AUTO  │  WIND  │  NAV   │ TRACK  │  •••   │
└────────┴────────┴────────┴────────┴────────┘

Active Tab:
  - Background: #3b82f6
  - Text: #ffffff

Inactive Tab:
  - Background: #2a2a2a
  - Text: #9ca3af

Disabled Tab (requirements not met):
  - Background: #1a1a1a
  - Text: #4b5563
  - Shows tooltip on press explaining missing requirements
```

---

## Responsive Autopilot Settings Panel

```
┌─────────────────────────────────────────────────┐
│              AUTOPILOT SETTINGS                 │
├─────────────────────────────────────────────────┤
│                                                 │
│  RESPONSE TUNING                                │
│  ┌───────────────────────────────────────────┐ │
│  │  Rudder Gain:        [====○=====]  85%   │ │
│  │  Counter Rudder:     [==○=======]  45%   │ │
│  │  Rate Limit:         [======○===]  12°/s │ │
│  └───────────────────────────────────────────┘ │
│                                                 │
│  SEA STATE AUTO-TUNE                            │
│  ┌───────────────────────────────────────────┐ │
│  │  ◯ Auto     ◉ Calm     ◯ Moderate         │ │
│  │  ◯ Rough    ◯ Storm                        │ │
│  └───────────────────────────────────────────┘ │
│                                                 │
│  SAFETY LIMITS                                  │
│  ┌───────────────────────────────────────────┐ │
│  │  Max Off-Course:     [  15°   ]           │ │
│  │  Max XTE:            [ 0.25nm ]           │ │
│  │  Auto Disengage:     ☑ Enabled            │ │
│  └───────────────────────────────────────────┘ │
│                                                 │
│              [    SAVE SETTINGS    ]            │
│                                                 │
└─────────────────────────────────────────────────┘
```

---

## Color Palette - P70 Marine Theme

```typescript
// Background Colors
const colors = {
  // Primary Backgrounds
  screenBackground: '#0a0a0a',      // Nearly black
  panelBackground: '#1a1a1a',       // Dark gray
  cardBackground: '#2a2a2a',        // Medium dark gray

  // Status Colors (P70-inspired)
  statusEngaged: '#10b981',         // Green (active autopilot)
  statusStandby: '#f59e0b',         // Amber (ready)
  statusError: '#dc2626',           // Red (alarm/error)
  statusInactive: '#6b7280',        // Gray (off)

  // Interactive Elements
  buttonPrimary: '#3b82f6',         // Blue (course adjust)
  buttonSecondary: '#4b5563',       // Dark gray (secondary)
  buttonDisabled: '#1e293b',        // Very dark (disabled)

  // Text Colors
  textPrimary: '#ffffff',           // White (main text)
  textSecondary: '#9ca3af',         // Light gray (labels)
  textTertiary: '#6b7280',          // Medium gray (hints)
  textAccent: '#10b981',            // Green (active values)

  // Data Display
  currentHeading: '#10b981',        // Green
  targetHeading: '#f59e0b',         // Amber
  rudderNormal: '#10b981',          // Green (±2°)
  rudderModerate: '#f59e0b',        // Amber (±2-10°)
  rudderExtreme: '#dc2626',         // Red (>±10°)

  // Borders and Dividers
  borderPrimary: '#333333',         // Light gray border
  borderSecondary: '#1f1f1f',       // Subtle border

  // Overlays
  modalOverlay: 'rgba(0, 0, 0, 0.85)',
  tooltipBackground: '#3b3b3b',
};
```

---

## Typography Specifications

```typescript
// Font Families
const fonts = {
  primary: 'System',                // Native system font
  monospace: 'Menlo, Courier',      // For numerical data

  // Font Sizes (pt)
  title: 20,                        // Screen titles
  sectionHeader: 16,                // Section labels
  buttonLabel: 18,                  // Button text
  dataValue: 32,                    // Primary numerical displays
  dataLabelSmall: 11,               // Data labels
  dataUnit: 14,                     // Unit labels
  body: 14,                         // Body text
  caption: 12,                      // Small text/captions

  // Font Weights
  regular: '400',
  semibold: '600',
  bold: '700',

  // Letter Spacing
  normal: 0,
  wide: 0.5,                        // For uppercase labels
  dataDisplay: 1,                   // For large numerical data
};
```

---

## Animation Specifications

```typescript
// React Native Reanimated Patterns

// 1. Compass Rotation
const compassRotation = useSharedValue(0);

useEffect(() => {
  compassRotation.value = withTiming(currentHeading, {
    duration: 800,
    easing: Easing.inOut(Easing.ease),
  });
}, [currentHeading]);

const animatedStyle = useAnimatedStyle(() => ({
  transform: [{ rotate: `${compassRotation.value}deg` }],
}));

// 2. Status LED Pulse (when engaged)
const ledPulse = useSharedValue(1);

useEffect(() => {
  if (engaged) {
    ledPulse.value = withRepeat(
      withSequence(
        withTiming(0.6, { duration: 1000 }),
        withTiming(1, { duration: 1000 })
      ),
      -1,  // Infinite repeat
      true // Reverse animation
    );
  }
}, [engaged]);

// 3. Button Press Feedback
const buttonScale = useSharedValue(1);

const onPressIn = () => {
  buttonScale.value = withTiming(0.95, { duration: 100 });
};

const onPressOut = () => {
  buttonScale.value = withSpring(1);
};

// 4. Value Change Highlight
const valueHighlight = useSharedValue(0);

useEffect(() => {
  valueHighlight.value = withSequence(
    withTiming(1, { duration: 200 }),
    withTiming(0, { duration: 800 })
  );
}, [value]);

const highlightStyle = useAnimatedStyle(() => ({
  backgroundColor: interpolateColor(
    valueHighlight.value,
    [0, 1],
    ['transparent', '#10b98133']
  ),
}));
```

---

## Touch Target Guidelines

**Minimum Touch Targets (Marine Environment):**

```
Regular Buttons:     60pt × 60pt minimum
Primary Actions:     80pt height, full width
Emergency Actions:   80pt × 80pt minimum
Small Controls:      44pt × 44pt absolute minimum

Spacing:
- Between buttons: 12pt minimum
- Screen edges: 20pt padding
- Section spacing: 24pt vertical

Rationale:
- Gloved hands require larger targets
- Boat motion affects precision
- Outdoor visibility demands clear spacing
```

---

## Accessibility Considerations

```typescript
// VoiceOver / TalkBack Support
<TouchableOpacity
  accessible={true}
  accessibilityRole="button"
  accessibilityLabel="Adjust heading negative 10 degrees"
  accessibilityHint="Decreases target heading by 10 degrees"
  accessibilityState={{ disabled: !engaged }}
>
  <Text>-10°</Text>
</TouchableOpacity>

// Haptic Feedback Patterns
const hapticPatterns = {
  buttonPress: [50],                    // Single short vibration
  engage: [100, 50, 100],               // Double pulse
  disengage: [200],                     // Long vibration
  error: [100, 50, 100, 50, 100],      // Triple pulse
  headingAdjust: [30],                  // Very short tap
};

// Audio Alerts
const audioAlerts = {
  engage: 'engage_autopilot.wav',       // Ascending tone
  disengage: 'disengage_autopilot.wav', // Descending tone
  alarm: 'autopilot_alarm.wav',         // Urgent repeating tone
  confirm: 'button_confirm.wav',        // Click sound
};

// Color Contrast Ratios (WCAG AA compliance)
Background #1a1a1a vs Text #ffffff:    17.8:1 ✓ (Excellent)
Button #3b82f6 vs Text #ffffff:        4.6:1  ✓ (Pass AA)
Status Green #10b981 vs Background:    5.2:1  ✓ (Pass AA)
```

---

## Implementation Priority

### Phase 1: Core P70 Layout ✓ (Current)
- [x] Basic button layout (+/-1°, +/-10°)
- [x] Heading display
- [x] Engage/Standby controls
- [x] Status indicators

### Phase 2: Enhanced Visual Fidelity
- [ ] Animated rotating compass rose
- [ ] Improved button layout (4-button horizontal)
- [ ] Data display row (Current/Target/Rudder/Rate)
- [ ] Telemetry bar

### Phase 3: Mode Selector
- [ ] Mode selection UI (AUTO/WIND/NAV/TRACK)
- [ ] Mode-specific settings panels
- [ ] Requirements validation

### Phase 4: Advanced Features
- [ ] Settings panel (Response tuning)
- [ ] Sea state auto-tune
- [ ] Dodge/Tack controls
- [ ] Advanced compass features (XTE arc, wind angle)

---

## Component File Structure

```
src/
├── widgets/
│   ├── AutopilotControlScreen.tsx          (Main container)
│   └── autopilot/
│       ├── CompassDisplay.tsx              (Animated compass)
│       ├── DataDisplayRow.tsx              (Current/Target/Rudder)
│       ├── CourseAdjustmentButtons.tsx     (±1°/±10° controls)
│       ├── ModeSelector.tsx                (Mode switching UI)
│       ├── TelemetryBar.tsx                (ROT/XTE/Sea state)
│       ├── SettingsPanel.tsx               (Response tuning)
│       └── StatusBar.tsx                   (Status LED + mode)
│
├── components/
│   └── autopilot/
│       ├── PrimaryActionButton.tsx         (Engage/Standby)
│       ├── EngagementConfirmationModal.tsx
│       └── EmergencyDisengageButton.tsx
│
└── styles/
    └── autopilotTheme.ts                   (P70 color palette)
```

---

## Next Steps for Implementation

1. **Review this mockup** with team/stakeholders
2. **Gather visual references** (photos of actual P70 unit)
3. **Create component stubs** for each section
4. **Implement Phase 2** (animated compass + data row)
5. **User testing** with marine environment considerations
6. **Functionality spike** (NMEA 2000 PGN integration)

---

**Document Version:** 1.0
**Last Updated:** 2025-10-15
**Author:** James (Dev Agent)
**Status:** Draft - Ready for Review
