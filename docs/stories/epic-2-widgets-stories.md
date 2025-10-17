# Epic 2: NMEA2000, Widget Framework & Complete Instrument Suite - User Stories

**Epic Goal:** Add NMEA2000 support (including PGN encapsulation), build extensible widget framework, and implement all 10 core instrument widgets. Deliver a comprehensive instrument display app that boaters can use to monitor all boat parameters from their phone/tablet.

**Timeline:** Month 2-3 (Checkpoint Gate at Month 3)

---

## Story 2.1: NMEA2000 UDP Connection & PGN Parsing

**As a** boater with modern instruments  
**I want** the app to receive NMEA2000 data from my WiFi bridge  
**So that** I can access all my boat's digital instrument data including engine parameters

### Acceptance Criteria

**Functional Requirements:**
1. Connect to WiFi bridges via UDP for NMEA2000 data
2. Parse NMEA2000 PGN messages using @canboat/canboatjs
3. Handle both NMEA0183 and NMEA2000 simultaneously
4. Support common PGNs (127245-rudder, 127250-heading, 127251-rate of turn, etc.)
5. Gracefully handle unknown PGN types

**Integration Requirements:**
6. Uses react-native-udp for UDP connectivity
7. Integrates with existing TCP connection from Epic 1
8. Data flows through same global state system
9. Maintains connection stability for both protocols

**Quality Requirements:**
10. Processes 200+ PGN messages per second efficiently
11. Memory usage stays stable with mixed protocol data
12. Error handling doesn't affect NMEA0183 functionality

### Technical Notes
- **Integration Approach:** Dual protocol support (TCP for 0183, UDP for 2000)
- **Library:** @canboat/canboatjs for PGN parsing and encoding
- **State Management:** Unified data model for both NMEA protocols

### Definition of Done
- [ ] UDP NMEA2000 connection functional
- [ ] PGN parsing works for common message types
- [ ] Dual protocol operation stable
- [ ] Performance meets requirements
- [ ] Error handling robust

---

## Story 2.2: Extensible Widget Framework Architecture

**As a** developer  
**I want** a flexible widget system for instrument displays  
**So that** new instrument types can be easily added and users can customize their dashboard

### Acceptance Criteria

**Architecture Requirements:**
1. Widget base class/interface defines common functionality
2. Widget registry system for dynamic loading
3. Configurable widget properties (size, position, data source)
4. Drag-and-drop widget positioning on dashboard
5. Widget persistence (save/restore layouts)

**Framework Features:**
6. Standardized data binding from NMEA state to widgets
7. Common styling system (day/night/red-night modes)
8. Responsive sizing system for different screen sizes
9. Widget refresh rate management
10. Error boundary isolation (widget crashes don't affect others)

**Developer Experience:**
11. Clear widget development guidelines and templates
12. Type-safe widget properties with TypeScript
13. Hot-reload support during widget development

### Technical Notes
- **Architecture Pattern:** Plugin-based widget system with standardized interfaces
- **State Binding:** Reactive data flow from NMEA state to widget props
- **Layout System:** Flexible grid with drag-and-drop positioning

### Definition of Done
- [ ] Widget base architecture implemented
- [ ] Registration and loading system works
- [ ] Layout management functional
- [ ] Developer documentation complete
- [ ] At least 2 sample widgets demonstrate framework

---

## Story 2.3: Navigation & Position Widgets (GPS, Compass, COG/SOG)

**As a** sailor navigating  
**I want** to see my boat's position, heading, and movement data  
**So that** I can monitor navigation parameters from anywhere on deck

### Acceptance Criteria

**GPS Position Widget:**
1. Displays current lat/lon in multiple formats (DD, DMS, UTM)
2. Shows GPS fix status and satellite count
3. Displays accuracy/HDOP information
4. Updates smoothly without flickering

**Compass Widget:**
5. Shows magnetic and true heading with visual compass rose
6. Displays heading in digital format
7. Smooth compass needle animation
8. Configurable magnetic variation offset

**COG/SOG Widget:**
9. Shows Course Over Ground with visual indicator
10. Displays Speed Over Ground in knots/mph/km/h
11. Shows velocity made good and cross-track error
12. Historical speed trending (last 5 minutes)

**Data Integration:**
13. Uses NMEA0183 GGA, RMC, VTG sentences
14. Uses NMEA2000 PGNs 129025 (position), 127250 (heading)
15. Handles missing or intermittent GPS signals gracefully

### Technical Notes
- **Data Sources:** Multiple NMEA message types for redundancy
- **UI Components:** Custom compass rose, smooth animations
- **Performance:** Efficient rendering for high-frequency position updates

### Definition of Done
- [ ] All three widgets display accurate data
- [ ] Smooth visual updates without lag
- [ ] Multiple data source handling
- [ ] Works in both NMEA protocols
- [ ] UI responsive on all screen sizes

---

## Story 2.4: Environmental Widgets (Depth, Wind, Water Temperature)

**As a** sailor monitoring conditions  
**I want** to see environmental data from my boat's sensors  
**So that** I can make informed decisions about navigation and sail trim

### Acceptance Criteria

**Depth Widget:**
1. Shows current depth with configurable units (feet/meters/fathoms)
2. Displays depth trend (getting deeper/shallower)
3. Visual shallow water warning when configured threshold exceeded
4. Shows depth below keel when offset configured

**Wind Widget:**
5. Displays apparent and true wind speed and direction
6. Visual wind rose with speed/direction indicators
7. Shows wind angle relative to boat heading
8. Configurable units (knots, mph, km/h, m/s)
9. Historical wind data for last 10 minutes

**Water Temperature Widget:**
10. Shows water temperature with configurable units (°F/°C)
11. Temperature trend indicator
12. Historical temperature tracking

**Data Integration:**
13. Uses NMEA0183 DPT (depth), MWV (wind), MTW (temperature)
14. Uses NMEA2000 PGNs for corresponding environmental data
15. Handles sensor failures and invalid readings

### Technical Notes
- **Data Sources:** Multiple environmental sensor inputs
- **Visualization:** Wind rose graphics, trend indicators
- **Thresholds:** Configurable warning levels for safety

### Definition of Done
- [ ] All environmental widgets functional
- [ ] Accurate real-time data display
- [ ] Warning systems operational
- [ ] Historical trending works
- [ ] Multiple unit support verified

---

## Story 2.5: Engine & Systems Widgets (Engine, Battery, Tank Levels)

**As a** powerboater monitoring systems  
**I want** to see engine performance and system status  
**So that** I can ensure safe operation and identify potential issues

### Acceptance Criteria

**Engine Widget:**
1. Shows RPM, engine temperature, oil pressure
2. Displays fuel flow rate and efficiency
3. Engine hours and maintenance alerts
4. Visual warning indicators for out-of-range parameters
5. Support for multiple engines (port/starboard)

**Battery Widget:**
6. Shows voltage, current, and state of charge
7. Displays charging status and alternator output
8. Battery temperature and health indicators
9. Multiple battery bank support
10. Low voltage warnings

**Tank Level Widgets:**
11. Fuel tank levels with visual gauge
12. Fresh water tank levels
13. Waste/gray water tank levels
14. Configurable tank capacities and calibration
15. Low level warnings and usage rate calculations

**Data Integration:**
16. Uses NMEA2000 engine PGNs (127488, 127489, etc.)
17. Uses NMEA2000 electrical PGNs (127506, 127508)
18. Uses NMEA2000 fluid level PGNs (127505)
19. Graceful degradation when sensors unavailable

### Technical Notes
- **Data Sources:** Primarily NMEA2000 for engine/systems data
- **Visualization:** Gauge displays, warning indicators
- **Multi-Engine:** Scalable design for various boat configurations

### Definition of Done
- [ ] Engine monitoring comprehensive and accurate
- [ ] Battery status displays correctly
- [ ] Tank level gauges functional
- [ ] Warning systems operational
- [ ] Multi-engine/battery support verified

---

## Story 2.6: Autopilot Status & Rudder Position Widgets

**As a** sailor using autopilot  
**I want** to monitor autopilot status and rudder position  
**So that** I can verify autopilot operation and manual steering effectiveness

### Acceptance Criteria

**Autopilot Status Widget:**
1. Shows current autopilot mode (off/standby/auto/wind/nav)
2. Displays target heading or wind angle
3. Shows autopilot engagement status clearly
4. Displays error messages from autopilot system
5. Shows GPS/compass source for navigation modes

**Rudder Position Widget:**
6. Shows current rudder angle with visual indicator
7. Displays port/starboard position clearly
8. Shows rudder movement trends
9. Configurable rudder angle limits
10. Visual warnings for extreme rudder positions

**Integration Requirements:**
11. Uses NMEA2000 rudder position PGN (127245)
12. Uses NMEA2000 autopilot status PGNs
13. Displays read-only status (control comes in Epic 3)
14. Works with Raymarine Evolution and other autopilot systems

### Technical Notes
- **Data Sources:** NMEA2000 autopilot and steering PGNs
- **Visualization:** Clear status indicators, rudder angle display
- **Compatibility:** Generic autopilot data interpretation

### Definition of Done
- [ ] Autopilot status displays accurately
- [ ] Rudder position shows correct angle
- [ ] Visual indicators clear and responsive
- [ ] Works with target autopilot systems
- [ ] Read-only monitoring functional

---

## Story 2.7: Widget Dashboard Layout & Customization

**As a** boater with specific monitoring needs  
**I want** to customize my instrument dashboard layout  
**So that** I can prioritize the information most important for my sailing style

### Acceptance Criteria

**Layout Customization:**
1. Drag and drop widgets to rearrange dashboard
2. Resize widgets to different standard sizes
3. Save multiple dashboard layouts (sailing, motoring, anchored)
4. Switch between saved layouts quickly
5. Reset to default layouts

**Dashboard Management:**
6. Add/remove widgets from active dashboard
7. Configure widget-specific settings (units, thresholds, etc.)
8. Preview mode to test layouts without affecting current
9. Export/import layout configurations
10. Responsive adaptation to screen orientation changes

**User Experience:**
11. Visual grid guidelines during layout editing
12. Snap-to-grid functionality for clean alignment
13. Undo/redo for layout changes
14. Layout validation (prevent overlaps, ensure fit)

### Technical Notes
- **Layout Engine:** Flexible grid system with drag-and-drop
- **Persistence:** Layout configurations saved to device storage
- **Responsive Design:** Automatic adaptation to different screen sizes

### Definition of Done
- [ ] Drag-and-drop layout editing works
- [ ] Multiple layout management functional
- [ ] Widget configuration system operational
- [ ] Responsive behavior verified
- [ ] Export/import functionality complete

---

## Story 2.8: Display Modes & Visual Themes

**As a** boater using the app in various lighting conditions  
**I want** different display modes for day, night, and red-night use  
**So that** I can maintain night vision while monitoring instruments

### Acceptance Criteria

**Display Mode Requirements:**
1. Day mode: bright, high-contrast colors
2. Night mode: dark background, reduced brightness
3. Red-night mode: red/black only for night vision preservation
4. Auto mode: switches based on ambient light or time
5. Manual mode switching with quick access

**Visual Implementation:**
6. All widgets support all three display modes
7. Smooth transitions between modes
8. Brightness control integrated with mode selection
9. Status indicators clearly visible in all modes
10. Text remains readable in all lighting conditions

**System Integration:**
11. Mode preference persists across app restarts
12. Mode affects entire UI consistently
13. Quick toggle accessible from main screen
14. Optional auto-switching based on device sensors

### Technical Notes
- **Theme System:** Centralized color management for all widgets
- **Accessibility:** Ensure readability across all modes
- **Performance:** Efficient theme switching without UI lag

### Definition of Done
- [ ] All display modes implemented
- [ ] Widget support for themes complete
- [ ] Mode switching functional
- [ ] Auto-mode logic operational
- [ ] Night vision compliance verified

---

## Story 2.9: Professional Mobile Header & Navigation

**As a** boater using the app on a phone/tablet
**I want** a clean, professional header with intuitive navigation
**So that** I can access settings easily and see connection status at a glance

### Acceptance Criteria

**Header Layout:**
1. Header height: 60pt (accounts for notches on modern phones)
2. Left: Hamburger menu icon (24×24pt, touchable 44×44pt)
3. Center: App title "BMad Instruments" (16pt, semibold, theme.text)
4. Right: Connection status LED only (12pt diameter, no text label)
5. Background: theme.surface with 1pt bottom border (theme.border)

**Connection Status LED:**
6. Colors: Red (disconnected), Orange (connected/no data), Green (active data)
7. Pulsing animation (1s) when connecting
8. Tap LED → opens connection settings modal
9. Accessible label: "Connection status: [state]" for screen readers

**Toast Message System:**
10. Toast overlays center of header (replaces title temporarily)
11. Error messages: Red background, white text, 5s auto-dismiss
12. Warning messages: Orange background, dark text, 5s auto-dismiss
13. Success messages: Green background, white text, 3s auto-dismiss
14. Swipe up to dismiss early

**Hamburger Menu:**
15. Opens slide-in drawer from left (80% screen width)
16. Menu items: Settings, Layouts, Alarms, Connection, About
17. Theme switcher toggle at bottom of drawer
18. Close: swipe left or tap backdrop

### Technical Notes
- Remove status text from App.tsx:128
- Move settings icon to left as hamburger
- Create `<ToastMessage>` component with auto-dismiss
- Create `<HeaderBar>` component using theme colors

### Definition of Done
- [ ] Header matches wireframe layout exactly
- [ ] Connection LED has no text label
- [ ] Toast messages overlay title area
- [ ] Hamburger menu opens settings drawer
- [ ] All theme colors applied (no hardcoded values)
- [ ] Tested on iPhone notch and Android hole-punch displays

## QA Results

### Review Date: October 13, 2025

### Reviewed By: Quinn (Test Architect)

### Code Quality Assessment

**IMPLEMENTATION STATUS: NOT STARTED** - Story 2.9 requirements are not implemented in the current codebase. The existing `src/mobile/App.tsx` contains a basic status header (lines 125-135) but does not match the professional header specifications.

**Current State Analysis:**
- Existing header has connection status with text label (violates AC 4: "no text label")  
- No hamburger menu implementation found (violates AC 2, 15-18)
- No centralized theme usage - hardcoded colors throughout (violates AC 5)
- No toast message system (violates AC 10-14)
- Header height appears to be auto-sizing, not 60pt specification (violates AC 1)

### Requirements Traceability - Test Coverage Gaps

**Critical Missing Tests (P0):**
- Header layout validation (AC 1-5): No tests for 60pt height, positioning, typography
- Connection LED behavior (AC 6-9): No tests for color states, pulsing animation, tap handling
- Toast message system (AC 10-14): No component or tests exist
- Hamburger menu functionality (AC 15-18): No component or tests exist
- Theme integration (AC 5): No tests validating theme.surface, theme.border, theme.text usage

**Missing Given-When-Then Scenarios:**
1. **Given** app loads **When** header renders **Then** height equals 60pt with proper spacing for notches
2. **Given** connection state changes **When** LED updates **Then** shows correct color without text label  
3. **Given** user taps connection LED **When** tap handled **Then** opens connection settings modal
4. **Given** error occurs **When** toast triggered **Then** red overlay appears with 5s auto-dismiss
5. **Given** user taps hamburger **When** menu opens **Then** slide-in drawer shows from left at 80% width

### Compliance Check

- **Coding Standards:** ❌ Hardcoded colors violate theme system requirements
- **Project Structure:** ❌ Missing HeaderBar and ToastMessage components in expected locations
- **Testing Strategy:** ❌ Zero test coverage for UI components specified in story
- **All ACs Met:** ❌ No acceptance criteria have been implemented

### Risk Assessment

**HIGH RISK - Score: 9/10**
- **User Experience Impact:** Professional appearance critical for marine safety application
- **Integration Risk:** Header component affects all screens and theme switching
- **Accessibility Risk:** Screen reader support for connection status is marine safety requirement
- **Technical Debt:** Hardcoded colors will block Epic 2 theme consistency goals

### Architecture Concerns

**Missing Components:**
- `<HeaderBar>` component with proper theme integration
- `<ToastMessage>` component with auto-dismiss functionality  
- Hamburger menu drawer component
- Connection status modal component

**Theme Integration Issues:**
- Current implementation uses hardcoded colors (`#1e293b`, `#0ea5e9`, etc.)
- No integration with existing `themeStore.ts` which provides proper theme system
- Violates Story 2.10 color consistency requirements

### Security Review

- **Accessibility:** Missing screen reader labels for connection status poses safety risk
- **Input Validation:** Toast message content should be sanitized to prevent XSS-style issues

### Performance Considerations

- Header re-renders on every connection status change - needs optimization with React.memo
- Toast auto-dismiss timers need proper cleanup to prevent memory leaks
- Hamburger menu animation should use React Native Reanimated for 60fps performance

### Recommended Implementation Approach

**Phase 1: Core Components**
1. Create `src/components/HeaderBar.tsx` with theme integration
2. Create `src/components/ToastMessage.tsx` with auto-dismiss
3. Create `src/components/HamburgerMenu.tsx` with slide animation

**Phase 2: Integration**  
4. Replace hardcoded header in App.tsx with HeaderBar component
5. Add toast system to global app state
6. Connect hamburger menu to settings navigation

**Phase 3: Testing**
7. Add comprehensive test suite covering all 18 acceptance criteria
8. Test on devices with notches/hole-punch displays
9. Validate theme switching behavior

### Gate Status

Gate: **FAIL** → docs/qa/gates/2.9-professional-mobile-header.yml

**Reason:** Story marked as review-ready but implementation has not started. All 18 acceptance criteria remain unimplemented with zero test coverage for critical UI components.

### Recommended Status

❌ **Implementation Required** - Story needs to return to development phase. Current status should be "In Progress" rather than "Review" until components are built and tested.

---

## Story 2.10: Widget Theme Integration & Color Consistency

**As a** developer maintaining the dashboard
**I want** all widgets to use the centralized theme system
**So that** theme switching (day/night/red-night) works consistently across all widgets

### Acceptance Criteria

**Remove Hardcoded Colors:**
1. Audit all widget files for hardcoded hex colors
2. Replace WidgetCard hardcoded colors:
   - `#e3fbfbff` → `theme.surface`
   - `#020202ff` → `theme.background`
   - `#ffffffff` → `theme.border`
   - All inline colors → theme properties
3. Remove `getDisplayColor()`, `getBorderColor()`, `getBackgroundGlow()` functions
4. State colors use theme: `theme.error`, `theme.warning`, `theme.success`

**Create Widget Stylesheet:**
5. Create `src/styles/widgetStyles.ts` exporting standardized StyleSheet
6. Define reusable styles:
   - `widgetContainer`: base widget wrapper
   - `widgetHeader`: header with title and optional chevron
   - `metricLabel`: mnemonic label style (12pt, uppercase, theme.textSecondary)
   - `metricValue`: primary value style (36pt, monospace, theme.text)
   - `metricUnit`: unit label style (16pt, theme.textSecondary)
7. All widgets import and use `widgetStyles`

**WidgetCard Refactor:**
8. WidgetCard accepts `expanded: boolean` prop
9. WidgetCard shows chevron in header (⌄ collapsed, ⌃ expanded)
10. Remove per-widget status dot from header (line 72)
11. Background uses `theme.surface`, border uses `theme.border`

### Technical Notes
- Update WidgetCard.tsx to use `useTheme()` hook consistently
- Remove all hardcoded colors from styles.compactWidget (lines 98-111)
- Test theme switching with all widgets visible
- Files to update: WidgetCard.tsx, DepthWidget.tsx, EngineWidget.tsx, BatteryWidget.tsx, WindWidget.tsx, and all other widget components

### Definition of Done
- [ ] Zero hardcoded colors in any widget file
- [ ] `widgetStyles.ts` created and used by all widgets
- [ ] Theme switching (day/night/red-night) updates all widgets instantly
- [ ] No per-widget status dots visible
- [ ] WidgetCard header shows expand/collapse chevron

## QA Results

### Review Date: October 13, 2025

### Reviewed By: Quinn (Test Architect)

### Code Quality Assessment

**IMPLEMENTATION STATUS: PARTIALLY STARTED** - Theme integration is inconsistent across widgets. Some widgets (AutopilotControlScreen, WindWidget) properly use theme system, but critical components like WidgetCard.tsx still contain extensive hardcoded colors that violate story requirements.

**Current State Analysis:**
- **WidgetCard.tsx**: Contains 15+ hardcoded hex colors including all specified values (`#e3fbfbff`, `#020202ff`, `#ffffffff`) that should be replaced with theme properties
- **Theme Usage**: Only 2 out of 9+ widgets properly use `useTheme()` hook
- **Missing widgetStyles.ts**: Required standardized stylesheet does not exist (violates AC 5-7)
- **Status Dots**: Still present in WidgetCard header (line 72, violates AC 10)
- **Chevron System**: Missing expand/collapse chevron in header (violates AC 8-9)

### Requirements Traceability - Test Coverage Analysis

**Critical Missing Tests (P0):**
- Theme switching validation (AC 1-4): No tests verify hardcoded color removal
- WidgetStyles integration (AC 5-7): Missing component and tests
- Status dot removal (AC 10): No tests validate dot removal from headers
- Chevron system (AC 8-9): No tests for expand/collapse indicator

**Implemented Requirements:**
- ✅ **AC 1**: Audit found 47 hardcoded hex colors across widget files
- 🔄 **AC 2-4**: Partial - AutopilotControlScreen and WindWidget use theme colors
- ❌ **AC 5-7**: widgetStyles.ts does not exist
- ❌ **AC 8-10**: WidgetCard refactor incomplete - hardcoded colors and status dots remain

**Missing Given-When-Then Scenarios:**
1. **Given** theme mode changes **When** switch activated **Then** all widgets update colors instantly
2. **Given** WidgetCard renders **When** theme applied **Then** uses theme.surface not #e3fbfbff
3. **Given** widget expanded **When** header renders **Then** shows ⌃ chevron, no status dot
4. **Given** widgetStyles imported **When** widget uses styles **Then** consistent typography applied

### Refactoring Analysis

**Immediate Refactoring Required:**
- **WidgetCard.tsx lines 29-57**: Replace `getDisplayColor()`, `getBorderColor()`, `getBackgroundGlow()` functions with theme properties
- **WidgetCard.tsx lines 98-171**: Replace all hardcoded hex values in StyleSheet with theme references
- **All widget files**: Remove hardcoded colors identified in audit (47 instances)

**Architecture Violations:**
- `WidgetCard.tsx` imports `useTheme` (line 4) but doesn't use it consistently
- Status dot system (line 72) contradicts expanded/collapsed design pattern
- Missing standardized widgetStyles breaks component consistency

### Compliance Check

- **Coding Standards:** ❌ Hardcoded colors violate theme system architecture
- **Project Structure:** ❌ Missing `src/styles/widgetStyles.ts` required by story
- **Testing Strategy:** ❌ No theme integration tests exist
- **All ACs Met:** ❌ Only 2 of 11 acceptance criteria completed

### Risk Assessment 

**MEDIUM RISK - Score: 6/10**
- **Theme Consistency:** Mixed implementation prevents unified theme switching
- **Maintenance Debt:** Hardcoded colors in WidgetCard affect all widgets
- **User Experience:** Inconsistent theming breaks professional appearance
- **Epic Dependency:** Blocks Stories 2.11-2.13 that depend on consistent theme system

### Architecture Recommendations

**Phase 1: Complete WidgetCard Theme Integration**
1. Replace hardcoded colors in WidgetCard.tsx with theme properties
2. Remove status dot system, add chevron for expand/collapse indication
3. Create comprehensive tests for theme switching behavior

**Phase 2: Create Standardized Stylesheet**
4. Implement `src/styles/widgetStyles.ts` with complete style definitions
5. Migrate all widgets to use widgetStyles instead of inline styles
6. Add TypeScript interfaces for consistent style contracts

**Phase 3: Validation & Testing**
7. Add visual regression tests for theme switching
8. Test theme switching performance with all widgets loaded
9. Validate accessibility with screen readers across all themes

### Security Review

**No security issues identified** - Theme system changes are presentation-layer only.

### Performance Considerations

- **Theme switching performance**: Current mixed implementation may cause partial updates
- **Style recalculation**: Need memoization in widgetStyles to prevent unnecessary re-renders
- **Memory usage**: StyleSheet.create() should be used consistently across all widgets

### Files Modified During Review

None - analysis only. Development team should update File List after implementation.

### Gate Status

Gate: **CONCERNS** → docs/qa/gates/2.10-widget-theme-integration.yml

**Reason:** Partial implementation with architectural inconsistencies. Some widgets properly use theme while critical WidgetCard component retains hardcoded colors, blocking unified theme switching.

### Recommended Status

🔄 **Partial Implementation - Address Concerns** - Core theme infrastructure exists but WidgetCard.tsx refactor and widgetStyles.ts creation required before marking complete.

---

## Story 2.11: Standardized Metric Presentation Format

**As a** skipper glancing at the dashboard
**I want** all metrics to follow a consistent visual format
**So that** I can quickly parse information without cognitive load

### Acceptance Criteria

**Standard Metric Format:**
1. Every metric displays as: `[MNEMONIC] [VALUE] [UNIT]`
2. Typography:
   - Mnemonic: 10-12pt, uppercase, semibold, theme.textSecondary
   - Value: 36-48pt, monospace, bold, theme.text
   - Unit: 14-16pt, regular, theme.textSecondary
3. Alignment: left-aligned in metric cell
4. Spacing: 4pt between mnemonic and value, 2pt between value and unit

**Flexible Grid Layout:**
5. Single metric: centered, full width
6. Two metrics: 1×2 vertical stack or 2×1 horizontal
7. Four metrics: 2×2 grid
8. Six metrics: 2×3 or 3×2 grid
9. Grid cells equal-sized, 8pt gap between cells

**Example Implementations:**
10. **DepthWidget collapsed**: Shows `DEPTH | 12.4 | m`
11. **EngineWidget collapsed**: 2×2 grid with RPM, TEMP, PRESS, HOURS
12. **BatteryWidget collapsed**: 1×2 with HOUSE and ENGINE voltages
13. **WindWidget collapsed**: `WIND | 12.5 | kn` + wind angle below

**Metric Cell Component:**
14. Create `<MetricCell>` component accepting `{ mnemonic, value, unit, state? }`
15. State colors: `alarm` → theme.error, `warning` → theme.warning, `normal` → theme.text
16. Value uses monospace font to prevent jitter during updates

### Technical Notes
- Refactor DepthWidget.tsx to use MetricCell for primary value
- Refactor EngineWidget.tsx to use 2×2 grid layout
- Create `src/components/MetricCell.tsx`
- Monospace font prevents layout shift during real-time data updates

### Definition of Done
- [ ] MetricCell component created and tested
- [ ] All numeric widgets use MetricCell
- [ ] Consistent typography across all metrics
- [ ] Grid layouts implemented for multi-metric widgets
- [ ] Monospace values prevent layout shift during updates

## QA Results

### Review Date: October 13, 2025

### Reviewed By: Quinn (Test Architect)

### Code Quality Assessment

**IMPLEMENTATION STATUS: NOT STARTED** - Story 2.11 requirements are not implemented. The required MetricCell component does not exist, and current metric presentation is highly inconsistent across widgets with varying typography, alignment, and format patterns.

**Current State Analysis:**
- **MetricCell Component**: Does not exist (violates AC 14-16)
- **Typography Inconsistency**: Multiple font sizes used (10pt, 12pt, 14pt, 18pt, 32pt) without standardization
- **Format Inconsistency**: Some widgets show `VALUE UNIT`, others show `LABEL: VALUE UNIT`, no standardized `MNEMONIC | VALUE | UNIT` format
- **Grid Layouts**: Missing flexible grid system for multi-metric displays (violates AC 5-9)
- **Monospace Issue**: Not consistently applied - some widgets use monospace, others don't

### Requirements Traceability - Implementation Gaps

**Critical Missing Components (P0):**
- **AC 14-16**: MetricCell component with `{ mnemonic, value, unit, state? }` interface
- **AC 1-4**: No widgets follow standardized `[MNEMONIC] [VALUE] [UNIT]` format
- **AC 5-9**: No flexible grid layout system for 1×1, 1×2, 2×2, 2×3, 3×2 arrangements
- **AC 10-13**: Example implementations not matching specification

**Current Implementation Analysis:**
```tsx
// EngineWidget.tsx (lines 88-96) - NON-COMPLIANT FORMAT
<Text style={styles.metricValue}>{coolantTemp}°</Text>
<Text style={styles.metricLabel}>TEMP</Text>
// Should be: TEMP | 85 | °C

// DepthWidget.tsx - NON-COMPLIANT TYPOGRAPHY  
fontSize: 32 (should be 36-48pt for values)
No mnemonic display (should show DEPTH | 12.4 | m)
```

**Typography Violations:**
- EngineWidget: Uses 18pt for values (should be 36-48pt)
- DepthWidget: Uses 32pt for values (acceptable range)
- Labels: Mix of 10pt, 12pt, 14pt (should be standardized 10-12pt)
- Monospace: Inconsistently applied across widgets

### Compliance Check

- **Coding Standards:** ❌ Inconsistent typography patterns across widgets
- **Project Structure:** ❌ Missing `src/components/MetricCell.tsx` component
- **Testing Strategy:** ❌ No tests for metric presentation consistency
- **All ACs Met:** ❌ Zero of 16 acceptance criteria implemented

### Risk Assessment

**MEDIUM RISK - Score: 7/10**
- **User Experience Impact:** Inconsistent metric presentation reduces dashboard readability
- **Cognitive Load:** Multiple format patterns increase learning curve for mariners
- **Safety Concern:** Inconsistent typography may impede quick information parsing in critical situations
- **Epic Blocking:** Dependencies for Stories 2.12 (collapsed widgets) rely on standardized metrics

### Architecture Analysis

**Required Components (Missing):**
```tsx
// Missing: src/components/MetricCell.tsx
interface MetricCellProps {
  mnemonic: string;
  value: string | number;
  unit: string;
  state?: 'alarm' | 'warning' | 'normal';
}
```

**Current Typography Issues:**
- EngineWidget metricValue: 18pt (should be 36pt minimum)
- EngineWidget metricLabel: 10pt (acceptable)
- DepthWidget: Custom sizing without standardization
- WindWidget: Different sizing pattern entirely

**Grid Layout Missing:**
- No flexible grid system for multi-metric widgets
- EngineWidget uses custom flexbox layout instead of standardized grid
- No grid gap standardization (should be 8pt between cells)

### Missing Given-When-Then Test Scenarios

**Critical Test Coverage Gaps:**
1. **Given** MetricCell renders **When** mnemonic/value/unit provided **Then** displays as `MNEM | VAL | UNIT`
2. **Given** metric state changes **When** alarm triggered **Then** uses theme.error color
3. **Given** widget has 4 metrics **When** rendered **Then** uses 2×2 grid with 8pt gaps
4. **Given** metric value updates **When** using monospace **Then** no layout shift occurs
5. **Given** DepthWidget collapsed **When** displayed **Then** shows `DEPTH | 12.4 | m` format

### Refactoring Requirements

**Phase 1: Create MetricCell Component**
1. Implement `src/components/MetricCell.tsx` with proper typography
2. Add state-based coloring using theme system
3. Ensure monospace font for value display

**Phase 2: Grid Layout System**  
4. Create flexible grid component supporting 1×1, 1×2, 2×2, 2×3, 3×2 layouts
5. Implement 8pt gap standardization between grid cells
6. Add responsive sizing for mobile/tablet differences

**Phase 3: Widget Migration**
7. Refactor DepthWidget to use MetricCell for primary value
8. Refactor EngineWidget to use 2×2 grid layout with MetricCell
9. Update BatteryWidget to use 1×2 layout with house/engine voltages
10. Ensure WindWidget uses MetricCell for speed display

### Security Review

**No security issues identified** - Typography and layout changes are presentation-layer only.

### Performance Considerations

- **Monospace Font**: Prevents layout shift during real-time updates (critical for marine instruments)
- **Grid Layout**: Should use React Native's flexbox efficiently, not absolute positioning
- **Re-render Optimization**: MetricCell should use React.memo to prevent unnecessary updates

### Files Modified During Review

None - analysis only. Development team should create components and update File List.

### Gate Status

Gate: **FAIL** → docs/qa/gates/2.11-standardized-metric-presentation.yml

**Reason:** Core story requirement (MetricCell component) not implemented. Current metric presentation lacks standardization across all widgets, preventing consistent user experience.

### Recommended Status

❌ **Implementation Required** - Story needs to return to development phase. MetricCell component must be created and all widgets refactored to use standardized format before review.

---

## Story 2.12: Two-State Widget System (Collapsed/Expanded)

**As a** boater customizing my dashboard
**I want** widgets to start compact but expand to show details when needed
**So that** I can see more data without cluttering the dashboard by default

### Acceptance Criteria

**Widget State System:**
1. All widgets have two states: **Collapsed** (default) and **Expanded**
2. Tap widget body → toggles between states
3. State persists per widget in layout storage
4. Smooth animation (300ms ease-out) when transitioning

**Collapsed State:**
5. Shows primary metrics only (1-4 key values)
6. Base size: 180×180pt (mobile), 200×200pt (tablet)
7. No graphs, charts, or secondary data
8. DepthWidget: shows depth value only
9. EngineWidget: shows RPM, temp, pressure (3 metrics)
10. BatteryWidget: shows house and engine voltage (2 metrics)

**Expanded State:**
11. Shows all metrics from collapsed PLUS advanced visualizations
12. Height increases: 180→280pt (mobile), 200→400pt (tablet)
13. Width stays constant (no horizontal expansion)
14. DepthWidget: adds 60-second depth trend line graph
15. WindWidget: adds wind rose + 10-minute history graph
16. EngineWidget: adds fuel flow, alternator, boost, load metrics

**Visual Indicators:**
17. Chevron in widget header indicates state (⌄ collapsed, ⌃ expanded)
18. Chevron animates rotation (180°) during state change
19. Expanded widgets show subtle elevation (larger shadow)

**Consistent Sizing:**
20. All collapsed widgets: 180×180pt base size
21. All expanded widgets: 180×280pt (single-column) or 180×400pt (multi-column)
22. Prevents messy dashboard with arbitrary widget sizes

### Technical Notes
- Add `expanded: boolean` state to WidgetLayout interface
- Update DepthWidget.tsx to conditionally render trend graph based on expanded state
- Create `<WidgetShell>` component handling tap-to-expand logic
- Store expanded state in layoutService persistence
- Current implementation in EngineWidget.tsx (lines 18, 154) can serve as reference

### Definition of Done
- [ ] All widgets support collapsed/expanded states
- [ ] Tap widget body toggles state with animation
- [ ] Graphs/charts only visible in expanded state
- [ ] Consistent dimensions across all widgets
- [ ] State persists across app restarts
- [ ] Chevron indicator shows current state

## QA Results

### Review Date: October 13, 2025

### Reviewed By: Quinn (Test Architect)

### Code Quality Assessment

**IMPLEMENTATION STATUS: MINIMAL IMPLEMENTATION** - Only EngineWidget has basic toggle functionality (lines 18, 154) but doesn't meet story requirements. No standardized widget state system, no persistence, no animations, and no consistent sizing across widgets.

**Current State Analysis:**
- **WidgetShell Component**: Does not exist (violates AC 1-4, story notes reference missing)
- **State Persistence**: WidgetLayout interface missing `expanded: boolean` field (violates AC 3)
- **Animation System**: No 300ms ease-out transitions (violates AC 4)
- **Chevron Indicators**: No header chevron system (violates AC 17-18)
- **Consistent Sizing**: Widget dimensions are inconsistent (violates AC 20-22)
- **Partial Implementation**: Only EngineWidget has `selectedView` toggle, other widgets lack expand/collapse

### Requirements Traceability - Critical Gaps

**Missing Core Architecture (P0):**
- **AC 1-4**: No standardized widget state system across all widgets
- **AC 3**: WidgetLayout interface missing `expanded: boolean` persistence field
- **AC 4**: No smooth 300ms ease-out animation system
- **AC 17-19**: No chevron rotation indicators in widget headers

**Sizing Violations (P1):**
- **AC 20**: Current widgets use inconsistent base sizes (not 180×180pt)
- **AC 21-22**: No standardized expansion heights (180→280pt or 180→400pt)

**Current Partial Implementation:**
```tsx
// EngineWidget.tsx (lines 18, 154) - NON-COMPLIANT PATTERN
const [selectedView, setSelectedView] = useState<'overview' | 'details'>('overview');
// Should use: const [expanded, setExpanded] = useState(false);

<TouchableOpacity onPress={() => setSelectedView(...)}>
// Should use WidgetShell component with animation
```

### Architecture Analysis - Missing Components

**Required Components (Not Found):**
1. **WidgetShell Component**: Should handle tap-to-expand logic for all widgets
2. **Enhanced WidgetLayout Interface**:
```tsx
// Missing in layoutService.ts:
interface WidgetLayout {
  // ... existing fields
  expanded: boolean; // State persistence
}
```
3. **Animation System**: 300ms ease-out transitions for height changes
4. **Chevron System**: Header indicators showing ⌄ (collapsed) / ⌃ (expanded)

**State Management Issues:**
- No centralized expand/collapse state management
- EngineWidget uses local `selectedView` instead of standardized `expanded` boolean
- No integration with layoutService for persistence

### Compliance Check

- **Coding Standards:** ❌ Inconsistent implementation pattern (only EngineWidget has toggle)
- **Project Structure:** ❌ Missing WidgetShell component in expected location
- **Testing Strategy:** ❌ No tests for expand/collapse functionality or animations
- **All ACs Met:** ❌ 3 of 22 acceptance criteria partially implemented

### Risk Assessment

**MEDIUM RISK - Score: 6/10**
- **User Experience Impact:** Inconsistent widget behavior reduces dashboard usability
- **Performance Risk**: No animation optimization could cause UI lag
- **Data Loss Risk**: No state persistence means user preferences lost on restart
- **Epic Integration**: Missing standardized sizing blocks Stories 2.11-2.13 integration

### Missing Given-When-Then Test Scenarios

**Critical Test Coverage Gaps:**
1. **Given** widget in collapsed state **When** user taps body **Then** expands with 300ms animation
2. **Given** widget in expanded state **When** user taps body **Then** collapses to 180×180pt
3. **Given** DepthWidget expanded **When** rendered **Then** shows trend graph, collapsed shows depth only
4. **Given** app restarts **When** widgets load **Then** maintains previous expanded/collapsed states
5. **Given** widget state changes **When** chevron updates **Then** rotates 180° with animation

### Refactoring Analysis

**Immediate Architecture Changes Required:**

**Phase 1: Create Standardized Components**
1. Create `WidgetShell` component handling tap-to-expand with animation
2. Update `WidgetLayout` interface to include `expanded: boolean` field
3. Add chevron system to WidgetCard header replacing status dot

**Phase 2: Widget Migration**  
4. Refactor EngineWidget from `selectedView` pattern to `expanded` boolean
5. Add expand/collapse to DepthWidget (collapsed: depth only, expanded: + trend graph)
6. Add expand/collapse to WindWidget (collapsed: speed, expanded: + rose + history)
7. Implement consistent 180×180pt collapsed / 180×280pt expanded sizing

**Phase 3: Animation & Persistence**
8. Add React Native Reanimated for 60fps height transitions
9. Integrate expanded state with layoutService persistence
10. Add chevron rotation animation (180° over 300ms)

### Performance Considerations

- **Animation Performance**: Should use React Native Reanimated for native 60fps transitions
- **State Management**: Expanded state changes should not trigger full widget re-renders
- **Memory Usage**: Expanded widgets with graphs/charts need proper cleanup

### Security Review

**No security issues identified** - Widget state changes are presentation-layer only.

### Architecture Recommendations

**WidgetShell Implementation Pattern:**
```tsx
// Missing: src/components/WidgetShell.tsx  
interface WidgetShellProps {
  widgetId: string;
  collapsedHeight: number;
  expandedHeight: number;
  children: (expanded: boolean) => React.ReactNode;
}
```

**Enhanced WidgetLayout:**
```tsx  
// Update: src/services/layoutService.ts
interface WidgetLayout {
  // ... existing fields
  expanded: boolean; // New field for persistence
  collapsedSize: { width: number; height: number };
  expandedSize: { width: number; height: number };
}
```

### Files Modified During Review

None - analysis only. Development team should implement components and update File List.

### Gate Status

Gate: **CONCERNS** → docs/qa/gates/2.12-two-state-widget-system.yml

**Reason:** Partial implementation with architectural inconsistencies. EngineWidget has basic toggle but lacks standardized pattern, animation, persistence, and consistency with other widgets.

### Recommended Status

🔄 **Partial Implementation - Address Architecture** - Core toggle concept exists but needs standardization, WidgetShell component, and integration with persistence system.

---

## Story 2.13: Centralized Theme Stylesheet

**As a** developer adding new widgets
**I want** a centralized stylesheet with all theme-aware styles
**So that** I don't have to redefine common patterns in every widget

### Acceptance Criteria

**Create Theme Stylesheet:**
1. Create `src/styles/theme.stylesheet.ts`
2. Export `createThemedStyles(theme: ThemeColors)` function
3. Includes all common widget styles:
   - Widget container (surface, border, shadow)
   - Header styles (background, text, divider)
   - Metric styles (label, value, unit)
   - Grid layouts (1×1, 1×2, 2×2, 2×3)
   - Button styles (primary, secondary, danger)
   - Status indicator styles (error, warning, success)

**Typography System:**
4. Define standard text styles:
   - `title`: 16pt semibold (widget titles)
   - `mnemonic`: 12pt uppercase bold (metric labels)
   - `valueMonospace`: 36pt monospace bold (primary data)
   - `unit`: 14pt regular (unit labels)
   - `secondary`: 12pt regular (secondary info)
5. All styles use theme colors (no hardcoded values)

**Usage Pattern:**
6. Widgets call `const themedStyles = createThemedStyles(useTheme())`
7. Apply styles: `style={themedStyles.metricValue}`
8. Dynamic theme switching updates all widgets automatically

**Documentation:**
9. Add inline JSDoc comments for each style
10. Create example widget showing all style patterns
11. Update developer documentation with stylesheet usage guide

### Technical Notes
- Pattern similar to Material-UI `makeStyles` but simpler
- Uses React Native StyleSheet.create() for performance
- Memoize style creation to prevent unnecessary recalculation
- Existing themeStore.ts provides the foundation with ThemeColors interface

### Definition of Done
- [ ] `theme.stylesheet.ts` created with complete style set
- [ ] All existing widgets refactored to use themedStyles
- [ ] Zero inline styles with hardcoded colors
- [ ] Documentation updated with usage examples
- [ ] Developer can create new widget using only themedStyles

## QA Results

### Review Date: October 13, 2025

### Reviewed By: Quinn (Test Architect)

### Code Quality Assessment

**IMPLEMENTATION STATUS: NOT STARTED** - Story 2.13 requirements are completely unimplemented. The required `src/styles/theme.stylesheet.ts` does not exist. Current widgets use inconsistent patterns of individual StyleSheet.create() calls mixed with inline theme color overrides.

**Current State Analysis:**
- **theme.stylesheet.ts**: Does not exist (violates AC 1-3)
- **createThemedStyles Function**: Missing centralized style creation pattern (violates AC 2)
- **Individual Widget Patterns**: All widgets define custom StyleSheet.create() instead of using shared styles
- **Developer Experience**: No standardized way to create new widgets with consistent styling (violates AC 9-11)

### Current Anti-Pattern Analysis

**Inconsistent Styling Approach Found:**
```tsx
// AutopilotControlScreen.tsx - Current ANTI-PATTERN
const styles = StyleSheet.create({ /* 50+ custom styles */ });
<Text style={[styles.title, { color: theme.text }]}>

// WidgetCard.tsx - Current ANTI-PATTERN  
const styles = StyleSheet.create({ /* hardcoded colors */ });

// Should be: 
const themedStyles = createThemedStyles(useTheme());
<Text style={themedStyles.title}>
```

**Style Duplication Issues:**
- Multiple widgets define similar `title`, `container`, `header` styles independently
- Typography patterns (16pt semibold, 12pt uppercase, etc.) redefined across widgets
- Grid layout styles custom-implemented instead of standardized

### Requirements Traceability - Missing Implementation

**Critical Missing Components (P0):**
- **AC 1**: `src/styles/theme.stylesheet.ts` file does not exist
- **AC 2**: `createThemedStyles(theme: ThemeColors)` function missing
- **AC 3-6**: No standardized widget container, header, metric, grid, button, or status styles
- **AC 7-8**: No standard typography system with theme integration
- **AC 9**: No `const themedStyles = createThemedStyles(useTheme())` usage pattern
- **AC 11**: No developer documentation or example widgets

### Architecture Analysis - Missing Foundation

**Required Style Categories (All Missing):**
1. **Widget Styles**: container, header, metric (label/value/unit), grid layouts
2. **Typography System**: title, mnemonic, valueMonospace, unit, secondary  
3. **Component Styles**: button (primary/secondary/danger), status indicators
4. **Layout Styles**: 1×1, 1×2, 2×2, 2×3 grid arrangements

**Current Style Management Problems:**
- **Code Duplication**: Similar styles redefined across 9+ widget files
- **Maintenance Burden**: Typography changes require updates across all widgets
- **Inconsistency**: No shared style definitions lead to visual inconsistencies
- **Theme Integration**: Manual inline color overrides instead of theme-aware styles

### Compliance Check

- **Coding Standards:** ❌ Anti-pattern of individual StyleSheet.create() per widget
- **Project Structure:** ❌ Missing required `src/styles/` directory and theme.stylesheet.ts
- **Testing Strategy:** ❌ No tests for centralized styling system
- **All ACs Met:** ❌ Zero of 11 acceptance criteria implemented

### Risk Assessment

**HIGH RISK - Score: 8/10**
- **Developer Efficiency**: No centralized styling blocks new widget development
- **Maintenance Debt**: Style changes require touching all widget files
- **Epic Dependency**: Stories 2.9-2.12 depend on consistent styling foundation
- **Code Quality**: Current anti-pattern violates DRY principle severely

### Missing Given-When-Then Test Scenarios

**Critical Test Coverage Gaps:**
1. **Given** theme changes **When** createThemedStyles called **Then** all styles update with new theme colors
2. **Given** developer creates widget **When** using themedStyles **Then** consistent appearance without custom styling
3. **Given** widget uses themedStyles.title **When** rendered **Then** matches 16pt semibold typography spec
4. **Given** grid layout applied **When** 2×2 style used **Then** equal-sized cells with 8pt gaps
5. **Given** button style applied **When** primary variant used **Then** theme.primary background color

### Architecture Requirements - Implementation Plan

**Phase 1: Create Foundation (Missing)**
```tsx
// Required: src/styles/theme.stylesheet.ts
export const createThemedStyles = (theme: ThemeColors) => StyleSheet.create({
  // Widget Styles
  widgetContainer: { backgroundColor: theme.surface, borderColor: theme.border },
  widgetHeader: { backgroundColor: theme.background, borderBottomColor: theme.border },
  
  // Typography System  
  title: { fontSize: 16, fontWeight: '600', color: theme.text },
  mnemonic: { fontSize: 12, fontWeight: 'bold', color: theme.textSecondary, textTransform: 'uppercase' },
  valueMonospace: { fontSize: 36, fontWeight: 'bold', fontFamily: 'monospace', color: theme.text },
  unit: { fontSize: 14, color: theme.textSecondary },
  
  // Grid Layouts
  grid1x1: { width: '100%' },
  grid1x2: { flexDirection: 'column', gap: 8 },
  grid2x2: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  
  // Button Styles
  buttonPrimary: { backgroundColor: theme.primary },
  buttonSecondary: { backgroundColor: theme.secondary },
  buttonDanger: { backgroundColor: theme.error }
});
```

**Phase 2: Widget Migration (Critical)**
- Refactor all 9+ widgets to use `createThemedStyles(useTheme())`
- Remove individual StyleSheet.create() calls
- Eliminate inline style arrays with theme overrides

**Phase 3: Developer Experience**
- Create example widget demonstrating themedStyles usage
- Add JSDoc documentation for all style definitions
- Create developer guide for new widget creation

### Performance Considerations

- **Memoization**: `createThemedStyles` should be memoized to prevent unnecessary recalculation
- **Style Caching**: StyleSheet.create() should only be called when theme changes
- **Bundle Size**: Centralized styles reduce code duplication and bundle size

### Security Review

**No security issues identified** - Stylesheet centralization is presentation-layer optimization only.

### Developer Experience Impact

**Current Pain Points:**
- New widget developers must define all styles from scratch
- Typography inconsistencies across widgets  
- Theme color changes require manual updates across all widgets
- No style reusability between widgets

**After Implementation:**
- One-line style application: `style={themedStyles.title}`
- Automatic theme switching across all widgets
- Consistent typography and spacing
- Rapid new widget development

### Files Modified During Review

None - analysis only. Development team must create complete stylesheet system and update File List.

### Gate Status

Gate: **FAIL** → docs/qa/gates/2.13-centralized-theme-stylesheet.yml

**Reason:** Core story requirement (theme.stylesheet.ts with createThemedStyles function) completely unimplemented. Current anti-pattern of individual widget StyleSheets blocks developer efficiency and Epic 2 consistency goals.

### Recommended Status

❌ **Implementation Required** - Story must return to development phase. theme.stylesheet.ts foundation must be created and all widgets migrated to centralized styling before review.

---

## Epic 2 Success Criteria & Integration

### Checkpoint Goals (Month 3)
- [ ] All 10 core instrument widgets functional
- [ ] NMEA2000 support operational alongside NMEA0183
- [ ] Widget framework supports easy addition of new instruments
- [ ] Dashboard customization meets user requirements
- [ ] Display modes work in all lighting conditions
- [ ] Professional mobile header with clean navigation (Story 2.9)
- [ ] All widgets use centralized theme system with zero hardcoded colors (Story 2.10)
- [ ] Consistent metric presentation across all widgets (Story 2.11)
- [ ] Collapsed/expanded widget states with smooth transitions (Story 2.12)
- [ ] Centralized theme stylesheet for developer efficiency (Story 2.13)

### Performance Requirements
- [ ] Handles combined NMEA0183/2000 data streams (300+ msg/sec)
- [ ] Widget updates remain smooth with full dashboard
- [ ] Memory usage stable during extended operation
- [ ] Battery life impact minimal on mobile devices

### Integration Validation
- [ ] All widgets work with real NMEA data
- [ ] Framework supports future widget development
- [ ] Layout system scales to various screen sizes
- [ ] Theme system provides accessible visibility

This epic transforms the foundation from Epic 1 into a comprehensive instrument display system that boaters can actually use to replace or supplement their physical instruments.

---

## Story 2.14: Marine-Compliant Theme System - Brownfield Addition

**As a** marine navigator using the app at night,  
**I want** the app to automatically switch to a red-night vision mode,  
**so that** I can preserve my night vision while monitoring critical navigation instruments.

### Acceptance Criteria

**Functional Requirements:**
1. Implement three marine-compliant display modes: Day, Night, and Red-Night
2. Red-Night mode uses only red spectrum colors (no blue/green light emission)
3. Native brightness control integration reduces screen brightness in Night/Red-Night modes
4. Theme validation system prevents non-marine-safe colors in red-night mode

**Integration Requirements:**
5. Existing theme switching functionality continues to work unchanged
6. New theme modes follow existing theme provider pattern
7. Integration with all existing widgets maintains current behavior
8. All existing components automatically inherit new theme modes

**Quality Requirements:**
9. Theme compliance validation catches violations in development
10. Performance impact is negligible during theme switches
11. All existing functionality regression tested across all three modes

### Technical Notes
- **Integration Approach:** Extends existing ThemeProvider with marine-specific color palettes
- **Existing Pattern Reference:** Story 2.8 display modes implementation
- **Key Constraints:** Red-night mode must emit zero blue/green light for night vision preservation

### Definition of Done
- [ ] Three display modes (Day/Night/Red-Night) functional
- [ ] Native brightness integration working
- [ ] Theme validation system operational
- [ ] All existing widgets work in all modes
- [ ] Marine safety compliance verified

---

## Story 2.15: Enhanced Widget State Management - Brownfield Addition

**As a** boat operator monitoring multiple systems,  
**I want** widgets to maintain their expanded/collapsed state and support pinning functionality,  
**so that** I can customize my dashboard layout and have it persist across app sessions.

### Acceptance Criteria

**Functional Requirements:**
1. Widgets support collapsed (primary view) and expanded (secondary view) states
2. Tap gesture toggles between collapsed/expanded states
3. Pin functionality keeps widgets permanently in their current state (expanded or collapsed)
4. Pinned widgets maintain their state across app restarts
5. Related widget expansion (e.g., engine alert expands oil pressure widget)

**Integration Requirements:**
6. Existing widget layout system continues to work unchanged
7. New state management follows existing Zustand store pattern
8. Integration with existing gesture handling maintains current behavior
9. Widget persistence works with existing AsyncStorage system

**Quality Requirements:**
10. State changes persist across app restarts
11. Performance remains smooth with 10+ widgets
12. Gesture handling doesn't interfere with existing interactions

### Technical Notes
- **Integration Approach:** Extends existing WidgetStore with state management actions
- **Existing Pattern Reference:** Story 2.2 widget framework architecture
- **Key Constraints:** Must maintain backward compatibility with existing widget configurations
- **Pin Behavior:** Pinned widgets do NOT auto-collapse - they maintain their state until manually changed

### Definition of Done
- [ ] Widget state management system functional
- [ ] Gesture interactions working correctly
- [ ] Pin functionality operational (no auto-collapse)
- [ ] State persistence working across app restarts
- [ ] No regression in existing widget functionality

---

## Story 2.16: PrimaryMetricCell & SecondaryMetricCell Components - Brownfield Addition

**As a** marine instrument user,  
**I want** consistent metric display components across all widgets,  
**so that** I can quickly read and understand instrument data with standardized typography and layouts.

### Acceptance Criteria

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
10. Typography scaling works across all screen sizes
11. Component performance optimized for real-time updates
12. Accessibility props maintained and enhanced

### Technical Notes
- **Integration Approach:** Extends existing MetricCell with enhanced functionality
- **Existing Pattern Reference:** Current component composition in Epic 2 widgets
- **Key Constraints:** Must maintain API compatibility for existing widget implementations

### Definition of Done
- [ ] PrimaryMetricCell and SecondaryMetricCell components created
- [ ] Typography hierarchy implemented
- [ ] All existing widgets migrated to new components
- [ ] Grid layout support functional
- [ ] Theme integration working