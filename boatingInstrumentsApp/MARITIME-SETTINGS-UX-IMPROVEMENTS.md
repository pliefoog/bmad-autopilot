# Maritime Settings UX Improvements

## Changes Made

Based on user feedback from Storybook testing, the following UX improvements have been made to the Maritime Settings Configuration:

### 1. ✅ Day Abbreviation (DDD) Added to All Date Formats

**Why**: Maritime applications commonly display the day of the week for navigation and watch-keeping schedules.

**Changes**:
- Updated all date format labels to show DDD prefix
- Modified `formatDate()` function to always include day abbreviation
- Examples:
  - `Mon 2025-10-21` (ISO with day)
  - `Mon 10/21/2025` (US with day)
  - `Mon 21.10.2025` (EU with day)
  - `Mon 21 Oct 2025` (UK with day)
  - `Mon, Oct 21, 2025` (Nautical - unchanged)

**Files Modified**:
- [MaritimeSettingsConfiguration.tsx](src/components/settings/MaritimeSettingsConfiguration.tsx#L107-113) - Updated labels
- [useUnitConversion.ts](src/hooks/useUnitConversion.ts#L211-238) - Updated formatting logic

### 2. ✅ Removed UTM Coordinate Format

**Why**: UTM (Universal Transverse Mercator) is not relevant for typical maritime navigation which uses lat/long coordinates.

**Changes**:
- Removed UTM option from coordinate format selector
- Now shows only: DD, DDM, DMS

**Files Modified**:
- [MaritimeSettingsConfiguration.tsx](src/components/settings/MaritimeSettingsConfiguration.tsx#L128-132)

### 3. ✅ Simplified Timezone Selector

**Why**: The complex timezone selector with device time and ship time was confusing. Maritime users typically work with UTC offsets.

**Changes**:
- **Removed**: Complex timezone picker with regions and cities
- **Removed**: Ship Time & Date Settings section entirely
- **Added**: Simple UTC±n timezone list (UTC-12 to UTC+14)
- UTC is centered in the list for easy access
- Clean dropdown with just timezone offsets

**Before**:
- GPS Settings with complex timezone picker
- Separate Ship Time Settings section
- Multiple timezone options per region

**After**:
- Single GPS Settings section
- Simple dropdown with UTC-12 through UTC+14
- Clear, unambiguous timezone selection

**Files Modified**:
- [MaritimeSettingsConfiguration.tsx](src/components/settings/MaritimeSettingsConfiguration.tsx#L39-123) - New `SimpleTimezonePicker`
- Removed `TimezonePicker` component
- Removed Ship Time section
- Removed unused imports (`getAllTimezones`, `getTimezonesByRegion`, `formatTimezoneDisplay`)

## User Impact

### Before vs After

**Coordinate Formats**:
- Before: DD, DDM, DMS, UTM (4 options, one irrelevant)
- After: DD, DDM, DMS (3 relevant options)

**Date Formats**:
- Before: 2025-10-21, 10/21/2025, 21.10.2025, 21 Oct 2025, Mon, Oct 21, 2025
- After: Mon 2025-10-21, Mon 10/21/2025, Mon 21.10.2025, Mon 21 Oct 2025, Mon, Oct 21, 2025

**Timezone Selection**:
- Before: Complex dropdown with regions, cities, device time, ship time
- After: Simple UTC-12 to UTC+14 list

**Settings Sections**:
- Before: GPS Settings + Ship Time Settings (redundant)
- After: GPS Settings only (consolidated)

## Testing in Storybook

1. Open Storybook: `npm run storybook`
2. Navigate to: **Widgets/GPSWidget** → **MaritimeSettings**
3. Test the improvements:
   - ✅ Select different coordinate formats (DD/DDM/DMS only)
   - ✅ Change date format and see DDD prefix in all options
   - ✅ Expand timezone dropdown and see simple UTC±n list
   - ✅ Expand GPS widget to see date/time update with new formats

## Next Steps

These changes simplified the maritime settings to focus on the essential controls needed for GPS navigation:
- **Position**: Lat/Lon in DD, DDM, or DMS format
- **Date**: Always with day abbreviation for watch schedules
- **Time**: 24h or 12h format
- **Timezone**: Simple UTC offset for chart work

The Ship Time concept can be revisited if there's a specific use case for maintaining separate time zones (e.g., departure port time vs. destination time), but for now, a single GPS time setting is clearer and less confusing.
