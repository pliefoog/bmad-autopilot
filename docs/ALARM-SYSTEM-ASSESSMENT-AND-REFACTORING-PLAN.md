# Alarm System Assessment and Refactoring Plan

**Date:** December 15, 2025  
**Status:** Assessment Complete - Awaiting Approval

---

## Executive Summary

The current alarm system has a **dual architecture** with significant redundancy and architectural inconsistencies. Your proposal for warning/alarm thresholds with hysteresis and intelligent defaults is **sound and necessary**, but requires careful refactoring to consolidate the existing systems.

**Key Findings:**
- ✅ Strong foundation with per-instance sensor thresholds
- ⚠️ Dual alarm systems creating confusion (alarmStore vs sensor-based)
- ❌ Missing warning-level support (only alarm thresholds exist)
- ❌ No hysteresis implementation (flickering alarms)
- ❌ No battery chemistry awareness
- ❌ Inadequate persistence strategy
- ✅ Good UI framework (AlarmConfigDialog)

**Recommendation:** **Proceed with refactoring** - consolidate to sensor-based alarm system with warning/alarm/hysteresis support.

---

## 1. Current Implementation Analysis

### 1.1 Architecture Overview

The system has **TWO parallel alarm architectures:**

#### **Architecture A: Sensor-Based Alarms** (Preferred)
- **Location:** `src/types/SensorData.ts` - `SensorAlarmThresholds` interface
- **Storage:** Per-instance in sensor objects (`nmeaData.sensors[type][instance].alarmThresholds`)
- **Defaults:** `src/registry/AlarmThresholdDefaults.ts` - Location-aware defaults
- **UI:** `src/components/dialogs/AlarmConfigDialog.tsx` - Per-instance configuration
- **Units:** SI units with presentation system conversion
- **Persistence:** Via `nmeaStore` (Zustand persist)

```typescript
interface SensorAlarmThresholds {
  min?: number;          // Minimum safe value (SI units)
  max?: number;          // Maximum safe value (SI units)
  warning?: number;      // Warning level (SI units) - EXISTS BUT NOT USED
  enabled: boolean;
  thresholdType: 'min' | 'max';
  audioEnabled?: boolean;
  soundPattern?: string;
  lastModified?: number;
}
```

#### **Architecture B: Central Alarm Store** (Legacy)
- **Location:** `src/store/alarmStore.ts` - Global alarm thresholds
- **Storage:** Central array of `AlarmThreshold[]`
- **Defaults:** Hardcoded in `alarmStore.ts`
- **Evaluation:** `evaluateThresholds()` function
- **Units:** Unclear - likely raw values
- **Persistence:** Via Zustand persist

```typescript
interface AlarmThreshold {
  id: string;
  name: string;
  dataPath: string; // e.g., 'depth', 'engine.coolantTemp'
  type: 'min' | 'max' | 'range';
  value: number;
  maxValue?: number;
  level: AlarmLevel; // 'info' | 'warning' | 'critical'
  enabled: boolean;
  hysteresis?: number; // EXISTS BUT NOT IMPLEMENTED
}
```

### 1.2 How Defaults Are Defined

#### **Sensor-Based Defaults** (✅ Well-Implemented)

**File:** [src/registry/AlarmThresholdDefaults.ts](boatingInstrumentsApp/src/registry/AlarmThresholdDefaults.ts)

**Strengths:**
- ✅ Location-aware defaults (e.g., `temperature.engine` vs `temperature.cabin`)
- ✅ Sensor-type specific (e.g., `tank.fuel` vs `tank.waste`)
- ✅ SI unit storage
- ✅ Logical grouping by metric

**Example:**
```typescript
temperature: {
  engine: {
    min: 40,      // Engine too cold
    warning: 85,  // High temp warning
    max: 95,      // Critical overheat
    enabled: true,
    thresholdType: 'max' as const,
  },
  refrigeration: {
    min: -20,
    warning: -10,
    max: 10,
    enabled: true,
  },
}
```

**Weaknesses:**
- ❌ No battery chemistry consideration (Lead/AGM vs LiFePO4)
- ❌ `warning` field exists but not used in evaluation logic
- ❌ No relative threshold support (e.g., "warning = 25% of alarm")
- ❌ No hysteresis values in defaults

#### **Central Store Defaults** (⚠️ Redundant)

**File:** [src/store/alarmStore.ts](boatingInstrumentsApp/src/store/alarmStore.ts#L90-L160)

**Issues:**
- ❌ Duplicates sensor-based defaults
- ❌ Less granular (no location awareness)
- ❌ Hardcoded alarm IDs (`'shallow-water'`, `'engine-temp-high'`)
- ❌ Hysteresis field exists but not used

### 1.3 UI Configuration

**File:** [src/components/dialogs/AlarmConfigDialog.tsx](boatingInstrumentsApp/src/components/dialogs/AlarmConfigDialog.tsx)

**Strengths:**
- ✅ Per-instance configuration with tabs
- ✅ Location-aware defaults initialization
- ✅ SI unit storage with presentation system display conversion
- ✅ Auto-save on value change
- ✅ Critical sensor disable confirmation
- ✅ Sound pattern testing

**Current UI Fields:**
```
- Enabled toggle
- Threshold Type: Min/Max
- Min Value (SI units, converted for display)
- Max Value (SI units, converted for display)  
- Warning Value (EXISTS IN UI but not fully implemented)
- Audio Enabled toggle
- Sound Pattern picker
```

**Weaknesses:**
- ❌ Warning value input shown but not evaluated in alarm logic
- ❌ No hysteresis configuration UI
- ❌ No relative threshold support (e.g., "%")
- ❌ No battery chemistry selector

### 1.4 Storage Mechanism

#### **Sensor-Based Storage** (✅ Active)

**Store:** [src/store/nmeaStore.ts](boatingInstrumentsApp/src/store/nmeaStore.ts)

```typescript
nmeaData: {
  sensors: {
    depth: {
      0: {
        name: "Depth Sounder",
        depth: 5.2,
        alarmThresholds: {
          min: 2.0,
          warning: 2.5,
          max: undefined,
          enabled: true,
          thresholdType: 'min',
          audioEnabled: true,
          soundPattern: 'rapid_pulse',
          lastModified: 1702560000000
        }
      }
    }
  }
}
```

**Persistence:**
- ✅ Zustand persist middleware
- ✅ Per-instance granularity
- ✅ Survives app restart
- ⚠️ **BUT:** Sensor instances are volatile (disappear when NMEA data stops)

**Problem:** If a sensor disconnects, the instance is removed from the store, **losing all threshold configuration**. This is the core issue you identified.

#### **Central Alarm Store Storage** (⚠️ Parallel)

**Store:** [src/store/alarmStore.ts](boatingInstrumentsApp/src/store/alarmStore.ts)

```typescript
thresholds: [
  {
    id: 'shallow-water',
    name: 'Shallow Water',
    dataPath: 'depth',
    type: 'min',
    value: 2.0,
    level: 'warning',
    enabled: true,
    hysteresis: 0.1
  }
]
```

**Persistence:**
- ✅ Zustand persist middleware
- ✅ Survives app restart
- ✅ Independent of sensor instances
- ❌ Not used by current UI
- ❌ Redundant with sensor-based storage

### 1.5 Evaluation Logic

**Current evaluation is ONLY in central alarm store:**

**File:** [src/store/alarmStore.ts:271](boatingInstrumentsApp/src/store/alarmStore.ts#L271-L357)

```typescript
evaluateThresholds: (data) => {
  state.thresholds.forEach(async (threshold) => {
    if (!threshold.enabled) return;
    
    const value = getNestedValue(data, threshold.dataPath);
    
    switch (threshold.type) {
      case 'min':
        shouldAlarm = value < threshold.value;
        break;
      case 'max':
        shouldAlarm = value > threshold.value;
        break;
    }
    
    // No hysteresis implementation
    // No warning level evaluation
    // Triggers alarm directly
  });
}
```

**Problems:**
- ❌ No hysteresis logic
- ❌ No warning vs alarm distinction
- ❌ Doesn't use sensor-based thresholds
- ❌ Simple boolean triggering (no state machine)

---

## 2. Proposal Evaluation

### 2.1 Your Requirements

| Requirement | Assessment | Notes |
|------------|------------|-------|
| **Warning + Alarm thresholds** | ✅ Essential | Prevents alarm fatigue |
| **Absolute thresholds** | ✅ Already supported | e.g., depth: 2.5m alarm, 3m warning |
| **Relative thresholds** | ✅ Good enhancement | e.g., "warning = 25% of alarm" for tanks |
| **Hysteresis** | ✅ **Critical** | Prevents in/out alarm flickering |
| **Per-metric configuration** | ✅ Correct approach | Not all metrics need warnings |
| **Intelligent defaults** | ✅ Essential | Chemistry-aware for batteries |
| **Battery chemistry awareness** | ✅ Excellent idea | Lead/AGM: 11.8V, LiFePO4: 12.8V |
| **Persistent storage** | ✅ **Must have** | Separate from volatile sensor instances |
| **UI configuration** | ✅ Already 80% done | Needs hysteresis + relative support |

### 2.2 Specific Use Cases

#### ✅ **Tank Level (Relative + Absolute)**
```
Fuel Tank:
- Alarm: 10% (relative) OR 5L (absolute)
- Warning: 25% (relative) OR 12L (absolute)
- Hysteresis: 2% (prevents 24.9% ↔ 25.1% bouncing)
```

#### ✅ **Depth (Absolute)**
```
Depth Sounder:
- Alarm: 2.5m (absolute)
- Warning: 3.0m (absolute)
- Hysteresis: 0.2m (prevents 2.9m ↔ 3.1m bouncing)
```

#### ✅ **Battery Voltage (Chemistry-Aware)**
```
Lead/AGM Battery (12V nominal):
- Critical: 11.8V
- Warning: 12.2V
- Hysteresis: 0.2V

LiFePO4 Battery (12.8V nominal):
- Critical: 12.8V (don't discharge below)
- Warning: 13.2V
- Hysteresis: 0.2V
```

#### ✅ **Engine Temperature (Warning-Only for Some)**
```
Engine Coolant:
- Alarm: 95°C
- Warning: 85°C
- Hysteresis: 3°C

Cabin Temperature (comfort only):
- Alarm: none
- Warning: 30°C
- Hysteresis: 2°C
```

### 2.3 Refinements to Your Proposal

#### **Threshold Type System**
Instead of absolute vs relative as separate concepts, use a unified model:

```typescript
interface ThresholdValue {
  type: 'absolute' | 'relative';
  value: number;
  unit?: string; // For display (%, L, m, V, etc.)
}

interface MetricThresholds {
  alarm?: ThresholdValue;
  warning?: ThresholdValue;
  hysteresis?: ThresholdValue;
  direction: 'above' | 'below'; // Which way is bad?
}
```

**Examples:**
```typescript
// Tank fuel level
{
  alarm: { type: 'relative', value: 0.10, unit: '%' },
  warning: { type: 'relative', value: 0.25, unit: '%' },
  hysteresis: { type: 'relative', value: 0.02 },
  direction: 'below'
}

// Depth
{
  alarm: { type: 'absolute', value: 2.5, unit: 'm' },
  warning: { type: 'absolute', value: 3.0, unit: 'm' },
  hysteresis: { type: 'absolute', value: 0.2, unit: 'm' },
  direction: 'below'
}

// Engine temp
{
  alarm: { type: 'absolute', value: 95, unit: '°C' },
  warning: { type: 'absolute', value: 85, unit: '°C' },
  hysteresis: { type: 'absolute', value: 3, unit: '°C' },
  direction: 'above'
}
```

#### **Battery Chemistry Support**
Add chemistry metadata to battery sensors:

```typescript
interface BatterySensorData extends BaseSensorData {
  voltage?: number;
  current?: number;
  stateOfCharge?: number;
  temperature?: number;
  chemistry?: 'lead-acid' | 'agm' | 'gel' | 'lifepo4' | 'lithium-ion'; // NEW
}
```

**Chemistry-aware defaults:**
```typescript
battery: {
  voltage: {
    'lead-acid': {
      alarm: { type: 'absolute', value: 11.8 },
      warning: { type: 'absolute', value: 12.2 },
    },
    'lifepo4': {
      alarm: { type: 'absolute', value: 12.8 },
      warning: { type: 'absolute', value: 13.2 },
    }
  }
}
```

---

## 3. Refactoring Plan

### 3.1 Strategic Approach

**Goal:** Consolidate to **sensor-based alarm system** with warning/alarm/hysteresis support.

**Rationale:**
- Sensor-based approach is more granular (per-instance)
- Better location awareness
- Already has UI support
- Cleaner architecture (thresholds live with data)

**Migration:** **Remove central alarm store** (alarmStore.ts) after refactoring.

### 3.2 New Data Model

#### **Enhanced SensorAlarmThresholds**

**File:** `src/types/SensorData.ts`

```typescript
/**
 * Threshold value with type discrimination
 */
export interface ThresholdValue {
  type: 'absolute' | 'relative';
  value: number;
  unit?: string; // Display unit (%, L, m, V, etc.)
}

/**
 * Complete alarm threshold configuration for a sensor metric
 */
export interface MetricAlarmConfig {
  // Core thresholds
  critical?: ThresholdValue;  // Renamed from "alarm" for clarity
  warning?: ThresholdValue;
  hysteresis?: ThresholdValue;
  
  // Threshold behavior
  direction: 'above' | 'below'; // Which direction triggers alarm?
  
  // Audio configuration
  audioEnabled: boolean;
  criticalSoundPattern?: string; // Sound for critical alarm
  warningSoundPattern?: string;  // Sound for warning (can be different)
  
  // Metadata
  enabled: boolean;
  lastModified: number;
}

/**
 * Per-sensor alarm configuration
 * Maps metric names to their alarm configs
 */
export interface SensorAlarmThresholds {
  // Metric-specific thresholds
  metrics: {
    [metricName: string]: MetricAlarmConfig;
  };
  
  // Sensor-level metadata
  batteryChemistry?: 'lead-acid' | 'agm' | 'gel' | 'lifepo4' | 'lithium-ion';
  tankCapacity?: number; // For relative calculations
  
  // State tracking
  currentState: {
    [metricName: string]: AlarmState;
  };
}

/**
 * Alarm state for hysteresis tracking
 */
export interface AlarmState {
  level: 'normal' | 'warning' | 'critical';
  lastTriggered?: number;
  triggerCount: number;
  acknowledged: boolean;
}
```

**Example:**
```typescript
// Depth sensor instance 0
{
  name: "Depth Sounder",
  depth: 5.2,
  alarmThresholds: {
    metrics: {
      depth: {
        critical: { type: 'absolute', value: 2.5, unit: 'm' },
        warning: { type: 'absolute', value: 3.0, unit: 'm' },
        hysteresis: { type: 'absolute', value: 0.2, unit: 'm' },
        direction: 'below',
        audioEnabled: true,
        criticalSoundPattern: 'rapid_pulse',
        warningSoundPattern: 'single_tone',
        enabled: true,
        lastModified: Date.now()
      }
    },
    currentState: {
      depth: {
        level: 'normal',
        triggerCount: 0,
        acknowledged: false
      }
    }
  }
}
```

### 3.3 Default Threshold System

#### **Enhanced AlarmThresholdDefaults**

**File:** `src/registry/AlarmThresholdDefaults.ts`

```typescript
/**
 * Metric-specific alarm configurations by sensor type and context
 */
export const ALARM_THRESHOLD_DEFAULTS = {
  depth: {
    default: {
      depth: { // Metric name
        critical: { type: 'absolute', value: 2.0, unit: 'm' },
        warning: { type: 'absolute', value: 2.5, unit: 'm' },
        hysteresis: { type: 'absolute', value: 0.2, unit: 'm' },
        direction: 'below',
        audioEnabled: true,
        criticalSoundPattern: 'rapid_pulse',
        warningSoundPattern: 'single_tone',
        enabled: true
      }
    }
  },
  
  battery: {
    voltage: {
      'lead-acid': {
        voltage: {
          critical: { type: 'absolute', value: 11.8, unit: 'V' },
          warning: { type: 'absolute', value: 12.2, unit: 'V' },
          hysteresis: { type: 'absolute', value: 0.2, unit: 'V' },
          direction: 'below',
          audioEnabled: true,
          enabled: true
        }
      },
      'lifepo4': {
        voltage: {
          critical: { type: 'absolute', value: 12.8, unit: 'V' },
          warning: { type: 'absolute', value: 13.2, unit: 'V' },
          hysteresis: { type: 'absolute', value: 0.2, unit: 'V' },
          direction: 'below',
          audioEnabled: true,
          enabled: true
        }
      }
    },
    stateOfCharge: {
      default: {
        stateOfCharge: {
          critical: { type: 'relative', value: 0.20, unit: '%' },
          warning: { type: 'relative', value: 0.50, unit: '%' },
          hysteresis: { type: 'relative', value: 0.02, unit: '%' },
          direction: 'below',
          audioEnabled: true,
          enabled: true
        }
      }
    }
  },
  
  tank: {
    fuel: {
      level: {
        critical: { type: 'relative', value: 0.10, unit: '%' },
        warning: { type: 'relative', value: 0.25, unit: '%' },
        hysteresis: { type: 'relative', value: 0.02, unit: '%' },
        direction: 'below',
        audioEnabled: true,
        enabled: true
      }
    },
    waste: {
      level: {
        critical: { type: 'relative', value: 0.90, unit: '%' },
        warning: { type: 'relative', value: 0.75, unit: '%' },
        hysteresis: { type: 'relative', value: 0.02, unit: '%' },
        direction: 'above', // Waste tanks alarm when TOO FULL
        audioEnabled: true,
        enabled: true
      }
    }
  },
  
  temperature: {
    engine: {
      value: { // "value" is the metric name for temperature sensors
        critical: { type: 'absolute', value: 95, unit: '°C' },
        warning: { type: 'absolute', value: 85, unit: '°C' },
        hysteresis: { type: 'absolute', value: 3, unit: '°C' },
        direction: 'above',
        audioEnabled: true,
        enabled: true
      }
    },
    cabin: {
      value: {
        warning: { type: 'absolute', value: 30, unit: '°C' }, // Warning only
        hysteresis: { type: 'absolute', value: 2, unit: '°C' },
        direction: 'above',
        audioEnabled: false, // Comfort alarm, no audio
        enabled: false // Disabled by default
      }
    }
  },
  
  engine: {
    rpm: {
      rpm: {
        critical: { type: 'absolute', value: 3600, unit: 'RPM' },
        warning: { type: 'absolute', value: 3300, unit: 'RPM' },
        hysteresis: { type: 'absolute', value: 100, unit: 'RPM' },
        direction: 'above',
        audioEnabled: true,
        enabled: true
      }
    },
    coolantTemp: {
      coolantTemp: {
        critical: { type: 'absolute', value: 95, unit: '°C' },
        warning: { type: 'absolute', value: 85, unit: '°C' },
        hysteresis: { type: 'absolute', value: 3, unit: '°C' },
        direction: 'above',
        audioEnabled: true,
        enabled: true
      }
    }
  }
};

/**
 * Get default thresholds for a sensor type, metric, and context
 */
export function getDefaultThresholds(
  sensorType: SensorType,
  metricName: string,
  context?: {
    location?: string;
    chemistry?: string;
    tankType?: string;
  }
): MetricAlarmConfig | undefined {
  // Implementation handles context-aware lookup
}
```

### 3.4 Persistent Alarm Configuration Store

**New File:** `src/store/alarmConfigStore.ts`

This store persists alarm configurations independently of sensor instances.

```typescript
/**
 * Alarm Configuration Store
 * 
 * Persists alarm threshold configurations independently of sensor instances.
 * When a sensor reconnects, its configuration is restored from here.
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { SensorType, MetricAlarmConfig } from '../types/SensorData';

/**
 * Persisted alarm configuration for a sensor instance
 */
interface SensorAlarmConfigEntry {
  sensorType: SensorType;
  instance: number;
  location?: string;
  batteryChemistry?: string;
  tankType?: string;
  tankCapacity?: number;
  metrics: {
    [metricName: string]: MetricAlarmConfig;
  };
  lastModified: number;
}

interface AlarmConfigState {
  configurations: Map<string, SensorAlarmConfigEntry>; // Key: "sensorType:instance"
}

interface AlarmConfigActions {
  // Save configuration for a sensor instance
  saveConfiguration: (
    sensorType: SensorType,
    instance: number,
    config: Partial<SensorAlarmConfigEntry>
  ) => void;
  
  // Get configuration for a sensor instance
  getConfiguration: (
    sensorType: SensorType,
    instance: number
  ) => SensorAlarmConfigEntry | undefined;
  
  // Apply stored configuration to a sensor instance in nmeaStore
  restoreConfiguration: (
    sensorType: SensorType,
    instance: number
  ) => void;
  
  // Remove configuration
  removeConfiguration: (
    sensorType: SensorType,
    instance: number
  ) => void;
  
  // Export/import for backup
  exportConfigurations: () => string;
  importConfigurations: (json: string) => void;
  
  reset: () => void;
}

export const useAlarmConfigStore = create<AlarmConfigState & AlarmConfigActions>()(
  persist(
    (set, get) => ({
      configurations: new Map(),
      
      saveConfiguration: (sensorType, instance, config) => {
        const key = `${sensorType}:${instance}`;
        const existing = get().configurations.get(key);
        
        const entry: SensorAlarmConfigEntry = {
          sensorType,
          instance,
          location: config.location || existing?.location,
          batteryChemistry: config.batteryChemistry || existing?.batteryChemistry,
          tankType: config.tankType || existing?.tankType,
          tankCapacity: config.tankCapacity || existing?.tankCapacity,
          metrics: {
            ...existing?.metrics,
            ...config.metrics
          },
          lastModified: Date.now()
        };
        
        set((state) => {
          const newConfigs = new Map(state.configurations);
          newConfigs.set(key, entry);
          return { configurations: newConfigs };
        });
      },
      
      getConfiguration: (sensorType, instance) => {
        const key = `${sensorType}:${instance}`;
        return get().configurations.get(key);
      },
      
      restoreConfiguration: (sensorType, instance) => {
        const config = get().getConfiguration(sensorType, instance);
        if (!config) return;
        
        // Apply to nmeaStore (imported dynamically to avoid circular deps)
        import('../store/nmeaStore').then(({ useNmeaStore }) => {
          useNmeaStore.getState().updateSensorThresholds(
            sensorType,
            instance,
            config
          );
        });
      },
      
      // ... other methods
    }),
    {
      name: 'alarm-config-storage',
      // Custom serializer for Map
      serialize: (state) => JSON.stringify({
        configurations: Array.from(state.configurations.entries())
      }),
      deserialize: (str) => {
        const parsed = JSON.parse(str);
        return {
          configurations: new Map(parsed.configurations)
        };
      }
    }
  )
);
```

### 3.5 Alarm Evaluation Engine

**New File:** `src/services/alarms/AlarmEvaluator.ts`

```typescript
/**
 * Alarm Evaluation Engine
 * 
 * Evaluates sensor values against thresholds with hysteresis.
 * Replaces the evaluateThresholds() logic in alarmStore.ts.
 */

import { 
  SensorType, 
  MetricAlarmConfig, 
  AlarmState, 
  ThresholdValue 
} from '../../types/SensorData';

export type AlarmLevel = 'normal' | 'warning' | 'critical';

export interface AlarmTrigger {
  sensorType: SensorType;
  instance: number;
  metric: string;
  value: number;
  level: AlarmLevel;
  thresholdValue: number;
  message: string;
  timestamp: number;
}

export class AlarmEvaluator {
  /**
   * Evaluate a metric value against its threshold configuration
   */
  static evaluate(
    value: number,
    config: MetricAlarmConfig,
    currentState: AlarmState,
    context?: {
      capacity?: number; // For relative thresholds
    }
  ): { level: AlarmLevel; triggered: boolean } {
    if (!config.enabled) {
      return { level: 'normal', triggered: false };
    }
    
    // Calculate actual threshold values (handle relative vs absolute)
    const criticalValue = this.resolveThreshold(config.critical, context);
    const warningValue = this.resolveThreshold(config.warning, context);
    const hysteresisValue = this.resolveThreshold(config.hysteresis, context) || 0;
    
    // Apply hysteresis to current state
    const hysteresisAdjustment = this.getHysteresisAdjustment(
      currentState.level,
      config.direction,
      hysteresisValue
    );
    
    // Determine new level with hysteresis
    const newLevel = this.determineLevel(
      value,
      criticalValue,
      warningValue,
      config.direction,
      hysteresisAdjustment
    );
    
    // Check if state changed
    const triggered = newLevel !== currentState.level;
    
    return { level: newLevel, triggered };
  }
  
  /**
   * Resolve threshold value (handle absolute vs relative)
   */
  private static resolveThreshold(
    threshold: ThresholdValue | undefined,
    context?: { capacity?: number }
  ): number | undefined {
    if (!threshold) return undefined;
    
    if (threshold.type === 'absolute') {
      return threshold.value;
    } else {
      // Relative - needs capacity context
      if (!context?.capacity) {
        console.warn('Relative threshold requires capacity context');
        return undefined;
      }
      return threshold.value * context.capacity;
    }
  }
  
  /**
   * Apply hysteresis adjustment based on current state
   */
  private static getHysteresisAdjustment(
    currentLevel: AlarmLevel,
    direction: 'above' | 'below',
    hysteresis: number
  ): number {
    if (currentLevel === 'normal') {
      return 0; // No adjustment when in normal state
    }
    
    // Adjust threshold to prevent immediate re-trigger
    // For "below" thresholds: add hysteresis when in alarm (need to rise higher to clear)
    // For "above" thresholds: subtract hysteresis when in alarm (need to fall lower to clear)
    return direction === 'below' ? hysteresis : -hysteresis;
  }
  
  /**
   * Determine alarm level with hysteresis
   */
  private static determineLevel(
    value: number,
    critical: number | undefined,
    warning: number | undefined,
    direction: 'above' | 'below',
    hysteresisAdjustment: number
  ): AlarmLevel {
    const adjustedCritical = critical !== undefined 
      ? critical + hysteresisAdjustment 
      : undefined;
    const adjustedWarning = warning !== undefined 
      ? warning + hysteresisAdjustment 
      : undefined;
    
    if (direction === 'below') {
      // Value going below threshold is bad
      if (adjustedCritical !== undefined && value < adjustedCritical) {
        return 'critical';
      }
      if (adjustedWarning !== undefined && value < adjustedWarning) {
        return 'warning';
      }
      return 'normal';
    } else {
      // Value going above threshold is bad
      if (adjustedCritical !== undefined && value > adjustedCritical) {
        return 'critical';
      }
      if (adjustedWarning !== undefined && value > adjustedWarning) {
        return 'warning';
      }
      return 'normal';
    }
  }
  
  /**
   * Create alarm trigger event
   */
  static createTrigger(
    sensorType: SensorType,
    instance: number,
    metric: string,
    value: number,
    level: AlarmLevel,
    config: MetricAlarmConfig
  ): AlarmTrigger {
    const thresholdValue = level === 'critical' 
      ? config.critical?.value 
      : config.warning?.value;
    
    const message = `${sensorType}[${instance}].${metric}: ${value.toFixed(2)} ${
      config.direction === 'below' ? 'below' : 'above'
    } ${level} threshold (${thresholdValue})`;
    
    return {
      sensorType,
      instance,
      metric,
      value,
      level,
      thresholdValue: thresholdValue || 0,
      message,
      timestamp: Date.now()
    };
  }
}
```

### 3.6 Integration with nmeaStore

**File:** `src/store/nmeaStore.ts` (modifications)

```typescript
// Add alarm evaluation to nmeaStore's sensor update logic

import { AlarmEvaluator } from '../services/alarms/AlarmEvaluator';
import { useAlarmConfigStore } from './alarmConfigStore';

// In sensor update logic (when new NMEA data arrives):
const updateSensorWithAlarmEvaluation = (
  sensorType: SensorType,
  instance: number,
  data: Partial<SensorData>
) => {
  // Update sensor data
  set((state) => {
    const sensor = state.nmeaData.sensors[sensorType][instance];
    
    // Evaluate alarms for each metric that has thresholds
    if (sensor?.alarmThresholds?.metrics) {
      Object.entries(sensor.alarmThresholds.metrics).forEach(([metric, config]) => {
        const value = (data as any)[metric];
        if (value === undefined) return;
        
        const currentState = sensor.alarmThresholds.currentState[metric] || {
          level: 'normal',
          triggerCount: 0,
          acknowledged: false
        };
        
        const { level, triggered } = AlarmEvaluator.evaluate(
          value,
          config,
          currentState,
          {
            capacity: sensor.alarmThresholds.tankCapacity
          }
        );
        
        // Update state
        if (triggered) {
          sensor.alarmThresholds.currentState[metric] = {
            level,
            lastTriggered: Date.now(),
            triggerCount: currentState.triggerCount + 1,
            acknowledged: false
          };
          
          // Trigger alarm event
          const trigger = AlarmEvaluator.createTrigger(
            sensorType,
            instance,
            metric,
            value,
            level,
            config
          );
          
          // Emit alarm (to UI, audio system, etc.)
          emitAlarm(trigger);
        }
      });
    }
    
    return { /* updated state */ };
  });
};

// On sensor connection, restore configuration
const onSensorConnected = (sensorType: SensorType, instance: number) => {
  useAlarmConfigStore.getState().restoreConfiguration(sensorType, instance);
};
```

### 3.7 UI Updates

**File:** `src/components/dialogs/AlarmConfigDialog.tsx` (enhancements)

**New UI Elements:**
- ✅ Metric selector (for multi-metric sensors like engine, battery)
- ✅ Warning threshold input (separate from alarm)
- ✅ Hysteresis configuration
- ✅ Threshold type selector (absolute/relative)
- ✅ Battery chemistry selector (for battery sensors)
- ✅ Tank capacity input (for relative thresholds)
- ✅ Direction selector (above/below)

**Example UI Layout:**
```
┌─ Engine Coolant Temperature (Instance 0) ────────┐
│                                                    │
│  Metric: [Coolant Temperature ▼]                 │
│                                                    │
│  ☑ Critical Alarm: 95 °C  [above ▼] this value  │
│  ☑ Warning:        85 °C  [above ▼] this value  │
│  ☑ Hysteresis:      3 °C  (prevents flickering)  │
│                                                    │
│  Audio:                                            │
│  ☑ Critical Sound: [Rapid Pulse ▼] [Test 🔊]     │
│  ☑ Warning Sound:  [Single Tone ▼] [Test 🔊]     │
│                                                    │
│  [Initialize Defaults]  [Save]  [Cancel]          │
└────────────────────────────────────────────────────┘

┌─ Fuel Tank (Instance 0) ──────────────────────────┐
│                                                    │
│  Tank Capacity: 100 L                             │
│  Metric: [Level ▼]                                │
│                                                    │
│  Threshold Type: ◉ Relative  ○ Absolute           │
│                                                    │
│  ☑ Critical Alarm: 10 %  [below ▼] this value    │
│  ☑ Warning:        25 %  [below ▼] this value    │
│  ☑ Hysteresis:      2 %  (prevents flickering)    │
│                                                    │
└────────────────────────────────────────────────────┘

┌─ Battery (Instance 0) ─────────────────────────────┐
│                                                    │
│  Chemistry: [LiFePO4 ▼]  (affects defaults)       │
│  Metric: [Voltage ▼]                              │
│                                                    │
│  ☑ Critical Alarm: 12.8 V  [below ▼] this value  │
│  ☑ Warning:        13.2 V  [below ▼] this value  │
│  ☑ Hysteresis:      0.2 V  (prevents flickering)  │
│                                                    │
└────────────────────────────────────────────────────┘
```

---

## 4. Files to Remove (Cleanup)

### 4.1 Delete After Migration

| File | Reason |
|------|--------|
| `src/store/alarmStore.ts` | Replaced by sensor-based + alarmConfigStore |
| `src/hooks/useAlarmThreshold.ts` | Overly complex, replaced by AlarmEvaluator |
| `src/services/alarms/AlarmConfigurationManager.ts` | Redundant functionality |

### 4.2 Keep and Enhance

| File | Purpose |
|------|---------|
| `src/types/SensorData.ts` | Core data types (enhanced) |
| `src/registry/AlarmThresholdDefaults.ts` | Default configurations (enhanced) |
| `src/components/dialogs/AlarmConfigDialog.tsx` | UI (enhanced) |
| `src/store/nmeaStore.ts` | Sensor data storage (alarm integration) |
| `src/store/alarmConfigStore.ts` | NEW - Persistent alarm config |
| `src/services/alarms/AlarmEvaluator.ts` | NEW - Evaluation engine |
| `src/services/alarms/MarineAudioAlertManager.ts` | Keep - Audio playback |

---

## 5. Implementation Phases

### Phase 1: Data Model & Storage (No Breaking Changes)
**Duration:** 2-3 days

- [ ] 1.1: Enhance `SensorData.ts` with new threshold interfaces
- [ ] 1.2: Create `alarmConfigStore.ts` for persistent configuration
- [ ] 1.3: Update `AlarmThresholdDefaults.ts` with new structure
- [ ] 1.4: Add battery chemistry field to `BatterySensorData`
- [ ] 1.5: Add tank capacity field to `TankSensorData`

**Testing:** Unit tests for threshold data structures

### Phase 2: Evaluation Engine
**Duration:** 3-4 days

- [ ] 2.1: Create `AlarmEvaluator.ts` with hysteresis logic
- [ ] 2.2: Implement absolute threshold evaluation
- [ ] 2.3: Implement relative threshold evaluation
- [ ] 2.4: Add warning/critical level distinction
- [ ] 2.5: Write comprehensive unit tests for all edge cases

**Testing:** 
- Unit tests for hysteresis behavior
- Test suite for warning/critical transitions
- Edge case testing (relative with missing capacity, etc.)

### Phase 3: nmeaStore Integration
**Duration:** 2-3 days

- [ ] 3.1: Integrate `AlarmEvaluator` into sensor update logic
- [ ] 3.2: Add configuration restoration on sensor connection
- [ ] 3.3: Implement alarm event emission
- [ ] 3.4: Add migration logic for existing threshold data

**Testing:**
- Integration tests with mock NMEA data
- Test alarm triggering and clearing
- Test configuration persistence across disconnects

### Phase 4: UI Enhancements
**Duration:** 4-5 days

- [ ] 4.1: Add metric selector for multi-metric sensors
- [ ] 4.2: Add warning threshold inputs
- [ ] 4.3: Add hysteresis configuration
- [ ] 4.4: Add threshold type selector (absolute/relative)
- [ ] 4.5: Add battery chemistry selector
- [ ] 4.6: Add tank capacity input
- [ ] 4.7: Update default initialization logic
- [ ] 4.8: Add visual indicators for warning vs critical states

**Testing:**
- UI component tests
- End-to-end flow testing
- Cross-platform compatibility (iOS/Android/Web)

### Phase 5: Migration & Cleanup
**Duration:** 2-3 days

- [ ] 5.1: Create data migration script for existing configurations
- [ ] 5.2: Remove `alarmStore.ts`
- [ ] 5.3: Remove `useAlarmThreshold.ts`
- [ ] 5.4: Remove `AlarmConfigurationManager.ts`
- [ ] 5.5: Update all imports and references
- [ ] 5.6: Remove unused code
- [ ] 5.7: Update documentation

**Testing:**
- Full regression testing
- Test migration path with existing user data

### Phase 6: Documentation & Polish
**Duration:** 1-2 days

- [ ] 6.1: Write user documentation for alarm configuration
- [ ] 6.2: Update code comments and JSDoc
- [ ] 6.3: Create developer guide for alarm system
- [ ] 6.4: Add inline help text in UI
- [ ] 6.5: Create demo scenarios for testing

**Total Estimated Duration:** 14-20 days

---

## 6. Risk Assessment

### Low Risk ✅
- Adding new data structures (backward compatible)
- Creating new stores (doesn't affect existing)
- UI enhancements (additive)

### Medium Risk ⚠️
- Integrating evaluation engine into nmeaStore (complexity)
- Data migration from old to new format (data loss risk)
- Hysteresis logic edge cases (requires thorough testing)

### High Risk ❌
- Removing old alarm store (breaking change)
- Changing threshold storage format (migration complexity)

### Mitigation Strategies
1. **Phased rollout** - Keep old system running until new is validated
2. **Data backup** - Export configurations before migration
3. **Comprehensive testing** - Unit + integration + E2E tests
4. **Feature flag** - Toggle between old/new system during transition
5. **Rollback plan** - Keep old code commented out until confident

---

## 7. Open Questions

1. **Alarm History:** Should we keep alarm history in the new system? Where?
   - **Recommendation:** Yes - add to `alarmConfigStore` with size limits

2. **Alarm Acknowledgment:** How to handle acknowledge per-instance vs per-metric?
   - **Recommendation:** Per-metric acknowledgment with UI grouping

3. **Sound Patterns:** Different sounds for warning vs critical?
   - **Recommendation:** Yes - less urgent sound for warnings

4. **Multi-Metric Alarms:** Can multiple metrics on one sensor trigger at once?
   - **Recommendation:** Yes - show all active alarms

5. **Remote Configuration:** Should alarm configs sync across devices?
   - **Recommendation:** Phase 2 feature - export/import JSON

6. **Alarm Escalation:** Warning → Critical auto-escalation?
   - **Recommendation:** No auto-escalation - user must configure both

---

## 8. Summary & Recommendation

### ✅ Your Proposal is **Sound and Well-Reasoned**

**Strengths:**
- Addresses real pain points (alarm fatigue, flickering)
- Intelligent defaults improve UX
- Chemistry-aware thresholds are essential
- Persistent storage solves critical issue

**Enhancements:**
- Unified threshold model (absolute/relative)
- Metric-granular configuration
- Hysteresis at threshold level

### 🎯 Recommended Path Forward

1. **Phase 1-2:** Implement new data model and evaluation engine (no UI changes)
2. **Phase 3:** Test thoroughly with existing UI
3. **Phase 4:** Enhance UI with new capabilities
4. **Phase 5:** Migrate data and remove old system
5. **Phase 6:** Polish and document

### 📊 Effort Estimate

- **Development:** 14-20 days
- **Testing:** 5-7 days
- **Documentation:** 2-3 days
- **Total:** **21-30 days** (3-4 weeks)

### 🚀 Next Steps

**Ready to proceed?** I can start with Phase 1 immediately:
1. Create new data model types
2. Implement `alarmConfigStore`
3. Update defaults registry
4. Write comprehensive unit tests

**Your approval needed for:**
- Data model design (as proposed above)
- Migration strategy (keep old system until validated)
- UI mockups (as shown above)

---

**Do you approve proceeding with this refactoring plan?**
