# Story 6.6: Shared TypeScript Types System

<!-- Source: UI Architecture Gap Analysis -->
<!-- Context: Brownfield enhancement to existing React Native implementation -->

**Epic:** Epic 6 - UI Architecture Alignment & Framework Modernization  
**Story ID:** 6.6  
**Status:** Ready for Development

---

## Story

**As a** developer building the marine instrument app  
**I want** centralized, well-organized TypeScript interfaces and types  
**So that** I have consistent type safety across components, services, and stores

---

## Acceptance Criteria

### Functional Requirements
1. Create centralized types directory with domain-specific type modules
2. Define comprehensive widget configuration and props interfaces
3. Implement NMEA data structure types for all marine instruments
4. Add theme and styling types for consistent design system integration
5. Create utility types and generic interfaces for common patterns

### Integration Requirements
6. All existing components migrate to use shared types without breaking changes
7. Types integrate with multi-store architecture from previous stories
8. Service layer uses shared types for consistent interfaces
9. Widget components use shared types for props and configuration

### Quality Requirements
10. All types follow consistent naming conventions and documentation standards
11. Types provide complete IntelliSense support for development
12. Generic types enable reuse while maintaining type safety
13. Types include JSDoc comments for complex interfaces
14. Type exports organized with barrel exports for clean imports

---

## Dev Notes

### Technical Context

**Current Implementation Analysis:**
- Minimal type organization: Only `src/@types/react-native-vector-icons.d.ts` exists
- Types scattered throughout individual files without centralization
- No shared type definitions for common patterns (widgets, NMEA data, themes)
- Missing comprehensive interfaces for marine-specific data structures

**Target Types Architecture (from UI Architecture spec):**
```
src/types/                    # Shared TypeScript types
├── widget.types.ts           # Widget props, config interfaces
├── nmea.types.ts             # NMEA data structures
├── theme.types.ts            # Theme and styling types (NEW)
├── navigation.types.ts       # Navigation types (future Expo Router)
├── service.types.ts          # Service interface types (NEW)
├── store.types.ts            # Store state and action types (NEW)
├── util.types.ts             # Utility and generic types (NEW)
└── index.ts                  # Barrel exports
```

**Type Specifications (from Architecture and Implementation Analysis):**

**Widget Types (`widget.types.ts`):**
```typescript
export type WidgetType =
  | 'depth' | 'speed' | 'wind' | 'compass' | 'autopilot'
  | 'gps' | 'temperature' | 'voltage' | 'engine' | 'alarm'
  | 'battery' | 'tanks' | 'rudder';

export interface WidgetConfig {
  id: string; // Unique ID (UUID)
  type: WidgetType;
  position: { x: number; y: number }; // Grid position
  size: { width: number; height: number }; // Widget dimensions
  config: {
    dataSource?: string; // For multi-sensor boats
    unit?: string; // Unit override
    visualizationStyle?: 'digital' | 'analog' | 'bar';
  };
}

export interface BaseWidgetProps {
  widgetId: string;
  expanded?: boolean;
  onToggleExpanded?: () => void;
  onLongPress?: () => void;
}

export interface WidgetCardProps {
  title: string;
  icon?: string;
  state?: AlertState;
  children: React.ReactNode;
}
```

**NMEA Types (`nmea.types.ts`):**
```typescript
export interface NMEADataState {
  // Navigation data
  depth?: number;
  speedOverGround?: number;
  speedThroughWater?: number;
  heading?: number;
  latitude?: number;
  longitude?: number;
  cog?: number; // Course over ground

  // Environmental data  
  apparentWindAngle?: number;
  apparentWindSpeed?: number;
  trueWindAngle?: number;
  trueWindSpeed?: number;
  waterTemperature?: number;
  
  // Electrical systems
  batteryVoltage?: number;
  
  // Engine data (multi-engine support)
  engines: {
    [id: string]: EngineData;
  };
  
  // Autopilot data
  autopilotMode?: AutopilotMode;
  targetHeading?: number;
  rudderPosition?: number;
  
  // Timestamps for staleness detection
  timestamps: {
    [key: string]: number;
  };
}

export interface EngineData {
  rpm?: number;
  temperature?: number;
  oilPressure?: number;
  fuelRate?: number;
  timestamp?: number;
}

export type AutopilotMode = 'standby' | 'auto' | 'wind' | 'track' | 'power_steer';

export interface NMEAParseResult {
  type: string;
  data: Record<string, any>;
  timestamp: number;
  checksum?: string;
}
```

**Theme Types (`theme.types.ts`):**
```typescript
export type DisplayMode = 'day' | 'night' | 'red-night';

export type AlertState = 'normal' | 'warning' | 'critical';

export interface ThemeColors {
  primary: string;
  secondary: string;
  accent: string;
  success: string;
  warning: string;
  error: string;
  backgroundDark: string;
  backgroundMedium: string;
  borderGray: string;
  textPrimary: string;
  textSecondary: string;
  textTertiary: string;
}

export interface ThemeTypography {
  widgetTitle: TextStyle;
  metricValue: TextStyle;
  metricUnit: TextStyle;
  metricLabel: TextStyle;
}

export interface ThemeSpacing {
  xs: number;
  sm: number;
  md: number;
  lg: number;
  xl: number;
}
```

**Service Types (`service.types.ts`):**
```typescript
export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error';

export interface ConnectionState {
  status: ConnectionStatus;
  wifiBridge: {
    host: string;
    port: number;
    lastConnected?: number;
  };
  retryState: {
    attempts: number;
    nextRetryAt?: number;
  };
}

export interface StorageService<T> {
  save(data: T): Promise<void>;
  load(): Promise<T | null>;
  clear(): Promise<void>;
}

export interface PlaybackService {
  loadFile(filename: string): Promise<void>;
  startPlayback(speed?: number): void;
  pausePlayback(): void;
  stopPlayback(): void;
  getAvailableFiles(): string[];
}
```

**Store Types (`store.types.ts`):**
```typescript
export interface StoreState<T> {
  data: T;
  loading: boolean;
  error: string | null;
}

export interface NMEAStoreActions {
  updateDepth: (value: number, unit: string) => void;
  updateSpeed: (sog: number | null, stw: number | null, unit: string) => void;
  updateWind: (awa: number, aws: number, twa?: number, tws?: number) => void;
  resetAllData: () => void;
}

export interface WidgetStoreActions {
  addWidget: (type: WidgetType) => void;
  removeWidget: (id: string) => void;
  updateWidgetConfig: (id: string, config: Partial<WidgetConfig['config']>) => void;
  updateWidgetPosition: (id: string, position: { x: number; y: number }) => void;
}
```

**Utility Types (`util.types.ts`):**
```typescript
export type Unit = 'feet' | 'meters' | 'fathoms' | 'knots' | 'mph' | 'kmh' | 'fahrenheit' | 'celsius';

export interface UnitConversion {
  from: Unit;
  to: Unit;
  factor: number;
}

export interface DataPoint<T = number> {
  value: T;
  timestamp: number;
  source?: string;
}

export type Nullable<T> = T | null;
export type Optional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

// Generic event handler types
export type EventHandler<T = void> = () => T;
export type ValueChangeHandler<T> = (value: T) => void;
export type AsyncEventHandler<T = void> = () => Promise<T>;
```

**Migration Strategy:**
1. **Phase 1**: Create types directory structure and base interfaces
2. **Phase 2**: Extract and centralize types from existing components
3. **Phase 3**: Add comprehensive marine and NMEA-specific types
4. **Phase 4**: Update all imports to use shared types
5. **Phase 5**: Add generic types and utility interfaces

---

## Tasks / Subtasks

- [ ] Task 1: Create Types Directory Structure (AC: 1, 14)
  - [ ] Create `src/types/` directory
  - [ ] Set up individual type modules for each domain
  - [ ] Create barrel export `index.ts` for clean imports
  - [ ] Establish naming conventions and documentation standards

- [ ] Task 2: Define Widget and Component Types (AC: 2, 9)
  - [ ] Create comprehensive `widget.types.ts` with all widget interfaces
  - [ ] Define base component prop patterns and generic interfaces
  - [ ] Add widget configuration and layout types
  - [ ] Include alert states and interaction handler types

- [ ] Task 3: Implement NMEA and Marine Data Types (AC: 3)
  - [ ] Build complete `nmea.types.ts` with all marine instrument data
  - [ ] Add engine, autopilot, and navigation data interfaces
  - [ ] Include timestamp tracking and staleness detection types
  - [ ] Define parsing result and error types

- [ ] Task 4: Create Theme and Design System Types (AC: 4)
  - [ ] Implement `theme.types.ts` with display modes and color palettes
  - [ ] Add typography and spacing type definitions
  - [ ] Include alert color system and animation types
  - [ ] Define component styling and variant types

- [ ] Task 5: Add Service and Store Types (AC: 7, 8)
  - [ ] Create `service.types.ts` with all service interface definitions
  - [ ] Build `store.types.ts` with state and action patterns
  - [ ] Add connection management and storage service types
  - [ ] Include playback and testing service interfaces

- [ ] Task 6: Implement Utility Types and Migration (AC: 5, 6, 10, 11)
  - [ ] Create `util.types.ts` with generic patterns and helpers
  - [ ] Add JSDoc documentation for all complex interfaces
  - [ ] Migrate all existing components to use shared types
  - [ ] Verify complete IntelliSense support and type safety

---

## Testing

### Type Safety Tests
- **Compilation**: Verify all types compile without errors
- **Interface Compliance**: Test that components implement expected interfaces
- **Generic Types**: Verify generic types work with various parameter types

### Integration Tests
- **Import Resolution**: Test barrel exports resolve correctly
- **Cross-Module Types**: Verify types work across different modules
- **Backward Compatibility**: Ensure migration doesn't break existing functionality

### Developer Experience
- **IntelliSense**: Verify autocomplete works for all type definitions
- **Error Messages**: Test that TypeScript errors are clear and helpful
- **Documentation**: Verify JSDoc comments display properly in IDE

---

## Definition of Done

- [ ] Complete types directory created with domain-specific modules
- [ ] Comprehensive widget configuration and props interfaces defined
- [ ] NMEA data structure types cover all marine instruments
- [ ] Theme and styling types support complete design system integration
- [ ] Utility types and generic interfaces enable code reuse with type safety
- [ ] All existing components successfully migrated to shared types
- [ ] Types properly integrate with multi-store architecture
- [ ] Service layer uses shared types for consistent interfaces
- [ ] Widget components use shared types for props and configuration
- [ ] Consistent naming conventions and JSDoc documentation throughout
- [ ] Complete IntelliSense support for development productivity
- [ ] Generic types maintain type safety while enabling flexibility
- [ ] Barrel exports provide clean import paths for all type definitions

---

## Dev Agent Record

*This section is populated by the development agent during implementation*

### Agent Model Used
*To be populated by Dev Agent*

### Debug Log References
*To be populated by Dev Agent*

### Completion Notes List
*To be populated by Dev Agent*

### File List
*To be populated by Dev Agent*

---

## QA Results

*Results from QA Agent review of the completed story implementation*

*To be populated by QA Agent*

---

## Change Log

| Date | Author | Changes |
|------|--------|---------|
| 2025-10-14 | Winston (Architect) | Initial story creation from UI Architecture gap analysis |
| 2025-10-14 | Sarah (Product Owner) | Updated status to Ready for Development, added BMAD agent sections |