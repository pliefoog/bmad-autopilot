# Boating Instruments App Frontend Architecture Document

*Updated with BMAD BMM Framework Integration Patterns*

## Table of Contents

- [Boating Instruments App Frontend Architecture Document](#boating-instruments-app-frontend-architecture-document)
  - [Change Log](./change-log.md)
  - [Document Scope](#document-scope)
  - [AI Agent Development Framework](./ai-agent-development-framework.md) ⭐ **NEW**
    - [Quick Reference for AI Agents](./ai-agent-development-framework.md#quick-reference-for-ai-agents)
    - [Widget Development Checklist](./ai-agent-development-framework.md#widget-development-checklist)
    - [Critical Implementation Patterns](./ai-agent-development-framework.md#critical-implementation-patterns)
  - [Storybook Integration Patterns](./storybook-integration-patterns.md) ⭐ **NEW**
    - [MockStoreProvider Pattern](./storybook-integration-patterns.md#mockstorerovider-pattern)
    - [Essential Story Types](./storybook-integration-patterns.md#essential-story-types)
    - [Maritime Settings Integration](./storybook-integration-patterns.md#maritime-settings-integration-pattern)
  - [Framework & Technology Selection](./framework-selection.md)
    - [Framework Decision: React Native](./framework-selection.md#framework-decision-react-native)
    - [Starter Template: Expo (Managed Workflow)](./framework-selection.md#starter-template-expo-managed-workflow)
  - [Frontend Tech Stack](./tech-stack.md)
    - [Technology Stack Table](./tech-stack.md#technology-stack-table)
    - [Additional Stack Notes](./tech-stack.md#additional-stack-notes)
  - [Project Structure](./project-structure.md)
    - [Directory Organization](./project-structure.md#directory-organization)
    - [Structure Rationale](./project-structure.md#structure-rationale)
  - [Component Standards](./component-standards.md) ⭐ **UPDATED**
    - [Component Template](./component-standards.md#component-template)
    - [Storybook Integration Requirements](./component-standards.md#storybook-integration-requirements)
    - [Naming Conventions](./component-standards.md#naming-conventions)
    - [Atomic Design Organization](./component-standards.md#atomic-design-organization)
  - [State Management](./state-management.md)
    - [Store Structure](./state-management.md#store-structure)
    - [State Management Template](./state-management.md#state-management-template)
    - [State Management Rationale](./state-management.md#state-management-rationale)
  - [Routing & Navigation](./routing.md)
    - [Route Configuration](./routing.md#route-configuration)
    - [Expo Router Implementation](./routing.md#expo-router-implementation)
  - [Styling Guidelines](./styling-guidelines.md)
    - [Styling Approach](./styling-guidelines.md#styling-approach)
    - [Theme Provider](./styling-guidelines.md#theme-provider)
    - [Global Theme Variables](./styling-guidelines.md#global-theme-variables)
  - [UI Design System](./design-system.md) ⭐ **UPDATED**
    - [Maritime Settings Framework](./design-system.md#maritime-settings-framework)
    - [Settings Component Patterns](./design-system.md#settings-component-patterns)
    - [Widget Grid System](./design-system.md#widget-grid-system)
    - [Monochromatic Design Language](./design-system.md#monochromatic-design-language)
    - [Alert Threshold Color System](./design-system.md#alert-threshold-color-system)
    - [Typography Hierarchy](./design-system.md#typography-hierarchy)
    - [Widget Title Display Standards](./design-system.md#widget-title-display-standards)
  - [API Integration](./api-integration.md)
    - [Service Template](./api-integration.md#service-template)
    - [API Client Configuration](./api-integration.md#api-client-configuration)
    - [API Integration Rationale](./api-integration.md#api-integration-rationale)
  - [Testing Requirements](./testing-requirements.md)
    - [Component Test Template](./testing-requirements.md#component-test-template)
    - [Testing Best Practices](./testing-requirements.md#testing-best-practices)
  - [Environment Configuration](./environment-configuration.md)
    - [Required Environment Variables](./environment-configuration.md#required-environment-variables)
    - [Development Setup](./environment-configuration.md#development-setup)
  - [Frontend Developer Standards](./developer-standards.md)
    - [Critical Coding Rules](./developer-standards.md#critical-coding-rules)
    - [Quick Reference](./developer-standards.md#quick-reference)

---

## Document Scope

This document serves as the **definitive authority** for all frontend architecture decisions including React Native framework selection, component organization, state management patterns, routing, styling, and UI design systems.

**Document Focus:** Complete React Native UI layer architecture and implementation patterns  
**System Integration:** Interfaces with core system architecture detailed in [docs/architecture.md](../architecture.md)  
**Authority:** This document governs all frontend technology decisions and Epic 6 UI Architecture alignment

**Sharded Architecture:** This document is organized into focused sections for improved navigation and development workflow. Each section addresses specific frontend architecture concerns while maintaining overall system cohesion.

---

## Architecture Integration Points

### System-to-Frontend Data Flow

The frontend architecture integrates with the core system architecture through well-defined interfaces:

```
Core System (architecture.md) → Frontend Layer (ui-architecture/)
        ↓                              ↓
NMEA Service Layer          →    State Management (Zustand)
TCP Socket Management      →    Connection Hooks & Components  
Data Models & Types        →    UI Components & Widgets
Deployment Infrastructure   →    Build & Development Workflow
```

**Key Integration Documents:**
- **[State Management](./state-management.md):** Zustand stores bridge system services to UI components
- **[API Integration](./api-integration.md):** Frontend service layer consumption patterns
- **[Component Standards](./component-standards.md):** UI component integration with system data models

### Epic 6 UI Architecture Alignment

This sharded architecture directly supports Epic 6: UI Architecture Alignment & Framework Modernization by providing:

- **[Framework Selection](./framework-selection.md):** Expo Router migration specifications (Story 6.7)
- **[Project Structure](./project-structure.md):** Directory alignment specifications (Story 6.8) 
- **[Component Standards](./component-standards.md):** Atomic Design implementation (Story 6.1)
- **[State Management](./state-management.md):** Multi-store architecture patterns (Story 6.2)
- **[Styling Guidelines](./styling-guidelines.md):** ThemeProvider system (Story 6.3)
- **[Developer Standards](./developer-standards.md):** Custom hooks infrastructure (Story 6.4)

Each section provides the detailed specifications needed for Epic 6 story implementation while maintaining architectural coherence across the entire frontend system.