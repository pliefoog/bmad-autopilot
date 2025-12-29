# Legacy Props Migration Plan - PrimaryMetricCell & SecondaryMetricCell

## Overview

**Current State:** Widgets use a **MIX** of legacy props and new `data` prop patterns when rendering PrimaryMetricCell/SecondaryMetricCell.

**Problem:** Inconsistency makes codebase harder to maintain. Some widgets spread computed display data, others manually specify individual props.

**Goal:** Migrate ALL widgets to use unified `data` prop exclusively, eliminating legacy individual props (`mnemonic`, `value`, `unit`).

---

## Current Usage Patterns

### ✅ MODERN Pattern (Preferred)
**Used by:** WindWidget, SpeedWidget, DepthWidget (partially), RudderWidget, NavigationWidget

```typescript
// Compute display data once
const speedDisplayData = {
  sog: {
    mnemonic: 'SOG',
    value: sogMetric?.formattedValue ?? '---',
    unit: sogMetric?.unit ?? 'kts',
  },
};

// Use data prop with spread
<PrimaryMetricCell
  data={{ ...speedDisplayData.sog, alarmState: isStale ? 1 : sogAlarmLevel }}
  fontSize={{
    mnemonic: fontSize.label,
    value: fontSize.value,
    unit: fontSize.unit,
  }}
/>
```

**Advantages:**
- Separation of concerns (compute vs render)
- Easy to test display data independently
- Consistent with MetricDisplayData type
- Cleaner JSX with less duplication

---

### ❌ LEGACY Pattern (Needs Migration)
**Used by:** GPSWidget, TemperatureWidget, TanksWidget

```typescript
// Inline individual props
<PrimaryMetricCell
  mnemonic="TEMP"
  value={displayTemperature !== null ? String(displayTemperature) : '---'}
  unit={displayUnit}
  data={{ alarmState: isStale ? 1 : temperatureAlarmLevel }}
  fontSize={{
    mnemonic: fontSize.label,
    value: fontSize.value,
    unit: fontSize.unit,
  }}
/>
```

**Problems:**
- Mixes legacy props with data prop
- Logic duplicated in JSX (formatting inline)
- Harder to test (display logic mixed with rendering)
- Inconsistent with modern widgets

---

## Widgets Requiring Migration

### 🔴 HIGH Priority (3 widgets)

#### 1. GPSWidget (`src/widgets/GPSWidget.tsx`)
**Lines:** 239-261 (Latitude), 251-273 (Longitude)

**Current:**
```typescript
<PrimaryMetricCell
  mnemonic={latDisplay.mnemonic}
  value={latDisplay.value}
  unit={latDisplay.unit}
  data={{ alarmState: isStale ? 1 : 0 }}
  fontSize={{...}}
/>
```

**Target:**
```typescript
<PrimaryMetricCell
  data={{
    mnemonic: latDisplay.mnemonic,
    value: latDisplay.value,
    unit: latDisplay.unit,
    alarmState: isStale ? 1 : 0,
  }}
  fontSize={{...}}
/>
```

**Complexity:** ⭐ LOW - Already has `latDisplay`/`lonDisplay` objects, just need to spread into data prop

---

#### 2. TemperatureWidget (`src/widgets/TemperatureWidget.tsx`)
**Lines:** 190-200

**Current:**
```typescript
<PrimaryMetricCell
  mnemonic="TEMP"
  value={displayTemperature !== null ? String(displayTemperature) : '---'}
  unit={displayUnit}
  data={{ alarmState: isStale ? 1 : temperatureAlarmLevel }}
  fontSize={{...}}
/>
```

**Target:**
```typescript
// Add display data object (lines ~180)
const temperatureDisplayData = {
  mnemonic: 'TEMP',
  value: displayTemperature !== null ? String(displayTemperature) : '---',
  unit: displayUnit,
};

// Use in JSX
<PrimaryMetricCell
  data={{
    ...temperatureDisplayData,
    alarmState: isStale ? 1 : temperatureAlarmLevel,
  }}
  fontSize={{...}}
/>
```

**Complexity:** ⭐⭐ MEDIUM - Need to create display data object first

---

#### 3. TanksWidget (`src/widgets/TanksWidget.tsx`)
**Lines:** 139-162 (Level + Capacity)

**Current:**
```typescript
<PrimaryMetricCell
  mnemonic="LEVEL"
  value={level !== null ? `${Math.round(level)}` : '---'}
  unit="%"
  data={{ alarmState: tankLevelAlarmLevel }}
  fontSize={{...}}
/>
<PrimaryMetricCell
  mnemonic="CAP"
  value={capacity !== null ? String(Math.round(capacity)) : '---'}
  unit="L"
  data={{ alarmState: 0 }}
  fontSize={{...}}
/>
```

**Target:**
```typescript
// Add display data object (lines ~130)
const tankDisplayData = {
  level: {
    mnemonic: 'LEVEL',
    value: level !== null ? `${Math.round(level)}` : '---',
    unit: '%',
  },
  capacity: {
    mnemonic: 'CAP',
    value: capacity !== null ? String(Math.round(capacity)) : '---',
    unit: 'L',
  },
};

// Use in JSX
<PrimaryMetricCell
  data={{
    ...tankDisplayData.level,
    alarmState: tankLevelAlarmLevel,
  }}
  fontSize={{...}}
/>
<PrimaryMetricCell
  data={{
    ...tankDisplayData.capacity,
    alarmState: 0,
  }}
  fontSize={{...}}
/>
```

**Complexity:** ⭐⭐ MEDIUM - Multiple cells, need structured display data object

---

### 🟡 MEDIUM Priority (SecondaryMetricCell Usage)

#### TanksWidget - Secondary Cells
**Lines:** 173-194 (Available, Fluid Type)

**Current:** Uses legacy `mnemonic`, `value`, `unit` props
**Target:** Create display data object with all secondary metrics

---

#### GPSWidget - Secondary Cells  
**Lines:** 263-302 (Date, Time, COG, SOG, UTC)

**Current:** Uses legacy props extensively
**Target:** Create comprehensive GPS display data object

---

## Migration Steps

### Phase 1: Core Widgets (1-2 hours)

1. **GPSWidget**
   - ✅ Already has display objects (`latDisplay`, `lonDisplay`)
   - ✨ Just spread into `data` prop
   - ✅ Remove individual props
   - Test: Switch coordinate formats, verify display

2. **TemperatureWidget**
   - ➕ Create `temperatureDisplayData` object
   - ✨ Move inline formatting to object
   - ✅ Update JSX to use `data` prop
   - Test: Switch temp units, verify alarm states

3. **TanksWidget**
   - ➕ Create `tankDisplayData` object
   - ✨ Structure for primary + secondary metrics
   - ✅ Update all PrimaryMetricCell/SecondaryMetricCell usage
   - Test: Multiple tank instances, verify level/capacity display

---

### Phase 2: Remove Legacy Props Support (1 hour)

After ALL widgets migrated:

1. **PrimaryMetricCell.tsx** - Remove legacy prop support:
   ```typescript
   // DELETE these props from interface:
   mnemonic?: string;
   value?: string | number;
   unit?: string;
   
   // DELETE fallback logic:
   const mnemonic = data?.mnemonic ?? legacyMnemonic ?? '';
   const value = data?.value ?? legacyValue ?? '';
   const unit = data?.unit ?? legacyUnit ?? '';
   ```

2. **SecondaryMetricCell.tsx** - Same cleanup

3. **Update TypeScript interfaces** - Make `data` prop required (not optional)

---

## Implementation Order

### ✅ Best Approach: Single Comprehensive Update

**Recommended:** Do all 3 widgets in ONE commit to avoid half-migrated state.

```bash
# Branch name
git checkout -b refactor/unify-metric-cell-props

# 1. Migrate GPSWidget (15 min)
# 2. Migrate TemperatureWidget (20 min)
# 3. Migrate TanksWidget (25 min)
# 4. Test all 3 widgets (30 min)
# 5. Remove legacy props from cells (10 min)
# 6. Full regression test (20 min)

# Total: ~2 hours
```

---

## Testing Checklist

### GPSWidget
- [ ] Switch coordinate formats (DD, DDM, DMS)
- [ ] Verify lat/lon display correctly
- [ ] Test stale data alarm (disconnect NMEA)
- [ ] Check date/time formatting

### TemperatureWidget
- [ ] Switch temperature units (C → F)
- [ ] Verify temperature display
- [ ] Test alarm thresholds (if configured)
- [ ] Multiple temperature instances

### TanksWidget
- [ ] Multiple tank types (fuel, water, waste)
- [ ] Level percentage display
- [ ] Capacity in correct units
- [ ] Alarm on low level

### Regression
- [ ] All other widgets still work (WindWidget, SpeedWidget, etc.)
- [ ] No TypeScript errors after legacy props removed
- [ ] Unit changes apply immediately across all widgets
- [ ] Alarm states display correctly

---

## Benefits After Migration

### Code Quality
✅ **Consistent:** All widgets use same pattern (no exceptions)  
✅ **Testable:** Display logic separated from rendering  
✅ **Type-Safe:** MetricDisplayData interface enforced  
✅ **Maintainable:** Less code duplication (15-20 lines saved per widget)

### Performance
✅ **Memoizable:** Display data objects can be memoized with `useMemo`  
✅ **Cleaner:** PrimaryMetricCell simplified (no fallback logic)  
✅ **Predictable:** Single code path (no legacy branches)

### Developer Experience
✅ **Clear Pattern:** New widgets know exactly what to do  
✅ **No Confusion:** No "which props should I use?" questions  
✅ **Better Errors:** TypeScript catches missing data props immediately

---

## Risk Assessment

### 🟢 LOW Risk

**Why:**
1. PrimaryMetricCell already supports both patterns (backward compatible)
2. Changes are isolated to 3 widgets
3. No changes to data flow or store access
4. Easy to revert if issues found

**Mitigation:**
- Test each widget immediately after migration
- Keep NMEA simulator running during testing
- Compare before/after screenshots
- Run full test suite before committing

---

## Estimated Effort

| Task | Time | Complexity |
|------|------|------------|
| GPSWidget migration | 15 min | ⭐ LOW |
| TemperatureWidget migration | 20 min | ⭐⭐ MEDIUM |
| TanksWidget migration | 25 min | ⭐⭐ MEDIUM |
| Testing (3 widgets) | 30 min | - |
| Remove legacy props | 10 min | ⭐ LOW |
| Regression testing | 20 min | - |
| **TOTAL** | **~2 hours** | ⭐⭐ MEDIUM |

---

## Alternative: Keep Legacy Props?

### ❌ Why NOT Recommended

1. **Inconsistency:** Some widgets modern, some legacy (confusing)
2. **Technical Debt:** Legacy code paths maintained forever
3. **Type Safety:** Optional props harder to validate
4. **Performance:** Fallback logic adds unnecessary branches
5. **Documentation:** Need to explain two patterns to new developers

### ✅ Why Migrate NOW

1. Only 3 widgets affected (minimal scope)
2. Recent MetricValue fixes make this good timing (same session context)
3. Establishes clear pattern for ALL future widgets
4. Removes ~60 lines of legacy support code
5. TypeScript will catch errors immediately (required props)

---

## Next Steps

**Recommendation:** ✅ **Migrate all 3 widgets NOW** while we have full context of the presentation system architecture.

**Proposed Workflow:**
1. Create branch: `refactor/unify-metric-cell-props`
2. Migrate GPSWidget → test → commit
3. Migrate TemperatureWidget → test → commit  
4. Migrate TanksWidget → test → commit
5. Remove legacy props from cells → test → commit
6. Full regression test → final commit
7. Merge to `refactor/presentation-streamline` branch

**Alternative:** If user prefers, can be done as separate task later, but context loss will make it take longer.

---

## Conclusion

**Status:** ✅ READY TO EXECUTE  
**Complexity:** ⭐⭐ MEDIUM (straightforward refactor)  
**Value:** 🔥 HIGH (code consistency, maintainability)  
**Risk:** 🟢 LOW (isolated changes, backward compatible during migration)

**Decision Point:** Should we execute this migration now or defer to later?
