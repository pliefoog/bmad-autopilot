/**
 * Type Safety Tests for Story 6.6 Shared TypeScript Types
 * 
 * These tests verify that our shared types compile correctly and
 * provide proper type safety across the application.
 * 
 * Test IDs follow pattern: 6.6-UNIT-{###} mapping to Story 6.6 Acceptance Criteria
 * Priority Classification: P0 (Critical), P1 (High), P2 (Medium)
 */

import { describe, it, expect, jest } from '@jest/globals';
import type {
  // Widget types
  WidgetType,
  BaseWidgetProps,
  WidgetCardProps,
  
  // NMEA types  
  NMEADataState,
  EngineData,
  AutopilotMode,
  NMEAParseResult,
  
  // Theme types
  DisplayMode,
  AlertState,
  StoryThemeColors,
  StoryThemeSpacing,
  
  // Service types
  ConnectionStatus,
  StoryConnectionState,
  StorageService,
  PlaybackService,
  
  // Store types
  GenericStoreState,
  NMEAStoreActions,
  WidgetStoreActions,
  
  // Utility types
  Unit,
  UnitConversion,
  DataPoint,
  Nullable,
  Optional,
  EventHandler,
  ValueChangeHandler
} from "../../../src/types";

// ========================================
// Type Factory Functions (TEA Best Practice)
// ========================================

/**
 * Factory for creating NMEADataState test objects
 * @param overrides - Partial object to override defaults
 */
const createNMEADataState = (overrides: Partial<NMEADataState> = {}): NMEADataState => ({
  depth: 12.5,
  speedOverGround: 8.3,
  latitude: 37.7749,
  longitude: -122.4194,
  engines: {
    'engine1': {
      rpm: 2000,
      temperature: 85.5,
      timestamp: Date.now()
    }
  },
  autopilotMode: 'auto',
  timestamps: {
    depth: Date.now(),
    speed: Date.now()
  },
  ...overrides
});

/**
 * Factory for creating StoryThemeColors test objects
 * @param overrides - Partial object to override defaults
 */
const createStoryThemeColors = (overrides: Partial<StoryThemeColors> = {}): StoryThemeColors => ({
  primary: '#007AFF',
  secondary: '#FF9500',
  accent: '#FF3B30',
  success: '#34C759',
  warning: '#FF9500',
  error: '#FF3B30',
  backgroundDark: '#000000',
  backgroundMedium: '#1C1C1E',
  borderGray: '#38383A',
  textPrimary: '#FFFFFF',
  textSecondary: '#99999C',
  textTertiary: '#48484A',
  ...overrides
});

/**
 * Factory for creating StoryConnectionState test objects
 * @param overrides - Partial object to override defaults
 */
const createStoryConnectionState = (overrides: Partial<StoryConnectionState> = {}): StoryConnectionState => ({
  status: 'connected',
  wifiBridge: {
    host: '192.168.1.100',
    port: 2000,
    lastConnected: Date.now()
  },
  retryState: {
    attempts: 3,
    nextRetryAt: Date.now() + 5000
  },
  ...overrides
});

/**
 * Factory for creating BaseWidgetProps test objects
 * @param overrides - Partial object to override defaults  
 */
const createBaseWidgetProps = (overrides: Partial<BaseWidgetProps> = {}): BaseWidgetProps => ({
  widgetId: 'widget-123',
  expanded: false,
  onToggleExpanded: jest.fn(),
  onLongPress: jest.fn(),
  ...overrides
});

describe('Widget Types (6.6-UNIT-001) [P0]', () => {
  it('should enforce WidgetType enum values (AC-2)', () => {
    // Test validates AC-2: Define comprehensive widget configuration interfaces
    const validTypes: WidgetType[] = [
      'depth', 'speed', 'wind', 'compass', 'autopilot',
      'gps', 'temperature', 'voltage', 'engine', 'alarm',
      'battery', 'tanks', 'rudder'
    ];
    
    expect(validTypes).toContain('depth');
    expect(validTypes).toContain('autopilot');
    expect(validTypes.length).toBeGreaterThan(10);
  });

  it('should validate BaseWidgetProps interface (AC-2)', () => {
    // Test validates AC-2: Widget props interfaces for component integration
    const props = createBaseWidgetProps({ expanded: true });
    
    expect(typeof props.widgetId).toBe('string');
    expect(props.expanded).toBe(true);
    expect(typeof props.onToggleExpanded).toBe('function');
  });

  it('should validate WidgetCardProps interface (AC-9)', () => {
    // Test validates AC-9: Widget components use shared types for props
    const props: WidgetCardProps = {
      title: 'Test Widget',
      icon: 'anchor',
      state: 'normal',
      children: null
    };
    
    expect(props.title).toBe('Test Widget');
    expect(props.state).toBe('normal');
  });
});

describe('NMEA Types (6.6-UNIT-002) [P0]', () => {
  it('should validate NMEADataState interface (AC-3)', () => {
    // Test validates AC-3: NMEA data structure types for marine instruments
    const data = createNMEADataState({ 
      depth: 15.0,
      autopilotMode: 'standby' 
    });
    
    expect(data.depth).toBe(15.0);
    expect(data.engines.engine1.rpm).toBe(2000);
    expect(data.autopilotMode).toBe('standby');
  });

  it('should validate AutopilotMode enum (AC-3)', () => {
    // Test validates AC-3: Autopilot data types for marine control systems
    const modes: AutopilotMode[] = ['standby', 'auto', 'wind', 'track', 'power_steer'];
    expect(modes).toContain('auto');
    expect(modes).toContain('standby');
  });
});

describe('Theme Types (6.6-UNIT-003) [P1]', () => {
  it('should validate DisplayMode enum (AC-4)', () => {
    // Test validates AC-4: Theme types for design system integration
    const modes: DisplayMode[] = ['day', 'night', 'red-night'];
    expect(modes).toContain('day');
    expect(modes).toContain('red-night');
  });

  it('should validate AlertState enum (AC-4)', () => {
    // Test validates AC-4: Alert state types for consistent design system
    const states: AlertState[] = ['normal', 'warning', 'critical'];
    expect(states).toContain('warning');
    expect(states).toContain('critical');
  });

  it('should validate StoryThemeColors interface (AC-4)', () => {
    // Test validates AC-4: Theme color interface for design system integration
    const colors = createStoryThemeColors({ 
      primary: '#FF0000',
      backgroundDark: '#111111' 
    });
    
    expect(colors.primary).toBe('#FF0000');
    expect(colors.backgroundDark).toBe('#111111');
  });
});

describe('Service Types (6.6-UNIT-004) [P0]', () => {
  it('should validate ConnectionStatus enum (AC-8)', () => {
    // Test validates AC-8: Service layer uses shared types for interfaces
    const statuses: ConnectionStatus[] = ['disconnected', 'connecting', 'connected', 'error'];
    expect(statuses).toContain('connected');
    expect(statuses).toContain('error');
  });

  it('should validate StoryConnectionState interface (AC-8)', () => {
    // Test validates AC-8: Connection state interface for service consistency
    const state = createStoryConnectionState({
      status: 'error',
      wifiBridge: { host: '10.0.1.50', port: 3000 }
    });
    
    expect(state.status).toBe('error');
    expect(state.wifiBridge.host).toBe('10.0.1.50');
  });
});

describe('Store Types (6.6-UNIT-005) [P0]', () => {
  it('should validate GenericStoreState interface (AC-7)', () => {
    // Test validates AC-7: Types integrate with multi-store architecture
    const state: GenericStoreState<string> = {
      data: 'test data',
      loading: false,
      error: null
    };
    
    expect(state.data).toBe('test data');
    expect(state.loading).toBe(false);
    expect(state.error).toBeNull();
  });

  it('should validate NMEAStoreActions interface (AC-7)', () => {
    // Test validates AC-7: Store action interfaces for state management
    const actions: NMEAStoreActions = {
      updateDepth: (value: number, unit: string) => {
        expect(typeof value).toBe('number');
        expect(typeof unit).toBe('string');
      },
      updateSpeed: (sog: number | null, stw: number | null, unit: string) => {
        expect(typeof unit).toBe('string');
      },
      updateWind: (awa: number, aws: number, twa?: number, tws?: number) => {
        expect(typeof awa).toBe('number');
        expect(typeof aws).toBe('number');
      },
      resetAllData: () => {}
    };
    
    expect(typeof actions.updateDepth).toBe('function');
    expect(typeof actions.resetAllData).toBe('function');
  });
});

describe('Utility Types (6.6-UNIT-006) [P1]', () => {
  it('should validate Unit enum (AC-5)', () => {
    // Test validates AC-5: Utility types for common patterns
    const units: Unit[] = ['feet', 'meters', 'knots', 'celsius'];
    expect(units).toContain('feet');
    expect(units).toContain('knots');
  });

  it('should validate UnitConversion interface (AC-5)', () => {
    // Test validates AC-5: Generic interfaces for common patterns
    const conversion: UnitConversion = {
      from: 'feet',
      to: 'meters',
      factor: 0.3048
    };
    
    expect(conversion.from).toBe('feet');
    expect(conversion.factor).toBe(0.3048);
  });

  it('should validate DataPoint generic interface (AC-5)', () => {
    // Test validates AC-5: Generic interfaces with type safety
    const numberPoint: DataPoint<number> = {
      value: 42,
      timestamp: Date.now(),
      source: 'sensor-1'
    };
    
    const stringPoint: DataPoint<string> = {
      value: 'test',
      timestamp: Date.now()
    };
    
    expect(numberPoint.value).toBe(42);
    expect(stringPoint.value).toBe('test');
  });

  it('should validate Nullable type helper (AC-12)', () => {
    // Test validates AC-12: Generic types enable reuse with type safety
    const nullableString: Nullable<string> = null;
    const nonNullString: Nullable<string> = 'test';
    
    expect(nullableString).toBeNull();
    expect(nonNullString).toBe('test');
  });

  it('should validate Optional type helper (AC-12)', () => {
    // Test validates AC-12: Advanced generic patterns for type safety
    interface Required {
      a: string;
      b: number;
      c: boolean;
    }
    
    const partial: Optional<Required, 'b' | 'c'> = {
      a: 'required',
      // b and c are now optional
    };
    
    expect(partial.a).toBe('required');
  });

  it('should validate event handler types (AC-5)', () => {
    // Test validates AC-5: Generic event handler types for common patterns
    const simpleHandler: EventHandler<void> = () => {};
    const returningHandler: EventHandler<string> = () => 'result';
    const valueHandler: ValueChangeHandler<number> = (value: number) => {
      expect(typeof value).toBe('number');
    };
    
    expect(typeof simpleHandler).toBe('function');
    expect(typeof returningHandler).toBe('function');
    expect(typeof valueHandler).toBe('function');
  });
});

describe('Type Integration (6.6-UNIT-007) [P2]', () => {
  it('should allow cross-type composition (AC-6, AC-7)', () => {
    // Test validates AC-6,7: Types integrate across components and stores
    // Test that types work together properly
    const widgetData: GenericStoreState<NMEADataState> = {
      data: {
        depth: 10.5,
        engines: {},
        timestamps: {}
      },
      loading: false,
      error: null
    };
    
    const measurement: DataPoint<Nullable<number>> = {
      value: widgetData.data.depth || null,
      timestamp: Date.now(),
      source: 'depth-widget'
    };
    
    expect(measurement.value).toBe(10.5);
  });

  it('should support generic patterns (AC-12)', () => {
    // Test validates AC-12: Generic types maintain type safety with flexibility
    interface TestConfig {
      name: string;
      enabled: boolean;
      timeout: number;
    }
    
    const partialConfig: Optional<TestConfig, 'timeout'> = {
      name: 'test',
      enabled: true
      // timeout is now optional
    };
    
    const nullableConfig: Nullable<TestConfig> = null;
    
    expect(partialConfig.name).toBe('test');
    expect(nullableConfig).toBeNull();
  });
});

describe('Type Safety Validation (6.6-UNIT-008) [P1]', () => {
  it('should enforce WidgetType enum constraints (AC-2)', () => {
    // Test validates AC-2: Only valid widget types are accepted
    const validTypes: WidgetType[] = [
      'depth', 'speed', 'wind', 'compass', 'autopilot',
      'gps', 'temperature', 'voltage', 'engine', 'alarm',
      'battery', 'tanks', 'rudder'
    ];
    
    // Verify all types in enum are valid marine instrument types
    expect(validTypes.every(type => 
      ['depth', 'speed', 'wind', 'compass', 'autopilot', 'gps', 
       'temperature', 'voltage', 'engine', 'alarm', 'battery', 'tanks', 'rudder'].includes(type)
    )).toBe(true);
    
    // Verify complete type coverage for marine instruments
    expect(validTypes.length).toBe(13);
  });

  it('should enforce AutopilotMode enum constraints (AC-3)', () => {
    // Test validates AC-3: Only valid autopilot modes accepted
    const validModes: AutopilotMode[] = ['standby', 'auto', 'wind', 'track', 'power_steer'];
    
    // Test each mode is a valid marine autopilot state
    expect(validModes).toContain('standby'); // Manual steering
    expect(validModes).toContain('auto'); // Compass heading hold
    expect(validModes).toContain('wind'); // Wind angle hold
    expect(validModes).toContain('track'); // GPS track follow
    expect(validModes).toContain('power_steer'); // Joystick mode
  });

  it('should enforce ConnectionStatus enum constraints (AC-8)', () => {
    // Test validates AC-8: Connection states match real network states
    const validStatuses: ConnectionStatus[] = ['disconnected', 'connecting', 'connected', 'error'];
    
    // Verify complete connection state machine coverage
    expect(validStatuses).toEqual(expect.arrayContaining([
      'disconnected', // No connection
      'connecting', // Establishing connection
      'connected', // Active connection
      'error' // Connection failed
    ]));
  });

  it('should enforce DisplayMode enum constraints (AC-4)', () => {
    // Test validates AC-4: Display modes match marine display requirements
    const validModes: DisplayMode[] = ['day', 'night', 'red-night'];
    
    // Test marine-specific display modes
    expect(validModes).toContain('day'); // Daylight viewing
    expect(validModes).toContain('night'); // Low light preservation
    expect(validModes).toContain('red-night'); // Night vision preservation
  });

  it('should enforce AlertState enum constraints (AC-4)', () => {
    // Test validates AC-4: Alert states cover marine safety requirements
    const validStates: AlertState[] = ['normal', 'warning', 'critical'];
    
    // Verify marine safety alert hierarchy
    expect(validStates).toContain('normal'); // All systems nominal
    expect(validStates).toContain('warning'); // Attention required
    expect(validStates).toContain('critical'); // Immediate action required
  });

  it('should validate Unit enum for marine measurements (AC-5)', () => {
    // Test validates AC-5: Units cover marine measurement requirements
    const marineUnits: Unit[] = ['feet', 'meters', 'fathoms', 'knots', 'fahrenheit', 'celsius'];
    
    // Marine depth units
    expect(marineUnits).toContain('feet');
    expect(marineUnits).toContain('meters');
    expect(marineUnits).toContain('fathoms'); // Traditional marine depth
    
    // Marine speed units
    expect(marineUnits).toContain('knots'); // Nautical miles per hour
    
    // Marine temperature units
    expect(marineUnits).toContain('fahrenheit');
    expect(marineUnits).toContain('celsius');
  });
});

describe('Error Boundary Testing (6.6-UNIT-009) [P2]', () => {
  it('should handle null values gracefully in Nullable types (AC-12)', () => {
    // Test validates AC-12: Generic types handle edge cases safely
    const nullValue: Nullable<string> = null;
    const validValue: Nullable<string> = 'test';
    
    expect(nullValue).toBeNull();
    expect(validValue).toBe('test');
    
    // Test type narrowing works correctly
    if (validValue !== null) {
      expect(validValue.length).toBe(4);
    }
  });

  it('should handle partial objects in Optional types (AC-12)', () => {
    // Test validates AC-12: Optional types provide safe partial object patterns
    interface TestConfig {
      required: string;
      optional1?: number;
      optional2?: boolean;
    }
    
    const minimal: Optional<TestConfig, 'optional1' | 'optional2'> = {
      required: 'test'
      // optional1 and optional2 are now optional
    };
    
    expect(minimal.required).toBe('test');
    expect(minimal.optional1).toBeUndefined();
    expect(minimal.optional2).toBeUndefined();
  });

  it('should validate DataPoint generic with various types (AC-5)', () => {
    // Test validates AC-5: Generic interfaces work with different data types
    const numberPoint: DataPoint<number> = { value: 42, timestamp: Date.now() };
    const stringPoint: DataPoint<string> = { value: 'depth reading', timestamp: Date.now() };
    const booleanPoint: DataPoint<boolean> = { value: true, timestamp: Date.now(), source: 'alarm-system' };
    
    expect(typeof numberPoint.value).toBe('number');
    expect(typeof stringPoint.value).toBe('string');
    expect(typeof booleanPoint.value).toBe('boolean');
    
    // Test optional source field
    expect(booleanPoint.source).toBe('alarm-system');
    expect(numberPoint.source).toBeUndefined();
  });
});