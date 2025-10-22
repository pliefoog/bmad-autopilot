# Component Standards

*Updated with Storybook Integration Patterns - BMAD BMM Framework*

## Overview

This document defines component standards for maritime instrument widgets, incorporating the Storybook-based development patterns established in the GPS Widget implementation. These standards serve as templates for AI agent-based development.

## Component Template

```typescript
import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { useTheme } from '@/hooks/useTheme';

/**
 * ExampleWidget - Marine instrument widget for displaying [parameter]
 *
 * @param value - Current NMEA data value (e.g., depth in feet)
 * @param unit - Display unit (e.g., 'ft', 'm', 'fathoms')
 * @param onLongPress - Callback for configuration modal trigger
 * @param isStale - True if data is >5 seconds old
 * @param hasAlarm - True if alarm threshold is triggered
 */
interface ExampleWidgetProps {
  value: number | null;
  unit: string;
  onLongPress?: () => void;
  isStale?: boolean;
  hasAlarm?: boolean;
}

export const ExampleWidget: React.FC<ExampleWidgetProps> = ({
  value,
  unit,
  onLongPress,
  isStale = false,
  hasAlarm = false,
}) => {
  const { colors, typography } = useTheme();

  return (
    <Pressable
      onLongPress={onLongPress}
      style={[
        styles.container,
        {
          backgroundColor: colors.backgroundMedium,
          borderColor: hasAlarm ? colors.error : colors.borderGray,
        },
      ]}
    >
      {/* Widget Title */}
      <Text style={[styles.title, { color: colors.textSecondary }]}>
        EXAMPLE
      </Text>

      {/* Primary Data Value */}
      <View style={styles.valueContainer}>
        {value !== null ? (
          <>
            <Text
              style={[
                styles.value,
                typography.primaryDataValue,
                {
                  color: isStale ? colors.textTertiary : colors.textPrimary,
                },
              ]}
            >
              {value.toFixed(1)}
            </Text>
            <Text style={[styles.unit, { color: colors.textSecondary }]}>
              {unit}
            </Text>
          </>
        ) : (
          <Text style={[styles.noData, { color: colors.textTertiary }]}>
            --
          </Text>
        )}
      </View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: 8,
    borderWidth: 2,
    padding: 12,
    minWidth: 160,
    minHeight: 160,
    justifyContent: 'space-between',
  },
  title: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  valueContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'center',
  },
  value: {
    fontFamily: 'monospace',
  },
  unit: {
    fontSize: 16,
    marginLeft: 4,
  },
  noData: {
    fontSize: 42,
    fontWeight: '700',
  },
});
```

## Atomic Design Organization

### Component Hierarchy

**Atoms (Smallest UI Building Blocks):**
- `Button` - Primary, secondary, icon variants with consistent touch targets (≥44pt)
- `StatusIndicator` - Connection status, alarm states with color coding
- `LoadingSpinner` - Consistent loading animations across the app
- `Text` input fields with marine environment styling
- Icons and status dots for system states

**Molecules (Composed Components):**
- `ModalContainer` - Standardized modal with header, content, and action areas
- `SegmentedControl` - Multiple button groups for settings selection
- `FormField` - Label + input + validation message combination
- `Card` wrappers for consistent content presentation
- Navigation items with touch feedback

**Organisms (Complex UI Sections):**
- `StatusBar` - Connection status + battery + settings access
- `Dashboard` - Widget grid layout with **cross-platform drag-and-drop capabilities** (Platform.select required)
- `SetupWizard` - Multi-step onboarding flow
- `WidgetSelector` - Widget library interface with categories

### Cross-Platform Component Requirements & Web Development Strategy

**CRITICAL:** All interactive components must support both mobile and web platforms:

#### Development Platform Priority
1. **Web Browser (Primary Development)** - Webpack dev server for rapid UI iteration
2. **iOS/Android Simulator** - Native module and gesture validation  
3. **Physical Device** - Production testing and real-world validation

#### Platform-Specific Implementation Patterns

**Drag-and-Drop Implementation:**
- **Mobile:** react-native-gesture-handler (PanGestureHandler) 
- **Web:** HTML5 Drag API or CSS-based positioning
- **Implementation:** Use Platform.select() for platform-specific components
- **Web Testing:** Functional in webpack dev environment with mouse events

**Native Module Integration:**
- **Production:** Real native modules (TCP sockets, file system, audio)
- **Web Development:** Comprehensive mocks in `__mocks__/` directory
- **Mock Strategy:** Console logging maintains development visibility
- **Testing Workflow:** Web → Simulator → Device progression

**Component Development Rules:**
- **Start Web-First:** Design and test all UI components in browser environment
- **Mock-Aware Design:** Components gracefully handle mocked native functionality
- **Platform.select() Required:** For any native module or platform-specific interaction
- **Progressive Testing:** Validate across web → mobile → device platforms

### Atomic Design Implementation Rules

1. **Atoms** contain no business logic, only presentation
2. **Molecules** combine atoms with minimal state management
3. **Organisms** can connect to stores and contain complex logic
4. **Templates** define page layouts (handled by Expo Router)
5. **Pages** are route components that compose organisms

## Naming Conventions

### Files and Components

- **Components:** PascalCase with descriptive names
  - `Button.tsx`, `StatusIndicator.tsx`, `DepthWidget.tsx`
- **Hooks:** camelCase prefixed with `use`
  - `useNMEAData.ts`, `useTheme.ts`, `useConnection.ts`
- **Services:** PascalCase for classes, camelCase for functions
  - `NMEAConnection.ts`, `widgetStorage.ts`
- **Store:** camelCase ending with `Store`
  - `nmeaStore.ts`, `settingsStore.ts`
- **Types:** PascalCase ending with type suffix
  - `widget.types.ts` (exports `WidgetConfig`, `WidgetProps`)

### TypeScript Interfaces and Types

- **Props interfaces:** Component name + `Props`
  - `DepthWidgetProps`, `ButtonProps`

## Storybook Integration Requirements

*Essential for AI Agent-Based Development*

Every maritime instrument widget MUST include a comprehensive Storybook implementation following the established patterns from `GPSWidget.stories.tsx`.

### Required Story Types

#### 1. Default Story
```typescript
export const Default: Story = {
  render: () => (
    <MockStoreProvider nmeaData={mockNmeaData}>
      <ExampleWidget id="example-1" title="Example" />
    </MockStoreProvider>
  ),
};
```

#### 2. Settings Integration Story (if widget has settings)
```typescript
export const ExampleSettings: Story = {
  render: () => (
    <MockStoreProvider nmeaData={mockNmeaData}>
      <ScrollView style={{ backgroundColor: '#f8fafc' }}>
        <View style={{ padding: 20, gap: 20 }}>
          {/* Live Widget Preview */}
          <View style={previewCardStyle}>
            <Text style={styles.previewTitle}>📊 Live Example Widget Preview</Text>
            <ExampleWidget id="example-preview" title="Example Widget" />
            <InteractiveDemoInstructions />
          </View>

          {/* Settings Component */}
          <ExampleSettingsConfiguration />

          {/* Implementation Notes */}
          <ImplementationNotesSection />
        </View>
      </ScrollView>
    </MockStoreProvider>
  ),
};
```

#### 3. Data State Validation Stories
```typescript
export const NoDataState: Story = {
  render: () => (
    <MockStoreProvider
      nmeaData={{ [widgetDataField]: null, timestamp: null }}
    >
      <ExampleWidget id="example-no-data" title="No Data" />
    </MockStoreProvider>
  ),
};

export const StaleDataState: Story = {
  render: () => (
    <MockStoreProvider
      nmeaData={{ 
        [widgetDataField]: mockValue, 
        timestamp: Date.now() - 15000 // 15 seconds old
      }}
    >
      <ExampleWidget id="example-stale" title="Stale Data" />
    </MockStoreProvider>
  ),
};
```

#### 4. Theme Validation Story
```typescript
export const MaritimeThemes: Story = {
  render: () => {
    const [selectedTheme, setSelectedTheme] = useState<ThemeMode>('day');
    
    return (
      <MockStoreProvider nmeaData={mockNmeaData}>
        <ThemeSelector onThemeChange={setSelectedTheme} />
        <View style={{ backgroundColor: getThemeBackground(selectedTheme) }}>
          <ExampleWidget id="example-theme" title="Theme Demo" />
        </View>
      </MockStoreProvider>
    );
  },
};
```

### MockStoreProvider Requirements

Every widget story MUST use the `MockStoreProvider` pattern:

```typescript
const MockStoreProvider: React.FC<{
  children: React.ReactNode;
  nmeaData?: any;
  settingsOverrides?: any;
}> = ({ children, nmeaData = defaultMockData, settingsOverrides }) => {
  
  useEffect(() => {
    // 1. Clear and reset NMEA store
    useNmeaStore.setState({
      nmeaData: {
        [widgetDataFields]: nmeaData[widgetDataFields],
        // Clear other fields to prevent cross-contamination
        ...clearOtherFields(),
      },
    });

    // 2. Initialize widget store
    useWidgetStore.setState({
      widgetExpanded: {},
      pinnedWidgets: [],
    });

    // 3. Apply settings overrides if provided
    if (settingsOverrides) {
      useSettingsStore.setState(settingsOverrides);
    }

    // 4. Cleanup on unmount
    return () => {
      useNmeaStore.setState({ nmeaData: {} });
    };
  }, [dependencies]);

  return <View>{children}</View>;
};
```

### Story Implementation Checklist

When creating widget stories, ensure:

- [ ] **MockStoreProvider**: Proper store isolation and cleanup
- [ ] **Default Story**: Basic widget with typical data
- [ ] **Settings Story**: Live preview with settings component (if applicable)
- [ ] **Data States**: No data, stale data, error conditions
- [ ] **Theme Validation**: All maritime themes (day, night, red-night, auto)
- [ ] **Widget States**: Expanded/collapsed states (if applicable)
- [ ] **Interactive Demo**: Clear instructions for testing features
- [ ] **Implementation Notes**: Document all widget capabilities
- [ ] **Type Safety**: Proper TypeScript interfaces throughout
- [ ] **Accessibility**: Screen reader friendly elements

### AI Agent Development Guidelines

When AI agents create or modify widgets:

1. **Reference `GPSWidget.stories.tsx`** as the authoritative pattern
2. **Use the MockStoreProvider template** for all story implementations
3. **Include all required story types** listed above
4. **Follow the settings integration pattern** for widgets with configuration
5. **Test all data states and themes** using the established patterns
6. **Document implementation features** in story notes sections

### Related Documentation

- `storybook-integration-patterns.md`: Detailed Storybook patterns
- `design-system.md`: Maritime settings and theme guidelines
- `../stories/`: User story specifications and requirements
- **State types:** Descriptive name + `State`
  - `NMEADataState`, `ConnectionState`
- **Function types:** Descriptive name + `Handler` or `Callback`
  - `LongPressHandler`, `ConnectionCallback`

### Variables and Functions

- **React components:** PascalCase
  - `const DepthWidget: React.FC<DepthWidgetProps> = ...`
- **Hooks:** camelCase
  - `const useNMEAData = (parameter: string) => ...`
- **Constants:** SCREAMING_SNAKE_CASE
  - `const MAX_RETRY_ATTEMPTS = 5;`
  - `const DEFAULT_PORT = 10110;`
- **Regular functions/variables:** camelCase
  - `const handleLongPress = () => ...`
  - `const depthValue = nmeaData.depth;`

### State Management (Zustand)

- **Store slices:** camelCase
  - `nmeaStore`, `widgetStore`
- **Store actions:** verb + object
  - `addWidget()`, `removeWidget()`, `updateDepth()`
- **Store selectors:** descriptive noun
  - `const depth = useNMEAStore((state) => state.depth);`

## Maritime Date/Time Formatting System

### Overview

Marine navigation requires precise date/time formatting with proper timezone management. The system provides configurable date formats, time formats, and timezone options integrated with the unit conversion framework.

### Configuration Categories

#### Date Formats (`date` category)
```typescript
const dateFormats = {
  'iso_date': 'YYYY-MM-DD',           // 2025-10-21
  'us_date': 'MM/DD/YYYY',            // 10/21/2025
  'eu_date': 'DD/MM/YYYY',            // 21/10/2025
  'uk_date': 'DD MMM YYYY',           // 21 Oct 2025
  'nautical_date': 'DDD, MMM DD, YYYY' // Mon, Oct 21, 2025
};
```

#### Time Formats (`time_format` category)
```typescript
const timeFormats = {
  'time_24h': 'HH:MM:SS',             // 14:30:45
  'time_24h_no_sec': 'HH:MM',         // 14:30
  'time_12h': 'HH:MM:SS AM/PM',       // 02:30:45 PM
  'time_12h_no_sec': 'HH:MM AM/PM'    // 02:30 PM
};
```

#### Timezone Options (`timezone` category)
```typescript
const timezoneOptions = {
  'utc': 'UTC/GMT',                   // Coordinated Universal Time
  'local_device': 'Device Local Time', // Device's current timezone
  'ship_time': 'Ship\'s Time'         // Manually configured ship timezone
};
```

### Implementation in Widgets

#### Basic Date/Time Formatting
```typescript
const { getFormattedDateTime } = useUnitConversion();

// Format date according to user preferences
const dateFormatted = getFormattedDateTime(new Date(), 'date');
// Returns: { value: "Mon, Oct 21, 2025", unit: "" }

// Format time according to user preferences
const timeFormatted = getFormattedDateTime(new Date(), 'time');
// Returns: { value: "14:30:45", unit: "UTC" }
```

#### Complete Date/Time with Timezone
```typescript
const { getFormattedDateTimeWithTimezone } = useUnitConversion();

const dateTime = getFormattedDateTimeWithTimezone(new Date());
// Returns: {
//   date: "Mon, Oct 21, 2025",
//   time: "14:30:45", 
//   timezone: "UTC"
// }
```

#### GPS Widget Integration Example
```typescript
// GPS widget using configurable date/time formatting
const dateTimeFormatted = useMemo(() => {
  if (!utcTime) {
    return { 
      date: '--- ---, ----', 
      time: '--:--:--',
      timezone: 'UTC'
    };
  }

  const date = new Date(utcTime);
  return getFormattedDateTimeWithTimezone(date);
}, [utcTime, getFormattedDateTimeWithTimezone]);

// Usage in SecondaryMetricCell
<SecondaryMetricCell
  mnemonic="DATE"
  value={dateTimeFormatted.date}
  category="date"
/>
<SecondaryMetricCell
  mnemonic="TIME"
  value={`${dateTimeFormatted.time} ${dateTimeFormatted.timezone}`}
  category="time"
/>
```

### System Defaults by Profile

#### Metric System
- **Date:** ISO format (YYYY-MM-DD)
- **Time:** 24-hour format with seconds
- **Timezone:** UTC

#### Imperial System  
- **Date:** US format (MM/DD/YYYY)
- **Time:** 12-hour format with AM/PM
- **Timezone:** Device local time

#### Nautical System
- **Date:** Nautical format (DDD, MMM DD, YYYY)
- **Time:** 24-hour format with seconds
- **Timezone:** UTC

### Maritime Use Cases

#### GPS Navigation
- **Date:** Nautical format for log entries
- **Time:** 24-hour UTC for position fixes
- **Timezone:** UTC for coordinate system consistency

#### ETA Calculations (Future Implementation)
- **Date:** User preference format
- **Time:** User preference format  
- **Timezone:** Destination timezone or ship's time

#### Engine Hours/Maintenance
- **Date:** Local format for maintenance logs
- **Time:** Engine runtime formatting
- **Timezone:** Ship's time for crew scheduling

### Settings Integration

Date/time preferences are configured through the unit conversion settings dialog:

1. **Date Format Section:** Choose from ISO, US, EU, UK, or Nautical formats
2. **Time Format Section:** Select 12h/24h with/without seconds
3. **Timezone Section:** Configure UTC, Local Device, or Ship's timezone
4. **Preview:** Live preview of selected formats with current date/time

### Storybook Integration

Include date/time formatting in widget stories:

```typescript
// Date/Time formatting showcase
export const DateTimeFormats: Story = {
  render: () => (
    <View style={{ padding: 20, gap: 16 }}>
      {/* Show all format variations */}
      <GPSWidget preferences={{ 
        date: 'nautical_date', 
        time_format: 'time_24h', 
        timezone: 'utc' 
      }} />
      <GPSWidget preferences={{ 
        date: 'us_date', 
        time_format: 'time_12h', 
        timezone: 'local_device' 
      }} />
    </View>
  ),
};
```

### Future Enhancements

1. **Custom Timezone Support:** Manual UTC offset configuration
2. **Daylight Saving Time:** Automatic DST handling for local timezones  
3. **Multiple Time Displays:** Show multiple timezones simultaneously
4. **Sunrise/Sunset Integration:** Calculate nautical twilight times
5. **Tidal Time Integration:** Link with tidal prediction systems

## Widget Alignment System

### Maritime Display Standards

Marine instruments require consistent, professional alignment for safe navigation. The app implements a sophisticated alignment system through `useUnitConversion.ts` and `PrimaryMetricCell.tsx`.

#### Unit Category Alignment Configuration

Each metric category defines alignment behavior in `useUnitConversion.ts` → `getConsistentFormatWidth()`:

```typescript
const categoryContentSamples = {
  'wind_speed': { 
    maxContent: '99.9', 
    align: 'right',           // ← Right-aligned for numerical precision
    useTabularNums: true,
    formatPattern: '99.9'
  },
  'angle': { 
    maxContent: '359°', 
    align: 'right',           // ← Right-aligned for navigation angles
    useTabularNums: true,
    formatPattern: '999'
  },
  'coordinates': { 
    maxContent: '12° 34.567\' N', 
    align: 'right',           // ← Right-aligned (fixed 2025-10-21)
    useTabularNums: false,
    formatPattern: ''
  }
};
```

#### Alignment Implementation Rules

1. **Numerical Metrics (wind_speed, depth, vessel_speed):** Always `align: 'right'`
   - Ensures decimal alignment for trend monitoring
   - Tabular numbers for consistent digit widths
   - Format patterns enforce decimal places (e.g., "99.9")

2. **Navigation Angles (angle category):** Always `align: 'right'`
   - Integer display only (no decimal places for maritime convention)
   - Right-alignment for consistent bearing comparisons
   - Pattern: "999" (integer angles 0-360°)

3. **GPS Coordinates (coordinates category):** Use `align: 'right'`
   - **Critical Fix:** Was incorrectly set to `'center'`, causing centering instead of right-alignment
   - Right-aligned coordinate values with hemisphere indicators (N/S/E/W)
   - Mixed text/numbers but still right-aligned for consistency

4. **Time Displays (time category):** Use `align: 'center'`
   - Centered for traditional clock display convention
   - Pattern: "12:34:56" format

#### PrimaryMetricCell Alignment Flow

The `PrimaryMetricCell` component applies alignment through:

1. **Container Alignment:** Always `alignItems: 'flex-end'` for right-alignment
2. **Value Container:** `justifyContent: 'flex-end'` for right-aligned values
3. **Mnemonic/Unit Row:** `justifyContent: 'flex-end'` for right-aligned labels
4. **Grid Cell Wrapper:** Widget must use `alignItems: 'flex-end'` in grid cells

#### Widget Implementation Pattern

All widgets must follow this alignment pattern:

```typescript
// Widget Layout Structure
<View style={styles.gridCell}>  {/* alignItems: 'flex-end' */}
  <PrimaryMetricCell
    mnemonic="LAT"
    value="48° 38.199′ N"
    unit="°"
    category="coordinates"  {/* ← Determines alignment behavior */}
  />
</View>

// Required Widget Styles
const styles = StyleSheet.create({
  gridCell: {
    flex: 1,
    alignItems: 'flex-end', // ← CRITICAL: Right-align within grid
  },
});
```

#### Storybook Integration for Widget Development

**Epic 8+:** All widgets must include Storybook stories for visual documentation and testing.

**Required Stories for Each Widget:**
```typescript
// Example: GPSWidget.stories.tsx
export default {
  title: 'Widgets/GPSWidget',
  component: GPSWidget,
} as ComponentMeta<typeof GPSWidget>;

// Story 1: All alignment variations side-by-side
export const AlignmentComparison: ComponentStory<typeof GPSWidget> = () => (
  <View style={{ flexDirection: 'row', gap: 16 }}>
    <GPSWidget coordinates="DMS" />  {/* 48° 38′ 12″ N */}
    <GPSWidget coordinates="DDM" />  {/* 48° 38.199′ N */}
    <GPSWidget coordinates="DD" />   {/* 48.63665° N */}
  </View>
);

// Story 2: Maritime display validation
export const MaritimeStandards: ComponentStory<typeof GPSWidget> = () => (
  <View style={{ backgroundColor: 'black', padding: 20 }}>
    <GPSWidget theme="night" />  {/* Red-night theme compliance */}
  </View>
);
```

**Storybook Workflow for Widget Alignment:**
1. **Development:** Create widget stories showing alignment variations
2. **Visual Testing:** Storybook snapshots catch alignment regressions  
3. **Documentation:** Live examples demonstrate proper usage patterns
4. **Validation:** Compare widget alignment side-by-side in Storybook

**Required Storybook Addons for Maritime Apps:**
- `@storybook/addon-viewport` - Test responsive widget behavior
- `@storybook/addon-backgrounds` - Validate night/day theme compliance  
- `@storybook/addon-controls` - Interactive alignment configuration
- `@storybook/addon-docs` - Auto-generate widget documentation

#### Debugging Alignment Issues

**Development Workflow:** Component Standards (rules) → Storybook (visual validation) → Unit tests (behavior)

Common alignment problems and solutions:

1. **Values appear centered instead of right-aligned:**
   - Check unit category alignment in `useUnitConversion.ts`
   - **Storybook Check:** View widget in alignment comparison story
   - Ensure `align: 'right'` (not `'center'`)

2. **Grid layout jumping or inconsistent:**
   - Verify `alignItems: 'flex-end'` in widget grid cell styles
   - **Storybook Check:** Test with different value lengths in interactive story
   - Check `PrimaryMetricCell` receives correct `category` prop

3. **Decimal misalignment:**
   - Ensure `formatPattern` matches expected value range
   - **Storybook Check:** Compare numerical precision across widget variations
   - Verify `useTabularNums: true` for numerical categories

### Component Architecture Principles

### Marine Environment Considerations

1. **Touch Targets:** Minimum 44pt for gloved hands and rough seas
2. **Contrast:** High contrast for outdoor visibility and polarized sunglasses
3. **Feedback:** Immediate visual/haptic feedback for all interactions
4. **Error States:** Clear indication when data is stale or connection lost
5. **Accessibility:** Screen reader support for low-vision conditions

### Performance Requirements

1. **Render Optimization:** Use selectors to prevent unnecessary re-renders
2. **Animation Performance:** 60 FPS minimum for smooth compass rotation
3. **Memory Management:** Efficient widget mounting/unmounting
4. **Bundle Size:** Tree-shaking friendly exports and minimal dependencies

### Development Guidelines

1. **TypeScript Strict Mode:** No `any` types without explicit justification
2. **Error Boundaries:** Wrap complex components to prevent crashes
3. **Testing:** Every component requires unit tests with >70% coverage
4. **Documentation:** JSDoc comments for all public interfaces
5. **Code Splitting:** Lazy load non-critical components

## Storybook-Driven Widget Development (Epic 8+)

### V2.3 Validation Stories (IMPLEMENTED ✅)

**Created Stories for Current Implementation:**
- `stories/components/PrimaryMetricCell.stories.tsx` - Core alignment component validation
- `stories/widgets/GPSWidget.stories.tsx` - GPS coordinate alignment verification  
- `stories/widgets/WindWidget.stories.tsx` - Wind metric alignment validation
- `stories/maritime/V23Compliance.stories.tsx` - Complete V2.3 checklist verification

**Run Storybook:** `npm run storybook` to validate maritime display standards visually

### Component Development Workflow

**Phase 1: Design & Document**
1. Write Component Standards patterns (this document)
2. Create Storybook stories showing expected behavior ✅ **DONE for V2.3**
3. Implement component following maritime display standards

**Phase 2: Visual Validation**  
1. Test alignment variations in Storybook
2. Validate maritime theme compliance (day/night modes)
3. Capture visual snapshots for regression detection

**Phase 3: Integration Testing**
1. Unit tests for logic and state management
2. Integration tests with NMEA data flow
3. Cross-platform testing (web → mobile → device)

### Maritime Widget Story Requirements

Every widget must include these Storybook stories:

**Required Stories:**
- `Default` - Standard widget with typical values
- `AlignmentComparison` - All unit variations side-by-side  
- `MaritimeThemes` - Day/night/red-night theme validation
- `DataStates` - Normal, warning, alarm, and stale data states
- `ResponsiveLayout` - Behavior across different screen sizes

**Example Story Structure:**
```typescript
// stories/widgets/GPSWidget.stories.tsx
export const AlignmentValidation = () => (
  <View style={{ padding: 20, gap: 16 }}>
    {/* Wind Speed - Right Aligned */}
    <PrimaryMetricCell mnemonic="AWS" value="12.5" unit="m/s" category="wind_speed" />
    
    {/* GPS Coordinates - Right Aligned */}  
    <PrimaryMetricCell mnemonic="LAT" value="48° 38.199′ N" unit="°" category="coordinates" />
    
    {/* Navigation Angles - Right Aligned */}
    <PrimaryMetricCell mnemonic="AWA" value="045" unit="°" category="angle" />
  </View>
);
```

### Benefits for Widget Development

**Immediate Visual Feedback:**
- See alignment changes instantly without full app rebuild
- Compare widget variations side-by-side
- Test edge cases (long values, different units, error states)

**Documentation as Code:**  
- Storybook stories serve as living documentation
- New developers see working examples, not just written rules
- Visual regression testing prevents alignment breaks

**Maritime Standards Validation:**
- Test day/night/red-night theme compliance
- Validate touch target sizes across devices  
- Ensure proper contrast ratios for marine environments

**Integration with BMM Method:**
- Component Standards define the rules
- Storybook stories demonstrate the implementation
- Unit tests validate the behavior  
- All three work together for robust widget development