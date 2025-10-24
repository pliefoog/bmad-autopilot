# Cross-Platform UX Strategy: Boating Instruments App
## Multi-Device Adaptive Experience Design

**Document Version:** 1.0
**Created:** 2025-10-20
**Author:** Sally (UX Expert)
**Status:** Strategic Brainstorming & Analysis

---

## Executive Summary

This document outlines a comprehensive UX strategy for evolving the Boating Instruments App from its current **3-breakpoint responsive system** (Phone/Tablet/Desktop) to a **5-platform adaptive experience** that serves:

- 📱 **Phones** (4-7" screens, portrait-first, one-handed operation)
- 📋 **Tablets** (7-13" screens, landscape-first, helm station use)
- 💻 **Desktop/PC** (13"+ screens, mouse+keyboard, pilothouse/planning)
- 🌐 **Web Browsers** (any device, remote monitoring, responsive)
- 📺 **Smart TVs** (32"+ screens, 10-foot UI, passive monitoring)

**Current State:** Solid foundation with marine-compliant theme system, responsive grid (1×1 to 4×3), and touch-optimized interactions.

**Strategic Gap:** Current breakpoint system treats tablet as "medium phone" rather than optimizing for its unique role as the **primary helm instrument**. No TV/large-display strategy. Limited platform-specific interaction patterns.

---

## Table of Contents

1. [Current Architecture Analysis](#1-current-architecture-analysis)
2. [Platform-Specific Use Case Analysis](#2-platform-specific-use-case-analysis)
3. [Adaptive UX Framework](#3-adaptive-ux-framework)
4. [Interaction Pattern Evolution](#4-interaction-pattern-evolution)
5. [Layout Strategy by Platform](#5-layout-strategy-by-platform)
6. [Smart TV Experience Design](#6-smart-tv-experience-design)
7. [Progressive Enhancement Strategy](#7-progressive-enhancement-strategy)
8. [Implementation Roadmap](#8-implementation-roadmap)
9. [Marine-Specific Considerations](#9-marine-specific-considerations)

---

## 1. Current Architecture Analysis

### 1.1 Existing Responsive System

**Strengths:**
```typescript
// Current breakpoint system (useResponsiveGrid.ts)
BREAKPOINTS = {
  phone: 480px,    // ≤480px → 1×1 or 2×1 grid
  tablet: 1024px,  // 481-1024px → 2×2 or 3×2 grid
  desktop: 1025px, // >1024px → 3×3 or 4×3 grid
}
```

✅ **What's Working:**
- Clean 8pt grid system with consistent spacing
- Marine-compliant theme system (Day/Night/Red-Night)
- Touch target standards (44×44pt minimum)
- Responsive to orientation changes
- Paginated dashboard with swipe navigation
- Widget state management (collapsed/expanded/pinned)

⚠️ **Current Limitations:**
- **Tablet underserved:** Treated as "bigger phone" not "helm instrument"
- **No TV/large display mode:** Missing 10-foot UI patterns
- **Single interaction paradigm:** Touch-first only, limited mouse/keyboard optimization
- **No platform-specific components:** Same modals, dialogs on all platforms
- **Limited context awareness:** Doesn't adapt to "active control" vs "passive monitoring" modes

### 1.2 Widget Architecture Strengths

Your current widget system is **excellent** for cross-platform:
- Grid-based MetricCell components (easily scalable)
- 2-state system (collapsed/expanded) with pin persistence
- Multi-instance NMEA support (engines, batteries, tanks)
- Error boundaries and graceful degradation
- Theme-compliant throughout

---

## 2. Platform-Specific Use Case Analysis

### 2.1 Phone: The Portable Instrument
**Primary Context:** On-deck monitoring, quick checks, emergency fallback

**User Journey:**
```
Scenario: Crew member checks depth while handling lines at bow
├─ One hand holding phone (other hand on boat/line)
├─ Quick glance in bright sunlight
├─ Needs LARGE critical value (depth) immediately visible
└─ No time for navigation, needs instant info
```

**Current Implementation:** ✅ Well optimized
- 1×1 portrait grid perfect for one-handed glancing
- 2×1 landscape for dual-metric view
- High contrast Day mode works in sunlight

**Enhancement Opportunities:**
- **"Quick Glance Mode":** Tap power button twice → lock to single critical widget (depth/speed)
- **Shake gesture:** Emergency alert dismissal when hands full
- **Portrait lock option:** Prevent accidental rotation on deck
- **Extra-large metric mode:** 72pt value for at-a-glance readability

---

### 2.2 Tablet: The Helm Station Command Center ⭐
**Primary Context:** Mounted at helm, continuous monitoring, active control

**User Journey:**
```
Scenario: Helmsman navigating coastal waters
├─ Tablet mounted in cockpit (landscape orientation)
├─ Needs to see depth + speed + wind + compass simultaneously
├─ Frequent autopilot adjustments while monitoring metrics
├─ Gloves or wet hands common
└─ Split attention between instruments and visual navigation
```

**Current Gap:** ⚠️ Major optimization opportunity!
- Treated as "bigger phone" (2×2/3×2 grid)
- No helm-specific layout presets
- No split-screen optimizations

**Recommended Tablet Evolution:**

#### **Option A: "Split Dashboard" Layout**
```
┌─────────────────────────────────────────┐
│  HEADER BAR (connection, menu)          │
├──────────────┬──────────────────────────┤
│              │                          │
│   PRIMARY    │   SECONDARY METRICS      │
│   WIDGET     │   ┌─────┬─────┬─────┐   │
│  (compass,   │   │DEPTH│SPEED│WIND │   │
│   depth, or  │   ├─────┼─────┼─────┤   │
│   speed)     │   │ GPS │BATT │TEMP │   │
│  LARGE 2×2   │   └─────┴─────┴─────┘   │
│              │                          │
│              │  6 mini-widgets (2×3)    │
├──────────────┴──────────────────────────┤
│    AUTOPILOT CONTROL (always bottom)    │
└─────────────────────────────────────────┘
```

**User Value:**
- Primary focus widget always visible (e.g., compass for steering reference)
- Grid of critical metrics in peripheral vision
- No page navigation needed during active sailing
- One-tap widget promotion (tap mini-widget → becomes primary)

#### **Option B: "Contextual Dashboard" Layout**
Auto-adapts based on boat state:

**While Under Autopilot:**
```
┌─────────┬─────────┬─────────┐
│ DEPTH   │ COMPASS │ WIND    │  ← Navigation trio
├─────────┼─────────┼─────────┤
│ SPEED   │ AUTOPILOT STATUS │  ← Autopilot monitoring
└─────────┴─────────┴─────────┘
   Landscape 3×2 optimized layout
```

**While Under Manual Steering:**
```
┌──────────────┬──────────────┐
│   COMPASS    │   DEPTH      │  ← Steering essentials
│   (LARGE)    │   (LARGE)    │
├──────────────┼──────────────┤
│ WIND │ SPEED │ GPS  │ ENG  │  ← Supporting metrics
└──────┴───────┴──────┴──────┘
   Focus on steering feedback
```

**While At Anchor:**
```
┌─────────┬─────────┬─────────┐
│ DEPTH   │ WIND    │ ANCHOR  │  ← Anchor watch
│ (ALARM) │ (ALARM) │ DRAG    │
├─────────┴─────────┴─────────┤
│   BATTERIES │ TANKS │ ENG   │  ← System monitoring
└─────────────┴───────┴───────┘
   Monitoring critical systems
```

**Implementation:**
- Use existing widget state system + new "context" awareness
- Tablet-specific layout presets in widgetStore
- User can override auto-layout with pin system

---

### 2.3 Desktop/PC: The Planning & Configuration Hub
**Primary Context:** Pre-trip planning, playback analysis, detailed configuration

**User Journey:**
```
Scenario: Planning tomorrow's passage at home office
├─ Large monitor (24"+), mouse + keyboard
├─ Reviewing yesterday's NMEA playback data
├─ Configuring dashboard layouts for different sailing modes
├─ Setting alarm thresholds with precision
└─ Multi-window workflow (chart + instruments + weather)
```

**Enhancement Opportunities:**

#### **Desktop-Exclusive Features:**
```
NEW MODES FOR DESKTOP:
├─ **Playback & Analysis Mode**
│  ├─ Timeline scrubber for NMEA file replay
│  ├─ Multi-metric overlays (depth + speed graph)
│  ├─ Export to CSV/JSON
│  └─ Performance analytics (VMG, tacking angles)
│
├─ **Dashboard Designer Mode**
│  ├─ Drag-and-drop widget arrangement
│  ├─ Preview mode for different screen sizes
│  ├─ Save/load layout templates
│  └─ Share layouts via QR code to tablet
│
├─ **Advanced Configuration**
│  ├─ Alarm threshold graphing
│  ├─ NMEA sentence filtering (show/hide PGNs)
│  ├─ Multi-sensor calibration
│  └─ System diagnostics dashboard
│
└─ **Multi-Monitor Support**
   ├─ Span dashboard across 2-3 displays
   ├─ Dedicated autopilot control display
   └─ Full-screen single widgets per monitor
```

**Interaction Pattern Changes:**
- **Hover states:** Show widget details on mouse hover
- **Right-click context menus:** Quick widget config
- **Keyboard shortcuts:** Arrow keys for page nav, Space for autopilot, Numbers for quick widget selection
- **Precision inputs:** Number fields with +/- buttons for alarm thresholds (not just sliders)

---

### 2.4 Web Browser: The Remote Monitor
**Primary Context:** Shore-based monitoring, crew coordination, remote assistance

**User Journey:**
```
Scenario: Family member checking boat status from home
├─ Laptop or iPad browsing to boat's IP
├─ Read-only monitoring mode (no control permissions)
├─ Wants to see current location, depth, battery status
├─ May need to contact boat via phone if alarm triggered
└─ Should work without installing native app
```

**Web-Specific Features:**
```
WEB EXPERIENCE ENHANCEMENTS:
├─ **Responsive breakpoints** (inherit from native, but add web-specific)
│  ├─ Phone browser (320-480px)
│  ├─ Tablet browser (481-1024px)
│  └─ Desktop browser (1025px+)
│
├─ **Authentication & Permissions**
│  ├─ Simple password protection for remote access
│  ├─ View-only mode (default for web)
│  ├─ Control mode (requires auth)
│  └─ Session timeout for security
│
├─ **Progressive Web App (PWA)**
│  ├─ "Add to Home Screen" for mobile browsers
│  ├─ Offline mode with last-known data
│  ├─ Push notifications for critical alarms
│  └─ Background sync when connection available
│
└─ **Web-Optimized Performance**
   ├─ WebSocket for real-time NMEA stream (not TCP)
   ├─ Lazy-load widgets on scroll
   ├─ CSS animations (not React Native Animated)
   └─ Reduced bundle size (~500KB vs 15MB native)
```

**Browser Compatibility:**
- Desktop: Chrome, Firefox, Safari, Edge (last 2 versions)
- Mobile: iOS Safari 14+, Android Chrome 90+
- Tablet: iPad Safari, Android tablets

---

### 2.5 Smart TV: The Salon Awareness Display 📺 **NEW**
**Primary Context:** Passive monitoring from salon, galley, or cabin while at anchor or underway

**User Journey:**
```
Scenario: Crew relaxing in salon while boat at anchor
├─ TV mounted on salon bulkhead (32-55" screen)
├─ Viewing from 6-10 feet away (couch/table)
├─ Glancing occasionally to check wind shift or depth change
├─ No touch interaction (remote control only)
└─ Wants clean, uncluttered display with large text
```

**10-Foot UI Design Principles:**
```
SMART TV SPECIFIC REQUIREMENTS:
├─ **Typography**
│  ├─ Minimum 36pt body text (readable from 10 feet)
│  ├─ 72-96pt primary values (depth, speed)
│  ├─ High contrast even in dim lighting
│  └─ No text smaller than 24pt
│
├─ **Layout**
│  ├─ 2×2 or 3×2 maximum widget grid (not 4×3)
│  ├─ Large margins (64px minimum)
│  ├─ Auto-cycling pages every 10-15 seconds
│  └─ Full-screen single widget mode
│
├─ **Interaction** (D-pad remote control)
│  ├─ Arrow keys: Navigate widgets/pages
│  ├─ Select/Enter: Expand widget to full screen
│  ├─ Back: Return to grid view
│  ├─ Menu: Show settings overlay
│  └─ Number keys: Jump to specific page
│
├─ **Visual Modes**
│  ├─ **Screensaver Mode:** Rotating single-metric display with clock
│  ├─ **Ambient Mode:** Ultra-dim for overnight monitoring
│  ├─ **Alert Mode:** Full-screen flashing critical alarm
│  └─ **Slideshow Mode:** Auto-cycle through pinned widgets
│
└─ **TV-Specific Features**
   ├─ Picture-in-picture (chart overlay on instruments)
   ├─ Clock always visible (corner overlay)
   ├─ No scrolling (pagination only)
   └─ Voice control integration (optional: "Alexa, show depth")
```

**Implementation Considerations:**
```typescript
// TV-specific breakpoint
BREAKPOINTS.tv = {
  minWidth: 1280px,
  minHeight: 720px,
  deviceType: 'tv', // Detected via Platform.OS or user agent
}

// TV layout config
TV_LAYOUT = {
  maxGrid: { cols: 3, rows: 2 },
  minFontSize: 36,
  primaryValueSize: 96,
  autoPageInterval: 12000, // 12 seconds
  marginSize: 64,
  safeAreaInset: 80, // TVs have overscan
}
```

**TV App Distribution:**
- Apple TV App Store (tvOS)
- Android TV / Google TV (Play Store)
- Amazon Fire TV (via web wrapper)
- Samsung Tizen / LG webOS (via web app)

---

## 3. Adaptive UX Framework

### 3.1 Three-Tier Adaptation Strategy

Instead of simple breakpoints, implement **context-aware adaptation**:

```typescript
interface AdaptiveContext {
  // Device characteristics
  device: {
    platform: 'phone' | 'tablet' | 'desktop' | 'web' | 'tv';
    screenSize: { width: number; height: number };
    inputMethods: ('touch' | 'mouse' | 'keyboard' | 'remote')[];
    viewingDistance: 'intimate' | 'personal' | 'social' | 'public'; // 6in, 2ft, 6ft, 10ft
  };

  // Usage context
  mode: {
    role: 'active-control' | 'monitoring' | 'configuration' | 'playback';
    boatState: 'underway-autopilot' | 'underway-manual' | 'anchored' | 'docked' | 'offline';
    userIntent: 'quick-glance' | 'sustained-attention' | 'deep-focus';
  };

  // Environmental factors
  environment: {
    timeOfDay: 'day' | 'dusk' | 'night';
    connectivity: 'real-time' | 'delayed' | 'offline';
    motionContext: 'stable' | 'moderate' | 'heavy-seas';
  };
}
```

**Example Adaptations:**
```typescript
// Phone + heavy-seas + quick-glance → Extra-large single metric
if (context.device.platform === 'phone' &&
    context.environment.motionContext === 'heavy-seas' &&
    context.mode.userIntent === 'quick-glance') {
  return <SingleMetricLockScreen metric="depth" fontSize={96} />;
}

// TV + anchored + nighttime → Ambient screensaver
if (context.device.platform === 'tv' &&
    context.mode.boatState === 'anchored' &&
    context.environment.timeOfDay === 'night') {
  return <AmbientScreensaver metrics={['depth', 'wind']} brightness={0.1} />;
}

// Desktop + offline + playback → Analysis mode
if (context.device.platform === 'desktop' &&
    context.mode.role === 'playback' &&
    context.environment.connectivity === 'offline') {
  return <PlaybackAnalysisMode withTimeline withGraphs />;
}
```

---

### 3.2 Progressive Disclosure by Platform

**Information Hierarchy:**
```
Level 1: CRITICAL (always visible)
└─ Phone: 1 metric, Tablet: 4-6 metrics, Desktop: 9-12 metrics, TV: 4-6 metrics

Level 2: IMPORTANT (tap/click to reveal)
└─ Expanded widget states, secondary metrics

Level 3: CONTEXTUAL (menu/settings)
└─ Configuration, historical data, analytics

Level 4: EXPERT (desktop-only)
└─ NMEA diagnostics, sensor calibration, system logs
```

---

## 4. Interaction Pattern Evolution

### 4.1 Current Touch-First Patterns
```
EXISTING GESTURES (all platforms):
├─ Single tap → Expand/collapse widget
├─ Long press → Widget context menu
├─ Long press caret → Toggle pin state
├─ Swipe left/right → Navigate pages
└─ Pan gesture → Smooth page transitions
```

### 4.2 Platform-Specific Interaction Enhancements

#### **Phone:**
```typescript
NEW GESTURES:
├─ Double-tap power button → Quick metric lock
├─ Shake device → Dismiss non-critical alarms
├─ 3D Touch / Haptic Touch → Widget preview
├─ Volume buttons → Adjust autopilot ±1° (when in autopilot screen)
└─ Edge swipe (from left) → Open hamburger menu
```

#### **Tablet (Helm Station):**
```typescript
GLOVE-FRIENDLY ENHANCEMENTS:
├─ Larger touch targets (56×56pt vs 44×44pt)
├─ Increased swipe threshold (120px vs 80px)
├─ Tap-and-hold timeout (300ms vs 500ms - faster response)
├─ Reject accidental palm touches
└─ "Lock screen" mode (prevent accidental taps in rough seas)

HELM-SPECIFIC:
├─ Double-tap compass → Autopilot quick-engage
├─ Swipe up on depth → Depth alarm quick-set
├─ Two-finger rotate → Adjust autopilot heading (circular gesture)
└─ Pinch-to-zoom → Enlarge single widget temporarily
```

#### **Desktop:**
```typescript
MOUSE + KEYBOARD:
├─ Hover → Show widget details tooltip
├─ Right-click → Context menu
├─ Click-and-drag → Rearrange widgets (Designer mode)
├─ Scroll wheel → Navigate pages
├─ Keyboard shortcuts:
│  ├─ Arrow keys → Navigate pages
│  ├─ Space → Toggle autopilot mode
│  ├─ Numbers 1-9 → Jump to widget
│  ├─ Cmd/Ctrl + S → Save layout
│  ├─ Cmd/Ctrl + P → Toggle playback
│  └─ Esc → Close modals
└─ Double-click → Full-screen widget
```

#### **TV Remote:**
```typescript
D-PAD NAVIGATION:
├─ Arrow keys → Navigate grid (focus outline moves)
├─ Select/Enter → Expand focused widget
├─ Back → Return to grid / Go to previous page
├─ Menu → Show settings overlay
├─ Play/Pause → Toggle auto-cycling
├─ Number keys → Jump to page 1-9
└─ Color buttons (optional):
   ├─ Red → Show alarms
   ├─ Green → Show all-green status
   ├─ Yellow → Show warnings
   └─ Blue → Toggle screensaver
```

---

## 5. Layout Strategy by Platform

### 5.1 Responsive Grid Evolution

**Current System:**
```typescript
EXISTING GRID DENSITY:
phone:   1×1 portrait,  2×1 landscape  (1-2 widgets/page)
tablet:  2×2 portrait,  3×2 landscape  (4-6 widgets/page)
desktop: 3×3 portrait,  4×3 landscape  (9-12 widgets/page)
```

**Proposed Enhancement:**
```typescript
ADAPTIVE GRID DENSITY (adds context awareness):

// PHONE remains unchanged (already optimal)
phone: {
  portrait: { cols: 1, rows: 1, autoScroll: false },
  landscape: { cols: 2, rows: 1, autoScroll: false },
}

// TABLET gets helm-optimized presets
tablet: {
  // Standard mode (current behavior)
  standard: {
    portrait: { cols: 2, rows: 2 },
    landscape: { cols: 3, rows: 2 },
  },

  // NEW: Helm mode (split layout)
  helm: {
    portrait: { layout: 'split', primary: '50%', grid: '2×2' },
    landscape: { layout: 'split', primary: '40%', grid: '2×3' },
  },

  // NEW: Glove mode (fewer, larger targets)
  glove: {
    portrait: { cols: 2, rows: 2, touchTargetSize: 56 },
    landscape: { cols: 2, rows: 2, touchTargetSize: 56 }, // Intentionally 2×2 not 3×2
  },
}

// DESKTOP gets multi-window support
desktop: {
  standard: { cols: 4, rows: 3 },
  dual: { cols: 6, rows: 3 }, // Span 2 monitors
  triple: { cols: 9, rows: 3 }, // Span 3 monitors
}

// TV NEW: 10-foot UI optimized
tv: {
  standard: { cols: 3, rows: 2, fontSize: 36, margins: 64 },
  ambient: { cols: 2, rows: 1, fontSize: 72, margins: 120 }, // Nighttime mode
  alert: { cols: 1, rows: 1, fontSize: 144 }, // Critical alarm full-screen
}
```

---

### 5.2 Widget Sizing Strategy

**Current:** Fixed cell sizes with min/max constraints (140px-300px)

**Proposed:** Content-aware sizing
```typescript
interface WidgetSizeContext {
  platform: Platform;
  importance: 'critical' | 'high' | 'medium' | 'low';
  dataComplexity: 'simple' | 'moderate' | 'complex';
  viewingDistance: ViewingDistance;
}

// Example sizing logic
const getWidgetSize = (context: WidgetSizeContext) => {
  // TV: Everything larger
  if (context.platform === 'tv') {
    return { width: 400, height: 400, fontSize: 48 };
  }

  // Critical widgets get more space
  if (context.importance === 'critical') {
    return { width: 240, height: 240, fontSize: 36 };
  }

  // Complex widgets (wind, engine) need more room
  if (context.dataComplexity === 'complex') {
    return { width: 200, height: 200, fontSize: 24 };
  }

  // Default
  return { width: 160, height: 160, fontSize: 18 };
};
```

---

## 6. Smart TV Experience Design (Detailed)

### 6.1 TV-Specific Layouts

#### **Mode 1: Grid Dashboard (Default)**
```
┌────────────────────────────────────────────────┐
│  🏴 SAILING INSTRUMENTS          🕐 14:32 UTC  │ ← Always-visible header
├────────────────────────────────────────────────┤
│                                                │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐   │
│  │  DEPTH   │  │  SPEED   │  │   WIND   │   │
│  │          │  │          │  │          │   │
│  │  42.5 ft │  │  6.2 kts │  │ 15 kts   │   │ ← 96pt values
│  │          │  │          │  │  AWA 45° │   │
│  └──────────┘  └──────────┘  └──────────┘   │
│                                                │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐   │
│  │  GPS     │  │ COMPASS  │  │ BATTERY  │   │
│  │ 41°24'N  │  │  280°T   │  │  12.8V   │   │
│  │ 70°12'W  │  │          │  │   75%    │   │
│  └──────────┘  └──────────┘  └──────────┘   │
│                                                │
├────────────────────────────────────────────────┤
│              ●  ●  ○  ○                        │ ← Page dots (large, TV-friendly)
└────────────────────────────────────────────────┘
```
- **Auto-cycles** every 12 seconds to next page
- **D-pad navigation** focuses widgets with thick outline
- **Select button** expands to full-screen mode

---

#### **Mode 2: Full-Screen Single Widget**
```
┌────────────────────────────────────────────────┐
│                                                │
│                                                │
│              DEPTH                             │ ← 48pt label
│                                                │
│                                                │
│              42.5                              │ ← 196pt value!
│               ft                               │ ← 72pt unit
│                                                │
│                                                │
│         [Min: 38.2  Avg: 41.8  Max: 45.1]     │ ← 36pt secondary
│                                                │
│                                                │
│                                                │
└────────────────────────────────────────────────┘
```
- **Back button** returns to grid
- **Arrow keys** cycle through widgets
- **Perfect for critical monitoring** from across room

---

#### **Mode 3: Ambient Screensaver (Night/Anchor)**
```
┌────────────────────────────────────────────────┐
│                                                │
│                                                │
│                                                │
│                                                │
│                  42.5 ft                       │ ← Depth (dim red)
│                                                │
│                  15 kts ↗45°                   │ ← Wind (dim red)
│                                                │
│                                                │
│                 02:15 UTC                      │ ← Clock
│                                                │
│                                                │
└────────────────────────────────────────────────┘
```
- **Ultra-dim** (5% brightness, red-night theme)
- **Slowly fades** every 30 seconds to prevent OLED burn-in
- **Position shifts** slightly each cycle
- **Any button press** returns to dashboard

---

#### **Mode 4: Critical Alert (Full-Screen Flash)**
```
┌────────────────────────────────────────────────┐
│ ⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️ │
│                                                │
│           ⚠️  CRITICAL ALARM  ⚠️              │
│                                                │
│                 SHALLOW                        │
│                                                │
│               DEPTH: 5.2 ft                    │ ← Flashing red
│          ALARM THRESHOLD: 10 ft                │
│                                                │
│                                                │
│        [Press SELECT to acknowledge]           │
│                                                │
│ ⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️ │
└────────────────────────────────────────────────┘
```
- **Interrupts** any mode (grid, full-screen, screensaver)
- **Flashing animation** (300ms flicker per UI spec)
- **Audio alert** if TV supports it
- **Requires acknowledgment** before returning to dashboard

---

### 6.2 TV Navigation Patterns

**Focus Management:**
```typescript
interface TVFocusState {
  currentWidget: string | null;
  focusRing: {
    color: string; // theme.primary
    width: 4px;    // Thick outline for TV visibility
    animated: boolean; // Pulse effect
  };
}

// D-pad arrow handling
const handleDPad = (direction: 'up' | 'down' | 'left' | 'right') => {
  const grid = getCurrentPageLayout();
  const currentIndex = findWidgetIndex(focusedWidget);

  switch (direction) {
    case 'right':
      focusWidget(grid.getNeighbor(currentIndex, 'right'));
      break;
    case 'down':
      focusWidget(grid.getNeighbor(currentIndex, 'down'));
      break;
    // ... etc
  }
};
```

---

## 7. Progressive Enhancement Strategy

### 7.1 Feature Detection & Graceful Degradation

```typescript
interface PlatformCapabilities {
  touch: boolean;
  mouse: boolean;
  keyboard: boolean;
  remoteControl: boolean;
  haptics: boolean;
  nativeBrightness: boolean;
  multiWindow: boolean;
  pictureInPicture: boolean;
  voiceControl: boolean;
}

// Detect capabilities at runtime
const capabilities = detectCapabilities();

// Enhance UI progressively
if (capabilities.mouse) {
  enableHoverStates();
  enableContextMenus();
}

if (capabilities.haptics) {
  enableHapticFeedback();
}

if (capabilities.voiceControl) {
  registerVoiceCommands();
}
```

---

### 7.2 Platform Priority Matrix

**Implementation Priority:**

| Feature | Phone | Tablet | Desktop | Web | TV | Complexity |
|---------|-------|--------|---------|-----|----|-----------
| Current responsive grid | ✅ Done | ✅ Done | ✅ Done | ✅ Done | ❌ | - |
| Tablet helm mode | - | 🔥 P0 | - | - | - | Medium |
| Glove-friendly mode | 🔥 P0 | 🔥 P0 | - | - | - | Low |
| TV grid dashboard | - | - | - | - | 🎯 P1 | Medium |
| TV d-pad navigation | - | - | - | - | 🎯 P1 | High |
| TV screensaver mode | - | - | - | - | 🎯 P2 | Low |
| Desktop drag-and-drop | - | - | 🎯 P1 | 🎯 P1 | - | High |
| Desktop playback mode | - | - | 🎯 P2 | 🎯 P2 | - | High |
| PWA offline mode | - | - | - | 🎯 P2 | - | Medium |
| Voice control | 🎯 P3 | 🎯 P3 | - | - | 🎯 P3 | High |

**Legend:**
- ✅ Done = Already implemented
- 🔥 P0 = Critical, immediate value (helm safety)
- 🎯 P1 = High value, plan for next sprint
- 🎯 P2 = Medium value, nice-to-have
- 🎯 P3 = Low priority, future consideration

---

## 8. Implementation Roadmap

### Phase 1: Tablet Optimization (Sprint 1-2) 🔥
**Goal:** Make tablet the best helm instrument

**Tasks:**
1. Add "Helm Mode" layout preset (split primary + grid)
2. Implement "Glove Mode" (larger touch targets, simplified gestures)
3. Create tablet-specific widget size variants
4. Add "Lock Screen" mode (prevent accidental taps in rough seas)
5. Test with actual marine tablets (iPad in waterproof case, ruggedized Android)

**Acceptance Criteria:**
- ✅ Helmsman can see 6 critical metrics + autopilot without page navigation
- ✅ All interactions work with wet gloves
- ✅ No accidental widget taps during 20kt sailing test

---

### Phase 2: Smart TV Foundation (Sprint 3-4) 🎯
**Goal:** Passive monitoring from salon

**Tasks:**
1. Implement TV platform detection
2. Create TV-specific grid layout (3×2 max, 96pt values)
3. Add D-pad navigation with focus management
4. Build auto-cycling page system (12s interval)
5. Create ambient screensaver mode

**Acceptance Criteria:**
- ✅ All widgets readable from 10 feet away
- ✅ D-pad navigation works smoothly
- ✅ Auto-cycles through 3 pages without user input
- ✅ Screensaver activates after 5 minutes of inactivity

---

### Phase 3: Desktop Power Features (Sprint 5-6) 🎯
**Goal:** Configuration and analysis hub

**Tasks:**
1. Add hover states and context menus
2. Implement drag-and-drop widget rearrangement
3. Build Dashboard Designer mode (save/load presets)
4. Create Playback Analysis mode (timeline, graphs)
5. Add keyboard shortcuts

**Acceptance Criteria:**
- ✅ User can rearrange widgets with mouse
- ✅ Layout presets saveable and shareable
- ✅ Playback mode shows historical data with scrubbing
- ✅ All critical functions accessible via keyboard

---

### Phase 4: Web & PWA (Sprint 7-8) 🎯
**Goal:** Remote monitoring from anywhere

**Tasks:**
1. Optimize web bundle size (<2MB)
2. Implement authentication and view-only mode
3. Build PWA with offline support
4. Add WebSocket for real-time data streaming
5. Enable push notifications for critical alarms

**Acceptance Criteria:**
- ✅ Web app loads in <3 seconds on 4G
- ✅ Works offline with last-known data
- ✅ Push notifications arrive within 5s of alarm

---

### Phase 5: Advanced Features (Sprint 9+) 🎯
**Goal:** Polish and future-proof

**Tasks:**
1. Voice control integration (Siri, Google Assistant)
2. Picture-in-picture mode (chart overlay)
3. Multi-monitor support for desktop
4. Contextual auto-layouts based on boat state
5. Analytics dashboard (VMG, fuel efficiency)

---

## 9. Marine-Specific Considerations

### 9.1 Environmental Challenges

**Challenge Matrix:**

| Environment | Phone | Tablet | Desktop | Web | TV |
|-------------|-------|--------|---------|-----|----
| **Bright sunlight** | 🔥 Critical | 🔥 Critical | ⚠️ Moderate | ⚠️ Moderate | ✅ N/A (indoor) |
| **Salt spray/wet** | 🔥 Critical | 🔥 Critical | ✅ N/A | ✅ N/A | ✅ N/A |
| **Gloves** | ⚠️ Moderate | 🔥 Critical | ✅ N/A | ✅ N/A | ✅ N/A |
| **Motion (heavy seas)** | 🔥 Critical | 🔥 Critical | ✅ N/A | ✅ N/A | ⚠️ Moderate |
| **Power constraints** | 🔥 Critical | 🔥 Critical | ⚠️ Moderate | ⚠️ Moderate | ⚠️ Moderate |

**Mitigations:**
- **Sunlight:** High-contrast day mode, outdoor brightness boost, anti-glare option
- **Wet/gloves:** Larger touch targets (56pt tablet), palm rejection, simplified gestures
- **Motion:** Reduced animations in rough conditions, larger tap zones, confirmation prompts
- **Power:** Aggressive battery optimization, auto-dim in sunlight (paradox!), low-power mode

---

### 9.2 Marine Safety Requirements

**Red-Night Mode Compliance (ALL PLATFORMS):**
```typescript
// Must pass validation on all devices
RED_NIGHT_SAFETY_RULES = {
  maxRed: 68,      // RGB red channel max
  maxGreen: 0,     // Zero green/blue (preserves night vision)
  maxBlue: 0,
  maxBrightness: 0.05, // 5% screen brightness

  // Platform-specific enforcement
  phone: { enforce: true, canOverride: false },
  tablet: { enforce: true, canOverride: false },
  desktop: { enforce: true, canOverride: true }, // User discretion at home
  web: { enforce: true, canOverride: true },
  tv: { enforce: true, canOverride: false }, // Salon TV used at night
};
```

**Accessibility:**
- **Touch targets:** 44pt phone, 56pt tablet, 40pt desktop/web, 80pt TV
- **Font sizes:** 18pt minimum phone/tablet/desktop, 36pt minimum TV
- **Color contrast:** 4.5:1 day mode, 3:1 night modes (dimmer acceptable)
- **Interaction timeouts:** 500ms phone, 300ms tablet glove mode, no timeout TV

---

## 10. Open Questions for Pieter

### 10.1 Strategic Decisions Needed

**Question 1: Tablet Helm Mode - Split vs. Contextual?**
- **Option A:** User-configurable split layout (manual widget selection)
- **Option B:** Auto-adapt based on boat state (autopilot vs manual)
- **Recommendation:** Start with Option A (simpler), add Option B later if users want it

**Question 2: Smart TV Priority?**
- Is TV experience **P1 (next sprint)** or **P2 (future phase)**?
- Do you have a target TV platform (Apple TV, Android TV, web app on smart TV)?
- **Recommendation:** If you have salon TVs on real boats, do P1. Otherwise P2.

**Question 3: Web Authentication Model?**
- Simple password (local WiFi only)?
- Cloud-based accounts (boat.cloud.app/your-boat-name)?
- No auth (open access on boat network)?
- **Recommendation:** Start with simple password, add cloud sync later

**Question 4: Desktop Playback - Separate App?**
- Build playback mode into main app (bloats bundle)?
- Create separate "Marine Instruments Analyzer" desktop app?
- **Recommendation:** Separate app if playback is advanced feature for pros

**Question 5: Voice Control - Worth It?**
- "Hey Siri, show depth" could be cool but complex
- Marine environment is LOUD (wind, engine, waves)
- **Recommendation:** Skip unless user research shows strong demand

---

### 10.2 Technical Decisions Needed

**Question 6: Platform Detection Strategy?**
```typescript
// Option A: Device characteristics
if (screenWidth > 1024 && hasMousePointer) { platform = 'desktop'; }

// Option B: Explicit user selection
User sees: "What device is this? [Phone] [Tablet] [Desktop] [TV]"

// Option C: Hybrid (detect + allow override)
Auto-detect but show "Wrong device? Change here"
```
**Recommendation:** Option C - smart default, user control

**Question 7: TV App Distribution?**
- Native tvOS/Android TV apps (requires app store submission)?
- Web wrapper (simpler, but limited functionality)?
- **Recommendation:** Web wrapper first (faster to market), native later if needed

**Question 8: Multi-Monitor Desktop Support?**
- P1 feature or P3 nice-to-have?
- How common is multi-monitor pilothouse setup in your target market?
- **Recommendation:** P2 unless you're targeting pro/commercial vessels

---

## 11. Next Steps

### Immediate Actions (This Week):
1. **User Research:** Survey existing users about device usage patterns
   - What devices do they currently use for marine instruments?
   - Where is the app used most (helm, salon, home)?
   - Pain points with current interface on tablets?

2. **Prototype Tablet Helm Mode:** Quick mockup in Figma/Sketch
   - Share with 3-5 marine users for feedback
   - Validate split layout hypothesis

3. **TV Feasibility Assessment:**
   - Test React Native app on Apple TV simulator
   - Evaluate web wrapper performance on Fire TV stick
   - Document platform limitations

### This Month:
4. **Technical Spike:** Platform detection and adaptive grid system
   - Prove out context-aware layout switching
   - Benchmark performance on low-end Android tablet

5. **Design System Extension:** TV and Desktop variants
   - Create Figma components for 10-foot UI
   - Define desktop-specific hover states and interactions

6. **Roadmap Prioritization Workshop:**
   - Meet with product team to finalize Phase 1/2/3 priorities
   - Assign complexity/value scores to each enhancement

---

## Appendix A: Competitive Analysis

**Marine Apps Reviewed:**
- Navionics (chart focus, minimal instruments)
- iNavX (similar to Navionics)
- SignalK Instruments (open source, basic UI)
- Raymarine App (OEM-locked, limited device support)

**Key Insights:**
- ✅ **Our advantage:** Cross-platform, modern React Native, open NMEA
- ⚠️ **Their advantage:** Established user base, chart integration
- 🎯 **Opportunity:** No one has nailed the tablet helm experience or TV monitoring

---

## Appendix B: User Personas (Updated)

### Persona 1: "Helm-Focused Harry"
- **Device:** iPad Mini mounted at helm in waterproof case
- **Primary need:** Glance at depth/speed/wind while steering
- **Pain point:** Current 2×2 grid requires paging to see all metrics
- **Solution:** Tablet helm mode with 6 metrics visible

### Persona 2: "Salon-Watching Sarah"
- **Device:** 42" smart TV in salon
- **Primary need:** Check if anchor is dragging while relaxing
- **Pain point:** No TV app, has to walk to cockpit
- **Solution:** TV ambient mode with auto-cycling depth/wind/GPS

### Persona 3: "Planning Pete"
- **Device:** 27" iMac at home office
- **Primary need:** Review yesterday's sail, configure alarms
- **Pain point:** Mobile UI awkward with mouse, no historical data view
- **Solution:** Desktop playback mode + dashboard designer

### Persona 4: "Remote-Monitoring Rita"
- **Device:** Laptop on shore
- **Primary need:** Check boat status while away
- **Pain point:** Needs native app installed, can't access remotely
- **Solution:** Web PWA with simple authentication

---

## Document History

| Version | Date | Changes | Author |
|---------|------|---------|---------|
| 1.0 | 2025-10-20 | Initial strategic analysis and recommendations | Sally (UX Expert) |

---

**Questions? Let's discuss!** 🎨

This is a living document. Your feedback will shape the roadmap. What resonates? What's missing? Where should we focus first?
