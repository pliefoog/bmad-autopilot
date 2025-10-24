# Epic 9: Enhanced Presentation System
## Unified Metric Display Architecture with Real Font Measurement

**Epic ID:** 9.0
**Priority:** P0 (Critical Architecture Fix)
**Status:** Ready for Development
**Timeline:** 3 stories × 2-3 days each = 1-2 sprints total

---

## Epic Overview

**Problem Solved:** Eliminates dual-system conflicts between legacy `useUnitConversion` (1800+ lines) and new presentation system, replacing complex bridge patterns with unified metric display architecture.

Transform the fragmented presentation layer into a **unified, stable metric display system** with:
- Single source of truth for metric formatting and display
- Real font measurement for pixel-accurate layout stability
- Marine precision standards embedded in presentation definitions
- Simplified component architecture with pre-formatted data flow

---

## Epic Goals

### Primary Goals
1. **Unit Reactivity Fixed** - Settings changes immediately propagate to all widgets
2. **Layout Stability** - Real font measurement prevents number jumping as values change
3. **Marine Precision** - Format patterns ensure professional instrument behavior (xxx.x, x Bf)
4. **Simplified Architecture** - Single `useMetricDisplay` hook eliminates dual-system complexity
5. **Performance Optimized** - Cached measurements, efficient re-renders

### Success Metrics
- ✅ Zero layout jumping when metric values change (depth 42.5 ft → 142.3 ft)
- ✅ Unit changes propagate instantly without widget restart
- ✅ All widgets use consistent formatting patterns (marine precision standards)
- ✅ Performance: <5ms for metric formatting with font measurement
- ✅ Architecture: Single presentation system, no bridge patterns

---

## Technical Architecture

### Core Principle: Single Source of Truth
```
Settings → useMetricDisplay → Pre-formatted MetricDisplayData → Pure Components
```

**Eliminates:**
- Legacy `useUnitConversion` (1800+ lines)
- Bridge pattern complexity (`legacyBridge.ts`)
- Dual-system maintenance burden
- Unit reactivity bugs

### Enhanced Presentation System Components

**1. MetricDisplayData Interface:**
```typescript
interface MetricDisplayData {
  mnemonic: string;       // "SOG", "STW", "DEPTH"
  value: string;          // Pre-formatted "10.5"
  unit: string;           // Unit symbol "kts", "m", "°T"
  rawValue: number;       // Original for debugging
  layout: {
    minWidth: number;     // Prevents jumping
    alignment: 'left' | 'right' | 'center';
  };
  presentation: {
    id: string;           // "kts_1", "wind_kts_1"
    name: string;         // "Knots (1 decimal)"
  };
}
```

**2. Font Measurement Service:**
- Platform-specific text measurement (Canvas API web, native mobile)
- Aggressive caching for performance
- Worst-case width calculations prevent layout jumping

**3. Marine Format Patterns:**
- Speed: "xxx.x kts" with stable width for 0.0-999.9 range
- Wind: "x Bf (Description)" with Beaufort scale integration
- Depth: "xxx.x m" with appropriate decimal precision

---

## Story Breakdown

### Story 9.1: Enhanced Presentation Foundation
**Scope:** Core architecture and measurement service
**Timeline:** 2-3 days
**Key Deliverables:**
- Enhanced presentation definitions with format field
- FontMeasurementService with platform-specific implementation
- useMetricDisplay hook replacing dual systems
- Marine-specific format patterns (speed, wind, depth)

### Story 9.2: Component Migration
**Scope:** Update components to use unified system
**Timeline:** 2-3 days  
**Key Deliverables:**
- PrimaryMetricCell/SecondaryMetricCell accepting MetricDisplayData
- SpeedWidget and WindWidget converted to useMetricDisplay
- Layout stability testing and validation
- Performance benchmarking

### Story 9.3: System Cleanup
**Scope:** Remove legacy architecture and complete migration
**Timeline:** 2-3 days
**Key Deliverables:**
- Remove legacyBridge.ts and deprecate useUnitConversion
- Modern settings integration (direct presentation system)
- Complete widget migration (all remaining widgets)
- Documentation and handoff

---

## Epic Context & Dependencies

### Builds On
- **Epic 2:** Widget framework foundation and theming system
- **Epic 6:** UI Architecture alignment and component standards
- **ui-architecture.md v3.0:** Enhanced Presentation System specification

### Enables
- **Stable Marine UX:** Professional instrument behavior with consistent formatting
- **Settings Reactivity:** Instant unit changes without app restart
- **Performance Optimization:** Cached font measurements reduce render time
- **Future Font Scaling:** Foundation for accessibility and marine readability features

### Architecture Integration
This epic consolidates the Enhanced Presentation System content from `ui-architecture.md` v3.0 into implementable development stories, ensuring the unified metric display architecture replaces the fragmented legacy system.

---

## Risk Mitigation

### Technical Risks
- **Font Measurement Accuracy:** Platform differences in text measurement APIs
  - *Mitigation:* Test on all platforms, fallback to estimated widths
- **Performance Impact:** Real-time font measurement overhead
  - *Mitigation:* Aggressive caching, pre-calculation during app init
- **Migration Complexity:** Converting all existing widgets
  - *Mitigation:* Phased approach, backward compatibility during transition

### Business Risks  
- **Breaking Changes:** Major architecture changes could introduce bugs
  - *Mitigation:* Comprehensive testing, feature flags for rollback
- **Timeline Pressure:** Ambitious 1-2 sprint timeline
  - *Mitigation:* Focus on core widgets first, remaining widgets in future sprint

---

## Success Criteria

### Functional Requirements
1. **Layout Stability:** No visual jumping when metric values change
2. **Unit Reactivity:** Settings changes immediately visible in all widgets
3. **Marine Precision:** Professional formatting patterns (xxx.x, x Bf descriptions)
4. **Performance:** <5ms formatting time with font measurement caching

### Technical Requirements
1. **Architecture Cleanup:** Legacy useUnitConversion completely removed
2. **Single System:** Only useMetricDisplay hook for all metric formatting
3. **Pure Components:** MetricCell components receive pre-formatted data
4. **Font Service:** Production-ready measurement service with caching

### Quality Gates
- ✅ All existing unit tests pass with new architecture
- ✅ Performance benchmarks meet <5ms formatting requirement
- ✅ Visual regression testing shows no layout jumping
- ✅ Settings reactivity validated on all widget types

---

**Epic Ready for Development - Architecture Comprehensive and Implementation Strategy Defined**

This epic transforms the presentation layer from a fragmented, dual-system approach into a unified, professional marine instrument display system that meets both technical performance requirements and marine user experience standards.
