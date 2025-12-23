# Debugging Tools Guide - BMad Autopilot

**Complete guide to debugging and performance optimization for the BMad Autopilot marine instrument display.**

## Table of Contents

1. [Tool Hierarchy](#tool-hierarchy)
2. [Zustand DevTools (PRIMARY)](#zustand-devtools-primary)
3. [Conditional Console Logs (SECONDARY)](#conditional-console-logs-secondary)
4. [React Profiler (TERTIARY)](#react-profiler-tertiary)
5. [Expo Network Inspector](#expo-network-inspector)
6. [Chrome Performance API](#chrome-performance-api)
7. [Practical Debugging Workflows](#practical-debugging-workflows)
8. [Quick Reference Cheat Sheet](#quick-reference-cheat-sheet)
9. [Troubleshooting](#troubleshooting)

---

## Tool Hierarchy

Use debugging tools in this order for maximum efficiency:

### 1. PRIMARY: Zustand DevTools
**Purpose:** State change debugging, time-travel, zero performance impact  
**Use for:** Understanding what state changed, when, and why  
**Performance:** ZERO overhead when not open, minimal when open

### 2. SECONDARY: Conditional Console Logs
**Purpose:** Execution flow debugging  
**Use for:** Tracking code paths, function calls, conditional logic  
**Performance:** ZERO overhead when disabled (conditional execution)

### 3. TERTIARY: React Profiler
**Purpose:** Performance debugging  
**Use for:** Finding slow renders, unnecessary re-renders  
**Performance:** Minimal overhead, only use when actively profiling

---

## Zustand DevTools (PRIMARY)

### Installation

**Chrome:**  
https://chrome.google.com/webstore/detail/redux-devtools/lmhkpmbekcpmknklioeibfkpmmfibljd

**Firefox:**  
https://addons.mozilla.org/firefox/addon/reduxdevtools/

**Edge:**  
Uses Chrome Web Store (same link as Chrome)

### Setup

Already configured in the project! All stores have devtools middleware:
- **NMEA Store** - All sensor data changes
- **Widget Store** - Widget registration and configuration
- **Theme Store** - Theme and appearance settings
- **Settings Store** - User preferences
- **Alarm Store** - Alarm state and thresholds
- **Toast Store** - Toast notification management
- **Sensor Config Store** - Persistent sensor configurations
- **Connection Store** - Network connection state
- **Feature Flag Store** - Feature flag management

### Usage

#### Opening DevTools

1. Open browser DevTools (`F12` or `Cmd+Option+I`)
2. Click **Redux** tab (appears when DevTools extension is installed)
3. You should see all 9 stores listed in the dropdown

#### Basic Features

**View Current State:**
```
1. Select store from dropdown (e.g., "NMEA Store")
2. Click "State" tab
3. Expand tree to see current values
```

**View Action History:**
```
1. Click "Action" tab
2. See chronological list of all actions
3. Click any action to see:
   - Action type and payload
   - State before action
   - State after action
   - Diff of changes
```

**Time-Travel Debugging:**
```
1. Click any action in the history
2. Application state jumps to that point in time
3. UI updates to reflect historical state
4. Use slider at bottom to scrub through history
```

#### Advanced Features

**Filtering Actions:**
```javascript
// In Redux DevTools filter box:
updateSensorData  // Show only sensor updates
widget/*          // Show all widget actions
!SET_CONNECTION   // Hide connection status updates
```

**Exporting State:**
```
1. Click "Export" button (download icon)
2. Choose format: JSON, Chart, Report
3. Save for bug reports or analysis
```

**Importing State:**
```
1. Click "Import" button (upload icon)
2. Load previously exported state
3. Reproduce exact application state
```

**Diffing States:**
```
1. Select two actions in history
2. Click "Diff" tab
3. See only what changed between them
```

### Practical Workflows

**"Why did this sensor value change?"**
```
1. Open Redux DevTools → NMEA Store
2. Filter for "updateSensorData"
3. Find action with timestamp near the change
4. Click action → see exact value before/after
5. Check "Diff" tab to see only what changed
```

**"What caused this widget to appear/disappear?"**
```
1. Open Redux DevTools → Widget Store
2. Look for "updateInstanceWidgets" actions
3. Click action → see "dashboard.widgets" array before/after
4. Trace back to sensor data change that triggered it
```

**"Why is the alarm not triggering?"**
```
1. Open Redux DevTools → Alarm Store
2. Check "thresholds" array - are thresholds configured?
3. Check "settings.levelMuting" - is alarm level muted?
4. Filter for "evaluateThresholds" actions
5. See if threshold checks are even running
```

---

## Conditional Console Logs (SECONDARY)

### Using the Logger

The project uses a unified conditional logging system with zero performance impact when disabled.

#### Enabling Logs

**In Browser Console:**
```javascript
// Enable specific category
enableLog('nmea.depth')           // Enable depth NMEA logging
enableLog('widget.registration')  // Enable widget registration logs

// Enable entire namespace
enableLogNamespace('nmea')        // Enable ALL nmea.* categories
enableLogNamespace('widget')      // Enable ALL widget.* categories

// Disable logs
disableLog('nmea.depth')
disableLogNamespace('nmea')
disableAllLogs()

// List what's enabled
listEnabledLogs()
listLogCategories()              // See all available categories
```

#### Available Categories

```
NMEA Categories:
  nmea.depth          - Depth sensor processing
  nmea.engine         - Engine sensor processing
  nmea.speed          - Speed sensor processing
  nmea.wind           - Wind sensor processing
  nmea.navigation     - GPS/navigation processing
  nmea.autopilot      - Autopilot commands/status
  nmea.battery        - Battery monitoring
  nmea.tank           - Tank level monitoring
  nmea.temperature    - Temperature sensors
  nmea                - Enable ALL NMEA logs

Widget Categories:
  widget.depth        - Depth widget lifecycle
  widget.engine       - Engine widget lifecycle
  widget.registration - Widget registration system
  widget.rendering    - Widget render performance
  widget              - Enable ALL widget logs

Store Categories:
  store.updates       - Store state updates
  store.initialization - Store initialization
  store               - Enable ALL store logs

Performance Categories:
  performance.render   - Render timing
  performance.network  - Network timing
  performance          - Enable ALL performance logs

UI Categories:
  ui.interaction      - User interactions
  ui.layout           - Layout calculations
  ui                  - Enable ALL UI logs
```

#### Code Usage

**DO NOT use console.log directly!** Always use the logger:

```typescript
// ❌ WRONG - Always executes
console.log('Processing depth:', depthValue, calculateExpensive());

// ❌ WRONG - Logging state changes (use DevTools!)
console.log('State updated:', newState);

// ✅ CORRECT - Conditional with lazy evaluation
import { log } from '@/utils/logging/logger';

log.depth('Processing depth', () => ({ 
  value: depthValue, 
  calc: calculateExpensive()  // Only runs if logging enabled
}));

// ✅ CORRECT - Simple message
log.engine('Engine started');

// ✅ CORRECT - With data
log.widgetRegistration('Widget created', () => ({ 
  id: widget.id, 
  type: widget.type 
}));
```

### Chrome Console Filtering

**Even better:** Use Chrome's built-in filtering to focus logs:

```
Filter Examples:
/🌊|depth/i          - Show only depth-related logs
-engine              - Hide engine logs
/error|warning/i     - Show only errors and warnings
^[nmea.depth]        - Show logs starting with [nmea.depth]
```

**Styling Logs:**
```typescript
// Logs are automatically styled by category
// [nmea.depth] appears in cyan
// [widget.registration] appears in cyan
// Performance warnings in yellow/orange/red
```

---

## React Profiler (TERTIARY)

### Using ProfiledComponent

Wrap slow-rendering components to automatically detect performance issues:

```tsx
import { ProfiledComponent } from '@/components/debug/ProfiledComponent';

// Default threshold (16ms for 60fps)
<ProfiledComponent id="DepthWidget">
  <DepthWidget />
</ProfiledComponent>

// Custom threshold for complex widgets
<ProfiledComponent id="ChartWidget" warnThreshold={32}>
  <ComplexChartWidget />
</ProfiledComponent>

// Verbose mode (log all renders)
<ProfiledComponent id="DebugWidget" verbose>
  <SomeWidget />
</ProfiledComponent>
```

### Understanding Warnings

```
🟡 SLOW [PERFORMANCE] DepthWidget render: 18.45ms (mount)
  - Yellow = 16-32ms (acceptable for complex widgets)
  - Logged to console automatically

🟠 WARNING [PERFORMANCE] ChartWidget render: 45.23ms (update)
  - Orange = 32-100ms (needs optimization)
  - Consider memoization or lazy loading

🔴 CRITICAL [PERFORMANCE] TableWidget render: 156.78ms (update)
  - Red = 100ms+ (critical performance issue)
  - Investigate immediately
```

### React DevTools Profiler

**Opening:**
1. Open browser DevTools
2. Click **Profiler** tab (React DevTools)
3. Click record button (red circle)
4. Interact with app
5. Stop recording

**Flame Graph:**
```
Horizontal bars = components
Length = render time
Color:
  - Green/Yellow = fast
  - Orange/Red = slow

Click any bar to see:
  - Render duration
  - Props changes
  - Hooks updates
  - Child component times
```

**Commit Tracking:**
```
Timeline shows each React commit (batch of updates)
Click commit to see:
  - What components re-rendered
  - Why they re-rendered (props, state, hooks)
  - Total render time for that commit
```

### Imperative Performance Measurement

```typescript
import { measurePerformance, measurePerformanceAsync } from '@/components/debug/ProfiledComponent';

// Synchronous measurement
measurePerformance('data-processing', () => {
  processLargeDataset(nmeaMessages);
});
// Warns if > 16ms

// Async measurement
await measurePerformanceAsync('fetch-data', async () => {
  await fetchHistoricalData();
}, 100); // Custom 100ms threshold
```

---

## Expo Network Inspector

### Accessing

**On Device:**
1. Shake device (or `Cmd+D` on iOS Simulator)
2. Tap **"Dev Menu"**
3. Tap **"Network Inspector"**
4. WebSocket tab shows NMEA messages

**On Web:**
1. Open browser DevTools (`F12`)
2. Click **Network** tab
3. Filter: `WS` (WebSockets)
4. Click WebSocket connection
5. View **Messages** tab

### Inspecting NMEA Messages

**Viewing Messages:**
```
Messages tab shows:
  ↑ = Sent to server
  ↓ = Received from server

Green arrow = Sent
Blue arrow = Received

Click message to see:
  - Raw NMEA sentence
  - Timestamp
  - Size in bytes
```

**Filtering NMEA:**
```javascript
// In filter box:
DBT              // Show only depth sentences
DPT              // Show only depth sentences (alternative)
RPM              // Show engine RPM
$GPGGA           // Show GPS fix sentences
!PDGY            // Show Raymarine autopilot commands
```

**Exporting HAR:**
```
1. Right-click in Network tab
2. Select "Save all as HAR"
3. Load in HAR Viewer or share for debugging
```

### Simulator Control

The project has a built-in NMEA Bridge Simulator:

**Start Simulator:**
Use VS Code tasks (see `.vscode/tasks.json`):
- `Start NMEA Bridge: Basic Navigation`
- `Start NMEA Bridge: Coastal Sailing`
- `Start NMEA Bridge: Autopilot Engagement`
- `Start NMEA Bridge: Engine Monitoring`

**Control API (Port 9090):**
```javascript
// Inject custom NMEA data
fetch('http://localhost:9090/api/inject-data', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    sentence: '$SDDPT,12.5,0.0*4E'
  })
});

// Simulate error
fetch('http://localhost:9090/api/simulate-error', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    errorType: 'connection-drop',
    duration: 5000
  })
});

// Load scenario
fetch('http://localhost:9090/api/scenarios/coastal-sailing', {
  method: 'POST'
});
```

---

## Chrome Performance API

### Recording Performance Marks

```typescript
// Mark start of operation
performance.mark('nmea-processing-start');

// ... do expensive work ...
processNmeaData(messages);

// Mark end of operation
performance.mark('nmea-processing-end');

// Measure duration
performance.measure(
  'nmea-processing',           // Measure name
  'nmea-processing-start',     // Start mark
  'nmea-processing-end'        // End mark
);

// View in Chrome DevTools Performance timeline
```

### Viewing Timeline

1. Open DevTools → **Performance** tab
2. Click record button
3. Interact with app
4. Stop recording
5. Your marks appear as orange flags in timeline
6. Measures appear as purple bars
7. Zoom in to see exact timing

### Useful Patterns

```typescript
// Widget render timing
useEffect(() => {
  performance.mark('depth-widget-mount');
  return () => {
    performance.mark('depth-widget-unmount');
    performance.measure('depth-widget-lifetime', 'depth-widget-mount', 'depth-widget-unmount');
  };
}, []);

// NMEA message processing timing
const processMessage = (sentence: string) => {
  const startMark = `process-${sentence.substring(1, 6)}-start`;
  performance.mark(startMark);
  
  // Process message...
  const result = parseSentence(sentence);
  
  const endMark = `process-${sentence.substring(1, 6)}-end`;
  performance.mark(endMark);
  performance.measure(`Process ${sentence.substring(1, 6)}`, startMark, endMark);
  
  return result;
};
```

---

## Practical Debugging Workflows

### Scenario 1: "Depth sensor showing wrong value"

**Step 1: Check if data is arriving**
```
1. Open Expo Network Inspector → WebSocket tab
2. Filter for "DBT" or "DPT"
3. Verify NMEA sentences are coming in
4. Check values in raw sentences
```

**Step 2: Check if data is being parsed**
```
1. Enable logging: enableLog('nmea.depth')
2. Check console for depth processing logs
3. Verify parsed values match raw NMEA
```

**Step 3: Check if state is updating**
```
1. Open Redux DevTools → NMEA Store
2. Filter for "updateSensorData"
3. Find depth sensor updates
4. Check "sensors.depth[0]" in state tree
5. Verify value matches parsed NMEA
```

**Step 4: Check widget display**
```
1. Open Redux DevTools → Widget Store
2. Check if depth widget exists in "dashboard.widgets"
3. If not, check widget registration logs
4. If yes, check widget render with React Profiler
```

### Scenario 2: "Widget rendering slowly"

**Step 1: Measure render time**
```
1. Wrap component in ProfiledComponent
2. Interact with widget
3. Look for performance warnings in console
4. Note which phase is slow (mount vs update)
```

**Step 2: Find what's causing re-renders**
```
1. Open React DevTools → Profiler
2. Record interaction
3. Click slow component in flame graph
4. Check "Why did this render?" section:
   - Props changed?
   - State changed?
   - Hooks changed?
```

**Step 3: Check state management**
```
1. Open Redux DevTools
2. Check if widget is subscribed to correct data
3. Look for unnecessary state changes
4. Verify selector memoization
```

**Step 4: Optimize**
```
- Memoize expensive calculations with useMemo
- Memoize callbacks with useCallback
- Use React.memo for component memoization
- Check if widget needs ALL store updates or just specific fields
```

### Scenario 3: "Alarm not triggering"

**Step 1: Check threshold configuration**
```
1. Open Redux DevTools → Alarm Store
2. Expand "thresholds" array
3. Verify threshold exists for sensor
4. Check "enabled: true"
5. Check "level" is not muted in "settings.levelMuting"
```

**Step 2: Check sensor data**
```
1. Open Redux DevTools → NMEA Store
2. Check actual sensor value
3. Compare to threshold value
4. Verify comparison direction (above/below)
```

**Step 3: Check alarm evaluation**
```
1. Enable logging: enableLog('store.updates')
2. Filter console for alarm evaluation logs
3. Verify evaluateThresholds is being called
4. Check why threshold check passed/failed
```

**Step 4: Check alarm state**
```
1. Redux DevTools → Alarm Store
2. Check "activeAlarms" array
3. If alarm exists but not visible:
   - Check "muteUntil" timestamp
   - Check "soundEnabled" in settings
   - Check UI alarm rendering
```

---

## Quick Reference Cheat Sheet

### Enable Logging Categories
```javascript
// In browser console:
enableLog('nmea.depth')              // Depth sensor logs
enableLog('nmea.engine')             // Engine sensor logs
enableLog('widget.registration')     // Widget creation logs
enableLogNamespace('nmea')           // ALL NMEA logs
disableAllLogs()                     // Turn off all logs
listEnabledLogs()                    // Show what's enabled
```

### Redux DevTools Shortcuts
```
Ctrl+Q         - Pause/resume action tracking
Ctrl+H         - Toggle inspector
Ctrl+T         - Toggle chart view
Ctrl+J         - Jump to action
```

### Chrome Console Filters
```
/depth/i              - Show logs containing "depth"
-engine               - Hide logs containing "engine"
/error|warn/i         - Show errors and warnings only
^[nmea.depth]         - Show logs starting with "[nmea.depth]"
```

### Performance Thresholds
```
< 16ms     ✅ Excellent (60fps)
16-32ms    🟡 Acceptable (30-60fps)
32-100ms   🟠 Needs optimization
> 100ms    🔴 Critical issue
```

### Keyboard Shortcuts
```
Cmd+Option+I (Mac) / F12 (Win)  - Open DevTools
Cmd+Option+J (Mac) / Ctrl+Shift+J (Win) - Open Console
Cmd+K (Mac) / Ctrl+L (Win) - Clear console
```

---

## Troubleshooting

### "Redux DevTools not appearing"

**Check installation:**
```
1. Visit chrome://extensions
2. Verify "Redux DevTools" is installed and enabled
3. Refresh page with DevTools open
```

**Check middleware:**
```typescript
// Verify store has devtools middleware:
export const useNmeaStore = create<NmeaStore>()(
  devtools(
    (set, get) => ({ ... }),
    { name: 'NMEA Store', enabled: __DEV__ }  // ← Must be present
  )
);
```

**Check __DEV__ flag:**
```javascript
// In console:
console.log(__DEV__);  // Should be true in development
```

### "Performance marks not showing in timeline"

**Ensure recording:**
```
1. Open Performance tab BEFORE interacting
2. Click record button (red circle)
3. Perform action
4. Stop recording
5. Zoom in to see marks
```

**Check mark names:**
```typescript
// Marks must have unique names
performance.mark('operation-start-' + Date.now());  // Unique
performance.mark('operation-start');  // May be overwritten
```

### "WebSocket inspection not working"

**On iOS:**
```
- WebSocket inspection only works in dev mode
- Shake device → Dev Menu → Network Inspector
- Ensure dev client is installed (expo-dev-client)
```

**On Web:**
```
- Use Chrome DevTools → Network → WS filter
- Refresh page with DevTools open
- WebSocket connections appear in list
```

### "Logs not appearing after enableLog()"

**Check DEV mode:**
```javascript
// Logs only work in development
console.log(__DEV__);  // Must be true
```

**Check category name:**
```javascript
listLogCategories();  // See all available categories
// Use exact category name (case-sensitive)
```

**Check conditional execution:**
```typescript
// ✅ CORRECT - Lazy evaluation prevents execution when disabled
log.depth('message', () => expensiveCalculation());

// ❌ WRONG - Calculation runs even when logging disabled
log.depth('message', expensiveCalculation());  // Don't pass result directly
```

---

## Additional Resources

- **Zustand DevTools:** https://github.com/pmndrs/zustand#devtools
- **Redux DevTools Extension:** https://github.com/reduxjs/redux-devtools
- **React Profiler API:** https://react.dev/reference/react/Profiler
- **Chrome Performance API:** https://developer.mozilla.org/en-US/docs/Web/API/Performance
- **Expo Network Debugging:** https://docs.expo.dev/debugging/tools/#network-debugging

---

**Last Updated:** December 2025  
**Project:** BMad Autopilot Marine Instrument Display  
**Maintainer:** Development Team
