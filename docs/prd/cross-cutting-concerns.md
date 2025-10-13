# Cross-Cutting Concerns

The following requirements flow through multiple epics rather than being isolated to one:

- **FR30 (Settings persistence)** - Epic 1 foundation, used in all subsequent epics
- **FR32 (Missing data handling)** - Epic 1 foundation, applied to all widgets in Epic 2-4
- **FR33 (Real-time updates <1s)** - Epic 2 foundation, applies to all widgets and autopilot
- **NFR4 (Responsive UI)** - Epic 2 foundation, validated in all subsequent epics
- **NFR17 (Widget architecture extensibility)** - Epic 2 architectural decisions enable Phase 1.5 custom widgets
- **NFR18 (70% test coverage)** - Built incrementally in Epic 1-5, validated continuously

---
