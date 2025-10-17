# Story 6.5: Service Layer Organization & Architecture

<!-- Source: UI Architecture Gap Analysis -->
<!-- Context: Brownfield enhancement to existing React Native implementation -->

**Epic:** Epic 6 - UI Architecture Alignment & Framework Modernization  
**Story ID:** 6.5  
**Status:** Ready for Development

---

## Story

**As a** developer working on the marine instrument app  
**I want** services organized by domain with clear separation of concerns  
**So that** I can maintain NMEA parsing, storage operations, and playback functionality independently

---

## Acceptance Criteria

### Functional Requirements
1. Reorganize services into domain-specific subdirectories (nmea/, storage/, playback/)
2. Create missing storage services for widget layouts, settings, and WiFi credentials
3. Implement NMEA parser and PGN decoder services with proper TypeScript interfaces
4. Add playback service for demo mode and NMEA file simulation
5. Establish clear service interfaces and dependency injection patterns

### Integration Requirements
6. Existing services continue to work unchanged during reorganization
7. Service layer integrates with multi-store architecture from Story 6.2
8. Custom hooks from Story 6.4 access services through proper abstractions
9. Services maintain singleton patterns where appropriate for connection management

### Quality Requirements
10. Each service has focused responsibility and clear API boundaries
11. Services use proper error handling and logging for marine safety
12. TypeScript interfaces ensure type safety across all service operations
13. Services include comprehensive unit tests with proper mocking
14. Service documentation explains usage patterns and error handling

---

## Dev Notes

### Technical Context

**Current Implementation Analysis:**
- Flat service structure: 14 files in `src/services/` without domain organization
- Missing storage abstraction services for different data types
- No dedicated NMEA parsing/PGN decoding service separation
- Playback service exists but lacks proper integration architecture

**Current Services (to be reorganized):**
```
src/services/
├── autopilotCommandQueue.ts      # → nmea/
├── autopilotErrorManager.ts      # → nmea/
├── autopilotMonitoringService.ts # → nmea/  
├── nmeaConnection.ts            # → nmea/
├── layoutService.ts             # → storage/
├── playbackService.ts           # → playback/
├── gracefulDegradationService.ts # → core/
└── ... (other autopilot services)
```

**Target Service Architecture (from UI Architecture spec):**
```
src/services/                 # Business logic and external interactions
├── nmea/
│   ├── NMEAConnection.ts     # TCP socket manager (existing)
│   ├── NMEAParser.ts         # NMEA 0183/2000 parser (NEW)
│   ├── PGNDecoder.ts         # Raymarine PGN decoder (NEW)
│   ├── AutopilotCommands.ts  # Autopilot command service (NEW)
│   └── types.ts              # NMEA data types (NEW)
├── storage/
│   ├── widgetStorage.ts      # AsyncStorage for layouts (NEW)
│   ├── settingsStorage.ts    # User preferences (NEW)
│   └── secureStorage.ts      # WiFi credentials (NEW)
├── playback/
│   ├── NMEAPlayback.ts       # File-based playback mode (ENHANCED)
│   └── sampleData.ts         # Demo mode data (NEW)
└── index.ts                  # Service registry/barrel exports
```

**Service Interface Specifications:**

**NMEA Services:**
```typescript
// NMEAParser.ts
export interface NMEAParseResult {
  type: string;
  data: Record<string, any>;
  timestamp: number;
  checksum: string;
}

export class NMEAParser {
  parse(sentence: string): NMEAParseResult | null;
  validateChecksum(sentence: string): boolean;
  getSentenceType(sentence: string): string;
}

// PGNDecoder.ts
export interface PGNDecodeResult {
  pgn: number;
  source: number;
  destination: number;
  data: Record<string, any>;
}

export class PGNDecoder {
  decode(pgnData: Buffer): PGNDecodeResult | null;
  getSupportedPGNs(): number[];
}
```

**Storage Services:**
```typescript
// widgetStorage.ts
export interface WidgetStorageService {
  saveLayout(widgets: WidgetConfig[]): Promise<void>;
  loadLayout(): Promise<WidgetConfig[]>;
  clearLayout(): Promise<void>;
}

// settingsStorage.ts  
export interface SettingsStorageService {
  saveSettings(settings: AppSettings): Promise<void>;
  loadSettings(): Promise<AppSettings>;
  saveThemePreference(theme: DisplayMode): Promise<void>;
}

// secureStorage.ts
export interface SecureStorageService {
  saveWiFiCredentials(host: string, port: number): Promise<void>;
  loadWiFiCredentials(): Promise<{ host: string; port: number } | null>;
  clearCredentials(): Promise<void>;
}
```

**Playback Services:**
```typescript
// NMEAPlayback.ts
export interface PlaybackService {
  loadFile(filename: string): Promise<void>;
  startPlayback(speed?: number): void;
  pausePlayback(): void;
  stopPlayback(): void;
  getAvailableFiles(): string[];
}
```

**Migration Strategy:**
1. **Phase 1**: Create new service directory structure
2. **Phase 2**: Migrate existing services to appropriate domains
3. **Phase 3**: Create missing storage and parsing services
4. **Phase 4**: Implement service registry and dependency management
5. **Phase 5**: Update all service imports and integrations

**Integration Points:**
- Services accessed through custom hooks from Story 6.4
- Storage services integrate with store persistence from Story 6.2
- NMEA services work with existing connection and parsing logic
- Playback services integrate with demo mode and testing infrastructure

**Dependency Management:**
- Singleton pattern for connection services (NMEAConnection)
- Factory pattern for parser services (multiple instances allowed)
- Service registry for dependency injection and testing
- Clear service interfaces for mocking and testing

---

## Tasks / Subtasks

- [ ] Task 1: Create Service Directory Structure (AC: 1)
  - [ ] Create `src/services/nmea/`, `storage/`, `playback/` directories
  - [ ] Set up barrel exports for each service domain
  - [ ] Create service registry for dependency management
  - [ ] Plan migration strategy to minimize disruption

- [ ] Task 2: Migrate and Enhance NMEA Services (AC: 3, 6)
  - [ ] Move existing `nmeaConnection.ts` to `nmea/NMEAConnection.ts`
  - [ ] Create separate `NMEAParser.ts` service for parsing logic
  - [ ] Build `PGNDecoder.ts` for NMEA2000 message decoding
  - [ ] Implement `AutopilotCommands.ts` for command generation
  - [ ] Add comprehensive TypeScript interfaces for all NMEA operations

- [ ] Task 3: Create Storage Services (AC: 2, 10)
  - [ ] Build `widgetStorage.ts` for layout persistence
  - [ ] Implement `settingsStorage.ts` for user preferences
  - [ ] Create `secureStorage.ts` for sensitive WiFi credentials
  - [ ] Add proper error handling and data validation

- [ ] Task 4: Enhance Playback Services (AC: 4)
  - [ ] Migrate existing `playbackService.ts` to `playback/NMEAPlayback.ts`
  - [ ] Create `sampleData.ts` with demo NMEA sequences
  - [ ] Add file loading and playback control capabilities
  - [ ] Implement playback speed control and looping

- [ ] Task 5: Service Integration and Dependencies (AC: 7, 8, 9)
  - [ ] Update multi-store architecture to use new storage services
  - [ ] Connect custom hooks to appropriate service abstractions
  - [ ] Implement service registry for dependency injection
  - [ ] Maintain singleton patterns for connection management

- [ ] Task 6: Testing and Documentation (AC: 11, 12, 13, 14)
  - [ ] Write comprehensive unit tests for all services
  - [ ] Implement proper mocking strategies for service testing
  - [ ] Add error handling and logging for marine safety requirements
  - [ ] Create service documentation with usage examples

---

## Testing

### Unit Tests
- **Service Isolation**: Test each service independently with proper mocking
- **Interface Compliance**: Verify all services implement expected interfaces
- **Error Handling**: Test error scenarios and recovery patterns

### Integration Tests
- **Store Integration**: Test storage services with persistence layer
- **NMEA Pipeline**: Test complete NMEA parsing and data flow
- **Service Registry**: Test dependency injection and service resolution

### Performance Tests
- **Parsing Performance**: Verify NMEA parsing handles 500+ msg/sec
- **Storage Performance**: Test AsyncStorage operations don't block UI
- **Memory Usage**: Verify services don't leak memory during operation

---

## Definition of Done

- [ ] Services organized into domain-specific subdirectories with clear boundaries
- [ ] Missing storage services created for widgets, settings, and credentials
- [ ] NMEA parsing and PGN decoding services properly separated and typed
- [ ] Enhanced playback service supports demo mode and file-based simulation
- [ ] Service interfaces established with proper TypeScript typing
- [ ] Existing services continue to work unchanged during reorganization
- [ ] Service layer properly integrates with multi-store architecture
- [ ] Custom hooks access services through clean abstraction layers
- [ ] Singleton patterns maintained for connection management services
- [ ] Each service has focused responsibility and clear error handling
- [ ] Comprehensive unit tests cover all service functionality
- [ ] Service documentation explains usage patterns and integration points
- [ ] Performance characteristics verified for marine real-time requirements

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