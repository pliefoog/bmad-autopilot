# Sensor Configuration Store Rename - Implementation Plan

**Date:** December 29, 2024  
**Branch:** master  
**Objective:** Rename `alarmStore` to `sensorConfigStore` for clarity

## Rationale

The current `alarmStore` is misnamed - it stores **sensor configuration** (user names, thresholds, chemistry, engine type) not just "alarms". This causes confusion since:

1. User's custom sensor names are stored here (not just alarm data)
2. Battery chemistry, engine type, and other configuration lives here
3. The store persists sensor metadata across app restarts
4. "Alarm" implies temporary alert data, not permanent configuration

**Better name:** `sensorConfigStore` - accurately reflects that it stores persistent sensor configuration, including alarm thresholds.

## Scope of Changes

### Files to Rename
- `src/store/alarmStore.ts` → `src/store/sensorConfigStore.ts`

### Types to Rename
- `SensorAlarmThresholds` → `SensorConfiguration`
- `AlarmStore` (store type) → `SensorConfigStore` 
- `AlarmState` → `SensorConfigState`
- `AlarmActions` → `SensorConfigActions`

### Exports to Rename
- `useAlarmStore` → `useSensorConfigStore`

### Storage Keys (Must Preserve Data!)
- **CRITICAL:** Keep persistence key as `'alarm-storage'` to preserve existing user data
- Add migration note in store file

## Files Requiring Updates (~30 files)

### Core Store Files
1. `src/store/alarmStore.ts` → `src/store/sensorConfigStore.ts`
   - Rename store, types, interfaces
   - Keep persistence key unchanged
   - Add comment about legacy storage key

### Type Definition Files
2. `src/types/SensorData.ts`
   - `SensorAlarmThresholds` → `SensorConfiguration`
   
3. `src/types/store.types.ts`
   - `AlarmStore` → `SensorConfigStore`
   - `AlarmState` → `SensorConfigState`
   - `AlarmActions` → `SensorConfigActions`
   
4. `src/types/index.ts`
   - Update re-exports

### Component Files (import updates)
5. `src/components/dialogs/SensorConfigDialog.tsx`
6. `src/components/dialogs/sensor-config/*.tsx`
7. `src/utils/sensorDisplayName.ts`
8. `src/utils/sensorAlarmUtils.ts`
9. `src/utils/alarmSliderUtils.ts`
10. `src/services/ThresholdPresentationService.ts`
11. `src/services/integration/NotificationIntegrationService.ts`
12. `src/store/nmeaStore.ts` (uses sensor thresholds)
13. All widget files (15+ files) that check thresholds
14. `src/registry/SensorConfigRegistry.ts`

### Documentation Files
15. Update all .md files mentioning alarm configuration

## Implementation Steps

### Step 1: Rename Core Store File (30 min)
```bash
git mv src/store/alarmStore.ts src/store/sensorConfigStore.ts
```

Then update inside the file:
- Store export: `useAlarmStore` → `useSensorConfigStore`
- Type: `AlarmStore` → `SensorConfigStore`
- Interfaces: `AlarmState` → `SensorConfigState`, `AlarmActions` → `SensorConfigActions`
- **Keep** persistence key: `'alarm-storage'` (for data compatibility)
- Add JSDoc comment explaining legacy storage key

### Step 2: Update Type Definitions (15 min)
- `SensorData.ts`: Rename `SensorAlarmThresholds` → `SensorConfiguration`
- `store.types.ts`: Rename store types
- `index.ts`: Update re-exports

### Step 3: Global Find-Replace (30 min)
Use multi_replace_string_in_file for:
- All imports: `from '../../store/alarmStore'` → `from '../../store/sensorConfigStore'`
- All usage: `useAlarmStore` → `useSensorConfigStore`
- All types: `SensorAlarmThresholds` → `SensorConfiguration`

### Step 4: Update Documentation (15 min)
- Search for "alarmStore" in all .md files
- Update to "sensorConfigStore"
- Update architecture diagrams if any

### Step 5: Testing (30 min)
1. Build TypeScript: `npm run tsc`
2. Run tests: `npm test`
3. Start dev server: verify sensors load
4. Open SensorConfigDialog: verify names save/load
5. Check DevTools: verify Zustand shows "SensorConfigStore"

## Post-Rename Verification Checklist

- [ ] All TypeScript errors resolved
- [ ] All imports updated
- [ ] DevTools shows "SensorConfigStore" (not "AlarmStore")
- [ ] Persistence works (user names survive restart)
- [ ] SensorConfigDialog saves/loads correctly
- [ ] Widget names display correctly
- [ ] No console errors
- [ ] Git history preserved (using git mv)

## Backward Compatibility Notes

**Storage Key Compatibility:**
- Keeping persistence key as `'alarm-storage'` ensures existing user data loads
- Users won't lose their custom sensor names, thresholds, or configurations
- No migration script needed
- Future major version could rename storage key with migration

**Why not rename storage key now?**
- Breaking change for users
- Would require migration script
- Current key still works fine
- Can be addressed in future major version

## Estimated Effort

- **Step 1:** 30 minutes (rename file, update internals)
- **Step 2:** 15 minutes (type definitions)
- **Step 3:** 30 minutes (global find-replace)
- **Step 4:** 15 minutes (documentation)
- **Step 5:** 30 minutes (testing)
- **Total:** ~2 hours

## Success Criteria

✅ No TypeScript compilation errors  
✅ All tests pass  
✅ DevTools shows correct store name  
✅ Persistence works across app restarts  
✅ Widget names display correctly  
✅ SensorConfigDialog functions normally  
✅ Git history preserved with git mv  
✅ Documentation updated  

## Future Enhancements

After this rename, we can:
1. Add device metadata to SensorConfiguration
2. Implement auto-naming from NMEA 2000 product info
3. Add location/notes fields for better organization
4. Consider renaming storage key in next major version

---

**Ready to proceed?** This is a straightforward refactoring that improves code clarity without breaking functionality.
