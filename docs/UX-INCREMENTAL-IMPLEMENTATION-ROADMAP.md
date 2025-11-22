# UX Incremental Implementation Roadmap
## From v2.3 Current State → VIP Platform Vision

**Document Version:** 1.0  
**Created:** November 20, 2025  
**Author:** Sally (UX Expert)  
**Status:** 🎯 AUTHORITATIVE IMPLEMENTATION GUIDE  

---

## Executive Summary

This document provides a **single authoritative roadmap** for incrementally evolving the Boating Instruments App from its current v2.3 state to the full VIP Platform vision. Each phase builds on the previous, maintaining working code throughout.

**Strategic Approach:**
- ✅ Start from **working v2.3 baseline**
- ✅ Add features **incrementally** (no big-bang rewrites)
- ✅ **Test continuously** with WiFi Bridge simulator
- ✅ Maintain **backward compatibility** until migration complete
- ✅ Progress toward **VIP multi-device vision** systematically

**Timeline:** 6 major phases over 24-32 weeks

**Target Platforms:**
- Current: iOS, Android, Web (Desktop), Windows, macOS
- Future: Smart TV (Apple TV, Android TV, Fire TV), Smartwatch

---

## Table of Contents

1. [Current State: v2.3 Baseline](#1-current-state-v23-baseline)
2. [Phase 0: Critical Fixes (Weeks 1-2)](#2-phase-0-critical-fixes-weeks-1-2)
3. [Phase 1: Settings Dialogs Refactor (Weeks 3-6)](#3-phase-1-settings-dialogs-refactor-weeks-3-6)
4. [Phase 2: Store Consolidation & Glove Mode (Weeks 7-11)](#4-phase-2-store-consolidation--glove-mode-weeks-7-11)
5. [Phase 3: Platform Chrome & Navigation (Weeks 12-19)](#5-phase-3-platform-chrome--navigation-weeks-12-19)
6. [Phase 4: Multi-Device Coordination (Weeks 20-26)](#6-phase-4-multi-device-coordination-weeks-20-26)
7. [Phase 5: TV Platform Support (Weeks 27-32)](#7-phase-5-tv-platform-support-weeks-27-32)
8. [Testing Strategy](#8-testing-strategy)
9. [Success Metrics](#9-success-metrics)

---

## 1. Current State: v2.3 Baseline

### 1.1 What's Working Today ✅

**Core Features:**
- ✅ NMEA WiFi bridge connection (TCP/UDP)
- ✅ Real-time widget dashboard (9 core widgets)
- ✅ Autopilot control (Raymarine Evolution)
- ✅ Critical alarms (depth, battery, wind, engine)
- ✅ Theme system (Day/Night/Red-Night)
- ✅ Responsive grid layout (phone/tablet/desktop)
- ✅ Widget state persistence (AsyncStorage)
- ✅ Playback mode (WiFi Bridge simulator)

**Architecture Strengths:**
- Zustand stores for state management
- React Native cross-platform (iOS, Android, Web)
- Service layer separation (NMEA, autopilot, alarms)
- Hook-based data access
- Component modularity

### 1.2 Critical Issues to Address ⚠️

**From SETTINGS-DIALOGS-CROSS-PLATFORM-IMPLEMENTATION.md:**
1. 🚨 **Red-Night Mode Violation** - Green status dots (#10B981) at `alarms.tsx:228`
2. ⚠️ **Navigation Inconsistency** - Connection/Units use modals, Alarms uses full-screen
3. ⚠️ **File Organization** - ConnectionConfigDialog in wrong directory
4. ⚠️ **No Keyboard Navigation** - Desktop lacks Tab/Enter/Esc support
5. ⚠️ **Entry Point Confusion** - Multiple routes to same features

**From REFACTORING-PLAN-VIP-PLATFORM.md:**
6. ⚠️ **No Glove Mode** - Fixed 44pt targets (need 64pt when navigating)
7. ⚠️ **Duplicate Stores** - `src/store/` vs `src/stores/`
8. ⚠️ **No Platform Chrome** - Single App.tsx for all platforms
9. ⚠️ **Navigation Session Unused** - Exists but doesn't affect UI density

**From V2.3-COMPLETION-HANDOFF.md:**
10. ⚠️ **Epic 9 Incomplete** - Enhanced Presentation System (unit reactivity, layout jumping)

### 1.3 Dependencies & Prerequisites

**Before Starting Phase 0:**
- [ ] Complete Epic 9 (Enhanced Presentation System) - **BLOCKING**
- [ ] All v2.3 tests passing
- [ ] WiFi Bridge simulator configured
- [ ] Create feature branch: `feature/incremental-vip-migration`

---

## 2. Phase 0: Critical Fixes (Weeks 1-2)

### 2.1 Goal
**Fix immediate safety and UX issues before starting incremental refactor**

### 2.2 Tasks

#### Task 0.1: Complete Epic 9 Prerequisites
**Priority:** 🚨 P0 (BLOCKING)  
**Dependencies:** Story 9.1, 9.2, 9.3  
**Effort:** Already in progress

**Deliverables:**
- ✅ Unit reactivity bugs fixed
- ✅ Layout jumping resolved
- ✅ Dual-system conflicts eliminated
- ✅ Marine precision formatting complete

#### Task 0.2: Fix Red-Night Mode Violation
**Priority:** 🚨 P0 (Safety Critical)  
**File:** `app/settings/alarms.tsx:228`  
**Effort:** 30 minutes

**Implementation:**
```typescript
// BEFORE (DANGEROUS):
<View style={[
  styles.statusDot,
  { backgroundColor: config?.enabled ? theme.success || '#10B981' : theme.textSecondary }
]} />

// AFTER (RED-NIGHT COMPLIANT):
import { getAlarmStatusColor } from '../../../theme/settingsTokens';

<View style={[
  styles.statusDot,
  { backgroundColor: getAlarmStatusColor(config?.enabled, theme, theme.mode) }
]} />
```

**New Helper Function:**
```typescript
// src/theme/settingsTokens.ts
export const getAlarmStatusColor = (
  enabled: boolean,
  theme: ThemeColors,
  themeMode: 'day' | 'night' | 'red-night'
): string => {
  if (!enabled) {
    return themeMode === 'red-night' ? '#7F1D1D' : theme.textSecondary;
  }
  
  // Enabled colors - theme-aware
  switch (themeMode) {
    case 'red-night':
      return '#FCA5A5'; // Bright red (625nm - safe)
    case 'night':
      return '#34D399'; // Light green (OK for night)
    case 'day':
    default:
      return '#059669'; // Green (OK for day)
  }
};
```

**Testing:**
- ✅ Visual inspection in all three theme modes
- ✅ Verify no green in red-night mode
- ✅ Status dots still clearly visible

#### Task 0.3: Create Feature Flag System
**Priority:** P1  
**Effort:** 2 hours

**Implementation:**
```typescript
// src/config/featureFlags.ts [NEW]
export const FEATURE_FLAGS = {
  // Phase 1: Settings
  USE_UNIFIED_SETTINGS_MODALS: false,
  USE_SETTINGS_KEYBOARD_NAV: false,
  
  // Phase 2: Glove Mode
  USE_NAVIGATION_SESSION_GLOVE_MODE: false,
  USE_CONSOLIDATED_STORES: false,
  
  // Phase 3: Platform Chrome
  USE_PLATFORM_NAVIGATION: false,
  
  // Phase 4: Multi-Device
  USE_BLE_PROXIMITY: false,
  USE_MULTI_DEVICE_SYNC: false,
  
  // Phase 5: TV
  USE_TV_PLATFORM: false,
};

// Helper to enable/disable features
export const toggleFeature = (flag: keyof typeof FEATURE_FLAGS, enabled: boolean) => {
  FEATURE_FLAGS[flag] = enabled;
  console.log(`[FeatureFlags] ${flag} = ${enabled}`);
};
```

**Testing:**
- ✅ Feature flags accessible from developer menu
- ✅ Toggle does not crash app
- ✅ Flag state persists across restarts

### 2.3 Deliverables
- ✅ Epic 9 complete (presentation system stable)
- ✅ Red-night mode violation fixed
- ✅ Feature flag system operational
- ✅ All v2.3 tests still passing

### 2.4 Success Criteria
- No green colors in red-night mode (visual test)
- Feature flags toggle without errors
- WiFi Bridge simulator scenarios work
- Performance unchanged from v2.3 baseline

---

## 3. Phase 1: Settings Dialogs Refactor (Weeks 3-6)

### 3.1 Goal
**Implement unified settings modal system with cross-platform consistency**

**Reference:** SETTINGS-DIALOGS-CROSS-PLATFORM-IMPLEMENTATION.md

### 3.2 Sprint Breakdown

#### Sprint 1.1: Foundation (Week 3)
**Tasks:**
- [ ] Create `src/theme/settingsTokens.ts` (design tokens)
- [ ] Implement `detectPlatform()`, `isTouchDevice()`, `hasKeyboard()`
- [ ] Create `src/components/dialogs/base/BaseSettingsModal.tsx`
- [ ] Create `SettingsHeader.tsx` and `SettingsFooter.tsx`
- [ ] Add keyboard navigation support (Tab, Enter, Esc)

**Deliverables:**
- ✅ Reusable modal container
- ✅ Platform detection working
- ✅ Keyboard shortcuts functional (desktop only)

#### Sprint 1.2: Platform Inputs (Week 4)
**Tasks:**
- [ ] Create `PlatformTextInput.tsx` (touch + keyboard optimized)
- [ ] Create `PlatformToggle.tsx` (switch/radio patterns)
- [ ] Create `PlatformPicker.tsx` (dropdown selector)
- [ ] Implement glove-friendly touch targets (56pt tablet)
- [ ] Add focus indicators for keyboard navigation

**Deliverables:**
- ✅ Cross-platform input components
- ✅ Touch target validation (44pt phone, 56pt tablet)

#### Sprint 1.3: Connection Settings Migration (Week 5)
**Tasks:**
- [ ] Move `ConnectionConfigDialog.tsx` to `components/dialogs/`
- [ ] Refactor to use `BaseSettingsModal`
- [ ] Replace inputs with platform components
- [ ] Remove duplicate cancel button
- [ ] Add keyboard shortcuts (Cmd+S, Esc)
- [ ] Update all imports across codebase

**Deliverables:**
- ✅ Connection settings using unified pattern
- ✅ File in correct location
- ✅ No breaking changes to existing API

#### Sprint 1.4: Units & Alarms Migration (Week 6)
**Tasks:**
- [ ] Refactor `UnitsConfigDialog.tsx` → `UnitsConfigModal.tsx`
- [ ] Simplify preset labels ("US", "EU", "UK")
- [ ] Increase chip touch targets to 56pt
- [ ] Add "Reset to Defaults" button
- [ ] Create `AlarmSettingsModal.tsx` (convert from screen)
- [ ] Replace green status dots with toggle switches
- [ ] Add collapsible accordion sections for alarm details
- [ ] Consolidate entry points (hamburger menu → modal)

**Deliverables:**
- ✅ All three settings dialogs using unified pattern
- ✅ Red-night compliance verified
- ✅ Keyboard navigation working
- ✅ 67% fewer taps to configure alarms

### 3.3 Phase 1 Testing
**WiFi Bridge Scenarios:**
- Load "idle-at-marina" → Open settings → Test navigation
- Verify keyboard shortcuts on desktop
- Test touch targets on tablet (measure 56pt)
- Confirm red-night mode shows no green

**Acceptance Criteria:**
- ✅ All settings accessible via modals
- ✅ Keyboard navigation works (Tab, Enter, Esc)
- ✅ Touch targets meet marine standards (56pt tablet)
- ✅ Red-night mode fully compliant
- ✅ No regressions in NMEA functionality

---

## 4. Phase 2: Store Consolidation & Glove Mode (Weeks 7-11)

### 4.1 Goal
**Merge duplicate stores and implement navigation session-triggered UI density**

**References:** 
- REFACTORING-PLAN-VIP-PLATFORM.md (Sprint 1-2)
- VIP-UX-IMPLEMENTATION-GUIDE.md (Navigation Session spec)

### 4.2 Sprint Breakdown

#### Sprint 2.1: Store Consolidation (Week 7-8)
**Tasks:**
- [ ] Create `src/store/navigationSessionStore.ts`
- [ ] Merge `src/stores/alarmStore.ts` → `src/store/alarmStore.ts`
- [ ] Merge `src/stores/settingsStore.ts` → `src/store/settingsStore.ts`
- [ ] Delete `src/stores/` directory
- [ ] Update all imports (`src/stores/` → `src/store/`)
- [ ] Auto-start navigation session when SOG > 2.0

**Navigation Session Store:**
```typescript
interface NavigationSessionState {
  isActive: boolean;
  startTime: Date | null;
  sessionId: string | null;
  gloveModeActive: boolean; // Derived from isActive
  
  startSession: (sessionId?: string) => void;
  endSession: () => void;
}
```

**Deliverables:**
- ✅ Single `src/store/` directory
- ✅ Navigation session state persists
- ✅ Auto-start based on NMEA SOG data

#### Sprint 2.2: Glove Mode System (Week 9-10)
**Tasks:**
- [ ] Create `src/hooks/useUIDensity.ts`
- [ ] Create `src/config/density.ts` (glove vs native configs)
- [ ] Refactor `AutopilotFooter.tsx` to use density hook
- [ ] Update `PrimaryMetricCell.tsx` for density awareness
- [ ] Update `SecondaryMetricCell.tsx` for density awareness
- [ ] Add glove mode indicator (🧤 icon in header)

**Density Configurations:**
```typescript
export const DENSITY_CONFIGS = {
  glove: {
    touchTargetSize: 64,    // Marine glove-friendly
    swipeThreshold: 120,
    fontSize: { body: 18, heading: 24, value: 48 },
    spacing: { grid: 16, padding: 16 },
  },
  native: {
    touchTargetSize: 44,    // iOS HIG minimum
    swipeThreshold: 50,
    fontSize: { body: 16, heading: 20, value: 36 },
    spacing: { grid: 8, padding: 12 },
  },
};
```

**Deliverables:**
- ✅ UI density adapts to navigation session
- ✅ Touch targets grow to 64pt when underway
- ✅ Visual indicator shows current mode

#### Sprint 2.3: Dashboard Density Integration (Week 11)
**Tasks:**
- [ ] Update `PaginatedDashboard.tsx` to use `useUIDensity()`
- [ ] Update `useResponsiveGrid.ts` to factor in density
- [ ] Test grid reflow when glove mode toggles
- [ ] Add smooth transitions (300ms animation)

**Deliverables:**
- ✅ Dashboard fully glove-mode aware
- ✅ Smooth transitions between densities
- ✅ No layout jumping during transition

### 4.3 Phase 2 Testing
**WiFi Bridge Scenarios:**
- "idle-at-marina" → Touch targets 44pt, native density
- "underway-manual" → Touch targets 64pt, glove mode active
- "end-navigation-return-to-marina" → Revert to 44pt

**Acceptance Criteria:**
- ✅ Navigation session auto-starts when SOG > 2.0
- ✅ UI density switches automatically
- ✅ Glove mode indicator visible
- ✅ All interactions work with gloves (tested manually)
- ✅ Performance acceptable (< 100ms transition)

---

## 5. Phase 3: Platform Chrome & Navigation (Weeks 12-19)

### 5.1 Goal
**Add platform-specific navigation patterns (iOS tab bar, Android drawer, Web sidebar)**

**References:**
- REFACTORING-PLAN-VIP-PLATFORM.md (Sprint 3-8)
- VIP-UX-IMPLEMENTATION-GUIDE.md (Platform Chrome spec)

### 5.2 Sprint Breakdown

#### Sprint 3.1: Navigation Dependencies (Week 12)
**Tasks:**
- [ ] Install `@react-navigation/native`
- [ ] Install `@react-navigation/bottom-tabs`
- [ ] Install `@react-navigation/drawer`
- [ ] Install `expo-symbols` (SF Symbols for iOS)
- [ ] Install `react-native-vector-icons` (Material Icons)
- [ ] Create `src/navigation/` directory structure

**Deliverables:**
- ✅ All dependencies installed
- ✅ Navigation directory created
- ✅ No breaking changes to current app

#### Sprint 3.2: Platform Icon System (Week 13)
**Tasks:**
- [ ] Create `src/platform/icons/PlatformIcon.tsx`
- [ ] Create `src/platform/icons/MarineIcon.tsx` (custom SVG)
- [ ] Map platform-specific icons (SF Symbols vs Material)
- [ ] Test icon rendering on iOS, Android, Web

**Icon Mapping:**
```typescript
const iconMap = {
  ios: {
    dashboard: 'gauge',
    settings: 'gearshape',
    autopilot: 'location.circle',
    alarms: 'bell',
  },
  android: {
    dashboard: 'dashboard',
    settings: 'settings',
    autopilot: 'my-location',
    alarms: 'notifications',
  },
};
```

**Deliverables:**
- ✅ Platform-native icons working
- ✅ iOS shows SF Symbols
- ✅ Android shows Material Icons

#### Sprint 3.3: iOS Navigation (Week 14-15)
**Tasks:**
- [ ] Create `src/navigation/IOSNavigation.tsx`
- [ ] Implement bottom tab bar (iPhone)
- [ ] Implement sidebar (iPad landscape)
- [ ] Add tab icons and labels
- [ ] Connect to DashboardScreen, SettingsScreen
- [ ] Test on iPhone and iPad simulators

**Deliverables:**
- ✅ iOS tab bar functional
- ✅ iPad sidebar working
- ✅ Native iOS feel maintained

#### Sprint 3.4: Android Navigation (Week 16-17)
**Tasks:**
- [ ] Create `src/navigation/AndroidNavigation.tsx`
- [ ] Implement navigation drawer (hamburger menu)
- [ ] Add FAB for primary action (Add Widget)
- [ ] Connect to DashboardScreen, SettingsScreen
- [ ] Test on Android emulator

**Deliverables:**
- ✅ Android drawer functional
- ✅ FAB working for widget selection
- ✅ Material Design patterns followed

#### Sprint 3.5: Web Navigation (Week 18)
**Tasks:**
- [ ] Create `src/navigation/WebNavigation.tsx`
- [ ] Implement responsive sidebar (desktop)
- [ ] Implement drawer (mobile web)
- [ ] Add hover states for mouse interaction
- [ ] Test on Chrome, Safari, Firefox

**Deliverables:**
- ✅ Web sidebar working (desktop)
- ✅ Web drawer working (mobile)
- ✅ Responsive breakpoints tested

#### Sprint 3.6: Platform Router & Migration (Week 19)
**Tasks:**
- [ ] Create `src/navigation/index.tsx` (platform router)
- [ ] Add feature flag `USE_PLATFORM_NAVIGATION`
- [ ] Update App.tsx to conditionally render navigation
- [ ] Migrate screens to navigation structure
- [ ] Create SettingsScreen, AutopilotScreen, AlarmsScreen
- [ ] Test feature flag toggle

**Deliverables:**
- ✅ Platform router working
- ✅ Feature flag toggle functional
- ✅ All screens accessible via navigation

### 5.3 Phase 3 Testing
**Platform-Specific Testing:**
- iOS: Tab bar visible, tap to switch, iPad sidebar
- Android: Drawer opens, FAB adds widgets
- Web: Sidebar on desktop, drawer on mobile
- Feature flag: Toggle between old/new navigation

**Acceptance Criteria:**
- ✅ All platforms have native navigation patterns
- ✅ Marine core looks identical on all platforms
- ✅ Platform chrome matches OS conventions
- ✅ No regressions in NMEA/autopilot functionality

---

## 6. Phase 4: Multi-Device Coordination (Weeks 20-26)

### 6.1 Goal
**Enable device coordination and BLE proximity-based features**

**References:**
- VIP-PLATFORM-UX-STRATEGY.md (Multi-Device scenarios)
- brainstorming-camera-integration.md (MOB scenarios)

### 6.2 Sprint Breakdown

#### Sprint 4.1: BLE Proximity Foundation (Week 20-21)
**Tasks:**
- [ ] Install BLE libraries (`react-native-ble-plx`)
- [ ] Create `src/services/ble/BLEProximityManager.ts`
- [ ] Implement beacon broadcasting (phone as tag)
- [ ] Implement beacon detection (tablet as receiver)
- [ ] Create role profile system (Captain, Engineer, Crew)

**Deliverables:**
- ✅ BLE proximity detection working
- ✅ Role profiles assignable
- ✅ Privacy controls implemented

#### Sprint 4.2: Device Discovery & Pairing (Week 22)
**Tasks:**
- [ ] Create device discovery UI
- [ ] Implement secure pairing flow
- [ ] Create device management screen
- [ ] Add device nicknames and icons

**Deliverables:**
- ✅ Devices can discover each other
- ✅ Pairing flow secure and intuitive
- ✅ Device list manageable

#### Sprint 4.3: Multi-Device State Sync (Week 23-24)
**Tasks:**
- [ ] Create `src/services/sync/MultiDeviceSyncManager.ts`
- [ ] Implement WebSocket broadcast for state changes
- [ ] Sync NMEA data across devices
- [ ] Sync alarm states (acknowledge on one, dismiss all)
- [ ] Sync dashboard preferences

**State Sync Architecture:**
```typescript
// Centralized state (synced)
const sharedState = {
  nmeaData: <real-time stream>,
  alarmStates: <active alarms>,
  dashboardPreferences: <pinned widgets>,
};

// Device-local state (not synced)
const deviceState = {
  currentPage: <page index>,
  brightness: <screen brightness>,
  volume: <audio volume>,
};
```

**Deliverables:**
- ✅ NMEA data synced across devices
- ✅ Alarm acknowledgment synced
- ✅ Dashboard preferences synced

#### Sprint 4.4: Proximity-Based Dashboard (Week 25-26)
**Tasks:**
- [ ] Implement dashboard switching based on BLE proximity
- [ ] Create "Captain View", "Engineer View" presets
- [ ] Add voice confirmation on dashboard switch
- [ ] Test proximity detection accuracy

**Scenario:**
```
Captain walks to helm with phone in pocket
  ↓
Tablet detects "Captain" role (BLE)
  ↓
Dashboard switches to "Captain View"
  - Autopilot control prominent
  - Navigation widgets displayed
  ↓
Voice: "Captain view active"
```

**Deliverables:**
- ✅ Proximity-based dashboard switching
- ✅ Role-specific views configured
- ✅ Voice feedback implemented

### 6.3 Phase 4 Testing
**Multi-Device Scenarios:**
- Pair phone + tablet, verify discovery
- Walk with phone near tablet, verify proximity detection
- Acknowledge alarm on phone, verify dismissal on tablet
- Change widget on tablet, verify update on phone

**Acceptance Criteria:**
- ✅ BLE proximity reliable within 3 meters
- ✅ State sync < 1 second latency
- ✅ Dashboard switching smooth and reliable
- ✅ Privacy controls effective

---

## 7. Phase 5: TV Platform Support (Weeks 27-32)

### 7.1 Goal
**Add Smart TV support with 10-foot UI and D-pad navigation**

**References:**
- VIP-PLATFORM-UX-STRATEGY.md (TV section)
- V2.3-COMPLETION-HANDOFF.md (TV placeholders)

### 7.2 Sprint Breakdown

#### Sprint 5.1: TV Platform Detection (Week 27)
**Tasks:**
- [ ] Implement TV detection (`Platform.isTV`)
- [ ] Create `TVNavigation.tsx`
- [ ] Add TV-specific design tokens (80pt touch targets, 36pt fonts)
- [ ] Test on Apple TV and Android TV simulators

**Deliverables:**
- ✅ TV platform detected correctly
- ✅ TV-specific tokens configured

#### Sprint 5.2: TV D-pad Navigation (Week 28-29)
**Tasks:**
- [ ] Create `useTVRemoteNavigation.ts` hook
- [ ] Implement D-pad event handling (up/down/left/right/select)
- [ ] Add focus indicators (glowing borders)
- [ ] Create TV-specific input components
- [ ] Test navigation with TV remote

**Deliverables:**
- ✅ D-pad navigation functional
- ✅ Focus indicators visible
- ✅ TV remote control working

#### Sprint 5.3: TV Dashboard UI (Week 30)
**Tasks:**
- [ ] Design 10-foot UI dashboard
- [ ] Implement auto-cycling widgets
- [ ] Add large typography (36pt minimum)
- [ ] Test readability from 10 feet away

**TV Dashboard Characteristics:**
- 80pt touch targets (D-pad focus areas)
- 36-48pt typography (readable from distance)
- Auto-cycling every 10 seconds
- Full-screen widgets (one at a time)

**Deliverables:**
- ✅ TV dashboard readable from 10 feet
- ✅ Auto-cycling functional
- ✅ Focus navigation smooth

#### Sprint 5.4: TV Ambient Display Mode (Week 31)
**Tasks:**
- [ ] Implement passive awareness mode
- [ ] Add auto-dimming after inactivity
- [ ] Create widget rotation schedules
- [ ] Test power consumption

**Scenario:**
```
TV installed in salon
  ↓
Shows rotating widgets (depth, speed, wind)
  ↓
Dims after 5 minutes of inactivity
  ↓
Returns to full brightness on D-pad press
```

**Deliverables:**
- ✅ Ambient mode functional
- ✅ Auto-dimming working
- ✅ Power consumption optimized

#### Sprint 5.5: TV Integration Testing (Week 32)
**Tasks:**
- [ ] Test on Apple TV
- [ ] Test on Android TV (Fire TV)
- [ ] Verify multi-device sync with TV
- [ ] Test alarm display on TV
- [ ] Final UX polish

**Deliverables:**
- ✅ TV platform fully functional
- ✅ Multi-device scenarios working
- ✅ 10-foot UI validated

### 7.3 Phase 5 Testing
**TV-Specific Testing:**
- D-pad navigation (all directions)
- Focus indicators visible
- Text readable from 10 feet
- Auto-cycling smooth
- Integration with phone/tablet

**Acceptance Criteria:**
- ✅ TV platform works on Apple TV and Android TV
- ✅ D-pad navigation intuitive
- ✅ 10-foot UI meets readability standards
- ✅ Multi-device sync includes TV

---

## 8. Testing Strategy

### 8.1 WiFi Bridge Simulator Scenarios

**Scenario Definitions:**
1. **idle-at-marina** - Test native density (44pt)
2. **underway-manual** - Test glove mode activation (64pt)
3. **underway-autopilot** - Test autopilot in glove mode
4. **shallow-water-alarm** - Test alarm handling
5. **end-navigation-return-to-marina** - Test glove mode deactivation

**Usage:**
```bash
# Load scenario in app
Settings → Developer Tools → Load Scenario → "underway-manual"

# Verify expected behavior
- Touch targets should grow to 64pt
- Glove icon should appear
- Grid spacing should increase
```

### 8.2 Platform-Specific Testing

**iOS:**
- [ ] iPhone (portrait/landscape)
- [ ] iPad (portrait/landscape)
- [ ] Tab bar navigation
- [ ] SF Symbols rendering

**Android:**
- [ ] Phone (portrait/landscape)
- [ ] Tablet (portrait/landscape)
- [ ] Navigation drawer
- [ ] Material Icons rendering

**Web:**
- [ ] Desktop (1920×1080)
- [ ] Tablet (768×1024)
- [ ] Mobile (375×667)
- [ ] Sidebar vs drawer

**TV:**
- [ ] Apple TV (1920×1080)
- [ ] Android TV (1920×1080)
- [ ] D-pad navigation
- [ ] 10-foot UI readability

### 8.3 Regression Testing

**After Each Phase:**
- [ ] NMEA connection working
- [ ] Autopilot control functional
- [ ] Alarms triggering correctly
- [ ] Theme switching working
- [ ] Widget state persisting
- [ ] Performance acceptable (< 100ms interactions)

### 8.4 User Acceptance Testing

**Beta Tester Scenarios:**
1. First-time onboarding
2. Daily sailing workflow
3. Alarm configuration
4. Multi-device coordination
5. TV ambient display

---

## 9. Success Metrics

### 9.1 Phase-Specific Metrics

| Phase | Metric | Target | Baseline (v2.3) |
|-------|--------|--------|-----------------|
| **Phase 0** | Red-night violations | 0 | 1 (green dots) |
| **Phase 1** | Settings taps to configure | 3 | 7 |
| **Phase 1** | Keyboard navigation | 100% | 0% |
| **Phase 2** | Touch target size (glove mode) | 64pt | 44pt |
| **Phase 2** | UI density switch time | < 300ms | N/A |
| **Phase 3** | Platform navigation consistency | 100% | 33% |
| **Phase 4** | Multi-device sync latency | < 1s | N/A |
| **Phase 5** | TV readability (10ft) | 100% | N/A |

### 9.2 Overall Success Criteria

**Technical:**
- ✅ All platforms (iOS, Android, Web, TV) functional
- ✅ No regressions in NMEA/autopilot/alarms
- ✅ Performance maintained (< 100ms interactions)
- ✅ Red-night mode 100% compliant

**UX:**
- ✅ Navigation patterns consistent across platforms
- ✅ Settings configuration 67% faster
- ✅ Glove mode triggers automatically
- ✅ Multi-device coordination seamless

**Quality:**
- ✅ Test coverage > 60%
- ✅ Crash-free rate > 99.5%
- ✅ WiFi Bridge simulator scenarios pass
- ✅ Beta tester satisfaction > 4.5/5

---

## Appendix A: Document References

### Primary Reference Documents
1. **SETTINGS-DIALOGS-CROSS-PLATFORM-IMPLEMENTATION.md** - Phase 1 detailed spec
2. **REFACTORING-PLAN-VIP-PLATFORM.md** - Phase 2-3 implementation details
3. **VIP-PLATFORM-UX-STRATEGY.md** - Strategic vision and multi-device scenarios
4. **VIP-UX-IMPLEMENTATION-GUIDE.md** - Tactical execution guidance
5. **V2.3-COMPLETION-HANDOFF.md** - Current state baseline

### Supporting Documents
- **PRD.md** - Product requirements
- **brief.md** - Project vision
- **test-design-system.md** - Testing strategy
- **brainstorming-camera-integration.md** - MOB scenarios

---

## Appendix B: Phase Dependencies

```
Phase 0 (Critical Fixes)
  ↓
Phase 1 (Settings Dialogs) ← Can start in parallel
  ↓
Phase 2 (Glove Mode) ← Requires Phase 0
  ↓
Phase 3 (Platform Chrome) ← Requires Phase 1 & 2
  ↓
Phase 4 (Multi-Device) ← Requires Phase 3
  ↓
Phase 5 (TV Platform) ← Requires Phase 3 & 4
```

**Critical Path:** Phase 0 → Phase 2 → Phase 3 → Phase 4 → Phase 5  
**Parallel Track:** Phase 1 can run alongside Phase 2

---

## Appendix C: Risk Register

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| Epic 9 delays Phase 0 | High | Medium | Already in progress, track closely |
| Breaking changes during refactor | High | Low | Feature flags + parallel code paths |
| BLE proximity unreliable | Medium | Medium | Fallback to manual device selection |
| TV platform performance | Medium | Low | Test early, optimize incrementally |
| Multi-device sync complexity | High | Medium | Start with simple state, expand gradually |

---

## Document History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 1.0 | 2025-11-20 | Initial incremental roadmap | Sally (UX Expert) |

---

**Status:** 🎯 AUTHORITATIVE GUIDE - Use this as single source of truth for UX implementation

**Next Steps:**
1. Complete Epic 9 (Enhanced Presentation System)
2. Start Phase 0: Fix red-night mode violation
3. Set up feature flag system
4. Begin Phase 1: Settings dialogs refactor
