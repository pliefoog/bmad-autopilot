# Date/Time System Specification - Registry-First Architecture

## Executive Summary
Transform date/time handling from ad-hoc formatting to registry-first pattern matching all other sensor metrics. Enables timezone-aware display with per-field UTC/local control.

## Current State (GPSWidget)
- 100+ lines of manual date/time formatting
- Settings in `gpsDateFormat`/`gpsTimeFormat`
- No timezone offset support
- Hardcoded in widget logic

## Target State
- `<PrimaryMetricCell metricKey="utcTime" />` - Zero logic
- Date/time categories with timezone-aware formatters
- Settings-driven timezone (auto/UTC/custom offset)
- Per-field UTC override (`forceTimezone: 'utc'`)

---

## Implementation Layers

### Layer 1: Data Categories (REQUIRED)
**File:** `src/presentation/categories.ts`

**Changes:**
```typescript
export type DataCategory =
  | ... existing ...
  | 'time'      // EXISTING - repurpose for time formatting
  | 'date'      // NEW - date formatting
  | 'timestamp' // NEW - raw Unix timestamp (internal use)
  | ...

const DATA_CATEGORIES: Record<DataCategory, DataCategoryInfo> = {
  // ... existing ...
  
  timestamp: {
    id: 'timestamp',
    name: 'Timestamp',
    description: 'Unix timestamp in milliseconds (internal)',
    baseUnit: 'milliseconds',
    icon: '🕐',
    precision: 0,
    typical_range: [0, 2147483647000],
  },
  
  time: {
    id: 'time',
    name: 'Time',
    description: 'Time display with timezone support',
    baseUnit: 'time_24h_full', // "14:35:22 UTC"
    icon: '⏰',
    precision: 0, // N/A for formatted strings
    typical_range: [0, 86400000], // 0-24 hours in ms
  },
  
  date: {
    id: 'date',
    name: 'Date',
    description: 'Date display with timezone support',
    baseUnit: 'nautical_date', // "Sun Jan 15, 2025"
    icon: '📅',
    precision: 0, // N/A for formatted strings
    typical_range: [0, 2147483647000],
  },
};
```

---

### Layer 2: Presentations (TIME & DATE)
**File:** `src/presentation/presentations.ts`

**Replace existing TIME_PRESENTATIONS with timezone-aware formatters:**

```typescript
// ===== TIME PRESENTATIONS =====
const TIME_PRESENTATIONS: Presentation[] = [
  {
    id: 'time_24h_full',
    name: '24-Hour Full (HH:MM:SS)',
    symbol: '', // Dynamic based on timezone
    description: 'Full 24-hour time with seconds',
    conversionFactor: 1, // No numeric conversion
    formatSpec: {
      pattern: 'custom', // Special handling for datetime
      decimals: 0,
      minWidth: 8,
      layoutRanges: { min: 0, max: 0, typical: 0 },
    },
    isDefault: true,
    preferredInRegion: ['eu', 'international'],
  },
  {
    id: 'time_24h',
    name: '24-Hour (HH:MM)',
    symbol: '',
    description: '24-hour time without seconds',
    conversionFactor: 1,
    formatSpec: {
      pattern: 'custom',
      decimals: 0,
      minWidth: 5,
      layoutRanges: { min: 0, max: 0, typical: 0 },
    },
    preferredInRegion: ['eu', 'international'],
  },
  {
    id: 'time_12h',
    name: '12-Hour (HH:MM AM/PM)',
    symbol: '',
    description: '12-hour time with AM/PM',
    conversionFactor: 1,
    formatSpec: {
      pattern: 'custom',
      decimals: 0,
      minWidth: 8,
      layoutRanges: { min: 0, max: 0, typical: 0 },
    },
    preferredInRegion: ['us'],
  },
  {
    id: 'time_12h_full',
    name: '12-Hour Full (HH:MM:SS AM/PM)',
    symbol: '',
    description: '12-hour time with seconds and AM/PM',
    conversionFactor: 1,
    formatSpec: {
      pattern: 'custom',
      decimals: 0,
      minWidth: 11,
      layoutRanges: { min: 0, max: 0, typical: 0 },
    },
    preferredInRegion: ['us'],
  },
  {
    id: 'time_compact',
    name: 'Compact (HH.MM)',
    symbol: '',
    description: 'Compact time format with dot separator',
    conversionFactor: 1,
    formatSpec: {
      pattern: 'custom',
      decimals: 0,
      minWidth: 5,
      layoutRanges: { min: 0, max: 0, typical: 0 },
    },
    preferredInRegion: ['international'],
  },
];

// ===== DATE PRESENTATIONS =====
const DATE_PRESENTATIONS: Presentation[] = [
  {
    id: 'nautical_date',
    name: 'Nautical (Day Mon DD, YYYY)',
    symbol: '',
    description: 'Maritime standard date format',
    conversionFactor: 1,
    formatSpec: {
      pattern: 'custom',
      decimals: 0,
      minWidth: 15,
      layoutRanges: { min: 0, max: 0, typical: 0 },
    },
    isDefault: true,
    preferredInRegion: ['international'],
  },
  {
    id: 'iso_date',
    name: 'ISO (YYYY-MM-DD)',
    symbol: '',
    description: 'ISO 8601 standard date',
    conversionFactor: 1,
    formatSpec: {
      pattern: 'custom',
      decimals: 0,
      minWidth: 10,
      layoutRanges: { min: 0, max: 0, typical: 0 },
    },
    preferredInRegion: ['international'],
  },
  {
    id: 'us_date',
    name: 'US (MM/DD/YYYY)',
    symbol: '',
    description: 'US date format',
    conversionFactor: 1,
    formatSpec: {
      pattern: 'custom',
      decimals: 0,
      minWidth: 10,
      layoutRanges: { min: 0, max: 0, typical: 0 },
    },
    preferredInRegion: ['us'],
  },
  {
    id: 'eu_date',
    name: 'EU (DD.MM.YYYY)',
    symbol: '',
    description: 'European date format',
    conversionFactor: 1,
    formatSpec: {
      pattern: 'custom',
      decimals: 0,
      minWidth: 10,
      layoutRanges: { min: 0, max: 0, typical: 0 },
    },
    preferredInRegion: ['eu'],
  },
  {
    id: 'uk_date',
    name: 'UK (DD/MM/YYYY)',
    symbol: '',
    description: 'UK date format',
    conversionFactor: 1,
    formatSpec: {
      pattern: 'custom',
      decimals: 0,
      minWidth: 10,
      layoutRanges: { min: 0, max: 0, typical: 0 },
    },
    preferredInRegion: ['uk'],
  },
];

// Add to CATEGORY_PRESENTATIONS_MAP
export const CATEGORY_PRESENTATIONS_MAP: Record<DataCategory, Presentation[]> = {
  // ... existing ...
  time: TIME_PRESENTATIONS,
  date: DATE_PRESENTATIONS,
  timestamp: [], // Internal use only - no user-facing presentations
};
```

---

### Layer 3: Settings Store
**File:** `src/store/settingsStore.ts`

**Add new time section, migrate GPS settings:**

```typescript
export interface SettingsState {
  // ... existing ...
  
  time: {
    format: 'time_24h_full' | 'time_24h' | 'time_12h' | 'time_12h_full' | 'time_compact';
    timezoneMode: 'auto' | 'utc' | 'custom';
    timezoneOffset: number; // Hours from UTC (-12 to +14)
  };
  
  date: {
    format: 'nautical_date' | 'iso_date' | 'us_date' | 'eu_date' | 'uk_date';
    // Uses same timezone as time
  };
  
  // REMOVE these (migrate on startup):
  // gps: { dateFormat, timeFormat, timezone }
}

// Default values
const defaultSettings: SettingsState = {
  // ... existing ...
  
  time: {
    format: 'time_24h_full',
    timezoneMode: 'auto', // Detect device timezone
    timezoneOffset: 0,
  },
  
  date: {
    format: 'nautical_date',
  },
};
```

---

### Layer 4: Field Config Interface
**File:** `src/registry/SensorConfigRegistry.ts` (types)

**Add forceTimezone to BaseFieldConfig:**

```typescript
export interface BaseFieldConfig {
  label: string;
  mnemonic: string;
  category: DataCategory;
  alarmable?: boolean;
  forceTimezone?: 'utc'; // ✅ NEW: Force UTC display (overrides settings)
  // ... existing fields ...
}
```

---

### Layer 5: GPS Sensor Fields
**File:** `src/registry/SensorConfigRegistry.ts`

**Add new time/date fields to GPS sensor:**

```typescript
export const SensorConfigRegistry = {
  gps: {
    label: 'GPS',
    icon: 'location',
    fields: {
      // ... existing latitude, longitude, etc ...
      
      // Raw timestamp (internal SI value)
      timestamp: {
        label: 'Timestamp',
        mnemonic: 'TS',
        category: 'timestamp',
        alarmable: false,
      },
      
      // UTC time/date (forced UTC display)
      utcTime: {
        label: 'UTC Time',
        mnemonic: 'UTC',
        category: 'time',
        forceTimezone: 'utc', // ✅ Always UTC
        alarmable: false,
      },
      
      utcDate: {
        label: 'UTC Date',
        mnemonic: 'DATE',
        category: 'date',
        forceTimezone: 'utc', // ✅ Always UTC
        alarmable: false,
      },
      
      // Local time/date (uses settings timezone)
      localTime: {
        label: 'Local Time',
        mnemonic: 'TIME',
        category: 'time',
        // NO forceTimezone - uses settings
        alarmable: false,
      },
      
      localDate: {
        label: 'Local Date',
        mnemonic: 'DATE',
        category: 'date',
        // NO forceTimezone - uses settings
        alarmable: false,
      },
    },
  },
};
```

---

### Layer 6: Datetime Formatters
**NEW FILE:** `src/utils/datetimeFormatters.ts`

```typescript
/**
 * Timezone-aware datetime formatters for ConversionRegistry
 * 
 * Converts Unix timestamp (milliseconds) to formatted date/time strings
 * with timezone offset support.
 */

export interface DateTimeOptions {
  timezoneOffset?: number; // Hours from UTC (-12 to +14)
  forceUTC?: boolean;      // Force UTC display
}

/**
 * Format timestamp as time string
 */
export function formatTime(
  timestamp: number,
  format: string,
  options: DateTimeOptions = {}
): { formatted: string; unitLabel: string } {
  // Determine effective timezone offset
  let offset = 0;
  if (options.forceUTC) {
    offset = 0;
  } else if (options.timezoneOffset !== undefined) {
    offset = options.timezoneOffset;
  } else {
    // Auto-detect device timezone
    offset = -new Date().getTimezoneOffset() / 60;
  }
  
  // Apply timezone offset
  const adjustedTime = new Date(timestamp + offset * 3600000);
  
  // Format time
  const hours = adjustedTime.getUTCHours();
  const minutes = adjustedTime.getUTCMinutes();
  const seconds = adjustedTime.getUTCSeconds();
  
  let formatted: string;
  switch (format) {
    case 'time_24h_full':
      formatted = `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
      break;
    case 'time_24h':
      formatted = `${pad(hours)}:${pad(minutes)}`;
      break;
    case 'time_12h':
      const hours12 = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;
      const ampm = hours >= 12 ? 'PM' : 'AM';
      formatted = `${pad(hours12)}:${pad(minutes)} ${ampm}`;
      break;
    case 'time_12h_full':
      const hours12Full = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;
      const ampmFull = hours >= 12 ? 'PM' : 'AM';
      formatted = `${pad(hours12Full)}:${pad(minutes)}:${pad(seconds)} ${ampmFull}`;
      break;
    case 'time_compact':
      formatted = `${pad(hours)}.${pad(minutes)}`;
      break;
    default:
      formatted = `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
  }
  
  // Generate unit label
  const unitLabel = offset === 0 ? 'UTC' : `UTC${offset >= 0 ? '+' : ''}${offset}`;
  
  return { formatted, unitLabel };
}

/**
 * Format timestamp as date string
 */
export function formatDate(
  timestamp: number,
  format: string,
  options: DateTimeOptions = {}
): { formatted: string; unitLabel: string } {
  // Apply timezone offset (same logic as formatTime)
  let offset = 0;
  if (options.forceUTC) {
    offset = 0;
  } else if (options.timezoneOffset !== undefined) {
    offset = options.timezoneOffset;
  } else {
    offset = -new Date().getTimezoneOffset() / 60;
  }
  
  const adjustedTime = new Date(timestamp + offset * 3600000);
  
  const year = adjustedTime.getUTCFullYear();
  const month = adjustedTime.getUTCMonth();
  const day = adjustedTime.getUTCDate();
  const dayOfWeek = adjustedTime.getUTCDay();
  
  let formatted: string;
  switch (format) {
    case 'nautical_date':
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      formatted = `${dayNames[dayOfWeek]} ${monthNames[month]} ${pad(day)}, ${year}`;
      break;
    case 'iso_date':
      formatted = `${year}-${pad(month + 1)}-${pad(day)}`;
      break;
    case 'us_date':
      formatted = `${pad(month + 1)}/${pad(day)}/${year}`;
      break;
    case 'eu_date':
      formatted = `${pad(day)}.${pad(month + 1)}.${year}`;
      break;
    case 'uk_date':
      formatted = `${pad(day)}/${pad(month + 1)}/${year}`;
      break;
    default:
      formatted = `${dayNames[dayOfWeek]} ${monthNames[month]} ${pad(day)}, ${year}`;
  }
  
  const unitLabel = offset === 0 ? 'UTC' : `UTC${offset >= 0 ? '+' : ''}${offset}`;
  
  return { formatted, unitLabel };
}

function pad(num: number): string {
  return num.toString().padStart(2, '0');
}
```

---

### Layer 7: ConversionRegistry Integration
**File:** `src/utils/ConversionRegistry.ts`

**Add special handling for time/date categories:**

```typescript
import { formatTime, formatDate } from './datetimeFormatters';
import { useSettingsStore } from '../store/settingsStore';

class ConversionRegistryService {
  // ... existing methods ...
  
  /**
   * Convert with timezone support for time/date categories
   */
  convertToDisplay(
    siValue: number,
    category: DataCategory,
    options?: { forceTimezone?: 'utc' }
  ): number | string {
    this.initialize();
    
    // Special handling for time/date categories
    if (category === 'time' || category === 'date') {
      const settings = useSettingsStore.getState();
      const presentation = this.getPresentation(category);
      
      // Determine timezone options
      const timezoneOpts = {
        forceUTC: options?.forceTimezone === 'utc',
        timezoneOffset: settings.time.timezoneMode === 'custom' 
          ? settings.time.timezoneOffset 
          : undefined,
      };
      
      // Format timestamp
      if (category === 'time') {
        return formatTime(siValue, presentation.id, timezoneOpts).formatted;
      } else {
        return formatDate(siValue, presentation.id, timezoneOpts).formatted;
      }
    }
    
    // Existing numeric conversion logic
    const presentation = this.getPresentation(category);
    return siValue * presentation.conversionFactor;
  }
  
  /**
   * Get unit label with timezone info for time/date
   */
  getUnit(category: DataCategory, options?: { forceTimezone?: 'utc' }): string {
    if (category === 'time' || category === 'date') {
      const settings = useSettingsStore.getState();
      
      if (options?.forceTimezone === 'utc') {
        return 'UTC';
      }
      
      if (settings.time.timezoneMode === 'utc') {
        return 'UTC';
      }
      
      if (settings.time.timezoneMode === 'custom') {
        const offset = settings.time.timezoneOffset;
        return offset === 0 ? 'UTC' : `UTC${offset >= 0 ? '+' : ''}${offset}`;
      }
      
      // Auto mode - show as LOCAL
      return 'LOCAL';
    }
    
    // Existing unit lookup
    const presentation = this.getPresentation(category);
    return presentation.symbol;
  }
}
```

---

### Layer 8: MetricValue Enrichment
**File:** `src/types/MetricValue.ts`

**Update enrich() to handle time/date with forceTimezone:**

```typescript
enrich(fieldConfig?: FieldConfig): void {
  // ... existing logic ...
  
  // Special handling for time/date categories
  if (this.category === 'time' || this.category === 'date') {
    const forceTimezone = fieldConfig?.forceTimezone === 'utc' ? 'utc' : undefined;
    
    const displayValue = ConversionRegistry.convertToDisplay(
      this.si_value,
      this.category,
      { forceTimezone }
    );
    
    const unit = ConversionRegistry.getUnit(this.category, { forceTimezone });
    
    this._enrichedData = {
      value: displayValue,
      unit: unit,
      formattedValue: String(displayValue),
      formattedValueWithUnit: `${displayValue} ${unit}`,
    };
    return;
  }
  
  // Existing numeric enrichment logic
  // ...
}
```

---

### Layer 9: Virtual Metric Generation
**File:** `src/types/SensorInstance.ts`

**Add getMetric() support for utcTime/utcDate/localTime/localDate:**

```typescript
getMetric(fieldName: string): MetricValue | undefined {
  // Check real metrics first
  if (this._metrics.has(fieldName)) {
    return this._metrics.get(fieldName);
  }
  
  // Generate virtual time/date metrics from timestamp
  if (['utcTime', 'utcDate', 'localTime', 'localDate'].includes(fieldName)) {
    // Find the raw timestamp metric
    const timestampMetric = this._metrics.get('timestamp') 
      || this._metrics.get('utcTime') 
      || this._metrics.get('time');
    
    if (!timestampMetric) return undefined;
    
    // Get field config for this virtual metric
    const fieldConfig = getSensorFieldConfig(this._sensorType, fieldName);
    if (!fieldConfig) return undefined;
    
    // Create virtual metric with correct category
    const category = fieldName.includes('Time') ? 'time' : 'date';
    const virtualMetric = new MetricValue(timestampMetric.si_value, category);
    
    // Enrich with timezone handling (forceTimezone applied from fieldConfig)
    virtualMetric.enrich(fieldConfig);
    
    return virtualMetric;
  }
  
  return undefined;
}
```

---

### Layer 10: GPSWidget Simplification
**File:** `src/widgets/GPSWidget.tsx`

**Before (308 lines):**
- 100+ lines of date/time formatting
- Manual timezone logic
- Settings subscriptions

**After (~60 lines):**
```typescript
export const GPSWidget: React.FC<Props> = React.memo(({ id }) => {
  const instanceNumber = useMemo(() => {
    const match = id.match(/gps-(\d+)/);
    return match ? parseInt(match[1], 10) : 0;
  }, [id]);

  const gpsInstance = useNmeaStore(
    (state) => state.nmeaData.sensors.gps?.[instanceNumber]
  );

  return (
    <TemplatedWidget
      template="2Rx1C-SEP-2Rx1C"
      sensorInstance={gpsInstance}
      sensorType="gps"
      testID={`gps-widget-${instanceNumber}`}
    >
      {/* Primary: Coordinates */}
      <PrimaryMetricCell metricKey="latitude" />
      <PrimaryMetricCell metricKey="longitude" />
      
      {/* Secondary: UTC Date/Time */}
      <SecondaryMetricCell metricKey="utcDate" />
      <SecondaryMetricCell metricKey="utcTime" />
    </TemplatedWidget>
  );
});
```

---

## Benefits

1. **Consistency**: Date/time follows exact same pattern as all other metrics
2. **Zero duplication**: All formatting centralized in ConversionRegistry
3. **User control**: Timezone in settings, format via unit preferences
4. **Per-field control**: GPS shows UTC, Clock shows local - both from same timestamp
5. **Type safety**: MetricValue.formattedValue works identically
6. **XML ready**: Date/time metrics defined in registry like everything else
7. **Widget simplification**: GPSWidget: 308 → 60 lines (-80%)

---

## Testing Checklist

- [ ] GPS widget shows UTC time/date correctly
- [ ] Settings timezone changes affect local time (not UTC)
- [ ] Auto timezone detects device timezone
- [ ] All date formats render correctly
- [ ] All time formats render correctly
- [ ] Unit labels show timezone (UTC, UTC+2, LOCAL)
- [ ] MetricValue enrichment works for time/date
- [ ] Virtual metrics generated correctly
- [ ] No console errors/warnings

---

## Migration Notes

**Settings Migration (on app startup):**
```typescript
// One-time migration
if (oldSettings.gps.dateFormat) {
  newSettings.date.format = oldSettings.gps.dateFormat;
  newSettings.time.format = oldSettings.gps.timeFormat;
  newSettings.time.timezoneMode = 'auto'; // Default
  delete oldSettings.gps; // Remove old settings
}
```

**Breaking Changes:**
- GPS settings structure completely replaced
- GPSWidget API unchanged (props stay same)
- MetricValue API unchanged (formattedValue works same)

---

## Estimated Effort

**Lines of Code:**
- Categories: +60 lines
- Presentations: +150 lines (date/time formatters)
- Settings: +20 lines
- Field Config: +5 lines
- GPS Registry: +40 lines
- Datetime Formatters: +150 lines (new file)
- ConversionRegistry: +50 lines
- MetricValue: +20 lines
- SensorInstance: +30 lines
- GPSWidget: -248 lines

**Net Change:** +525 lines (infrastructure) - 248 lines (widget) = +277 lines total

**Time:** 2-3 hours careful implementation + 1 hour testing

---

## Approval Required

This is a foundational change affecting:
- ✅ Type system (DataCategory enum)
- ✅ Presentation system (new formatters)
- ✅ Settings store (structure change)
- ✅ Registry (field configs)
- ✅ ConversionRegistry (special datetime handling)
- ✅ MetricValue (enrichment logic)
- ✅ SensorInstance (virtual metrics)
- ✅ GPSWidget (complete rewrite)

**Ready to proceed?** This completes the registry-first architecture by bringing date/time into the unified system.
