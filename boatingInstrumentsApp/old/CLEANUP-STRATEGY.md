# Aggressive Code Cleanup Strategy

## Current State Analysis
- **26 files migrated** to new themeStore
- **8 files still using** old theme/ThemeProvider
- **5 backup files** (.old/.bak)  
- **Multiple migration scripts** (fix-*.sh)
- **40 files remaining** with hardcoded colors

## Cleanup Execution Plan

### PHASE 1: Remove Backup Files (IMMEDIATE - Zero Risk)
**Files to DELETE:**
```
./App.old.tsx
./app/settings/alarm-detail.tsx.bak
./app/settings/alarms.tsx.bak
./src/components/HamburgerMenu.backup.tsx
./src/components/dialogs/UnitsConfigDialog.old.tsx
```

**Action:** `rm` these files - they're backups only

---

### PHASE 2: Migrate Remaining Old ThemeProvider Usage (8 files)
**Files to UPDATE:**
```
src/components/help/ContextualHelp.tsx
src/components/help/HelpSearch.tsx
src/components/help/InteractiveTutorial.tsx
src/components/help/QuickStartGuide.tsx
src/components/help/TroubleshootingGuide.tsx
src/components/molecules/LoadingOverlay.tsx
src/components/molecules/ScreenTransition.tsx
src/components/onboarding/OnboardingScreen.tsx
```

**Action:** Replace `from '../../theme/ThemeProvider'` with `from '../../store/themeStore'`

---

### PHASE 3: Remove Old Theme System Files (After Phase 2)
**Files to DELETE (after migration complete):**
```
src/theme/ThemeProvider.tsx          # Replaced by store/themeStore
src/theme/ThemePreview.tsx           # Demo component only
src/theme/ThemedComponents.tsx       # Legacy components (verify zero usage)
src/theme/themeUtils.ts              # Check if any utilities still needed
```

**Keep:**
```
src/theme/styles/                    # Style utilities still in use
src/utils/themeCompliance.ts         # Dev tool (move to __tests__/utils/)
```

---

### PHASE 4: Archive Migration Scripts
**Create .archive/ directory and move:**
```
fix-import-star.sh
fix-caret-controls.sh
fix-imports.sh
fix-quotes.sh
fix-service-imports.sh
fix-test-import-paths.sh
fix-widget-styling.sh
set-metro-cache.sh
start-metro-ssd.sh
```

**Keep in root:**
```
test-gps-format-reactivity.js        # Active debug tool
test-temperature-multi-instance.js   # Active debug tool
switch-app.sh                        # Development utility
```

---

### PHASE 5: Documentation Cleanup
**Remove outdated docs:**
```
CONSOLE-WARNING-FIXES.md             # Historical, merge into main docs
ADDITIONAL-CONSOLE-WARNING-FIXES.md  # Historical
CRITICAL-FIXES-APPLIED.md            # Historical
DISK-SPACE-FIX.md                    # Historical
depth-widget-fix-summary.md          # Merge into widget docs
GPS-SETTINGS-REACTIVITY-FIX.md       # Merge into settings docs
MARITIME-SETTINGS-UX-IMPROVEMENTS.md # Merge into UX docs
STORY-4.2-IMPLEMENTATION-SUMMARY.md  # Move to docs/sprint-artifacts/
STORY-4.5-IMPLEMENTATION-SUMMARY.md  # Move to docs/sprint-artifacts/
```

**Keep active docs:**
```
README.md
QUICK-START.md
WEB-SETUP-GUIDE.md
TESTING-STRATEGY.md
THEME-MIGRATION-GUIDE.md
```

---

## Execution Order

1. ✅ **Git commit current state** (DONE)
2. ⏳ **Phase 1:** Remove backup files
3. ⏳ **Phase 2:** Migrate 8 files to new themeStore
4. ⏳ **Phase 3:** Remove old theme system
5. ⏳ **Phase 4:** Archive migration scripts
6. ⏳ **Phase 5:** Clean up documentation
7. ⏳ **Final:** Run tests, commit cleanup

## Safety Measures
- Each phase is a separate commit
- Run tests after each phase
- Keep one backup branch before starting
- Document all deletions in commit messages

## Expected Outcome
- **~15-20 files removed**
- **~10 files archived**
- **8 files migrated** to new theme system
- **Cleaner codebase** for continued theme migration
- **Zero breaking changes** to functionality
