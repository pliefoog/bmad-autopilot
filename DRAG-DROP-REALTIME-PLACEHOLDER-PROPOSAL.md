# Real-time Placeholder Movement During Drag - Implementation Proposal

## Problem
Moving the placeholder during drag requires updating the widget store array, which triggers React re-renders that could potentially interrupt the gesture flow.

## Solution: Visual-Only Placeholder with Reanimated

Instead of moving the placeholder in the store during drag, we can create a **visual-only placeholder** that appears at the hover position without modifying the store until drop.

### Architecture

1. **Store Placeholder**: Remains at source position during entire drag (no mid-drag store updates)
2. **Visual Placeholder**: Rendered separately at hover position using Reanimated shared value
3. **On Drop**: Single store update to move widget to final position

### Implementation Approach

```tsx
// Add shared value for hover index (UI thread)
const hoverIndexShared = useSharedValue(-1);

// Update hover index on UI thread (no JS bridge crossing)
const pan = Gesture.Pan()
  .onUpdate((event) => {
    // Calculate hover on UI thread if possible, or use runOnJS
    const hoverIndex = calculateHoverIndex(...);
    hoverIndexShared.value = hoverIndex; // No re-render!
    
    // Still update floating widget position
    translateX.value = event.absoluteX - cellWidth / 2;
    translateY.value = event.absoluteY - cellHeight / 2;
  })
  .onEnd(() => {
    runOnJS(finishDrag)(hoverIndexShared.value);
  });

// Render visual placeholder using animated style
const visualPlaceholderStyle = useAnimatedStyle(() => {
  const hoverIdx = hoverIndexShared.value;
  if (hoverIdx === -1) return { opacity: 0 };
  
  const position = calculatePosition(hoverIdx); // Need to make this work in worklet
  return {
    position: 'absolute',
    left: position.x,
    top: position.y,
    width: position.width,
    height: position.height,
    opacity: 0.3,
    backgroundColor: theme.primary,
  };
});
```

### Challenges

1. **calculateHoverIndex in worklet**: Current implementation uses refs (JS thread). Need to either:
   - Pass grid layout data as shared values
   - Use `runOnJS` for calculation (acceptable since it's infrequent)

2. **Position calculation in worklet**: Need grid layout accessible on UI thread

3. **Theme colors**: Need to make theme colors accessible in worklet scope

### Alternative: Throttled Store Updates

If visual-only approach is too complex, we can throttle store updates:

```tsx
const lastUpdateTime = useSharedValue(0);
const UPDATE_THROTTLE = 100; // ms

pan.onUpdate((event) => {
  const now = Date.now();
  if (now - lastUpdateTime.value > UPDATE_THROTTLE) {
    const hoverIndex = calculateHoverIndex(...);
    runOnJS(updatePlaceholder)(hoverIndex);
    lastUpdateTime.value = now;
  }
});
```

This limits re-renders to 10 Hz while still providing visual feedback.

### Recommendation

**Start with throttled store updates** (simpler, 80% of benefit):
- Update placeholder every 100ms instead of every frame
- Still gives good visual feedback without re-render storm
- Minimal code changes

**If that still causes issues, implement visual-only placeholder**:
- More complex but eliminates all mid-drag store updates
- Best performance, smoothest drag experience

## Testing Strategy

1. Test with throttled updates first (100ms, 200ms intervals)
2. Monitor for any gesture interruptions
3. If smooth, ship it
4. If still interrupted, implement visual-only approach
