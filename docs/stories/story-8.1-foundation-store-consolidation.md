# Story 8.1: Foundation & Store Consolidation
## Infrastructure Setup for VIP Platform Refactor

**Epic:** 8.0 - VIP Platform UI Refactor
**Story ID:** 8.1
**Priority:** P0 (Foundational)
**Complexity:** M (2 sprints)
**Status:** BLOCKED (Waiting for v2.3 completion)

**Dependencies:**
- ✅ MUST COMPLETE: v2.3 UI Architecture (all stories)
- ✅ MUST HAVE: v2.3-COMPLETION-HANDOFF.md checklist 100% complete

---

## Overview

Establish the foundation for VIP Platform refactoring by:
1. Setting up infrastructure (feature flags, Storybook, testing)
2. Consolidating duplicate store directories
3. Creating navigation session store
4. Enabling WiFi Bridge scenario loading for testing

**Why This Story First:**
- Feature flags allow safe incremental migration (rollback if issues)
- Storybook enables visual component development
- Navigation session store is core to glove mode (Story 8.2)
- WiFi Bridge scenarios enable testing without sailing

---

## User Stories

### US 8.1.1: Feature Flag System
**As a** developer refactoring the codebase
**I want** feature flags to toggle new vs old behavior
**So that** I can safely deploy incremental changes without breaking production

**Acceptance Criteria:**
- AC 1.1: Feature flags config file created (`src/config/features.ts`)
- AC 1.2: Flags defined for:
  - `USE_PLATFORM_NAVIGATION` (default: false)
  - `USE_GLOVE_MODE` (default: false)
  - `USE_NEW_STORES` (default: false)
- AC 1.3: App.tsx checks flags and routes to old vs new code paths
- AC 1.4: Flag toggle works in dev tools (Settings → Developer → Feature Flags)
- AC 1.5: Documentation created for flag usage

**Technical Implementation:**
```typescript
// src/config/features.ts
export const FEATURE_FLAGS = {
  USE_PLATFORM_NAVIGATION: false,
  USE_GLOVE_MODE: false,
  USE_NEW_STORES: false,

  // Helper to enable all for production
  enableAll: () => {
    FEATURE_FLAGS.USE_PLATFORM_NAVIGATION = true;
    FEATURE_FLAGS.USE_GLOVE_MODE = true;
    FEATURE_FLAGS.USE_NEW_STORES = true;
  },
};

// In App.tsx
if (FEATURE_FLAGS.USE_PLATFORM_NAVIGATION) {
  return <AppNavigation />;  // NEW (coming in Story 8.3)
} else {
  return <CurrentApp />;      // OLD (current v2.3 code)
}
```

---

### US 8.1.2: Storybook Setup
**As a** developer building adaptive UI components
**I want** Storybook for visual component development
**So that** I can test different states (native vs glove mode) in isolation

**Acceptance Criteria:**
- AC 2.1: Storybook installed (`@storybook/react-native`)
- AC 2.2: Storybook runs on web (`npm run storybook`)
- AC 2.3: Storybook runs on iOS/Android via Expo
- AC 2.4: First story created: `AutopilotFooter.stories.tsx` with 3 variants:
  - Native Density (44pt buttons)
  - Glove Mode (64pt buttons)
  - Interactive Toggle (button to switch modes)
- AC 2.5: Screenshot capability for visual regression testing

**Technical Implementation:**
```bash
# Install Storybook
npx sb init --type react_native

# Create first story
touch src/components/organisms/AutopilotFooter.stories.tsx

# Run Storybook
npm run storybook       # Web browser at localhost:6006
npm run storybook:ios   # iOS simulator (via Expo)
```

---

### US 8.1.3: Store Consolidation
**As a** developer maintaining state management
**I want** a single unified store directory
**So that** state is predictable and easy to debug

**Acceptance Criteria:**
- AC 3.1: Duplicate `src/stores/` directory removed
- AC 3.2: All stores consolidated into `src/store/`:
  - nmeaStore.ts (already there)
  - themeStore.ts (already there)
  - widgetStore.ts (merge duplicates)
  - alarmStore.ts (move from stores/)
  - settingsStore.ts (move from stores/)
- AC 3.3: All imports updated (`src/stores/` → `src/store/`)
- AC 3.4: No broken references (TypeScript compiles without errors)
- AC 3.5: All tests still pass

**Migration Steps:**
```bash
# 1. Merge widgetStore duplicates
cp src/stores/widgetStore.ts src/store/widgetStore.ts
# (manually merge if conflicts)

# 2. Move other stores
mv src/stores/alarmStore.ts src/store/alarmStore.ts
mv src/stores/settingsStore.ts src/store/settingsStore.ts

# 3. Update all imports (find/replace across codebase)
# Before: import { useAlarmStore } from '../stores/alarmStore';
# After:  import { useAlarmStore } from '../store/alarmStore';

# 4. Delete old directory
rm -rf src/stores/

# 5. Verify TypeScript compiles
npm run type-check

# 6. Verify tests pass
npm test
```

---

### US 8.1.4: Navigation Session Store
**As a** user sailing my boat
**I want** the app to automatically detect when I'm underway
**So that** UI can adapt without manual configuration

**Acceptance Criteria:**
- AC 4.1: Navigation session store created (`src/store/navigationSessionStore.ts`)
- AC 4.2: Store tracks:
  - `isActive: boolean` (navigation session active/inactive)
  - `startTime: Date | null` (when session started)
  - `sessionId: string | null` (unique session ID)
  - `gloveModeActive: boolean` (computed from isActive)
- AC 4.3: Actions implemented:
  - `startSession(sessionId?: string)`
  - `endSession()`
- AC 4.4: State persists across app restarts (AsyncStorage)
- AC 4.5: Auto-start logic implemented:
  - SOG > 2.0 knots for >5 seconds → auto-start
  - Autopilot engagement → auto-start
- AC 4.6: Auto-end logic implemented:
  - SOG < 0.5 knots for >10 minutes → auto-end
- AC 4.7: Store integrated with existing App.tsx

**Technical Implementation:**
```typescript
// src/store/navigationSessionStore.ts
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface NavigationSessionState {
  isActive: boolean;
  startTime: Date | null;
  sessionId: string | null;

  // Computed property
  get gloveModeActive(): boolean;

  // Actions
  startSession: (sessionId?: string) => void;
  endSession: () => void;
}

export const useNavigationSession = create<NavigationSessionState>()(
  persist(
    (set, get) => ({
      isActive: false,
      startTime: null,
      sessionId: null,

      get gloveModeActive() {
        return get().isActive;
      },

      startSession: (sessionId) => {
        const id = sessionId || `nav_${Date.now()}`;
        set({
          isActive: true,
          startTime: new Date(),
          sessionId: id,
        });
        console.log('[NavigationSession] Started:', id);
      },

      endSession: () => {
        const duration = Date.now() - (get().startTime?.getTime() || 0);
        console.log('[NavigationSession] Ended. Duration:', duration / 1000, 's');

        set({
          isActive: false,
          startTime: null,
          sessionId: null,
        });
      },
    }),
    {
      name: 'navigation-session',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
```

**Auto-Start/End Integration (App.tsx):**
```typescript
// In App.tsx - Auto-detect navigation session
const { nmeaData } = useNmeaStore();
const { isActive, startSession, endSession } = useNavigationSession();

useEffect(() => {
  // Auto-start when SOG > 2.0
  if (!isActive && nmeaData?.sog && nmeaData.sog > 2.0) {
    const timer = setTimeout(() => {
      if (nmeaData.sog > 2.0) {  // Still above threshold after 5s
        startSession();
      }
    }, 5000);
    return () => clearTimeout(timer);
  }

  // Auto-end when SOG < 0.5 for 10 minutes
  if (isActive && nmeaData?.sog && nmeaData.sog < 0.5) {
    const timer = setTimeout(() => {
      if (nmeaData.sog < 0.5) {  // Still below threshold after 10min
        endSession();
      }
    }, 10 * 60 * 1000);
    return () => clearTimeout(timer);
  }
}, [nmeaData?.sog, isActive, startSession, endSession]);
```

---

### US 8.1.5: WiFi Bridge Scenario Loading
**As a** developer testing navigation session and glove mode
**I want** predefined NMEA scenarios I can load on demand
**So that** I can test without going sailing

**Acceptance Criteria:**
- AC 5.1: WiFi Bridge scenario definitions exist (`wifiBridgeScenarios.ts` - already created)
- AC 5.2: Scenario loading function implemented in playbackService
- AC 5.3: UI added to load scenarios:
  - Settings → Developer Tools → Load Scenario
  - Dropdown/picker showing scenario names
- AC 5.4: All 5 scenarios loadable:
  - idle-at-marina
  - underway-manual
  - underway-autopilot
  - shallow-water-alarm
  - end-navigation
- AC 5.5: Loaded scenario sets NMEA data correctly
- AC 5.6: Scenario duration respected (auto-ends after duration)

**Technical Implementation:**
```typescript
// Enhance playbackService.ts
import { getScenario, WiFiBridgeScenario } from './wifiBridgeScenarios';

export const loadScenario = (scenarioId: string): boolean => {
  const scenario = getScenario(scenarioId);
  if (!scenario) {
    console.error('[WiFiBridge] Scenario not found:', scenarioId);
    return false;
  }

  console.log('[WiFiBridge] Loading scenario:', scenario.name);

  // Set NMEA data to match scenario
  useNmeaStore.setState({
    nmeaData: {
      sog: scenario.nmeaData.sog,
      depth: scenario.nmeaData.depth,
      wind_speed: scenario.nmeaData.wind_speed,
      // ... map all fields
    },
    connectionStatus: 'connected',
  });

  // Auto-end scenario after duration
  setTimeout(() => {
    console.log('[WiFiBridge] Scenario completed:', scenario.name);
  }, scenario.duration);

  return true;
};

// UI Component (Settings → Developer Tools)
export const ScenarioLoader: React.FC = () => {
  const [selectedScenario, setSelectedScenario] = useState('idle-at-marina');
  const scenarios = getScenarioNames();

  const handleLoadScenario = () => {
    const success = loadScenario(selectedScenario);
    if (success) {
      showToast(`Loaded scenario: ${selectedScenario}`, 'success');
    } else {
      showToast('Failed to load scenario', 'error');
    }
  };

  return (
    <View>
      <Text>Load Test Scenario:</Text>
      <Picker
        selectedValue={selectedScenario}
        onValueChange={setSelectedScenario}
      >
        {scenarios.map(s => (
          <Picker.Item key={s.id} label={s.name} value={s.id} />
        ))}
      </Picker>
      <Button title="Load Scenario" onPress={handleLoadScenario} />
    </View>
  );
};
```

---

## Testing Requirements

### Unit Tests
- [ ] Feature flags toggle correctly
- [ ] Navigation session store actions work (start/end)
- [ ] Navigation session state persists (AsyncStorage)
- [ ] Store consolidation: all imports resolve correctly

### Integration Tests
- [ ] Auto-start: SOG > 2.0 for 5s triggers navigation session
- [ ] Auto-end: SOG < 0.5 for 10min ends navigation session
- [ ] WiFi Bridge scenario loading sets correct NMEA data

### Manual Testing (WiFi Bridge Scenarios)
- [ ] Load "idle-at-marina" → navigationSession.isActive = false
- [ ] Load "underway-manual" → navigationSession.isActive = true (auto-started)
- [ ] Load "end-navigation" → wait 10min → isActive = false (auto-ended)
- [ ] Restart app → navigation session state persists
- [ ] Feature flag toggle: old App.tsx vs new (placeholder) works

---

## Definition of Done

- [ ] All 5 user stories completed (ACs met)
- [ ] Feature flags system working (tested toggle)
- [ ] Storybook running with AutopilotFooter example
- [ ] Store consolidation complete (no src/stores/ directory)
- [ ] Navigation session store created and tested
- [ ] WiFi Bridge scenario loading working (all 5 scenarios)
- [ ] All tests passing (unit + integration)
- [ ] No regressions (v2.3 features still work)
- [ ] Code review complete
- [ ] Documentation updated (README, architecture docs)

---

## Context Files for bmm-dev

**Load Before Starting:**
1. V2.3-COMPLETION-HANDOFF.md (verify v2.3 is done)
2. REFACTORING-PLAN-VIP-PLATFORM.md (Sprint 1 section)
3. VIP-UX-IMPLEMENTATION-GUIDE.md (Store consolidation, navigation session)
4. wifiBridgeScenarios.ts (scenario definitions)
5. Current App.tsx (will integrate navigation session)

---

## Dev Agent Record

### Context Reference
- **Story Context File:** [story-context-8.1.xml](story-context-8.1.xml)
- **Generated:** 2025-10-20
- **Status:** Ready for Development (once v2.3 complete)

### Implementation Notes
- Load story-context-8.1.xml before starting implementation
- Context contains: artifacts, interfaces, constraints, test ideas
- All file paths are project-relative for easy navigation

---

**Story Owner:** bmm-dev Agent
**Estimated Effort:** 2 sprints
**Ready to Start:** Once v2.3 handoff complete ✅
