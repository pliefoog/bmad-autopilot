# Sensor Configuration Testing Guide

## Phase 9: Final Testing & Polish

This guide provides comprehensive test scenarios for the sensor configuration system implementation (Phases 1-8).

## Test Environment Setup

1. **Start the NMEA simulator:**
   ```bash
   Ctrl+Shift+P → Tasks: Run Task → Start NMEA Bridge: Single Engine Scenario (Default)
   ```

2. **Start the web development server:**
   ```bash
   Ctrl+Shift+P → Tasks: Run Task → Start Web Dev Server
   ```

3. **Clear existing storage (optional for clean testing):**
   - Open Browser DevTools → Application → Local Storage → Clear
   - Restart the app to trigger fresh initialization

## Test Scenarios

### 1. Sensor Custom Naming (Phase 2)

**Test:** Custom sensor names persist and display correctly

1. Open any widget (Battery, Engine, Temperature)
2. Long-press the widget header to open Sensor Configuration dialog
3. Enter a custom name in the "Sensor Name" field (e.g., "House Battery", "Port Engine", "Engine Room")
4. Click "Save"
5. **Expected:** Widget header shows custom name immediately
6. Refresh the browser
7. **Expected:** Custom name persists after reload

### 2. Context-Aware Fields (Phase 3)

**Test:** Battery chemistry and engine type pickers work correctly

**Battery Context:**
1. Open Battery widget → Sensor Configuration
2. Select "Battery Chemistry" dropdown
3. **Expected:** Three options: Lead-Acid/AGM, LiFePO4, Not Set
4. Select "LiFePO4"
5. Click "Load Defaults"
6. **Expected:** Critical threshold = 12.8V, Warning = 13.0V (LiFePO4-specific)

**Engine Context:**
1. Open Engine widget → Sensor Configuration
2. Select "Engine Type" dropdown
3. **Expected:** Three options: Diesel, Gasoline, Outboard
4. Select "Outboard"
5. Click "Load Defaults"
6. **Expected:** RPM Critical = 5800, Warning = 5500 (Outboard-specific)

### 3. Critical/Warning Threshold UI (Phase 4)

**Test:** Separate alarm levels with independent sound patterns

1. Open any sensor configuration dialog
2. **Expected UI Structure:**
   - "Enable Alarms" toggle at top
   - "Alarm Direction" picker (Above Threshold / Below Threshold)
   - "Critical Alarm" section with:
     - Threshold value input
     - Sound pattern picker
     - Hysteresis value input
   - "Warning Alarm" section with:
     - Threshold value input
     - Sound pattern picker
     - Hysteresis value input
3. Set Critical value = 14.0V, Warning = 13.5V
4. Set Critical sound = "Rapid Pulse", Warning sound = "Warble"
5. Save and verify values persist

### 4. Smart Defaults (Phase 5)

**Test:** Context-aware defaults based on battery chemistry and engine type

**Battery Chemistry Variants:**
1. Battery widget → Configuration
2. Set Chemistry = "Lead-Acid/AGM" → Load Defaults
   - **Expected:** Critical = 11.8V, Warning = 12.2V
3. Set Chemistry = "LiFePO4" → Load Defaults
   - **Expected:** Critical = 12.8V, Warning = 13.0V
4. Compare hysteresis values
   - **Expected:** Battery hysteresis = 0.2V for both chemistries

**Engine Type Variants:**
1. Engine widget → Configuration
2. Set Type = "Diesel" → Load Defaults
   - **Expected:** RPM Critical = 2800, Warning = 2500
   - **Expected:** Oil Pressure Critical = 138 kPa
3. Set Type = "Gasoline" → Load Defaults
   - **Expected:** RPM Critical = 3600, Warning = 3300
   - **Expected:** Oil Pressure Critical = 103 kPa
4. Set Type = "Outboard" → Load Defaults
   - **Expected:** RPM Critical = 5800, Warning = 5500
   - **Expected:** Oil Pressure Critical = 103 kPa

### 5. Hysteresis Implementation (Phase 6)

**Test:** Hysteresis prevents alarm flickering

1. Battery widget → Configuration
2. Load defaults (should set hysteresis = 0.2V)
3. Set Critical threshold = 12.0V, Hysteresis = 0.2V
4. **Expected Alarm Behavior:**
   - Alarm triggers when voltage drops to 12.0V
   - Alarm clears when voltage rises to 12.2V (12.0 + 0.2)
   - No flickering if voltage oscillates between 12.0-12.2V

**Manual Testing (with live data):**
1. Monitor battery voltage near threshold
2. Observe alarm state transitions
3. **Expected:** No rapid on/off switching (hysteresis buffer working)

### 6. Widget Integration (Phase 7)

**Test:** Custom names display in all widgets

**Test Coverage:**
- Battery Widget: "House Battery" → displays in header
- Engine Widget: "Port Engine" → displays in header
- Temperature Widget: "Engine Room" → displays in header

**Fallback Behavior:**
1. Create new sensor with no custom name
2. **Expected:** Widget displays "Battery 0", "Engine 1", etc.

### 7. Persistent Storage (Phase 8)

**Test:** Configurations persist across app restarts

**Full Persistence Test:**
1. Configure Battery 0:
   - Name: "House Battery"
   - Chemistry: "LiFePO4"
   - Critical: 12.8V
   - Warning: 13.0V
   - Critical Sound: "Rapid Pulse"
   - Warning Sound: "Warble"
   - Critical Hysteresis: 0.2V
   - Warning Hysteresis: 0.1V
2. Save configuration
3. **Hard refresh browser** (Cmd+Shift+R / Ctrl+Shift+R)
4. **Expected:** All values restored exactly as configured
5. Open configuration dialog
6. **Expected:** All fields display saved values

**Multiple Sensors:**
1. Configure Battery 0, Engine 0, Temperature 0 with unique names
2. Refresh browser
3. **Expected:** All three configurations persist independently

**Store Synchronization:**
1. Check browser console for: `[App] ✅ Synced sensor configurations from persistent storage`
2. **Expected:** Message appears on app startup
3. **Expected:** No errors in console during sync

### 8. Backward Compatibility

**Test:** Legacy alarm configurations still work

1. Open `localStorage` in DevTools
2. Manually create legacy threshold entry:
   ```json
   {
     "min": 11.8,
     "max": null,
     "thresholdType": "minimum",
     "soundPattern": "warble"
   }
   ```
3. Refresh app
4. Open configuration dialog
5. **Expected:** Values correctly migrated to new format:
   - Direction = "Below Threshold"
   - Critical value = 11.8
   - Critical sound = "warble"

### 9. Edge Cases

**Empty Values:**
1. Clear all threshold values (leave inputs empty)
2. Save configuration
3. **Expected:** No errors, alarms disabled

**Invalid Inputs:**
1. Enter non-numeric characters in threshold fields
2. Attempt to save
3. **Expected:** Validation prevents invalid save (or handles gracefully)

**Extreme Values:**
1. Enter very large numbers (e.g., 999999)
2. Save and verify storage
3. **Expected:** Values stored without overflow

**Multi-Instance Sensors:**
1. Configure Battery 0, Battery 1, Battery 2 with different names
2. Switch between instances using tabs
3. **Expected:** Each instance shows correct configuration

**Unit Conversion:**
1. Change display units (Settings → Units)
2. Open sensor configuration
3. **Expected:** Thresholds display in new units
4. Save configuration
5. **Expected:** Values stored in SI units, displayed in selected units

### 10. Performance Testing

**Memory Leaks:**
1. Open/close configuration dialog 20 times rapidly
2. Check browser memory profiler
3. **Expected:** No memory growth pattern

**Re-render Performance:**
1. Open configuration dialog
2. Type rapidly in threshold fields
3. **Expected:** No lag, smooth input

**Large Configuration Sets:**
1. Configure 10+ sensors with unique names and thresholds
2. Measure app startup time
3. **Expected:** Sync completes in <500ms

## Verification Checklist

### Phase 1: Rename & Restructure
- [ ] Menu shows "Sensor Configuration" (not "Alarm Configuration")
- [ ] File renamed to `SensorConfigDialog.tsx`
- [ ] All imports updated correctly
- [ ] No TypeScript errors

### Phase 2: Sensor Name Field
- [ ] Name input field present at top of dialog
- [ ] Custom names save and persist
- [ ] Widget headers display custom names
- [ ] Fallback to "Type Instance" when name empty

### Phase 3: Context Fields
- [ ] Battery chemistry picker works (3 options)
- [ ] Engine type picker works (3 options)
- [ ] Context saved with configuration
- [ ] Context persists across restarts

### Phase 4: Threshold UI Redesign
- [ ] Critical alarm section present
- [ ] Warning alarm section present
- [ ] Each section has independent sound picker
- [ ] Alarm direction picker works
- [ ] No obsolete UI elements (removed Audio Alerts toggle)

### Phase 5: Context-Aware Defaults
- [ ] Load Defaults button works
- [ ] Battery chemistry affects default voltages
- [ ] Engine type affects default RPM/pressure
- [ ] Smart defaults documented in code

### Phase 6: Hysteresis Implementation
- [ ] Hysteresis fields present (Critical & Warning)
- [ ] Default hysteresis values loaded
- [ ] Hysteresis persists with configuration
- [ ] Alarm flickering prevented (manual observation)

### Phase 7: Widget Integration
- [ ] BatteryWidget displays custom names
- [ ] EngineWidget displays custom names
- [ ] TemperatureWidget displays custom names
- [ ] All widgets use `getSensorDisplayName()` utility

### Phase 8: Persistent Storage
- [ ] sensorConfigStore created with persist middleware
- [ ] AsyncStorage backend configured
- [ ] Configurations persist across refreshes
- [ ] App startup sync works (check console logs)
- [ ] Multiple sensor configs saved independently
- [ ] No circular dependency errors

## Known Issues & Future Enhancements

### Current Limitations
- Tank and Temperature location-specific defaults not yet implemented (future phase)
- No bulk export/import of configurations
- No configuration backup/restore UI

### Future Enhancements
- Visual alarm threshold preview on widget charts
- Import/export configuration sets
- Alarm threshold recommendations based on historical data
- Context-aware suggestions (e.g., "LiFePO4 detected, adjust thresholds?")

## Troubleshooting

### Configurations not persisting
1. Check browser console for AsyncStorage errors
2. Verify `localStorage` is enabled in browser
3. Check for quota exceeded errors (clear old data)

### Smart defaults not loading
1. Verify context (battery chemistry/engine type) is set
2. Check `AlarmThresholdDefaults.ts` for sensor type support
3. Console logs show which defaults are loaded

### Widget names not updating
1. Verify `getSensorDisplayName()` import in widget
2. Check sensor data selector in widget component
3. Refresh widget by closing and reopening

### Sync errors on startup
1. Check console for `[App] ✅ Synced sensor configurations`
2. Verify sensorConfigStore hydration logs
3. Check for corrupted localStorage data

## Testing Report Template

```markdown
## Sensor Configuration Testing - [Date]

### Environment
- Platform: [iOS/Android/Web]
- Browser: [Chrome/Safari/Firefox] (if web)
- App Version: [version]
- Simulator Scenario: [scenario name]

### Test Results

#### Phase 1-8 Implementation
- [ ] All phases complete
- [ ] No TypeScript errors
- [ ] No console errors

#### Functionality Tests
- [ ] Sensor naming works
- [ ] Context fields work
- [ ] Smart defaults work
- [ ] Hysteresis works
- [ ] Persistence works
- [ ] Widget integration works

#### Edge Cases
- [ ] Empty values handled
- [ ] Invalid inputs handled
- [ ] Multi-instance sensors work
- [ ] Unit conversion works

#### Performance
- [ ] No memory leaks
- [ ] Smooth UI interaction
- [ ] Fast app startup

### Issues Found
[List any bugs or unexpected behavior]

### Recommendations
[Suggestions for improvements]
```

## Success Criteria

Phase 9 is complete when:
1. ✅ All 8 previous phases verified working
2. ✅ No TypeScript errors in any modified files
3. ✅ Configurations persist across app restarts
4. ✅ Custom names display in all widgets
5. ✅ Smart defaults work for all sensor types
6. ✅ Hysteresis prevents alarm flickering
7. ✅ No memory leaks or performance issues
8. ✅ Edge cases handled gracefully
9. ✅ Testing report completed with no critical issues

---

**Ready for Production:** When all test scenarios pass and success criteria met.
