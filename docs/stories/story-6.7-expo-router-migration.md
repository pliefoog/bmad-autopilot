# Story 6.7: Expo Router Migration & File-Based Navigation

<!-- Source: UI Architecture Gap Analysis -->

**Story ID:** 6.7  
**Epic:** Epic 6 - UI Architecture Alignment & Framework Modernization  
**Status:** Ready for Development  
**Priority:** High (Framework Foundation)  
**Estimate:** 5 Story Points  

## Story Description

**As a** development team  
**I want** to migrate from manual App.tsx routing to Expo Router 3.5+ file-based navigation  
**So that** the app follows the UI Architecture specification and benefits from automatic route generation, deep linking, and improved developer experience.

## Business Context

**Current State Gap:** The application currently uses a manual `App.tsx` entry point with traditional React Native navigation patterns, which conflicts with the UI Architecture specification calling for Expo Router 3.5+ file-based navigation.

**UI Architecture Requirement:** 
> **Routing:** Expo Router 3.5+ - File-based navigation built on React Navigation; reduces boilerplate; deep linking support for future features

**Impact of Misalignment:**
- Developer experience suffers from manual route configuration
- Missing automatic route generation capabilities
- No deep linking support for future desktop/web features
- Architecture inconsistency blocks Epic 3 development

## Acceptance Criteria

**Framework Migration Requirements:**
1. Install and configure Expo Router 3.5+ dependency
2. Create `app/` directory structure with file-based routing
3. Migrate current `App.tsx` functionality to `app/_layout.tsx` root layout
4. Create `app/index.tsx` for main dashboard screen
5. Implement `app/settings.tsx` for settings screen
6. Add `app/widget-selector.tsx` for widget library modal
7. Configure `app/+not-found.tsx` for 404 handling

**Navigation Functionality:**
8. All existing navigation flows work identically after migration
9. Screen transitions maintain current performance characteristics
10. Modal presentation works for settings and widget selector
11. Deep linking foundation established (for future use)
12. Navigation state persistence maintained

**Code Quality:**
13. All navigation-related TypeScript types properly defined
14. Import paths updated to reflect new file structure

## Implementation Specification

**Architecture Reference:** See [UI Architecture - Routing](../ui-architecture/routing.md) for complete Expo Router implementation patterns, file-based navigation structure, and route configuration templates.
15. Bundle size impact <1MB additional overhead
16. Hot reload/fast refresh functionality maintained

## Current State Analysis

**Existing Navigation Architecture:**
- `boatingInstrumentsApp/App.tsx` - Manual entry point
- `boatingInstrumentsApp/src/mobile/App.tsx` - Mobile-specific app root
- Manual navigation logic scattered throughout components

**Target Architecture (from UI Architecture spec):**
```
app/                          # Expo Router file-based routing
├── _layout.tsx               # Root layout with theme provider
├── index.tsx                 # Dashboard/Canvas (primary screen)
├── settings.tsx              # Settings screen
├── widget-selector.tsx       # Widget library modal
└── +not-found.tsx            # 404 screen
```

## Dev Notes

### Expo Router Installation & Configuration

**Step 1: Install Dependencies**
```bash
cd boatingInstrumentsApp
npx expo install expo-router react-native-safe-area-context react-native-screens
```

**Step 2: Update app.json Configuration**
```json
{
  "expo": {
    "scheme": "boating-instruments",
    "plugins": [
      "expo-router"
    ]
  }
}
```

**Step 3: Update Metro Configuration**
```javascript
// metro.config.js
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);
config.resolver.alias = {
  '@': './src',
};

module.exports = config;
```

### File Structure Migration

**Step 4: Create App Directory Structure**
```bash
mkdir -p app
touch app/_layout.tsx app/index.tsx app/settings.tsx app/widget-selector.tsx app/+not-found.tsx
```

**Step 5: Root Layout Implementation**
```typescript
// app/_layout.tsx - Root layout with providers
import { Stack } from 'expo-router';
import { ThemeProvider } from '@/theme/ThemeProvider';
import { SafeAreaProvider } from 'react-native-safe-area-context';

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="index" />
          <Stack.Screen 
            name="settings" 
            options={{ presentation: 'modal', headerShown: true, title: 'Settings' }}
          />
          <Stack.Screen 
            name="widget-selector" 
            options={{ presentation: 'modal', headerShown: true, title: 'Add Widget' }}
          />
        </Stack>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
```

**Step 6: Dashboard Screen Migration**
```typescript
// app/index.tsx - Main dashboard
import { Dashboard } from '@/components/organisms/Dashboard';
import { StatusBar } from '@/components/organisms/StatusBar';
import { View, StyleSheet } from 'react-native';

export default function DashboardScreen() {
  return (
    <View style={styles.container}>
      <StatusBar />
      <Dashboard />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
```

### Navigation Types & Deep Linking

**Step 7: Navigation Types Definition**
```typescript
// src/types/navigation.types.ts
export type RootStackParamList = {
  index: undefined;
  settings: undefined;
  'widget-selector': undefined;
  '+not-found': undefined;
};

declare global {
  namespace ReactNavigation {
    interface RootParamList extends RootStackParamList {}
  }
}
```

**Step 8: Update Entry Point**
```typescript
// index.js (project root)
import 'expo-router/entry';
```

### Migration Steps & Backward Compatibility

**Migration Strategy:**
1. **Phase 1:** Install Expo Router alongside existing navigation (no breaking changes)
2. **Phase 2:** Create parallel `app/` structure with identical functionality
3. **Phase 3:** Update entry point to use Expo Router
4. **Phase 4:** Remove old navigation code and `App.tsx`
5. **Phase 5:** Update all navigation imports and references

**Compatibility Testing:**
- All screens must render identically before/after migration
- Navigation timing and performance benchmarked
- Bundle size impact measured and documented
- Hot reload functionality verified

**Automated Navigation Testing:**
- Jest integration with Expo Router navigation mocking
- React Native Testing Library screen transition testing
- Automated navigation flow validation for all routes
- Mock implementation for file-based routing in test environment

### Jest & React Native Testing Library Integration

**Step 9: Configure Jest Mocks for Expo Router**
```typescript
// __tests__/setup.ts - Add to existing setup file
jest.mock('expo-router', () => ({
  Stack: ({ children }: any) => children,
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
    canGoBack: jest.fn(() => true),
  }),
  useLocalSearchParams: () => ({}),
  useGlobalSearchParams: () => ({}),
  router: {
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
  },
}));
```

**Step 10: Navigation Flow Testing Pattern**
```typescript
// __tests__/navigation/ExpoRouterNavigation.test.tsx
import { render, fireEvent, screen } from '@testing-library/react-native';
import { router } from 'expo-router';
import DashboardScreen from '@/app/index';

describe('Expo Router Navigation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should navigate to settings when settings button pressed', () => {
    render(<DashboardScreen />);
    
    const settingsButton = screen.getByTestId('settings-button');
    fireEvent.press(settingsButton);
    
    expect(router.push).toHaveBeenCalledWith('/settings');
  });

  it('should navigate to widget selector modal', () => {
    render(<DashboardScreen />);
    
    const addWidgetButton = screen.getByTestId('add-widget-button');
    fireEvent.press(addWidgetButton);
    
    expect(router.push).toHaveBeenCalledWith('/widget-selector');
  });
});
```

**Step 11: Screen Rendering Tests**
```typescript
// __tests__/screens/ScreenRendering.test.tsx
import { render } from '@testing-library/react-native';
import DashboardScreen from '@/app/index';
import SettingsScreen from '@/app/settings';
import WidgetSelectorScreen from '@/app/widget-selector';

describe('Screen Rendering After Migration', () => {
  it('should render dashboard screen without errors', () => {
    const { getByTestId } = render(<DashboardScreen />);
    expect(getByTestId('dashboard-container')).toBeTruthy();
  });

  it('should render settings screen with all sections', () => {
    const { getByText } = render(<SettingsScreen />);
    expect(getByText('General Settings')).toBeTruthy();
  });

  it('should render widget selector modal properly', () => {
    const { getByTestId } = render(<WidgetSelectorScreen />);
    expect(getByTestId('widget-selector-modal')).toBeTruthy();
  });
});
```

### Performance Considerations

**Bundle Size Impact:**
- Expo Router adds ~2-3KB gzipped
- React Navigation v6 already included (no additional overhead)
- File-based routing reduces manual route configuration code

**Runtime Performance:**
- Route resolution happens at build time (faster than runtime routing)
- Lazy loading enabled by default for better initial load
- Navigation state serialization automatic

## Task Breakdown

### Core Migration Tasks
- [ ] **Task 6.7.1:** Install Expo Router 3.5+ and configure app.json
- [ ] **Task 6.7.2:** Create `app/` directory structure with all required files
- [ ] **Task 6.7.3:** Implement `app/_layout.tsx` root layout with providers
- [ ] **Task 6.7.4:** Migrate dashboard functionality to `app/index.tsx`
- [ ] **Task 6.7.5:** Create settings screen at `app/settings.tsx`
- [ ] **Task 6.7.6:** Implement widget selector modal at `app/widget-selector.tsx`
- [ ] **Task 6.7.7:** Add 404 handling with `app/+not-found.tsx`

### Configuration & Types
- [ ] **Task 6.7.8:** Update Metro configuration for `@/` alias support
- [ ] **Task 6.7.9:** Define navigation TypeScript types in `src/types/navigation.types.ts`
- [ ] **Task 6.7.10:** Update project entry point to use `expo-router/entry`
- [ ] **Task 6.7.11:** Configure deep linking scheme in app.json

### Testing & Validation
- [ ] **Task 6.7.12:** Test all navigation flows work identically after migration
- [ ] **Task 6.7.13:** Benchmark navigation performance vs previous implementation
- [ ] **Task 6.7.14:** Validate bundle size impact stays <1MB
- [ ] **Task 6.7.15:** Test hot reload and development experience
- [ ] **Task 6.7.16:** Configure Jest mocks for Expo Router navigation testing
- [ ] **Task 6.7.17:** Create React Native Testing Library integration tests for all navigation flows
- [ ] **Task 6.7.18:** Implement automated navigation regression tests

### Cleanup & Documentation
- [ ] **Task 6.7.19:** Remove old `App.tsx` and manual navigation code
- [ ] **Task 6.7.20:** Update all import statements to use new file structure
- [ ] **Task 6.7.21:** Document navigation patterns and deep linking setup
- [ ] **Task 6.7.22:** Update development setup instructions

## Success Metrics

**Framework Alignment:**
- ✅ Expo Router 3.5+ successfully integrated and functional
- ✅ File-based routing operational for all screens
- ✅ Project structure matches UI Architecture specification

**Performance Targets:**
- Navigation transitions: Same speed as previous implementation (measured)
- Bundle size increase: <1MB gzipped
- Hot reload time: No regression vs manual routing

**Developer Experience:**
- Route generation: Automatic based on file structure
- Type safety: Full TypeScript support for navigation
- Deep linking: Foundation established for future web/desktop features

## Dependencies

**Prerequisite Stories:** None (foundational framework story)

**Dependent Stories:**
- Story 6.8 (Project Structure Alignment) - Benefits from router foundation
- Story 6.1 (Atomic Design) - Uses new navigation patterns
- All Epic 7+ stories - Depend on stable routing foundation

**External Dependencies:**
- Expo Router 3.5+ library availability
- React Navigation 6+ compatibility maintained
- Metro bundler support for file-based routing

## Risks & Mitigation

**Technical Risks:**
- **Bundle Size Growth:** Monitor with each dependency addition
- **Performance Regression:** Benchmark navigation timing throughout migration
- **Breaking Changes:** Maintain backward compatibility during transition

**Team Risks:**
- **Learning Curve:** Provide training on file-based routing patterns
- **Migration Complexity:** Use phased approach with parallel systems

**Business Risks:**
- **Feature Development Delay:** This story enables future development velocity
- **User Impact:** All changes must be invisible to end users

## Definition of Done

### Framework Integration
- [ ] Expo Router 3.5+ installed and configured properly
- [ ] `app/` directory structure created with all required screens
- [ ] File-based routing operational for dashboard, settings, widget selector
- [ ] Deep linking foundation established for future features

### Migration Completeness
- [ ] All existing navigation flows work identically after migration
- [ ] Navigation performance maintained or improved vs manual routing
- [ ] TypeScript navigation types properly defined and validated
- [ ] Bundle size impact documented and within <1MB target

### Code Quality
- [ ] All navigation imports updated to new file structure
- [ ] Hot reload and development experience maintained
- [ ] Old navigation code removed without breaking changes
- [ ] Migration documented for team reference

### Testing Validation
- [ ] Navigation integration tests pass with new routing system
- [ ] Performance benchmarks confirm no regressions
- [ ] All Epic 2 functionality preserved through migration
- [ ] Cross-platform navigation works on iOS/Android

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