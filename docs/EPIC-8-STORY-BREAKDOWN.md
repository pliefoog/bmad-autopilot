# Epic 8: Story Breakdown & Summary
## Quick Reference for All 6 Stories

**Epic:** 8.0 - VIP Platform UI Refactor
**Total Stories:** 6
**Status:** Planning Complete, Ready for v2.3 Handoff

---

## Story Overview

| Story | Name | Sprints | Complexity | Key Deliverables |
|-------|------|---------|------------|------------------|
| **8.1** | Foundation & Store Consolidation | 2 | M | Feature flags, Storybook, navigation session store, WiFi Bridge scenarios |
| **8.2** | Glove Mode System | 2-3 | L | useUIDensity hook, density config, AutopilotFooter refactor, visual indicator |
| **8.3** | Platform Navigation - iOS | 2 | M | Tab bar, SF Symbols, DashboardScreen, iOS modals, haptics |
| **8.4** | Platform Navigation - Android & Web | 2-3 | L | Drawer, Material Icons, FAB, web responsive, icon abstraction |
| **8.5** | Dashboard & Widget Integration | 2-3 | L | PaginatedDashboard glove-aware, all widgets density-aware, settings/autopilot screens |
| **8.6** | Final Migration & Release | 2 | M | Enable flags, remove old code, full testing, v3.0 release |

**Total:** 12-18 sprints (24-36 weeks for human, faster with AI bmm-dev)

---

## Story 8.1: Foundation & Store Consolidation ✅
**Status:** COMPLETE (full story file created)
**File:** `story-8.1-foundation-store-consolidation.md`

### Summary
Sets up infrastructure for VIP refactoring:
- Feature flag system (`src/config/features.ts`)
- Storybook for visual component development
- Store consolidation (remove `src/stores/`, merge into `src/store/`)
- Navigation session store (`navigationSessionStore.ts`)
- WiFi Bridge scenario loading (5 test scenarios)

### Key ACs
- Feature flags toggle old vs new code paths
- Storybook runs with AutopilotFooter example
- Navigation session auto-starts when SOG > 2.0
- All 5 WiFi Bridge scenarios loadable

---

## Story 8.2: Glove Mode System
**Status:** NOT STARTED (template from Story 8.1)
**Depends On:** Story 8.1 complete

### User Stories

#### US 8.2.1: UI Density Configuration
Create density configuration for glove vs native modes

**Key ACs:**
- Density config file created (`src/config/density.ts`)
- Glove mode config: touchTargetSize: 64, swipeThreshold: 120, fontSize.value: 48
- Native mode config: touchTargetSize: 44, swipeThreshold: 50, fontSize.value: 36

#### US 8.2.2: useUIDensity Hook
Hook that returns current density config based on navigation session

**Key ACs:**
- Hook created: `src/hooks/useUIDensity.ts`
- Reads `navigationSession.gloveModeActive`
- Returns `DENSITY_CONFIGS['glove']` or `DENSITY_CONFIGS['native']`
- Components can use: `const density = useUIDensity();`

#### US 8.2.3: AutopilotFooter Refactor (Reference Implementation)
Refactor AutopilotFooter to be density-aware (pattern for all other components)

**Key ACs:**
- AutopilotFooter uses `useUIDensity()` hook
- Button sizes adapt: 44pt → 64pt based on glove mode
- Spacing adapts: 8pt → 16pt padding
- Font sizes adapt: body 16pt → 18pt, heading 20pt → 24pt
- Haptic feedback stronger in glove mode (Heavy vs Medium)
- Storybook story shows native vs glove mode variants

#### US 8.2.4: Metric Cell Density Awareness
Update PrimaryMetricCell and SecondaryMetricCell for density adaptation

**Key ACs:**
- PrimaryMetricCell uses `useUIDensity()`
- SecondaryMetricCell uses `useUIDensity()`
- Value font size adapts: 36pt → 48pt
- Label font size adapts: 16pt → 18pt
- Cell padding adapts: 8pt → 16pt

#### US 8.2.5: Visual Glove Mode Indicator
Add visual indicator when glove mode is active

**Key ACs:**
- Glove icon (🧤) appears in HeaderBar when `gloveModeActive === true`
- Icon disappears when session ends
- Icon positioned in top-right of header
- Tooltip on hover: "Glove Mode - Large touch targets"

### Testing (WiFi Bridge Scenarios)
- Load "idle-at-marina" → Touch targets 44pt, no glove icon
- Load "underway-manual" → Touch targets 64pt, glove icon visible
- Load "end-navigation" → Touch targets return to 44pt, icon disappears
- Storybook: Toggle glove mode → see size changes live

---

## Story 8.3: Platform Navigation - iOS
**Status:** NOT STARTED
**Depends On:** Story 8.2 complete

### User Stories

#### US 8.3.1: iOS Tab Bar Navigation
Implement iOS-style bottom tab bar navigation

**Key ACs:**
- React Navigation bottom-tabs installed
- Tab bar created with 3 tabs: Dashboard, Autopilot, Settings
- Tab bar positioned at bottom (iOS convention)
- Tab bar styling matches theme (Day/Night/Red-Night)
- Active tab highlighted with `theme.primary` color

#### US 8.3.2: SF Symbols Integration
Use Apple's SF Symbols for iOS icons

**Key ACs:**
- expo-symbols installed
- SF Symbols used for tab bar icons:
  - Dashboard: `gauge`
  - Autopilot: `location.circle`
  - Settings: `gearshape`
- Icons scale correctly (24pt standard, 28pt selected)
- Icons color correctly (inactive: textSecondary, active: primary)

#### US 8.3.3: DashboardScreen Extraction
Extract dashboard logic from App.tsx into DashboardScreen

**Key ACs:**
- `src/screens/DashboardScreen.tsx` created
- Contains: AlarmBanner, PaginatedDashboard, AutopilotFooter
- Accessible via tab bar tap
- All dashboard functionality works (page swipe, widget interaction)

#### US 8.3.4: iOS-Specific Modals
Use iOS-style sheets (swipe from bottom to dismiss)

**Key ACs:**
- WidgetSelector modal → iOS sheet (swipe to dismiss)
- ConnectionConfigDialog → iOS modal (requires explicit dismiss)
- Sheet has drag indicator (handle bar at top)
- Sheet respects safe area insets

#### US 8.3.5: Haptic Feedback
Integrate iOS haptic feedback for interactions

**Key ACs:**
- expo-haptics installed
- Haptic on button press: `.impactAsync(Medium)` in native mode
- Haptic on button press: `.impactAsync(Heavy)` in glove mode
- Haptic on alarm trigger: `.notificationAsync(Error)`
- Haptic on navigation session start: `.notificationAsync(Success)`

### Testing
- iOS simulator: Tap tab bar → navigation works
- Tap Dashboard tab → shows widgets + autopilot footer
- Long press widget → sheet modal appears, swipe down to dismiss
- Tap autopilot +10° button → feel haptic feedback (simulator may not support)

---

## Story 8.4: Platform Navigation - Android & Web
**Status:** NOT STARTED
**Depends On:** Story 8.3 complete (can learn from iOS patterns)

### User Stories

#### US 8.4.1: Android Navigation Drawer
Implement Android-style drawer with hamburger menu

**Key ACs:**
- React Navigation drawer installed
- Drawer created with items: Dashboard, Autopilot, Settings, Alarms, Help
- Hamburger icon (☰) in top-left of header
- Drawer slides in from left
- Drawer styling matches theme

#### US 8.4.2: Material Icons Integration
Use Google's Material Icons for Android

**Key ACs:**
- react-native-vector-icons installed
- Material Icons used for drawer:
  - Dashboard: `dashboard`
  - Autopilot: `my-location`
  - Settings: `settings`
  - Alarms: `notifications`
- Icons scale correctly (24pt standard)

#### US 8.4.3: Floating Action Button (FAB)
Add FAB for primary action (Add Widget)

**Key ACs:**
- FAB positioned bottom-right (Android convention)
- FAB icon: Material Icon `add`
- FAB color: `theme.primary`
- Tap FAB → opens WidgetSelector
- FAB has elevation shadow

#### US 8.4.4: Web Responsive Navigation
Responsive navigation for web browser

**Key ACs:**
- Mobile web (<768px): Uses drawer (like Android)
- Tablet web (768-1024px): Uses tab bar (like iOS)
- Desktop web (>1024px): Uses sidebar (always visible)
- Resize window → navigation adapts smoothly

#### US 8.4.5: Platform Icon Abstraction
Create abstraction layer for iOS vs Android icons

**Key ACs:**
- `src/platform/icons/PlatformIcon.tsx` created
- Accepts icon name (dashboard, settings, autopilot, alarms)
- iOS: Returns SF Symbol
- Android: Returns Material Icon
- Web: Returns Material Icon
- Marine-specific icons use custom SVG (same everywhere)

### Testing
- Android emulator: Tap hamburger → drawer opens
- Tap Dashboard in drawer → navigates to dashboard
- Tap FAB → WidgetSelector opens
- Web browser: Resize window → drawer (mobile) vs sidebar (desktop)
- Icon consistency: iOS shows SF Symbols, Android shows Material

---

## Story 8.5: Dashboard & Widget Integration
**Status:** NOT STARTED
**Depends On:** Stories 8.3 and 8.4 complete

### User Stories

#### US 8.5.1: PaginatedDashboard Glove Mode Integration
Connect PaginatedDashboard to glove mode density

**Key ACs:**
- PaginatedDashboard uses `useUIDensity()`
- Grid spacing adapts: 8pt → 16pt based on glove mode
- Widget cell sizes adapt based on density config
- Page swipe threshold adapts: 50px → 120px in glove mode

#### US 8.5.2: All Widgets Density-Aware
Refactor all 9 widgets to use useUIDensity

**Key ACs:**
- DepthWidget uses useUIDensity (value font 36pt → 48pt)
- SpeedWidget uses useUIDensity
- WindWidget uses useUIDensity
- GPSWidget uses useUIDensity
- CompassWidget uses useUIDensity
- EngineWidget uses useUIDensity
- BatteryWidget uses useUIDensity
- TanksWidget uses useUIDensity
- AutopilotStatusWidget uses useUIDensity
- All widgets have Storybook stories (native vs glove mode)

#### US 8.5.3: Settings Screen in Navigation
Create SettingsScreen accessible via platform navigation

**Key ACs:**
- `src/screens/SettingsScreen.tsx` created
- Sections: Connection, Widgets, Alarms, Display, About
- Accessible via iOS tab bar / Android drawer / Web sidebar
- All settings functionality works (same as v2.3)

#### US 8.5.4: Autopilot Screen in Navigation
Convert AutopilotControlScreen from modal to navigation screen

**Key ACs:**
- `src/screens/AutopilotScreen.tsx` created (from existing modal)
- Accessible via navigation (not modal)
- Full-screen autopilot controls
- Glove-mode aware (64pt buttons when session active)

### Testing
- Load "underway-manual" → Navigate to Dashboard → Grid spacing 16pt
- All 9 widgets adapt to glove mode correctly
- Navigate to Settings → All sections accessible
- Navigate to Autopilot → Controls are large (64pt) in glove mode

---

## Story 8.6: Final Migration & Production Release
**Status:** NOT STARTED
**Depends On:** Stories 8.1-8.5 complete

### User Stories

#### US 8.6.1: Enable All Feature Flags
Enable all feature flags by default for production

**Key ACs:**
- `FEATURE_FLAGS.USE_PLATFORM_NAVIGATION = true`
- `FEATURE_FLAGS.USE_GLOVE_MODE = true`
- `FEATURE_FLAGS.USE_NEW_STORES = true`
- All new code paths active
- Old code paths only accessible via dev tools (for testing)

#### US 8.6.2: Remove Old Code
Delete old monolithic App.tsx code and unused components

**Key ACs:**
- App.tsx simplified to ~50 lines (just `<AppNavigation />` + onboarding)
- Old modal-based AutopilotControlScreen deleted
- Old modal-based ConnectionConfigDialog deleted
- Old feature flag checks removed (always use new code)
- No dead code remaining

#### US 8.6.3: Full WiFi Bridge Test Suite
Run all scenarios on all platforms (15 tests total)

**Key ACs:**
- 5 scenarios × 3 platforms = 15 tests
- iOS: All 5 scenarios pass
- Android: All 5 scenarios pass
- Web: All 5 scenarios pass
- Glove mode activates/deactivates correctly on all platforms

#### US 8.6.4: Performance Benchmarking
Verify performance meets or exceeds v2.3 baseline

**Key ACs:**
- Initial load time ≤ v2.3 baseline
- Dashboard render ≤ v2.3 baseline
- Page navigation ≤ v2.3 baseline
- Widget update (NMEA data) ≤ 16ms (60fps)
- Memory usage ≤ v2.3 baseline + 20%

#### US 8.6.5: Documentation Updates
Update all documentation for v3.0

**Key ACs:**
- README.md updated with v3.0 features
- ui-architecture.md updated to v3.0 (VIP Platform)
- Migration guide created (v2.3 → v3.0)
- API documentation updated (new hooks, stores)
- Changelog updated with all Epic 8 changes

#### US 8.6.6: v3.0 Release
Tag and release v3.0.0

**Key ACs:**
- Git tag created: `v3.0.0-vip-platform`
- Release notes written
- All platforms build successfully (iOS, Android, Web)
- App stores updated (if applicable)

### Testing
- Regression test: All v2.3 features still work
- Performance test: Meets all benchmarks
- Platform test: iOS, Android, Web all functional
- Glove mode test: All scenarios pass on all platforms

---

## Epic 8 Context Documents

### For All Stories (Load Before Starting Any Story)
1. **epic-8-vip-ui-refactor.md** - Epic overview
2. **VIP-PLATFORM-UX-STRATEGY.md** - Strategic vision
3. **VIP-UX-IMPLEMENTATION-GUIDE.md** - Implementation specs
4. **REFACTORING-PLAN-VIP-PLATFORM.md** - Detailed roadmap
5. **ui-architecture.md** (v2.3) - Current baseline
6. **V2.3-COMPLETION-HANDOFF.md** - Handoff checklist

### Story-Specific Context
- **Story 8.1:** wifiBridgeScenarios.ts, current App.tsx
- **Story 8.2:** AutopilotFooter.tsx (reference), useResponsiveGrid.ts
- **Story 8.3:** iOS Human Interface Guidelines (platform patterns)
- **Story 8.4:** Material Design Guidelines, Web responsive patterns
- **Story 8.5:** All widget files, PaginatedDashboard.tsx
- **Story 8.6:** Full codebase review, performance baseline data

---

## bmm-dev Agent Execution Guide

### For Each Story:
1. **Load context files** (epic + story-specific)
2. **Read current code** (understand what exists)
3. **Implement user stories** (one US at a time)
4. **Test each AC** (WiFi Bridge scenarios + unit tests)
5. **Create Storybook story** (for UI components)
6. **Document changes** (update comments, README if needed)
7. **Commit incrementally** (one commit per US or major AC)
8. **Report completion** (summary of what was done, any issues)

### After Each Story:
- Run full test suite
- Verify no regressions (v2.3 features still work)
- Update Epic 8 status tracker
- Hand off to next story or pause for review

---

## Story Files Status

| Story | File Created | Status |
|-------|-------------|---------|
| 8.1 | ✅ story-8.1-foundation-store-consolidation.md | Complete |
| 8.2 | ⚠️ Use Story 8.1 as template | Summary above |
| 8.3 | ⚠️ Use Story 8.1 as template | Summary above |
| 8.4 | ⚠️ Use Story 8.1 as template | Summary above |
| 8.5 | ⚠️ Use Story 8.1 as template | Summary above |
| 8.6 | ⚠️ Use Story 8.1 as template | Summary above |

**Note:** Story 8.1 provides the full BMM story template. Stories 8.2-8.6 summaries above contain all necessary information. Full story files can be created from the template when needed by bmm-dev agent.

---

**Epic Owner:** Pieter (Product)
**Implementation:** bmm-dev Agent
**Status:** Planning complete, ready for v2.3 handoff ✅
