/**
 * Units Configuration Dialog
 * Epic 8 - Phase 2: Platform-Native Dialog Migration
 * Epic 9: Enhanced Presentation System
 * 
 * Features:
 * - Platform-native presentation (iOS pageSheet, Android bottom sheet, TV centered)
 * - Preset selection (Nautical EU/UK/US, Custom)
 * - Individual unit configuration per category
 * - TV remote navigation support
 * - Comprehensive marine data unit coverage
 */

import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { useTheme, ThemeColors } from '../../store/themeStore';
import { usePresentationStore } from '../../presentation/presentationStore';
import { DataCategory } from '../../presentation/categories';
import { PRESENTATIONS, Presentation, getPresentationConfigLabel } from '../../presentation/presentations';
import { UniversalIcon } from '../atoms/UniversalIcon';
import { BaseSettingsModal } from './base/BaseSettingsModal';
import { PlatformSettingsSection } from '../settings';
import { getPlatformTokens } from '../../theme/settingsTokens';
import { isTV } from '../../utils/platformDetection';

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
  { key: 'depth', name: 'Depth', iconName: 'arrow-down-outline' },
  { key: 'speed', name: 'Speed', iconName: 'arrow-forward-outline' },
  { key: 'wind', name: 'Wind', iconName: 'cloud-outline' },
  { key: 'temperature', name: 'Temperature', iconName: 'thermometer-outline' },
  { key: 'pressure', name: 'Pressure', iconName: 'speedometer-outline' },
  { key: 'angle', name: 'Angle', iconName: 'angle-outline' },
  { key: 'coordinates', name: 'GPS Position', iconName: 'navigate-outline' },
  { key: 'voltage', name: 'Voltage', iconName: 'cellular-outline' },
  { key: 'current', name: 'Current', iconName: 'flash-outline' },
  { key: 'volume', name: 'Volume', iconName: 'cube-outline' },
  { key: 'time', name: 'Time', iconName: 'speedometer-outline' },
  { key: 'distance', name: 'Distance', iconName: 'arrows-horizontal-outline' },
  { key: 'capacity', name: 'Battery Capacity', iconName: 'battery-charging-outline' },
  { key: 'flowRate', name: 'Flow Rate', iconName: 'water-outline' },
  { key: 'frequency', name: 'Frequency', iconName: 'speedometer-outline' },
  { key: 'power', name: 'Power', iconName: 'flash-outline' },
  { key: 'rpm', name: 'RPM', iconName: 'speedometer-outline' },
];

export const UnitsConfigDialog: React.FC<UnitsConfigDialogProps> = ({
  visible,
  onClose,
}) => {
  const theme = useTheme();
  const platformTokens = getPlatformTokens();
  const tvMode = isTV();
  const styles = useMemo(
    () => createStyles(theme, platformTokens, tvMode),
    [theme, platformTokens, tvMode]
  );
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
    <BaseSettingsModal
      visible={visible}
      title="Units & Format"
      onClose={onClose}
      onSave={handleSave}
      saveButtonText="Save"
      cancelButtonText="Cancel"
      showFooter={true}
      testID="units-config-dialog"
    >
      {/* Preset Selector */}
      <PlatformSettingsSection title="Preset">
        <Text style={[styles.sectionNote, { color: theme.textSecondary }]}>
          Choose a standard preset or customize individual units
        </Text>
        <View style={styles.presetRow}>
          {PRESENTATION_PRESETS.map((preset) => (
            <TouchableOpacity
              key={preset.id}
              style={[
                styles.presetChip,
                { backgroundColor: theme.surface, borderColor: theme.border },
                selectedPreset === preset.id && { 
                  borderColor: theme.interactive,
                  backgroundColor: `${theme.interactive}15`
                }
              ]}
              onPress={() => handlePresetSelect(preset.id)}
              accessibilityRole="radio"
              accessibilityState={{ checked: selectedPreset === preset.id }}
              accessibilityLabel={`${preset.name}: ${preset.description}`}
            >
              <Text style={[
                styles.presetChipText,
                { color: theme.textSecondary },
                selectedPreset === preset.id && { color: theme.text, fontWeight: '600' }
              ]}>
                {preset.name}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </PlatformSettingsSection>

      {/* Unit Configuration */}
      <PlatformSettingsSection title="Unit & Format Settings">
        <Text style={[styles.sectionNote, { color: theme.textSecondary }]}>
          {selectedPreset === 'custom' 
            ? 'Customize individual units for each category' 
            : `Using ${PRESENTATION_PRESETS.find(p => p.id === selectedPreset)?.name} preset. Switch to Custom to modify.`}
        </Text>
        {UNIT_CATEGORIES.map((category) => {
          const presentations = getPresentationsForCategory(category.key);
          const selectedUnit = getSelectedUnit(category.key);
          const isCustomMode = selectedPreset === 'custom';
          
          return (
            <View key={category.key} style={styles.categoryRow}>
              <View style={styles.categoryLabel}>
                <UniversalIcon 
                  name={category.iconName} 
                  size={platformTokens.typography.body.fontSize * 1.4} 
                  color={theme.textSecondary} 
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
                        borderColor: theme.interactive,
                        backgroundColor: `${theme.interactive}15`
                      },
                      !isCustomMode && { opacity: 0.5 }
                    ]}
                    onPress={() => isCustomMode && handleUnitSelect(category.key, presentation.id)}
                    disabled={!isCustomMode}
                    accessibilityRole="radio"
                    accessibilityState={{ checked: selectedUnit === presentation.id, disabled: !isCustomMode }}
                    accessibilityLabel={getPresentationConfigLabel(presentation)}
                  >
                    <Text style={[
                      styles.unitSymbol,
                      { color: theme.textSecondary },
                      selectedUnit === presentation.id && { color: theme.text, fontWeight: '600' }
                    ]}>
                      {getPresentationConfigLabel(presentation)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          );
        })}
      </PlatformSettingsSection>
    </BaseSettingsModal>
  );
};

/**
 * Create platform-aware styles
 */
const createStyles = (
  theme: ThemeColors,
  platformTokens: ReturnType<typeof getPlatformTokens>,
  tvMode: boolean
) => StyleSheet.create({
  sectionNote: {
    fontSize: platformTokens.typography.caption.fontSize,
    fontFamily: platformTokens.typography.fontFamily,
    marginBottom: platformTokens.spacing.row,
    fontStyle: 'italic',
    lineHeight: platformTokens.typography.caption.lineHeight,
  },
  presetRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: platformTokens.spacing.row,
    marginTop: platformTokens.spacing.row,
  },
  presetChip: {
    paddingHorizontal: tvMode ? 24 : 16,
    paddingVertical: tvMode ? 16 : 10,
    borderRadius: 20,
    borderWidth: 2,
  },
  presetChipText: {
    fontSize: platformTokens.typography.label.fontSize,
    fontFamily: platformTokens.typography.fontFamily,
  },
  categoryRow: {
    marginBottom: platformTokens.spacing.section,
  },
  categoryLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: platformTokens.spacing.row,
    gap: platformTokens.spacing.row,
  },
  categoryName: {
    fontSize: platformTokens.typography.label.fontSize,
    fontFamily: platformTokens.typography.fontFamily,
    fontWeight: '500',
  },
  unitsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: platformTokens.spacing.row,
    marginLeft: platformTokens.spacing.section,
  },
  unitButton: {
    paddingHorizontal: tvMode ? 18 : 12,
    paddingVertical: tvMode ? 12 : 8,
    borderRadius: 6,
    borderWidth: 1,
    minWidth: tvMode ? 80 : 60,
    alignItems: 'center',
  },
  unitSymbol: {
    fontSize: platformTokens.typography.body.fontSize,
    fontFamily: platformTokens.typography.fontFamily,
  },
});