# Unified Logging Architecture Proposal

## Current State Analysis

### Identified Logging Mechanisms

The codebase currently uses **5 different logging patterns**:

1. **`logger.ts`** - Centralized logger with category flags
   - Location: `src/utils/logger.ts`
   - Pattern: `logger.sensor()`, `logger.network()`, etc.
   - Control: `LOG_CATEGORIES = { SENSOR: false, NETWORK: false, ... }`
   - Runtime: `window.enableLog('SENSOR')`

2. **Scattered DEBUG flags** - Per-file boolean constants
   - `DEBUG_WIDGET_REGISTRATION` (WidgetRegistrationService.ts)
   - `DEBUG_ENGINE_DETECTION` (WidgetRegistrationService.ts)
   - `DEBUG_DEPTH_DETECTION` (WidgetRegistrationService.ts)
   - `DEBUG_ENGINE_PROCESSING` (NmeaSensorProcessor.ts)
   - `DEBUG_NMEA_PROCESSING` (NmeaSensorProcessor.ts)
   - `ENABLE_NMEA_PROCESSOR_LOGGING` (NmeaSensorProcessor.ts)
   - `ENABLE_STORE_UPDATER_LOGGING` (PureStoreUpdater.ts)
   - `DEBUG_WIDGET_STORE` (widgetStore.ts)
   - `DEBUG_STORE_UPDATES` (nmeaStore.ts)
   - `ENABLE_APP_LOGGING` (App.tsx)

3. **Direct `console.log()` calls** - No control mechanism
   - 100+ instances across codebase
   - No way to disable without code changes
   - Mix of debug, info, warn, error levels

4. **Conditional console wrappers** - Local helpers
   - Pattern: `const log = (...args) => ENABLE_LOGGING && console.log(...args)`
   - Used in: NmeaSensorProcessor, PureStoreUpdater
   - Not centralized, duplicated logic

5. **Always-on logging** - Critical diagnostics
   - Performance warnings
   - Memory alerts
   - Thermal throttling
   - React error boundaries

### Problems with Current Approach

1. **Fragmented control** - Cannot enable/disable related logs together
2. **Code duplication** - Each file reinvents logging guards
3. **No hierarchy** - Can't enable "all depth" or "all NMEA processing"
4. **Hard to discover** - No way to list available logging categories
5. **Inconsistent naming** - `DEBUG_`, `ENABLE_`, `LOG_` prefixes
6. **No runtime control** - Must edit code to change DEBUG flags
7. **Console pollution** - Direct console.log() bypasses all control
8. **No production filtering** - Dev logs leak to production

## Proposed Architecture

### Hierarchical Logging System

```typescript
// src/utils/logging/LogManager.ts

/**
 * Unified logging system with hierarchical categories
 * 
 * Features:
 * - Hierarchical namespaces (e.g., 'nmea.depth', 'nmea.engine')
 * - Wildcard enable/disable (e.g., 'nmea.*' enables all NMEA logs)
 * - Runtime control via window.log API
 * - Production-safe (auto-disabled in production builds)
 * - Performance optimized (no-op when disabled)
 */

// Hierarchical namespace structure
type LogNamespace = 
  | 'nmea'
  | 'nmea.processing'
  | 'nmea.processor.depth'
  | 'nmea.processor.engine'
  | 'nmea.processor.speed'
  | 'nmea.processor.wind'
  | 'nmea.processor.gps'
  | 'nmea.store'
  | 'nmea.store.updates'
  | 'nmea.store.enrichment'
  | 'nmea.throttle'
  
  | 'widget'
  | 'widget.registration'
  | 'widget.registration.depth'
  | 'widget.registration.engine'
  | 'widget.registration.battery'
  | 'widget.factory'
  | 'widget.lifecycle'
  | 'widget.store'
  
  | 'sensor'
  | 'sensor.detection'
  | 'sensor.config'
  | 'sensor.display-cache'
  | 'sensor.threshold'
  | 'sensor.alarm'
  
  | 'ui'
  | 'ui.layout'
  | 'ui.theme'
  | 'ui.dimensions'
  | 'ui.drag'
  | 'ui.navigation'
  
  | 'performance'
  | 'performance.memory'
  | 'performance.render'
  | 'performance.network'
  
  | 'system'
  | 'system.platform'
  | 'system.power'
  | 'system.thermal';

// Log levels
type LogLevel = 'debug' | 'info' | 'warn' | 'error';

// Configuration
interface LogConfig {
  enabled: boolean;
  level: LogLevel;
  color?: string; // Console color for this namespace
  emoji?: string; // Emoji prefix
}

class LogManager {
  private config: Map<string, LogConfig> = new Map();
  private originalConsole = { ...console };
  
  constructor() {
    // Initialize with all categories disabled
    this.initializeCategories();
    
    // Expose runtime API in dev mode
    if (__DEV__) {
      this.exposeDevAPI();
    }
  }
  
  /**
   * Check if namespace or any parent is enabled
   * Examples:
   * - 'nmea.processor.depth' checks: depth → processor → nmea → root
   * - Wildcard 'nmea.*' enables all nmea.* namespaces
   */
  private isEnabled(namespace: string): boolean {
    // Check exact match
    if (this.config.get(namespace)?.enabled) return true;
    
    // Check parent namespaces (e.g., 'nmea.processor.depth' → 'nmea.processor' → 'nmea')
    const parts = namespace.split('.');
    while (parts.length > 0) {
      const parent = parts.join('.');
      if (this.config.get(parent)?.enabled) return true;
      parts.pop();
    }
    
    return false;
  }
  
  /**
   * Create logger for specific namespace
   */
  public createLogger(namespace: LogNamespace) {
    return {
      debug: (...args: any[]) => {
        if (this.isEnabled(namespace)) {
          const cfg = this.getConfig(namespace);
          this.originalConsole.log(
            `${cfg.emoji} [${namespace}]`,
            ...args
          );
        }
      },
      
      info: (...args: any[]) => {
        if (this.isEnabled(namespace)) {
          const cfg = this.getConfig(namespace);
          this.originalConsole.info(
            `${cfg.emoji} [${namespace}]`,
            ...args
          );
        }
      },
      
      warn: (...args: any[]) => {
        if (this.isEnabled(namespace)) {
          const cfg = this.getConfig(namespace);
          this.originalConsole.warn(
            `⚠️ [${namespace}]`,
            ...args
          );
        }
      },
      
      error: (...args: any[]) => {
        // Errors always shown
        this.originalConsole.error(
          `🚨 [${namespace}]`,
          ...args
        );
      },
    };
  }
  
  /**
   * Enable logging for namespace (supports wildcards)
   */
  public enable(pattern: string): void {
    if (pattern.endsWith('.*')) {
      // Enable all child namespaces
      const prefix = pattern.slice(0, -2);
      Array.from(this.config.keys())
        .filter(key => key.startsWith(prefix))
        .forEach(key => {
          this.config.get(key)!.enabled = true;
        });
    } else {
      // Enable specific namespace
      const cfg = this.config.get(pattern) || this.createConfig(pattern);
      cfg.enabled = true;
      this.config.set(pattern, cfg);
    }
  }
  
  /**
   * Disable logging for namespace
   */
  public disable(pattern: string): void {
    if (pattern.endsWith('.*')) {
      const prefix = pattern.slice(0, -2);
      Array.from(this.config.keys())
        .filter(key => key.startsWith(prefix))
        .forEach(key => {
          this.config.get(key)!.enabled = false;
        });
    } else {
      const cfg = this.config.get(pattern);
      if (cfg) cfg.enabled = false;
    }
  }
  
  /**
   * Runtime dev console API
   */
  private exposeDevAPI(): void {
    (window as any).log = {
      enable: (pattern: string) => {
        this.enable(pattern);
        console.log(`✅ Enabled logging: ${pattern}`);
      },
      
      disable: (pattern: string) => {
        this.disable(pattern);
        console.log(`🔇 Disabled logging: ${pattern}`);
      },
      
      list: () => {
        const enabled = Array.from(this.config.entries())
          .filter(([_, cfg]) => cfg.enabled)
          .map(([key, _]) => key);
        
        console.log('📋 Enabled log categories:', enabled);
        console.log('\n💡 Usage:');
        console.log('  log.enable("nmea.*")          - Enable all NMEA logs');
        console.log('  log.enable("nmea.processor.depth") - Enable depth processing');
        console.log('  log.disable("nmea.*")         - Disable all NMEA logs');
        console.log('  log.list()                    - Show enabled categories');
        console.log('  log.available()               - Show all available categories');
      },
      
      available: () => {
        const categories = Array.from(this.config.keys()).sort();
        console.log('📋 Available log categories:');
        console.log(categories.join('\n'));
      },
      
      // Presets for common debugging scenarios
      presets: {
        depth: () => {
          this.enable('nmea.processor.depth');
          this.enable('nmea.store.enrichment');
          this.enable('widget.registration.depth');
          console.log('✅ Enabled depth debugging preset');
        },
        
        engine: () => {
          this.enable('nmea.processor.engine');
          this.enable('widget.registration.engine');
          console.log('✅ Enabled engine debugging preset');
        },
        
        all: () => {
          Array.from(this.config.keys()).forEach(key => {
            this.config.get(key)!.enabled = true;
          });
          console.log('✅ Enabled ALL logging (warning: very verbose)');
        },
        
        none: () => {
          Array.from(this.config.keys()).forEach(key => {
            this.config.get(key)!.enabled = false;
          });
          console.log('🔇 Disabled all logging');
        },
      },
    };
    
    console.log('📝 Logging API available: log.list() | log.enable("nmea.*") | log.presets.depth()');
  }
  
  private getConfig(namespace: string): LogConfig {
    return this.config.get(namespace) || this.createConfig(namespace);
  }
  
  private createConfig(namespace: string): LogConfig {
    // Auto-assign emoji based on namespace
    const emoji = this.getEmoji(namespace);
    
    return {
      enabled: false,
      level: 'debug',
      emoji,
    };
  }
  
  private getEmoji(namespace: string): string {
    if (namespace.includes('depth')) return '🌊';
    if (namespace.includes('engine')) return '🔧';
    if (namespace.includes('wind')) return '💨';
    if (namespace.includes('gps')) return '📍';
    if (namespace.includes('speed')) return '⚡';
    if (namespace.includes('compass')) return '🧭';
    if (namespace.includes('battery')) return '🔋';
    if (namespace.includes('alarm')) return '🚨';
    if (namespace.includes('threshold')) return '⚠️';
    if (namespace.includes('widget')) return '📦';
    if (namespace.includes('layout')) return '📐';
    if (namespace.includes('theme')) return '🎨';
    if (namespace.includes('performance')) return '⏱️';
    if (namespace.includes('memory')) return '💾';
    return '📋';
  }
  
  private initializeCategories(): void {
    // Initialize all known namespaces as disabled
    const namespaces: LogNamespace[] = [
      'nmea', 'nmea.processing', 'nmea.processor.depth', 'nmea.processor.engine',
      'nmea.processor.speed', 'nmea.processor.wind', 'nmea.processor.gps',
      'nmea.store', 'nmea.store.updates', 'nmea.store.enrichment', 'nmea.throttle',
      
      'widget', 'widget.registration', 'widget.registration.depth',
      'widget.registration.engine', 'widget.registration.battery',
      'widget.factory', 'widget.lifecycle', 'widget.store',
      
      'sensor', 'sensor.detection', 'sensor.config', 'sensor.display-cache',
      'sensor.threshold', 'sensor.alarm',
      
      'ui', 'ui.layout', 'ui.theme', 'ui.dimensions', 'ui.drag', 'ui.navigation',
      
      'performance', 'performance.memory', 'performance.render', 'performance.network',
      
      'system', 'system.platform', 'system.power', 'system.thermal',
    ];
    
    namespaces.forEach(ns => {
      this.config.set(ns, this.createConfig(ns));
    });
  }
}

// Export singleton
export const logManager = new LogManager();

// Export convenience function
export function createLogger(namespace: LogNamespace) {
  return logManager.createLogger(namespace);
}
```

### Migration Strategy

#### Phase 1: Core Files (Week 1)
Replace scattered DEBUG flags in critical files:

```typescript
// BEFORE: NmeaSensorProcessor.ts
const DEBUG_ENGINE_PROCESSING = false;
const DEBUG_DEPTH_DETECTION = true;

if (DEBUG_DEPTH_DETECTION) {
  console.log('🌊 [DEPTH DEBUG] DBT processed:', depth);
}

// AFTER: NmeaSensorProcessor.ts
import { createLogger } from '../utils/logging/LogManager';
const log = createLogger('nmea.processor.depth');

log.debug('DBT processed:', depth);
```

Files to migrate in Phase 1:
1. ✅ NmeaSensorProcessor.ts → `nmea.processor.{depth,engine,speed,etc.}`
2. ✅ WidgetRegistrationService.ts → `widget.registration.{depth,engine,etc.}`
3. ✅ nmeaStore.ts → `nmea.store.{updates,enrichment}`
4. ✅ PureStoreUpdater.ts → `nmea.throttle`
5. ✅ widgetStore.ts → `widget.store`

#### Phase 2: Widget Components (Week 2)
Add logging to widget components for display cache debugging:

```typescript
// DepthWidget.tsx
import { createLogger } from '../utils/logging/LogManager';
const log = createLogger('widget.registration.depth');

log.debug('Rendering with display cache:', depthSensorData?.display);
```

#### Phase 3: Direct console.log() Replacement (Week 3)
Search and replace direct console.log() calls:

```bash
# Find all direct console calls
grep -r "console\.log" src/ --include="*.ts" --include="*.tsx"

# Replace with appropriate logger
# Keep only: error boundaries, thermal alerts, critical warnings
```

#### Phase 4: Production Filtering (Week 4)
Add production mode check:

```typescript
// LogManager.ts constructor
constructor() {
  // Disable all logging in production
  if (!__DEV__) {
    this.disableAll();
    return; // Don't expose API
  }
  
  this.initializeCategories();
  this.exposeDevAPI();
}
```

### Usage Examples

#### Debugging Depth Sensor Issue

```javascript
// In browser console
log.presets.depth();  // Enables: nmea.processor.depth, nmea.store.enrichment, widget.registration.depth

// Now see focused output:
// 🌊 [nmea.processor.depth] DBT processed: depth=2.8m source=DBT
// 🌊 [nmea.store.enrichment] Store enrichment for depth-0: hasDisplay=true
// 🌊 [widget.registration.depth] handleSensorUpdate called: depth-0
```

#### Debugging Engine Widget

```javascript
log.presets.engine();  // Enables: nmea.processor.engine, widget.registration.engine

// Or more granular:
log.enable('nmea.processor.*');  // All NMEA processing
log.enable('widget.registration.engine');  // Only engine widget
```

#### Debugging Layout Issues

```javascript
log.enable('ui.layout');
log.enable('ui.dimensions');

// See only layout/dimension logs
```

#### List What's Enabled

```javascript
log.list();
// Output:
// 📋 Enabled log categories:
// - nmea.processor.depth
// - nmea.store.enrichment
// - widget.registration.depth
```

### Benefits

1. **Single Source of Truth** - All logging controlled through one system
2. **Hierarchical Control** - Enable parent namespace enables all children
3. **Wildcard Support** - `log.enable('nmea.*')` enables all NMEA logging
4. **Runtime Control** - No code changes needed, use browser console
5. **Discoverable** - `log.available()` lists all categories
6. **Presets** - Common scenarios (depth, engine) enabled with one command
7. **Production Safe** - Auto-disabled in production builds
8. **Performance** - No-op when disabled (zero overhead)
9. **Consistent Formatting** - All logs use namespace + emoji prefix
10. **Easier Debugging** - Filter console by emoji or namespace

### Migration Checklist

- [ ] Create `src/utils/logging/LogManager.ts`
- [ ] Create `src/utils/logging/index.ts` (re-export)
- [ ] Migrate `NmeaSensorProcessor.ts`
- [ ] Migrate `WidgetRegistrationService.ts`
- [ ] Migrate `nmeaStore.ts`
- [ ] Migrate `PureStoreUpdater.ts`
- [ ] Migrate `widgetStore.ts`
- [ ] Add logging to widget components (DepthWidget, EngineWidget, etc.)
- [ ] Replace direct console.log() calls (100+ instances)
- [ ] Add production mode check
- [ ] Update documentation
- [ ] Test presets (depth, engine, all, none)
- [ ] Verify wildcard enable/disable
- [ ] Remove old DEBUG_* constants
- [ ] Remove `logger.ts` (replaced by LogManager)

### Backward Compatibility

During migration, both systems can coexist:

```typescript
// Old system still works
const DEBUG_DEPTH = true;
if (DEBUG_DEPTH) console.log('...');

// New system available
import { createLogger } from '../utils/logging/LogManager';
const log = createLogger('nmea.processor.depth');
log.debug('...');
```

Once all files migrated, remove old logger.ts and DEBUG_* flags.

---

## Decision Required

**Should we proceed with this unified logging architecture?**

Advantages:
- ✅ Single, discoverable system
- ✅ Runtime control (no code changes)
- ✅ Hierarchical organization
- ✅ Preset scenarios
- ✅ Production-safe

Effort:
- ~4 weeks for full migration
- Can be done incrementally
- Both systems can coexist during transition

Alternative:
- Keep current fragmented approach
- Requires editing code for every logging change
- Harder to discover available logging options
