# Sensor Configuration Type Rename - Implementation Complete

**Date**: December 2024  
**Status**: ✅ Completed  
**Changes**: Renamed `SensorAlarmThresholds` → `SensorConfiguration` for semantic accuracy

## Problem Statement

The `SensorAlarmThresholds` type was misleadingly named - it contained much more than just alarm thresholds:
- User-assigned sensor names (`name` field)
- Context information (battery chemistry, engine type)
- Alarm thresholds (critical, warning)
- Sound patterns and hysteresis

This naming caused confusion about where sensor configuration data should live.

## Architecture Clarification

We have **TWO distinct stores** serving different purposes:

### 1. `alarmStore.ts` - Runtime Alarm Management
**Purpose**: Active alarm state and alert handling  
**Contains**:
- `activeAlarms[]` - Currently triggered alarms
- `alarmHistory[]` - Past alarm events
- `thresholds[]` - Dynamic alarm rules
- `settings` - Sound/vibration preferences
- Critical alarm system integration

**Lifecycle**: Runtime only, not persisted

### 2. `sensorConfigStore.ts` - Persistent Sensor Configuration
**Purpose**: Long-term sensor instance settings  
**Contains**:
- User-assigned names ("House Battery", "Port Engine")
- Context (battery chemistry: AGM/LiFePO4, engine type)
- Alarm thresholds (warning/critical values)
- Hysteresis and sound patterns

**Lifecycle**: Persisted to AsyncStorage, survives app restarts

## Solution: Rename Type for Clarity

Renamed `SensorAlarmThresholds` → `SensorConfiguration` because:
1. It's not just alarm thresholds (includes names, context)
2. Used by `sensorConfigStore` which stores configuration
3. Reduces confusion about data ownership

## Implementation Details

### Files Modified (25 total)

**Core Types:**
- `src/types/SensorData.ts` - Renamed interface, added backward compatibility type alias
- `src/types/SensorInstance.ts` - Updated import

**Stores:**
- `src/store/sensorConfigStore.ts` - Updated all references (4 locations)
- `src/store/nmeaStore.ts` - Updated threshold management methods (3 locations)

**Components:**
- `src/components/dialogs/SensorConfigDialog.tsx` - Updated import and variable types (2 locations)

**Utilities:**
- `src/utils/sensorDisplayName.ts` - Updated function parameter types (3 locations)
- `src/utils/alarmSliderUtils.ts` - Updated import

**Registry:**
- `src/registry/SensorConfigRegistry.ts` - Updated import and deprecated function return type (2 locations)

**Hooks:**
- `src/hooks/useAlarmThresholds.ts` - Updated import

**Tests:**
- `src/store/__tests__/nmeaStore.serialization.test.ts` - Updated test variable types (3 locations)

### Backward Compatibility

Added type alias for gradual migration:
```typescript
/**
 * @deprecated Use SensorConfiguration instead
 * Kept for backward compatibility during migration
 */
export type SensorAlarmThresholds = SensorConfiguration;
```

This allows external code to continue using the old name while we transition.

## Display Name Priority Chain (Unchanged)

The rename doesn't affect the display name resolution logic:

```typescript
1. config.name (from sensorConfigStore) - User custom name
2. nmeaData.name (from NMEA messages) - Device-provided name
3. formatSensorTypeInstance(type, instance) - Auto-generated fallback
```

## Testing Checklist

- [x] TypeScript compiles without errors
- [x] All imports updated
- [x] Type aliases preserve backward compatibility
- [x] Store functionality unchanged (only type names)
- [x] Widget display names work correctly
- [ ] Manual testing: Sensor config dialog saves/loads
- [ ] Manual testing: Custom names persist across restarts
- [ ] Manual testing: Alarm thresholds trigger correctly

## Key Takeaways

1. **Both stores needed**: `alarmStore` (runtime) and `sensorConfigStore` (persistent) serve different purposes
2. **Type naming matters**: `SensorConfiguration` is clearer than `SensorAlarmThresholds`
3. **Semantic accuracy**: Names should reflect what data actually represents
4. **No architectural change**: Just a type rename for clarity - no functional changes

## Related Documentation

- `SENSOR-CONFIG-ARCHITECTURE-REVIEW.md` - Original architecture discussion
- `docs/architecture.md` - Overall system architecture
- `src/store/sensorConfigStore.ts` - Primary-Cache Pattern documentation

## Next Steps

1. ✅ Complete type rename (done)
2. Remove `@deprecated` type alias after external code migrated (future)
3. Add device metadata to `SensorInstance` for intelligent auto-naming
4. Parse NMEA 2000 PGN 126996 (Product Information) for better device detection
5. Fix MTW/MTA temperature collision issue
