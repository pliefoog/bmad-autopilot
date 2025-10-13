# User Interface Design Goals

## Overall UX Vision

The Boating Instruments App replicates the familiar look and feel of physical Raymarine instruments (P70 autopilot controller, i70s displays) while adding modern flexibility through a widget-based architecture. The interface prioritizes **glanceability** (instant data recognition from any distance), **touch-friendliness** (large, easy-to-hit targets for use while boat is moving), and **clarity in all lighting conditions** (day/night/red-night modes). The design philosophy is "familiar instruments, flexible arrangement" - boaters should instantly recognize each widget type while enjoying customization impossible with physical hardware.

## Key Interaction Paradigms

**Widget-Centric Dashboard:**
Users compose their ideal instrument panel by selecting widgets from a library and arranging them freely on a canvas. Phone users swipe between focused widget views or scroll through a vertical list. Tablet/desktop users see multiple widgets simultaneously in a grid layout that adapts to screen real estate.

**Direct Manipulation:**
Drag-and-drop widget placement, corner-drag resizing, and tap-to-configure interactions follow modern UI conventions. No hidden menus or complex navigation - all controls are visible and direct.

**Autopilot Control Zone:**
Autopilot controls (when widget is active) use large, clearly labeled buttons with visual feedback. Critical operations (Tack/Gybe) include countdown timers with prominent abort buttons. Mode switches use toggle-style selectors.

**Contextual Settings:**
Long-press or right-click on widgets reveals contextual menus (configure units, change visualization style, set alarms). Global settings accessible via hamburger menu or settings icon.

## Core Screens and Views

- **Dashboard/Canvas Screen** - Primary view where widgets display NMEA data in real-time (FR4-FR6, FR36)
- **Widget Library/Selector** - Gallery of available widgets to add to dashboard (FR39)
- **First-Run Setup Wizard** - Onboarding flow for WiFi bridge connection and initial widget selection (FR34)
- **Connection Settings** - WiFi bridge IP/hostname configuration and connection status (FR29)
- **Global Settings** - Unit preferences, display mode, alarm configurations (FR28)
- **Playback Mode Screen** - Load/control NMEA recording playback for testing/demo (FR31, FR40)
- **Widget Configuration Modal** - Per-widget settings (units, data source, visualization style) (FR35)
- **Alarm History Screen** - View last 10 triggered alarms (FR41)

## Accessibility: WCAG AA

Target WCAG AA compliance to ensure usability for recreational boaters with vision or motor impairments:
- Minimum 4.5:1 color contrast ratios for text/data
- Touch targets minimum 44x44pt for marine environment use (boat motion, gloves, wet hands)
- Support platform accessibility features (VoiceOver, TalkBack, Windows Narrator, macOS accessibility)
- Red-night mode preserves night vision while maintaining readability
- Keyboard navigation for desktop platforms
- Screen reader compatibility for analog gauges (provide numeric fallback announcements)

## Branding: Marine Instrument Aesthetic

Clean, professional design inspired by Raymarine instrument styling:
- High contrast displays with bold typography
- Analog gauge aesthetics where appropriate (compass roses, bar graphs, needle indicators)
- Nautical color palette: blues, whites, blacks with accent colors for warnings (yellow) and alarms (red)
- Ensure accessible color palette meets WCAG AA contrast requirements
- **Platform conventions apply to chrome only** (navigation, menus, system dialogs) - **widgets maintain consistent Raymarine visual language across all platforms**

## Target Platforms: Web Responsive (Mobile Priority)

- **Primary:** iOS/Android smartphones (5"-6.7" screens) used in cockpit or helm
- **Secondary:** iOS/Android tablets (7"-13" screens) mounted at nav station or helm
- **Tertiary (Phase 1.5):** Windows/macOS desktop/laptop (13"-27" screens) for nav stations with dedicated displays

**Responsive Strategy:**
- **Phone (≤6.7"):** Vertical scroll canvas, 1-2 widgets visible simultaneously
- **Tablet (7"-13"):** Grid layout, 4-9 widgets visible simultaneously depending on widget sizes
- **Desktop (13"+):** Maximize screen real estate, 6-16+ widgets visible simultaneously

All platforms support both portrait and landscape orientations with automatic layout reflow (NFR9).

---
