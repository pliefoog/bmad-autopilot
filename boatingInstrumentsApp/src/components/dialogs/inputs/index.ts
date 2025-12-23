/**
 * Platform Input Components
 * Story 13.2.2 - Barrel exports for cross-platform input components
 *
 * Components:
 * - PlatformTextInput: Text entry with validation
 * - PlatformToggle: Platform-native switch/toggle
 * - PlatformPicker: Platform-appropriate selection UI
 * - PlatformButton: Consistent action buttons
 */

export { PlatformTextInput } from './PlatformTextInput';
export type { PlatformTextInputProps } from './PlatformTextInput';

export { PlatformToggle } from './PlatformToggle';
export type { PlatformToggleProps } from './PlatformToggle';

export { PlatformPicker } from './PlatformPicker';
export type { PlatformPickerProps, PlatformPickerItem } from './PlatformPicker';

export { PlatformButton } from './PlatformButton';
export type { PlatformButtonProps, ButtonVariant } from './PlatformButton';
