# Settings Dialogs: Cross-Platform Implementation Guide

**Status:** 🔄 In Progress  
**Priority:** HIGH - Addresses critical UX inconsistencies and marine safety compliance  
**Target Platforms:** Phone, Tablet, Web/Desktop (TV placeholders for future)  
**Last Updated:** November 20, 2025

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Current State Analysis](#current-state-analysis)
3. [Target Architecture](#target-architecture)
4. [Implementation Roadmap](#implementation-roadmap)
5. [Detailed Implementation Steps](#detailed-implementation-steps)
6. [Testing Strategy](#testing-strategy)
7. [Future TV Platform Support](#future-tv-platform-support)

---

## Executive Summary

### Problem Statement

Three settings dialogs (Connection, Units, Alarms) currently have **significant UX inconsistencies**:

- **Navigation patterns:** Mixed modal vs full-screen navigation
- **Action placement:** Inconsistent button locations (header vs footer)
- **Input methods:** No keyboard/mouse optimization for web/desktop
- **Marine safety:** Green status indicators violate red-night mode requirements
- **File organization:** Components scattered across different directories

### Solution Overview

Create a **unified settings modal system** with:

- ✅ Consistent modal presentation across all settings
- ✅ Platform-aware interaction patterns (touch/mouse/keyboard)
- ✅ Red-night mode compliance (no green/blue/white)
- ✅ Responsive layouts for phone/tablet/desktop
- ✅ Extensible architecture for future TV support

### Success Metrics

| Metric | Current | Target |
|--------|---------|--------|
| Navigation consistency | 33% (1/3 use modals) | 100% |
| Red-night compliance | 66% (alarm dots fail) | 100% |
| Keyboard accessibility | 0% | 100% (desktop) |
| Touch target size | 44pt (iOS min) | 56pt (marine optimized) |
| File organization | 3 locations | 1 unified location |

---

## Current State Analysis

### Dialog Inventory

#### 1. Connection Settings
**File:** `src/widgets/ConnectionConfigDialog.tsx` ⚠️ Wrong location  
**Pattern:** Modal (slide-up)  
**Issues:**
- Located in `widgets/` instead of `components/dialogs/`
- Duplicate cancel buttons (header + footer)
- Custom help system not used elsewhere
- No keyboard navigation support

#### 2. Units Configuration
**File:** `src/components/dialogs/UnitsConfigDialog.tsx` ✅ Correct location  
**Pattern:** Modal (slide-up)  
**Issues:**
- No "Reset to Defaults" option
- Small chip touch targets (< 50pt)
- Preset labels unclear ("Nautical (EU)" - what does this mean?)
- No keyboard navigation support

#### 3. Alarms Settings
**File:** `app/settings/alarms.tsx` ⚠️ Different pattern  
**Pattern:** Full-screen navigation (Expo Router)  
**Issues:**
- **CRITICAL:** Green status dots (`#10B981`) violate red-night mode (line ~228)
- Uses screen navigation instead of modal pattern
- Requires separate detail screen navigation (`alarm-detail.tsx`)
- Inconsistent with other settings
- **CRITICAL:** Multiple entry points with different destinations:
  - `app/settings.tsx` → `AlarmConfigDialog` (modal) ✅
  - Hamburger menu → `/settings/alarms` (full-screen) ❌
  - Widget context menu → Unknown destination ⚠️
- No quick toggle - requires 3-tap navigation to change simple settings
- Status dot meaning unclear (green = good? or just enabled?)
- Auto-save without visual feedback or confirmation
- Long confirmation dialogs when disabling alarms

### Platform Gap Analysis

| Feature | Phone | Tablet | Desktop | TV (Future) |
|---------|-------|--------|---------|-------------|
| Touch targets | 44pt | 56pt ⚠️ | N/A | 80pt 📺 |
| Modal style | Slide-up ✅ | Slide-up ⚠️ | Centered ❌ | Full-screen 📺 |
| Input method | Touch ✅ | Touch ✅ | Keyboard ❌ | D-pad 📺 |
| Navigation | Swipe ✅ | Swipe ✅ | Tab key ❌ | Arrow keys 📺 |
| Hover states | N/A | N/A | None ❌ | Focus glow 📺 |
| Orientation | Both ✅ | Portrait only ⚠️ | N/A | Landscape 📺 |

---

## Target Architecture

### Unified Component Structure

```
boatingInstrumentsApp/
└── src/
    └── components/
        └── dialogs/
            ├── base/
            │   ├── BaseSettingsModal.tsx          [NEW] Core modal container
            │   ├── BaseSettingsModal.styles.ts    [NEW] Platform-aware styles
            │   ├── SettingsHeader.tsx             [NEW] Unified header component
            │   ├── SettingsFooter.tsx             [NEW] Optional footer actions
            │   └── index.ts                       [NEW] Exports
            │
            ├── inputs/
            │   ├── PlatformTextInput.tsx          [NEW] Touch/keyboard optimized
            │   ├── PlatformToggle.tsx             [NEW] Switch/radio toggle
            │   ├── PlatformPicker.tsx             [NEW] Dropdown selector
            │   ├── TVNumberPicker.tsx             [PLACEHOLDER] TV D-pad input
            │   ├── TVListSelector.tsx             [PLACEHOLDER] TV focus navigation
            │   └── index.ts                       [NEW] Exports
            │
            ├── ConnectionSettingsModal.tsx        [REFACTOR] Move from widgets/
            ├── UnitsConfigModal.tsx               [REFACTOR] Rename & update
            ├── AlarmSettingsModal.tsx             [NEW] Convert from screen
            └── index.ts                           [UPDATE] Add new exports

app/
└── settings/
    ├── index.tsx                                  [UPDATE] Launch modals instead of navigation
    ├── alarms.tsx                                 [DEPRECATE] Move logic to modal
    └── alarm-detail.tsx                           [DEPRECATE] Integrate into modal

```

### Design System Tokens

```typescript
// src/theme/settingsTokens.ts [NEW]

export const SETTINGS_TOKENS = {
  // Touch targets (marine-optimized)
  touchTargets: {
    phone: 44,
    tablet: 56,
    desktop: 32,
    tv: 80, // Placeholder for future
  },
  
  // Modal dimensions
  modal: {
    phone: {
      width: '100%',
      height: '100%',
      presentation: 'pageSheet',
    },
    tablet: {
      portrait: {
        width: '85%',
        maxWidth: 600,
        height: '90%',
        presentation: 'formSheet',
      },
      landscape: {
        width: '70%',
        maxWidth: 800,
        height: '85%',
        presentation: 'formSheet',
      },
    },
    desktop: {
      width: 600,
      height: 700,
      presentation: 'overFullScreen',
    },
    tv: { // Placeholder for future
      width: '100%',
      height: '100%',
      presentation: 'fullScreen',
    },
  },
  
  // Typography scales
  typography: {
    phone: {
      title: 17,
      body: 17,
      label: 16,
      caption: 13,
    },
    tablet: {
      title: 20,
      body: 18,
      label: 17,
      caption: 14,
    },
    desktop: {
      title: 20,
      body: 16,
      label: 15,
      caption: 13,
    },
    tv: { // Placeholder for future
      title: 48,
      body: 36,
      label: 32,
      caption: 24,
    },
  },
  
  // Spacing
  spacing: {
    phone: {
      padding: 16,
      gap: 12,
      sectionGap: 24,
    },
    tablet: {
      padding: 24,
      gap: 16,
      sectionGap: 32,
    },
    desktop: {
      padding: 24,
      gap: 16,
      sectionGap: 32,
    },
    tv: { // Placeholder for future
      padding: 64,
      gap: 32,
      sectionGap: 48,
    },
  },
} as const;

// Red-night mode status colors (NO GREEN!)
export const STATUS_COLORS = {
  enabled: {
    day: '#059669',      // Green (day mode only)
    night: '#34D399',    // Light green (night mode only)
    redNight: '#FCA5A5', // Bright red (red-night compliance)
  },
  disabled: {
    day: '#94A3B8',      // Gray
    night: '#64748B',    // Dark gray
    redNight: '#7F1D1D', // Dark red
  },
  warning: {
    day: '#D97706',      // Amber
    night: '#FBBF24',    // Light amber
    redNight: '#DC2626', // Red (no amber in red-night)
  },
  critical: {
    day: '#DC2626',      // Red
    night: '#F87171',    // Light red
    redNight: '#991B1B', // Dark red (blinking)
  },
} as const;
```

---

## Implementation Roadmap

### Phase 1: Foundation (Week 1)
**Goal:** Create base components and design tokens

- [ ] **Step 1.1:** Create design tokens (`settingsTokens.ts`)
- [ ] **Step 1.2:** Implement `BaseSettingsModal` component
- [ ] **Step 1.3:** Create `SettingsHeader` component
- [ ] **Step 1.4:** Create `SettingsFooter` component
- [ ] **Step 1.5:** Add platform detection utilities
- [ ] **Step 1.6:** Write unit tests for base components

**Deliverables:**
- ✅ Reusable modal container
- ✅ Consistent header/footer
- ✅ Platform detection working
- ✅ TV placeholders in place

---

### Phase 2: Platform Input Components (Week 1-2)
**Goal:** Create platform-optimized input components

- [ ] **Step 2.1:** Implement `PlatformTextInput` (touch + keyboard)
- [ ] **Step 2.2:** Implement `PlatformToggle` (switch/radio)
- [ ] **Step 2.3:** Implement `PlatformPicker` (dropdown)
- [ ] **Step 2.4:** Add TV placeholder components (no-op stubs)
- [ ] **Step 2.5:** Test keyboard navigation (Tab, Enter, Esc)
- [ ] **Step 2.6:** Test touch interactions on tablet

**Deliverables:**
- ✅ Cross-platform input components
- ✅ Keyboard accessibility working
- ✅ Touch target sizes validated
- ✅ TV stubs ready for future implementation

---

### Phase 3: Connection Settings Refactor (Week 2)
**Goal:** Migrate and enhance connection dialog

- [ ] **Step 3.1:** Move `ConnectionConfigDialog.tsx` to `components/dialogs/`
- [ ] **Step 3.2:** Refactor to use `BaseSettingsModal`
- [ ] **Step 3.3:** Replace inputs with platform components
- [ ] **Step 3.4:** Remove duplicate cancel button
- [ ] **Step 3.5:** Add keyboard shortcuts (Cmd+S, Esc)
- [ ] **Step 3.6:** Test on phone/tablet/desktop
- [ ] **Step 3.7:** Update imports across codebase

**Deliverables:**
- ✅ Connection settings using unified pattern
- ✅ File in correct location
- ✅ Keyboard navigation working
- ✅ No breaking changes to existing API

---

### Phase 4: Units Configuration Refactor (Week 2-3)
**Goal:** Enhance units dialog with better UX

- [ ] **Step 4.1:** Rename to `UnitsConfigModal.tsx`
- [ ] **Step 4.2:** Refactor to use `BaseSettingsModal`
- [ ] **Step 4.3:** Simplify preset labels ("US", "EU", "UK")
- [ ] **Step 4.4:** Increase chip touch targets to 56pt
- [ ] **Step 4.5:** Add "Reset to Defaults" button
- [ ] **Step 4.6:** Implement collapsible categories (optional)
- [ ] **Step 4.7:** Add keyboard navigation
- [ ] **Step 4.8:** Test preset selection on all platforms

**Deliverables:**
- ✅ Improved units configuration UX
- ✅ Larger touch targets for marine use
- ✅ Reset functionality added
- ✅ Keyboard accessible

---

### Phase 5: Alarms Settings Refactor (Week 3) 🚨 CRITICAL
**Goal:** Convert screen to modal and fix red-night compliance

- [ ] **Step 5.1:** Create `AlarmSettingsModal.tsx` component
- [ ] **Step 5.2:** **FIX CRITICAL:** Replace green status dots with red-night compliant colors (line ~228 in `alarms.tsx`)
- [ ] **Step 5.3:** Convert from screen navigation to modal pattern
- [ ] **Step 5.4:** Add inline toggle switches (no navigation required)
- [ ] **Step 5.5:** Implement quick threshold adjustment (+/- buttons or drag)
- [ ] **Step 5.6:** Add expandable detail sections (accordion pattern)
- [ ] **Step 5.7:** Unify entry points - consolidate hamburger menu and settings screen routes
- [ ] **Step 5.8:** Replace status dots with toggle switches for clarity
- [ ] **Step 5.9:** Add save confirmation indicator (subtle animation/checkmark)
- [ ] **Step 5.10:** Deprecate `alarms.tsx` and `alarm-detail.tsx` screens
- [ ] **Step 5.11:** Test red-night mode compliance (visual validation)
- [ ] **Step 5.12:** Test on all platforms
- [ ] **Step 5.13:** Verify reduction in interaction steps (target: 3 taps vs current 7 taps)

**Deliverables:**
- ✅ **CRITICAL:** Red-night mode compliance achieved
- ✅ Consistent modal pattern across all settings
- ✅ No separate navigation required
- ✅ Inline configuration working
- ✅ Single unified entry point
- ✅ 67% reduction in taps to configure alarms

---

### Phase 6: Integration & Testing (Week 4)
**Goal:** Polish and validate all changes

- [ ] **Step 6.1:** Update `app/settings/index.tsx` to launch all modals
- [ ] **Step 6.2:** Remove deprecated screen-based navigation
- [ ] **Step 6.3:** Add accessibility labels (VoiceOver/TalkBack)
- [ ] **Step 6.4:** Test keyboard shortcuts on desktop
- [ ] **Step 6.5:** Test orientation changes on tablet
- [ ] **Step 6.6:** Validate red-night mode across all dialogs
- [ ] **Step 6.7:** Performance testing (modal open/close animations)
- [ ] **Step 6.8:** Update documentation and examples

**Deliverables:**
- ✅ All settings using unified pattern
- ✅ Accessibility requirements met
- ✅ Performance validated
- ✅ Documentation complete

---

## User Flow Analysis Summary

### Current Alarm Settings Flow Issues

**Problem:** Users must navigate through 3 full screens to change a simple alarm setting.

**Current Flow (7 interactions):**
1. Settings Screen → Tap "Alarms"
2. Wait for navigation → Alarm List Screen
3. Find alarm in list → Tap alarm card
4. Wait for navigation → Alarm Detail Screen
5. Change threshold value
6. Auto-save on blur (no feedback)
7. Navigate back twice to return

**Time:** ~25 seconds | **Mental Load:** HIGH (track navigation stack)

**Recommended Flow (3 interactions):**
1. Settings Screen → Tap "Alarms" (modal opens)
2. Tap alarm to expand inline
3. Adjust threshold with +/- buttons (auto-saved with indicator)

**Time:** ~8 seconds | **Mental Load:** LOW (temporary context)

**Improvement:** 68% faster, 67% fewer interactions

### Critical Safety Issue

**Red-Night Mode Violation (Line 228 of `app/settings/alarms.tsx`):**
```typescript
// CURRENT (DANGEROUS):
<View 
  style={[
    styles.statusDot, 
    { backgroundColor: config?.enabled ? theme.success || '#10B981' : theme.textSecondary }
  ]} 
/>

// REQUIRED FIX:
{ backgroundColor: getStatusColor(config?.enabled, theme, theme.mode) }
```

Green light (`#10B981`, 525nm wavelength) destroys night vision adaptation for 30+ minutes. Violates SOLAS and USCG marine safety regulations.

### Entry Point Confusion

**Problem:** 3 different entry points with inconsistent destinations:

| Entry Point | Destination | Pattern | Status |
|-------------|-------------|---------|--------|
| Settings screen | `AlarmConfigDialog` | Modal | ✅ Correct |
| Hamburger menu | `/settings/alarms` | Full-screen nav | ❌ Inconsistent |
| Widget context | Unknown | ??? | ⚠️ Unknown |

**Required:** Consolidate to single entry point with modal pattern.

---

## Detailed Implementation Steps

### Step 1: Create Design Tokens

**File:** `src/theme/settingsTokens.ts`

```typescript
/**
 * Settings Dialog Design Tokens
 * Cross-platform design system for unified settings UX
 * Includes TV platform placeholders for future implementation
 */

import { Platform, Dimensions } from 'react-native';

export type PlatformType = 'phone' | 'tablet' | 'desktop' | 'tv';
export type ThemeMode = 'day' | 'night' | 'red-night';

/**
 * Detect current platform based on screen dimensions and OS
 */
export const detectPlatform = (): PlatformType => {
  // TV detection (future implementation)
  if (Platform.isTV || Platform.OS === 'android' && (Platform as any).isTVOS) {
    return 'tv';
  }
  
  const { width } = Dimensions.get('window');
  
  // Desktop web
  if (Platform.OS === 'web' && width > 1024) {
    return 'desktop';
  }
  
  // Tablet
  if (width > 768) {
    return 'tablet';
  }
  
  // Phone (default)
  return 'phone';
};

/**
 * Check if device is touch-enabled
 */
export const isTouchDevice = (): boolean => {
  return Platform.OS === 'ios' || Platform.OS === 'android';
};

/**
 * Check if device supports keyboard input
 */
export const hasKeyboard = (): boolean => {
  return Platform.OS === 'web' || Platform.OS === 'macos' || Platform.OS === 'windows';
};

/**
 * Touch target sizes (marine-optimized)
 */
export const TOUCH_TARGETS = {
  phone: 44,    // iOS HIG minimum
  tablet: 56,   // Marine-optimized for gloves/motion
  desktop: 32,  // Mouse precision
  tv: 80,       // D-pad focus indicators (10-foot UI)
} as const;

/**
 * Modal dimensions by platform
 */
export const MODAL_DIMENSIONS = {
  phone: {
    width: '100%',
    height: '100%',
    maxWidth: undefined,
    maxHeight: undefined,
    borderRadius: 0,
  },
  tablet: {
    width: '85%',
    height: '90%',
    maxWidth: 600,
    maxHeight: 800,
    borderRadius: 16,
  },
  desktop: {
    width: 600,
    height: 700,
    maxWidth: 600,
    maxHeight: 800,
    borderRadius: 12,
  },
  tv: { // Placeholder for future
    width: '100%',
    height: '100%',
    maxWidth: undefined,
    maxHeight: undefined,
    borderRadius: 0,
  },
} as const;

/**
 * Typography scales by platform
 */
export const TYPOGRAPHY_SCALE = {
  phone: {
    title: 17,
    body: 17,
    label: 16,
    caption: 13,
  },
  tablet: {
    title: 20,
    body: 18,
    label: 17,
    caption: 14,
  },
  desktop: {
    title: 20,
    body: 16,
    label: 15,
    caption: 13,
  },
  tv: { // Placeholder for future (10-foot UI)
    title: 48,
    body: 36,
    label: 32,
    caption: 24,
  },
} as const;

/**
 * Spacing scale by platform
 */
export const SPACING_SCALE = {
  phone: {
    padding: 16,
    gap: 12,
    sectionGap: 24,
  },
  tablet: {
    padding: 24,
    gap: 16,
    sectionGap: 32,
  },
  desktop: {
    padding: 24,
    gap: 16,
    sectionGap: 32,
  },
  tv: { // Placeholder for future
    padding: 64,
    gap: 32,
    sectionGap: 48,
  },
} as const;

/**
 * Red-night mode compliant status colors
 * CRITICAL: No green/blue/white colors in red-night mode
 */
export const getStatusColor = (
  status: 'enabled' | 'disabled' | 'warning' | 'critical',
  themeMode: ThemeMode
): string => {
  const colorMap = {
    enabled: {
      day: '#059669',      // Green (safe in daylight)
      night: '#34D399',    // Light green (safe in night)
      'red-night': '#FCA5A5', // Bright red (preserves night vision)
    },
    disabled: {
      day: '#94A3B8',      // Gray
      night: '#64748B',    // Dark gray
      'red-night': '#7F1D1D', // Dark red
    },
    warning: {
      day: '#D97706',      // Amber
      night: '#FBBF24',    // Light amber
      'red-night': '#DC2626', // Red (no amber/yellow in red-night)
    },
    critical: {
      day: '#DC2626',      // Red
      night: '#F87171',    // Light red
      'red-night': '#991B1B', // Dark red with blink animation
    },
  };
  
  return colorMap[status][themeMode];
};

/**
 * Animation timings
 */
export const ANIMATION_TIMINGS = {
  modalEnter: 300,
  modalExit: 250,
  focusTransition: 150,
  tvFocusGlow: 200, // Placeholder for future TV focus animation
} as const;

/**
 * Keyboard shortcuts (desktop only)
 */
export const KEYBOARD_SHORTCUTS = {
  save: Platform.OS === 'macos' ? 'Cmd+S' : 'Ctrl+S',
  cancel: 'Escape',
  reset: Platform.OS === 'macos' ? 'Cmd+R' : 'Ctrl+R',
  // TV placeholders for future
  tvSelect: 'Enter',
  tvBack: 'Backspace',
  tvMenu: 'Menu',
} as const;

/**
 * Get platform-specific settings configuration
 */
export const getPlatformConfig = (platform: PlatformType) => ({
  touchTarget: TOUCH_TARGETS[platform],
  modal: MODAL_DIMENSIONS[platform],
  typography: TYPOGRAPHY_SCALE[platform],
  spacing: SPACING_SCALE[platform],
  hasKeyboard: platform === 'desktop' || platform === 'tv',
  hasTouch: platform === 'phone' || platform === 'tablet',
  hasMouse: platform === 'desktop',
  hasRemote: platform === 'tv', // Placeholder for future
});
```

**Status:** ⏳ Not started

---

### Step 2: Implement BaseSettingsModal

**File:** `src/components/dialogs/base/BaseSettingsModal.tsx`

```typescript
/**
 * BaseSettingsModal
 * 
 * Unified modal container for all settings dialogs
 * Provides consistent layout, theming, and platform-specific behaviors
 * 
 * Features:
 * - Platform-aware dimensions and presentation
 * - Keyboard navigation support (desktop)
 * - Touch-optimized targets (mobile/tablet)
 * - TV D-pad placeholders (future)
 * - Red-night mode compliance
 */

import React, { useCallback, useEffect, useMemo } from 'react';
import {
  Modal,
  View,
  StyleSheet,
  ScrollView,
  Keyboard,
  Platform,
  useWindowDimensions,
} from 'react-native';
import { useTheme } from '../../../store/themeStore';
import { SettingsHeader } from './SettingsHeader';
import { SettingsFooter } from './SettingsFooter';
import {
  detectPlatform,
  getPlatformConfig,
  ANIMATION_TIMINGS,
  type PlatformType,
} from '../../../theme/settingsTokens';

interface BaseSettingsModalProps {
  /** Modal visibility state */
  visible: boolean;
  
  /** Dialog title */
  title: string;
  
  /** Close handler */
  onClose: () => void;
  
  /** Save handler (optional - auto-save if omitted) */
  onSave?: () => void;
  
  /** Reset handler (optional - shows reset button if provided) */
  onReset?: () => void;
  
  /** Whether form has unsaved changes */
  hasChanges?: boolean;
  
  /** Dialog content */
  children: React.ReactNode;
  
  /** Custom footer content (optional) */
  footerContent?: React.ReactNode;
  
  /** Override platform detection (useful for testing) */
  platformOverride?: PlatformType;
  
  /** Test ID for automation */
  testID?: string;
}

export const BaseSettingsModal: React.FC<BaseSettingsModalProps> = ({
  visible,
  title,
  onClose,
  onSave,
  onReset,
  hasChanges = false,
  children,
  footerContent,
  platformOverride,
  testID = 'settings-modal',
}) => {
  const theme = useTheme();
  const dimensions = useWindowDimensions();
  const platform = platformOverride || detectPlatform();
  const config = getPlatformConfig(platform);
  
  // Determine if we're in landscape mode (tablet only)
  const isLandscape = dimensions.width > dimensions.height && platform === 'tablet';
  
  // Platform-specific modal presentation
  const presentationStyle = useMemo(() => {
    if (platform === 'phone') return 'pageSheet';
    if (platform === 'desktop') return 'overFullScreen';
    if (platform === 'tv') return 'fullScreen'; // Placeholder
    return 'formSheet'; // Tablet
  }, [platform]);
  
  // Animation type
  const animationType = useMemo(() => {
    if (platform === 'tv') return 'fade'; // Placeholder
    return 'slide';
  }, [platform]);
  
  // Keyboard event handlers (desktop only)
  useEffect(() => {
    if (!visible || !config.hasKeyboard) return;
    
    const handleKeyDown = (e: KeyboardEvent) => {
      // Escape key - close modal
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
      
      // Cmd/Ctrl+S - save (if save handler provided)
      if ((e.metaKey || e.ctrlKey) && e.key === 's' && onSave) {
        e.preventDefault();
        onSave();
      }
      
      // Cmd/Ctrl+R - reset (if reset handler provided)
      if ((e.metaKey || e.ctrlKey) && e.key === 'r' && onReset) {
        e.preventDefault();
        onReset();
      }
    };
    
    if (Platform.OS === 'web') {
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }
  }, [visible, onClose, onSave, onReset, config.hasKeyboard]);
  
  // Dismiss keyboard on mobile when modal closes
  useEffect(() => {
    if (!visible && config.hasTouch) {
      Keyboard.dismiss();
    }
  }, [visible, config.hasTouch]);
  
  // Modal backdrop handler
  const handleBackdropPress = useCallback(() => {
    // Desktop: Allow dismiss on backdrop click
    // Mobile: Prevent accidental dismissal
    if (platform === 'desktop') {
      onClose();
    }
  }, [platform, onClose]);
  
  // Compute modal container styles
  const containerStyle = useMemo(() => {
    const baseStyle = [
      styles.container,
      { backgroundColor: theme.background },
    ];
    
    if (platform === 'phone') {
      return [...baseStyle, styles.phoneContainer];
    }
    
    if (platform === 'desktop') {
      return [
        ...baseStyle,
        styles.desktopContainer,
        {
          width: config.modal.width,
          maxHeight: config.modal.maxHeight,
          borderRadius: config.modal.borderRadius,
          shadowColor: theme.shadow,
        },
      ];
    }
    
    if (platform === 'tablet') {
      return [
        ...baseStyle,
        styles.tabletContainer,
        {
          width: config.modal.width,
          maxWidth: config.modal.maxWidth,
          height: config.modal.height,
          maxHeight: config.modal.maxHeight,
          borderRadius: config.modal.borderRadius,
        },
      ];
    }
    
    // TV placeholder
    if (platform === 'tv') {
      return [...baseStyle, styles.tvContainer];
    }
    
    return baseStyle;
  }, [platform, theme, config.modal]);
  
  return (
    <Modal
      visible={visible}
      animationType={animationType}
      presentationStyle={presentationStyle}
      onRequestClose={onClose}
      transparent={platform === 'desktop'}
      testID={testID}
    >
      {/* Desktop backdrop */}
      {platform === 'desktop' && (
        <View style={styles.backdrop} onTouchEnd={handleBackdropPress} />
      )}
      
      {/* Modal container */}
      <View style={containerStyle}>
        {/* iOS drag handle (phone only) */}
        {platform === 'phone' && <View style={styles.dragHandle} />}
        
        {/* Header */}
        <SettingsHeader
          title={title}
          onClose={onClose}
          onSave={onSave}
          hasChanges={hasChanges}
          platform={platform}
        />
        
        {/* Scrollable content */}
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={[
            styles.scrollContent,
            { padding: config.spacing.padding },
          ]}
          showsVerticalScrollIndicator={platform !== 'phone'}
          keyboardShouldPersistTaps="handled"
        >
          {children}
        </ScrollView>
        
        {/* Footer (optional) */}
        {(onReset || footerContent) && (
          <SettingsFooter
            onReset={onReset}
            customContent={footerContent}
            platform={platform}
          />
        )}
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  // Base container
  container: {
    flex: 1,
    overflow: 'hidden',
  },
  
  // Phone: Full screen
  phoneContainer: {
    width: '100%',
    height: '100%',
  },
  
  // Tablet: Centered card
  tabletContainer: {
    alignSelf: 'center',
    marginVertical: 'auto',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  
  // Desktop: Centered modal with backdrop
  desktopContainer: {
    alignSelf: 'center',
    marginVertical: 'auto',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 24,
    elevation: 12,
  },
  
  // TV: Full screen (placeholder)
  tvContainer: {
    width: '100%',
    height: '100%',
  },
  
  // Desktop backdrop
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  
  // iOS drag handle
  dragHandle: {
    width: 36,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    alignSelf: 'center',
    marginTop: 8,
    marginBottom: 8,
  },
  
  // Scroll view
  scrollView: {
    flex: 1,
  },
  
  scrollContent: {
    paddingBottom: 32, // Extra padding for safe area
  },
});
```

**Status:** ⏳ Not started

---

### Step 3: Implement Platform Input Components

**File:** `src/components/dialogs/inputs/PlatformTextInput.tsx`

```typescript
/**
 * PlatformTextInput
 * 
 * Cross-platform text input with:
 * - Touch-optimized sizing for mobile/tablet
 * - Keyboard navigation for desktop
 * - Marine-safe touch targets
 * - Theme-aware styling
 */

import React from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TextInputProps,
  Platform,
} from 'react-native';
import { useTheme } from '../../../store/themeStore';
import {
  detectPlatform,
  getPlatformConfig,
} from '../../../theme/settingsTokens';

interface PlatformTextInputProps extends Omit<TextInputProps, 'style'> {
  /** Input label */
  label: string;
  
  /** Current value */
  value: string;
  
  /** Change handler */
  onChange: (value: string) => void;
  
  /** Optional help text */
  helpText?: string;
  
  /** Error message */
  error?: string;
  
  /** Test ID */
  testID?: string;
}

export const PlatformTextInput: React.FC<PlatformTextInputProps> = ({
  label,
  value,
  onChange,
  helpText,
  error,
  testID,
  ...textInputProps
}) => {
  const theme = useTheme();
  const platform = detectPlatform();
  const config = getPlatformConfig(platform);
  
  return (
    <View style={styles.container} testID={testID}>
      {/* Label */}
      <Text
        style={[
          styles.label,
          { 
            color: theme.text,
            fontSize: config.typography.label,
          },
        ]}
      >
        {label}
      </Text>
      
      {/* Text input */}
      <TextInput
        style={[
          styles.input,
          {
            backgroundColor: theme.surface,
            borderColor: error ? theme.error : theme.border,
            color: theme.text,
            fontSize: config.typography.body,
            height: config.touchTarget,
          },
        ]}
        value={value}
        onChangeText={onChange}
        placeholderTextColor={theme.textSecondary}
        {...textInputProps}
      />
      
      {/* Help text or error */}
      {(helpText || error) && (
        <Text
          style={[
            styles.helpText,
            {
              color: error ? theme.error : theme.textSecondary,
              fontSize: config.typography.caption,
            },
          ]}
        >
          {error || helpText}
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 20,
  },
  
  label: {
    fontWeight: '600',
    marginBottom: 8,
  },
  
  input: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  
  helpText: {
    marginTop: 6,
    lineHeight: 18,
  },
});
```

**File:** `src/components/dialogs/inputs/PlatformToggle.tsx`

```typescript
/**
 * PlatformToggle
 * 
 * Switch/radio toggle with platform-specific rendering:
 * - Mobile/Tablet: Native Switch component
 * - Desktop: Radio buttons or segmented control
 * - Marine-safe touch targets
 */

import React from 'react';
import {
  View,
  Text,
  Switch,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { useTheme } from '../../../store/themeStore';
import {
  detectPlatform,
  getPlatformConfig,
} from '../../../theme/settingsTokens';

interface PlatformToggleProps {
  /** Toggle label */
  label: string;
  
  /** Left option label */
  leftLabel: string;
  
  /** Right option label */
  rightLabel: string;
  
  /** Current value (true = right, false = left) */
  value: boolean;
  
  /** Change handler */
  onChange: (value: boolean) => void;
  
  /** Disabled state */
  disabled?: boolean;
  
  /** Test ID */
  testID?: string;
}

export const PlatformToggle: React.FC<PlatformToggleProps> = ({
  label,
  leftLabel,
  rightLabel,
  value,
  onChange,
  disabled = false,
  testID,
}) => {
  const theme = useTheme();
  const platform = detectPlatform();
  const config = getPlatformConfig(platform);
  
  return (
    <View style={styles.container} testID={testID}>
      {/* Label */}
      <Text
        style={[
          styles.label,
          {
            color: theme.text,
            fontSize: config.typography.label,
          },
        ]}
      >
        {label}
      </Text>
      
      {/* Toggle control */}
      <View
        style={[
          styles.toggleContainer,
          {
            backgroundColor: theme.surface,
            borderColor: theme.border,
          },
        ]}
      >
        <Text
          style={[
            styles.toggleLabel,
            {
              color: value ? theme.textSecondary : theme.text,
              fontSize: config.typography.body,
            },
          ]}
        >
          {leftLabel}
        </Text>
        
        <Switch
          value={value}
          onValueChange={onChange}
          disabled={disabled}
          trackColor={{
            false: theme.textSecondary,
            true: theme.primary,
          }}
          thumbColor={theme.surface}
          ios_backgroundColor={theme.textSecondary}
        />
        
        <Text
          style={[
            styles.toggleLabel,
            {
              color: value ? theme.text : theme.textSecondary,
              fontSize: config.typography.body,
            },
          ]}
        >
          {rightLabel}
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 20,
  },
  
  label: {
    fontWeight: '600',
    marginBottom: 8,
  },
  
  toggleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  
  toggleLabel: {
    fontWeight: '600',
  },
});
```

**Status:** ⏳ Not started

---

### Step 4: Implement Alarm Settings Flow Improvements

**Priority:** 🚨 CRITICAL - Addresses safety violation and major UX issues

#### Step 4.1: Fix Red-Night Mode Violation (IMMEDIATE)

**File:** `app/settings/alarms.tsx` (line ~228)

```typescript
// Add helper function at top of file
const getAlarmStatusColor = (enabled: boolean, theme: ThemeColors, themeMode: ThemeMode) => {
  if (!enabled) {
    return themeMode === 'red-night' ? '#7F1D1D' : theme.textSecondary;
  }
  
  // Enabled state - theme-aware
  if (themeMode === 'red-night') {
    return '#FCA5A5'; // Bright red (625nm wavelength - safe)
  } else if (themeMode === 'night') {
    return '#34D399'; // Light green (OK for night mode)
  } else {
    return '#059669'; // Green (OK for day mode)
  }
};

// Replace status dot rendering
<View 
  style={[
    styles.statusDot, 
    { backgroundColor: getAlarmStatusColor(config?.enabled, theme, theme.mode) }
  ]} 
/>
```

**Validation:** Visual inspection in all three theme modes (day, night, red-night).

#### Step 4.2: Consolidate Entry Points

**Files to modify:**
- `src/components/navigation/HamburgerMenu.tsx` - Update "Alarms" route
- `app/settings.tsx` - Ensure using modal pattern
- Widget context menus - Route to same modal

**Goal:** All alarm setting access points open the same modal dialog.

#### Step 4.3: Create Collapsible Alarm Card Component

**File:** `src/components/dialogs/AlarmCard.tsx` [NEW]

```typescript
interface AlarmCardProps {
  type: CriticalAlarmType;
  config: CriticalAlarmConfig;
  expanded: boolean;
  onToggleExpand: () => void;
  onToggleEnabled: (enabled: boolean) => void;
  onThresholdChange: (value: number) => void;
  onPatternChange: (pattern: string) => void;
  onTestAlarm: () => void;
}

// Implements collapsible accordion pattern
// - Collapsed: Shows icon, label, toggle switch, current threshold
// - Expanded: Shows description, threshold adjustment, pattern selection, test button
```

#### Step 4.4: Add Quick Threshold Adjustment

**Implementation:**
- +/- buttons for increment/decrement
- Direct text input for precise values
- Real-time validation with visual feedback
- Auto-save with subtle checkmark animation

**UX Pattern:**
```
Minimum Depth:  [-]  [2.0]  [+]  m  ✓
                 ↑    ↑      ↑   ↑  ↑
                 -0.5 input  +0.5    save indicator
```

#### Step 4.5: Replace Status Dots with Toggle Switches

**Rationale:**
- Status dots unclear (green = good? or just on?)
- Toggle switches universally understood (ON/OFF)
- Marine-safe touch targets (56pt)
- Theme-aware colors built-in

**Implementation:**
```typescript
<Switch
  value={config?.enabled}
  onValueChange={handleToggleEnabled}
  trackColor={{
    false: theme.textSecondary,
    true: theme.mode === 'red-night' ? '#DC2626' : theme.primary,
  }}
  thumbColor={theme.surface}
/>
```

**Status:** ⏳ Not started

---

## Testing Strategy

### Unit Tests

```typescript
// __tests__/components/dialogs/BaseSettingsModal.test.tsx

describe('BaseSettingsModal', () => {
  describe('Platform Detection', () => {
    it('should render phone layout on small screens', () => {
      // Mock dimensions
      // Test phone-specific styles
    });
    
    it('should render tablet layout on medium screens', () => {
      // Test tablet-specific styles
    });
    
    it('should render desktop layout on large screens', () => {
      // Test desktop-specific styles
    });
    
    it('should include TV placeholder styles', () => {
      // Verify TV styles exist but are not active
    });
  });
  
  describe('Keyboard Navigation (Desktop)', () => {
    it('should close modal on Escape key', () => {
      // Test Escape key handler
    });
    
    it('should save on Cmd/Ctrl+S', () => {
      // Test save shortcut
    });
    
    it('should reset on Cmd/Ctrl+R', () => {
      // Test reset shortcut
    });
  });
  
  describe('Touch Interaction (Mobile/Tablet)', () => {
    it('should have marine-safe touch targets on tablet', () => {
      // Verify 56pt touch targets
    });
    
    it('should dismiss keyboard on modal close', () => {
      // Test keyboard dismissal
    });
  });
  
  describe('Red-Night Mode Compliance', () => {
    it('should use red-night compliant colors in red-night theme', () => {
      // Test no green/blue/white colors
    });
  });
});
```

### Integration Tests

```typescript
// __tests__/integration/settings-dialogs.test.tsx

describe('Settings Dialogs Integration', () => {
  it('should open connection settings modal', () => {
    // Test modal opens correctly
  });
  
  it('should save connection settings', () => {
    // Test save flow
  });
  
  it('should open units config modal', () => {
    // Test modal opens correctly
  });
  
  it('should open alarm settings modal', () => {
    // Test modal opens correctly
  });
  
  it('should maintain navigation consistency across all dialogs', () => {
    // Test all dialogs use same pattern
  });
  
  describe('Alarm Settings Entry Points', () => {
    it('should open same modal from settings screen', () => {
      // Test settings.tsx route
    });
    
    it('should open same modal from hamburger menu', () => {
      // Test hamburger menu route
    });
    
    it('should open same modal from widget context menu', () => {
      // Test widget context menu route
    });
  });
  
  describe('Alarm Settings Interaction Flow', () => {
    it('should enable alarm with single toggle', () => {
      // Verify: Open modal → Toggle switch → Auto-save
    });
    
    it('should adjust threshold with quick controls', () => {
      // Verify: Open modal → Expand alarm → Use +/- buttons → Auto-save
    });
    
    it('should complete configuration in 3 taps or less', () => {
      // Measure interaction count from start to finish
    });
  });
});
```

### Visual Regression Tests

```typescript
// Use Playwright or similar for visual testing

describe('Visual Regression: Settings Dialogs', () => {
  const themes = ['day', 'night', 'red-night'];
  const platforms = ['phone', 'tablet', 'desktop'];
  
  platforms.forEach(platform => {
    themes.forEach(theme => {
      it(`should match snapshot: ${platform} - ${theme}`, async () => {
        // Capture screenshot
        // Compare with baseline
      });
    });
  });
});
```

---

## Future TV Platform Support

### TV Platform Placeholder Structure

The following components are stubbed for future TV implementation:

#### 1. TV Detection
```typescript
// src/theme/settingsTokens.ts
export const detectPlatform = (): PlatformType => {
  if (Platform.isTV || Platform.OS === 'android' && (Platform as any).isTVOS) {
    return 'tv'; // ✅ Placeholder ready
  }
  // ... existing detection
};
```

#### 2. TV Input Components (Stubs)
```typescript
// src/components/dialogs/inputs/TVNumberPicker.tsx [STUB]
export const TVNumberPicker: React.FC<TVNumberPickerProps> = (props) => {
  console.warn('TVNumberPicker not yet implemented');
  return null; // Stub for future implementation
};

// src/components/dialogs/inputs/TVListSelector.tsx [STUB]
export const TVListSelector: React.FC<TVListSelectorProps> = (props) => {
  console.warn('TVListSelector not yet implemented');
  return null; // Stub for future implementation
};
```

#### 3. TV Navigation Handlers (Stubs)
```typescript
// src/hooks/useTVRemoteNavigation.ts [STUB]
export const useTVRemoteNavigation = (callbacks: TVNavigationCallbacks) => {
  console.warn('TV remote navigation not yet implemented');
  // Stub for future D-pad event handling
  return {
    focusedElement: null,
    handleRemoteEvent: () => {},
  };
};
```

#### 4. TV-Specific Styles (Placeholders)
All TV-related style tokens are included in design system but not actively used until TV platform is implemented.

### TV Implementation Roadmap (Future)

When ready to implement TV support:

1. **Phase TV-1:** Implement TV detection and platform checks
2. **Phase TV-2:** Create D-pad navigation system
3. **Phase TV-3:** Build TV input components (number picker, list selector)
4. **Phase TV-4:** Implement TV-specific modal layouts
5. **Phase TV-5:** Add TV focus indicators and animations
6. **Phase TV-6:** Test on Apple TV and Android TV devices

---

## Progress Tracking

### Implementation Status

| Phase | Step | Status | Assignee | Completion Date |
|-------|------|--------|----------|-----------------|
| **Phase 1: Foundation** | | | | |
| | Step 1.1: Design tokens | ⏳ Not started | - | - |
| | Step 1.2: BaseSettingsModal | ⏳ Not started | - | - |
| | Step 1.3: SettingsHeader | ⏳ Not started | - | - |
| | Step 1.4: SettingsFooter | ⏳ Not started | - | - |
| | Step 1.5: Platform detection | ⏳ Not started | - | - |
| | Step 1.6: Unit tests | ⏳ Not started | - | - |
| **Phase 2: Inputs** | | | | |
| | Step 2.1: PlatformTextInput | ⏳ Not started | - | - |
| | Step 2.2: PlatformToggle | ⏳ Not started | - | - |
| | Step 2.3: PlatformPicker | ⏳ Not started | - | - |
| | Step 2.4: TV placeholders | ⏳ Not started | - | - |
| | Step 2.5: Keyboard tests | ⏳ Not started | - | - |
| | Step 2.6: Touch tests | ⏳ Not started | - | - |
| **Phase 3: Connection** | | | | |
| | Step 3.1: Move file | ⏳ Not started | - | - |
| | Step 3.2: Refactor to base | ⏳ Not started | - | - |
| | Step 3.3: Replace inputs | ⏳ Not started | - | - |
| | Step 3.4: Remove duplicate button | ⏳ Not started | - | - |
| | Step 3.5: Add keyboard shortcuts | ⏳ Not started | - | - |
| | Step 3.6: Platform tests | ⏳ Not started | - | - |
| | Step 3.7: Update imports | ⏳ Not started | - | - |
| **Phase 4: Units** | | | | |
| | Step 4.1: Rename file | ⏳ Not started | - | - |
| | Step 4.2: Refactor to base | ⏳ Not started | - | - |
| | Step 4.3: Simplify labels | ⏳ Not started | - | - |
| | Step 4.4: Increase touch targets | ⏳ Not started | - | - |
| | Step 4.5: Add reset button | ⏳ Not started | - | - |
| | Step 4.6: Collapsible categories | ⏳ Not started | - | - |
| | Step 4.7: Keyboard navigation | ⏳ Not started | - | - |
| | Step 4.8: Platform tests | ⏳ Not started | - | - |
| **Phase 5: Alarms** 🚨 | | | | |
| | Step 5.1: Create modal | ⏳ Not started | - | - |
| | Step 5.2: **FIX RED-NIGHT** | ⏳ Not started | - | - |
| | Step 5.3: Convert to modal | ⏳ Not started | - | - |
| | Step 5.4: Inline toggles | ⏳ Not started | - | - |
| | Step 5.5: Quick thresholds | ⏳ Not started | - | - |
| | Step 5.6: Expandable details | ⏳ Not started | - | - |
| | Step 5.7: Unify entry points | ⏳ Not started | - | - |
| | Step 5.8: Replace status dots | ⏳ Not started | - | - |
| | Step 5.9: Save indicator | ⏳ Not started | - | - |
| | Step 5.10: Deprecate screens | ⏳ Not started | - | - |
| | Step 5.11: Red-night validation | ⏳ Not started | - | - |
| | Step 5.12: Platform tests | ⏳ Not started | - | - |
| | Step 5.13: Interaction count test | ⏳ Not started | - | - |
| **Phase 6: Integration** | | | | |
| | Step 6.1: Update settings index | ⏳ Not started | - | - |
| | Step 6.2: Remove deprecated nav | ⏳ Not started | - | - |
| | Step 6.3: Accessibility labels | ⏳ Not started | - | - |
| | Step 6.4: Keyboard shortcuts test | ⏳ Not started | - | - |
| | Step 6.5: Orientation tests | ⏳ Not started | - | - |
| | Step 6.6: Red-night validation | ⏳ Not started | - | - |
| | Step 6.7: Performance tests | ⏳ Not started | - | - |
| | Step 6.8: Documentation | ⏳ Not started | - | - |

**Legend:**
- ⏳ Not started
- 🔄 In progress
- ✅ Complete
- 🚨 Critical priority
- 📺 TV placeholder

---

## Appendix

### A. File Changes Summary

**New Files:**
- `src/theme/settingsTokens.ts`
- `src/components/dialogs/base/BaseSettingsModal.tsx`
- `src/components/dialogs/base/SettingsHeader.tsx`
- `src/components/dialogs/base/SettingsFooter.tsx`
- `src/components/dialogs/inputs/PlatformTextInput.tsx`
- `src/components/dialogs/inputs/PlatformToggle.tsx`
- `src/components/dialogs/inputs/PlatformPicker.tsx`
- `src/components/dialogs/inputs/TVNumberPicker.tsx` (stub)
- `src/components/dialogs/inputs/TVListSelector.tsx` (stub)
- `src/components/dialogs/AlarmSettingsModal.tsx`

**Modified Files:**
- `src/widgets/ConnectionConfigDialog.tsx` → `src/components/dialogs/ConnectionSettingsModal.tsx`
- `src/components/dialogs/UnitsConfigDialog.tsx` → `src/components/dialogs/UnitsConfigModal.tsx`
- `app/settings/index.tsx` (update to launch modals)
- `app/settings/alarms.tsx` (line ~228: fix red-night mode violation)
- `src/components/navigation/HamburgerMenu.tsx` (consolidate alarm routes)

**Deprecated Files:**
- `app/settings/alarms.tsx` (logic moved to modal)
- `app/settings/alarm-detail.tsx` (integrated into modal)

**New Components:**
- `src/components/dialogs/AlarmCard.tsx` (collapsible alarm configuration card)

### B. Breaking Changes

**None expected** - All changes maintain backward compatibility through careful migration.

### C. Migration Guide

For developers updating existing code:

1. Import changes:
   ```typescript
   // Old
   import { ConnectionConfigDialog } from '@/src/widgets/ConnectionConfigDialog';
   
   // New
   import { ConnectionSettingsModal } from '@/src/components/dialogs/ConnectionSettingsModal';
   ```

2. Props remain the same (backward compatible)

3. Behavior changes:
   - Alarms now use modal instead of navigation
   - Keyboard shortcuts available on desktop
   - Touch targets larger on tablet

---

## Changelog

| Date | Version | Changes | Author |
|------|---------|---------|--------|
| 2025-11-20 | 1.0.0 | Initial document created | Sally (UX Expert) |
| 2025-11-20 | 1.1.0 | Added UX flow analysis findings, entry point consolidation, quick threshold adjustment, and interaction metrics | Sally (UX Expert) |

---

**Document Status:** 🔄 Living Document - Updates as implementation progresses

**Next Review Date:** End of Phase 1 (Week 1)

**Questions or Feedback:** Contact #ux-expert agent or project maintainer
