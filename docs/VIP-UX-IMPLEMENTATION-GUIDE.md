# VIP Platform: UX Implementation Guide
## Strategic Decisions & Tactical Execution Plan

**Document Version:** 1.0
**Created:** 2025-10-20
**Author:** Sally (UX Expert) + Pieter (Product Strategy)
**Status:** APPROVED - Ready for Implementation

---

## Executive Summary

This document translates strategic UX decisions into actionable implementation guidance for the VIP Platform development team. All decisions are **approved and locked** based on Pieter's strategic direction.

**Key Strategic Decisions:**

1. ✅ **Cross-Platform Day One** - React Native supporting iOS, Android, Web simultaneously
2. ✅ **Platform Chrome / Marine Core Separation** - Native navigation patterns, unified marine UX
3. ✅ **Navigation Session = Glove Mode** - Automatic density switching, no manual toggle
4. ✅ **Platform-Native Voice** - Leverage Siri/Google Assistant (battery optimal)
5. ✅ **Phase 1: NMEA Dashboard** - Core widgets and instruments first
6. ✅ **Phase 2: Camera Integration** - MOB and situational awareness
7. ✅ **Phase 3: BLE Proximity** - Role-based dashboards and crew tracking

---

## Table of Contents

1. [Platform Chrome vs Marine Core Architecture](#1-platform-chrome-vs-marine-core-architecture)
2. [Navigation Session Glove Mode Specification](#2-navigation-session-glove-mode-specification)
3. [Cross-Platform Implementation Strategy](#3-cross-platform-implementation-strategy)
4. [Platform-Specific Navigation Patterns](#4-platform-specific-navigation-patterns)
5. [Component Architecture for Dual-Density UI](#5-component-architecture-for-dual-density-ui)
6. [Voice Integration via Platform APIs](#6-voice-integration-via-platform-apis)
7. [Phase 1 Feature Scope & Priorities](#7-phase-1-feature-scope--priorities)
8. [Development Workflow & Testing Strategy](#8-development-workflow--testing-strategy)

---

## 1. Platform Chrome vs Marine Core Architecture

### 1.1 The Separation Principle

**Pieter's Direction:**
> "Platform-specific 'chrome' for everything regarding platform/device core UI/UX language, but navigation/boating-app specific have common design language/UX/UI across different supported platforms."

**Visual Separation:**

```
┌──────────────────────────────────────────┐
│  PLATFORM CHROME (iOS/Android/Web)       │ ← Native to each platform
│  - Navigation (Tab Bar vs Drawer)       │
│  - Status Bar                            │
│  - System Dialogs                        │
│  - Input Methods (Keyboard, etc)        │
├──────────────────────────────────────────┤
│                                          │
│  MARINE CORE (Unified Across Platforms) │ ← Same everywhere
│  - Widget Design                         │
│  - Dashboard Layout                      │
│  - Theme System (Day/Night/Red-Night)   │
│  - Autopilot Controls                    │
│  - Alarm Handling                        │
│  - NMEA Data Display                     │
│                                          │
├──────────────────────────────────────────┤
│  PLATFORM CHROME                         │ ← Native again
│  - Bottom Navigation / FAB               │
│  - Gesture Handling                      │
└──────────────────────────────────────────┘
```

---

### 1.2 Platform Chrome Components (Platform-Specific)

**iOS Chrome:**
```typescript
// iOS-specific navigation structure
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

// iOS Tab Bar (bottom on iPhone, sidebar on iPad)
<Tab.Navigator
  screenOptions={{
    tabBarStyle: Platform.OS === 'ios' ? styles.iosTabBar : styles.hidden,
    headerStyle: styles.iosHeader,
  }}
>
  <Tab.Screen name="Dashboard" component={DashboardScreen}
    options={{
      tabBarIcon: ({ color }) => <SFSymbol name="gauge" color={color} />,
    }}
  />
  <Tab.Screen name="Autopilot" component={AutopilotScreen}
    options={{
      tabBarIcon: ({ color }) => <SFSymbol name="location.circle" color={color} />,
    }}
  />
  <Tab.Screen name="Settings" component={SettingsScreen}
    options={{
      tabBarIcon: ({ color }) => <SFSymbol name="gearshape" color={color} />,
    }}
  />
</Tab.Navigator>
```

**Android Chrome:**
```typescript
// Android-specific navigation structure
import { createDrawerNavigator } from '@react-navigation/drawer';

const Drawer = createDrawerNavigator();

// Android Navigation Drawer (hamburger menu)
<Drawer.Navigator
  screenOptions={{
    drawerType: 'front',
    drawerStyle: styles.androidDrawer,
    headerStyle: styles.androidHeader,
  }}
>
  <Drawer.Screen name="Dashboard" component={DashboardScreen}
    options={{
      drawerIcon: ({ color }) => <MaterialIcon name="dashboard" color={color} />,
      headerLeft: () => <HamburgerMenuButton />,
    }}
  />
  <Drawer.Screen name="Autopilot" component={AutopilotScreen}
    options={{
      drawerIcon: ({ color }) => <MaterialIcon name="my_location" color={color} />,
    }}
  />
  <Drawer.Screen name="Settings" component={SettingsScreen}
    options={{
      drawerIcon: ({ color }) => <MaterialIcon name="settings" color={color} />,
    }}
  />
</Drawer.Navigator>

// FAB for primary action (Add Widget)
<FAB
  icon={<MaterialIcon name="add" />}
  onPress={() => navigation.navigate('WidgetSelector')}
  style={styles.androidFAB}
/>
```

**Web Chrome:**
```typescript
// Web-specific responsive navigation
import { useMediaQuery } from 'react-responsive';

const WebNavigation: React.FC = () => {
  const isMobile = useMediaQuery({ maxWidth: 768 });

  if (isMobile) {
    // Mobile web: Use drawer (like Android)
    return <DrawerNavigation />;
  } else {
    // Desktop web: Use sidebar
    return (
      <div className="desktop-layout">
        <Sidebar />
        <MainContent />
      </div>
    );
  }
};
```

---

### 1.3 Marine Core Components (Platform-Agnostic)

**These components look IDENTICAL on iOS, Android, and Web:**

```typescript
// Marine Core - Same everywhere
export const WidgetCard: React.FC<WidgetCardProps> = ({ ... }) => {
  const theme = useTheme(); // Marine theme system

  return (
    <View style={[
      styles.widgetCard,
      {
        backgroundColor: theme.surface,
        borderColor: theme.border,
        borderRadius: 8, // Same on all platforms
        elevation: 2,    // Same shadow
      }
    ]}>
      {/* Widget content - identical across platforms */}
    </View>
  );
};

// Autopilot Controls - Same everywhere
export const AutopilotControls: React.FC = () => {
  const { gloveModeActive } = useNavigationSession();
  const buttonSize = gloveModeActive ? 64 : 48; // Density changes, not design

  return (
    <View style={styles.autopilotFooter}>
      <TouchableButton
        size={buttonSize}
        onPress={() => adjustHeading(-10)}
        icon="arrow-left"
      >
        -10°
      </TouchableButton>
      {/* Same buttons on iOS, Android, Web */}
    </View>
  );
};

// Dashboard Layout - Same grid system everywhere
export const DashboardGrid: React.FC = () => {
  const { layout } = useResponsiveGrid();

  return (
    <View style={[styles.grid, {
      gridTemplateColumns: `repeat(${layout.cols}, 1fr)`,
      gap: layout.gap,
    }]}>
      {widgets.map(widget => (
        <WidgetCard key={widget.id} {...widget} />
      ))}
    </View>
  );
};
```

**Key Principle:** If it's marine-specific (widgets, autopilot, alarms, NMEA), it's **Marine Core** and looks the same everywhere. Only navigation shell is platform-specific.

---

### 1.4 Icon System Strategy

**Problem:** SF Symbols (iOS) vs Material Icons (Android) vs Font Awesome (Web)

**Solution:** Abstraction layer

```typescript
// Icon abstraction for platform chrome
export const PlatformIcon: React.FC<{
  name: 'dashboard' | 'settings' | 'alarms' | 'add' | 'back';
  size?: number;
  color?: string;
}> = ({ name, size = 24, color }) => {

  const iconMap = {
    ios: {
      dashboard: 'gauge',
      settings: 'gearshape',
      alarms: 'bell',
      add: 'plus',
      back: 'chevron.left',
    },
    android: {
      dashboard: 'dashboard',
      settings: 'settings',
      alarms: 'notifications',
      add: 'add',
      back: 'arrow_back',
    },
    web: {
      dashboard: 'dashboard',
      settings: 'settings',
      alarms: 'notifications',
      add: 'add',
      back: 'arrow_back',
    },
  };

  const platform = Platform.OS === 'ios' ? 'ios'
                 : Platform.OS === 'android' ? 'android'
                 : 'web';

  const iconName = iconMap[platform][name];

  if (Platform.OS === 'ios') {
    return <SFSymbol name={iconName} size={size} color={color} />;
  } else {
    return <MaterialIcon name={iconName} size={size} color={color} />;
  }
};

// Marine icons - same everywhere (custom SVG)
export const MarineIcon: React.FC<{
  name: 'compass' | 'depth' | 'wind' | 'autopilot';
}> = ({ name, size, color }) => {
  // Custom SVG icons for marine-specific concepts
  return <CustomSVG name={name} size={size} color={color} />;
};
```

---

## 2. Navigation Session Glove Mode Specification

### 2.1 Strategic Decision

**Pieter's Direction:**
> "Glove Mode: We have the concept of navigation session. Once that is started the UI should go into Glove Mode. If disabled it should go in the native device UI density."

**Translation:**
- ✅ **Navigation Session Active** → Glove Mode (64pt targets, 120px gestures, sparse)
- ✅ **Navigation Session Inactive** → Native Density (40-48pt targets, standard gestures, can be denser)
- ✅ **Automatic switching** - No manual toggle, system knows context
- ✅ **Applies to all platforms** - Phone, tablet, web (if used on boat WiFi)

---

### 2.2 Navigation Session State Management

```typescript
// Global navigation session store (Zustand)
interface NavigationSessionState {
  // Session state
  isActive: boolean;
  startTime: Date | null;
  destination: Waypoint | null;

  // Derived state for UI
  gloveModeActive: boolean; // Computed from isActive

  // Actions
  startNavigationSession: (destination?: Waypoint) => void;
  endNavigationSession: () => void;
}

export const useNavigationSession = create<NavigationSessionState>((set, get) => ({
  isActive: false,
  startTime: null,
  destination: null,

  // Derived - glove mode mirrors navigation session
  get gloveModeActive() {
    return get().isActive;
  },

  startNavigationSession: (destination) => {
    set({
      isActive: true,
      startTime: new Date(),
      destination,
    });

    // Log analytics
    Analytics.track('Navigation Session Started', { destination });

    // Trigger UI reconfiguration
    EventBus.emit('ui:glove-mode:enabled');
  },

  endNavigationSession: () => {
    const duration = Date.now() - (get().startTime?.getTime() || 0);

    set({
      isActive: false,
      startTime: null,
      destination: null,
    });

    // Log analytics
    Analytics.track('Navigation Session Ended', { duration });

    // Trigger UI reconfiguration
    EventBus.emit('ui:glove-mode:disabled');
  },
}));
```

---

### 2.3 UI Density Configuration

```typescript
// UI density settings based on navigation session
interface UIDensityConfig {
  touchTargetSize: number;
  swipeThreshold: number;
  longPressDuration: number;
  fontSize: {
    body: number;
    heading: number;
    value: number;
  };
  spacing: {
    grid: number;
    padding: number;
  };
}

const UI_DENSITY: Record<'glove' | 'native', UIDensityConfig> = {
  glove: {
    touchTargetSize: 64,
    swipeThreshold: 120,
    longPressDuration: 300,
    fontSize: {
      body: 18,
      heading: 24,
      value: 48,
    },
    spacing: {
      grid: 16,
      padding: 16,
    },
  },
  native: {
    touchTargetSize: 44,
    swipeThreshold: 50,
    longPressDuration: 500,
    fontSize: {
      body: 16,
      heading: 20,
      value: 36,
    },
    spacing: {
      grid: 8,
      padding: 12,
    },
  },
};

// Hook to get current density config
export const useUIDensity = (): UIDensityConfig => {
  const { gloveModeActive } = useNavigationSession();

  return UI_DENSITY[gloveModeActive ? 'glove' : 'native'];
};
```

---

### 2.4 Component Adaptation Examples

**Button Component:**
```typescript
export const MarineButton: React.FC<ButtonProps> = ({
  children,
  onPress,
  variant = 'primary',
}) => {
  const density = useUIDensity();
  const theme = useTheme();

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        {
          minWidth: density.touchTargetSize,
          minHeight: density.touchTargetSize,
          paddingHorizontal: density.spacing.padding,
          paddingVertical: density.spacing.padding,
          backgroundColor: pressed
            ? theme.primaryDark
            : theme.primary,
        },
      ]}
      hitSlop={8} // Extra forgiveness
    >
      <Text style={{ fontSize: density.fontSize.body }}>
        {children}
      </Text>
    </Pressable>
  );
};
```

**Dashboard Grid:**
```typescript
export const DashboardGrid: React.FC = () => {
  const density = useUIDensity();
  const { layout } = useResponsiveGrid();

  return (
    <View style={[styles.grid, {
      gap: density.spacing.grid,
      padding: density.spacing.padding,
    }]}>
      {widgets.map(widget => (
        <WidgetCard
          key={widget.id}
          {...widget}
          // Widgets automatically adapt to density
        />
      ))}
    </View>
  );
};
```

**Widget Value Display:**
```typescript
export const MetricValue: React.FC<{ value: number; unit: string }> = ({
  value,
  unit
}) => {
  const density = useUIDensity();
  const theme = useTheme();

  return (
    <View style={styles.metricContainer}>
      <Text style={[
        styles.value,
        {
          fontSize: density.fontSize.value,
          color: theme.text,
        }
      ]}>
        {value.toFixed(1)}
      </Text>
      <Text style={[
        styles.unit,
        {
          fontSize: density.fontSize.body,
          color: theme.textSecondary,
        }
      ]}>
        {unit}
      </Text>
    </View>
  );
};
```

---

### 2.5 Navigation Session Triggers

**When to Start Navigation Session:**

```typescript
// Trigger 1: User explicitly starts navigation
<Button onPress={() => {
  useNavigationSession.getState().startNavigationSession({
    lat: 41.4,
    lon: -70.2,
    name: 'Harbor Entrance',
  });
}}>
  Start Navigation
</Button>

// Trigger 2: Autopilot engagement auto-starts session
const engageAutopilot = (heading: number) => {
  autopilotService.engage(heading);

  // Auto-start navigation session
  if (!useNavigationSession.getState().isActive) {
    useNavigationSession.getState().startNavigationSession();
  }
};

// Trigger 3: Detect boat movement (SOG > threshold)
useEffect(() => {
  if (nmeaData.sog > 2.0 && !navigationSession.isActive) {
    // Prompt user: "Looks like you're underway. Start navigation session?"
    showNavigationPrompt();
  }
}, [nmeaData.sog]);
```

**When to End Navigation Session:**

```typescript
// Trigger 1: User explicitly ends
<Button onPress={() => {
  useNavigationSession.getState().endNavigationSession();
}}>
  End Navigation
</Button>

// Trigger 2: Autopilot disengagement (optional)
const disengageAutopilot = () => {
  autopilotService.disengage();

  // Prompt: "End navigation session too?"
  showEndSessionPrompt();
};

// Trigger 3: Boat stopped (SOG < threshold for 10+ minutes)
useEffect(() => {
  if (nmeaData.sog < 0.5 && navigationSession.isActive) {
    const timer = setTimeout(() => {
      // Auto-end after 10 minutes of no movement
      showAutoEndPrompt();
    }, 10 * 60 * 1000);

    return () => clearTimeout(timer);
  }
}, [nmeaData.sog]);
```

---

### 2.6 Visual Indicators

**Status Bar Indicator:**
```typescript
// Show glove mode status in status bar
<StatusBar>
  <ConnectionStatus />

  {navigationSession.isActive && (
    <GloveModeIndicator>
      🧤 Navigation Mode
    </GloveModeIndicator>
  )}

  <AlarmBadge />
</StatusBar>
```

**Transition Animation:**
```typescript
// Smooth transition between densities
const DensityTransition: React.FC<{ children: React.ReactNode }> = ({
  children
}) => {
  const density = useUIDensity();
  const animatedValue = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.spring(animatedValue, {
      toValue: density.touchTargetSize,
      useNativeDriver: false,
    }).start();
  }, [density]);

  return (
    <Animated.View style={{ transform: [{ scale: animatedValue / 44 }] }}>
      {children}
    </Animated.View>
  );
};
```

---

## 3. Cross-Platform Implementation Strategy

### 3.1 Strategic Decision

**Pieter's Direction:**
> "Cross-platform from day one"

**Translation:**
- ✅ Single codebase (React Native + React Native Web)
- ✅ iOS, Android, Web simultaneously
- ✅ Shared business logic, platform-specific chrome
- ✅ Test on all platforms in parallel
- ✅ Release parity (same features at same time)

---

### 3.2 Technology Stack

```yaml
Core Framework:
  - React Native 0.73+ (latest stable)
  - React Native Web 0.19+ (web support)
  - Expo 50+ (unified tooling, easier multi-platform)

Navigation:
  - @react-navigation/native (cross-platform base)
  - @react-navigation/bottom-tabs (iOS)
  - @react-navigation/drawer (Android)
  - @react-navigation/native-stack (shared)

UI Components:
  - Custom marine components (not UI library - full control)
  - react-native-gesture-handler (gestures)
  - react-native-reanimated (animations)
  - expo-haptics (iOS/Android haptics)

State Management:
  - Zustand (lightweight, TypeScript-first)
  - React Query (NMEA data streaming)
  - AsyncStorage (persistence)

Icons:
  - react-native-vector-icons (Material Icons, FontAwesome)
  - expo-symbols (SF Symbols for iOS)
  - Custom SVG (marine-specific icons)

Platform APIs:
  - expo-speech (voice output, TTS)
  - expo-av (audio playback)
  - @react-native-voice/voice (speech recognition)
  - expo-bluetooth (BLE - future Phase 3)

Development Tools:
  - TypeScript (strict mode)
  - ESLint + Prettier (code quality)
  - Jest + React Native Testing Library (unit tests)
  - Detox (E2E tests on iOS/Android)
  - Playwright (E2E tests on Web)
```

---

### 3.3 Project Structure

```
boatingInstrumentsApp/
├── src/
│   ├── navigation/          # Platform-specific chrome
│   │   ├── index.tsx        # Platform router
│   │   ├── IOSNavigation.tsx
│   │   ├── AndroidNavigation.tsx
│   │   └── WebNavigation.tsx
│   │
│   ├── screens/             # Shared screens
│   │   ├── DashboardScreen.tsx
│   │   ├── AutopilotScreen.tsx
│   │   └── SettingsScreen.tsx
│   │
│   ├── components/          # Marine Core (shared)
│   │   ├── atoms/
│   │   │   ├── MarineButton.tsx
│   │   │   ├── TouchTarget.tsx
│   │   │   └── MarineIcon.tsx
│   │   ├── molecules/
│   │   │   ├── MetricCell.tsx
│   │   │   ├── WidgetCard.tsx
│   │   │   └── PaginationDots.tsx
│   │   └── organisms/
│   │       ├── DashboardGrid.tsx
│   │       ├── AutopilotFooter.tsx
│   │       └── ResponsiveDashboard.tsx
│   │
│   ├── widgets/             # Marine-specific widgets
│   │   ├── DepthWidget.tsx
│   │   ├── SpeedWidget.tsx
│   │   └── ...
│   │
│   ├── platform/            # Platform-specific implementations
│   │   ├── icons/
│   │   │   ├── PlatformIcon.tsx
│   │   │   └── MarineIcon.tsx
│   │   ├── haptics/
│   │   │   ├── index.ios.ts
│   │   │   ├── index.android.ts
│   │   │   └── index.web.ts
│   │   └── voice/
│   │       ├── index.ios.ts
│   │       ├── index.android.ts
│   │       └── index.web.ts
│   │
│   ├── store/               # Shared state
│   │   ├── themeStore.ts
│   │   ├── nmeaStore.ts
│   │   ├── widgetStore.ts
│   │   ├── navigationSessionStore.ts
│   │   └── alarmStore.ts
│   │
│   ├── hooks/               # Shared hooks
│   │   ├── useResponsiveGrid.ts
│   │   ├── useUIDensity.ts
│   │   ├── useNavigationSession.ts
│   │   └── useNMEAData.ts
│   │
│   ├── services/            # Business logic
│   │   ├── nmea/
│   │   ├── autopilot/
│   │   ├── alarms/
│   │   └── voice/
│   │
│   └── theme/               # Marine design system
│       ├── colors.ts
│       ├── typography.ts
│       └── spacing.ts
│
├── ios/                     # iOS-specific native code
├── android/                 # Android-specific native code
├── web/                     # Web-specific config
└── __tests__/               # Tests
```

---

### 3.4 Platform Detection & Routing

```typescript
// src/navigation/index.tsx
import { Platform } from 'react-native';
import IOSNavigation from './IOSNavigation';
import AndroidNavigation from './AndroidNavigation';
import WebNavigation from './WebNavigation';

export const AppNavigation: React.FC = () => {
  // Route to platform-specific navigation
  if (Platform.OS === 'ios') {
    return <IOSNavigation />;
  } else if (Platform.OS === 'android') {
    return <AndroidNavigation />;
  } else {
    return <WebNavigation />;
  }
};
```

---

### 3.5 Platform-Specific File Extensions

React Native supports automatic platform-specific files:

```
TouchTarget.tsx           # Shared (default)
TouchTarget.ios.tsx       # iOS-specific override
TouchTarget.android.tsx   # Android-specific override
TouchTarget.web.tsx       # Web-specific override
```

**Example Usage:**
```typescript
// Import automatically resolves to platform-specific file
import { TouchTarget } from './TouchTarget';

// On iOS: Uses TouchTarget.ios.tsx
// On Android: Uses TouchTarget.android.tsx
// On Web: Uses TouchTarget.web.tsx
// Fallback: Uses TouchTarget.tsx
```

---

## 4. Platform-Specific Navigation Patterns

### 4.1 iOS Navigation Implementation

```typescript
// src/navigation/IOSNavigation.tsx
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SFSymbol } from 'expo-symbols';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

export const IOSNavigation: React.FC = () => {
  const theme = useTheme();

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        // iOS tab bar styling
        tabBarStyle: {
          backgroundColor: theme.surface,
          borderTopColor: theme.border,
          paddingBottom: 8,
          height: 88,
        },
        tabBarActiveTintColor: theme.primary,
        tabBarInactiveTintColor: theme.textSecondary,

        // iOS header styling
        headerStyle: {
          backgroundColor: theme.surface,
        },
        headerTintColor: theme.primary,
        headerTitleStyle: {
          fontSize: 17,
          fontWeight: '600',
        },

        // Tab bar icon
        tabBarIcon: ({ focused, color, size }) => {
          const iconName = TAB_ICONS[route.name];
          return <SFSymbol name={iconName} size={size} color={color} />;
        },
      })}
    >
      <Tab.Screen
        name="Dashboard"
        component={DashboardScreen}
        options={{
          tabBarLabel: 'Dashboard',
          headerRight: () => <IOSHeaderButtons />,
        }}
      />

      <Tab.Screen
        name="Autopilot"
        component={AutopilotScreen}
        options={{
          tabBarLabel: 'Autopilot',
        }}
      />

      <Tab.Screen
        name="Settings"
        component={SettingsScreen}
        options={{
          tabBarLabel: 'Settings',
        }}
      />
    </Tab.Navigator>
  );
};

const TAB_ICONS: Record<string, string> = {
  Dashboard: 'gauge',
  Autopilot: 'location.circle',
  Settings: 'gearshape',
};
```

---

### 4.2 Android Navigation Implementation

```typescript
// src/navigation/AndroidNavigation.tsx
import { createDrawerNavigator } from '@react-navigation/drawer';
import MaterialIcon from 'react-native-vector-icons/MaterialIcons';

const Drawer = createDrawerNavigator();

export const AndroidNavigation: React.FC = () => {
  const theme = useTheme();

  return (
    <>
      <Drawer.Navigator
        screenOptions={({ route }) => ({
          // Android drawer styling
          drawerStyle: {
            backgroundColor: theme.surface,
            width: 280,
          },
          drawerActiveTintColor: theme.primary,
          drawerInactiveTintColor: theme.textSecondary,

          // Android header styling (Material Design)
          headerStyle: {
            backgroundColor: theme.primary,
            elevation: 4,
          },
          headerTintColor: '#FFFFFF',
          headerTitleStyle: {
            fontSize: 20,
            fontWeight: '500',
          },

          // Drawer icon
          drawerIcon: ({ focused, color, size }) => {
            const iconName = DRAWER_ICONS[route.name];
            return <MaterialIcon name={iconName} size={size} color={color} />;
          },
        })}
      >
        <Drawer.Screen
          name="Dashboard"
          component={DashboardScreen}
          options={{
            drawerLabel: 'Dashboard',
          }}
        />

        <Drawer.Screen
          name="Autopilot"
          component={AutopilotScreen}
          options={{
            drawerLabel: 'Autopilot',
          }}
        />

        <Drawer.Screen
          name="Settings"
          component={SettingsScreen}
          options={{
            drawerLabel: 'Settings',
          }}
        />
      </Drawer.Navigator>

      {/* Floating Action Button (Android pattern) */}
      <AndroidFAB />
    </>
  );
};

const DRAWER_ICONS: Record<string, string> = {
  Dashboard: 'dashboard',
  Autopilot: 'my-location',
  Settings: 'settings',
};

// Android FAB Component
const AndroidFAB: React.FC = () => {
  const navigation = useNavigation();
  const theme = useTheme();

  return (
    <FAB
      style={{
        position: 'absolute',
        right: 16,
        bottom: 16,
        backgroundColor: theme.primary,
      }}
      icon={() => <MaterialIcon name="add" size={24} color="#FFFFFF" />}
      onPress={() => navigation.navigate('WidgetSelector')}
    />
  );
};
```

---

### 4.3 Web Navigation Implementation

```typescript
// src/navigation/WebNavigation.tsx
import { useMediaQuery } from 'react-responsive';

export const WebNavigation: React.FC = () => {
  const isMobile = useMediaQuery({ maxWidth: 768 });
  const isTablet = useMediaQuery({ minWidth: 769, maxWidth: 1024 });

  if (isMobile) {
    // Mobile web: Use drawer like Android
    return <AndroidNavigation />;
  } else if (isTablet) {
    // Tablet web: Use bottom tabs like iOS
    return <IOSNavigation />;
  } else {
    // Desktop web: Use sidebar
    return <DesktopNavigation />;
  }
};

const DesktopNavigation: React.FC = () => {
  const theme = useTheme();

  return (
    <div className="desktop-layout">
      {/* Sidebar navigation */}
      <nav className="sidebar" style={{ backgroundColor: theme.surface }}>
        <NavItem icon="dashboard" label="Dashboard" to="/dashboard" />
        <NavItem icon="my-location" label="Autopilot" to="/autopilot" />
        <NavItem icon="settings" label="Settings" to="/settings" />
      </nav>

      {/* Main content area */}
      <main className="content">
        <Routes>
          <Route path="/dashboard" element={<DashboardScreen />} />
          <Route path="/autopilot" element={<AutopilotScreen />} />
          <Route path="/settings" element={<SettingsScreen />} />
        </Routes>
      </main>
    </div>
  );
};
```

---

## 5. Component Architecture for Dual-Density UI

### 5.1 Density-Aware Base Components

**TouchTarget (Adaptive Hit Area):**
```typescript
// src/components/atoms/TouchTarget.tsx
export const TouchTarget: React.FC<TouchTargetProps> = ({
  children,
  onPress,
  onLongPress,
  style,
  ...rest
}) => {
  const density = useUIDensity();
  const theme = useTheme();

  return (
    <Pressable
      onPress={onPress}
      onLongPress={onLongPress}
      delayLongPress={density.longPressDuration}
      style={({ pressed }) => [
        {
          minWidth: density.touchTargetSize,
          minHeight: density.touchTargetSize,
          justifyContent: 'center',
          alignItems: 'center',
          backgroundColor: pressed
            ? theme.primaryLight
            : 'transparent',
        },
        style,
      ]}
      hitSlop={8}
      {...rest}
    >
      {children}
    </Pressable>
  );
};
```

**MarineButton (Primary Action Button):**
```typescript
// src/components/atoms/MarineButton.tsx
export const MarineButton: React.FC<MarineButtonProps> = ({
  children,
  onPress,
  variant = 'primary',
  disabled = false,
}) => {
  const density = useUIDensity();
  const theme = useTheme();
  const { gloveModeActive } = useNavigationSession();

  const handlePress = () => {
    // Haptic feedback (stronger in glove mode)
    if (Platform.OS !== 'web') {
      const intensity = gloveModeActive
        ? Haptics.ImpactFeedbackStyle.Heavy
        : Haptics.ImpactFeedbackStyle.Medium;
      Haptics.impactAsync(intensity);
    }

    onPress();
  };

  return (
    <TouchTarget onPress={handlePress}>
      <View style={[
        styles.button,
        {
          paddingHorizontal: density.spacing.padding,
          paddingVertical: density.spacing.padding,
          backgroundColor: disabled
            ? theme.disabled
            : theme[variant],
          borderRadius: 8,
        }
      ]}>
        <Text style={{
          fontSize: density.fontSize.body,
          fontWeight: '600',
          color: theme.textOnPrimary,
        }}>
          {children}
        </Text>
      </View>
    </TouchTarget>
  );
};
```

---

### 5.2 Widget Components (Marine Core)

**WidgetCard (Base Widget Container):**
```typescript
// src/components/molecules/WidgetCard.tsx
export const WidgetCard: React.FC<WidgetCardProps> = ({
  title,
  icon,
  value,
  unit,
  state = 'normal',
  onPress,
  onLongPress,
}) => {
  const density = useUIDensity();
  const theme = useTheme();

  return (
    <TouchTarget
      onPress={onPress}
      onLongPress={onLongPress}
      style={[
        styles.widget,
        {
          backgroundColor: theme.surface,
          borderColor: state === 'alarm' ? theme.danger : theme.border,
          borderWidth: state === 'alarm' ? 2 : 1,
          borderRadius: 8,
          padding: density.spacing.padding,
          elevation: 2,
        }
      ]}
    >
      {/* Widget Header */}
      <View style={styles.header}>
        <MarineIcon name={icon} size={density.fontSize.heading} color={theme.textSecondary} />
        <Text style={{ fontSize: density.fontSize.body, color: theme.textSecondary }}>
          {title}
        </Text>
      </View>

      {/* Widget Value */}
      <View style={styles.value}>
        <Text style={{
          fontSize: density.fontSize.value,
          fontWeight: '700',
          color: theme.text,
        }}>
          {value}
        </Text>
        <Text style={{ fontSize: density.fontSize.body, color: theme.textSecondary }}>
          {unit}
        </Text>
      </View>
    </TouchTarget>
  );
};
```

---

### 5.3 Autopilot Footer (Fixed Component)

**From your open file: AutopilotFooter.tsx**

```typescript
// src/components/organisms/AutopilotFooter.tsx
export const AutopilotFooter: React.FC = () => {
  const density = useUIDensity();
  const theme = useTheme();
  const { engaged, heading } = useAutopilot();
  const { gloveModeActive } = useNavigationSession();

  const adjustHeading = (delta: number) => {
    if (engaged) {
      autopilotService.adjustHeading(delta);
    }
  };

  return (
    <View style={[
      styles.footer,
      {
        height: gloveModeActive ? 88 : 60, // Taller in glove mode
        backgroundColor: theme.surface,
        borderTopColor: theme.border,
        borderTopWidth: 1,
        paddingHorizontal: density.spacing.padding,
      }
    ]}>
      {engaged ? (
        <View style={styles.controls}>
          {/* -10° Button */}
          <MarineButton
            variant="secondary"
            onPress={() => adjustHeading(-10)}
          >
            -10°
          </MarineButton>

          {/* Current Heading Display */}
          <View style={styles.headingDisplay}>
            <Text style={{
              fontSize: density.fontSize.value,
              fontWeight: '700',
              color: theme.primary,
            }}>
              {heading}°
            </Text>
            <Text style={{
              fontSize: density.fontSize.body,
              color: theme.textSecondary,
            }}>
              AUTOPILOT
            </Text>
          </View>

          {/* +10° Button */}
          <MarineButton
            variant="secondary"
            onPress={() => adjustHeading(+10)}
          >
            +10°
          </MarineButton>
        </View>
      ) : (
        <MarineButton
          variant="primary"
          onPress={() => autopilotService.engage(heading)}
        >
          Engage Autopilot
        </MarineButton>
      )}
    </View>
  );
};
```

---

## 6. Voice Integration via Platform APIs

### 6.1 Strategic Decision

**Pieter's Direction:**
> "Wake-up: Use existing platform capabilities if that is most battery optimal."

**Translation:**
- ✅ iOS: Leverage **Siri** + Siri Shortcuts (zero battery drain when not active)
- ✅ Android: Leverage **Google Assistant** (same benefits)
- ✅ Web: Use **Web Speech API** (browser-native)
- ✅ No custom wake word detection (battery killer)
- ✅ Manual activation fallback (microphone button)

---

### 6.2 iOS Voice Implementation (Siri Integration)

```typescript
// src/platform/voice/index.ios.ts
import { IntentsManager, ShortcutsManager } from 'react-native-siri-shortcut';

// Register Siri Shortcuts
export const registerSiriShortcuts = async () => {
  const shortcuts = [
    {
      activityType: 'com.vip.depth',
      title: 'Show depth',
      userInfo: { command: 'show_depth' },
      isEligibleForSearch: true,
      isEligibleForPrediction: true,
    },
    {
      activityType: 'com.vip.eta',
      title: 'What is our ETA',
      userInfo: { command: 'query_eta' },
      isEligibleForPrediction: true,
    },
    {
      activityType: 'com.vip.autopilot',
      title: 'Adjust autopilot',
      userInfo: { command: 'autopilot_adjust' },
      isEligibleForPrediction: true,
    },
  ];

  for (const shortcut of shortcuts) {
    await ShortcutsManager.present Shortcut(shortcut);
  }
};

// Handle Siri commands
export const handleSiriCommand = (command: string, params?: any) => {
  switch (command) {
    case 'show_depth':
      navigateTo('Dashboard', { focusWidget: 'depth' });
      speakResponse(`Current depth is ${nmeaStore.getDepth()} feet`);
      break;

    case 'query_eta':
      const eta = calculateETA();
      speakResponse(`ETA is ${eta.hours} hours ${eta.minutes} minutes`);
      break;

    case 'autopilot_adjust':
      const heading = params.heading;
      adjustAutopilot(heading);
      speakResponse(`Autopilot adjusted to ${heading} degrees`);
      break;
  }
};
```

---

### 6.3 Android Voice Implementation (Google Assistant)

```typescript
// src/platform/voice/index.android.ts
import { GoogleAssistantIntegration } from 'react-native-google-assistant';

// Register Assistant Actions
export const registerAssistantActions = async () => {
  await GoogleAssistantIntegration.registerActions([
    {
      intentName: 'actions.intent.SHOW_DEPTH',
      queryPatterns: ['show depth', 'what is the depth', 'how deep is it'],
      handler: handleShowDepth,
    },
    {
      intentName: 'actions.intent.QUERY_ETA',
      queryPatterns: ['what is our ETA', 'when will we arrive', 'time to destination'],
      handler: handleQueryETA,
    },
    {
      intentName: 'actions.intent.ADJUST_AUTOPILOT',
      queryPatterns: ['adjust autopilot to $heading', 'steer $heading'],
      handler: handleAutopilotAdjust,
    },
  ]);
};

// Handlers (same as iOS)
const handleShowDepth = () => {
  navigateTo('Dashboard', { focusWidget: 'depth' });
  speakResponse(`Current depth is ${nmeaStore.getDepth()} feet`);
};
```

---

### 6.4 Manual Voice Activation (All Platforms)

```typescript
// src/platform/voice/VoiceButton.tsx
export const VoiceButton: React.FC = () => {
  const [isListening, setIsListening] = useState(false);
  const theme = useTheme();
  const density = useUIDensity();

  const startListening = async () => {
    setIsListening(true);

    try {
      const result = await Voice.start('en-US');
      // Will trigger onSpeechResults callback
    } catch (error) {
      console.error('Voice recognition error:', error);
      setIsListening(false);
    }
  };

  const stopListening = async () => {
    await Voice.stop();
    setIsListening(false);
  };

  Voice.onSpeechResults = (event) => {
    const command = event.value[0];
    handleVoiceCommand(command);
    stopListening();
  };

  return (
    <TouchTarget
      onPress={isListening ? stopListening : startListening}
      style={{
        width: density.touchTargetSize,
        height: density.touchTargetSize,
        borderRadius: density.touchTargetSize / 2,
        backgroundColor: isListening ? theme.primary : theme.surface,
      }}
    >
      <MarineIcon
        name="microphone"
        size={density.fontSize.heading}
        color={isListening ? theme.textOnPrimary : theme.text}
      />
    </TouchTarget>
  );
};
```

---

## 7. Phase 1 Feature Scope & Priorities

### 7.1 Strategic Decision

**Pieter's Direction:**
> "Phase 1: Let us get the NMEA Dashboard and Widgets up and running."

**Phase 1 Scope (MVP):**

```yaml
Core Dashboard:
  ✅ Responsive grid system (1×1 to 4×3)
  ✅ Navigation session awareness
  ✅ Glove mode (automatic density switching)
  ✅ Page pagination with swipe
  ✅ Widget state management (collapsed/expanded/pinned)

Essential Widgets:
  ✅ Depth Widget
  ✅ Speed Widget (SOG/STW)
  ✅ Wind Widget (AWA/TWA, AWS/TWS)
  ✅ GPS Widget (position, COG, SOG)
  ✅ Compass Widget (heading)
  ✅ Engine Widget (RPM, temp, pressure)
  ✅ Battery Widget (voltage, current, state)
  ✅ Tanks Widget (fuel, water, holding)

NMEA Integration:
  ✅ WiFi connection to NMEA bridge
  ✅ Auto-discovery (mDNS scan)
  ✅ Real-time data streaming
  ✅ Connection status monitoring
  ✅ Graceful degradation (offline mode)

Autopilot Control:
  ✅ Engage/disengage
  ✅ Heading adjustment (±1°, ±5°, ±10°)
  ✅ Fixed footer component
  ✅ Safety confirmations

Alarm System:
  ✅ Shallow water alarm
  ✅ Deep water alarm
  ✅ Wind speed alarm
  ✅ Battery voltage alarm
  ✅ Visual + audio alerts
  ✅ Acknowledge/snooze

Theme System:
  ✅ Day mode (high contrast, sunlight-readable)
  ✅ Night mode (dark, reduced blue light)
  ✅ Red-night mode (preserve night vision)
  ✅ Auto-switching based on time

Platform Chrome:
  ✅ iOS: Tab bar navigation
  ✅ Android: Drawer navigation + FAB
  ✅ Web: Responsive (drawer → sidebar)
  ✅ Platform-native icons
  ✅ Platform-native modals/dialogs

Settings:
  ✅ NMEA connection config
  ✅ Widget selection
  ✅ Alarm thresholds
  ✅ Theme selection
  ✅ Units (metric/imperial)
  ✅ About/version info
```

**Phase 1 OUT OF SCOPE:**
```yaml
❌ Camera integration (Phase 2)
❌ BLE proximity (Phase 3)
❌ Voice commands (Phase 2 - manual activation only in P1)
❌ Multi-device sync (Phase 3)
❌ Playback/analysis (Phase 2)
❌ Route planning (Phase 2)
❌ Watch app (Phase 2)
❌ TV app (Phase 2)
```

---

### 7.2 Phase 1 Success Criteria

**Must Achieve:**
1. ✅ **Install and connect in <5 minutes** (auto-discovery works)
2. ✅ **All 8 widgets display live NMEA data** (< 1s latency)
3. ✅ **Glove mode works perfectly** (64pt targets, no accidental taps in 20kt wind test)
4. ✅ **Autopilot control is reliable** (+/- heading works 100% of time)
5. ✅ **Alarms trigger within 3 seconds** (visual + audio)
6. ✅ **Runs on iOS, Android, Web** (same features, platform-native feel)
7. ✅ **Offline mode graceful** (shows last-known data, clear indicator)
8. ✅ **Zero crashes in 8-hour sailing session**

---

## 8. Development Workflow & Testing Strategy

### 8.1 Development Environment Setup

```bash
# Install dependencies
npm install

# Run on different platforms simultaneously
npm run ios          # iOS simulator
npm run android      # Android emulator
npm run web          # Web browser (localhost:19006)

# Expo Go for quick testing (physical devices)
npx expo start       # Scan QR code with Expo Go app
```

---

### 8.2 Platform Testing Matrix

| Feature | iOS Simulator | Android Emulator | Web Browser | Physical Device |
|---------|---------------|------------------|-------------|-----------------|
| **Dashboard Grid** | ✅ | ✅ | ✅ | ✅ |
| **Navigation Session** | ✅ | ✅ | ✅ | ✅ Required (BLE) |
| **Glove Mode** | ✅ | ✅ | ✅ | ✅ Required (on boat) |
| **NMEA Connection** | ⚠️ Mock | ⚠️ Mock | ⚠️ Mock | ✅ Required |
| **Haptics** | ⚠️ Limited | ⚠️ Limited | ❌ | ✅ Required |
| **Voice (Siri/GA)** | ⚠️ Limited | ⚠️ Limited | ✅ | ✅ Required |
| **Platform Chrome** | ✅ | ✅ | ✅ | ✅ |

---

### 8.3 Testing Strategy

**Unit Tests (Jest):**
```typescript
// __tests__/hooks/useNavigationSession.test.ts
describe('useNavigationSession', () => {
  it('enables glove mode when navigation session starts', () => {
    const { result } = renderHook(() => useNavigationSession());

    expect(result.current.gloveModeActive).toBe(false);

    act(() => {
      result.current.startNavigationSession();
    });

    expect(result.current.gloveModeActive).toBe(true);
  });
});

// __tests__/hooks/useUIDensity.test.ts
describe('useUIDensity', () => {
  it('returns glove density when navigation active', () => {
    // Mock navigation session active
    useNavigationSession.mockReturnValue({ gloveModeActive: true });

    const { result } = renderHook(() => useUIDensity());

    expect(result.current.touchTargetSize).toBe(64);
    expect(result.current.swipeThreshold).toBe(120);
  });
});
```

**Component Tests:**
```typescript
// __tests__/components/MarineButton.test.tsx
describe('MarineButton', () => {
  it('adapts size to glove mode', () => {
    const { rerender } = render(
      <MarineButton onPress={jest.fn()}>Test</MarineButton>
    );

    // Native density
    expect(screen.getByRole('button')).toHaveStyle({ minHeight: 44 });

    // Enable glove mode
    useNavigationSession.getState().startNavigationSession();
    rerender(<MarineButton onPress={jest.fn()}>Test</MarineButton>);

    // Glove density
    expect(screen.getByRole('button')).toHaveStyle({ minHeight: 64 });
  });
});
```

**E2E Tests (Detox for iOS/Android):**
```typescript
// e2e/navigation-session.e2e.ts
describe('Navigation Session Flow', () => {
  beforeAll(async () => {
    await device.launchApp();
  });

  it('should enable glove mode when starting navigation', async () => {
    await element(by.id('start-navigation-button')).tap();

    // Verify glove mode indicator visible
    await expect(element(by.id('glove-mode-indicator'))).toBeVisible();

    // Verify buttons are larger
    const button = element(by.id('autopilot-adjust-button'));
    await expect(button).toHaveStyle({ height: 64 });
  });
});
```

---

### 8.4 Code Quality Standards

```json
// .eslintrc.json
{
  "extends": [
    "@react-native-community",
    "plugin:@typescript-eslint/recommended"
  ],
  "rules": {
    "no-console": "warn",
    "@typescript-eslint/no-explicit-any": "error",
    "@typescript-eslint/explicit-function-return-type": "warn",
    "react-native/no-inline-styles": "off" // Allow for density adaptation
  }
}
```

```json
// tsconfig.json (strict mode)
{
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "strictFunctionTypes": true
  }
}
```

---

## Appendix A: Implementation Checklist

### Phase 1 Sprint Plan (6 sprints × 2 weeks = 12 weeks)

**Sprint 1: Foundation & Platform Chrome**
- [ ] Project setup (React Native + Expo)
- [ ] Platform detection & routing
- [ ] iOS tab bar navigation
- [ ] Android drawer navigation
- [ ] Web responsive navigation
- [ ] Theme system (Day/Night/Red-Night)
- [ ] Icon abstraction layer

**Sprint 2: Navigation Session & Glove Mode**
- [ ] Navigation session store (Zustand)
- [ ] UI density configuration
- [ ] Glove mode auto-switching
- [ ] TouchTarget component
- [ ] MarineButton component
- [ ] Visual indicators (status bar)

**Sprint 3: Dashboard Grid & Pagination**
- [ ] Responsive grid system (useResponsiveGrid)
- [ ] Dashboard grid layout
- [ ] Page pagination (swipe)
- [ ] PaginationDots component
- [ ] Widget state management (collapsed/expanded/pinned)

**Sprint 4: Core Widgets (Depth, Speed, Wind, GPS)**
- [ ] WidgetCard base component
- [ ] MetricCell component
- [ ] Depth widget
- [ ] Speed widget (SOG/STW)
- [ ] Wind widget (AWA/TWA)
- [ ] GPS widget (position, COG)

**Sprint 5: Advanced Widgets & Autopilot**
- [ ] Compass widget
- [ ] Engine widget (multi-instance)
- [ ] Battery widget
- [ ] Tanks widget
- [ ] AutopilotFooter component
- [ ] Autopilot service integration

**Sprint 6: Alarms & Polish**
- [ ] Alarm system (triggers, notifications)
- [ ] Visual alarm indicators
- [ ] Audio alerts
- [ ] Settings screen
- [ ] NMEA auto-discovery
- [ ] Final testing & bug fixes

---

## Appendix B: Key Design Decisions Summary

| Decision Area | Strategic Choice | Rationale |
|---------------|------------------|-----------|
| **Cross-Platform** | Day-one support for iOS, Android, Web | Single codebase, faster iteration, feature parity |
| **Platform Chrome** | Native navigation per platform (Tab bar vs Drawer) | Respect platform conventions, frictionless UX |
| **Marine Core** | Unified design language across platforms | Brand consistency, predictable marine UX |
| **Glove Mode** | Auto-enable with navigation session | Context-aware, no manual toggle, safety-first |
| **Voice** | Platform-native (Siri/GA) | Battery optimal, familiar to users |
| **Phase 1 Scope** | NMEA dashboard + widgets only | MVP focus, prove core value proposition |
| **Icons** | Platform-specific libs + marine SVG | Native feel for chrome, custom for marine |
| **Density** | Navigation session driven (not manual) | Automatic, intelligent, reduces configuration |

---

## Document History

| Version | Date | Changes | Author |
|---------|------|---------|---------|
| 1.0 | 2025-10-20 | Initial implementation guide based on strategic decisions | Sally + Pieter |

---

**Status:** ✅ APPROVED - Ready for Development

**Next Steps:**
1. Set up React Native + Expo project structure
2. Implement platform navigation chrome (iOS tab bar, Android drawer)
3. Build navigation session store + glove mode system
4. Create first widget (Depth) as reference implementation
5. Iterate based on on-water testing feedback

**Questions Resolved:**
- ✅ Cross-platform from day one
- ✅ Platform-specific chrome, unified marine core
- ✅ Navigation session triggers glove mode automatically
- ✅ Platform-native voice (Siri/GA)
- ✅ Phase 1 focus: NMEA dashboard only
- ✅ Camera = Phase 2, BLE = Phase 3

**Ready to Build!** 🚢
