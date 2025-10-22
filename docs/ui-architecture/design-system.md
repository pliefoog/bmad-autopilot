# Design System - Maritime Settings Framework

*BMAD BMM Design System Documentation*  
*Maritime Instrument Display Framework*

## Overview

This document defines the design system for maritime settings and widget configuration interfaces, establishing consistent patterns for AI agent-based development.

## Maritime Settings Architecture

### Settings Organization Structure

```
Maritime Settings
├── GPS Settings (Navigation)
│   ├── Coordinate Format (DD/DDM/DMS/UTM)
│   ├── Date Format
│   ├── Time Format
│   └── Timezone
└── Ship Time Settings (Scheduling)
    ├── Date Format
    ├── Time Format
    └── Timezone (no coordinate format)
```

### Core Principles

1. **Separation of Concerns**: GPS settings for navigation, Ship Time for scheduling/ETAs
2. **Maritime Standards**: Use proper abbreviations (DD, DDM, DMS, UTM) not symbols
3. **Professional Notation**: Time formats like HH:mm, hh:mm a instead of component letters
4. **Comprehensive Timezones**: UTC±n format with major cities like OS selectors

## Settings Component Patterns

### 1. Settings Configuration Component Structure

```typescript
export const MaritimeSettingsConfiguration: React.FC = () => {
  return (
    <View style={styles.container}>
      {/* Settings Header */}
      <Text style={styles.sectionTitle}>⚙️ Maritime Settings</Text>
      
      {/* GPS Settings Section */}
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>📍 GPS Settings (Navigation)</Text>
        <SettingsGroup>
          <CoordinateFormatPicker />
          <DateFormatPicker />
          <TimeFormatPicker />
          <TimezonePicker />
        </SettingsGroup>
      </View>

      {/* Ship Time Settings Section */}
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>🚢 Ship Time Settings (Scheduling)</Text>
        <SettingsGroup>
          <DateFormatPicker />
          <TimeFormatPicker />
          <TimezonePicker />
        </SettingsGroup>
      </View>
    </View>
  );
};
```

### 2. Timezone Picker Pattern

```typescript
const TimezonePicker: React.FC<{ section: 'gps' | 'shipTime' }> = ({ section }) => {
  const [expanded, setExpanded] = useState(false);
  const selectedTimezone = useSettingsStore(state => state[section].timezone);
  
  return (
    <View style={styles.pickerContainer}>
      <TouchableOpacity
        onPress={() => setExpanded(!expanded)}
        style={styles.pickerHeader}
      >
        <Text style={styles.pickerLabel}>Timezone</Text>
        <Text style={styles.pickerValue}>
          {getTimezoneDisplay(selectedTimezone)}
        </Text>
        <Text style={styles.caret}>{expanded ? '▲' : '▼'}</Text>
      </TouchableOpacity>
      
      {expanded && (
        <ScrollView style={styles.timezoneList}>
          {MARITIME_TIMEZONES.map(timezone => (
            <TimezoneOption
              key={timezone.id}
              timezone={timezone}
              selected={selectedTimezone === timezone.id}
              onSelect={() => updateTimezone(section, timezone.id)}
            />
          ))}
        </ScrollView>
      )}
    </View>
  );
};
```

### 3. Format Picker Pattern

```typescript
const CoordinateFormatPicker: React.FC = () => {
  const coordinateFormat = useSettingsStore(state => state.gps.coordinateFormat);
  
  const formats = [
    { id: 'decimal_degrees', label: 'DD (Decimal Degrees)', example: '48.63665° N' },
    { id: 'degrees_minutes', label: 'DDM (Degrees Minutes)', example: '48° 38.199′ N' },
    { id: 'degrees_minutes_seconds', label: 'DMS (Degrees Minutes Seconds)', example: '48° 38′ 11.9″ N' },
    { id: 'utm', label: 'UTM (Universal Transverse Mercator)', example: 'UTM 30U 123456 5678901' },
  ];

  return (
    <View style={styles.formatPicker}>
      <Text style={styles.pickerLabel}>Coordinate Format</Text>
      {formats.map(format => (
        <TouchableOpacity
          key={format.id}
          onPress={() => setGpsSetting('coordinateFormat', format.id)}
          style={[
            styles.formatOption,
            coordinateFormat === format.id && styles.formatOptionSelected
          ]}
        >
          <View style={styles.formatOptionContent}>
            <Text style={styles.formatLabel}>{format.label}</Text>
            <Text style={styles.formatExample}>{format.example}</Text>
          </View>
          <View style={styles.radioButton}>
            {coordinateFormat === format.id && <View style={styles.radioButtonInner} />}
          </View>
        </TouchableOpacity>
      ))}
    </View>
  );
};
```

## Visual Design Standards

### Color Scheme

```typescript
const settingsColors = {
  // Section backgrounds
  sectionBackground: '#ffffff',
  alternateBackground: '#f8fafc',
  
  // Interactive elements
  primary: '#3b82f6',
  primaryHover: '#2563eb',
  
  // Text hierarchy
  sectionTitle: '#1e293b',
  settingLabel: '#374151',
  settingValue: '#1f2937',
  helperText: '#6b7280',
  
  // Status indicators
  success: '#22c55e',
  warning: '#f59e0b',
  error: '#ef4444',
  
  // Borders and dividers
  border: '#e5e7eb',
  divider: '#f3f4f6',
};
```

### Typography Scale

```typescript
const settingsTypography = {
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    lineHeight: 24,
  },
  settingLabel: {
    fontSize: 16,
    fontWeight: '500',
    lineHeight: 20,
  },
  settingValue: {
    fontSize: 15,
    fontWeight: '400',
    lineHeight: 18,
  },
  helperText: {
    fontSize: 13,
    fontWeight: '400',
    lineHeight: 16,
  },
  exampleText: {
    fontSize: 12,
    fontWeight: '400',
    lineHeight: 14,
    fontStyle: 'italic',
  },
};
```

### Spacing System

```typescript
const settingsSpacing = {
  sectionGap: 24,        // Between major sections
  groupGap: 16,          // Between setting groups
  itemGap: 12,           // Between individual settings
  elementGap: 8,         // Between labels and controls
  compactGap: 4,         // Between closely related elements
  
  // Padding
  sectionPadding: 20,
  groupPadding: 16,
  itemPadding: 12,
  elementPadding: 8,
};
```

## Interactive Patterns

### 1. Settings State Management

```typescript
// GPS Settings Actions
const setGpsSetting = (setting: keyof GPS Settings, value: string) => {
  useSettingsStore.setState(state => ({
    gps: {
      ...state.gps,
      [setting]: value
    }
  }));
};

// Ship Time Settings Actions
const setShipTimeSetting = (setting: keyof ShipTimeSettings, value: string) => {
  useSettingsStore.setState(state => ({
    shipTime: {
      ...state.shipTime,
      [setting]: value
    }
  }));
};
```

### 2. Real-time Preview Integration

```typescript
const SettingsWithPreview: React.FC = () => {
  return (
    <View style={styles.settingsLayout}>
      {/* Live Preview Card */}
      <View style={styles.previewCard}>
        <Text style={styles.previewTitle}>📍 Live Widget Preview</Text>
        <Widget id="preview" title="Widget Title" />
        
        <View style={styles.interactiveDemo}>
          <Text style={styles.demoTitle}>💡 Interactive Demo</Text>
          <Text style={styles.demoInstructions}>
            • Change settings below to see live updates{'\n'}
            • All changes are applied immediately{'\n'}
            • Settings are automatically saved
          </Text>
        </View>
      </View>

      {/* Settings Configuration */}
      <SettingsConfiguration />
    </View>
  );
};
```

### 3. Validation and Feedback

```typescript
const SettingsValidation: React.FC = () => {
  const [errors, setErrors] = useState({});
  
  const validateSetting = (setting: string, value: any) => {
    // Validation logic
    if (!isValid(value)) {
      setErrors(prev => ({ ...prev, [setting]: 'Invalid value' }));
      return false;
    }
    
    setErrors(prev => {
      const newErrors = { ...prev };
      delete newErrors[setting];
      return newErrors;
    });
    return true;
  };

  return (
    <View>
      <SettingInput
        value={value}
        onChange={(value) => {
          if (validateSetting('timezone', value)) {
            updateSetting('timezone', value);
          }
        }}
        error={errors.timezone}
      />
    </View>
  );
};
```

## Accessibility Standards

### 1. Screen Reader Support

```typescript
const AccessibleSettingsPicker: React.FC = () => {
  return (
    <TouchableOpacity
      accessible={true}
      accessibilityRole="button"
      accessibilityLabel="Coordinate format setting"
      accessibilityValue={{
        text: `Currently set to ${currentFormat.label}`
      }}
      accessibilityHint="Tap to change coordinate display format"
      onPress={openPicker}
    >
      <SettingsPickerContent />
    </TouchableOpacity>
  );
};
```

### 2. Maritime Accessibility

```typescript
const MaritimeAccessibilityFeatures = {
  // High contrast for outdoor visibility
  highContrast: true,
  
  // Large touch targets for gloved hands
  minimumTouchTarget: 44,
  
  // Voice-over friendly labels
  accessibilityLabels: {
    coordinateFormat: 'GPS coordinate display format',
    timezone: 'Timezone for time display',
    dateFormat: 'Date display format',
  },
  
  // Marine-specific considerations
  marineFeatures: {
    // Red night mode compatibility
    redNightModeSupport: true,
    // Quick access patterns
    emergencyAccessibility: true,
    // Motion considerations for boat movement
    stabilizedTouch: true,
  },
};
```

## Theme Integration

### 1. Maritime Theme Support

```typescript
const getSettingsTheme = (themeMode: ThemeMode) => {
  const baseTheme = {
    day: {
      background: '#ffffff',
      text: '#1e293b',
      border: '#e5e7eb',
    },
    night: {
      background: '#1a1a2e',
      text: '#e2e8f0',
      border: '#374151',
    },
    redNight: {
      background: '#0f0000',
      text: '#ff6b6b',
      border: '#4a0000',
    },
    auto: {
      // Dynamic based on time/location
    },
  };
  
  return baseTheme[themeMode];
};
```

### 2. Responsive Design

```typescript
const ResponsiveSettings: React.FC = () => {
  const { width } = useWindowDimensions();
  const isTablet = width > 768;
  
  return (
    <View style={[
      styles.container,
      isTablet && styles.tabletLayout
    ]}>
      {isTablet ? (
        <TwoColumnSettingsLayout />
      ) : (
        <SingleColumnSettingsLayout />
      )}
    </View>
  );
};
```

## Implementation Guidelines for AI Agents

When developing maritime settings components:

1. **Follow the established patterns** documented in this design system
2. **Use the component templates** as starting points for new settings
3. **Implement accessibility features** according to maritime requirements
4. **Support all theme modes** including red-night for marine use
5. **Include real-time preview** integration where applicable
6. **Validate user input** and provide clear error feedback
7. **Test with Storybook stories** following the established patterns

## Related Documentation

- `storybook-integration-patterns.md`: Storybook testing patterns
- `component-standards.md`: Core component architecture
- `../ui-architecture.md`: Overall UI architecture
- `../stories/`: User story specifications and maritime requirements
