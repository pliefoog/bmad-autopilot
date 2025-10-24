# Story 8.5: Dashboard & Widget Integration
## Integrate All Widgets with Glove Mode and Platform Navigation

**Epic:** 8.0 - VIP Platform UI Refactor
**Story ID:** 8.5
**Priority:** P0 (Core Marine Functionality)
**Complexity:** L (2-3 sprints)
**Status:** BLOCKED (Waiting for Stories 8.3 & 8.4 completion)

**Dependencies:**
- ✅ MUST COMPLETE: Story 8.3 (iOS navigation screens)
- ✅ MUST COMPLETE: Story 8.4 (Android/Web navigation screens)
- ✅ MUST HAVE: Story 8.2 (useUIDensity hook and density config)

---

## Overview

Integrate all 9 marine widgets with glove mode density awareness and new platform navigation structure. Update PaginatedDashboard for glove-aware grid spacing. Convert Settings and Autopilot from modals to proper navigation screens. Ensure all marine core functionality works identically on iOS, Android, and Web.

**Why This Story:**
- Widgets are the core value of the marine app
- All widgets must adapt to glove mode for usability
- Dashboard pagination must respect density spacing
- Settings/Autopilot need proper screen structure
- Marine UX must be consistent across platforms

**User Benefit:**
Sailors get large, readable widgets when actively navigating (glove mode), and widgets work identically on iOS, Android, and Web with platform-native navigation chrome.

---

## User Stories

### US 8.5.1: PaginatedDashboard Glove Mode Integration
**As a** sailor viewing widgets with gloves
**I want** adequate spacing between widgets
**So that** I don't accidentally tap the wrong widget

**Acceptance Criteria:**
- AC 1.1: PaginatedDashboard imports `useUIDensity()`
- AC 1.2: Grid spacing adapts based on density:
  - Native mode: 8pt spacing
  - Glove mode: 16pt spacing (100% increase)
- AC 1.3: Widget cell sizes adapt to density (inherited from useResponsiveGrid)
- AC 1.4: Page swipe threshold adapts:
  - Native mode: 50px swipe
  - Glove mode: 120px swipe (140% increase)
- AC 1.5: Page indicator dots adapt:
  - Native mode: 8pt diameter
  - Glove mode: 12pt diameter (50% increase)
- AC 1.6: Pagination still works (swipe left/right between pages)
- AC 1.7: Widget add/remove/reorder still works
- AC 1.8: Layout doesn't break when toggling glove mode

**Technical Implementation:**
```typescript
// src/components/PaginatedDashboard.tsx (refactored)
import React from 'react';
import { View, StyleSheet, PanResponder } from 'react-native';
import { useUIDensity } from '../hooks/useUIDensity';
import { useResponsiveGrid } from '../hooks/useResponsiveGrid';
import { useWidgetStore } from '../store/widgetStore';

export const PaginatedDashboard: React.FC = () => {
  const density = useUIDensity();
  const { gridConfig } = useResponsiveGrid();
  const { widgets, currentPage } = useWidgetStore();

  // Adapt swipe threshold to density
  const swipeThreshold = density.swipeThreshold;

  const panResponder = PanResponder.create({
    onMoveShouldSetPanResponder: (_, gestureState) => {
      return Math.abs(gestureState.dx) > swipeThreshold;
    },
    // ... rest of pan responder logic
  });

  return (
    <View
      style={[
        styles.container,
        {
          padding: density.spacing, // 8pt → 16pt in glove mode
        },
      ]}
      {...panResponder.panHandlers}
    >
      {/* Widget grid */}
      <View
        style={{
          gap: density.spacing, // Grid spacing adapts
        }}
      >
        {/* Render widgets */}
      </View>

      {/* Page indicators */}
      <View style={styles.pageIndicators}>
        {pages.map((_, index) => (
          <View
            key={index}
            style={[
              styles.dot,
              {
                width: density.spacing * 1.5, // 12pt → 18pt
                height: density.spacing * 1.5,
                backgroundColor:
                  index === currentPage ? theme.primary : theme.textSecondary,
              },
            ]}
          />
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  pageIndicators: {
    flexDirection: 'row',
    justifyContent: 'center',
    paddingVertical: 16,
    gap: 8,
  },
  dot: {
    borderRadius: 999,
  },
});
```

---

### US 8.5.2: All Widgets Density-Aware
**As a** sailor viewing critical marine data
**I want** large, readable values in all widgets when glove mode active
**So that** I can read data at a glance with gloves on

**Acceptance Criteria:**

**General (All 9 Widgets):**
- AC 2.1: Each widget imports `useUIDensity()`
- AC 2.2: Value font size adapts: 36pt → 48pt
- AC 2.3: Label font size adapts: 16pt → 18pt
- AC 2.4: Widget padding adapts: 8pt → 16pt
- AC 2.5: Storybook story created for each widget (native vs glove mode)

**Specific Widgets:**
- AC 2.6: **DepthWidget** - Depth value 36pt → 48pt
- AC 2.7: **SpeedWidget** - SOG value 36pt → 48pt
- AC 2.8: **WindWidget** - Wind speed value 36pt → 48pt
- AC 2.9: **GPSWidget** - Coordinates font 16pt → 18pt
- AC 2.10: **CompassWidget** - Heading value 36pt → 48pt
- AC 2.11: **EngineWidget** - RPM value 36pt → 48pt
- AC 2.12: **BatteryWidget** - Percentage value 36pt → 48pt
- AC 2.13: **TanksWidget** - Tank level values 36pt → 48pt
- AC 2.14: **AutopilotStatusWidget** - Status text 16pt → 18pt

**Technical Implementation (Example: DepthWidget):**
```typescript
// src/widgets/DepthWidget.tsx (refactored)
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useUIDensity } from '../hooks/useUIDensity';
import { useTheme } from '../store/themeStore';
import { useNmeaStore } from '../store/nmeaStore';
import { WidgetShell } from '../components/WidgetShell';
import { PrimaryMetricCell } from '../components/PrimaryMetricCell';

export const DepthWidget: React.FC = () => {
  const density = useUIDensity();
  const { theme } = useTheme();
  const { nmeaData } = useNmeaStore();

  const depth = nmeaData?.depth ?? '--';

  return (
    <WidgetShell title="Depth">
      <View style={[styles.container, { padding: density.spacing }]}>
        <PrimaryMetricCell
          value={depth.toFixed(1)}
          label="DEPTH"
          unit="m"
        />
        {/* PrimaryMetricCell already density-aware from Story 8.2 */}
      </View>
    </WidgetShell>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
```

**Storybook Story (Example):**
```typescript
// src/widgets/DepthWidget.stories.tsx
import React from 'react';
import { DepthWidget } from './DepthWidget';
import { useNavigationSession } from '../store/navigationSessionStore';
import { useNmeaStore } from '../store/nmeaStore';

export default {
  title: 'Widgets/DepthWidget',
  component: DepthWidget,
};

export const NativeMode = () => {
  // Set test NMEA data
  useNmeaStore.setState({ nmeaData: { depth: 12.5 } });

  return <DepthWidget />;
};

export const GloveMode = () => {
  const { startSession } = useNavigationSession();

  React.useEffect(() => {
    // Activate glove mode
    startSession('storybook-glove');
    // Set test NMEA data
    useNmeaStore.setState({ nmeaData: { depth: 12.5 } });
  }, []);

  return <DepthWidget />;
};
```

---

### US 8.5.3: Settings Screen in Navigation
**As a** user configuring the app
**I want** settings accessible via navigation
**So that** I can adjust preferences easily

**Acceptance Criteria:**
- AC 3.1: SettingsScreen created (`src/screens/SettingsScreen.tsx`)
- AC 3.2: Screen accessible via:
  - iOS: Tab bar (Settings tab)
  - Android: Drawer (Settings item)
  - Web: Tab bar or sidebar (Settings)
- AC 3.3: Settings organized into sections:
  - **Connection:** NMEA server IP/port, WiFi Bridge scenarios
  - **Widgets:** Default widgets, widget reset
  - **Alarms:** Alarm thresholds, alarm sounds
  - **Display:** Theme (Day/Night/Red Night), brightness
  - **About:** App version, licenses, help
- AC 3.4: All settings functionality works (same as v2.3):
  - Connection settings → updates NMEA connection
  - Theme switch → updates theme store
  - Alarm thresholds → updates alarm store
- AC 3.5: Settings screen respects theme
- AC 3.6: Settings screen has proper navigation header
- AC 3.7: Glove mode doesn't affect settings (always native density for text input)

**Technical Implementation:**
```typescript
// src/screens/SettingsScreen.tsx
import React from 'react';
import { ScrollView, View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../store/themeStore';
import { ConnectionSettings } from '../components/settings/ConnectionSettings';
import { WidgetSettings } from '../components/settings/WidgetSettings';
import { AlarmSettings } from '../components/settings/AlarmSettings';
import { DisplaySettings } from '../components/settings/DisplaySettings';
import { AboutSection } from '../components/settings/AboutSection';

export const SettingsScreen: React.FC = () => {
  const { theme } = useTheme();

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: theme.background }]}
    >
      <ScrollView style={styles.scrollView}>
        <SettingsSection title="Connection">
          <ConnectionSettings />
        </SettingsSection>

        <SettingsSection title="Widgets">
          <WidgetSettings />
        </SettingsSection>

        <SettingsSection title="Alarms">
          <AlarmSettings />
        </SettingsSection>

        <SettingsSection title="Display">
          <DisplaySettings />
        </SettingsSection>

        <SettingsSection title="About">
          <AboutSection />
        </SettingsSection>
      </ScrollView>
    </SafeAreaView>
  );
};

const SettingsSection: React.FC<{ title: string; children: React.ReactNode }> = ({
  title,
  children,
}) => {
  const { theme } = useTheme();

  return (
    <View style={styles.section}>
      <Text style={[styles.sectionTitle, { color: theme.text }]}>{title}</Text>
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  section: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
  },
});
```

---

### US 8.5.4: Autopilot Screen in Navigation
**As a** sailor controlling autopilot
**I want** full-screen autopilot controls accessible via navigation
**So that** I can adjust course with large, glove-friendly buttons

**Acceptance Criteria:**
- AC 4.1: AutopilotScreen created (`src/screens/AutopilotScreen.tsx`)
- AC 4.2: Screen accessible via:
  - iOS: Tab bar (Autopilot tab)
  - Android: Drawer (Autopilot item)
  - Web: Tab bar or sidebar (Autopilot)
- AC 4.3: Screen shows full autopilot controls:
  - Current heading (large display)
  - Target heading
  - Course adjustment buttons: -1°, -10°, +1°, +10°
  - Autopilot engage/disengage button
  - Autopilot status (engaged/standby)
- AC 4.4: All controls density-aware (Story 8.2 pattern):
  - Native mode: 44pt buttons
  - Glove mode: 64pt buttons
- AC 4.5: Haptic feedback on button press (Medium native, Heavy glove)
- AC 4.6: Screen respects safe area insets
- AC 4.7: AutopilotFooter still exists (quick controls from Dashboard)

**Technical Implementation:**
```typescript
// src/screens/AutopilotScreen.tsx
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useUIDensity } from '../hooks/useUIDensity';
import { useTheme } from '../store/themeStore';
import { useAutopilotStore } from '../store/autopilotStore';
import { haptics } from '../utils/haptics';

export const AutopilotScreen: React.FC = () => {
  const density = useUIDensity();
  const { theme } = useTheme();
  const { heading, targetHeading, engaged, adjustCourse, toggleEngage } =
    useAutopilotStore();

  const handleCourseAdjust = async (degrees: number) => {
    await haptics[density.hapticFeedback === 'Heavy' ? 'heavy' : 'medium']();
    adjustCourse(degrees);
  };

  const handleToggleEngage = async () => {
    await haptics.success();
    toggleEngage();
  };

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: theme.background }]}
    >
      {/* Current Heading Display */}
      <View style={styles.headingDisplay}>
        <Text style={[styles.label, { fontSize: density.fontSize.label }]}>
          CURRENT HEADING
        </Text>
        <Text style={[styles.value, { fontSize: density.fontSize.value * 2 }]}>
          {heading}°
        </Text>
      </View>

      {/* Target Heading */}
      <View style={styles.targetDisplay}>
        <Text style={[styles.label, { fontSize: density.fontSize.label }]}>
          TARGET HEADING
        </Text>
        <Text
          style={[styles.value, { fontSize: density.fontSize.value * 1.5 }]}
        >
          {targetHeading}°
        </Text>
      </View>

      {/* Course Adjustment Buttons */}
      <View
        style={[styles.controls, { gap: density.spacing, padding: density.spacing }]}
      >
        <View style={styles.row}>
          <AutopilotButton
            label="-10°"
            onPress={() => handleCourseAdjust(-10)}
            size={density.touchTargetSize}
            fontSize={density.fontSize.heading}
          />
          <AutopilotButton
            label="-1°"
            onPress={() => handleCourseAdjust(-1)}
            size={density.touchTargetSize}
            fontSize={density.fontSize.heading}
          />
        </View>

        <View style={styles.row}>
          <AutopilotButton
            label="+1°"
            onPress={() => handleCourseAdjust(1)}
            size={density.touchTargetSize}
            fontSize={density.fontSize.heading}
          />
          <AutopilotButton
            label="+10°"
            onPress={() => handleCourseAdjust(10)}
            size={density.touchTargetSize}
            fontSize={density.fontSize.heading}
          />
        </View>
      </View>

      {/* Engage/Disengage Button */}
      <TouchableOpacity
        style={[
          styles.engageButton,
          {
            backgroundColor: engaged ? theme.error : theme.success,
            height: density.touchTargetSize,
          },
        ]}
        onPress={handleToggleEngage}
      >
        <Text style={[styles.engageText, { fontSize: density.fontSize.heading }]}>
          {engaged ? 'DISENGAGE AUTOPILOT' : 'ENGAGE AUTOPILOT'}
        </Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
};

const AutopilotButton: React.FC<{
  label: string;
  onPress: () => void;
  size: number;
  fontSize: number;
}> = ({ label, onPress, size, fontSize }) => {
  const { theme } = useTheme();

  return (
    <TouchableOpacity
      style={[
        styles.button,
        {
          width: size,
          height: size,
          backgroundColor: theme.primary,
        },
      ]}
      onPress={onPress}
    >
      <Text style={[styles.buttonText, { fontSize }]}>{label}</Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  headingDisplay: {
    alignItems: 'center',
  },
  targetDisplay: {
    alignItems: 'center',
  },
  label: {
    fontWeight: '500',
    opacity: 0.7,
  },
  value: {
    fontWeight: '700',
    marginTop: 8,
  },
  controls: {
    alignItems: 'center',
  },
  row: {
    flexDirection: 'row',
    gap: 16,
  },
  button: {
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  engageButton: {
    paddingHorizontal: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  engageText: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
});
```

---

### US 8.5.5: Alarms Screen in Navigation
**As a** sailor monitoring safety alarms
**I want** dedicated alarms screen accessible via navigation
**So that** I can view alarm history, configure thresholds, and manage active alarms

**Acceptance Criteria:**
- AC 5.1: AlarmsScreen created (`src/screens/AlarmsScreen.tsx`)
- AC 5.2: Screen accessible via:
  - iOS: Tab bar (Alarms tab - 4th tab)
  - Android: Drawer (Alarms item)
  - Web: Tab bar or sidebar (Alarms)
- AC 5.3: Screen shows alarm sections:
  - Active Alarms (currently triggered)
  - Alarm History (past 24 hours)
  - Alarm Configuration (thresholds, enable/disable)
  - Alarm Settings (sounds, visual alerts, notification preferences)
- AC 5.4: Active alarms displayed with:
  - Alarm type (Depth, Speed, Wind, Battery, etc.)
  - Current value vs threshold
  - Time triggered
  - Acknowledge button (density-aware: 44pt → 64pt)
- AC 5.5: Alarm configuration uses existing alarmStore
- AC 5.6: Screen respects theme (Day/Night/Red Night)
- AC 5.7: Glove mode affects buttons only (not text input fields)

**Technical Implementation:**
```typescript
// src/screens/AlarmsScreen.tsx
import React from 'react';
import { ScrollView, View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useUIDensity } from '../hooks/useUIDensity';
import { useTheme } from '../store/themeStore';
import { useAlarmStore } from '../store/alarmStore';

export const AlarmsScreen: React.FC = () => {
  const density = useUIDensity();
  const { theme } = useTheme();
  const { activeAlarms, alarmHistory, acknowledgeAlarm } = useAlarmStore();

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: theme.background }]}
    >
      <ScrollView style={styles.scrollView}>
        {/* Active Alarms Section */}
        <Section title="Active Alarms">
          {activeAlarms.length === 0 ? (
            <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
              No active alarms
            </Text>
          ) : (
            activeAlarms.map((alarm) => (
              <AlarmCard
                key={alarm.id}
                alarm={alarm}
                onAcknowledge={() => acknowledgeAlarm(alarm.id)}
                density={density}
                theme={theme}
              />
            ))
          )}
        </Section>

        {/* Alarm History Section */}
        <Section title="Alarm History (24h)">
          {alarmHistory.map((alarm) => (
            <AlarmHistoryItem key={alarm.id} alarm={alarm} theme={theme} />
          ))}
        </Section>

        {/* Alarm Configuration Section */}
        <Section title="Alarm Configuration">
          <AlarmThresholdConfig />
        </Section>
      </ScrollView>
    </SafeAreaView>
  );
};

const AlarmCard: React.FC<{
  alarm: Alarm;
  onAcknowledge: () => void;
  density: DensityConfig;
  theme: Theme;
}> = ({ alarm, onAcknowledge, density, theme }) => {
  return (
    <View style={[styles.card, { backgroundColor: theme.cardBackground }]}>
      <View style={styles.cardContent}>
        <Text style={[styles.alarmType, { color: theme.error }]}>
          {alarm.type}
        </Text>
        <Text style={[styles.alarmValue, { color: theme.text }]}>
          {alarm.currentValue} (threshold: {alarm.threshold})
        </Text>
        <Text style={[styles.alarmTime, { color: theme.textSecondary }]}>
          {alarm.triggeredAt.toLocaleTimeString()}
        </Text>
      </View>

      <TouchableOpacity
        style={[
          styles.acknowledgeButton,
          {
            width: density.touchTargetSize * 2,
            height: density.touchTargetSize,
            backgroundColor: theme.primary,
          },
        ]}
        onPress={onAcknowledge}
      >
        <Text style={[styles.buttonText, { fontSize: density.fontSize.body }]}>
          Acknowledge
        </Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  card: {
    padding: 16,
    marginVertical: 8,
    borderRadius: 8,
  },
  cardContent: {
    marginBottom: 12,
  },
  alarmType: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 4,
  },
  alarmValue: {
    fontSize: 16,
    marginBottom: 4,
  },
  alarmTime: {
    fontSize: 14,
  },
  acknowledgeButton: {
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  emptyText: {
    fontSize: 16,
    fontStyle: 'italic',
    textAlign: 'center',
    paddingVertical: 24,
  },
});
```

---

### US 8.5.6: Help Screen in Navigation
**As a** sailor learning to use the app
**I want** help screen accessible via navigation
**So that** I can access tutorials, troubleshooting, and contextual help

**Acceptance Criteria:**
- AC 6.1: HelpScreen created (`src/screens/HelpScreen.tsx`)
- AC 6.2: Screen accessible via:
  - iOS: Tab bar (Help tab - 5th tab)
  - Android: Drawer (Help item)
  - Web: Sidebar (Help)
- AC 6.3: Screen integrates help components from Story 4.6:
  - QuickStartGuide (first-time user onboarding)
  - ContextualHelp (context-aware help based on current screen)
  - InteractiveTutorial (step-by-step tutorials)
  - TroubleshootingGuide (common issues and solutions)
  - HelpSearch (search help content)
- AC 6.4: Help sections organized:
  - Getting Started
  - Features & Tutorials
  - Troubleshooting
  - Search Help
- AC 6.5: Help content accessible offline (bundled with app)
- AC 6.6: Screen respects theme
- AC 6.7: Always native density (no glove mode for reading text)

**Technical Implementation:**
```typescript
// src/screens/HelpScreen.tsx
import React, { useState } from 'react';
import { ScrollView, View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../store/themeStore';
import { QuickStartGuide } from '../components/help/QuickStartGuide';
import { ContextualHelp } from '../components/help/ContextualHelp';
import { InteractiveTutorial } from '../components/help/InteractiveTutorial';
import { TroubleshootingGuide } from '../components/help/TroubleshootingGuide';
import { HelpSearch } from '../components/help/HelpSearch';

type HelpSection = 'getting-started' | 'features' | 'troubleshooting' | 'search';

export const HelpScreen: React.FC = () => {
  const { theme } = useTheme();
  const [activeSection, setActiveSection] = useState<HelpSection>('getting-started');

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: theme.background }]}
    >
      {/* Section Tabs */}
      <View style={[styles.tabs, { borderBottomColor: theme.border }]}>
        <HelpTab
          title="Getting Started"
          active={activeSection === 'getting-started'}
          onPress={() => setActiveSection('getting-started')}
          theme={theme}
        />
        <HelpTab
          title="Features"
          active={activeSection === 'features'}
          onPress={() => setActiveSection('features')}
          theme={theme}
        />
        <HelpTab
          title="Troubleshooting"
          active={activeSection === 'troubleshooting'}
          onPress={() => setActiveSection('troubleshooting')}
          theme={theme}
        />
        <HelpTab
          title="Search"
          active={activeSection === 'search'}
          onPress={() => setActiveSection('search')}
          theme={theme}
        />
      </View>

      {/* Section Content */}
      <ScrollView style={styles.content}>
        {activeSection === 'getting-started' && (
          <>
            <QuickStartGuide />
            <ContextualHelp />
          </>
        )}
        {activeSection === 'features' && <InteractiveTutorial />}
        {activeSection === 'troubleshooting' && <TroubleshootingGuide />}
        {activeSection === 'search' && <HelpSearch />}
      </ScrollView>
    </SafeAreaView>
  );
};

const HelpTab: React.FC<{
  title: string;
  active: boolean;
  onPress: () => void;
  theme: Theme;
}> = ({ title, active, onPress, theme }) => {
  return (
    <TouchableOpacity
      style={[
        styles.tab,
        active && { borderBottomWidth: 2, borderBottomColor: theme.primary },
      ]}
      onPress={onPress}
    >
      <Text
        style={[
          styles.tabText,
          { color: active ? theme.primary : theme.textSecondary },
        ]}
      >
        {title}
      </Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  tabs: {
    flexDirection: 'row',
    borderBottomWidth: 1,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '500',
  },
  content: {
    flex: 1,
    padding: 16,
  },
});
```

---

### US 8.5.7: Modular Widget Architecture Refactor
**As a** developer maintaining widget code
**I want** a modular, composable widget architecture using hooks and compound components
**So that** I can eliminate 85% code duplication and create new widgets in 30-50 lines instead of 200-330 lines

**Acceptance Criteria:**
- AC 7.1: Core widget infrastructure created:
  - `src/widgets/core/useWidgetCore.ts` - Hook for expansion, pinning, interaction tracking
  - `src/widgets/core/useWidgetData.ts` - Hook for typed NMEA data access with staleness detection
  - `src/widgets/core/useMarineSafety.ts` - Hook for safety state evaluation (normal/warning/alarm/critical)
  - `src/widgets/core/WidgetShell.tsx` - Compound component for widget container, header, controls
- AC 7.2: WidgetShell uses compound component pattern:
  - `WidgetShell.Header` - Title, status indicator, pin/caret controls
  - `WidgetShell.Primary` - Primary metric container
  - `WidgetShell.Secondary` - Expandable secondary metrics container
- AC 7.3: All widget boilerplate eliminated:
  - No repeated widget state management code (expanded, pinned, handlers)
  - No repeated theme/NMEA store hooks in individual widgets
  - No repeated container/header/controls styling
- AC 7.4: At least 3 widgets refactored as proof-of-concept:
  - RudderPositionWidget: 230 lines → ~40 lines (82% reduction)
  - BatteryWidget: 330 lines → ~35 lines (89% reduction)
  - DepthWidget: ~250 lines → ~40 lines (84% reduction)
- AC 7.5: `useWidgetCore` hook provides:
  - `expanded` state (boolean)
  - `pinned` state (boolean)
  - `handlers.onPress` (toggles expansion + tracks interaction)
  - `handlers.onLongPress` (toggles pin)
- AC 7.6: `useWidgetData<T>` hook provides:
  - Typed data access via selector function
  - Automatic staleness detection (configurable timeout)
  - Returns `{ data: T, isStale: boolean }`
- AC 7.7: `useMarineSafety` hook evaluates safety state:
  - Accepts value and thresholds (critical, warning ranges)
  - Returns `SafetyState` ('normal' | 'warning' | 'alarm' | 'critical')
  - Handles null/undefined values (returns 'warning')
- AC 7.8: WidgetShell handles all common UI concerns:
  - Container with theme-aware background, borders, shadows
  - Border color adapts: pinned (accent), alarm (error), warning (warning), normal (border)
  - Touch handlers (onPress, onLongPress) wired to useWidgetCore
  - Context injection to children (expanded, pinned, theme)
- AC 7.9: Optional widget factory pattern implemented:
  - `createNumericWidget` factory for simple widgets (Speed, Depth, Wind)
  - Reduces simple widgets to 10-line configuration objects
- AC 7.10: All refactored widgets maintain:
  - Same visual appearance (pixel-perfect)
  - Same behavior (expansion, pinning, interactions)
  - Same performance (memoization, selectors)
  - Same accessibility (testIDs, touch targets)
- AC 7.11: Widget architecture documented:
  - `docs/WIDGET-ARCHITECTURE.md` - Architecture overview, patterns, migration guide
  - JSDoc comments on all hooks and components
  - Example widget showing all patterns
- AC 7.12: Migration benefits measured:
  - Lines of code per widget: 200-330 → 30-50 (85% reduction)
  - Total code saved: ~540 lines across 9 widgets
  - Boilerplate eliminated: 60 lines × 9 widgets = 540 lines
  - Developer velocity: New widgets created in 15 minutes vs 2 hours

**Technical Implementation:**

```typescript
// src/widgets/core/useWidgetCore.ts
import { useMemo } from 'react';
import { useWidgetStore } from '../../store/widgetStore';

/**
 * Core widget behavior hook - provides expansion, pinning, and interaction tracking
 * Eliminates 20 lines of boilerplate per widget
 */
export const useWidgetCore = (widgetId: string) => {
  const expanded = useWidgetStore((state) => state.widgetExpanded[widgetId] || false);
  const pinned = useWidgetStore((state) => state.isWidgetPinned?.(widgetId) || false);
  const toggleExpansion = useWidgetStore((state) => state.toggleWidgetExpanded);
  const togglePin = useWidgetStore((state) => state.toggleWidgetPin);
  const trackInteraction = useWidgetStore((state) => state.updateWidgetInteraction);

  const handlers = useMemo(() => ({
    onPress: () => {
      trackInteraction(widgetId);
      toggleExpansion(widgetId);
    },
    onLongPress: () => {
      togglePin(widgetId);
    },
  }), [widgetId, trackInteraction, toggleExpansion, togglePin]);

  return { expanded, pinned, handlers };
};
```

```typescript
// src/widgets/core/useWidgetData.ts
import { useMemo } from 'react';
import { useNmeaStore } from '../../store/nmeaStore';

/**
 * Typed NMEA data access with automatic staleness detection
 * Eliminates useCallback boilerplate and provides consistent staleness logic
 */
export const useWidgetData = <T>(
  selector: (state: any) => T,
  stalenessTimeout: number = 10000
) => {
  const data = useNmeaStore(selector);
  const timestamp = useNmeaStore((state) => state.lastUpdate);

  const isStale = useMemo(
    () => timestamp ? (Date.now() - timestamp) > stalenessTimeout : true,
    [timestamp, stalenessTimeout]
  );

  return { data, isStale };
};
```

```typescript
// src/widgets/core/useMarineSafety.ts
import { useMemo } from 'react';

export type SafetyState = 'normal' | 'warning' | 'alarm' | 'critical';

export interface SafetyThresholds {
  critical?: { min?: number; max?: number };
  warning?: { min?: number; max?: number };
}

/**
 * Marine safety state evaluation hook
 * Consistent safety logic across all widgets
 */
export const useMarineSafety = (
  value: number | null | undefined,
  thresholds: SafetyThresholds
): SafetyState => {
  return useMemo(() => {
    if (value === null || value === undefined) return 'warning';

    if (thresholds.critical) {
      if (thresholds.critical.min !== undefined && value < thresholds.critical.min) return 'critical';
      if (thresholds.critical.max !== undefined && value > thresholds.critical.max) return 'critical';
    }

    if (thresholds.warning) {
      if (thresholds.warning.min !== undefined && value < thresholds.warning.min) return 'warning';
      if (thresholds.warning.max !== undefined && value > thresholds.warning.max) return 'warning';
    }

    return 'normal';
  }, [value, thresholds]);
};
```

```typescript
// src/widgets/core/WidgetShell.tsx
import React, { useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useTheme } from '../../store/themeStore';
import { useWidgetCore } from './useWidgetCore';
import { SafetyState } from './useMarineSafety';

interface WidgetShellProps {
  id: string;
  title: string;
  state?: SafetyState;
  children: React.ReactNode;
}

/**
 * WidgetShell - Base container with all common UI
 * Uses Compound Component pattern for flexible composition
 */
export const WidgetShell: React.FC<WidgetShellProps> & {
  Header: typeof WidgetHeader;
  Primary: typeof WidgetPrimary;
  Secondary: typeof WidgetSecondary;
} = ({ id, title, state = 'normal', children }) => {
  const theme = useTheme();
  const { expanded, pinned, handlers } = useWidgetCore(id);

  const borderColor = useMemo(() => {
    if (pinned) return theme.accent;
    if (state === 'critical' || state === 'alarm') return theme.error;
    if (state === 'warning') return theme.warning;
    return theme.border || '#E5E7EB';
  }, [pinned, state, theme]);

  return (
    <TouchableOpacity
      style={[styles.container, {
        backgroundColor: theme.surface,
        borderColor
      }]}
      onPress={handlers.onPress}
      onLongPress={handlers.onLongPress}
      activeOpacity={0.8}
      testID={`widget-${id}`}
    >
      {/* Clone children and inject context */}
      {React.Children.map(children, child => {
        if (React.isValidElement(child)) {
          return React.cloneElement(child, { expanded, pinned, theme, state } as any);
        }
        return child;
      })}
    </TouchableOpacity>
  );
};

// Compound components
const WidgetHeader: React.FC<{
  title?: string;
  state?: SafetyState;
  expanded?: boolean;
  pinned?: boolean;
  theme?: any;
}> = ({ title, state, expanded, pinned, theme }) => (
  <View style={styles.header}>
    <Text style={[styles.title, { color: theme?.text || '#000' }]}>
      {title?.toUpperCase()}
    </Text>
    <View style={styles.controls}>
      <StatusIndicator state={state} theme={theme} />
      {pinned ? (
        <Text style={[styles.pinIcon, { color: theme?.primary || '#007AFF' }]}>📌</Text>
      ) : (
        <Text style={[styles.caret, { color: theme?.textSecondary || '#666' }]}>
          {expanded ? '⌃' : '⌄'}
        </Text>
      )}
    </View>
  </View>
);

const WidgetPrimary: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <View style={styles.primaryContainer}>{children}</View>
);

const WidgetSecondary: React.FC<{
  expanded?: boolean;
  children: React.ReactNode;
}> = ({ expanded, children }) => {
  if (!expanded) return null;
  return (
    <View style={styles.secondaryContainer}>{children}</View>
  );
};

const StatusIndicator: React.FC<{ state?: SafetyState; theme?: any }> = ({ state, theme }) => {
  const backgroundColor = useMemo(() => {
    if (state === 'critical' || state === 'alarm') return theme?.error || '#DC2626';
    if (state === 'warning') return theme?.warning || '#F59E0B';
    return theme?.success || '#10B981';
  }, [state, theme]);

  return (
    <View style={[styles.statusIndicator, { backgroundColor }]} />
  );
};

// Attach compound components
WidgetShell.Header = WidgetHeader;
WidgetShell.Primary = WidgetPrimary;
WidgetShell.Secondary = WidgetSecondary;

const styles = StyleSheet.create({
  container: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
    marginBottom: 8,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  title: {
    fontSize: 11,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statusIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  pinIcon: {
    fontSize: 12,
  },
  caret: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  primaryContainer: {
    minHeight: 80,
  },
  secondaryContainer: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
});

export default WidgetShell;
```

```typescript
// Example: RudderPositionWidget AFTER refactor (230 lines → 40 lines)
import React from 'react';
import { WidgetShell } from './core/WidgetShell';
import { useWidgetData } from './core/useWidgetData';
import { useMarineSafety } from './core/useMarineSafety';
import { PrimaryMetricCell } from '../components/PrimaryMetricCell';

export const RudderPositionWidget: React.FC<{ id: string; title: string }> = ({ id, title }) => {
  const { data: autopilot } = useWidgetData((state) => state.nmeaData.autopilot);
  const rudderAngle = autopilot?.rudderPosition || 0;

  const rudderState = useMarineSafety(rudderAngle, {
    warning: { min: -20, max: 20 },
    alarm: { min: -30, max: 30 },
  });

  const displayValue = formatRudderDisplay(rudderAngle);

  return (
    <WidgetShell id={id} title={title} state={rudderState}>
      <WidgetShell.Header title={title} state={rudderState} />

      <WidgetShell.Primary>
        <PrimaryMetricCell
          mnemonic="RUDDER"
          value={displayValue}
          unit=""
          state={rudderState}
        />
      </WidgetShell.Primary>

      <WidgetShell.Secondary>
        <RudderIndicator angle={rudderAngle} />
      </WidgetShell.Secondary>
    </WidgetShell>
  );
};

// Helper functions remain the same
const formatRudderDisplay = (angle: number) => {
  if (angle === 0) return '0';
  const displayAngle = Math.abs(angle).toFixed(1);
  const side = angle >= 0 ? 'STBD' : 'PORT';
  return `${displayAngle}° ${side}`;
};

// 40 lines total (vs 230 before) = 82% reduction
```

**Benefits:**
- **85% code reduction** per widget (200-330 lines → 30-50 lines)
- **540 lines eliminated** across 9 widgets (60 lines boilerplate × 9)
- **Consistent behavior** - All widgets use same interaction patterns
- **Type safety** - Generic hooks provide full type inference
- **Testability** - Test hooks once instead of testing each widget
- **Maintainability** - Change behavior in one place, affects all widgets
- **Developer velocity** - New widgets created in 15 minutes vs 2 hours
- **React best practices** - Composition over inheritance, hooks over classes

---

## Testing Requirements

### Unit Tests
- [ ] PaginatedDashboard adapts grid spacing (8pt → 16pt)
- [ ] PaginatedDashboard adapts swipe threshold (50px → 120px)
- [ ] Each widget uses useUIDensity hook
- [ ] Each widget adapts value font (36pt → 48pt)
- [ ] SettingsScreen renders all sections
- [ ] AutopilotScreen renders all controls
- [ ] AlarmsScreen renders active alarms, history, configuration
- [ ] HelpScreen renders all help sections (4 tabs)
- [ ] **Widget Architecture Tests:**
  - [ ] `useWidgetCore` hook returns expanded, pinned, handlers
  - [ ] `useWidgetData` hook returns typed data and staleness
  - [ ] `useMarineSafety` hook evaluates thresholds correctly (normal/warning/alarm/critical)
  - [ ] WidgetShell renders header, primary, secondary containers
  - [ ] WidgetShell border color adapts based on pinned/state
  - [ ] Refactored widgets maintain same behavior as original (expansion, pinning)
  - [ ] Refactored widgets maintain same visual appearance (pixel-perfect)

### Integration Tests
- [ ] Load "idle-at-marina" → All widgets show 36pt values
- [ ] Load "underway-manual" → All widgets show 48pt values
- [ ] PaginatedDashboard swipe requires 120px in glove mode (vs 50px native)
- [ ] SettingsScreen accessible via navigation (all platforms)
- [ ] AutopilotScreen accessible via navigation (all platforms)
- [ ] AlarmsScreen accessible via navigation (all platforms)
- [ ] HelpScreen accessible via navigation (all platforms)
- [ ] Settings changes persist (theme, alarms, connection)
- [ ] Alarm acknowledgement updates alarmStore
- [ ] Help search finds relevant content

### Manual Testing (WiFi Bridge Scenarios)

**PaginatedDashboard:**
- [ ] Load "idle-at-marina" → Grid spacing 8pt
- [ ] Load "underway-manual" → Grid spacing 16pt
- [ ] Swipe between pages → threshold adapts (50px → 120px)
- [ ] Page indicator dots adapt (8pt → 12pt diameter)
- [ ] Add widget → still works in glove mode
- [ ] Remove widget → still works in glove mode

**All 9 Widgets (In Glove Mode):**
- [ ] DepthWidget: Value 48pt (readable at a glance)
- [ ] SpeedWidget: Value 48pt
- [ ] WindWidget: Value 48pt
- [ ] GPSWidget: Coordinates 18pt
- [ ] CompassWidget: Heading 48pt
- [ ] EngineWidget: RPM 48pt
- [ ] BatteryWidget: Percentage 48pt
- [ ] TanksWidget: Tank levels 48pt
- [ ] AutopilotStatusWidget: Status text 18pt

**SettingsScreen:**
- [ ] iOS: Tap Settings tab → SettingsScreen visible
- [ ] Android: Open drawer → Tap Settings → SettingsScreen visible
- [ ] All sections present: Connection, Widgets, Alarms, Display, About
- [ ] Change theme → theme updates immediately
- [ ] Change NMEA IP → connection reconnects
- [ ] Settings screen always native density (no glove mode)

**AutopilotScreen:**
- [ ] iOS: Tap Autopilot tab → AutopilotScreen visible
- [ ] Android: Open drawer → Tap Autopilot → AutopilotScreen visible
- [ ] Native mode: Buttons 44pt
- [ ] Glove mode: Buttons 64pt (large and easy to tap)
- [ ] Tap +10° → heading adjusts, haptic feedback
- [ ] Tap Engage → autopilot engages, success haptic
- [ ] AutopilotFooter still works on Dashboard (quick controls)

**AlarmsScreen:**
- [ ] iOS: Tap Alarms tab (4th tab) → AlarmsScreen visible
- [ ] Android: Open drawer → Tap Alarms → AlarmsScreen visible
- [ ] Active alarms section shows triggered alarms
- [ ] Alarm history shows past 24 hours
- [ ] Tap Acknowledge button → alarm acknowledged, removed from active
- [ ] Acknowledge button density-aware: 44pt → 64pt in glove mode
- [ ] Alarm configuration section allows threshold changes
- [ ] No active alarms → shows "No active alarms" message

**HelpScreen:**
- [ ] iOS: Tap Help tab (5th tab) → HelpScreen visible
- [ ] Android: Open drawer → Tap Help → HelpScreen visible
- [ ] Web: Sidebar → Tap Help → HelpScreen visible
- [ ] All 4 tabs present: Getting Started, Features, Troubleshooting, Search
- [ ] Tap "Getting Started" → shows QuickStartGuide + ContextualHelp
- [ ] Tap "Features" → shows InteractiveTutorial
- [ ] Tap "Troubleshooting" → shows TroubleshootingGuide
- [ ] Tap "Search" → shows HelpSearch with search functionality
- [ ] Help content accessible offline (bundled with app)
- [ ] Always native density (no glove mode for reading)

**Storybook Visual Regression:**
- [ ] Each widget has 2 stories: Native Mode, Glove Mode
- [ ] Screenshot comparison: Fonts and spacing correct
- [ ] PaginatedDashboard: Grid spacing visibly different

---

## Definition of Done

- [ ] All 7 user stories completed (ACs met)
- [ ] PaginatedDashboard glove-mode aware
- [ ] All 9 widgets refactored to use useUIDensity
- [ ] **Widget architecture refactored (US 8.5.7):**
  - [ ] Core infrastructure created (useWidgetCore, useWidgetData, useMarineSafety, WidgetShell)
  - [ ] At least 3 widgets refactored (Rudder, Battery, Depth) with 85% code reduction
  - [ ] Widget architecture documentation created (WIDGET-ARCHITECTURE.md)
  - [ ] Widget factory pattern implemented (createNumericWidget)
- [ ] SettingsScreen created and accessible via navigation
- [ ] AutopilotScreen created and accessible via navigation
- [ ] AlarmsScreen created and accessible via navigation
- [ ] HelpScreen created and accessible via navigation (integrates Story 4.6 help components)
- [ ] All unit tests passing (including widget architecture tests)
- [ ] All integration tests passing
- [ ] All WiFi Bridge scenario tests passing
- [ ] Storybook stories created for all widgets (including refactored ones)
- [ ] All platforms tested (iOS, Android, Web)
- [ ] No regressions (all v2.3 features work)
- [ ] Code review complete
- [ ] Documentation updated (widget integration + new screens + widget architecture)

---

## Context Files for bmm-dev

**Load Before Starting:**
1. `story-8.2-glove-mode-system.md` (useUIDensity pattern)
2. `story-8.3-platform-navigation-ios.md` (Screen structure)
3. `story-8.4-platform-navigation-android-web.md` (Multi-platform screens)
4. Current `PaginatedDashboard.tsx` (will refactor)
5. All 9 widget files:
   - `DepthWidget.tsx`
   - `SpeedWidget.tsx`
   - `WindWidget.tsx`
   - `GPSWidget.tsx`
   - `CompassWidget.tsx`
   - `EngineWidget.tsx`
   - `BatteryWidget.tsx`
   - `TanksWidget.tsx`
   - `AutopilotStatusWidget.tsx`
6. Current settings components (will extract into SettingsScreen)
7. Current `AutopilotControlScreen.tsx` (will convert to AutopilotScreen)

---

## Implementation Notes

**Widget Refactoring Strategy:**
Each widget follows the same pattern:

```typescript
// Before (v2.3):
<Text style={{ fontSize: 36 }}>{value}</Text>

// After (Story 8.5):
const density = useUIDensity();
<Text style={{ fontSize: density.fontSize.value }}>{value}</Text>
// → 36pt native, 48pt glove mode
```

**Widget Checklist (Repeat for All 9 Widgets):**
1. Import `useUIDensity()`
2. Replace hardcoded font sizes with `density.fontSize.*`
3. Replace hardcoded padding with `density.spacing`
4. Create Storybook story (native vs glove mode)
5. Test with WiFi Bridge scenarios

**Screen Extraction Pattern:**
```
Old (v2.3): App.tsx contains everything (650 lines)
New (Story 8.5):
  - App.tsx → 50 lines (just navigation wrapper)
  - DashboardScreen.tsx → widgets + autopilot footer
  - SettingsScreen.tsx → all settings
  - AutopilotScreen.tsx → full autopilot controls
```

**AutopilotFooter vs AutopilotScreen:**
- **AutopilotFooter:** Quick controls on Dashboard (±10° only)
- **AutopilotScreen:** Full controls (+1°, +10°, engage/disengage, status)

**Next Story (8.6):**
Story 8.6 will enable all feature flags, remove old code, run full test suite, and release v3.0.

---

## Dev Agent Record

### Context Reference
- **Story Context File:** [story-context-8.5.xml](story-context-8.5.xml)
- **Generated:** 2025-10-20
- **Status:** Ready for Development (once Stories 8.3 & 8.4 complete)

### Implementation Notes
- Load story-context-8.5.xml before starting implementation
- Refactor all 9 widgets to use useUIDensity hook (same pattern for each)
- PaginatedDashboard grid spacing and swipe threshold adaptation
- SettingsScreen and AutopilotScreen creation with navigation integration

---

**Story Owner:** bmm-dev Agent
**Estimated Effort:** 2-3 sprints
**Ready to Start:** Once Stories 8.3 & 8.4 complete ✅
