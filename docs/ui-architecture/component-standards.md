# Component Standards

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

## Component Architecture Principles

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