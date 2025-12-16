# Configuration Dialog Refactor - Implementation Specification

**Date:** December 16, 2025  
**Objective:** Refactor SensorConfigDialog, ConnectionConfigDialog, and UnitsConfigDialog to use unified architecture with reusable components  
**Expected Code Reduction:** 2525 → 1290 lines (49% reduction)  
**Estimated Time:** 15-21 hours over 6 phases

---

## Overview

This refactor addresses multiple architectural issues across three configuration dialogs:
- **Code Duplication:** loadMetricValues + metric change useEffect repeat conversion logic 4 times
- **Hardcoded Precision:** .toFixed(1) everywhere ignores formatSpec.decimals
- **No Threshold Validation:** Can save warning > critical for 'above' direction
- **Magic Numbers:** 0.5 step hardcoded, ignores formatSpec
- **State Management:** 14 useState hooks cause multiple re-renders
- **No Smart Increments:** Doesn't use testCases.min/max from formatSpec
- **No Long-Press:** Repetitive tapping for large adjustments
- **No Keyboard Support:** Arrow keys should adjust values
- **No Platform Optimization:** Same UI on phone and desktop
- **No Loading States:** Users don't know when data is loading
- **Excessive AsyncStorage Writes:** No debouncing on rapid changes

---

## Implementation Steps

### Step 1: Create getAlarmDirection Utility

**File:** `boatingInstrumentsApp/src/utils/sensorAlarmUtils.ts`  
**Lines:** ~90 lines  
**Purpose:** Extract hardcoded alarm direction logic into reusable utility

**Interface:**
```typescript
export interface AlarmDirectionResult {
  direction: 'above' | 'below';
  reason: string;
}

export function getAlarmDirection(
  sensorType: SensorType,
  metric?: string
): AlarmDirectionResult;
```

**Logic:**
- Battery sensors (voltage, soc) → 'below' (alarm when too low)
- Depth sensors → 'below' (alarm when too shallow)
- Temperature sensors → 'above' (alarm when too hot)
- Engine sensors (coolant, oil, rpm) → 'above' (alarm when too high)
- Wind sensors → 'above' (alarm when too strong)
- Tank sensors:
  - fuel, freshWater, liveWell, oil, blackWater → 'below' (alarm when too low)
  - wasteWater, grayWater → 'above' (alarm when too full)

**Unit Tests Required:**
- All sensor types covered
- Tank variants tested
- Edge cases (unknown sensor type)

---

### Step 2: Create useFormState Hook

**File:** `boatingInstrumentsApp/src/hooks/useFormState.ts`  
**Lines:** ~120 lines  
**Purpose:** Consolidate 14 useState hooks into single form state manager with auto-save

**Interface:**
```typescript
export interface UseFormStateOptions<T> {
  onSave?: (data: T) => Promise<void>;
  debounceMs?: number; // Default: 300ms
  validationSchema?: z.ZodSchema<T>;
}

export interface UseFormStateReturn<T> {
  formData: T;
  updateField: <K extends keyof T>(field: K, value: T[K]) => void;
  reset: (data: T) => void;
  isDirty: boolean;
  errors: Partial<Record<keyof T, string>>;
  validate: () => boolean;
  isSaving: boolean;
  saveNow: () => Promise<void>;
}

export function useFormState<T>(
  initialData: T,
  options?: UseFormStateOptions<T>
): UseFormStateReturn<T>;
```

**Features:**
- Debounced auto-save on onChange (300ms default)
- Immediate save on explicit saveNow() call (for onBlur, onClose, onTabChange)
- Dirty tracking (compare current vs initial)
- Zod schema validation with error messages
- isSaving state for loading indicators

**Unit Tests Required:**
- State updates work correctly
- Dirty tracking accurate
- Validation runs and captures errors
- Debounce timing correct
- Immediate save bypasses debounce

---

### Step 3: Create ThresholdEditor Component

**File:** `boatingInstrumentsApp/src/components/dialogs/inputs/ThresholdEditor.tsx`  
**Lines:** ~160 lines  
**Purpose:** Replace 152 lines of duplicate increment/decrement UI in SensorConfigDialog

**Interface:**
```typescript
export interface ThresholdEditorProps {
  label: string;
  value: number;
  direction: 'above' | 'below';
  formatSpec: FormatSpec;
  minValue?: number; // From formatSpec.testCases.min
  maxValue?: number; // From formatSpec.testCases.max
  otherThreshold?: number; // Warning/critical counterpart for validation
  onChange: (value: number) => void;
  onBlur?: () => void;
  disabled?: boolean;
  testID?: string;
}
```

**Features:**
- **Smart Step Calculation:** `step = Math.pow(10, -formatSpec.decimals)`
  - decimals: 0 → step: 1
  - decimals: 1 → step: 0.1
  - decimals: 2 → step: 0.01
- **Boundary Enforcement:**
  - Respect minValue/maxValue from formatSpec.testCases
  - Direction-aware validation with otherThreshold:
    - 'above': warning < critical (warning must trigger first)
    - 'below': warning > critical (warning must trigger first)
- **Long-Press Acceleration:**
  - Start: 1× step (100ms interval)
  - After 10 taps: 2× step
  - After 20 taps: 4× step
  - After 30 taps: 8× step
  - After 40 taps: 10× step (max)
  - Reset on release
- **Keyboard Support (Desktop):**
  - Arrow Up/Down: ±1 step
  - Shift+Arrow: ±10 steps
  - PageUp/PageDown: ±100 steps
  - Home/End: Jump to min/max
- **Validation Animations:**
  - Touch (phone/tablet): Shake animation + haptic feedback
  - Desktop: Red border pulse + error tooltip
  - TV: Scale pulse + large error banner
- **Display:** Uses presentation.format() with formatSpec for correct decimals and units

**Performance:**
- React.memo to prevent unnecessary re-renders
- useCallback for all handlers
- useMemo for styles

**Unit Tests Required:**
- Step calculation for various decimal values
- Boundary enforcement
- Direction-aware validation
- Long-press acceleration timing
- Keyboard shortcuts
- Formatting with presentation.format()

---

### Step 4: Create FormSection Component

**File:** `boatingInstrumentsApp/src/components/dialogs/components/FormSection.tsx`  
**Lines:** ~200 lines  
**Purpose:** Standardize section layout with collapsible persistence and platform-optimized grids

**Interface:**
```typescript
export interface FormSectionProps {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  errors?: string[]; // Show error summary at top
  collapsible?: boolean;
  defaultCollapsed?: boolean;
  sectionId?: string; // For persistence: "sensor_identity"
  dialogId?: string; // For persistence: "SensorConfigDialog"
  isLoading?: boolean; // Show skeleton screen
  testID?: string;
}
```

**Features:**
- **Collapsible Sections:**
  - Expand/collapse with chevron icon
  - Persist state to AsyncStorage: `config_dialog_sections_{dialogId}`
  - JSON format: `{"sensor_identity": false, "alarm_config": true, ...}`
  - Load on mount, save on toggle
- **Platform-Optimized Layouts:**
  - Phone (portrait): 1 column, 44px touch targets, 16px spacing
  - Phone (landscape): 2 columns, 44px touch targets, 12px spacing
  - Tablet (portrait): 2 columns, 56px touch targets, 20px spacing
  - Tablet (landscape): 3 columns, 56px touch targets, 16px spacing
  - TV: 1 column, 60px touch targets × 2.0 scale, 32px spacing, focus indicators
  - Desktop: 2-3 columns, 32px spacing, compact inputs, hover states
- **Loading State:**
  - Skeleton screens with shimmer animation during AsyncStorage load
  - Pulse animation for content placeholders
  - Preserve layout structure (height, spacing)
- **Error Summary:**
  - Show error count badge next to title
  - List all field errors at section top
  - Highlight invalid fields with red border

**Performance:**
- React.memo with props comparison
- useCallback for toggle handler
- useMemo for layout calculations

**Unit Tests Required:**
- Collapsible toggle works
- Persistence to AsyncStorage
- Platform-specific layouts render correctly
- Error summary displays
- Loading state shows skeleton
- Section height preserved during collapse

---

### Step 5: Refactor SensorConfigDialog

**File:** `boatingInstrumentsApp/src/components/dialogs/SensorConfigDialog.tsx`  
**Current:** 1730 lines → **Target:** 750 lines (57% reduction)

**Changes:**

1. **Add Zod Schema (lines 1-50):**
```typescript
const SensorFormDataSchema = z.object({
  name: z.string().min(1, "Name required"),
  sensorType: z.string(),
  metric: z.string().optional(),
  instanceIndex: z.number().min(0),
  alarmsEnabled: z.boolean(),
  alarmPriority: z.enum(['warning', 'alert', 'alarm']),
  alarmDirection: z.enum(['above', 'below']),
  warningThreshold: z.number(),
  criticalThreshold: z.number(),
  unit: z.string()
}).refine((data) => {
  // Cross-field validation: warning must trigger before critical
  if (data.alarmDirection === 'above') {
    return data.warningThreshold < data.criticalThreshold;
  } else {
    return data.warningThreshold > data.criticalThreshold;
  }
}, {
  message: "Warning must trigger before critical threshold",
  path: ["warningThreshold"]
});
```

2. **Replace 14 useState → useFormState (lines 243-280):**
```typescript
// OLD: 14 separate useState hooks
const [name, setName] = useState('');
const [sensorType, setSensorType] = useState('');
// ... 12 more ...

// NEW: Single useFormState
const {
  formData,
  updateField,
  reset,
  isDirty,
  errors,
  validate,
  isSaving,
  saveNow
} = useFormState<SensorFormData>(initialFormData, {
  validationSchema: SensorFormDataSchema,
  debounceMs: 300,
  onSave: async (data) => {
    await saveSensorConfig(data);
    await saveToAsyncStorage(data);
  }
});
```

3. **Replace .toFixed(1) → presentation.format() (lines 307-355, 387-446):**
```typescript
// OLD: Hardcoded precision
const formattedValue = value.toFixed(1);

// NEW: Use formatSpec
const formattedValue = presentation.format(value, formatSpec);
```

4. **Replace Duplicate Threshold UI → ThresholdEditor (lines 1026-1177, 152 lines removed):**
```typescript
// OLD: 152 lines of duplicate increment/decrement buttons

// NEW: 2 ThresholdEditor components
<ThresholdEditor
  label="Warning Threshold"
  value={formData.warningThreshold}
  direction={formData.alarmDirection}
  formatSpec={presentation.formatSpec}
  minValue={presentation.testCases.min}
  maxValue={presentation.testCases.max}
  otherThreshold={formData.criticalThreshold}
  onChange={(val) => updateField('warningThreshold', val)}
  onBlur={saveNow}
  disabled={!formData.alarmsEnabled}
/>

<ThresholdEditor
  label="Critical Threshold"
  value={formData.criticalThreshold}
  direction={formData.alarmDirection}
  formatSpec={presentation.formatSpec}
  minValue={presentation.testCases.min}
  maxValue={presentation.testCases.max}
  otherThreshold={formData.warningThreshold}
  onChange={(val) => updateField('criticalThreshold', val)}
  onBlur={saveNow}
  disabled={!formData.alarmsEnabled}
/>
```

5. **Add FormSections:**
```typescript
<FormSection
  title="Sensor Identity"
  sectionId="sensor_identity"
  dialogId="SensorConfigDialog"
  isLoading={isLoadingConfig}
>
  {/* Name, Type, Metric fields */}
</FormSection>

<FormSection
  title="Alarm Configuration"
  sectionId="alarm_config"
  dialogId="SensorConfigDialog"
  errors={errors.alarmsEnabled ? [errors.alarmsEnabled] : undefined}
>
  {/* Enable toggle, Priority, Direction */}
</FormSection>

<FormSection
  title="Threshold Settings"
  sectionId="threshold_settings"
  dialogId="SensorConfigDialog"
  collapsible
  defaultCollapsed={!formData.alarmsEnabled}
  errors={[errors.warningThreshold, errors.criticalThreshold].filter(Boolean)}
>
  {/* ThresholdEditor components */}
</FormSection>
```

6. **Add Loading States:**
```typescript
const [isLoadingConfig, setIsLoadingConfig] = useState(true);

useEffect(() => {
  async function loadConfig() {
    setIsLoadingConfig(true);
    const config = await loadFromAsyncStorage();
    reset(config);
    setIsLoadingConfig(false);
  }
  loadConfig();
}, [visible]);
```

7. **Add Instance Tab Overflow Handling:**
- **Phone:** Horizontal scroll with snap points
- **Tablet:** Vertical sidebar with scroll
- **TV:** Prev/Next buttons with focus indicators
- **Desktop:** Dropdown selector (Ctrl+1-9 shortcuts)

8. **Add Performance Optimizations:**
```typescript
// Memoize expensive calculations
const presentation = useMemo(() => 
  presentationMap[formData.sensorType]?.[formData.metric || 'default'],
  [formData.sensorType, formData.metric]
);

// Memoize handlers
const handleInstanceChange = useCallback((index: number) => {
  saveNow(); // Save current instance before switching
  setInstanceIndex(index);
}, [saveNow]);

// Memoize component with React.memo
export default React.memo(SensorConfigDialog);
```

**Unit Tests Required:**
- Multi-instance save workflow (switch instances, verify save)
- Auto-save debounce (300ms on change, immediate on blur)
- Validation (warning/critical relationship)
- All 9 platforms render correctly
- Loading states display
- Collapsible sections persist

---

### Step 6: Refactor ConnectionConfigDialog

**File:** `boatingInstrumentsApp/src/components/dialogs/ConnectionConfigDialog.tsx`  
**Current:** 325 lines → **Target:** 220 lines (32% reduction)

**Changes:**

1. **Add Zod Schema:**
```typescript
const ConnectionFormDataSchema = z.object({
  connectionType: z.enum(['wifi', 'tcp', 'udp', 'serial']),
  ipAddress: z.string().regex(/^(\d{1,3}\.){3}\d{1,3}$/, "Invalid IP address"),
  port: z.number().min(1).max(65535, "Port must be 1-65535"),
  autoConnect: z.boolean(),
  reconnectOnFailure: z.boolean(),
  timeout: z.number().min(1000).max(30000)
});
```

2. **Replace State → useFormState:**
```typescript
const { formData, updateField, errors, saveNow } = useFormState<ConnectionFormData>(
  initialFormData,
  { validationSchema: ConnectionFormDataSchema, debounceMs: 300 }
);
```

3. **Add FormSections:**
```typescript
<FormSection title="Connection Type" sectionId="conn_type" dialogId="ConnectionConfigDialog">
  {/* Radio buttons for wifi/tcp/udp/serial */}
</FormSection>

<FormSection title="Network Settings" sectionId="network_settings" dialogId="ConnectionConfigDialog"
  errors={[errors.ipAddress, errors.port].filter(Boolean)}>
  {/* IP + Port inputs */}
</FormSection>

<FormSection title="Advanced" sectionId="advanced" dialogId="ConnectionConfigDialog" collapsible defaultCollapsed>
  {/* Auto-connect, Reconnect, Timeout */}
</FormSection>
```

4. **Add Platform-Optimized Layouts:**
- **Desktop:** IP + Port + Protocol in single row (compact)
- **Phone:** Stacked vertically (44px touch targets)
- **Tablet:** 2-column grid (56px touch targets)
- **TV:** Large single column (60px × 2.0 scale)

5. **Add Validation Animations:**
- **Touch:** Shake animation on invalid save
- **Desktop:** Red border pulse + error tooltip
- **TV:** Scale pulse + large error banner

**Unit Tests Required:**
- IP validation (valid/invalid formats)
- Port range validation
- Platform layouts render correctly
- Validation animations trigger

---

### Step 7: Refactor UnitsConfigDialog

**File:** `boatingInstrumentsApp/src/components/dialogs/UnitsConfigDialog.tsx`  
**Current:** 470 lines → **Target:** 320 lines (32% reduction)

**Changes:**

1. **Add Zod Schema:**
```typescript
const UnitsFormDataSchema = z.object({
  preset: z.enum(['nautical-eu', 'nautical-uk', 'nautical-us', 'custom']),
  depth: z.enum(['m', 'ft', 'fm']),
  speed: z.enum(['kts', 'mph', 'kmh', 'ms']),
  // ... 15 more categories ...
});
```

2. **Replace State → useFormState:**
```typescript
const { formData, updateField, saveNow } = useFormState<UnitsFormData>(
  initialFormData,
  { validationSchema: UnitsFormDataSchema, debounceMs: 300 }
);
```

3. **Add Collapsible FormSections (17 Categories):**
```typescript
// Common categories (default expanded)
<FormSection title="Navigation" sectionId="nav" dialogId="UnitsConfigDialog">
  {/* depth, speed, distance, coordinates */}
</FormSection>

<FormSection title="Weather" sectionId="weather" dialogId="UnitsConfigDialog">
  {/* wind speed, temperature, pressure */}
</FormSection>

// Uncommon categories (default collapsed)
<FormSection title="Electrical" sectionId="electrical" dialogId="UnitsConfigDialog" 
  collapsible defaultCollapsed>
  {/* voltage, current, capacity, power */}
</FormSection>

<FormSection title="Fluid Systems" sectionId="fluids" dialogId="UnitsConfigDialog"
  collapsible defaultCollapsed>
  {/* volume, flowRate, pressure */}
</FormSection>

// ... 13 more sections ...
```

4. **Add Preset Preview:**
```typescript
<FormSection title="Preset" sectionId="preset" dialogId="UnitsConfigDialog">
  <PlatformPicker
    value={formData.preset}
    onChange={(val) => {
      updateField('preset', val);
      if (val !== 'custom') applyPreset(val);
    }}
  />
  
  {/* Preview with example values */}
  <View style={styles.preview}>
    <Text>Depth: {formatDepth(10.5, formData.depth)}</Text>
    <Text>Speed: {formatSpeed(15.2, formData.speed)}</Text>
    <Text>Wind: {formatWindSpeed(22.0, formData.windSpeed)}</Text>
  </View>
</FormSection>
```

5. **Add Platform-Optimized Grids:**
- **Desktop:** 3-column compact grid for category selectors
- **Tablet:** 2-column grid
- **Phone:** Single column

**Unit Tests Required:**
- Preset application (verify all 17 categories change)
- Custom auto-activation (manual change → preset becomes 'custom')
- Collapsible sections persist state
- Platform grids render correctly

---

### Step 8: Validate formatSpec Coverage

**Files to Audit:**
- `boatingInstrumentsApp/src/presentation/*.ts`

**Required:**
All threshold-enabled sensors must have:
- `formatSpec.decimals` (for step calculation)
- `formatSpec.testCases.min` (for boundary enforcement)
- `formatSpec.testCases.max` (for boundary enforcement)

**Threshold-Enabled Sensors:**
- Depth (m, ft, fm)
- Speed (kts, mph, kmh, ms)
- Wind Speed (kts, mph, kmh, ms)
- Temperature (C, F)
- Pressure (bar, psi, kPa)
- Battery Voltage (V)
- Battery SOC (%)
- Battery Current (A)
- Tank Level (%)
- Engine RPM (rpm)
- Engine Temperature (C, F)

**Action:**
Review presentation files and add missing testCases.min/max where needed.

---

## Implementation Details

### Performance Patterns

```typescript
// 1. React.memo for components
export default React.memo(ThresholdEditor, (prev, next) => {
  return prev.value === next.value &&
         prev.disabled === next.disabled &&
         prev.formatSpec === next.formatSpec;
});

// 2. useCallback for handlers
const handleIncrement = useCallback(() => {
  const newValue = Math.min(value + step, maxValue);
  onChange(newValue);
}, [value, step, maxValue, onChange]);

// 3. useMemo for expensive calculations
const step = useMemo(() => 
  Math.pow(10, -formatSpec.decimals),
  [formatSpec.decimals]
);

// 4. Lazy state initialization
const [state, setState] = useState(() => computeExpensiveInitialState());
```

### Debounced Auto-Save

```typescript
import { useRef, useEffect } from 'react';

export function useFormState<T>(initialData: T, options: UseFormStateOptions<T>) {
  const [formData, setFormData] = useState(initialData);
  const debounceTimer = useRef<NodeJS.Timeout>();
  
  const updateField = useCallback(<K extends keyof T>(field: K, value: T[K]) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Debounced save
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => {
      options.onSave?.(formData);
    }, options.debounceMs ?? 300);
  }, [formData, options]);
  
  const saveNow = useCallback(async () => {
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    await options.onSave?.(formData);
  }, [formData, options]);
  
  return { formData, updateField, saveNow };
}
```

### Loading States

```typescript
// Skeleton Screen Component
function SkeletonField({ width = '100%', height = 44 }) {
  return (
    <View style={[styles.skeleton, { width, height }]}>
      <Animated.View style={[styles.shimmer, shimmerAnimation]} />
    </View>
  );
}

// Usage in FormSection
function FormSection({ isLoading, children }) {
  if (isLoading) {
    return (
      <View>
        <SkeletonField width="40%" height={20} /> {/* Title */}
        <SkeletonField width="100%" height={44} /> {/* Input 1 */}
        <SkeletonField width="100%" height={44} /> {/* Input 2 */}
      </View>
    );
  }
  return <View>{children}</View>;
}
```

### Type Safety with Zod

```typescript
import { z } from 'zod';

// 1. Define schema
const SensorFormDataSchema = z.object({
  name: z.string().min(1),
  warningThreshold: z.number(),
  criticalThreshold: z.number()
}).refine(/* cross-field validation */);

// 2. Infer TypeScript type
type SensorFormData = z.infer<typeof SensorFormDataSchema>;

// 3. Runtime validation
function validateForm(data: unknown): SensorFormData {
  return SensorFormDataSchema.parse(data); // Throws if invalid
}

// 4. Safe parsing (no throw)
const result = SensorFormDataSchema.safeParse(data);
if (result.success) {
  // result.data is typed as SensorFormData
} else {
  // result.error contains validation errors
}
```

### Responsive Height Management

```typescript
import { useWindowDimensions } from 'react-native';

function BaseSettingsModal({ children }) {
  const { height } = useWindowDimensions();
  
  // Responsive max height (80-90vh)
  const maxHeight = useMemo(() => {
    if (Platform.OS === 'web') {
      return height * 0.9; // 90vh for web
    } else if (isTablet()) {
      return height * 0.85; // 85vh for tablets
    } else {
      return height * 0.8; // 80vh for phones
    }
  }, [height]);
  
  return (
    <ScrollView 
      style={{ maxHeight }}
      contentContainerStyle={{ flexGrow: 1 }}
    >
      {children}
    </ScrollView>
  );
}
```

### Platform Detection Usage

```typescript
import { detectPlatform, isTablet, isTV, getDefaultTouchTargetSize } from '@/utils/platformDetection';

function FormSection({ children }) {
  const platform = detectPlatform();
  const touchSize = getDefaultTouchTargetSize();
  
  const layoutStyle = useMemo(() => {
    if (isTV()) {
      return { columns: 1, spacing: 32, touchSize: touchSize * 2.0 };
    } else if (isTablet()) {
      return { columns: 2, spacing: 20, touchSize };
    } else if (platform === 'desktop') {
      return { columns: 3, spacing: 16, touchSize: 32 };
    } else {
      return { columns: 1, spacing: 16, touchSize };
    }
  }, [platform, touchSize]);
  
  return <View style={layoutStyle}>{children}</View>;
}
```

### Keyboard Shortcuts (Desktop)

```typescript
import { useEffect } from 'react';
import { Platform } from 'react-native';

function useKeyboardShortcuts(handlers: Record<string, () => void>) {
  useEffect(() => {
    if (Platform.OS !== 'web') return;
    
    const handleKeyDown = (e: KeyboardEvent) => {
      const key = `${e.ctrlKey ? 'Ctrl+' : ''}${e.shiftKey ? 'Shift+' : ''}${e.key}`;
      
      if (handlers[key]) {
        e.preventDefault();
        handlers[key]();
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handlers]);
}

// Usage in dialog
function SensorConfigDialog() {
  const { saveNow, close } = useDialog();
  
  useKeyboardShortcuts({
    'Ctrl+s': saveNow,
    'Ctrl+w': close,
    'Ctrl+1': () => setInstanceIndex(0),
    'Ctrl+2': () => setInstanceIndex(1),
    // ... up to Ctrl+9
  });
}
```

---

## Acceptance Criteria

### Functional Requirements
1. ✅ ThresholdEditor enforces boundaries (min/max from formatSpec.testCases)
2. ✅ ThresholdEditor validates direction (warning before critical)
3. ✅ ThresholdEditor uses smart step (10^-decimals)
4. ✅ ThresholdEditor supports long-press acceleration (1x→2x→4x→8x→10x)
5. ✅ ThresholdEditor supports keyboard (Arrow, PageUp/Down, Home/End)
6. ✅ ThresholdEditor displays formatted values (presentation.format())
7. ✅ ThresholdEditor shows validation animations (shake/pulse/border)
8. ✅ FormSection supports collapsible with persistence
9. ✅ FormSection persists state to AsyncStorage
10. ✅ FormSection shows loading states (skeleton screens)
11. ✅ FormSection adapts to platform (1-3 columns, touch sizes)
12. ✅ useFormState consolidates multiple useState
13. ✅ useFormState debounces auto-save (300ms)
14. ✅ useFormState validates with Zod schema
15. ✅ useFormState tracks dirty state
16. ✅ getAlarmDirection handles all sensor types
17. ✅ getAlarmDirection handles tank variants
18. ✅ SensorConfigDialog uses ThresholdEditor (no duplicate code)
19. ✅ SensorConfigDialog uses FormSections
20. ✅ SensorConfigDialog uses useFormState
21. ✅ SensorConfigDialog uses presentation.format()
22. ✅ SensorConfigDialog saves before instance switch
23. ✅ SensorConfigDialog reduced to ~750 lines (57% reduction)
24. ✅ ConnectionConfigDialog uses FormSections
25. ✅ ConnectionConfigDialog uses useFormState
26. ✅ ConnectionConfigDialog validates IP/port with Zod
27. ✅ ConnectionConfigDialog reduced to ~220 lines (32% reduction)
28. ✅ UnitsConfigDialog uses collapsible FormSections
29. ✅ UnitsConfigDialog uses useFormState
30. ✅ UnitsConfigDialog shows preset preview
31. ✅ UnitsConfigDialog reduced to ~320 lines (32% reduction)

### Performance Requirements
32. ✅ 70% fewer AsyncStorage writes (via debouncing)
33. ✅ No unnecessary re-renders (React.memo, useCallback, useMemo)
34. ✅ Validation memoized (rules cached, short-circuit on success)
35. ✅ Layout calculations memoized (platform detection, grid calculations)

### Responsive Requirements
36. ✅ Max heights 80vh-90vh with ScrollView
37. ✅ Phone: 1 column portrait, 2 column landscape, 44px touch
38. ✅ Tablet: 2 column portrait, 3 column landscape, 56px touch
39. ✅ TV: 1 column, 60px × 2.0 scale, focus indicators
40. ✅ Desktop: 2-3 columns, 32px spacing, compact inputs
41. ✅ All 9 platforms render correctly (iOS phone/tablet/TV, Android phone/tablet/TV, Windows, macOS, Web)

### Loading Requirements
42. ✅ Skeleton screens during AsyncStorage load
43. ✅ Shimmer animation on placeholders
44. ✅ Layout structure preserved (height, spacing)
45. ✅ isSaving indicator during auto-save

### Type Safety Requirements
46. ✅ 100% strict TypeScript compliance
47. ✅ Zod schemas for runtime validation
48. ✅ Discriminated unions for sensor types
49. ✅ No 'any' types (except React Native libraries)

### Desktop Requirements
50. ✅ Keyboard shortcuts work (Ctrl+S, Ctrl+W, Ctrl+1-9, etc.)
51. ✅ Hover states on buttons/inputs
52. ✅ Compact layouts (3-column grids)
53. ✅ Error tooltips instead of modals

---

## Testing Strategy

### Unit Tests

**ThresholdEditor.test.tsx:**
```typescript
describe('ThresholdEditor', () => {
  test('calculates step from decimals', () => {
    const { result } = renderHook(() => useStep({ decimals: 1 }));
    expect(result.current).toBe(0.1);
  });
  
  test('enforces min boundary', () => {
    const onChange = jest.fn();
    const { getByTestId } = render(
      <ThresholdEditor value={5} minValue={10} onChange={onChange} />
    );
    fireEvent.press(getByTestId('decrement'));
    expect(onChange).not.toHaveBeenCalled(); // Can't go below 10
  });
  
  test('validates warning < critical for above direction', () => {
    const { getByText } = render(
      <ThresholdEditor 
        value={50} 
        direction="above" 
        otherThreshold={40} 
      />
    );
    expect(getByText(/must be less than critical/i)).toBeTruthy();
  });
  
  test('long-press accelerates', async () => {
    const onChange = jest.fn();
    const { getByTestId } = render(
      <ThresholdEditor value={10} step={1} onChange={onChange} />
    );
    const button = getByTestId('increment');
    
    fireEvent.pressIn(button);
    await waitFor(() => expect(onChange).toHaveBeenCalledTimes(10));
    await waitFor(() => expect(onChange).toHaveBeenCalledWith(11)); // 1x
    await waitFor(() => expect(onChange).toHaveBeenCalledWith(22)); // 2x after 10 taps
    fireEvent.pressOut(button);
  });
});
```

**useFormState.test.tsx:**
```typescript
describe('useFormState', () => {
  test('debounces auto-save', async () => {
    const onSave = jest.fn();
    const { result } = renderHook(() => 
      useFormState({ name: '' }, { onSave, debounceMs: 100 })
    );
    
    act(() => result.current.updateField('name', 'Test'));
    expect(onSave).not.toHaveBeenCalled(); // Not yet
    
    await waitFor(() => expect(onSave).toHaveBeenCalledTimes(1), { timeout: 200 });
  });
  
  test('saveNow bypasses debounce', async () => {
    const onSave = jest.fn();
    const { result } = renderHook(() => 
      useFormState({ name: '' }, { onSave, debounceMs: 1000 })
    );
    
    act(() => result.current.updateField('name', 'Test'));
    act(() => result.current.saveNow());
    
    expect(onSave).toHaveBeenCalledTimes(1); // Immediate
  });
  
  test('validates with Zod', () => {
    const schema = z.object({ name: z.string().min(3) });
    const { result } = renderHook(() => 
      useFormState({ name: 'ab' }, { validationSchema: schema })
    );
    
    act(() => result.current.validate());
    expect(result.current.errors.name).toBeTruthy();
  });
});
```

### Integration Tests

**SensorConfigDialog.integration.test.tsx:**
```typescript
describe('SensorConfigDialog Integration', () => {
  test('saves before instance switch', async () => {
    const saveMock = jest.fn();
    const { getByTestId } = render(
      <SensorConfigDialog sensorId="battery" onSave={saveMock} />
    );
    
    // Modify battery instance 0
    fireEvent.changeText(getByTestId('name-input'), 'House Battery');
    
    // Switch to instance 1
    fireEvent.press(getByTestId('instance-tab-1'));
    
    // Verify instance 0 saved
    await waitFor(() => expect(saveMock).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'House Battery', instanceIndex: 0 })
    ));
  });
  
  test('debounces rapid changes', async () => {
    const saveMock = jest.fn();
    const { getByTestId } = render(
      <SensorConfigDialog sensorId="depth" onSave={saveMock} />
    );
    
    // Rapid threshold changes
    const editor = getByTestId('warning-threshold');
    fireEvent.press(getByTestId('increment')); // 10
    fireEvent.press(getByTestId('increment')); // 11
    fireEvent.press(getByTestId('increment')); // 12
    
    // Should only save once after debounce (300ms)
    await waitFor(() => expect(saveMock).toHaveBeenCalledTimes(1), { timeout: 400 });
  });
});
```

### Performance Tests

**Performance.test.tsx:**
```typescript
describe('Performance', () => {
  test('ThresholdEditor does not re-render on parent update', () => {
    const renderCount = jest.fn();
    const MemoizedEditor = React.memo(ThresholdEditor);
    
    const { rerender } = render(
      <MemoizedEditor value={10} onChange={() => {}} onRender={renderCount} />
    );
    
    // Parent re-renders with same props
    rerender(<MemoizedEditor value={10} onChange={() => {}} onRender={renderCount} />);
    
    expect(renderCount).toHaveBeenCalledTimes(1); // Only initial render
  });
  
  test('AsyncStorage writes reduced by 70%', async () => {
    const setItemSpy = jest.spyOn(AsyncStorage, 'setItem');
    
    const { getByTestId } = render(
      <SensorConfigDialog sensorId="depth" />
    );
    
    // Make 10 rapid changes
    for (let i = 0; i < 10; i++) {
      fireEvent.press(getByTestId('increment'));
    }
    
    await waitFor(() => expect(setItemSpy).toHaveBeenCalledTimes(1)); // Only 1 write due to debounce
  });
});
```

---

## Dependencies

### Existing Dependencies
- React Native (UI framework)
- TypeScript (type safety)
- Zustand (state management for theme)
- AsyncStorage (persistence)
- Jest (testing)
- React Test Renderer (testing)

### New Dependencies
- **Zod** (`npm install zod`) - Runtime validation

---

## File Structure

```
boatingInstrumentsApp/
├── src/
│   ├── components/
│   │   └── dialogs/
│   │       ├── SensorConfigDialog.tsx         [MODIFY - 1730 → 750 lines]
│   │       ├── ConnectionConfigDialog.tsx     [MODIFY - 325 → 220 lines]
│   │       ├── UnitsConfigDialog.tsx          [MODIFY - 470 → 320 lines]
│   │       ├── components/
│   │       │   └── FormSection.tsx            [CREATE - 200 lines]
│   │       └── inputs/
│   │           └── ThresholdEditor.tsx        [CREATE - 160 lines]
│   ├── hooks/
│   │   └── useFormState.ts                    [CREATE - 120 lines]
│   └── utils/
│       └── sensorAlarmUtils.ts                [CREATE - 90 lines]
├── __tests__/
│   ├── components/
│   │   ├── ThresholdEditor.test.tsx           [CREATE]
│   │   ├── FormSection.test.tsx               [CREATE]
│   │   └── SensorConfigDialog.integration.test.tsx [CREATE]
│   ├── hooks/
│   │   └── useFormState.test.tsx              [CREATE]
│   └── utils/
│       └── sensorAlarmUtils.test.tsx          [CREATE]
└── package.json                                [MODIFY - add zod]
```

---

## Implementation Order

### Phase 1: Foundation (2-3 hours)
1. Install Zod: `npm install zod`
2. Create `sensorAlarmUtils.ts` with tests
3. Create `useFormState.ts` with tests
4. Update `presentation/README.md` with formatSpec requirements

### Phase 2: Reusable Components (3-4 hours)
1. Create `ThresholdEditor.tsx` with tests
2. Create `FormSection.tsx` with tests

### Phase 3: SensorConfigDialog Refactor (4-5 hours)
1. Add Zod schema
2. Replace useState → useFormState
3. Replace .toFixed() → presentation.format()
4. Replace threshold UI → ThresholdEditor
5. Add FormSections
6. Add loading states
7. Add performance optimizations
8. Add instance tab overflow
9. Test multi-instance workflow

### Phase 4: ConnectionConfigDialog Refactor (2-3 hours)
1. Add Zod schema
2. Replace state → useFormState
3. Add FormSections
4. Add platform layouts
5. Add validation animations

### Phase 5: UnitsConfigDialog Refactor (2-3 hours)
1. Add Zod schema
2. Replace state → useFormState
3. Add collapsible FormSections
4. Add preset preview
5. Add platform grids

### Phase 6: Testing & Validation (2-3 hours)
1. Run all unit tests
2. Integration testing on all 9 platforms
3. Performance profiling
4. formatSpec audit
5. Documentation review

---

## Success Metrics

1. **Code Reduction:** 2525 → 1290 lines (49% reduction)
2. **Performance:** 70% fewer AsyncStorage writes via debouncing
3. **Type Safety:** 100% strict TypeScript compliance, Zod runtime validation
4. **Test Coverage:** >80% for new components/hooks
5. **Platform Support:** All 9 platforms work correctly
6. **Responsive:** Max heights 80vh-90vh with ScrollView
7. **Keyboard:** All desktop shortcuts functional
8. **Loading:** Skeleton screens during load
9. **Validation:** Direction-aware threshold checking, no invalid saves

---

## Notes

- **BaseSettingsModal:** No changes needed - already has ScrollView, KeyboardAvoidingView, keyboard navigation
- **Platform Detection:** Leverage existing `detectPlatform()`, `isTablet()`, `isTV()`, `getDefaultTouchTargetSize()`
- **Responsive Grid:** Use existing `useResponsiveGrid` for dashboard, but FormSection has custom layout logic
- **Accessibility:** AccessibilityService already comprehensive (VoiceOver/TalkBack) - no additional work needed
- **Offline Constraint:** No lazy loading/code splitting (app must work offline)
- **React Native Reusables Migration:** Parked for future - focus on threshold improvements and componentization only

---

**End of Specification**
