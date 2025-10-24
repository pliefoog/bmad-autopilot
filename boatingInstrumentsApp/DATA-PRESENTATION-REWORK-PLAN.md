# Data Presentation System Rework Plan

## Overview
Replace the complex unit conversion system with a semantic data presentation architecture.

## PHASE 1: Foundation (NEW SEMANTIC SYSTEM) ✅ COMPLETE
**Goal**: Create clean, semantic-based data presentation system to replace complex unit conversion

### 1.1 Create Data Categories ✅ COMPLETE
- ✅ `src/presentation/categories.ts` - Define semantic data categories (depth, speed, wind, temperature, etc.)
- ✅ Focus on marine instrument data types with proper base units
- ✅ Include metadata: icons, typical ranges, precision hints

### 1.2 Define Presentation Options ✅ COMPLETE  
- ✅ `src/presentation/presentations.ts` - Create presentation definitions for each category
- ✅ Marine-focused: meters/feet/fathoms for depth, knots/Beaufort for wind, etc.
- ✅ Each presentation: convert function + format function + metadata
- ✅ Regional preferences (EU: metric, US: imperial, UK: nautical/fathoms)

### 1.3 Settings Store ✅ COMPLETE
- ✅ `src/presentation/presentationStore.ts` - Zustand store for user preferences  
- ✅ Simple: map DataCategory → PresentationId
- ✅ Regional defaults, persistence, convenience hooks

### 1.4 Simple Widget Hook ✅ COMPLETE
- ✅ `src/presentation/useDataPresentation.ts` - Replace 1800-line useUnitConversion  
- ✅ Single responsibility: get convert+format functions for a category
- ✅ Clean API: `const depth = useDataPresentation('depth'); depth.formatWithSymbol(5.2)`

## PHASE 2: Widget Migration ✅ STARTED
**Goal**: Migrate widgets from complex unit system to clean semantic system

### 2.1 DepthWidget Migration ✅ COMPLETE
- ✅ Replace useUnitConversion with useDepthPresentation
- ✅ Remove complex unit selection logic
- ✅ Test: depth displays proper units (meters/feet/fathoms) instead of nautical miles
- ✅ **BRIDGE ADDED**: Legacy unit dialog now syncs with new system!

### 2.2 Legacy Bridge (EMERGENCY FIX) ✅ COMPLETE  
- ✅ `src/presentation/legacyBridge.ts` - Connect old settings to new system
- ✅ `useLegacyUnitBridge()` hook in App.tsx - Loads legacy settings on startup
- ✅ `syncLegacyUnitChange()` calls in UnitsConfigDialog - Syncs when user changes units
- ✅ **USER CAN NOW CHANGE DEPTH UNITS** through existing settings dialog!

### 2.3 SpeedWidget Migration ✅ COMPLETE
- ✅ Replace useUnitConversion with useSpeedPresentation
- ✅ Remove complex unit selection logic  
- ✅ Create getSpeedDisplay() helper for clean value/unit formatting
- ✅ Test: speed displays knots/km/h/mph correctly via existing settings dialog

### 2.4 WindWidget Migration ✅ COMPLETE
- ✅ Replace useUnitConversion with useWindPresentation
- ✅ Create getWindSpeedDisplay() and getAngleDisplay() helpers
- ✅ Support wind speed presentations (knots/Beaufort/km/h) + angle display
- ✅ Test: wind displays correctly with existing settings dialog

### 2.5 WaterTemperatureWidget Migration ✅ COMPLETE  
- ✅ Replace local unit state with useTemperaturePresentation
- ✅ Remove manual unit toggle (now handled by global settings)
- ✅ Create temperature display using semantic presentation system
- ✅ Test: temperature displays Celsius/Fahrenheit via existing settings dialog

## PHASE 2 COMPLETE! ✅ 🎉

**4 MAJOR WIDGETS MIGRATED:**
- ✅ DepthWidget (meters/feet/fathoms)
- ✅ SpeedWidget (knots/km/h/mph for SOG/STW)  
- ✅ WindWidget (knots/Beaufort/km/h + angles)
- ✅ WaterTemperatureWidget (Celsius/Fahrenheit)

**LEGACY BRIDGE WORKING:** Users can change units through existing hamburger menu → Units dialog

**NEXT PHASE:** New clean settings UI to replace complex legacy dialog

## Phase 3: Settings UI (TODO)
- [ ] 3.1: Create simplified presentation picker component
- [ ] 3.2: Replace UnitsConfigDialog with PresentationConfigDialog
- [ ] 3.3: Update hamburger menu integration

## Phase 4: Cleanup (TODO)
- [ ] 4.1: Remove old useUnitConversion hook (1800+ lines!)
- [ ] 4.2: Remove complex unit definition files  
- [ ] 4.3: Remove legacy bridge (legacyBridge.ts) - TEMPORARY ONLY
- [ ] 4.4: Update tests to use new system
- [ ] 4.5: Documentation update

## CLEANUP PROMISE 🧹
**Legacy Bridge is TEMPORARY** - once all widgets migrate to new presentation system:
1. Remove legacyBridge.ts entirely
2. Remove 1800-line useUnitConversion monster
3. Clean, semantic-only architecture remains

## Benefits
✅ Single Responsibility: Each layer has one clear job
✅ No Mappings: Direct category → presentation → display
✅ Type Safe: Strongly typed presentation IDs
✅ Marine-First: Built for marine data categories
✅ Performance: ~100 lines total vs 1800+

## Current Status: STARTING PHASE 1
