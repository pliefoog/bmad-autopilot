# Story 2.16: PrimaryMetricCell & SecondaryMetricCell Components - Brownfield Addition

**Status:** ContextReadyDraft

## Story

**As a** marine instrument user,  
**I want** consistent metric display components across all widgets,  
**so that** I can quickly read and understand instrument data with standardized typography and layouts.

## Story Context

**Existing System Integration:**
- Integrates with: Current MetricCell component from Epic 2
- Technology: React Native components + TypeScript interfaces
- Follows pattern: Existing component composition pattern
- Touch points: All instrument widgets, metric display systems

## Acceptance Criteria

**Functional Requirements:**
1. Rename existing MetricCell to PrimaryMetricCell with enhanced props
2. Create new SecondaryMetricCell component for expanded widget views
3. Standardized typography hierarchy (12pt/36pt for primary, 10pt/24pt for secondary)
4. Support for trend indicators and alert states
5. Grid-aware spacing and compact mode support

**Integration Requirements:**
6. Existing MetricCell usage continues to work (renamed to PrimaryMetricCell)
7. New components follow existing component architecture pattern
8. Integration with theme system maintains current behavior
9. All existing widgets use updated components without breaking changes

**Quality Requirements:**
10. Typography scaling works across all screen sizes (validated on 5"-32" displays)
11. Component re-render performance: <16ms per update with 10+ simultaneous widgets
12. Memory usage optimization: <2MB additional heap per component instance
13. Real-time NMEA data updates (2-10Hz) render without performance degradation
14. Alert state transitions complete within 100ms for marine safety compliance
15. Accessibility compliance: Screen reader compatible with descriptive labels
16. Theme integration: Full compatibility with day/night/red-night marine modes
11. Component performance optimized for real-time updates
12. Accessibility props maintained and enhanced

## Tasks

### Phase 1: Component Foundation (Serial Execution)
**Task A: PrimaryMetricCell Core Implementation** (Estimated: 6 hours)
- Create `src/components/common/PrimaryMetricCell.tsx`
- Implement base component structure with props interface
- Add large typography calculations with viewport scaling
- Implement React.memo optimization for performance
- **Dependency**: None (foundational task)

**Task B: SecondaryMetricCell Core Implementation** (Estimated: 4 hours)  
- Create `src/components/common/SecondaryMetricCell.tsx`
- Implement compact typography variant with unit formatting
- Add grid layout optimization features
- Implement React.memo optimization
- **Dependency**: Task A design patterns (can start in parallel after Task A framework established)

### Phase 2: Enhanced Features (Parallel Execution Available)
**Task C: Alert State System** (Estimated: 3 hours)
- Implement alert state props and visual feedback for both components
- Add marine-compliant color transitions (normal→warning→critical)
- Integrate red-night mode compatibility for alert states
- **Dependencies**: Task A + Task B (requires both base components)
- **Parallel Opportunity**: Can execute simultaneously with Task D

**Task D: Trend Indicator System** (Estimated: 3 hours)
- Add trend calculation logic and visual indicators (arrows/colors)
- Implement trend history tracking for direction changes  
- Add trend animation for value transitions
- **Dependencies**: Task A + Task B (requires both base components)
- **Parallel Opportunity**: Can execute simultaneously with Task C

### Phase 3: Integration & Migration (Serial Execution)
**Task E: Widget Integration Strategy** (Estimated: 4 hours)
- Replace MetricCell→PrimaryMetricCell in main widgets (GPS, Depth, Compass)
- Add SecondaryMetricCell usage in multi-metric widgets (Engine, Battery)
- Update widget layout calculations for new typography hierarchy
- **Dependencies**: Task A + Task B + Task C + Task D (requires complete components)

**Task F: Performance Validation & Testing** (Estimated: 3 hours)
- Validate <16ms update performance with 10+ simultaneous widgets
- Test memory usage optimization with real-time NMEA data
- Verify accessibility requirements and theme compatibility
- **Dependencies**: Task E (requires integration completion)

### Dependency Mapping & Optimization
```
Task A (Foundation) → Task E (Integration)
Task B (Foundation) → Task E (Integration)  
Task A + Task B → Task C (Alert States) → Task E
Task A + Task B → Task D (Trend System) → Task E
Task E → Task F (Final Validation)

Parallel Execution: Task C ∥ Task D (40% time savings in Phase 2)
```

### Total Estimated Timeline
- **Serial Execution**: 23 hours
- **Optimized with Parallel**: 20 hours (13% improvement)
- **Critical Path**: Task A → Task E → Task F

## Critical Dependencies

### Blocking Prerequisites
- **Story 2.11 (Widget Layout System)**: Must be completed first
  - Provides grid layout framework required for SecondaryMetricCell optimization
  - Establishes viewport scaling calculations needed for responsive typography
  - **Status Check Required**: Verify Story 2.11 completion before beginning Task A

### Recommended Prerequisites  
- **Story 2.14 (Marine-Compliant Theme System)**: Recommended for alert state integration
  - Provides red-night mode color palette for marine safety compliance
  - Can proceed without, but will require alert state rework later

### Downstream Impact
- **Story 2.15 (Enhanced Widget State Management)**: Will benefit from new metric components
- **Story 6.9 (Theme Provider Context Enhancement)**: Integration point for theme-aware typography

## Dev Notes

**Component Architecture:**
- Current location: `src/components/MetricCell.tsx`
- Usage pattern: All widgets import and use MetricCell for metric display
- Styling: Uses theme context for colors, hardcoded typography sizes
- Grid integration: Components must fit within 1×1 to 2×3 grid layouts

**Typography Specifications:**
```typescript
PrimaryMetricCell:
- mnemonic: 12pt, FontWeight.600, uppercase, theme.colors.textSecondary
- value: 36pt, FontWeight.700, monospace, theme.colors.text
- unit: 12pt, FontWeight.400, regular, theme.colors.textSecondary

SecondaryMetricCell:
- mnemonic: 10pt, FontWeight.600, uppercase, theme.colors.textSecondary
- value: 24pt, FontWeight.700, monospace, theme.colors.text
- unit: 10pt, FontWeight.400, regular, theme.colors.textTertiary
```

**Grid Layout Integration:**
- 1×1 widgets: Single PrimaryMetricCell
- 1×2 widgets: Two PrimaryMetricCells side by side
- 2×1 widgets: PrimaryMetricCell with SecondaryMetricCell below
- 2×2 widgets: Mix of Primary and Secondary components
- 2×3 widgets: Multiple SecondaryMetricCells in compact mode

**Alert State Integration:**
- Normal: Default theme colors
- Warning: Yellow/amber colors in day mode, pulse animation in night modes
- Critical: Red colors in day mode, flicker animation in night modes
- Marine safety: Alert states must work in red-night mode

**Performance Considerations:**
- Components re-render only when props change (React.memo optimization)
- Typography calculations cached to prevent layout thrashing
- Real-time NMEA updates (2-10Hz) must not cause performance issues
- Memory usage minimized for 10+ simultaneous widgets

**Accessibility Requirements:**
- Screen reader support with descriptive labels
- Minimum 44pt touch targets for interactive elements
- High contrast support for marine conditions
- Text scaling support for vision-impaired users

### Testing

**Manual Testing Only:** No automated UI testing for MVP

**Manual Testing Requirements:**
- Test components display correctly with real NMEA data
- Verify typography is readable on different screen sizes
- Test alert state color changes are visible and intuitive
- Verify components follow traditional marine equipment design language

## Change Log

| Date | Version | Description | Author |
|------|---------|-------------|--------|
| 2025-10-16 | 1.0 | Initial story creation for UI Architecture v2.1 implementation | Sarah (PO) |

## Dev Agent Record

*This section will be populated by the development agent during implementation*

### Agent Model Used
*To be filled by dev agent*

### Debug Log References
*To be filled by dev agent*

### Completion Notes List
*To be filled by dev agent*

### File List
*To be filled by dev agent*

## QA Results

*Results from QA Agent review will be populated here after implementation*