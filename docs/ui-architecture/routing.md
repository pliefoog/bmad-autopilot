# Routing Architecture with Expo Router

## File-Based Navigation Structure

Expo Router uses file-based routing in the `app/` directory:

```
app/
├── _layout.tsx           # Root layout with providers
├── index.tsx             # Dashboard (default route)
├── settings/
│   ├── _layout.tsx       # Settings section layout
│   ├── index.tsx         # General settings
│   ├── units.tsx         # Unit preferences
│   ├── alarms.tsx        # Alarm configuration
│   └── connection.tsx    # WiFi bridge setup
├── widgets/
│   └── [id].tsx          # Dynamic widget configuration
├── +not-found.tsx        # 404 error page
└── (future-tabs)/        # Reserved for tab navigation
    ├── _layout.tsx
    ├── dashboard.tsx
    └── charts.tsx
```

## Route Configuration

### Root Layout

**Root Layout (`app/_layout.tsx`)**

```typescript
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { ThemeProvider } from '@/theme/ThemeProvider';
import { ConnectionProvider } from '@/hooks/useNMEAConnection';
import { SafeAreaProvider } from 'react-native-safe-area-context';

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <ConnectionProvider>
          <Stack screenOptions={{ 
            headerShown: false, // Custom header in each screen
            animation: 'slide_from_right',
          }}>
            <Stack.Screen name="index" />
            <Stack.Screen 
              name="settings" 
              options={{ 
                presentation: 'modal',
                animation: 'slide_from_bottom',
              }} 
            />
            <Stack.Screen
              name="widgets/[id]"
              options={{ 
                presentation: 'modal',
                headerShown: true,
                title: 'Widget Settings',
              }}
            />
          </Stack>
          <StatusBar style="auto" />
        </ConnectionProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
```

### Dashboard Screen

**Main Dashboard (`app/index.tsx`)**

```typescript
import { View, ScrollView, Pressable, Text } from 'react-native';
import { useWidgetStore } from '@/store/widgetStore';
import { StatusBar } from '@/components/organisms/StatusBar';
import { WidgetRenderer } from '@/components/organisms/WidgetRenderer';
import { HamburgerMenu } from '@/components/molecules/HamburgerMenu';
import { useRouter } from 'expo-router';
import { useTheme } from '@/hooks/useTheme';

export default function DashboardScreen() {
  const widgets = useWidgetStore((state) => state.widgets);
  const layout = useWidgetStore((state) => state.layout);
  const router = useRouter();
  const { colors } = useTheme();

  return (
    <View style={[styles.container, { backgroundColor: colors.backgroundDark }]}>
      <StatusBar />
      
      {/* Widget Grid/Free Layout */}
      <ScrollView 
        style={styles.scrollView}
        contentInsetAdjustmentBehavior="automatic"
      >
        <View style={layout === 'grid' ? styles.gridLayout : styles.freeLayout}>
          {widgets.map((widget) => (
            <WidgetRenderer 
              key={widget.id} 
              widget={widget}
              onLongPress={() => router.push(`/widgets/${widget.id}`)}
            />
          ))}
        </View>
      </ScrollView>

      {/* Floating Action Button for Widget Selector */}
      <Pressable
        style={[styles.fab, { backgroundColor: colors.primary }]}
        onPress={() => router.push('/widget-selector')}
      >
        <Text style={[styles.fabText, { color: colors.textInverse }]}>+</Text>
      </Pressable>

      {/* Hamburger Menu */}
      <HamburgerMenu
        onSettingsPress={() => router.push('/settings')}
        onLayoutToggle={() => {
          const newLayout = layout === 'grid' ? 'free' : 'grid';
          useWidgetStore.getState().setLayout(newLayout);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  gridLayout: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 8,
    justifyContent: 'space-between',
  },
  freeLayout: {
    flex: 1,
    position: 'relative',
    minHeight: '100%',
  },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 8,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  fabText: {
    fontSize: 24,
    fontWeight: 'bold',
  },
});
```

### Settings Layout

**Settings Section (`app/settings/_layout.tsx`)**

```typescript
import { Stack } from 'expo-router';
import { HeaderBackButton } from '@/components/atoms/HeaderBackButton';

export default function SettingsLayout() {
  return (
    <Stack screenOptions={{
      headerShown: true,
      headerStyle: {
        backgroundColor: '#1a1a1a',
      },
      headerTintColor: '#ffffff',
      headerLeft: () => <HeaderBackButton />,
    }}>
      <Stack.Screen 
        name="index" 
        options={{ title: 'Settings' }}
      />
      <Stack.Screen 
        name="units" 
        options={{ title: 'Units' }}
      />
      <Stack.Screen 
        name="alarms" 
        options={{ title: 'Alarms' }}
      />
      <Stack.Screen 
        name="connection" 
        options={{ title: 'Connection' }}
      />
    </Stack>
  );
}
```

**Settings Index (`app/settings/index.tsx`)**

```typescript
import { View, ScrollView, Pressable, Text } from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '@/hooks/useTheme';
import { SettingsCard } from '@/components/molecules/SettingsCard';

export default function SettingsScreen() {
  const router = useRouter();
  const { colors, mode, setMode } = useTheme();

  const settingsOptions = [
    {
      title: 'Units',
      subtitle: 'Distance, speed, temperature',
      icon: 'ruler',
      onPress: () => router.push('/settings/units'),
    },
    {
      title: 'Alarms',
      subtitle: 'Depth, anchor, wind alerts',
      icon: 'alert-triangle',
      onPress: () => router.push('/settings/alarms'),
    },
    {
      title: 'Connection',
      subtitle: 'WiFi bridge configuration',
      icon: 'wifi',
      onPress: () => router.push('/settings/connection'),
    },
  ];

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.backgroundDark }]}>
      {/* Display Mode Selector */}
      <SettingsCard title="Display Mode">
        <View style={styles.modeSelector}>
          {(['day', 'night', 'red-night'] as const).map((displayMode) => (
            <Pressable
              key={displayMode}
              style={[
                styles.modeButton,
                {
                  backgroundColor: mode === displayMode ? colors.primary : colors.backgroundMedium,
                },
              ]}
              onPress={() => setMode(displayMode)}
            >
              <Text style={[
                styles.modeText,
                { color: mode === displayMode ? colors.textInverse : colors.textPrimary },
              ]}>
                {displayMode.replace('-', ' ').toUpperCase()}
              </Text>
            </Pressable>
          ))}
        </View>
      </SettingsCard>

      {/* Settings Options */}
      {settingsOptions.map((option, index) => (
        <SettingsCard 
          key={index}
          title={option.title}
          subtitle={option.subtitle}
          icon={option.icon}
          onPress={option.onPress}
          showArrow
        />
      ))}
    </ScrollView>
  );
}
```

### Dynamic Routes

**Widget Configuration (`app/widgets/[id].tsx`)**

```typescript
import { View, ScrollView, Text } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useWidgetStore } from '@/store/widgetStore';
import { WidgetConfigForm } from '@/components/organisms/WidgetConfigForm';
import { useTheme } from '@/hooks/useTheme';

export default function WidgetConfigScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { colors } = useTheme();
  
  const widget = useWidgetStore((state) => 
    state.widgets.find(w => w.id === id)
  );

  if (!widget) {
    return (
      <View style={[styles.container, { backgroundColor: colors.backgroundDark }]}>
        <Text style={[styles.errorText, { color: colors.textPrimary }]}>
          Widget not found
        </Text>
      </View>
    );
  }

  const handleSave = (updates: Partial<WidgetConfig>) => {
    useWidgetStore.getState().updateWidget(id!, updates);
    router.back();
  };

  const handleDelete = () => {
    useWidgetStore.getState().removeWidget(id!);
    router.back();
  };

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.backgroundDark }]}>
      <WidgetConfigForm
        widget={widget}
        onSave={handleSave}
        onDelete={handleDelete}
        onCancel={() => router.back()}
      />
    </ScrollView>
  );
}
```

## Navigation Patterns

### Routing Hooks

```typescript
// Custom hook for typed navigation
export const useTypedRouter = () => {
  const router = useRouter();
  
  return {
    ...router,
    pushSettings: (section?: 'units' | 'alarms' | 'connection') => {
      router.push(section ? `/settings/${section}` : '/settings');
    },
    pushWidgetConfig: (widgetId: string) => {
      router.push(`/widgets/${widgetId}`);
    },
    presentModal: (route: string) => {
      router.push({
        pathname: route,
        params: { presentation: 'modal' },
      });
    },
  };
};
```

### Deep Linking Support

```typescript
// app.config.js - Deep link configuration
export default {
  expo: {
    scheme: 'bmad-autopilot',
    web: {
      linking: {
        prefixes: ['https://bmad-autopilot.app', 'bmad-autopilot://'],
      },
    },
  },
};

// Usage: bmad-autopilot://settings/connection
// Opens connection settings directly
```

## Routing Benefits

### Why Expo Router Over React Navigation?

1. **File-Based Routing:** Reduces boilerplate configuration code
2. **Automatic Type Generation:** Route parameters are automatically typed
3. **Deep Linking:** Built-in support without additional configuration
4. **Layout Nesting:** Shared layouts for sections (settings, widget configs)
5. **Future Desktop Support:** Same routing works for web deployment

### Performance Considerations

1. **Lazy Loading:** Screens are automatically code-split
2. **Navigation Persistence:** State preserved during app backgrounding
3. **Modal Presentation:** Native modal animations and gestures
4. **Back Button Handling:** Automatic Android back button support

### Development Guidelines

1. **Screen Naming:** Use descriptive names (`connection.tsx` not `conn.tsx`)
2. **Layout Hierarchies:** Group related screens under shared layouts
3. **Modal Usage:** Use for temporary actions (settings, widget config)
4. **Error Boundaries:** Wrap screen components for crash prevention