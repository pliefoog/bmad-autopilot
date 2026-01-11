# NMEA Critical Issues - Implementation Action Plan

**Date:** January 2026  
**Total Effort:** ~5-6 hours  
**Blocking:** Production release

---

## Issue #1: Multi-Metric Threshold Management

### Current State
```typescript
// nmeaStore.ts:165-190
getSensorThresholds: (sensorType, instance) => {
  const sensorInstance = this.sensorDataRegistry.get(sensorType, instance);
  if (!sensorInstance) return { warning: null, critical: null };
  
  // ⚠️ PROBLEM: Only works with first metric
  const metricKeys = sensorInstance.getMetricKeys();
  const firstMetric = metricKeys[0]; // TODO: Support multi-metric threshold access
  
  return (sensorInstance as any)._thresholds.get(firstMetric);
}
```

### Root Cause
- Settings dialog calls `getSensorThresholds(sensorType, instance)` without metric selector
- Store method defaults to `metricKeys[0]`
- For wind sensor (3 metrics), only wind speed thresholds are accessible
- For battery (3 metrics), only voltage thresholds are accessible

### Solution Steps

**Step 1: Update nmeaStore.ts API**
```typescript
getSensorThresholds: (sensorType, instance, metricKey?) => {
  const sensorInstance = this.sensorDataRegistry.get(sensorType, instance);
  if (!sensorInstance) return { warning: null, critical: null };
  
  // Use provided metricKey or default to first metric
  const targetMetricKey = metricKey || sensorInstance.getMetricKeys()[0];
  return (sensorInstance as any)._thresholds.get(targetMetricKey);
}

updateSensorThresholds: (sensorType, instance, thresholds, metricKey?) => {
  const sensorInstance = this.sensorDataRegistry.get(sensorType, instance);
  if (!sensorInstance) return;
  
  // Use provided metricKey or default to first metric
  const targetMetricKey = metricKey || sensorInstance.getMetricKeys()[0];
  (sensorInstance as any)._thresholds.set(targetMetricKey, thresholds);
}
```

**Step 2: Update Settings Dialog**
Find: `src/components/dialogs/settings/`
- Add metric selector dropdown for multi-metric sensors
- Pass selected metric to store methods
- Show metric name + current thresholds

**Step 3: Test Cases**
```typescript
// Test 1: Wind sensor - set speed threshold independently
const speedThresholds = { warning: 20, critical: 30 };
store.updateSensorThresholds('wind', 0, speedThresholds, 'speed');
expect(store.getSensorThresholds('wind', 0, 'speed')).toEqual(speedThresholds);

// Test 2: Wind sensor - set direction threshold independently
const directionThresholds = { warning: null, critical: null };
store.updateSensorThresholds('wind', 0, directionThresholds, 'direction');
expect(store.getSensorThresholds('wind', 0, 'direction')).toEqual(directionThresholds);

// Test 3: Backward compatibility - default to first metric
store.updateSensorThresholds('wind', 0, speedThresholds); // No metricKey
expect(store.getSensorThresholds('wind', 0)).toEqual(speedThresholds);
```

---

## Issue #2: Depth Data Validation

### Current State - PROBLEM PATTERN
```typescript
private processDBT(message: ParsedNmeaMessage, timestamp: number): ProcessingResult {
  const fields = message.fields;
  const depthValue = parseFloat(fields.depthFeet); // ⚠️ No NaN check
  
  if (depthValue < 0) { // NaN < 0 is false - NaN passes through!
    return { success: false, errors: ['Negative depth invalid'] };
  }
  
  const depthRounded = Math.round(depthValue * 100) / 100; // NaN rounds to NaN
  // Stores: { depth: NaN, depthBelowTransducer: NaN }
}
```

### Correct Pattern (from VWR)
```typescript
private processVWR(message: ParsedNmeaMessage, timestamp: number): ProcessingResult {
  const windSpeed = parseFloat(fields.windSpeed);
  const windAngle = parseFloat(fields.windAngle);
  
  // ✅ CORRECT: Validates NaN first
  if (isNaN(windSpeed) || isNaN(windAngle)) {
    return { success: false, errors: ['Invalid wind data'] };
  }
  
  if (windAngle < 0 || windAngle > 360) {
    return { success: false, errors: ['Wind angle out of range'] };
  }
}
```

### Solution Steps

**Step 1: Add Validation Helper to NmeaSensorProcessor**
```typescript
/**
 * Validate and parse numeric field with range checking
 * @param value - String value to parse
 * @param fieldName - Name for error messages
 * @param options - { min?, max?, required? }
 * @returns { valid: boolean, value: number, error?: string }
 */
private validateNumber(
  value: string | undefined,
  fieldName: string,
  options: { min?: number; max?: number; required?: boolean } = {}
): { valid: boolean; value: number; error?: string } {
  const { min, max, required = true } = options;
  
  // Handle missing values
  if (value === undefined || value === '') {
    if (required) {
      return { valid: false, value: NaN, error: `${fieldName} is required but missing` };
    }
    return { valid: true, value: NaN, error: undefined };
  }
  
  // Parse number
  const num = parseFloat(value);
  if (isNaN(num)) {
    return { valid: false, value: NaN, error: `${fieldName} is not a valid number (received: "${value}")` };
  }
  
  // Validate range
  if (min !== undefined && num < min) {
    return { valid: false, value: num, error: `${fieldName} is below minimum ${min} (received: ${num})` };
  }
  
  if (max !== undefined && num > max) {
    return { valid: false, value: num, error: `${fieldName} is above maximum ${max} (received: ${num})` };
  }
  
  return { valid: true, value: num, error: undefined };
}
```

**Step 2: Apply to Depth Processors**
```typescript
private processDBT(message: ParsedNmeaMessage, timestamp: number): ProcessingResult {
  const feetValidation = this.validateNumber(
    message.fields.depthFeet,
    'Depth (feet)',
    { min: 0 } // No negative depths
  );
  
  if (!feetValidation.valid) {
    return { success: false, errors: [feetValidation.error!], messageType: 'DBT' };
  }
  
  const metersValidation = this.validateNumber(
    message.fields.depthMeters,
    'Depth (meters)',
    { min: 0 }
  );
  
  if (!metersValidation.valid) {
    return { success: false, errors: [metersValidation.error!], messageType: 'DBT' };
  }
  
  // Both validated - safe to use
  const depthRounded = Math.round(feetValidation.value * 100) / 100;
  
  return {
    success: true,
    updates: [
      {
        sensorType: 'depth',
        instance: 0,
        data: {
          depth: depthRounded,
          depthBelowTransducer: depthRounded,
          timestamp,
        },
      },
    ],
    messageType: 'DBT',
  };
}
```

**Step 3: Apply Same Pattern to**
- `processDPT()` - Water depth below waterline
- `processDBK()` - Water depth below keel
- `processRPM()` - Engine RPM (add NaN check)
- `processGGA()` - GPS latitude/longitude (add explicit NaN check)

**Step 4: Test Cases**
```typescript
// Test 1: Valid depth message
const validMessage = {
  messageType: 'DBT',
  fields: { depthFeet: '25.5', depthMeters: '7.8' }
};
const result = processor.processDBT(validMessage, Date.now());
expect(result.success).toBe(true);
expect(result.updates[0].data.depth).toBe(25.5);

// Test 2: Missing depth value
const missingMessage = {
  messageType: 'DBT',
  fields: { depthFeet: '', depthMeters: '' }
};
const result = processor.processDBT(missingMessage, Date.now());
expect(result.success).toBe(false);
expect(result.errors).toContain('Depth (feet) is required but missing');

// Test 3: Non-numeric value
const invalidMessage = {
  messageType: 'DBT',
  fields: { depthFeet: 'abc', depthMeters: 'def' }
};
const result = processor.processDBT(invalidMessage, Date.now());
expect(result.success).toBe(false);
expect(result.errors).toContain('Depth (feet) is not a valid number');

// Test 4: Negative depth (physically impossible)
const negativeMessage = {
  messageType: 'DBT',
  fields: { depthFeet: '-10', depthMeters: '-3' }
};
const result = processor.processDBT(negativeMessage, Date.now());
expect(result.success).toBe(false);
expect(result.errors).toContain('Depth (feet) is below minimum 0');
```

---

## Issue #3: Unsupported NMEA Type Logging

### Current State
```typescript
processMessage(parsedMessage: ParsedNmeaMessage): ProcessingResult {
  // ... switch with 30+ cases ...
  default:
    result = {
      success: false,
      errors: [`Unsupported message type: ${parsedMessage.messageType}`],
      messageType: parsedMessage.messageType,
    };
    // ⚠️ NOT LOGGED - Silent failure
  }
  
  return result; // PureStoreUpdater will log at app level
}
```

### Solution Steps

**Step 1: Add Default Case Logging**
```typescript
default: {
  // Log unsupported message types for operational visibility
  // Users can enable with: enableLog('nmea.unsupported')
  log.nmea('Unsupported NMEA message type (handler not implemented)', () => ({
    messageType: parsedMessage.messageType,
    fieldsCount: Object.keys(parsedMessage.fields).length,
    talker: parsedMessage.fields.talker,
  }));
  
  result = {
    success: false,
    errors: [`Handler not implemented for message type: ${parsedMessage.messageType}`],
    messageType: parsedMessage.messageType,
  };
}
```

**Step 2: Optional - Add Statistics Tracking**
```typescript
private messageTypeStats = new Map<string, { count: number; lastSeen: number }>();

processMessage(parsedMessage: ParsedNmeaMessage): ProcessingResult {
  // Track message type statistics
  const stats = this.messageTypeStats.get(parsedMessage.messageType);
  this.messageTypeStats.set(parsedMessage.messageType, {
    count: (stats?.count || 0) + 1,
    lastSeen: Date.now(),
  });
  
  // ... rest of method ...
}

/**
 * Get statistics for all received message types
 * Useful for debugging and understanding NMEA data streams
 */
getMessageTypeStatistics() {
  return Array.from(this.messageTypeStats.entries())
    .map(([type, stats]) => ({ type, ...stats }))
    .sort((a, b) => b.count - a.count);
}
```

**Step 3: Test Cases**
```typescript
// Test 1: Supported message (RPM)
const rpmMessage = { messageType: 'RPM', fields: { /* ... */ } };
const result = processor.processMessage(rpmMessage);
expect(result.success).toBe(true); // or false if invalid, but recognized

// Test 2: Unsupported message (GSA - Dilution of Precision)
const gsaMessage = { messageType: 'GSA', fields: { /* ... */ } };
const result = processor.processMessage(gsaMessage);
expect(result.success).toBe(false);
expect(result.errors[0]).toContain('Handler not implemented');

// Test 3: Statistics tracking
const processor = new NmeaSensorProcessor();
processor.processMessage({ messageType: 'RPM', fields: { /* ... */ } });
processor.processMessage({ messageType: 'DBT', fields: { /* ... */ } });
processor.processMessage({ messageType: 'GSA', fields: { /* ... */ } });
const stats = processor.getMessageTypeStatistics();
expect(stats).toContainEqual({ type: 'RPM', count: 1, lastSeen: expect.any(Number) });
expect(stats).toContainEqual({ type: 'GSA', count: 1, lastSeen: expect.any(Number) });
```

---

## Implementation Sequence

### Phase 1: Data Validation (No Breaking Changes)
1. Add `validateNumber` helper to NmeaSensorProcessor
2. Update `processDBT`, `processDPT`, `processDBK` 
3. Update `processRPM`, `processGGA`
4. Test with malformed NMEA messages

**Effort:** ~2.25 hours  
**Risk:** LOW (adds validation, doesn't break valid messages)

### Phase 2: Logging (No Breaking Changes)
1. Add logging to unsupported message type default case
2. Add message type statistics tracking
3. Test with GSA/GBS/RMA messages

**Effort:** ~30 minutes  
**Risk:** LOW (only adds logging/diagnostics)

### Phase 3: Threshold Management (UI Changes)
1. Update nmeaStore API to accept metricKey parameter
2. Find and update Settings dialog component
3. Add metric selector dropdown
4. Test with wind/battery sensors

**Effort:** ~2 hours  
**Risk:** MEDIUM (changes UI/API, but backward compatible)

---

## Validation Checklist

Before merging each fix:

**Phase 1 - Validation:**
- [ ] Add validateNumber helper to NmeaSensorProcessor
- [ ] Apply to processDBT (check fields, min/max)
- [ ] Apply to processDPT (check fields, min/max)
- [ ] Apply to processDBK (check fields, min/max)
- [ ] Apply to processRPM (add NaN check after parseFloat)
- [ ] Apply to processGGA (add NaN check for lat/lon)
- [ ] Test with valid depth messages
- [ ] Test with empty fields (malformed)
- [ ] Test with non-numeric values
- [ ] Test with negative values
- [ ] Test with range violations
- [ ] Verify error messages are logged

**Phase 2 - Logging:**
- [ ] Add log.nmea() call to default case
- [ ] Test unsupported message generates log entry
- [ ] Add message type statistics method
- [ ] Test statistics tracking works
- [ ] Verify existing tests still pass

**Phase 3 - Thresholds:**
- [ ] Update nmeaStore.ts getSensorThresholds signature
- [ ] Update nmeaStore.ts updateSensorThresholds signature
- [ ] Find Settings dialog component
- [ ] Add metric selector dropdown
- [ ] Test backward compatibility (no metricKey = first metric)
- [ ] Test with wind sensor (set speed and direction thresholds separately)
- [ ] Test with battery sensor (set voltage and current thresholds separately)
- [ ] Verify UI shows metric name + current thresholds
- [ ] Test that threshold updates persist

---

## Success Criteria

✅ **All three issues fixed:**
1. Multi-metric thresholds work for wind, battery, temperature sensors
2. Malformed NMEA messages are rejected with clear error messages
3. Unsupported NMEA types are logged for operational visibility

✅ **No regressions:**
- All existing tests pass
- Valid NMEA messages still process correctly
- Alarm evaluation still works
- Settings dialog still functional (with enhancements)

✅ **Code quality:**
- New validation logic is testable
- Error messages are user-friendly
- Logging is conditional (no performance impact)
- Backward compatibility maintained

---

## File Locations for Implementation

| File | Change | Effort |
|------|--------|--------|
| `NmeaSensorProcessor.ts` | Add validateNumber helper, apply to 5 processors, add logging | 2.5h |
| `nmeaStore.ts` | Update getSensorThresholds/updateSensorThresholds API | 15 min |
| `src/components/dialogs/settings/*` | Add metric selector, update UI | 1.5h |
| Tests | Add validation + threshold test cases | 1h |

---

**Total Implementation Time:** ~5-6 hours  
**Ready for:** Immediate implementation after review
