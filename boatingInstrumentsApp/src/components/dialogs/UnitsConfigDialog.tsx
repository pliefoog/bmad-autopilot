import React, { useState, useCallback, useMemo } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  Platform,
} from 'react-native';
import { useTheme } from '../../store/themeStore';
import { useUnitConversion, UnitDefinition } from '../../hooks/useUnitConversion';

interface UnitsConfigDialogProps {
  visible: boolean;
  onClose: () => void;
}

interface CategoryConfig {
  key: string;
  name: string;
  icon: string;
}

// Marine unit presets based on real sailing preferences
interface UnitPreset {
  id: string;
  name: string;
  description: string;
  units: Record<string, string>;
}

const UNIT_PRESETS: UnitPreset[] = [
  {
    id: 'nautical_eu',
    name: 'Nautical (EU)',
    description: 'European sailing standard',
    units: {
      distance: 'nautical_mile',
      depth: 'meter',
      vessel_speed: 'knots',
      wind_speed: 'knots_wind',
      temperature: 'celsius',
      pressure: 'bar',
      coordinates: 'degrees_minutes',
      voltage: 'volt',
      current: 'ampere',
      capacity: 'ampere_hour',
      flow_rate: 'liter_per_hour',
      time: 'hour',
      angle: 'degree',
      volume: 'liter',
    },
  },
  {
    id: 'nautical_uk',
    name: 'Nautical (UK)',
    description: 'British sailing standard',
    units: {
      distance: 'nautical_mile',
      depth: 'fathom',
      vessel_speed: 'knots',
      wind_speed: 'beaufort',
      temperature: 'celsius',
      pressure: 'bar',
      coordinates: 'degrees_minutes',
      voltage: 'volt',
      current: 'ampere',
      capacity: 'ampere_hour',
      flow_rate: 'gallon_uk_per_hour',
      time: 'hour',
      angle: 'degree',
      volume: 'gallon_uk',
    },
  },
  {
    id: 'nautical_us',
    name: 'Nautical (USA)',
    description: 'US sailing standard',
    units: {
      distance: 'nautical_mile',
      depth: 'foot',
      vessel_speed: 'knots',
      wind_speed: 'knots_wind',
      temperature: 'fahrenheit',
      pressure: 'psi',
      coordinates: 'degrees_minutes',
      voltage: 'volt',
      current: 'ampere',
      capacity: 'ampere_hour',
      flow_rate: 'gallon_us_per_hour',
      time: 'hour',
      angle: 'degree',
      volume: 'gallon_us',
    },
  },
  {
    id: 'custom',
    name: 'Custom',
    description: 'User-defined selection',
    units: {}, // Empty - user configures
  },
];

// Define unit categories for marine applications (separate distance and depth)
const UNIT_CATEGORIES: CategoryConfig[] = [
  { key: 'distance', name: 'Distance', icon: '📏' },
  { key: 'depth', name: 'Depth', icon: '🌊' },
  { key: 'vessel_speed', name: 'Vessel Speed', icon: '🚤' },
  { key: 'wind_speed', name: 'Wind Speed', icon: '💨' },
  { key: 'temperature', name: 'Temperature', icon: '🌡️' },
  { key: 'pressure', name: 'Pressure', icon: '🔘' },
  { key: 'coordinates', name: 'GPS Coordinates', icon: '🗺️' },
  { key: 'voltage', name: 'Voltage', icon: '⚡' },
  { key: 'current', name: 'Current', icon: '🔋' },
  { key: 'capacity', name: 'Battery Capacity', icon: '🔋' },
  { key: 'flow_rate', name: 'Flow Rate', icon: '💧' },
  { key: 'time', name: 'Time', icon: '⏰' },
  { key: 'angle', name: 'Angle', icon: '📐' },
  { key: 'volume', name: 'Volume', icon: '🫙' },
];

export const UnitsConfigDialog: React.FC<UnitsConfigDialogProps> = ({
  visible,
  onClose,
}) => {
  const theme = useTheme();
  const {
    getUnitsInCategory,
    getPreferredUnit,
    setPreferredUnit,
    preferences,
  } = useUnitConversion();

  // State for current selection mode
  const [selectedPreset, setSelectedPreset] = useState<string>('custom');
  const [customUnits, setCustomUnits] = useState<Record<string, string>>({});
  const [hasChanges, setHasChanges] = useState(false);

  // Determine current preset based on preferences
  const getCurrentPreset = useCallback((): string => {
    for (const preset of UNIT_PRESETS) {
      if (preset.id === 'custom') continue;
      
      const matches = Object.entries(preset.units).every(([category, unitId]) => {
        const preferredUnit = getPreferredUnit(category);
        return preferredUnit?.id === unitId;
      });
      
      if (matches) return preset.id;
    }
    return 'custom';
  }, [getPreferredUnit]);

  // Initialize state based on current preferences
  React.useEffect(() => {
    if (visible) {
      const currentPreset = getCurrentPreset();
      setSelectedPreset(currentPreset);
      
      // Initialize custom units with current preferences
      const current: Record<string, string> = {};
      UNIT_CATEGORIES.forEach(category => {
        const preferred = getPreferredUnit(category.key);
        if (preferred) {
          current[category.key] = preferred.id;
        }
      });
      setCustomUnits(current);
      setHasChanges(false);
    }
  }, [visible, getCurrentPreset, getPreferredUnit]);

  // Handle preset selection
  const handlePresetSelect = useCallback((presetId: string) => {
    setSelectedPreset(presetId);
    
    if (presetId !== 'custom') {
      const preset = UNIT_PRESETS.find(p => p.id === presetId);
      if (preset) {
        setCustomUnits(prev => ({ ...prev, ...preset.units }));
      }
    }
    
    setHasChanges(true);
  }, []);

  // Handle individual unit selection (custom mode)
  const handleUnitSelect = useCallback((category: string, unitId: string) => {
    setCustomUnits(prev => ({ ...prev, [category]: unitId }));
    setSelectedPreset('custom');
    setHasChanges(true);
  }, []);

  // Apply changes and close
  const handleSave = useCallback(() => {
    if (selectedPreset === 'custom') {
      // Apply custom selection
      Object.entries(customUnits).forEach(([category, unitId]) => {
        if (unitId) {
          setPreferredUnit(category, unitId);
        }
      });
    } else {
      // Apply preset
      const preset = UNIT_PRESETS.find(p => p.id === selectedPreset);
      if (preset) {
        Object.entries(preset.units).forEach(([category, unitId]) => {
          setPreferredUnit(category, unitId);
        });
      }
    }
    
    // Close dialog immediately after saving
    onClose();
  }, [selectedPreset, customUnits, setPreferredUnit, onClose]);

  // Get units for a category
  const getUnitsForCategory = useCallback((category: string): UnitDefinition[] => {
    return getUnitsInCategory(category);
  }, [getUnitsInCategory]);

  // Get currently selected unit for category
  const getSelectedUnit = useCallback((category: string): string => {
    if (selectedPreset === 'custom') {
      return customUnits[category] || '';
    } else {
      const preset = UNIT_PRESETS.find(p => p.id === selectedPreset);
      return preset?.units[category] || '';
    }
  }, [selectedPreset, customUnits]);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
      transparent={false}
    >
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        <View style={[styles.header, { borderBottomColor: theme.border }]}>
          <TouchableOpacity onPress={onClose} style={styles.headerButton}>
            <Text style={[styles.headerButtonText, { color: theme.accent }]}>Cancel</Text>
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: theme.text }]}>Units</Text>
          <TouchableOpacity 
            onPress={handleSave} 
            style={styles.headerButton}
            disabled={!hasChanges}
          >
            <Text style={[
              styles.headerButtonText, 
              { color: hasChanges ? theme.accent : theme.textSecondary }
            ]}>
              Save
            </Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Marine Presets Section */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>Marine Presets</Text>
            <View style={styles.presetContainer}>
              {UNIT_PRESETS.map((preset) => (
                <TouchableOpacity
                  key={preset.id}
                  style={[
                    styles.presetButton,
                    { backgroundColor: theme.surface, borderColor: theme.border },
                    selectedPreset === preset.id && { 
                      borderColor: theme.accent,
                      backgroundColor: `${theme.accent}15`
                    }
                  ]}
                  onPress={() => handlePresetSelect(preset.id)}
                >
                  <Text style={[
                    styles.presetName,
                    { color: theme.text },
                    selectedPreset === preset.id && { color: theme.accent }
                  ]}>
                    {preset.name}
                  </Text>
                  <Text style={[styles.presetDescription, { color: theme.textSecondary }]}>
                    {preset.description}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Custom Configuration Section */}
          {selectedPreset === 'custom' && (
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: theme.text }]}>Custom Configuration</Text>
              {UNIT_CATEGORIES.map((category) => {
                const units = getUnitsForCategory(category.key);
                const selectedUnit = getSelectedUnit(category.key);
                
                return (
                  <View key={category.key} style={styles.categorySection}>
                    <View style={styles.categoryHeader}>
                      <Text style={styles.categoryIcon}>{category.icon}</Text>
                      <Text style={[styles.categoryName, { color: theme.text }]}>
                        {category.name}
                      </Text>
                    </View>
                    
                    <View style={styles.unitsGrid}>
                      {units.map((unit) => (
                        <TouchableOpacity
                          key={unit.id}
                          style={[
                            styles.unitButton,
                            { backgroundColor: theme.surface, borderColor: theme.border },
                            selectedUnit === unit.id && {
                              borderColor: theme.accent,
                              backgroundColor: `${theme.accent}15`
                            }
                          ]}
                          onPress={() => handleUnitSelect(category.key, unit.id)}
                        >
                          <Text style={[
                            styles.unitSymbol,
                            { color: theme.text },
                            selectedUnit === unit.id && { color: theme.accent }
                          ]}>
                            {unit.symbol}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                );
              })}
            </View>
          )}

          {/* Preset Preview Section */}
          {selectedPreset !== 'custom' && (
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: theme.text }]}>Preview</Text>
              {UNIT_CATEGORIES.map((category) => {
                const selectedUnitId = getSelectedUnit(category.key);
                const units = getUnitsForCategory(category.key);
                const selectedUnitDef = units.find(u => u.id === selectedUnitId);
                
                return (
                  <View key={category.key} style={[styles.previewRow, { borderBottomColor: theme.border }]}>
                    <View style={styles.previewLeft}>
                      <Text style={styles.previewIcon}>{category.icon}</Text>
                      <Text style={[styles.previewCategory, { color: theme.text }]}>
                        {category.name}
                      </Text>
                    </View>
                    <Text style={[styles.previewUnit, { color: theme.accent }]}>
                      {selectedUnitDef?.symbol || '—'}
                    </Text>
                  </View>
                );
              })}
            </View>
          )}
        </ScrollView>

        {/* Extra padding at bottom for safe area */}
        <View style={styles.bottomPadding} />
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    paddingTop: Platform.OS === 'ios' ? 50 : 16,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    flex: 1,
    textAlign: 'center',
  },
  headerButton: {
    padding: 8,
    minWidth: 60,
  },
  headerButtonText: {
    fontSize: 16,
    fontWeight: '500',
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  section: {
    marginVertical: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  presetContainer: {
    gap: 8,
  },
  presetButton: {
    padding: 16,
    borderRadius: 8,
    borderWidth: 2,
  },
  presetName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  presetDescription: {
    fontSize: 14,
  },
  categorySection: {
    marginBottom: 16,
  },
  categoryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  categoryIcon: {
    fontSize: 20,
    marginRight: 8,
  },
  categoryName: {
    fontSize: 16,
    fontWeight: '500',
  },
  unitsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  unitButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    borderWidth: 1,
    minWidth: 60,
    alignItems: 'center',
  },
  unitSymbol: {
    fontSize: 14,
    fontWeight: '500',
  },
  previewRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  previewLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  previewIcon: {
    fontSize: 18,
    marginRight: 12,
  },
  previewCategory: {
    fontSize: 16,
  },
  previewUnit: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  bottomPadding: {
    height: Platform.OS === 'ios' ? 32 : 16,
  },
});