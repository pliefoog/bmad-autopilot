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
  { key: 'depth', name: 'Depth', iconName: 'water-outline' },
  { key: 'speed', name: 'Speed', iconName: 'speedometer-outline' },
  { key: 'wind', name: 'Wind', iconName: 'cloud-outline' },
  { key: 'temperature', name: 'Temperature', iconName: 'thermometer-outline' },
  { key: 'pressure', name: 'Pressure', iconName: 'speedometer-outline' },
  { key: 'angle', name: 'Angle', iconName: 'compass-outline' },
  { key: 'coordinates', name: 'GPS Position', iconName: 'navigate-outline' },
  { key: 'voltage', name: 'Voltage', iconName: 'battery-charging-outline' },
  { key: 'current', name: 'Current', iconName: 'battery-charging-outline' },
  { key: 'volume', name: 'Volume', iconName: 'cube-outline' },
  { key: 'time', name: 'Time', iconName: 'speedometer-outline' },
  { key: 'distance', name: 'Distance', iconName: 'swap-horizontal-outline' },
  { key: 'capacity', name: 'Battery Capacity', iconName: 'battery-charging-outline' },
  { key: 'flowRate', name: 'Flow Rate', iconName: 'water-outline' },
  { key: 'frequency', name: 'Frequency', iconName: 'speedometer-outline' },
  { key: 'power', name: 'Power', iconName: 'battery-charging-outline' },
  { key: 'rpm', name: 'RPM', iconName: 'speedometer-outline' },
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
            <Text style={[styles.headerButtonText, { color: theme.text }]}>Cancel</Text>
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: theme.text }]}>Units</Text>
          <TouchableOpacity 
            onPress={handleSave} 
            style={styles.headerButton}
            disabled={!hasChanges}
          >
            <Text style={[
              styles.headerButtonText, 
              { color: hasChanges ? theme.text : theme.textSecondary }
            ]}>
              Save
            </Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Preset Selector */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>Preset</Text>
            <View style={styles.presetRow}>
              {PRESENTATION_PRESETS.map((preset) => (
                <TouchableOpacity
                  key={preset.id}
                  style={[
                    styles.presetChip,
                    { backgroundColor: theme.surface, borderColor: theme.border },
                    selectedPreset === preset.id && { 
                      borderColor: theme.text,
                      backgroundColor: `${theme.text}15`
                    }
                  ]}
                  onPress={() => handlePresetSelect(preset.id)}
                >
                  <Text style={[
                    styles.presetChipText,
                    { color: theme.textSecondary },
                    selectedPreset === preset.id && { color: theme.text }
                  ]}>
                    {preset.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Unit Configuration - Unified view for all presets and custom */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>
              {selectedPreset === 'custom' ? 'Unit Configuration' : `${PRESENTATION_PRESETS.find(p => p.id === selectedPreset)?.name || 'Preset'} Configuration`}
            </Text>
            {selectedPreset !== 'custom' && (
              <Text style={[styles.sectionNote, { color: theme.textSecondary }]}>
                Preset units are locked. Switch to Custom to modify.
              </Text>
            )}
            {UNIT_CATEGORIES.map((category) => {
              const presentations = getPresentationsForCategory(category.key);
              const selectedUnit = getSelectedUnit(category.key);
              const isCustomMode = selectedPreset === 'custom';
              
              return (
                <View key={category.key} style={styles.categoryRow}>
                  <View style={styles.categoryLabel}>
                    <UniversalIcon 
                      name={category.iconName} 
                      size={20} 
                      color={isCustomMode ? theme.text : theme.textSecondary} 
                    />
                    <Text style={[
                      styles.categoryName, 
                      { color: isCustomMode ? theme.text : theme.textSecondary }
                    ]}>
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
                            borderColor: theme.text,
                            backgroundColor: `${theme.text}15`
                          },
                          !isCustomMode && { opacity: 0.6 }
                        ]}
                        onPress={() => isCustomMode && handleUnitSelect(category.key, presentation.id)}
                        disabled={!isCustomMode}
                      >
                        <Text style={[
                          styles.unitSymbol,
                          { color: theme.textSecondary },
                          selectedUnit === presentation.id && { color: theme.text }
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
  sectionNote: {
    fontSize: 13,
    marginBottom: 12,
    fontStyle: 'italic',
  },
  presetRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  presetChip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 2,
  },
  presetChipText: {
    fontSize: 14,
    fontWeight: '600',
  },
  categoryRow: {
    marginBottom: 16,
  },
  categoryLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  categoryName: {
    fontSize: 15,
    fontWeight: '500',
  },
  unitsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginLeft: 28,
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
  bottomPadding: {
    height: Platform.OS === 'ios' ? 32 : 16,
  },
});