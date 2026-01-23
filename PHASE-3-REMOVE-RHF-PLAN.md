# Phase 3: Remove React Hook Form

**Goal:** Replace React Hook Form with plain React state management in `useSensorConfigForm`, reducing bundle size and simplifying form logic.

**Status:** Planning - Architecture Design

## Current RHF Usage Analysis

### Files Using React Hook Form

1. **useSensorConfigForm.ts** (Primary Target - 711 lines)
   - Uses: `useForm`, `useWatch`, `UseFormReturn`, `zodResolver`, `zod`
   - Form fields: name, enabled, context, selectedMetric, criticalValue, warningValue, criticalSoundPattern, warningSoundPattern
   - Validation: Direction-aware threshold validation via Zod schema
   - Pattern: onSubmit validation mode for explicit save-on-transition

2. **SensorConfigDialog.tsx** (Consumer)
   - Uses: `useWatch` from RHF to watch form field changes
   - Spreads RHF form methods to AlarmThresholdSlider components

3. **useUnitsConfigForm.ts** (Out of scope - different form)
   - Units configuration form
   - Can be migrated later if needed

4. **useConnectionConfigForm.ts** (Out of scope - different form)
   - Connection settings form
   - Can be migrated later if needed

### RHF Dependencies

**package.json:**
```json
{
  "react-hook-form": "^7.71.0",
  "@hookform/resolvers": "^3.3.4",
  "zod": "^3.22.4"
}
```

**Bundle size impact:**
- react-hook-form: ~25KB gzipped
- @hookform/resolvers: ~2KB gzipped
- zod: ~12KB gzipped
- **Total: ~39KB gzipped**

## Phase 3 Scope

### In Scope
✅ useSensorConfigForm.ts - Replace RHF with plain React state
✅ SensorConfigDialog.tsx - Remove RHF dependencies
✅ Validation logic - Implement direction-aware validation
✅ Form state management - useState/useReducer

### Out of Scope
❌ useUnitsConfigForm.ts - Keep RHF for now
❌ useConnectionConfigForm.ts - Keep RHF for now
❌ Remove RHF/Zod from package.json - Keep for other forms

**Rationale:** Incremental migration reduces risk. If Phase 3 successful, can migrate other forms in future.

## Proposed Plain State Architecture

### Form State Management

**Replace RHF with plain React state:**

```typescript
interface FormState {
  name: string;
  enabled: boolean;
  context: string;
  selectedMetric: string;
  criticalValue: number | undefined;
  warningValue: number | undefined;
  criticalSoundPattern: string;
  warningSoundPattern: string;
}

interface FormErrors {
  name?: string;
  criticalValue?: string;
  warningValue?: string;
}

// Instead of RHF useForm():
const [formState, setFormState] = useState<FormState>(initialState);
const [formErrors, setFormErrors] = useState<FormErrors>({});
const [isDirty, setIsDirty] = useState(false);
```

### Validation Logic

**Replace Zod schema with plain validation:**

```typescript
const validateForm = useCallback((state: FormState, direction: 'above' | 'below'): FormErrors => {
  const errors: FormErrors = {};
  
  // Direction-aware threshold validation
  if (state.warningValue !== undefined && state.criticalValue !== undefined) {
    if (direction === 'above') {
      if (state.warningValue >= state.criticalValue) {
        errors.warningValue = 'Warning threshold must be less severe than critical threshold';
      }
    } else {
      if (state.warningValue <= state.criticalValue) {
        errors.warningValue = 'Warning threshold must be less severe than critical threshold';
      }
    }
  }
  
  return errors;
}, []);
```

### Form API Replacement

**Replace RHF UseFormReturn with custom interface:**

```typescript
export interface FormAPI {
  // Form state (replaces form.watch())
  values: FormState;
  errors: FormErrors;
  isDirty: boolean;
  
  // Field setters (replaces form.setValue())
  setName: (value: string) => void;
  setEnabled: (value: boolean) => void;
  setContext: (value: string) => void;
  setSelectedMetric: (value: string) => void;
  setCriticalValue: (value: number | undefined) => void;
  setWarningValue: (value: number | undefined) => void;
  setCriticalSoundPattern: (value: string) => void;
  setWarningSoundPattern: (value: string) => void;
  
  // Form actions (replaces form.handleSubmit(), form.reset())
  handleSubmit: (onValid: (data: FormState) => void) => void;
  reset: (newState?: Partial<FormState>) => void;
  validate: () => boolean;
}

export interface UseSensorConfigFormReturn {
  form: FormAPI; // Changed from UseFormReturn
  enrichedThresholds: EnrichedThresholdInfo | null;
  currentMetricValue: string | undefined;
  handlers: {
    handleMetricChange: (newMetric: string) => void;
    handleEnabledChange: (value: boolean) => void;
    handleInstanceSwitch: (newInstance: number) => Promise<void>;
    handleSensorTypeSwitch: (newType: SensorType) => Promise<void>;
    handleClose: () => Promise<boolean>;
    handleTestSound: (soundPattern: string) => Promise<void>;
  };
  computed: {
    // ... existing computed values
  };
}
```

### Benefits of Plain State

1. **Bundle Size Reduction:**
   - Remove ~39KB gzipped (RHF + resolvers + Zod)
   - Lighter app bundle for mobile devices

2. **Simpler Mental Model:**
   - No RHF magic - plain React patterns
   - Easier to debug and understand
   - More predictable state updates

3. **Better Performance:**
   - No RHF proxy wrapper overhead
   - Direct state updates
   - Simpler re-render logic

4. **More Control:**
   - Custom validation logic
   - Direct access to state
   - No schema compilation overhead

## Implementation Strategy

### Step 1: Create Form State Hooks

Create internal hooks for state management:

```typescript
// Internal hook: Form state management
const useFormState = (initialValues: FormState) => {
  const [state, setState] = useState(initialValues);
  const [initialState, setInitialState] = useState(initialValues);
  const [errors, setErrors] = useState<FormErrors>({});
  
  const isDirty = useMemo(() => {
    return JSON.stringify(state) !== JSON.stringify(initialState);
  }, [state, initialState]);
  
  return { state, setState, initialState, setInitialState, errors, setErrors, isDirty };
};
```

### Step 2: Implement Field Setters

Create type-safe setter functions:

```typescript
const setters = useMemo(() => ({
  setName: (value: string) => setState(prev => ({ ...prev, name: value })),
  setEnabled: (value: boolean) => setState(prev => ({ ...prev, enabled: value })),
  setContext: (value: string) => setState(prev => ({ ...prev, context: value })),
  // ... other setters
}), []);
```

### Step 3: Implement Validation

Replace Zod schema with plain validation:

```typescript
const validate = useCallback(() => {
  const newErrors = validateForm(state, alarmConfig?.direction || 'below');
  setErrors(newErrors);
  return Object.keys(newErrors).length === 0;
}, [state, alarmConfig]);
```

### Step 4: Update Form API

Create FormAPI object to replace UseFormReturn:

```typescript
const formAPI: FormAPI = useMemo(() => ({
  values: state,
  errors,
  isDirty,
  ...setters,
  handleSubmit: (onValid) => {
    if (validate()) {
      onValid(state);
    }
  },
  reset: (newState) => {
    const resetState = newState ? { ...initialState, ...newState } : initialState;
    setState(resetState);
    setInitialState(resetState);
    setErrors({});
  },
  validate,
}), [state, errors, isDirty, setters, validate, initialState]);
```

### Step 5: Update SensorConfigDialog

Remove RHF dependencies:

```typescript
// OLD (RHF):
const criticalValue = useWatch({ control: form.control, name: 'criticalValue' });

// NEW (Plain state):
const criticalValue = form.values.criticalValue;
```

```typescript
// OLD (RHF):
<PlatformTextInput
  {...form.register('name')}
  value={form.watch('name')}
  onChangeText={(value) => form.setValue('name', value)}
/>

// NEW (Plain state):
<PlatformTextInput
  value={form.values.name}
  onChangeText={form.setName}
/>
```

## Migration Checklist

### Implementation Steps

- [ ] Step 1: Create `useFormState` internal hook
- [ ] Step 2: Implement field setters
- [ ] Step 3: Implement validation logic
- [ ] Step 4: Create FormAPI interface
- [ ] Step 5: Update useSensorConfigForm to use plain state
- [ ] Step 6: Update SensorConfigDialog to use new API
- [ ] Step 7: Remove RHF imports (keep Zod/resolvers for other forms)
- [ ] Step 8: Testing and validation

### Testing Checklist

- [ ] Form initialization with saved config
- [ ] Field updates trigger re-renders correctly
- [ ] Validation works (direction-aware thresholds)
- [ ] Save functionality works (onSubmit)
- [ ] Reset functionality works
- [ ] Dirty state tracking works
- [ ] Instance switching preserves form state
- [ ] Sensor type switching preserves form state
- [ ] Error messages display correctly

## Risks and Mitigations

**Risk 1: Breaking Changes in Form API**
- Mitigation: Maintain similar interface to RHF (form.values vs form.watch())
- Consumer (SensorConfigDialog) only needs minor updates

**Risk 2: Missing RHF Features**
- RHF has many advanced features (field arrays, nested validation, etc.)
- Mitigation: useSensorConfigForm uses simple flat structure, no advanced features needed

**Risk 3: Performance Regression**
- RHF optimizes re-renders with proxies
- Mitigation: Use React.memo and useMemo for computed values, measure before/after

**Risk 4: Validation Edge Cases**
- Zod schema has many built-in validators
- Mitigation: useSensorConfigForm has simple validation (threshold comparison only)

## Success Criteria

✅ **Zero Breaking Changes:**
- All form functionality works unchanged
- SensorConfigDialog requires minimal updates

✅ **Code Simplification:**
- Remove ~100 lines of RHF boilerplate
- Simpler validation logic
- More readable code

✅ **Bundle Size Reduction:**
- RHF/Zod still in bundle (used by other forms)
- But useSensorConfigForm no longer imports them
- Tree-shaking may reduce bundle slightly

✅ **Performance Neutral or Better:**
- No regression in form responsiveness
- Measure render counts before/after

## Rollback Plan

If critical issues discovered:

1. **Revert commits:**
   ```bash
   git revert <Phase 3 commits>
   ```

2. **RHF remains in dependencies:**
   - Other forms still use RHF
   - No package.json changes needed

3. **Tag before Phase 3:**
   ```bash
   git tag pre-phase-3-rhf-removal
   ```

## Estimated Impact

**Lines Changed:**
- useSensorConfigForm.ts: -150 RHF logic, +120 plain state = -30 lines
- SensorConfigDialog.tsx: -10 lines (simpler field access)

**Net: -40 lines** (5% reduction in form-related code)

**Bundle Size:** ~39KB gzipped (no change - RHF still used by other forms)

**Time Estimate:** 2-3 hours implementation + 1 hour testing

## Next Steps After Phase 3

**Phase 4: Migrate Other Forms (Optional)**
- useUnitsConfigForm.ts
- useConnectionConfigForm.ts
- Then remove RHF/Zod from package.json

**Phase 5: Testing & Documentation**
- Comprehensive testing
- Performance benchmarks
- Update architectural docs

---

**Phase 3 Status:** Planning Complete - Ready for Implementation  
**Estimated Time:** 2-3 hours implementation + 1 hour testing  
**Breaking Changes:** Minimal (FormAPI interface slightly different)
