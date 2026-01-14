# Cleanup Checklist Template

Use this template after each refactor phase to ensure thorough cleanup.

## Phase X: [Phase Name] - Cleanup

### Files Changed
- [ ] List all files modified in this phase
- [ ] Verify each file has updated documentation
- [ ] Check for unused imports in changed files
- [ ] Remove commented-out code

### Unused Code Detection
- [ ] Run `./scripts/findUnusedImports.sh` on changed files
- [ ] Run `./scripts/findUnusedFiles.sh` in affected directories
- [ ] Review and remove identified unused code
- [ ] Document reason if keeping "unused" code

### Dependencies
- [ ] Check if any imports from old files remain
- [ ] Update import paths to new locations
- [ ] Verify no circular dependencies introduced
- [ ] Run `npx tsc --noEmit` to catch import errors

### Documentation
- [ ] All modified files have file-level docblocks
- [ ] Complex functions have implementation notes
- [ ] Bug fixes documented with date and explanation
- [ ] Architecture changes documented

### Verification
- [ ] `npx tsc --noEmit` passes (0 new errors)
- [ ] No console warnings in browser
- [ ] Git status clean (all changes committed)
- [ ] Phase marked complete in REFACTOR_PLAN.md

### Archive (if applicable)
- [ ] Old files moved to appropriate archive location
- [ ] Archive includes migration notes
- [ ] Archive README updated with new entries

---

*Copy this template for each phase and fill it out during cleanup*
