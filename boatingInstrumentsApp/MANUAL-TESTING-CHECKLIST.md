# Manual Testing Checklist - Config Dialog Refactoring

**Testing Date:** _____________  
**Tester:** _____________  
**Platform:** Web / iOS / Android (circle one)  
**Build:** _____________

---

## ⚠️ Pre-Testing Setup

**Required:**
1. ✅ NMEA Bridge Simulator running (any scenario with multiple sensors)
2. ✅ Web dev server running (`npm run web`)
3. ✅ Browser DevTools open (Console + Network tabs)
4. ✅ Clear AsyncStorage before starting: `localStorage.clear()` in console

**Test Data Scenarios:**
- Use "Start NMEA Bridge: Coastal Sailing" for comprehensive sensor data
- Ensure multiple battery/engine instances if testing multi-instance behavior

---

## 1️⃣ SensorConfigDialog - Critical Path Tests

### 1.1 Basic Open/Close
**Priority:** 🔴 CRITICAL

- [ ] Open dialog from Settings screen
- [ ] Dialog displays without errors
- [ ] Close dialog with X button
- [ ] Close dialog with backdrop tap/click
- [ ] No console errors during open/close

**Pass Criteria:** Clean open/close with no crashes or console errors

---

### 1.2 Single-Metric Sensor Configuration (Depth)
**Priority:** 🔴 CRITICAL

**Setup:** Select Depth sensor

- [ ] Depth sensor displays current value
- [ ] Enable alarm toggle works
- [ ] Warning threshold editor appears
- [ ] Critical threshold editor appears
- [ ] Increment/decrement buttons work
- [ ] Long-press accelerates value changes (1x → 2x → 4x → 10x)
- [ ] Warning < Critical validation enforced (shake animation on violation)
- [ ] Sound pattern dropdowns work
- [ ] Custom name input works
- [ ] Close dialog (should auto-save)

**Verification:**
- [ ] Reopen dialog - all values persisted
- [ ] Check AsyncStorage keys exist: `sensor_config_depth_0`
- [ ] No console warnings about debouncing or validation

**Pass Criteria:** Values persist, validation works, no errors

---

### 1.3 Multi-Metric Sensor Configuration (Battery)
**Priority:** 🔴 CRITICAL

**Setup:** Select Battery sensor (ensure Battery 1 exists in NMEA data)

- [ ] Battery Chemistry dropdown displays (if not hardware-provided)
- [ ] Metric selector shows: Voltage, State of Charge, Temperature, Current
- [ ] Select "Voltage" metric
- [ ] Enable alarm for Voltage
- [ ] Set Warning: 12.0V, Critical: 11.5V
- [ ] Direction should be "below" (alarms when too low)
- [ ] Switch to "Temperature" metric
- [ ] Enable alarm for Temperature
- [ ] Set Warning: 45°C, Critical: 50°C
- [ ] Direction should be "above" (alarms when too high)
- [ ] Switch back to "Voltage" - previous values retained
- [ ] Close dialog

**Verification:**
- [ ] Reopen dialog
- [ ] Voltage: 12.0V / 11.5V still set
- [ ] Temperature: 45°C / 50°C still set
- [ ] Both alarms still enabled
- [ ] Check AsyncStorage: `sensor_config_battery_0`

**Pass Criteria:** Multi-metric persistence works, direction logic correct

---

### 1.4 Multi-Instance Sensor Switching (Batteries)
**Priority:** 🟡 HIGH

**Setup:** Ensure Battery 1 and Battery 2 exist in NMEA data

- [ ] Open dialog, select Battery sensor
- [ ] Configure Battery 1: Name="House Bank", Warning=12.0V
- [ ] Switch to Battery 2 tab
- [ ] Configure Battery 2: Name="Starter", Warning=12.5V
- [ ] Switch back to Battery 1 - values retained
- [ ] Close dialog
- [ ] Reopen dialog
- [ ] Battery 1: "House Bank" / 12.0V persisted
- [ ] Battery 2: "Starter" / 12.5V persisted

**Pass Criteria:** Instance switching preserves data, no cross-contamination

---

### 1.5 Sensor Type Switching
**Priority:** 🟡 HIGH

- [ ] Configure Depth sensor with custom values
- [ ] Switch to Wind sensor using type selector
- [ ] Configure Wind sensor
- [ ] Switch back to Depth sensor
- [ ] Depth values still present (saved before switch)
- [ ] No console errors during type switching

**Pass Criteria:** Type switching triggers save, no data loss

---

### 1.6 Validation & Error Handling
**Priority:** 🔴 CRITICAL

**Test Invalid Values:**
- [ ] Try to set Warning > Critical (for "above" direction)
  - Expected: Shake animation, value rejected
- [ ] Try to set Warning < Critical (for "below" direction)  
  - Expected: Shake animation, value rejected
- [ ] Try to exceed max boundary (e.g., 999°C for temperature)
  - Expected: Capped at max value
- [ ] Try to go below min boundary (e.g., -50°C)
  - Expected: Capped at min value

**Pass Criteria:** Validation prevents invalid configurations, clear feedback

---

### 1.7 Keyboard Input (Desktop Only)
**Priority:** 🟢 MEDIUM

- [ ] Click warning threshold value
- [ ] Press ↑ arrow key - value increments
- [ ] Press ↓ arrow key - value decrements
- [ ] Press PageUp - value increments by 10x step
- [ ] Press PageDown - value decrements by 10x step
- [ ] Tab key navigates between fields

**Pass Criteria:** Keyboard navigation works smoothly

---

### 1.8 Unit Conversion (Display ↔ SI)
**Priority:** 🔴 CRITICAL

**Setup:** Change units to Imperial in UnitsConfigDialog first

- [ ] Open SensorConfigDialog for Temperature
- [ ] Set threshold: 113°F (should be 45°C in SI)
- [ ] Close dialog
- [ ] Check AsyncStorage value: Should be stored as 45°C (318.15K in SI)
- [ ] Change units back to Metric
- [ ] Reopen dialog - should show 45°C
- [ ] Change to Imperial again - should show 113°F

**Pass Criteria:** Thresholds stored in SI, displayed in user units

---

### 1.9 Critical Sensor Disable Confirmation
**Priority:** 🔴 CRITICAL

**Test Depth Sensor:**
- [ ] Enable Depth alarm
- [ ] Try to disable alarm
- [ ] Confirmation dialog appears with warning message
- [ ] Click Cancel - alarm stays enabled
- [ ] Try again, click OK - alarm disables

**Test Battery Sensor:**
- [ ] Enable Battery alarm
- [ ] Try to disable alarm
- [ ] Confirmation dialog appears
- [ ] Confirm disable

**Pass Criteria:** Critical sensors show confirmation, non-critical don't

---

### 1.10 Performance & Debouncing
**Priority:** 🟡 HIGH

- [ ] Open dialog
- [ ] Rapidly change threshold values (click increment 20 times fast)
- [ ] Watch console - should see debounced saves (not 20 saves)
- [ ] Wait 300ms after last change
- [ ] Verify save happened (check AsyncStorage or console log)
- [ ] No UI freezing during rapid changes

**Pass Criteria:** Smooth performance, saves debounced to ~300ms

---

## 2️⃣ ConnectionConfigDialog - Critical Path Tests

### 2.1 Basic Open/Close
**Priority:** 🔴 CRITICAL

- [ ] Open dialog from Settings
- [ ] Current connection settings pre-filled (if connected)
- [ ] Close with Cancel button
- [ ] Close with backdrop tap
- [ ] No console errors

**Pass Criteria:** Clean open/close

---

### 2.2 IP Address Validation
**Priority:** 🔴 CRITICAL

**Test Valid IPs:**
- [ ] Enter `192.168.1.100` - no error
- [ ] Enter `10.0.0.1` - no error
- [ ] Enter `bridge.local` (DNS name) - no error
- [ ] Enter `localhost` - no error

**Test Invalid IPs:**
- [ ] Enter `999.999.999.999` - error shown
- [ ] Enter `192.168.1` - error shown (incomplete)
- [ ] Enter `abc.def.ghi.jkl` - error shown (invalid format)
- [ ] Error message displays in red below field

**Pass Criteria:** Validation catches invalid IPs, allows DNS names

---

### 2.3 Port Validation
**Priority:** 🔴 CRITICAL

**Test Valid Ports:**
- [ ] Enter `8080` - no error
- [ ] Enter `1` - no error (min boundary)
- [ ] Enter `65535` - no error (max boundary)

**Test Invalid Ports:**
- [ ] Enter `0` - error shown (below min)
- [ ] Enter `70000` - error shown (above max)
- [ ] Enter `abc` - error shown (non-numeric)
- [ ] Enter `8080.5` - error shown (decimal not allowed)

**Pass Criteria:** Port validation enforces 1-65535 integer range

---

### 2.4 Connection State Management
**Priority:** 🟡 HIGH

**Setup:** Ensure not currently connected

- [ ] Enter valid IP: `192.168.1.100`
- [ ] Enter valid Port: `8080`
- [ ] Protocol: WebSocket (web platform)
- [ ] Connect button enabled
- [ ] Click Connect
- [ ] Connection attempt made (check Network tab or console)
- [ ] Dialog closes or shows connection status

**If Currently Connected:**
- [ ] Open dialog
- [ ] Current settings displayed
- [ ] Disconnect button visible
- [ ] Click Disconnect
- [ ] Connection drops
- [ ] Dialog updates to disconnected state

**Pass Criteria:** Connection/disconnection works, state updates correctly

---

### 2.5 Form Persistence
**Priority:** 🟡 HIGH

- [ ] Enter IP: `192.168.1.200`
- [ ] Enter Port: `9090`
- [ ] Close dialog without connecting
- [ ] Reopen dialog
- [ ] IP and Port values persisted
- [ ] Check AsyncStorage: `connection_config`

**Pass Criteria:** Form values persist across dialog close/open

---

### 2.6 Protocol Toggle (Native Only)
**Priority:** 🟢 LOW (Web tester can skip)

**iOS/Android Only:**
- [ ] Protocol toggle visible (TCP / UDP / WebSocket)
- [ ] Switch to TCP - saved
- [ ] Close and reopen - TCP still selected
- [ ] Switch to UDP - saved
- [ ] Verify persistence

**Web:**
- [ ] Protocol toggle NOT visible (WebSocket only)

**Pass Criteria:** Protocol toggle works on native, hidden on web

---

### 2.7 Debouncing & Auto-Save
**Priority:** 🟡 HIGH

- [ ] Type IP address: `192.168.1.100` (character by character)
- [ ] Stop typing
- [ ] Wait 300ms
- [ ] Check console or AsyncStorage - should save once, not per keystroke
- [ ] Change port: `8080` (character by character)
- [ ] Wait 300ms
- [ ] Single save should occur

**Pass Criteria:** Changes debounced, not saved per keystroke

---

## 3️⃣ UnitsConfigDialog - Critical Path Tests

### 3.1 Basic Open/Close
**Priority:** 🔴 CRITICAL

- [ ] Open dialog from Settings
- [ ] All 17 category sections visible
- [ ] Preset selector shows current preset
- [ ] Close dialog
- [ ] No console errors

**Pass Criteria:** Dialog renders all sections, no errors

---

### 3.2 Preset Selection
**Priority:** 🔴 CRITICAL

**Test Nautical (EU) Preset:**
- [ ] Select "Nautical (EU)" preset
- [ ] Preview shows: 10°C, 12.5 kts, 1013 hPa
- [ ] Verify sections locked (no individual unit pickers enabled)
- [ ] Close dialog
- [ ] Reopen - Nautical (EU) still selected
- [ ] Check one category (e.g., Temperature) - should show Celsius

**Test Nautical (UK) Preset:**
- [ ] Select "Nautical (UK)" preset
- [ ] Preview updates with different examples
- [ ] Close and reopen - preset persisted

**Test Nautical (US) Preset:**
- [ ] Select "Nautical (US)" preset
- [ ] Preview shows Fahrenheit, knots, etc.
- [ ] Close and reopen - preset persisted

**Pass Criteria:** Presets apply correctly, persist, lock individual selection

---

### 3.3 Custom Unit Selection
**Priority:** 🔴 CRITICAL

- [ ] Select "Nautical (EU)" preset (starting point)
- [ ] Expand "Temperature" section
- [ ] Change from Celsius to Fahrenheit
- [ ] Preset automatically switches to "Custom"
- [ ] Expand "Speed" section
- [ ] Change from Knots to Kilometers/hour
- [ ] Preset remains "Custom"
- [ ] Close dialog
- [ ] Reopen dialog
- [ ] Preset: "Custom"
- [ ] Temperature: Fahrenheit
- [ ] Speed: Kilometers/hour (both persisted)

**Pass Criteria:** Custom mode enables, individual units persist

---

### 3.4 Section Collapse/Expand Persistence
**Priority:** 🟡 HIGH

- [ ] Collapse "Temperature" section
- [ ] Collapse "Pressure" section
- [ ] Expand "Distance" section
- [ ] Close dialog
- [ ] Reopen dialog
- [ ] Temperature: Collapsed ✅
- [ ] Pressure: Collapsed ✅
- [ ] Distance: Expanded ✅
- [ ] Check AsyncStorage keys: `config_dialog_sections_units_config_*`

**Pass Criteria:** Section states persist across dialog sessions

---

### 3.5 All 17 Categories Render
**Priority:** 🟡 HIGH

**Verify all categories present:**
- [ ] Temperature
- [ ] Speed
- [ ] Distance
- [ ] Depth
- [ ] Pressure
- [ ] Angle
- [ ] Voltage
- [ ] Current
- [ ] Power
- [ ] Energy
- [ ] Volume
- [ ] Volume Flow
- [ ] Percentage
- [ ] Coordinates
- [ ] Duration
- [ ] Frequency
- [ ] RPM

**For 3 random categories:**
- [ ] Expand section
- [ ] Unit picker appears
- [ ] Select different unit
- [ ] Switches to Custom preset
- [ ] Unit persisted after close/reopen

**Pass Criteria:** All 17 categories accessible and functional

---

### 3.6 Preset Preview Accuracy
**Priority:** 🟢 MEDIUM

**Test Nautical (EU):**
- [ ] Preview shows Celsius (not Fahrenheit)
- [ ] Preview shows Knots (not MPH)
- [ ] Preview shows hectoPascals (not inHg)

**Test Nautical (US):**
- [ ] Preview shows Fahrenheit
- [ ] Preview shows Knots
- [ ] Preview shows inches Mercury

**Switch units manually:**
- [ ] Change 3 categories to different units
- [ ] Preview updates to show "Custom"

**Pass Criteria:** Preview examples match selected preset/units

---

### 3.7 Performance with 17 Sections
**Priority:** 🟡 HIGH

- [ ] Open dialog
- [ ] Expand all 17 sections rapidly (click all headers fast)
- [ ] UI remains responsive
- [ ] Collapse all 17 sections rapidly
- [ ] No lag or freezing
- [ ] Close dialog - smooth
- [ ] Reopen dialog - loads quickly (even with 17 sections)

**Pass Criteria:** No performance degradation with many sections

---

### 3.8 Debouncing & Auto-Save
**Priority:** 🟡 HIGH

- [ ] Select a preset (triggers change)
- [ ] Quickly change 3 categories (rapid clicks)
- [ ] Wait 300ms
- [ ] Check console/AsyncStorage - should see batched save, not 4 individual saves
- [ ] Close dialog
- [ ] Reopen - all 4 changes persisted

**Pass Criteria:** Changes debounced to single save

---

## 4️⃣ Cross-Dialog Integration Tests

### 4.1 Units + Sensor Thresholds Integration
**Priority:** 🔴 CRITICAL

**Scenario:** Change units, verify sensor thresholds convert

1. **Set up initial state:**
   - [ ] UnitsConfigDialog: Set Temperature to Celsius
   - [ ] SensorConfigDialog: Set Battery Temperature Warning = 45°C
   - [ ] Close both dialogs

2. **Change units:**
   - [ ] UnitsConfigDialog: Change Temperature to Fahrenheit
   - [ ] Close dialog

3. **Verify conversion:**
   - [ ] SensorConfigDialog: Open Battery sensor
   - [ ] Temperature threshold should show 113°F (converted from 45°C)
   - [ ] Value still stored in SI (check AsyncStorage: 318.15K)

4. **Change back:**
   - [ ] UnitsConfigDialog: Change Temperature to Celsius
   - [ ] SensorConfigDialog: Should show 45°C again

**Pass Criteria:** Thresholds display in current units, stored in SI

---

### 4.2 Connection + Sensor Data Flow
**Priority:** 🟡 HIGH

**Scenario:** Connect to bridge, verify sensor data updates dialogs

1. **Initial state:**
   - [ ] ConnectionConfigDialog: Connect to NMEA Bridge
   - [ ] Wait for connection established

2. **Verify sensor data:**
   - [ ] SensorConfigDialog: Open Depth sensor
   - [ ] Current depth value displayed (from NMEA data)
   - [ ] Value updates in real-time (if sensor changes)
   - [ ] Multi-instance sensors show correct instances from data

3. **Disconnect:**
   - [ ] ConnectionConfigDialog: Disconnect
   - [ ] SensorConfigDialog: Sensor values freeze (last known)

**Pass Criteria:** Dialogs reflect live NMEA data when connected

---

## 5️⃣ Edge Cases & Error Handling

### 5.1 No Sensor Data Available
**Priority:** 🟡 HIGH

**Setup:** Disconnect from NMEA bridge

- [ ] SensorConfigDialog: Open any sensor
- [ ] Should handle missing data gracefully
- [ ] No crashes or undefined errors
- [ ] Can still configure thresholds (even without live data)
- [ ] Previous configuration loads correctly

**Pass Criteria:** Dialogs work even without live sensor data

---

### 5.2 Rapid Dialog Open/Close
**Priority:** 🟢 MEDIUM

- [ ] Open SensorConfigDialog
- [ ] Close immediately (before fully loaded)
- [ ] Open again
- [ ] Close again
- [ ] Repeat 5 times rapidly
- [ ] No memory leaks visible (check browser DevTools Memory)
- [ ] No console errors about unmounted components

**Pass Criteria:** No crashes or memory issues

---

### 5.3 Large Threshold Values
**Priority:** 🟢 LOW

- [ ] SensorConfigDialog: Open Pressure sensor
- [ ] Set Warning: 999999 Pa (max value)
- [ ] Set Critical: 1000000 Pa
- [ ] Values save and display correctly
- [ ] No integer overflow or display issues

**Pass Criteria:** Large values handled correctly

---

### 5.4 FormSection Error Display
**Priority:** 🟡 HIGH

**Scenario:** Trigger validation errors, check FormSection error badge

1. **Create validation error:**
   - [ ] ConnectionConfigDialog: Enter invalid IP `999.999.999.999`
   - [ ] FormSection header should show error badge with count "1"
   - [ ] Expand section - error message visible below IP field

2. **Multiple errors:**
   - [ ] Also enter invalid port `99999`
   - [ ] Error badge updates to "2"
   - [ ] Both error messages visible

3. **Fix errors:**
   - [ ] Correct IP to `192.168.1.100`
   - [ ] Error badge updates to "1"
   - [ ] Correct port to `8080`
   - [ ] Error badge disappears

**Pass Criteria:** Error badges accurate, update in real-time

---

## 6️⃣ Browser/Platform Specific Tests

### 6.1 Browser Compatibility (Web Only)
**Priority:** 🟢 MEDIUM

**Test in each browser:**
- [ ] Chrome: All dialogs work
- [ ] Firefox: All dialogs work  
- [ ] Safari: All dialogs work
- [ ] Edge: All dialogs work

**Check for:**
- [ ] Layout rendering correctly
- [ ] Dropdown styling consistent
- [ ] Keyboard navigation works
- [ ] Scroll behavior smooth

**Pass Criteria:** Consistent behavior across browsers

---

### 6.2 Responsive Layout (Web Only)
**Priority:** 🟢 MEDIUM

**Desktop (1920x1080):**
- [ ] FormSections: 2-3 columns where appropriate
- [ ] All text readable
- [ ] Controls properly sized

**Tablet (768px width):**
- [ ] FormSections: 1-2 columns
- [ ] Touch targets adequate size
- [ ] No horizontal scrolling

**Mobile (375px width):**
- [ ] FormSections: 1 column only
- [ ] All controls accessible
- [ ] Modal fills screen appropriately

**Pass Criteria:** Adaptive layout works at all sizes

---

## 7️⃣ Regression Tests - Verify No Breakage

### 7.1 Settings Screen Integration
**Priority:** 🔴 CRITICAL

- [ ] Settings screen opens without errors
- [ ] All 3 config buttons visible and clickable:
  - [ ] "Sensor Configuration" button
  - [ ] "Connection Settings" button
  - [ ] "Units & Formats" button
- [ ] Clicking each button opens correct dialog
- [ ] No layout issues on Settings screen

**Pass Criteria:** Settings screen unchanged and functional

---

### 7.2 Main Navigation Flow
**Priority:** 🔴 CRITICAL

- [ ] Navigate to Dashboard
- [ ] Navigate to Instruments
- [ ] Navigate to Settings
- [ ] Open any config dialog
- [ ] Close dialog
- [ ] Navigate back to Dashboard
- [ ] No navigation errors or broken routes

**Pass Criteria:** Navigation unaffected by dialog changes

---

### 7.3 Alarm Triggering (Integration)
**Priority:** 🔴 CRITICAL

**Setup:** Configure alarm with threshold

1. **Configure alarm:**
   - [ ] SensorConfigDialog: Battery Voltage
   - [ ] Enable alarm
   - [ ] Warning: 12.0V, Critical: 11.5V
   - [ ] Sound: Rapid Pulse
   - [ ] Close dialog

2. **Trigger alarm (simulator):**
   - [ ] Use simulator API to set Battery voltage to 11.8V (warning range)
   - [ ] App should show warning indicator
   - [ ] Set voltage to 11.2V (critical range)
   - [ ] App should show critical indicator
   - [ ] Alarm sound plays (if audio enabled)

3. **Verify config persisted:**
   - [ ] Alarm triggers at configured thresholds
   - [ ] Direction logic correct (alarms when below)

**Pass Criteria:** Alarms trigger correctly with new configuration

---

## 8️⃣ Data Persistence Verification

### 8.1 AsyncStorage Inspection
**Priority:** 🟡 HIGH

**After configuring all 3 dialogs, verify AsyncStorage:**

1. **Open Browser Console** (Web) or React Native Debugger
2. **Check keys exist:**
   ```javascript
   // List all config keys
   Object.keys(localStorage).filter(k => k.includes('config') || k.includes('sensor') || k.includes('connection') || k.includes('units'))
   ```

3. **Verify structure:**
   - [ ] `sensor_config_*` keys exist for configured sensors
   - [ ] `connection_config` exists
   - [ ] `units_config` exists
   - [ ] `config_dialog_sections_*` keys exist for collapsed sections

4. **Check values parseable:**
   ```javascript
   // Example: Check battery config
   JSON.parse(localStorage.getItem('sensor_config_battery_0'))
   ```
   - [ ] No JSON parse errors
   - [ ] Values in SI units
   - [ ] Structure matches expected schema

**Pass Criteria:** All configurations stored correctly in AsyncStorage

---

### 8.2 Store State Verification
**Priority:** 🟡 HIGH

**After configuration, verify Zustand stores updated:**

1. **SensorConfigStore:**
   - [ ] `getSensorThresholds('battery', 0)` returns configured values
   - [ ] `getSensorDisplayName('battery', 0)` returns custom name
   - [ ] Chemistry/engine type context stored

2. **ConnectionStore:**
   - [ ] `getConnectionConfig()` returns IP, port, protocol
   - [ ] Connection state reflects current status

3. **UnitsStore:**
   - [ ] `getCurrentPreset()` returns selected preset
   - [ ] Individual unit selections persisted

**Pass Criteria:** Stores reflect dialog changes immediately

---

## 9️⃣ Performance Profiling

### 9.1 Render Performance
**Priority:** 🟢 MEDIUM

**Use React DevTools Profiler:**

1. **Profile SensorConfigDialog open:**
   - [ ] Start profiling
   - [ ] Open dialog
   - [ ] Stop profiling
   - [ ] Check render time: Should be < 500ms on desktop
   - [ ] Check component re-render count: Minimal

2. **Profile rapid threshold changes:**
   - [ ] Start profiling
   - [ ] Click increment button 10 times rapidly
   - [ ] Stop profiling
   - [ ] ThresholdEditor should not re-render entire dialog

3. **Profile FormSection expand/collapse:**
   - [ ] Start profiling
   - [ ] Expand/collapse 5 sections
   - [ ] Stop profiling
   - [ ] Only affected sections should re-render

**Pass Criteria:** No unnecessary re-renders, fast response times

---

### 9.2 Memory Leak Check
**Priority:** 🟢 MEDIUM

**Use Browser DevTools Memory Profiler:**

1. **Baseline memory:**
   - [ ] Open DevTools → Memory tab
   - [ ] Take heap snapshot (Snapshot 1)

2. **Open/close dialogs 10 times:**
   - [ ] Open SensorConfigDialog → Close
   - [ ] Open ConnectionConfigDialog → Close
   - [ ] Open UnitsConfigDialog → Close
   - [ ] Repeat 10 times

3. **Check for leaks:**
   - [ ] Force garbage collection
   - [ ] Take heap snapshot (Snapshot 2)
   - [ ] Compare Snapshot 2 vs Snapshot 1
   - [ ] No significant growth in detached DOM nodes
   - [ ] No timer/listener leaks

**Pass Criteria:** Memory stable after repeated open/close

---

## 🏁 Testing Summary

### Critical Issues Found (Block Release)
_List any critical issues that must be fixed before release:_

1. ___________________________________________
2. ___________________________________________
3. ___________________________________________

### High Priority Issues (Should Fix)
_List high priority issues that should be fixed but don't block release:_

1. ___________________________________________
2. ___________________________________________
3. ___________________________________________

### Medium/Low Priority Issues (Nice to Have)
_List minor issues or enhancements:_

1. ___________________________________________
2. ___________________________________________
3. ___________________________________________

### Test Coverage Summary

| Component | Tests Passed | Tests Failed | Pass Rate | Status |
|-----------|--------------|--------------|-----------|--------|
| SensorConfigDialog | ___/10 | ___ | ___% | ☐ PASS ☐ FAIL |
| ConnectionConfigDialog | ___/8 | ___ | ___% | ☐ PASS ☐ FAIL |
| UnitsConfigDialog | ___/8 | ___ | ___% | ☐ PASS ☐ FAIL |
| Cross-Dialog Integration | ___/2 | ___ | ___% | ☐ PASS ☐ FAIL |
| Edge Cases | ___/4 | ___ | ___% | ☐ PASS ☐ FAIL |
| Regression | ___/3 | ___ | ___% | ☐ PASS ☐ FAIL |
| Performance | ___/2 | ___ | ___% | ☐ PASS ☐ FAIL |

**Overall Test Pass Rate:** ______%

### Approval

☐ **APPROVED FOR PRODUCTION** - All critical tests passed, no blocking issues  
☐ **APPROVED WITH NOTES** - Minor issues documented, acceptable for release  
☐ **REJECTED** - Critical issues must be resolved before release

**Tester Signature:** _____________  
**Date:** _____________  
**Notes:** ___________________________________________
