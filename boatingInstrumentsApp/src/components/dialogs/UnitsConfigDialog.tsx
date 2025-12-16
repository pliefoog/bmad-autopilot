/**
 * Units Configuration Dialog (Refactored)
 * CONFIG-DIALOG-REFACTOR-SPECIFICATION.md - Phase 5
 * 
 * Refactoring improvements:
 * - Zod schema for preset + 17 category validation
 * - useFormState with debouncing (300ms auto-save)
 * - Collapsible FormSection per category (17 sections)
 * - Preset preview with formatted example values
 * - Platform-optimized layouts (3-column desktop, 2-column tablet, 1-column phone)
 * 
 * Original: 470 lines | Target: ~320 lines (32% reduction)
 */

import React, { useMemo, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { z } from 'zod';
import { useTheme, ThemeColors } from '../../store/themeStore';
import { usePresentationStore } from '../../presentation/presentationStore';
import { DataCategory } from '../../presentation/categories';
import { PRESENTATIONS, Presentation, getPresentationConfigLabel } from '../../presentation/presentations';
import { BaseSettingsModal } from './base/BaseSettingsModal';
import { FormSection } from './components/FormSection';
import { useFormState } from '../../hooks/useFormState';
import { getPlatformTokens } from '../../theme/settingsTokens';
import { isTV } from '../../utils/platformDetection';

interface UnitsConfigDialogProps {
  visible: boolean;
  onClose: () => void;
}

interface CategoryConfig {
  key: DataCategory;
  name: string;
  iconName: string;
  defaultCollapsed?: boolean; // Collapse less common categories
}

// === PRESET DEFINITIONS ===

interface PresentationPreset {
  id: string;
  name: string;
  description: string;
  presentations: Partial<Record<DataCategory, string>>;
  examples: { category: string; value: string }[]; // Preview examples
}

const PRESETS: PresentationPreset[] = [
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
    examples: [
      { category: 'Depth', value: '5.2 m' },
      { category: 'Speed', value: '6.8 kts' },
      { category: 'Temp', value: '18.5°C' },
    ],
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
    examples: [
      { category: 'Depth', value: '3.0 fth' },
      { category: 'Speed', value: '6.8 kts' },
      { category: 'Volume', value: '22.0 gal' },
    ],
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
    examples: [
      { category: 'Depth', value: '17.1 ft' },
      { category: 'Speed', value: '6.8 kts' },
      { category: 'Temp', value: '65.3°F' },
    ],
  },
  {
    id: 'custom',
    name: 'Custom',
    description: 'User-defined selections',
    presentations: {},
    examples: [],
  },
];

// === CATEGORY DEFINITIONS ===

const CATEGORIES: CategoryConfig[] = [
  { key: 'depth', name: 'Depth', iconName: 'arrow-down-outline' },
  { key: 'speed', name: 'Speed', iconName: 'arrow-forward-outline' },
  { key: 'wind', name: 'Wind', iconName: 'cloud-outline' },
  { key: 'temperature', name: 'Temperature', iconName: 'thermometer-outline' },
  { key: 'pressure', name: 'Pressure', iconName: 'speedometer-outline', defaultCollapsed: true },
  { key: 'angle', name: 'Angle', iconName: 'angle-outline', defaultCollapsed: true },
  { key: 'coordinates', name: 'GPS Position', iconName: 'navigate-outline' },
  { key: 'voltage', name: 'Voltage', iconName: 'cellular-outline' },
  { key: 'current', name: 'Current', iconName: 'flash-outline', defaultCollapsed: true },
  { key: 'volume', name: 'Volume (Tanks)', iconName: 'cube-outline' },
  { key: 'time', name: 'Time', iconName: 'time-outline', defaultCollapsed: true },
  { key: 'distance', name: 'Distance', iconName: 'arrows-horizontal-outline', defaultCollapsed: true },
  { key: 'capacity', name: 'Battery Capacity', iconName: 'battery-charging-outline', defaultCollapsed: true },
  { key: 'flowRate', name: 'Flow Rate', iconName: 'water-outline', defaultCollapsed: true },
  { key: 'frequency', name: 'Frequency (AC)', iconName: 'radio-outline', defaultCollapsed: true },
  { key: 'power', name: 'Power', iconName: 'flash-outline', defaultCollapsed: true },
  { key: 'rpm', name: 'RPM', iconName: 'speedometer-outline' },
];

// === ZOD SCHEMA ===

const unitsFormSchema = z.object({
  preset: z.enum(['nautical_eu', 'nautical_uk', 'nautical_us', 'custom']),
  // Category presentation IDs (strings matching formatSpec IDs)
  depth: z.string().optional(),
  speed: z.string().optional(),
  wind: z.string().optional(),
  temperature: z.string().optional(),
  pressure: z.string().optional(),
  angle: z.string().optional(),
  coordinates: z.string().optional(),
  voltage: z.string().optional(),
  current: z.string().optional(),
  volume: z.string().optional(),
  time: z.string().optional(),
  distance: z.string().optional(),
  capacity: z.string().optional(),
  flowRate: z.string().optional(),
  frequency: z.string().optional(),
  power: z.string().optional(),
  rpm: z.string().optional(),
});

type UnitsFormData = z.infer<typeof unitsFormSchema>;

// === MAIN COMPONENT ===

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
  const { setPresentationForCategory, selectedPresentations } = presentationStore;

  // === INITIAL STATE ===

  const initialFormData = useMemo((): UnitsFormData => {
    // Detect current preset
    let detectedPreset: string = 'custom';
    for (const preset of PRESETS) {
      if (preset.id === 'custom') continue;
      const matches = Object.entries(preset.presentations).every(
        ([cat, presId]) => selectedPresentations[cat as DataCategory] === presId
      );
      if (matches) {
        detectedPreset = preset.id;
        break;
      }
    }

    return {
      preset: detectedPreset as any,
      depth: selectedPresentations.depth,
      speed: selectedPresentations.speed,
      wind: selectedPresentations.wind,
      temperature: selectedPresentations.temperature,
      pressure: selectedPresentations.pressure,
      angle: selectedPresentations.angle,
      coordinates: selectedPresentations.coordinates,
      voltage: selectedPresentations.voltage,
      current: selectedPresentations.current,
      volume: selectedPresentations.volume,
      time: selectedPresentations.time,
      distance: selectedPresentations.distance,
      capacity: selectedPresentations.capacity,
      flowRate: selectedPresentations.flowRate,
      frequency: selectedPresentations.frequency,
      power: selectedPresentations.power,
      rpm: selectedPresentations.rpm,
    };
  }, [selectedPresentations]);

  // === FORM STATE ===

  const {
    formData,
    updateField,
    updateFields,
    reset,
    isDirty,
    saveNow,
  } = useFormState<UnitsFormData>(initialFormData, {
    onSave: (data) => {
      // Apply all category selections to presentation store
      CATEGORIES.forEach(({ key }) => {
        if (data[key]) {
          setPresentationForCategory(key, data[key]!);
        }
      });
    },
    debounceMs: 300,
    validationSchema: unitsFormSchema,
  });

  // Reset form when dialog opens
  useEffect(() => {
    if (visible) {
      reset();
    }
  }, [visible, reset]);

  // === PRESET HANDLING ===

  const handlePresetSelect = useCallback((presetId: string) => {
    if (presetId === 'custom') {
      updateField('preset', presetId);
      return;
    }

    const preset = PRESETS.find(p => p.id === presetId);
    if (!preset) return;

    // Apply preset to form (triggers debounced save)
    const updates: Partial<UnitsFormData> = { preset: presetId as any };
    Object.entries(preset.presentations).forEach(([cat, presId]) => {
      updates[cat as keyof UnitsFormData] = presId as any;
    });
    updateFields(updates);
  }, [updateField, updateFields]);

  // === UNIT SELECTION ===

  const handleUnitSelect = useCallback((category: DataCategory, presentationId: string) => {
    updateFields({
      preset: 'custom',
      [category]: presentationId,
    });
  }, [updateFields]);

  // === CLOSE HANDLER ===

  const handleClose = useCallback(() => {
    if (isDirty) {
      saveNow(); // Immediate save on close
    }
    onClose();
  }, [isDirty, saveNow, onClose]);

  // === PRESET PREVIEW ===

  const currentPreset = PRESETS.find(p => p.id === formData.preset);

  // === RENDER ===

  return (
    <BaseSettingsModal
      visible={visible}
      title="Units & Format"
      onClose={handleClose}
      showFooter={false}
      testID="units-config-dialog"
    >
      <ScrollView style={styles.scrollContainer}>
        {/* Preset Selector */}
        <FormSection
          title="Preset"
          sectionId="preset"
          dialogId="units"
          defaultCollapsed={false}
        >
          <Text style={[styles.hint, { color: theme.textSecondary }]}>
            Choose a standard preset or customize individual units
          </Text>

          <View style={styles.presetRow}>
            {PRESETS.map(preset => (
              <TouchableOpacity
                key={preset.id}
                style={[
                  styles.presetChip,
                  { backgroundColor: theme.surface, borderColor: theme.border },
                  formData.preset === preset.id && {
                    borderColor: theme.interactive,
                    backgroundColor: `${theme.interactive}15`,
                  },
                ]}
                onPress={() => handlePresetSelect(preset.id)}
                accessibilityRole="radio"
                accessibilityState={{ checked: formData.preset === preset.id }}
                accessibilityLabel={`${preset.name}: ${preset.description}`}
              >
                <Text
                  style={[
                    styles.presetText,
                    { color: theme.textSecondary },
                    formData.preset === preset.id && {
                      color: theme.text,
                      fontWeight: '600',
                    },
                  ]}
                >
                  {preset.name}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Preset Preview */}
          {currentPreset && currentPreset.examples.length > 0 && (
            <View style={[styles.previewBox, { backgroundColor: theme.surface, borderColor: theme.border }]}>
              <Text style={[styles.previewLabel, { color: theme.textSecondary }]}>
                Preview:
              </Text>
              <View style={styles.previewRow}>
                {currentPreset.examples.map((ex, idx) => (
                  <Text key={idx} style={[styles.previewText, { color: theme.text }]}>
                    {ex.category}: <Text style={{ fontWeight: '600' }}>{ex.value}</Text>
                  </Text>
                ))}
              </View>
            </View>
          )}
        </FormSection>

        {/* Individual Category Sections */}
        {CATEGORIES.map(category => {
          const presentations = PRESENTATIONS[category.key]?.presentations || [];
          const selectedPresId = formData[category.key];
          const isCustomMode = formData.preset === 'custom';

          return (
            <FormSection
              key={category.key}
              title={category.name}
              sectionId={category.key}
              dialogId="units"
              defaultCollapsed={category.defaultCollapsed}
            >
              <View style={styles.unitsGrid}>
                {presentations.map(pres => (
                  <TouchableOpacity
                    key={pres.id}
                    style={[
                      styles.unitButton,
                      { backgroundColor: theme.surface, borderColor: theme.border },
                      selectedPresId === pres.id && {
                        borderColor: theme.interactive,
                        backgroundColor: `${theme.interactive}15`,
                      },
                      !isCustomMode && { opacity: 0.5 },
                    ]}
                    onPress={() => isCustomMode && handleUnitSelect(category.key, pres.id)}
                    disabled={!isCustomMode}
                    accessibilityRole="radio"
                    accessibilityState={{ checked: selectedPresId === pres.id, disabled: !isCustomMode }}
                    accessibilityLabel={getPresentationConfigLabel(pres)}
                  >
                    <Text
                      style={[
                        styles.unitText,
                        { color: theme.textSecondary },
                        selectedPresId === pres.id && {
                          color: theme.text,
                          fontWeight: '600',
                        },
                      ]}
                    >
                      {getPresentationConfigLabel(pres)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {!isCustomMode && (
                <Text style={[styles.disabledHint, { color: theme.textSecondary }]}>
                  Switch to Custom preset to modify
                </Text>
              )}
            </FormSection>
          );
        })}
      </ScrollView>
    </BaseSettingsModal>
  );
};

// === STYLES ===

const createStyles = (
  theme: ThemeColors,
  platformTokens: ReturnType<typeof getPlatformTokens>,
  tvMode: boolean
) =>
  StyleSheet.create({
    scrollContainer: {
      flex: 1,
    },
    hint: {
      fontSize: platformTokens.typography.caption.fontSize,
      fontFamily: platformTokens.typography.fontFamily,
      marginBottom: platformTokens.spacing.row,
      fontStyle: 'italic',
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
    presetText: {
      fontSize: platformTokens.typography.label.fontSize,
      fontFamily: platformTokens.typography.fontFamily,
    },
    previewBox: {
      marginTop: platformTokens.spacing.row,
      padding: platformTokens.spacing.row,
      borderRadius: 8,
      borderWidth: 1,
    },
    previewLabel: {
      fontSize: platformTokens.typography.caption.fontSize,
      fontFamily: platformTokens.typography.fontFamily,
      marginBottom: 4,
      fontWeight: '600',
    },
    previewRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: platformTokens.spacing.row,
    },
    previewText: {
      fontSize: platformTokens.typography.caption.fontSize,
      fontFamily: platformTokens.typography.fontFamily,
    },
    unitsGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: platformTokens.spacing.row,
    },
    unitButton: {
      paddingHorizontal: tvMode ? 18 : 12,
      paddingVertical: tvMode ? 12 : 8,
      borderRadius: 6,
      borderWidth: 1,
      minWidth: tvMode ? 80 : 60,
      alignItems: 'center',
    },
    unitText: {
      fontSize: platformTokens.typography.body.fontSize,
      fontFamily: platformTokens.typography.fontFamily,
    },
    disabledHint: {
      fontSize: platformTokens.typography.caption.fontSize,
      fontFamily: platformTokens.typography.fontFamily,
      marginTop: platformTokens.spacing.row,
      fontStyle: 'italic',
    },
  });
