# Story 8.4: Platform Navigation - Android & Web
## Android Drawer, Material Icons, FAB & Web Responsive Navigation

**Epic:** 8.0 - VIP Platform UI Refactor
**Story ID:** 8.4
**Priority:** P1 (Platform-Specific Chrome)
**Complexity:** L (2-3 sprints)
**Status:** BLOCKED (Waiting for Story 8.3 completion)

**Dependencies:**
- ✅ MUST COMPLETE: Story 8.3 (iOS pattern established, can replicate for Android/Web)
- ✅ MUST HAVE: Story 8.2 (Glove mode must work on all platforms)
- ✅ MUST HAVE: Android development environment (Android Studio, emulator)

---

## Overview

Implement Android-native navigation pattern (drawer with hamburger menu) and web-responsive navigation (drawer for mobile, sidebar for desktop). Add Material Icons for Android/Web and platform icon abstraction layer. Complete cross-platform navigation with Floating Action Button (FAB) for primary action.

**Why This Story:**
- Android users expect drawer navigation (Material Design Guidelines)
- Web needs responsive navigation (drawer on mobile, sidebar on desktop)
- Material Icons match Android/Web design language
- Icon abstraction ensures correct icons on each platform

**User Benefit:**
Android users get familiar drawer navigation with Material Icons. Web users get responsive navigation that adapts to screen size. All platforms share marine core UX while feeling native.

---

## User Stories

### US 8.4.1: Android Navigation Drawer
**As an** Android user of the boating app
**I want** drawer navigation with hamburger menu like other Android apps
**So that** navigation feels natural and familiar

**Acceptance Criteria:**
- AC 1.1: React Navigation drawer installed (`@react-navigation/drawer`)
- AC 1.2: Drawer created with 5 items:
  - Dashboard (main widgets view)
  - Autopilot (full-screen controls)
  - Alarms (alarm history)
  - Settings (app configuration)
  - Help (help system from Story 4.6)
- AC 1.3: Hamburger icon (☰) in top-left of header
- AC 1.4: Drawer slides in from left (Android convention)
- AC 1.5: Drawer styling matches current theme:
  - Day theme: white drawer, gray inactive items, blue active
  - Night theme: dark drawer, gray inactive items, blue active
  - Red Night theme: dark drawer, gray inactive items, red active
- AC 1.6: Active item highlighted with `theme.primary` color
- AC 1.7: Drawer backdrop darkens screen (opacity 0.5)
- AC 1.8: Tap outside drawer → closes
- AC 1.9: Swipe from left edge → opens drawer

**Technical Implementation:**
```typescript
// src/navigation/AndroidNavigation.tsx
import React from 'react';
import { Platform } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createDrawerNavigator } from '@react-navigation/drawer';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useTheme } from '../store/themeStore';
import { DashboardScreen } from '../screens/DashboardScreen';
import { AutopilotScreen } from '../screens/AutopilotScreen';
import { AlarmsScreen } from '../screens/AlarmsScreen';
import { SettingsScreen } from '../screens/SettingsScreen';
import { HelpScreen } from '../screens/HelpScreen';

const Drawer = createDrawerNavigator();

export const AndroidNavigation: React.FC = () => {
  const { theme } = useTheme();

  return (
    <NavigationContainer>
      <Drawer.Navigator
        screenOptions={{
          headerShown: true,
          headerStyle: {
            backgroundColor: theme.background,
          },
          headerTintColor: theme.text,
          drawerActiveTintColor: theme.primary,
          drawerInactiveTintColor: theme.textSecondary,
          drawerStyle: {
            backgroundColor: theme.background,
          },
          drawerLabelStyle: {
            fontSize: 16,
            fontWeight: '500',
          },
        }}
      >
        <Drawer.Screen
          name="Dashboard"
          component={DashboardScreen}
          options={{
            drawerIcon: ({ color, size }) => (
              <Icon name="dashboard" size={size} color={color} />
            ),
          }}
        />

        <Drawer.Screen
          name="Autopilot"
          component={AutopilotScreen}
          options={{
            drawerIcon: ({ color, size }) => (
              <Icon name="my-location" size={size} color={color} />
            ),
          }}
        />

        <Drawer.Screen
          name="Alarms"
          component={AlarmsScreen}
          options={{
            drawerIcon: ({ color, size }) => (
              <Icon name="notifications" size={size} color={color} />
            ),
          }}
        />

        <Drawer.Screen
          name="Settings"
          component={SettingsScreen}
          options={{
            drawerIcon: ({ color, size }) => (
              <Icon name="settings" size={size} color={color} />
            ),
          }}
        />

        <Drawer.Screen
          name="Help"
          component={HelpScreen}
          options={{
            drawerIcon: ({ color, size }) => (
              <Icon name="help" size={size} color={color} />
            ),
          }}
        />
      </Drawer.Navigator>
    </NavigationContainer>
  );
};
```

---

### US 8.4.2: Material Icons Integration
**As a** developer creating Android/Web UI
**I want** Google's Material Icons for consistent design
**So that** icons match Android/Web design language

**Acceptance Criteria:**
- AC 2.1: react-native-vector-icons installed (Material Icons)
- AC 2.2: Material Icons used for drawer navigation:
  - Dashboard: `dashboard`
  - Autopilot: `my-location`
  - Alarms: `notifications`
  - Settings: `settings`
  - Help: `help`
- AC 2.3: Material Icons used for actions:
  - Add widget: `add` (FAB)
  - Close: `close`
  - Menu: `menu` (hamburger)
- AC 2.4: Icon size: 24pt standard (Android spec)
- AC 2.5: Icon color: `theme.textSecondary` inactive, `theme.primary` active
- AC 2.6: Icons render correctly in all themes
- AC 2.7: Icons load on Android and Web (iOS uses SF Symbols from Story 8.3)

**Technical Implementation:**
```typescript
// src/platform/icons/MaterialIcon.tsx
import React from 'react';
import Icon from 'react-native-vector-icons/MaterialIcons';

interface MaterialIconProps {
  name: string;
  size?: number;
  color?: string;
}

export const MaterialIcon: React.FC<MaterialIconProps> = ({
  name,
  size = 24,
  color = '#000000',
}) => {
  return <Icon name={name} size={size} color={color} />;
};

// Common Material Icons for marine app
export const MATERIAL_ICONS = {
  dashboard: 'dashboard',
  autopilot: 'my-location',
  alarms: 'notifications',
  settings: 'settings',
  help: 'help',
  add: 'add',
  close: 'close',
  menu: 'menu',
};
```

---

### US 8.4.3: Floating Action Button (FAB)
**As an** Android user
**I want** a floating action button for adding widgets
**So that** primary action is always accessible

**Acceptance Criteria:**
- AC 3.1: FAB component created (`src/components/atoms/FAB.tsx`)
- AC 3.2: FAB positioned bottom-right (Android convention)
- AC 3.3: FAB icon: Material Icon `add` (plus symbol)
- AC 3.4: FAB color: `theme.primary`
- AC 3.5: Tap FAB → opens WidgetSelector
- AC 3.6: FAB has elevation shadow (8dp)
- AC 3.7: FAB size: 56dp × 56dp (Material Design spec)
- AC 3.8: FAB respects safe area (doesn't overlap navigation bar)
- AC 3.9: FAB visible on Dashboard screen only (not on Settings, Autopilot)
- AC 3.10: FAB animates on press (scale down to 0.9, spring back)

**Technical Implementation:**
```typescript
// src/components/atoms/FAB.tsx
import React from 'react';
import { TouchableOpacity, StyleSheet, Animated } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useTheme } from '../../store/themeStore';

interface FABProps {
  onPress: () => void;
  icon?: string;
}

export const FAB: React.FC<FABProps> = ({ onPress, icon = 'add' }) => {
  const { theme } = useTheme();
  const scaleAnim = React.useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.9,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      friction: 3,
      tension: 40,
      useNativeDriver: true,
    }).start();
  };

  return (
    <Animated.View
      style={[
        styles.fab,
        {
          backgroundColor: theme.primary,
          transform: [{ scale: scaleAnim }],
        },
      ]}
    >
      <TouchableOpacity
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        style={styles.touchable}
        activeOpacity={0.8}
      >
        <Icon name={icon} size={24} color="#FFFFFF" />
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  fab: {
    position: 'absolute',
    bottom: 16,
    right: 16,
    width: 56,
    height: 56,
    borderRadius: 28,
    elevation: 8, // Android shadow
    shadowColor: '#000', // iOS shadow
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  touchable: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
```

**DashboardScreen Integration:**
```typescript
// src/screens/DashboardScreen.tsx (Android-specific addition)
import { Platform } from 'react-native';
import { FAB } from '../components/atoms/FAB';

export const DashboardScreen: React.FC = () => {
  const [widgetSelectorVisible, setWidgetSelectorVisible] = useState(false);

  return (
    <SafeAreaView style={styles.container}>
      {/* ... existing dashboard content ... */}

      {/* Android FAB (iOS uses long-press) */}
      {Platform.OS === 'android' && (
        <FAB onPress={() => setWidgetSelectorVisible(true)} />
      )}

      <WidgetSelector
        visible={widgetSelectorVisible}
        onDismiss={() => setWidgetSelectorVisible(false)}
      />
    </SafeAreaView>
  );
};
```

---

### US 8.4.4: Web Responsive Navigation
**As a** web user on different screen sizes
**I want** navigation that adapts to my screen
**So that** navigation works on mobile, tablet, and desktop browsers

**Acceptance Criteria:**
- AC 4.1: Web navigation component created (`src/navigation/WebNavigation.tsx`)
- AC 4.2: Mobile web (<768px): Drawer navigation (like Android)
- AC 4.3: Tablet web (768-1024px): Bottom tab bar (like iOS)
- AC 4.4: Desktop web (>1024px): Permanent sidebar (always visible)
- AC 4.5: Resize window → navigation adapts smoothly (no flash)
- AC 4.6: Sidebar styling matches theme
- AC 4.7: Sidebar items highlighted on active route
- AC 4.8: Sidebar collapsible on desktop (toggle button)
- AC 4.9: Navigation state persists across page refreshes (localStorage)

**Technical Implementation:**
```typescript
// src/navigation/WebNavigation.tsx
import React, { useState, useEffect } from 'react';
import { View, StyleSheet, useWindowDimensions } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createDrawerNavigator } from '@react-navigation/drawer';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useTheme } from '../store/themeStore';

const Drawer = createDrawerNavigator();
const Tab = createBottomTabNavigator();

type NavigationType = 'drawer' | 'tabs' | 'sidebar';

export const WebNavigation: React.FC = () => {
  const { width } = useWindowDimensions();
  const { theme } = useTheme();
  const [navType, setNavType] = useState<NavigationType>('drawer');

  useEffect(() => {
    // Determine navigation type based on screen width
    if (width < 768) {
      setNavType('drawer'); // Mobile: Drawer
    } else if (width < 1024) {
      setNavType('tabs'); // Tablet: Bottom tabs
    } else {
      setNavType('sidebar'); // Desktop: Permanent sidebar
    }
  }, [width]);

  if (navType === 'drawer') {
    return <DrawerNav />;
  } else if (navType === 'tabs') {
    return <TabNav />;
  } else {
    return <SidebarNav />;
  }
};

// Drawer for mobile web
const DrawerNav = () => {
  // Same as AndroidNavigation
};

// Tabs for tablet web
const TabNav = () => {
  // Same as IOSNavigation
};

// Sidebar for desktop web
const SidebarNav = () => {
  const { theme } = useTheme();
  const [collapsed, setCollapsed] = useState(false);

  return (
    <View style={styles.container}>
      <View
        style={[
          styles.sidebar,
          {
            width: collapsed ? 60 : 240,
            backgroundColor: theme.background,
            borderRightColor: theme.border,
          },
        ]}
      >
        {/* Sidebar content */}
      </View>

      <View style={styles.content}>
        {/* Main content area */}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: 'row',
  },
  sidebar: {
    borderRightWidth: 1,
  },
  content: {
    flex: 1,
  },
});
```

---

### US 8.4.5: Platform Icon Abstraction
**As a** developer using icons across platforms
**I want** a single icon component that renders correctly on each platform
**So that** I don't have to handle platform-specific icons manually

**Acceptance Criteria:**
- AC 5.1: PlatformIcon component created (`src/platform/icons/PlatformIcon.tsx`)
- AC 5.2: Component accepts icon name (dashboard, settings, autopilot, alarms, help, add)
- AC 5.3: iOS: Returns SF Symbol via expo-symbols
- AC 5.4: Android: Returns Material Icon
- AC 5.5: Web: Returns Material Icon
- AC 5.6: Marine-specific icons use custom SVG (same everywhere):
  - Compass, Wind, Depth, Speed, GPS, Battery, Tanks, Engine
- AC 5.7: Icon size prop (default 24pt)
- AC 5.8: Icon color prop (default theme.text)
- AC 5.9: TypeScript types enforce valid icon names

**Technical Implementation:**
```typescript
// src/platform/icons/PlatformIcon.tsx
import React from 'react';
import { Platform } from 'react-native';
import { SymbolView } from 'expo-symbols';
import Icon from 'react-native-vector-icons/MaterialIcons';

// Icon name mapping: universal name → platform-specific name
const ICON_MAP = {
  dashboard: { sf: 'gauge', material: 'dashboard' },
  autopilot: { sf: 'location.circle', material: 'my-location' },
  settings: { sf: 'gearshape', material: 'settings' },
  alarms: { sf: 'bell', material: 'notifications' },
  help: { sf: 'questionmark.circle', material: 'help' },
  add: { sf: 'plus.circle.fill', material: 'add' },
  close: { sf: 'xmark', material: 'close' },
  menu: { sf: 'line.3.horizontal', material: 'menu' },
};

type IconName = keyof typeof ICON_MAP;

interface PlatformIconProps {
  name: IconName;
  size?: number;
  color?: string;
  weight?: 'regular' | 'semibold' | 'bold'; // SF Symbols only
}

export const PlatformIcon: React.FC<PlatformIconProps> = ({
  name,
  size = 24,
  color = '#000000',
  weight = 'regular',
}) => {
  const iconMapping = ICON_MAP[name];

  if (Platform.OS === 'ios') {
    return (
      <SymbolView
        name={iconMapping.sf}
        size={size}
        tintColor={color}
        weight={weight}
        resizeMode="scaleAspectFit"
      />
    );
  } else {
    // Android and Web use Material Icons
    return <Icon name={iconMapping.material} size={size} color={color} />;
  }
};

// Usage example:
// <PlatformIcon name="dashboard" size={24} color={theme.primary} />
// → iOS: SF Symbol "gauge"
// → Android/Web: Material Icon "dashboard"
```

---

## Testing Requirements

### Unit Tests
- [ ] AndroidNavigation renders 5 drawer items
- [ ] Drawer opens/closes correctly
- [ ] Material Icons render on Android/Web
- [ ] FAB component renders with correct size (56dp)
- [ ] FAB press triggers onPress handler
- [ ] WebNavigation adapts to window width changes
- [ ] PlatformIcon returns correct icon per platform

### Integration Tests
- [ ] Android: Tap hamburger → drawer opens
- [ ] Android: Tap Dashboard in drawer → navigates
- [ ] Android: FAB tap → WidgetSelector opens
- [ ] Web: Resize window → navigation adapts (drawer → tabs → sidebar)
- [ ] All platforms: Active navigation item highlighted

### Manual Testing (Android Emulator/Device)

**Drawer Navigation:**
- [ ] Launch app → Dashboard visible
- [ ] Tap hamburger (☰) → drawer slides from left
- [ ] Drawer shows 5 items: Dashboard, Autopilot, Alarms, Settings, Help
- [ ] Active item highlighted with theme.primary
- [ ] Tap Autopilot in drawer → navigates, drawer closes
- [ ] Swipe from left edge → drawer opens
- [ ] Tap outside drawer → drawer closes

**Material Icons:**
- [ ] Dashboard icon: material "dashboard" (grid icon)
- [ ] Autopilot icon: material "my-location" (crosshair)
- [ ] Alarms icon: material "notifications" (bell)
- [ ] Settings icon: material "settings" (gear)
- [ ] Help icon: material "help" (question mark)
- [ ] Icons match Android design language

**FAB (Floating Action Button):**
- [ ] FAB visible on Dashboard screen (bottom-right)
- [ ] FAB not visible on Settings/Autopilot screens
- [ ] FAB color matches theme.primary
- [ ] FAB has elevation shadow (8dp)
- [ ] Tap FAB → scale animation, opens WidgetSelector
- [ ] FAB doesn't overlap content or navigation bar

**Web Responsive (Browser):**
- [ ] Mobile (<768px): Drawer navigation with hamburger
- [ ] Tablet (768-1024px): Bottom tab bar (like iOS)
- [ ] Desktop (>1024px): Permanent sidebar (always visible)
- [ ] Resize window → navigation adapts smoothly
- [ ] Sidebar collapse button works (60px ↔ 240px)

**Platform Icon Abstraction:**
- [ ] iOS: Icons use SF Symbols (crisp vectors)
- [ ] Android: Icons use Material Icons
- [ ] Web: Icons use Material Icons
- [ ] Same icon name renders correctly on all platforms

**Glove Mode Integration (WiFi Bridge):**
- [ ] Load "underway-manual" on Android → Buttons 64pt, spacing 16pt
- [ ] Drawer items still native size (glove mode doesn't affect navigation)
- [ ] FAB still 56dp (native Android spec, unaffected by glove mode)

---

## Definition of Done

- [ ] All 5 user stories completed (ACs met)
- [ ] AndroidNavigation component created
- [ ] WebNavigation component created (responsive)
- [ ] Material Icons integrated (react-native-vector-icons)
- [ ] FAB component created and working
- [ ] PlatformIcon abstraction layer complete
- [ ] All unit tests passing
- [ ] All integration tests passing
- [ ] Manual testing complete on Android emulator
- [ ] Manual testing complete on web browser (mobile, tablet, desktop widths)
- [ ] Glove mode compatibility verified (Android/Web)
- [ ] No regressions (all v2.3 features work)
- [ ] Code review complete
- [ ] Storybook stories created for FAB and PlatformIcon

---

## Context Files for bmm-dev

**Load Before Starting:**
1. `story-8.3-platform-navigation-ios.md` (iOS pattern to replicate for Android/Web)
2. `VIP-UX-IMPLEMENTATION-GUIDE.md` (Platform Chrome section)
3. Material Design Guidelines - Navigation Drawer (web reference)
4. Material Design Guidelines - FAB (web reference)
5. react-native-vector-icons documentation
6. Current `App.tsx` (will add platform detection)
7. Current `DashboardScreen.tsx` (will add FAB for Android)

---

## Implementation Notes

**Cross-Platform Navigation Strategy:**

```
Platform Detection in App.tsx:
┌─────────────────────────────────────┐
│ if (Platform.OS === 'ios')          │
│   return <IOSNavigation />          │ ← Story 8.3
│                                     │
│ else if (Platform.OS === 'android') │
│   return <AndroidNavigation />      │ ← Story 8.4
│                                     │
│ else // web                         │
│   return <WebNavigation />          │ ← Story 8.4
└─────────────────────────────────────┘
```

**Icon Abstraction Benefits:**
- Components use `<PlatformIcon name="dashboard" />`
- iOS automatically gets SF Symbol "gauge"
- Android/Web automatically get Material Icon "dashboard"
- No platform checks needed in component code

**App.tsx Final Structure:**
```typescript
// App.tsx (after Stories 8.3 & 8.4)
import { Platform } from 'react-native';
import { IOSNavigation } from './navigation/IOSNavigation';
import { AndroidNavigation } from './navigation/AndroidNavigation';
import { WebNavigation } from './navigation/WebNavigation';
import { FEATURE_FLAGS } from './config/features';

export default function App() {
  if (!FEATURE_FLAGS.USE_PLATFORM_NAVIGATION) {
    return <CurrentApp />; // OLD: v2.3 code
  }

  // NEW: Platform-specific navigation
  if (Platform.OS === 'ios') {
    return <IOSNavigation />;
  } else if (Platform.OS === 'android') {
    return <AndroidNavigation />;
  } else {
    return <WebNavigation />;
  }
}
```

**Next Story (8.5):**
Story 8.5 will integrate all widgets into the new navigation structure, making them density-aware and ensuring they work on all platforms.

---

## Dev Agent Record

### Context Reference
- **Story Context File:** [story-context-8.4.xml](story-context-8.4.xml)
- **Generated:** 2025-10-20
- **Status:** Ready for Development (once Story 8.3 complete)

### Implementation Notes
- Load story-context-8.4.xml before starting implementation
- Android drawer, Material Icons, FAB pattern
- Web responsive navigation with breakpoint detection
- PlatformIcon abstraction completes cross-platform icon system

---

**Story Owner:** bmm-dev Agent
**Estimated Effort:** 2-3 sprints
**Ready to Start:** Once Story 8.3 complete ✅
