# Storybook Integration Patterns

*BMAD BMM Knowledge Capture Document*  
*For AI Agent-Based Development with Maritime Instrument Framework*

## Overview

This document captures the essential Storybook integration patterns developed for maritime instrument widgets. These patterns serve as the authoritative template for widget development and integration in the BMAD autopilot framework.

## Core Integration Pattern: GPSWidget Example

The `GPSWidget.stories.tsx` file demonstrates the complete integration pattern that should be followed for all maritime instrument widgets.

### 1. MockStoreProvider Pattern

```typescript
const MockStoreProvider: React.FC<{
  children: React.ReactNode;
  nmeaData?: any;
  coordinateFormat?: 'decimal_degrees' | 'degrees_minutes' | 'degrees_minutes_seconds' | 'utm';
}> = ({ children, nmeaData = mockNmeaData, coordinateFormat }) => {
  
  useEffect(() => {
    // Clear and reset NMEA store completely
    useNmeaStore.setState({
      nmeaData: {
        gpsPosition: nmeaData.gpsPosition,
        gpsQuality: nmeaData.gpsQuality,
        utcTime: nmeaData.utcTime,
        gpsTimestamp: nmeaData.gpsTimestamp,
        // Clear other fields to prevent cross-contamination
        windAngle: undefined,
        windSpeed: undefined,
        depth: undefined,
        speed: undefined,
      },
    });

    // Initialize widget store with default state
    useWidgetStore.setState({
      widgetExpanded: {},
      pinnedWidgets: [],
    });

    // Set coordinate format if provided
    if (coordinateFormat) {
      useSettingsStore.setState({
        gps: {
          ...useSettingsStore.getState().gps,
          coordinateFormat: coordinateFormat,
        },
      });
    }

    // Cleanup function to reset store when story unmounts
    return () => {
      useNmeaStore.setState({
        nmeaData: {},
      });
    };
  }, [dependencies]);

  return <View>{children}</View>;
};
```

**Key Principles:**
1. **Store Isolation**: Clear and reset all store data to prevent cross-contamination between stories
2. **Parametric Testing**: Accept configuration parameters to test different widget states
3. **Cleanup**: Reset stores on unmount to ensure story independence
4. **Dependency Tracking**: Use proper useEffect dependencies for reactive updates

### 2. Essential Story Types

Every widget should include these core story types:

#### Default Story
```typescript
export const Default: Story = {
  render: () => (
    <MockStoreProvider nmeaData={mockNmeaData}>
      <GPSWidget id="gps-1" title="GPS" />
    </MockStoreProvider>
  ),
};
```

#### Settings Integration Story
```typescript
export const MaritimeSettings: Story = {
  render: () => (
    <MockStoreProvider nmeaData={mockNmeaData}>
      <ScrollView style={{ backgroundColor: '#f8fafc' }}>
        <View style={{ padding: 20, gap: 20 }}>
          {/* Live Widget Preview */}
          <View style={previewCard}>
            <Text style={styles.previewTitle}>📍 Live Widget Preview</Text>
            <GPSWidget id="gps-preview" title="GPS Position" />
            <View style={interactiveDemoBox}>
              <Text>💡 Interactive Demo Instructions</Text>
            </View>
          </View>

          {/* Settings Component */}
          <MaritimeSettingsConfiguration />

          {/* Implementation Notes */}
          <View style={implementationNotes}>
            <Text>✅ Implementation Features</Text>
          </View>
        </View>
      </ScrollView>
    </MockStoreProvider>
  ),
};
```

#### Data State Validation
```typescript
export const NoDataFix: Story = {
  render: () => (
    <MockStoreProvider
      nmeaData={{
        gpsPosition: { latitude: null, longitude: null },
        gpsQuality: 'No Fix',
        utcTime: null,
        gpsTimestamp: null,
      }}
    >
      <GPSWidget id="gps-no-fix" title="No GPS Signal" />
    </MockStoreProvider>
  ),
};
```

#### Theme Validation
```typescript
export const MaritimeThemes: Story = {
  render: () => {
    const [selectedTheme, setSelectedTheme] = useState<ThemeMode>('day');
    
    return (
      <MockStoreProvider nmeaData={mockNmeaData}>
        {/* Theme Selector */}
        <ThemeSelector onThemeChange={setSelectedTheme} />
        
        {/* Widget with Dynamic Background */}
        <View style={{ backgroundColor: getThemeBackground(selectedTheme) }}>
          <GPSWidget id="gps-theme-demo" title="GPS Position" />
        </View>
      </MockStoreProvider>
    );
  },
};
```

### 3. Maritime Settings Integration Pattern

**Requirements for all widgets with settings:**

1. **Settings Component Integration**: Include the relevant settings component in a dedicated story
2. **Live Preview**: Show widget with real-time settings updates
3. **Interactive Demo Box**: Provide clear instructions for testing settings changes
4. **Implementation Notes**: Document all features and capabilities

**Settings Story Template:**
```typescript
export const [WidgetName]Settings: Story = {
  render: () => {
    const currentTime = new Date();

    return (
      <MockStoreProvider nmeaData={mockDataForWidget}>
        <ScrollView style={{ backgroundColor: '#f8fafc' }}>
          <View style={{ padding: 20, gap: 20 }}>
            {/* Live Widget Preview */}
            <View style={previewCardStyle}>
              <Text style={styles.previewTitle}>📊 Live [Widget] Preview</Text>
              <Text style={styles.previewNote}>Current Data: [describe data]</Text>
              
              <View style={{ marginTop: 12, marginBottom: 8 }}>
                <[WidgetName] id="[widget]-preview" title="[Widget Title]" />
              </View>

              <View style={interactiveDemoStyle}>
                <Text style={demoTitleStyle}>💡 Interactive Demo</Text>
                <Text style={demoInstructionsStyle}>
                  • Change [Setting 1] below to see [effect]{'\n'}
                  • Adjust [Setting 2] to see [effect]{'\n'}
                  • Select [Setting 3] to see [effect]
                </Text>
              </View>
            </View>

            {/* Settings Component */}
            <[WidgetName]SettingsConfiguration />

            {/* Implementation Notes */}
            <View style={implementationNotesStyle}>
              <Text style={styles.notesTitle}>✅ Implementation Features</Text>
              <Text style={styles.notesText}>
                ✓ Feature 1: Description{'\n'}
                ✓ Feature 2: Description{'\n'}
                ✓ Feature 3: Description
              </Text>
            </View>
          </View>
        </ScrollView>
      </MockStoreProvider>
    );
  },
};
```

### 4. Store State Management Patterns

**Required Store Integrations:**
1. **NMEA Data Store**: Mock data that matches widget requirements
2. **Widget Store**: Expansion and pinning state management
3. **Settings Store**: Widget-specific settings integration
4. **Theme Store**: Theme validation and switching

**Best Practices:**
- Use `useSettingsStore.setState()` for direct settings updates in stories
- Implement proper cleanup in useEffect return functions
- Test all data states: normal, stale, no-data, error
- Validate all theme modes: day, night, red-night, auto

## Implementation Checklist for New Widgets

When creating Storybook stories for new widgets, ensure:

### Core Stories
- [ ] **Default**: Basic widget with typical data
- [ ] **Settings Integration**: Live preview with settings component
- [ ] **Data States**: No data, stale data, error states
- [ ] **Theme Validation**: All maritime themes tested
- [ ] **Widget States**: Expanded/collapsed if applicable

### Settings Integration (if applicable)
- [ ] **Live Preview**: Widget updates in real-time with settings changes
- [ ] **Interactive Demo**: Clear instructions for testing
- [ ] **Implementation Notes**: Document all features
- [ ] **Settings Component**: Include relevant settings UI

### Technical Requirements
- [ ] **Store Isolation**: Proper MockStoreProvider implementation
- [ ] **Cleanup**: Store reset on unmount
- [ ] **Type Safety**: Proper TypeScript interfaces
- [ ] **Accessibility**: Test with screen readers if applicable
- [ ] **Performance**: No memory leaks or excessive re-renders

## AI Agent Development Guidelines

When AI agents are developing new widgets or updating existing ones:

1. **Reference GPSWidget.stories.tsx** as the authoritative integration pattern
2. **Follow the MockStoreProvider pattern** for all story implementations
3. **Include all core story types** listed in this document
4. **Implement settings integration** following the established patterns
5. **Validate against maritime themes** and data states
6. **Document implementation features** in the story notes

## Future Enhancements

This pattern should be extended as new widget types are developed:

- **Autopilot Widgets**: Command and status display patterns
- **Navigation Widgets**: Chart and route display integration
- **Alarm Widgets**: Critical alert and notification patterns
- **System Widgets**: Diagnostic and maintenance display patterns

## Related Documentation

- `component-standards.md`: Core component architecture
- `design-system.md`: Theme and styling guidelines
- `../stories/`: User story specifications and requirements
- `../ui-architecture.md`: Overall UI architecture documentation