# Story 8.2: Glove Mode System
## Automatic UI Density Adaptation for Navigation Sessions

**Epic:** 8.0 - VIP Platform UI Refactor
**Story ID:** 8.2
**Priority:** P0 (Core UX Feature)
**Complexity:** L (2-3 sprints)
**Status:** BLOCKED (Waiting for Story 8.1 completion)

**Dependencies:**
- ✅ MUST COMPLETE: Story 8.1 (Navigation session store required)
- ✅ MUST HAVE: WiFi Bridge scenarios working
- ✅ MUST HAVE: Storybook setup complete

---

## Overview

Implement automatic UI density adaptation system that switches between native and glove-friendly modes based on navigation session state. This system makes touch targets larger, increases spacing, and scales fonts when the user is actively sailing - without requiring manual configuration.

**Why This Story:**
- Glove mode is core to VIP Platform UX strategy
- Automatic adaptation eliminates configuration friction
- Navigation session provides perfect context trigger
- Establishes pattern for all future components

**User Benefit:**
Sailors can use the app with sailing gloves on without struggling with small touch targets. The app automatically detects "we're sailing" and adapts - no settings needed.

---

## User Stories

### US 8.2.1: UI Density Configuration
**As a** developer building adaptive components
**I want** density configuration that defines native vs glove mode parameters
**So that** all components use consistent sizing and spacing

**Acceptance Criteria:**
- AC 1.1: Density config file created (`src/config/density.ts`)
- AC 1.2: Glove mode config defined:
  - `touchTargetSize: 64` (45% larger than native 44pt)
  - `swipeThreshold: 120` (140% increase from 50px)
  - `fontSize.value: 48` (33% larger than 36pt)
  - `fontSize.label: 18` (12.5% larger than 16pt)
  - `fontSize.body: 18` (12.5% larger than 16pt)
  - `fontSize.heading: 24` (20% larger than 20pt)
  - `spacing: 16` (100% increase from 8pt)
- AC 1.3: Native mode config defined:
  - `touchTargetSize: 44` (iOS standard)
  - `swipeThreshold: 50` (mobile standard)
  - `fontSize.value: 36`
  - `fontSize.label: 16`
  - `fontSize.body: 16`
  - `fontSize.heading: 20`
  - `spacing: 8`
- AC 1.4: Haptic feedback levels:
  - Glove mode: `ImpactFeedbackStyle.Heavy`
  - Native mode: `ImpactFeedbackStyle.Medium`
- AC 1.5: TypeScript types exported for components

**Technical Implementation:**
```typescript
// src/config/density.ts
import { ImpactFeedbackStyle } from 'expo-haptics';

export interface DensityConfig {
  touchTargetSize: number;
  swipeThreshold: number;
  fontSize: {
    value: number;
    label: number;
    body: number;
    heading: number;
  };
  spacing: number;
  hapticFeedback: ImpactFeedbackStyle;
}

export const DENSITY_CONFIGS: Record<'native' | 'glove', DensityConfig> = {
  native: {
    touchTargetSize: 44,
    swipeThreshold: 50,
    fontSize: {
      value: 36,
      label: 16,
      body: 16,
      heading: 20,
    },
    spacing: 8,
    hapticFeedback: ImpactFeedbackStyle.Medium,
  },
  glove: {
    touchTargetSize: 64,
    swipeThreshold: 120,
    fontSize: {
      value: 48,
      label: 18,
      body: 18,
      heading: 24,
    },
    spacing: 16,
    hapticFeedback: ImpactFeedbackStyle.Heavy,
  },
};
```

---

### US 8.2.2: useUIDensity Hook
**As a** component that needs density-aware sizing
**I want** a hook that returns current density config
**So that** I can adapt my layout automatically

**Acceptance Criteria:**
- AC 2.1: Hook created (`src/hooks/useUIDensity.ts`)
- AC 2.2: Hook reads `navigationSession.gloveModeActive`
- AC 2.3: Returns `DENSITY_CONFIGS['glove']` when navigation session active
- AC 2.4: Returns `DENSITY_CONFIGS['native']` when navigation session inactive
- AC 2.5: Hook memoized for performance (no unnecessary re-renders)
- AC 2.6: TypeScript types exported
- AC 2.7: Hook documented with JSDoc examples

**Technical Implementation:**
```typescript
// src/hooks/useUIDensity.ts
import { useMemo } from 'react';
import { useNavigationSession } from '../store/navigationSessionStore';
import { DENSITY_CONFIGS, DensityConfig } from '../config/density';

/**
 * Returns current UI density configuration based on navigation session state.
 *
 * - Navigation session active → Glove mode (64pt touch targets, 48pt fonts)
 * - Navigation session inactive → Native mode (44pt touch targets, 36pt fonts)
 *
 * @example
 * const MyComponent = () => {
 *   const density = useUIDensity();
 *   return (
 *     <TouchableOpacity style={{
 *       width: density.touchTargetSize,
 *       height: density.touchTargetSize
 *     }}>
 *       <Text style={{ fontSize: density.fontSize.value }}>
 *         6.5 kts
 *       </Text>
 *     </TouchableOpacity>
 *   );
 * };
 */
export const useUIDensity = (): DensityConfig => {
  const { gloveModeActive } = useNavigationSession();

  return useMemo(() => {
    const mode = gloveModeActive ? 'glove' : 'native';
    console.log('[useUIDensity] Mode:', mode);
    return DENSITY_CONFIGS[mode];
  }, [gloveModeActive]);
};
```

---

### US 8.2.3: AutopilotFooter Refactor (Reference Implementation)
**As a** sailor using autopilot controls with gloves
**I want** large, easy-to-tap buttons when actively navigating
**So that** I can adjust course without removing gloves

**Acceptance Criteria:**
- AC 3.1: AutopilotFooter imports `useUIDensity()`
- AC 3.2: Button sizes adapt based on density:
  - Native mode: 44pt × 44pt
  - Glove mode: 64pt × 64pt
- AC 3.3: Button spacing adapts:
  - Native mode: 8pt padding
  - Glove mode: 16pt padding
- AC 3.4: Font sizes adapt:
  - Button labels: body font (16pt → 18pt)
  - Heading values: heading font (20pt → 24pt)
- AC 3.5: Haptic feedback adapts:
  - Native mode: Medium impact
  - Glove mode: Heavy impact
- AC 3.6: Component re-renders when navigation session changes
- AC 3.7: Storybook story created with 3 variants:
  - Native Density
  - Glove Mode
  - Interactive Toggle (switch between modes)

**Technical Implementation:**
```typescript
// src/components/organisms/AutopilotFooter.tsx (refactored)
import React from 'react';
import { View, TouchableOpacity, Text, StyleSheet } from 'react-native';
import * as Haptics from 'expo-haptics';
import { useUIDensity } from '../../hooks/useUIDensity';
import { useTheme } from '../../store/themeStore';

export const AutopilotFooter: React.FC = () => {
  const density = useUIDensity();
  const { theme } = useTheme();

  const handleButtonPress = async (action: string) => {
    await Haptics.impactAsync(density.hapticFeedback);
    console.log('[Autopilot]', action);
    // ... existing autopilot logic
  };

  return (
    <View style={[styles.container, { padding: density.spacing }]}>
      <TouchableOpacity
        style={[
          styles.button,
          {
            width: density.touchTargetSize,
            height: density.touchTargetSize,
            backgroundColor: theme.primary,
          },
        ]}
        onPress={() => handleButtonPress('-10°')}
      >
        <Text style={[styles.buttonText, { fontSize: density.fontSize.body }]}>
          -10°
        </Text>
      </TouchableOpacity>

      <View style={styles.centerInfo}>
        <Text style={[styles.heading, { fontSize: density.fontSize.heading }]}>
          AUTOPILOT
        </Text>
        <Text style={[styles.value, { fontSize: density.fontSize.value }]}>
          282°
        </Text>
      </View>

      <TouchableOpacity
        style={[
          styles.button,
          {
            width: density.touchTargetSize,
            height: density.touchTargetSize,
            backgroundColor: theme.primary,
          },
        ]}
        onPress={() => handleButtonPress('+10°')}
      >
        <Text style={[styles.buttonText, { fontSize: density.fontSize.body }]}>
          +10°
        </Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
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
  centerInfo: {
    alignItems: 'center',
  },
  heading: {
    fontWeight: '600',
    opacity: 0.7,
  },
  value: {
    fontWeight: '700',
  },
});
```

**Storybook Story:**
```typescript
// src/components/organisms/AutopilotFooter.stories.tsx
import React, { useState } from 'react';
import { View } from 'react-native';
import { AutopilotFooter } from './AutopilotFooter';
import { useNavigationSession } from '../../store/navigationSessionStore';

export default {
  title: 'Organisms/AutopilotFooter',
  component: AutopilotFooter,
};

export const NativeDensity = () => {
  // Navigation session inactive → native mode
  return <AutopilotFooter />;
};

export const GloveMode = () => {
  const { startSession } = useNavigationSession();

  // Start navigation session on mount → glove mode
  React.useEffect(() => {
    startSession('storybook-glove-mode');
  }, []);

  return <AutopilotFooter />;
};

export const InteractiveToggle = () => {
  const { isActive, startSession, endSession } = useNavigationSession();

  return (
    <View>
      <Button
        title={isActive ? 'End Session (Native)' : 'Start Session (Glove)'}
        onPress={() => (isActive ? endSession() : startSession('interactive'))}
      />
      <AutopilotFooter />
    </View>
  );
};
```

---

### US 8.2.4: Metric Cell Density Awareness
**As a** sailor viewing metric values with gloves
**I want** large, readable numbers and labels
**So that** I can read critical data at a glance

**Acceptance Criteria:**
- AC 4.1: PrimaryMetricCell imports `useUIDensity()`
- AC 4.2: PrimaryMetricCell value font adapts: 36pt → 48pt
- AC 4.3: PrimaryMetricCell label font adapts: 16pt → 18pt
- AC 4.4: PrimaryMetricCell padding adapts: 8pt → 16pt
- AC 4.5: SecondaryMetricCell imports `useUIDensity()`
- AC 4.6: SecondaryMetricCell value font adapts: 36pt → 48pt
- AC 4.7: SecondaryMetricCell label font adapts: 16pt → 18pt
- AC 4.8: SecondaryMetricCell padding adapts: 8pt → 16pt
- AC 4.9: Storybook stories created for both components

**Technical Implementation:**
```typescript
// src/components/PrimaryMetricCell.tsx (refactored)
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useUIDensity } from '../hooks/useUIDensity';
import { useTheme } from '../store/themeStore';

interface PrimaryMetricCellProps {
  value: string;
  label: string;
  unit?: string;
}

export const PrimaryMetricCell: React.FC<PrimaryMetricCellProps> = ({
  value,
  label,
  unit,
}) => {
  const density = useUIDensity();
  const { theme } = useTheme();

  return (
    <View style={[styles.container, { padding: density.spacing }]}>
      <Text
        style={[
          styles.value,
          {
            fontSize: density.fontSize.value,
            color: theme.text,
          },
        ]}
      >
        {value}
        {unit && (
          <Text
            style={[styles.unit, { fontSize: density.fontSize.label }]}
          >
            {' '}
            {unit}
          </Text>
        )}
      </Text>
      <Text
        style={[
          styles.label,
          {
            fontSize: density.fontSize.label,
            color: theme.textSecondary,
          },
        ]}
      >
        {label}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  value: {
    fontWeight: '700',
  },
  label: {
    fontWeight: '500',
    marginTop: 4,
  },
  unit: {
    fontWeight: '400',
    opacity: 0.7,
  },
});
```

---

### US 8.2.5: Visual Glove Mode Indicator
**As a** user
**I want** visual confirmation when glove mode is active
**So that** I know the UI has adapted to navigation session

**Acceptance Criteria:**
- AC 5.1: Glove icon (🧤) added to HeaderBar
- AC 5.2: Icon visible when `navigationSession.gloveModeActive === true`
- AC 5.3: Icon hidden when navigation session inactive
- AC 5.4: Icon positioned in top-right of header
- AC 5.5: Icon size adapts to density (24pt → 28pt)
- AC 5.6: Tooltip on long-press (iOS/Android) or hover (web): "Glove Mode - Large touch targets"
- AC 5.7: Icon color matches `theme.primary`
- AC 5.8: Smooth fade-in/fade-out animation (300ms)

**Technical Implementation:**
```typescript
// src/components/HeaderBar.tsx (add glove mode indicator)
import React from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { useNavigationSession } from '../store/navigationSessionStore';
import { useUIDensity } from '../hooks/useUIDensity';
import { useTheme } from '../store/themeStore';

export const HeaderBar: React.FC = () => {
  const { gloveModeActive } = useNavigationSession();
  const density = useUIDensity();
  const { theme } = useTheme();
  const fadeAnim = React.useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: gloveModeActive ? 1 : 0,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, [gloveModeActive]);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Dashboard</Text>

      {/* Glove Mode Indicator */}
      <Animated.View
        style={[
          styles.gloveIndicator,
          {
            opacity: fadeAnim,
            transform: [{ scale: fadeAnim }],
          },
        ]}
      >
        <Text
          style={[
            styles.gloveIcon,
            {
              fontSize: density.fontSize.heading,
              color: theme.primary,
            },
          ]}
        >
          🧤
        </Text>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    height: 60,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
  },
  gloveIndicator: {
    position: 'absolute',
    right: 16,
    top: 18,
  },
  gloveIcon: {
    // fontSize set dynamically by density
  },
});
```

---

## Testing Requirements

### Unit Tests
- [ ] `useUIDensity()` returns glove config when navigation session active
- [ ] `useUIDensity()` returns native config when navigation session inactive
- [ ] `useUIDensity()` re-renders when navigation session state changes
- [ ] Density config values match spec (64pt glove, 44pt native)
- [ ] Haptic feedback levels correct (Heavy glove, Medium native)

### Integration Tests
- [ ] Load "idle-at-marina" → AutopilotFooter buttons 44pt
- [ ] Load "underway-manual" → AutopilotFooter buttons 64pt (auto-adapted)
- [ ] Load "end-navigation" → wait 10min → buttons return to 44pt
- [ ] PrimaryMetricCell font sizes adapt correctly
- [ ] SecondaryMetricCell font sizes adapt correctly
- [ ] Glove icon appears when session starts
- [ ] Glove icon disappears when session ends

### Manual Testing (WiFi Bridge Scenarios)

**Scenario 1: idle-at-marina**
- [ ] Load scenario → SOG = 0
- [ ] Navigation session inactive
- [ ] Touch targets: 44pt (native)
- [ ] Grid spacing: 8pt
- [ ] No glove icon visible

**Scenario 2: underway-manual**
- [ ] Load scenario → SOG = 6.5
- [ ] Navigation session auto-starts (>2.0 for 5s)
- [ ] Touch targets: 64pt (glove)
- [ ] Grid spacing: 16pt
- [ ] Glove icon visible (🧤)
- [ ] Value fonts: 48pt
- [ ] Button press → Heavy haptic feedback

**Scenario 3: end-navigation**
- [ ] Load scenario → SOG = 0.5
- [ ] Wait 10 minutes (or speed up time in test)
- [ ] Navigation session auto-ends (<0.5 for 10min)
- [ ] Touch targets return to 44pt
- [ ] Glove icon fades out

**Storybook Visual Regression:**
- [ ] AutopilotFooter: Native vs Glove mode screenshots match spec
- [ ] PrimaryMetricCell: Font sizes correct in both modes
- [ ] SecondaryMetricCell: Font sizes correct in both modes
- [ ] Interactive toggle: Mode switch causes immediate re-render

---

## Definition of Done

- [ ] All 5 user stories completed (ACs met)
- [ ] Density config created (`src/config/density.ts`)
- [ ] `useUIDensity()` hook created and tested
- [ ] AutopilotFooter refactored to use density
- [ ] PrimaryMetricCell and SecondaryMetricCell refactored
- [ ] Glove mode indicator added to HeaderBar
- [ ] All unit tests passing
- [ ] All integration tests passing
- [ ] All 3 WiFi Bridge scenarios validated
- [ ] Storybook stories created for all adapted components
- [ ] No regressions (v2.3 features still work)
- [ ] Code review complete
- [ ] Documentation updated (density system explained)

---

## Context Files for bmm-dev

**Load Before Starting:**
1. `story-8.1-foundation-store-consolidation.md` (navigationSessionStore pattern)
2. `VIP-UX-IMPLEMENTATION-GUIDE.md` (Density adaptation section)
3. `wifiBridgeScenarios.ts` (Test scenarios)
4. Current `AutopilotFooter.tsx` (will refactor this)
5. Current `PrimaryMetricCell.tsx` (will refactor this)
6. Current `SecondaryMetricCell.tsx` (will refactor this)
7. Current `HeaderBar.tsx` (will add glove indicator)
8. `useResponsiveGrid.ts` (existing responsive pattern)

---

## Implementation Notes

**Pattern Established:**
This story establishes the density-aware component pattern that ALL future components must follow:

```typescript
// Standard density-aware component pattern
const MyComponent = () => {
  const density = useUIDensity();
  const { theme } = useTheme();

  return (
    <TouchableOpacity
      style={{
        width: density.touchTargetSize,
        height: density.touchTargetSize,
        padding: density.spacing,
      }}
    >
      <Text style={{ fontSize: density.fontSize.value }}>
        {value}
      </Text>
      <Text style={{ fontSize: density.fontSize.label }}>
        {label}
      </Text>
    </TouchableOpacity>
  );
};
```

**Next Story (8.3):**
Once glove mode system is complete, Story 8.3 will implement iOS-specific platform navigation (tab bar, SF Symbols) while maintaining glove mode compatibility.

---

## Dev Agent Record

### Context Reference
- **Story Context File:** [story-context-8.2.xml](story-context-8.2.xml)
- **Generated:** 2025-10-20
- **Status:** Ready for Development (once Story 8.1 complete)

### Implementation Notes
- Load story-context-8.2.xml before starting implementation
- Density system is core pattern for all future components
- AutopilotFooter refactor establishes reference implementation

---

**Story Owner:** bmm-dev Agent
**Estimated Effort:** 2-3 sprints
**Ready to Start:** Once Story 8.1 complete ✅
