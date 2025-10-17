# Epic 6: UI Architecture Alignment & Framework Modernization

**Epic Goal:** Transform the existing React Native implementation to align with the UI Architecture specification, improving maintainability, developer experience, and code quality through proper architectural patterns.

**Epic Status:** Ready for Development  
**Epic Priority:** High (Framework Foundation & Technical Debt Resolution)  
**Expected Timeline:** 6-8 weeks (8 stories)  
**Dependencies:** Builds on Epic 2 (widget framework) foundation

---

## Epic Overview

This epic addresses the significant gaps identified between the current React Native implementation and the comprehensive UI Architecture specification. While Epic 2 successfully delivered a functional widget framework, the underlying architecture has accumulated technical debt that needs resolution before advancing to more complex features.

### Key Architecture Gaps Addressed

1. **Framework Foundation**: Manual App.tsx routing → Expo Router 3.5+ file-based navigation
2. **Project Structure**: Mixed directory organization → UI Architecture specification alignment
3. **Component Organization**: Current flat component structure → Atomic Design architecture
4. **State Management**: Limited stores → Multi-domain Zustand store architecture  
5. **Theme System**: Direct imports → React Context ThemeProvider system
6. **Code Reuse**: Duplicated logic → Custom React hooks infrastructure
7. **Service Layer**: Flat structure → Domain-organized service architecture
8. **Type Safety**: Scattered types → Centralized TypeScript type system

### Business Justification

**Why Now:**
- Technical debt is impeding velocity on Epic 3 (autopilot control)
- Framework misalignment with UI Architecture specification creates architectural inconsistency
- Component reuse becomes critical as widget count scales
- Maintainability issues emerging with current flat architecture
- Type safety gaps causing runtime errors in marine environment

**Risk of Delay:**
- Increasing difficulty to refactor as codebase grows
- Framework architecture debt compounds with each new feature
- Developer onboarding becomes more complex
- Higher likelihood of marine safety bugs due to type issues
- Performance degradation as architecture doesn't scale

**UI Architecture Alignment:**
This epic directly implements the architectural patterns specified in [`docs/ui-architecture.md`](../ui-architecture.md), ensuring complete alignment with the framework foundation, component organization, and development patterns that will support all future epics.

---

## Story Breakdown

### [Story 6.1: Atomic Design Component Architecture](./story-6.1-atomic-design-structure.md)
**Goal:** Organize components using Atomic Design principles for better reusability and maintainability

**Key Deliverables:**
- Atoms: Button, StatusIndicator, LoadingSpinner
- Molecules: ModalContainer, SegmentedControl, FormField
- Organisms: StatusBar, SetupWizard
- Barrel exports for clean import paths

**Success Criteria:**
- 15+ reusable atomic components created
- All widgets use atomic components for consistent UI
- Developer velocity increases with reusable primitives

### [Story 6.2: Multi-Store Zustand Architecture Implementation](./story-6.2-multi-store-architecture.md)
**Goal:** Replace monolithic state with domain-specific stores for better performance and separation of concerns

**Key Deliverables:**
- widgetStore with AsyncStorage persistence
- settingsStore for user preferences
- alarmStore for safety configurations
- connectionStore for WiFi bridge management

**Success Criteria:**
- 5 domain-specific stores with proper persistence
- Widget re-render optimization through selective subscriptions
- Store performance <1KB per store

### [Story 6.3: ThemeProvider Context System Implementation](./story-6.3-theme-provider-context.md)
**Goal:** Centralize theme management with React Context for consistent theming across all components

**Key Deliverables:**
- ThemeProvider React Context wrapper
- useTheme hook for component access
- Day/Night/Red-Night mode support
- Typography and spacing modules

**Success Criteria:**
- Instant theme switching across all components
- Marine-specific color palettes properly implemented
- Type-safe theme access throughout app

### [Story 6.4: Custom React Hooks Infrastructure](./story-6.4-custom-hooks-infrastructure.md)
**Goal:** Create reusable hooks that encapsulate common data access and business logic patterns

**Key Deliverables:**
- useNMEAData hook with selector optimization
- useConnection hook for WiFi bridge status
- useWidgetConfig hook for widget operations
- useAlarmThreshold and useUnitConversion hooks

**Success Criteria:**
- 6+ custom hooks eliminate code duplication
- Widget components become 40% smaller through hook usage
- NMEA data access standardized across all widgets

### [Story 6.5: Service Layer Organization & Architecture](./story-6.5-service-layer-organization.md)
**Goal:** Organize services by domain with clear interfaces and proper dependency management

**Key Deliverables:**
- NMEA services (parser, connection, PGN decoder)
- Storage services (widgets, settings, credentials)
- Playback services (demo mode, file simulation)
- Service registry for dependency injection

**Success Criteria:**
- 10+ services organized into 3 domain directories
- Clear service interfaces with proper TypeScript typing
- Service layer supports marine safety requirements

### [Story 6.6: Shared TypeScript Types System](./story-6.6-shared-typescript-types.md)
**Goal:** Centralize TypeScript interfaces for consistent type safety across the entire application

**Key Deliverables:**
- Widget and component type definitions
- NMEA data structure interfaces
- Theme and styling types
- Service and store type definitions

**Success Criteria:**
- 50+ shared interfaces eliminate type duplication
- Complete IntelliSense support for development
- Type safety prevents marine safety-related runtime errors

### [Story 6.7: Expo Router Migration & File-Based Navigation](./story-6.7-expo-router-migration.md)
**Goal:** Migrate from manual routing to Expo Router 3.5+ file-based navigation system as specified in UI Architecture

**Key Deliverables:**
- `app/` directory structure with file-based routing
- Migration from current `App.tsx` to `app/_layout.tsx` pattern
- Navigation types and deep linking support
- Backward compatibility during transition

**Success Criteria:**
- Complete migration to `app/` directory structure
- File-based navigation operational for all screens
- Navigation performance maintained or improved
- Developer experience enhanced with automatic route generation

### [Story 6.8: Project Structure Alignment](./story-6.8-project-structure-alignment.md)
**Goal:** Align project directory structure with UI Architecture specification for consistency and maintainability

**Key Deliverables:**
- Reorganize components using `src/components/` atomic design structure
- Implement proper barrel exports for clean imports
- Align service organization with UI Architecture spec
- Update import paths and module resolution

**Success Criteria:**
- Project structure matches UI Architecture specification exactly
- All import paths use clean barrel export pattern
- Module resolution performance maintained
- Team onboarding complexity reduced through standardized structure

---

## Epic Success Metrics

### Technical Metrics
- **Code Reuse:** 60% reduction in component duplication
- **Bundle Size:** Maintain <5KB increase despite architecture improvements
- **Type Coverage:** 95%+ TypeScript coverage across all modules
- **Test Coverage:** Maintain 70%+ coverage through architecture changes

### Developer Experience Metrics  
- **Component Creation:** 50% faster widget development with atomic components
- **Onboarding Time:** New developers productive in 2 days vs 5 days
- **IntelliSense Coverage:** 100% autocomplete for all shared interfaces
- **Build Time:** No regression in compilation speed

### Quality Metrics
- **Runtime Errors:** 80% reduction in type-related crashes
- **Code Review Time:** 40% faster reviews with consistent patterns
- **Maintainability:** Cyclomatic complexity reduced by 30%
- **Performance:** No regression in widget render performance

---

## Implementation Strategy

### Phase 1: Foundation (Stories 6.7, 6.8, 6.6)
- **Week 1-2:** Expo Router migration + Project structure + TypeScript types
- **Rationale:** Framework foundation must be established before component architecture
- **Risk Mitigation:** Router migration isolated from component changes

### Phase 2: Component Architecture (Stories 6.1, 6.3)
- **Week 3-4:** Atomic design + ThemeProvider systems
- **Rationale:** Component structure and theming work together for consistent UI
- **Integration:** Theme system supports atomic component hierarchy

### Phase 3: State & Services (Stories 6.2, 6.4, 6.5)
- **Week 5-6:** Multi-store + Custom hooks + Service organization
- **Rationale:** Data management patterns built on stable component foundation
- **Validation:** Complete architecture ready for Epic 3 development

### Migration Strategy
- **Backward Compatibility:** All changes maintain existing functionality
- **Incremental Migration:** Components migrate gradually to new patterns
- **Testing:** Comprehensive test coverage prevents regressions
- **Documentation:** Clear migration guides for development team

---

## Risk Assessment & Mitigation

### Technical Risks
- **Bundle Size Growth:** Monitor with each story, optimize imports
- **Performance Regression:** Benchmark widget rendering throughout epic
- **Breaking Changes:** Strict backward compatibility requirements

### Team Risks  
- **Learning Curve:** Provide training on new architectural patterns
- **Parallel Development:** Clear story dependencies prevent conflicts
- **Code Review Overhead:** Establish new patterns review checklist

### Business Risks
- **Epic 3 Delay:** This epic is prerequisite for autopilot development
- **User Impact:** All changes must be invisible to end users
- **Marine Safety:** Architecture changes cannot introduce safety regressions

---

## Definition of Epic Done

### Framework Alignment
- [ ] Expo Router 3.5+ file-based navigation implemented
- [ ] Project structure matches UI Architecture specification exactly
- [ ] Navigation performance maintained or improved vs manual routing
- [ ] All screens accessible via file-based routing patterns

### Architecture Alignment
- [ ] All components follow Atomic Design organization
- [ ] State management uses multi-domain store architecture
- [ ] Theme system uses React Context patterns
- [ ] Service layer organized by domain with clear interfaces

### Developer Experience
- [ ] Custom hooks eliminate common code duplication patterns
- [ ] Shared TypeScript types provide complete IntelliSense support
- [ ] Component creation follows established, documented patterns
- [ ] New developer onboarding time reduced to <2 days
- [ ] Clean import paths using barrel exports throughout codebase

### Quality Assurance
- [ ] All Epic 2 functionality preserved without regression
- [ ] Test coverage maintained at 70%+ throughout migration
- [ ] Performance benchmarks show no degradation in render speed
- [ ] TypeScript compilation successful with strict mode enabled
- [ ] Navigation transitions smooth and performant

### Documentation & Training
- [ ] Architecture documentation updated with new patterns
- [ ] Component development guide completed
- [ ] Code review checklist updated for new architectural standards

---

## Epic 6 Extensions for UI Architecture v2.1

### [Story 6.9: Theme Provider Context Enhancement - Brownfield Addition](./story-6.9-theme-provider-context-enhancement.md)
**Goal:** Enhance existing theme system with marine safety validation and comprehensive display mode support

**As a** developer building marine widgets,  
**I want** a comprehensive theme context system with marine safety validation,  
**so that** I can ensure all UI components are compliant with marine night vision requirements.

**Key Deliverables:**
- Enhanced ThemeProvider with DisplayMode type ('day' | 'night' | 'red-night')
- Theme compliance validation function for development mode
- Marine-safe color palettes with precise RGB values
- Native brightness control integration APIs
- Auto-switch capability based on time/GPS (future-ready)

**Success Criteria:**
- Theme validation catches 100% of marine safety violations
- Context performance optimized for frequent theme switches
- Type safety enforced at compile time

### [Story 6.10: Multi-Instance NMEA Widget Detection - Brownfield Addition](./story-6.10-multi-instance-nmea-widget-detection.md)
**Goal:** Automatically detect and create separate widgets for multiple boat systems based on NMEA instance data

**As a** boat owner with multiple engines and battery banks,  
**I want** the app to automatically detect and create separate widgets for each system,  
**so that** I can monitor all my boat's systems without manual configuration.

**Key Deliverables:**
- Automatic detection of NMEA engine instances (create Engine #1, #2, etc. widgets)
- Battery instance mapping to descriptive names (House, Thruster, Generator)
- Tank instance detection with fluid type identification (Fuel Port, Water Fresh)
- Dynamic widget titles based on NMEA instance data
- Graceful handling of instance additions/removals during runtime

**Success Criteria:**
- Instance detection works reliably across different NMEA sources
- Performance impact negligible with multiple instances
- Memory usage scales appropriately with instance count
- [ ] Architecture decision records created for all major changes
- [ ] Component usage documentation updated for new patterns
- [ ] Team training completed on new architectural patterns
- [ ] Migration guides available for ongoing development
- [ ] UI Architecture specification compliance verified

---

## Handoff to Epic 3

Upon completion of Epic 6, the development team will have:

1. **Clean Architecture Foundation:** Proper separation of concerns enables complex autopilot feature development
2. **Reusable Component Library:** Atomic components accelerate autopilot UI development
3. **Type-Safe Development:** Shared interfaces prevent autopilot safety-related errors
4. **Performance Optimized:** Architecture scales to support additional autopilot widgets
5. **Maintainable Codebase:** Clear patterns support long-term autopilot feature evolution

This architecture foundation is essential for Epic 3's success, as autopilot control requires the highest levels of code quality, type safety, and maintainability due to marine safety implications.

---

## Change Log

| Date | Author | Changes |
|------|--------|---------|
| 2025-10-14 | Winston (Architect) | Initial epic creation from UI Architecture gap analysis |