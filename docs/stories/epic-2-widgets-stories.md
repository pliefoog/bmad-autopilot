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

## Epic 2 Success Criteria & Integration

### Checkpoint Goals (Month 3)
- [ ] All 10 core instrument widgets functional
- [ ] NMEA2000 support operational alongside NMEA0183
- [ ] Widget framework supports easy addition of new instruments
- [ ] Dashboard customization meets user requirements
- [ ] Display modes work in all lighting conditions

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