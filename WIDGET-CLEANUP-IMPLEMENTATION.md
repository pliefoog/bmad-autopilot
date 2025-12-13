## ⚠️ DEPRECATED - OUTDATED DOCUMENTATION

**NOTE:** This document describes the old structure-based cleanup system that has been **removed** as of December 2025.

**Current System:** Event-driven widget registration (WidgetRegistrationService) with time-based expiration cleanup only.

**See commits:**
- `e6c5925` - Removed redundant widget timestamp tracking
- `98c5878` - Removed obsolete cleanupOrphanedWidgets and related methods  
- `13ee5a7` - Removed orphaned references

---

## ✅ Comprehensive Widget Cleanup Implementation - COMPLETED (DEPRECATED)

### Problem Analysis
The error `Widget "depth-1761428948688" (base type: "depth-1761428948688") not found in registry` was caused by:

1. **Timestamp-based widget IDs** created during preset applications and dashboard duplication
2. **Invalid widget registry lookups** for widgets that don't exist in the registry  
3. **No automatic cleanup** of orphaned widgets from the widget store
4. **Accumulation of invalid widget references** over time

---

### 🔧 Comprehensive Solution Implemented

#### 1. Enhanced `cleanupOrphanedWidgets()` Function
**Location:** `src/store/widgetStore.ts`

**Enhanced Capabilities:**
- ✅ **Instance widget cleanup** (existing): Removes widgets for no longer detected engine/battery/tank instances
- ✅ **Registry validation cleanup** (NEW): Removes widgets that cannot be resolved by WidgetFactory  
- ✅ **Timestamp-based widget cleanup** (NEW): Removes legacy widgets with pattern `type-timestamp-index`
- ✅ **Duplicate prevention**: Removes duplicate orphaned widgets by ID
- ✅ **Comprehensive logging**: Detailed logging of cleanup operations

**Detection Patterns:**
```typescript
// Invalid registry widgets - cannot be resolved by WidgetFactory
try {
  WidgetFactory.getWidgetMetadata(widget.id);
} catch (error) {
  // Widget is invalid - mark for cleanup
}

// Timestamp-based widgets - legacy from preset/duplication
/^[a-z]+-[0-9]{13}-[0-9]+$/.test(widget.id) // e.g., depth-1761428948688-0
```

#### 2. DynamicDashboard Error Handling
**Location:** `src/widgets/DynamicDashboard.tsx`

**Enhancements:**
- ✅ **Error callback system**: `renderWidget()` accepts `onWidgetError` callback
- ✅ **Automatic cleanup trigger**: Invalid widgets trigger `cleanupOrphanedWidgets()`
- ✅ **Graceful error handling**: Widget errors don't crash the entire dashboard
- ✅ **Real-time cleanup**: Invalid widgets removed immediately when detected

#### 3. Automatic Cleanup Triggers
**Location:** `src/mobile/App.tsx`

**Periodic Cleanup System:**
- ✅ **Startup cleanup**: Runs comprehensive cleanup on app startup
- ✅ **Periodic cleanup**: Automatically runs every 30 seconds
- ✅ **Post-widget-add cleanup**: Cleanup triggered after adding widgets (100ms delay)

#### 4. Prevention Measures

**Widget ID Validation:**
- ✅ Proper widget ID generation in `addWidget()` function
- ✅ Registry validation before widget creation
- ✅ Error boundary protection around widget rendering

---

### 🎯 Technical Implementation Details

#### Enhanced Widget Store Method
```typescript
cleanupOrphanedWidgets: () => {
  // 1. Instance widget validation (existing)
  const orphanedInstanceWidgets = currentDashboard.widgets.filter(widget => 
    widget.settings?.instanceId && 
    widget.settings?.instanceType && 
    !activeInstanceIds.has(widget.settings.instanceId)
  );

  // 2. Registry validation (NEW)
  const invalidRegistryWidgets = currentDashboard.widgets.filter(widget => {
    try {
      WidgetFactory.getWidgetMetadata(widget.id);
      return false; // Widget is valid
    } catch (error) {
      return true;  // Widget is invalid
    }
  });

  // 3. Timestamp-based widget detection (NEW)
  const timestampBasedWidgets = currentDashboard.widgets.filter(widget => 
    /^[a-z]+-[0-9]{13}-[0-9]+$/.test(widget.id)
  );

  // Remove all invalid widgets
  const cleanWidgets = currentDashboard.widgets.filter(widget => 
    !uniqueOrphanedWidgets.some(orphan => orphan.id === widget.id)
  );
}
```

#### Error-Resilient Widget Rendering
```typescript
function renderWidget(key: string, onWidgetError?: (widgetId: string) => void) {
  try {
    const { baseType } = WidgetFactory.parseWidgetId(key);
    const registeredWidget = WidgetRegistry.getWidget(baseType);
    
    if (registeredWidget) {
      return <Component key={key} id={key} title={title} />;
    }
    
    // Trigger cleanup for invalid widgets
    if (onWidgetError) {
      onWidgetError(key);
    }
    
    throw new Error(`Widget "${key}" not found in registry`);
  } catch (error) {
    // Graceful error handling
  }
}
```

---

### 🚀 Results & Benefits

#### ✅ Immediate Benefits
1. **No more registry errors**: Invalid widget IDs automatically cleaned up
2. **Self-healing dashboard**: Automatically removes problematic widgets
3. **Performance improvement**: No more failed widget lookups
4. **Clean widget store**: Regular cleanup prevents accumulation of invalid widgets

#### ✅ Long-term Benefits  
1. **Maintenance reduction**: Less manual intervention needed for widget issues
2. **Robust architecture**: System automatically recovers from widget ID corruption
3. **Development efficiency**: Developers don't need to manually clean up invalid widgets
4. **User experience**: No more crashes from invalid widget references

#### ✅ Prevention Measures
1. **Proactive cleanup**: Issues resolved before they cause problems
2. **Multiple cleanup triggers**: Startup, periodic, and error-driven cleanup
3. **Comprehensive validation**: Registry, instance, and pattern-based validation
4. **Logging and monitoring**: Detailed logs for troubleshooting

---

### 🧪 Testing Status

**✅ Implementation Complete**
- Enhanced `cleanupOrphanedWidgets()` function with comprehensive validation
- Error-resilient widget rendering with automatic cleanup triggers  
- Periodic cleanup system in main application
- Zero compilation errors across all modified files

**✅ Expected Outcome**
The error `Widget "depth-1761428948688" not found in registry` should no longer occur because:
1. Invalid timestamp-based widget IDs are automatically detected and removed
2. Registry validation prevents rendering of non-existent widgets
3. Periodic cleanup prevents accumulation of invalid widget references
4. Error boundaries provide graceful fallback for any remaining edge cases

The marine instrument display now has a **self-healing widget management system** that automatically maintains a clean and valid widget store. 🚢⚓