# State Management Architecture

## Multi-Store Pattern with Zustand

### Core Philosophy

We use **multiple specialized stores** rather than a single global store:

- **`nmeaStore`** - Real-time NMEA data (depth, speed, GPS, wind, etc.)
- **`widgetStore`** - Dashboard layout and widget configurations
- **`settingsStore`** - App-wide settings (units, connection preferences)
- **`connectionStore`** - Network connection status and configuration

### Development Platform Considerations

**Web Development Environment:**
- All stores work identically in webpack dev server
- Real-time data from `nmeaStore` uses mocked NMEA sentences
- Persistence middleware works with localStorage (via AsyncStorage mock)
- Store performance and selector efficiency easily testable in browser DevTools

**Cross-Platform Store Requirements:**
- Stores must handle both real data (production) and mock data (web development)
- Persistence middleware should gracefully degrade on platforms without filesystem access
- State updates must be platform-agnostic (no native module dependencies in store logic)

### Store Implementation Pattern

**NMEA Data Store (`src/store/nmeaStore.ts`)**

```typescript
import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';

export interface NMEADataState {
  // Depth & Water
  depth: number | null; // Current depth in selected unit
  waterTemperature: number | null; // °F or °C
  
  // Speed & Motion
  speedOverGround: number | null; // GPS speed
  speedThroughWater: number | null; // Log speed
  heading: number | null; // Compass heading (0-359°)
  courseOverGround: number | null; // GPS track
  
  // Wind
  apparentWindAngle: number | null; // 0-359°
  apparentWindSpeed: number | null;
  trueWindAngle: number | null;
  trueWindSpeed: number | null;
  
  // Position
  latitude: number | null;
  longitude: number | null;
  
  // Engine Data (multi-engine support)
  engines: Array<{
    id: string;
    rpm: number | null;
    temperature: number | null;
    oilPressure: number | null;
    alternatorVoltage: number | null;
  }>;
  
  // Autopilot Status
  autopilotMode: 'standby' | 'auto' | 'wind' | 'nav' | null;
  autopilotHeading: number | null;
  
  // Data Freshness (critical for marine safety)
  lastUpdate: {
    depth: Date | null;
    speed: Date | null;
    wind: Date | null;
    position: Date | null;
    autopilot: Date | null;
  };
}

interface NMEAStore extends NMEADataState {
  // Actions
  updateDepth: (value: number, unit: 'ft' | 'm' | 'fathoms') => void;
  updateSpeed: (sog: number, stw: number, unit: 'kts' | 'mph' | 'kmh') => void;
  updateWind: (awa: number, aws: number, twa?: number, tws?: number) => void;
  updateHeading: (heading: number, lat?: number, lon?: number, cog?: number) => void;
  updateAutopilot: (mode: string, targetHeading?: number) => void;
  updateEngine: (engineId: string, data: Partial<Engine>) => void;
  
  // Utilities
  isDataFresh: (dataType: keyof NMEADataState['lastUpdate'], maxAge?: number) => boolean;
  resetAllData: () => void;
}

export const useNMEAStore = create<NMEAStore>()(
  subscribeWithSelector((set, get) => ({
    // Initial state
    depth: null,
    waterTemperature: null,
    speedOverGround: null,
    speedThroughWater: null,
    heading: null,
    courseOverGround: null,
    apparentWindAngle: null,
    apparentWindSpeed: null,
    trueWindAngle: null,
    trueWindSpeed: null,
    latitude: null,
    longitude: null,
    engines: [],
    autopilotMode: null,
    autopilotHeading: null,
    lastUpdate: {
      depth: null,
      speed: null,
      wind: null,
      position: null,
      autopilot: null,
    },

    // Actions
    updateDepth: (value: number, unit: 'ft' | 'm' | 'fathoms') => {
      // Convert to feet (internal standard)
      const depthInFeet = unit === 'm' ? value * 3.28084 : 
                         unit === 'fathoms' ? value * 6 : value;
      
      set({
        depth: depthInFeet,
        lastUpdate: { ...get().lastUpdate, depth: new Date() },
      });
    },

    updateSpeed: (sog: number, stw: number, unit: 'kts' | 'mph' | 'kmh') => {
      // Convert to knots (internal standard)
      const knotsSog = unit === 'mph' ? sog * 0.868976 :
                      unit === 'kmh' ? sog * 0.539957 : sog;
      const knotsStw = unit === 'mph' ? stw * 0.868976 :
                      unit === 'kmh' ? stw * 0.539957 : stw;
      
      set({
        speedOverGround: knotsSog,
        speedThroughWater: knotsStw,
        lastUpdate: { ...get().lastUpdate, speed: new Date() },
      });
    },

    updateWind: (awa: number, aws: number, twa?: number, tws?: number) => {
      set({
        apparentWindAngle: awa,
        apparentWindSpeed: aws,
        ...(twa !== undefined && { trueWindAngle: twa }),
        ...(tws !== undefined && { trueWindSpeed: tws }),
        lastUpdate: { ...get().lastUpdate, wind: new Date() },
      });
    },

    updateHeading: (heading: number, lat?: number, lon?: number, cog?: number) => {
      set({
        heading,
        ...(lat !== undefined && { latitude: lat }),
        ...(lon !== undefined && { longitude: lon }),
        ...(cog !== undefined && { courseOverGround: cog }),
        lastUpdate: { ...get().lastUpdate, position: new Date() },
      });
    },

    updateAutopilot: (mode: string, targetHeading?: number) => {
      set({
        autopilotMode: mode as any,
        ...(targetHeading !== undefined && { autopilotHeading: targetHeading }),
        lastUpdate: { ...get().lastUpdate, autopilot: new Date() },
      });
    },

    updateEngine: (engineId: string, data: Partial<Engine>) => {
      set((state) => ({
        engines: state.engines.map((engine) =>
          engine.id === engineId ? { ...engine, ...data } : engine
        ).concat(
          !state.engines.find((e) => e.id === engineId)
            ? [{ id: engineId, rpm: null, temperature: null, oilPressure: null, alternatorVoltage: null, ...data }]
            : []
        ),
      }));
    },

    isDataFresh: (dataType: keyof NMEADataState['lastUpdate'], maxAge = 5000) => {
      const lastUpdate = get().lastUpdate[dataType];
      return lastUpdate ? Date.now() - lastUpdate.getTime() < maxAge : false;
    },

    resetAllData: () => set({
      depth: null,
      waterTemperature: null,
      speedOverGround: null,
      speedThroughWater: null,
      heading: null,
      courseOverGround: null,
      apparentWindAngle: null,
      apparentWindSpeed: null,
      trueWindAngle: null,
      trueWindSpeed: null,
      latitude: null,
      longitude: null,
      engines: [],
      autopilotMode: null,
      autopilotHeading: null,
      lastUpdate: {
        depth: null,
        speed: null,
        wind: null,
        position: null,
        autopilot: null,
      },
    }),
  }))
);
```

### Widget Configuration Store

**Widget Store (`src/store/widgetStore.ts`)**

```typescript
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface WidgetConfig {
  id: string;
  type: 'depth' | 'speed' | 'wind' | 'compass' | 'gps' | 'engine' | 'autopilot';
  position: { x: number; y: number };
  size: 'small' | 'medium' | 'large';
  settings: {
    units?: string;
    precision?: number;
    displayMode?: string;
    [key: string]: any; // Widget-specific settings
  };
}

interface WidgetStore {
  widgets: WidgetConfig[];
  layout: 'grid' | 'free';
  
  // Actions
  addWidget: (type: WidgetConfig['type'], position: { x: number; y: number }) => void;
  removeWidget: (id: string) => void;
  updateWidget: (id: string, updates: Partial<WidgetConfig>) => void;
  moveWidget: (id: string, position: { x: number; y: number }) => void;
  reorderWidgets: (fromIndex: number, toIndex: number) => void;
  setLayout: (layout: 'grid' | 'free') => void;
  resetWidgets: () => void;
}

export const useWidgetStore = create<WidgetStore>()(
  persist(
    (set, get) => ({
      widgets: [
        // Default widget layout
        {
          id: 'depth-1',
          type: 'depth',
          position: { x: 0, y: 0 },
          size: 'medium',
          settings: { units: 'ft', precision: 1 },
        },
        {
          id: 'speed-1',
          type: 'speed',
          position: { x: 1, y: 0 },
          size: 'medium',
          settings: { units: 'kts', showBoth: true },
        },
      ],
      layout: 'grid',

      addWidget: (type, position) => {
        const newWidget: WidgetConfig = {
          id: `${type}-${Date.now()}`,
          type,
          position,
          size: 'medium',
          settings: {},
        };
        set((state) => ({ widgets: [...state.widgets, newWidget] }));
      },

      removeWidget: (id) => {
        set((state) => ({
          widgets: state.widgets.filter((w) => w.id !== id),
        }));
      },

      updateWidget: (id, updates) => {
        set((state) => ({
          widgets: state.widgets.map((w) =>
            w.id === id ? { ...w, ...updates } : w
          ),
        }));
      },

      moveWidget: (id, position) => {
        set((state) => ({
          widgets: state.widgets.map((w) =>
            w.id === id ? { ...w, position } : w
          ),
        }));
      },

      reorderWidgets: (fromIndex, toIndex) => {
        set((state) => {
          const widgets = [...state.widgets];
          const [removed] = widgets.splice(fromIndex, 1);
          widgets.splice(toIndex, 0, removed);
          return { widgets };
        });
      },

      setLayout: (layout) => set({ layout }),

      resetWidgets: () => set({ widgets: [] }),
    }),
    {
      name: 'widget-storage',
      storage: createJSONStorage(() => ({
        getItem: async (name) => {
          const value = await AsyncStorage.getItem(name);
          return value ? JSON.parse(value) : null;
        },
        setItem: async (name, value) => {
          await AsyncStorage.setItem(name, JSON.stringify(value));
        },
        removeItem: async (name) => {
          await AsyncStorage.removeItem(name);
        },
      })),
    }
  )
);
```

## State Management Rationale

### Why Multiple Stores Instead of One Global Store?

- **Performance Isolation:** NMEA data updates don't trigger widget config subscribers
- **Mental Model:** Easier to reason about domain-specific state (`nmeaStore.depth` vs `globalStore.nmea.depth`)
- **Persistence Granularity:** Only `widgetStore` and `settingsStore` need persistence, not real-time NMEA data
- **Code Organization:** Each store file is 100-200 lines vs monolithic 1000+ line global state

### Why `subscribeWithSelector` Middleware?

- Enables fine-grained subscriptions: `useNMEAStore((state) => state.depth)` only re-renders when depth changes
- Critical for performance with 10+ widgets subscribing to different NMEA parameters
- Without selectors, every NMEA update would re-render all widgets

### Why Persist Widget Store with AsyncStorage?

- Users expect dashboard layout to persist across app restarts
- AsyncStorage is asynchronous and doesn't block UI thread
- Zustand's persist middleware handles hydration automatically

## Component Integration Patterns

### Using Selectors for Performance

```typescript
// ✅ Good - Only re-renders when depth changes
const DepthWidget: React.FC = () => {
  const depth = useNMEAStore((state) => state.data.depth);
  const isStale = useNMEAStore((state) => 
    !state.isDataFresh('depth', 5000)
  );
  
  return (
    <WidgetCard title="Depth" isStale={isStale}>
      {depth ? `${depth.toFixed(1)} ft` : '--'}
    </WidgetCard>
  );
};

// ❌ Bad - Re-renders on every NMEA update
const DepthWidget: React.FC = () => {
  const store = useNMEAStore(); // Subscribes to entire store
  
  return (
    <WidgetCard title="Depth">
      {store.depth ? `${store.depth.toFixed(1)} ft` : '--'}
    </WidgetCard>
  );
};
```

### Cross-Store Communication

```typescript
// Widget configuration affects display
const SpeedWidget: React.FC = () => {
  const sog = useNMEAStore((state) => state.speedOverGround);
  const stw = useNMEAStore((state) => state.speedThroughWater);
  
  const showBothSpeeds = useWidgetStore((state) => 
    state.widgets.find(w => w.type === 'speed')?.settings.showBoth
  );
  
  return (
    <WidgetCard title="Speed">
      <Text>SOG: {sog?.toFixed(1)} kts</Text>
      {showBothSpeeds && <Text>STW: {stw?.toFixed(1)} kts</Text>}
    </WidgetCard>
  );
};
```