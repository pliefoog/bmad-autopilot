# VIP Platform: Cross-Platform UX Strategy
## Vessel Intelligence Platform - Frictionless Multi-Device Experience

**Document Version:** 2.0
**Created:** 2025-10-20
**Author:** Sally (UX Expert) + Pieter (Product Vision)
**Status:** Strategic Framework

---

## Executive Summary

This document defines the UX strategy for evolving the Boating Instruments App into **VIP - Vessel Intelligence Platform**, a voice-first, multi-device marine intelligence ecosystem that serves:

- 📱 **Phones** - Portable monitoring, voice interaction, personal device
- 📋 **Tablets** - Helm station primary display, glove-friendly operation
- 💻 **Desktop/PC** - Planning, configuration, playback analysis
- 🌐 **Web** - Remote monitoring, responsive across devices
- 📺 **Smart TV** - Salon/cabin awareness displays, 10-foot UI
- ⌚ **Smartwatch** - Voice autopilot control, quick glance metrics
- 📷 **IP Cameras** - Visual MOB tracking, situational awareness
- 🔊 **Voice** - Audio-first interaction, hands-free operation

**Critical Insight from VIP Vision:**
> "Information reaches out to the right person when really needed" (vs user going to information)

**Key Strategic Pillars:**

1. **Multi-Device Coordination** - Devices work together, not independently
2. **Mode-Based Interaction Density** - Dashboard/Glove mode (sparse) vs Planning mode (dense)
3. **Platform-Native Patterns** - iOS/Android/tvOS/Web conventions honored
4. **Voice-First, Visual-Available** - Don't force eyes to screens
5. **Context-Aware Intelligence** - BLE proximity + role profiles + AI
6. **Frictionless Experience** - Zero configuration, intuitive navigation
7. **Offline-First Architecture** - Marine reality demands local intelligence

---

## Table of Contents

1. [Multi-Device Ecosystem Architecture](#1-multi-device-ecosystem-architecture)
2. [Mode-Based Interaction Strategy](#2-mode-based-interaction-strategy)
3. [Platform-Native Design Alignment](#3-platform-native-design-alignment)
4. [Navigation Patterns by Platform](#4-navigation-patterns-by-platform)
5. [Glove-Friendly Design System](#5-glove-friendly-design-system)
6. [Voice Integration Strategy](#6-voice-integration-strategy)
7. [Frictionless Experience Design](#7-frictionless-experience-design)
8. [Implementation Roadmap](#8-implementation-roadmap)

---

## 1. Multi-Device Ecosystem Architecture

### 1.1 The Vision: Collaborative Intelligence, Not Isolated Apps

**Traditional Approach (What We're NOT Building):**
```
[Phone App] ← User switches → [Tablet App] ← User switches → [TV App]
   ↓ Independent           ↓ Independent         ↓ Independent
  Local data             Local data            Local data
```

**VIP Platform Approach (What We ARE Building):**
```
                    [VIP Intelligence Core]
                    - Shared NMEA data stream
                    - Voice co-pilot brain
                    - BLE proximity awareness
                    - Unified state management
                            ↓
        ┌──────────────────┼──────────────────┐
        ↓                  ↓                   ↓
    [Phone]           [Tablet]              [TV]
  Voice control    Helm display       Salon monitor
  Personal view    Glove mode         Auto-cycling
        ↓                  ↓                   ↓
    [Watch]          [Camera]           [Speakers]
  Quick control   MOB tracking      Audio alerts
```

**Key Principle:** One intelligence, multiple interfaces

---

### 1.2 Device Roles in the Ecosystem

| Device | Primary Role | Interaction Mode | Always On? | Data Role |
|--------|-------------|------------------|------------|-----------|
| **Tablet (Helm)** | Primary helm instrument | Touch (glove), Voice | Yes | Primary display |
| **Phone (Crew)** | Personal monitoring, Voice UI | Touch, Voice | Pocket | BLE tag, Voice input |
| **TV (Salon/Cockpit)** | Passive awareness, Ambient | Remote, Voice, Auto | Yes | Secondary display |
| **Watch** | Quick commands, Glance | Voice, Haptic | Wrist | Voice input, Alerts |
| **Desktop** | Planning, Config, Analysis | Mouse, Keyboard | No | Data sink, Config |
| **Web** | Remote monitoring | Touch, Mouse, Keyboard | No | Read-only view |
| **Cameras** | Visual intelligence | Passive | Yes | Visual data source |
| **Speakers** | Audio delivery | Passive | Yes | Audio output |

---

### 1.3 Multi-Device Scenarios from Brainstorming Research

#### **Scenario 1: MOB Emergency (Camera Integration)**
*Source: brainstorming-camera-integration.md*

```
EVENT: Crew member falls overboard
  ↓
[Phone (BLE)] Detects signal loss → Triggers MOB alarm
  ↓
[VIP Core] Marks waypoint, calculates return course
  ↓
[Cameras] PTZ auto-positions to last known GPS position
  ↓
[Tablet (Helm)] Shows camera feed + rescue pattern overlay
  ↓
[TV (Cockpit)] Full-screen camera view for deck crew
  ↓
[Watch] Haptic alert + voice: "Man overboard, port side"
  ↓
[Speakers] "MOB port side, autopilot engaging rescue pattern"
  ↓
[Autopilot] Executes heave-to or figure-8 pattern
```

**Multi-Device Coordination:**
- **No user input required** - system orchestrates all devices automatically
- **Each device serves its role** - helm sees navigation, crew sees camera, watch alerts helmsman
- **Unified intelligence** - one detection event triggers coordinated response

---

#### **Scenario 2: Proximity-Based Dashboard (BLE + VIP)**
*Source: brainstorm-session-VIP-platform-2025-10-19.md*

```
Captain walks from salon to helm with phone in pocket
  ↓
[Phone (BLE)] Broadcasts "Captain" role profile
  ↓
[Tablet (Helm)] Detects captain proximity (BLE)
  ↓
[Tablet Display] Switches to "Captain View"
  - Autopilot control prominent
  - Navigation data (heading, COG, SOG, ETA)
  - Wind instruments
  - Compass widget large
  ↓
[Voice] "Good morning Pieter, autopilot engaged on heading 280°, ETA to harbor 2 hours 15 minutes"
```

**Alternative: Engineer Approaches Engine Room Display**
```
Engineer walks to engine room with phone
  ↓
[Phone (BLE)] Broadcasts "Engineer" role profile
  ↓
[Display] Switches to "Systems View"
  - Engine vitals (RPM, temp, oil pressure)
  - Battery voltage and charging
  - Tanks levels
  - Generator status
  ↓
[Voice] "Port engine running at 2400 RPM, coolant 85°C, all systems normal"
```

**Key UX Principles:**
- **No manual dashboard switching** - system knows who you are and where you are
- **Contextual intelligence** - right information for right person at right place
- **Voice confirmation** - audio feedback reinforces visual transition

---

#### **Scenario 3: Voice-First Interaction (VIP Co-Pilot)**
*Source: brainstorm-session-VIP-platform-2025-10-19.md*

```
Helmsman (hands on wheel, eyes on horizon):
  "Hey Navigator, what's our ETA?"
    ↓
  [Watch] Captures voice (closest microphone)
    ↓
  [VIP Core] Processes query, calculates answer
    ↓
  [Speakers] "2 hours 15 minutes at current speed"
    ↓
  [Tablet] Briefly shows ETA widget (visual confirmation)
```

**Key Insight:** Audio-first, visual-available
- **Hands stay on wheel** - no need to touch screen
- **Eyes stay on horizon** - no need to look at display
- **Visual available** - glance confirms if desired
- **Works with gloves** - voice doesn't need fine motor control

---

### 1.4 Device State Synchronization

**What Gets Synchronized:**
- ✅ **NMEA data stream** - All devices see same sensor data
- ✅ **Alarm states** - Acknowledge on one device, dismisses everywhere
- ✅ **Voice interactions** - Query on watch, answer on speakers, visual on tablet
- ✅ **Dashboard preferences** - Pin widget on tablet, reflected on phone
- ✅ **Navigation session** - Start on phone, tracked across all devices
- ✅ **MOB detection** - BLE tag loss triggers all device responses
- ✅ **Camera feeds** - Select camera on tablet, appears on TV too

**What Stays Local:**
- ❌ **Current page** - Phone on page 1, tablet on page 2 independently
- ❌ **Zoom level** - Desktop can zoom chart, phone stays at different zoom
- ❌ **Screen brightness** - Each device adjusts for its environment
- ❌ **Audio volume** - TV loud, phone quiet independently
- ⚠️ **Role profiles** - Tied to person (BLE), not device

**Technical Architecture:**
```typescript
// Centralized state (Zustand store + broadcast)
const sharedState = {
  nmeaData: <real-time stream>,
  alarms: <active alarms>,
  navigationSession: <underway/anchored/docked>,
  mobEvents: <MOB detections>,
  voiceInteractions: <recent queries>,
}

// Device-local state
const deviceState = {
  currentPage: <page index>,
  zoomLevel: <chart zoom>,
  brightness: <screen brightness>,
  volume: <audio volume>,
}

// Person-specific state (follows via BLE)
const personState = {
  roleProfile: 'captain' | 'engineer' | 'crew',
  dashboardPreference: <widget layout>,
  proactivityLevel: 'high' | 'medium' | 'low',
}
```

---

## 2. Mode-Based Interaction Strategy

### 2.1 The Core Insight: Not All Tasks Are Equal

**Pieter's Key Observation:**
> "Glove support when mounted at helm is important - even below deck in Dashboard mode. But in Planning mode it can be a more dense UI."

**Two Fundamentally Different Modes:**

| Mode | Context | User State | Priority | UI Density | Input Method |
|------|---------|-----------|----------|------------|--------------|
| **Dashboard Mode** | Underway, at helm, monitoring | Eyes on horizon, hands on wheel/lines | Speed, Glanceability | Sparse (44-56pt targets) | Touch (gloves), Voice |
| **Planning Mode** | Marina, salon, pre-departure | Focused on screen, seated | Precision, Detail | Dense (standard targets) | Touch (fingers), Mouse, Keyboard |

---

### 2.2 Dashboard Mode (Glove-Friendly, Sparse, Voice-Enabled)

**Use Cases:**
- Monitoring instruments while underway
- Quick helm adjustments
- Responding to alarms
- Checking critical metrics (depth, speed, wind)

**Design Constraints:**
- ✅ **Large touch targets** - 56×56pt minimum (tablet), 44×44pt (phone)
- ✅ **High contrast** - Day mode optimized for sunlight
- ✅ **Minimal scrolling** - Critical data visible without interaction
- ✅ **Voice-first** - Most actions accessible via voice commands
- ✅ **Swipe gestures** - Large gesture thresholds (120px+ for gloves)
- ✅ **No precision required** - Tap zones generous, forgiving
- ✅ **No keyboards** - Voice input for text entry
- ✅ **Auto-cycling** - TV/large displays rotate automatically

**Visual Density:**
```
PHONE (Dashboard Mode):
┌────────────────────────┐
│  CONNECTION STATUS     │ ← 60px header (large touch)
├────────────────────────┤
│                        │
│      ┌──────────┐      │ ← Single large widget
│      │          │      │   (fills screen)
│      │  DEPTH   │      │
│      │  42.5 ft │      │   96pt value
│      │          │      │   Easy to read at glance
│      └──────────┘      │
│                        │
│     ●  ○  ○  ○         │ ← Large pagination dots
├────────────────────────┤
│   AUTOPILOT FOOTER     │ ← 88px footer (large buttons)
└────────────────────────┘
```

```
TABLET (Dashboard Mode - Helm):
┌──────────────────────────────────────┐
│  CONNECTION  [≡]  ALARMS  [ HELP ]   │ ← 60px header
├──────────────────────────────────────┤
│  ┌─────────┐  ┌─────────┐  ┌──────┐ │
│  │ DEPTH   │  │ SPEED   │  │ WIND │ │ ← 2×2 grid
│  │ 42.5 ft │  │ 6.2 kts │  │ 15kt │ │   Large widgets
│  │         │  │         │  │ 45°  │ │   Generous spacing
│  └─────────┘  └─────────┘  └──────┘ │
│                                      │
│  ┌─────────┐  ┌─────────┐  ┌──────┐ │
│  │ GPS     │  │ COMPASS │  │ BATT │ │
│  │41°24'N  │  │  280°T  │  │ 12.8V│ │
│  └─────────┘  └─────────┘  └──────┘ │
│            ●  ●  ○  ○                │ ← Large dots
├──────────────────────────────────────┤
│       AUTOPILOT CONTROL              │ ← 88px footer
│   [  -10°  ] [ 280° ] [  +10°  ]    │   Large buttons
└──────────────────────────────────────┘
```

**Interaction Patterns:**
- **Tap**: Expand widget (no precision needed, large target)
- **Long press**: Widget menu (3-finger tap safe area)
- **Swipe**: Page navigation (120px+ threshold for gloves)
- **Voice**: "Show depth and speed" (hands-free)
- **Pinch**: NOT USED (gloves can't pinch reliably)
- **Drag**: NOT USED (gloves imprecise, accidental drags)

---

### 2.3 Planning Mode (Precision, Dense, Mouse/Keyboard-Optimized)

**Use Cases:**
- Pre-departure route planning
- Dashboard layout customization
- Alarm threshold configuration
- Playback analysis
- System settings
- Detailed chart work

**Design Constraints:**
- ✅ **Standard touch targets** - 40×40pt (still accessible but denser)
- ✅ **Scrolling acceptable** - More info than fits on screen is OK
- ✅ **Precision inputs** - Number fields, sliders, text entry
- ✅ **Multi-step workflows** - Wizards, tabs, nested menus acceptable
- ✅ **Mouse/keyboard optimized** - Hover states, right-click, keyboard shortcuts
- ✅ **Dense information** - Tables, lists, detailed text
- ✅ **Multi-window** - Split screen, overlays, modals

**Visual Density:**
```
DESKTOP (Planning Mode):
┌─────────────────────────────────────────────────────────┐
│ File  Edit  View  Voyage  Settings  Help               │ ← Menu bar
├──────┬──────────────────────────────────────────┬───────┤
│      │ Route Planning                           │ Widge │
│ NAV  │  ┌─────────────────────────────────┐    │ Libra │
│ ├ Ro │  │                                 │    │       │
│ ├ Wa │  │   CHART DISPLAY                │    │  Dep  │
│ ├ MO │  │   (dense, zoomable)            │    │  Spe  │
│ └ Hi │  │                                 │    │  Win  │
│      │  └─────────────────────────────────┘    │  GPS  │
│ SYS  │                                          │  Com  │
│ ├ Al │  Waypoint List:                         │  ...  │
│ ├ Co │  [+ Add] [Edit] [Delete]               │       │
│ └ Lo │  ┌────────────────────────────────┐    │ [Pre  │
│      │  │WP1  41°24.5'N  70°12.3'W  0.5nm│    │       │
│      │  │WP2  41°26.8'N  70°15.1'W  2.3nm│    │ Drag  │
│      │  │WP3  41°30.2'N  70°18.4'W  1.8nm│    │ widge │
│      │  └────────────────────────────────┘    │ to    │
└──────┴──────────────────────────────────────────┴───────┘
```

**Interaction Patterns:**
- **Click**: Select, activate
- **Double-click**: Edit, drill-down
- **Right-click**: Context menus
- **Hover**: Tooltips, previews, highlights
- **Drag-and-drop**: Rearrange widgets, waypoints
- **Keyboard**: Arrow keys (navigate), Enter (confirm), Esc (cancel), Shortcuts (Cmd+S save)
- **Scroll**: Lists, charts, content
- **Pinch/zoom**: Chart manipulation (if touch)

---

### 2.4 Mode Switching Triggers

**Automatic Mode Detection:**
```typescript
const detectMode = (context: AppContext): 'dashboard' | 'planning' => {
  // Navigation session active → Dashboard mode
  if (context.navigationSession.active) {
    return 'dashboard';
  }

  // Desktop/Web platform → Planning mode
  if (context.platform === 'desktop' || context.platform === 'web') {
    return 'planning';
  }

  // Specific screens force planning mode
  if (context.currentScreen in ['RouteEditor', 'Settings', 'Playback', 'Configuration']) {
    return 'planning';
  }

  // Default based on platform
  if (context.platform === 'tablet' && !context.navigationSession.active) {
    return 'planning'; // Docked, pre-departure planning
  }

  return 'dashboard'; // Safe default
};
```

**Manual Mode Toggle (Advanced Users):**
- Settings: "Force Dashboard Mode" (always large targets, even when docked)
- Settings: "Force Planning Mode" (always dense UI, even underway - expert users)
- Default: Auto-detect (recommended for 95% of users)

**Visual Indicators:**
```
Dashboard Mode:  [🧤] Glove icon in status bar
Planning Mode:   [📋] Clipboard icon in status bar
```

---

### 2.5 Mode-Specific Component Variants

**Buttons:**
```typescript
// Dashboard Mode
<Button
  size="large"        // 56×56pt minimum
  fontSize={24}       // Large, readable
  padding={16}        // Generous hit area
  haptic={true}       // Tactile feedback for gloves
/>

// Planning Mode
<Button
  size="medium"       // 40×40pt standard
  fontSize={16}       // Normal size
  padding={8}         // Standard spacing
  hover={true}        // Hover state for mouse
/>
```

**Sliders:**
```typescript
// Dashboard Mode - NOT USED
// Sliders require precision - use +/- buttons or voice instead

// Planning Mode
<Slider
  trackHeight={4}     // Standard track
  thumbSize={20}      // Standard thumb
  step={1}            // Precise adjustment
  showValue={true}    // Display current value
/>
```

**Text Input:**
```typescript
// Dashboard Mode
<VoiceInput
  prompt="Say the new heading"
  fallback={<LargeNumericKeypad />}  // If voice fails
/>

// Planning Mode
<TextInput
  keyboard="default"   // Standard keyboard
  autocomplete={true}  // Smart suggestions
  validation={true}    // Real-time feedback
/>
```

---

## 3. Platform-Native Design Alignment

### 3.1 The Critical Question: How Native Should We Be?

**Pieter's Concern:**
> "I was wondering how far having a Hamburger menu to access settings aligns with common UI/UX experience on respective devices/platform. We need to assess if the experience is frictionless and aligns with common design patterns/language used on each platform."

**The Spectrum:**
```
Fully Native              Hybrid Approach           Cross-Platform Uniform
(Platform-specific UI)    (Adapt key patterns)      (Same UI everywhere)
        ↓                          ↓                         ↓
    iOS app looks          Core UI consistent,          Exactly same UI
    like iOS app          Navigation native          on all platforms
    Android looks      Respect platform idioms      (Brand consistency)
    like Android
        ↓                          ↓                         ↓
    PROS: Familiar      PROS: Recognizable,           PROS: Consistency,
    CONS: More code     balanced, maintainable        simple development
                        CONS: Compromise              CONS: Feels foreign
```

**VIP Recommendation: Hybrid Approach** ⭐

---

### 3.2 iOS Human Interface Guidelines Alignment

**What We MUST Adopt:**

✅ **Navigation Bar** (not hamburger menu on iOS)
```swift
// iOS users expect navigation bar at top
┌────────────────────────────┐
│  < Back    Title    [⚙️]   │ ← Standard iOS nav bar
├────────────────────────────┤
│  Content                   │
```

✅ **Tab Bar** for primary navigation (bottom on iPhone)
```swift
┌────────────────────────────┐
│  Content                   │
├────────────────────────────┤
│ [Dashboard] [Settings] [•••]│ ← Tab bar (iPhone)
└────────────────────────────┘
```

✅ **SF Symbols** for icons (iOS standard iconography)
- `gauge` for dashboard
- `gearshape` for settings
- `exclamationmark.triangle` for alarms
- `location` for GPS
- Native look and feel

✅ **Swipe Gestures**
- Swipe from left edge → Back navigation (universal iOS)
- Swipe left/right on content → Page navigation (custom, OK)
- Long press → Context menu (iOS 13+)

✅ **Haptic Feedback**
- Success: `.notificationSuccess`
- Warning: `.notificationWarning`
- Error: `.notificationError`
- Selection: `.selectionChanged`

✅ **Modals & Sheets**
- Settings → Sheet from bottom (drag to dismiss)
- Critical config → Modal (requires explicit dismiss)
- Quick actions → Action sheet

**What We Can Customize:**
- ⚠️ **Color scheme** - Marine-specific (blue/orange/red) vs iOS blue
- ⚠️ **Typography** - San Francisco font is mandatory, but sizes flexible
- ⚠️ **Widget design** - Can be custom as long as interactions feel iOS-native

**iOS-Specific Features to Leverage:**
- **3D Touch / Haptic Touch** - Preview widgets on long press
- **Today Widget** - Quick glance depth/speed on lock screen
- **Siri Shortcuts** - "Hey Siri, show depth" integration
- **CarPlay** (if applicable) - Helm display via CarPlay protocol?

---

### 3.3 Android Material Design Alignment

**What We MUST Adopt:**

✅ **Navigation Drawer** (hamburger menu is EXPECTED on Android)
```kotlin
// Android users expect hamburger menu
┌────────────────────────────┐
│  [≡]  Title         [⚙️]   │ ← App bar with drawer
├────────────────────────────┤
│  Content                   │

// Swipe from left or tap [≡] → Drawer
╔════════════════╗
║ 🏠 Dashboard   ║
║ ⚙️ Settings    ║
║ 📊 Analytics   ║
║ ℹ️ Help        ║
╚════════════════╝
```

✅ **Floating Action Button (FAB)** for primary action
```kotlin
┌────────────────────────────┐
│  Content                   │
│                            │
│                      [+]   │ ← FAB (bottom-right)
└────────────────────────────┘
// Example: Add widget, Start navigation
```

✅ **Material Icons** (Android standard iconography)
- `dashboard` for home
- `settings` for configuration
- `warning` for alarms
- Use Material Icons library, not SF Symbols

✅ **Bottom Navigation** (alternative to drawer for primary tabs)
```kotlin
┌────────────────────────────┐
│  Content                   │
├────────────────────────────┤
│ [Dashboard] [Settings] [•••]│ ← Material bottom nav
└────────────────────────────┘
// Similar to iOS but Material styling
```

✅ **Snackbar** for notifications (not toast)
```kotlin
┌────────────────────────────┐
│  Content                   │
│                            │
│  Alarm dismissed  [UNDO]   │ ← Snackbar (bottom)
└────────────────────────────┘
```

**Android-Specific Features to Leverage:**
- **Foreground Service** - Persistent navigation session notification
- **Widgets** - Home screen widgets for quick glance
- **Assistant Integration** - "OK Google, what's the depth"
- **Back Button** - Hardware/gesture back navigation (must support)

---

### 3.4 tvOS Design Guidelines Alignment

**What We MUST Adopt:**

✅ **Focus Engine** (d-pad navigation with focus outline)
```swift
┌────────────────────────────────────┐
│  ╔════════╗  ┌────────┐  ┌──────┐ │
│  ║ DEPTH  ║  │ SPEED  │  │ WIND │ │ ← Thick focus ring
│  ║ 42.5ft ║  │ 6.2kts │  │ 15kt │ │   on selected widget
│  ╚════════╝  └────────┘  └──────┘ │
```

✅ **Large Typography** (10-foot viewing distance)
- 36pt minimum body text
- 72-96pt primary values
- No text smaller than 24pt

✅ **Top Shelf** (featured content at top of app launcher)
- Show current vessel status summary
- "42.5ft depth, 6.2kts, All systems normal"

✅ **Menu Button Behavior**
- Menu press → Back/Exit screen
- Menu long-press → App switcher
- Must handle gracefully

**tvOS-Specific Constraints:**
- ❌ **No touch** - Remote control only (Siri Remote, third-party)
- ❌ **No keyboard** - Voice input or on-screen keyboard
- ✅ **Voice always available** - Siri button on remote
- ✅ **Screensaver integration** - Ambient mode after inactivity

---

### 3.5 Web Browser Best Practices

**What We MUST Adopt:**

✅ **Responsive Breakpoints** (not just mobile/tablet/desktop)
- 320px - Small phone
- 480px - Phone
- 768px - Tablet portrait
- 1024px - Tablet landscape / small laptop
- 1280px - Desktop
- 1920px - Large desktop

✅ **Keyboard Accessibility**
- Tab navigation through interactive elements
- Enter/Space to activate buttons
- Escape to close modals
- Arrow keys for lists/grids

✅ **Mouse Interactions**
- Hover states for all interactive elements
- Cursor changes (pointer, grab, etc.)
- Right-click context menus (where appropriate)
- Scroll wheel for page navigation

✅ **Progressive Web App (PWA)**
- Installable to home screen
- Offline capability (service worker)
- App-like fullscreen mode
- Push notifications (for alarms)

---

### 3.6 Cross-Platform Design System

**The VIP Design Language** (Common Across All Platforms)

**Core Components that Stay Consistent:**
```
✅ Widget visual design (rounded corners, elevation, marine theme)
✅ Color palette (day/night/red-night modes)
✅ Icon metaphors (compass, depth, wind) - but platform-specific icon libs
✅ Typography scale (8pt grid, size ratios) - but platform-specific fonts
✅ Marine-specific interactions (alarm handling, autopilot control)
```

**Components that Adapt to Platform:**
```
⚠️ Navigation (iOS nav bar vs Android drawer vs TV focus)
⚠️ Modals (iOS sheets vs Android dialogs vs TV full-screen)
⚠️ Input methods (iOS keyboard vs Android keyboard vs TV remote)
⚠️ Iconography (SF Symbols vs Material Icons vs custom for TV)
⚠️ Buttons (iOS rounded vs Material raised vs TV focus)
```

**Component Mapping Table:**

| UI Pattern | iOS | Android | tvOS | Web | Desktop |
|-----------|-----|---------|------|-----|---------|
| **Primary Nav** | Tab Bar | Drawer + Bottom Nav | Top Menu | Responsive (Drawer → Tabs) | Sidebar |
| **Secondary Nav** | Nav Bar | App Bar | N/A | Header | Menu Bar |
| **Settings Access** | Tab / Nav button | Drawer item | Menu → Settings | Header icon | Menu → Preferences |
| **Widget Menu** | Long press → Sheet | Long press → Dialog | Select → Options | Right-click → Menu | Right-click → Context |
| **Notifications** | Banner | Snackbar | Alert overlay | Toast | System notification |
| **Modals** | Sheet (bottom) | Dialog (center) | Full screen | Modal (overlay) | Window / Dialog |

---

## 4. Navigation Patterns by Platform

### 4.1 iOS Navigation Architecture

**Information Architecture:**
```
Tab Bar (Bottom - iPhone) or Sidebar (iPad)
├─ 🏠 Dashboard
│  ├─ Page 1 (widgets 1-2)
│  ├─ Page 2 (widgets 3-4)
│  └─ Page 3 (widgets 5-6)
│
├─ ⚓ Autopilot (if active navigation session)
│  └─ Full-screen autopilot control
│
├─ 🔔 Alarms (badge shows count)
│  ├─ Active alarms
│  └─ Alarm history
│
├─ ⚙️ Settings
│  ├─ Connection
│  ├─ Widgets
│  ├─ Alarms Config
│  ├─ Display & Theme
│  └─ About
│
└─ ••• More
   ├─ 📊 Analytics
   ├─ 📷 Cameras (if available)
   ├─ 📖 Help
   └─ 🔒 Privacy
```

**Navigation Flows:**

**Scenario 1: Check depth while sailing**
```
User in: Dashboard Tab → Page 1 (depth visible)
  → Glance at value (no interaction)
  → Continue sailing
```

**Scenario 2: Adjust autopilot heading**
```
User in: Dashboard Tab
  → Tap Autopilot tab (bottom bar)
  → Autopilot control screen (full screen)
  → Tap +10° button (large, glove-friendly)
  → Haptic feedback confirms
  → Swipe down or tap Dashboard tab to return
```

**Scenario 3: Configure alarm threshold**
```
User in: Dashboard Tab
  → Tap Settings tab
  → Tap "Alarms Config"
  → Tap "Shallow Water Alarm"
  → Adjust threshold slider (planning mode - precise)
  → Tap "Save"
  → Nav bar "< Back" → Settings
  → Tap Dashboard tab → Return to monitoring
```

**Gesture Navigation:**
- ✅ **Swipe left/right** on dashboard → Navigate pages (custom)
- ✅ **Swipe from left edge** → Back navigation (iOS standard)
- ✅ **Pull down** on dashboard → Refresh NMEA connection
- ✅ **Long press widget** → Widget context menu
- ✅ **Pinch zoom** → NOT USED (glove mode)

---

### 4.2 Android Navigation Architecture

**Information Architecture:**
```
Navigation Drawer (Hamburger menu)
├─ 🏠 Dashboard (default screen)
│  ├─ Page 1, 2, 3... (swipe)
│  └─ [+ FAB] Add widget
│
├─ ⚓ Autopilot (during navigation session)
│
├─ 🔔 Alarms
│
├─ 📊 Analytics
│
├─ 📷 Cameras
│
├─ ⚙️ Settings
│  ├─ Connection
│  ├─ Widgets
│  ├─ Alarms
│  ├─ Display
│  └─ About
│
├─ 📖 Help
└─ ℹ️ About

Bottom Navigation (Alternative - 3-5 primary items):
[🏠 Dashboard] [⚓ Autopilot] [🔔 Alarms] [⚙️ Settings] [••• More]
```

**Navigation Flows:**

**Scenario 1: Access settings**
```
User in: Dashboard
  → Tap [≡] hamburger menu (top-left)
  → Drawer slides in from left
  → Tap "Settings"
  → Settings screen
  → Press Back button (hardware/gesture) → Dashboard
```

**Scenario 2: Add new widget**
```
User in: Dashboard (page 2)
  → Tap [+] FAB (bottom-right, prominent)
  → Widget selector modal/bottom sheet
  → Tap "Wind Widget"
  → Widget added to current page
  → Modal dismisses → Back to dashboard
```

**Key Differences from iOS:**
- ✅ **Drawer expected** (hamburger is Android idiom)
- ✅ **FAB for primary action** (add widget)
- ✅ **Back button** must work everywhere (hardware or gesture)
- ✅ **Snackbar** for undo actions ("Widget removed" [UNDO])

---

### 4.3 tvOS Navigation Architecture

**Information Architecture:**
```
Top Menu Bar (Apple TV style)
┌─────────────────────────────────────┐
│ [Dashboard] [Autopilot] [Settings]  │ ← Focus navigable menu
└─────────────────────────────────────┘

Dashboard Screen:
┌─────────────────────────────────────┐
│        DEPTH    SPEED    WIND       │
│        42.5ft   6.2kts   15kt       │ ← Large, focused navigation
│                                     │
│        GPS      COMPASS  BATTERY    │
│      41°24'N    280°T    12.8V     │
│                                     │
│              ●  ●  ○  ○             │ ← Page dots
└─────────────────────────────────────┘
```

**D-Pad Navigation:**
```
Arrow Keys:
  ↑ → Move focus up (widget grid)
  ↓ → Move focus down
  ← → Previous page (when at edge) OR move focus left
  → → Next page (when at edge) OR move focus right

Select (Center button):
  → Expand focused widget to full-screen

Menu Button:
  → Back/Exit current screen
  → Long press → App switcher (tvOS system)

Play/Pause:
  → Toggle auto-cycling (custom feature)
```

**Focus Optimization:**
```typescript
// Focus memory - return to last focused widget
const focusMemory = {
  dashboard: {
    page: 2,
    widget: 'speed',
  }
};

// When returning to dashboard, restore focus
focusEngine.setFocus(focusMemory.dashboard.widget);
```

---

### 4.4 Desktop/Web Navigation Architecture

**Information Architecture:**
```
Menu Bar (macOS) or Toolbar (Windows/Web)
┌─────────────────────────────────────────┐
│ File  View  Voyage  Tools  Window  Help│
└─────────────────────────────────────────┘

OR

Web Header
┌─────────────────────────────────────────┐
│ [≡] VIP Platform    [Dashboard ▼] [⚙️] │
└─────────────────────────────────────────┘

Sidebar + Main Content
┌──────┬──────────────────────────────────┐
│ NAV  │                                  │
│ 🏠 Da│  Main Content Area               │
│ ⚓ Au│  (Dashboard, Settings, etc)      │
│ 🔔 Al│                                  │
│ 📊 An│                                  │
│ 📷 Ca│                                  │
│ ⚙️ Se│                                  │
│ 📖 He│                                  │
└──────┴──────────────────────────────────┘
```

**Mouse + Keyboard Interactions:**

**Keyboard Shortcuts:**
```
Global:
  Cmd/Ctrl + 1     → Dashboard
  Cmd/Ctrl + 2     → Autopilot
  Cmd/Ctrl + 3     → Alarms
  Cmd/Ctrl + ,     → Settings (Mac convention)
  Cmd/Ctrl + S     → Save current config
  Cmd/Ctrl + P     → Start/stop playback
  Space            → Toggle autopilot (when focused)
  Escape           → Close modal/dialog
  Arrow keys       → Navigate pages, widgets
  Tab              → Navigate interactive elements

Widget Context Menu:
  Right-click widget → Context menu
    ├─ Expand
    ├─ Pin to top
    ├─ Configure
    ├─ Remove
    └─ Move to page...
```

**Hover States:**
```typescript
// Desktop-only hover interactions
<Widget
  onHover={() => showTooltip("Depth: 42.5ft - Last update 2s ago")}
  onHoverEnd={() => hideTooltip()}
/>

// Hover reveals additional controls
<WidgetHeader>
  <Title>Depth</Title>
  <HoverControls>  {/* Only visible on hover */}
    <IconButton icon="settings" />
    <IconButton icon="pin" />
    <IconButton icon="close" />
  </HoverControls>
</WidgetHeader>
```

---

## 5. Glove-Friendly Design System

### 5.1 Touch Target Sizes

**Marine Environment Reality:**
- Wet hands, gloves, motion, sunlight glare
- Precision is IMPOSSIBLE in 20-knot winds
- Forgiving UI is a SAFETY requirement

**Touch Target Standards:**

| Context | Min Size | Recommended | Spacing | Example |
|---------|----------|-------------|---------|---------|
| **Phone (No gloves)** | 44×44pt | 48×48pt | 8pt | Normal mobile UI |
| **Phone (Dashboard mode)** | 44×44pt | 56×56pt | 16pt | Large, forgiving |
| **Tablet (Helm - Glove mode)** | 56×56pt | 64×64pt | 16pt | Critical! |
| **TV (10-foot UI)** | 80×80pt | 100×100pt | 24pt | D-pad focus |
| **Desktop (Mouse)** | 32×32pt | 40×40pt | 4pt | Precision OK |

**Implementation:**
```typescript
// Glove-mode touch target expansion
const TouchTarget: React.FC<{
  mode: 'dashboard' | 'planning';
  platform: Platform;
  children: React.ReactNode;
}> = ({ mode, platform, children }) => {

  const size = useMemo(() => {
    if (mode === 'dashboard') {
      if (platform === 'tablet') return 64; // Helm station
      if (platform === 'phone') return 56;  // Portable
      if (platform === 'tv') return 100;    // 10-foot UI
    }
    // Planning mode - standard sizes
    return 40;
  }, [mode, platform]);

  return (
    <Pressable
      style={{
        minWidth: size,
        minHeight: size,
        padding: 8,
        justifyContent: 'center',
        alignItems: 'center',
      }}
      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }} // Extra forgiveness
    >
      {children}
    </Pressable>
  );
};
```

---

### 5.2 Gesture Thresholds

**Problem:** Gloves = Less precision, accidental touches

**Solution:** Increase gesture recognition thresholds

| Gesture | Standard | Glove Mode | Reasoning |
|---------|----------|------------|-----------|
| **Swipe threshold** | 50px | 120px | Prevent accidental swipes from hand motion |
| **Long press duration** | 500ms | 300ms | Faster activation (gloves make tapping harder) |
| **Double-tap timeout** | 300ms | DISABLED | Too hard with gloves, use single tap |
| **Tap vs drag distinction** | 10px | 20px | Allow more movement before registering drag |
| **Pinch zoom** | Enabled | DISABLED | Impossible with gloves |

**Implementation:**
```typescript
const GESTURE_CONFIG = {
  dashboard: {
    swipeThreshold: 120,      // px - large movement required
    longPressDuration: 300,   // ms - faster for gloves
    tapMaxMovement: 20,       // px - allow hand shake
    doubleTapEnabled: false,  // Disabled - too hard
    pinchEnabled: false,      // Disabled - gloves can't pinch
  },
  planning: {
    swipeThreshold: 50,       // px - standard
    longPressDuration: 500,   // ms - standard
    tapMaxMovement: 10,       // px - precise
    doubleTapEnabled: true,   // Enabled
    pinchEnabled: true,       // Enabled for zoom
  },
};

const useGestureConfig = (mode: 'dashboard' | 'planning') => {
  return GESTURE_CONFIG[mode];
};
```

---

### 5.3 Visual Feedback Enhancement

**Gloves reduce tactile feedback** → Enhance visual/audio/haptic cues

**Visual Feedback:**
```typescript
// Pressed state - very obvious
<Pressable
  style={({ pressed }) => ({
    backgroundColor: pressed
      ? theme.primaryDark    // Dark blue when pressed
      : theme.primary,       // Normal blue
    transform: pressed
      ? [{ scale: 0.95 }]    // Shrink slightly
      : [{ scale: 1.0 }],
    borderWidth: pressed ? 3 : 1,  // Thicker border
  })}
>
  <ButtonText>AUTOPILOT</ButtonText>
</Pressable>
```

**Haptic Feedback:**
```typescript
// Strong haptics for glove mode
import * as Haptics from 'expo-haptics';

const handlePress = () => {
  if (mode === 'dashboard') {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy); // Stronger
  } else {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); // Normal
  }

  onPress();
};
```

**Audio Feedback:**
```typescript
// Click sound for critical actions (optional, configurable)
import { Audio } from 'expo-av';

const playClickSound = async () => {
  const { sound } = await Audio.Sound.createAsync(
    require('./assets/sounds/click.mp3')
  );
  await sound.playAsync();
};

// Use for autopilot adjustments, alarm acknowledgments
```

---

### 5.4 Confirmation Dialogs for Critical Actions

**Gloves = Accidental taps** → Require confirmation for destructive/critical actions

**Confirmation Required:**
```typescript
// Critical actions that need confirmation in Dashboard mode
const CRITICAL_ACTIONS = [
  'Disengage autopilot',
  'Dismiss critical alarm',
  'Delete widget',
  'Clear navigation session',
  'Change autopilot heading by >20°',
];

// Dashboard mode confirmation (large, clear)
<ConfirmDialog
  title="Disengage Autopilot?"
  message="This will return helm control to manual steering."
  confirmText="DISENGAGE"    // Large button
  cancelText="CANCEL"        // Large button
  confirmColor="warning"     // Orange/red to indicate serious
  onConfirm={disengageAutopilot}
  buttonSize="large"         // 64pt tall buttons (glove-friendly)
/>
```

**Quick Actions (No confirmation):**
```typescript
// Safe actions that don't need confirmation
const SAFE_ACTIONS = [
  'Expand widget',
  'Navigate pages',
  'Adjust autopilot ±1-5°',  // Small adjustments safe
  'Snooze non-critical alarm',
  'Toggle display mode',
];
```

---

### 5.5 Lock Screen Mode (Prevent Accidental Touches in Rough Seas)

**Problem:** Heavy seas = device bouncing = accidental touches

**Solution:** Lock screen mode (requires deliberate unlock)

```typescript
<LockScreenOverlay visible={isLocked}>
  <LockIcon size={64} />
  <LockMessage>Screen Locked</LockMessage>
  <UnlockButton
    onLongPress={unlock}       // Long press to unlock (prevents accidental)
    longPressDuration={1000}   // 1 second hold required
  >
    Hold to Unlock
  </UnlockButton>
</LockScreenOverlay>

// Activation:
// - Automatic: After 5 minutes of no interaction while underway
// - Manual: "Lock Screen" button in dashboard (quick access)
// - Settings: "Auto-lock in heavy seas" (accelerometer-triggered)
```

---

## 6. Voice Integration Strategy

### 6.1 Voice-First Paradigm from VIP Vision

**Key Insight from VIP Brainstorming:**
> "Audio-first, visual-available - Don't make sailors choose between watching the horizon and watching a screen."

**Voice Capabilities by Device:**

| Device | Voice Input | Voice Output | Always Listening? | Primary Use |
|--------|-------------|--------------|-------------------|-------------|
| **Phone** | ✅ Microphone | ✅ Speaker | ⚠️ Background only | Personal commands, BLE tag |
| **Tablet (Helm)** | ✅ Microphone | ✅ Speaker | ✅ Yes (foreground service) | Primary voice interface |
| **Watch** | ✅ Microphone | ✅ Speaker (tiny) | ✅ Raise-to-speak | Quick commands, closest mic |
| **TV** | ✅ Remote mic / Siri | ✅ TV speakers | ⚠️ Wake word only | Salon queries, announcements |
| **Desktop** | ✅ Microphone | ✅ Speakers | ❌ No | Optional planning mode voice |
| **Cameras** | ❌ No | ❌ No | N/A | Visual only |
| **BT Headset** | ✅ Microphone | ✅ Headset speaker | ✅ Yes (critical!) | **Marine environment solution** |

---

### 6.2 Voice Commands by Context

**Dashboard Mode (Underway - Hands-Free Critical):**
```
Navigation Queries:
  "What's our ETA?"
  "What's the current depth?"
  "Show me wind speed"
  "How far to the waypoint?"

Autopilot Control:
  "Steer 5 degrees to starboard"
  "Return to course"
  "Disengage autopilot"
  "Set heading to 280"

Alarm Handling:
  "Dismiss alarm"
  "Snooze for 5 minutes"
  "Tell me about this alarm"
  "What triggered the alarm?"

Widget Control:
  "Show depth and speed"
  "Switch to engine view"
  "Next page"
  "Show compass"

Camera Control (if integrated):
  "Show bow camera"
  "Pan camera to port"
  "Zoom in"
```

**Planning Mode (Docked - Less Critical):**
```
Configuration:
  "Set shallow water alarm to 10 feet"
  "Add wind widget to dashboard"
  "Switch to night mode"

Historical Queries (VIP Co-Pilot):
  "When did we last change the oil filter?"
  "Show fuel consumption for last voyage"
  "What was the average speed on our trip to Catalina?"
```

---

### 6.3 Voice Routing Architecture

**Marine Environment Challenge:** Wind, waves, engine noise

**Solution:** Bluetooth Headset Integration ("Marriage Saver" Headsets)

```typescript
// Audio routing priority
const AUDIO_ROUTING = {
  voiceInput: [
    'bluetoothHeadset',  // PRIORITY 1: Noise-canceling headset
    'watch',             // PRIORITY 2: Closest to mouth (raise to speak)
    'phone',             // PRIORITY 3: In pocket
    'tablet',            // PRIORITY 4: At helm
  ],

  voiceOutput: [
    'bluetoothHeadset',  // PRIORITY 1: Direct to helmsman ear
    'tablet',            // PRIORITY 2: Helm speakers
    'cockpitSpeakers',   // PRIORITY 3: PA system if available
    'phone',             // PRIORITY 4: Backup
  ],

  criticalAlarms: [
    'bluetoothHeadset',  // ALL crew headsets
    'watch',             // ALL crew watches (haptic)
    'allSpeakers',       // Broadcast everywhere
  ],
};
```

---

### 6.4 Offline Voice Processing

**VIP Requirement:** Must work offshore without connectivity

**Hybrid Approach:**
```typescript
const processVoiceCommand = async (audioBuffer: Buffer) => {
  // PRIORITY 1: Try cloud (best accuracy)
  if (connectivity.online) {
    try {
      const result = await cloudSpeechAPI.recognize(audioBuffer);
      return result;
    } catch (error) {
      // Fall through to offline
    }
  }

  // PRIORITY 2: On-device speech recognition
  const result = await deviceSpeechRecognition.recognize(audioBuffer);
  return result;
};

// Local LLM for intent understanding (offline-capable)
const understandIntent = async (transcript: string) => {
  const response = await localLLM.query({
    model: 'llama-3.1-8b',
    prompt: `User said: "${transcript}". What do they want? Respond with JSON action.`,
    context: { currentScreen: 'dashboard', mode: 'underway' },
  });

  return parseAction(response);
};
```

---

## 7. Frictionless Experience Design

### 7.1 Zero-Configuration Philosophy

**Pieter's Emphasis:** "We need to assess if the experience is frictionless in all aspects."

**Marine Reality:** Setting up complex software while boat is moving = FRUSTRATION

**VIP Principle:** Auto-discovery, zero-config, KISS

**Auto-Discovery Targets:**
- ✅ **IP Cameras** - Detect via mDNS/ONVIF, show in UI automatically
- ✅ **NMEA WiFi Bridges** - Scan network, detect, connect
- ✅ **BLE Crew Devices** - Detect Tag App running, add to roster
- ✅ **Multiple Displays** - Detect other VIP instances on boat network, sync
- ✅ **Autopilot** - Auto-detect via NMEA sentences, enable control

**Setup Experience:**
```
GOOD EXPERIENCE (VIP):
1. Install app
2. App: "I found your NMEA bridge at 192.168.1.100. Connect?"
3. User: "Yes"
4. App: "Connected! I see 12 available widgets. Which do you want?"
5. User: Selects 6 widgets
6. App: "Ready to sail. Start navigation session?"
7. DONE - 3 minutes

BAD EXPERIENCE (Traditional):
1. Install app
2. Manual: Enter NMEA bridge IP address
3. Manual: Enter port number
4. Manual: Select NMEA protocol version
5. Manual: Configure widget layouts
6. Manual: Set alarm thresholds
7. Manual: Configure theme
8. Manual: Set units (metric/imperial)
9. FRUSTRATION - 30 minutes, gave up
```

---

### 7.2 Progressive Disclosure

**Don't Overwhelm:** Show complexity only when needed

**Dashboard Progressive Disclosure:**
```
LEVEL 1: Simple View (Default - 80% of users)
┌────────────────────────────┐
│  CONNECTION    [≡]  [🔔]   │
├────────────────────────────┤
│                            │
│    ┌──────────┐            │
│    │  DEPTH   │            │  ← Essential metrics only
│    │  42.5 ft │            │
│    └──────────┘            │
│                            │
│           ●  ○             │
├────────────────────────────┤
│   AUTOPILOT: 280°          │
└────────────────────────────┘

LEVEL 2: Expanded View (Tap widget)
┌────────────────────────────┐
│  < Back to Dashboard       │
├────────────────────────────┤
│  DEPTH                     │
│  ┌──────────────────────┐  │
│  │  Current: 42.5 ft    │  │
│  │  Min:     38.2 ft    │  │ ← More detail when user asks
│  │  Max:     45.1 ft    │  │
│  │  Avg:     41.8 ft    │  │
│  └──────────────────────┘  │
│                            │
│  [📌 Pin] [⚙️ Config]      │ ← Actions when relevant
└────────────────────────────┘

LEVEL 3: Configuration (Tap ⚙️)
┌────────────────────────────┐
│  < Depth Widget            │
├────────────────────────────┤
│  Alarm Threshold           │
│  ━━━━━━●━━━━  10 ft       │  ← Deep config when needed
│                            │
│  Display Units             │
│  ◉ Feet                    │
│  ○ Meters                  │
│  ○ Fathoms                 │
│                            │
│  [Save]                    │
└────────────────────────────┘
```

---

### 7.3 Intelligent Defaults

**Users shouldn't configure** - System should be smart

**Smart Defaults by Boat Type:**
```typescript
// Auto-detect boat type from NMEA data
const detectBoatType = (nmeaData: NMEAStream): BoatType => {
  if (nmeaData.hasSailSensors) return 'sailboat';
  if (nmeaData.engineCount > 1) return 'motor_yacht';
  if (nmeaData.engineCount === 1) return 'powerboat';
  return 'unknown';
};

// Pre-configure dashboard based on boat type
const DEFAULT_WIDGETS = {
  sailboat: ['depth', 'speed', 'wind', 'compass', 'gps'],
  motor_yacht: ['depth', 'speed', 'engine', 'gps', 'battery', 'tanks'],
  powerboat: ['depth', 'speed', 'engine', 'gps', 'compass'],
};

// Auto-select theme based on time of day
const autoTheme = (time: Date): Theme => {
  const hour = time.getHours();
  if (hour >= 6 && hour < 18) return 'day';
  if (hour >= 18 && hour < 21) return 'night';
  return 'red-night'; // Preserve night vision after 9 PM
};
```

---

### 7.4 Contextual Help (Just-in-Time, Not Overwhelming)

**Bad UX:** Giant tutorial on first launch

**Good UX:** Help when you need it, invisible when you don't

```typescript
// Contextual help triggers
const HELP_TRIGGERS = {
  firstLaunch: 'Quick tour of essential features (skippable)',
  firstWidgetAdd: 'Tooltip: "Tap + hold to configure"',
  firstAlarm: 'Inline: "Swipe to dismiss, or say \'dismiss alarm\'"',
  firstVoiceCommand: 'Inline: "Try saying \'what\'s our ETA?\'"',
  stuck30seconds: 'Floating help button appears (unobtrusive)',
};

// Progressive help tooltips
<WidgetCard
  onFirstView={() => showTooltip("Tap to expand, long press for menu")}
  onSecondView={() => null} // Don't show again
/>
```

**Help System Integration:**
```
[?] Help Button (always available, never intrusive)
  ├─ 🔍 Search help
  ├─ 🎓 Quick start guide
  ├─ 🎯 Interactive tutorials
  ├─ 🔧 Troubleshooting
  └─ 📹 Video walkthroughs
```

---

### 7.5 Error Recovery (Graceful Degradation)

**Marine Reality:** Things fail. Connections drop. Batteries die.

**VIP Philosophy:** Degrade gracefully, never crash

**Connection Loss Handling:**
```typescript
// NMEA connection lost
<ConnectionBanner state="disconnected">
  ⚠️ NMEA connection lost. Last data: 15 seconds ago.
  [Retry] [Settings]
</ConnectionBanner>

// Continue showing last-known data (fade visual cue)
<Widget opacity={0.6}>  {/* Dimmed to show stale */}
  <StaleIndicator>Last update: 15s ago</StaleIndicator>
  <DepthValue>42.5 ft</DepthValue>
</Widget>

// Voice still works
Voice: "Connection lost. Showing last known depth: 42.5 feet, 15 seconds ago."
```

**Offline Mode:**
```typescript
// No internet, but local features work
<OfflineBanner>
  🌐 Offline mode - Voice, NMEA, and alarms still work.
  Weather and remote features unavailable.
</OfflineBanner>

// Features that work offline:
✅ NMEA data display
✅ Voice commands (on-device recognition)
✅ Local AI co-pilot (cached LLM)
✅ Alarms
✅ Autopilot control
✅ Historical data queries

// Features that need connectivity:
❌ Weather forecasts
❌ Cloud sync
❌ Remote monitoring
❌ Software updates
```

---

## 8. Implementation Roadmap

### Phase 1: Platform-Native Foundation (Sprint 1-3)
**Goal:** Respect platform idioms, feel native on each device

**iOS:**
- [ ] Tab bar navigation (bottom on iPhone, sidebar on iPad)
- [ ] SF Symbols icon library
- [ ] iOS-style navigation bar
- [ ] Sheet modals (swipe to dismiss)
- [ ] Haptic feedback integration
- [ ] Siri Shortcuts support

**Android:**
- [ ] Navigation drawer (hamburger menu)
- [ ] Material Icons
- [ ] FAB for primary actions
- [ ] Snackbar notifications
- [ ] Back button handling
- [ ] Foreground service for navigation session

**tvOS:**
- [ ] Focus engine implementation
- [ ] D-pad navigation
- [ ] Large typography (36pt+ body)
- [ ] Top shelf content
- [ ] Siri Remote support

**Web:**
- [ ] Responsive breakpoints (320-1920px)
- [ ] Keyboard accessibility
- [ ] Mouse hover states
- [ ] PWA manifest and service worker

---

### Phase 2: Mode-Based Interaction (Sprint 4-6)
**Goal:** Dashboard vs Planning mode optimization

**Tasks:**
- [ ] Mode detection logic (navigation session + platform + screen)
- [ ] Dashboard mode components (56-64pt touch targets, sparse UI)
- [ ] Planning mode components (40pt targets, dense UI)
- [ ] Glove-mode gesture configuration (120px swipe threshold, etc.)
- [ ] Lock screen mode (prevent accidental touches in rough seas)
- [ ] Visual mode indicator (glove icon in status bar)

---

### Phase 3: Multi-Device Coordination (Sprint 7-10)
**Goal:** Devices work together as ecosystem

**Tasks:**
- [ ] VIP Intelligence Core architecture (shared state)
- [ ] BLE proximity detection for role-based dashboards
- [ ] Device discovery on boat network (mDNS)
- [ ] State synchronization (alarms, NMEA, voice interactions)
- [ ] Camera integration for MOB scenario
- [ ] Multi-screen coordination (tablet + TV + phone)

---

### Phase 4: Voice-First Integration (Sprint 11-14)
**Goal:** Audio-first, visual-available paradigm

**Tasks:**
- [ ] Hybrid voice recognition (cloud + on-device)
- [ ] Bluetooth headset audio routing
- [ ] Voice command system (dashboard queries, autopilot control)
- [ ] Local LLM + RAG for offline co-pilot
- [ ] Voice confirmation and error handling
- [ ] Watch app for voice autopilot control

---

### Phase 5: Frictionless Experience Polish (Sprint 15-16)
**Goal:** Zero friction, delightful everywhere

**Tasks:**
- [ ] Auto-discovery (NMEA bridges, cameras, BLE devices)
- [ ] Intelligent defaults (boat type detection, widget presets)
- [ ] Progressive disclosure (simple → detailed as needed)
- [ ] Contextual help system (just-in-time, non-intrusive)
- [ ] Graceful degradation (offline mode, connection loss recovery)
- [ ] Error recovery flows (friendly, actionable)

---

## Appendix A: Platform Feature Matrix

| Feature | iOS | Android | tvOS | Web | Desktop | Priority |
|---------|-----|---------|------|-----|---------|----------|
| **NMEA Display** | ✅ | ✅ | ✅ | ✅ | ✅ | P0 |
| **Autopilot Control** | ✅ | ✅ | ❌ | ⚠️ | ✅ | P0 |
| **Voice Commands** | ✅ | ✅ | ✅ | ⚠️ | ⚠️ | P1 |
| **BLE Proximity** | ✅ | ✅ | ❌ | ❌ | ❌ | P1 |
| **Camera Integration** | ✅ | ✅ | ✅ | ✅ | ✅ | P1 |
| **Glove Mode** | ✅ | ✅ | N/A | ❌ | ❌ | P0 |
| **Planning Mode** | ✅ | ✅ | ❌ | ✅ | ✅ | P2 |
| **Playback Analysis** | ⚠️ | ⚠️ | ❌ | ✅ | ✅ | P2 |
| **Multi-Device Sync** | ✅ | ✅ | ✅ | ✅ | ✅ | P1 |
| **Offline AI Co-Pilot** | ✅ | ✅ | ✅ | ⚠️ | ✅ | P2 |
| **Watch App** | ✅ | ✅ | N/A | N/A | N/A | P1 |

**Legend:**
- ✅ Full support
- ⚠️ Limited support
- ❌ Not applicable / Not planned
- N/A: Doesn't make sense for platform

---

## Document History

| Version | Date | Changes | Author |
|---------|------|---------|---------|
| 1.0 | 2025-10-20 | Initial cross-platform strategy (responsive focus) | Sally (UX Expert) |
| 2.0 | 2025-10-20 | Complete rewrite: Multi-device ecosystem, VIP vision, mode-based interaction, platform-native patterns, voice-first, frictionless UX | Sally + Pieter |

---

**Next Steps:**

1. **Validate Platform Navigation Patterns** - User test iOS tab bar vs Android drawer with target boaters
2. **Prototype Glove Mode** - Test 56-64pt touch targets on actual boat with gloves in marine conditions
3. **BLE Proximity POC** - Prove role-based dashboard switching works reliably
4. **Voice Integration Spike** - Test Bluetooth headset routing in noisy marine environment
5. **Multi-Device Sync Architecture** - Design state synchronization for tablet + phone + TV scenario

**Questions for Pieter:**

1. **Platform Priority:** iOS first, then Android? Or cross-platform from day one?
2. **Hamburger Menu:** You mentioned alignment with platform patterns - should Android use drawer and iOS use tab bar (native), or unify on one pattern?
3. **Glove Mode:** Always-on for tablets, or user toggle? How important is this for phone use?
4. **Voice Wake Word:** "Hey Navigator" or "Hey VIP" or leverage existing Siri/Google Assistant?
5. **Multi-Device Scenarios:** What's the most common? Tablet at helm + phone in pocket? Or tablet + TV?
