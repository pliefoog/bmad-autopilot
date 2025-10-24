# Epic 8: VIP Platform UI Refactor
## Cross-Platform Navigation & Adaptive Density System

**Epic ID:** 8.0
**Priority:** P0 (Foundation for VIP Platform)
**Status:** BLOCKED (Waiting for v2.3 UI completion)
**Timeline:** 7 stories × 2-4 sprints each = 16-24 sprints total

---

## Epic Overview

Transform the current single-platform UI architecture into the **VIP Platform** with:
- Platform-specific navigation (iOS tab bar, Android drawer, Web responsive)
- Automatic glove mode (UI density switches based on navigation session)
- Marine core separation (unified marine UX across all platforms)
- Foundation for future VIP features (camera, voice, BLE, multi-device)

---

## Epic Goals

### Primary Goals
1. **Platform-native feel** - iOS feels like iOS, Android like Android, Web like Web
2. **Automatic glove mode** - UI adapts to sailing conditions without manual configuration
3. **Marine UX consistency** - Widgets look identical across all platforms
4. **Clean architecture** - Separation of platform chrome from marine core
5. **Zero regressions** - All v2.3 features continue working

### Success Metrics
- ✅ Runs on iOS, Android, Web with platform-native navigation
- ✅ Touch targets auto-resize: 44pt (native) ↔ 64pt (glove mode)
- ✅ Navigation session auto-starts when SOG > 2.0 knots
- ✅ Zero critical bugs from v2.3 baseline
- ✅ Performance: <100ms for all interactions

---

## Story Breakdown

### Story 8.1: Foundation & Store Consolidation
**Scope:** Infrastructure setup, unified state management
**Sprints:** 2
**Dependencies:** v2.3 complete
**Key Deliverables:**
- Feature flag system
- Storybook setup
- Navigation session store
- Store consolidation (src/store/ vs src/stores/)
- WiFi Bridge scenario loading

---

### Story 8.2: Glove Mode System
**Scope:** Automatic UI density adaptation
**Sprints:** 2-3
**Dependencies:** Story 8.1 complete
**Key Deliverables:**
- useUIDensity hook
- Density configuration (glove vs native)
- AutopilotFooter refactor (reference implementation)
- Metric cells density awareness
- Visual indicator (glove icon)
- WiFi Bridge scenario testing

---

### Story 8.3: Platform Navigation - iOS
**Scope:** iOS-specific navigation chrome
**Sprints:** 2
**Dependencies:** Story 8.2 complete
**Key Deliverables:**
- iOS tab bar navigation (5 tabs: Dashboard, Autopilot, Alarms, Settings, Help)
- SF Symbols integration (gauge, location.circle, bell, gearshape, questionmark.circle)
- DashboardScreen extraction from App.tsx
- iOS-specific modals (sheets from bottom)
- Haptic feedback integration

---

### Story 8.4: Platform Navigation - Android & Web
**Scope:** Android drawer + Web responsive navigation
**Sprints:** 2-3
**Dependencies:** Story 8.3 complete (can learn from iOS patterns)
**Key Deliverables:**
- Android navigation drawer with hamburger menu
- Material Icons integration
- Floating Action Button (FAB)
- Web responsive navigation (drawer on mobile, sidebar on desktop)
- Platform icon abstraction layer

---

### Story 8.5: Dashboard & Widget Integration
**Scope:** Connect dashboard to glove mode and platform navigation
**Sprints:** 2-3
**Dependencies:** Stories 8.3 and 8.4 complete
**Key Deliverables:**
- PaginatedDashboard glove-mode aware
- ResponsiveDashboard integration
- All 9 widgets density-aware
- **Modular widget architecture** (hooks + compound components, 85% code reduction)
- Settings screen in platform navigation
- Autopilot screen in platform navigation
- Alarms screen in platform navigation (integrates with alarmStore)
- Help screen in platform navigation (integrates Story 4.6 help components)

---

### Story 8.7: Interactive Dashboard Drag & Drop with Live Reflow
**Scope:** iOS-style widget reordering with cross-page dragging
**Sprints:** 3-4
**Dependencies:** Stories 8.2 and 8.5 complete
**Key Deliverables:**
- Basic drag & drop in grid (long-press, lift, drag, drop)
- Live widget reflow (widgets slide aside, drop preview, spring animations)
- Cross-page dragging (edge auto-scroll, page transitions)
- Visual & haptic feedback (drag handle, haptics, accessibility)
- Glove-friendly touch targets (64pt in glove mode)
- Performance optimization (60fps with 24 widgets)

---

### Story 8.8: Final Migration & Production Release
**Scope:** Remove old code, enable all features, release v3.0
**Sprints:** 2
**Dependencies:** Stories 8.1-8.7 complete
**Key Deliverables:**
- Enable all feature flags by default
- Remove old monolithic App.txt code (Dashboard.tsx deprecated)
- Delete unused modal components
- Full WiFi Bridge test suite (20 tests: 5 scenarios × 4 features)
- Performance benchmarking
- Documentation updates
- v3.0.0 release

---

## Epic Dependencies

### BLOCKERS (Must Resolve First)
- ❌ **v2.3 UI Architecture** - 100% complete with all ACs met
- ❌ **v2.3 Bug List** - All critical bugs documented and fixed
- ❌ **WiFi Bridge Scenario Loader** - Must support named scenario loading

### EXTERNAL DEPENDENCIES
- React Navigation libraries (@react-navigation/native, /bottom-tabs, /drawer)
- expo-symbols (SF Symbols for iOS)
- react-native-vector-icons (Material Icons for Android)
- Storybook for React Native

---

## Epic Risks

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| Breaking v2.3 features | High | Medium | Feature flags, incremental testing |
| Platform-specific bugs | Medium | High | Test on real iOS/Android devices |
| Performance degradation | Medium | Low | Profile after each story, optimize |
| Navigation session not triggering | High | Low | WiFi Bridge scenarios validate |
| Drag & drop reflow performance | High | Medium | Profile reflow algorithm, limit 12 widgets/page, optimize spring calculations |
| Cross-platform gesture issues | Medium | High | Reuse DraggableWidgetPlatform patterns, test on real devices |

---

## Epic Context Files

### Required Reading (Before Starting Any Story)
1. **VIP-PLATFORM-UX-STRATEGY.md** - Strategic vision
2. **VIP-UX-IMPLEMENTATION-GUIDE.md** - Implementation specs
3. **REFACTORING-PLAN-VIP-PLATFORM.md** - Detailed roadmap
4. **ui-architecture.md** (v2.3) - Current baseline
5. **V2.3-COMPLETION-HANDOFF.md** - Handoff checklist

### Code References
1. **App.tsx** (current) - Starting point for refactoring
2. **AutopilotFooter.tsx** - Reference implementation pattern
3. **useResponsiveGrid.ts** - Will extend for glove mode
4. **wifiBridgeScenarios.ts** - Test scenarios

---

## Epic Timeline

**Estimated Duration:** 16-24 sprints (32-48 weeks for human dev)

**Sprint Allocation:**
- Story 8.1: Sprints 1-2 (Foundation)
- Story 8.2: Sprints 3-5 (Glove Mode)
- Story 8.3: Sprints 6-7 (iOS Navigation)
- Story 8.4: Sprints 8-10 (Android/Web Navigation)
- Story 8.5: Sprints 11-13 (Dashboard Integration)
- Story 8.7: Sprints 14-17 (Interactive Drag & Drop)
- Story 8.8: Sprints 18-19 (Final Migration)

**With AI bmm-dev agent:** Potentially faster with proper BMM context and autonomous execution.

---

## Definition of Done (Epic Complete)

- [ ] All 7 stories completed with ACs met
- [ ] iOS, Android, Web all functional with platform-native navigation
- [ ] Glove mode auto-activates on navigation session start
- [ ] Interactive drag & drop with live reflow working (60fps, cross-page support)
- [ ] All v2.3 features still working (zero regressions)
- [ ] WiFi Bridge test suite passes (20 tests)
- [ ] Performance benchmarks meet or exceed v2.3 baseline
- [ ] Documentation updated (README, architecture docs)
- [ ] v3.0.0 tagged and released

---

## Story Status Tracking

| Story | Status | Sprints | Started | Completed | Notes |
|-------|--------|---------|---------|-----------|-------|
| 8.1 Foundation | 🔴 Blocked | 2 | - | - | Waiting for v2.3 |
| 8.2 Glove Mode | 🔴 Blocked | 2-3 | - | - | Depends on 8.1 |
| 8.3 iOS Nav | 🔴 Blocked | 2 | - | - | Depends on 8.2 |
| 8.4 Android/Web Nav | 🔴 Blocked | 2-3 | - | - | Depends on 8.3 |
| 8.5 Dashboard Integration | 🔴 Blocked | 2-3 | - | - | Depends on 8.3, 8.4 |
| 8.7 Drag & Drop | 🔴 Blocked | 3-4 | - | - | Depends on 8.2, 8.5 |
| 8.8 Final Migration | 🔴 Blocked | 2 | - | - | Depends on 8.1-8.7 |

**Legend:**
- 🔴 Blocked - Dependencies not met
- 🟡 Ready - Can start
- 🔵 In Progress - Currently working
- 🟢 Done - All ACs met

---

**Epic Owner:** Pieter (Product) + bmm-dev Agent (Implementation)
**Created:** 2025-10-20
**Status:** Planning complete, ready for execution once v2.3 done
