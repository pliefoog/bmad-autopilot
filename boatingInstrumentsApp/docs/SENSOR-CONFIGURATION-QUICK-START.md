# Sensor Configuration - Quick Start Testing

## 🚀 5-Minute Test

This quick guide validates the core functionality of the sensor configuration system.

### Setup (30 seconds)

1. **Start simulator + web server:**
   ```
   Ctrl+Shift+P → Tasks: Run Task → Start Full Web Development Stack
   ```

2. **Open app in browser:**
   - Navigate to `http://localhost:8081`
   - Wait for app to load

### Test 1: Custom Sensor Name (1 minute)

1. Long-press any **Battery Widget** header
2. Enter custom name: `"House Battery"`
3. Click **Save**
4. **✅ PASS:** Widget header shows "House Battery"
5. Refresh browser (Cmd+Shift+R / Ctrl+Shift+R)
6. **✅ PASS:** Name persists after refresh

### Test 2: Smart Defaults (2 minutes)

**Battery Chemistry Test:**
1. Long-press Battery Widget → Configuration
2. Set **Battery Chemistry** = "LiFePO4"
3. Click **Load Defaults**
4. **✅ PASS:** 
   - Critical = 12.8V
   - Warning = 13.0V
   - Critical Hysteresis = 0.2V

5. Change **Battery Chemistry** = "Lead-Acid/AGM"
6. Click **Load Defaults** again
7. **✅ PASS:**
   - Critical = 11.8V
   - Warning = 12.2V
   - Critical Hysteresis = 0.2V

**Engine Type Test:**
1. Long-press Engine Widget → Configuration
2. Set **Engine Type** = "Diesel"
3. Click **Load Defaults**
4. **✅ PASS:**
   - RPM Critical = 2800
   - RPM Warning = 2500

5. Change **Engine Type** = "Outboard"
6. Click **Load Defaults** again
7. **✅ PASS:**
   - RPM Critical = 5800
   - RPM Warning = 5500

### Test 3: Persistence Validation (1.5 minutes)

1. Configure Battery 0:
   - Name: `"Starboard Battery"`
   - Chemistry: `"LiFePO4"`
   - Critical: `12.5V`
   - Warning: `13.0V`
   - Critical Sound: `"Rapid Pulse"`
   - Warning Sound: `"Warble"`

2. Click **Save**

3. Configure Engine 0:
   - Name: `"Port Engine"`
   - Type: `"Diesel"`
   - Keep default thresholds

4. Click **Save**

5. **Hard refresh browser** (Cmd+Shift+R / Ctrl+Shift+R)

6. Check Battery Widget:
   - **✅ PASS:** Header shows "Starboard Battery"
   - Open configuration dialog
   - **✅ PASS:** All values exactly as configured

7. Check Engine Widget:
   - **✅ PASS:** Header shows "Port Engine"
   - Open configuration dialog
   - **✅ PASS:** Diesel type and defaults preserved

### Test 4: Console Verification (30 seconds)

1. Open browser DevTools → Console
2. Look for startup messages:
   - **✅ PASS:** `[sensorConfigStore] Persisted state hydrated successfully`
   - **✅ PASS:** `[App] ✅ Synced sensor configurations from persistent storage`
3. Check for errors:
   - **✅ PASS:** No red error messages related to sensor config

---

## 🎯 Quick Results

**Total Time:** ~5 minutes  
**Tests Passed:** ___/4

### If All Tests Pass ✅
The sensor configuration system is working correctly:
- Custom naming functional
- Smart defaults operational
- Persistence working
- App startup sync successful

### If Any Test Fails ❌
1. Check browser console for error messages
2. Verify VS Code tasks are running (check terminal)
3. Clear browser localStorage and retry
4. Refer to [SENSOR-CONFIGURATION-TESTING-GUIDE.md](./SENSOR-CONFIGURATION-TESTING-GUIDE.md) for detailed troubleshooting

---

## 📋 Next Steps

For comprehensive testing, proceed to:
- [Full Testing Guide](./SENSOR-CONFIGURATION-TESTING-GUIDE.md) - All 10 test scenarios
- [Implementation Summary](./SENSOR-CONFIGURATION-IMPLEMENTATION-COMPLETE.md) - Technical details

---

## 🐛 Troubleshooting Quick Fixes

### Configurations not persisting
```javascript
// Browser DevTools → Console
localStorage.clear();
location.reload();
```

### Simulator not running
```bash
# VS Code Terminal
Ctrl+Shift+P → Tasks: Run Task → Stop NMEA Bridge Simulator
Ctrl+Shift+P → Tasks: Run Task → Start NMEA Bridge: Single Engine Scenario (Default)
```

### Widget names not updating
- Close and reopen the widget (remove + add from dashboard)
- Check sensor data is flowing (watch for value updates)

---

**Implementation:** Phases 1-8 Complete ✅  
**Testing:** Phase 9 - Quick Start Validated ⏳
