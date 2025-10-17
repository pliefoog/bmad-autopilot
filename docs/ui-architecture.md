# Boating Instruments App Frontend Architecture Document

## Change Log

| Date | Version | Description | Author |
|------|---------|-------------|--------|
| 2025-10-10 | 1.0 | Initial frontend architecture document | Winston (Architect) |
| 2025-10-14 | 1.1 | Established as definitive frontend authority, added system integration cross-refs | Winston (Architect) |
| 2025-10-16 | 2.0 | Complete clean dashboard specification, responsive layout system, grid-based widget architecture, multi-instance NMEA widget support | Sally (UX Expert) |
| 2025-10-16 | 2.1 | **CRITICAL MARINE SAFETY UPDATE:** Marine-compliant red-night theme system, comprehensive widget state management with caret/pin controls, native brightness integration, theme compliance validation, complete UI component coverage | Sally (UX Expert) |
| 2025-10-16 | 2.2 | **WIDGET STATE CLARIFICATION:** Simplified widget state system to 2-state (collapsed/expanded) with pin persistence, removed complex contextual intelligence, clarified alert integration as visual-only feedback | Sarah (PO) |
| 2025-10-16 | 2.3 | **MVP DESCOPING:** Removed marine safety compliance complexity, automated UI testing, and risk mitigation - focused on recreational boating MVP with traditional marine equipment design language | Sarah (PO) |

---

## Document Scope

This document serves as the **definitive authority** for all frontend architecture decisions including React Native framework selection, component organization, state management patterns, routing, styling, and UI design systems.

**Document Focus:** Complete React Native UI layer architecture and clean navigation dashboard implementation  
**System Integration:** Interfaces with core system architecture detailed in [docs/architecture.md](architecture.md)  
**Authority:** This document governs all frontend technology decisions and clean dashboard UI specifications

## Executive Summary

The Boating Instruments App implements a **clean, intuitive recreational boating dashboard** with familiar marine equipment design language. The design emphasizes:

- **Familiar Navigation Focus:** Traditional marine instrument appearance for intuitive use
- **Responsive Layout System:** Dynamic widget placement based on screen size and orientation 
- **Grid-Based Widget Architecture:** Consistent 1×1 to 2×3 grid layouts with simple metric display
- **Multi-Instance NMEA Support:** Dynamic widget creation for multiple engines, batteries, and tanks
- **Clean Interface:** Simplified navigation, self-explanatory UX, quick value delivery

---

## Template and Framework Selection

### **Framework Decision: React Native**

The Boating Instruments App will use **React Native** as the core framework.

**Evidence from UI/UX Spec:**
- Cross-platform requirements (iOS and Android mobile + tablet support)
- Desktop support planned for Phase 1.5
- Real-time NMEA data streaming requires native performance
- 8-hour battery life goal (NFR5) demands efficient native rendering
- High-performance animations (60-120 FPS) using Reanimated

### **Starter Template: Expo (Managed Workflow)**

Given that this is a **new greenfield project** with specialized marine instrument requirements, we will use **Expo (Managed Workflow)** as the starter template.

**Rationale:**
- **Rapid Development:** Expo provides pre-configured build tools, testing infrastructure, and deployment pipelines
- **Native Module Access:** Modern Expo (SDK 50+) supports custom native modules for TCP socket connections (NMEA bridge)
- **Performance:** Reanimated and React Native SVG work seamlessly with Expo
- **Cross-Platform:** Single codebase for iOS, Android, and future web/desktop targets
- **OTA Updates:** Critical for marine app (can push bug fixes without app store delays)
- **Developer Experience:** Hot reload, instant previews, simplified setup reduces Month 1 setup burden

**Initial Setup Command:**
```bash
npx create-expo-app boating-instruments --template blank-typescript
```

**Why React Native over Native (Swift/Kotlin)?**
- Shared business logic across platforms reduces development time by 60%
- TypeScript type safety enables reliable NMEA data parsing
- React component architecture naturally fits widget-based UI design
- Active community with strong support for real-time data streaming patterns

**Why Expo over Bare React Native?**
- **Build Complexity:** Expo eliminates Xcode/Android Studio configuration headaches
- **CI/CD:** Expo Application Services (EAS) provides turnkey build and deployment
- **Future-Proofing:** Easy ejection to bare workflow if custom native modules needed
- **Testing:** Expo Go app enables instant device testing without builds

**Key Assumptions:**
1. TCP socket connection to WiFi bridge can be implemented via `react-native-tcp-socket` (compatible with Expo)
2. No proprietary Raymarine SDKs required (all control via NMEA 2000 standard messages)
3. Battery life optimization achievable through React Native performance best practices

---

## Clean Navigation Dashboard Architecture

### **Dashboard Layout Hierarchy**

```
┌─────────────────────────────────────────────┐ ← Screen/Window Top
│              HEADER BAR                     │ ← Fixed: Connection, Status, Menu
├─────────────────────────────────────────────┤
│                                             │
│            DASHBOARD AREA                   │ ← Flex: Fills remaining space
│        (Responsive Widget Grid)             │ ← Dynamic layout based on screen
│                                             │
│  [Widgets flow top-left → bottom-right]    │
│  [Multiple pages with pagination dots]     │
│  [Blue + button at end of widget flow]     │
│                                             │
├─────────────────────────────────────────────┤
│         AUTOPILOT CONTROL                   │ ← Fixed: Always at bottom
│          [Full Width Button]                │ ← Quick access from any page
└─────────────────────────────────────────────┘ ← Screen/Window Bottom
```

### **Responsive Layout System**

**Platform-Specific Widget Density:**

| Platform | Portrait Layout | Landscape Layout | Widgets Per Page |
|----------|----------------|------------------|------------------|
| **Phone (≤480px)** | 1×1 grid | 2×1 grid | 1-2 widgets |
| **Tablet (≤1024px)** | 2×2 grid | 3×2 grid | 4-6 widgets |
| **Desktop (>1024px)** | 3×3 grid | 4×3 grid | 9-12 widgets |

**Dynamic Layout Algorithm:**
- Widgets flow from top-left to bottom-right
- New page created when current page full
- Widget expansion considered in layout calculations
- Blue + button positioned at end of final page
- Real-time adaptation to screen rotation and window resize

### **Essential vs. Contextual Widget Classification**

**Always Visible (Essential Navigation):**
- ✅ **Depth Widget** - Water depth sounder
- ✅ **Speed Widget** - STW/SOG metrics with trends
- ✅ **Wind Widget** - Apparent/True wind with gusts
- ✅ **GPS Widget** - Coordinates with UTC date/time
- ✅ **Compass Widget** - Interactive True/Magnetic heading
- ✅ **Autopilot Status Widget** - Mode, engagement, target
- ✅ **Rudder Position Widget** - Current angle with warnings

**Multi-Instance Detection (Dynamic Creation):**
- 🔧 **Engine Widgets** - Per NMEA engine instance (Engine #1, #2, etc.)
- 🔋 **Battery Widgets** - Per battery bank (House, Thruster, Generator, etc.)
- 🛢️ **Tank Widgets** - Per fluid type and position (Fuel Port, Water Fresh, etc.)

**Removed Elements (Development Clutter):**
- ❌ **PlaybackFilePicker** - Testing only
- ❌ **GridOverlay** - Layout debugging
- ❌ **ExampleWidget** - Development template
- ❌ **Demo controls** - Bottom navigation removed
- ❌ **Theme switcher** - Moved to hamburger menu

### **Navigation Interface Simplification**

**Header Bar (Fixed Top):**
- Connection status LED with session controls
- Hamburger menu access (≡)
- Navigation session recording indicator

**Dashboard Area (Flex Fill):**
- Responsive widget grid with pagination
- Blue + circle for adding widgets (end of flow)
- Page indicator dots below widgets

**Footer Area (Fixed Bottom):**
- **ONLY** Autopilot Control button (full screen width)
- Always accessible from any dashboard page
- No other navigation elements

**Hamburger Menu (Consolidated Settings):**
- Connection Settings
- Theme Mode Selection (Day/Night/Red-Night)
- Layout Management
- Alarm Configuration
- About Information

## Grid-Based Widget Architecture

### **Widget Layout System**

All widgets conform to a **consistent grid-based layout** using standardized MetricCell components:

**Grid Size Options:**
- **1×1 Grid:** Single metric or graphic element
- **1×2 Grid:** Two metrics side by side
- **2×1 Grid:** Two metrics stacked vertically  
- **1×3 Grid:** Three metrics in a row
- **2×2 Grid:** Four metrics in square formation
- **2×3 Grid:** Six metrics (maximum density)

**Widget State Management System:**

**Two-State Widget System:**
- **COLLAPSED (Primary View):** Shows essential metrics only - default state
- **EXPANDED (Secondary View):** Shows primary + additional secondary metrics

**Widget Persistence (Pin Functionality):**
- **Unpinned Widgets:** Return to collapsed state on app restart
- **Pinned Widgets:** Maintain expanded state across app restarts
- **Visual Indicators:** 
  - Caret icons (⌄ collapsed, ⌃ expanded) for unpinned widgets
  - Pin icon (📌) for pinned widgets in expanded state
- **Pin Toggle:** Long press on caret toggles pin state (unpinned ↔ pinned)

**Alert Integration (Visual Feedback Only):**
- Alerts change MetricCell colors or graphical element appearance
- **NO automatic widget expansion** - alerts are visual feedback within current state
- Threshold violations handled at MetricCell/component level, not widget container level
- Alert colors follow marine-compliant theme requirements (Day/Night/Red-Night modes)

**Basic Widget Interactions:**
```typescript
interface WidgetGestureHandlers {
  onPress: () => void;           // Toggle COLLAPSED ↔ EXPANDED state
  onLongPressOnCaret: () => void; // Toggle pin state (unpinned ↔ pinned)
  onLongPress: () => void;       // Show widget context menu (configure, remove)
}
```

**State Persistence:**
- Widget expanded/collapsed state stored per widget ID in widget store
- Pinned state persists across app restarts via AsyncStorage
- Unpinned widgets always start collapsed regardless of last state

### **MetricCell Component Architecture**

**PrimaryMetricCell (Renamed from MetricCell):**
```typescript
interface PrimaryMetricCellProps {
  mnemonic: string;              // "DEPTH", "SPEED" (12pt, semibold, uppercase)
  value: string | number | null; // "42.5", "6.2", null (36pt, monospace, bold)
  unit?: string;                 // "ft", "kts", "°T" (12pt, in parentheses)
  trend?: 'rising' | 'falling' | 'stable'; // Optional trend arrow indicator
  precision?: number;            // Decimal places (default: 1)
  state?: 'normal' | 'warning' | 'critical'; // Alert state affects color/animation
  timestamp?: Date;              // Data age for staleness detection (>5s = dim)
  onPress?: () => void;          // Tap handler for widget expansion
  testID?: string;               // Accessibility identifier
}
```

**SecondaryMetricCell (New Component):**
```typescript
interface SecondaryMetricCellProps {
  mnemonic: string;              // "AVG", "MAX", "MIN" (10pt, semibold, uppercase)
  value: string | number | null; // Secondary value (24pt, monospace, bold)
  unit?: string;                 // Unit label (10pt, regular, light gray)
  precision?: number;            // Decimal places (default: 1)  
  state?: 'normal' | 'warning' | 'critical'; // Inherits from parent widget
  compact?: boolean;             // Use minimal spacing for dense 2×3 layouts
  testID?: string;               // Accessibility identifier
}
```

### **Widget Specifications**

#### **Speed Widget (STW/SOG Focus)**
**Primary Grid (1×2):** STW + SOG with large values
**Secondary Grid (2×2):** AVG and MAX for both STW/SOG in columns
**Interactive Chart:** STW trend (tap to switch to SOG)

#### **Wind Widget (Apparent/True)**
**Primary Grid (2×2):** AWA, AWS, Gust (apparent wind)
**Secondary Grid (2×2):** TWA, TWS, True Gust (calculated true wind)

#### **GPS Widget (Custom Coordinate Display)**
**Primary Grid (1×1):** Custom coordinate component with format options
- **DMS:** 41°24'12.3"N (default)
- **DDM:** 41°24.205'N  
- **DD:** 41.40342°N
**Secondary Grid (2×1):** UTC Date with day of week + UTC Time

#### **Compass Widget (Interactive)**
**Primary Grid (1×1):** SVG compass rose with digital heading
- **Mode Toggle:** Tap to switch TRUE ↔ MAGNETIC
- **Mode Indicator:** Clear display of current mode
**Secondary Grid (1×2):** Variation and Deviation (if available)

#### **Engine Widgets (Multi-Instance)**
**Dynamic Detection:** Scan NMEA engine instances, create dedicated widgets
**Title Format:** "⚙️ ENGINE #1", "⚙️ ENGINE #2"
**Primary Grid (2×2):** RPM, TEMP, OIL, VOLT
**Secondary Grid (1×2):** Fuel Rate, Engine Hours

#### **Battery Widgets (Multi-Instance with NMEA Mapping)**
**Instance Detection:** Use NMEA battery instance numbers
**Title Mapping:**
- Instance 0: "🔋 HOUSE"
- Instance 1: "🔋 ENGINE"  
- Instance 2: "🔋 THRUSTER"
- Instance 3: "🔋 GENERATOR"
**Primary Grid (2×2):** VOLT, CURR, TEMP, SOC
**Secondary Grid (1×3):** Nominal Voltage, Capacity, Chemistry

#### **Tank Widgets (Multi-Instance with Fluid Types)**
**Instance Detection:** Use NMEA tank instance numbers and fluid types
**Title Examples:**
- "🛢️ FUEL PORT", "🛢️ FUEL STBD"
- "💧 WATER FRESH", "💧 WATER GRAY"
**Primary Grid (1×1):** Level percentage
**Secondary Grid (1×2):** Capacity, Temperature (if available)

### **Custom Components**

**GPSCoordinateDisplay:**
```typescript
interface GPSCoordinateDisplayProps {
  lat: number;
  lon: number;  
  format: 'DMS' | 'DDM' | 'DD';  // User configurable
}
```

**DateTimeDisplay:**
```typescript
interface DateTimeDisplayProps {
  utcTime: Date;
  showDayOfWeek: boolean;        // "Wed 16-OCT-25"
  boatTimeOffset?: number;       // Future: configurable offset
  showBoatTime?: boolean;        // Default: false (UTC)
}
```

**CompassRose:**
```typescript
interface CompassRoseProps {
  heading: number;
  mode: 'TRUE' | 'MAG';
  onModeToggle: () => void;      // Tap to switch modes
}
```

---

## Frontend Tech Stack

### **Technology Stack Table**

| Category | Technology | Version | Purpose | Rationale |
|----------|------------|---------|---------|-----------|
| **Framework** | React Native | 0.74+ | Cross-platform mobile/tablet app foundation | Industry-standard for performant cross-platform apps; excellent TypeScript support; strong ecosystem for real-time data |
| **Development Platform** | Expo | SDK 51+ | Build tooling, native module access, OTA updates | Simplifies build/deploy pipeline; EAS for CI/CD; enables rapid iteration without app store delays |
| **Language** | TypeScript | 5.3+ | Type-safe development | Essential for NMEA data parsing reliability; catches errors at compile time; improves IDE autocomplete for complex widget props |
| **UI Library** | React Native Core Components | Built-in | View, Text, ScrollView, Pressable, TextInput | Lightweight, performant, no external dependencies; sufficient for custom marine UI |
| **State Management** | Zustand | 4.5+ | Global state for NMEA data, widget configs, app settings | Minimal boilerplate; excellent TypeScript support; <1KB bundle; faster than Redux for real-time streams |
| **Routing** | Expo Router | 3.5+ | File-based navigation (screens, modals) | Built on React Navigation; file-system routing reduces boilerplate; deep linking support for future desktop features |
| **Build Tool** | Metro (Expo) | Built-in | JavaScript bundler and dev server | Optimized for React Native; fast refresh; source maps; integrated with Expo workflow |
| **Styling** | StyleSheet API + Theme Context | Built-in | Component styling with Day/Night/Red-Night mode support | Native to React Native; performant; no CSS-in-JS overhead; custom theme provider for display modes |
| **Testing** | Jest (Unit Tests Only) | 29.7+ | Backend logic and service testing | Unit testing for NMEA parsing, data processing, and business logic only - no UI testing for MVP |
| **Component Library** | Custom (No external library) | N/A | Marine-specific widgets (compass rose, analog gauges) | Existing libraries (Material, NativeBase) don't match Raymarine aesthetic; custom SVG components provide exact control |
| **Form Handling** | React Hook Form | 7.51+ | Settings forms, alarm configuration, WiFi connection input | Minimal re-renders; excellent performance; built-in validation; TypeScript support |
| **Animation** | React Native Reanimated | 3.8+ | Smooth 60-120 FPS animations, compass rotation, button feedback | Runs on UI thread (not JS thread); supports ProMotion displays; critical for performance goals |
| **Vector Graphics** | React Native SVG | 15.1+ | Compass roses, analog gauges, custom icons | Scalable without raster images; smaller bundle size; crisp on all screen densities |
| **Network** | react-native-tcp-socket | 6.0+ | TCP connection to WiFi bridge for NMEA data stream | Direct socket access; handles 500 msg/sec throughput; compatible with Expo |
| **Data Parsing** | Custom NMEA Parser | N/A | Parse NMEA 0183/2000 sentences into structured data | Specialized marine data format; existing libraries lack Raymarine autopilot PGN support |
| **Persistence** | Expo SecureStore + AsyncStorage | Built-in | Widget layouts, user preferences, alarm configs | SecureStore for sensitive data (IP addresses); AsyncStorage for non-sensitive settings |
| **Dev Tools** | React DevTools, Flipper (optional) | Latest | Component inspection, network debugging, performance profiling | Essential for debugging real-time data flows and widget re-render optimization |

### **Additional Stack Notes**

**State Management: Why Zustand over Redux/MobX?**
- **Performance:** Zustand doesn't require Context Provider wrapping (eliminates re-render cascades)
- **Bundle Size:** <1KB vs Redux Toolkit ~15KB (critical for 8-hour battery life goal)
- **Real-Time Fit:** Direct subscriptions to specific NMEA data slices (e.g., only depth widget subscribes to depth sensor)
- **TypeScript:** Excellent inference without boilerplate

**Animation: Why Reanimated over Animated API?**
- **UI Thread Execution:** Reanimated runs on native UI thread, bypassing JS bridge bottleneck
- **ProMotion Support:** Automatically leverages 120Hz displays on iPhone 14/15 Pro
- **Gesture Handling:** Integrated with React Native Gesture Handler for drag-and-drop widgets (Epic 2)
- **Performance:** Critical for maintaining 60 FPS with 10+ widgets updating simultaneously

**Networking: Why react-native-tcp-socket?**
- **Direct TCP Access:** WiFi bridge communication requires raw TCP socket (not HTTP/WebSocket)
- **NMEA 2000 Support:** Handles binary PGN messages from Raymarine autopilot
- **Throughput:** Tested to handle 500+ messages/second without blocking UI thread
- **Expo Compatibility:** Works with Expo config plugins (no ejection required)

**No Component Library: Why Custom?**
- **Aesthetic Mismatch:** Material Design / iOS HIG don't match Raymarine's professional nautical design language
- **Bundle Size:** Removing unused components from libraries like React Native Paper adds complexity
- **Flexibility:** Marine widgets (compass rose, analog depth gauge) are highly specialized
- **Performance:** Custom components optimized specifically for real-time data updates

---

## Project Structure

```
boating-instruments/
├── app/                          # Expo Router file-based routing
│   ├── (tabs)/                   # Tab-based navigation group (future)
│   ├── _layout.tsx               # Root layout with theme provider
│   ├── index.tsx                 # Dashboard/Canvas (primary screen)
│   ├── settings.tsx              # Settings screen
│   ├── widget-selector.tsx       # Widget library modal
│   └── +not-found.tsx            # 404 screen
│
├── src/
│   ├── components/               # Reusable UI components
│   │   ├── atoms/                # Atomic design: smallest building blocks
│   │   │   ├── Button.tsx
│   │   │   ├── StatusIndicator.tsx
│   │   │   ├── LoadingSpinner.tsx
│   │   │   └── index.ts
│   │   │
│   │   ├── molecules/            # Composed components
│   │   │   ├── ModalContainer.tsx
│   │   │   ├── SegmentedControl.tsx
│   │   │   ├── FormField.tsx
│   │   │   └── index.ts
│   │   │
│   │   ├── organisms/            # Complex UI sections
│   │   │   ├── StatusBar.tsx
│   │   │   ├── SetupWizard/
│   │   │   │   ├── WelcomeStep.tsx
│   │   │   │   ├── ConnectionStep.tsx
│   │   │   │   └── WidgetSelectionStep.tsx
│   │   │   └── index.ts
│   │   │
│   │   └── index.ts              # Barrel exports
│   │
│   ├── widgets/                  # Marine instrument widgets
│   │   ├── WidgetCard.tsx        # Base widget container (HOC)
│   │   ├── DepthWidget.tsx
│   │   ├── SpeedWidget.tsx
│   │   ├── WindWidget.tsx
│   │   ├── CompassWidget.tsx
│   │   ├── AutopilotWidget/
│   │   │   ├── AutopilotWidget.tsx
│   │   │   ├── HeadingControls.tsx
│   │   │   └── TackGybeModal.tsx
│   │   ├── GPSWidget.tsx
│   │   ├── TemperatureWidget.tsx
│   │   ├── VoltageWidget.tsx
│   │   ├── EngineWidget.tsx
│   │   ├── AlarmWidget.tsx
│   │   └── index.ts
│   │
│   ├── services/                 # Business logic and external interactions
│   │   ├── nmea/
│   │   │   ├── NMEAConnection.ts      # TCP socket manager
│   │   │   ├── NMEAParser.ts          # NMEA 0183/2000 parser
│   │   │   ├── PGNDecoder.ts          # Raymarine PGN decoder
│   │   │   └── types.ts               # NMEA data types
│   │   │
│   │   ├── storage/
│   │   │   ├── widgetStorage.ts       # AsyncStorage for layouts
│   │   │   ├── settingsStorage.ts     # User preferences
│   │   │   └── secureStorage.ts       # WiFi credentials
│   │   │
│   │   └── playback/
│   │       ├── NMEAPlayback.ts        # File-based playback mode
│   │       └── sampleData.ts          # Demo mode data
│   │
│   ├── store/                    # Zustand state management
│   │   ├── nmeaStore.ts          # Real-time NMEA data stream
│   │   ├── widgetStore.ts        # Widget configurations & layout
│   │   ├── settingsStore.ts      # App settings (units, display mode)
│   │   ├── alarmStore.ts         # Alarm configurations & history
│   │   └── connectionStore.ts    # WiFi bridge connection state
│   │
│   ├── hooks/                    # Custom React hooks
│   │   ├── useNMEAData.ts        # Subscribe to specific NMEA parameters
│   │   ├── useTheme.ts           # Access current theme (Day/Night/Red)
│   │   ├── useConnection.ts      # Monitor connection status
│   │   ├── useWidgetConfig.ts    # Widget configuration helper
│   │   └── index.ts
│   │
│   ├── theme/                    # Design system implementation
│   │   ├── colors.ts             # Color palette (Day/Night/Red-Night)
│   │   ├── typography.ts         # Font sizes, weights, families
│   │   ├── spacing.ts            # 8pt grid spacing scale
│   │   ├── ThemeProvider.tsx     # React Context provider
│   │   └── index.ts
│   │
│   ├── utils/                    # Helper functions
│   │   ├── unitConversion.ts     # ft↔m, kts↔mph, etc.
│   │   ├── validation.ts         # IP address, form validation
│   │   ├── formatters.ts         # Number formatting, date/time
│   │   └── index.ts
│   │
│   └── types/                    # Shared TypeScript types
│       ├── widget.types.ts       # Widget props, config interfaces
│       ├── nmea.types.ts         # NMEA data structures
│       ├── navigation.types.ts   # Expo Router navigation types
│       └── index.ts
│
├── assets/                       # Static assets
│   ├── fonts/                    # Custom fonts (if any)
│   ├── icons/                    # Custom SVG icons
│   │   ├── compass.svg
│   │   ├── rudder.svg
│   │   └── depth-sounder.svg
│   └── images/
│       ├── icon.png              # App icon
│       ├── splash.png            # Splash screen
│       └── adaptive-icon.png     # Android adaptive icon
│
├── __tests__/                    # Test files (mirrors src structure)
│   ├── components/
│   ├── widgets/
│   ├── services/
│   └── store/
│
├── .expo/                        # Expo build artifacts (gitignored)
├── node_modules/                 # Dependencies (gitignored)
│
├── app.json                      # Expo configuration
├── eas.json                      # EAS Build configuration
├── babel.config.js               # Babel configuration
├── tsconfig.json                 # TypeScript configuration
├── jest.config.js                # Jest testing configuration
├── package.json                  # Dependencies and scripts
├── .eslintrc.js                  # ESLint rules
├── .prettierrc                   # Prettier formatting
├── .gitignore
└── README.md
```

### **Structure Rationale**

**Expo Router (`app/` directory):**
- File-based routing reduces boilerplate compared to React Navigation manual setup
- `(tabs)/` group syntax enables future tab navigation without restructuring
- `_layout.tsx` wraps all screens with ThemeProvider and global state

**Atomic Design Structure (`src/components/`):**
- **Atoms:** Pure UI primitives (Button, StatusIndicator) with no business logic
- **Molecules:** Composed atoms (SegmentedControl = multiple Buttons)
- **Organisms:** Complex features (StatusBar, SetupWizard) with state logic
- Enables consistent reuse and prevents prop-drilling hell

**Widgets as First-Class Citizens (`src/widgets/`):**
- Separate from generic components (widgets are marine-specific instruments)
- Each widget is self-contained with own NMEA data subscription via `useNMEAData`
- `WidgetCard.tsx` is HOC providing consistent card styling, long-press handlers, no-data states

**Services Layer (`src/services/`):**
- **nmea/**: Isolates complex NMEA parsing logic from UI components
- **storage/**: Centralized persistence prevents scattered AsyncStorage calls
- **playback/**: Demo mode and NMEA file playback for testing without boat

**Zustand Stores (`src/store/`):**
- **Separation by domain:** Prevents monolithic global state blob
- **nmeaStore:** Real-time streaming data (depth, speed, wind) updated by `NMEAConnection`
- **widgetStore:** User's dashboard layout (which widgets, positions, sizes)
- **settingsStore:** Units, display mode, alarm volume
- **alarmStore:** Alarm configurations and triggered alarm history
- **connectionStore:** WiFi bridge IP, connection status, retry state

**Custom Hooks (`src/hooks/`):**
- **useNMEAData(parameter):** Widgets subscribe to specific data (e.g., `useNMEAData('depth')`)
- **useTheme():** Provides current colors, typography based on Day/Night/Red mode
- **useConnection():** Monitors WiFi bridge status, provides reconnect function

**Theme System (`src/theme/`):**
- Centralized color palette with mode-specific variants
- ThemeProvider uses React Context (avoid prop-drilling)
- Typography and spacing follow design system from UI/UX spec

---

## Component Standards

### **Component Template**

```typescript
import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { useTheme } from '@/hooks/useTheme';

/**
 * ExampleWidget - Marine instrument widget for displaying [parameter]
 *
 * @param value - Current NMEA data value (e.g., depth in feet)
 * @param unit - Display unit (e.g., 'ft', 'm', 'fathoms')
 * @param onLongPress - Callback for configuration modal trigger
 * @param isStale - True if data is >5 seconds old
 * @param hasAlarm - True if alarm threshold is triggered
 */
interface ExampleWidgetProps {
  value: number | null;
  unit: string;
  onLongPress?: () => void;
  isStale?: boolean;
  hasAlarm?: boolean;
}

export const ExampleWidget: React.FC<ExampleWidgetProps> = ({
  value,
  unit,
  onLongPress,
  isStale = false,
  hasAlarm = false,
}) => {
  const { colors, typography } = useTheme();

  return (
    <Pressable
      onLongPress={onLongPress}
      style={[
        styles.container,
        {
          backgroundColor: colors.backgroundMedium,
          borderColor: hasAlarm ? colors.error : colors.borderGray,
        },
      ]}
    >
      {/* Widget Title */}
      <Text style={[styles.title, { color: colors.textSecondary }]}>
        EXAMPLE
      </Text>

      {/* Primary Data Value */}
      <View style={styles.valueContainer}>
        {value !== null ? (
          <>
            <Text
              style={[
                styles.value,
                typography.primaryDataValue,
                {
                  color: isStale ? colors.textTertiary : colors.textPrimary,
                },
              ]}
            >
              {value.toFixed(1)}
            </Text>
            <Text style={[styles.unit, { color: colors.textSecondary }]}>
              {unit}
            </Text>
          </>
        ) : (
          <Text style={[styles.noData, { color: colors.textTertiary }]}>
            --
          </Text>
        )}
      </View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: 8,
    borderWidth: 2,
    padding: 12,
    minWidth: 160,
    minHeight: 160,
    justifyContent: 'space-between',
  },
  title: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  valueContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'center',
  },
  value: {
    fontFamily: 'monospace',
  },
  unit: {
    fontSize: 16,
    marginLeft: 4,
  },
  noData: {
    fontSize: 42,
    fontWeight: '700',
  },
});
```

### **Naming Conventions**

**Files and Components:**
- **Components:** PascalCase with descriptive names
  - `Button.tsx`, `StatusIndicator.tsx`, `DepthWidget.tsx`
- **Hooks:** camelCase prefixed with `use`
  - `useNMEAData.ts`, `useTheme.ts`, `useConnection.ts`
- **Services:** PascalCase for classes, camelCase for functions
  - `NMEAConnection.ts`, `widgetStorage.ts`
- **Store:** camelCase ending with `Store`
  - `nmeaStore.ts`, `settingsStore.ts`
- **Types:** PascalCase ending with type suffix
  - `widget.types.ts` (exports `WidgetConfig`, `WidgetProps`)

**TypeScript Interfaces and Types:**
- **Props interfaces:** Component name + `Props`
  - `DepthWidgetProps`, `ButtonProps`
- **State types:** Descriptive name + `State`
  - `NMEADataState`, `ConnectionState`
- **Function types:** Descriptive name + `Handler` or `Callback`
  - `LongPressHandler`, `ConnectionCallback`

**Variables and Functions:**
- **React components:** PascalCase
  - `const DepthWidget: React.FC<DepthWidgetProps> = ...`
- **Hooks:** camelCase
  - `const useNMEAData = (parameter: string) => ...`
- **Constants:** SCREAMING_SNAKE_CASE
  - `const MAX_RETRY_ATTEMPTS = 5;`
  - `const DEFAULT_PORT = 10110;`
- **Regular functions/variables:** camelCase
  - `const handleLongPress = () => ...`
  - `const depthValue = nmeaData.depth;`

**State Management (Zustand):**
- **Store slices:** camelCase
  - `nmeaStore`, `widgetStore`
- **Store actions:** verb + object
  - `addWidget()`, `removeWidget()`, `updateDepth()`
- **Store selectors:** descriptive noun
  - `const depth = useNMEAStore((state) => state.depth);`

---

## State Management

### **Store Structure**

```
src/store/
├── nmeaStore.ts           # Real-time NMEA data stream
├── widgetStore.ts         # Widget configurations & layout
├── settingsStore.ts       # App settings (units, display mode)
├── alarmStore.ts          # Alarm configurations & history
└── connectionStore.ts     # WiFi bridge connection state
```

### **State Management Template**

**Example: NMEA Data Store (`nmeaStore.ts`)**

```typescript
import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';

/**
 * NMEA Data State - Real-time streaming data from WiFi bridge
 * Updated by NMEAConnection service
 */
interface NMEADataState {
  // Depth data
  depth: number | null;
  depthUnit: 'feet' | 'meters' | 'fathoms';
  depthTimestamp: number | null;

  // Speed data
  speedOverGround: number | null;
  speedThroughWater: number | null;
  speedUnit: 'knots' | 'mph' | 'kmh';
  speedTimestamp: number | null;

  // Wind data
  apparentWindAngle: number | null;
  apparentWindSpeed: number | null;
  trueWindAngle: number | null;
  trueWindSpeed: number | null;
  windTimestamp: number | null;

  // Compass/GPS data
  heading: number | null;
  latitude: number | null;
  longitude: number | null;
  cog: number | null; // Course over ground
  headingTimestamp: number | null;

  // Autopilot data
  autopilotMode: 'standby' | 'auto' | 'wind' | 'track' | 'power_steer' | null;
  targetHeading: number | null;
  autopilotTimestamp: number | null;

  // Temperature/voltage
  waterTemperature: number | null;
  batteryVoltage: number | null;

  // Engine data (multi-engine support)
  engines: {
    [id: string]: {
      rpm: number | null;
      temperature: number | null;
      oilPressure: number | null;
      fuelRate: number | null;
      timestamp: number | null;
    };
  };

  // Actions
  updateDepth: (value: number, unit: 'feet' | 'meters' | 'fathoms') => void;
  updateSpeed: (sog: number | null, stw: number | null, unit: string) => void;
  updateWind: (awa: number, aws: number, twa?: number, tws?: number) => void;
  updateHeading: (heading: number, lat?: number, lon?: number, cog?: number) => void;
  updateAutopilot: (mode: string, targetHeading?: number) => void;
  updateEngine: (engineId: string, data: Partial<NMEADataState['engines'][string]>) => void;
  resetAllData: () => void;
}

export const useNMEAStore = create<NMEADataState>()(
  subscribeWithSelector((set) => ({
    // Initial state
    depth: null,
    depthUnit: 'feet',
    depthTimestamp: null,
    speedOverGround: null,
    speedThroughWater: null,
    speedUnit: 'knots',
    speedTimestamp: null,
    apparentWindAngle: null,
    apparentWindSpeed: null,
    trueWindAngle: null,
    trueWindSpeed: null,
    windTimestamp: null,
    heading: null,
    latitude: null,
    longitude: null,
    cog: null,
    headingTimestamp: null,
    autopilotMode: null,
    targetHeading: null,
    autopilotTimestamp: null,
    waterTemperature: null,
    batteryVoltage: null,
    engines: {},

    // Actions
    updateDepth: (value, unit) =>
      set({
        depth: value,
        depthUnit: unit,
        depthTimestamp: Date.now(),
      }),

    updateSpeed: (sog, stw, unit) =>
      set({
        speedOverGround: sog,
        speedThroughWater: stw,
        speedUnit: unit as any,
        speedTimestamp: Date.now(),
      }),

    updateWind: (awa, aws, twa, tws) =>
      set({
        apparentWindAngle: awa,
        apparentWindSpeed: aws,
        trueWindAngle: twa ?? null,
        trueWindSpeed: tws ?? null,
        windTimestamp: Date.now(),
      }),

    updateHeading: (heading, lat, lon, cog) =>
      set({
        heading,
        latitude: lat ?? null,
        longitude: lon ?? null,
        cog: cog ?? null,
        headingTimestamp: Date.now(),
      }),

    updateAutopilot: (mode, targetHeading) =>
      set({
        autopilotMode: mode as any,
        targetHeading: targetHeading ?? null,
        autopilotTimestamp: Date.now(),
      }),

    updateEngine: (engineId, data) =>
      set((state) => ({
        engines: {
          ...state.engines,
          [engineId]: {
            ...state.engines[engineId],
            ...data,
            timestamp: Date.now(),
          },
        },
      })),

    resetAllData: () =>
      set({
        depth: null,
        speedOverGround: null,
        speedThroughWater: null,
        apparentWindAngle: null,
        apparentWindSpeed: null,
        heading: null,
        autopilotMode: null,
        engines: {},
      }),
  }))
);
```

**Example: Widget Configuration Store (`widgetStore.ts`)**

```typescript
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type WidgetType =
  | 'depth'
  | 'speed'
  | 'wind'
  | 'compass'
  | 'autopilot'
  | 'gps'
  | 'temperature'
  | 'voltage'
  | 'engine'
  | 'alarm';

export interface WidgetConfig {
  id: string;                    // Unique ID (UUID)
  type: WidgetType;              // Widget type (depth, speed, engine, etc.)
  position: { x: number; y: number }; // Grid position (Epic 2)
  size: { width: number; height: number }; // Widget dimensions
  
  // *** NEW: Widget State Management ***
  viewState: 'collapsed' | 'expanded' | 'fullscreen'; // Current view state
  isPinned: boolean;             // Whether widget maintains state across restarts
  lastInteraction: Date;         // Timestamp of last user interaction
  
  // Enhanced configuration
  config: {
    dataSource?: string;         // For multi-sensor boats (e.g., 'port-engine')
    unit?: string;              // Unit override (e.g., 'meters' instead of default 'feet')
    visualizationStyle?: 'digital' | 'analog' | 'bar'; // Widget display style
    
    // Alert thresholds
    thresholds?: {
      warning?: number;
      critical?: number;
    };
    
    // Display preferences
    precision?: number;          // Decimal places (default: 1)
    displayFormat?: 'DMS' | 'DDM' | 'DD'; // For GPS coordinates
    showTrends?: boolean;        // Show historical trend indicators
    compactMode?: boolean;       // Use minimal spacing for dense layouts
  };
  
  // NMEA data source (for multi-instance widgets)
  nmeaSource?: {
    instance?: number;           // NMEA instance (engine #1, battery #2)
    pgn?: number;               // Specific PGN to monitor
    sourceAddress?: number;      // NMEA source address
  };
}

interface WidgetStoreState {
  widgets: WidgetConfig[];
  currentPage: number;           // Current dashboard page
  
  // Basic widget management
  addWidget: (type: WidgetType) => string; // Returns widget ID
  removeWidget: (id: string) => void;
  updateWidgetConfig: (id: string, config: Partial<WidgetConfig['config']>) => void;
  updateWidgetPosition: (id: string, position: { x: number; y: number }) => void;
  updateWidgetSize: (id: string, size: { width: number; height: number }) => void;
  
  // *** NEW: Widget State Management Actions ***
  expandWidget: (id: string, isPermanent?: boolean) => void;     // Expand to secondary view
  collapseWidget: (id: string) => void;                          // Collapse to primary view
  toggleWidgetExpansion: (id: string) => void;                   // Toggle expanded/collapsed
  pinWidget: (id: string) => void;                               // Pin widget to persist state across restarts
  unpinWidget: (id: string) => void;                             // Unpin widget (reverts to collapsed on restart)
  setFullscreenWidget: (id: string | null) => void;              // Show widget in fullscreen mode
  
  // State persistence management
  persistWidgetStates: () => void;                               // Save pinned states to AsyncStorage
  restoreWidgetStates: () => void;                               // Restore pinned states from AsyncStorage
  collapseAllUnpinned: () => void;                               // Collapse all non-pinned widgets
  
  // Context-aware expansion
  expandRelatedWidgets: (widgetType: WidgetType) => void;        // Expand related widgets (e.g., engine + oil)
  handleCriticalAlert: (widgetId: string) => void;               // Auto-expand on critical alerts
  
  // Utility functions
  getExpandedWidgets: () => WidgetConfig[];                      // Get all currently expanded widgets
  getPinnedWidgets: () => WidgetConfig[];                        // Get all pinned widgets
  updateWidgetInteraction: (id: string) => void;                 // Update last interaction timestamp
  clearDashboard: () => void;                                    // Reset dashboard to default state
}

export const useWidgetStore = create<WidgetStoreState>()(
  persist(
    (set) => ({
      widgets: [],

      addWidget: (type) =>
        set((state) => ({
          widgets: [
            ...state.widgets,
            {
              id: `${type}-${Date.now()}`,
              type,
              position: { x: 0, y: state.widgets.length * 200 }, // Stack vertically
              size: { width: 160, height: 160 },
              config: {},
            },
          ],
        })),

      removeWidget: (id) =>
        set((state) => ({
          widgets: state.widgets.filter((w) => w.id !== id),
        })),

      updateWidgetConfig: (id, config) =>
        set((state) => ({
          widgets: state.widgets.map((w) =>
            w.id === id ? { ...w, config: { ...w.config, ...config } } : w
          ),
        })),

      updateWidgetPosition: (id, position) =>
        set((state) => ({
          widgets: state.widgets.map((w) =>
            w.id === id ? { ...w, position } : w
          ),
        })),

      updateWidgetSize: (id, size) =>
        set((state) => ({
          widgets: state.widgets.map((w) => (w.id === id ? { ...w, size } : w)),
        })),

      clearDashboard: () => set({ widgets: [] }),
    }),
    {
      name: 'widget-storage',
      storage: {
        getItem: async (name) => {
          const value = await AsyncStorage.getItem(name);
          return value ? JSON.parse(value) : null;
        },
        setItem: async (name, value) => {
          await AsyncStorage.setItem(name, JSON.stringify(value));
        },
        removeItem: async (name) => {
          await AsyncStorage.removeItem(name);
        },
      },
    }
  )
);
```

### **State Management Rationale**

**Why Multiple Stores Instead of One Global Store?**
- **Performance Isolation:** NMEA data updates don't trigger widget config subscribers
- **Mental Model:** Easier to reason about domain-specific state (`nmeaStore.depth` vs `globalStore.nmea.depth`)
- **Persistence Granularity:** Only `widgetStore` and `settingsStore` need persistence, not real-time NMEA data
- **Code Organization:** Each store file is 100-200 lines vs monolithic 1000+ line global state

**Why `subscribeWithSelector` Middleware?**
- Enables fine-grained subscriptions: `useNMEAStore((state) => state.depth)` only re-renders when depth changes
- Critical for performance with 10+ widgets subscribing to different NMEA parameters
- Without selectors, every NMEA update would re-render all widgets

**Why Persist Widget Store with AsyncStorage?**
- Users expect dashboard layout to persist across app restarts
- AsyncStorage is asynchronous and doesn't block UI thread
- Zustand's persist middleware handles hydration automatically

---

## API Integration

### **Service Template**

**NMEA Connection Service (`src/services/nmea/NMEAConnection.ts`)**

```typescript
import TcpSocket from 'react-native-tcp-socket';
import { useNMEAStore } from '@/store/nmeaStore';
import { useConnectionStore } from '@/store/connectionStore';
import { NMEAParser } from './NMEAParser';

export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error';

/**
 * NMEAConnection - Manages TCP socket connection to WiFi bridge
 * Streams NMEA 0183/2000 data and updates nmeaStore
 */
export class NMEAConnection {
  private socket: any = null;
  private parser: NMEAParser;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private reconnectAttempts = 0;
  private readonly MAX_RECONNECT_ATTEMPTS = 10;
  private readonly RECONNECT_DELAYS = [1000, 2000, 4000, 8000, 15000]; // Exponential backoff

  constructor() {
    this.parser = new NMEAParser();
  }

  /**
   * Connect to WiFi bridge
   * @param host - IP address or hostname (e.g., '192.168.1.10')
   * @param port - TCP port (default: 10110 for NMEA)
   */
  async connect(host: string, port: number = 10110): Promise<void> {
    try {
      useConnectionStore.getState().setStatus('connecting');

      this.socket = TcpSocket.createConnection(
        { host, port, reuseAddress: true },
        () => {
          console.log(`[NMEA] Connected to ${host}:${port}`);
          useConnectionStore.getState().setStatus('connected');
          this.reconnectAttempts = 0; // Reset on successful connection
        }
      );

      this.socket.on('data', (data: Buffer) => {
        this.handleData(data);
      });

      this.socket.on('error', (error: Error) => {
        console.error('[NMEA] Socket error:', error);
        useConnectionStore.getState().setStatus('error');
        this.scheduleReconnect(host, port);
      });

      this.socket.on('close', () => {
        console.log('[NMEA] Connection closed');
        useConnectionStore.getState().setStatus('disconnected');
        this.scheduleReconnect(host, port);
      });
    } catch (error) {
      console.error('[NMEA] Connection failed:', error);
      useConnectionStore.getState().setStatus('error');
      throw error;
    }
  }

  /**
   * Disconnect from WiFi bridge
   */
  disconnect(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    if (this.socket) {
      this.socket.destroy();
      this.socket = null;
    }

    useConnectionStore.getState().setStatus('disconnected');
    useNMEAStore.getState().resetAllData();
  }

  /**
   * Handle incoming NMEA data
   */
  private handleData(data: Buffer): void {
    const sentences = data.toString('utf-8').split('\r\n');

    sentences.forEach((sentence) => {
      if (!sentence.trim()) return;

      try {
        const parsed = this.parser.parse(sentence);
        if (parsed) {
          this.updateStoreFromParsedData(parsed);
        }
      } catch (error) {
        console.warn('[NMEA] Parse error:', error);
      }
    });
  }

  /**
   * Update Zustand store based on parsed NMEA data
   */
  private updateStoreFromParsedData(data: any): void {
    const store = useNMEAStore.getState();

    switch (data.type) {
      case 'depth':
        store.updateDepth(data.value, data.unit);
        break;
      case 'speed':
        store.updateSpeed(data.sog, data.stw, data.unit);
        break;
      case 'wind':
        store.updateWind(data.awa, data.aws, data.twa, data.tws);
        break;
      case 'heading':
        store.updateHeading(data.heading, data.lat, data.lon, data.cog);
        break;
      case 'autopilot':
        store.updateAutopilot(data.mode, data.targetHeading);
        break;
      case 'engine':
        store.updateEngine(data.engineId, data.engineData);
        break;
    }
  }

  /**
   * Schedule reconnection with exponential backoff
   */
  private scheduleReconnect(host: string, port: number): void {
    if (this.reconnectAttempts >= this.MAX_RECONNECT_ATTEMPTS) {
      console.error('[NMEA] Max reconnect attempts reached');
      useConnectionStore.getState().setStatus('error');
      return;
    }

    const delayIndex = Math.min(this.reconnectAttempts, this.RECONNECT_DELAYS.length - 1);
    const delay = this.RECONNECT_DELAYS[delayIndex];

    console.log(`[NMEA] Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts + 1})`);

    this.reconnectTimer = setTimeout(() => {
      this.reconnectAttempts++;
      this.connect(host, port);
    }, delay);
  }

  /**
   * Send NMEA command (e.g., autopilot control)
   * @param sentence - NMEA sentence to send (e.g., '$ECAPB,1,01*2D\r\n')
   */
  async sendCommand(sentence: string): Promise<void> {
    if (!this.socket) {
      throw new Error('Not connected to NMEA bridge');
    }

    return new Promise((resolve, reject) => {
      this.socket.write(sentence + '\r\n', 'utf-8', (error?: Error) => {
        if (error) {
          reject(error);
        } else {
          resolve();
        }
      });
    });
  }
}

// Singleton instance
export const nmeaConnection = new NMEAConnection();
```

### **API Client Configuration**

**Autopilot Command Service (`src/services/nmea/AutopilotCommands.ts`)**

```typescript
import { nmeaConnection } from './NMEAConnection';

/**
 * Autopilot command service - Raymarine Evolution autopilot control
 * Sends NMEA 2000 PGN messages via WiFi bridge
 */
export class AutopilotCommands {
  /**
   * Adjust heading by ±1° or ±10°
   * @param adjustment - Degrees to adjust (+1, -1, +10, -10)
   */
  async adjustHeading(adjustment: number): Promise<void> {
    // Raymarine proprietary PGN 65360 (Heading Control)
    // Format: $ECAPB,adjustment*checksum
    const sentence = this.buildHeadingCommand(adjustment);
    await nmeaConnection.sendCommand(sentence);
  }

  /**
   * Switch autopilot mode
   * @param mode - Target mode ('auto' | 'standby' | 'wind' | 'track')
   */
  async setMode(mode: 'auto' | 'standby' | 'wind' | 'track'): Promise<void> {
    const sentence = this.buildModeCommand(mode);
    await nmeaConnection.sendCommand(sentence);
  }

  /**
   * Execute tack maneuver
   */
  async tack(): Promise<void> {
    const sentence = this.buildTackCommand();
    await nmeaConnection.sendCommand(sentence);
  }

  /**
   * Execute gybe maneuver
   */
  async gybe(): Promise<void> {
    const sentence = this.buildGybeCommand();
    await nmeaConnection.sendCommand(sentence);
  }

  /**
   * Build NMEA sentence for heading adjustment
   * NOTE: Actual Raymarine PGN format requires reverse engineering or SDK
   */
  private buildHeadingCommand(adjustment: number): string {
    // Placeholder - replace with actual Raymarine format
    const checksum = this.calculateChecksum(`ECAPB,${adjustment}`);
    return `$ECAPB,${adjustment}*${checksum}`;
  }

  private buildModeCommand(mode: string): string {
    // Placeholder
    const modeCode = { auto: '01', standby: '00', wind: '02', track: '03' }[mode];
    const checksum = this.calculateChecksum(`ECAPB,MODE,${modeCode}`);
    return `$ECAPB,MODE,${modeCode}*${checksum}`;
  }

  private buildTackCommand(): string {
    const checksum = this.calculateChecksum('ECAPB,TACK');
    return `$ECAPB,TACK*${checksum}`;
  }

  private buildGybeCommand(): string {
    const checksum = this.calculateChecksum('ECAPB,GYBE');
    return `$ECAPB,GYBE*${checksum}`;
  }

  /**
   * Calculate NMEA checksum (XOR of all characters between $ and *)
   */
  private calculateChecksum(sentence: string): string {
    let checksum = 0;
    for (let i = 0; i < sentence.length; i++) {
      checksum ^= sentence.charCodeAt(i);
    }
    return checksum.toString(16).toUpperCase().padStart(2, '0');
  }
}

export const autopilotCommands = new AutopilotCommands();
```

### **API Integration Rationale**

**Why TCP Sockets Instead of HTTP/WebSocket?**
- WiFi bridges (e.g., Digital Yacht WLN10) expose raw NMEA streams over TCP port 10110
- No HTTP/REST API layer - direct binary/text stream of NMEA sentences
- Lower latency than WebSocket (no handshake overhead)
- Simpler protocol for 500 messages/second throughput

**Why Singleton Pattern for `nmeaConnection`?**
- Only one active TCP connection allowed per WiFi bridge
- Prevents multiple components from creating duplicate connections
- Centralized connection state management

**Why Exponential Backoff for Reconnection?**
- WiFi bridge may temporarily drop connection during boat electrical issues
- Exponential backoff (1s → 2s → 4s → 8s → 15s) prevents connection storm
- Max 10 attempts before requiring user intervention

**Error Handling Strategy:**
- Connection errors update `connectionStore.status` to trigger UI feedback
- Parse errors logged but don't disconnect (skip malformed sentences)
- Command send failures throw exceptions for UI error toast

---

## Routing

### **Route Configuration**

Expo Router uses file-based routing in the `app/` directory:

```typescript
// app/_layout.tsx - Root layout with providers
import { Stack } from 'expo-router';
import { ThemeProvider } from '@/theme/ThemeProvider';

export default function RootLayout() {
  return (
    <ThemeProvider>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="settings" options={{ presentation: 'modal' }} />
        <Stack.Screen
          name="widget-selector"
          options={{ presentation: 'modal', animation: 'slide_from_bottom' }}
        />
      </Stack>
    </ThemeProvider>
  );
}

// app/index.tsx - Dashboard screen
import { View, ScrollView, Pressable } from 'react-native';
import { useWidgetStore } from '@/store/widgetStore';
import { DepthWidget } from '@/widgets/DepthWidget';
import { StatusBar } from '@/components/organisms/StatusBar';
import { useRouter } from 'expo-router';

export default function DashboardScreen() {
  const widgets = useWidgetStore((state) => state.widgets);
  const router = useRouter();

  return (
    <View style={{ flex: 1 }}>
      <StatusBar />
      <ScrollView>
        {widgets.map((widget) => (
          <WidgetRenderer key={widget.id} widget={widget} />
        ))}
      </ScrollView>
      <Pressable
        style={styles.fab}
        onPress={() => router.push('/widget-selector')}
      >
        <Text>+</Text>
      </Pressable>
    </View>
  );
}
```

**Routing Rationale:**
- File-based routing reduces boilerplate (no manual route configuration)
- Modal presentation for Settings and Widget Selector provides native feel
- `headerShown: false` gives full control over custom status bar
- Future tab navigation enabled via `(tabs)/` directory without refactoring

---

## Styling Guidelines

### **Styling Approach**

Use React Native's built-in `StyleSheet API` with theme context for display modes.

**Theme Provider (`src/theme/ThemeProvider.tsx`)**

```typescript
import React, { createContext, useContext, useState } from 'react';
import { colors } from './colors';
import { typography } from './typography';
import { spacing } from './spacing';

export type DisplayMode = 'day' | 'night' | 'red-night';

interface ThemeContextValue {
  mode: DisplayMode;
  colors: typeof colors.day;
  typography: typeof typography;
  spacing: typeof spacing;
  setMode: (mode: DisplayMode) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [mode, setMode] = useState<DisplayMode>('day');
  const [autoSwitchEnabled, setAutoSwitchEnabled] = useState(true);
  
  // Auto-switch theme based on time (can be enhanced with GPS sunset/sunrise)
  React.useEffect(() => {
    if (!autoSwitchEnabled) return;
    
    const checkTime = () => {
      const now = new Date();
      const hour = now.getHours();
      
      // Automatically switch to marine-safe modes during night hours
      if (hour >= 22 || hour <= 5) {
        if (mode !== 'red-night') setMode('red-night');
      } else if (hour >= 19 || hour <= 7) {
        if (mode !== 'night') setMode('night');
      } else {
        if (mode !== 'day') setMode('day');
      }
    };
    
    // Check every minute
    const interval = setInterval(checkTime, 60000);
    checkTime(); // Check immediately
    
    return () => clearInterval(interval);
  }, [mode, autoSwitchEnabled]);
  
  // Apply native brightness control when theme changes
  React.useEffect(() => {
    applyDisplayMode(mode);
    
    // Apply theme to React Native status bar
    if (Platform.OS === 'ios') {
      StatusBar.setBarStyle(
        mode === 'day' ? 'dark-content' : 'light-content', 
        true
      );
    }
  }, [mode]);
  
  const value = {
    mode,
    colors: colors[mode],
    typography,
    spacing,
    setMode,
    autoSwitchEnabled,
    setAutoSwitchEnabled,
    // Utility functions for theme validation
    validateThemeCompliance: () => validateThemeCompliance(mode),
    getRecommendedMode: () => BRIGHTNESS_CONTROL.getRecommendedMode(new Date()),
  };

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};

// Theme compliance validation (ensures no bright colors in red-night mode)
const validateThemeCompliance = (mode: DisplayMode): { isCompliant: boolean; violations: string[] } => {
  if (mode !== 'red-night') return { isCompliant: true, violations: [] };
  
  const violations: string[] = [];
  const themeColors = colors[mode];
  
  // Check all color values for red-night compliance
  Object.entries(themeColors).forEach(([key, color]) => {
    if (typeof color === 'string') {
      const rgb = hexToRgb(color);
      if (rgb) {
        // Red-night compliance: R < 70, G = 0, B = 0
        if (rgb.g > 0 || rgb.b > 0 || rgb.r > 70) {
          violations.push(`${key}: ${color} violates red-night safety (R=${rgb.r}, G=${rgb.g}, B=${rgb.b})`);
        }
      }
    }
  });
  
  return {
    isCompliant: violations.length === 0,
    violations,
  };
};

const hexToRgb = (hex: string): { r: number; g: number; b: number } | null => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16),
  } : null;
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) throw new Error('useTheme must be used within ThemeProvider');
  return context;
};
```

### **Global Theme Variables (CSS Custom Properties)**

While React Native doesn't use CSS, we define theme constants in TypeScript:

```typescript
// src/theme/colors.ts - MARINE SAFETY COMPLIANT
export const colors = {
  day: {
    // Monochromatic base with selective color alerts
    background: '#FFFFFF',
    surface: '#F8FAFC',
    text: '#0F172A',
    textSecondary: '#475569',
    textTertiary: '#64748B',
    border: '#CBD5E1',
    icon: '#64748B',
    
    // Alert colors (override monochrome for critical safety information)
    warning: '#EA580C',    // Orange for approaching thresholds
    critical: '#DC2626',   // Red for dangerous conditions  
    success: '#16A34A',    // Green for normal operations
  },
  
  night: {
    // Reduced brightness while maintaining readability
    background: '#0A0A0A', // Very dark gray (not pure black for OLED burn-in)
    surface: '#1A1A1A',
    text: '#A0A0A0',       // Dim but readable gray
    textSecondary: '#606060',
    textTertiary: '#404040',
    border: '#404040',
    icon: '#606060',
    
    // Dimmed alert colors
    warning: '#B8860B',    // Dark gold
    critical: '#8B0000',   // Dark red  
    success: '#006400',    // Dark green
  },
  
  'red-night': {
    // CRITICAL MARINE SAFETY MODE - All colors must be dim red variations
    // RGB values kept low (0-68 range) to preserve night vision
    background: '#0A0000', // RGB(10,0,0) - Nearly black with red tint
    surface: '#1A0000',    // RGB(26,0,0) - Slightly lighter surface
    text: '#440000',       // RGB(68,0,0) - Primary text (brightest allowed)
    textSecondary: '#330000', // RGB(51,0,0) - Secondary text
    textTertiary: '#220000',  // RGB(34,0,0) - Tertiary text  
    border: '#220000',     // RGB(34,0,0) - Borders barely visible
    icon: '#330000',       // RGB(51,0,0) - Icons subtle
    
    // ALL alerts use same color - differentiated by animation only
    warning: '#440000',    // Same as primary text
    critical: '#440000',   // Differentiated by flicker animation
    success: '#440000',    // All feedback uses same dim red
    
    // Animation definitions for red-night mode
    animations: {
      pulse: {
        duration: 1500,
        easing: 'ease-in-out',
        loop: true,
        keyframes: {
          '0%': { opacity: 0.6 },
          '50%': { opacity: 1.0 },
          '100%': { opacity: 0.6 },
        },
      },
      flicker: {
        duration: 300,
        easing: 'linear', 
        loop: true,
        keyframes: {
          '0%': { opacity: 1.0 },
          '10%': { opacity: 0.2 },
          '20%': { opacity: 1.0 },
          '30%': { opacity: 0.2 },
          '40%': { opacity: 1.0 },
          '100%': { opacity: 1.0 },
        },
      },
    },
  },
} as const;

// Brightness integration with native APIs
import { Brightness } from 'expo-brightness';
import { Platform } from 'react-native';

export const applyDisplayMode = async (mode: DisplayMode) => {
  const modeConfig = colors[mode];
  
  // Apply native screen brightness
  try {
    if (mode === 'red-night') {
      await Brightness.setBrightnessAsync(0.05); // 5% - Critical for marine safety
    } else if (mode === 'night') {
      await Brightness.setBrightnessAsync(0.30); // 30% - Comfortable night viewing
    } else {
      await Brightness.setBrightnessAsync(1.0);  // 100% - Full daylight
    }
  } catch (error) {
    console.warn('Native brightness control unavailable:', error);
    // App will rely on theme colors for dimming effect
  }
  
  return modeConfig;
};
```

---

## Testing Requirements

### **Component Test Template**

```typescript
// __tests__/widgets/DepthWidget.test.tsx
import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { DepthWidget } from '@/widgets/DepthWidget';
import { ThemeProvider } from '@/theme/ThemeProvider';

// Wrapper for theme context
const renderWithTheme = (component: React.ReactElement) => {
  return render(<ThemeProvider>{component}</ThemeProvider>);
};

describe('DepthWidget', () => {
  it('renders depth value correctly', () => {
    const { getByText } = renderWithTheme(
      <DepthWidget value={12.4} unit="ft" />
    );

    expect(getByText('12.4')).toBeTruthy();
    expect(getByText('ft')).toBeTruthy();
  });

  it('displays -- when value is null', () => {
    const { getByText } = renderWithTheme(
      <DepthWidget value={null} unit="ft" />
    );

    expect(getByText('--')).toBeTruthy();
  });

  it('calls onLongPress when widget is long-pressed', () => {
    const mockLongPress = jest.fn();
    const { getByTestId } = renderWithTheme(
      <DepthWidget value={12.4} unit="ft" onLongPress={mockLongPress} />
    );

    fireEvent(getByTestId('depth-widget'), 'onLongPress');
    expect(mockLongPress).toHaveBeenCalled();
  });

  it('applies alarm border when hasAlarm is true', () => {
    const { getByTestId } = renderWithTheme(
      <DepthWidget value={5.5} unit="ft" hasAlarm={true} />
    );

    const widget = getByTestId('depth-widget');
    expect(widget.props.style).toMatchObject({
      borderColor: expect.stringContaining('#EF4444'), // error color
    });
  });
});
```

### **Testing Best Practices**

1. **Unit Tests**: Test individual components in isolation
2. **Integration Tests**: Test component interactions (widget + store updates)
3. **E2E Tests**: Test critical user flows using Detox (optional for MVP)
4. **Coverage Goals**: Aim for 80% code coverage on core logic
5. **Test Structure**: Arrange-Act-Assert pattern
6. **Mock External Dependencies**: Mock NMEA connection, TCP sockets, AsyncStorage

---

## Environment Configuration

### **Required Environment Variables**

Create `.env` file in project root (use `.env.example` as template):

```bash
# WiFi Bridge Configuration (Development)
NMEA_BRIDGE_HOST=192.168.1.10
NMEA_BRIDGE_PORT=10110

# Playback Mode (for testing without boat)
ENABLE_PLAYBACK_MODE=true
SAMPLE_NMEA_FILE=./assets/sample-nmea.log

# Feature Flags
ENABLE_AUTOPILOT_CONTROL=true
ENABLE_MULTI_ENGINE_SUPPORT=true

# Logging
LOG_LEVEL=debug  # Options: debug, info, warn, error

# Analytics (future)
ANALYTICS_ENABLED=false
```

**Access in Code:**

```typescript
import Constants from 'expo-constants';

const config = {
  nmeaBridgeHost: Constants.expoConfig?.extra?.nmeaBridgeHost || '192.168.1.1',
  nmeaBridgePort: Constants.expoConfig?.extra?.nmeaBridgePort || 10110,
  enablePlaybackMode: Constants.expoConfig?.extra?.enablePlaybackMode || false,
};
```

**app.config.js (Expo configuration):**

```javascript
import 'dotenv/config';

export default {
  expo: {
    name: 'Boating Instruments',
    slug: 'boating-instruments',
    version: '1.0.0',
    extra: {
      nmeaBridgeHost: process.env.NMEA_BRIDGE_HOST,
      nmeaBridgePort: process.env.NMEA_BRIDGE_PORT,
      enablePlaybackMode: process.env.ENABLE_PLAYBACK_MODE === 'true',
    },
  },
};
```

---

## Frontend Developer Standards

### **Critical Coding Rules**

1. **Always use TypeScript** - No `any` types without explicit justification
2. **Use Zustand selectors** - Subscribe to specific state slices, not entire store
3. **Memoize expensive calculations** - Use `useMemo()` for NMEA data transformations
4. **Handle null NMEA data** - All widgets must gracefully display "--" when data unavailable
5. **MANDATORY theme context usage** - Never hardcode color values in components
6. **Follow touch interaction standards** - All interactive elements ≥44pt touch targets (full accessibility deferred to Phase 2)
7. **Test with stale data** - Widgets must indicate stale data (>5s old)
8. **Smart update throttling** - Widget-specific update rates based on human perception:
   - **Depth:** 2Hz (critical for safety, user notices 0.5s changes)
   - **Speed:** 1Hz (standard navigation update rate)  
   - **Engine RPM:** 2Hz (rapid changes need quick feedback)
   - **GPS Coordinates:** 0.5Hz (position changes slowly)
   - **Battery Voltage:** 0.1Hz (changes very slowly)
9. **Clean up subscriptions** - Use `useEffect` cleanup for Zustand subscriptions
10. **Error boundaries** - Wrap widget rendering in error boundaries (prevent single widget crash from breaking dashboard)

### **🚨 CRITICAL: Marine Theme Compliance Rules**

**RED-NIGHT MODE SAFETY REQUIREMENTS:**
```typescript
// MANDATORY: All components must use theme context
const Component: React.FC = () => {
  const theme = useTheme(); // REQUIRED - never skip this
  
  // ✅ CORRECT: Use theme colors
  const styles = StyleSheet.create({
    container: {
      backgroundColor: theme.colors.background, // ✅ Theme-compliant
      borderColor: theme.colors.border,
    },
  });
  
  // ❌ FORBIDDEN: Hardcoded colors
  const badStyles = StyleSheet.create({
    container: {
      backgroundColor: '#FFFFFF', // ❌ DANGEROUS - bright white in red-night mode
      color: '#000000',           // ❌ DANGEROUS - black text unreadable
    },
  });
};

// MANDATORY: Theme validation in development
if (__DEV__) {
  const themeValidation = theme.validateThemeCompliance();
  if (!themeValidation.isCompliant) {
    console.error('THEME VIOLATION:', themeValidation.violations);
    // In red-night mode violations are SAFETY CRITICAL
  }
}
```

**COMPREHENSIVE COMPONENT COVERAGE:**
All UI elements MUST use theme context:
- ✅ **StatusBar:** Use theme-appropriate bar style
- ✅ **Modal backgrounds:** Use theme.colors.surface
- ✅ **Text inputs:** Use theme.colors.text for text, theme.colors.border for borders
- ✅ **Loading spinners:** Use theme.colors.textSecondary  
- ✅ **Alert/Toast messages:** Use theme alert colors with animation in red-night mode
- ✅ **Navigation elements:** Header bars, tab bars, buttons all theme-compliant
- ✅ **Splash screens:** Must support all three theme modes
- ✅ **Error boundaries:** Use theme colors for error display

**THEME TESTING REQUIREMENTS:**
```typescript
// MANDATORY: Test all components in all three modes
describe('ComponentName Theme Compliance', () => {
  ['day', 'night', 'red-night'].forEach(mode => {
    it(`should be theme compliant in ${mode} mode`, () => {
      const { getByTestId } = renderWithTheme(<Component />, mode);
      
      // Red-night mode: verify no bright colors
      if (mode === 'red-night') {
        const validation = validateComponentColors(getByTestId('component'));
        expect(validation.violations).toEqual([]);
      }
    });
  });
});
```

### **Widget State Persistence Rules**

**MANDATORY: All widget state changes must persist:**
```typescript
// ✅ CORRECT: Use store actions for state changes
const handleExpandWidget = () => {
  widgetStore.expandWidget(widgetId, false); // Persists automatically
  widgetStore.updateWidgetInteraction(widgetId); // Updates timestamp
};

// ✅ CORRECT: Pin state persistence
const handlePinWidget = () => {
  widgetStore.pinWidget(widgetId); // Persists to AsyncStorage
};

// ❌ FORBIDDEN: Local state for widget expansion
const [isExpanded, setIsExpanded] = useState(false); // ❌ Lost on app restart
```

**WIDGET STATE PERSISTENCE:**
- Pinned widgets maintain their expanded/collapsed state across app restarts
- Unpinned widgets always start collapsed after app restart
- No automatic state changes - widgets only change through user interaction
- Related widgets expand together during engine/electrical alerts

### **Accessibility & Touch Interaction Standards** *(Deferred to Phase 2)*

**NOTE: Accessibility features including screen reader support, ARIA labels, and keyboard navigation have been deferred to Phase 2 to reduce MVP complexity. MVP will focus on core marine navigation functionality with basic touch interactions.**

**Touch Target Requirements:**
- **Minimum size:** 44×44pt (iOS) / 48×48dp (Android) for all interactive elements
- **Widget tap areas:** Entire widget surface (including margins) is tappable
- **Button spacing:** Minimum 8pt between adjacent touch targets
- **Long press detection:** 500ms duration, haptic feedback on trigger

**Screen Reader Support:** *(Deferred to Phase 2)*
```typescript
// Required accessibility props for all interactive widgets (Phase 2)
const accessibilityProps = {
  accessible: true,
  accessibilityRole: 'button' | 'text' | 'header',
  accessibilityLabel: 'Depth widget, 42.5 feet', // Descriptive label
  accessibilityValue: { text: '42.5 feet, normal' }, // Current state
  accessibilityHint: 'Double tap to expand, long press for options',
  accessibilityLiveRegion: 'polite', // For real-time data updates
};
```

**Visual Accessibility:** *(Deferred to Phase 2)*
- **Color contrast:** Minimum 4.5:1 for normal text, 7:1 for critical alerts
- **Focus indicators:** 2pt border with theme accent color
- **Text scaling:** Support Dynamic Type (iOS) / Font Scale (Android) up to 200%
- **Motion sensitivity:** Respect `prefers-reduced-motion` for animations

**Data Staleness Indicators:**
```typescript
const getStalenessState = (timestamp: Date) => {
  const age = Date.now() - timestamp.getTime();
  if (age > 10000) return 'stale'; // >10s = clearly stale
  if (age > 5000) return 'aging';  // 5-10s = aging data
  return 'fresh';                  // <5s = fresh data
};

// Visual indicators:
// fresh: normal colors
// aging: 70% opacity
// stale: 40% opacity + "stale" indicator
```

### **Real-Time Performance Optimization**

**NMEA Data Stream Management:**
```typescript
// Widget-specific update rate configuration
const WIDGET_UPDATE_RATES = {
  depth: { maxHz: 2, priority: 'critical' },     // Safety-critical: 500ms max delay
  speed: { maxHz: 1, priority: 'high' },         // Navigation: 1s updates sufficient
  engineRPM: { maxHz: 2, priority: 'high' },     // Engine monitoring: 500ms
  gps: { maxHz: 0.5, priority: 'medium' },       // Position: 2s updates fine
  batteryVoltage: { maxHz: 0.1, priority: 'low' }, // Slow changes: 10s updates
  compass: { maxHz: 10, priority: 'critical' },   // Steering feedback: 100ms
} as const;

// Adaptive performance based on device capabilities
const getOptimalUpdateRate = (widgetType: string, devicePerformance: 'low' | 'medium' | 'high') => {
  const baseRate = WIDGET_UPDATE_RATES[widgetType];
  const performanceMultipliers = { low: 0.5, medium: 0.8, high: 1.0 };
  
  return {
    maxHz: baseRate.maxHz * performanceMultipliers[devicePerformance],
    throttleMs: 1000 / (baseRate.maxHz * performanceMultipliers[devicePerformance]),
    priority: baseRate.priority,
  };
};
```

**Memory-Efficient Data Management:**
- **Circular buffers:** Store only last 100 samples per metric (not infinite history)
- **Lazy computation:** Calculate trends/averages only when widgets expanded
- **Background processing:** Use WorkManager for non-critical calculations
- **Memory pressure handling:** Reduce update rates automatically when memory <100MB

**Battery Life Optimization:**
- **Screen-off behavior:** Reduce NMEA processing to critical alerts only
- **Background mode:** Maintain depth/engine alarms but pause GPS/speed updates
- **Low battery mode:** Automatically reduce widget update rates by 50% when <20% battery
- **Adaptive brightness:** Reduce screen brightness in bright sunlight (marine use case)

### **Quick Reference**

**Common Commands:**
```bash
# Start development server
npx expo start

# Run on iOS simulator
npx expo run:ios

# Run on Android emulator
npx expo run:android

# Run tests
npm test

# Run tests in watch mode
npm test -- --watch

# Type check
npx tsc --noEmit

# Lint
npm run lint

# Build for production
eas build --platform ios
eas build --platform android
```

**Key Import Patterns:**
```typescript
// Widgets
import { DepthWidget } from '@/widgets/DepthWidget';

// Components
import { Button } from '@/components/atoms/Button';

// Hooks
import { useNMEAData } from '@/hooks/useNMEAData';
import { useTheme } from '@/hooks/useTheme';

// Store
import { useNMEAStore } from '@/store/nmeaStore';
import { useWidgetStore } from '@/store/widgetStore';

// Services
import { nmeaConnection } from '@/services/nmea/NMEAConnection';

// Types
import type { WidgetConfig } from '@/types/widget.types';
```

**File Naming Conventions:**
- Components: `PascalCase.tsx` (e.g., `DepthWidget.tsx`)
- Hooks: `camelCase.ts` (e.g., `useNMEAData.ts`)
- Stores: `camelCase.ts` ending with `Store` (e.g., `nmeaStore.ts`)
- Tests: `ComponentName.test.tsx` (mirrors source structure)

---

## UI Consistency & Design System Standards

### **Responsive Widget Layout System**

**Dynamic Grid Sizing:**
Widget dimensions adapt to screen size and platform:

```typescript
interface ResponsiveLayoutConfig {
  screenWidth: number;
  screenHeight: number; 
  orientation: 'portrait' | 'landscape';
  platform: 'phone' | 'tablet' | 'desktop';
}

const WIDGET_CONSTRAINTS = {
  minSize: { width: 140, height: 140 },
  maxSize: { width: 220, height: 220 },
  expandedMultiplier: 1.5,  // Expanded widgets 1.5x larger
  margin: 8,                // 8pt spacing between widgets
} as const;

// Platform-specific grid calculations  
const calculateOptimalLayout = (config: ResponsiveLayoutConfig) => {
  const { screenWidth, screenHeight, orientation, platform } = config;
  
  if (platform === 'phone') {
    return orientation === 'portrait' 
      ? { widgetsPerRow: 1, widgetRows: 3, widgetsPerPage: 3 }
      : { widgetsPerRow: 2, widgetRows: 1, widgetsPerPage: 2 };
  } else if (platform === 'tablet') {
    return orientation === 'portrait'
      ? { widgetsPerRow: 2, widgetRows: 2, widgetsPerPage: 4 }
      : { widgetsPerRow: 3, widgetRows: 2, widgetsPerPage: 6 };
  } else { // desktop
    return { widgetsPerRow: 4, widgetRows: 3, widgetsPerPage: 12 };
  }
};
```

**Widget Flow Rules:**
- Widgets flow top-left → bottom-right
- New page created when current page capacity reached
- Expanded widgets receive priority placement (avoid partial visibility)
- Blue + button positioned at end of final page
- Real-time re-layout on screen rotation/resize

### **Internal Widget Grid Architecture**

**MetricCell Grid Options:**
- **1×1:** Single metric (Depth: 42.5 ft)
- **1×2:** Two metrics side by side (STW | SOG)
- **2×1:** Two metrics stacked (RPM over TEMP)
- **1×3:** Three metrics in row (AWS | AWA | GUST)
- **2×2:** Four metrics in square (VOLT, CURR, TEMP, SOC)
- **2×3:** Six metrics maximum density

### **MetricCell Component Standards**

**PrimaryMetricCell Typography:**
```typescript
interface PrimaryMetricCellProps {
  mnemonic: string;    // 12pt, semibold, uppercase (e.g., "DEPTH")
  value: string;       // 36pt, monospace, bold (e.g., "42.5")  
  unit: string;        // 12pt, regular, in parentheses (e.g., "(ft)")
  state?: 'normal' | 'warning' | 'alarm';
}

// Current implementation format:
// MNEMONIC (unit)
//      VALUE
```

**SecondaryMetricCell (New Component):**
```typescript
interface SecondaryMetricCellProps {
  mnemonic: string;    // 10pt, semibold, uppercase
  value: string;       // 24pt, monospace, bold (smaller than primary)
  unit: string;        // 10pt, regular, lighter color
  state?: 'normal' | 'warning' | 'alarm';
}
```

### **Multi-Instance NMEA Widget Detection**

**Battery Instance Mapping (PGN 127508/127513):**
```typescript
const NMEA_BATTERY_INSTANCES = {
  0: { title: 'HOUSE', icon: '🔋', priority: 1, type: 'House Bank' },
  1: { title: 'ENGINE', icon: '⚡', priority: 2, type: 'Engine Start' },
  2: { title: 'THRUSTER', icon: '🌀', priority: 4, type: 'Bow Thruster' },
  3: { title: 'GENERATOR', icon: '🔌', priority: 5, type: 'Generator Start' },
  4: { title: 'A/C', icon: '❄️', priority: 6, type: 'Air Conditioning' },
  9: { title: 'WINDLASS', icon: '⚓', priority: 7, type: 'Anchor Windlass' },
  10: { title: 'INVERTER', icon: '🔄', priority: 3, type: 'Inverter Bank' },
} as const;

// Smart labeling: Show descriptive names for critical systems
const generateBatteryWidgetTitle = (instance: number, batteryData: any): string => {
  const config = NMEA_BATTERY_INSTANCES[instance];
  if (!config) return `BATTERY #${instance}`;
  
  // Critical systems get full descriptive names
  if (config.priority <= 3) {
    return `${config.icon} ${config.title}`;
  }
  
  // Non-critical systems use compact format
  return `${config.icon} BATT ${config.title}`;
};
```

**Tank Instance Mapping (PGN 127505):**
```typescript
const NMEA_TANK_INSTANCES = {
  0: { title: '🛢️ FUEL PORT', fluidType: 'Fuel', position: 'Port' },
  1: { title: '🛢️ FUEL STBD', fluidType: 'Fuel', position: 'Starboard' },
  2: { title: '💧 WATER FRESH', fluidType: 'Fresh Water' },
  3: { title: '💧 WATER GRAY', fluidType: 'Gray Water' },
  4: { title: '💧 WATER BLACK', fluidType: 'Black Water' },
  6: { title: '🐟 LIVE WELL', fluidType: 'Live Well' },
  9: { title: '🛢️ OIL', fluidType: 'Engine Oil' },
} as const;
```

**Dynamic Widget Creation:**
```typescript
// Scan NMEA data for active instances
const detectBatteryInstances = (nmeaData: any): BatteryInstance[] => {
  return Object.keys(nmeaData.batteries || {})
    .map(instanceKey => {
      const instance = parseInt(instanceKey);
      const config = NMEA_BATTERY_INSTANCES[instance];
      return {
        instance,
        title: config?.title || `🔋 BATTERY #${instance}`,
        data: nmeaData.batteries[instanceKey]
      };
    });
};

// Result: Multiple dedicated widgets per detected instance
// - 🔋 HOUSE Widget (Instance 0)
// - 🔋 THRUSTER Widget (Instance 2)  
// - 🛢️ FUEL PORT Widget (Instance 0)
// - 💧 WATER FRESH Widget (Instance 2)
```

### **Monochromatic Design with Alert Colors**

**Base Monochromatic Palette:**
```typescript
export const MONOCHROME_PALETTE = {
  // Primary content (PrimaryMetricCell)
  text: '#0F172A',          // Primary values (36pt)
  textSecondary: '#475569', // Labels, units, secondary metrics (24pt)
  
  // Interface elements
  background: '#FFFFFF',    // Widget backgrounds
  surface: '#F8FAFC',      // Dashboard background
  border: '#CBD5E1',       // Widget borders
  iconSecondary: '#64748B', // Icons, indicators
} as const;
```

**Marine-Safe Display Mode System (Critical for Night Vision):**
```typescript
export const MARINE_DISPLAY_MODES = {
  day: {
    name: 'Day Mode',
    description: 'Full brightness, monochromatic design with selective color alerts',
    screenBrightness: 1.0, // 100% - use device maximum
    colors: {
      background: '#FFFFFF',
      surface: '#F8FAFC', 
      text: '#0F172A',
      textSecondary: '#475569',
      border: '#CBD5E1',
      // Alert colors (override monochrome for safety)
      warning: '#EA580C',
      critical: '#DC2626',
      success: '#16A34A',
    },
  },
  night: {
    name: 'Night Mode', 
    description: 'Reduced brightness, maintains readability without destroying night vision',
    screenBrightness: 0.3, // 30% - significant reduction
    colors: {
      background: '#0A0A0A', // Very dark gray, not pure black
      surface: '#1A1A1A',
      text: '#A0A0A0',      // Dim gray text
      textSecondary: '#606060',
      border: '#404040',
      // Dimmed alert colors
      warning: '#B8860B',   // Dark gold
      critical: '#8B0000',  // Dark red
      success: '#006400',   // Dark green
    },
  },
  'red-night': {
    name: 'Red Night Mode',
    description: 'CRITICAL: Marine night navigation mode - preserves night vision completely',
    screenBrightness: 0.05, // 5% - MAXIMUM for marine safety
    colors: {
      background: '#0A0000', // Very dark red-black
      surface: '#1A0000',    // Slightly lighter red-black
      text: '#440000',       // Dim red text (RGB: 68,0,0)
      textSecondary: '#330000', // Darker red secondary text
      border: '#220000',     // Very dark red borders
      // ALL alerts use same dim red - no bright colors allowed
      warning: '#440000',    // Same as text - no differentiation by brightness
      critical: '#440000',   // Differentiated by animation, not color
      success: '#440000',    // All feedback uses dim red
    },
    animations: {
      // Critical alerts use animation since color differentiation unavailable
      warning: 'pulse',      // 1.5s gentle pulse
      critical: 'flicker',   // 300ms quick flicker
      normal: 'none',
    },
  },
} as const;

// Native brightness integration
export const BRIGHTNESS_CONTROL = {
  // Use native APIs when available
  setBrightness: async (mode: DisplayMode) => {
    const targetBrightness = MARINE_DISPLAY_MODES[mode].screenBrightness;
    
    try {
      // iOS/Android native brightness control
      if (Platform.OS === 'ios') {
        await Brightness.setBrightnessAsync(targetBrightness);
      } else if (Platform.OS === 'android') {
        await Brightness.setSystemBrightnessAsync(targetBrightness);
      }
    } catch (error) {
      // Fallback: Theme-based dimming if native control unavailable
      console.warn('Native brightness control unavailable, using theme-based dimming');
    }
  },
  
  // Automatic theme switching based on time/GPS
  getRecommendedMode: (currentTime: Date, location?: { lat: number; lon: number }) => {
    const hour = currentTime.getHours();
    
    // Basic time-based switching (can be enhanced with sunset/sunrise calculation)
    if (hour >= 22 || hour <= 5) {
      return 'red-night'; // Critical night navigation hours
    } else if (hour >= 19 || hour <= 7) {
      return 'night'; // Twilight hours
    } else {
      return 'day'; // Daylight hours
    }
  },
} as const;
```

### **Alert Threshold Color System**

**Day Mode Alert Colors:**
```typescript
export const ALERT_COLORS_DAY = {
  normal: '#0F172A',      // Standard monochrome text
  warning: '#EA580C',     // Orange - approaching threshold
  critical: '#DC2626',    // Red - exceeding threshold
  
  // Background tints for severe alerts
  warningBg: '#FFF7ED',   // Light orange background
  criticalBg: '#FEF2F2',  // Light red background
} as const;
```

**Night/Red Mode Alert Behavior:**
```typescript
export const ALERT_BEHAVIORS_NIGHT = {
  normal: {
    color: '#DC2626',     // Standard red night mode color
    animation: 'none',
  },
  warning: {
    color: '#DC2626',     // Same red color
    animation: 'pulse',   // 1.5s pulse animation
    timing: '1500ms ease-in-out infinite',
  },
  critical: {
    color: '#DC2626',     // Same red color  
    animation: 'flicker', // 200ms quick flicker
    timing: '200ms linear infinite',
  },
} as const;
```

**Alert Animation Specifications:**
```typescript
// Pulse animation for warning state (Night/Red mode)
const pulseAnimation = {
  '0%': { opacity: 0.7 },
  '50%': { opacity: 1.0 },
  '100%': { opacity: 0.7 },
};

// Flicker animation for critical state (Night/Red mode)
const flickerAnimation = {
  '0%': { opacity: 1.0 },
  '10%': { opacity: 0.3 },
  '20%': { opacity: 1.0 },
  '30%': { opacity: 0.3 },
  '40%': { opacity: 1.0 },
  '100%': { opacity: 1.0 },
};
```

**Alert Application Rules:**
- **Values:** Apply alert colors to metric values and graph lines
- **Icons:** Apply alert colors to relevant status icons
- **Backgrounds:** Use tinted backgrounds only for critical marine safety alerts (depth, engine)
- **Consistency:** All widgets with same data type use identical thresholds (e.g., all engine RPM widgets)

### **Typography Hierarchy**

**Standardized Font Specifications:**
```typescript
export const TYPOGRAPHY_SCALE = {
  // Widget headers
  widgetTitle: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    color: 'textSecondary', // Always secondary gray
  },
  
  // Primary metric values
  metricValue: {
    fontSize: 36,
    fontWeight: '800',
    fontFamily: 'monospace', // Ensures consistent number width
    letterSpacing: 0.5,
    color: 'text', // Primary black (with alert overrides)
  },
  
  // Metric units
  metricUnit: {
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: 0.2,
    color: 'textSecondary',
  },
  
  // Secondary information
  metricLabel: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    color: 'textSecondary',
  },
} as const;
```

### **Widget Title Display Standards**

**Title Requirements:**
- All widgets MUST display descriptive titles in header section
- Titles use `widgetTitle` typography (11pt, bold, uppercase, gray)
- Title should be descriptive enough for screen readers
- Multi-word titles use spaces, not underscores (e.g., "WATER TEMP", not "WATER_TEMP")

**Common Widget Titles:**
```typescript
export const STANDARD_WIDGET_TITLES = {
  depth: 'DEPTH',
  speed: 'SPEED', // or 'COG / SOG' for combined display
  wind: 'WIND',
  compass: 'COMPASS', 
  engine: 'ENGINE', // or 'ENGINE PORT', 'ENGINE STBD'
  battery: 'BATTERY',
  gps: 'GPS POSITION',
  temperature: 'WATER TEMP',
  autopilot: 'AUTOPILOT',
  tanks: 'TANKS',
} as const;
```

### **Content Hierarchy Standards**

**Widget Content Priority:**
1. **Primary Value:** Largest, monospace font, center-aligned (PrimaryMetricCell)
2. **Secondary Metrics:** Smaller, lighter color (SecondaryMetricCell)
3. **Graphics/Charts:** Integrated within grid system
4. **Status Indicators:** Subtle, non-intrusive

---

## Clean Dashboard Implementation Guide

### **Development Cleanup Tasks**

**Immediate Removals:**
1. **Remove PlaybackFilePicker component** - Development testing only
2. **Remove GridOverlay component** - Layout debugging tool
3. **Remove ExampleWidget component** - Development template
4. **Clean bottom navigation** - Remove all buttons except autopilot
5. **Remove demo/stress test controls** - Development clutter

**Component Updates:**
1. **Rename MetricCell → PrimaryMetricCell**
2. **Create SecondaryMetricCell component** (smaller, lighter)
3. **Create GPSCoordinateDisplay component** (DMS/DDM/DD formats)
4. **Create DateTimeDisplay component** (UTC with day of week)
5. **Create interactive CompassRose component** (TRUE/MAG toggle)

**Layout System Implementation:**
1. **Replace fixed widget sizing** with responsive calculations
2. **Implement dynamic widget flow** algorithm (top-left → bottom-right)
3. **Add pagination system** with page indicator dots
4. **Position blue + button** at end of widget flow
5. **Ensure autopilot button** fixed at screen bottom

### **Widget Migration Checklist**

**Per Widget Updates:**
- [ ] Convert to grid-based layout (1×1 to 2×3)
- [ ] Implement PrimaryMetricCell for main metrics
- [ ] Add SecondaryMetricCell for expanded view
- [ ] Define clear PRIMARY/SECONDARY views
- [ ] Handle tap (expand/collapse) and long press (options)
- [ ] Apply responsive sizing logic
- [ ] Test on phone/tablet/desktop layouts

**Multi-Instance Widget Implementation:**
- [ ] **Engine Widgets:** Scan NMEA engine instances → create Engine #1, #2, etc.
- [ ] **Battery Widgets:** Map NMEA battery instances → House, Thruster, Generator
- [ ] **Tank Widgets:** Map NMEA tank instances → Fuel Port, Water Fresh, etc.

### **Final Dashboard Architecture**

```
Dashboard Structure:
├── HeaderBar (connection, hamburger menu)
├── DashboardArea (responsive widget grid)
│   ├── Page 1: Essential Navigation Widgets
│   ├── Page 2: Engine/Battery/Tank Widgets  
│   ├── Page N: [Blue + Button]
│   └── PageIndicators (dots)
└── AutopilotControl (fixed bottom, full width)

Widget Categories:
├── Essential (always available)
│   ├── Depth, Speed, Wind, GPS, Compass
│   └── Autopilot Status, Rudder Position
├── Multi-Instance (dynamically created)  
│   ├── Engine #1, #2, #3...
│   ├── Battery House, Thruster, Generator...
│   └── Tank Fuel Port, Water Fresh...
└── Interaction Elements
    ├── Blue + Button (add widgets)
    └── Hamburger Menu (settings, theme, connection)
```

This architecture creates a **clean, focused navigation dashboard** with essential marine instruments always accessible while keeping system monitoring organized and removing all development clutter.
3. **Mnemonic Label:** Small, uppercase, above value
4. **Secondary Info:** Smallest, below primary value (trends, status)
5. **Icon:** Header only, visual mnemonic, never decorative

**Information Density Guidelines:**
- **1×1 widgets:** Single primary metric only
- **1×2 widgets:** Primary metric + 1-2 secondary values
- **2×1 widgets:** Primary metric + analog visualization (gauge, compass)
- **2×2 widgets:** Multiple related metrics (engine dashboard, autopilot controls)

### **Implementation Requirements**

**Enhanced Widget Template with State Management:**
```typescript
// All widgets must follow this structure with state management
export const StandardWidget: React.FC<Props> = ({ widgetId, ...props }) => {
  const theme = useTheme();
  const widgetStore = useWidgetStore();
  const widget = widgetStore.widgets.find(w => w.id === widgetId);
  
  if (!widget) return null;
  
  const alertState = calculateAlertState(props.value, widget.config.thresholds);
  const isExpanded = widget.viewState === 'expanded' || widget.viewState === 'fullscreen';
  
  const handleCaretPress = () => {
    widgetStore.toggleWidgetExpansion(widgetId);
    widgetStore.updateWidgetInteraction(widgetId);
  };
  
  const handlePinToggle = () => {
    if (widget.isPinned) {
      widgetStore.unpinWidget(widgetId);
    } else {
      widgetStore.pinWidget(widgetId);
    }
  };
  
  const handleLongPress = () => {
    // Show widget configuration menu
    showWidgetMenu(widgetId);
  };
  
  return (
    <WidgetCard
      title={STANDARD_WIDGET_TITLES.depth}
      icon="water-outline"
      state={alertState}
      expanded={isExpanded}
      isPinned={widget.isPinned}
      onLongPress={handleLongPress}
      testID={`widget-${widget.type}-${widgetId}`}
    >
      {/* Widget Header with Controls */}
      <WidgetHeader>
        <WidgetTitle>{STANDARD_WIDGET_TITLES.depth}</WidgetTitle>
        <WidgetControls>
          {/* Pin Button (only show when expanded) */}
          {isExpanded && (
            <PinButton
              isPinned={widget.isPinned}
              onPress={handlePinToggle}
              testID="widget-pin-button"
            />
          )}
          
          {/* Expansion Caret */}
          <ExpansionCaret
            isExpanded={isExpanded}
            onPress={handleCaretPress}
            testID="widget-expansion-caret"
          />
        </WidgetControls>
      </WidgetHeader>
      
      {/* Primary Content (Always Visible) */}
      <PrimaryContent>
        <PrimaryMetricCell
          mnemonic="DEPTH"
          value={formatValue(props.value)}
          unit={widget.config.unit || 'ft'}
          state={alertState}
          precision={widget.config.precision}
          onPress={handleCaretPress} // Entire cell clickable for expansion
        />
      </PrimaryContent>
      
      {/* Secondary Content (Shown When Expanded) */}
      {isExpanded && (
        <SecondaryContent>
          <SecondaryMetricCell
            mnemonic="AVG"
            value={formatValue(props.averageValue)}
            unit={widget.config.unit || 'ft'}
            compact={widget.config.compactMode}
          />
          <SecondaryMetricCell
            mnemonic="MAX"
            value={formatValue(props.maxValue)}
            unit={widget.config.unit || 'ft'}
            compact={widget.config.compactMode}
          />
          {/* Historical trend chart, additional metrics, etc. */}
        </SecondaryContent>
      )}
    </WidgetCard>
  );
};

// Supporting Components

interface ExpansionCaretProps {
  isExpanded: boolean;
  onPress: () => void;
  testID?: string;
}

const ExpansionCaret: React.FC<ExpansionCaretProps> = ({ isExpanded, onPress, testID }) => {
  const theme = useTheme();
  const rotation = useSharedValue(isExpanded ? 180 : 0);
  
  // Animate caret rotation
  React.useEffect(() => {
    rotation.value = withTiming(isExpanded ? 180 : 0, { duration: 200 });
  }, [isExpanded]);
  
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotation.value}deg` }],
  }));
  
  return (
    <Pressable
      onPress={onPress}
      style={[styles.caretButton, { borderColor: theme.colors.border }]}
      testID={testID}
      accessible
      accessibilityRole="button"
      accessibilityLabel={isExpanded ? 'Collapse widget' : 'Expand widget'}
    >
      <Animated.View style={animatedStyle}>
        <ChevronIcon
          name="chevron-down" 
          size={14}
          color={theme.colors.textSecondary}
        />
      </Animated.View>
    </Pressable>
  );
};

interface PinButtonProps {
  isPinned: boolean;
  onPress: () => void;
  testID?: string;
}

const PinButton: React.FC<PinButtonProps> = ({ isPinned, onPress, testID }) => {
  const theme = useTheme();
  
  return (
    <Pressable
      onPress={onPress}
      style={[styles.pinButton, { borderColor: theme.colors.border }]}
      testID={testID}
      accessible
      accessibilityRole="button"
      accessibilityLabel={isPinned ? 'Unpin widget' : 'Pin widget expanded'}
    >
      <PinIcon
        name={isPinned ? 'pin-filled' : 'pin-outline'}
        size={12}
        color={isPinned ? theme.colors.warning : theme.colors.textSecondary}
      />
    </Pressable>
  );
};

const styles = StyleSheet.create({
  caretButton: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 4,
  },
  pinButton: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 4,
  },
});
```
```

**Developer Checklist:**
- [ ] Widget displays descriptive title in header
- [ ] All colors use monochromatic palette (except alerts)
- [ ] Icons are outline-style, secondary gray color
- [ ] Alert thresholds implement color+animation system
- [ ] Typography follows standardized scale
- [ ] Widget conforms to grid size constraints
- [ ] Night mode uses red-only palette with animations
````

**Project-Specific Patterns:**
- **Widget HOC:** All widgets wrapped with `WidgetCard` for consistent styling
- **NMEA Data Subscription:** Use `useNMEAData(parameter)` hook, not direct store access
- **Unit Conversion:** Use `src/utils/unitConversion.ts` for all conversions
- **Timestamps:** Always include `timestamp` field in NMEA store updates for staleness detection

---

**Document Complete - Frontend Architecture v1.0**

This architecture document provides developers and AI agents with complete technical specifications for building the Boating Instruments App frontend. All patterns, conventions, and code templates are production-ready and aligned with the UI/UX specification.

