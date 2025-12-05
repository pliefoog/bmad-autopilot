# Cross-Platform Dialog System Audit
**Date:** 2025-01-XX  
**Phase:** Phase 2 - Cross-Platform Unification  
**Status:** In Progress

## Executive Summary

This document provides a comprehensive audit of all 7 dialog components in the hamburger menu system, identifying patterns, inconsistencies, and migration paths to the unified BaseSettingsModal system.

### Key Findings

✅ **Foundation Exists:** `BaseSettingsModal` already implemented (Story 13.2.1) with platform detection, keyboard navigation, and cross-platform styling  
✅ **Input Components Ready:** `PlatformTextInput`, `PlatformToggle`, `PlatformButton`, `PlatformPicker` available  
⚠️ **Partial Migration:** Only 1 of 7 dialogs (ConnectionConfigDialog) uses BaseSettingsModal  
❌ **Inconsistent Patterns:** 6 dialogs use custom Modal implementations with varying structures  

---

## Dialog Inventory

### 1. ConnectionConfigDialog.tsx ✅ **FULLY MIGRATED**
**Lines:** 290  
**Status:** Already uses BaseSettingsModal  
**Pattern:** ✅ Uses BaseSettingsModal + Platform Input Components  
**Features:**
- IP address + port configuration
- TCP/UDP/WebSocket protocol toggle
- Real-time validation with error display
- Keyboard shortcuts (Cmd+S, Enter, Esc)
- Platform-aware touch targets (44pt/56pt/64pt)
- **Story:** 13.2.3 - Migrate Connection Settings to Unified Pattern

**Structure:**
```tsx
<BaseSettingsModal
  visible={visible}
  title="Connection Settings"
  onClose={onClose}
  onSave={handleSave}
>
  <PlatformTextInput label="IP Address" ... />
  <PlatformTextInput label="Port" ... />
  <PlatformToggle label="Protocol" ... />
</BaseSettingsModal>
```

**Migration Status:** ✅ Complete - serves as reference implementation

---

### 2. UnitsConfigDialog.tsx ⚠️ **NEEDS MIGRATION**
**Lines:** 512  
**Status:** Custom Modal implementation  
**Pattern:** ❌ Direct Modal + custom styling  

**Current Structure:**
```tsx
<Modal visible={visible} transparent animationType="fade">
  <TouchableOpacity style={overlay} onPress={onClose}>
    {/* Header with close button */}
    <View style={header}>
      <Text style={title}>Unit Preferences</Text>
      <TouchableOpacity onPress={onClose}>
        <UniversalIcon name="close" />
      </TouchableOpacity>
    </View>
    
    <ScrollView>
      {/* Presentation presets */}
      {/* Per-category configuration */}
    </ScrollView>
    
    {/* Footer with Done button */}
  </TouchableOpacity>
</Modal>
```

**Key Features:**
- Presentation presets (Nautical EU, Nautical US, Custom)
- Per-category unit selection (depth, speed, wind, temperature, etc.)
- Comprehensive coverage of Epic 9 Enhanced Presentation System
- Custom section rendering with expandable categories

**Inconsistencies:**
- Header: Title left-aligned, close button right (matches iOS but not Android pattern)
- No keyboard navigation support
- Touch targets: 24px icon (too small for marine/glove use)
- Footer: Only "Done" button, no "Cancel" option
- No platform detection
- Custom backdrop handling (TouchableOpacity vs Pressable)

**Migration Complexity:** 🔴 HIGH
- Complex nested state (preset selection + per-category overrides)
- Large form with many pickers
- Need PlatformPicker integration
- Presentation preset logic needs preservation

---

### 3. FactoryResetDialog.tsx ⚠️ **NEEDS MIGRATION**
**Lines:** 286  
**Status:** Dual implementation (Alert.alert on mobile, Modal on web)  
**Pattern:** ❌ Platform-conditional rendering  

**Current Structure:**
```tsx
// Mobile: Uses React Native Alert.alert (native confirmation)
if (Platform.OS !== 'web') {
  Alert.alert(
    'Factory Reset Confirmation',
    'This will completely restore...',
    [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Factory Reset', style: 'destructive' }
    ]
  );
  return null; // No modal rendered
}

// Web: Custom Modal implementation
<Modal visible={visible} transparent animationType="fade">
  {/* Two-stage confirmation */}
  {/* Stage 1: Info + "I Understand" checkbox */}
  {/* Stage 2: Final confirmation with countdown */}
</Modal>
```

**Key Features:**
- Two-stage confirmation on web (checkbox + countdown)
- Native Alert.alert on mobile (simpler UX)
- Destructive action with clear warnings
- Lists all consequences (widget removal, layout reset, etc.)

**Inconsistencies:**
- Different UX on mobile vs web (Alert vs Modal)
- No shared structure between platforms
- Web version uses custom Modal, not BaseSettingsModal
- Touch targets vary by platform
- No keyboard navigation on web

**Migration Complexity:** 🟡 MEDIUM
- Need to unify mobile/web confirmation patterns
- Two-stage confirmation logic needs preservation
- Destructive action styling (red theme)
- Countdown timer on web needs migration

---

### 4. AlarmConfigDialog.tsx ⚠️ **NEEDS MIGRATION**
**Lines:** 852  
**Status:** Complex custom Modal with internal navigation  
**Pattern:** ❌ Multi-view modal with custom routing  

**Current Structure:**
```tsx
<Modal visible={visible} transparent animationType="fade">
  <View style={container}>
    {/* Header with back/close navigation */}
    <View style={header}>
      {currentView === 'list' ? (
        <Text>Alarm Configuration</Text>
      ) : (
        <>
          <TouchableOpacity onPress={goBack}>
            <UniversalIcon name="arrow-back" />
          </TouchableOpacity>
          <Text>{alarmTypeName}</Text>
        </>
      )}
    </View>
    
    <ScrollView>
      {currentView === 'list' ? (
        <AlarmListView />
      ) : (
        <AlarmDetailView />
      )}
    </ScrollView>
  </View>
</Modal>
```

**Key Features:**
- Internal navigation (list view ↔ detail view)
- 8 alarm types (Shallow Depth, Deep Depth, High Speed, etc.)
- Per-alarm configuration:
  - Enable/disable toggle
  - Threshold values with unit-aware inputs
  - Escalation levels (Information, Caution, Warning, Alert)
  - Audio alert patterns
- Real-time preview with audio playback
- Custom LocalSwitch component (bypasses rendering issues)

**Inconsistencies:**
- Custom navigation pattern (not standard modal behavior)
- Multiple views within single modal
- Custom switch component (workaround for rendering issues)
- Touch targets inconsistent (some 36px, some 24px)
- No keyboard navigation
- Complex state management (view routing + alarm configs)

**Migration Complexity:** 🔴 VERY HIGH
- Multi-view navigation needs redesign (tabs vs stacked modals?)
- Extensive alarm configuration logic
- Audio preview integration
- Unit-aware input handling
- LocalSwitch workaround suggests underlying rendering issues

**Recommendation:** Likely needs multi-modal approach or tabbed BaseSettingsModal

---

### 5. LayoutSettingsDialog.tsx ⚠️ **NEEDS MIGRATION**
**Lines:** 343  
**Status:** Custom Modal implementation  
**Pattern:** ❌ Direct Modal + custom styling  

**Current Structure:**
```tsx
<Modal visible={visible} transparent animationType="fade">
  <TouchableOpacity style={overlay} onPress={onClose}>
    <TouchableOpacity activeOpacity={1} onPress={(e) => e.stopPropagation()}>
      <View style={container}>
        {/* Header */}
        <View style={header}>
          <Text style={title}>Widgets & Layout</Text>
          <TouchableOpacity onPress={onClose}>
            <UniversalIcon name="close" />
          </TouchableOpacity>
        </View>
        
        <ScrollView>
          {/* Section 1: Layout Mode Info */}
          <View style={section}>
            <Text style={sectionTitle}>Layout Mode</Text>
            <Text style={infoText}>
              {userPositioned ? 'Custom Layout' : 'Auto Layout'}
            </Text>
            {userPositioned && (
              <TouchableOpacity onPress={resetLayout}>
                <Text>Reset to Auto Layout</Text>
              </TouchableOpacity>
            )}
          </View>
          
          {/* Section 2: Widget Lifecycle */}
          <View style={section}>
            <Text style={sectionTitle}>Widget Lifecycle</Text>
            <View style={row}>
              <Text>Auto-remove stale widgets</Text>
              <Switch value={autoRemove} onValueChange={...} />
            </View>
            <View style={row}>
              <Text>Timeout</Text>
              {timeoutOptions.map(...)}
            </View>
          </View>
        </ScrollView>
        
        {/* Footer */}
        <View style={footer}>
          <TouchableOpacity style={doneButton} onPress={onClose}>
            <Text>Done</Text>
          </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
  </TouchableOpacity>
</Modal>
```

**Key Features:**
- Layout mode display (auto-discovery vs custom)
- "Reset to Auto Layout" button (conditional on userPositioned state)
- Widget auto-removal toggle
- Timeout selector (1min, 2min, 5min, 10min, 30min, 1 hour)
- Integrates with useWidgetStore

**Inconsistencies:**
- Header: Title left-aligned, close button right
- No keyboard navigation
- Touch targets: 24px icon (too small)
- Footer: Only "Done" button
- No platform detection
- Custom backdrop handling
- Uses React Native Switch directly (not PlatformToggle)
- Timeout selector uses custom TouchableOpacity buttons (not PlatformPicker)

**Migration Complexity:** 🟢 LOW-MEDIUM
- Relatively simple structure (2 sections)
- No complex state management
- Widget store integration straightforward
- Need PlatformToggle + PlatformPicker integration

---

### 6. DisplayThemeDialog.tsx 🚧 **PLACEHOLDER - NEEDS FULL IMPLEMENTATION**
**Lines:** 150  
**Status:** Placeholder showing "Coming Soon"  
**Pattern:** ❌ Custom Modal with no functionality  

**Current Structure:**
```tsx
<Modal visible={visible} transparent animationType="fade">
  <TouchableOpacity style={overlay} onPress={onClose}>
    <TouchableOpacity activeOpacity={1} onPress={(e) => e.stopPropagation()}>
      <View style={container}>
        {/* Header */}
        <View style={header}>
          <Text>Display & Theme</Text>
          <TouchableOpacity onPress={onClose}>
            <UniversalIcon name="close" />
          </TouchableOpacity>
        </View>
        
        <ScrollView>
          <View style={section}>
            <Text style={sectionTitle}>Coming Soon</Text>
            <View style={infoBox}>
              <Text>
                This dialog will include:
                • Theme selection (Day/Night/Red-Night/Auto)
                • Brightness control
                • Font size adjustment
                • Accessibility settings
                  - High contrast mode
                  - Reduce animations
                  - Large text
                  - Glove mode
                  - Haptic feedback
                  - Marine mode
              </Text>
            </View>
          </View>
        </ScrollView>
        
        {/* Footer */}
        <View style={footer}>
          <TouchableOpacity style={doneButton} onPress={onClose}>
            <Text>Done</Text>
          </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
  </TouchableOpacity>
</Modal>
```

**Planned Features:**
- Theme selection (Day, Night, Red-Night, Auto)
- Brightness slider
- Font size adjustment
- Accessibility toggles:
  - High contrast mode
  - Reduce animations
  - Large text
  - Glove mode
  - Haptic feedback
  - Marine mode

**Inconsistencies:**
- Placeholder only, no real implementation
- Same structural issues as other custom modals

**Migration Complexity:** 🟡 MEDIUM
- Full implementation needed from scratch
- Theme integration (useTheme store)
- Brightness control (platform-specific?)
- Accessibility settings (new store slice?)
- Glove mode already exists (settingsTokens.ts), just needs UI

---

### 7. AlarmHistoryDialog.tsx 🚧 **PLACEHOLDER - NEEDS FULL IMPLEMENTATION**
**Lines:** 180  
**Status:** Placeholder showing "Coming Soon"  
**Pattern:** ❌ Custom Modal with minimal functionality  

**Current Structure:**
```tsx
<Modal visible={visible} transparent animationType="fade">
  <TouchableOpacity style={overlay} onPress={onClose}>
    <TouchableOpacity activeOpacity={1} onPress={(e) => e.stopPropagation()}>
      <View style={container}>
        {/* Header */}
        <View style={header}>
          <Text>Alarm History</Text>
          <TouchableOpacity onPress={onClose}>
            <UniversalIcon name="close" />
          </TouchableOpacity>
        </View>
        
        <ScrollView>
          <View style={section}>
            <Text style={sectionTitle}>Recent Alarms</Text>
            <View style={infoBox}>
              <Text>
                Alarm history tracking coming soon.
                This will show:
                • Historical alarm events
                • Alarm timestamps
                • Alarm severity levels
                • Acknowledgment status
                • Option to export history
              </Text>
            </View>
          </View>
          
          <View style={section}>
            <Text style={sectionTitle}>Actions</Text>
            <TouchableOpacity onPress={handleClearHistory}>
              <UniversalIcon name="trash-outline" />
              <Text>Clear Alarm History</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
        
        {/* Footer */}
        <View style={footer}>
          <TouchableOpacity style={doneButton} onPress={onClose}>
            <Text>Done</Text>
          </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
  </TouchableOpacity>
</Modal>
```

**Planned Features:**
- Historical alarm event list
- Alarm timestamps (chronological)
- Severity level indicators
- Acknowledgment status
- Export history (CSV/JSON?)
- Clear history button (with confirmation)

**Current Implementation:**
- "Clear Alarm History" button with Alert.alert confirmation
- No actual history tracking in alarmStore

**Inconsistencies:**
- Placeholder only, minimal functionality
- Same structural issues as other custom modals
- Uses Alert.alert instead of modal confirmation

**Migration Complexity:** 🟡 MEDIUM
- Full implementation needed
- Alarm history tracking needs store integration
- List rendering with timestamps
- Export functionality (file system access)
- Clear confirmation pattern

---

## Pattern Analysis

### Common Modal Structure (Custom Modals)

All 6 non-migrated dialogs follow this pattern:

```tsx
<Modal visible={visible} transparent animationType="fade">
  <TouchableOpacity style={overlay} onPress={onClose}>
    <TouchableOpacity activeOpacity={1} onPress={(e) => e.stopPropagation()}>
      <View style={container}>
        {/* Header */}
        <View style={header}>
          <Text style={headerTitle}>{title}</Text>
          <TouchableOpacity onPress={onClose}>
            <UniversalIcon name="close" size={24} />
          </TouchableOpacity>
        </View>
        
        <ScrollView style={content}>
          {/* Dialog-specific content */}
        </ScrollView>
        
        {/* Footer */}
        <View style={footer}>
          <TouchableOpacity style={doneButton} onPress={onClose}>
            <Text>Done</Text>
          </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
  </TouchableOpacity>
</Modal>
```

### Identified Inconsistencies

#### 1. Header Structure
- **Position:** All use left-aligned title + right close button
- **Close Icon:** All use `UniversalIcon name="close"` size 24
- **Issue:** No platform detection (iOS = right close, Android = left close)

#### 2. Touch Targets
- **Close Button:** 24px icon only (no 44pt+ touch target wrapper)
- **Buttons:** Vary between 40-48px height
- **Issue:** Not marine-optimized, no glove mode support

#### 3. Footer Buttons
- **Pattern:** Most use single "Done" button
- **Issue:** No "Cancel" vs "Save" distinction
- **Issue:** No keyboard shortcuts (Enter, Esc)

#### 4. Backdrop Handling
- **Pattern:** `TouchableOpacity` with nested stopPropagation
- **Issue:** Should use `Pressable` for better accessibility
- **Issue:** No dismissible prop (always closeable)

#### 5. Keyboard Navigation
- **Support:** None (except ConnectionConfigDialog)
- **Issue:** Web/Desktop users can't Tab/Enter/Esc

#### 6. Platform Detection
- **Support:** None (except ConnectionConfigDialog)
- **Issue:** Same UX on phone/tablet/TV/web

#### 7. Styling Inconsistencies
- **Border Radius:** Varies (12-16px)
- **Padding:** Varies (16-20px)
- **Shadow:** Some have elevation, some don't
- **Typography:** Font sizes inconsistent (14-20px for titles)

#### 8. Component Usage
- **Switches:** Some use `Switch` directly, some use platform components
- **Inputs:** No use of `PlatformTextInput` (except ConnectionConfigDialog)
- **Buttons:** No use of `PlatformButton`
- **Pickers:** Custom implementations, no `PlatformPicker`

---

## BaseSettingsModal Features (Already Available)

### ✅ Implemented Features

1. **Platform Detection**
   - `detectPlatform()` utility
   - `hasKeyboard()` detection
   - `isGloveMode()` support
   - `isTablet()` detection

2. **Keyboard Navigation**
   - Tab: Focus next element
   - Enter: Submit form (calls onSave)
   - Escape: Close modal (calls onClose)
   - Focus trap (keeps focus within modal)

3. **Touch Target Sizing**
   - Phone: 44pt (iOS minimum)
   - Tablet: 56pt (marine-optimized)
   - Glove: 64pt (enhanced for gloves)

4. **Theme Integration**
   - Fully theme-aware (day/night/red-night)
   - Uses `settingsTokens.ts` design system
   - Proper shadow rendering (Android elevation + iOS shadows)

5. **Responsive Layout**
   - Phone: 90% viewport width
   - Tablet: 500pt fixed
   - Desktop: 600pt fixed
   - Max width: 800pt

6. **Modal Behavior**
   - Dismissible vs non-dismissible modes
   - Backdrop press handling
   - Android back button support
   - KeyboardAvoidingView on iOS

7. **Accessibility**
   - ARIA labels (web)
   - Focus management
   - Screen reader support
   - Accessible button roles

8. **Footer Patterns**
   - Optional footer (showFooter prop)
   - Cancel + Save buttons
   - Custom button text
   - Proper button styling (primary vs secondary)

### ✅ Available Platform Components

1. **PlatformTextInput**
   - Platform-aware touch targets
   - Built-in validation
   - Error display
   - Keyboard type support
   - Focus indicators

2. **PlatformToggle**
   - iOS: UISwitch style
   - Android: Material switch
   - Web: Custom styled toggle
   - Theme-aware colors

3. **PlatformButton**
   - Primary, secondary, destructive variants
   - Platform-specific ripple effects (Android)
   - Proper touch feedback
   - Keyboard navigation

4. **PlatformPicker**
   - iOS: ActionSheet/Wheel picker
   - Android: Material dropdown
   - Web: Select dropdown
   - Consistent API across platforms

---

## Migration Strategy

### Phase 1: Low-Hanging Fruit (Simple Dialogs)

**Priority 1: LayoutSettingsDialog** 🟢 LOW COMPLEXITY
- Migrate to BaseSettingsModal
- Replace Switch with PlatformToggle
- Replace timeout buttons with PlatformPicker
- Add keyboard navigation
- Preserve widget store integration

**Priority 2: DisplayThemeDialog** 🟡 MEDIUM COMPLEXITY
- Migrate to BaseSettingsModal
- Implement theme selection (PlatformPicker)
- Add brightness slider (PlatformSlider - may need creation)
- Implement accessibility toggles (PlatformToggle)
- Connect to theme store + new accessibility store slice

**Priority 3: AlarmHistoryDialog** 🟡 MEDIUM COMPLEXITY
- Migrate to BaseSettingsModal
- Implement history list rendering
- Add alarm store history tracking
- Replace Alert.alert with BaseSettingsModal confirmation
- Add export functionality

### Phase 2: Complex Dialogs (Multi-View or Legacy)

**Priority 4: FactoryResetDialog** 🟡 MEDIUM COMPLEXITY
- Unify mobile/web confirmation patterns
- Migrate to BaseSettingsModal
- Implement two-stage confirmation within modal
- Add countdown timer logic
- Use destructive button styling

**Priority 5: UnitsConfigDialog** 🔴 HIGH COMPLEXITY
- Migrate to BaseSettingsModal
- Convert all unit pickers to PlatformPicker
- Preserve presentation preset logic
- Maintain per-category override state
- Test comprehensive unit coverage

**Priority 6: AlarmConfigDialog** 🔴 VERY HIGH COMPLEXITY
- Decision: Multi-modal approach vs tabbed modal?
- Migrate list view to BaseSettingsModal
- Migrate detail view to separate modal or tab
- Replace LocalSwitch with PlatformToggle (investigate root cause)
- Preserve alarm configuration logic
- Maintain audio preview integration

---

## Recommended Next Steps

### Step 1: Create Missing Platform Components
- **PlatformSlider**: For brightness control in DisplayThemeDialog
- **PlatformSectionHeader**: Reusable section title component
- **PlatformInfoBox**: Reusable info/warning box component
- **PlatformListItem**: For alarm history list rendering

### Step 2: Extend BaseSettingsModal
- **Variant: Tabbed Modal**: For AlarmConfigDialog internal navigation
- **Variant: Confirmation Modal**: For destructive actions (Factory Reset, Clear History)
- **Variant: Two-Stage Confirmation**: For Factory Reset

### Step 3: Create Migration Checklist Template
For each dialog:
- [ ] Replace Modal with BaseSettingsModal
- [ ] Replace custom inputs with Platform components
- [ ] Add keyboard navigation support
- [ ] Implement platform-specific touch targets
- [ ] Test on iOS, Android, Web, TV simulators
- [ ] Verify theme integration
- [ ] Check accessibility (screen readers, keyboard-only)

### Step 4: Execute Migration in Priority Order
1. LayoutSettingsDialog (simplest, validates pattern)
2. DisplayThemeDialog (placeholder, clean slate)
3. AlarmHistoryDialog (placeholder, clean slate)
4. FactoryResetDialog (medium complexity, unify platforms)
5. UnitsConfigDialog (high complexity, extensive pickers)
6. AlarmConfigDialog (very high, needs architectural decision)

---

## Success Criteria

✅ **All 7 dialogs use BaseSettingsModal**  
✅ **All dialogs use Platform Input Components**  
✅ **Keyboard navigation works on all dialogs (Web/TV)**  
✅ **Touch targets meet marine standards (44pt/56pt/64pt)**  
✅ **Platform-specific styling (iOS HIG, Material Design)**  
✅ **Theme integration consistent across all dialogs**  
✅ **No visual regressions (side-by-side comparison)**  
✅ **All existing functionality preserved**  
✅ **Zero breaking changes to public APIs**  

---

## Timeline Estimate

| Phase | Dialogs | Estimated Effort | Complexity |
|-------|---------|------------------|------------|
| Phase 1 | LayoutSettings, DisplayTheme, AlarmHistory | 4-6 hours | Low-Medium |
| Phase 2 | FactoryReset | 2-3 hours | Medium |
| Phase 3 | UnitsConfig | 3-4 hours | High |
| Phase 4 | AlarmConfig | 4-6 hours | Very High |
| **Total** | **7 dialogs** | **13-19 hours** | **Mixed** |

---

## Notes

- **ConnectionConfigDialog** already complete - use as reference
- **settingsTokens.ts** provides complete design system
- **Platform components** already exist for most needs
- **Focus on consistency** over perfection in Phase 1
- **Preserve all functionality** - zero breaking changes

---

**Document Version:** 1.0  
**Last Updated:** 2025-01-XX  
**Next Review:** After Phase 1 completion

---

# IMPLEMENTATION PLAN: Platform-Native Settings Dialogs

**Epic:** Cross-Platform Settings Unification  
**Target Platforms:** iOS, iPadOS, tvOS, Android Tablet, Android TV  
**Framework:** React Native + Expo  
**Baseline Performance:** Low-end TV devices (Fire TV Stick, Apple TV HD)  
**Status:** Ready for Implementation

---

## Phase 0: Foundation & Research

### Task 0.1: Audit Expo/React Native Native Capabilities
**Priority:** Critical  
**Estimated Time:** 2 hours

**Objective:** Identify which React Native and Expo components provide automatic platform-native rendering vs require custom wrappers.

**Actions:**
1. **Audit React Native Core Components:**
   - `Modal` - Check `presentationStyle` prop (iOS: "pageSheet", "formSheet", "fullScreen")
   - `Switch` - Verify native iOS/Android rendering without customization
   - `Picker` - Test ActionSheet on iOS vs Spinner on Android
   - `SectionList` - Verify iOS grouped list style support
   - `Pressable` - Confirm automatic Android ripple effect
   - `StatusBar` - Platform-specific APIs
   - `SafeAreaView` - iOS notch/home indicator handling

2. **Audit Expo Modules:**
   - `expo-haptics` - iOS tactile feedback for button presses
   - `expo-navigation-bar` - Android navigation bar theming
   - `@react-native-segmented-control/segmented-control` - iOS segmented control
   - `react-native-gesture-handler` - iOS swipe-to-dismiss gestures
   - Check if `react-native-tvos` fork needed or if `Platform.isTV` sufficient

3. **Document Findings:**
   - Create comparison table: Component → iOS Behavior → Android Behavior → TV Behavior
   - Identify gaps requiring custom implementation
   - Note performance characteristics on TV platforms

**Deliverables:**
- Component capability matrix
- List of required npm packages (`@react-native-segmented-control`, `react-native-gesture-handler`)
- Performance baseline notes for TV

**Acceptance Criteria:**
- ✅ All native component behaviors documented
- ✅ Required dependencies identified
- ✅ TV platform limitations understood

---

### Task 0.2: Enhance Platform Detection System
**Priority:** Critical  
**Estimated Time:** 1 hour  
**File:** `boatingInstrumentsApp/src/utils/platformDetection.ts`

**Objective:** Extend platform detection to distinguish phone/tablet/TV variants and detect viewing distance requirements.

**Implementation:**

```typescript
// Add to platformDetection.ts

import { Platform, Dimensions } from 'react-native';

/**
 * Detect if running on TV platform
 */
export function isTV(): boolean {
  return Platform.isTV || Platform.isTVOS;
}

/**
 * Detect specific TV platform
 */
export function getTVPlatform(): 'tvos' | 'androidtv' | null {
  if (Platform.isTVOS) return 'tvos';
  if (Platform.isTV && Platform.OS === 'android') return 'androidtv';
  return null;
}

/**
 * Get platform variant for component selection
 * Returns: 'ios-phone' | 'ios-tablet' | 'tvos' | 'android-phone' | 'android-tablet' | 'androidtv' | 'web'
 */
export function getPlatformVariant(): string {
  const { width, height } = Dimensions.get('window');
  const isLargeScreen = Math.min(width, height) >= 600;
  
  if (Platform.isTVOS) return 'tvos';
  if (Platform.isTV && Platform.OS === 'android') return 'androidtv';
  if (Platform.OS === 'web') return 'web';
  if (Platform.OS === 'ios') return isLargeScreen ? 'ios-tablet' : 'ios-phone';
  if (Platform.OS === 'android') return isLargeScreen ? 'android-tablet' : 'android-phone';
  
  return 'unknown';
}

/**
 * Calculate viewing distance scale factor
 * Phone: 1.0x (12-18 inches)
 * Tablet: 1.2x (18-24 inches)
 * TV: 2.0x (10+ feet)
 */
export function getViewingDistanceScale(): number {
  const variant = getPlatformVariant();
  
  if (variant === 'tvos' || variant === 'androidtv') return 2.0;
  if (variant === 'ios-tablet' || variant === 'android-tablet') return 1.2;
  return 1.0;
}
```

**Testing:**
- Verify correct detection on iPad, iPhone, Apple TV, Fire TV Stick
- Confirm `getPlatformVariant()` returns expected values
- Test scale factor matches existing dashboard widget scaling

**Deliverables:**
- Enhanced `platformDetection.ts` with TV support
- Unit tests for all detection functions

**Acceptance Criteria:**
- ✅ TV platform correctly detected
- ✅ Viewing distance scale matches widget system
- ✅ All tests pass

---

### Task 0.3: Extend settingsTokens with Platform-Specific Variants
**Priority:** Critical  
**Estimated Time:** 2 hours  
**File:** `boatingInstrumentsApp/src/theme/settingsTokens.ts`

**Objective:** Add platform-specific design tokens for iOS, Android, and TV that strictly follow HIG and Material Design 3 guidelines.

**Implementation:**

```typescript
// Extend settingsTokens.ts

import { Platform } from 'react-native';
import { getPlatformVariant, getViewingDistanceScale } from '../utils/platformDetection';

/**
 * Platform-Specific Modal Presentation Styles
 */
export const modalPresentationStyles = {
  ios: {
    phone: {
      borderRadius: 16,
      marginHorizontal: 20,
      marginVertical: 40,
      shadow: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.3,
        shadowRadius: 20,
      },
    },
    tablet: {
      borderRadius: 16,
      width: 540,
      maxHeight: '85%',
      centered: true,
      shadow: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.3,
        shadowRadius: 20,
      },
    },
  },
  android: {
    phone: {
      borderRadius: 28, // Material Design 3 large radius
      elevation: 8,
      bottomSheet: true, // Slide up from bottom
    },
    tablet: {
      borderRadius: 28,
      width: 560,
      maxHeight: '85%',
      centered: true,
      elevation: 8,
    },
  },
  tv: {
    borderRadius: 12, // Simpler for TV
    width: '80%',
    maxWidth: 1200,
    maxHeight: '80%',
    centered: true,
    // No shadows on TV (performance)
    focusBorder: {
      width: 4,
      color: '#007AFF', // Will be theme-aware at runtime
    },
  },
};

/**
 * Platform-Specific Typography
 * Based on viewing distance scaling
 */
export const platformTypography = {
  ios: {
    // SF Pro Text family
    fontFamily: Platform.select({
      ios: 'System',
      default: 'sans-serif',
    }),
    title: { fontSize: 20, fontWeight: '600', lineHeight: 28 },
    sectionHeader: { fontSize: 16, fontWeight: '600', lineHeight: 24 },
    label: { fontSize: 14, fontWeight: '500', lineHeight: 20 },
    body: { fontSize: 14, fontWeight: '400', lineHeight: 20 },
    caption: { fontSize: 12, fontWeight: '400', lineHeight: 16 },
  },
  android: {
    // Roboto family
    fontFamily: 'Roboto',
    title: { fontSize: 22, fontWeight: '500', lineHeight: 28 }, // Material title-large
    sectionHeader: { fontSize: 16, fontWeight: '500', lineHeight: 24 }, // Material title-medium
    label: { fontSize: 14, fontWeight: '500', lineHeight: 20 }, // Material label-large
    body: { fontSize: 14, fontWeight: '400', lineHeight: 20 }, // Material body-medium
    caption: { fontSize: 12, fontWeight: '400', lineHeight: 16 }, // Material body-small
  },
  tv: {
    // 2x scale for 10-foot viewing
    fontFamily: Platform.select({
      ios: 'System',
      default: 'sans-serif',
    }),
    title: { fontSize: 32, fontWeight: '600', lineHeight: 40 },
    sectionHeader: { fontSize: 24, fontWeight: '600', lineHeight: 32 },
    label: { fontSize: 20, fontWeight: '500', lineHeight: 28 },
    body: { fontSize: 20, fontWeight: '400', lineHeight: 28 },
    caption: { fontSize: 18, fontWeight: '400', lineHeight: 24 },
  },
};

/**
 * Platform-Specific Spacing
 */
export const platformSpacing = {
  phone: {
    section: 16,
    row: 12,
    inset: 16,
  },
  tablet: {
    section: 20,
    row: 16,
    inset: 20,
  },
  tv: {
    section: 32, // 2x for TV
    row: 24,
    inset: 24,
  },
};

/**
 * Touch Target Sizes (Marine-optimized)
 */
export const touchTargets = {
  phone: 44, // iOS minimum
  tablet: 56, // Marine-optimized
  tv: 60, // D-pad/remote navigation
  glove: 64, // Enhanced for glove use (all platforms)
};

/**
 * Platform-Specific Animation Settings
 * TV uses shorter, simpler animations for low-end devices
 */
export const platformAnimations = {
  phone: {
    modalEntrance: 300,
    modalExit: 250,
    focusTransition: 200,
    useNativeDriver: true,
  },
  tablet: {
    modalEntrance: 300,
    modalExit: 250,
    focusTransition: 200,
    useNativeDriver: true,
  },
  tv: {
    modalEntrance: 150, // 50% faster on TV
    modalExit: 150,
    focusTransition: 100, // Snappy focus changes
    useNativeDriver: true,
    reducedMotion: true, // Simpler animations
  },
};

/**
 * Get tokens for current platform
 */
export function getPlatformTokens() {
  const variant = getPlatformVariant();
  const scale = getViewingDistanceScale();
  const isTV = variant === 'tvos' || variant === 'androidtv';
  const isTablet = variant.includes('tablet');
  
  return {
    modal: isTV 
      ? modalPresentationStyles.tv 
      : variant.startsWith('ios')
        ? modalPresentationStyles.ios[isTablet ? 'tablet' : 'phone']
        : modalPresentationStyles.android[isTablet ? 'tablet' : 'phone'],
    typography: isTV
      ? platformTypography.tv
      : variant.startsWith('ios')
        ? platformTypography.ios
        : platformTypography.android,
    spacing: isTV
      ? platformSpacing.tv
      : isTablet
        ? platformSpacing.tablet
        : platformSpacing.phone,
    touchTarget: touchTargets[isTV ? 'tv' : isTablet ? 'tablet' : 'phone'],
    animations: isTV
      ? platformAnimations.tv
      : isTablet
        ? platformAnimations.tablet
        : platformAnimations.phone,
  };
}
```

**Testing:**
- Verify token values on iPad (should use tablet tokens)
- Confirm TV gets 2x typography scale
- Test animation durations on Fire TV Stick
- Validate iOS gets SF-based sizing, Android gets Roboto sizing

**Deliverables:**
- Extended `settingsTokens.ts` with platform variants
- Helper function `getPlatformTokens()` for runtime selection
- Documentation of HIG/Material Design compliance

**Acceptance Criteria:**
- ✅ iOS tokens match HIG specifications
- ✅ Android tokens match Material Design 3
- ✅ TV tokens optimized for performance and 10-foot viewing
- ✅ All tokens scale with viewing distance

---

## Phase 1: Core Component Infrastructure

### Task 1.1: Refactor BaseSettingsModal with Platform Variants
**Priority:** Critical  
**Estimated Time:** 4 hours  
**File:** `boatingInstrumentsApp/src/components/dialogs/base/BaseSettingsModal.tsx`

**Objective:** Extend BaseSettingsModal to render platform-specific modal presentations while maintaining single component API.

**Implementation Strategy:**

1. **Add Platform Variant Detection:**
   ```typescript
   const platformVariant = getPlatformVariant();
   const platformTokens = getPlatformTokens();
   const isTV = platformVariant === 'tvos' || platformVariant === 'androidtv';
   const isIOS = platformVariant.startsWith('ios');
   ```

2. **iOS Modal Rendering:**
   ```typescript
   <Modal
     visible={visible}
     animationType="slide"
     presentationStyle="pageSheet" // Native iOS card presentation
     onRequestClose={onClose}
   >
     {/* Inset card with rounded corners, shadow */}
   </Modal>
   ```

3. **Android Modal Rendering:**
   ```typescript
   // Phone: Bottom sheet slide-up
   // Tablet: Centered elevated dialog
   <Modal
     visible={visible}
     animationType="slide"
     transparent={true}
     onRequestClose={onClose}
   >
     {/* Material Design 3 elevation, rounded corners */}
   </Modal>
   ```

4. **TV Modal Rendering:**
   ```typescript
   <Modal
     visible={visible}
     animationType="fade" // Simpler animation
     transparent={true}
     onRequestClose={onClose}
   >
     {/* Centered, simplified design, focus trap */}
   </Modal>
   ```

5. **Add iOS Swipe-to-Dismiss (if gesture-handler available):**
   ```typescript
   {isIOS && !isTV && (
     <PanGestureHandler onGestureEvent={handlePanGesture}>
       {/* Modal content */}
     </PanGestureHandler>
   )}
   ```

**Detailed Code Changes:**

```typescript
// BaseSettingsModal.tsx additions

import { getPlatformVariant, getPlatformTokens, isTV } from '../../../utils/platformDetection';
import { InteractionManager } from 'react-native';

// Add to props interface
export interface BaseSettingsModalProps {
  // ... existing props ...
  
  /** Override automatic platform detection (for testing) */
  platformVariant?: 'ios-phone' | 'ios-tablet' | 'android-phone' | 'android-tablet' | 'tvos' | 'androidtv';
}

// In component body
const platformVariant = props.platformVariant || getPlatformVariant();
const platformTokens = getPlatformTokens();
const isTVPlatform = isTV();
const isIOSPlatform = platformVariant.startsWith('ios');

// Platform-specific modal presentation
const modalPresentationStyle = isIOSPlatform && !isTVPlatform
  ? 'pageSheet' // Native iOS card
  : undefined;

const modalAnimationType = isTVPlatform
  ? 'fade' // Simpler for TV
  : 'slide';

// Apply platform-specific styling
const modalContainerStyle = {
  ...platformTokens.modal,
  backgroundColor: theme.surface,
};

// Handle modal entrance animation with InteractionManager for TV
useEffect(() => {
  if (visible && isTVPlatform) {
    InteractionManager.runAfterInteractions(() => {
      animateIn();
    });
  } else if (visible) {
    animateIn();
  }
}, [visible, isTVPlatform, animateIn]);
```

**Testing:**
- iOS: Verify pageSheet presentation with drag-to-dismiss
- Android: Confirm bottom sheet on phone, centered on tablet
- TV: Test fade animation, confirm no shadows rendered
- Performance: Profile animation frame rate on Fire TV Stick (target: 60fps)

**Deliverables:**
- Updated `BaseSettingsModal.tsx` with platform variants
- Platform-specific modal presentation styles
- Performance-optimized TV rendering

**Acceptance Criteria:**
- ✅ iOS shows native card presentation
- ✅ Android shows Material Design modal/bottom sheet
- ✅ TV shows simplified centered modal
- ✅ All animations run at 60fps on Fire TV Stick
- ✅ Zero breaking changes to existing API

---

### Task 1.2: Create TV Focus Management System
**Priority:** Critical  
**Estimated Time:** 3 hours  
**Files:** `boatingInstrumentsApp/src/hooks/useTVFocusManager.ts` (new)

**Objective:** Build reusable focus management system for tvOS (Siri Remote) and Android TV (D-pad) navigation.

**Implementation:**

```typescript
/**
 * useTVFocusManager Hook
 * Manages focus state and navigation for TV platforms
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { Platform, BackHandler, Animated, TVEventHandler } from 'react-native';
import { isTV } from '../utils/platformDetection';

interface TVFocusConfig {
  /** Initial focus on mount */
  autoFocus?: boolean;
  /** Focus order: 'vertical' | 'horizontal' | 'grid' */
  focusOrder?: 'vertical' | 'horizontal' | 'grid';
  /** Callback when focus changes */
  onFocusChange?: (focusedIndex: number) => void;
  /** Enable focus wrap-around */
  enableWrapAround?: boolean;
}

export function useTVFocusManager(
  itemCount: number,
  config: TVFocusConfig = {}
) {
  const {
    autoFocus = true,
    focusOrder = 'vertical',
    onFocusChange,
    enableWrapAround = true,
  } = config;

  const [focusedIndex, setFocusedIndex] = useState(autoFocus ? 0 : -1);
  const focusAnimations = useRef<Animated.Value[]>([]);
  const tvEventHandler = useRef<TVEventHandler | null>(null);

  // Initialize focus animations for each item
  useEffect(() => {
    focusAnimations.current = Array(itemCount)
      .fill(0)
      .map(() => new Animated.Value(0));
  }, [itemCount]);

  // Animate focus state for an item
  const animateFocus = useCallback((index: number, focused: boolean) => {
    const animation = focusAnimations.current[index];
    if (!animation) return;

    Animated.timing(animation, {
      toValue: focused ? 1 : 0,
      duration: 100, // Fast focus transitions for TV
      useNativeDriver: true,
    }).start();
  }, []);

  // Handle focus change
  const handleFocusChange = useCallback((newIndex: number) => {
    if (newIndex === focusedIndex) return;
    
    // Animate out old focus
    if (focusedIndex >= 0) {
      animateFocus(focusedIndex, false);
    }
    
    // Animate in new focus
    animateFocus(newIndex, true);
    
    setFocusedIndex(newIndex);
    onFocusChange?.(newIndex);
  }, [focusedIndex, animateFocus, onFocusChange]);

  // Handle navigation events
  useEffect(() => {
    if (!isTV()) return;

    const handleTVEvent = (event: any) => {
      const { eventType, eventKeyAction } = event;
      
      // Only handle key down events
      if (eventKeyAction !== 0) return;

      let newIndex = focusedIndex;

      switch (eventType) {
        case 'up':
          if (focusOrder === 'vertical' || focusOrder === 'grid') {
            newIndex = focusedIndex > 0 ? focusedIndex - 1 : enableWrapAround ? itemCount - 1 : focusedIndex;
          }
          break;
        case 'down':
          if (focusOrder === 'vertical' || focusOrder === 'grid') {
            newIndex = focusedIndex < itemCount - 1 ? focusedIndex + 1 : enableWrapAround ? 0 : focusedIndex;
          }
          break;
        case 'left':
          if (focusOrder === 'horizontal' || focusOrder === 'grid') {
            newIndex = focusedIndex > 0 ? focusedIndex - 1 : enableWrapAround ? itemCount - 1 : focusedIndex;
          }
          break;
        case 'right':
          if (focusOrder === 'horizontal' || focusOrder === 'grid') {
            newIndex = focusedIndex < itemCount - 1 ? focusedIndex + 1 : enableWrapAround ? 0 : focusedIndex;
          }
          break;
      }

      if (newIndex !== focusedIndex) {
        handleFocusChange(newIndex);
      }
    };

    // Set up TV event handler
    if (Platform.isTVOS) {
      tvEventHandler.current = new TVEventHandler();
      tvEventHandler.current.enable(null, handleTVEvent);
    }

    // Android TV uses BackHandler
    if (Platform.isTV && Platform.OS === 'android') {
      const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
        // Let parent handle back press
        return false;
      });
      return () => subscription.remove();
    }

    return () => {
      if (tvEventHandler.current) {
        tvEventHandler.current.disable();
      }
    };
  }, [focusedIndex, itemCount, focusOrder, enableWrapAround, handleFocusChange]);

  // Get focus style for an item
  const getFocusStyle = useCallback((index: number) => {
    const animation = focusAnimations.current[index];
    if (!animation) return {};

    return {
      transform: [
        {
          scale: animation.interpolate({
            inputRange: [0, 1],
            outputRange: [1.0, 1.05], // Subtle scale on focus
          }),
        },
      ],
      borderWidth: 4,
      borderColor: animation.interpolate({
        inputRange: [0, 1],
        outputRange: ['transparent', '#007AFF'], // Will be theme-aware
      }),
    };
  }, []);

  return {
    focusedIndex,
    setFocusedIndex: handleFocusChange,
    getFocusStyle,
    isFocused: (index: number) => index === focusedIndex,
  };
}
```

**Integration Example:**

```typescript
// In a settings dialog component
const { focusedIndex, getFocusStyle, isFocused } = useTVFocusManager(
  settingsItems.length,
  {
    autoFocus: true,
    focusOrder: 'vertical',
    enableWrapAround: true,
  }
);

return (
  <ScrollView>
    {settingsItems.map((item, index) => (
      <Animated.View
        key={item.id}
        style={[styles.settingRow, isTV() && getFocusStyle(index)]}
        focusable={isTV()}
        hasTVPreferredFocus={index === 0}
      >
        {/* Setting content */}
      </Animated.View>
    ))}
  </ScrollView>
);
```

**Testing:**
- tvOS: Test Siri Remote navigation (swipe, click, menu button)
- Android TV: Test D-pad navigation (arrows, select, back button)
- Verify focus wraps around at list boundaries
- Confirm 60fps focus animations on Fire TV Stick
- Test focus trap (focus stays within modal)

**Deliverables:**
- `useTVFocusManager.ts` hook
- Focus animation system with Animated API
- Remote/D-pad event handling

**Acceptance Criteria:**
- ✅ Focus navigation works on tvOS with Siri Remote
- ✅ Focus navigation works on Android TV with D-pad
- ✅ Focus animations run at 60fps on low-end devices
- ✅ Focus indicators clearly visible from 10 feet
- ✅ Back button returns to previous screen

---

### Task 1.3: Build Platform-Adaptive Layout Components
**Priority:** High  
**Estimated Time:** 4 hours  
**Files:** 
- `boatingInstrumentsApp/src/components/dialogs/layout/PlatformSettingsSection.tsx` (new)
- `boatingInstrumentsApp/src/components/dialogs/layout/PlatformSettingsRow.tsx` (new)
- `boatingInstrumentsApp/src/components/dialogs/layout/PlatformSectionHeader.tsx` (new)

**Objective:** Create reusable layout components that automatically render platform-appropriate styles (iOS grouped lists vs Android Material cards).

**Implementation - PlatformSettingsSection.tsx:**

```typescript
/**
 * PlatformSettingsSection Component
 * Renders platform-native section containers
 * - iOS: Inset grouped style with rounded corners
 * - Android: Material card with elevation
 * - TV: Simplified container with focus support
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useTheme } from '../../../store/themeStore';
import { getPlatformVariant, getPlatformTokens } from '../../../utils/platformDetection';

interface PlatformSettingsSectionProps {
  children: React.ReactNode;
  /** Optional custom style */
  style?: any;
}

export const PlatformSettingsSection: React.FC<PlatformSettingsSectionProps> = ({
  children,
  style,
}) => {
  const theme = useTheme();
  const platformVariant = getPlatformVariant();
  const platformTokens = getPlatformTokens();
  
  const isIOS = platformVariant.startsWith('ios');
  const isTV = platformVariant === 'tvos' || platformVariant === 'androidtv';

  // iOS: Inset grouped style (rounded, margin, background)
  if (isIOS) {
    return (
      <View
        style={[
          styles.iosSection,
          {
            backgroundColor: theme.surface,
            marginHorizontal: platformTokens.spacing.inset,
            marginVertical: platformTokens.spacing.section / 2,
            borderRadius: 10, // iOS standard grouped corner radius
          },
          style,
        ]}
      >
        {children}
      </View>
    );
  }

  // Android: Material card with elevation
  if (!isTV) {
    return (
      <View
        style={[
          styles.androidSection,
          {
            backgroundColor: theme.surface,
            marginHorizontal: platformTokens.spacing.inset,
            marginVertical: platformTokens.spacing.section / 2,
            borderRadius: 12, // Material Design medium radius
            elevation: 2, // Subtle elevation
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 1 },
            shadowOpacity: 0.1,
            shadowRadius: 3,
          },
          style,
        ]}
      >
        {children}
      </View>
    );
  }

  // TV: Simplified flat container
  return (
    <View
      style={[
        styles.tvSection,
        {
          backgroundColor: theme.surface,
          marginVertical: platformTokens.spacing.section / 2,
          paddingHorizontal: platformTokens.spacing.inset,
          borderRadius: 8,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  iosSection: {
    overflow: 'hidden',
  },
  androidSection: {
    overflow: 'hidden',
  },
  tvSection: {
    // No overflow hidden on TV (focus borders extend outside)
  },
});
```

**Implementation - PlatformSettingsRow.tsx:**

```typescript
/**
 * PlatformSettingsRow Component
 * Renders platform-native row layout for settings items
 * - iOS: Left label, right control, disclosure indicator
 * - Android: Left label, right control, ripple effect
 * - TV: Large padding, prominent focus state
 */

import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useTheme } from '../../../store/themeStore';
import { getPlatformVariant, getPlatformTokens, isTV } from '../../../utils/platformDetection';
import { UniversalIcon } from '../../atoms/UniversalIcon';

interface PlatformSettingsRowProps {
  /** Row label */
  label: string;
  /** Right-side control (switch, picker, button, etc.) */
  rightElement?: React.ReactNode;
  /** Show disclosure indicator (iOS chevron) */
  showDisclosure?: boolean;
  /** Tap handler */
  onPress?: () => void;
  /** Disable interaction */
  disabled?: boolean;
  /** Focus index for TV navigation */
  focusIndex?: number;
  /** TV focus style */
  tvFocusStyle?: any;
}

export const PlatformSettingsRow: React.FC<PlatformSettingsRowProps> = ({
  label,
  rightElement,
  showDisclosure = false,
  onPress,
  disabled = false,
  focusIndex,
  tvFocusStyle,
}) => {
  const theme = useTheme();
  const platformVariant = getPlatformVariant();
  const platformTokens = getPlatformTokens();
  const isTVPlatform = isTV();
  const isIOSPlatform = platformVariant.startsWith('ios');

  const rowHeight = isTVPlatform ? 72 : platformTokens.touchTarget;

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || !onPress}
      style={({ pressed }) => [
        styles.row,
        {
          height: rowHeight,
          paddingHorizontal: platformTokens.spacing.inset,
          backgroundColor: pressed && !isTVPlatform ? theme.backgroundSecondary : 'transparent',
        },
        isTVPlatform && tvFocusStyle,
      ]}
      // Android ripple effect
      android_ripple={{
        color: theme.interactive + '20',
      }}
      // TV focus props
      focusable={isTVPlatform}
      hasTVPreferredFocus={focusIndex === 0}
    >
      <View style={styles.rowContent}>
        {/* Label */}
        <Text
          style={[
            styles.label,
            {
              color: disabled ? theme.textSecondary : theme.text,
              fontSize: platformTokens.typography.label.fontSize,
              fontWeight: platformTokens.typography.label.fontWeight,
            },
          ]}
          numberOfLines={1}
        >
          {label}
        </Text>

        {/* Right side */}
        <View style={styles.rightContainer}>
          {rightElement}
          
          {/* iOS disclosure indicator */}
          {showDisclosure && isIOSPlatform && (
            <UniversalIcon
              name="chevron-forward"
              size={isTVPlatform ? 28 : 20}
              color={theme.textSecondary}
              style={styles.disclosureIcon}
            />
          )}
        </View>
      </View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  row: {
    justifyContent: 'center',
  },
  rowContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  label: {
    flex: 1,
    marginRight: 12,
  },
  rightContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  disclosureIcon: {
    marginLeft: 4,
  },
});
```

**Implementation - PlatformSectionHeader.tsx:**

```typescript
/**
 * PlatformSectionHeader Component
 * Renders platform-native section headers
 * - iOS: Uppercase, small, gray text with inset
 * - Android: Larger, medium weight, Material accent color
 * - TV: Large, bold, prominent from distance
 */

import React from 'react';
import { Text, StyleSheet, View } from 'react-native';
import { useTheme } from '../../../store/themeStore';
import { getPlatformVariant, getPlatformTokens } from '../../../utils/platformDetection';

interface PlatformSectionHeaderProps {
  title: string;
  subtitle?: string;
}

export const PlatformSectionHeader: React.FC<PlatformSectionHeaderProps> = ({
  title,
  subtitle,
}) => {
  const theme = useTheme();
  const platformVariant = getPlatformVariant();
  const platformTokens = getPlatformTokens();
  
  const isIOS = platformVariant.startsWith('ios');
  const isTV = platformVariant === 'tvos' || platformVariant === 'androidtv';

  // iOS: Uppercase, small, inset
  if (isIOS) {
    return (
      <View
        style={[
          styles.headerContainer,
          {
            paddingHorizontal: platformTokens.spacing.inset,
            paddingTop: platformTokens.spacing.section,
            paddingBottom: 8,
          },
        ]}
      >
        <Text
          style={[
            styles.iosTitle,
            {
              color: theme.textSecondary,
              fontSize: 13,
              fontWeight: '400',
              textTransform: 'uppercase',
            },
          ]}
        >
          {title}
        </Text>
        {subtitle && (
          <Text
            style={[
              styles.subtitle,
              {
                color: theme.textSecondary,
                fontSize: 13,
                marginTop: 4,
              },
            ]}
          >
            {subtitle}
          </Text>
        )}
      </View>
    );
  }

  // Android / TV: Larger, prominent
  return (
    <View
      style={[
        styles.headerContainer,
        {
          paddingHorizontal: platformTokens.spacing.inset,
          paddingTop: platformTokens.spacing.section,
          paddingBottom: 12,
        },
      ]}
    >
      <Text
        style={[
          styles.androidTitle,
          {
            color: isTV ? theme.text : theme.primary,
            fontSize: platformTokens.typography.sectionHeader.fontSize,
            fontWeight: platformTokens.typography.sectionHeader.fontWeight,
          },
        ]}
      >
        {title}
      </Text>
      {subtitle && (
        <Text
          style={[
            styles.subtitle,
            {
              color: theme.textSecondary,
              fontSize: platformTokens.typography.body.fontSize,
              marginTop: 4,
            },
          ]}
        >
          {subtitle}
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  headerContainer: {
    // Container styles
  },
  iosTitle: {
    letterSpacing: 0.5,
  },
  androidTitle: {
    letterSpacing: 0,
  },
  subtitle: {
    lineHeight: 20,
  },
});
```

**Testing:**
- iOS: Verify inset grouped appearance matches Settings app
- Android: Confirm Material Design elevation and spacing
- TV: Test visibility from 10 feet, verify focus indicators
- Cross-platform: All components render without errors

**Deliverables:**
- `PlatformSettingsSection.tsx` - Section container component
- `PlatformSettingsRow.tsx` - Settings row with label + control
- `PlatformSectionHeader.tsx` - Platform-native headers

**Acceptance Criteria:**
- ✅ iOS components match HIG grouped list style
- ✅ Android components use Material Design 3 patterns
- ✅ TV components optimized for 10-foot viewing
- ✅ All components support theme integration
- ✅ Components work with TV focus manager

---

### Task 1.4: Extend Platform Input Components for TV
**Priority:** High  
**Estimated Time:** 3 hours  
**Files:**
- `boatingInstrumentsApp/src/components/dialogs/inputs/PlatformTextInput.tsx` (update)
- `boatingInstrumentsApp/src/components/dialogs/inputs/PlatformToggle.tsx` (update)
- `boatingInstrumentsApp/src/components/dialogs/inputs/PlatformButton.tsx` (update)
- `boatingInstrumentsApp/src/components/dialogs/inputs/PlatformPicker.tsx` (update)

**Objective:** Add TV variants to existing Platform input components with 60pt touch targets, simplified focus indicators, and optimized performance.

**Implementation Pattern (apply to all input components):**

```typescript
// Example: PlatformToggle.tsx additions

import { isTV, getPlatformTokens } from '../../../utils/platformDetection';

export const PlatformToggle: React.FC<PlatformToggleProps> = ({
  value,
  onValueChange,
  label,
  disabled,
  tvFocusStyle, // NEW: TV focus style from parent
}) => {
  const theme = useTheme();
  const platformTokens = getPlatformTokens();
  const isTVPlatform = isTV();

  // TV: Larger touch target and simplified styling
  const toggleSize = isTVPlatform ? 60 : platformTokens.touchTarget;
  const thumbSize = isTVPlatform ? 28 : 24;

  return (
    <View style={[styles.container, isTVPlatform && tvFocusStyle]}>
      {label && (
        <Text style={[styles.label, { fontSize: platformTokens.typography.label.fontSize }]}>
          {label}
        </Text>
      )}
      
      <Switch
        value={value}
        onValueChange={onValueChange}
        disabled={disabled}
        trackColor={{
          false: theme.border,
          true: theme.interactive,
        }}
        thumbColor={theme.surface}
        ios_backgroundColor={theme.border}
        // TV: Larger for remote selection
        style={isTVPlatform && { transform: [{ scale: 1.2 }] }}
      />
    </View>
  );
};
```

**Key Changes for Each Component:**

1. **PlatformTextInput:**
   - TV: Larger font size (20pt), 60pt height
   - TV: Simplified border focus indicator (no shadow)
   - Add `tvFocusStyle` prop for external focus management

2. **PlatformToggle:**
   - TV: 1.2x scale for visibility
   - TV: Support `tvFocusStyle` prop
   - Maintain native Switch behavior across platforms

3. **PlatformButton:**
   - TV: 60pt minimum height
   - TV: Prominent focus border (4pt)
   - TV: Reduce animation complexity (no shadow changes)

4. **PlatformPicker:**
   - iOS: Use `@react-native-segmented-control` for small option sets
   - Android: Material dropdown
   - TV: Simplified 5-option maximum, large tap targets

**Install Required Dependencies:**
```bash
npm install @react-native-segmented-control/segmented-control
npm install react-native-gesture-handler
```

**Testing:**
- Verify all inputs work with TV focus manager
- Test touch target sizes meet 60pt requirement on TV
- Confirm animations run smoothly on Fire TV Stick
- Validate iOS segmented control integration

**Deliverables:**
- Updated Platform input components with TV support
- Installed npm dependencies
- TV focus integration in all inputs

**Acceptance Criteria:**
- ✅ All inputs have 60pt touch targets on TV
- ✅ TV focus styles apply correctly
- ✅ Performance meets 60fps on low-end TV devices
- ✅ iOS segmented control works for option sets
- ✅ Zero breaking changes to existing mobile usage

---

## Phase 2: Dialog Migrations (Priority Order)

### Task 2.1: Migrate LayoutSettingsDialog (Phase 1 - Priority 1)
**Priority:** High  
**Estimated Time:** 2 hours  
**Complexity:** 🟢 LOW  
**File:** `boatingInstrumentsApp/src/components/dialogs/LayoutSettingsDialog.tsx`

**Objective:** Migrate simplest dialog to validate migration pattern and platform components.

**Current State:**
- Custom Modal implementation
- 2 sections: Layout Mode info, Widget Lifecycle settings
- Uses native Switch (not PlatformToggle)
- Custom timeout selector buttons (not PlatformPicker)

**Migration Steps:**

1. **Replace Modal with BaseSettingsModal:**
   ```typescript
   // Before
   <Modal visible={visible} transparent animationType="fade">
     <TouchableOpacity style={overlay} onPress={onClose}>
       {/* Custom modal structure */}
     </TouchableOpacity>
   </Modal>

   // After
   <BaseSettingsModal
     visible={visible}
     title="Widgets & Layout"
     onClose={onClose}
     showFooter={true}
     onSave={handleSave} // Auto-save on change, this just closes
   >
     {/* Platform-native content */}
   </BaseSettingsModal>
   ```

2. **Use Platform Layout Components:**
   ```typescript
   <PlatformSectionHeader title="Layout Mode" />
   <PlatformSettingsSection>
     <PlatformSettingsRow
       label={userPositioned ? "Custom Layout" : "Auto Layout"}
       rightElement={
         userPositioned && (
           <PlatformButton
             label="Reset"
             onPress={handleResetLayout}
             variant="secondary"
           />
         )
       }
     />
   </PlatformSettingsSection>

   <PlatformSectionHeader title="Widget Lifecycle" />
   <PlatformSettingsSection>
     <PlatformSettingsRow
       label="Auto-remove stale widgets"
       rightElement={
         <PlatformToggle
           value={enableWidgetAutoRemoval}
           onValueChange={setEnableWidgetAutoRemoval}
         />
       }
     />
     
     <PlatformSettingsRow
       label="Timeout"
       rightElement={
         <PlatformPicker
           selectedValue={selectedTimeout}
           onValueChange={handleTimeoutChange}
           items={[
             { label: '1 min', value: 1 },
             { label: '2 min', value: 2 },
             { label: '5 min', value: 5 },
             { label: '10 min', value: 10 },
             { label: '30 min', value: 30 },
             { label: '1 hour', value: 60 },
           ]}
         />
       }
     />
   </PlatformSettingsSection>
   ```

3. **Add TV Focus Support:**
   ```typescript
   const { focusedIndex, getFocusStyle, isFocused } = useTVFocusManager(3, {
     autoFocus: true,
     focusOrder: 'vertical',
   });

   // Apply to interactive rows
   <PlatformSettingsRow
     label="Auto-remove stale widgets"
     rightElement={<PlatformToggle ... />}
     tvFocusStyle={isTV() && getFocusStyle(0)}
     focusIndex={0}
   />
   ```

4. **Extract Business Logic to Hook:**
   ```typescript
   // hooks/useLayoutSettings.ts
   export function useLayoutSettings() {
     const {
       resetLayoutToAutoDiscovery,
       enableWidgetAutoRemoval,
       setEnableWidgetAutoRemoval,
       widgetExpirationTimeout,
       setWidgetExpirationTimeout,
     } = useWidgetStore();

     const dashboardConfig = useWidgetStore(state => 
       state.dashboards.find(d => d.id === state.currentDashboard)
     );

     const timeoutMinutes = Math.round(widgetExpirationTimeout / 60000);
     const [selectedTimeout, setSelectedTimeout] = React.useState(timeoutMinutes);

     const handleTimeoutChange = (minutes: number) => {
       setSelectedTimeout(minutes);
       setWidgetExpirationTimeout(minutes * 60000);
     };

     const handleResetLayout = () => {
       resetLayoutToAutoDiscovery();
     };

     return {
       dashboardConfig,
       enableWidgetAutoRemoval,
       setEnableWidgetAutoRemoval,
       selectedTimeout,
       handleTimeoutChange,
       handleResetLayout,
     };
   }
   ```

**Testing:**
- iOS: Verify grouped section appearance
- Android: Confirm Material Design styling
- TV: Test focus navigation through all controls
- Functional: All settings persist correctly
- Visual: No regressions in appearance

**Deliverables:**
- Migrated LayoutSettingsDialog using new components
- Extracted business logic to reusable hook
- TV focus integration

**Acceptance Criteria:**
- ✅ Uses BaseSettingsModal
- ✅ Uses Platform layout components
- ✅ Uses Platform input components
- ✅ TV focus navigation works
- ✅ iOS looks native, Android looks Material
- ✅ All functionality preserved
- ✅ Zero breaking changes

---

### Task 2.2: Migrate DisplayThemeDialog (Phase 1 - Priority 2)
**Priority:** Medium  
**Estimated Time:** 3 hours  
**Complexity:** 🟡 MEDIUM  
**File:** `boatingInstrumentsApp/src/components/dialogs/DisplayThemeDialog.tsx`

**Objective:** Implement full theme selection functionality with platform-native pickers and sliders.

**Current State:**
- Placeholder showing "Coming Soon"
- No real implementation

**Required Implementation:**

1. **Theme Selection Section:**
   ```typescript
   <PlatformSectionHeader title="Theme" />
   <PlatformSettingsSection>
     <PlatformSettingsRow
       label="Color Scheme"
       rightElement={
         <PlatformPicker
           selectedValue={currentTheme}
           onValueChange={handleThemeChange}
           items={[
             { label: 'Day', value: 'day' },
             { label: 'Night', value: 'night' },
             { label: 'Red Night', value: 'red-night' },
             { label: 'Auto', value: 'auto' },
           ]}
         />
       }
       showDisclosure={Platform.OS === 'ios'}
     />
   </PlatformSettingsSection>
   ```

2. **Brightness Control (if applicable):**
   ```typescript
   // Create new PlatformSlider component
   <PlatformSectionHeader title="Display" />
   <PlatformSettingsSection>
     <PlatformSettingsRow
       label="Brightness"
       rightElement={
         <PlatformSlider
           value={brightness}
           onValueChange={setBrightness}
           minimumValue={0}
           maximumValue={100}
           step={5}
         />
       }
     />
   </PlatformSettingsSection>
   ```

3. **Accessibility Settings:**
   ```typescript
   <PlatformSectionHeader title="Accessibility" />
   <PlatformSettingsSection>
     <PlatformSettingsRow
       label="High Contrast"
       rightElement={
         <PlatformToggle value={highContrast} onValueChange={setHighContrast} />
       }
     />
     <PlatformSettingsRow
       label="Reduce Animations"
       rightElement={
         <PlatformToggle value={reducedMotion} onValueChange={setReducedMotion} />
       }
     />
     <PlatformSettingsRow
       label="Large Text"
       rightElement={
         <PlatformToggle value={largeText} onValueChange={setLargeText} />
       }
     />
     <PlatformSettingsRow
       label="Glove Mode"
       rightElement={
         <PlatformToggle value={gloveMode} onValueChange={setGloveMode} />
       }
     />
     <PlatformSettingsRow
       label="Haptic Feedback"
       rightElement={
         <PlatformToggle value={hapticFeedback} onValueChange={setHapticFeedback} />
       }
     />
   </PlatformSettingsSection>
   ```

4. **Create PlatformSlider Component:**
   ```typescript
   // components/dialogs/inputs/PlatformSlider.tsx
   import { Slider } from '@react-native-community/slider';
   
   export const PlatformSlider: React.FC<PlatformSliderProps> = ({
     value,
     onValueChange,
     minimumValue,
     maximumValue,
     step,
   }) => {
     const theme = useTheme();
     const platformTokens = getPlatformTokens();
     const isTVPlatform = isTV();

     return (
       <Slider
         value={value}
         onValueChange={onValueChange}
         minimumValue={minimumValue}
         maximumValue={maximumValue}
         step={step}
         minimumTrackTintColor={theme.interactive}
         maximumTrackTintColor={theme.border}
         thumbTintColor={theme.interactive}
         style={{
           width: isTVPlatform ? 300 : 200,
           height: platformTokens.touchTarget,
         }}
       />
     );
   };
   ```

5. **Create Accessibility Store Slice:**
   ```typescript
   // store/settingsStore.ts additions
   interface AccessibilitySettings {
     highContrast: boolean;
     reducedMotion: boolean;
     largeText: boolean;
     gloveMode: boolean;
     hapticFeedback: boolean;
   }

   // Add to store state
   accessibilitySettings: AccessibilitySettings;
   setAccessibilitySettings: (settings: Partial<AccessibilitySettings>) => void;
   ```

**Testing:**
- iOS: Test theme picker with ActionSheet
- Android: Test theme picker with dropdown
- TV: Verify slider works with remote
- Functional: All accessibility settings persist
- Integration: Glove mode actually increases touch targets

**Deliverables:**
- Fully implemented DisplayThemeDialog
- New PlatformSlider component
- Accessibility settings store slice
- TV focus integration

**Acceptance Criteria:**
- ✅ Theme selection works on all platforms
- ✅ Accessibility toggles persist and apply
- ✅ Glove mode integration functional
- ✅ TV focus navigation smooth
- ✅ Platform-native appearance maintained

---

(Continue with remaining dialog migrations following same pattern...)

---

## Phase 3: Testing & Validation

### Task 3.1: Cross-Platform Visual Regression Testing
**Priority:** Critical  
**Estimated Time:** 4 hours

**Test Matrix:**

| Platform | Device | Test Scenarios |
|----------|--------|----------------|
| iOS | iPad Pro 12.9" | All 7 dialogs, all themes |
| iOS | iPhone 15 Pro | All 7 dialogs, portrait/landscape |
| tvOS | Apple TV 4K | All 7 dialogs, focus navigation |
| Android | Galaxy Tab S9 | All 7 dialogs, Material Design |
| Android TV | Fire TV Stick | All 7 dialogs, performance profiling |

**Test Procedure:**
1. Open each dialog
2. Verify platform-native appearance
3. Test all interactive controls
4. Navigate with keyboard/remote (TV)
5. Profile frame rate (target: 60fps)
6. Screenshot comparison with design specs

**Acceptance Criteria:**
- ✅ All dialogs match platform design guidelines
- ✅ No visual regressions from previous version
- ✅ 60fps animation on Fire TV Stick
- ✅ Focus indicators visible from 10 feet

---

### Task 3.2: Accessibility Audit
**Priority:** High  
**Estimated Time:** 2 hours

**Audit Checklist:**
- [ ] Screen reader navigation (iOS VoiceOver, Android TalkBack)
- [ ] Keyboard-only navigation (Web/TV)
- [ ] High contrast mode support
- [ ] Reduced motion respect
- [ ] Touch target sizes (44pt phone, 60pt TV)
- [ ] Color contrast ratios (WCAG AA minimum)
- [ ] Focus indicators always visible

**Tools:**
- iOS Accessibility Inspector
- Android Accessibility Scanner
- Web: axe DevTools
- Manual testing with screen readers

**Acceptance Criteria:**
- ✅ All dialogs navigable with screen reader
- ✅ Keyboard navigation works without mouse
- ✅ WCAG AA compliance achieved
- ✅ All interactive elements have 44pt+ touch targets

---

## Implementation Timeline

| Week | Tasks | Deliverables |
|------|-------|--------------|
| Week 1 | Phase 0 (Foundation) | Enhanced platform detection, extended tokens, component audit |
| Week 2 | Phase 1 Tasks 1.1-1.2 | BaseSettingsModal refactor, TV focus system |
| Week 3 | Phase 1 Tasks 1.3-1.4 | Platform layout components, input extensions |
| Week 4 | Phase 2 Tasks 2.1-2.2 | Layout + DisplayTheme migrations |
| Week 5 | Phase 2 remaining | AlarmHistory, FactoryReset, UnitsConfig migrations |
| Week 6 | Phase 2 AlarmConfig | Complex multi-view dialog migration |
| Week 7 | Phase 3 Testing | Cross-platform validation, accessibility audit |
| Week 8 | Polish & Documentation | Final refinements, user docs, release |

**Total Estimated Time:** 6-8 weeks (1 developer)

---

## Success Metrics

### Quantitative Metrics
- ✅ 100% of dialogs migrated to platform-native designs
- ✅ 60fps animations on Fire TV Stick (measured with React DevTools Profiler)
- ✅ 0 breaking changes to existing dialog APIs
- ✅ <200ms dialog open time on all platforms
- ✅ 70%+ code reuse through shared components

### Qualitative Metrics
- ✅ iOS users report dialogs "feel like Settings app"
- ✅ Android users report Material Design consistency
- ✅ TV users can navigate entirely with remote
- ✅ Accessibility audit passes with 0 critical issues
- ✅ Design team approves all platform variants

---

## Risk Mitigation

### Risk: TV Performance Issues on Low-End Devices
**Mitigation:**
- Baseline all development on Fire TV Stick
- Use `useNativeDriver: true` for all animations
- Avoid shadows/blurs on TV
- Reduce animation durations by 50%
- Profile every change with React DevTools

### Risk: Platform-Specific Bugs
**Mitigation:**
- Test on physical devices, not just simulators
- Maintain platform-specific test suites
- Use Platform.select() for conditional code
- Document known platform limitations

### Risk: Breaking Existing Functionality
**Mitigation:**
- Zero changes to public component APIs
- Comprehensive regression test suite
- Gradual rollout (feature flag per dialog)
- Maintain old dialog implementations until validated

---

## Rollout Strategy

### Phase 1: Canary Release (Week 7)
- Enable new dialogs for internal testers
- Monitor crash reports and user feedback
- Performance profiling on all platforms

### Phase 2: Beta Release (Week 8)
- Enable for 10% of users via feature flag
- A/B test with old implementation
- Gather user satisfaction metrics

### Phase 3: Full Release (Week 9)
- Gradual rollout to 100% of users
- Monitor performance metrics
- Remove old dialog implementations

---

**Document Version:** 2.0  
**Implementation Plan Created:** December 4, 2025  
**Status:** Ready for Implementation  
**Next Steps:** Begin Phase 0 - Task 0.1 (Expo/RN Capability Audit)
