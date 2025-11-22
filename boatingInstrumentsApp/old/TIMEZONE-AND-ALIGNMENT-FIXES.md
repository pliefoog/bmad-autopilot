# Timezone Selector and Widget Alignment Fixes

## Summary

Fixed four UX issues identified during Storybook testing of the GPS widget and Maritime Settings:

1. ✅ Added city names back to timezone selector dropdown
2. ✅ Added 'UTC' prefix to timezone display in widget
3. ✅ Display 'UTC' instead of 'UTC+0' for zero offset
4. ✅ Right-aligned date/time in secondary view to match GPS coordinates
5. ✅ **BONUS**: Standardized typography and reduced visual weight of secondary metrics

## Changes Made

### 1. Timezone Selector - Added City Names

**File**: [MaritimeSettingsConfiguration.tsx](src/components/settings/MaritimeSettingsConfiguration.tsx#L51-80)

**Before**: Just UTC offsets (e.g., "UTC-5", "UTC+9")

**After**: UTC offset + major cities
```typescript
{ offset: -5, label: 'UTC-5', cities: 'New York, Toronto' }
{ offset: 0, label: 'UTC', cities: 'London, Reykjavik' }
{ offset: 9, label: 'UTC+9', cities: 'Tokyo, Seoul' }
```

**UI Changes**:
- Timezone dropdown now shows offset on left, cities on right
- Cities are italicized and gray for visual hierarchy
- Makes it easier to find your timezone by city name

### 2. Widget Timezone Display - Added 'UTC' Prefix

**File**: [useUnitConversion.ts](src/hooks/useUnitConversion.ts#L273-308)

**Before**:
- Offset 0 showed: "0"
- Offset -5 showed: "-5"
- Offset +9 showed: "+9"

**After**:
- Offset 0 shows: "UTC"
- Offset -5 shows: "UTC-5"
- Offset +9 shows: "UTC+9"

**Code Changes**:
```typescript
function getTimezoneDisplay(timezone: string): string {
  switch (timezone) {
    case 'utc':
    case '0':
      return 'UTC'; // Special case for zero
    // ...
    default:
      const offset = parseInt(timezone);
      if (!isNaN(offset)) {
        if (offset === 0) {
          return 'UTC'; // Not UTC+0
        }
        const sign = offset >= 0 ? '+' : '';
        return `UTC${sign}${offset}`; // Prefix with UTC
      }
  }
}
```

### 3. Right-Aligned Date/Time in Secondary View

**Files**:
- [GPSWidget.tsx](src/widgets/GPSWidget.tsx#L193-219)
- [SecondaryMetricCell.tsx](src/components/SecondaryMetricCell.tsx)

**Before**: Date/Time were left-aligned in the secondary (expanded) view
**After**: Date/Time are right-aligned to match GPS coordinates in primary view

**Implementation**:
1. Added `align` prop to SecondaryMetricCell component
2. Updated GPSWidget to use `align="right"` for DATE and TIME cells
3. Added wrapper styles for proper alignment:
   ```typescript
   secondaryRow: {
     flexDirection: 'row',
     marginBottom: 8,
   },
   secondaryCell: {
     flex: 1,
     alignItems: 'flex-end', // Right-align
   },
   ```

### 4. Standardized Secondary Metric Typography

**File**: [SecondaryMetricCell.tsx](src/components/SecondaryMetricCell.tsx#L108-134)

**Problem**: Secondary metrics were smaller and inconsistent with primary metrics

**Solution**: Match PrimaryMetricCell sizing but use muted colors

| Element | Primary | Secondary (Before) | Secondary (After) |
|---------|---------|-------------------|-------------------|
| Mnemonic | 12pt, semibold | 10pt, semibold | **12pt, semibold** |
| Value | 36pt, bold, **theme.text** | 24pt, bold, theme.text | **36pt, bold, theme.textSecondary** |
| Unit | 12pt, regular | 10pt, regular | **12pt, regular** |

**Key Insight**:
- Same sizing ensures visual consistency
- **Different color** (textSecondary vs text) creates hierarchy
- Primary metrics stand out with darker text
- Secondary metrics recede with gray text

## Visual Hierarchy

### Primary Metrics (GPS Coordinates)
```
LAT                            (mnemonic: 12pt, gray)
48° 38.199' N                  (value: 36pt, BLACK/bold)
```

### Secondary Metrics (Date/Time)
```
DATE                           (mnemonic: 12pt, gray)
Mon 2025-10-21                 (value: 36pt, GRAY/bold) ← Muted!
```

Same size, different emphasis through color!

## Testing in Storybook

1. Open Storybook: `npm run storybook`
2. Navigate to: **Widgets/GPSWidget** → **MaritimeSettings**

### Test Timezone Selector:
- ✅ Click timezone dropdown
- ✅ See city names on right side (italicized, gray)
- ✅ Select "UTC" and see it display as "UTC" (not "UTC+0")
- ✅ Select "UTC-5" and see it display with cities "New York, Toronto"

### Test Widget Display:
- ✅ Expand GPS widget (click ⌄ caret)
- ✅ Check DATE and TIME are right-aligned
- ✅ Check timezone shows "UTC" or "UTC±n" format
- ✅ Verify DATE/TIME text is same size as coordinates but grayer

### Test Visual Hierarchy:
- ✅ Primary metrics (LAT/LON) should appear **darker/bolder**
- ✅ Secondary metrics (DATE/TIME) should appear **lighter/muted**
- ✅ Both should be same font size (36pt values)

## Files Modified

1. **src/components/settings/MaritimeSettingsConfiguration.tsx**
   - Added city names to timezone offset data (lines 51-80)
   - Updated dropdown to display cities (lines 109-117)
   - Added styles for city text (lines 359-365)

2. **src/hooks/useUnitConversion.ts**
   - Updated `getTimezoneDisplay()` to handle UTC+0 case (line 276)
   - Added UTC prefix to numeric offsets (lines 296-304)

3. **src/widgets/GPSWidget.tsx**
   - Added `align="right"` prop to SecondaryMetricCell (lines 203, 214)
   - Added secondaryRow and secondaryCell wrapper styles (lines 283-292)

4. **src/components/SecondaryMetricCell.tsx**
   - Added `align` prop interface (line 12)
   - Updated font sizes to match PrimaryMetricCell (lines 109, 117, 129)
   - Changed value color to `theme.textSecondary` for muted appearance (line 49)
   - Updated spacing to match PrimaryMetricCell (lines 114, 121)

## Design Rationale

### Why same size but different color?

**Consistency**: Users can scan metrics at a consistent reading size
**Hierarchy**: Color differentiation creates clear primary vs secondary distinction
**Readability**: Larger 36pt text is easier to read in marine conditions (glare, motion)
**Professional**: Matches established design systems (Material Design, iOS HIG)

### Typography Hierarchy in Action:

```
┌─────────────────────────────────┐
│ GPS WIDGET                    ⌄ │  ← Title (11pt, gray)
├─────────────────────────────────┤
│ LAT                             │  ← Mnemonic (12pt, gray)
│          48° 38.199' N          │  ← VALUE (36pt, BLACK) ★
│                                 │
│ LON                             │  ← Mnemonic (12pt, gray)
│           2° 01.401' W          │  ← VALUE (36pt, BLACK) ★
├─────────────────────────────────┤  [Expanded]
│                           DATE  │  ← Mnemonic (12pt, gray)
│            Mon 2025-10-21       │  ← value (36pt, gray) ☆
│                                 │
│                           TIME  │  ← Mnemonic (12pt, gray)
│              14:30:45 UTC       │  ← value (36pt, gray) ☆
└─────────────────────────────────┘

★ = Primary (dark/bold) - stands out
☆ = Secondary (muted) - recedes
```

## Next Steps

These fixes complete the GPS widget UX improvements for:
- ✅ Clear timezone selection with city references
- ✅ Consistent UTC formatting in widget display
- ✅ Proper right-alignment of all metric data
- ✅ Visual hierarchy through typography and color
- ✅ Maritime-appropriate contrast and readability
