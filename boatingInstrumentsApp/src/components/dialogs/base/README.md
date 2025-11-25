# BaseSettingsModal Component

**Story:** 13.2.1 - Create Base Settings Modal Foundation  
**Status:** ✅ Implemented  
**Version:** 1.0.0

## Overview

`BaseSettingsModal` is a reusable foundation component for all settings dialogs in the BMad Autopilot application. It provides cross-platform consistency, keyboard navigation, glove-friendly touch targets, and theme integration.

## Features

### ✅ Cross-Platform Consistency
- **iOS/Android:** Native modal with proper animations
- **Web/Desktop:** Keyboard navigation support with Tab, Enter, Esc
- **Tablet:** Marine-optimized touch targets (56pt)
- **Glove Mode:** Enhanced touch targets (64pt) for marine use

### ✅ Keyboard Navigation (Desktop/Web)
- **Tab:** Navigate between inputs (native browser behavior)
- **Enter:** Submit form (calls `onSave`)
- **Escape:** Close modal (calls `onClose`)
- **Focus Trap:** Prevents focus from escaping modal

### ✅ Theme Integration
- Supports day, night, and red-night modes
- Automatically applies theme colors to all elements
- Red-night mode compliance: No green, blue, or white colors

### ✅ Touch-Optimized
- **Phone:** 44pt minimum (iOS standard)
- **Tablet/Helm:** 56pt (marine-optimized)
- **Glove Mode:** 64pt (enhanced for gloves)

## Usage

### Basic Example

```tsx
import { BaseSettingsModal } from '@/components/dialogs/base/BaseSettingsModal';

function MySettingsDialog() {
  const [visible, setVisible] = useState(false);

  const handleSave = () => {
    // Save settings
    setVisible(false);
  };

  return (
    <BaseSettingsModal
      visible={visible}
      title="Connection Settings"
      onClose={() => setVisible(false)}
      onSave={handleSave}
    >
      <Text>Your settings content here</Text>
    </BaseSettingsModal>
  );
}
```

### Non-Dismissible Modal

```tsx
<BaseSettingsModal
  visible={visible}
  title="Important Settings"
  onClose={handleClose}
  onSave={handleSave}
  dismissible={false} // Cannot close by tapping backdrop
>
  <Text>Content...</Text>
</BaseSettingsModal>
```

### Custom Button Text

```tsx
<BaseSettingsModal
  visible={visible}
  title="Preferences"
  onClose={handleClose}
  onSave={handleSave}
  saveButtonText="Apply"
  cancelButtonText="Discard"
>
  <Text>Content...</Text>
</BaseSettingsModal>
```

### Without Footer

```tsx
<BaseSettingsModal
  visible={visible}
  title="Info Dialog"
  onClose={handleClose}
  showFooter={false} // No cancel/save buttons
>
  <Text>Content...</Text>
</BaseSettingsModal>
```

## API Reference

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `visible` | `boolean` | - | Controls modal visibility (required) |
| `title` | `string` | - | Modal title displayed in header (required) |
| `onClose` | `() => void` | - | Callback when modal is closed/cancelled (required) |
| `onSave` | `() => void` | - | Optional callback when save button is pressed |
| `dismissible` | `boolean` | `true` | Whether backdrop tap should dismiss modal |
| `children` | `React.ReactNode` | - | Modal content (required) |
| `showFooter` | `boolean` | `true` | Whether to show footer with buttons |
| `saveButtonText` | `string` | `"Save"` | Custom text for save button |
| `cancelButtonText` | `string` | `"Cancel"` | Custom text for cancel button |
| `testID` | `string` | `"base-settings-modal"` | Test ID for testing |

## Architecture

### Component Structure

```
BaseSettingsModal
├── Modal (React Native)
│   ├── Pressable (Backdrop)
│   │   └── KeyboardAvoidingView
│   │       └── Pressable (Container)
│   │           └── View (Content)
│   │               ├── SettingsHeader
│   │               │   ├── Text (Title)
│   │               │   └── TouchableOpacity (Close Button)
│   │               ├── ScrollView (Content)
│   │               │   └── {children}
│   │               └── SettingsFooter
│   │                   ├── TouchableOpacity (Cancel Button)
│   │                   └── TouchableOpacity (Save Button)
```

### Design Tokens

Settings design tokens are defined in `src/theme/settingsTokens.ts`:

- **Modal Dimensions:** Responsive width/height for phone, tablet, desktop
- **Touch Targets:** 44pt (phone), 56pt (tablet), 64pt (glove)
- **Spacing Scale:** 4pt base grid (xs: 4, sm: 8, md: 12, lg: 16, xl: 24)
- **Animation Timings:** Enter 300ms, Exit 250ms
- **Typography:** Title, section header, label, body, caption
- **Shadows:** Modal and button shadows

### Platform Detection

Platform detection utilities in `src/utils/platformDetection.ts`:

- `detectPlatform()`: Returns 'ios' | 'android' | 'web' | 'desktop'
- `hasKeyboard()`: Detects keyboard availability
- `hasTouchscreen()`: Detects touch support
- `isGloveMode()`: Reads glove mode from settings store
- `isTablet()`: Detects tablet dimensions

## Keyboard Navigation

### Supported Keys (Web/Desktop)

| Key | Action |
|-----|--------|
| **Tab** | Navigate to next focusable element |
| **Shift+Tab** | Navigate to previous focusable element |
| **Enter** | Submit form (calls `onSave`) |
| **Escape** | Close modal (calls `onClose`) |

### Focus Management

- Modal content receives focus when opened
- Focus is trapped within modal (cannot Tab out)
- Previous focus is restored when modal closes

## Theme Compliance

### Day Theme
- Background: `#FFFFFF` (white)
- Surface: `#F8FAFC` (light gray)
- Text: `#0F172A` (dark slate)
- Interactive: `#0284C7` (blue)

### Night Theme
- Background: `#1E293B` (dark slate)
- Surface: `#0F172A` (darker slate)
- Text: `#F1F5F9` (light text)
- Interactive: `#38BDF8` (light blue)

### Red-Night Theme (Marine)
- Background: `#0F0000` (dark red)
- Surface: `#1A0000` (darker red)
- Text: `#FF6B6B` (red spectrum)
- Interactive: `#DC2626` (red)
- **No green, blue, or white colors** (625nm wavelength only)

## Testing

### Unit Tests

Tests are located in `__tests__/tier1-unit/`:

- `components/dialogs/base/BaseSettingsModal.test.tsx`
- `utils/platformDetection.test.ts`

### Test Coverage

- ✅ Modal rendering and layout (AC1)
- ✅ Keyboard navigation (Tab, Enter, Esc) (AC2)
- ✅ Glove-friendly touch targets (44pt, 56pt, 64pt) (AC3)
- ✅ Dismissible behavior (backdrop press) (AC4)
- ✅ Theme integration (day, night, red-night) (AC5)
- ✅ Accessibility labels and roles

### Running Tests

```bash
# Run all tests
npm test

# Run BaseSettingsModal tests only
npm test BaseSettingsModal

# Run platform detection tests
npm test platformDetection

# Run with coverage
npm test -- --coverage
```

## Migration Guide

Existing dialogs can be migrated to use BaseSettingsModal:

### Before (Custom Modal)

```tsx
function UnitsConfigDialog() {
  return (
    <Modal visible={visible} transparent>
      <View style={styles.backdrop}>
        <View style={styles.container}>
          <View style={styles.header}>
            <Text style={styles.title}>Units</Text>
            <TouchableOpacity onPress={onClose}>
              <Icon name="close" />
            </TouchableOpacity>
          </View>
          <ScrollView>{/* content */}</ScrollView>
          <View style={styles.footer}>
            <Button onPress={onClose}>Cancel</Button>
            <Button onPress={onSave}>Save</Button>
          </View>
        </View>
      </View>
    </Modal>
  );
}
```

### After (BaseSettingsModal)

```tsx
function UnitsConfigDialog() {
  return (
    <BaseSettingsModal
      visible={visible}
      title="Units"
      onClose={onClose}
      onSave={onSave}
    >
      {/* content */}
    </BaseSettingsModal>
  );
}
```

## Dependencies

- `react`: ^18.x
- `react-native`: ^0.73.x
- `zustand`: ^4.x (theme and settings stores)
- `@react-native-async-storage/async-storage`: ^1.x

## Related Stories

- **Story 13.2.2:** Implement NMEA Connection Settings Dialog
- **Story 13.2.3:** Refactor Units Config to Use BaseSettingsModal
- **Story 13.2.4:** Refactor Alarm Config to Use BaseSettingsModal

## Future Enhancements

- [ ] Add support for modal size variants (small, medium, large, full)
- [ ] Implement confirmation prompts for unsaved changes
- [ ] Add loading state for async save operations
- [ ] Support for nested modals (if needed)
- [ ] Swipe-to-dismiss gesture on mobile
- [ ] Keyboard shortcut hints (Ctrl+S to save, etc.)

## Notes

### Marine Environment Considerations

This component is optimized for marine environments:

- **Glove-friendly touch targets** (64pt) for cold weather operation
- **High contrast themes** for visibility in bright sunlight
- **Red-night mode** to preserve night vision (no blue/green light)
- **Forgiving UI** with large touch areas due to boat motion

### Performance

- Memoized styles with `useMemo` for theme changes
- No unnecessary re-renders
- Smooth animations (300ms enter, 250ms exit)
- Efficient keyboard event handling

### Accessibility

- Proper semantic roles (`button`)
- Accessibility labels for screen readers
- Focus management for keyboard navigation
- High contrast ratios for text (WCAG AA compliant)
