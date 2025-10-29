<!-- [MermaidChart: 87137ce8-2ceb-4f3c-b004-d00077df8e0b] -->
# Epic 10: NMEA Bridge Simulator Architecture Modernization

**Epic ID:** 10  
**Epic Owner:** Development Team  
**Epic Duration:** 1-2 weeks remaining (6 story points remaining)  
**Epic Priority:** High (Essential for project success)  
**Epic Status:** 67% Complete - Stories 10.1 & 10.2 ✅ COMPLETED

---

## Epic Goal

**UPDATED GOAL:** Consolidate three separate NMEA tools into unified architecture with mode-based operation, clean modular components, and single entry point. **PROGRESS:** 67% complete - modular refactoring and API standardization completed, ready for tool consolidation phase.

## Epic Value Proposition

**Business Value:**
- **Reduced Technical Debt:** Modular architecture improves maintainability and reduces development friction
- **Enhanced QA Capabilities:** Complete scenario library enables comprehensive testing across all user stories  
- **Improved Developer Experience:** Consistent documentation and deployment infrastructure accelerates development
- **Project Success Foundation:** Essential functionality for scalable marine application development

**Technical Value:**
- **Modular Architecture:** Clean separation of concerns aligned with industry best practices
- **API Standardization:** "Simulator Control API" with complete endpoint coverage (no more confusing naming)
- **Complete Testing:** Comprehensive scenario library covering all marine operational conditions
- **Single Source of Truth:** One authoritative architecture document, all conflicts removed

## Current State Analysis

**Strong Foundation Already Exists:**
- ✅ **Multi-Protocol Servers:** TCP:2000, UDP:2000, WebSocket:8080 fully operational
- ✅ **Bridge Mode Support:** NMEA 0183/2000 with bidirectional autopilot control
- ✅ **Scenario Engine:** Advanced YAML validation and runtime function compilation
- ✅ **Performance:** Meets all targets (500+ msg/sec, <100MB RAM, 50+ connections)
- ✅ **Real-World Usage:** Currently supporting development workflows

**✅ COMPLETED IMPROVEMENTS (October 2025):**
- ✅ **Modular Architecture:** Epic 10.1 completed - clean component extraction  
- ✅ **API Standardization:** Epic 10.2 completed - "Simulator Control API" implemented
- ✅ **Performance Validated:** 500+ msg/sec, <100MB RAM, 50+ connections
- ✅ **Protocol Stack:** TCP/UDP/WebSocket multi-protocol support operational

**🔄 REMAINING WORK:**
- ⚠️ **Tool Consolidation:** Still three separate tools, ready for unification
- ⚠️ **Documentation:** README conflicts remain, ready for cleanup phase

## Epic Stories Breakdown

### **✅ Story 10.1: Modular Component Extraction** (5 points) - **COMPLETED**
**Status:** ✅ **COMPLETED** - All deliverables validated and operational

**Completed Deliverables:**
- ✅ Modular component architecture implemented
- ✅ Clean separation of concerns established  
- ✅ Performance characteristics maintained
- ✅ All functionality preserved during refactoring

### **✅ Story 10.2: API Standardization & Renaming** (3 points) - **COMPLETED**
**Status:** ✅ **COMPLETED** - API naming standardized and endpoints operational

**Completed Deliverables:**
- ✅ "Simulator Control API" naming implemented across all components
- ✅ File renaming: `bmad-integration-api.js` → `simulator-control-api.js`
- ✅ Comprehensive API documentation created (OpenAPI 3.0.3)
- ✅ All 13 REST endpoints operational and tested
- ✅ Startup output streamlined and professional
- ✅ Backward compatibility maintained

### **Story 10.3: Tool Consolidation & Unified CLI** (3 points)
**Objective:** Create unified `nmea-bridge.js` with mode-based operation

**Deliverables:**
- Create unified `nmea-bridge.js` entry point
- Implement mode routing: `--live`, `--file`, `--scenario`
- Consolidate data source implementations from existing tools
- Create `lib/data-sources/` with mode-specific providers:
  - `live.js` - Extract from `nmea-websocket-bridge-enhanced.js`
  - `file.js` - Extract from existing file playback functionality  
  - `scenario.js` - Extract from `nmea-bridge-simulator.js`
- Unified protocol server layer serving all modes

**Success Criteria:**
- Single CLI interface replaces three separate tools
- All existing functionality accessible through unified interface
- VS Code tasks updated for new CLI patterns
- No functional regressions from consolidation

### **Story 10.4: Documentation Consolidation** (2 points)
**Objective:** Resolve documentation conflicts and create unified documentation

**Deliverables:**
- Resolve README.md vs README-SIMULATOR.md conflicts
- Create single unified README.md for consolidated tool
- Update all documentation references to unified CLI
- Clean up legacy documentation files:
  - Remove outdated architecture documents
  - Update file references to consolidated tool
  - Update GitHub Copilot instructions

**VS Code Task Updates:**
- Update all tasks to use unified `nmea-bridge.js` CLI
- Standardize task naming for new tool structure
- Remove legacy task definitions

**Success Criteria:**
- Single authoritative documentation set
- No conflicting or outdated documentation
- All examples use unified CLI interface
- Updated developer tooling reflects consolidation

### **Story 10.5: Final Validation & Testing** (1 point)
**Objective:** Validate consolidated tool functionality and performance

**Deliverables:**
- Manual testing of all three modes (live, file, scenario)
- Performance validation maintains targets (500+ msg/sec, <100MB RAM)
- Integration testing with existing React Native app
- VS Code task validation with new CLI interface
- Legacy tool decommissioning plan

**Success Criteria:**
- All three operational modes function correctly
- Performance targets maintained post-consolidation  
- No breaking changes for existing integrations
- Clean migration path documented
- Legacy tools can be safely removed

### **Story 10.6: Enhanced Multi-Parameter Evolution Engine** (8 points) ← **FUTURE ENHANCEMENT**
**Status:** **MOVED TO FUTURE EPIC** - Focus on core consolidation first

**Note:** This advanced physics-based simulation engine has been moved to a future epic to focus Epic 10 on the essential consolidation work. The enhanced capabilities will be addressed after the unified tool foundation is established.

**Future Scope:**
- Multi-parameter scenario format with vessel profiles
- Sailboat physics engine with polar diagrams
- State-driven NMEA orchestration
- Realistic sailing behavior simulation

## Scope Exclusions

**NOT included in Epic 10** (moved to future epics):
- ❌ Docker infrastructure (separate Epic for deployment)
- ❌ CI/CD integration (separate Epic for DevOps)
- ❌ Scenario-to-recording conversion (removed entirely - over-engineering)
- ❌ Advanced monitoring/alerting (separate Epic for observability)

## Success Criteria

**Architecture Modernization:**
- [ ] Implementation matches clean modular architecture
- [ ] Main file reduced to <500 lines with clear component separation
- [ ] All documented API endpoints operational
- [ ] Complete scenario library coverage achieved

**Quality & Testing:**
- [ ] 90%+ test coverage across all modules
- [ ] Performance targets validated (500+ msg/sec, <100MB RAM)
- [ ] Cross-platform compatibility confirmed
- [ ] External tools can execute full workflows via Simulator Control API

**Documentation & Process:**
- [ ] Single authoritative architecture document (no conflicts)
- [ ] VS Code tasks standardized and documented
- [ ] GitHub Copilot instructions updated for task-first workflow
- [ ] All old conflicting documentation removed from Git

## Epic Timeline

**Total Duration:** 1-2 weeks remaining (67% complete)  
**Total Story Points:** 6 points remaining (14 points total, 8 completed)

**✅ Phase 1:** Modular Refactoring (2-3 weeks) - **COMPLETED**
- ✅ Story 10.1: Component extraction (5 points) - **COMPLETED**
- ✅ Story 10.2: API standardization (3 points) - **COMPLETED**

**🔄 Phase 2:** Tool Consolidation (1-2 weeks) - **IN PROGRESS**
- Story 10.3: Tool consolidation & unified CLI (3 points) - **READY TO START**
- Story 10.4: Documentation consolidation (2 points) - **READY TO START**
- Story 10.5: Final validation (1 point) - **READY TO START**

## Risk Assessment

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| Breaking existing functionality during refactoring | High | Low | Comprehensive test suite, incremental refactoring |
| Performance degradation from component separation | Medium | Low | Performance testing at each step, benchmarking |
| Developer workflow disruption | Medium | Medium | Maintain backward compatibility, clear migration guide |
| Timeline extension due to technical complexity | Low | Medium | Well-understood codebase, clear scope boundaries |

## Dependencies

**Internal Dependencies:**
- Current NMEA Bridge Simulator (fully functional)
- Existing test scenarios and VS Code tasks
- Development team availability

**External Dependencies:**
- None (Epic is self-contained)

**Blocking Dependencies:**
- None (can start immediately)

## Epic Definition of Done

- ✅ Stories 10.1 & 10.2 completed and validated (67% complete)
- ✅ Modular architecture implemented with clean component separation  
- ✅ All API endpoints renamed and operational ("Simulator Control API")
- [ ] **Unified CLI interface with mode-based operation** ← **STORY 10.3**
- [ ] **Single consolidated tool replacing three separate tools** ← **STORY 10.3**
- [ ] **Documentation conflicts resolved and unified** ← **STORY 10.4**
- [ ] **VS Code tasks updated for unified CLI** ← **STORY 10.4**
- [ ] **Performance validation post-consolidation** ← **STORY 10.5**
- [ ] **Clean migration path from legacy tools** ← **STORY 10.5**
- ✅ Single authoritative architecture document created
- ✅ GitHub Copilot instructions updated
- ✅ All old conflicting documentation removed from Git
- ✅ Cross-platform compatibility maintained

## Post-Epic Benefits

**For Development Teams:**
- **Faster Onboarding:** Clear modular architecture with single documentation source
- **Reduced Friction:** Standardized tasks and consistent API naming  
- **Better Testing:** Existing scenario coverage with unified tool interface
- **Easier Maintenance:** Small, focused components instead of monolithic file
- **Unified Workflow:** Single tool replaces three separate tools

**For Marine Application Development:**
- **Production-Ready Infrastructure:** Professional-grade testing foundation
- **Comprehensive QA:** All marine operational scenarios accessible through unified interface
- **Scalable Architecture:** Clean foundation for future enhancements
- **Industry Standards:** Following established patterns for testing infrastructure
- **Operational Simplicity:** Mode-based operation (live/file/scenario) through single entry point
- **Development Efficiency:** Single CLI interface for all NMEA testing needs

---

## Ready for Implementation

**Epic 10 Status:** 🔄 **67% COMPLETE - READY FOR CONSOLIDATION PHASE**

**✅ COMPLETED WORK:**
- ✅ Architecture Document: Created (`docs/architecture/nmea-simulator-architecture.md`)  
- ✅ Old Documentation: Removed (conflicts eliminated)  
- ✅ GitHub Copilot Instructions: Updated (task-first workflow)  
- ✅ Story 10.1: Modular component extraction (5 points) - **COMPLETED**
- ✅ Story 10.2: API standardization (3 points) - **COMPLETED**

**🔄 REMAINING WORK (6 story points):**
- Story 10.3: Tool consolidation & unified CLI (3 points) - **READY TO START**
- Story 10.4: Documentation consolidation (2 points) - **READY TO START**
- Story 10.5: Final validation & testing (1 point) - **READY TO START**

**Next Step:** Begin Story 10.3 (Tool Consolidation & Unified CLI)

This Epic represents essential functionality for the success of the marine application project and provides the foundation for scalable, maintainable testing infrastructure.

---

**Document Status:** ✅ Ready for Epic Implementation  
**Epic Owner:** Development Team  
**Architecture Review:** ✅ Approved by Winston (Architect Agent)  
**Created:** October 27, 2025