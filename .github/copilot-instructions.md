# GitHub Copilot Instructions - BMad Autopilot

## Project Overview

This is a **React Native cross-platform marine instrument display** that connects to boat NMEA networks via WiFi bridges. The app runs entirely on-device (no server) and transforms smartphones/tablets/desktops into comprehensive marine displays with Raymarine autopilot control.

**Key Architecture:** Layered on-device app: React Native UI → Zustand State Stores → NMEA Service Layer (TCP sockets) → WiFi Bridge Hardware → Boat NMEA Network.

## Critical Development Context

### BMAD Method Workflow

This project uses the **BMAD Method** with specialized AI agents. Before making changes:

1. **Agent Personas:** Use GitHub Copilot chat modes defined in `.github/chatmodes/`:
   - `#bmad-master` - Universal task executor (🧙 BMad Master)
   - `#qa` - Test architect & quality advisor (🧪 Quinn)
   - `#dev` - Full stack developer (💻 James)
   - `#architect` - Architecture & design decisions
   - `#pm`, `#po`, `#sm` - Management personas
2. **Story-Driven Development:** All work tracks to user stories in `docs/stories/`. Stories follow format: `story-{epic}.{number}-{slug}.md`
3. **Quality Gates:** Use `#qa` agent with `*review {story}` command to perform comprehensive quality reviews before marking stories done
4. **Configuration:** Project config in `.bmad-core/core-config.yaml` defines doc locations, patterns, QA workflow

### File Structure (MCP Tool Usage Required)

**ALWAYS use VSCode MCP tools** (`read_file`, `replace_string_in_file`, `grep_search`, `semantic_search`, `file_search`) instead of manual file operations:

```
bmad-autopilot/
├── .bmad-core/              # BMAD method tasks, templates, checklists
├── boatingInstrumentsApp/   # Main React Native app
│   ├── src/
│   │   ├── core/           # State management (Zustand stores)
│   │   ├── services/       # NMEA connection, parsing, playback
│   │   ├── widgets/        # Marine instrument UI components
│   │   ├── mobile/         # Mobile-specific App.tsx
│   │   └── desktop/        # Desktop-specific App.tsx
│   ├── __tests__/          # Jest tests with setup.ts
│   └── package.json        # React Native 0.82, TypeScript 5.8.3
└── docs/
    ├── architecture.md      # Full-stack architecture (812 lines)
    ├── prd/                # Product requirements (sharded)
    ├── stories/            # User stories (Epic 1-5)
    └── qa/
        └── gates/          # Quality gate YAML files
```

## Tech Stack Essentials

### Dependencies (See `boatingInstrumentsApp/package.json`)
- **State:** `zustand` 5.0.8 - Global state for NMEA data (NOT Redux)
- **Networking:** `react-native-tcp-socket` 6.3.0 (TCP port 10110), `nmea-simple` 3.3.0 (parsing)
- **UI:** React Native 0.82, `react-native-reanimated` 4.1.3 (60 FPS animations), `react-native-svg` 15.14.0
- **Testing:** Jest 29.7.0, `@testing-library/react-native` 13.3.3
- **Storage:** `@react-native-async-storage/async-storage` 2.2.0

### State Management Pattern (Critical)
```typescript
// src/core/nmeaStore.ts - Zustand store is the SINGLE SOURCE OF TRUTH
import { create } from 'zustand';

export const useNmeaStore = create<NmeaStore>((set) => ({
  data: { depth: undefined, speed: undefined, ... },
  setNmeaData: (updates) => set((state) => ({ 
    data: { ...state.data, ...updates } 
  })),
  // Widgets subscribe with selectors:
  // const depth = useNmeaStore(state => state.data.depth);
}));
```

**Pattern:** Widgets subscribe to specific data slices using selectors (prevents re-render cascades). Service layer calls `setNmeaData()` after parsing NMEA sentences.

### NMEA Parsing Flow (See `src/services/nmeaConnection.ts`)
```typescript
// TCP data arrives → handleData() parses → updates store → widgets re-render
handleData(data: Buffer) {
  const sentence = data.toString();
  const parsed = parseNmeaSentence(sentence); // nmea-simple library
  
  // Type guard for sentence type
  if (parsed.sentenceId === 'VTG') {
    this.updateState({ speedKnots: parsed.speedKnots });
  }
  
  // Throttling (1 update/sec per field type) prevents UI lag at 500 msg/sec
  if (this.shouldUpdate('depth')) {
    this.lastUpdateTimes.set('depth', Date.now());
  }
}
```

## Testing Requirements (CRITICAL for Marine Safety)

### Test Commands (See `docs/TESTING.md`)
```bash
cd boatingInstrumentsApp

# Run all tests (MUST pass before committing)
npm test

# Coverage report (target ≥70% for services/core)
npm test -- --coverage

# Watch mode for TDD
npm test -- --watch

# Specific test file
npm test -- __tests__/nmeaConnection.test.ts
```

### Test Patterns (See `__tests__/` examples)
```typescript
// Mock TCP socket globally in __tests__/setup.ts
jest.mock('react-native-tcp-socket', () => ({
  createConnection: jest.fn(),
}));

// Use fake timers for throttling tests
jest.useFakeTimers();
jest.advanceTimersByTime(1000);

// Test NMEA parsing with VALID checksums (nmea-simple validates)
const validSentence = '$GPVTG,120.5,T,,M,5.2,N,9.6,K,A*3E\r\n';
```

**Marine Safety Rule:** Any changes to `src/services/nmeaConnection.ts` or `src/core/nmeaStore.ts` REQUIRE corresponding test updates. Run `@qa *review story-X.Y` before marking stories done.

## Platform-Specific Code

### Platform Suffixes
- `App.ios.tsx` - iOS-specific
- `App.android.tsx` - Android-specific  
- `App.windows.tsx` - Windows-specific (future)
- `App.macos.tsx` - macOS-specific (future)
- No suffix = shared code (95% of codebase)

### Current Focus
Mobile platforms only (`src/mobile/App.tsx` is active). Desktop (`src/desktop/App.tsx`) is placeholder.

## Code Conventions

### TypeScript Strict Mode
```typescript
// tsconfig.json enforces strict: true
// ALWAYS define interfaces for NMEA data
export interface NmeaData {
  depth?: number;        // undefined = no data received yet
  speed?: number;
  gpsPosition?: { lat: number; lon: number };
  // Optional chaining prevents crashes: widget uses depth?.toFixed(1)
}
```

### Import Aliases
```typescript
// jest.config.js defines @/ alias
import { useNmeaStore } from '@/core/nmeaStore';  // resolves to src/core/nmeaStore
```

### Widget Pattern (See `src/widgets/`)
```typescript
// Each widget: self-contained, subscribes to specific data slice
export const DepthWidget: React.FC = () => {
  const depth = useNmeaStore(state => state.data.depth); // Selector prevents re-renders
  const units = useNmeaStore(state => state.settings.depthUnit);
  
  return (
    <WidgetCard title="Depth">
      <Text>{depth !== undefined ? `${depth.toFixed(1)} ${units}` : '--'}</Text>
    </WidgetCard>
  );
};
```

## Story Workflow (IMPORTANT)

### Story Files (`docs/stories/story-*.md`)
Structure:
```markdown
# Story 1.2: NMEA0183 Data Parsing
**Status:** Ready for Review | In Progress | Done

## Acceptance Criteria
1. Parses standard NMEA0183 sentences
2. Handles malformed sentences without crashing
...

## Dev Notes
Technical implementation details

## QA Results
@qa agent updates ONLY this section - DO NOT modify other sections
```

### Quality Gate Files (`docs/qa/gates/*.yml`)
```yaml
schema: 1
gate: PASS | CONCERNS | FAIL | WAIVED
quality_score: 95
story_id: "1.2"
reviewed_by: "Quinn (Test Architect)"
acceptance_criteria_covered: [...11 ACs mapped to tests...]
top_issues: []  # Empty = PASS
```

**Rule:** Use `#qa` agent with `*review story-1.2` to generate comprehensive review before marking done.

## Development Workflows

### Adding New Widget
1. Create `src/widgets/NewWidget.tsx` following existing pattern
2. Add to `src/widgets/Dashboard.tsx` widget registry
3. Subscribe to `useNmeaStore` with selector
4. Create test `__tests__/NewWidget.test.tsx`
5. Update story file with completion notes
6. Run `npm test -- --coverage` to verify >70% coverage

### Adding NMEA Sentence Type
1. Update `src/services/nmeaConnection.ts` handleData() with new type guard
2. Add field to `NmeaData` interface in `src/core/nmeaStore.ts`
3. Create test in `__tests__/nmeaConnection.test.ts` with valid checksum
4. Use node CLI to validate: `node -e "console.log(require('nmea-simple').parseNmeaSentence('$SENTENCE'))"`

### Debugging NMEA Issues
```typescript
// Enable debug mode (see Story 1.2 AC3)
useNmeaStore.getState().setDebugMode(true);

// Raw sentences stored in circular buffer (max 100)
const raw = useNmeaStore.getState().rawSentences;
console.log('Last 10 sentences:', raw.slice(-10));
```

## Common Pitfalls

1. **nmea-simple Checksum Validation:** Library rejects invalid checksums. Use research findings (`docs/nmea-research-findings.md`) for valid sentence examples.
2. **Field Name Mismatches:** Library returns `speedKnots` not `speedOverGroundKnots`. Test with node CLI first.
3. **Throttling Required:** 500 msg/sec from NMEA network will lag UI without 1-sec throttling per field type.
4. **Test Coverage Paths:** Jest ignores `desktop/`, `mobile/` via collectCoverageFrom. Only `src/core/`, `src/services/`, `src/widgets/` count toward 70% target.
5. **Story File Permissions:** Only `#qa` agent modifies "QA Results" section. Other sections modified by `#dev` or `#bmad-master`.

## External Resources

- **Architecture:** `docs/architecture.md` (812 lines - sections: High Level, Tech Stack, Deployment, Frontend/Backend layers)
- **NMEA Research:** `docs/nmea-research-findings.md` (sentence structure, checksums, WiFi bridge configs)
- **Epic Planning:** `docs/prd/epic-list.md` (5 epics, Month 1-8 timeline)
- **Testing Guide:** `docs/TESTING.md` (Jest config, coverage commands, test categories)

## AI Agent Commands (When Available)

- `#bmad-master *help` - Show all available commands
- `#qa *review story-X.Y` - Comprehensive quality review with gate decision
- `#dev` - Activate developer persona for implementation work
- `#architect` - Architecture analysis and decisions

**Remember:** Use MCP tools (`read_file`, `replace_string_in_file`, `grep_search`) for all file operations. Never output code blocks when tools are available - make direct edits.
