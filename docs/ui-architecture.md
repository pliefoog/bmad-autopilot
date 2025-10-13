# Boating Instruments App Frontend Architecture Document

## Change Log

| Date | Version | Description | Author |
|------|---------|-------------|--------|
| 2025-10-10 | 1.0 | Initial frontend architecture document | Winston (Architect) |

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
| **Testing** | Jest + React Native Testing Library | 29.7+ / 12.4+ | Unit and integration testing | Industry standard; works with Expo; snapshot testing for widgets; async utilities for NMEA data flows |
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
  id: string; // Unique ID (UUID)
  type: WidgetType;
  position: { x: number; y: number }; // Grid position (Epic 2)
  size: { width: number; height: number }; // Widget dimensions
  config: {
    dataSource?: string; // For multi-sensor boats (e.g., 'port-engine')
    unit?: string; // Unit override (e.g., 'meters' instead of default 'feet')
    visualizationStyle?: 'digital' | 'analog' | 'bar'; // Widget display style
  };
}

interface WidgetStoreState {
  widgets: WidgetConfig[];
  addWidget: (type: WidgetType) => void;
  removeWidget: (id: string) => void;
  updateWidgetConfig: (id: string, config: Partial<WidgetConfig['config']>) => void;
  updateWidgetPosition: (id: string, position: { x: number; y: number }) => void;
  updateWidgetSize: (id: string, size: { width: number; height: number }) => void;
  clearDashboard: () => void;
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

  const value = {
    mode,
    colors: colors[mode],
    typography,
    spacing,
    setMode,
  };

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
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
// src/theme/colors.ts
export const colors = {
  day: {
    primary: '#0284C7',
    secondary: '#0EA5E9',
    accent: '#06B6D4',
    success: '#10B981',
    warning: '#F59E0B',
    error: '#EF4444',
    backgroundDark: '#0A1929',
    backgroundMedium: '#1E293B',
    borderGray: '#334155',
    textPrimary: '#FFFFFF',
    textSecondary: '#CBD5E1',
    textTertiary: '#94A3B8',
  },
  night: {
    // Same colors but with 40% reduced brightness
    primary: '#015A89',
    // ... (similar adjustments)
  },
  'red-night': {
    primary: '#DC2626',
    secondary: '#DC2626',
    accent: '#DC2626',
    success: '#DC2626',
    warning: '#DC2626',
    error: '#DC2626',
    backgroundDark: '#1A0000',
    backgroundMedium: '#2A0000',
    borderGray: '#4A0000',
    textPrimary: '#DC2626',
    textSecondary: '#B91C1C',
    textTertiary: '#991B1B',
  },
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
5. **Use theme context for colors** - Never hardcode color values in components
6. **Follow accessibility guidelines** - All interactive elements ≥44pt touch targets
7. **Test with stale data** - Widgets must indicate stale data (>5s old)
8. **Throttle widget updates** - Max 1 update/second per widget (users can't see faster)
9. **Clean up subscriptions** - Use `useEffect` cleanup for Zustand subscriptions
10. **Error boundaries** - Wrap widget rendering in error boundaries (prevent single widget crash from breaking dashboard)

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

**Project-Specific Patterns:**
- **Widget HOC:** All widgets wrapped with `WidgetCard` for consistent styling
- **NMEA Data Subscription:** Use `useNMEAData(parameter)` hook, not direct store access
- **Unit Conversion:** Use `src/utils/unitConversion.ts` for all conversions
- **Timestamps:** Always include `timestamp` field in NMEA store updates for staleness detection

---

**Document Complete - Frontend Architecture v1.0**

This architecture document provides developers and AI agents with complete technical specifications for building the Boating Instruments App frontend. All patterns, conventions, and code templates are production-ready and aligned with the UI/UX specification.

