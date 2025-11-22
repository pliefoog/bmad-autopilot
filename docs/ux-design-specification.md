# Boating Instruments App UX Design Specification

_Created on November 20, 2025 by Pieter_
_Generated using BMad Method - Create UX Design Workflow v1.0_

---

## Executive Summary

The **Boating Instruments App** (evolving to **VIP - Vessel Intelligence Platform**) is a voice-first, multi-device marine intelligence ecosystem that transforms smartphones, tablets, desktops, and Smart TVs into comprehensive marine instruments. The app connects to boat NMEA networks via WiFi bridges and provides real-time navigation data, Raymarine autopilot control, critical alarms, and intelligent context-aware features.

**Strategic Vision:**
Transform personal devices into a **frictionless multi-device marine intelligence platform** where:
- Information reaches the right person at the right time (vs user hunting for data)
- Voice interaction eliminates need to look at screens while underway
- Device coordination provides seamless experience (BLE proximity + role profiles)
- Platform-native patterns honor iOS/Android/Web/TV conventions
- Glove-friendly design enables safe operation in marine conditions

**Current State:** v2.3 - Cross-platform React Native app (iOS, Android, Web, Desktop)
**Future Vision:** VIP Platform - Multi-device ecosystem with TV, Watch, Camera integration

**Core User Need:** Solo sailors and small-crew powerboaters need reliable marine instruments without $10K+ MFD installations or additional hardware purchases.

---

## 1. Design System Foundation

### 1.1 Design System Choice

**Selected Approach:** **Hybrid Platform-Native + Custom Marine Design System**

**Rationale:**
1. **Marine Core Components** - Custom designed for safety-critical marine environment:
   - Red-night mode compliance (625nm wavelength, no green/blue/white light)
   - Large touch targets (64pt glove mode, 44-56pt native)
   - High contrast for sunlight readability
   - Marine-specific widgets (depth, wind, autopilot)

2. **Platform Chrome** - Native OS patterns for navigation/settings:
   - iOS: SF Symbols, Tab Bar (iPhone), Sidebar (iPad)
   - Android: Material Icons, Navigation Drawer, FAB
   - Web: Responsive sidebar (desktop), drawer (mobile)
   - TV: D-pad navigation, 10-foot UI, focus indicators

3. **Technology Stack:**
   - React Native 0.76+ (cross-platform foundation)
   - Expo 50+ (development platform)
   - Zustand (state management)
   - @react-navigation (platform-native navigation)
   - expo-symbols (iOS SF Symbols)
   - react-native-vector-icons (Material Icons)

**Design Tokens Architecture:**

```typescript
// Marine Core Tokens (custom)
const MARINE_TOKENS = {
  touchTargets: {
    glove: 64,        // Navigation session active
    tablet: 56,       // Tablet in planning mode
    phone: 44,        // Phone native
  },
  colors: {
    day: { /* full spectrum */ },
    night: { /* reduced blue light */ },
    redNight: { /* 625nm only, CRITICAL */ },
  },
  typography: {
    valueDisplay: 36-48,  // Primary metrics
    heading: 20-24,
    body: 16-18,
  },
};

// Platform Chrome Tokens (native)
const PLATFORM_TOKENS = {
  ios: {
    tabBarHeight: 49,
    navigationBarHeight: 44,
    iconSet: 'SF Symbols',
  },
  android: {
    appBarHeight: 56,
    fabSize: 56,
    iconSet: 'Material Icons',
  },
  web: {
    sidebarWidth: 240,
    responsive: true,
  },
  tv: {
    focusBorderWidth: 4,
    touchTarget: 80,
    fontSize: 36,
  },
};
```

**Benefits of Hybrid Approach:**
- ✅ Marine safety requirements met (red-night, glove mode)
- ✅ Platform conventions honored (users feel at home)
- ✅ Single codebase serves all platforms
- ✅ Design-in-code workflow (no Figma dependency)

---

## 2. Core User Experience

### 2.1 Defining Experience

**Core Experience Statement:**
> "Voice-first marine intelligence that adapts to your context, coordinates across devices, and keeps your eyes on the water—not the screen."

**Experience Pillars:**

1. **Frictionless Awareness** - Information reaches you proactively
   - Voice alerts for critical conditions
   - Auto-cycling TV displays in salon
   - Haptic feedback on smartwatch
   - BLE proximity triggers relevant dashboards

2. **Glove-Friendly Operation** - Safe interaction in marine conditions
   - 64pt touch targets when navigation session active
   - Auto-detection via SOG > 2.0 knots
   - Voice commands for autopilot adjustments
   - Large typography readable in sunlight

3. **Multi-Device Coordination** - Devices work together seamlessly
   - Phone in pocket = BLE proximity tag
   - Tablet at helm = primary display
   - TV in salon = ambient awareness
   - Acknowledge alarm on one device → dismissed on all

4. **Platform-Native Feel** - Honor OS conventions
   - iOS tab bar vs Android drawer
   - SF Symbols vs Material Icons
   - Mouse hover states on web
   - D-pad navigation on TV

5. **Zero Configuration** - Just works
   - Auto-discover WiFi bridges
   - Auto-start navigation session
   - Auto-adapt UI density
   - Voice setup via natural language

**Interaction Modes:**

| Mode | Context | Touch Targets | Information Density | Voice Priority |
|------|---------|---------------|---------------------|----------------|
| **Dashboard (Glove)** | Underway, hands on wheel | 64pt | Sparse (4-6 widgets/page) | High |
| **Planning** | At anchor, planning route | 44-56pt | Dense (9-12 widgets/page) | Low |
| **Ambient (TV)** | Salon awareness | 80pt (D-pad) | Auto-cycling (1 widget) | Medium |

### 2.2 Novel UX Patterns

**1. Navigation Session-Triggered UI Density**

**Innovation:** Automatic glove mode activation based on boat movement

```
SOG < 2.0 knots (at anchor/dock)
  ↓
PLANNING MODE
- 44pt touch targets
- Dense information layout
- Keyboard navigation (desktop)
- Fine-grain configuration
  ↓
SOG > 2.0 knots (underway)
  ↓
DASHBOARD MODE (Glove-Friendly)
- 64pt touch targets
- Sparse layout (critical data only)
- Voice-first interaction
- Large swipe gestures (120px threshold)
```

**Implementation:**
- NMEA SOG data monitored continuously
- Navigation session auto-starts after 30s above threshold
- UI density transitions smoothly (300ms animation)
- Visual indicator (🧤 glove icon) shows mode
- Manual override available in settings

**Benefits:**
- Zero user configuration required
- Safety-first (no fumbling with small buttons while underway)
- Intelligent adaptation to context
- Novel in marine app space

---

**2. BLE Proximity + Role-Based Dashboard Switching**

**Innovation:** Device detects who approaches and shows relevant dashboard

```
Captain walks to helm with phone in pocket
  ↓
Tablet detects "Captain" BLE profile
  ↓
Dashboard auto-switches to "Captain View"
  - Autopilot controls prominent
  - Navigation widgets visible
  - Course planning tools
  ↓
Voice confirmation: "Captain view active"
```

**Role Profiles:**
- **Captain** - Navigation, autopilot, route planning
- **Engineer** - Engine monitoring, battery, fuel, alarms
- **Crew** - Basic awareness, weather, safety

**Privacy Controls:**
- Opt-in BLE broadcasting
- Role profiles stored locally
- No cloud tracking
- Manual dashboard switching always available

**Benefits:**
- Frictionless multi-user experience
- Each person sees relevant information
- No manual switching needed
- Voice confirmation provides feedback without looking

---

**3. Voice Co-Pilot for Autopilot Control**

**Innovation:** Complete autopilot operation via natural language

```
User: "Set autopilot to 280 degrees"
  ↓
Voice AI: "Confirm heading 280, current heading 295"
  ↓
User: "Confirm"
  ↓
Autopilot engages → heading adjusts
  ↓
Voice AI: "Autopilot engaged, steering to 280"
```

**Safety Features:**
- Confirmation required for all commands
- Maximum ±20° adjustment per voice command
- Visual confirmation shown (but not required to be looked at)
- Emergency "disengage autopilot" voice command
- Fallback to touch controls always available

**Voice Commands:**
- "Set heading to [degrees]"
- "Adjust heading [+/-][degrees]"
- "Engage autopilot"
- "Disengage autopilot"
- "What's my current heading?"
- "Autopilot status"

**Benefits:**
- Eyes remain on water
- Hands remain on wheel
- Natural interaction (no syntax memorization)
- Safety confirmations built-in

---

**4. TV Ambient Display with Auto-Cycling**

**Innovation:** Smart TV as passive awareness display in salon/cockpit

```
TV installed in salon
  ↓
Connects to NMEA WiFi bridge automatically
  ↓
Auto-cycles through widgets:
  - Depth (15 seconds)
  - Speed (15 seconds)
  - Wind (15 seconds)
  - Battery (15 seconds)
  ↓
Dims after 5 minutes inactivity
  ↓
Critical alarm triggers:
  - Full brightness
  - Alarm widget shown
  - Voice alert through TV speakers
```

**10-Foot UI Characteristics:**
- 80pt D-pad focus targets
- 36-48pt minimum typography
- Full-screen widgets (one at a time)
- High contrast for distance viewing
- Auto-brightness based on time of day

**D-Pad Navigation:**
- ← → Cycle widgets manually
- ↑ ↓ Adjust display brightness
- Select → Pause auto-cycling
- Menu → Access settings

**Benefits:**
- Passive awareness without dedicated screen attention
- Works for entire crew in shared spaces
- No interaction required (but available)
- Leverages existing TV hardware

---

## 3. Visual Foundation

### 3.1 Color System

**Three-Mode Theme System:**

**1. Day Mode** - Full-spectrum visibility for sunlight

```typescript
DAY_THEME = {
  background: '#FFFFFF',
  surface: '#F5F5F5',
  primary: '#0066CC',      // Blue (navigation primary)
  success: '#059669',      // Green (OK states)
  warning: '#F59E0B',      // Amber (caution)
  danger: '#DC2626',       // Red (critical)
  text: '#1F2937',
  textSecondary: '#6B7280',
  border: '#D1D5DB',
};
```

**2. Night Mode** - Reduced blue light, preserves night vision

```typescript
NIGHT_THEME = {
  background: '#1F2937',
  surface: '#374151',
  primary: '#60A5FA',      // Light blue (reduced intensity)
  success: '#34D399',      // Light green (OK states)
  warning: '#FBBF24',      // Amber (caution)
  danger: '#F87171',       // Light red (critical)
  text: '#F9FAFB',
  textSecondary: '#D1D5DB',
  border: '#4B5563',
};
```

**3. Red-Night Mode** - CRITICAL: 625nm wavelength only, preserves night vision

```typescript
RED_NIGHT_THEME = {
  background: '#1C0000',   // Near-black red
  surface: '#2D0000',      // Dark red
  primary: '#DC2626',      // Red (625nm)
  success: '#FCA5A5',      // Bright red (replaces green!)
  warning: '#FCA5A5',      // Bright red (replaces amber!)
  danger: '#7F1D1D',       // Dark red (inactive states)
  text: '#FCA5A5',         // Bright red text
  textSecondary: '#7F1D1D', // Dim red text
  border: '#450A0A',       // Border red
  
  // FORBIDDEN COLORS (never in red-night):
  forbidden: ['#00FF00', '#0000FF', '#FFFFFF', '#FFFF00'],
};
```

**Red-Night Compliance Rules:**
1. ❌ NO green colors (breaks night vision instantly)
2. ❌ NO blue colors (same issue)
3. ❌ NO white colors (too bright, destroys night vision)
4. ✅ ONLY red spectrum (625nm wavelength)
5. ✅ Use brightness variations for hierarchy
6. ✅ Active = bright red (#FCA5A5)
7. ✅ Inactive = dark red (#7F1D1D)

**Color Semantic Mapping:**

| Semantic | Day | Night | Red-Night |
|----------|-----|-------|-----------|
| Success/OK | Green | Light Green | **Bright Red** |
| Warning | Amber | Amber | **Bright Red** |
| Danger | Red | Light Red | Dark Red |
| Info | Blue | Light Blue | **Bright Red** |
| Disabled | Gray | Light Gray | **Dark Red** |

**Interactive Visualization:** [ux-color-themes.html](./ux-color-themes.html)

---

## 4. Design Direction

### 4.1 Chosen Design Approach

**Selected Direction:** **"Intelligent Marine Companion"**

**Visual Characteristics:**
- Clean, minimal interface (eyes on water, not screen)
- Large, bold typography for critical values
- Generous whitespace (glove-friendly spacing)
- Platform-native navigation chrome
- Marine-specific widget design
- Voice interaction prominence

**Key Design Decisions:**

**1. Platform Chrome vs Marine Core Split**

```
┌──────────────────────────────────┐
│  PLATFORM CHROME (native)        │ ← iOS tab bar / Android drawer / TV D-pad
│  - Navigation                    │
│  - Settings                      │
│  - System UI                     │
├──────────────────────────────────┤
│                                  │
│  MARINE CORE (custom)            │ ← Marine-specific design
│  - Dashboard widgets             │
│  - Autopilot controls            │
│  - Alarm system                  │
│  - Theme system                  │
│                                  │
└──────────────────────────────────┘
```

**Benefits:**
- Platform conventions = familiar navigation
- Marine core = safety-critical custom design
- Clear separation of concerns
- Single codebase, multiple platform adaptations

**2. Dashboard vs Planning Mode Visual Distinction**

**Dashboard Mode (Glove-Friendly):**
- 64pt touch targets
- 16pt grid spacing
- 48pt value typography
- 4-6 widgets per page
- Large swipe zones (120px)
- Glove icon indicator (🧤)

**Planning Mode (Dense Information):**
- 44-56pt touch targets
- 8pt grid spacing
- 36pt value typography
- 9-12 widgets per page
- Standard swipe zones (50px)
- No glove indicator

**Visual Transition:**
- Smooth 300ms animation
- Grid reflows intelligently
- No content loss (widgets scale, don't hide)
- Visual feedback confirms mode change

**3. Widget Visual System**

**Widget Anatomy:**
```
┌─────────────────────────────────┐
│ Depth                       ⚙️ │ ← Title + settings icon
├─────────────────────────────────┤
│                                 │
│          42.5                   │ ← Primary value (large)
│           ft                    │ ← Unit (medium)
│                                 │
│  Min: 38.2 ft   Max: 45.1 ft   │ ← Secondary values (small)
│                                 │
└─────────────────────────────────┘
```

**Widget States:**
- **Normal** - Standard colors, regular updates
- **Warning** - Amber border, bold value
- **Critical** - Red border, flashing value, audio alert
- **Stale** - Grayed out, "No data" message
- **Configuring** - Settings overlay, touch priority

**Widget Sizing:**
- **Small** - 1×1 grid unit (speed, depth)
- **Medium** - 2×1 grid unit (wind, battery)
- **Large** - 2×2 grid unit (compass rose, autopilot)

**4. Typography Scale**

| Level | Size (pt) | Weight | Usage |
|-------|-----------|--------|-------|
| **Display** | 48 | Bold | Primary values (glove mode) |
| **Headline** | 36 | Bold | Primary values (native mode) |
| **Title** | 24 | Semibold | Widget titles, screen headings |
| **Body** | 18 | Regular | Secondary values, labels |
| **Caption** | 16 | Regular | Units, metadata |
| **Small** | 14 | Regular | Helper text, timestamps |

**Font Choice:** System fonts (SF Pro on iOS, Roboto on Android, System UI on Web)
- **Rationale:** Marine conditions demand maximum readability, system fonts optimized per platform
- **Fallback:** Monospace for numeric values (alignment consistency)

**Interactive Mockups:** [ux-design-directions.html](./ux-design-directions.html)

---

## 5. User Journey Flows

### 5.1 Critical User Paths

**Journey 1: First-Time Setup (Onboarding)**

```
1. Install app → Launch
   ↓
2. Onboarding carousel (3 slides)
   - "Connect to your boat's WiFi bridge"
   - "Monitor NMEA instruments in real-time"
   - "Control Raymarine autopilot by voice"
   ↓
3. WiFi bridge auto-discovery
   - Scan network for devices
   - Show list of discovered bridges
   - Tap to select → Auto-configure
   ↓
4. Dashboard loads with default widgets
   - Depth, Speed, Wind, Heading, GPS
   - Immediately see live data
   ↓
5. Optional: Customize widgets
   - Tap "+" to add more
   - Long-press to remove/reorder
```

**Success Criteria:**
- ✅ Complete setup in < 2 minutes
- ✅ Zero manual IP configuration required
- ✅ Live data visible immediately
- ✅ Skippable onboarding (expert users)

---

**Journey 2: Daily Sailing Workflow**

```
1. At dock (Planning Mode)
   - Check weather widget
   - Review route plan
   - Configure alarm thresholds
   - Dense information display
   ↓
2. Start engine, cast off
   - SOG increases past 2.0 knots
   - Navigation session auto-starts
   - UI switches to Dashboard (Glove) Mode
   - Touch targets grow to 64pt
   ↓
3. Underway - Manual Steering
   - Monitor depth, speed, wind
   - Glove-friendly touch targets
   - Voice alerts for critical conditions
   - Quick glances sufficient
   ↓
4. Engage Autopilot (Voice)
   - Say: "Set autopilot to 280 degrees"
   - Voice confirms: "Confirm heading 280"
   - Say: "Confirm"
   - Autopilot engages
   ↓
5. Adjust Heading (Voice)
   - Say: "Adjust heading plus 10"
   - Voice confirms: "New heading 290"
   - Eyes remain on water
   ↓
6. Alarm Triggered (Shallow Water)
   - Visual: Red banner at top
   - Audio: Tone through speakers
   - Haptic: Phone vibrates in pocket
   - Voice: "Shallow water alarm, 4.5 feet"
   ↓
7. Acknowledge Alarm
   - Tap large "Dismiss" button (64pt)
   - OR say "Acknowledge alarm"
   - Alarm clears on all devices
   ↓
8. Return to Marina
   - SOG drops below 2.0 knots
   - After 10 minutes, navigation session ends
   - UI returns to Planning Mode
   - Touch targets shrink to 44pt
```

**Success Criteria:**
- ✅ Automatic mode switching (no manual toggle)
- ✅ Voice commands work reliably
- ✅ Alarms impossible to miss
- ✅ Glove operation confirmed in real conditions

---

**Journey 3: Multi-Device Coordination**

```
1. Setup Phase (First Time)
   - Pair phone with tablet (BLE)
   - Assign role profiles (Captain, Engineer)
   - Configure TV in salon (auto-discover)
   ↓
2. Underway - Captain at Helm
   - Captain phone in pocket (BLE beacon)
   - Tablet detects Captain proximity
   - Dashboard switches to "Captain View"
   - Voice: "Captain view active"
   - Autopilot controls prominent
   ↓
3. Engineer Walks to Helm
   - Engineer phone in pocket (BLE beacon)
   - Tablet detects Engineer proximity
   - Dashboard switches to "Engineer View"
   - Voice: "Engineer view active"
   - Engine monitoring prominent
   ↓
4. Alarm Triggered
   - Depth alarm on all devices simultaneously
   - Tablet: Visual banner
   - Phone: Haptic + notification
   - TV: Full-screen alarm widget
   - Voice: "Depth alarm, 5.2 feet"
   ↓
5. Acknowledge on Phone
   - Captain taps "Dismiss" on phone
   - Alarm dismissed on all devices
   - Tablet, TV, watch all clear
   ↓
6. TV Ambient Display
   - Auto-cycles through widgets
   - Depth → Speed → Wind → Battery
   - 15 seconds per widget
   - Crew glances from salon
```

**Success Criteria:**
- ✅ Device pairing simple and secure
- ✅ Role-based views switch automatically
- ✅ Alarm sync < 1 second latency
- ✅ TV readable from 10 feet away

---

**Journey 4: Voice Autopilot Control**

```
1. Enable Voice (First Time)
   - Settings → Voice Control → Enable
   - Microphone permission granted
   - Voice training (optional)
   ↓
2. Activate Voice Listening
   - Say wake word: "Hey Navigator"
   - OR tap microphone button
   - Audio feedback: Chime
   ↓
3. Set Heading Command
   - Say: "Set autopilot to 280 degrees"
   - Voice AI: "Confirm heading 280, current heading 295"
   - Visual: Confirmation dialog (but don't need to look)
   ↓
4. Confirm Command
   - Say: "Confirm"
   - OR tap green checkmark (64pt button)
   - Autopilot engages
   ↓
5. Autopilot Adjustment
   - Say: "Adjust heading plus 10"
   - Voice AI: "New heading 290, adjusting now"
   - Heading updates smoothly
   ↓
6. Status Query
   - Say: "What's my current heading?"
   - Voice AI: "Current heading 290, autopilot engaged"
   ↓
7. Emergency Disengage
   - Say: "Disengage autopilot"
   - OR tap red X button
   - Voice AI: "Autopilot disengaged"
   - Manual steering resumed
```

**Success Criteria:**
- ✅ Voice recognition 95%+ accuracy
- ✅ Confirmation prevents accidental commands
- ✅ Visual fallback always available
- ✅ Emergency disengage instant

---

## 6. Component Library

### 6.1 Component Strategy

**Architecture:** Platform Chrome + Marine Core Component Split

**Platform Chrome Components (Native Patterns):**

```typescript
// iOS-specific
- TabBar (bottom navigation)
- Sidebar (iPad landscape)
- SFSymbol (icon system)
- SwipeActions (list item actions)

// Android-specific
- NavigationDrawer (hamburger menu)
- FAB (floating action button)
- MaterialIcon (icon system)
- BottomSheet (modal presentations)

// Web-specific
- ResponsiveSidebar (desktop)
- HamburgerMenu (mobile web)
- HoverStates (mouse interactions)
- KeyboardShortcuts (Cmd+S, Esc, Tab)

// TV-specific
- DPadNavigation (remote control)
- FocusIndicators (glowing borders)
- VoiceInput (remote microphone)
- AutoCycling (widget rotation)
```

**Marine Core Components (Custom Design):**

```typescript
// Dashboard Components
- PaginatedDashboard (widget grid with pagination)
- PrimaryMetricCell (large value display)
- SecondaryMetricCell (compact value display)
- WidgetGrid (responsive layout engine)
- AlarmBanner (critical alert display)

// Autopilot Components
- AutopilotFooter (heading adjustment controls)
- CompassRose (visual heading display)
- HeadingAdjustmentWheel (fine-tune interface)
- SafetyConfirmation (autopilot engagement dialog)

// Settings Components
- BaseSettingsModal (unified modal container)
- PlatformTextInput (touch + keyboard optimized)
- PlatformToggle (switch/radio patterns)
- PlatformPicker (dropdown selector)
- SettingsSection (collapsible groups)

// Widget Library
- DepthWidget (depth sounder display)
- SpeedWidget (SOG/STW display)
- WindWidget (wind speed/direction)
- HeadingWidget (compass heading)
- GPSWidget (position, course, waypoint)
- BatteryWidget (voltage, current, SOC)
- EngineWidget (RPM, temp, pressure)
- FuelWidget (tank levels, flow rate)
- TankWidget (fresh water, gray, black)

// Alarm Components
- AlarmTrigger (visual/audio/haptic)
- AlarmDismissButton (large glove-friendly)
- AlarmHistory (log of past alarms)
- AlarmConfiguration (threshold settings)
```

**Component Props Pattern:**

```typescript
interface MarineComponentProps {
  // Density adaptation
  density?: 'glove' | 'native';
  
  // Theme adaptation
  theme: ThemeColors;
  themeMode: 'day' | 'night' | 'red-night';
  
  // Platform adaptation
  platform: 'ios' | 'android' | 'web' | 'tv';
  
  // Touch target sizing
  touchTargetSize?: number; // Defaults from density config
  
  // Accessibility
  accessibilityLabel?: string;
  accessibilityRole?: string;
  
  // Standard React Native props
  style?: ViewStyle;
  testID?: string;
}
```

**Storybook Component Showcase:**

```bash
# Run Storybook to see all components
npm run storybook

# Stories organized by category:
- Platform Chrome/iOS
- Platform Chrome/Android  
- Platform Chrome/Web
- Platform Chrome/TV
- Marine Core/Widgets
- Marine Core/Autopilot
- Marine Core/Settings
- Marine Core/Alarms
```

**Component Testing Strategy:**
- Unit tests: Jest + React Native Testing Library
- Visual tests: Storybook snapshots
- Integration tests: WiFi Bridge simulator scenarios
- Accessibility tests: WCAG 2.1 AA compliance

---

## 7. UX Pattern Decisions

### 7.1 Consistency Rules

**Pattern 1: Modal vs Full-Screen Navigation**

**Rule:**
- **Modals** - Quick actions, temporary context, dismissible (Settings dialogs)
- **Full-Screen** - Main app sections, permanent navigation (Dashboard, Autopilot screen)

**iOS Implementation:**
- Modals: Slide up from bottom, dismiss by swipe down
- Full-screen: Tab bar navigation at bottom

**Android Implementation:**
- Modals: Slide up from bottom, dismiss by back button
- Full-screen: Drawer navigation from hamburger menu

**Web Implementation:**
- Modals: Centered overlay with backdrop
- Full-screen: Sidebar navigation (desktop) or drawer (mobile)

**TV Implementation:**
- Modals: Not used (full-screen only)
- Full-screen: D-pad navigation between screens

---

**Pattern 2: Touch Target Sizing Hierarchy**

**Rule:**

| Context | Target Size | Usage |
|---------|-------------|-------|
| **Critical Safety** | 64pt | Autopilot engage/disengage, alarm dismiss |
| **Glove Mode** | 64pt | All dashboard interactions when underway |
| **Tablet Native** | 56pt | Settings, configuration, planning mode |
| **Phone Native** | 44pt | General interactions at dock |
| **TV D-Pad** | 80pt | Focus areas for remote navigation |

**Implementation:**
```typescript
const density = useUIDensity(); // Hook returns config based on context

<TouchableOpacity
  style={{ 
    width: density.touchTargetSize,
    height: density.touchTargetSize 
  }}
>
  {/* Content */}
</TouchableOpacity>
```

---

**Pattern 3: Navigation Session State Visibility**

**Rule:** Always show current mode to user

**Visual Indicators:**
- **Glove Mode Active**: 🧤 icon in header, amber accent color
- **Planning Mode**: No indicator (default state)
- **TV Auto-Cycling**: ⟲ icon in corner
- **Voice Listening**: 🎤 pulsing icon

**Location:**
- iOS: Right side of navigation bar
- Android: Action bar right side
- Web: Top right corner
- TV: Bottom left corner

---

**Pattern 4: Alarm Priority System**

**Rule:** Critical alarms cannot be missed

**Alarm Levels:**
1. **Critical** (Immediate danger)
   - Visual: Full-screen takeover, red background, flashing
   - Audio: Loud continuous tone (cannot be muted)
   - Haptic: Strong continuous vibration
   - Voice: "CRITICAL ALARM: [description]"
   - Dismissal: Requires explicit action (no auto-dismiss)

2. **Warning** (Requires attention)
   - Visual: Banner at top, amber background
   - Audio: Three tones repeated
   - Haptic: Three pulses
   - Voice: "Warning: [description]"
   - Dismissal: Tap dismiss or auto-dismiss after 30s

3. **Info** (Awareness only)
   - Visual: Small notification badge
   - Audio: Single tone (optional)
   - Haptic: Single pulse
   - Voice: None
   - Dismissal: Auto-dismiss after 10s

**Multi-Device Sync:**
- Alarm triggered on one device → All devices show alarm
- Dismiss on any device → All devices dismiss
- Latency < 1 second

---

**Pattern 5: Widget Configuration Access**

**Rule:** Quick access without leaving dashboard

**Interaction:**
- **Short tap** - Widget displays (normal view)
- **Long press** - Widget settings overlay appears
- **Drag** - Widget reordering (planning mode only)
- **Pinch** - Widget resizing (future enhancement)

**Settings Overlay:**
```
┌─────────────────────────────────┐
│ Depth Settings            ✕    │
├─────────────────────────────────┤
│ Display Units: Feet         ⌄  │
│ Shallow Water Alarm: 10 ft  ⌄  │
│ Deep Water Alarm: 100 ft    ⌄  │
│ Show Min/Max: ☑                │
│                                 │
│         [Save] [Cancel]         │
└─────────────────────────────────┘
```

---

**Pattern 6: Voice Interaction Protocol**

**Rule:** Voice commands require confirmation for safety

**Command Types:**

1. **Query Commands** (No confirmation needed)
   - "What's my depth?"
   - "What's my speed?"
   - "Autopilot status?"

2. **Adjustment Commands** (Confirmation required)
   - "Set heading to 280"
   - "Adjust heading plus 10"
   - "Set depth alarm to 8 feet"

3. **Critical Commands** (Double confirmation required)
   - "Engage autopilot"
   - "Disengage autopilot"

**Confirmation Flow:**
```
User: "Set autopilot to 280 degrees"
  ↓
AI: "Confirm heading 280, current heading 295"
  ↓ (Visual confirmation shown but not required)
  ↓
User: "Confirm"
  ↓
AI: "Autopilot engaged, steering to 280"
  ↓
Action executed
```

---

**Pattern 7: Red-Night Mode Transitions**

**Rule:** Gradual transition preserves night vision

**Transition Sequence:**
```
Day Mode → Night Mode → Red-Night Mode
  ↓           ↓              ↓
Instant    2s fade       5s fade  (slower = safer)
  ↑           ↑              ↑
Instant    2s fade       5s fade
Day Mode ← Night Mode ← Red-Night Mode
```

**Color Animation:**
- **Entering Red-Night**: 5-second fade from night colors to red spectrum
- **Exiting Red-Night**: 5-second fade from red spectrum to night colors
- **Day ↔ Night**: 2-second fade
- **Day ↔ Red-Night**: Not allowed (must go through Night mode)

**Rationale:** Eyes need time to adjust from red spectrum back to full spectrum

---

## 8. Responsive Design & Accessibility

### 8.1 Responsive Strategy

**Breakpoint System:**

| Device | Width | Layout | Touch Targets | Grid Columns |
|--------|-------|--------|---------------|--------------|
| **Phone (Portrait)** | 320-428px | Single column | 44pt | 2×3 (6 widgets) |
| **Phone (Landscape)** | 568-926px | Two columns | 44pt | 4×2 (8 widgets) |
| **Tablet (Portrait)** | 768-834px | Two columns | 56pt | 3×3 (9 widgets) |
| **Tablet (Landscape)** | 1024-1194px | Three columns | 56pt | 4×3 (12 widgets) |
| **Desktop** | 1280px+ | Sidebar + content | 44pt | 4×4 (16 widgets) |
| **TV** | 1920×1080 | Full-screen single | 80pt | 1×1 (auto-cycle) |

**Responsive Behaviors:**

1. **Widget Grid Adaptation**
   ```typescript
   const { columns, itemsPerPage } = useResponsiveGrid({
     density: navigationSession.gloveModeActive ? 'glove' : 'native',
     deviceType: Platform.select({ ios: 'phone', android: 'tablet', web: 'desktop' }),
   });
   ```

2. **Navigation Adaptation**
   - **Phone**: Tab bar (iOS) or drawer (Android)
   - **Tablet Portrait**: Tab bar (iOS) or drawer (Android)
   - **Tablet Landscape**: Sidebar (iOS) or drawer (Android)
   - **Desktop**: Persistent sidebar
   - **TV**: D-pad only (no navigation chrome)

3. **Typography Scaling**
   ```typescript
   const fontSize = Platform.select({
     ios: 16,
     android: 16,
     web: 16,
     tv: 36,  // 10-foot UI
   }) * (gloveModeActive ? 1.2 : 1.0);
   ```

### 8.2 Accessibility Strategy

**WCAG 2.1 AA Compliance Goals:**

1. **Perceivable**
   - ✅ Color contrast ratio > 4.5:1 (day/night modes)
   - ✅ Color contrast ratio > 3:1 (red-night mode, lower due to wavelength)
   - ✅ Text resizing up to 200% without loss of functionality
   - ✅ Non-text content has text alternatives (icon labels)

2. **Operable**
   - ✅ Keyboard navigation on desktop (Tab, Enter, Esc, Arrow keys)
   - ✅ Touch targets ≥ 44pt (iOS HIG minimum)
   - ✅ No time limits on interactions (except alarms)
   - ✅ Voice control as alternative input method

3. **Understandable**
   - ✅ Consistent navigation patterns across platforms
   - ✅ Error messages clear and actionable
   - ✅ Voice confirmations for all critical actions
   - ✅ Help documentation accessible in-app

4. **Robust**
   - ✅ Screen reader support (iOS VoiceOver, Android TalkBack)
   - ✅ Semantic HTML on web (proper heading hierarchy)
   - ✅ ARIA labels on interactive elements
   - ✅ Platform-native accessibility APIs used

**Screen Reader Support:**

```typescript
<TouchableOpacity
  accessible={true}
  accessibilityLabel="Depth: 42.5 feet, Normal"
  accessibilityRole="button"
  accessibilityHint="Double tap to configure depth settings"
>
  <DepthWidget value={42.5} unit="ft" />
</TouchableOpacity>
```

**Keyboard Navigation (Desktop/Web):**

| Key | Action |
|-----|--------|
| **Tab** | Move focus to next element |
| **Shift+Tab** | Move focus to previous element |
| **Enter** | Activate focused element |
| **Esc** | Close modal/dialog |
| **Arrow Keys** | Navigate within widget grid |
| **Cmd+S** | Save settings |
| **Cmd+,** | Open settings |

**Voice Navigation:**

- All interactive elements accessible via voice commands
- Screen reader integration for voice output
- Voice command help available: "What can I say?"

**Motor Impairment Support:**

- Glove mode benefits users with reduced dexterity
- Voice control eliminates need for precise touch
- Switch control support (iOS/Android accessibility feature)

---

## 9. Implementation Guidance

### 9.1 Completion Summary

**Phase-Based Implementation Roadmap:**

This UX Design Specification serves as the tactical design reference for the **UX Incremental Implementation Roadmap** (see docs/UX-INCREMENTAL-IMPLEMENTATION-ROADMAP.md for detailed sprint plans).

**Implementation Sequence:**

1. **Phase 0: Critical Fixes** (Weeks 1-2)
   - Fix red-night mode violations
   - Create feature flag system
   - Complete Epic 9 prerequisites

2. **Phase 1: Settings Dialogs** (Weeks 3-6)
   - Unified settings modal system
   - Platform input components
   - Keyboard navigation support

3. **Phase 2: Glove Mode System** (Weeks 7-11)
   - Store consolidation
   - Navigation session-triggered density
   - Dashboard adaptation

4. **Phase 3: Platform Chrome** (Weeks 12-19)
   - iOS/Android/Web/TV navigation
   - Platform-specific icons
   - Screen migrations

5. **Phase 4: Multi-Device Coordination** (Weeks 20-26)
   - BLE proximity detection
   - Device pairing and sync
   - Role-based dashboards

6. **Phase 5: TV Platform** (Weeks 27-32)
   - 10-foot UI implementation
   - D-pad navigation
   - Auto-cycling displays

**Design-in-Code Workflow:**

- **Storybook** - Component visual testing and documentation
- **WiFi Bridge Simulator** - Real NMEA data scenario testing
- **Feature Flags** - Safe incremental rollout
- **Parallel Code Paths** - Maintain working app during migration

**Testing Strategy:**

- Unit tests: Component logic validation
- Integration tests: WiFi Bridge simulator scenarios
- Visual tests: Storybook snapshot testing
- Accessibility tests: Screen reader compatibility
- User acceptance testing: Beta testers on real boats

**Success Metrics:**

- Red-night mode 100% compliant (0 violations)
- Settings configuration 67% faster (3 taps vs 7)
- Glove mode 64pt touch targets achieved
- Platform navigation consistency 100%
- Multi-device sync < 1 second latency
- TV readability validated from 10 feet

**Next Steps:**

1. Review this UX specification with development team
2. Reference alongside Implementation Roadmap for sprint planning
3. Use component specifications for development
4. Validate designs with Storybook
5. Test incrementally with WiFi Bridge simulator

---

## Appendix

### Related Documents

- **Product Requirements:** `docs/prd.md` (v2.0) - Complete functional specifications
- **Product Brief:** `docs/brief.md` (v1.1) - Vision, target market, value proposition
- **Architecture:** `docs/architecture.md` (v1.2) - Technical architecture decisions
- **Implementation Roadmap:** `docs/UX-INCREMENTAL-IMPLEMENTATION-ROADMAP.md` (v1.0) - Phase-by-phase execution plan
- **Strategic UX:** `docs/VIP-PLATFORM-UX-STRATEGY.md` (v2.0) - Multi-device ecosystem vision
- **Tactical UX:** `docs/VIP-UX-IMPLEMENTATION-GUIDE.md` (v1.0) - Platform Chrome implementation details
- **Settings Refactor:** `docs/SETTINGS-DIALOGS-CROSS-PLATFORM-IMPLEMENTATION.md` - Unified settings system spec
- **Refactoring Plan:** `docs/REFACTORING-PLAN-VIP-PLATFORM.md` (v1.0) - 8-sprint technical migration plan

### Core Interactive Deliverables

This UX Design Specification was created through visual collaboration and design-in-code workflow:

- **Color Theme Visualizer**: `docs/ux-color-themes.html`
  - Interactive HTML showing all three theme modes (Day, Night, Red-Night)
  - Live widget examples in each theme
  - Color contrast validation
  - Red-night compliance verification

- **Design Direction Mockups**: `docs/ux-design-directions.html`
  - Interactive HTML with platform-specific navigation patterns
  - iOS tab bar, Android drawer, Web sidebar, TV D-pad
  - Dashboard vs Planning mode comparison
  - Glove mode density visualization
  - Voice interaction flows

- **Component Storybook**: Run `npm run storybook`
  - All marine core components
  - Platform chrome variants
  - Interactive density toggle
  - Theme switcher
  - Accessibility inspector

### Design Assets

**Icon System:**
- iOS: SF Symbols (built into iOS SDK)
- Android: Material Icons (`react-native-vector-icons`)
- Custom Marine Icons: SVG assets in `src/assets/icons/marine/`

**Typography:**
- iOS: SF Pro (system font)
- Android: Roboto (system font)
- Web: System UI fonts
- Fallback: Monospace for numeric values

**Color Tokens:**
- Source: `src/theme/colors.ts`
- Day theme: Full spectrum
- Night theme: Reduced blue light
- Red-night theme: 625nm wavelength only

### Testing Resources

**WiFi Bridge Simulator Scenarios:**
1. `idle-at-marina` - Native density testing
2. `underway-manual` - Glove mode activation
3. `underway-autopilot` - Autopilot control testing
4. `shallow-water-alarm` - Alarm system testing
5. `end-navigation-return-to-marina` - Mode deactivation

**Platform Testing Checklist:**
- [ ] iPhone (portrait/landscape)
- [ ] iPad (portrait/landscape)
- [ ] Android phone (portrait/landscape)
- [ ] Android tablet (portrait/landscape)
- [ ] Desktop (Chrome, Safari, Firefox)
- [ ] Web mobile (responsive)
- [ ] Apple TV (1080p, 4K)
- [ ] Android TV (Fire TV)

### Version History

| Date | Version | Changes | Author |
|------|---------|---------|--------|
| 2025-11-20 | 1.0 | Initial UX Design Specification | Pieter |

---

_This UX Design Specification was created through the BMad Method Create UX Design workflow, combining strategic vision, tactical implementation details, and design-in-code principles. All decisions are documented with rationale and validated through iterative testing._

**Status:** ✅ COMPLETE - Ready for implementation reference

**Companion Documents:**
- **Implementation Roadmap** (docs/UX-INCREMENTAL-IMPLEMENTATION-ROADMAP.md) - Sprint-by-sprint execution plan
- **Strategic Vision** (docs/VIP-PLATFORM-UX-STRATEGY.md) - Long-term multi-device platform goals
