# Memory Profiling Guide

## Overview

The app now has comprehensive memory profiling tools to detect and diagnose memory leaks:

1. **Automatic Profiling** - Starts when app loads, stops when app closes
2. **Real-time Monitor** - Visual display in bottom-right corner (tap to expand)
3. **Console Tools** - Manual profiling commands for detailed analysis

## Visual Monitor (In-App)

A small indicator appears in the **bottom-right corner** showing:

- **Compact view**: Current memory usage in MB
- **Expanded view** (tap to toggle):
  - Used memory
  - Total heap size
  - Percentage used
  - Growth rate (MB/min)
  - ⚠️ Leak warning if growth > 2MB/min

**Color Coding:**
- **Blue/Green**: Normal (< 2MB/min growth)
- **Orange**: Warning (2-5 MB/min growth)
- **Red**: Critical (> 5MB/min growth)

## Console Commands

Open browser DevTools console (F12) and use these commands:

### 1. Start Manual Profiling
```javascript
startMemoryProfile()
```
- Takes snapshot every second
- Tracks memory growth over time

### 2. Get Current Stats
```javascript
getMemoryStats()
```
- Shows current memory usage while profiling
- Displays growth rate and leak detection
- Doesn't stop profiling

### 3. Stop and Get Results
```javascript
stopMemoryProfile()
```
- Stops profiling
- Displays comprehensive report:
  - Duration
  - Average/Peak/Min memory
  - Total growth
  - Growth rate (MB/min)
  - Leak detection + severity
  - Recommended actions

### 4. Export CSV Data
```javascript
exportMemoryCSV()
```
- Exports all snapshots as CSV
- Copy/paste into spreadsheet for analysis
- Format: Timestamp, Elapsed(s), UsedMB, TotalMB, PercentUsed

## Understanding Results

### Growth Rate Analysis

| Growth Rate | Severity | Typical Cause |
|-------------|----------|---------------|
| < 1 MB/min | Normal | Baseline usage, GC working |
| 1-2 MB/min | Low | Minor leak, monitor |
| 2-5 MB/min | Medium | Leak detected |
| 5-10 MB/min | High | Significant leak |
| > 10 MB/min | Critical | Severe leak, investigate immediately |

### Leak Severity Levels

**NONE**: No leak detected, normal operation

**LOW**: 
- Growth: 1-2 MB/min or 20-50 MB total
- Action: Monitor, review recent changes

**MEDIUM**:
- Growth: 2-5 MB/min or 50-100 MB total
- Action: Check store subscriptions, history pruning

**HIGH**:
- Growth: 5-10 MB/min or 100-200 MB total
- Action: Immediate investigation required

**CRITICAL**:
- Growth: > 10 MB/min or > 200 MB total
- Action: Emergency - check unbounded arrays, event listeners

## Common Leak Sources

### 1. Store Subscriptions
```typescript
// ❌ BAD - No cleanup
useEffect(() => {
  const unsubscribe = store.subscribe(callback);
  // Missing: return () => unsubscribe();
}, []);

// ✅ GOOD - Cleanup on unmount
useEffect(() => {
  const unsubscribe = store.subscribe(callback);
  return () => unsubscribe();
}, []);
```

### 2. History Arrays
```typescript
// ❌ BAD - Unbounded array growth
history.push(newItem); // Never pruned

// ✅ GOOD - Pruned by interval (our implementation)
// History is automatically pruned every 1 second
```

### 3. Event Listeners
```typescript
// ❌ BAD - Listener never removed
socket.on('data', handler);

// ✅ GOOD - Remove on cleanup
useEffect(() => {
  socket.on('data', handler);
  return () => socket.off('data', handler);
}, []);
```

### 4. Intervals/Timers
```typescript
// ❌ BAD - Timer never cleared
setInterval(() => { ... }, 1000);

// ✅ GOOD - Clear on cleanup
useEffect(() => {
  const id = setInterval(() => { ... }, 1000);
  return () => clearInterval(id);
}, []);
```

## Testing Procedure

### Quick Test (5 minutes)
1. Open app in Chrome/Edge
2. Open DevTools Console (F12)
3. Run: `startMemoryProfile()`
4. Let app run with NMEA data flowing
5. After 5 minutes, run: `stopMemoryProfile()`
6. Check growth rate:
   - < 2 MB/min = ✅ Good
   - > 2 MB/min = ⚠️ Investigate

### Extended Test (30 minutes)
1. Start profiling: `startMemoryProfile()`
2. Normal usage: Connect NMEA, view widgets, navigate
3. Every 10 minutes, check: `getMemoryStats()`
4. At 30 minutes: `stopMemoryProfile()`
5. Export data: `exportMemoryCSV()`
6. Analyze in spreadsheet for trends

### Stress Test
1. Start profiling
2. Rapidly switch widgets
3. Add/remove widgets frequently
4. Change connections multiple times
5. Check for memory spikes
6. Stop and review results

## Browser Compatibility

**✅ Supported (with full profiling):**
- Chrome
- Edge
- Opera
- Brave

**⚠️ Limited (no performance.memory API):**
- Firefox - No automatic profiling, visual monitor hidden
- Safari - No automatic profiling, visual monitor hidden

**Note**: Console commands and visual monitor only work in Chrome/Edge due to `performance.memory` API availability.

## Interpreting Visual Monitor

### Normal Behavior
- Memory oscillates as garbage collector runs
- Gradual increases followed by drops
- Growth rate < 1 MB/min
- Monitor stays blue/green

### Leak Indicators
- Steady upward trend with no drops
- Growth rate > 2 MB/min sustained
- Monitor turns orange/red
- ⚠️ warning appears in expanded view

### Taking Action

**Immediate (< 5 min):**
- Take screenshot of monitor
- Run `stopMemoryProfile()` to get detailed stats
- Check console for errors

**Short-term (< 1 hour):**
- Export CSV data
- Review code changes from last 24 hours
- Check widget cleanup in useEffect hooks

**Long-term:**
- Regular monitoring (weekly)
- Trend analysis from CSV exports
- Baseline establishment for "normal" growth

## Current Optimizations

Our Phase 1-3 work should have eliminated major leaks:

✅ **Phase 1**: Removed processingMetrics array (-10MB)
✅ **Phase 2**: Moved history pruning to 1-second interval (-99% overhead)
✅ **Phase 3**: Widgets calculate session stats locally

**Expected Baseline:**
- Initial load: 40-80 MB
- With data flowing: 80-150 MB steady state
- Growth rate: < 1 MB/min (mostly GC churn)

If you see > 2 MB/min sustained growth, something new is leaking.
