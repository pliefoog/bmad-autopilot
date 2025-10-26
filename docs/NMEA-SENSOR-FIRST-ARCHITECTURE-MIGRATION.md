# NMEA Sensor-First Architecture Migration

**Status:** In Progress  
**Started:** October 25, 2025  
**Target:** Complete architectural transformation to eliminate `TransformedNmeaData` mess while preserving unit/formatting system  

## Migration Overview

### Current Problem
- **Multiple data definitions** for same concepts across `TransformedNmeaData`, `SensorData`, and store interfaces
- **Data pipeline complexity**: `NMEA → Parser → Transformer → StoreUpdater → Store → Widget` with different formats at each step
- **No widgets detected** because RPM sentences aren't being processed properly
- **Violation of DRY principle** with engine/depth/tank data defined in 3+ places

### Target Architecture: Sensor-First + Decoupled Presentation
```
NMEA Sentence → Direct Sensor Update → Store (base units) → Widget → Presentation Layer → Formatted Display
     ↑                    ↑                 ↑               ↑              ↑                    ↑
   $IIRPM,E,0,1200,A   rpm: 1200      depth: 5.2m    getSensorData()  convertAndFormat()   "17.1 ft"
```

**Key Benefits:**
- ✅ Preserve critical presentation system (no changes to unit conversion)
- ✅ Eliminate `TransformedNmeaData` interface (single source of truth)
- ✅ Fix "no widgets detected" issue
- ✅ Reduce codebase by ~60% (remove redundant layers)
- ✅ Perfect type safety (widgets work with final data format)

---

## Migration Phases

### Phase 1.1: Create NmeaSensorProcessor Class ✅
**Status:** COMPLETED
**Target:** Create new src/services/nmea/data/NmeaSensorProcessor.ts

**Implementation:**
```typescript
// ✅ DONE: Created class with processMessage() method
// ✅ DONE: Implemented base unit standards (meters, knots, Celsius, degrees)  
// ✅ DONE: Added instance support for multi-device scenarios
// ✅ DONE: Included type-safe SensorUpdate interface
// ✅ DONE: Comprehensive sentence processing for RPM, DBT, GGA, RMC, VTG, VHW, MWV, HDG, MTW
```

### Phase 1.2: Implement RPM Processing ✅
**Status:** COMPLETED  
**Target:** Critical for fixing "no widgets detected" issue

**Implementation:**
```typescript
// ✅ DONE: processRPM() method for engine sentences
// ✅ DONE: Handle engine instance detection properly  
// ✅ DONE: Create EngineSensorData with name, rpm, timestamp
// ✅ DONE: Parse engine instance from NMEA fields correctly
```

### Phase 2: Migrate Critical Sentences
**Status:** 📋 Planned  
**Goal:** Migrate high-priority NMEA sentences one by one

#### Priority Order:
1. **RPM** (Engine data) - CRITICAL for current issue
2. **DBT/DPT/DBK** (Depth data) - High usage
3. **GGA/RMC** (GPS data) - Navigation essential
4. **MWV** (Wind data) - Environmental
5. **VTG/VHW** (Speed data) - Performance
6. **XDR** (Tank/Temperature data) - Multi-instance

#### Tasks per sentence type:
- [ ] Add `process{SentenceType}()` method
- [ ] Update `PureStoreUpdater` to use new processor
- [ ] Verify widget compatibility
- [ ] Test instance detection
- [ ] Validate presentation system

### Phase 3: Update Store Interface
**Status:** 📋 Planned  
**Goal:** Clean NMEA store to be purely sensor-based

#### Tasks:
- [ ] 3.1. Remove legacy methods from `NmeaStore`
- [ ] 3.2. Keep only sensor-based methods:
  - `updateSensorData<T>(type, instance, data)`
  - `getSensorData<T>(type, instance)`
  - `getSensorInstances<T>(type)`
- [ ] 3.3. Update instance detection to use only sensor data
- [ ] 3.4. Remove `TransformedNmeaData` references

### Phase 4: Remove TransformedNmeaData
**Status:** 📋 Planned  
**Goal:** Eliminate redundant transformation layer entirely

#### Tasks:
- [ ] 4.1. Remove `TransformedNmeaData` interface
- [ ] 4.2. Remove `PureDataTransformer` class
- [ ] 4.3. Update `NmeaService` to use `NmeaSensorProcessor` directly
- [ ] 4.4. Clean up imports and references
- [ ] 4.5. Update tests and documentation

### Phase 5: Validation & Optimization
**Status:** 📋 Planned  
**Goal:** Ensure system works perfectly with all features

#### Tasks:
- [ ] 5.1. Test all widget types with real NMEA data
- [ ] 5.2. Verify instance detection for multi-engine scenarios
- [ ] 5.3. Test unit conversion system extensively
- [ ] 5.4. Performance validation
- [ ] 5.5. Cross-platform testing (web, iOS, Android)

---

## Technical Specifications

### Sensor Update Interface
```typescript
interface SensorUpdate<T extends SensorData> {
  sensorType: SensorType;
  instance: number;
  data: Partial<T>;
}
```

### Base Unit Standards
- **Depth:** Always meters
- **Speed:** Always knots  
- **Temperature:** Always Celsius
- **Coordinates:** Always decimal degrees
- **RPM:** Raw RPM value
- **Pressure:** Always bars

### Presentation Layer (UNCHANGED)
```typescript
// Current system preserved - no changes needed
const depthPresentation = useDepthPresentation(); // m/ft/fathoms
const speedPresentation = useSpeedPresentation(); // knots/mph/km/h
const tempPresentation = useTemperaturePresentation(); // °C/°F

// Widget usage unchanged
<PrimaryMetricCell
  value={depthPresentation.convertAndFormat(sensorData.depth)}
  unit={depthPresentation.presentation?.symbol}
/>
```

---

## Current Issue Resolution

### Problem: No Widgets Detected
**Root Cause:** RPM sentences not being processed by `PureDataTransformer`  
**Current Status:** `[InstanceDetection] Detected instances: {engines: 0, batteries: 0, tanks: 0}`  
**Solution:** Implement `NmeaSensorProcessor.processRPM()` to properly handle engine data  

### Immediate Next Steps (Phase 1.1-1.5):
1. Create `NmeaSensorProcessor` class
2. Implement RPM processing for engine detection
3. Update `PureStoreUpdater` to use both old and new systems in parallel
4. Test engine widget detection
5. Verify web server shows detected engines

---

## Migration Safety

### Backward Compatibility Strategy:
- **Parallel Processing:** Run both old and new systems simultaneously during migration
- **Feature Flags:** Use configuration to toggle between old/new processing
- **Rollback Plan:** Keep old system intact until new system fully validated
- **Testing:** Extensive testing at each phase before proceeding

### Risk Mitigation:
- **Data Loss Prevention:** Maintain existing data structures until migration complete
- **Widget Compatibility:** Ensure widgets continue working throughout migration
- **Performance Monitoring:** Track system performance during transition
- **User Experience:** No visible changes during migration phases

---

## Success Metrics

### Phase 1 Success Criteria:
- ✅ Engine widgets appear on dashboard with RPM data
- ✅ Instance detection shows `engines: 2` (from current simulator)
- ✅ Widget displays show actual RPM values (e.g., "1200 RPM")
- ✅ Presentation system continues working (unit conversion unchanged)

### Final Success Criteria:
- ✅ All NMEA sentence types processed through sensor-first architecture
- ✅ `TransformedNmeaData` interface completely removed
- ✅ Codebase reduced by 50-60% (elimination of redundant layers)
- ✅ Perfect type safety throughout pipeline
- ✅ All widgets working with real-time unit conversion
- ✅ Cross-platform compatibility maintained

---

## Development Log

### 2025-10-25 - Project Initiated
- **Issue Identified:** No widgets detected due to RPM processing gap
- **Architecture Analysis:** Identified `TransformedNmeaData` as major architectural problem
- **Solution Designed:** Sensor-First Architecture with preserved presentation layer
- **Phase 1 Started:** Creating `NmeaSensorProcessor` for direct NMEA → Sensor mapping

### Next Update: TBD
- Phase 1.1 completion status
- RPM processing implementation results
- Engine widget detection verification