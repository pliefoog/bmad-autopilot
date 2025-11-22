# Epic 13: VIP Platform UX Implementation
## Incremental Multi-Platform Marine UX Enhancement

**Epic ID:** 13.0
**Priority:** P1 (Strategic Enhancement)
**Status:** Ready for Development
**Timeline:** 6 phases × 2-7 weeks each = ~32 weeks total
**Dependencies:** Epic 9 (Enhanced Presentation System) must be complete

---

## Epic Overview

**Problem Solved:** Transforms the current single-platform marine instrument app into the VIP (Very Integrated Platform) vision - a voice-first, multi-device, glove-friendly marine companion that works seamlessly across phones, tablets, desktops, and Smart TVs.

**Strategic Value:**
- **Voice-First Autopilot Control** - Eyes on water, hands on wheel
- **Navigation Session Intelligence** - Auto-adapts UI density when underway
- **Multi-Device Coordination** - BLE proximity + role-based dashboards
- **Platform-Native Feel** - iOS tab bar, Android drawer, Web sidebar, TV D-pad
- **Smart TV Expansion** - Passive awareness displays in salon/cockpit

---

## Epic Goals

### Primary Goals
1. **Red-Night Compliance** - Eliminate green/blue/white violations (625nm only)
2. **Settings UX Modernization** - 67% fewer taps, unified modal system
3. **Glove Mode System** - Auto-adaptation when SOG > 2.0 (64pt touch targets)
4. **Platform Differentiation** - Native navigation chrome per platform
5. **Multi-Device Orchestration** - BLE proximity + state sync < 1 second
6. **TV Platform Support** - 10-foot UI with D-pad navigation

### Success Metrics
- ✅ Zero green colors in red-night mode (visual validation)
- ✅ Settings configuration 67% faster (measured taps)
- ✅ Navigation session auto-start within 2 seconds of SOG > 2.0
- ✅ Platform navigation feels native (iOS HIG, Material Design compliance)
- ✅ Multi-device state sync < 1 second latency
- ✅ TV UI readable from 10 feet (physical distance test)

---

## Functional Requirements Coverage

**Total FRs:** 24 functional requirements across 6 phases

| Phase | FRs | Epic | Focus Area |
|-------|-----|------|------------|
| **Phase 0** | 2 | 13.1 | Critical fixes & infrastructure |
| **Phase 1** | 4 | 13.2 | Settings system modernization |
| **Phase 2** | 4 | 13.3 | Navigation session & glove mode |
| **Phase 3** | 4 | 13.4 | Platform-native navigation |
| **Phase 4** | 5 | 13.5 | Multi-device coordination |
| **Phase 5** | 5 | 13.6 | TV platform support |

---

## Epic Structure

```
Epic 13: VIP Platform UX Implementation
├─ Epic 13.1: Critical Fixes & Feature Flags (Phase 0) - 2 weeks
│  ├─ Story 13.1.1: Fix Red-Night Mode Color Violations
│  ├─ Story 13.1.2: Create Feature Flag Infrastructure
│  └─ Story 13.1.3: Validate Epic 9 Presentation System Complete
│
├─ Epic 13.2: Unified Settings System (Phase 1) - 4 weeks
│  ├─ Story 13.2.1: Create Base Settings Modal Foundation
│  ├─ Story 13.2.2: Implement Platform Input Components
│  ├─ Story 13.2.3: Migrate Connection Settings to Unified Pattern
│  └─ Story 13.2.4: Refactor Units and Alarms Settings
│
├─ Epic 13.3: Navigation Session & Glove Mode (Phase 2) - 5 weeks
│  ├─ Story 13.3.1: Create Navigation Session Store
│  ├─ Story 13.3.2: Consolidate Store Architecture
│  ├─ Story 13.3.3: Implement UI Density System
│  └─ Story 13.3.4: Integrate Density with Dashboard Grid
│
├─ Epic 13.4: Platform-Native Navigation (Phase 3) - 8 weeks
│  ├─ Story 13.4.1: Install Navigation Dependencies & Icon System
│  ├─ Story 13.4.2: Implement iOS Navigation (Tab Bar + Sidebar)
│  ├─ Story 13.4.3: Implement Android Navigation (Drawer + FAB)
│  ├─ Story 13.4.4: Implement Web Navigation (Responsive Sidebar)
│  └─ Story 13.4.5: Create Platform Router & Feature Flag Integration
│
├─ Epic 13.5: Multi-Device Coordination (Phase 4) - 6 weeks
│  ├─ Story 13.5.1: Implement BLE Proximity Detection
│  ├─ Story 13.5.2: Create Multi-Device State Sync
│  ├─ Story 13.5.3: Implement Proximity-Based Dashboard Switching
│  └─ Story 13.5.4: Create Device Discovery & Pairing UI
│
└─ Epic 13.6: TV Platform Support (Phase 5) - 7 weeks
   ├─ Story 13.6.1: Implement TV Platform Detection & Design Tokens
   ├─ Story 13.6.2: Implement D-Pad Navigation System
   ├─ Story 13.6.3: Create TV 10-Foot Dashboard UI
   ├─ Story 13.6.4: Implement TV Ambient Display Mode
   └─ Story 13.6.5: TV Integration Testing & Optimization
```

---

## Story Details

## **Epic 13.1: Critical Fixes & Feature Flags (Phase 0)**

### **Story 13.1.1: Fix Red-Night Mode Color Violations**
**Priority:** P0 (Blocking)  
**Effort:** 4 hours  
**Dependencies:** None

**Description:**
Eliminate green/blue/white color usage in red-night mode to preserve night vision. Status indicator dots currently show green (#10B981) which destroys night vision adaptation at 625nm wavelength.

**Acceptance Criteria:**

```gherkin
Given the app is running in red-night mode
When I navigate to any screen with status indicators
Then I should see NO green colors (#10B981 or similar)
  And I should see only red spectrum colors (625nm)
  And active states should use bright red (#FCA5A5)
  And inactive states should use dark red (#7F1D1D)

Given I am viewing the connection status indicator
When the connection is active
Then the indicator should show bright red (#FCA5A5), not green
  And the indicator should be clearly distinguishable from inactive state

Given I perform a visual inspection across all widgets
When checking each widget in red-night mode
Then NO widget should display green, blue, or white colors
  And all text should be red spectrum only
  And backgrounds should be dark red (#1C0000, #2D0000)
```

**Technical Notes:**
- Update `themeColors.ts` red-night palette
- Replace conditional color logic in status components
- Visual regression test in all three theme modes

---

### **Story 13.1.2: Create Feature Flag Infrastructure**
**Priority:** P0 (Enables all Phase 1-5 features)  
**Effort:** 3 hours  
**Dependencies:** None

**Description:**
Implement feature flag system to enable safe progressive rollout of VIP Platform features without risking production stability.

**Acceptance Criteria:**

```gherkin
Given the feature flag system is initialized
When I access FEATURE_FLAGS configuration
Then I should see flags for all 6 phases (Phase 0-5)
  And all flags should default to false (disabled)
  And flag names should be descriptive (USE_UNIFIED_SETTINGS_MODALS)

Given I am a developer with access to the developer menu
When I open the developer menu
Then I should see a "Feature Flags" section
  And I should be able to toggle any feature flag
  And toggling should not crash the app

Given I toggle USE_UNIFIED_SETTINGS_MODALS to true
When I save the setting
Then the flag state should persist across app restarts
  And the new settings modal should be activated
  And I should be able to toggle back to false without errors

Given I implement a new VIP feature
When I wrap the feature with a feature flag check
Then the feature should only render when the flag is enabled
  And the app should function normally when the flag is disabled
```

**Technical Notes:**
- Create `src/config/featureFlags.ts`
- Add developer menu toggle UI
- Use AsyncStorage for persistence
- Log flag state changes to console

---

### **Story 13.1.3: Validate Epic 9 Presentation System Complete**
**Priority:** P0 (Blocking dependency)  
**Effort:** 2 hours (validation only)  
**Dependencies:** Epic 9 must be complete

**Description:**
Verify Epic 9 (Enhanced Presentation System) is fully complete before proceeding with Phase 1. Presentation layer stability is required for VIP features.

**Acceptance Criteria:**

```gherkin
Given Epic 9 stories are marked complete
When I run the unit test suite
Then all presentation system tests should pass
  And no legacy useUnitConversion calls should exist in codebase

Given I change unit settings (kts → mph)
When I observe any widget display
Then the unit change should propagate instantly without restart
  And metric values should update within 1 render cycle

Given I display depth values changing from 42.5 ft to 142.3 ft
When I observe the widget layout
Then there should be ZERO visual jumping or layout shift
  And minWidth calculations should prevent size changes

Given I measure metric formatting performance
When processing 100 metric conversions
Then average formatting time should be < 5ms
  And font measurement cache should be utilized
```

**Technical Notes:**
- Run automated tests for Epic 9 stories
- Visual inspection of layout stability
- Performance benchmark validation
- Check for `useUnitConversion` references (should be zero)

---

## **Epic 13.2: Unified Settings System (Phase 1)**

### **Story 13.2.1: Create Base Settings Modal Foundation**
**Priority:** P1  
**Effort:** 8 hours  
**Dependencies:** Story 13.1.2 (feature flags)

**Description:**
Implement reusable BaseSettingsModal component with cross-platform consistency, keyboard navigation, and glove-friendly touch targets.

**Acceptance Criteria:**

```gherkin
Given I am on any screen requiring settings configuration
When I tap a settings trigger
Then a modal should appear using BaseSettingsModal
  And the modal should be centered on screen
  And the modal should have consistent header/footer

Given I am using a desktop browser with keyboard
When the settings modal is open
Then I should be able to Tab through all inputs
  And pressing Enter should submit the form
  And pressing Escape should close the modal

Given I am using a tablet with glove-friendly mode active
When I interact with modal inputs
Then all touch targets should be 56pt or larger
  And spacing between elements should be 16pt or more

Given the modal is open on any platform
When I tap outside the modal area
Then the modal should close (dismissible)
  Or the modal should remain open (non-dismissible) based on configuration
```

**Technical Notes:**
- Create `src/components/dialogs/base/BaseSettingsModal.tsx`
- Platform detection: `detectPlatform()`, `hasKeyboard()`
- Keyboard event listeners (Tab, Enter, Esc)
- Design tokens: `src/theme/settingsTokens.ts`

---

### **Story 13.2.2: Implement Platform Input Components**
**Priority:** P1  
**Effort:** 10 hours  
**Dependencies:** Story 13.2.1

**Description:**
Create cross-platform input components (PlatformTextInput, PlatformToggle, PlatformPicker) optimized for both touch and keyboard interaction.

**Acceptance Criteria:**

```gherkin
Given I am using PlatformTextInput on a touch device
When I tap the input field
Then the on-screen keyboard should appear
  And the input should have 56pt touch target height (tablet)
  And the input should have 44pt touch target height (phone)

Given I am using PlatformTextInput on desktop
When I focus the input with Tab key
Then a visible focus indicator should appear (blue border)
  And I should be able to type immediately
  And pressing Enter should submit the form

Given I am using PlatformToggle component
When I render it on iOS
Then it should use a native switch component
When I render it on Android
Then it should use a Material Design toggle
When I render it on Web
Then it should use a custom styled toggle

Given I am using PlatformPicker for unit selection
When I tap the picker on mobile
Then a native picker sheet should slide up from bottom
When I click the picker on desktop
Then a dropdown menu should appear below the input
  And keyboard arrow keys should navigate options
```

**Technical Notes:**
- `src/components/dialogs/inputs/PlatformTextInput.tsx`
- `src/components/dialogs/inputs/PlatformToggle.tsx`
- `src/components/dialogs/inputs/PlatformPicker.tsx`
- Touch target validation: 44pt phone, 56pt tablet
- Focus indicators for keyboard navigation

---

### **Story 13.2.3: Migrate Connection Settings to Unified Pattern**
**Priority:** P1  
**Effort:** 6 hours  
**Dependencies:** Story 13.2.2

**Description:**
Refactor ConnectionConfigDialog to use BaseSettingsModal and platform input components, eliminating duplicate cancel button and adding keyboard shortcuts.

**Acceptance Criteria:**

```gherkin
Given I need to configure WiFi bridge settings
When I open connection settings
Then the dialog should use BaseSettingsModal container
  And the dialog should use PlatformTextInput for IP address
  And the dialog should use PlatformTextInput for port number
  And there should be only ONE cancel button (in footer)

Given I am configuring connection settings on desktop
When the modal is open
Then pressing Cmd+S (Mac) or Ctrl+S (Windows) should save settings
  And pressing Escape should cancel without saving

Given I save connection settings
When the save operation completes
Then the modal should close automatically
  And the connection should attempt to reconnect with new settings
  And no breaking changes should occur to existing functionality

Given I open connection settings from any entry point
When I verify file location
Then ConnectionConfigDialog should be in src/components/dialogs/
  And all imports across codebase should reference new location
```

**Technical Notes:**
- Move file to `src/components/dialogs/ConnectionConfigDialog.tsx`
- Refactor to extend BaseSettingsModal
- Replace native inputs with platform components
- Update imports throughout codebase
- Add keyboard shortcuts (Cmd+S, Esc)

---

### **Story 13.2.4: Refactor Units and Alarms Settings**
**Priority:** P1  
**Effort:** 12 hours  
**Dependencies:** Story 13.2.3

**Description:**
Migrate UnitsConfigDialog and convert AlarmScreen to modal pattern, improving UX with simplified presets, larger touch targets, and collapsible sections.

**Acceptance Criteria:**

```gherkin
Given I open units configuration settings
When I view preset options
Then I should see simplified labels ("US", "EU", "UK")
  And preset chips should have 56pt touch targets (tablet)
  And tapping a preset should immediately show selected units

Given I tap "Reset to Defaults"
When the reset completes
Then all unit settings should revert to US defaults
  And the UI should update immediately without refresh

Given I open alarm configuration
When I view the alarm list
Then each alarm should be in a collapsible accordion section
  And toggle switches should replace green status dots
  And alarm details should expand/collapse on tap

Given I want to configure a depth alarm
When I expand the depth alarm section
Then I should see threshold input, enabled toggle, and audio settings
  And all inputs should follow glove-friendly sizing (56pt)

Given I configure alarm settings and save
When comparing old vs new UX
Then the new flow should require 67% fewer taps
  And all functionality should be accessible via hamburger menu → modal
```

**Technical Notes:**
- Refactor `UnitsConfigDialog.tsx` → `UnitsConfigModal.tsx`
- Create `AlarmSettingsModal.tsx` (convert from screen)
- Replace green status indicators with toggles (red-night compliance)
- Implement accordion sections for alarm details
- Consolidate entry points (menu → modal pattern)

---

## **Epic 13.3: Navigation Session & Glove Mode (Phase 2)**

### **Story 13.3.1: Create Navigation Session Store**
**Priority:** P1  
**Effort:** 8 hours  
**Dependencies:** Story 13.1.2 (feature flags)

**Description:**
Implement navigation session state management with auto-start detection based on SOG > 2.0 knots from NMEA data.

**Acceptance Criteria:**

```gherkin
Given the app is connected to NMEA data stream
When SOG (Speed Over Ground) increases above 2.0 knots
Then navigation session should auto-start within 2 seconds
  And isActive should become true
  And startTime should be set to current timestamp
  And sessionId should be generated (UUID)

Given navigation session is active
When SOG drops below 2.0 knots
Then a 10-minute timer should begin
  And if SOG remains below 2.0 for full 10 minutes
  Then navigation session should auto-end
  And isActive should become false

Given I manually start a navigation session
When I call startSession()
Then session should start regardless of SOG value
  And gloveModeActive should derive from isActive (true)

Given navigation session ends
When I verify state persistence
Then session history should be saved to AsyncStorage
  And session end time should be logged
```

**Technical Notes:**
- Create `src/store/navigationSessionStore.ts`
- Subscribe to NMEA SOG data from existing store
- Implement 10-minute hysteresis timer
- Derive `gloveModeActive` from `isActive` state
- Persist session history

---

### **Story 13.3.2: Consolidate Store Architecture**
**Priority:** P1  
**Effort:** 6 hours  
**Dependencies:** Story 13.3.1

**Description:**
Merge duplicate stores from src/stores/ into unified src/store/ directory, eliminating path confusion.

**Acceptance Criteria:**

```gherkin
Given the codebase has duplicate store directories
When I complete store consolidation
Then only src/store/ directory should exist
  And src/stores/ directory should be deleted
  And all store files should be in src/store/

Given I merge alarmStore
When I move src/stores/alarmStore.ts → src/store/alarmStore.ts
Then all imports referencing src/stores/alarmStore should be updated
  And alarm functionality should work identically

Given I merge settingsStore
When I move src/stores/settingsStore.ts → src/store/settingsStore.ts
Then all imports referencing src/stores/settingsStore should be updated
  And settings functionality should work identically

Given I search the codebase
When I look for "src/stores/" import statements
Then I should find ZERO results
  And all imports should reference "src/store/"
```

**Technical Notes:**
- Merge `src/stores/alarmStore.ts` → `src/store/alarmStore.ts`
- Merge `src/stores/settingsStore.ts` → `src/store/settingsStore.ts`
- Delete `src/stores/` directory
- Update all imports across codebase
- Run tests to verify no regressions

---

### **Story 13.3.3: Implement UI Density System**
**Priority:** P1  
**Effort:** 10 hours  
**Dependencies:** Story 13.3.1

**Description:**
Create UI density hook and configuration that adapts touch targets, fonts, and spacing based on navigation session state.

**Acceptance Criteria:**

```gherkin
Given navigation session is inactive (at dock)
When I use useUIDensity() hook
Then density mode should return "native"
  And touchTargetSize should be 44pt
  And swipeThreshold should be 50px
  And fontSize.body should be 16pt

Given navigation session becomes active (underway)
When I use useUIDensity() hook
Then density mode should return "glove"
  And touchTargetSize should be 64pt
  And swipeThreshold should be 120px
  And fontSize.body should be 18pt

Given AutopilotFooter component uses useUIDensity()
When density switches from native to glove
Then all touch targets should grow to 64pt
  And transitions should be smooth (300ms)
  And no layout jumping should occur

Given I add glove mode visual indicator
When navigation session is active
Then a 🧤 icon should appear in the header
  And the icon should be clearly visible
  And tapping the icon should show "Glove Mode Active" tooltip
```

**Technical Notes:**
- Create `src/hooks/useUIDensity.ts`
- Create `src/config/density.ts` with glove/native configs
- Subscribe to navigationSessionStore.isActive
- Update AutopilotFooter, PrimaryMetricCell, SecondaryMetricCell
- Add glove mode indicator to header

---

### **Story 13.3.4: Integrate Density with Dashboard Grid**
**Priority:** P1  
**Effort:** 8 hours  
**Dependencies:** Story 13.3.3

**Description:**
Make PaginatedDashboard and grid system fully density-aware with smooth transitions between modes.

**Acceptance Criteria:**

```gherkin
Given the dashboard is displaying widgets in native mode
When navigation session starts (glove mode activates)
Then widget grid should reflow smoothly over 300ms
  And touch targets should grow from 44pt to 64pt
  And grid spacing should increase from 8pt to 16pt
  And no widgets should disappear (only scale)

Given I am swiping between dashboard pages
When density mode is "glove"
Then swipe threshold should be 120px
  And swipe gesture should feel more forgiving with gloves

Given density transition is animating
When I observe the transition
Then it should complete in 300ms
  And no visual glitches should occur
  And NMEA data updates should continue uninterrupted

Given I test grid reflow at various widget counts
When density toggles with 4, 6, 9, or 12 widgets visible
Then all widgets should remain accessible
  And pagination should adjust if needed
  And no widgets should overflow screen bounds
```

**Technical Notes:**
- Update `src/components/dashboard/PaginatedDashboard.tsx`
- Update `src/hooks/useResponsiveGrid.ts` to factor density
- Add 300ms CSS transition animation
- Test edge cases (many widgets, few widgets)
- Ensure no performance degradation

---

## **Epic 13.4: Platform-Native Navigation (Phase 3)**

### **Story 13.4.1: Install Navigation Dependencies & Icon System**
**Priority:** P1  
**Effort:** 6 hours  
**Dependencies:** Story 13.1.2 (feature flags)

**Description:**
Set up React Navigation with platform-specific icon systems (SF Symbols for iOS, Material Icons for Android/Web).

**Acceptance Criteria:**

```gherkin
Given I need navigation dependencies
When I install required packages
Then @react-navigation/native should be installed
  And @react-navigation/bottom-tabs should be installed
  And @react-navigation/drawer should be installed
  And expo-symbols should be installed (SF Symbols)
  And react-native-vector-icons should be installed (Material)

Given I create platform icon mapping
When I reference "dashboard" icon
Then iOS should render SF Symbol "gauge"
  And Android should render Material Icon "dashboard"
  And Web should render Material Icon "dashboard"

Given I test icon rendering
When I display PlatformIcon component on each platform
Then icons should render correctly without errors
  And icon sizes should be consistent (24pt default)
  And colors should follow theme system

Given I create src/navigation/ directory
When I check project structure
Then src/navigation/ should exist
  And no existing functionality should be broken
```

**Technical Notes:**
- Install via npm/yarn: react-navigation packages, expo-symbols, vector-icons
- Create `src/platform/icons/PlatformIcon.tsx`
- Create icon mapping config (SF Symbols vs Material)
- Create `src/navigation/` directory structure
- Test on iOS, Android, Web platforms

---

### **Story 13.4.2: Implement iOS Navigation (Tab Bar + Sidebar)**
**Priority:** P1  
**Effort:** 12 hours  
**Dependencies:** Story 13.4.1

**Description:**
Create iOS-specific navigation with bottom tab bar (iPhone) and sidebar (iPad landscape), following iOS Human Interface Guidelines.

**Acceptance Criteria:**

```gherkin
Given I am running the app on iPhone
When I view the main screen
Then I should see a bottom tab bar
  And tab bar should show icons for Dashboard, Settings, Autopilot, Alarms
  And active tab should be visually distinct (filled icon)

Given I am running the app on iPad in landscape
When I view the main screen
Then I should see a sidebar on the left
  And sidebar should show same navigation items as tab bar
  And sidebar should be collapsible (hide/show toggle)

Given I tap a tab bar item on iPhone
When the navigation occurs
Then the screen should transition smoothly
  And the selected tab should be highlighted
  And the previous screen should be unmounted

Given I test on iPhone and iPad simulators
When I navigate between screens
Then iOS native feel should be maintained
  And navigation animations should match iOS standards
  And SF Symbols should render correctly
```

**Technical Notes:**
- Create `src/navigation/IOSNavigation.tsx`
- Use `@react-navigation/bottom-tabs` for iPhone
- Implement responsive sidebar for iPad (landscape)
- Connect to DashboardScreen, SettingsScreen, AutopilotScreen, AlarmsScreen
- Test on iOS simulators (iPhone 15, iPad Pro)

---

### **Story 13.4.3: Implement Android Navigation (Drawer + FAB)**
**Priority:** P1  
**Effort:** 12 hours  
**Dependencies:** Story 13.4.1

**Description:**
Create Android-specific navigation with hamburger drawer menu and floating action button, following Material Design guidelines.

**Acceptance Criteria:**

```gherkin
Given I am running the app on Android
When I tap the hamburger menu icon
Then a navigation drawer should slide in from the left
  And drawer should show navigation items with Material Icons
  And drawer should overlay the content area

Given the drawer is open
When I tap a navigation item
Then the drawer should close automatically
  And the selected screen should load
  And Material Design motion should be applied

Given I am viewing the dashboard on Android
When I look at the bottom-right corner
Then I should see a floating action button (FAB)
  And FAB should show a "+" icon
  And tapping FAB should open widget selection sheet

Given I test on Android emulator
When I navigate between screens
Then Material Design patterns should be followed
  And animations should match Android standards
  And Material Icons should render correctly
```

**Technical Notes:**
- Create `src/navigation/AndroidNavigation.tsx`
- Use `@react-navigation/drawer` for hamburger menu
- Implement FAB for primary action (Add Widget)
- Connect to DashboardScreen, SettingsScreen, AutopilotScreen, AlarmsScreen
- Test on Android emulator (Pixel 7)

---

### **Story 13.4.4: Implement Web Navigation (Responsive Sidebar)**
**Priority:** P1  
**Effort:** 10 hours  
**Dependencies:** Story 13.4.1

**Description:**
Create web-specific navigation with persistent sidebar (desktop) and collapsible drawer (mobile web), with hover states for mouse interaction.

**Acceptance Criteria:**

```gherkin
Given I am viewing the app on desktop browser (> 1024px)
When the page loads
Then I should see a persistent sidebar on the left
  And sidebar should show navigation items with icons and labels
  And hovering over items should show visual feedback (background color change)

Given I am viewing the app on mobile browser (< 768px)
When I tap the hamburger menu icon
Then a drawer should slide in from the left
  And drawer behavior should match mobile app patterns

Given I am using a desktop browser with mouse
When I hover over sidebar items
Then hover state should appear (background highlight)
  And cursor should change to pointer
  And no hover states should appear on touch devices

Given I test on Chrome, Safari, and Firefox
When I navigate between screens
Then navigation should work identically on all browsers
  And responsive breakpoints should trigger correctly
  And Material Icons should render without issues
```

**Technical Notes:**
- Create `src/navigation/WebNavigation.tsx`
- Implement responsive breakpoints (mobile < 768px, desktop > 1024px)
- Add CSS hover states for mouse interaction
- Test on Chrome, Safari, Firefox (desktop + mobile)
- Use react-native-web platform detection

---

### **Story 13.4.5: Create Platform Router & Feature Flag Integration**
**Priority:** P1  
**Effort:** 8 hours  
**Dependencies:** Stories 13.4.2, 13.4.3, 13.4.4

**Description:**
Implement platform detection router that selects appropriate navigation component, with feature flag to toggle between old/new navigation.

**Acceptance Criteria:**

```gherkin
Given the app starts on iOS with USE_PLATFORM_NAVIGATION enabled
When the app initializes
Then IOSNavigation component should render
  And iOS tab bar should be visible

Given the app starts on Android with USE_PLATFORM_NAVIGATION enabled
When the app initializes
Then AndroidNavigation component should render
  And Android drawer should be available

Given the app starts on Web with USE_PLATFORM_NAVIGATION enabled
When the app initializes
Then WebNavigation component should render
  And sidebar should be visible (desktop)

Given USE_PLATFORM_NAVIGATION is disabled
When the app initializes
Then legacy navigation should render
  And app should function exactly as before

Given I toggle USE_PLATFORM_NAVIGATION feature flag
When I restart the app
Then the appropriate navigation system should activate
  And no crashes or errors should occur
  And all screens should remain accessible
```

**Technical Notes:**
- Create `src/navigation/index.tsx` as platform router
- Use Platform.select() to choose navigation component
- Update App.tsx to conditionally render navigation
- Create screens: SettingsScreen, AutopilotScreen, AlarmsScreen
- Test feature flag toggle on all platforms

---

## **Epic 13.5: Multi-Device Coordination (Phase 4)**

### **Story 13.5.1: Implement BLE Proximity Detection**
**Priority:** P2  
**Effort:** 16 hours  
**Dependencies:** Story 13.4.5

**Description:**
Create BLE proximity manager with beacon broadcasting (phone as tag) and detection (tablet as receiver), including role profile system.

**Acceptance Criteria:**

```gherkin
Given I enable BLE proximity on a phone
When the phone starts broadcasting
Then it should emit BLE beacon with device ID and role profile
  And beacon should be detectable within 3 meters
  And broadcasting should work in background

Given a tablet is scanning for BLE devices
When a phone beacon comes within range
Then tablet should detect the beacon within 2 seconds
  And tablet should identify the device and role profile
  And detection should trigger proximity event

Given I assign "Captain" role to my phone
When I configure role profile
Then my beacon should broadcast "Captain" role identifier
  And role should persist across app restarts

Given I enable privacy controls
When I disable BLE broadcasting
Then my device should stop emitting beacons immediately
  And I should remain invisible to other devices

Given multiple devices are broadcasting
When a tablet scans
Then it should detect all nearby devices
  And it should prioritize closest device (strongest signal)
```

**Technical Notes:**
- Install `react-native-ble-plx` package
- Create `src/services/ble/BLEProximityManager.ts`
- Implement beacon broadcasting with UUID + role data
- Implement scanning and proximity detection
- Add opt-in privacy controls
- Test on real iOS/Android devices (BLE requires physical hardware)

---

### **Story 13.5.2: Create Multi-Device State Sync**
**Priority:** P2  
**Effort:** 16 hours  
**Dependencies:** Story 13.5.1

**Description:**
Implement real-time state synchronization across devices for NMEA data, alarm states, and dashboard preferences with < 1 second latency.

**Acceptance Criteria:**

```gherkin
Given two devices are paired (phone + tablet)
When NMEA data updates on primary device
Then secondary device should receive update within 1 second
  And both devices should show identical metric values

Given an alarm triggers on any device
When I acknowledge the alarm on my phone
Then the alarm should dismiss on the tablet within 500ms
  And alarm state should sync to all paired devices

Given I pin a widget on the tablet dashboard
When the preference syncs
Then my phone should show the same pinned widget
  And dashboard layout should match across devices

Given I test state sync latency
When I measure sync time for 100 updates
Then average latency should be < 500ms
  And P99 latency should be < 1 second

Given network connection is lost temporarily
When connection restores
Then state should resync automatically
  And no data loss should occur
  And conflict resolution should prioritize most recent update
```

**Technical Notes:**
- Create `src/services/sync/MultiDeviceSyncManager.ts`
- Use WebSocket for real-time communication
- Sync: NMEA data, alarm states, dashboard preferences
- Implement conflict resolution (last-write-wins)
- Add connection recovery logic
- Test with 2+ devices on same WiFi network

---

### **Story 13.5.3: Implement Proximity-Based Dashboard Switching**
**Priority:** P2  
**Effort:** 12 hours  
**Dependencies:** Stories 13.5.1, 13.5.2

**Description:**
Enable automatic dashboard switching when BLE proximity detects role-specific devices, with voice confirmation feedback.

**Acceptance Criteria:**

```gherkin
Given my phone has "Captain" role profile
When I walk to the helm with phone in pocket
Then tablet should detect my proximity within 3 seconds
  And dashboard should auto-switch to "Captain View"
  And voice should say "Captain view active"

Given "Captain View" is configured
When the dashboard switches
Then autopilot controls should be prominent (top row)
  And navigation widgets should be visible
  And engineering widgets should be secondary

Given my phone has "Engineer" role profile
When I approach the helm
Then dashboard should auto-switch to "Engineer View"
  And engine monitoring should be prominent
  And battery/fuel widgets should be visible

Given I manually select a dashboard view
When proximity detection would trigger auto-switch
Then manual selection should take priority (no auto-switch)
  And I should be able to re-enable auto-switching

Given proximity detection accuracy test
When I measure detection distance
Then detection should trigger within 3 meters
  And it should not trigger beyond 5 meters
  And voice confirmation should play through device speakers
```

**Technical Notes:**
- Create preset dashboard views: "Captain View", "Engineer View", "Crew View"
- Implement proximity-triggered switching logic
- Add voice feedback using TTS (Text-to-Speech)
- Implement manual override (disable auto-switching)
- Test proximity accuracy with various distances

---

### **Story 13.5.4: Create Device Discovery & Pairing UI**
**Priority:** P2  
**Effort:** 10 hours  
**Dependencies:** Story 13.5.1

**Description:**
Build device discovery interface with secure pairing flow, device management screen, and intuitive nickname assignment.

**Acceptance Criteria:**

```gherkin
Given I want to pair two devices
When I open "Device Pairing" settings
Then I should see a "Scan for Devices" button
  And tapping should start BLE scanning

Given scanning is active
When nearby devices are detected
Then they should appear in a list with device names
  And I should be able to tap a device to initiate pairing

Given I tap a device to pair
When the pairing request is sent
Then the target device should show a confirmation prompt
  And both devices should show a 6-digit pairing code
  And codes must match for pairing to succeed

Given pairing succeeds
When I view paired devices list
Then I should see the newly paired device
  And I should be able to assign a nickname ("Captain's Phone")
  And I should be able to select an icon

Given I want to unpair a device
When I tap "Remove Device"
Then a confirmation dialog should appear
  And confirming should delete the pairing
  And the device should no longer sync state
```

**Technical Notes:**
- Create device discovery UI screen
- Implement secure pairing with 6-digit code
- Create device management screen
- Add nickname and icon customization
- Store pairings in AsyncStorage
- Test pairing flow on multiple devices

---

## **Epic 13.6: TV Platform Support (Phase 5)**

### **Story 13.6.1: Implement TV Platform Detection & Design Tokens**
**Priority:** P2  
**Effort:** 8 hours  
**Dependencies:** Story 13.4.5

**Description:**
Add TV platform detection and create TV-specific design tokens for 10-foot UI (80pt touch targets, 36pt fonts).

**Acceptance Criteria:**

```gherkin
Given the app runs on Apple TV or Android TV
When I check Platform.isTV
Then it should return true
  And TV-specific code paths should activate

Given I access TV design tokens
When I reference touch target size
Then it should be 80pt (D-pad focus areas)
  And minimum font size should be 36pt
  And grid spacing should be 24pt

Given I test on Apple TV simulator
When the app launches
Then TV-specific UI should render
  And no phone/tablet UI elements should appear

Given I test on Android TV emulator
When the app launches
Then TV-specific UI should render
  And navigation should be D-pad compatible
```

**Technical Notes:**
- Implement TV detection: `Platform.OS === 'ios' && Platform.isTV`
- Create `src/config/tvTokens.ts` with 10-foot UI values
- Create `src/navigation/TVNavigation.tsx` stub
- Test on Apple TV simulator and Android TV emulator
- Ensure no regressions on phone/tablet

---

### **Story 13.6.2: Implement D-Pad Navigation System**
**Priority:** P2  
**Effort:** 16 hours  
**Dependencies:** Story 13.6.1

**Description:**
Create TV remote D-pad navigation hook with event handling for up/down/left/right/select, plus visible focus indicators.

**Acceptance Criteria:**

```gherkin
Given I am using the app on TV with remote
When I press the right arrow on D-pad
Then focus should move to the next widget (right)
  And a glowing border should indicate focus

Given I press the down arrow
When focus moves down
Then the next row of widgets should receive focus
  And smooth transition animation should occur (200ms)

Given a widget has focus
When I press the Select button
Then the widget should expand to full-screen
  Or the widget settings should open
  And focus indicator should remain visible

Given I navigate to the edge of the screen
When I press right on the rightmost widget
Then focus should wrap to leftmost widget in same row
  Or focus should remain on current widget (no wrap)

Given I test D-pad event handling
When I press all D-pad buttons (↑↓←→ + Select)
Then all events should be captured correctly
  And no events should be missed
  And focus should never become lost
```

**Technical Notes:**
- Create `src/hooks/useTVRemoteNavigation.ts`
- Listen for TV remote events (up, down, left, right, select)
- Implement focus state management (Zustand store)
- Add glowing border CSS for focused elements (3px, theme.primary)
- Test on Apple TV and Android TV with physical remotes

---

### **Story 13.6.3: Create TV 10-Foot Dashboard UI**
**Priority:** P2  
**Effort:** 14 hours  
**Dependencies:** Story 13.6.2

**Description:**
Design TV-optimized dashboard with auto-cycling widgets, large typography (36pt min), and full-screen widget display.

**Acceptance Criteria:**

```gherkin
Given the app is running on TV
When the dashboard loads
Then widgets should auto-cycle every 15 seconds
  And only one widget should be visible at a time (full-screen)
  And transitions between widgets should be smooth (fade)

Given a depth widget is displayed
When I view it from 10 feet away
Then the primary value should be clearly readable
  And font size should be 48pt or larger
  And contrast should be high (day mode: black on white)

Given widgets are auto-cycling
When I press Select on D-pad
Then auto-cycling should pause
  And I should be able to manually navigate with D-pad
  And pressing Select again should resume auto-cycling

Given I test readability from 10 feet
When I stand 10 feet from TV
Then all text should be readable without squinting
  And icons should be recognizable
  And color coding should be clear (red = alarm)
```

**Technical Notes:**
- Create TV-specific dashboard layout (full-screen widgets)
- Implement auto-cycling with 15-second interval
- Use 48-64pt typography for primary values
- Add D-pad pause/resume controls
- Physical distance testing required (10 feet)

---

### **Story 13.6.4: Implement TV Ambient Display Mode**
**Priority:** P2  
**Effort:** 10 hours  
**Dependencies:** Story 13.6.3

**Description:**
Create passive awareness mode with auto-dimming after inactivity and widget rotation schedules.

**Acceptance Criteria:**

```gherkin
Given the TV has been idle for 5 minutes
When the inactivity timer expires
Then screen brightness should dim to 20%
  And auto-cycling should continue at reduced brightness

Given the screen is dimmed
When I press any D-pad button
Then brightness should return to 100% within 500ms
  And normal interaction should resume

Given ambient mode is active
When a critical alarm triggers
Then brightness should immediately return to 100%
  And alarm widget should display full-screen
  And audio alert should play through TV speakers

Given I configure widget rotation schedule
When I set rotation order (Depth → Speed → Wind → Battery)
Then widgets should cycle in specified order
  And each widget should display for configured duration (15s)
  And schedule should persist across app restarts
```

**Technical Notes:**
- Implement 5-minute inactivity timer
- Add brightness control (dim to 20%)
- Override dimming for critical alarms
- Create configurable widget rotation schedule
- Test with TV in real salon/cockpit scenario

---

### **Story 13.6.5: TV Integration Testing & Optimization**
**Priority:** P2  
**Effort:** 8 hours  
**Dependencies:** Stories 13.6.1-13.6.4

**Description:**
Comprehensive TV platform testing across Apple TV and Android TV with performance optimization for 60 FPS.

**Acceptance Criteria:**

```gherkin
Given I test on Apple TV 4K
When the app runs
Then all features should work (D-pad, auto-cycling, ambient mode)
  And frame rate should maintain 60 FPS
  And no crashes or hangs should occur

Given I test on Android TV (Sony Bravia)
When the app runs
Then all features should work identically to Apple TV
  And Material Design guidelines should be followed
  And D-pad navigation should feel native

Given I measure performance
When widgets are auto-cycling
Then CPU usage should be < 20%
  And memory usage should be stable (no leaks)
  And animations should be smooth (60 FPS)

Given I test real-world scenario
When TV is installed in salon
Then crew members should be able to glance and see data
  And no interaction should be required (passive awareness)
  And critical alarms should be impossible to miss
```

**Technical Notes:**
- Test on Apple TV 4K and Android TV emulator
- Performance profiling (CPU, memory, FPS)
- Real-world testing in salon/cockpit environment
- Optimize auto-cycling animations
- Validate 10-foot readability with actual users

---

## FR Coverage Matrix

| FR ID | Requirement | Epic | Stories Covering |
|-------|-------------|------|------------------|
| **FR-VIP-0.1** | Fix red-night mode violations | 13.1 | 13.1.1 |
| **FR-VIP-0.2** | Create feature flag infrastructure | 13.1 | 13.1.2 |
| **FR-VIP-1.1** | Unified settings modal system | 13.2 | 13.2.1, 13.2.3, 13.2.4 |
| **FR-VIP-1.2** | Keyboard navigation support | 13.2 | 13.2.1, 13.2.3 |
| **FR-VIP-1.3** | Cross-platform input components | 13.2 | 13.2.2, 13.2.3, 13.2.4 |
| **FR-VIP-1.4** | Alarm configuration efficiency | 13.2 | 13.2.4 |
| **FR-VIP-2.1** | Navigation session auto-detection | 13.3 | 13.3.1 |
| **FR-VIP-2.2** | UI density adaptation system | 13.3 | 13.3.3, 13.3.4 |
| **FR-VIP-2.3** | Store consolidation | 13.3 | 13.3.2 |
| **FR-VIP-2.4** | Glove mode system | 13.3 | 13.3.3, 13.3.4 |
| **FR-VIP-3.1** | iOS navigation (tab bar/sidebar) | 13.4 | 13.4.1, 13.4.2, 13.4.5 |
| **FR-VIP-3.2** | Android navigation (drawer/FAB) | 13.4 | 13.4.1, 13.4.3, 13.4.5 |
| **FR-VIP-3.3** | Web navigation (responsive sidebar) | 13.4 | 13.4.1, 13.4.4, 13.4.5 |
| **FR-VIP-3.4** | Platform icon systems | 13.4 | 13.4.1 |
| **FR-VIP-4.1** | BLE proximity detection | 13.5 | 13.5.1, 13.5.3 |
| **FR-VIP-4.2** | Role-based profile system | 13.5 | 13.5.1, 13.5.3 |
| **FR-VIP-4.3** | NMEA state sync | 13.5 | 13.5.2 |
| **FR-VIP-4.4** | Alarm state sync | 13.5 | 13.5.2 |
| **FR-VIP-4.5** | Proximity dashboard switching | 13.5 | 13.5.3 |
| **FR-VIP-5.1** | TV platform support | 13.6 | 13.6.1, 13.6.5 |
| **FR-VIP-5.2** | D-pad navigation | 13.6 | 13.6.2 |
| **FR-VIP-5.3** | 10-foot UI design | 13.6 | 13.6.3 |
| **FR-VIP-5.4** | Auto-cycling widgets | 13.6 | 13.6.3, 13.6.4 |
| **FR-VIP-5.5** | Ambient display mode | 13.6 | 13.6.4 |

**Coverage Validation:** ✅ All 24 functional requirements mapped to stories (100%)

---

## Epic Context & Dependencies

### Builds On
- **Epic 9:** Enhanced Presentation System (BLOCKING - must complete first)
- **Epic 2:** Widget framework foundation
- **Epic 6:** UI Architecture alignment

### Enables
- **Voice-First Marine UX:** Autopilot control without looking at screen
- **Multi-Device Ecosystem:** Phones, tablets, desktops, TVs all coordinated
- **Platform Expansion:** Smart TV market entry
- **Glove-Friendly Operation:** Real-world marine usability

### Architecture Integration
Epic 13 transforms the v2.3 single-platform app into the VIP Platform vision, implementing the complete UX strategy documented in `ux-design-specification.md` and `UX-INCREMENTAL-IMPLEMENTATION-ROADMAP.md`.

---

## Risk Mitigation

### Technical Risks
- **BLE Platform Differences:** iOS and Android BLE APIs vary significantly
  - *Mitigation:* Abstract BLE logic into platform-agnostic manager, test on real devices
- **TV Platform Testing:** Limited simulator capabilities for D-pad navigation
  - *Mitigation:* Test on physical Apple TV and Android TV devices early
- **Multi-Device Latency:** State sync may exceed 1-second target on slow networks
  - *Mitigation:* Implement WebSocket compression, prioritize critical state updates

### Business Risks
- **Feature Scope Creep:** 28 stories over 32 weeks is ambitious
  - *Mitigation:* Feature flags allow shipping Phase 0-2 independently before Phase 3-5
- **Platform Fragmentation:** Maintaining 4 platforms (iOS/Android/Web/TV) increases complexity
  - *Mitigation:* Shared marine core components, platform-specific chrome only

---

## Success Criteria

### Functional Requirements
1. **Red-Night Compliance:** Zero green/blue/white colors in red-night mode
2. **Settings Efficiency:** 67% fewer taps to configure alarms (measured)
3. **Navigation Session:** Auto-start within 2 seconds of SOG > 2.0
4. **Platform Native Feel:** iOS HIG and Material Design compliance validated
5. **Multi-Device Sync:** < 1 second latency for NMEA and alarm state
6. **TV Readability:** All text readable from 10 feet (physical test)

### Technical Requirements
1. **Feature Flag System:** All VIP features gated by flags
2. **Store Consolidation:** Single `src/store/` directory (no `src/stores/`)
3. **Platform Router:** Automatic navigation selection per platform
4. **BLE Security:** 6-digit pairing code, opt-in privacy controls
5. **Performance:** 60 FPS on TV, < 20% CPU during auto-cycling

### Quality Gates
- ✅ All Epic 9 tests passing before Phase 1 begins
- ✅ Visual regression testing for red-night compliance
- ✅ Cross-platform testing on iOS, Android, Web, tvOS, Android TV
- ✅ Real-world marine testing with gloves (Phase 2+)
- ✅ Multi-device testing with 2+ physical devices (Phase 4)

---

## Timeline & Sequencing

| Phase | Epic | Duration | Cumulative | Can Start After |
|-------|------|----------|------------|----------------|
| **0** | 13.1 | 2 weeks | Week 2 | Epic 9 complete |
| **1** | 13.2 | 4 weeks | Week 6 | Epic 13.1 |
| **2** | 13.3 | 5 weeks | Week 11 | Epic 13.2 |
| **3** | 13.4 | 8 weeks | Week 19 | Epic 13.3 |
| **4** | 13.5 | 6 weeks | Week 25 | Epic 13.4 |
| **5** | 13.6 | 7 weeks | Week 32 | Epic 13.5 |

**Critical Path:** Epic 9 → 13.1 → 13.2 → 13.3 → 13.4 → 13.5 → 13.6

**Parallel Work Opportunities:** None - phases are strictly sequential due to architectural dependencies

---

## Next BMM Steps

1. **Architecture Workflow** - Add technical design details, API contracts, data flow diagrams
2. **Development** - Begin with Story 13.1.1 (red-night fixes) after Epic 9 validation
3. **Testing** - WiFi Bridge simulator scenarios for each phase
4. **Documentation** - Update user guides with new features as they ship

---

**Epic Ready for Development - 28 Stories with Detailed BDD Acceptance Criteria**

This epic provides a complete roadmap from v2.3 to VIP Platform, with phased implementation enabling progressive rollout and risk mitigation through feature flags. All 24 functional requirements are covered with testable acceptance criteria and clear technical guidance.
