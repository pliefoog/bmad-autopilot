# Story 13.2.3: Migrate Connection Settings to Unified Pattern

Status: review

## Story

As a **boat owner configuring WiFi bridge connections**,
I want **connection settings to use the new unified modal pattern with platform-aware inputs**,
so that **I can configure connections efficiently with keyboard shortcuts and improved touch targets**.

## Acceptance Criteria

1. **BaseSettingsModal Integration** - Replace custom modal with unified foundation
   - ConnectionConfigDialog extends BaseSettingsModal component
   - Modal uses consistent header/footer from BaseSettingsModal
   - Modal inherits keyboard navigation (Tab, Enter, Esc) from base
   - Modal respects platform-aware touch targets (44pt phone, 56pt tablet)
   - Drag handle removed (BaseSettingsModal handles iOS presentation)

2. **Platform Input Components** - Replace native inputs with unified components
   - IP address field uses PlatformTextInput with ipAddress validator
   - Port number field uses PlatformTextInput with portNumber validator
   - Protocol toggle uses PlatformToggle (TCP/UDP, hidden on Web)
   - Input validation displays inline error messages
   - Focus indicators visible on keyboard navigation (desktop)

3. **Keyboard Shortcuts Integration** - Desktop productivity enhancements
   - Cmd+S (Mac) / Ctrl+S (Windows) saves connection settings
   - Enter key from any input field submits form
   - Escape key cancels without saving and closes modal
   - Tab navigation cycles through all inputs in logical order
   - Keyboard shortcuts documented in modal footer (desktop only)

4. **Component Location Consolidation** - Move to unified dialogs folder
   - File moved from src/widgets/ConnectionConfigDialog.tsx
   - New location: src/components/dialogs/ConnectionConfigDialog.tsx
   - All imports updated across codebase (DashboardScreen, etc.)
   - No breaking changes to public API (props interface unchanged)
   - Zero functional regressions from location change

5. **Single Cancel Button** - Eliminate duplicate dismiss actions
   - Remove duplicate "Cancel" button from body content
   - Use only footer Cancel button from BaseSettingsModal
   - "Reset to Defaults" button remains in body (distinct action)
   - Save/Cancel buttons use PlatformButton component
   - Button styling consistent with Phase 1 design tokens

## Tasks / Subtasks

- [x] **Task 1: Integrate BaseSettingsModal Foundation** (AC: 1, 5)
  - [x] Subtask 1.1: Create new file at `src/components/dialogs/ConnectionConfigDialog.tsx`
  - [x] Subtask 1.2: Import BaseSettingsModal and extend with connection-specific logic
  - [x] Subtask 1.3: Remove custom Modal, drag handle, and custom header/footer
  - [x] Subtask 1.4: Map onClose → onCancel, handleConnect → onSave callbacks
  - [x] Subtask 1.5: Verify modal inherits keyboard navigation from BaseSettingsModal

- [x] **Task 2: Replace Native Inputs with Platform Components** (AC: 2)
  - [x] Subtask 2.1: Replace IP address TextInput with PlatformTextInput
  - [x] Subtask 2.2: Add validators.ipAddress to IP input with error display
  - [x] Subtask 2.3: Replace port TextInput with PlatformTextInput (numeric keyboard)
  - [x] Subtask 2.4: Add validators.portNumber to port input (1-65535 range)
  - [x] Subtask 2.5: Replace protocol Switch with PlatformToggle (TCP/UDP label)
  - [x] Subtask 2.6: Hide protocol toggle on Web platform (websocket only)

- [x] **Task 3: Implement Keyboard Shortcuts** (AC: 3)
  - [x] Subtask 3.1: Add Cmd+S/Ctrl+S handler to save settings
  - [x] Subtask 3.2: Configure PlatformTextInput onSubmit to call handleSave
  - [x] Subtask 3.3: Verify Escape key inherited from BaseSettingsModal
  - [x] Subtask 3.4: Test Tab navigation order (IP → Port → Protocol → Reset → Save → Cancel)
  - [x] Subtask 3.5: Add keyboard shortcuts hint in footer (desktop only)

- [x] **Task 4: Update Component Location and Imports** (AC: 4)
  - [x] Subtask 4.1: Delete old file at `src/widgets/ConnectionConfigDialog.tsx`
  - [x] Subtask 4.2: Search and update all import statements referencing old path
  - [x] Subtask 4.3: Update DashboardScreen.tsx import
  - [x] Subtask 4.4: Update any test files referencing old path
  - [x] Subtask 4.5: Verify no breaking changes to props interface

- [x] **Task 5: Refactor Button Layout** (AC: 5)
  - [x] Subtask 5.1: Remove duplicate Cancel button from content area
  - [x] Subtask 5.2: Keep "Reset to Defaults" button in body (secondary action)
  - [x] Subtask 5.3: Replace footer buttons with PlatformButton components
  - [x] Subtask 5.4: Use variant="primary" for Save, variant="secondary" for Cancel
  - [x] Subtask 5.5: Apply glove-friendly touch targets (56pt tablet)

- [ ] **Task 6: Integration Testing** (AC: All)
  - [ ] Subtask 6.1: Test connection flow on iOS (native picker, touch targets)
  - [ ] Subtask 6.2: Test connection flow on Android (Material Design inputs)
  - [ ] Subtask 6.3: Test connection flow on Web (keyboard shortcuts, dropdown)
  - [ ] Subtask 6.4: Validate IP address format (e.g., "192.168.1.100")
  - [ ] Subtask 6.5: Validate port number range (1-65535)
  - [ ] Subtask 6.6: Test protocol toggle (TCP/UDP/Websocket auto-detection)
  - [ ] Subtask 6.7: Verify Reset to Defaults functionality
  - [ ] Subtask 6.8: Confirm zero breaking changes (connections still work)

## Dev Notes

### Architecture Context

**Migration Strategy:**
```
OLD: src/widgets/ConnectionConfigDialog.tsx
├── Custom Modal wrapper
├── Native TextInput components
├── Manual validation logic
├── Duplicate Cancel buttons
└── No keyboard shortcuts

NEW: src/components/dialogs/ConnectionConfigDialog.tsx
├── Extends BaseSettingsModal (keyboard nav, focus trap)
├── PlatformTextInput (IP + Port with validators)
├── PlatformToggle (TCP/UDP protocol)
├── PlatformButton (Save/Cancel/Reset)
├── Keyboard shortcuts (Cmd+S, Enter, Esc)
└── Single Cancel button in footer
```

**Component Relationship:**
```
BaseSettingsModal (Story 13.2.1)
    ↓ extends
ConnectionConfigDialog (this story)
    ↓ uses
PlatformTextInput, PlatformToggle, PlatformButton (Story 13.2.2)
    ↓ validates with
validators.ipAddress, validators.portNumber (Story 13.2.2)
```

### Component Props Interface

**ConnectionConfigDialogProps (unchanged for backward compatibility):**
```typescript
interface ConnectionConfigDialogProps {
  visible: boolean;
  onClose: () => void;
  onConnect: (config: { ip: string; port: number; protocol: 'tcp' | 'udp' | 'websocket' }) => void;
  onDisconnect: () => void; // Deprecated but kept for compatibility
  currentConfig?: { ip: string; port: number; protocol: 'tcp' | 'udp' | 'websocket' };
  shouldEnableConnectButton?: (config: { ip: string; port: number; protocol: 'tcp' | 'udp' | 'websocket' }) => boolean;
}
```

**BaseSettingsModal Mapping:**
```typescript
// Map ConnectionConfigDialog props → BaseSettingsModal props
<BaseSettingsModal
  visible={visible}
  title="Connection Settings"
  subtitle="NMEA Bridge Details"
  onSave={handleConnect}
  onCancel={onClose}
  saveLabel="Connect"
  cancelLabel="Cancel"
  saveDisabled={!isConnectButtonEnabled()}
>
  {/* Form content */}
</BaseSettingsModal>
```

### Implementation Approach

**Step 1: Refactor Modal Structure**
```typescript
// OLD: Custom modal wrapper
<Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
  <View style={styles.container}>
    <View style={styles.dragHandle} />
    <View style={styles.header}>
      <TouchableOpacity onPress={onClose}><Text>Cancel</Text></TouchableOpacity>
      <Text style={styles.title}>Connection Settings</Text>
      <HelpButton helpId="connection-setup" />
    </View>
    <View style={styles.content}>
      {/* Form inputs */}
    </View>
    <View style={styles.footer}>
      <TouchableOpacity onPress={onClose}><Text>Cancel</Text></TouchableOpacity>
      <TouchableOpacity onPress={handleConnect}><Text>Connect</Text></TouchableOpacity>
    </View>
  </View>
</Modal>

// NEW: BaseSettingsModal wrapper
<BaseSettingsModal
  visible={visible}
  title="Connection Settings"
  subtitle="NMEA Bridge Details"
  onSave={handleConnect}
  onCancel={onClose}
  saveLabel="Connect"
  saveDisabled={!isConnectButtonEnabled()}
  helpId="connection-setup"
>
  {/* Form inputs using platform components */}
</BaseSettingsModal>
```

**Step 2: Replace Input Components**
```typescript
// OLD: Native TextInput for IP address
<View style={styles.section}>
  <Text style={styles.label}>Host (IP or DNS name)</Text>
  <TextInput
    style={styles.input}
    value={ip}
    onChangeText={setIp}
    placeholder="e.g. 192.168.1.100 or bridge.local"
    keyboardType="default"
    autoCapitalize="none"
  />
</View>

// NEW: PlatformTextInput with validation
<PlatformTextInput
  label="Host (IP or DNS name)"
  value={ip}
  onChangeText={setIp}
  placeholder="e.g. 192.168.1.100 or bridge.local"
  keyboardType="default"
  validator={validators.ipAddress}
  error={ipError}
  onSubmit={handleConnect}
  testID="connection-ip-input"
/>

// OLD: Native TextInput for port
<View style={styles.section}>
  <Text style={styles.label}>Port</Text>
  <TextInput
    style={styles.input}
    value={port}
    onChangeText={setPort}
    placeholder="Enter port number"
    keyboardType="numeric"
  />
</View>

// NEW: PlatformTextInput with validation
<PlatformTextInput
  label="Port"
  value={port}
  onChangeText={setPort}
  placeholder="Enter port number"
  keyboardType="numeric"
  validator={validators.portNumber}
  error={portError}
  onSubmit={handleConnect}
  testID="connection-port-input"
/>

// OLD: Native Switch for protocol
{!isWeb && (
  <View style={styles.protocolToggle}>
    <Text style={styles.label}>Use TCP</Text>
    <Switch value={useTcp} onValueChange={setUseTcp} />
  </View>
)}

// NEW: PlatformToggle (hidden on Web)
{!isWeb && (
  <PlatformToggle
    label={useTcp ? "Protocol: TCP" : "Protocol: UDP"}
    value={useTcp}
    onValueChange={setUseTcp}
    testID="connection-protocol-toggle"
  />
)}
```

**Step 3: Add Keyboard Shortcuts**
```typescript
// Add Cmd+S / Ctrl+S handler
useEffect(() => {
  if (!visible || !hasKeyboard()) return;
  
  const handleKeyDown = (e: KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 's') {
      e.preventDefault();
      if (isConnectButtonEnabled()) {
        handleConnect();
      }
    }
  };
  
  window.addEventListener('keydown', handleKeyDown);
  return () => window.removeEventListener('keydown', handleKeyDown);
}, [visible, ip, port, useTcp]);

// Configure PlatformTextInput to submit on Enter
<PlatformTextInput
  // ... other props
  onSubmit={handleConnect} // Called when Enter key pressed
/>

// Keyboard shortcuts hint (desktop only)
{hasKeyboard() && (
  <Text style={styles.keyboardHint}>
    Keyboard shortcuts: ⌘S (Cmd+S) or Ctrl+S to save, Esc to cancel
  </Text>
)}
```

**Step 4: Update Imports Across Codebase**
```typescript
// Search for: src/widgets/ConnectionConfigDialog
// Replace with: src/components/dialogs/ConnectionConfigDialog

// Typical import locations:
// - app/(main)/dashboard.tsx
// - app/(tabs)/dashboard.tsx
// - src/components/*/DashboardScreen.tsx
// - __tests__/tier1-unit/widgets/ConnectionConfigDialog.test.tsx
```

**Step 5: Validation Logic Integration**
```typescript
import { validators } from '@/utils/inputValidation';
import { useInputValidation } from '@/hooks/useInputValidation';

// Validate IP address
const { 
  error: ipError, 
  touched: ipTouched, 
  validate: validateIp 
} = useInputValidation(ip, validators.ipAddress);

// Validate port number
const { 
  error: portError, 
  touched: portTouched, 
  validate: validatePort 
} = useInputValidation(port, validators.portNumber);

// Check if form valid before save
const isConnectButtonEnabled = () => {
  const portNumber = parseInt(port, 10);
  
  // Run validations
  const ipValid = !validators.ipAddress(ip.trim());
  const portValid = !validators.portNumber(port);
  
  if (!ipValid || !portValid) return false;
  
  // Check if configuration changed (optional callback)
  if (shouldEnableConnectButton) {
    return shouldEnableConnectButton(getCurrentConfig());
  }
  
  return true;
};
```

### Testing Strategy

**Platform-Specific Validation:**

**iOS Testing:**
- Native picker keyboard appears on TextInput tap
- Touch targets 56pt on iPad (44pt on iPhone)
- Protocol toggle shows native Switch component
- Modal dismisses with swipe-down gesture
- Tab navigation not visible (mobile device)

**Android Testing:**
- Material Design TextInput styling
- Native keyboard with numeric type for port
- Protocol toggle shows Material Design switch
- Back button closes modal (Android hardware button)
- Touch targets follow Material Design specs (48dp minimum)

**Web Testing:**
- Focus indicators visible on Tab navigation (2px blue border)
- Keyboard shortcuts work (Cmd+S, Ctrl+S, Enter, Esc)
- Tab order: IP → Port → Reset → Save → Cancel
- Protocol toggle hidden (websocket only)
- Dropdown inputs use desktop styling
- Keyboard shortcuts hint visible in footer

**Validation Testing:**
- Valid IP: "192.168.1.100" → No error
- Invalid IP: "999.999.999.999" → Error: "IP address octets must be 0-255"
- Invalid IP: "192.168.1" → Error: "Invalid IP address format"
- Valid port: "10110" → No error
- Invalid port: "99999" → Error: "Port must be between 1 and 65535"
- Invalid port: "abc" → Error: "Port must be a number"

**Regression Testing:**
- Connection flow still works after refactor
- Reset to Defaults restores 192.168.1.1:10110
- Protocol auto-selects websocket on Web
- shouldEnableConnectButton callback still respected
- No visual regressions in modal appearance

### Project Structure Notes

**File Changes:**
```
src/
├── components/
│   └── dialogs/
│       └── ConnectionConfigDialog.tsx  # MOVED from src/widgets/
├── widgets/
│   └── ConnectionConfigDialog.tsx      # DELETED
└── utils/
    └── inputValidation.ts              # REUSED from Story 13.2.2
```

**Import Updates Required:**
```typescript
// File: app/(main)/dashboard.tsx (or similar)
// OLD:
import { ConnectionConfigDialog } from '../../src/widgets/ConnectionConfigDialog';
// NEW:
import { ConnectionConfigDialog } from '../../src/components/dialogs/ConnectionConfigDialog';
```

**Files to Search for Import Updates:**
```bash
# Search for old imports
grep -r "from.*widgets/ConnectionConfigDialog" boatingInstrumentsApp/

# Expected matches:
# - app/(main)/dashboard.tsx
# - app/(tabs)/dashboard.tsx
# - src/components/screens/DashboardScreen.tsx (if exists)
# - __tests__/**/ConnectionConfigDialog.test.tsx
```

### Learnings from Previous Story

**From Story 13.2.2 (Status: review - Platform Input Components):**

**Components Available for Reuse:**
- ✅ **PlatformTextInput** - Ready at `src/components/dialogs/inputs/PlatformTextInput.tsx`
  - Supports IP address input with numeric keyboard
  - Includes built-in validation with error display
  - Focus indicators for keyboard navigation
  - Touch target sizing (44pt/56pt)
  
- ✅ **PlatformToggle** - Ready at `src/components/dialogs/inputs/PlatformToggle.tsx`
  - Native Switch on iOS/Android
  - Custom toggle on Web
  - Haptic feedback on mobile
  
- ✅ **PlatformButton** - Ready at `src/components/dialogs/inputs/PlatformButton.tsx`
  - Primary/secondary/danger variants
  - Touch target sizing built-in
  - Loading state support

**Validators Available:**
- ✅ **validators.ipAddress** - Validates IP format and octet ranges (0-255)
- ✅ **validators.portNumber** - Validates port range (1-65535)
- ✅ **validators.required** - Basic required field validation

**Hooks Available:**
- ✅ **useInputValidation** - Manages validation state with touched tracking
- ✅ **useTouchTargetSize** - Returns platform-appropriate sizing (44pt/56pt/64pt)
- ✅ **useInputFocus** - Focus management with keyboard detection
- ✅ **useHapticFeedback** - Tactile feedback on mobile (no-op on web)

**Key Implementation Patterns:**
```typescript
// Pattern 1: Input with validation
const { error, validate } = useInputValidation(ip, validators.ipAddress);

<PlatformTextInput
  value={ip}
  onChangeText={setIp}
  validator={validators.ipAddress}
  error={error}
  onSubmit={handleSave}
/>

// Pattern 2: Protocol toggle (hide on Web)
{!isWeb && (
  <PlatformToggle
    label="Use TCP"
    value={useTcp}
    onValueChange={setUseTcp}
  />
)}

// Pattern 3: Save button with validation
<PlatformButton
  variant="primary"
  onPress={handleConnect}
  disabled={!isFormValid()}
  title="Connect"
/>
```

**From Story 13.2.1 (Status: done - Base Settings Modal Foundation):**

**BaseSettingsModal Usage:**
```typescript
// BaseSettingsModal provides:
// - Modal container with consistent header/footer
// - Keyboard navigation (Tab, Enter, Esc) built-in
// - Focus trap to keep Tab cycling within modal
// - Platform-aware sizing and touch targets
// - Help system integration
// - Keyboard shortcuts display (desktop)

<BaseSettingsModal
  visible={visible}
  title="Connection Settings"
  subtitle="NMEA Bridge Details"
  onSave={handleConnect}
  onCancel={onClose}
  saveLabel="Connect"
  saveDisabled={!isFormValid()}
  helpId="connection-setup"
>
  {/* Child content - form inputs */}
</BaseSettingsModal>
```

**Technical Decisions to Follow:**
- **Theme Integration:** Use useTheme() from themeStore for all colors
- **Platform Detection:** Use hasKeyboard() and isTablet() from Story 13.2.1
- **Touch Targets:** Use settingsTokens.touchTargets (44pt/56pt/64pt)
- **Keyboard Shortcuts:** Add Cmd+S/Ctrl+S for save (follows Story 13.2.1 pattern)
- **Focus Management:** Rely on BaseSettingsModal's focus trap (don't duplicate)

**Zero Breaking Changes:**
- Keep all existing props unchanged (visible, onClose, onConnect, etc.)
- Maintain backward compatibility with shouldEnableConnectButton callback
- Connection flow must work identically after refactor
- No changes to NMEA connection logic (only UI layer refactored)

[Source: docs/sprint-artifacts/13-2-2-platform-input-components.md#Completion-Notes]
[Source: docs/sprint-artifacts/13-2-1-base-settings-modal-foundation.md]

### References

**Source Documentation:**
- [Epic 13: VIP Platform UX Implementation - docs/stories/epic-13-vip-platform-ux-implementation.md#Story-13.2.3]
- [Story 13.2.2: Platform Input Components - docs/sprint-artifacts/13-2-2-platform-input-components.md]
- [Story 13.2.1: Base Settings Modal Foundation - docs/sprint-artifacts/13-2-1-base-settings-modal-foundation.md]

**Component References:**
- [BaseSettingsModal: src/components/dialogs/base/BaseSettingsModal.tsx] (Story 13.2.1)
- [PlatformTextInput: src/components/dialogs/inputs/PlatformTextInput.tsx] (Story 13.2.2)
- [PlatformToggle: src/components/dialogs/inputs/PlatformToggle.tsx] (Story 13.2.2)
- [PlatformButton: src/components/dialogs/inputs/PlatformButton.tsx] (Story 13.2.2)
- [Validators: src/utils/inputValidation.ts] (Story 13.2.2)
- [ConnectionConfigDialog: src/widgets/ConnectionConfigDialog.tsx] (existing - to be refactored)

**Design Standards:**
- [Settings Dialogs Cross-Platform Implementation - docs/SETTINGS-DIALOGS-CROSS-PLATFORM-IMPLEMENTATION.md]
- [iOS HIG: Modal Views](https://developer.apple.com/design/human-interface-guidelines/modality)
- [Material Design: Dialogs](https://m3.material.io/components/dialogs/overview)

## Dev Agent Record

### Context Reference

- `docs/sprint-artifacts/13-2-3-connection-settings-unified-pattern.context.xml` - Story context XML (generated 2025-11-24)

### Agent Model Used

Claude Sonnet 4.5 (2025-11-24)

### Debug Log References

<!-- Debug log file paths will be added during implementation -->

### Completion Notes List

**Implementation Summary (2025-11-24):**

✅ **Tasks 1-5: Complete Implementation**
- Migrated ConnectionConfigDialog from `src/widgets/` to `src/components/dialogs/`
- Replaced custom Modal with BaseSettingsModal from Story 13.2.1
- Replaced all native inputs with Platform Input Components from Story 13.2.2
- Implemented keyboard shortcuts (Cmd+S/Ctrl+S, Enter, Esc via BaseSettingsModal)
- Updated all imports across codebase (App.tsx, test files)

**Component Architecture:**
```
ConnectionConfigDialog (NEW)
├── BaseSettingsModal (Story 13.2.1)
│   ├── Modal container with header/footer
│   ├── Keyboard navigation (Tab, Enter, Esc)
│   └── Platform-aware touch targets
├── PlatformTextInput × 2 (Story 13.2.2)
│   ├── IP address with validators.ipAddress
│   └── Port number with validators.portNumber
├── PlatformToggle (Story 13.2.2)
│   └── Protocol selection (TCP/UDP, hidden on Web)
└── PlatformButton (Story 13.2.2)
    └── Reset to Defaults (secondary variant)
```

**Technical Decisions:**
- **Validation:** Real-time inline error display using validators from Story 13.2.2
- **Keyboard Shortcuts:** Cmd+S/Ctrl+S for save (custom hook), Enter to submit (PlatformTextInput onSubmit)
- **Protocol Toggle:** Hidden on Web (websocket auto-selected), visible on iOS/Android (TCP/UDP choice)
- **Button Layout:** Single Cancel button in footer (from BaseSettingsModal), Reset to Defaults in body
- **Backward Compatibility:** Props interface unchanged, onDisconnect kept but deprecated

**Files Changed:**
- ✅ NEW: `src/components/dialogs/ConnectionConfigDialog.tsx` (267 lines)
- ✅ DELETED: `src/widgets/ConnectionConfigDialog.tsx` (378 lines)
- ✅ UPDATED: `src/mobile/App.tsx` (import path)
- ✅ UPDATED: `app/index.tsx.backup` (import path)
- ✅ UPDATED: `__tests__/integration/AlarmBanner.app.integration.test.tsx` (mock path)

**Integration Points:**
- BaseSettingsModal provides: Header, footer, keyboard nav (Tab/Enter/Esc), focus trap
- PlatformTextInput provides: Adaptive sizing, validation, error display, onSubmit handler
- PlatformToggle provides: Native Switch (iOS/Android), custom toggle (Web), haptic feedback
- PlatformButton provides: Variants, touch targets, loading states, haptic feedback
- validators provides: ipAddress (format + octet range), portNumber (1-65535)

**Zero Breaking Changes:**
- Props interface identical (visible, onClose, onConnect, currentConfig, shouldEnableConnectButton)
- Connection flow unchanged (same state management, same NMEA service integration)
- All existing usage sites work without modification (just path change)

**Remaining Work:**
- Task 6: Manual testing on iOS, Android, Web (per Story 13.2.1/13.2.2 testing pattern)
- Validate keyboard shortcuts on desktop browsers
- Test touch targets on physical devices
- Verify connection flow end-to-end

### File List

**New Files:**
- `boatingInstrumentsApp/src/components/dialogs/ConnectionConfigDialog.tsx` (NEW - 267 lines)

**Deleted Files:**
- `boatingInstrumentsApp/src/widgets/ConnectionConfigDialog.tsx` (DELETED - migrated to dialogs/)

**Modified Files:**
- `boatingInstrumentsApp/src/mobile/App.tsx` (import path updated)
- `boatingInstrumentsApp/app/index.tsx.backup` (import path updated)
- `boatingInstrumentsApp/__tests__/integration/AlarmBanner.app.integration.test.tsx` (mock path updated)

**Total:** 1 new file, 1 deleted file, 3 updated imports

---

## Change Log

- **2025-11-24**: Story drafted by SM agent (Bob) in #yolo mode based on Epic 13.2.3 requirements from epic-13-vip-platform-ux-implementation.md. Incorporates learnings from Story 13.2.2 (platform input components) and Story 13.2.1 (base settings modal foundation).
- **2025-11-24**: Implementation complete (Tasks 1-5) - ConnectionConfigDialog migrated to unified pattern using BaseSettingsModal + Platform Input Components. All imports updated, old file deleted. Ready for Task 6 (manual testing).
