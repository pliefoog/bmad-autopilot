# GPS Settings Reactivity Fix

## Problem

The GPS Widget in Storybook's "MaritimeSettings" story was not updating when you changed the Date Format, Time Format, or Timezone settings. Only the Coordinate Format changes were reflected.

## Root Cause

The issue was in the `useUnitConversion` hook:

1. **`getGpsFormattedDateTime` had empty dependencies**:
   ```typescript
   const getGpsFormattedDateTime = useCallback((date: Date) => {
     const gpsSettings = useSettingsStore.getState().gps;
     // ... formatting logic
   }, []); // ❌ Empty array - never updates!
   ```

2. **Widget wasn't subscribed to all GPS settings**:
   ```typescript
   const gpsCoordinateFormat = useSettingsStore((state) => state.gps.coordinateFormat);
   // ❌ Missing: dateFormat, timeFormat, timezone subscriptions
   ```

## Solution

### 1. Fixed `useUnitConversion` Hook Dependencies

**File**: [useUnitConversion.ts](src/hooks/useUnitConversion.ts)

Changed from:
```typescript
const getGpsFormattedDateTime = useCallback((date: Date) => {
  const gpsSettings = useSettingsStore.getState().gps;
  const timezone = gpsSettings.timezone || 'utc';
  const dateFormat = gpsSettings.dateFormat || 'nautical_date';
  const timeFormat = gpsSettings.timeFormat || 'time_24h';

  return {
    date: formatDate(date, dateFormat, timezone),
    time: formatTime(date, timeFormat, timezone),
    timezone: getTimezoneDisplay(timezone)
  };
}, []); // ❌ Empty dependencies
```

To:
```typescript
const getGpsFormattedDateTime = useCallback((date: Date) => {
  const timezone = gps.timezone || 'utc';
  const dateFormat = gps.dateFormat || 'nautical_date';
  const timeFormat = gps.timeFormat || 'time_24h';

  return {
    date: formatDate(date, dateFormat, timezone),
    time: formatTime(date, timeFormat, timezone),
    timezone: getTimezoneDisplay(timezone)
  };
}, [gps.timezone, gps.dateFormat, gps.timeFormat]); // ✅ Proper dependencies
```

Also fixed `getShipFormattedDateTime` the same way.

### 2. Added GPS Settings Subscriptions to GPSWidget

**File**: [GPSWidget.tsx](src/widgets/GPSWidget.tsx)

Added subscriptions to ensure the widget re-renders when settings change:

```typescript
// GPS settings for coordinate format and date/time formatting
// These subscriptions ensure the widget re-renders when GPS settings change
const gpsCoordinateFormat = useSettingsStore((state) => state.gps.coordinateFormat);
const gpsDateFormat = useSettingsStore((state) => state.gps.dateFormat);
const gpsTimeFormat = useSettingsStore((state) => state.gps.timeFormat);
const gpsTimezone = useSettingsStore((state) => state.gps.timezone);
```

## How It Works Now

### The Reactivity Chain:

1. **User changes GPS Date Format** in MaritimeSettingsConfiguration
   ↓
2. **settingsStore.gps.dateFormat** updates
   ↓
3. **GPSWidget re-renders** (due to subscription on line 30)
   ↓
4. **`getGpsFormattedDateTime` is recreated** (due to dependencies in useUnitConversion)
   ↓
5. **`dateTimeFormatted` useMemo re-evaluates** (depends on `getGpsFormattedDateTime`)
   ↓
6. **Widget displays new date format** ✅

The same chain applies for Time Format and Timezone changes.

## Testing in Storybook

To verify the fix works:

1. Open Storybook: `npm run storybook`
2. Navigate to: **Widgets/GPSWidget** → **MaritimeSettings**
3. Expand the GPS widget by clicking the **⌄** caret
4. Scroll down to the settings section

### Test Coordinate Format:
- Change between **DD**, **DDM**, **DMS**, **UTM**
- ✅ LAT/LON display should update immediately

### Test Date Format:
- Change between:
  - **Mon Jan 15, 2025** (nautical_date)
  - **01/15/2025** (us_date)
  - **15/01/2025** (eu_date)
  - **2025-01-15** (iso_date)
- ✅ Expanded DATE field should update immediately

### Test Time Format:
- Change between:
  - **HH:mm:ss** (time_24h)
  - **hh:mm:ss a** (time_12h)
  - **HH:mm** (time_24h_short)
  - **hh:mm a** (time_12h_short)
- ✅ Expanded TIME field should update immediately

### Test Timezone:
- Change between:
  - **UTC** (utc)
  - **UTC-5 (EST)** (est)
  - **UTC+1 (CET)** (cet)
  - **UTC+9 (JST)** (jst)
  - etc.
- ✅ TIME and TIMEZONE fields should update with converted time

## Files Modified

1. **src/hooks/useUnitConversion.ts**
   - Fixed `getGpsFormattedDateTime` dependencies (line 1700)
   - Fixed `getShipFormattedDateTime` dependencies (line 1721)

2. **src/widgets/GPSWidget.tsx**
   - Added GPS date/time/timezone settings subscriptions (lines 29-32)

## Related

- Original issue reported in Storybook testing session
- Coordinate format was already working correctly
- This fix completes the GPS settings integration for full reactivity
