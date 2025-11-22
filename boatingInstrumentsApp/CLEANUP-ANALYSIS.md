# Code Cleanup Analysis - Legacy & Unused Code

## Files Identified for Removal

### 1. Backup Files (Safe to Delete)
```
./App.old.tsx                                        # Old App structure
./app/settings/alarm-detail.tsx.bak                  # Backup of alarm detail
./app/settings/alarms.tsx.bak                        # Backup of alarms
./src/components/HamburgerMenu.backup.tsx            # Backup of hamburger menu
./src/components/dialogs/UnitsConfigDialog.old.tsx  # Old units dialog
```

### 2. Old Theme System Files (To Review)
```
./src/theme/ThemeProvider.tsx                        # Old ThemeProvider (replaced by themeStore)
./src/theme/ThemePreview.tsx                         # Demo component (not in production)
./src/theme/ThemedComponents.tsx                     # Legacy themed components
./src/theme/themeUtils.ts                            # Old theme utilities
./src/utils/themeCompliance.ts                       # Development-only validation
```

### 3. Test/Debug Scripts (Keep but Document)
```
./test-temperature-multi-instance.js                 # Debug script (KEEP)
./test-gps-format-reactivity.js                      # Debug script (KEEP)
./switch-app.sh                                      # Development utility (KEEP)
./fix-import-star.sh                                 # Migration script (ARCHIVE)
./fix-*.sh                                           # Various fix scripts (ARCHIVE)
```

### 4. Legacy Store References
- Search for imports from old theme/ThemeProvider
- Replace with store/themeStore
- Already mostly migrated

## Cleanup Plan

### Phase 1: Backup Files (Immediate - Safe Delete)
Remove all .old, .bak, .backup files after verification

### Phase 2: Old Theme System (Requires Testing)
1. Verify no production code imports old ThemeProvider
2. Keep ThemeProvider.tsx if any components still use it
3. Remove ThemePreview.tsx (demo only)
4. Archive themeCompliance.ts (dev tool, not production)

### Phase 3: Migration Scripts (Archive)
Move fix-*.sh scripts to .archive/ folder for history

### Phase 4: Unused Components
Search for components with zero imports/references

## Verification Commands

```bash
# Find files importing old ThemeProvider
grep -r "from.*theme/ThemeProvider" src/ app/

# Find files importing old themed components
grep -r "from.*theme/ThemedComponents" src/ app/

# Find unused exports
npm run find-unused-exports

# Check for dead code
npm run dead-code-elimination
```

## Safety Checklist
- [ ] Git commit current state
- [ ] Run full test suite before cleanup
- [ ] Search for imports of files to be deleted
- [ ] Keep one commit per cleanup phase
- [ ] Document removed files in commit message
