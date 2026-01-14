# Unified Sensor Schema Refactor - Progress Tracker

**Goal:** Consolidate sensor definitions from split architecture (SensorData.ts interfaces + SensorConfigRegistry.ts) into single unified SENSOR_SCHEMAS source of truth.

**Timeline:** 22-23 days  
**Active Rollback Point:** `rollback/start`

**Baseline Metrics:**
- TypeScript errors: 1 (gracefulDegradationService.ts syntax error - pre-existing)
- Branch: `refactor/unified-sensor-schema`
- Commit: `b79bf078`

---

## Phase Status

### Phase 0: Git Setup & Baseline (0.5 days) ✅ COMPLETE
- [x] Create refactor branch: `refactor/unified-sensor-schema`
- [x] Create rollback tag: `rollback/start`
- [x] Document baseline metrics (TypeScript errors, bundle size)
- [x] Commit: "chore: initialize unified sensor schema refactor"

### Phase 0.5: Documentation Infrastructure (0.5 days) ✅ COMPLETE
- [x] Audit existing documentation
- [x] Create cleanup infrastructure scripts
- [x] Create cleanup checklist template
- [x] Commit: "docs: prepare refactor infrastructure"

### Phase 1: Archive Old Documentation (0.5 days)
- [ ] Create `docs/archive/` directory
- [ ] Move outdated docs to archive with README
- [ ] Commit: "docs: archive outdated documentation"

### Phase 2: Create Core Architecture Documentation (1 day)
- [ ] Create `docs/architecture/SENSOR_SCHEMA_ARCHITECTURE.md`
- [ ] Create `docs/architecture/TYPE_SYSTEM.md`
- [ ] Create `docs/architecture/DATA_FLOW.md`
- [ ] Commit: "docs: add core architecture documentation"

### Phase 2.5: Registry Schema Migration (3-4 days) 🎯 CRITICAL - IN PROGRESS
- [x] Create `src/registry/sensorSchemas.ts` (~1500 lines) - Battery complete, 12 sensors remaining
- [x] Create `src/registry/globalSensorCache.ts` (~120 lines)
- [x] Create `src/registry/index.ts` with helper functions
- [ ] Complete remaining sensor schemas (depth, engine, gps, wind, speed, temperature, tank, weather, autopilot, position, heading, log)
- [ ] Replace `src/types/SensorData.ts` (363 → ~100 lines)
- [ ] Update `src/types/SensorInstance.ts` to use global cache
- [ ] Create runtime schema validation
- [ ] Initialize cache in app/_layout.tsx
- [ ] Run verification: `npx tsc --noEmit`
- [ ] Commit: "refactor: create unified sensor schema"
- [ ] Create rollback tag: `rollback/phase-2.5-complete`

### Phase 3: Form & Dialog Refactoring (2-3 days)
- [ ] Refactor `src/hooks/useSensorConfigForm.ts` (hardcoded → dynamic)
- [ ] Update `src/components/dialogs/SensorConfigDialog.tsx`
- [ ] Remove `src/services/ThresholdPresentationService.ts` (archive)
- [ ] Run verification: `npm run type-check`
- [ ] Commit: "refactor: dynamic form/dialog from schema"
- [ ] Create rollback tag: `rollback/phase-3-complete`

### Phase 4: Widget Verification (1 day)
- [ ] Verify all 19 widgets use correct metricKey strings
- [ ] Fix any mismatches found
- [ ] Run verification: `npm run type-check`
- [ ] Commit: "fix: verify widget sensor references"
- [ ] Create rollback tag: `rollback/phase-4-complete`

### Phase 5: Parser Updates (1-2 days)
- [ ] Fix engine parser key mismatch: `temperature` → `coolantTemp`
- [ ] Verify all 30+ NMEA parsers
- [ ] Run verification: `npm run type-check`
- [ ] Commit: "fix: correct parser field references"
- [ ] Create rollback tag: `rollback/phase-5-complete`

### Phase 6: Dead Code Removal (3-4 days)
- [ ] Archive `src/registry/SensorConfigRegistry.ts` (2245 lines)
- [ ] Archive `src/services/ThresholdPresentationService.ts` (200 lines)
- [ ] Remove unused imports across all files
- [ ] Remove unused helper functions
- [ ] Run verification: `npm run type-check`
- [ ] Commit: "refactor: remove legacy registry code"
- [ ] Create rollback tag: `rollback/phase-6-complete`

### Phase 7: Final Documentation (1-2 days)
- [ ] Create `docs/guides/ADDING_SENSOR_TYPE.md`
- [ ] Create `docs/guides/CONTEXT_DEPENDENT_DEFAULTS.md`
- [ ] Create `docs/api/SENSOR_SCHEMAS_API.md`
- [ ] Create `docs/migration/MIGRATION_GUIDE.md`
- [ ] Update `.github/copilot-instructions.md`
- [ ] Commit: "docs: complete unified schema documentation"
- [ ] Create rollback tag: `rollback/phase-7-complete`

### Phase 8: Manual Testing & Verification (1.5 days)
- [ ] All widgets display correctly
- [ ] Threshold editing works (all sensor types)
- [ ] Unit switching updates all displays
- [ ] Dialog save/close flow works
- [ ] Factory reset shows wizard
- [ ] Persistence across restart
- [ ] No console errors/warnings
- [ ] Zustand DevTools shows correct data
- [ ] Create rollback tag: `rollback/phase-8-complete`
- [ ] Commit: "chore: complete unified sensor schema refactor"

---

## Next Step

**Continue Phase 2.5: Complete Remaining Sensor Schemas**

Add depth, engine, gps, wind, speed, temperature, tank, weather, autopilot schemas (~1000 lines remaining).

---

## Emergency Rollback

If critical issues arise, rollback to last known good state:

```bash
# View available rollback points
git tag | grep rollback/

# Rollback to specific phase
git reset --hard rollback/phase-X-complete

# Force push if already pushed to remote
git push --force origin refactor/unified-sensor-schema
```

---

## Notes

- Update this file after each git commit
- Keep "Next Step" section current
- Document any blockers or deviations from plan
- All code changes require `npm run type-check` to pass
- No automated tests - manual testing only (Phase 8)
