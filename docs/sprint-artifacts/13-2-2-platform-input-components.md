# Story 13.2.2: Implement Platform Input Components

Status: review

## Story

As a **boat owner configuring settings across different platforms**,
I want **input components that feel native to each platform while maintaining consistent behavior**,
so that **I can configure settings efficiently whether using touch, keyboard, or gloves**.

## Acceptance Criteria

1. **PlatformTextInput Component** - Cross-platform text input with adaptive sizing
   - Component renders with correct touch target height (44pt phone, 56pt tablet)
   - Input field accepts keyboard input on desktop platforms
   - Input field shows native keyboard on mobile platforms
   - Focus indicator appears on Tab navigation (2px blue border)
   - Input validation displays error messages below field
   - Placeholder text visible when field is empty

2. **PlatformToggle Component** - Native switch/toggle rendering
   - iOS renders native Switch component with platform styling
   - Android renders Material Design toggle switch
   - Web renders custom styled toggle with hover states
   - Toggle state changes on tap/click with immediate visual feedback
   - Disabled state renders with reduced opacity (0.5)
   - Toggle includes accessible label text

3. **PlatformPicker Component** - Platform-appropriate selection UI
   - Mobile (iOS/Android) displays native picker sheet on tap
   - Desktop/Web displays dropdown menu below input
   - Keyboard navigation (↑↓) selects options on desktop
   - Selected value displays in picker button/input
   - Picker closes after selection on all platforms
   - Supports multi-column pickers for complex selections

4. **PlatformButton Component** - Consistent button styling with platform feel
   - Button renders with correct touch target size (44pt phone, 56pt tablet)
   - Primary/secondary/danger variants use theme colors
   - Press state shows opacity change (0.7) with 100ms feedback
   - Disabled state prevents interaction and shows reduced opacity
   - Button text follows platform typography standards
   - Haptic feedback on press (mobile only)

5. **Keyboard Navigation Integration** - Desktop accessibility
   - All input components respond to Tab key navigation
   - Focus indicators visible on all focused components
   - Enter key submits form from any focused input
   - Escape key clears focus or cancels input
   - Arrow keys navigate picker options

## Tasks / Subtasks

- [x] **Task 1: Create PlatformTextInput Component** (AC: 1, 5)
  - [x] Subtask 1.1: Create `src/components/dialogs/inputs/PlatformTextInput.tsx`
  - [x] Subtask 1.2: Implement touch target sizing (44pt phone, 56pt tablet)
  - [x] Subtask 1.3: Add keyboard input handling for desktop
  - [x] Subtask 1.4: Implement focus indicator styling (2px border)
  - [x] Subtask 1.5: Add input validation and error display
  - [x] Subtask 1.6: Create TypeScript interface `PlatformTextInputProps`

- [x] **Task 2: Create PlatformToggle Component** (AC: 2, 5)
  - [x] Subtask 2.1: Create `src/components/dialogs/inputs/PlatformToggle.tsx`
  - [x] Subtask 2.2: Implement iOS native Switch component
  - [x] Subtask 2.3: Implement Android Material Design toggle
  - [x] Subtask 2.4: Implement Web custom styled toggle
  - [x] Subtask 2.5: Add disabled state styling (opacity 0.5)
  - [x] Subtask 2.6: Create TypeScript interface `PlatformToggleProps`

- [x] **Task 3: Create PlatformPicker Component** (AC: 3, 5)
  - [x] Subtask 3.1: Create `src/components/dialogs/inputs/PlatformPicker.tsx`
  - [x] Subtask 3.2: Implement mobile native picker sheet (iOS/Android)
  - [x] Subtask 3.3: Implement desktop dropdown menu
  - [x] Subtask 3.4: Add keyboard navigation (↑↓ arrow keys)
  - [x] Subtask 3.5: Support multi-column pickers for complex data
  - [x] Subtask 3.6: Create TypeScript interface `PlatformPickerProps`

- [x] **Task 4: Create PlatformButton Component** (AC: 4, 5)
  - [x] Subtask 4.1: Create `src/components/dialogs/inputs/PlatformButton.tsx`
  - [x] Subtask 4.2: Implement touch target sizing (44pt phone, 56pt tablet)
  - [x] Subtask 4.3: Create variants (primary, secondary, danger)
  - [x] Subtask 4.4: Add press state animation (opacity 0.7)
  - [x] Subtask 4.5: Add haptic feedback on press (mobile)
  - [x] Subtask 4.6: Create TypeScript interface `PlatformButtonProps`

- [x] **Task 5: Create Shared Input Hooks** (AC: 1, 2, 3, 4, 5)
  - [x] Subtask 5.1: Create `src/hooks/useInputFocus.ts` for focus management
  - [x] Subtask 5.2: Create `src/hooks/useTouchTargetSize.ts` for sizing
  - [x] Subtask 5.3: Create `src/hooks/useInputValidation.ts` for validation
  - [x] Subtask 5.4: Create `src/hooks/useHapticFeedback.ts` for tactile feedback
  - [x] Subtask 5.5: Export all hooks from `src/hooks/index.ts`

- [x] **Task 6: Create Input Utilities** (AC: 1, 3)
  - [x] Subtask 6.1: Create `src/utils/inputValidation.ts` with validators
  - [x] Subtask 6.2: Add email, IP address, port number validators
  - [x] Subtask 6.3: Add number range validators (min/max)
  - [x] Subtask 6.4: Add custom regex validator support
  - [x] Subtask 6.5: Export validation result types

- [ ] **Task 7: Testing and Integration** (AC: All)
  - [ ] Subtask 7.1: Test PlatformTextInput on iOS, Android, Web
  - [ ] Subtask 7.2: Test PlatformToggle native rendering on all platforms
  - [ ] Subtask 7.3: Test PlatformPicker sheet/dropdown behavior
  - [ ] Subtask 7.4: Test PlatformButton variants and states
  - [ ] Subtask 7.5: Validate keyboard navigation on desktop browser
  - [ ] Subtask 7.6: Test components within BaseSettingsModal
  - [ ] Subtask 7.7: Validate touch target sizes with physical devices

## Dev Notes

### Architecture Context

**Component Library Pattern:**
```
src/components/dialogs/inputs/
├── PlatformTextInput.tsx    # Text entry with validation
├── PlatformToggle.tsx        # Boolean on/off switch
├── PlatformPicker.tsx        # Single/multi-value selection
└── PlatformButton.tsx        # Action buttons with variants
```

**Hook Ecosystem:**
```
src/hooks/
├── useInputFocus.ts          # Focus state and Tab navigation
├── useTouchTargetSize.ts     # Platform-aware sizing
├── useInputValidation.ts     # Real-time validation
└── useHapticFeedback.ts      # Tactile feedback on mobile
```

**Design Philosophy:**
- **Platform Native First:** Use native components where possible (iOS Switch, Android Material)
- **Consistent Behavior:** Same props interface across platforms
- **Accessibility Built-In:** ARIA labels, keyboard navigation, focus indicators
- **Reusable Composition:** Components compose well together in forms

### Component Interfaces

**PlatformTextInput Props:**
```typescript
interface PlatformTextInputProps {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  label?: string;
  error?: string;
  keyboardType?: 'default' | 'numeric' | 'email-address' | 'phone-pad';
  autoFocus?: boolean;
  disabled?: boolean;
  maxLength?: number;
  validator?: (value: string) => string | undefined; // Returns error message
  onSubmit?: () => void; // Enter key handler
  testID?: string;
}
```

**PlatformToggle Props:**
```typescript
interface PlatformToggleProps {
  value: boolean;
  onValueChange: (value: boolean) => void;
  label: string;
  disabled?: boolean;
  color?: string; // Active color (defaults to theme.primary)
  testID?: string;
}
```

**PlatformPicker Props:**
```typescript
interface PlatformPickerItem {
  label: string;
  value: string | number;
  icon?: string; // Optional icon name
}

interface PlatformPickerProps {
  value: string | number;
  onValueChange: (value: string | number) => void;
  items: PlatformPickerItem[];
  label?: string;
  placeholder?: string;
  disabled?: boolean;
  multiColumn?: boolean; // For complex pickers (e.g., time picker)
  testID?: string;
}
```

**PlatformButton Props:**
```typescript
interface PlatformButtonProps {
  onPress: () => void;
  title: string;
  variant?: 'primary' | 'secondary' | 'danger';
  disabled?: boolean;
  fullWidth?: boolean;
  loading?: boolean; // Shows spinner
  icon?: string; // Optional icon name
  testID?: string;
}
```

### Platform-Specific Implementations

**PlatformTextInput Platform Detection:**
```typescript
// Desktop platforms get focus indicators and keyboard shortcuts
const isDesktop = hasKeyboard();

// Mobile gets native keyboard types
const keyboardProps = Platform.select({
  ios: { returnKeyType: 'done' },
  android: { returnKeyType: 'done' },
  default: {}
});

return (
  <View style={styles.container}>
    {label && <Text style={styles.label}>{label}</Text>}
    <TextInput
      style={[
        styles.input,
        { height: getTouchTargetSize() },
        focused && isDesktop && styles.focused,
        error && styles.error
      ]}
      value={value}
      onChangeText={handleChange}
      placeholder={placeholder}
      editable={!disabled}
      {...keyboardProps}
    />
    {error && <Text style={styles.errorText}>{error}</Text>}
  </View>
);
```

**PlatformToggle Platform Selection:**
```typescript
if (Platform.OS === 'ios' || Platform.OS === 'android') {
  // Use native Switch component
  return (
    <View style={styles.row}>
      <Text style={styles.label}>{label}</Text>
      <Switch
        value={value}
        onValueChange={onValueChange}
        disabled={disabled}
        trackColor={{ false: theme.gray300, true: color || theme.primary }}
        thumbColor={Platform.OS === 'ios' ? undefined : theme.white}
      />
    </View>
  );
}

// Web platform uses custom styled toggle
return <CustomWebToggle {...props} />;
```

**PlatformPicker Platform Selection:**
```typescript
if (Platform.OS === 'ios') {
  // iOS Picker wheel in modal sheet
  return (
    <>
      <TouchableOpacity onPress={() => setShowPicker(true)}>
        <Text>{getSelectedLabel()}</Text>
      </TouchableOpacity>
      <Modal visible={showPicker} animationType="slide">
        <Picker selectedValue={value} onValueChange={onValueChange}>
          {items.map(item => (
            <Picker.Item label={item.label} value={item.value} key={item.value} />
          ))}
        </Picker>
      </Modal>
    </>
  );
}

if (Platform.OS === 'android') {
  // Android native picker dropdown
  return (
    <Picker selectedValue={value} onValueChange={onValueChange}>
      {items.map(item => (
        <Picker.Item label={item.label} value={item.value} key={item.value} />
      ))}
    </Picker>
  );
}

// Web dropdown menu
return <WebDropdown {...props} />;
```

### Input Validation Utilities

**Validation Functions:**
```typescript
// src/utils/inputValidation.ts
export const validators = {
  required: (value: string) => {
    return value.trim() ? undefined : 'This field is required';
  },
  
  email: (value: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(value) ? undefined : 'Invalid email address';
  },
  
  ipAddress: (value: string) => {
    const ipRegex = /^(\d{1,3}\.){3}\d{1,3}$/;
    if (!ipRegex.test(value)) return 'Invalid IP address format';
    
    const octets = value.split('.').map(Number);
    const valid = octets.every(octet => octet >= 0 && octet <= 255);
    return valid ? undefined : 'IP address octets must be 0-255';
  },
  
  portNumber: (value: string) => {
    const port = Number(value);
    if (isNaN(port)) return 'Port must be a number';
    if (port < 1 || port > 65535) return 'Port must be between 1 and 65535';
    return undefined;
  },
  
  numberRange: (min: number, max: number) => (value: string) => {
    const num = Number(value);
    if (isNaN(num)) return 'Must be a number';
    if (num < min || num > max) return `Must be between ${min} and ${max}`;
    return undefined;
  }
};
```

**Validation Hook:**
```typescript
// src/hooks/useInputValidation.ts
export const useInputValidation = (
  value: string,
  validator?: (value: string) => string | undefined
) => {
  const [error, setError] = useState<string | undefined>();
  const [touched, setTouched] = useState(false);
  
  useEffect(() => {
    if (!touched || !validator) return;
    const errorMessage = validator(value);
    setError(errorMessage);
  }, [value, validator, touched]);
  
  const validate = () => {
    setTouched(true);
    if (!validator) return true;
    const errorMessage = validator(value);
    setError(errorMessage);
    return !errorMessage;
  };
  
  return { error, touched, validate, setTouched };
};
```

### Touch Target Size Hook

**Dynamic Sizing Based on Platform:**
```typescript
// src/hooks/useTouchTargetSize.ts
import { useMemo } from 'react';
import { isTablet, hasKeyboard } from '@/platform/detection';
import { SETTINGS_TOKENS } from '@/theme/settingsTokens';

export const useTouchTargetSize = () => {
  const size = useMemo(() => {
    if (hasKeyboard()) {
      return SETTINGS_TOKENS.touchTargets.desktop; // 40pt
    }
    if (isTablet()) {
      return SETTINGS_TOKENS.touchTargets.tablet; // 56pt
    }
    return SETTINGS_TOKENS.touchTargets.phone; // 44pt
  }, []);
  
  return size;
};

// Usage in components
const touchTargetSize = useTouchTargetSize();
const inputStyle = { height: touchTargetSize, minHeight: touchTargetSize };
```

### Focus Management Hook

**Keyboard Navigation Support:**
```typescript
// src/hooks/useInputFocus.ts
import { useRef, useCallback } from 'react';
import { TextInput } from 'react-native';
import { hasKeyboard } from '@/platform/detection';

export const useInputFocus = () => {
  const inputRef = useRef<TextInput>(null);
  const keyboardEnabled = hasKeyboard();
  
  const focus = useCallback(() => {
    inputRef.current?.focus();
  }, []);
  
  const blur = useCallback(() => {
    inputRef.current?.blur();
  }, []);
  
  return {
    inputRef,
    focus,
    blur,
    keyboardEnabled
  };
};
```

### Haptic Feedback Hook

**Mobile Tactile Feedback:**
```typescript
// src/hooks/useHapticFeedback.ts
import { Platform } from 'react-native';
import * as Haptics from 'expo-haptics';

export const useHapticFeedback = () => {
  const triggerLight = async () => {
    if (Platform.OS === 'ios' || Platform.OS === 'android') {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };
  
  const triggerMedium = async () => {
    if (Platform.OS === 'ios' || Platform.OS === 'android') {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
  };
  
  const triggerSuccess = async () => {
    if (Platform.OS === 'ios' || Platform.OS === 'android') {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
  };
  
  const triggerError = async () => {
    if (Platform.OS === 'ios' || Platform.OS === 'android') {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
  };
  
  return {
    triggerLight,
    triggerMedium,
    triggerSuccess,
    triggerError
  };
};
```

### Integration with BaseSettingsModal

**Example Usage in Connection Settings:**
```typescript
// Future Story 13.2.3 will use these components
import { BaseSettingsModal } from '@/components/dialogs/base/BaseSettingsModal';
import { PlatformTextInput } from '@/components/dialogs/inputs/PlatformTextInput';
import { PlatformButton } from '@/components/dialogs/inputs/PlatformButton';
import { validators } from '@/utils/inputValidation';

const ConnectionSettingsModal = () => {
  const [ipAddress, setIpAddress] = useState('192.168.1.1');
  const [port, setPort] = useState('10110');
  
  return (
    <BaseSettingsModal
      title="Connection Settings"
      onSave={handleSave}
      onCancel={handleCancel}
    >
      <PlatformTextInput
        label="IP Address"
        value={ipAddress}
        onChangeText={setIpAddress}
        placeholder="192.168.1.1"
        keyboardType="numeric"
        validator={validators.ipAddress}
      />
      
      <PlatformTextInput
        label="Port"
        value={port}
        onChangeText={setPort}
        placeholder="10110"
        keyboardType="numeric"
        validator={validators.portNumber}
      />
    </BaseSettingsModal>
  );
};
```

### Project Structure Notes

**New Files:**
```
src/
├── components/
│   └── dialogs/
│       └── inputs/
│           ├── PlatformTextInput.tsx      # NEW: Text input component
│           ├── PlatformToggle.tsx         # NEW: Toggle/switch component
│           ├── PlatformPicker.tsx         # NEW: Picker/dropdown component
│           └── PlatformButton.tsx         # NEW: Button component
├── hooks/
│   ├── useInputFocus.ts                   # NEW: Focus management
│   ├── useTouchTargetSize.ts              # NEW: Dynamic sizing
│   ├── useInputValidation.ts              # NEW: Validation logic
│   └── useHapticFeedback.ts               # NEW: Tactile feedback
└── utils/
    └── inputValidation.ts                 # NEW: Validation functions
```

**Files to Reference from Story 13.2.1:**
- `src/platform/detection.ts` - Platform utilities (hasKeyboard, isTablet)
- `src/theme/settingsTokens.ts` - Touch target sizes and spacing
- `src/components/dialogs/base/BaseSettingsModal.tsx` - Modal container
- `src/hooks/useTheme.ts` - Theme color access

**No Breaking Changes:**
- All new components, no existing functionality modified
- Future stories (13.2.3, 13.2.4) will consume these components
- Legacy dialogs continue to function unchanged

### Learnings from Previous Story

**From Story 13.2.1 (Status: done - APPROVED for production):**

**Key Patterns to Reuse:**
- ✅ **Design Tokens First:** settingsTokens.ts provides all sizing values - extend for input-specific tokens
- ✅ **Platform Detection:** hasKeyboard() and isTablet() work perfectly - use for input behavior
- ✅ **TypeScript Interfaces:** Strong prop interfaces prevent errors - define comprehensive interfaces for each component
- ✅ **Testing Strategy:** Manual platform testing + visual validation - same approach for input components

**Files Created by Story 13.2.1 (REUSE):**
- `src/platform/detection.ts` - Platform utilities already implemented ✅
- `src/theme/settingsTokens.ts` - Touch target sizes already defined ✅
- `src/components/dialogs/base/BaseSettingsModal.tsx` - Modal container ready ✅

**Story 13.2.1 Implementation Quality:**
- All 5 ACs fully met with file:line evidence
- 28/28 platform detection tests passing
- Comprehensive keyboard navigation (Tab, Enter, Esc)
- Production-approved despite test environment limitations

**Architectural Learnings:**
- **Focus Management:** BaseSettingsModal implements focus trap - inputs need to integrate with it
- **Animation Timing:** 300ms open, 200ms close works well - use for input transitions
- **Touch Targets:** 44pt phone → 56pt tablet → 64pt glove mode (future) - inputs must follow
- **Keyboard Shortcuts:** Cmd+S save, Esc cancel - inputs should support Enter submit

**Known Issues to Avoid:**
- ⚠️ **setTimeout in useEffect:** Causes React act() warnings in tests - avoid or mock timers
- ✅ **Theme Integration:** useTheme() hook provides reactive colors - use for all styling
- ✅ **Platform.select():** Use sparingly - design tokens + conditional logic preferred

[Source: docs/sprint-artifacts/13-2-1-base-settings-modal-foundation.md]

**Story 13.2.2 Strategy:**
Build on Story 13.2.1's foundation by creating input components that integrate seamlessly with BaseSettingsModal. Use established platform detection, design tokens, and keyboard navigation patterns. Focus on native platform feel while maintaining consistent behavior across all platforms.

### References

**Source Documentation:**
- [Epic 13: VIP Platform UX Implementation - docs/sprint-artifacts/epic-13-vip-platform-ux-implementation.md#Story-13.2.2]
- [Story 13.2.1: Base Settings Modal Foundation - docs/sprint-artifacts/13-2-1-base-settings-modal-foundation.md]
- [UI Architecture: Component System - docs/ui-architecture.md#Component-System]
- [iOS Human Interface Guidelines: Controls](https://developer.apple.com/design/human-interface-guidelines/controls)
- [Material Design: Text Fields](https://m3.material.io/components/text-fields/overview)

**Component References:**
- [BaseSettingsModal: src/components/dialogs/base/BaseSettingsModal.tsx]
- [Platform Detection: src/platform/detection.ts]
- [Settings Tokens: src/theme/settingsTokens.ts]
- [Theme Hook: src/hooks/useTheme.ts]

**Design Standards:**
- [iOS HIG: Text Input](https://developer.apple.com/design/human-interface-guidelines/text-fields)
- [Material Design: Selection Controls](https://m3.material.io/components/selection-controls)
- [Web Accessibility: Form Inputs (WCAG 2.1)](https://www.w3.org/WAI/WCAG21/Understanding/input-purposes.html)

## Dev Agent Record

### Context Reference

- `docs/sprint-artifacts/13-2-2-platform-input-components.context.xml` - Story context XML (generated 2025-11-24)

### Agent Model Used

<!-- Agent model version will be recorded during implementation -->

### Debug Log References

<!-- Debug log file paths will be added during implementation -->

### Completion Notes List

**Implementation Summary (2025-11-24):**

✅ **Task 5 & 6: Foundation Layer Complete**
- Created 4 custom hooks (useInputFocus, useTouchTargetSize, useInputValidation, useHapticFeedback)
- Implemented comprehensive validators library (inputValidation.ts) with 10+ validators
- All hooks integrate with existing platform detection from Story 13.2.1

✅ **Task 1-4: Component Layer Complete**
- PlatformTextInput: Cross-platform text input with validation, focus indicators, adaptive sizing
- PlatformToggle: Native Switch (iOS/Android), custom Web toggle with hover, haptic feedback
- PlatformPicker: Native picker sheets (iOS/Android), Web dropdown with keyboard nav (↑↓)
- PlatformButton: Variants (primary/secondary/danger), haptic feedback, loading states

**Technical Decisions:**
- useHapticFeedback: Conditional require() for expo-haptics to support web platform
- Theme colors: Used theme.appBackground instead of non-existent backgroundMedium
- TypeScript: Proper null handling for inputRef (RefObject<TextInput | null>)
- Keyboard nav: Arrow keys in Web picker, Tab/Enter/Esc in TextInput
- Touch targets: Leveraged settingsTokens from Story 13.2.1 (44pt/56pt/64pt)

**Integration Points:**
- All components use useTheme() from themeStore for day/night/red-night support
- Touch target sizing via useTouchTargetSize() respects glove mode from settings
- Platform detection from Story 13.2.1 (hasKeyboard, isTablet, isGloveMode)
- Haptic feedback gracefully degrades on web platform (no-op)

**Remaining Work:**
- Task 7: Manual testing on iOS, Android, Web platforms (per Story 13.2.1 testing pattern)
- Integration testing with BaseSettingsModal from Story 13.2.1
- Physical device validation of touch target sizes

**Zero Breaking Changes:**
- All new files, no modifications to existing functionality
- Future stories (13.2.3, 13.2.4) will consume these components
- Legacy dialogs unaffected

### File List

**Components:**
- `boatingInstrumentsApp/src/components/dialogs/inputs/PlatformTextInput.tsx` (NEW)
- `boatingInstrumentsApp/src/components/dialogs/inputs/PlatformToggle.tsx` (NEW)
- `boatingInstrumentsApp/src/components/dialogs/inputs/PlatformPicker.tsx` (NEW)
- `boatingInstrumentsApp/src/components/dialogs/inputs/PlatformButton.tsx` (NEW)
- `boatingInstrumentsApp/src/components/dialogs/inputs/index.ts` (NEW)

**Hooks:**
- `boatingInstrumentsApp/src/hooks/useInputFocus.ts` (NEW)
- `boatingInstrumentsApp/src/hooks/useTouchTargetSize.ts` (NEW)
- `boatingInstrumentsApp/src/hooks/useInputValidation.ts` (NEW)
- `boatingInstrumentsApp/src/hooks/useHapticFeedback.ts` (NEW)
- `boatingInstrumentsApp/src/hooks/index.ts` (MODIFIED - added exports)

**Utilities:**
- `boatingInstrumentsApp/src/utils/inputValidation.ts` (NEW)

**Total:** 10 new files, 1 modified file

---

## Change Log

- **2025-11-24**: Story drafted by SM agent (Bob) in #yolo mode based on Epic 13.2.2 requirements from epic-13-vip-platform-ux-implementation.md
- **2025-11-24**: Implementation complete - All 6 implementation tasks done (4 components, 4 hooks, 1 utility), ready for manual testing (Task 7)
