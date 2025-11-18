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
import { usePresentationStore } from '../../presentation/presentationStore';
import { DataCategory } from '../../presentation/categories';
import { PRESENTATIONS, Presentation, getPresentationConfigLabel } from '../../presentation/presentations';
import { UniversalIcon } from '../atoms/UniversalIcon';

interface UnitsConfigDialogProps {
  visible: boolean;
  onClose: () => void;
}

interface CategoryConfig {
  key: string;
  name: string;
  iconName: string; // Ionicon name for UniversalIcon
}

// Marine presentation presets based on Epic 9 Enhanced Presentation System
// Comprehensive interface covering all NMEA marine data categories
interface PresentationPreset {
  id: string;
  name: string;
  description: string;
  presentations: Record<DataCategory, string>;
}

const PRESENTATION_PRESETS: PresentationPreset[] = [
  {
    id: 'nautical_eu',
    name: 'Nautical (EU)',
    description: 'European sailing standard',
    presentations: {
      depth: 'm_1',
      speed: 'kts_1',
      wind: 'wind_kts_1',
      temperature: 'c_1',
      pressure: 'bar_3',
      angle: 'deg_0',
      coordinates: 'ddm_3',
      voltage: 'v_2',
      current: 'a_2',
      volume: 'l_0',
      time: 'h_1',
      distance: 'nm_1',
      capacity: 'ah_0',
      flowRate: 'lph_1',
      frequency: 'hz_1',
      power: 'kw_1',
      rpm: 'rpm_0',
    },
  },
  {
    id: 'nautical_uk',
    name: 'Nautical (UK)',
    description: 'British sailing standard',
    presentations: {
      depth: 'fth_1',
      speed: 'kts_1',
      wind: 'bf_desc',
      temperature: 'c_1',
      pressure: 'inhg_2',
      angle: 'deg_0',
      coordinates: 'dms_1',
      voltage: 'v_2',
      current: 'a_2',
      volume: 'gal_uk_1',
      time: 'h_1',
      distance: 'nm_1',
      capacity: 'ah_0',
      flowRate: 'gph_uk_1',
      frequency: 'hz_1',
      power: 'hp_0',
      rpm: 'rpm_0',
    },
  },
  {
    id: 'nautical_us',
    name: 'Nautical (USA)',
    description: 'US sailing standard',
    presentations: {
      depth: 'ft_1',
      speed: 'kts_1',
      wind: 'wind_kts_1',
      temperature: 'f_1',
      pressure: 'psi_1',
      angle: 'deg_0',
      coordinates: 'ddm_3',
      voltage: 'v_2',
      current: 'a_2',
      volume: 'gal_us_1',
      time: 'h_1',
      distance: 'nm_1',
      capacity: 'ah_0',
      flowRate: 'gph_us_1',
      frequency: 'hz_1',
      power: 'hp_0',
      rpm: 'rpm_0',
    },
  },
  {
    id: 'custom',
    name: 'Custom',
    description: 'User-defined presentations',
    presentations: {
      depth: 'm_1',
      speed: 'kts_1',
      wind: 'wind_kts_1',
      temperature: 'c_1',
      pressure: 'bar_3',
      angle: 'deg_0',
      coordinates: 'dd_6',
      voltage: 'v_2',
      current: 'a_2',
      volume: 'l_0',
      time: 'h_1',
      distance: 'nm_1',
      capacity: 'ah_0',
      flowRate: 'lph_1',
      frequency: 'hz_1',
      power: 'kw_1',
      rpm: 'rpm_0',
    },
  },
];

// Complete unit categories for marine applications with Epic 9 presentations
const UNIT_CATEGORIES: CategoryConfig[] = [
  { key: 'depth', name: 'Depth', iconName: 'water' },
  { key: 'speed', name: 'Speed', iconName: 'speedometer' },
  { key: 'wind', name: 'Wind', iconName: 'flag' },
  { key: 'temperature', name: 'Temperature', iconName: 'thermometer' },
  { key: 'pressure', name: 'Pressure', iconName: 'analytics' },
  { key: 'angle', name: 'Angle', iconName: 'compass' },
  { key: 'coordinates', name: 'GPS Position', iconName: 'location' },
  { key: 'voltage', name: 'Voltage', iconName: 'flash' },
  { key: 'current', name: 'Current', iconName: 'power' },
  { key: 'volume', name: 'Volume', iconName: 'cube' },
  { key: 'time', name: 'Time', iconName: 'time' },
  { key: 'distance', name: 'Distance', iconName: 'swap-horizontal' },
  { key: 'capacity', name: 'Battery Capacity', iconName: 'battery-charging' },
  { key: 'flowRate', name: 'Flow Rate', iconName: 'water' },
  { key: 'frequency', name: 'Frequency', iconName: 'pulse' },
  { key: 'power', name: 'Power', iconName: 'flash' },
  { key: 'rpm', name: 'RPM', iconName: 'speedometer' },
];

export const UnitsConfigDialog: React.FC<UnitsConfigDialogProps> = ({
  visible,
  onClose,
}) => {
  const theme = useTheme();
  const presentationStore = usePresentationStore();
  const {
    getPresentationForCategory,
    setPresentationForCategory,
    resetToDefaults,
    marineRegion,
    setMarineRegion
  } = presentationStore;

  // State for current selection mode
  const [selectedPreset, setSelectedPreset] = useState<string>('custom');
  const [customUnits, setCustomUnits] = useState<Record<string, string>>({});
  const [hasChanges, setHasChanges] = useState(false);

  // Determine current preset based on preferences
  const getCurrentPreset = useCallback((): string => {
    for (const preset of PRESENTATION_PRESETS) {
      if (preset.id === 'custom') continue;
      
      const matches = Object.entries(preset.presentations).every(([category, presentationId]) => {
        if (!presentationId) return true; // Skip empty presentation IDs
        const currentPresentationId = presentationStore.selectedPresentations[category as DataCategory];
        return currentPresentationId === presentationId;
      });
      
      if (matches) return preset.id;
    }
    return 'custom';
  }, [presentationStore.selectedPresentations]);

  // Initialize state based on current preferences
  React.useEffect(() => {
    if (visible) {
      const currentPreset = getCurrentPreset();
      setSelectedPreset(currentPreset);
      
      // Initialize custom units with current preferences
      const current: Record<string, string> = {};
      UNIT_CATEGORIES.forEach(category => {
        const presentationId = presentationStore.selectedPresentations[category.key as DataCategory];
        if (presentationId) {
          current[category.key] = presentationId;
        }
      });
      setCustomUnits(current);
      setHasChanges(false);
    }
  }, [visible, getCurrentPreset, presentationStore.selectedPresentations]);

  // Handle preset selection
  const handlePresetSelect = useCallback((presetId: string) => {
    setSelectedPreset(presetId);
    
    if (presetId !== 'custom') {
      const preset = PRESENTATION_PRESETS.find(p => p.id === presetId);
      if (preset) {
        setCustomUnits(prev => ({ ...prev, ...preset.presentations }));
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
      Object.entries(customUnits).forEach(([category, presentationId]) => {
        if (presentationId) {
          setPresentationForCategory(category as DataCategory, presentationId);
        }
      });
    } else {
      // Apply preset
      const preset = PRESENTATION_PRESETS.find(p => p.id === selectedPreset);
      if (preset) {
        Object.entries(preset.presentations).forEach(([category, presentationId]) => {
          if (presentationId) { // Only set if presentation ID exists
            setPresentationForCategory(category as DataCategory, presentationId);
          }
        });
      }
    }
    
    // Close dialog immediately after saving
    onClose();
  }, [selectedPreset, customUnits, setPresentationForCategory, onClose]);

  // Get units for a category
  const getPresentationsForCategory = useCallback((category: string): Presentation[] => {
    const categoryPresentations = PRESENTATIONS[category as DataCategory];
    return categoryPresentations?.presentations || [];
  }, []);

  // Get currently selected unit for category
  const getSelectedUnit = useCallback((category: string): string => {
    if (selectedPreset === 'custom') {
      return customUnits[category] || '';
    } else {
      const preset = PRESENTATION_PRESETS.find(p => p.id === selectedPreset);
      if (!preset) return '';
      
      // Direct access to presentation categories
      return preset.presentations[category as DataCategory] || '';
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
              {PRESENTATION_PRESETS.map((preset) => (
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
                const presentations = getPresentationsForCategory(category.key);
                const selectedUnit = getSelectedUnit(category.key);
                
                return (
                  <View key={category.key} style={styles.categorySection}>
                    <View style={styles.categoryHeader}>
                      <UniversalIcon 
                        name={category.iconName} 
                        size={20} 
                        color={theme.primary} 
                      />
                      <Text style={[styles.categoryName, { color: theme.text }]}>
                        {category.name}
                      </Text>
                    </View>
                    
                    <View style={styles.unitsGrid}>
                      {presentations.map((presentation) => (
                        <TouchableOpacity
                          key={presentation.id}
                          style={[
                            styles.unitButton,
                            { backgroundColor: theme.surface, borderColor: theme.border },
                            selectedUnit === presentation.id && {
                              borderColor: theme.accent,
                              backgroundColor: `${theme.accent}15`
                            }
                          ]}
                          onPress={() => handleUnitSelect(category.key, presentation.id)}
                        >
                          <Text style={[
                            styles.unitSymbol,
                            { color: theme.text },
                            selectedUnit === presentation.id && { color: theme.accent }
                          ]}>
                            {getPresentationConfigLabel(presentation)}
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
                const presentations = getPresentationsForCategory(category.key);
                const selectedPresentation = presentations.find(p => p.id === selectedUnitId);
                
                return (
                  <View key={category.key} style={[styles.previewRow, { borderBottomColor: theme.border }]}>
                    <View style={styles.previewLeft}>
                      <Text style={styles.previewIcon}>{category.icon}</Text>
                      <Text style={[styles.previewCategory, { color: theme.text }]}>
                        {category.name}
                      </Text>
                    </View>
                    <Text style={[styles.previewUnit, { color: theme.accent }]}>
                      {selectedPresentation ? getPresentationConfigLabel(selectedPresentation) : '—'}
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
    gap: 8,
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