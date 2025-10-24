# Story 8.6: Final Migration & Production Release
## Enable Feature Flags, Remove Old Code, Release v3.0

**Epic:** 8.0 - VIP Platform UI Refactor
**Story ID:** 8.6
**Priority:** P0 (Production Release)
**Complexity:** M (2 sprints)
**Status:** BLOCKED (Waiting for Stories 8.1-8.5 completion)

**Dependencies:**
- ✅ MUST COMPLETE: Stories 8.1, 8.2, 8.3, 8.4, 8.5 (All Epic 8 stories)
- ✅ MUST HAVE: All WiFi Bridge scenarios passing
- ✅ MUST HAVE: All unit tests passing
- ✅ MUST HAVE: All integration tests passing

---

## Overview

Enable all feature flags to activate VIP Platform code by default, remove old v2.3 code paths, run comprehensive test suite across all platforms, benchmark performance, update documentation, and release v3.0.0 with VIP Platform UI.

**Why This Story:**
- Completes Epic 8 implementation
- Removes technical debt (old code paths)
- Validates quality (full test coverage)
- Documents changes (migration guide, changelog)
- Enables production deployment

**User Benefit:**
Users get stable, production-ready VIP Platform with glove mode, platform-native navigation, and consistent marine UX across iOS, Android, and Web.

---

## User Stories

### US 8.6.1: Enable All Feature Flags
**As a** developer deploying VIP Platform
**I want** all new code paths enabled by default
**So that** production users get VIP Platform features

**Acceptance Criteria:**
- AC 1.1: Feature flags enabled in production config:
  - `FEATURE_FLAGS.USE_PLATFORM_NAVIGATION = true`
  - `FEATURE_FLAGS.USE_GLOVE_MODE = true`
  - `FEATURE_FLAGS.USE_NEW_STORES = true`
- AC 1.2: All new code paths active (IOSNavigation, AndroidNavigation, WebNavigation)
- AC 1.3: Old code paths only accessible via dev tools (for rollback testing)
- AC 1.4: Developer settings allow flag override (for debugging)
- AC 1.5: App launches with VIP Platform UI by default

**Technical Implementation:**
```typescript
// src/config/features.ts (production config)
export const FEATURE_FLAGS = {
  USE_PLATFORM_NAVIGATION: true,  // ✅ ENABLED
  USE_GLOVE_MODE: true,            // ✅ ENABLED
  USE_NEW_STORES: true,            // ✅ ENABLED

  // Developer override (accessible via Settings → Developer Tools)
  _devOverride: {
    enabled: false,
    flags: {
      USE_PLATFORM_NAVIGATION: true,
      USE_GLOVE_MODE: true,
      USE_NEW_STORES: true,
    },
  },

  // Get effective flag value (dev override or default)
  get: (flagName: keyof typeof FEATURE_FLAGS) => {
    if (FEATURE_FLAGS._devOverride.enabled) {
      return FEATURE_FLAGS._devOverride.flags[flagName];
    }
    return FEATURE_FLAGS[flagName];
  },
};

// App.tsx (final version)
import { Platform } from 'react-native';
import { IOSNavigation } from './navigation/IOSNavigation';
import { AndroidNavigation } from './navigation/AndroidNavigation';
import { WebNavigation } from './navigation/WebNavigation';
import { FEATURE_FLAGS } from './config/features';
import { CurrentApp } from './CurrentApp'; // v2.3 code (rollback only)

export default function App() {
  // Check feature flag (always true in production)
  if (!FEATURE_FLAGS.get('USE_PLATFORM_NAVIGATION')) {
    console.warn('[App] Using legacy v2.3 code (feature flag disabled)');
    return <CurrentApp />; // Fallback for dev testing
  }

  // VIP Platform navigation (default in v3.0)
  if (Platform.OS === 'ios') {
    return <IOSNavigation />;
  } else if (Platform.OS === 'android') {
    return <AndroidNavigation />;
  } else {
    return <WebNavigation />;
  }
}
```

---

### US 8.6.2: Remove Old Code
**As a** maintainer of the codebase
**I want** old v2.3 code removed
**So that** codebase is clean and maintainable

**Acceptance Criteria:**
- AC 2.1: Old monolithic `App.tsx` moved to `src/legacy/CurrentApp.tsx` (rollback only)
- AC 2.2: Old modal-based `AutopilotControlScreen` deleted (replaced by AutopilotScreen)
- AC 2.3: Old modal-based `ConnectionConfigDialog` deleted (moved to SettingsScreen)
- AC 2.4: Feature flag checks removed from components (always use new code)
- AC 2.5: Dead code removed (unused imports, commented code)
- AC 2.6: `src/stores/` directory confirmed deleted (consolidated in Story 8.1)
- AC 2.7: No TypeScript errors after cleanup
- AC 2.8: No broken imports after cleanup
- AC 2.9: All tests still passing after cleanup

**Migration Checklist:**
```bash
# 1. Move old App.tsx to legacy (keep for rollback)
mkdir -p src/legacy
mv src/App.tsx src/legacy/CurrentApp.tsx

# 2. Delete replaced modals
rm src/widgets/AutopilotControlScreen.tsx  # Replaced by screens/AutopilotScreen
rm src/widgets/ConnectionConfigDialog.tsx  # Moved to settings/ConnectionSettings

# 3. Delete old widget selector modal (if exists)
rm src/widgets/WidgetSelectorModal.tsx  # Replaced by sheets

# 4. Verify stores consolidated
ls src/stores/  # Should not exist (deleted in Story 8.1)
ls src/store/   # Should contain all stores

# 5. Clean dead code
# - Remove unused imports
# - Remove commented code blocks
# - Remove feature flag checks (always true now)

# 6. TypeScript check
npm run type-check

# 7. Run tests
npm test

# 8. Verify builds
npm run build:ios
npm run build:android
npm run build:web
```

---

### US 8.6.3: Full WiFi Bridge Test Suite
**As a** QA tester validating VIP Platform
**I want** all scenarios tested on all platforms
**So that** we know glove mode and navigation work everywhere

**Acceptance Criteria:**
- AC 3.1: 5 scenarios × 3 platforms = 15 tests total
- AC 3.2: **iOS Tests:** All 5 scenarios pass
  - idle-at-marina → Native mode (44pt buttons)
  - underway-manual → Glove mode (64pt buttons)
  - underway-autopilot → Glove mode + autopilot engaged
  - shallow-water-alarm → Alarm banner + glove mode
  - end-navigation → Return to native mode after 10min
- AC 3.3: **Android Tests:** All 5 scenarios pass
  - Same test cases as iOS
  - Drawer navigation works in both modes
  - FAB visible and functional
- AC 3.4: **Web Tests:** All 5 scenarios pass
  - Same test cases as iOS/Android
  - Responsive navigation adapts (mobile/tablet/desktop)
- AC 3.5: Glove mode activates/deactivates correctly on all platforms
- AC 3.6: Navigation session persists across app restarts
- AC 3.7: All widgets adapt to density correctly
- AC 3.8: No platform-specific regressions

**Test Execution Plan:**
```
Platform: iOS
┌─────────────────────┬──────────────┬────────────┬─────────────┐
│ Scenario            │ Navigation   │ Touch      │ Grid        │
│                     │ Session      │ Targets    │ Spacing     │
├─────────────────────┼──────────────┼────────────┼─────────────┤
│ idle-at-marina      │ ❌ Inactive  │ 44pt       │ 8pt         │
│ underway-manual     │ ✅ Active    │ 64pt       │ 16pt        │
│ underway-autopilot  │ ✅ Active    │ 64pt       │ 16pt        │
│ shallow-water-alarm │ ✅ Active    │ 64pt       │ 16pt        │
│ end-navigation      │ ❌ Inactive  │ 44pt       │ 8pt         │
└─────────────────────┴──────────────┴────────────┴─────────────┘

(Repeat for Android and Web)
```

---

### US 8.6.4: Performance Benchmarking
**As a** performance engineer
**I want** v3.0 to meet or exceed v2.3 performance
**So that** users don't experience slowdowns

**Acceptance Criteria:**
- AC 4.1: Initial load time ≤ v2.3 baseline (target: <2s)
- AC 4.2: Dashboard render ≤ v2.3 baseline (target: <500ms)
- AC 4.3: Page navigation ≤ v2.3 baseline (target: <200ms)
- AC 4.4: Widget update (NMEA data) ≤ 16ms (60fps)
- AC 4.5: Memory usage ≤ v2.3 baseline + 20% (acceptable increase for new features)
- AC 4.6: Bundle size ≤ v2.3 baseline + 15% (acceptable increase for platform navigation)
- AC 4.7: No frame drops during glove mode toggle
- AC 4.8: Smooth animations on all platforms

**Benchmarking Tools:**
```typescript
// src/utils/performance.ts
export const measurePerformance = (label: string, fn: () => void) => {
  const start = performance.now();
  fn();
  const end = performance.now();
  console.log(`[Performance] ${label}: ${(end - start).toFixed(2)}ms`);
};

// Usage in components
useEffect(() => {
  measurePerformance('Dashboard initial render', () => {
    // Dashboard render logic
  });
}, []);
```

**Performance Test Checklist:**
- [ ] Initial load: Measure time from launch to Dashboard visible
- [ ] Dashboard render: Measure time to render all widgets
- [ ] Page swipe: Measure animation frame rate (should be 60fps)
- [ ] Widget update: Measure NMEA data → widget re-render time
- [ ] Memory: Check memory usage in dev tools (iOS Instruments, Android Profiler)
- [ ] Bundle size: Compare `npm run build` output to v2.3

---

### US 8.6.5: Documentation Updates
**As a** developer or user reading documentation
**I want** up-to-date docs reflecting v3.0
**So that** I understand new features and changes

**Acceptance Criteria:**
- AC 5.1: README.md updated with v3.0 features:
  - VIP Platform overview
  - Glove mode explanation
  - Platform-native navigation
  - Multi-platform support (iOS, Android, Web)
- AC 5.2: ui-architecture.md updated to v3.0:
  - Platform Chrome vs Marine Core architecture
  - Density system (useUIDensity hook)
  - Navigation session concept
  - Screen-based architecture
- AC 5.3: Migration guide created (`docs/MIGRATION-v2.3-to-v3.0.md`):
  - Breaking changes (if any)
  - New features
  - How to upgrade from v2.3
- AC 5.4: API documentation updated:
  - New hooks: `useUIDensity()`, `useNavigationSession()`
  - New stores: `navigationSessionStore.ts`
  - New config: `density.ts`, `features.ts`
- AC 5.5: Changelog updated (`CHANGELOG.md`):
  - All Epic 8 changes listed
  - Version bump to v3.0.0
  - Release date

**Migration Guide Template:**
```markdown
# Migration Guide: v2.3 → v3.0

## What's New in v3.0

### VIP Platform UI
- **Glove Mode:** Automatic UI density adaptation based on navigation session
- **Platform Navigation:** iOS tab bar, Android drawer, Web responsive
- **Multi-Platform:** Single codebase for iOS, Android, Web

### Breaking Changes
- None (v3.0 is fully backward compatible with v2.3 data)

### New Features
1. **Navigation Session Store** - Auto-detects sailing (SOG > 2.0)
2. **Glove Mode Density** - 64pt touch targets, 48pt fonts
3. **Platform-Specific Chrome** - Native navigation on each platform
4. **Screen Architecture** - Dashboard, Autopilot, Settings screens

### Migration Steps
1. Update to v3.0: `git pull origin master`
2. Install dependencies: `npm install`
3. Run app: `npm start`
4. (Optional) Test legacy mode: Settings → Developer → Disable VIP Platform

### Developer Changes
- Import `useUIDensity()` for new components
- Use `PlatformIcon` instead of hardcoded icons
- Follow screen-based architecture (not monolithic App.tsx)
```

---

### US 8.6.6: v3.0 Release
**As a** product owner
**I want** v3.0 tagged and released
**So that** users can access VIP Platform features

**Acceptance Criteria:**
- AC 6.1: Git tag created: `v3.0.0-vip-platform`
- AC 6.2: Release notes written (GitHub release)
- AC 6.3: All platforms build successfully:
  - iOS: `npm run build:ios` → IPA file
  - Android: `npm run build:android` → APK/AAB file
  - Web: `npm run build:web` → Static files
- AC 6.4: App stores updated (if applicable):
  - iOS App Store submission
  - Google Play Store submission
  - Web deployment (if applicable)
- AC 6.5: Release announcement prepared
- AC 6.6: Rollback plan documented (disable feature flags → v2.3)

**Release Checklist:**
```bash
# 1. Final testing
npm test                    # All tests pass
npm run type-check         # No TypeScript errors
npm run lint               # No linting errors

# 2. Version bump
npm version 3.0.0          # Updates package.json, creates git tag

# 3. Build all platforms
npm run build:ios          # iOS build
npm run build:android      # Android build
npm run build:web          # Web build

# 4. Git operations
git add .
git commit -m "Release v3.0.0 - VIP Platform UI"
git tag -a v3.0.0 -m "VIP Platform UI with glove mode and cross-platform navigation"
git push origin master
git push origin v3.0.0

# 5. Create GitHub release
gh release create v3.0.0 \
  --title "v3.0.0 - VIP Platform UI" \
  --notes-file docs/RELEASE-NOTES-v3.0.md \
  --latest

# 6. Deploy to stores (manual or CI/CD)
# - iOS: Upload to App Store Connect
# - Android: Upload to Google Play Console
# - Web: Deploy to hosting (Vercel, Netlify, etc.)
```

---

## Testing Requirements

### Regression Testing
- [ ] All v2.3 features still work:
  - NMEA data display
  - Widget add/remove/reorder
  - Theme switching (Day, Night, Red Night)
  - Alarm triggers and notifications
  - Autopilot controls
  - Connection configuration
- [ ] No new bugs introduced
- [ ] No performance regressions

### Platform Testing
- [ ] **iOS:** All features work (tab bar, SF Symbols, sheets, haptics)
- [ ] **Android:** All features work (drawer, Material Icons, FAB)
- [ ] **Web:** All features work (responsive navigation)

### Scenario Testing (WiFi Bridge)
- [ ] All 15 tests pass (5 scenarios × 3 platforms)
- [ ] Glove mode activates correctly
- [ ] Navigation session persists
- [ ] All widgets adapt to density

### Performance Testing
- [ ] All benchmarks meet targets
- [ ] No memory leaks
- [ ] Smooth animations (60fps)

### Documentation Review
- [ ] README accurate
- [ ] ui-architecture.md updated
- [ ] Migration guide complete
- [ ] Changelog updated

---

## Definition of Done

- [ ] All 6 user stories completed (ACs met)
- [ ] All feature flags enabled by default
- [ ] Old code removed (moved to legacy)
- [ ] Full WiFi Bridge test suite passing (15 tests)
- [ ] Performance benchmarks meet targets
- [ ] All documentation updated
- [ ] v3.0.0 tagged and released
- [ ] All platforms deployed (iOS, Android, Web)
- [ ] All regression tests passing
- [ ] No critical bugs
- [ ] Rollback plan documented
- [ ] Release announcement published

---

## Context Files for bmm-dev

**Load Before Starting:**
1. All Epic 8 story files (8.1 through 8.5)
2. `V2.3-COMPLETION-HANDOFF.md` (v2.3 baseline)
3. `VIP-PLATFORM-UX-STRATEGY.md` (original vision)
4. `REFACTORING-PLAN-VIP-PLATFORM.md` (Sprint 8 section)
5. Current `package.json` (version bump)
6. Performance baseline data from v2.3

---

## Implementation Notes

**Feature Flag Strategy:**
```
v3.0 Launch:
  Feature Flags: ALL ENABLED by default
  Old Code: Moved to src/legacy/ (rollback only)
  New Code: Production default

If Issues Found:
  Settings → Developer → Toggle Feature Flags
  → Fallback to v2.3 code paths
  → Debug and fix
  → Re-enable flags
```

**Release Timeline:**
```
Week 1: Enable flags, remove old code, test internally
Week 2: Full test suite, performance benchmarks, fix bugs
Week 3: Documentation updates, release prep
Week 4: Build, tag, deploy to stores
```

**Success Metrics:**
- ✅ All WiFi Bridge scenarios pass (15/15)
- ✅ Performance meets targets (load <2s, render <500ms)
- ✅ No critical bugs in production
- ✅ All platforms deployed successfully
- ✅ User feedback positive (glove mode, navigation)

**Rollback Plan:**
If critical issues found in production:
1. Disable `USE_PLATFORM_NAVIGATION` flag via dev tools
2. App falls back to v2.3 code (CurrentApp.tsx in legacy/)
3. Fix issue in VIP Platform code
4. Test fix with scenarios
5. Re-enable flag once validated

---

## Epic 8 Completion

This story completes Epic 8: VIP Platform UI Refactor.

**Epic 8 Summary:**
- **Story 8.1:** Foundation (feature flags, Storybook, navigation session store)
- **Story 8.2:** Glove Mode (density system, useUIDensity hook)
- **Story 8.3:** iOS Navigation (tab bar, SF Symbols, screens)
- **Story 8.4:** Android/Web Navigation (drawer, Material Icons, FAB, responsive)
- **Story 8.5:** Widget Integration (all 9 widgets density-aware)
- **Story 8.6:** Production Release (enable flags, remove old code, test, release)

**Total Effort:** 12-18 sprints (completed in Story 8.6)

**Delivered Value:**
- ✅ Glove-friendly UI for helm use
- ✅ Platform-native navigation (iOS, Android, Web)
- ✅ Automatic navigation session detection
- ✅ Consistent marine UX across platforms
- ✅ Production-ready v3.0 release

---

## Dev Agent Record

### Context Reference
- **Story Context File:** [story-context-8.6.xml](story-context-8.6.xml)
- **Generated:** 2025-10-20
- **Status:** Ready for Development (once Stories 8.1-8.5 complete)

### Implementation Notes
- Load story-context-8.6.xml before starting implementation
- Enable all feature flags (production-ready configuration)
- Full test suite: 15 WiFi Bridge tests (5 scenarios × 3 platforms)
- Performance benchmarking against v2.3 baseline
- Documentation updates and v3.0 release preparation

---

**Story Owner:** bmm-dev Agent
**Estimated Effort:** 2 sprints
**Ready to Start:** Once Stories 8.1-8.5 complete ✅
