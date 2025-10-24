# Story 2.15: Widget Pin Functionality & State Persistence - Brownfield Addition

**Status:** ContextReadyDraft

## Story

**As a** marine navigator with specific monitoring preferences,  
**I want** to pin important widgets so they stay expanded across app restarts,  
**so that** critical information I need is always visible without manual reconfiguration.

## Story Context

**Existing System Integration:**
- Integrates with: Current widget framework from Epic 2 (story-2.2)
- Technology: Zustand store + React Native gesture handling
- Follows pattern: Existing widget configuration pattern
- Touch points: Widget store, all instrument widgets, dashboard layout

## Acceptance Criteria

**Pin Functionality Requirements:**
1. Widgets can be pinned to maintain expanded state across app restarts
2. Long press on widget caret toggles pin state (unpinned ↔ pinned)
3. Visual indicators: Caret (⌄/⌃) for unpinned, Pin icon (📌) for pinned widgets
4. Pinned widgets start in expanded state when app launches
5. Unpinned widgets always start in collapsed state regardless of last session

**State Persistence Requirements:**
6. Pin state stored per widget ID in widget store with AsyncStorage persistence
7. Widget expanded/collapsed state tracked but only persists for pinned widgets
8. Unpinned widget state resets to collapsed on app restart
9. Pin state survives app updates and data migrations

**Integration Requirements:**
10. Builds on Story 2.12 basic two-state widget system foundation
11. Maintains existing Zustand store pattern for widget configuration
12. Compatible with existing gesture handling - no conflicts with tap-to-expand
13. Works with existing WidgetCard component structure

**Performance Requirements:**
14. Pin state changes complete instantly (<50ms)
15. App startup time unaffected by pin state restoration
16. Memory usage scales appropriately with number of pinned widgets

## Tasks

### **Simple Pin Functionality Implementation**

**Task A:** Update WidgetConfig schema with pin functionality (AC: 1, 2, 6)
- [ ] Add isPinned: boolean property to WidgetConfig interface
- [ ] Add isExpanded: boolean property to WidgetConfig interface  
- [ ] Implement pinWidget, unpinWidget store actions
- [ ] Update AsyncStorage persistence to include new properties (no migration needed)

**Task B:** Implement pin toggle interaction (AC: 2, 3)
- [ ] Add long-press gesture handler to widget caret
- [ ] Toggle pin state on long-press caret interaction
- [ ] Update visual indicator: caret (⌄/⌃) vs pin icon (📌)
- [ ] Ensure gesture doesn't conflict with existing tap-to-expand

**Task C:** Implement pin state restoration (AC: 4, 5, 8, 15)
- [ ] Restore pinned widgets to expanded state on app startup
- [ ] Reset unpinned widgets to collapsed state on app startup
- [ ] Handle AsyncStorage persistence and hydration
- [ ] Test pin state survives app restarts and updates

**Dependency Mapping:**
- Task A → Task B (store structure needed for gesture handling)
- Task A → Task C (store actions needed for pin functionality)
- Task A + Task B → Task D (both store and gestures needed for related expansion)
- Task B + Task C can run in parallel after Task A completion

**Parallel Execution Opportunities:**
- Tasks B & C can run simultaneously after Task A (40% time savings in Phase 2)
- Testing activities within each task can be prepared in parallel with implementation

## Dev Notes

**Widget Framework Architecture:**
- Current implementation: `src/store/widgetStore.ts` manages widget configurations
- Widget rendering: `src/widgets/WidgetCard.tsx` provides base widget container
- Layout system: Dashboard renders widgets based on store configuration
- Existing pattern: All widgets use WidgetConfig interface for configuration

**State Management Pattern:**
- Zustand store with persist middleware for AsyncStorage
- Widget configurations stored as array of WidgetConfig objects
- Current properties: id, type, position, size, config, nmeaSource
- New properties needed: viewState, isPinned, lastInteraction, autoCollapseTimeout

**Gesture Handling Integration:**
- Current: Long-press handled by WidgetCard for configuration
- New: Tap gesture for expand/collapse, preserve long-press functionality
- Framework: React Native Gesture Handler (already in project)
- Performance: Gesture recognition must not block real-time NMEA updates

**Pin State Behavior:**
- Pinned widgets maintain their state across app sessions
- Unpinned widgets always start collapsed on app restart
- No automatic state changes - widgets only change when user interacts
- Background behavior: Pause timers when app is backgrounded

**Related Widget Logic:**
```
Engine Widgets ↔ Oil Pressure, Temperature, Voltage
Battery Widgets ↔ Charging system, Inverter widgets
Depth Widget ↔ Anchor alarm, Navigation widgets
Autopilot Widget ↔ Compass, Wind, GPS widgets
```

**Performance Considerations:**
- State updates must not cause widget re-renders unless necessary
- Timer management optimized to prevent memory leaks
- Gesture handling runs on UI thread for 60fps performance
- Persistence throttled to prevent excessive AsyncStorage writes

### Testing

**Test File Location:** `__tests__/store/widgetStore.test.ts` and `__tests__/widgets/WidgetCard.test.tsx`

**Testing Standards:**
- Use React Native Testing Library for component testing
- Mock AsyncStorage for store persistence tests
- Test gesture interactions with fireEvent from testing library
- Mock AsyncStorage for pin state persistence testing

**Testing Framework:**
- Jest + React Native Testing Library
- Mock external dependencies (AsyncStorage, timers)
- Use act() for async state updates
- Snapshot tests for widget state rendering

**Specific Testing Requirements:**
- Test widget state persistence across app restarts
- Verify gesture handling doesn't break existing functionality
- Test pin state persistence with multiple widgets
- Performance testing: state updates complete <16ms (60fps)

## Story Dependencies & Prerequisites

**CRITICAL DEPENDENCIES:** This story cannot begin until the following foundation stories are completed:

### **Epic 2 Prerequisites (MUST be Done before Story 2.15)**
- **Story 2.12**: Two-State Widget System (Status: Review) - **BLOCKING**
  - *Rationale*: Story 2.15 enhances the widget state system established in 2.12
- **Story 2.15 builds directly on the expand/collapse foundation from 2.12**

### **Epic 6 Prerequisites (SHOULD be Done before Story 2.15)**
- **Story 6.2**: Multi-Store Zustand Architecture (Status: Ready for Development) - **RECOMMENDED FIRST**
  - *Rationale*: Enhanced widget store patterns depend on multi-store architecture

### **Definition of Ready Checklist**

Before dev pickup, verify:
- [ ] **Dependencies**: Story 2.12 (Review→Done) completed
- [ ] **Architecture**: Widget state management patterns reviewed by dev team
- [ ] **Testing**: React Native Gesture Handler setup validated
- [ ] **Performance**: AsyncStorage optimization strategy defined for pin state
- [ ] **UX**: Auto-collapse timing validated with marine UX requirements

### **Acceptance Criteria Enhancement (Testable Metrics)**

**Enhanced AC for QA Validation:**

1. **Widget state support**: Collapsed/expanded states functional
   - *Success Metric*: All widgets toggle between states smoothly
   - *Test Method*: Manual testing + automated state verification

4. **Auto-collapse timing**: 30-second timeout for unpinned widgets
   - *Success Metric*: Unpinned widgets collapse after exactly 30s ±100ms
   - *Test Method*: Automated timer testing + manual verification

11. **Performance requirement**: Smooth with 10+ widgets
    - *Success Metric*: State changes complete <16ms with 10+ widgets active
    - *Test Method*: Performance profiling + frame rate monitoring

12. **Gesture compatibility**: No interference with existing interactions
    - *Success Metric*: All existing gestures continue working
    - *Test Method*: Regression testing + manual gesture verification

## Change Log

| Date | Version | Description | Author |
|------|---------|-------------|--------|
| 2025-10-16 | 1.0 | Initial story creation for UI Architecture v2.1 implementation | Sarah (PO) |
| 2025-10-16 | 1.1 | Added task optimization, dependencies, and enhanced testable ACs | Sarah (PO) |

## Dev Agent Record

*This section will be populated by the development agent during implementation*

### Agent Model Used
*To be filled by dev agent*

### Debug Log References
*To be filled by dev agent*

### Completion Notes List
*To be filled by dev agent*

### File List
*To be filled by dev agent*

## QA Results

*Results from QA Agent review will be populated here after implementation*