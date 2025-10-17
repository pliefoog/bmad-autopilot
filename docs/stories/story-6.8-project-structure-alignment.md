# Story 6.8: Project Structure Alignment

<!-- Source: UI Architecture Gap Analysis -->

**Story ID:** 6.8  
**Epic:** Epic 6 - UI Architecture Alignment & Framework Modernization  
**Status:** Ready for Development  
**Priority:** High (Framework Foundation)  
**Estimate:** 4 Story Points  

## Story Description

**As a** development team  
**I want** to align the project directory structure with the UI Architecture specification  
**So that** the codebase follows established patterns, uses clean imports via barrel exports, and provides a consistent developer experience.

## Business Context

**Current State Gap:** The project uses a mixed directory structure that partially aligns with UI Architecture but lacks proper atomic design organization, consistent barrel exports, and some architectural components.

**UI Architecture Requirement:**
> Project structure should follow atomic design principles with clean barrel exports, organized service layers, and standardized component hierarchy.

**Impact of Misalignment:**
- Inconsistent import patterns across the codebase
- Missing atomic design component organization
- Developer onboarding complexity due to non-standard structure
- Difficult to locate and maintain components as project scales

## Acceptance Criteria

**Directory Structure Requirements:**
1. Reorganize `src/components/` using atomic design (atoms/molecules/organisms)
2. Implement barrel exports (`index.ts`) for clean import paths
3. Align service organization with UI Architecture specification
4. Create standardized `src/types/` directory for shared TypeScript interfaces
5. Organize `src/hooks/` directory with proper grouping and exports
6. Standardize `src/theme/` directory structure with UI Architecture spec

**Import Path Requirements:**
7. All component imports use barrel exports (e.g., `from '@/components/atoms'`)
8. Service imports follow organized patterns (`from '@/services/nmea'`)
9. Type imports use centralized patterns (`from '@/types'`)
10. Hook imports standardized (`from '@/hooks'`)

**Code Organization:**
11. Remove duplicate or incorrectly placed files
12. Ensure consistent naming conventions throughout directory structure
13. Verify all imports resolve correctly after reorganization
14. Maintain webpack alias support for `@/` imports

## Current State Analysis

**Existing Structure Assessment:**
```
src/
├── components/          # ❌ Flat structure, missing atomic design
├── core/               # ⚠️ Should be store/ per UI Architecture
├── hooks/              # ⚠️ Exists but lacks organization
├── mobile/             # ✅ Platform-specific code (correct)
├── services/           # ⚠️ Flat structure, needs domain organization
├── styles/             # ⚠️ Should be theme/ per UI Architecture
├── utils/              # ✅ Correctly placed
└── widgets/            # ✅ Correctly placed and organized
```

**Target Architecture (from UI Architecture Component Standards and Framework Selection):**
```
src/
├── components/               # Reusable UI components
│   ├── atoms/                # Atomic design: smallest building blocks
│   │   ├── Button.tsx
│   │   ├── StatusIndicator.tsx
│   │   ├── LoadingSpinner.tsx
│   │   └── index.ts          # Barrel export
│   ├── molecules/            # Composed components
│   │   ├── ModalContainer.tsx
│   │   ├── SegmentedControl.tsx
│   │   ├── FormField.tsx
│   │   └── index.ts
│   ├── organisms/            # Complex UI sections
│   │   ├── StatusBar.tsx
│   │   ├── SetupWizard/
│   │   └── index.ts
│   └── index.ts              # Barrel exports
│
├── services/                 # Business logic and external interactions
│   ├── nmea/
│   │   ├── NMEAConnection.ts
│   │   ├── NMEAParser.ts
│   │   ├── PGNDecoder.ts
│   │   └── types.ts
│   ├── storage/
│   ├── playback/
│   └── index.ts
│
├── store/                    # Zustand state management (renamed from core/)
├── hooks/                    # Custom React hooks
├── theme/                    # Design system (renamed from styles/)
├── utils/                    # Helper functions
├── types/                    # Shared TypeScript types
└── widgets/                  # Marine instrument widgets
```

## Dev Notes

### Technical Context

**Architecture Reference:** See [UI Architecture - Component Standards](../ui-architecture/component-standards.md) for atomic design implementation patterns and [UI Architecture - Framework Selection](../ui-architecture/framework-selection.md) for project organization guidelines.

**Current Codebase Analysis:**
- Existing `src/components/` directory contains mixed component organization
- Current stores located in `src/core/` (should be `src/store/` per UI Architecture)
- Missing atomic design structure for component reusability
- Import paths use inconsistent patterns (mix of relative and alias imports)

### Component Reorganization Strategy

**Phase 1: Atomic Design Implementation**

**Step 1: Create Atomic Structure**
```bash
cd src/components
mkdir -p atoms molecules organisms
touch atoms/index.ts molecules/index.ts organisms/index.ts index.ts
```

**Step 2: Identify and Categorize Existing Components**

**Atoms (Smallest UI Building Blocks):**
- Button variants (primary, secondary, icon)
- StatusIndicator (connection, alarm states)
- LoadingSpinner
- Text input fields
- Icons and status dots

**Molecules (Composed Components):**
- ModalContainer (header + content + actions)
- SegmentedControl (multiple buttons)
- FormField (label + input + validation)
- Card wrappers
- Navigation items

**Organisms (Complex UI Sections):**
- StatusBar (connection + battery + settings)
- Dashboard grid layout
- Settings panels
- Widget selector interface

**Step 3: Create Atomic Components**
```typescript
// src/components/atoms/Button.tsx
import React from 'react';
import { Pressable, Text, StyleSheet } from 'react-native';
import { useTheme } from '@/hooks/useTheme';

interface ButtonProps {
  title: string;
  variant?: 'primary' | 'secondary' | 'icon';
  onPress: () => void;
  disabled?: boolean;
}

export const Button: React.FC<ButtonProps> = ({ 
  title, 
  variant = 'primary', 
  onPress, 
  disabled = false 
}) => {
  const { colors } = useTheme();
  
  return (
    <Pressable
      style={[styles.button, { backgroundColor: colors.primary }]}
      onPress={onPress}
      disabled={disabled}
    >
      <Text style={[styles.text, { color: colors.onPrimary }]}>
        {title}
      </Text>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  button: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    minHeight: 44, // Accessibility requirement
  },
  text: {
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
});
```

**Step 4: Barrel Export Implementation**
```typescript
// src/components/atoms/index.ts
export { Button } from './Button';
export { StatusIndicator } from './StatusIndicator';
export { LoadingSpinner } from './LoadingSpinner';

// src/components/molecules/index.ts
export { ModalContainer } from './ModalContainer';
export { SegmentedControl } from './SegmentedControl';
export { FormField } from './FormField';

// src/components/organisms/index.ts
export { StatusBar } from './StatusBar';
export { SetupWizard } from './SetupWizard';

// src/components/index.ts
export * from './atoms';
export * from './molecules';
export * from './organisms';
```

### Service Layer Reorganization

**Step 5: Domain-Based Service Organization**
```bash
cd src/services
mkdir -p nmea storage playback
mv nmeaConnection.ts nmea/NMEAConnection.ts
mv nmeaParser.ts nmea/NMEAParser.ts
# Continue organizing by domain...
```

**Step 6: Service Barrel Exports**
```typescript
// src/services/nmea/index.ts
export { NMEAConnection } from './NMEAConnection';
export { NMEAParser } from './NMEAParser';
export { PGNDecoder } from './PGNDecoder';
export * from './types';

// src/services/index.ts
export * from './nmea';
export * from './storage';
export * from './playback';
```

### Directory Renames & Cleanup

**Step 7: Core Architectural Renames**
```bash
# Rename directories to match UI Architecture
mv src/core src/store
mv src/styles src/theme

# Create missing directories
mkdir -p src/types
```

**Step 8: Update Import Paths**

**Before (Inconsistent):**
```typescript
import { nmeaConnection } from '../services/nmeaConnection';
import { Button } from '../../components/Button';
import { useNmeaStore } from '../core/nmeaStore';
```

**After (Clean with Barrel Exports):**
```typescript
import { nmeaConnection } from '@/services/nmea';
import { Button } from '@/components/atoms';
import { useNmeaStore } from '@/store';
```

### Webpack Configuration Updates

**Step 8A: Update Webpack Alias Configuration**
```javascript
// webpack.config.js - Update alias configuration
const path = require('path');

module.exports = {
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
      '@/components': path.resolve(__dirname, 'src/components'),
      '@/store': path.resolve(__dirname, 'src/store'),
      '@/services': path.resolve(__dirname, 'src/services'),
      '@/theme': path.resolve(__dirname, 'src/theme'),
      '@/types': path.resolve(__dirname, 'src/types'),
      '@/hooks': path.resolve(__dirname, 'src/hooks'),
      '@/utils': path.resolve(__dirname, 'src/utils'),
    },
  },
};
```

**Step 8B: Update TypeScript Path Mapping**
```json
// tsconfig.json - Update paths configuration
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/*": ["src/*"],
      "@/components/*": ["src/components/*"],
      "@/store/*": ["src/store/*"],
      "@/services/*": ["src/services/*"],
      "@/theme/*": ["src/theme/*"],
      "@/types/*": ["src/types/*"],
      "@/hooks/*": ["src/hooks/*"],
      "@/utils/*": ["src/utils/*"]
    }
  }
}
```

### TypeScript Types Organization

**Step 9: Centralized Type Definitions**
```typescript
// src/types/widget.types.ts
export interface WidgetConfig {
  id: string;
  type: WidgetType;
  position: { x: number; y: number };
  size: { width: number; height: number };
  config: WidgetSettings;
}

export type WidgetType = 
  | 'depth' | 'speed' | 'wind' | 'compass' 
  | 'autopilot' | 'gps' | 'temperature' 
  | 'voltage' | 'engine' | 'alarm';

// src/types/index.ts
export * from './widget.types';
export * from './nmea.types';
export * from './navigation.types';
export * from './theme.types';
```

### Migration Strategy & Validation

**Migration Approach:**
1. **Create New Structure:** Build atomic design structure alongside existing
2. **Migrate Components:** Move components to appropriate atomic categories
3. **Update Imports:** Replace direct imports with barrel exports
4. **Validate Functionality:** Test all features work after reorganization
5. **Remove Old Structure:** Clean up old directories and files

**Import Path Validation:**
- All `@/` aliases resolve correctly
- TypeScript compilation successful
- Bundle size impact measured
- Hot reload performance maintained

## Task Breakdown

### Directory Structure Creation
- [ ] **Task 6.8.1:** Create atomic design directory structure (`atoms/`, `molecules/`, `organisms/`)
- [ ] **Task 6.8.2:** Rename `src/core/` to `src/store/` per UI Architecture
- [ ] **Task 6.8.3:** Rename `src/styles/` to `src/theme/` per UI Architecture
- [ ] **Task 6.8.4:** Create `src/types/` directory for shared TypeScript interfaces
- [ ] **Task 6.8.5:** Organize `src/services/` into domain subdirectories

### Component Migration
- [ ] **Task 6.8.6:** Identify and categorize existing components into atomic design levels
- [ ] **Task 6.8.7:** Create atomic components (Button, StatusIndicator, LoadingSpinner)
- [ ] **Task 6.8.8:** Create molecule components (ModalContainer, FormField, SegmentedControl)
- [ ] **Task 6.8.9:** Create organism components (StatusBar, Dashboard, SetupWizard)
- [ ] **Task 6.8.10:** Migrate existing components to appropriate atomic levels

### Barrel Export Implementation
- [ ] **Task 6.8.11:** Create barrel exports for all atomic component categories
- [ ] **Task 6.8.12:** Implement service layer barrel exports by domain
- [ ] **Task 6.8.13:** Create centralized type exports in `src/types/index.ts`
- [ ] **Task 6.8.14:** Implement hook barrel exports in `src/hooks/index.ts`
- [ ] **Task 6.8.15:** Create root-level barrel export in `src/index.ts`

### Import Path Updates
- [ ] **Task 6.8.16:** Update all component imports to use barrel exports
- [ ] **Task 6.8.17:** Update service imports to use domain-based paths
- [ ] **Task 6.8.18:** Update store/state imports to new `src/store/` structure
- [ ] **Task 6.8.19:** Update theme imports to new `src/theme/` structure
- [ ] **Task 6.8.20:** Validate all TypeScript imports resolve correctly

### Validation & Cleanup
- [ ] **Task 6.8.21:** Test all functionality works after reorganization
- [ ] **Task 6.8.22:** Update Jest test suite imports to use new barrel export paths
- [ ] **Task 6.8.23:** Verify bundle size impact within acceptable limits
- [ ] **Task 6.8.24:** Confirm hot reload performance maintained  
- [ ] **Task 6.8.25:** Update webpack configuration for new alias patterns
- [ ] **Task 6.8.26:** Remove old/unused directories and files
- [ ] **Task 6.8.27:** Update development documentation with new structure

## Success Metrics

**Structure Alignment:**
- ✅ Project structure matches UI Architecture specification exactly
- ✅ Atomic design principles properly implemented across components
- ✅ Service layer organized by domain with clear separation

**Import Path Quality:**
- All imports use barrel exports (no deep relative imports)
- TypeScript autocomplete works for all organized modules
- Import statements 50% shorter on average

**Developer Experience:**
- Component location predictable based on atomic design principles
- New components follow established organizational patterns
- Onboarding documentation simplified through consistent structure

## Testing

### Jest Configuration Updates
- **Import Path Updates**: Update all test files to use new barrel export imports
- **Mock Configuration**: Update jest mocks to align with new directory structure
- **Path Mapping**: Ensure Jest resolves `@/` aliases correctly

### Testing Patterns for New Structure
```typescript
// __tests__/components/atoms/Button.test.tsx
import { Button } from '@/components/atoms';
import { render, fireEvent } from '@testing-library/react-native';

describe('Button Component', () => {
  it('should render with barrel export import', () => {
    const { getByText } = render(<Button title="Test" />);
    expect(getByText('Test')).toBeTruthy();
  });
});

// __tests__/store/widgetStore.test.ts  
import { useWidgetStore } from '@/store';
import { renderHook, act } from '@testing-library/react-hooks';

describe('Widget Store', () => {
  it('should manage widget state correctly', () => {
    const { result } = renderHook(() => useWidgetStore());
    // Test store functionality...
  });
});
```

### Migration Testing Checklist
- [ ] All existing tests pass with new import paths
- [ ] Jest configuration supports new alias patterns  
- [ ] Mock imports updated for new directory structure
- [ ] Test coverage maintained throughout reorganization

## Dependencies

**Prerequisite Stories:** 
- Story 6.7 (Expo Router Migration) - Navigation structure provides foundation

**Dependent Stories:**
- Story 6.1 (Atomic Design) - Benefits from organized component structure
- Story 6.2 (Multi-Store) - Uses organized store directory
- Story 6.3 (ThemeProvider) - Uses organized theme directory

**External Dependencies:**
- Webpack alias configuration for `@/` imports
- TypeScript path mapping configuration
- Metro bundler alias support

## Risks & Mitigation

**Technical Risks:**
- **Import Resolution Issues:** Test imports thoroughly during migration
- **Bundle Size Impact:** Monitor build output size throughout reorganization
- **Performance Regression:** Validate hot reload and build times

**Team Risks:**
- **Learning Curve:** Provide clear documentation of new structure
- **Migration Errors:** Use systematic approach with validation at each step

**Business Risks:**
- **Feature Development Pause:** Structure changes may temporarily slow development
- **Regression Introduction:** Thorough testing prevents functionality breaks

## Definition of Done

### Structure Implementation
- [ ] All directories match UI Architecture specification exactly
- [ ] Atomic design principles implemented for component organization
- [ ] Service layer organized by domain with clear interfaces
- [ ] Shared TypeScript types centralized in `src/types/`

### Import System
- [ ] Barrel exports implemented for all major code categories
- [ ] All imports use clean paths (no deep relative imports)
- [ ] TypeScript autocomplete works perfectly for organized modules
- [ ] Import performance maintained or improved

### Code Quality
- [ ] All existing functionality works identically after reorganization
- [ ] TypeScript compilation successful with no errors
- [ ] Bundle size impact documented and within acceptable limits
- [ ] Hot reload performance maintained

### Documentation
- [ ] Directory structure documented for team reference
- [ ] Component organization guidelines established
- [ ] Import path conventions documented
- [ ] Migration lessons captured for future reference

---

## Dev Agent Record

*This section is reserved for the development agent to document implementation progress, challenges, and solutions during story development.*

### Agent Model Used
*To be populated by Dev Agent during implementation*

### Debug Log References  
*To be populated by Dev Agent with links to relevant debug logs and traces*

### Completion Notes List
*To be populated by Dev Agent with implementation notes and issues encountered*

### File List
*To be populated by Dev Agent with all files created, modified, or affected during implementation*

---

## QA Results

*This section is reserved for the QA Agent to document test results, quality assessment, and acceptance criteria validation after story implementation.*

---

## Change Log

| Date | Author | Changes |
|------|--------|---------|
| 2025-10-14 | Winston (Architect) | Initial story creation for UI Architecture alignment |