# Story 13.1.1: Fix Red-Night Mode Color Violations

Status: ready-for-dev

## Story

As a **marine navigator using the app at night**,
I want **red-night mode to eliminate all green, blue, and white colors**,
so that **my night vision remains adapted and I can safely navigate in darkness**.

## Acceptance Criteria

1. **Green Color Elimination** - No green colors (#10B981 or similar) visible in red-night mode
   - Status indicator dots must not display green when active
   - Connection indicators must show bright red (#FCA5A5) instead of green
   - Widget status elements must use red spectrum only
   - Visual inspection across all screens confirms zero green colors

2. **Blue and White Color Elimination** - Only red spectrum (625nm wavelength) visible
   - No blue colors (#0EA5E9, #3B82F6, or similar) in red-night mode
   - No white text or backgrounds (#FFFFFF, #F9FAFB, or similar)
   - All text must be red spectrum (heading red, body text dark red)
   - Backgrounds must be dark red (#1C0000, #2D0000) only

3. **Active State Visual Distinction** - Clear differentiation between active/inactive states
   - Active states use bright red (#FCA5A5)
   - Inactive states use dark red (#7F1D1D)
   - Connection status indicator clearly shows connected vs disconnected
   - Widget states (pinned, expanded) remain distinguishable

4. **Theme Color Palette Update** - themeColors.ts red-night palette corrected
   - Remove all green color definitions from red-night palette
   - Update primary/secondary/accent colors to red spectrum
   - Update text colors (heading, body, muted) to appropriate red shades
   - Update status colors (success, warning, error, info) to red spectrum equivalents

5. **Visual Regression Testing** - Validation across all theme modes
   - Screenshots captured in day, night, and red-night modes
   - Side-by-side comparison confirms red-night color compliance
   - All widgets tested (depth, speed, wind, compass, autopilot, GPS, engine, alarms)
   - Settings screens, connection dialogs, status indicators all validated

## Tasks / Subtasks

- [ ] **Task 1: Audit Current Red-Night Mode Violations** (AC: 1, 2)
  - [ ] Subtask 1.1: Visual inspection of all screens in red-night mode
  - [ ] Subtask 1.2: Identify all green color usage (#10B981 status indicators)
  - [ ] Subtask 1.3: Identify all blue color usage (if any)
  - [ ] Subtask 1.4: Identify all white text/background usage
  - [ ] Subtask 1.5: Create violation inventory with file locations

- [ ] **Task 2: Update Theme Color Palette** (AC: 4)
  - [ ] Subtask 2.1: Review src/theme/themeColors.ts red-night palette
  - [ ] Subtask 2.2: Remove green color definitions (#10B981 → #FCA5A5 for active)
  - [ ] Subtask 2.3: Update primary colors to red spectrum (#DC2626 → #7F1D1D)
  - [ ] Subtask 2.4: Update text colors (heading: #FCA5A5, body: #DC2626, muted: #991B1B)
  - [ ] Subtask 2.5: Update status colors (success → bright red, warning → amber red, error → deep red)
  - [ ] Subtask 2.6: Validate background colors (#1C0000, #2D0000, #450A0A)

- [ ] **Task 3: Fix Status Indicator Components** (AC: 1, 3)
  - [ ] Subtask 3.1: Locate connection status indicator component
  - [ ] Subtask 3.2: Replace conditional green color logic with theme.status.active (bright red)
  - [ ] Subtask 3.3: Update inactive state to use theme.status.inactive (dark red)
  - [ ] Subtask 3.4: Test visual distinction between active/inactive states
  - [ ] Subtask 3.5: Update any other status indicators (widget status, alarm indicators)

- [ ] **Task 4: Validate Widget Components** (AC: 2, 3)
  - [ ] Subtask 4.1: Check all widget types in red-night mode (DepthWidget, SpeedWidget, WindWidget, etc.)
  - [ ] Subtask 4.2: Verify no hardcoded colors bypass theme system
  - [ ] Subtask 4.3: Test widget states (pinned, expanded) remain visually distinct
  - [ ] Subtask 4.4: Validate metric cells use theme.text colors properly
  - [ ] Subtask 4.5: Check AutopilotFooter controls in red-night mode

- [ ] **Task 5: Visual Regression Testing** (AC: 5)
  - [ ] Subtask 5.1: Capture screenshots in day mode (baseline)
  - [ ] Subtask 5.2: Capture screenshots in night mode (baseline)
  - [ ] Subtask 5.3: Capture screenshots in red-night mode (validation)
  - [ ] Subtask 5.4: Side-by-side comparison confirms no green/blue/white
  - [ ] Subtask 5.5: Document validation results with screenshots

## Dev Notes

### Architecture Context

**Theme System Integration:**
- `src/theme/themeColors.ts` - Color palette definitions for day/night/red-night modes
- `src/theme/ThemeProvider.tsx` - Theme context provider with mode selection
- `src/hooks/useTheme.ts` - Hook for accessing current theme colors
- Components must always use `theme.status.active` instead of hardcoded `#10B981`

**Known Violation Locations (Preliminary):**
- Connection status indicator (likely in StatusBar or ConnectionIndicator component)
- Potentially in AlarmBanner if using green status dots
- Any widget components with hardcoded success colors

### Red-Night Mode Marine Context

**Marine Safety Standards:**
- **625nm Wavelength:** Red-night mode must use only red spectrum light to preserve scotopic (rod cell) night vision
- **Night Vision Adaptation:** Human eyes take 20-30 minutes to fully adapt to darkness; a single flash of green/blue light destroys adaptation
- **Marine Compliance:** Professional marine instruments universally use red lighting at night (USCG standards)

**Color Science:**
- **Green Light (#10B981):** Peak sensitivity at 555nm (photopic), destroys night vision in <1 second
- **Blue Light (#0EA5E9):** Peak sensitivity at 445nm, even more damaging than green
- **Red Light (#DC2626):** 625-700nm wavelength, minimal scotopic response, preserves night vision

### Theme Color Palette Recommendations

**Current Red-Night Violations (Assumed):**
```typescript
// INCORRECT (current):
redNight: {
  status: {
    success: '#10B981',  // GREEN - VIOLATION
    active: '#10B981',   // GREEN - VIOLATION
  }
}
```

**Corrected Red-Night Palette:**
```typescript
// CORRECT (proposed):
redNight: {
  background: {
    primary: '#1C0000',    // Very dark red
    secondary: '#2D0000',  // Dark red
    tertiary: '#450A0A',   // Medium dark red
  },
  text: {
    heading: '#FCA5A5',    // Bright red (high contrast)
    body: '#DC2626',       // Medium red
    muted: '#991B1B',      // Dark red
  },
  status: {
    active: '#FCA5A5',     // Bright red (replaces green)
    inactive: '#7F1D1D',   // Very dark red
    success: '#FCA5A5',    // Bright red (no green concept)
    warning: '#DC2626',    // Medium red
    error: '#991B1B',      // Dark red (lower priority)
    info: '#DC2626',       // Medium red
  },
  borders: {
    default: '#7F1D1D',    // Dark red
    focus: '#DC2626',      // Medium red
  },
  widgets: {
    background: '#2D0000',
    border: '#7F1D1D',
    text: '#DC2626',
  }
}
```

### Visual Distinction Strategies

**Active vs Inactive Without Green:**
- **Active:** Bright red (#FCA5A5) with potentially larger size or pulsing animation
- **Inactive:** Dark red (#7F1D1D) with potentially smaller size
- **Focused:** Medium red (#DC2626) with red glow or border
- **Disabled:** Very dark red (#450A0A) with 50% opacity

**Widget State Indicators:**
- **Pinned:** Bright red pin icon (#FCA5A5)
- **Unpinned:** Dark red pin icon (#7F1D1D)
- **Expanded:** Bright red caret (#FCA5A5)
- **Collapsed:** Dark red caret (#7F1D1D)

### Testing Approach

**Manual Visual Inspection:**
1. Enable red-night mode in settings
2. Navigate through all screens: Dashboard, Settings, Alarms, Autopilot
3. Check all interactive elements: buttons, toggles, status indicators
4. Verify connection status indicator during connect/disconnect
5. Test widget states: expand, collapse, pin, unpin

**Screenshot Comparison:**
- Use device/simulator screenshot tools
- Capture identical views in all three modes
- Overlay images to detect color channel differences (green channel should be near-zero in red-night)
- Document violations with annotated screenshots

**Automated Testing (Future):**
- Theme compliance test suite (Epic 2 foundation: themeCompliance.ts)
- Pixel color analysis of rendered components
- Assert no RGB values with G > R or B > R in red-night mode

### Project Structure Notes

**Expected File Changes:**
```
src/
├── theme/
│   ├── themeColors.ts                      # PRIMARY: Red-night palette update
│   └── themeCompliance.ts                  # REFERENCE: Existing validation patterns
├── components/
│   ├── atoms/
│   │   └── StatusIndicator.tsx             # LIKELY: Green status dot usage
│   ├── organisms/
│   │   ├── StatusBar.tsx                   # LIKELY: Connection indicator
│   │   └── AlarmBanner.tsx                 # POSSIBLE: Alarm status colors
│   └── dashboard/
│       └── WidgetCard.tsx                  # CHECK: Widget state indicators
└── hooks/
    └── useTheme.ts                          # VERIFY: Theme hook usage patterns
```

**No Breaking Changes Expected:**
- Theme system already abstracts colors
- Components already use theme context (if following best practices)
- Only updates are color palette values in themeColors.ts
- Any hardcoded colors are technical debt violations

### References

**Source Documentation:**
- [Epic 13: VIP Platform UX Implementation - docs/stories/epic-13-vip-platform-ux-implementation.md#Story-13.1.1]
- [Epic 2 Theme System: docs/stories/epic-2-widget-framework.md#Story-2.14]
- [UI Architecture: Theme System - docs/ui-architecture.md#Theme-System]
- [Marine Compliance: docs/ui-architecture.md#Red-Night-Mode-Compliance]

**Component Sources:**
- [Theme Colors: src/theme/themeColors.ts]
- [Theme Provider: src/theme/ThemeProvider.tsx]
- [Theme Hook: src/hooks/useTheme.ts]
- [Theme Compliance: src/theme/themeCompliance.ts]

**Marine Standards:**
- [USCG Navigation Light Standards: Red lighting for night operations]
- [ANSI/ABYC A-16: Lighting for marine electronics]
- [Human Vision: Scotopic (rod) vs Photopic (cone) sensitivity curves]

### Learnings from Previous Story

**From Story 9.5 (Status: review) - FontMeasurementService:**

**Relevant Patterns:**
- ✅ **Theme Integration:** Story 9.5 added cache invalidation in ThemeProvider.tsx (lines 127-130) - demonstrates proper theme system integration point
- ✅ **Performance Considerations:** Cache invalidation on theme changes takes <50ms - no performance concerns for red-night color updates
- ✅ **Testing Approach:** Story 9.5 used comprehensive unit tests + manual validation - similar pattern appropriate for visual color validation

**Key Architectural Insights:**
- **Theme Context Updates Propagate Instantly:** ThemeProvider useEffect triggers re-renders when themeMode changes
- **Component Subscription Pattern:** All components using useTheme() hook automatically re-render with new colors
- **No Widget Restart Required:** Theme changes are reactive without app restart (validates Story 13.1 should be seamless)

**Testing Precedent:**
- Story 9.5 used manual validation with GPSWidget integration test (no visual regression suite)
- This story can follow similar pattern: manual visual inspection + documented screenshots
- Full visual regression suite remains future enhancement opportunity

**Previous Story Status:**
- Story 9.5 is under review with APPROVED status
- No blocking issues reported
- Epic 9 foundation solid for Epic 13 work to begin

[Source: docs/sprint-artifacts/story-9.5-implement-fontmeasurementservice.md#Dev-Agent-Record]

**Story 13.1.1 Strategy:**
Follow Story 9.5 testing precedent with manual visual validation, comprehensive screenshots, and theme compliance verification. Epic 9's theme invalidation infrastructure ensures red-night color updates propagate instantly to all components.

## Dev Agent Record

### Context Reference

- [Story Context XML](13-1-1-fix-red-night-mode.context.xml)

### Agent Model Used

<!-- Agent model version will be recorded during implementation -->

### Debug Log References

<!-- Debug log file paths will be added during implementation -->

### Completion Notes List

<!-- Implementation notes will be added during development -->

### File List

<!-- Modified/created files will be listed during implementation -->

## Change Log

- **2025-11-22**: Story drafted by SM agent (Bob) in #yolo mode based on Epic 13.1.1 requirements
