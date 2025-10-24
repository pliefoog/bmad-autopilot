# Storybook Stories Refactoring for Zustand Singleton Limitation

## Problems Identified

### 1. CoordinateFormats Story
The GPS Widget Storybook "CoordinateFormats" story was supposed to display three widgets side-by-side, each showing the same GPS coordinates in different formats (DMS, DDM, DD). However, all three widgets were stuck showing the same format (initially DMS, then DD after attempted fix).

### 2. MaritimeThemes Story
The "MaritimeThemes" story attempted to show three widgets simultaneously with different themes (Day, Night, Red Night). However, all three widgets displayed the same theme because they all read from the same global Zustand theme store.

## Root Cause

**Zustand stores are global singletons.** This fundamental architecture means:

1. All widgets in a single story share the same store instance
2. When multiple widgets need different settings, the last `setState()` call wins
3. There's no way to isolate store state per component instance
4. Attempting to wrap each widget in separate `MockStoreProvider` components doesn't help because they all write to and read from the same global store

For example:
```typescript
<MockStoreProvider coordinateFormat="degrees_minutes_seconds">
  <GPSWidget id="gps-dms" />  ← Reads from global store
</MockStoreProvider>
<MockStoreProvider coordinateFormat="degrees_minutes">
  <GPSWidget id="gps-ddm" />  ← Also reads from same global store
</MockStoreProvider>
<MockStoreProvider coordinateFormat="decimal_degrees">
  <GPSWidget id="gps-dd" />  ← Also reads from same global store (last to set wins)
</MockStoreProvider>
```

All three widgets read from `useSettingsStore.getState().gps.coordinateFormat`, which has only **one value** at any given time.

## Solutions

### Solution 1: Remove CoordinateFormats Story

Since we cannot display multiple coordinate formats simultaneously due to the Zustand singleton limitation, we **removed the CoordinateFormats story entirely**.

**Alternative**: Users can test coordinate formats interactively in the **MaritimeSettings** story, which includes:
- The full Maritime Settings configuration UI
- A live GPS widget that updates as settings change
- All three coordinate format options (DD, DDM, DMS)

**Code Change**:
```typescript
// NOTE: Coordinate formats can be tested interactively in the MaritimeSettings story
// Removed CoordinateFormats story due to Zustand singleton limitation
```

### Solution 2: Redesign MaritimeThemes Story with Interactive Theme Selector

Instead of trying to show three widgets with different themes simultaneously, we created a **single widget with an interactive theme selector** that allows users to switch between themes.

**File**: [GPSWidget.stories.tsx](src/stories/widgets/GPSWidget.stories.tsx)

**Key Features**:
1. **useState** to track selected theme locally
2. **Theme selector buttons** that call `useThemeStore.getState().setMode()`
3. **Single GPS widget** that reacts to theme changes
4. **Dynamic background color** that matches the theme
5. **Theme descriptions** to explain each option

**Implementation**:

```typescript
export const MaritimeThemes: Story = {
  render: () => {
    const [selectedTheme, setSelectedTheme] = useState<ThemeMode>('day');

    // Theme options
    const themes: { mode: ThemeMode; label: string; description: string; bgColor: string }[] = [
      { mode: 'day', label: '☀️ Day', description: 'High contrast for outdoor visibility', bgColor: '#ffffff' },
      { mode: 'night', label: '🌙 Night', description: 'Reduced brightness for indoor use', bgColor: '#1a1a2e' },
      { mode: 'red-night', label: '👁️ Red Night', description: 'Marine night vision preservation', bgColor: '#0f0000' },
      { mode: 'auto', label: '🕐 Auto', description: 'Automatic theme based on time', bgColor: '#f0f0f0' },
    ];

    return (
      <MockStoreProvider nmeaData={...}>
        <ScrollView style={{ flex: 1 }}>
          <View style={{ padding: 20 }}>
            {/* Theme Selector Buttons */}
            <View style={{ flexDirection: 'row', gap: 12, flexWrap: 'wrap' }}>
              {themes.map((theme) => (
                <TouchableOpacity
                  key={theme.mode}
                  onPress={() => {
                    setSelectedTheme(theme.mode);
                    useThemeStore.getState().setMode(theme.mode);
                  }}
                  style={{
                    padding: 12,
                    borderRadius: 8,
                    backgroundColor: selectedTheme === theme.mode ? '#3b82f6' : '#f1f5f9',
                    borderWidth: 2,
                    borderColor: selectedTheme === theme.mode ? '#2563eb' : '#e2e8f0',
                  }}
                >
                  <Text>{theme.label}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Single GPS Widget with Dynamic Background */}
            <View
              style={{
                backgroundColor: themes.find(t => t.mode === selectedTheme)?.bgColor,
                padding: 20,
                borderRadius: 12,
              }}
            >
              <GPSWidget id="gps-theme-demo" title="GPS Position" />
            </View>
          </View>
        </ScrollView>
      </MockStoreProvider>
    );
  },
};
```

## How It Works Now

### CoordinateFormats
- ❌ **Removed**: Cannot show multiple formats simultaneously
- ✅ **Alternative**: Use the MaritimeSettings story for interactive testing

### MaritimeThemes
- ✅ **Interactive**: Single widget with theme selector buttons
- ✅ **Reactive**: Widget updates immediately when theme changes
- ✅ **Visual**: Background color matches selected theme
- ✅ **Informative**: Shows theme descriptions and usage guidance

## Testing in Storybook

### Testing MaritimeThemes Story

1. Open Storybook: `npm run storybook`
2. Navigate to: **Widgets/GPSWidget** → **MaritimeThemes**
3. Verify the interactive theme selector:
   - ✅ **Day Theme Button** (☀️): Click to see bright, high-contrast theme with white background
   - ✅ **Night Theme Button** (🌙): Click to see dark theme with reduced brightness
   - ✅ **Red Night Theme Button** (👁️): Click to see red-tinted theme for night vision preservation
   - ✅ **Auto Theme Button** (🕐): Click to see automatic theme based on time of day
4. Expand the GPS widget (click ⌄ caret) to see Date/Time with theme styling
5. Verify background color changes to match the selected theme

### Testing Coordinate Formats

1. Navigate to: **Widgets/GPSWidget** → **MaritimeSettings**
2. Scroll to the GPS Settings section
3. Click on different Coordinate Format options:
   - ✅ **DD** (Decimal Degrees): `48.63665° N, 2.02335° W`
   - ✅ **DDM** (Degrees Decimal Minutes): `48° 38.199' N, 2° 01.401' W`
   - ✅ **DMS** (Degrees Minutes Seconds): `48° 38' 11.9" N, 2° 01' 24.1" W`
4. Verify the GPS widget updates immediately as you change the format

## Files Modified

1. **src/stories/widgets/GPSWidget.stories.tsx**
   - Added `useThemeStore` and `ThemeMode` imports (line 11)
   - Removed CoordinateFormats story (replaced with comment note)
   - Completely rewrote MaritimeThemes story with:
     - Interactive theme selector buttons
     - useState to track selected theme
     - Dynamic background colors per theme
     - Single widget that reacts to theme changes
     - Helpful usage instructions

2. **COORDINATE-FORMATS-STORY-FIX.md** (renamed to reflect broader scope)
   - Updated to document both issues and solutions
   - Explained Zustand singleton limitation clearly
   - Added testing instructions for both stories

## Key Architectural Insight

**Zustand Singleton Limitation**: When using Zustand stores, you cannot display multiple components with different store values simultaneously in the same render tree. The solutions are:

1. **Interactive Controls**: Use a single component with UI controls that modify the store (best for Storybook)
2. **Separate Stories**: Create individual stories for each variation
3. **Component Props**: Add optional props that override store values (requires component modification)

For Storybook demonstrations, **Option 1 (Interactive Controls)** provides the best user experience.

## Related Documentation

- [STORYBOOK-USAGE-GUIDE.md](STORYBOOK-USAGE-GUIDE.md) - General Storybook usage patterns
- [GPS-SETTINGS-REACTIVITY-FIX.md](GPS-SETTINGS-REACTIVITY-FIX.md) - Previous settings reactivity fix
- [TIMEZONE-AND-ALIGNMENT-FIXES.md](TIMEZONE-AND-ALIGNMENT-FIXES.md) - Timezone and alignment improvements

## Pattern for Future Stories

When creating Storybook stories that need to demonstrate multiple variations of a widget:

✅ **DO**: Create interactive controls that modify the global store
❌ **DON'T**: Try to display multiple widgets with different store values simultaneously

**Example Pattern**:
```typescript
export const InteractiveStory: Story = {
  render: () => {
    const [selectedValue, setSelectedValue] = useState('default');

    return (
      <>
        {/* Selector UI */}
        <ThemeSelector
          value={selectedValue}
          onChange={(val) => {
            setSelectedValue(val);
            useStore.getState().setValue(val);
          }}
        />

        {/* Single widget that reacts to store changes */}
        <Widget id="demo" />
      </>
    );
  },
};
```
