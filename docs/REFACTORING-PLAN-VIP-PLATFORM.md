# VIP Platform Refactoring Plan
## Strategic Migration from Current Architecture to VIP Platform

**Document Version:** 1.0
**Created:** 2025-10-20
**Author:** Sally (UX Expert)
**Status:** READY FOR EXECUTION

---

## Executive Summary

This document provides a **step-by-step refactoring plan** to transform the current Boating Instruments App into the VIP Platform architecture while:

- ✅ **Maintaining working code** throughout the migration (no big-bang rewrites)
- ✅ **Testing incrementally** using WiFi Bridge simulator with navigation scenarios
- ✅ **Preserving existing features** (NMEA dashboard, autopilot, alarms)
- ✅ **Adding platform chrome** (iOS tab bar, Android drawer, web responsive)
- ✅ **Implementing glove mode** (navigation session triggered density switching)
- ✅ **Avoiding Figma** (design-in-code with Storybook for visual testing)

**Timeline:** 8 sprints (16 weeks) for complete migration
**Strategy:** Incremental refactoring with parallel old/new code paths
**Risk:** Low (tested at each step with WiFi Bridge simulator)

---

## Table of Contents

1. [Current Architecture Analysis](#1-current-architecture-analysis)
2. [Migration Strategy](#2-migration-strategy)
3. [Refactoring Roadmap](#3-refactoring-roadmap)
4. [WiFi Bridge Simulator Test Scenarios](#4-wifi-bridge-simulator-test-scenarios)
5. [Design-in-Code with Storybook](#5-design-in-code-with-storybook)
6. [Step-by-Step Implementation Guide](#6-step-by-step-implementation-guide)

---

## 1. Current Architecture Analysis

### 1.1 What You Already Have ✅

**Excellent Foundation:**

```typescript
// STORES (Zustand) - Already well-structured
src/store/
├─ nmeaStore.ts          ✅ NMEA data management (KEEP, enhance)
├─ themeStore.ts         ✅ Theme system (KEEP, extend for glove mode)
└─ widgetStore.ts        ✅ Widget state (KEEP, add responsive logic)

src/stores/              ⚠️ DUPLICATE! (merge with src/store/)
├─ alarmStore.ts         ✅ Alarm management (KEEP, consolidate)
├─ settingsStore.ts      ✅ Settings (KEEP, consolidate)
└─ widgetStore.ts        ❌ Duplicate (merge into src/store/widgetStore.ts)

// COMPONENTS - Good separation
src/components/
├─ PaginatedDashboard.tsx        ✅ Grid layout (KEEP, refactor for glove mode)
├─ PrimaryMetricCell.tsx         ✅ Widget components (KEEP, make density-aware)
├─ SecondaryMetricCell.tsx       ✅ Widget components (KEEP, make density-aware)
├─ HeaderBar.tsx                 ⚠️ REFACTOR → Platform chrome split
└─ organisms/
   └─ AutopilotFooter.tsx        ✅ EXCELLENT! (Reference implementation for glove mode)

// SERVICES - Well architected
src/services/
├─ nmea/                 ✅ NMEA connection (KEEP, already solid)
├─ autopilot/            ✅ Autopilot logic (KEEP, excellent)
├─ alarms/               ✅ Alarm system (KEEP)
└─ playback/             ✅ WiFi Bridge simulator support (KEEP, enhance for testing)

// HOOKS - Great patterns
src/hooks/
├─ useResponsiveGrid.ts  ✅ EXCELLENT! (Extend for glove mode)
├─ useNMEAData.ts        ✅ Data hooks (KEEP)
└─ useUndoRedo.ts        ✅ Advanced features (KEEP)
```

**Current App.tsx Architecture:**
```typescript
<App>
  <HeaderBar />                    ← REFACTOR: Split into platform chrome
  <AlarmBanner />                  ← KEEP (marine core)
  <PaginatedDashboard />           ← ENHANCE: Add glove mode density
  <AutopilotFooter />              ← KEEP (already great!)
  <Modals>
    <WidgetSelector />
    <AutopilotControlScreen />
    <ConnectionConfigDialog />
  </Modals>
</App>
```

---

### 1.2 What Needs to Change ⚠️

**Critical Issues to Address:**

1. **No Platform-Specific Navigation**
   - Current: Single App.tsx for all platforms
   - Needed: iOS tab bar, Android drawer, web sidebar

2. **No Glove Mode System**
   - Current: Fixed 44pt touch targets everywhere
   - Needed: 64pt targets when navigation session active

3. **Navigation Session Not Connected to UI Density**
   - Current: Navigation session exists (lines 97-103) but doesn't affect UI
   - Needed: Trigger glove mode automatically

4. **Duplicate Store Directories**
   - `src/store/` vs `src/stores/` → Consolidate to `src/store/`

5. **Header/Navigation in App.tsx**
   - Current: HeaderBar is marine-specific
   - Needed: Platform chrome (tab bar on iOS, drawer on Android)

---

### 1.3 Migration Complexity Assessment

| Component | Current State | Refactoring Needed | Risk | Priority |
|-----------|---------------|-------------------|------|----------|
| **NMEA Services** | ✅ Excellent | None (keep as-is) | Low | - |
| **Autopilot Services** | ✅ Excellent | None (keep as-is) | Low | - |
| **Alarm System** | ✅ Good | Consolidate stores | Low | P2 |
| **Stores (Zustand)** | ⚠️ Duplicated | Merge directories | Low | P1 |
| **Navigation Session** | ⚠️ Exists but not connected | Connect to glove mode | Medium | P0 |
| **Dashboard Components** | ✅ Good | Add density awareness | Medium | P0 |
| **App.tsx Entry** | ⚠️ Monolithic | Split platform chrome | High | P0 |
| **Platform Navigation** | ❌ Missing | Add iOS/Android/Web chrome | High | P0 |

---

## 2. Migration Strategy

### 2.1 Incremental Refactoring Principle

**DO NOT:**
- ❌ Rewrite everything from scratch
- ❌ Break working features
- ❌ Big-bang migration

**DO:**
- ✅ Refactor incrementally (one component at a time)
- ✅ Test after each change (WiFi Bridge simulator)
- ✅ Keep both old and new code paths until migration complete
- ✅ Use feature flags to toggle new behavior

---

### 2.2 Feature Flag Strategy

```typescript
// src/config/features.ts
export const FEATURE_FLAGS = {
  USE_PLATFORM_NAVIGATION: false,  // Toggle iOS/Android chrome
  USE_GLOVE_MODE: false,            // Toggle navigation session density
  USE_NEW_STORES: false,            // Toggle consolidated stores

  // Gradual rollout
  enableGloveModeForNavigationSession: () => {
    FEATURE_FLAGS.USE_GLOVE_MODE = true;
  },
};

// In App.tsx
if (FEATURE_FLAGS.USE_PLATFORM_NAVIGATION) {
  return <PlatformNavigationApp />;  // NEW
} else {
  return <CurrentMonolithicApp />;   // OLD (fallback)
}
```

**Benefits:**
- Test new features without breaking production
- Easy rollback if issues found
- Incremental user migration

---

### 2.3 Parallel Code Paths During Migration

**Example: Dashboard Density Migration**

```typescript
// BEFORE (current)
<PaginatedDashboard
  selectedWidgets={widgets}
  headerHeight={60}
  footerHeight={88}
/>

// DURING MIGRATION (both paths exist)
{FEATURE_FLAGS.USE_GLOVE_MODE ? (
  <GloveModeAwareDashboard
    selectedWidgets={widgets}
    navigationSession={navigationSession}  // NEW: Connected to glove mode
  />
) : (
  <PaginatedDashboard
    selectedWidgets={widgets}
    headerHeight={60}
    footerHeight={88}
  />
)}

// AFTER MIGRATION (remove old code)
<GloveModeAwareDashboard
  selectedWidgets={widgets}
  navigationSession={navigationSession}
/>
```

---

## 3. Refactoring Roadmap

### Sprint 0: Preparation (Week 1)
**Goal:** Set up infrastructure for refactoring

**Tasks:**
- [ ] Create `src/config/features.ts` (feature flags)
- [ ] Set up Storybook for component visual testing
- [ ] Document WiFi Bridge simulator test scenarios
- [ ] Create refactoring branch `refactor/vip-platform`
- [ ] Audit current dependencies (add missing: @react-navigation, etc.)

**Acceptance Criteria:**
- ✅ Feature flags system working
- ✅ Storybook running with first component (AutopilotFooter)
- ✅ WiFi Bridge simulator scenarios documented

---

### Sprint 1: Store Consolidation (Weeks 2-3)
**Goal:** Merge duplicate stores, add navigation session store

**Tasks:**
- [ ] Create `src/store/navigationSessionStore.ts` (new)
- [ ] Merge `src/stores/alarmStore.ts` → `src/store/alarmStore.ts`
- [ ] Merge `src/stores/settingsStore.ts` → `src/store/settingsStore.ts`
- [ ] Delete `src/stores/` directory
- [ ] Update all imports (`src/stores/` → `src/store/`)

**New Navigation Session Store:**
```typescript
// src/store/navigationSessionStore.ts
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface NavigationSessionState {
  isActive: boolean;
  startTime: Date | null;
  sessionId: string | null;

  // Derived state for UI
  gloveModeActive: boolean;

  // Actions
  startSession: (sessionId?: string) => void;
  endSession: () => void;
}

export const useNavigationSession = create<NavigationSessionState>()(
  persist(
    (set, get) => ({
      isActive: false,
      startTime: null,
      sessionId: null,

      get gloveModeActive() {
        return get().isActive;
      },

      startSession: (sessionId) => {
        const id = sessionId || `nav_${Date.now()}`;
        set({
          isActive: true,
          startTime: new Date(),
          sessionId: id,
        });
        console.log('[NavigationSession] Started:', id);
      },

      endSession: () => {
        set({
          isActive: false,
          startTime: null,
          sessionId: null,
        });
        console.log('[NavigationSession] Ended');
      },
    }),
    {
      name: 'navigation-session',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
```

**Testing:**
- ✅ Navigation session state persists across app restarts
- ✅ WiFi Bridge simulator: SOG > 2.0 auto-starts session
- ✅ Manual start/stop works

---

### Sprint 2: Glove Mode System (Weeks 4-5)
**Goal:** UI density adaptation based on navigation session

**Tasks:**
- [ ] Create `src/hooks/useUIDensity.ts`
- [ ] Create `src/config/density.ts` (glove vs native configs)
- [ ] Refactor `AutopilotFooter.tsx` to use density hook (reference implementation)
- [ ] Update `PrimaryMetricCell.tsx` for density awareness
- [ ] Update `SecondaryMetricCell.tsx` for density awareness
- [ ] Add visual indicator (glove icon in header)

**UI Density Hook:**
```typescript
// src/hooks/useUIDensity.ts
import { useNavigationSession } from '../store/navigationSessionStore';
import { DENSITY_CONFIGS } from '../config/density';

export const useUIDensity = () => {
  const { gloveModeActive } = useNavigationSession();

  return DENSITY_CONFIGS[gloveModeActive ? 'glove' : 'native'];
};
```

**Density Configuration:**
```typescript
// src/config/density.ts
export const DENSITY_CONFIGS = {
  glove: {
    touchTargetSize: 64,
    swipeThreshold: 120,
    longPressDuration: 300,
    fontSize: {
      body: 18,
      heading: 24,
      value: 48,
    },
    spacing: {
      grid: 16,
      padding: 16,
    },
  },
  native: {
    touchTargetSize: 44,
    swipeThreshold: 50,
    longPressDuration: 500,
    fontSize: {
      body: 16,
      heading: 20,
      value: 36,
    },
    spacing: {
      grid: 8,
      padding: 12,
    },
  },
};
```

**Testing:**
- ✅ Start navigation session → Touch targets grow to 64pt
- ✅ End navigation session → Touch targets shrink to 44pt
- ✅ WiFi Bridge simulator: Autopilot engagement triggers glove mode
- ✅ Visual indicator (🧤) appears in header

---

### Sprint 3: Platform Chrome Foundation (Weeks 6-7)
**Goal:** Add iOS/Android/Web navigation structure

**Tasks:**
- [ ] Install dependencies (`@react-navigation/native`, `@react-navigation/bottom-tabs`, `@react-navigation/drawer`)
- [ ] Create `src/navigation/` directory
- [ ] Create `src/navigation/IOSNavigation.tsx` (tab bar)
- [ ] Create `src/navigation/AndroidNavigation.tsx` (drawer)
- [ ] Create `src/navigation/WebNavigation.tsx` (responsive)
- [ ] Create `src/navigation/index.tsx` (platform router)
- [ ] Add feature flag `USE_PLATFORM_NAVIGATION`

**Platform Router:**
```typescript
// src/navigation/index.tsx
import { Platform } from 'react-native';
import { FEATURE_FLAGS } from '../config/features';
import IOSNavigation from './IOSNavigation';
import AndroidNavigation from './AndroidNavigation';
import WebNavigation from './WebNavigation';

export const AppNavigation = () => {
  if (!FEATURE_FLAGS.USE_PLATFORM_NAVIGATION) {
    return null; // Fall back to current App.tsx navigation
  }

  if (Platform.OS === 'ios') {
    return <IOSNavigation />;
  } else if (Platform.OS === 'android') {
    return <AndroidNavigation />;
  } else {
    return <WebNavigation />;
  }
};
```

**Testing:**
- ✅ iOS: Tab bar visible at bottom, tap to switch screens
- ✅ Android: Drawer opens from hamburger menu
- ✅ Web: Sidebar on desktop, drawer on mobile
- ✅ Feature flag toggle works (old vs new navigation)

---

### Sprint 4: Icon System (Weeks 8-9)
**Goal:** Platform-specific icons (SF Symbols vs Material)

**Tasks:**
- [ ] Install `expo-symbols` (SF Symbols for iOS)
- [ ] Install `react-native-vector-icons` (Material Icons)
- [ ] Create `src/platform/icons/PlatformIcon.tsx`
- [ ] Create `src/platform/icons/MarineIcon.tsx` (custom SVG)
- [ ] Update navigation screens to use PlatformIcon

**Platform Icon Component:**
```typescript
// src/platform/icons/PlatformIcon.tsx
import { Platform } from 'react-native';
import { SFSymbol } from 'expo-symbols';
import MaterialIcon from 'react-native-vector-icons/MaterialIcons';

interface PlatformIconProps {
  name: 'dashboard' | 'settings' | 'autopilot' | 'alarms';
  size?: number;
  color?: string;
}

export const PlatformIcon: React.FC<PlatformIconProps> = ({ name, size = 24, color }) => {
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

  const platform = Platform.OS === 'ios' ? 'ios' : 'android';
  const iconName = iconMap[platform][name];

  if (Platform.OS === 'ios') {
    return <SFSymbol name={iconName} size={size} color={color} />;
  } else {
    return <MaterialIcon name={iconName} size={size} color={color} />;
  }
};
```

**Testing:**
- ✅ iOS shows SF Symbols (gauge, gearshape, etc.)
- ✅ Android shows Material Icons (dashboard, settings, etc.)
- ✅ Icons match platform conventions

---

### Sprint 5: Dashboard Refactoring (Weeks 10-11)
**Goal:** Connect dashboard to glove mode, platform chrome

**Tasks:**
- [ ] Create `src/screens/DashboardScreen.tsx` (new)
- [ ] Extract dashboard logic from `App.tsx` → `DashboardScreen.tsx`
- [ ] Update `PaginatedDashboard.tsx` to use `useUIDensity()`
- [ ] Update `useResponsiveGrid.ts` to factor in density
- [ ] Connect to platform navigation (iOS tab, Android drawer)

**Dashboard Screen:**
```typescript
// src/screens/DashboardScreen.tsx
import { PaginatedDashboard } from '../components/PaginatedDashboard';
import { AutopilotFooter } from '../components/organisms/AutopilotFooter';
import { AlarmBanner } from '../widgets/AlarmBanner';
import { useNmeaStore } from '../store/nmeaStore';

export const DashboardScreen: React.FC = () => {
  const { alarms } = useNmeaStore();

  return (
    <View style={{ flex: 1 }}>
      {alarms?.length > 0 && <AlarmBanner alarms={alarms} />}

      <PaginatedDashboard />  {/* Now glove-mode aware */}

      <AutopilotFooter />
    </View>
  );
};
```

**Testing:**
- ✅ Dashboard accessible via iOS tab bar
- ✅ Dashboard accessible via Android drawer
- ✅ Glove mode affects grid spacing and touch targets
- ✅ WiFi Bridge simulator: Navigation scenario triggers density change

---

### Sprint 6: Settings & Configuration Screens (Weeks 12-13)
**Goal:** Move settings into platform navigation

**Tasks:**
- [ ] Create `src/screens/SettingsScreen.tsx`
- [ ] Extract connection config from dialogs → settings screen
- [ ] Create settings sections (Connection, Widgets, Alarms, Display, About)
- [ ] Add to iOS tab bar, Android drawer

**Settings Screen Structure:**
```typescript
// src/screens/SettingsScreen.tsx
export const SettingsScreen = () => {
  return (
    <ScrollView>
      <SettingsSection title="Connection">
        <ConnectionSettings />
      </SettingsSection>

      <SettingsSection title="Widgets">
        <WidgetSelector />
      </SettingsSection>

      <SettingsSection title="Alarms">
        <AlarmThresholdSettings />
      </SettingsSection>

      <SettingsSection title="Display">
        <ThemeSelector />
        <UnitPreferences />
      </SettingsSection>

      <SettingsSection title="About">
        <AppVersion />
        <LicenseInfo />
      </SettingsSection>
    </ScrollView>
  );
};
```

**Testing:**
- ✅ Settings accessible from navigation
- ✅ Connection config works (WiFi Bridge)
- ✅ Widget selection persists
- ✅ Theme changes apply immediately

---

### Sprint 7: Autopilot & Alarms Screens (Weeks 14-15)
**Goal:** Full-screen autopilot control, alarms list

**Tasks:**
- [ ] Convert `AutopilotControlScreen` to navigation screen
- [ ] Create `AlarmsScreen.tsx` (alarm history, config)
- [ ] Add to navigation (iOS tab, Android drawer)
- [ ] Remove modal-based autopilot control

**Autopilot Screen:**
```typescript
// src/screens/AutopilotScreen.tsx (Already exists as modal - convert to screen)
export const AutopilotScreen = () => {
  return (
    <View>
      <AutopilotControls />     {/* Existing component */}
      <CompassRose />
      <HeadingAdjustment />
      <SafetyChecklist />
    </View>
  );
};
```

**Testing:**
- ✅ Autopilot screen accessible from navigation
- ✅ Heading adjustments work via WiFi Bridge simulator
- ✅ Safety confirmations work (±20° threshold)
- ✅ Alarms screen shows active and historical alarms

---

### Sprint 8: Final Migration & Cleanup (Week 16)
**Goal:** Remove old code, enable all feature flags permanently

**Tasks:**
- [ ] Enable all feature flags by default
- [ ] Remove old App.tsx monolithic code
- [ ] Delete unused components (old modals)
- [ ] Update App.tsx to only render `<AppNavigation />`
- [ ] Final WiFi Bridge simulator testing (all scenarios)
- [ ] Update documentation

**Final App.tsx (Simplified):**
```typescript
// App.tsx (AFTER REFACTORING)
import { AppNavigation } from './src/navigation';
import { OnboardingScreen } from './src/components/onboarding/OnboardingScreen';
import { useOnboarding } from './src/hooks/useOnboarding';

const App = () => {
  const { isOnboardingVisible, completeOnboarding, skipOnboarding } = useOnboarding();

  if (isOnboardingVisible) {
    return (
      <OnboardingScreen
        onComplete={completeOnboarding}
        onSkip={skipOnboarding}
      />
    );
  }

  return <AppNavigation />;  {/* Platform-specific chrome */}
};

export default App;
```

**Testing:**
- ✅ All features work on iOS, Android, Web
- ✅ WiFi Bridge simulator: All 5 test scenarios pass
- ✅ No regressions (NMEA, autopilot, alarms all functional)
- ✅ Glove mode triggered by navigation session
- ✅ Performance acceptable (< 100ms for all interactions)

---

## 4. WiFi Bridge Simulator Test Scenarios

### 4.1 Test Scenario Definitions

**Scenario 1: Idle at Marina (No Navigation Session)**
```yaml
Name: idle-at-marina
Purpose: Test native density mode (44pt targets)
NMEA Data:
  sog: 0.0
  depth: 8.5
  wind_speed: 5.0
  engine_rpm: 0
  autopilot_engaged: false

Expected UI State:
  navigation_session_active: false
  glove_mode_active: false
  touch_target_size: 44pt
  grid_spacing: 8pt
```

**Scenario 2: Underway - Manual Steering (Navigation Session Active)**
```yaml
Name: underway-manual
Purpose: Test glove mode activation via SOG
NMEA Data:
  sog: 6.5          # >2.0 triggers navigation session
  depth: 42.5
  wind_speed: 15.0
  cog: 280
  heading: 282
  engine_rpm: 2400
  autopilot_engaged: false

Expected UI State:
  navigation_session_active: true   # Auto-started by SOG
  glove_mode_active: true
  touch_target_size: 64pt
  grid_spacing: 16pt
  glove_indicator_visible: true
```

**Scenario 3: Underway - Autopilot Engaged**
```yaml
Name: underway-autopilot
Purpose: Test autopilot control in glove mode
NMEA Data:
  sog: 6.2
  depth: 38.0
  wind_speed: 12.0
  cog: 280
  heading: 280
  engine_rpm: 2200
  autopilot_engaged: true
  autopilot_heading: 280

Expected UI State:
  navigation_session_active: true
  glove_mode_active: true
  autopilot_footer_visible: true
  autopilot_controls_size: 64pt  # Large buttons for glove mode

Test Actions:
  - Tap "+10°" button (should adjust heading to 290°)
  - Tap "-10°" button (should adjust heading to 270°)
  - Both should work with gloves (64pt touch targets)
```

**Scenario 4: Shallow Water Alarm**
```yaml
Name: shallow-water-alarm
Purpose: Test alarm handling in glove mode
NMEA Data:
  sog: 5.0
  depth: 4.5        # Below 10ft threshold
  alarm_active: true
  alarm_type: shallow_water

Expected UI State:
  alarm_banner_visible: true
  alarm_dismiss_button: 64pt  # Glove-friendly
  visual_indicator: flashing
  audio_alert: triggered

Test Actions:
  - Tap "Dismiss" (64pt button, works with gloves)
  - Alarm should clear
```

**Scenario 5: End Navigation Session**
```yaml
Name: end-navigation-return-to-marina
Purpose: Test glove mode deactivation
NMEA Data:
  sog: 0.5          # <2.0 for 10 minutes → auto-end session
  depth: 9.0
  engine_rpm: 0
  autopilot_engaged: false

Expected UI State (After 10 Minutes):
  navigation_session_active: false
  glove_mode_active: false
  touch_target_size: 44pt    # Back to native density
  grid_spacing: 8pt
  glove_indicator_hidden: true
```

---

### 4.2 WiFi Bridge Simulator Configuration

**How to Use Your WiFi Bridge Simulator:**

```typescript
// src/services/playback/wifiBridgeScenarios.ts
export const SCENARIOS = {
  'idle-at-marina': {
    duration: 60000, // 1 minute
    nmeaData: {
      sog: 0.0,
      depth: 8.5,
      wind_speed: 5.0,
      // ... rest of scenario data
    },
  },

  'underway-manual': {
    duration: 300000, // 5 minutes
    nmeaData: {
      sog: 6.5,
      depth: 42.5,
      // ...
    },
  },

  // ... other scenarios
};

// In your playback service
export const loadScenario = (scenarioName: keyof typeof SCENARIOS) => {
  const scenario = SCENARIOS[scenarioName];
  playbackService.start(scenario);
};
```

**Testing Workflow:**
```bash
# 1. Start WiFi Bridge simulator
npm run dev:wifi-bridge

# 2. In app, load scenario
Settings → Developer Tools → Load Scenario → "underway-manual"

# 3. Verify UI changes
- Touch targets should grow to 64pt
- Glove icon (🧤) should appear
- Grid spacing should increase

# 4. Load next scenario
Load Scenario → "end-navigation-return-to-marina"

# 5. Verify UI reverts
- Touch targets shrink to 44pt
- Glove icon disappears
```

---

## 5. Design-in-Code with Storybook

### 5.1 Why Storybook > Figma for Your Use Case

**Storybook Benefits:**
- ✅ **Always in sync** with code (no Figma → code translation)
- ✅ **Interactive** (test glove mode toggle live)
- ✅ **Free** ($0 vs $15/month/user for Figma)
- ✅ **Platform-specific variants** (show iOS vs Android side-by-side)
- ✅ **Real data** (connect to NMEA store, see live values)

**Setup:**
```bash
npx sb init --type react_native
npm install @storybook/react-native --save-dev
```

---

### 5.2 Component Story Examples

**AutopilotFooter Story:**
```typescript
// src/components/organisms/AutopilotFooter.stories.tsx
import { AutopilotFooter } from './AutopilotFooter';
import { useNavigationSession } from '../../store/navigationSessionStore';

export default {
  title: 'Organisms/AutopilotFooter',
  component: AutopilotFooter,
};

// Story 1: Native Density (No Navigation Session)
export const NativeDensity = () => {
  useNavigationSession.getState().endSession();
  return <AutopilotFooter />;
};

// Story 2: Glove Mode (Navigation Session Active)
export const GloveMode = () => {
  useNavigationSession.getState().startSession('test-session');
  return <AutopilotFooter />;
};

// Story 3: Interactive Toggle
export const InteractiveToggle = () => {
  const { isActive, startSession, endSession } = useNavigationSession();

  return (
    <View>
      <Button onPress={() => isActive ? endSession() : startSession()}>
        Toggle Navigation Session
      </Button>

      <AutopilotFooter />

      <Text>Current State: {isActive ? 'GLOVE MODE' : 'NATIVE'}</Text>
    </View>
  );
};
```

**Visual Regression Testing:**
```bash
# Run Storybook
npm run storybook

# Open in browser (web) or device (iOS/Android)
# Screenshot each story → Visual "design spec"

# Compare before/after refactoring
npm run test:visual-regression
```

---

## 6. Step-by-Step Implementation Guide

### Week 1: Preparation Sprint

**Day 1-2: Feature Flags Setup**
```typescript
// 1. Create src/config/features.ts
export const FEATURE_FLAGS = {
  USE_PLATFORM_NAVIGATION: false,
  USE_GLOVE_MODE: false,
  USE_NEW_STORES: false,
};

// 2. Update App.tsx to check flags
if (FEATURE_FLAGS.USE_PLATFORM_NAVIGATION) {
  // New navigation (coming soon)
} else {
  // Current App.tsx code (keep working)
}
```

**Day 3-4: Storybook Setup**
```bash
# Install Storybook
npx sb init --type react_native

# Create first story (AutopilotFooter)
touch src/components/organisms/AutopilotFooter.stories.tsx

# Run Storybook
npm run storybook
```

**Day 5: WiFi Bridge Scenarios**
```typescript
// Create src/services/playback/wifiBridgeScenarios.ts
// Define 5 test scenarios (idle, underway-manual, autopilot, alarm, end-session)

// Update playbackService to load scenarios
export const loadScenario = (name: string) => { /* ... */ };
```

---

### Weeks 2-3: Store Consolidation

**Step 1: Create Navigation Session Store**
```bash
# Create new store
touch src/store/navigationSessionStore.ts

# Implement (see Sprint 1 code above)
```

**Step 2: Merge Duplicate Stores**
```bash
# Copy contents
cp src/stores/alarmStore.ts src/store/alarmStore.ts
cp src/stores/settingsStore.ts src/store/settingsStore.ts

# Update imports (find/replace across codebase)
# src/stores/ → src/store/

# Delete old directory
rm -rf src/stores/
```

**Step 3: Test with WiFi Bridge**
```bash
# Load "underway-manual" scenario
# Verify navigation session auto-starts when SOG > 2.0
```

---

### Weeks 4-5: Glove Mode Implementation

**Step 1: Create Density Configuration**
```typescript
// src/config/density.ts (see Sprint 2 code above)
```

**Step 2: Create useUIDensity Hook**
```typescript
// src/hooks/useUIDensity.ts (see Sprint 2 code above)
```

**Step 3: Refactor AutopilotFooter (Reference Implementation)**
```typescript
// src/components/organisms/AutopilotFooter.tsx
const density = useUIDensity();

return (
  <View style={{ paddingHorizontal: density.spacing.padding }}>
    <TouchableOpacity
      style={{ width: density.touchTargetSize, height: density.touchTargetSize }}
    >
      {/* Button content */}
    </TouchableOpacity>
  </View>
);
```

**Step 4: Test Glove Mode Toggle**
```bash
# Load "idle-at-marina" → Touch targets 44pt
# Load "underway-manual" → Touch targets 64pt
# Verify smooth transition
```

---

### Weeks 6-16: Continue Sprint Plan...

*(Full implementation details in Sprint 3-8 sections above)*

---

## Appendix A: Refactoring Checklist

### Pre-Refactoring Checklist
- [ ] All current features tested and working
- [ ] WiFi Bridge simulator configured with 5 scenarios
- [ ] Storybook installed and first story created
- [ ] Feature flags system implemented
- [ ] Refactoring branch created (`refactor/vip-platform`)

### Sprint 1 Checklist (Store Consolidation)
- [ ] Navigation session store created
- [ ] Duplicate stores merged (alarm, settings)
- [ ] All imports updated (`src/stores/` → `src/store/`)
- [ ] Tests pass

### Sprint 2 Checklist (Glove Mode)
- [ ] Density configuration created
- [ ] useUIDensity hook implemented
- [ ] AutopilotFooter refactored (reference)
- [ ] Visual indicator (glove icon) added
- [ ] WiFi Bridge test: Glove mode activates/deactivates

### Sprint 3 Checklist (Platform Chrome)
- [ ] Navigation dependencies installed
- [ ] iOS tab bar navigation created
- [ ] Android drawer navigation created
- [ ] Web responsive navigation created
- [ ] Feature flag toggle works

### Sprint 4 Checklist (Icons)
- [ ] SF Symbols integration (iOS)
- [ ] Material Icons integration (Android)
- [ ] PlatformIcon component created
- [ ] Marine custom icons (SVG)

### Sprint 5 Checklist (Dashboard)
- [ ] DashboardScreen created
- [ ] PaginatedDashboard density-aware
- [ ] Connected to platform navigation
- [ ] WiFi Bridge test: All scenarios work

### Sprint 6 Checklist (Settings)
- [ ] SettingsScreen created
- [ ] All settings sections implemented
- [ ] Accessible from navigation

### Sprint 7 Checklist (Autopilot/Alarms)
- [ ] AutopilotScreen created (from modal)
- [ ] AlarmsScreen created
- [ ] Added to navigation

### Sprint 8 Checklist (Final Migration)
- [ ] All feature flags enabled by default
- [ ] Old App.tsx code removed
- [ ] Documentation updated
- [ ] Final WiFi Bridge test suite passes

---

## Appendix B: Risk Mitigation

### Risk 1: Breaking Changes During Refactoring
**Mitigation:**
- Use feature flags (can rollback instantly)
- Keep parallel code paths until fully tested
- Test incrementally with WiFi Bridge after each sprint

### Risk 2: Navigation Session Not Triggering Glove Mode
**Mitigation:**
- Test with WiFi Bridge "underway-manual" scenario
- Add logging to useUIDensity hook
- Verify with Storybook interactive toggle

### Risk 3: Platform Chrome Feeling Non-Native
**Mitigation:**
- Use official React Navigation libraries (battle-tested)
- Test on real iOS/Android devices (not just simulator)
- Follow platform HIG/Material Design guidelines strictly

---

## Document History

| Version | Date | Changes | Author |
|---------|------|---------|---------|
| 1.0 | 2025-10-20 | Initial refactoring plan with 8-sprint roadmap | Sally (UX Expert) |

---

**Status:** ✅ READY FOR EXECUTION

**Next Steps:**
1. Review this plan with development team
2. Set up Sprint 0 (Week 1) - Preparation
3. Start Sprint 1 (Weeks 2-3) - Store consolidation
4. Test incrementally with WiFi Bridge simulator after each sprint

**Questions for Pieter:**
1. Does this incremental approach work for your timeline?
2. Should we prioritize any sprint differently?
3. Is the WiFi Bridge simulator already configured with scenario loading?
