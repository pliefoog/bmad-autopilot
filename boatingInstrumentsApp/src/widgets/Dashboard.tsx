import React, { useState, useEffect, useCallback } from 'react';
import { View, ScrollView, StyleSheet, TouchableOpacity, Text, Dimensions, Alert } from 'react-native';
import { PanGestureHandler, State } from 'react-native-gesture-handler';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  runOnJS,
  withSpring 
} from 'react-native-reanimated';
import { WidgetCard } from './WidgetCard';
import { WidgetSelector } from './WidgetSelector';

import Ionicons from 'react-native-vector-icons/Ionicons';
import { useTheme } from '../store/themeStore';
import { WidgetRegistry } from './WidgetRegistry';
import { PlatformStyles } from '../utils/animationUtils';
import { registerAllWidgets } from './registerWidgets';
import { WidgetErrorBoundary } from './WidgetErrorBoundary';
import { LayoutService, WidgetLayout } from '../services/layoutService';
import DraggableWidget from './DraggableWidget';

type WidgetMeta = {
  title: string;
  icon: string;
  unit: string;
};

const widgetMeta: { [key: string]: WidgetMeta } = {
  depth: { title: 'Depth', icon: 'water-outline', unit: 'ft' },
  speed: { title: 'Speed', icon: 'speedometer-outline', unit: 'kt' },
  wind: { title: 'Wind', icon: 'cloud-outline', unit: 'kt' },
  gps: { title: 'GPS', icon: 'navigate-outline', unit: '' },
  compass: { title: 'Compass', icon: 'compass-outline', unit: '°' },
  engine: { title: 'Engine', icon: 'car-outline', unit: '' },
  battery: { title: 'Battery', icon: 'battery-charging-outline', unit: 'V' },
  tanks: { title: 'Tanks', icon: 'cube-outline', unit: '' },
  autopilot: { title: 'Autopilot', icon: 'swap-horizontal-outline', unit: '' },
  rudder: { title: 'Rudder', icon: 'boat-outline', unit: '°' },
  watertemp: { title: 'Water Temp', icon: 'thermometer-outline', unit: '°C' },
  theme: { title: 'Theme', icon: 'color-palette-outline', unit: '' },
};

// Render the appropriate widget component using registry
function renderWidget(key: string): React.ReactElement {
  const registeredWidget = WidgetRegistry.getWidget(key);
  
  if (registeredWidget) {
    const Component = registeredWidget.component;
    return <Component key={key} id={key} title={registeredWidget.meta.title} />;
  }
  
  // Fallback for unregistered widgets
  const meta = widgetMeta[key];
  if (meta) {
    return (
      <WidgetCard
        title={meta.title}
        icon={meta.icon}
        value="--"
        unit={meta.unit}
        state="no-data"
      />
    );
  }
  
  // Ultimate fallback
  return (
    <WidgetCard
      title="Unknown"
      icon="help-outline"
      value="--"
      state="no-data"
    />
  );
}

export const Dashboard: React.FC = () => {
  const theme = useTheme();
  const [layout, setLayout] = useState<WidgetLayout[]>([]);
  const [selectorVisible, setSelectorVisible] = useState(false);
  const [isDragMode, setIsDragMode] = useState(false);
  const [removedWidget, setRemovedWidget] = useState<{ widget: WidgetLayout; timestamp: number } | null>(null);
  const [toastVisible, setToastVisible] = useState(false);
  const [currentProfile, setCurrentProfile] = useState<string>('default');

  // Initialize widget registry and load layout
  useEffect(() => {
    registerAllWidgets();
    loadLayout();
  }, []);

  // Load layout from storage
  const loadLayout = useCallback(async () => {
    try {
      const savedLayout = await LayoutService.loadLayout();
      setLayout(savedLayout);
    } catch (error) {
      console.error('Failed to load layout:', error);
      setLayout(LayoutService.getDefaultLayout());
    }
  }, []);

  // Handle orientation changes - reload layout for responsive adaptation
  useEffect(() => {
    const handleOrientationChange = () => {
      // Give a small delay for the screen to adjust
      setTimeout(() => {
        loadLayout();
      }, 100);
    };

    // Listen for dimension changes (orientation)
    const subscription = Dimensions.addEventListener('change', handleOrientationChange);
    return () => subscription?.remove();
  }, [loadLayout]);

  // Save layout to storage
  const saveLayout = useCallback(async (newLayout: WidgetLayout[]) => {
    try {
      await LayoutService.saveLayout(newLayout);
      setLayout(newLayout);
    } catch (error) {
      console.error('Failed to save layout:', error);
    }
  }, []);

  // Handle widget position change
  const handlePositionChange = useCallback(async (widgetId: string, position: { x: number; y: number }) => {
    const updatedLayout = layout.map(w => 
      w.id === widgetId ? { ...w, position } : w
    );
    await saveLayout(updatedLayout);
  }, [layout, saveLayout]);

  // Handle widget size change
  const handleSizeChange = useCallback(async (widgetId: string, size: { width: number; height: number }) => {
    const updatedLayout = layout.map(w => 
      w.id === widgetId ? { ...w, size } : w
    );
    await saveLayout(updatedLayout);
  }, [layout, saveLayout]);

  // Handle adding widgets from selector
  const handleAddWidget = useCallback(async (selectedIds: string[]) => {
    const currentIds = layout.map(w => w.id);
    const newIds = selectedIds.filter(id => !currentIds.includes(id));
    
    if (newIds.length === 0) return;

    const newWidgets: WidgetLayout[] = newIds.map((id, index) => ({
      id,
      position: { x: (index % 3) * 170, y: Math.floor(index / 3) * 170 },
      size: { width: 160, height: 160 },
      visible: true,
      order: layout.length + index,
    }));

    const updatedLayout = [...layout, ...newWidgets];
    await saveLayout(updatedLayout);
  }, [layout, saveLayout]);

  // Handle removing a widget
  const handleRemoveWidget = useCallback(async (widgetId: string) => {
    const widgetToRemove = layout.find(w => w.id === widgetId);
    if (!widgetToRemove) return;

    setRemovedWidget({ 
      widget: widgetToRemove, 
      timestamp: Date.now() 
    });

    const updatedLayout = layout.filter(w => w.id !== widgetId);
    await saveLayout(updatedLayout);
    
    setToastVisible(true);
    setTimeout(() => setToastVisible(false), 5000);
  }, [layout, saveLayout]);

  // Handle undo remove
  const handleUndoRemove = useCallback(async () => {
    if (!removedWidget) return;

    const updatedLayout = [...layout, removedWidget.widget];
    await saveLayout(updatedLayout);
    
    setRemovedWidget(null);
    setToastVisible(false);
  }, [layout, saveLayout, removedWidget]);

  // Toggle drag mode
  const toggleDragMode = useCallback(() => {
    setIsDragMode(!isDragMode);
  }, [isDragMode]);

  // Quick profile switching
  const switchProfile = useCallback(async () => {
    try {
      const profiles = await LayoutService.getLayoutProfiles();
      
      if (profiles.length === 0) {
        Alert.alert('No Profiles', 'No layout profiles available');
        return;
      }

      const profileNames = profiles.map(p => p.name);
      const currentIndex = profiles.findIndex(p => p.id === currentProfile);
      const nextIndex = (currentIndex + 1) % profiles.length;
      const nextProfile = profiles[nextIndex];

      const newLayout = await LayoutService.switchToProfile(nextProfile.id);
      await saveLayout(newLayout);
      setCurrentProfile(nextProfile.id);
      
      Alert.alert('Profile Switched', `Switched to "${nextProfile.name}"`);
    } catch (error) {
      console.error('Failed to switch profile:', error);
      Alert.alert('Error', 'Failed to switch profile');
    }
  }, [currentProfile, saveLayout]);

  return (
    <View style={[styles.root, { backgroundColor: theme.background }]}>
      {/* Widget container */}
      <View style={styles.widgetContainer}>
        {layout
          .filter(w => w.visible)
          .map((widgetLayout) => (
            <DraggableWidget
              key={widgetLayout.id}
              widgetId={widgetLayout.id}
              layout={widgetLayout}
              onPositionChange={handlePositionChange}
              onSizeChange={handleSizeChange}
              onLongPress={handleRemoveWidget}
              isDragMode={isDragMode}
            >
              <WidgetErrorBoundary
                widgetId={widgetLayout.id}
                onReload={() => {
                  // Force re-render by updating layout
                  setLayout(prev => [...prev]);
                }}
                onRemove={() => handleRemoveWidget(widgetLayout.id)}
              >
                {renderWidget(widgetLayout.id)}
              </WidgetErrorBoundary>
            </DraggableWidget>
          ))}
      </View>

      {/* Floating Action Buttons */}
      <View style={styles.fabContainer}>
        {/* Profile Switch Button */}
        <TouchableOpacity 
          style={[styles.fab, styles.profileFab, { backgroundColor: theme.secondary }]} 
          onPress={switchProfile}
        >
          <Ionicons 
            name="layers-outline" 
            size={24} 
            color={theme.surface} 
          />
        </TouchableOpacity>
        
        {/* Drag Mode Toggle */}
        <TouchableOpacity 
          style={[styles.fab, styles.dragToggleFab, { 
            backgroundColor: isDragMode ? theme.accent : theme.primary,
            opacity: isDragMode ? 1 : 0.8,
          }]} 
          onPress={toggleDragMode}
        >
          <Ionicons 
            name={isDragMode ? "checkmark" : "move"} 
            size={24} 
            color={theme.surface} 
          />
        </TouchableOpacity>
        
        {/* Add Widget Button */}
        <TouchableOpacity 
          style={[styles.fab, styles.addFab, { backgroundColor: theme.primary }]} 
          onPress={() => setSelectorVisible(true)}
        >
          <Ionicons name="add" size={32} color={theme.surface} />
        </TouchableOpacity>
      </View>

      {/* Widget Selector Modal */}
      <WidgetSelector
        selected={layout.map(w => w.id)}
        onChange={handleAddWidget}
        visible={selectorVisible}
        onClose={() => setSelectorVisible(false)}
      />

      {/* Undo Toast */}
      {toastVisible && removedWidget && (
        <View style={[styles.toast, { backgroundColor: theme.surface }]}>
          <Text style={[styles.toastText, { color: theme.text }]}>
            Widget "{removedWidget.widget.id}" removed
          </Text>
          <TouchableOpacity 
            onPress={handleUndoRemove} 
            style={[styles.toastUndo, { backgroundColor: theme.primary }]}
          >
            <Text style={[styles.toastUndoText, { color: theme.surface }]}>Undo</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  widgetContainer: {
    flex: 1,
    position: 'relative',
  },
  fabContainer: {
    position: 'absolute',
    right: 24,
    bottom: 32,
    flexDirection: 'column',
    gap: 16,
  },
  fab: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    ...PlatformStyles.boxShadow('#000', { x: 0, y: 2 }, 4, 0.3),
    elevation: 6,
  },
  profileFab: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  dragToggleFab: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  addFab: {
    // Uses base fab styles
  },
  toast: {
    position: 'absolute',
    bottom: 100,
    left: 0,
    right: 0,
    marginHorizontal: 24,
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    ...PlatformStyles.boxShadow('#000', { x: 0, y: 2 }, 4, 0.2),
    elevation: 8,
  },
  toastText: {
    fontSize: 16,
    marginRight: 16,
  },
  toastUndo: {
    borderRadius: 6,
    paddingVertical: 4,
    paddingHorizontal: 12,
  },
  toastUndoText: {
    fontWeight: 'bold',
    fontSize: 16,
  },
});
