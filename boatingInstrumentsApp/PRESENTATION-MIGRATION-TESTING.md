# Presentation Migration - Manual Testing Checklist

**Branch:** `refactor/presentation-streamline`  
**Date:** December 28, 2024  
**Testing Required Before Merge**

## Testing Overview

This refactor migrated 46 presentations from explicit conversion functions to `conversionFactor` pattern.
All linear conversions now use auto-generated functions. Manual testing required to verify:

1. Widget displays show correct values
2. Threshold editing works correctly (display ↔ SI conversions)
3. Font measurement service (layout stability)
4. Unit switching updates immediately

## Setup

```bash
# Start development environment
cd boatingInstrumentsApp
npm run web

# In separate terminal, start NMEA simulator
node server/nmea-bridge.js --scenario ../marine-assets/test-scenarios/navigation/coastal-sailing.yml --loop
```

## Test Categories (Migrated)

### ✅ Depth (5 presentations)
- [ ] **m_1** - Switch to Settings → Units → Depth → "Meters (1 decimal)"
  - Verify widget shows depth with 1 decimal (e.g., "15.2 m")
  - Open SensorConfigDialog, edit threshold, verify conversion works
- [ ] **m_0** - Switch to "Meters (integer)"
  - Verify widget shows integer depth (e.g., "15 m")
- [ ] **ft_0** - Switch to "Feet (integer)"
  - Verify widget shows feet (15m → ~49 ft)
- [ ] **ft_1** - Switch to "Feet (1 decimal)"
  - Verify widget shows feet with decimal (15m → 49.2 ft)
- [ ] **fth_1** - Switch to "Fathoms (1 decimal)"
  - Verify widget shows fathoms (15m → ~8.2 fth)

### ✅ Speed (4 presentations)
- [ ] **kts_1** - Switch to Settings → Units → Speed → "Knots (1 decimal)"
  - Verify widget shows knots (e.g., "6.5 kts")
- [ ] **kts_0** - Switch to "Knots (integer)"
  - Verify widget shows integer knots (e.g., "7 kts")
- [ ] **kmh_1** - Switch to "km/h (1 decimal)"
  - Verify widget shows km/h (3.35 m/s → 12.0 km/h)
- [ ] **mph_1** - Switch to "mph (1 decimal)"
  - Verify widget shows mph (3.35 m/s → 7.5 mph)

### ✅ Voltage (2 presentations)
- [ ] **v_2** - Switch to Settings → Units → Voltage → "Volts (2 decimals)"
  - Verify battery widget shows 2 decimals (e.g., "12.60 V")
- [ ] **v_1** - Switch to "Volts (1 decimal)"
  - Verify battery widget shows 1 decimal (e.g., "12.6 V")

### ✅ Current (2 presentations)
- [ ] **a_2** - Switch to Settings → Units → Current → "Amperes (2 decimals)"
  - Verify current widget shows 2 decimals (e.g., "5.25 A")
- [ ] **a_1** - Switch to "Amperes (1 decimal)"
  - Verify current widget shows 1 decimal (e.g., "5.2 A")

### ✅ Temperature (2 presentations - Celsius only)
- [ ] **c_1** - Switch to Settings → Units → Temperature → "Celsius (1 decimal)"
  - Verify temperature widget shows 1 decimal (e.g., "22.5 °C")
- [ ] **c_0** - Switch to "Celsius (integer)"
  - Verify temperature widget shows integer (e.g., "23 °C")

**Note:** Fahrenheit (f_1, f_0) was NOT migrated (non-linear formula) - test separately

### ✅ Atmospheric Pressure (4 presentations)
- [ ] **hpa_1** - Switch to "Hectopascals (1 decimal)"
  - Verify pressure widget shows hPa (101325 Pa → 1013.2 hPa)
- [ ] **mbar_1** - Switch to "Millibars (1 decimal)"
  - Verify pressure widget shows mbar (same as hPa)
- [ ] **bar_3** - Switch to "Bar (3 decimals)"
  - Verify pressure widget shows bar (101325 Pa → 1.013 bar)
- [ ] **inhg_2** - Switch to "Inches Mercury (2 decimals)"
  - Verify pressure widget shows inHg (101325 Pa → 29.92 inHg)

### ✅ Mechanical Pressure (3 presentations)
- [ ] **bar_1** - Switch to "Bar (1 decimal)" for oil pressure
  - Verify engine widget shows bar (350000 Pa → 3.5 bar)
- [ ] **kpa_0** - Switch to "Kilopascals (integer)"
  - Verify engine widget shows kPa (350000 Pa → 350 kPa)
- [ ] **psi_1** - Switch to "PSI (1 decimal)"
  - Verify engine widget shows psi (350000 Pa → 50.8 psi)

### ✅ Volume (3 presentations)
- [ ] **l_0** - Switch to "Liters (integer)"
  - Verify tank widget shows liters (e.g., "150 L")
- [ ] **gal_us_1** - Switch to "US Gallons (1 decimal)"
  - Verify tank widget shows US gallons (150 L → 39.6 gal)
- [ ] **gal_uk_1** - Switch to "Imperial Gallons (1 decimal)"
  - Verify tank widget shows imperial gallons (150 L → 33.0 gal)

### ✅ Flow Rate (3 presentations)
- [ ] **lph_1** - Switch to "Liters/hour (1 decimal)"
  - Verify fuel flow widget shows L/h (e.g., "8.5 L/h")
- [ ] **gph_us_1** - Switch to "US Gallons/hour (1 decimal)"
  - Verify fuel flow widget shows US GPH (8.5 L/h → 2.2 GPH)
- [ ] **gph_uk_1** - Switch to "Imperial Gallons/hour (1 decimal)"
  - Verify fuel flow widget shows imperial GPH (8.5 L/h → 1.9 GPH)

### ✅ Wind (1 presentation)
- [ ] **wind_kts_1** - Switch to "Knots (1 decimal)"
  - Verify wind widget shows knots (e.g., "15.5 kt")

**Note:** Beaufort (bf_desc, bf_0) was NOT migrated (non-linear scale) - test separately

### ✅ Other Categories (15 presentations)
- [ ] **Angle:** deg_0, deg_1 - Test heading/bearing displays
- [ ] **Time:** h_1, h_0 - Test engine hours display
- [ ] **Distance:** nm_1, km_1, mi_1 - Test distance to waypoint
- [ ] **Capacity:** ah_0 - Test battery amp-hours
- [ ] **Frequency:** hz_1, hz_0 - Test shore power frequency
- [ ] **Power:** kw_1, hp_0, w_0 - Test engine power output
- [ ] **RPM:** rpm_0, rps_1 - Test engine RPM display
- [ ] **Percentage:** pct_0 - Test tank levels, battery SOC

## Non-Migrated Presentations (Test Separately)

These presentations were intentionally NOT migrated and still use explicit functions:

### ⚠️ Fahrenheit (Non-linear formula)
- [ ] **f_1, f_0** - Test temperature conversion
  - Switch to Fahrenheit
  - Verify 22°C → 72°F (formula: C × 9/5 + 32)
  - Verify threshold editing works

### ⚠️ Beaufort Scale (Non-linear lookup)
- [ ] **bf_desc, bf_0** - Test wind speed Beaufort scale
  - Switch to Beaufort scale
  - Verify wind speed shows correct Beaufort number and description
  - Verify threshold editing works

### ⚠️ Coordinates (Custom format with metadata)
- [ ] **dd_6, ddm_3, dms_1** - Test GPS coordinates
  - Verify latitude shows N/S hemisphere
  - Verify longitude shows E/W hemisphere
  - Verify format matches pattern (degrees, minutes, seconds)

## Threshold Editing Tests

Critical test for each migrated presentation:

1. Open widget settings
2. Click threshold configuration
3. Edit "Warning" threshold value
4. Save
5. Verify:
   - [ ] Display value converts correctly to SI
   - [ ] Threshold alarm triggers at correct value
   - [ ] No console errors about conversion

## Font Measurement (Layout Stability)

1. Switch between units rapidly (e.g., meters ↔ feet ↔ fathoms)
2. Verify:
   - [ ] Widget width doesn't jump/flicker
   - [ ] Text doesn't overflow container
   - [ ] layoutRanges (min/max/typical) provide stable sizing

## Region Presets

1. Settings → Units → Region Preset → "Europe"
2. Verify correct defaults:
   - [ ] Depth: meters
   - [ ] Speed: knots
   - [ ] Pressure: hectopascals
   - [ ] Temperature: Celsius
   - [ ] Volume: liters

3. Switch to "United States"
4. Verify correct defaults:
   - [ ] Depth: feet
   - [ ] Speed: knots
   - [ ] Pressure: inches mercury
   - [ ] Temperature: Fahrenheit
   - [ ] Volume: US gallons

## Known Issues to Check

- [ ] No console errors in browser DevTools
- [ ] No TypeScript compilation errors
- [ ] Zustand DevTools shows correct state updates
- [ ] All migrated presentations use `conversionFactor` (check Zustand state)
- [ ] No `convert`, `format`, `convertBack` functions in migrated presentations

## Performance Checks

- [ ] Unit switching is instant (no lag)
- [ ] Widget updates don't cause frame drops
- [ ] No memory leaks after rapid unit switching

## Success Criteria

✅ All 46 migrated presentations display correctly  
✅ All threshold editing works (display ↔ SI conversion)  
✅ Font measurement provides layout stability  
✅ Unit switching updates immediately  
✅ No console errors  
✅ Non-migrated presentations still work correctly  

## If Issues Found

1. Document exact steps to reproduce
2. Note expected vs actual behavior
3. Check browser console for errors
4. Check Zustand DevTools for incorrect state
5. Report to developer with:
   - Presentation ID (e.g., 'ft_0')
   - Test scenario (e.g., "switching from meters to feet")
   - Expected value vs actual value

## Post-Testing

After all tests pass:
- [ ] Update this checklist with results
- [ ] Commit any fixes to `refactor/presentation-streamline`
- [ ] Proceed to Phase 8 (Finalization)
- [ ] Merge to master
