# Sensor Configuration Implementation Plan

**Project:** Unified Sensor Configuration with Context-Aware Alarm Defaults  
**Start Date:** December 15, 2025  
**Estimated Duration:** 8-12 days  
**Status:** Planning Complete - Ready for Implementation  
**Environment:** Development (Not in Production - No Migration Required)

---

## 🎯 Project Goals

1. **Rename** "Alarm Configuration" to "Sensor Configuration"
2. **Add** sensor instance naming (user-assigned names)
3. **Add** context-aware configuration (battery chemistry, engine type)
4. **Enhance** alarm system with warning + critical thresholds
5. **Implement** per-level sound patterns
6. **Add** hysteresis support for alarm evaluation
7. **Maintain** existing UI pattern (picker + tabs)
8. **Preserve** auto-detection and zero-config widget behavior

---

## ⚠️ Critical Risks & Mitigations

### Risk 1: Performance Degradation (SEVERITY: MEDIUM)

**Risk:** Display name lookups on every widget render could impact performance.

**Mitigation:**
- [ ] Memoize `getDisplayName()` function
- [ ] Cache name lookups in widget state
- [ ] Batch configuration updates
- [ ] Profile render times before/after

**Performance Budget:**
- Widget render: < 16ms (maintain 60fps)
- Config lookup: < 1ms
- Name resolution: < 0.5ms

### Risk 2: Platform Inconsistencies (SEVERITY: MEDIUM)

**Risk:** UI components behave differently across iOS/Android/Web.

**Mitigation:**
- [ ] Test on iOS device (not just simulator)
- [ ] Test on Android device
- [ ] Test on web browser (Chrome, Safari, Firefox)
- [ ] Use platform-agnostic components (PlatformPicker, PlatformToggle)
- [ ] Document platform-specific quirks

### Risk 3: Type Safety Failures (SEVERITY: MEDIUM)

**Risk:** Optional context fields and conditional logic could cause runtime errors.

**Mitigation:**
- [ ] Strict TypeScript compilation (no `any` types)
- [ ] Runtime validation at store boundaries
- [ ] Zod/Yup schema validation for persistence
- [ ] Comprehensive unit tests for type guards

### Risk 4: Edge Case Failures (SEVERITY: HIGH)

**Risk:** Uncovered edge cases could cause crashes or data inconsistencies.

**Mitigation:**
- [ ] Document all edge cases (see section below)
- [ ] Write specific tests for each edge case
- [ ] Add defensive coding (null checks, fallbacks)
- [ ] Implement error boundaries in React components

---

## 📋 Edge Cases to Handle

### Sensor Lifecycle Edge Cases

| Scenario | Expected Behavior | Test |
|----------|-------------------|------|
| **Sensor configured, then disappears permanently** | Config remains in store, marked as "offline" | ✅ Manual test |
| **Sensor instance number changes** | User must reconfigure (cannot auto-match) | ✅ Manual test |
| **Two sensors swap instance numbers** | Each retains its own config by instance | ✅ Unit test |
| **Sensor type changes (impossible but...)**  | Ignored - type is part of key | ✅ Unit test |

### Configuration Edge Cases

| Scenario | Expected Behavior | Test |
|----------|-------------------|------|
| **Warning threshold > Critical (for 'below')** | Validation error, block save | ✅ Unit test |
| **Critical threshold > Warning (for 'above')** | Validation error, block save | ✅ Unit test |
| **Negative threshold values** | Allow (valid for temperatures) | ✅ Unit test |
| **Empty name field** | Use fallback (NMEA name or type:instance) | ✅ Unit test |
| **Invalid battery chemistry** | Fallback to 'lead-acid' | ✅ Unit test |
| **Missing context for sensor type** | Use generic defaults | ✅ Unit test |

### Storage Edge Cases

| Scenario | Expected Behavior | Test |
|----------|-------------------|------|
| **Storage quota exceeded** | Show error, prevent save | ✅ Manual test |
| **Corrupted JSON in storage** | Clear corrupted entry, use defaults | ✅ Unit test |
| **Storage unavailable (private browsing)** | Graceful degradation, memory-only | ✅ Manual test |
| **Concurrent writes to same config** | Last-write-wins (timestamp-based) | ✅ Unit test |

### UI Edge Cases

| Scenario | Expected Behavior | Test |
|----------|-------------------|------|
| **User closes dialog mid-edit** | Auto-save all changes | ✅ Manual test |
| **User switches instances without saving** | Auto-save previous instance | ✅ Manual test |
| **Sensor type with no instances** | Show "No sensors detected" message | ✅ Unit test |
| **Dialog opened while sensor disconnecting** | Show last known config, mark offline | ✅ Manual test |

---

## 🏗️ Implementation Phases

---

## **PHASE 1: Rename & Restructure** (1-2 days)

**Goal:** Rename components without changing functionality

### Tasks

- [ ] **1.1: Rename Component File**
  - [ ] 1.1.1: Rename `AlarmConfigDialog.tsx` → `SensorConfigDialog.tsx`
  - [ ] 1.1.2: Update component export name
  - [ ] 1.1.3: Update all imports across codebase
  - [ ] 1.1.4: Update comment headers and JSDoc
  
- [ ] **1.2: Update Navigation/Menu**
  - [ ] 1.2.1: Update hamburger menu label: "Alarm Configuration" → "Sensor Configuration"
  - [ ] 1.2.2: Update route names if applicable
  - [ ] 1.2.3: Update settings screen labels
  - [ ] 1.2.4: Update any breadcrumbs or titles
  
- [ ] **1.3: Update Dialog Title**
  - [ ] 1.3.1: Change dialog header: "Alarm Configuration" → "Sensor Configuration"
  - [ ] 1.3.2: Update any subtitles or descriptions
  
- [ ] **1.4: Code Cleanup**
  - [ ] 1.4.1: Run prettier/formatter
  - [ ] 1.4.2: Fix any linting issues
  - [ ] 1.4.3: Update test files to use new names
  - [ ] 1.4.4: Verify TypeScript compilation

### Testing Checklist
- [ ] ✅ Dialog opens from hamburger menu
- [ ] ✅ Sensor type picker shows all types
- [ ] ✅ Instance tabs work correctly
- [ ] ✅ All threshold inputs functional
- [ ] ✅ Sound pattern selection works
- [ ] ✅ Test sound button works
- [ ] ✅ Configuration saves correctly
- [ ] ✅ Configuration persists after restart
- [ ] ✅ iOS: No crashes or warnings
- [ ] ✅ Android: No crashes or warnings
- [ ] ✅ Web: No console errors

### Acceptance Criteria
- ✅ All references to "AlarmConfigDialog" replaced
- ✅ Menu shows "Sensor Configuration"
- ✅ No functional changes (behavior identical)
- ✅ All tests pass
- ✅ No TypeScript errors

### Rollback
```bash
git revert <commit-hash>
```

---

## **PHASE 2: Add Sensor Name Field** (1 day)

**Goal:** Add instance naming capability

### Tasks

- [ ] **2.1: Update Data Model**
  - [ ] 2.1.1: Add `name?: string` to `SensorAlarmThresholds` interface
  - [ ] 2.1.2: Update TypeScript types
  - [ ] 2.1.3: Add JSDoc comments explaining field
  
- [ ] **2.2: Update UI Component**
  - [ ] 2.2.1: Add "Instance Information" section at top of form
  - [ ] 2.2.2: Add name TextInput with label "Name (optional)"
  - [ ] 2.2.3: Add placeholder text: "e.g., House Battery"
  - [ ] 2.2.4: Wire up useState for name field
  - [ ] 2.2.5: Load existing name from config
  - [ ] 2.2.6: Include name in save logic
  
- [ ] **2.3: Update Storage**
  - [ ] 2.3.1: Ensure name field is persisted to nmeaStore
  - [ ] 2.3.2: Ensure name field is persisted to backup store
  - [ ] 2.3.3: Test persistence across app restart
  
- [ ] **2.4: Create Display Name Helper**
  - [ ] 2.4.1: Create `getSensorDisplayName()` utility function
  - [ ] 2.4.2: Priority: config.name → nmeaData.name → "type:instance"
  - [ ] 2.4.3: Add memoization for performance
  - [ ] 2.4.4: Export from shared utils

### Testing Checklist
- [ ] ✅ Name field appears in dialog
- [ ] ✅ User can type custom name
- [ ] ✅ Name saves when dialog closes
- [ ] ✅ Name persists after app restart
- [ ] ✅ Name shows in widget (next phase)
- [ ] ✅ Empty name falls back correctly
- [ ] ✅ Special characters handled (emoji, unicode)
- [ ] ✅ Very long names truncated/wrapped

### Acceptance Criteria
- ✅ Name field functional in UI
- ✅ Name persists correctly
- ✅ Display name helper works
- ✅ No regressions in existing functionality

### Rollback
```bash
git revert <commit-hash>
```

---

## **PHASE 3: Add Context Fields** (2-3 days)

**Goal:** Add battery chemistry and engine type configuration

### Tasks

- [ ] **3.1: Update Data Model**
  - [ ] 3.1.1: Add `context?: { batteryChemistry?, engineType? }` to `SensorAlarmThresholds`
  - [ ] 3.1.2: Define chemistry type: `'lead-acid' | 'agm' | 'lifepo4'`
  - [ ] 3.1.3: Define engine type: `'diesel' | 'gasoline' | 'outboard'`
  - [ ] 3.1.4: Update TypeScript types across codebase
  
- [ ] **3.2: Create Context UI Components**
  - [ ] 3.2.1: Create battery chemistry picker items
  - [ ] 3.2.2: Create engine type picker items
  - [ ] 3.2.3: Add helper text for each option
  - [ ] 3.2.4: Add conditional rendering logic
  
- [ ] **3.3: Update SensorConfigDialog**
  - [ ] 3.3.1: Add batteryChemistry state
  - [ ] 3.3.2: Add engineType state
  - [ ] 3.3.3: Add conditional PlatformPicker for battery sensors
  - [ ] 3.3.4: Add conditional PlatformPicker for engine sensors
  - [ ] 3.3.5: Load existing context from config
  - [ ] 3.3.6: Include context in save logic
  - [ ] 3.3.7: Add helper text: "(Affects default alarm thresholds)"
  
- [ ] **3.4: Auto-Detection Logic**
  - [ ] 3.4.1: Detect battery chemistry from nominalVoltage if available
  - [ ] 3.4.2: Detect engine type from RPM patterns if available
  - [ ] 3.4.3: Pre-populate picker with auto-detected value
  - [ ] 3.4.4: Allow user to override auto-detection
  
- [ ] **3.5: Storage Integration**
  - [ ] 3.5.1: Persist context to nmeaStore
  - [ ] 3.5.2: Persist context to backup store
  - [ ] 3.5.3: Test context restoration after restart

### Testing Checklist
- [ ] ✅ Battery chemistry picker shows for batteries
- [ ] ✅ Engine type picker shows for engines
- [ ] ✅ Pickers hidden for other sensor types
- [ ] ✅ Context saves correctly
- [ ] ✅ Context persists after restart
- [ ] ✅ Auto-detection suggests correct values
- [ ] ✅ User can override auto-detected values
- [ ] ✅ Invalid context values rejected

### Acceptance Criteria
- ✅ Context fields appear conditionally
- ✅ Context saves and restores correctly
- ✅ Auto-detection works (when possible)
- ✅ User override allowed
- ✅ No TypeScript errors

### Rollback
```bash
git revert <commit-hash>
```

---

## **PHASE 4: Redesign Alarm Threshold UI** (2 days)

**Goal:** Split into Critical/Warning sections with per-level sounds

### Tasks

- [ ] **4.1: Update Data Model**
  - [ ] 4.1.1: Add `critical?: number` field
  - [ ] 4.1.2: Add `warning?: number` field (already exists)
  - [ ] 4.1.3: Add `direction?: 'above' | 'below'` field
  - [ ] 4.1.4: Add `criticalSoundPattern?: string` field
  - [ ] 4.1.5: Add `warningSoundPattern?: string` field
  - [ ] 4.1.6: Mark old fields as deprecated: `min?`, `max?`, `thresholdType?`, `soundPattern?`
  
- [ ] **4.2: Create New UI Sections**
  - [ ] 4.2.1: Create "Critical Alarm" section component
  - [ ] 4.2.2: Create "Warning Alarm" section component
  - [ ] 4.2.3: Add threshold input + unit display
  - [ ] 4.2.4: Add direction picker (Above/Below)
  - [ ] 4.2.5: Add sound pattern picker
  - [ ] 4.2.6: Add "Test Sound" button per section
  
- [ ] **4.3: Remove Old UI Elements**
  - [ ] 4.3.1: Remove "Threshold Type" picker
  - [ ] 4.3.2: Remove single "Min Value" field
  - [ ] 4.3.3: Remove single "Max Value" field
  - [ ] 4.3.4: Remove single "Sound Pattern" picker
  - [ ] 4.3.5: Keep "Warning Value" field (move to Warning section)
  
- [ ] **4.4: Update State Management**
  - [ ] 4.4.1: Add state for critical threshold
  - [ ] 4.4.2: Add state for warning threshold
  - [ ] 4.4.3: Add state for direction
  - [ ] 4.4.4: Add state for critical sound
  - [ ] 4.4.5: Add state for warning sound
  - [ ] 4.4.6: Update load logic to populate new fields
  - [ ] 4.4.7: Update save logic to save new format
  
- [ ] **4.5: Add Validation**
  - [ ] 4.5.1: Validate critical vs warning relationship
  - [ ] 4.5.2: For 'below': warning must be > critical
  - [ ] 4.5.3: For 'above': warning must be < critical
  - [ ] 4.5.4: Show validation error if invalid
  - [ ] 4.5.5: Block save if validation fails

### Testing Checklist
- [ ] ✅ Critical section renders correctly
- [ ] ✅ Warning section renders correctly
- [ ] ✅ Direction picker works
- [ ] ✅ Critical sound picker works
- [ ] ✅ Warning sound picker works
- [ ] ✅ Test sound buttons work independently
- [ ] ✅ Validation catches invalid thresholds
- [ ] ✅ Cannot save invalid configuration
- [ ] ✅ New format saves correctly
- [ ] ✅ Configuration persists after restart

### Acceptance Criteria
- ✅ UI split into Critical/Warning sections
- ✅ Per-level sound patterns functional
- ✅ Direction field works correctly
- ✅ Validation prevents invalid configs
- ✅ Old UI elements removed
- ✅ No regressions

### Rollback
```bash
git revert <commit-hash>
```

---

## **PHASE 5: Implement Context-Aware Defaults** (2-3 days)

**Goal:** Load smart defaults based on sensor context

### Tasks

- [ ] **5.1: Expand AlarmThresholdDefaults.ts**
  - [ ] 5.1.1: Add battery chemistry variants (lead-acid, agm, lifepo4)
  - [ ] 5.1.2: Add engine type variants (diesel, gasoline, outboard)
  - [ ] 5.1.3: Add temperature location variants (engine, cabin, etc.)
  - [ ] 5.1.4: Add tank type variants (fuel, water, waste, blackwater)
  - [ ] 5.1.5: Include critical + warning + hysteresis for each
  - [ ] 5.1.6: Include direction for each
  - [ ] 5.1.7: Include suggested sound patterns
  
- [ ] **5.2: Create Smart Defaults Function**
  - [ ] 5.2.1: Create `getSmartDefaults(sensorType, context)` function
  - [ ] 5.2.2: Query defaults based on sensor type + context
  - [ ] 5.2.3: Return complete alarm configuration
  - [ ] 5.2.4: Handle missing context (fallback to generic)
  - [ ] 5.2.5: Add unit tests for all sensor types
  
- [ ] **5.3: Integrate into UI**
  - [ ] 5.3.1: Update "Initialize Defaults" button to use smart defaults
  - [ ] 5.3.2: Show preview when context changes
  - [ ] 5.3.3: Add tooltip/help text showing what defaults will be applied
  - [ ] 5.3.4: Confirm before applying (dialog)
  
- [ ] **5.4: Auto-Apply on First Configuration**
  - [ ] 5.4.1: Detect unconfigured sensor (no alarmThresholds)
  - [ ] 5.4.2: Auto-apply smart defaults on first open
  - [ ] 5.4.3: Show notification: "Applied default settings"
  - [ ] 5.4.4: User can still modify after

### Testing Checklist
- [ ] ✅ Battery chemistry defaults correct
  - [ ] Lead-acid: 11.8V critical
  - [ ] AGM: 12.0V critical
  - [ ] LiFePO4: 12.8V critical
- [ ] ✅ Engine type defaults correct
  - [ ] Diesel: 3200 RPM max
  - [ ] Gasoline: 4500 RPM max
  - [ ] Outboard: 6000 RPM max
- [ ] ✅ Tank type defaults correct
  - [ ] Fuel: 10% critical (below)
  - [ ] Waste: 90% critical (above)
- [ ] ✅ Temp location defaults correct
- [ ] ✅ "Initialize Defaults" applies smart defaults
- [ ] ✅ Unconfigured sensors get auto-defaults
- [ ] ✅ Context change shows new defaults

### Acceptance Criteria
- ✅ Smart defaults implemented for all sensor types
- ✅ Context-aware selection works
- ✅ UI integration complete
- ✅ Auto-initialization works
- ✅ All tests pass

### Rollback
```bash
git revert <commit-hash>
```

---

## **PHASE 6: Implement Hysteresis** (2-3 days)

**Goal:** Add hysteresis field and evaluation logic

### Tasks

- [ ] **6.1: Update Data Model**
  - [ ] 6.1.1: Ensure `hysteresis?: number` field exists
  - [ ] 6.1.2: Add JSDoc explaining hysteresis
  - [ ] 6.1.3: Update TypeScript types
  
- [ ] **6.2: Add UI Field**
  - [ ] 6.2.1: Add hysteresis input in "Advanced" section
  - [ ] 6.2.2: Add label: "Hysteresis"
  - [ ] 6.2.3: Add help text: "Prevents alarm flickering"
  - [ ] 6.2.4: Wire up state
  - [ ] 6.2.5: Include in save logic
  
- [ ] **6.3: Create Alarm Evaluator**
  - [ ] 6.3.1: Create `AlarmEvaluator.ts` service
  - [ ] 6.3.2: Implement `evaluate()` function
  - [ ] 6.3.3: Add hysteresis logic for 'below' direction
  - [ ] 6.3.4: Add hysteresis logic for 'above' direction
  - [ ] 6.3.5: Track alarm state (normal/warning/critical)
  - [ ] 6.3.6: Apply hysteresis when transitioning back to normal
  - [ ] 6.3.7: Add comprehensive unit tests
  
- [ ] **6.4: Update Alarm State Tracking**
  - [ ] 6.4.1: Add `currentState` to SensorAlarmThresholds
  - [ ] 6.4.2: Track current level per metric
  - [ ] 6.4.3: Track last triggered timestamp
  - [ ] 6.4.4: Track trigger count
  - [ ] 6.4.5: Persist state across restarts
  
- [ ] **6.5: Integrate into nmeaStore**
  - [ ] 6.5.1: Call AlarmEvaluator on sensor data updates
  - [ ] 6.5.2: Update alarm state in sensor
  - [ ] 6.5.3: Emit alarm events when state changes
  - [ ] 6.5.4: Test with live NMEA data

### Testing Checklist
- [ ] ✅ Hysteresis field appears in UI
- [ ] ✅ Hysteresis value saves correctly
- [ ] ✅ Alarm triggers at critical threshold
- [ ] ✅ Alarm does NOT clear immediately (hysteresis)
- [ ] ✅ Alarm clears after value exceeds threshold + hysteresis
- [ ] ✅ Test with both 'above' and 'below' directions
- [ ] ✅ Test with depth sensor (below)
- [ ] ✅ Test with temperature sensor (above)
- [ ] ✅ No alarm flickering at threshold boundary

**Specific Test Scenarios:**
```typescript
// Test case: Depth sensor with hysteresis
// Critical: 2.5m, Hysteresis: 0.2m, Direction: below

// Scenario 1: Normal → Critical
depth = 3.0m  // Normal
depth = 2.4m  // Triggers CRITICAL (below 2.5m)

// Scenario 2: Critical → Normal (with hysteresis)
depth = 2.6m  // Still CRITICAL (not above 2.5 + 0.2 = 2.7m)
depth = 2.7m  // Still CRITICAL (exactly at boundary)
depth = 2.8m  // Clears to NORMAL (now above 2.7m)

// Scenario 3: No flickering
depth = 2.48m  // CRITICAL
depth = 2.52m  // Still CRITICAL (hysteresis prevents clear)
depth = 2.48m  // Still CRITICAL
depth = 2.52m  // Still CRITICAL (no re-trigger)
depth = 2.8m   // NORMAL (cleared)
```

### Acceptance Criteria
- ✅ Hysteresis field functional
- ✅ AlarmEvaluator implemented and tested
- ✅ Alarm state tracked correctly
- ✅ Integration with nmeaStore works
- ✅ No alarm flickering observed
- ✅ All edge case tests pass

### Rollback
```bash
git revert <commit-hash>
```

---

## **PHASE 7: Widget Integration** (1-2 days)

**Goal:** Widgets use configured sensor names

### Tasks

- [ ] **7.1: Update Widget Display Names**
  - [ ] 7.1.1: Import `getSensorDisplayName()` in widgets
  - [ ] 7.1.2: Replace hardcoded names with function call
  - [ ] 7.1.3: Add memoization to prevent re-renders
  - [ ] 7.1.4: Test widget performance (< 16ms render)
  
- [ ] **7.2: Update Widgets** (for each widget type)
  - [ ] 7.2.1: BatteryWidget
  - [ ] 7.2.2: TankWidget
  - [ ] 7.2.3: EngineWidget
  - [ ] 7.2.4: TemperatureWidget
  - [ ] 7.2.5: DepthWidget
  - [ ] 7.2.6: WindWidget
  - [ ] 7.2.7: Any other sensor-based widgets
  
- [ ] **7.3: Add Fallback Behavior**
  - [ ] 7.3.1: Handle missing configuration gracefully
  - [ ] 7.3.2: Handle undefined sensor data
  - [ ] 7.3.3: Handle null display names
  - [ ] 7.3.4: Ensure widgets still work without configuration
  
- [ ] **7.4: Test Configuration Propagation**
  - [ ] 7.4.1: Configure sensor in dialog
  - [ ] 7.4.2: Verify widget updates immediately
  - [ ] 7.4.3: Verify widget name persists after restart
  - [ ] 7.4.4: Test with multiple instances of same type

### Testing Checklist
- [ ] ✅ Battery widget shows configured name
- [ ] ✅ Tank widget shows configured name
- [ ] ✅ Engine widget shows configured name
- [ ] ✅ Temperature widget shows configured name
- [ ] ✅ Unconfigured sensors show fallback name
- [ ] ✅ Widget updates when configuration changes
- [ ] ✅ Widget name persists after app restart
- [ ] ✅ Multiple instances display correctly
- [ ] ✅ No performance regression (< 16ms render)
- [ ] ✅ No infinite re-render loops

### Acceptance Criteria
- ✅ All widgets use `getSensorDisplayName()`
- ✅ Configuration changes propagate to widgets
- ✅ Fallback behavior works correctly
- ✅ Performance maintained
- ✅ No visual glitches

### Rollback
```bash
git revert <commit-hash>
```

---

## **PHASE 8: Persistent Storage & Sync** (2-3 days)

**Goal:** Implement primary-cache storage pattern

### Tasks

- [ ] **8.1: Create sensorConfigStore**
  - [ ] 8.1.1: Create new Zustand store file
  - [ ] 8.1.2: Add persist middleware
  - [ ] 8.1.3: Implement `saveConfig()` method
  - [ ] 8.1.4: Implement `getConfig()` method
  - [ ] 8.1.5: Implement `restoreToNmea()` method
  - [ ] 8.1.6: Add Map serialization/deserialization
  - [ ] 8.1.7: Configure storage backend (AsyncStorage/LocalStorage)
  
- [ ] **8.2: Implement Primary-Cache Pattern**
  - [ ] 8.2.1: sensorConfigStore = PRIMARY (source of truth)
  - [ ] 8.2.2: nmeaStore.sensors[].alarmThresholds = CACHE (fast access)
  - [ ] 8.2.3: Write-through: update primary → sync cache
  - [ ] 8.2.4: On sensor connect: restore from primary
  - [ ] 8.2.5: Add sync verification function
  
- [ ] **8.3: Update SensorConfigDialog**
  - [ ] 8.3.1: On close: save to sensorConfigStore
  - [ ] 8.3.2: Then sync to nmeaStore cache
  - [ ] 8.3.3: Add transaction wrapper
  - [ ] 8.3.4: Handle save failures gracefully
  
- [ ] **8.4: Add Restore Functionality**
  - [ ] 8.4.1: Add "Restore" button (shows if unsaved changes)
  - [ ] 8.4.2: Revert local state to saved state
  - [ ] 8.4.3: Add confirmation dialog
  
- [ ] **8.5: Test Persistence**
  - [ ] 8.5.1: Configure sensor
  - [ ] 8.5.2: Close app completely
  - [ ] 8.5.3: Reopen app
  - [ ] 8.5.4: Verify configuration restored
  - [ ] 8.5.5: Test on all platforms (iOS/Android/Web)

### Testing Checklist
- [ ] ✅ Configuration saves to sensorConfigStore
- [ ] ✅ Configuration syncs to nmeaStore cache
- [ ] ✅ Configuration persists after app restart
- [ ] ✅ Sensor disconnect/reconnect preserves config
- [ ] ✅ "Restore" button works correctly
- [ ] ✅ Concurrent writes handled safely
- [ ] ✅ Storage quota errors handled
- [ ] ✅ Corrupted data handled gracefully
- [ ] ✅ Works on iOS
- [ ] ✅ Works on Android
- [ ] ✅ Works on Web

### Acceptance Criteria
- ✅ sensorConfigStore implemented
- ✅ Primary-cache pattern working
- ✅ Configuration persists reliably
- ✅ Restore functionality works
- ✅ All platform tests pass
- ✅ Error handling robust

### Rollback
```bash
git revert <commit-hash>
# Restore old alarmConfigStore if needed
```

---

## **PHASE 9: Migration & Cleanup** (2-3 days)

**Goal:** Migrate old data, remove legacy code

### Tasks

- [ ] **9.1: Create Migration Script**
  - [ ] 9.1.1: Create `migrateAlarmConfig()` function
  - [ ] 9.1.2: Read old alarmConfigStore data
  - [ ] 9.1.3: Transform to new format
  - [ ] 9.1.4: Write to new sensorConfigStore
  - [ ] 9.1.5: Verify migration successful
  - [ ] 9.1.6: Keep old data as backup
  
- [ ] **9.2: Run Migration on App Start**
  - [ ] 9.2.1: Check if migration needed (flag in storage)
  - [ ] 9.2.2: Run migration once
  - [ ] 9.2.3: Set migration complete flag
  - [ ] 9.2.4: Log migration results
  - [ ] 9.2.5: Handle migration errors
  
- [ ] **9.3: Remove Legacy Code**
  - [ ] 9.3.1: Remove old alarmStore.ts (if not used elsewhere)
  - [ ] 9.3.2: Remove old alarm evaluation logic
  - [ ] 9.3.3: Remove deprecated fields from types
  - [ ] 9.3.4: Remove unused imports
  - [ ] 9.3.5: Remove old test files
  
- [ ] **9.4: Update Documentation**
  - [ ] 9.4.1: Update README with new sensor config flow
  - [ ] 9.4.2: Update JSDoc comments
  - [ ] 9.4.3: Update type definitions
  - [ ] 9.4.4: Create migration guide (if needed)
  
- [ ] **9.5: Final Cleanup**
  - [ ] 9.5.1: Run linter
  - [ ] 9.5.2: Run formatter
  - [ ] 9.5.3: Remove console.logs
  - [ ] 9.5.4: Remove commented-out code
  - [ ] 9.5.5: Verify no TypeScript errors

### Testing Checklist
- [ ] ✅ Migration runs successfully
- [ ] ✅ Old configurations preserved
- [ ] ✅ New format works correctly
- [ ] ✅ No data loss
- [ ] ✅ Migration only runs once
- [ ] ✅ All legacy code removed
- [ ] ✅ All tests pass
- [ ] ✅ No compiler errors
- [ ] ✅ No linter warnings

### Acceptance Criteria
- ✅ Migration complete and tested
- ✅ Legacy code removed
- ✅ Documentation updated
- ✅ Clean codebase
- ✅ All tests passing

### Rollback
```bash
# If migration fails, restore old alarmConfigStore
git revert <commit-hash>
# Manually restore backup if needed
```

---

## **PHASE 10: Final Testing & Polish** (1-2 days)

**Goal:** Comprehensive testing and bug fixes

### Tasks

- [ ] **10.1: Comprehensive Manual Testing**
  - [ ] 10.1.1: Test complete workflow on iOS device
  - [ ] 10.1.2: Test complete workflow on Android device
  - [ ] 10.1.3: Test complete workflow on Web browser
  - [ ] 10.1.4: Test with live NMEA simulator
  - [ ] 10.1.5: Test with multiple sensor instances
  
- [ ] **10.2: Edge Case Testing**
  - [ ] 10.2.1: Test all scenarios from edge case list
  - [ ] 10.2.2: Test storage quota exceeded
  - [ ] 10.2.3: Test corrupted data recovery
  - [ ] 10.2.4: Test concurrent modifications
  - [ ] 10.2.5: Test sensor disconnect during config
  
- [ ] **10.3: Performance Testing**
  - [ ] 10.3.1: Profile widget render times
  - [ ] 10.3.2: Profile config dialog open time
  - [ ] 10.3.3: Profile save operation time
  - [ ] 10.3.4: Check for memory leaks
  - [ ] 10.3.5: Optimize if needed
  
- [ ] **10.4: Accessibility Testing**
  - [ ] 10.4.1: Test with VoiceOver (iOS)
  - [ ] 10.4.2: Test with TalkBack (Android)
  - [ ] 10.4.3: Test keyboard navigation (Web)
  - [ ] 10.4.4: Check color contrast
  - [ ] 10.4.5: Verify touch targets (> 44pt)
  
- [ ] **10.5: Bug Fixes**
  - [ ] 10.5.1: Fix any bugs found during testing
  - [ ] 10.5.2: Verify fixes don't break other features
  - [ ] 10.5.3: Re-test after fixes
  
- [ ] **10.6: Polish UI**
  - [ ] 10.6.1: Improve error messages
  - [ ] 10.6.2: Add loading indicators
  - [ ] 10.6.3: Improve validation feedback
  - [ ] 10.6.4: Add success confirmations
  - [ ] 10.6.5: Smooth animations

### Final Testing Checklist

**iOS:**
- [ ] ✅ Dialog opens correctly
- [ ] ✅ Pickers work correctly
- [ ] ✅ Keyboard behavior correct
- [ ] ✅ Save/restore works
- [ ] ✅ No crashes
- [ ] ✅ VoiceOver accessible

**Android:**
- [ ] ✅ Dialog opens correctly
- [ ] ✅ Pickers work correctly
- [ ] ✅ Keyboard behavior correct
- [ ] ✅ Save/restore works
- [ ] ✅ No crashes
- [ ] ✅ TalkBack accessible

**Web:**
- [ ] ✅ Dialog opens correctly
- [ ] ✅ Pickers work correctly (Chrome)
- [ ] ✅ Pickers work correctly (Safari)
- [ ] ✅ Pickers work correctly (Firefox)
- [ ] ✅ Keyboard navigation works
- [ ] ✅ No console errors
- [ ] ✅ LocalStorage works

**Integration:**
- [ ] ✅ Widget names update
- [ ] ✅ Alarms trigger correctly
- [ ] ✅ Hysteresis works
- [ ] ✅ Context-aware defaults work
- [ ] ✅ Migration successful
- [ ] ✅ Performance acceptable

### Acceptance Criteria
- ✅ All platforms tested
- ✅ All edge cases handled
- ✅ Performance meets budget
- ✅ Accessibility verified
- ✅ All bugs fixed
- ✅ UI polished
- ✅ Ready for release

### Rollback
- Full project rollback available if needed

---

## 📊 Success Metrics

### Functional Metrics
- [ ] ✅ 100% of existing alarm functionality preserved
- [ ] ✅ Sensor naming works for all sensor types
- [ ] ✅ Context-aware defaults correct for all types
- [ ] ✅ Hysteresis prevents alarm flickering in 100% of tests
- [ ] ✅ Configuration persists across app restarts (100% success rate)
- [ ] ✅ Zero data loss during migration

### Performance Metrics
- [ ] ✅ Widget render time: < 16ms (60fps maintained)
- [ ] ✅ Config dialog open time: < 200ms
- [ ] ✅ Save operation: < 100ms
- [ ] ✅ Display name lookup: < 0.5ms
- [ ] ✅ No memory leaks detected

### Quality Metrics
- [ ] ✅ Zero TypeScript errors
- [ ] ✅ Zero linter warnings
- [ ] ✅ Test coverage > 80% for new code
- [ ] ✅ All edge cases tested
- [ ] ✅ Accessibility score > 90%

### User Experience Metrics
- [ ] ✅ Configuration workflow: < 1 minute for typical user
- [ ] ✅ Clear error messages for all failure modes
- [ ] ✅ Intuitive UI (tested with 2+ users)
- [ ] ✅ No confusing terminology
- [ ] ✅ Help text where needed

---

## 🚨 Known Limitations

### Technical Limitations
1. **No automatic sensor matching** - If instance numbers change, user must reconfigure
2. **Single device only** - Configuration doesn't sync across devices (future feature)
3. **No undo/redo** - Once saved, must manually revert (Restore button helps)
4. **Platform storage limits** - Very large configurations may hit quota

### Design Limitations
1. **Manual configuration required** - Cannot auto-name sensors (NMEA doesn't provide enough context)
2. **Context limited to battery/engine** - Other sensor types have fewer context options
3. **No bulk operations** - Must configure sensors individually
4. **No templates** - Each sensor configured from scratch (intentional simplification)

### Future Enhancements (Out of Scope)
- [ ] Export/import vessel configuration
- [ ] Cloud sync across devices
- [ ] Sensor templates/profiles
- [ ] Bulk sensor configuration
- [ ] Advanced calibration curves
- [ ] Historical alarm tracking
- [ ] Alarm acknowledgment system

---

## 📚 Reference Documentation

### Key Files
- **Component:** `/boatingInstrumentsApp/src/components/dialogs/SensorConfigDialog.tsx`
- **Store:** `/boatingInstrumentsApp/src/store/sensorConfigStore.ts`
- **Types:** `/boatingInstrumentsApp/src/types/SensorData.ts`
- **Defaults:** `/boatingInstrumentsApp/src/registry/AlarmThresholdDefaults.ts`
- **Evaluator:** `/boatingInstrumentsApp/src/services/alarms/AlarmEvaluator.ts`
- **Utils:** `/boatingInstrumentsApp/src/utils/sensorDisplayName.ts`

### Related Documentation
- [Current Alarm System Assessment](./ALARM-SYSTEM-ASSESSMENT-AND-REFACTORING-PLAN.md)
- [Sensor Data Types](../boatingInstrumentsApp/src/types/SensorData.ts)
- [NMEA Store Architecture](../boatingInstrumentsApp/src/store/nmeaStore.ts)

---

## ✅ Pre-Implementation Checklist

Before starting Phase 1, ensure:

- [ ] ✅ This plan has been reviewed and approved
- [ ] ✅ All concerns have been addressed
- [ ] ✅ Development environment is set up
- [ ] ✅ Test infrastructure is working
- [ ] ✅ Backup system is in place
- [ ] ✅ Current state is documented
- [ ] ✅ Team is aligned on approach
- [ ] ✅ Timeline is reasonable (12-18 days)
- [ ] ✅ Resources are available
- [ ] ✅ Rollback plan is understood

---

## 🎯 Final Approval

**Reviewer:** _____________________  
**Date:** _____________________  
**Approved:** [ ] Yes  [ ] No  [ ] Changes Requested

**Changes Requested:**
```
(List any concerns or modifications needed)
```

**Sign-off:** This plan is comprehensive, addresses all risks, and is ready for implementation.

---

**End of Planning Document**

*This is a living document. Update as implementation progresses or new issues are discovered.*
