# Story 8.3: Platform Navigation - iOS
## iOS-Native Tab Bar Navigation with SF Symbols

**Epic:** 8.0 - VIP Platform UI Refactor
**Story ID:** 8.3
**Priority:** P1 (Platform-Specific Chrome)
**Complexity:** M (2 sprints)
**Status:** BLOCKED (Waiting for Story 8.2 completion)

**Dependencies:**
- ✅ MUST COMPLETE: Story 8.2 (Glove mode system must work first)
- ✅ MUST HAVE: Story 8.1 (Feature flags, Storybook)
- ✅ MUST HAVE: iOS development environment (Xcode, iOS simulator)

---

## Overview

Implement iOS-native navigation pattern using bottom tab bar with SF Symbols icons. This replaces the current monolithic App.tsx with proper iOS screen-based architecture while maintaining marine widget UX consistency.

**Why This Story:**
- iOS users expect bottom tab bar navigation (iOS Human Interface Guidelines)
- SF Symbols provide crisp, scalable system icons
- Screen-based architecture enables proper navigation stack
- Establishes "Platform Chrome" pattern (iOS-specific navigation, universal marine core)

**User Benefit:**
iOS users get familiar, native-feeling navigation that "just works" like other iOS apps, while widgets maintain consistent marine UX across all platforms.

---

## User Stories

### US 8.3.1: iOS Tab Bar Navigation
**As an** iOS user of the boating app
**I want** bottom tab bar navigation like other iOS apps
**So that** navigation feels natural and familiar

**Acceptance Criteria:**
- AC 1.1: React Navigation bottom-tabs installed (`@react-navigation/bottom-tabs`)
- AC 1.2: Tab bar created with 5 tabs:
  - Dashboard (main widgets view)
  - Autopilot (full-screen autopilot controls)
  - Alarms (active alarms + history)
  - Settings (app configuration)
  - Help (help content + tutorials)
- AC 1.3: Tab bar positioned at bottom (iOS convention)
- AC 1.4: Tab bar styling matches current theme:
  - Day theme: white background, gray inactive, blue active
  - Night theme: dark background, gray inactive, blue active
  - Red Night theme: dark background, gray inactive, red active
- AC 1.5: Active tab highlighted with `theme.primary` color
- AC 1.6: Tab bar respects safe area insets (notch support)
- AC 1.7: Tab bar visible on all screens (persistent navigation)
- AC 1.8: Haptic feedback on tab press (Medium impact)

**Technical Implementation:**
```typescript
// src/navigation/IOSNavigation.tsx
import React from 'react';
import { Platform } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import * as Haptics from 'expo-haptics';
import { SymbolView } from 'expo-symbols';
import { useTheme } from '../store/themeStore';
import { DashboardScreen } from '../screens/DashboardScreen';
import { AutopilotScreen } from '../screens/AutopilotScreen';
import { AlarmsScreen } from '../screens/AlarmsScreen';
import { SettingsScreen } from '../screens/SettingsScreen';
import { HelpScreen } from '../screens/HelpScreen';

const Tab = createBottomTabNavigator();

export const IOSNavigation: React.FC = () => {
  const { theme } = useTheme();

  const handleTabPress = async () => {
    if (Platform.OS === 'ios') {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
  };

  return (
    <NavigationContainer>
      <Tab.Navigator
        screenOptions={{
          headerShown: false, // We have our own HeaderBar
          tabBarActiveTintColor: theme.primary,
          tabBarInactiveTintColor: theme.textSecondary,
          tabBarStyle: {
            backgroundColor: theme.background,
            borderTopColor: theme.border,
          },
        }}
      >
        <Tab.Screen
          name="Dashboard"
          component={DashboardScreen}
          listeners={{
            tabPress: handleTabPress,
          }}
          options={{
            tabBarIcon: ({ color, size, focused }) => (
              <SymbolView
                name="gauge"
                size={size}
                tintColor={color}
                weight={focused ? 'semibold' : 'regular'}
              />
            ),
          }}
        />

        <Tab.Screen
          name="Autopilot"
          component={AutopilotScreen}
          listeners={{
            tabPress: handleTabPress,
          }}
          options={{
            tabBarIcon: ({ color, size, focused }) => (
              <SymbolView
                name="location.circle"
                size={size}
                tintColor={color}
                weight={focused ? 'semibold' : 'regular'}
              />
            ),
          }}
        />

        <Tab.Screen
          name="Alarms"
          component={AlarmsScreen}
          listeners={{
            tabPress: handleTabPress,
          }}
          options={{
            tabBarIcon: ({ color, size, focused }) => (
              <SymbolView
                name="bell"
                size={size}
                tintColor={color}
                weight={focused ? 'semibold' : 'regular'}
              />
            ),
          }}
        />

        <Tab.Screen
          name="Settings"
          component={SettingsScreen}
          listeners={{
            tabPress: handleTabPress,
          }}
          options={{
            tabBarIcon: ({ color, size, focused }) => (
              <SymbolView
                name="gearshape"
                size={size}
                tintColor={color}
                weight={focused ? 'semibold' : 'regular'}
              />
            ),
          }}
        />

        <Tab.Screen
          name="Help"
          component={HelpScreen}
          listeners={{
            tabPress: handleTabPress,
          }}
          options={{
            tabBarIcon: ({ color, size, focused }) => (
              <SymbolView
                name="questionmark.circle"
                size={size}
                tintColor={color}
                weight={focused ? 'semibold' : 'regular'}
              />
            ),
          }}
        />
      </Tab.Navigator>
    </NavigationContainer>
  );
};
```

---

### US 8.3.2: SF Symbols Integration
**As a** developer creating iOS UI
**I want** Apple's SF Symbols for crisp, native icons
**So that** icons look perfect at any size and match iOS design language

**Acceptance Criteria:**
- AC 2.1: expo-symbols installed and configured
- AC 2.2: SF Symbols used for tab bar icons:
  - Dashboard: `gauge` (instrument cluster icon)
  - Autopilot: `location.circle` (navigation/positioning icon)
  - Alarms: `bell` (notification/alert icon)
  - Settings: `gearshape` (standard settings icon)
  - Help: `questionmark.circle` (help/info icon)
- AC 2.3: Icon size: 24pt standard, 28pt when selected
- AC 2.4: Icon weight: `regular` inactive, `semibold` active
- AC 2.5: Icon color: `theme.textSecondary` inactive, `theme.primary` active
- AC 2.6: Icons render correctly in all themes (Day, Night, Red Night)
- AC 2.7: Fallback for non-iOS platforms (story 8.4 will handle)

**Technical Implementation:**
```typescript
// SF Symbols icon component wrapper
import { SymbolView, SymbolViewProps } from 'expo-symbols';
import { Platform } from 'react-native';

interface SFSymbolProps {
  name: string;
  size?: number;
  color?: string;
  weight?: SymbolViewProps['weight'];
}

export const SFSymbol: React.FC<SFSymbolProps> = ({
  name,
  size = 24,
  color = '#000000',
  weight = 'regular',
}) => {
  if (Platform.OS !== 'ios') {
    // Fallback for non-iOS (story 8.4 will implement Material Icons)
    return null;
  }

  return (
    <SymbolView
      name={name}
      size={size}
      tintColor={color}
      weight={weight}
      resizeMode="scaleAspectFit"
    />
  );
};

// Common SF Symbols for marine app
export const SF_SYMBOLS = {
  dashboard: 'gauge',
  autopilot: 'location.circle',
  settings: 'gearshape',
  alarms: 'bell',
  help: 'questionmark.circle',
  add: 'plus.circle.fill',
  close: 'xmark',
  menu: 'line.3.horizontal',
};
```

---

### US 8.3.3: DashboardScreen Extraction
**As a** user navigating to the Dashboard
**I want** widgets and autopilot controls visible
**So that** I can monitor and control my boat

**Acceptance Criteria:**
- AC 3.1: DashboardScreen created (`src/screens/DashboardScreen.tsx`)
- AC 3.2: DashboardScreen contains:
  - HeaderBar (with glove mode indicator from Story 8.2)
  - AlarmBanner (if alarms active)
  - PaginatedDashboard (widget grid with swipe)
  - AutopilotFooter (density-aware from Story 8.2)
- AC 3.3: Screen accessible via "Dashboard" tab
- AC 3.4: All dashboard functionality works:
  - Widget pagination (swipe between pages)
  - Widget add/remove/edit
  - Autopilot controls
  - Alarm banner interactions
- AC 3.5: Screen layout adapts to glove mode (spacing 8pt → 16pt)
- AC 3.6: Screen respects safe area insets (notch, tab bar)

**Technical Implementation:**
```typescript
// src/screens/DashboardScreen.tsx
import React from 'react';
import { View, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../store/themeStore';
import { useUIDensity } from '../hooks/useUIDensity';
import { HeaderBar } from '../components/HeaderBar';
import { AlarmBanner } from '../widgets/AlarmBanner';
import { PaginatedDashboard } from '../components/PaginatedDashboard';
import { AutopilotFooter } from '../components/organisms/AutopilotFooter';

export const DashboardScreen: React.FC = () => {
  const { theme } = useTheme();
  const density = useUIDensity();

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: theme.background }]}
      edges={['top']} // Tab bar handles bottom
    >
      <HeaderBar />

      <AlarmBanner />

      <View style={[styles.content, { padding: density.spacing }]}>
        <PaginatedDashboard />
      </View>

      <AutopilotFooter />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
  },
});
```

---

### US 8.3.4: iOS-Specific Modals
**As an** iOS user interacting with modals
**I want** iOS-style sheets that swipe to dismiss
**So that** interactions feel natural and familiar

**Acceptance Criteria:**
- AC 4.1: WidgetSelector modal uses iOS sheet presentation
- AC 4.2: Sheet has drag indicator (handle bar at top)
- AC 4.3: Sheet swipe-to-dismiss gesture works
- AC 4.4: Sheet respects safe area insets
- AC 4.5: Sheet backdrop darkens background (opacity 0.5)
- AC 4.6: Sheet animates from bottom (300ms spring animation)
- AC 4.7: ConnectionConfigDialog uses full-screen modal (requires explicit dismiss)
- AC 4.8: Modal backdrop tap-to-dismiss (WidgetSelector only)

**Technical Implementation:**
```typescript
// src/components/modals/WidgetSelectorSheet.tsx
import React from 'react';
import { Modal, View, StyleSheet, TouchableOpacity } from 'react-native';
import { BlurView } from 'expo-blur';
import { useTheme } from '../../store/themeStore';

interface WidgetSelectorSheetProps {
  visible: boolean;
  onDismiss: () => void;
}

export const WidgetSelectorSheet: React.FC<WidgetSelectorSheetProps> = ({
  visible,
  onDismiss,
}) => {
  const { theme } = useTheme();

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onDismiss}
    >
      {/* Backdrop */}
      <TouchableOpacity
        style={styles.backdrop}
        activeOpacity={1}
        onPress={onDismiss}
      >
        <BlurView intensity={20} style={StyleSheet.absoluteFill} />
      </TouchableOpacity>

      {/* Sheet */}
      <View
        style={[
          styles.sheet,
          { backgroundColor: theme.background },
        ]}
      >
        {/* Drag Indicator */}
        <View style={styles.dragIndicator}>
          <View style={[styles.dragHandle, { backgroundColor: theme.border }]} />
        </View>

        {/* Widget selector content */}
        <View style={styles.content}>
          {/* ... existing widget selector UI ... */}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  sheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingBottom: 34, // Safe area for home indicator
    maxHeight: '80%',
  },
  dragIndicator: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  dragHandle: {
    width: 36,
    height: 5,
    borderRadius: 3,
  },
  content: {
    paddingHorizontal: 16,
  },
});
```

---

### US 8.3.5: Haptic Feedback
**As an** iOS user interacting with the app
**I want** haptic feedback for actions
**So that** interactions feel tactile and responsive

**Acceptance Criteria:**
- AC 5.1: expo-haptics installed
- AC 5.2: Tab bar tap → `.impactAsync(Medium)`
- AC 5.3: Autopilot button press → density-aware (Medium native, Heavy glove)
- AC 5.4: Widget add → `.notificationAsync(Success)`
- AC 5.5: Widget remove → `.impactAsync(Light)`
- AC 5.6: Alarm triggered → `.notificationAsync(Error)`
- AC 5.7: Navigation session start → `.notificationAsync(Success)`
- AC 5.8: Navigation session end → `.impactAsync(Medium)`
- AC 5.9: Haptics only fire on iOS (no-op on other platforms)

**Technical Implementation:**
```typescript
// src/utils/haptics.ts
import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

export const haptics = {
  /**
   * Light impact - subtle feedback (widget remove, toggle)
   */
  light: async () => {
    if (Platform.OS === 'ios') {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  },

  /**
   * Medium impact - standard feedback (button press, tab tap)
   */
  medium: async () => {
    if (Platform.OS === 'ios') {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
  },

  /**
   * Heavy impact - strong feedback (glove mode buttons, critical actions)
   */
  heavy: async () => {
    if (Platform.OS === 'ios') {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    }
  },

  /**
   * Success notification - action completed successfully
   */
  success: async () => {
    if (Platform.OS === 'ios') {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
  },

  /**
   * Error notification - alarm triggered, critical error
   */
  error: async () => {
    if (Platform.OS === 'ios') {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
  },

  /**
   * Warning notification - warning condition
   */
  warning: async () => {
    if (Platform.OS === 'ios') {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    }
  },
};
```

---

## Testing Requirements

### Unit Tests
- [ ] IOSNavigation renders 3 tabs (Dashboard, Autopilot, Settings)
- [ ] Tab press triggers haptic feedback
- [ ] Active tab highlighted with theme.primary
- [ ] SF Symbols render on iOS (fallback on other platforms)
- [ ] DashboardScreen contains all required components

### Integration Tests
- [ ] Tap Dashboard tab → DashboardScreen visible
- [ ] Tap Autopilot tab → AutopilotScreen visible
- [ ] Tap Settings tab → SettingsScreen visible
- [ ] Tab bar respects safe area (notch, home indicator)
- [ ] Tab bar styling adapts to theme changes
- [ ] Glove mode active → AutopilotFooter buttons 64pt

### Manual Testing (iOS Simulator/Device)

**Tab Navigation:**
- [ ] Launch app → Dashboard tab active by default
- [ ] Tap Autopilot tab → navigates to autopilot screen
- [ ] Tap Settings tab → navigates to settings screen
- [ ] Tap Dashboard tab → returns to widgets
- [ ] Tab bar always visible (persistent navigation)

**SF Symbols:**
- [ ] Dashboard tab icon: gauge symbol (crisp at all sizes)
- [ ] Autopilot tab icon: location.circle symbol
- [ ] Settings tab icon: gearshape symbol
- [ ] Active tab icon: semibold weight, primary color
- [ ] Inactive tab icon: regular weight, textSecondary color

**DashboardScreen Layout:**
- [ ] HeaderBar visible at top (with glove icon if session active)
- [ ] AlarmBanner appears when alarm triggered
- [ ] PaginatedDashboard swipe works (left/right page navigation)
- [ ] AutopilotFooter docked at bottom (above tab bar)
- [ ] Safe area respected (no overlap with notch or tab bar)

**Glove Mode Integration (WiFi Bridge):**
- [ ] Load "idle-at-marina" → Buttons 44pt, spacing 8pt
- [ ] Load "underway-manual" → Buttons 64pt, spacing 16pt
- [ ] Glove icon appears in HeaderBar
- [ ] Tab bar spacing unaffected (always native iOS sizing)

**iOS-Specific Modals:**
- [ ] Long-press widget → WidgetSelector sheet slides from bottom
- [ ] Sheet has drag handle at top
- [ ] Swipe down on sheet → dismisses
- [ ] Tap backdrop → dismisses sheet
- [ ] Connection modal → full-screen (no swipe dismiss)

**Haptic Feedback:**
- [ ] Tap tab → feel medium haptic
- [ ] Press autopilot button → feel haptic (medium native, heavy glove)
- [ ] Add widget → feel success haptic
- [ ] Remove widget → feel light haptic
- [ ] Trigger alarm → feel error haptic

---

## Definition of Done

- [ ] All 5 user stories completed (ACs met)
- [ ] IOSNavigation component created
- [ ] 3 screens created: Dashboard, Autopilot, Settings
- [ ] SF Symbols integrated (expo-symbols)
- [ ] iOS sheet modals working (swipe to dismiss)
- [ ] Haptic feedback working (all interaction types)
- [ ] All unit tests passing
- [ ] All integration tests passing
- [ ] Manual testing complete on iOS simulator
- [ ] Manual testing complete on physical iOS device (if available)
- [ ] Glove mode compatibility verified (density-aware components work)
- [ ] No regressions (all v2.3 features work in new navigation)
- [ ] Code review complete
- [ ] Storybook stories created for new components

---

## Context Files for bmm-dev

**Load Before Starting:**
1. `story-8.2-glove-mode-system.md` (Glove mode must work with navigation)
2. `VIP-UX-IMPLEMENTATION-GUIDE.md` (Platform Chrome section)
3. iOS Human Interface Guidelines - Tab Bars (web reference)
4. iOS Human Interface Guidelines - Modals (web reference)
5. Current `App.tsx` (will extract dashboard logic)
6. Current `AutopilotFooter.tsx` (already density-aware from Story 8.2)
7. Current `PaginatedDashboard.tsx` (will integrate into DashboardScreen)
8. expo-symbols documentation (SF Symbols usage)

---

## Implementation Notes

**Platform Chrome Pattern:**
This story establishes the "Platform Chrome" pattern for iOS:

```
┌─────────────────────────────────────┐
│ Platform Chrome (iOS-specific)      │
│ - Tab bar navigation (bottom)       │
│ - SF Symbols icons                  │
│ - iOS sheet modals                  │
│ - iOS haptic feedback               │
└─────────────────────────────────────┘
         ▼ Contains ▼
┌─────────────────────────────────────┐
│ Marine Core (Universal)             │
│ - Widget design                     │
│ - Dashboard layout                  │
│ - Theme system                      │
│ - Glove mode density                │
│ - NMEA data display                 │
└─────────────────────────────────────┘
```

**App.tsx Refactor:**
After this story, App.tsx becomes:

```typescript
// App.tsx (simplified)
import { IOSNavigation } from './navigation/IOSNavigation';
import { FEATURE_FLAGS } from './config/features';

export default function App() {
  if (FEATURE_FLAGS.USE_PLATFORM_NAVIGATION) {
    return <IOSNavigation />;  // NEW: Story 8.3
  } else {
    return <CurrentApp />;      // OLD: v2.3 code (until Story 8.6)
  }
}
```

**Next Story (8.4):**
Story 8.4 will implement Android (drawer navigation, Material Icons, FAB) and Web (responsive navigation), completing cross-platform navigation.

---

## Dev Agent Record

### Context Reference
- **Story Context File:** [story-context-8.3.xml](story-context-8.3.xml)
- **Generated:** 2025-10-20
- **Status:** Ready for Development (once Story 8.2 complete)

### Implementation Notes
- Load story-context-8.3.xml before starting implementation
- Platform Chrome pattern established for iOS (tab bar, SF Symbols)
- Extract DashboardScreen from App.tsx, maintain glove mode compatibility

---

**Story Owner:** bmm-dev Agent
**Estimated Effort:** 2 sprints
**Ready to Start:** Once Story 8.2 complete ✅
