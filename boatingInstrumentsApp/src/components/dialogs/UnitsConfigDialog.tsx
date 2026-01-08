/**
 * Units Configuration Dialog (Refactored)
 * CONFIG-DIALOG-REFACTOR-SPECIFICATION.md - Phase 5
 *
 * Refactoring improvements:
 * - Zod schema for preset + 17 category validation
 * - useFormState with debouncing (300ms auto-save)
 * - Compact mobile-optimized layout (no collapsible sections)
 * - Preset preview with formatted example values
 * - Grid layout for unit selection (responsive wrapping)
 *
 * **Architecture:**
 * - Uses BaseConfigDialog for consistent Modal/header/footer structure
 * - BaseConfigDialog provides: pageSheet Modal, close button, title (no action button for this dialog)
 * - Eliminates duplicate Modal boilerplate (~80 lines removed vs manual implementation)
 * - Current: ~580 lines (includes form state, validation, auto-save, 19 categories, 4 presets)
 */

import React, { useMemo, useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { UniversalIcon } from '../atoms/UniversalIcon';
import { z } from 'zod';
import { useTheme, ThemeColors } from '../../store/themeStore';
import {
  usePresentationStore,
  REGION_DEFAULTS,
  getRegionMetadata,
  MarineRegion,
} from '../../presentation/presentationStore';
import { DataCategory } from '../../presentation/categories';
import { PRESENTATIONS, getPresentationConfigLabel } from '../../presentation/presentations';
import { BaseConfigDialog } from './base/BaseConfigDialog';
import { useFormState } from '../../hooks/useFormState';
import { useSettingsStore } from '../../store/settingsStore';
import { getPlatformTokens } from '../../theme/settingsTokens';

/**
 * Units Configuration Dialog Props
 *
 * @property visible - Controls modal visibility
 * @property onClose - Callback when dialog closes (auto-saves before closing)
 *
 * **Component Behavior:**
 * - 4 presets: Nautical (EU/UK/US) + Custom
 * - 17 unit categories displayed compactly in scrollable list
 * - Auto-saves unit selection with 300ms debounce
 * - Shows preset preview with example formatted values
 * - Custom mode enables individual unit selection
 * - Preset mode locks unit selection (switch to Custom to modify)
 *
 * **Limitations:**
 * - Presets are static (not user-definable)
 * - Example values in preview are hardcoded samples
 * - No search/filter for unit categories
 * - Category order is fixed (not customizable)
 */
interface UnitsConfigDialogProps {
  visible: boolean;
  onClose: () => void;
}

/**
 * Category Configuration
 * Defines display properties for each unit category
 * isAdvanced: true = collapsed by default for cleaner mobile UX
 */
interface CategoryConfig {
  key: DataCategory;
  name: string;
  isAdvanced?: boolean; // Hide in collapsed view (progressive disclosure)
}

// === PRESET DEFINITIONS (LOADED FROM STORE) ===

/**
 * Presentation Preset Structure
 *
 * Defines a complete set of unit preferences for a region/standard.
 * Examples array provides sample formatted values for preview display.
 *
 * **SINGLE SOURCE OF TRUTH:** Loaded from presentationStore.REGION_DEFAULTS
 */
interface PresentationPreset {
  id: string;
  name: string;
  description: string;
  presentations: Partial<Record<DataCategory, string>>;
  examples: { category: string; value: string }[]; // Preview examples
}

/**
 * Build presets from store's REGION_DEFAULTS (single source of truth)
 */
function buildPresetsFromStore(): PresentationPreset[] {
  const regionMetadata = getRegionMetadata();

  // Example values for preview (representative samples for each region)
  const examplesByRegion: Record<MarineRegion, { category: string; value: string }[]> = {
    eu: [
      { category: 'Depth', value: '5.2 m' },
      { category: 'Temperature', value: '18.5°C' },
      { category: 'Pressure', value: '1013 mbar' },
      { category: 'Volume', value: '83 L' },
    ],
    uk: [
      { category: 'Depth', value: '3.0 fth' },
      { category: 'Temperature', value: '18.5°C' },
      { category: 'Pressure', value: '1013 mbar' },
      { category: 'Volume', value: '22 gal' },
    ],
    us: [
      { category: 'Depth', value: '17.1 ft' },
      { category: 'Temperature', value: '65.3°F' },
      { category: 'Pressure', value: '29.92 inHg' },
      { category: 'Volume', value: '22 gal' },
    ],
    international: [
      { category: 'Depth', value: '5.2 m' },
      { category: 'Temperature', value: '18.5°C' },
      { category: 'Pressure', value: '1013 mbar' },
      { category: 'Volume', value: '83 L' },
    ],
  };

  const presets: PresentationPreset[] = regionMetadata.map((region) => ({
    id: region.id,
    name: region.name,
    description: region.description,
    presentations: REGION_DEFAULTS[region.id],
    examples: examplesByRegion[region.id],
  }));

  // Add custom preset
  presets.push({
    id: 'custom',
    name: 'Custom',
    description: 'User-defined selections',
    presentations: {},
    examples: [],
  });

  return presets;
}

// Build presets once at module level
const PRESETS = buildPresetsFromStore();

// === CATEGORY DEFINITIONS ===

const CATEGORIES: CategoryConfig[] = [
  // Essential marine categories (always visible)
  { key: 'depth', name: 'Depth' },
  { key: 'speed', name: 'Speed' },
  { key: 'wind', name: 'Wind' },
  { key: 'temperature', name: 'Temperature' },
  { key: 'coordinates', name: 'GPS Position' },
  { key: 'volume', name: 'Volume (Tanks)' },
  
  // Advanced categories (collapsed by default for cleaner mobile UX)
  { key: 'pressure', name: 'Pressure', isAdvanced: true },
  { key: 'angle', name: 'Angle', isAdvanced: true },
  { key: 'voltage', name: 'Voltage', isAdvanced: true },
  { key: 'current', name: 'Current', isAdvanced: true },
  { key: 'time', name: 'Time', isAdvanced: true },
  { key: 'date', name: 'Date', isAdvanced: true },
  { key: 'duration', name: 'Duration', isAdvanced: true },
  { key: 'distance', name: 'Distance', isAdvanced: true },
  { key: 'capacity', name: 'Battery Capacity', isAdvanced: true },
  { key: 'flowRate', name: 'Flow Rate', isAdvanced: true },
  { key: 'frequency', name: 'Frequency (AC)', isAdvanced: true },
  { key: 'power', name: 'Power', isAdvanced: true },
  { key: 'rpm', name: 'RPM', isAdvanced: true },
];

// === ZOD SCHEMA ===

const unitsFormSchema = z.object({
  preset: z.enum(['eu', 'us', 'uk', 'international', 'custom']),
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
  date: z.string().optional(),
  duration: z.string().optional(),
  distance: z.string().optional(),
  capacity: z.string().optional(),
  flowRate: z.string().optional(),
  frequency: z.string().optional(),
  power: z.string().optional(),
  rpm: z.string().optional(),
  // GPS-specific settings (managed via settingsStore, not presentationStore)
  coordinateFormat: z
    .enum(['decimal_degrees', 'degrees_minutes', 'degrees_minutes_seconds', 'utm'])
    .optional(),
  timezone: z.string().optional(),
});

type UnitsFormData = z.infer<typeof unitsFormSchema>;

// === MAIN COMPONENT ===

export const UnitsConfigDialog: React.FC<UnitsConfigDialogProps> = ({ visible, onClose }) => {
  const theme = useTheme();
  const platformTokens = getPlatformTokens();
  const styles = useMemo(() => createStyles(theme, platformTokens), [theme, platformTokens]);

  // Progressive disclosure: collapse advanced categories by default for cleaner mobile UX
  const [showAdvanced, setShowAdvanced] = useState(false);

  const presentationStore = usePresentationStore();
  const { setPresentationForCategory, setMarineRegion, selectedPresentations, marineRegion } = presentationStore;

  const { gps, setGpsSetting } = useSettingsStore();

  // === INITIAL STATE ===

  const initialFormData = useMemo((): UnitsFormData => {
    // Use marineRegion from store (already persisted)
    // Only fallback to detection if user has customized individual units
    let detectedPreset: string = marineRegion;
    
    // Check if current selections match the stored region preset
    const regionPreset = PRESETS.find((p) => p.id === marineRegion);
    if (regionPreset) {
      const matches = Object.entries(regionPreset.presentations).every(
        ([cat, presId]) => selectedPresentations[cat as DataCategory] === presId,
      );
      // If selections don't match region preset, user has customized
      if (!matches) {
        detectedPreset = 'custom';
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
      // GPS settings from settingsStore
      coordinateFormat: gps.coordinateFormat,
      timezone: gps.timezone,
    };
  }, [selectedPresentations, marineRegion, gps.coordinateFormat, gps.timezone]);

  // === FORM STATE ===

  const { formData, updateField, updateFields, reset, isDirty, saveNow } =
    useFormState<UnitsFormData>(initialFormData, {
      onSave: (data) => {
        // Save the marine region if a preset is selected (not custom)
        if (data.preset && data.preset !== 'custom') {
          setMarineRegion(data.preset as MarineRegion);
        }

        // Apply all category selections to presentation store
        CATEGORIES.forEach(({ key }) => {
          if (data[key]) {
            setPresentationForCategory(key, data[key]!);
          }
        });

        // Save GPS settings to settingsStore
        if (data.coordinateFormat) {
          setGpsSetting('coordinateFormat', data.coordinateFormat);
        }
        if (data.timezone !== undefined) {
          setGpsSetting('timezone', data.timezone);
        }
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

  /**
   * Handle preset selection
   * Applies preset unit configuration to all 17 categories, or switches to Custom mode.
   */
  const handlePresetSelect = useCallback(
    (presetId: string) => {
      if (presetId === 'custom') {
        updateField('preset', presetId);
        return;
      }

      const preset = PRESETS.find((p) => p.id === presetId);
      if (!preset) return;

      // Apply preset to form (triggers debounced save)
      const updates: Partial<UnitsFormData> = { preset: presetId as any };
      Object.entries(preset.presentations).forEach(([cat, presId]) => {
        updates[cat as keyof UnitsFormData] = presId as any;
      });
      updateFields(updates);
    },
    [updateField, updateFields],
  );

  // === UNIT SELECTION ===

  /**
   * Handle individual unit selection
   * Automatically switches to Custom preset when user modifies any category.
   */
  const handleUnitSelect = useCallback(
    (category: DataCategory, presentationId: string) => {
      updateFields({
        preset: 'custom',
        [category]: presentationId,
      });
    },
    [updateFields],
  );

  // === CLOSE HANDLER ===

  /**
   * Handle dialog close
   * Saves immediately if form is dirty (bypasses debounce).
   */
  const handleClose = useCallback(async () => {
    if (isDirty) {
      await saveNow(); // Await save completion before closing
    }
    onClose();
  }, [isDirty, saveNow, onClose]);

  // === PRESET PREVIEW ===

  const currentPreset = PRESETS.find((p) => p.id === formData.preset);

  // === RENDER ===

  return (
    <BaseConfigDialog
      visible={visible}
      title="Units & Format"
      onClose={handleClose}
      testID="units-config-dialog"
    >
      {/* Preset Selector */}
      <Text style={[styles.sectionTitle, { color: theme.text }]}>Preset</Text>
      <Text style={[styles.hint, { color: theme.textSecondary }]}>
        Choose a standard preset or customize individual units
      </Text>

      <View style={styles.presetRow}>
        {PRESETS.map((preset) => (
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
      {currentPreset?.examples.length > 0 && (
        <View
          style={[styles.previewBox, { backgroundColor: theme.surface, borderColor: theme.border }]}
        >
          <Text style={[styles.previewLabel, { color: theme.textSecondary }]}>Preview:</Text>
          <View style={styles.previewRow}>
            {currentPreset.examples.map((ex, idx) => (
              <Text key={idx} style={[styles.previewText, { color: theme.text }]}>
                {ex.category}: <Text style={{ fontWeight: '600' }}>{ex.value}</Text>
              </Text>
            ))}
          </View>
        </View>
      )}

      {/* Section divider */}
      <View style={[styles.divider, { backgroundColor: theme.border }]} />

      {/* Smart context-aware hint */}
      {formData.preset !== 'custom' ? (
        <View style={[styles.infoBox, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <UniversalIcon name="information-circle" size={20} color={theme.interactive} />
          <Text style={[styles.infoText, { color: theme.text }]}>
            Using <Text style={{ fontWeight: '600' }}>{currentPreset?.name}</Text> preset.
            Switch to Custom to modify individual units.
          </Text>
        </View>
      ) : (
        <>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Essential Units</Text>
          
          {/* Essential categories - always visible */}
          {CATEGORIES.filter((cat) => !cat.isAdvanced).map((category) => {
            const presentations = PRESENTATIONS[category.key]?.presentations || [];
            const selectedPresId = formData[category.key];

            return (
              <View key={category.key} style={styles.categorySection}>
                <Text style={[styles.categoryTitle, { color: theme.text }]}>{category.name}</Text>

                <View style={styles.unitsGrid}>
                  {presentations.map((pres) => (
                    <TouchableOpacity
                      key={pres.id}
                      style={[
                        styles.unitButton,
                        { backgroundColor: theme.surface, borderColor: theme.border },
                        selectedPresId === pres.id && {
                          borderColor: theme.interactive,
                          backgroundColor: `${theme.interactive}15`,
                        },
                      ]}
                      onPress={() => handleUnitSelect(category.key, pres.id)}
                      accessibilityRole="radio"
                      accessibilityState={{ checked: selectedPresId === pres.id }}
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
              </View>
            );
          })}

          {/* Advanced categories - collapsible */}
          <TouchableOpacity
            style={styles.advancedToggle}
            onPress={() => setShowAdvanced(!showAdvanced)}
            accessibilityRole="button"
            accessibilityLabel={showAdvanced ? 'Hide advanced units' : 'Show advanced units'}
          >
            <Text style={[styles.advancedToggleText, { color: theme.interactive }]}>
              {showAdvanced ? 'Hide' : 'Show'} Advanced Units
            </Text>
            <UniversalIcon
              name={showAdvanced ? 'chevron-up' : 'chevron-down'}
              size={20}
              color={theme.interactive}
            />
          </TouchableOpacity>

          {showAdvanced &&
            CATEGORIES.filter((cat) => cat.isAdvanced).map((category) => {
              const presentations = PRESENTATIONS[category.key]?.presentations || [];
              const selectedPresId = formData[category.key];

              return (
                <View key={category.key} style={styles.categorySection}>
                  <Text style={[styles.categoryTitle, { color: theme.text }]}>{category.name}</Text>

                  <View style={styles.unitsGrid}>
                    {presentations.map((pres) => (
                      <TouchableOpacity
                        key={pres.id}
                        style={[
                          styles.unitButton,
                          { backgroundColor: theme.surface, borderColor: theme.border },
                          selectedPresId === pres.id && {
                            borderColor: theme.interactive,
                            backgroundColor: `${theme.interactive}15`,
                          },
                        ]}
                        onPress={() => handleUnitSelect(category.key, pres.id)}
                        accessibilityRole="radio"
                        accessibilityState={{ checked: selectedPresId === pres.id }}
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
                </View>
              );
            })}
        </>
      )}
    </BaseConfigDialog>
  );
};

// === STYLES ===

const createStyles = (theme: ThemeColors, platformTokens: ReturnType<typeof getPlatformTokens>) =>
  StyleSheet.create({
    sectionTitle: {
      fontSize: 18,
      fontWeight: '600',
      fontFamily: platformTokens.typography.fontFamily,
      marginBottom: 12,
      marginTop: 8,
    },
    hint: {
      fontSize: platformTokens.typography.caption.fontSize,
      fontFamily: platformTokens.typography.fontFamily,
      marginBottom: 16,
      lineHeight: platformTokens.typography.caption.lineHeight,
    },
    presetRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 12,
      marginTop: 16,
    },
    presetChip: {
      paddingHorizontal: 16,
      paddingVertical: 10,
      borderRadius: 20,
      borderWidth: 2,
    },
    presetText: {
      fontSize: platformTokens.typography.body.fontSize,
      fontFamily: platformTokens.typography.fontFamily,
    },
    previewBox: {
      marginTop: 12,
      padding: 12,
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
      gap: 12,
    },
    previewText: {
      fontSize: platformTokens.typography.caption.fontSize,
      fontFamily: platformTokens.typography.fontFamily,
    },
    divider: {
      height: 1,
      marginVertical: 24,
    },
    infoBox: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      padding: 12,
      borderRadius: 8,
      borderWidth: 1,
      marginBottom: 24,
    },
    infoText: {
      flex: 1,
      fontSize: platformTokens.typography.caption.fontSize,
      fontFamily: platformTokens.typography.fontFamily,
      lineHeight: platformTokens.typography.caption.lineHeight,
    },
    advancedToggle: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      paddingVertical: 16,
      marginTop: 8,
      marginBottom: 16,
    },
    advancedToggleText: {
      fontSize: platformTokens.typography.body.fontSize,
      fontFamily: platformTokens.typography.fontFamily,
      fontWeight: '600',
    },
    categorySection: {
      marginBottom: 24,
    },
    categoryTitle: {
      fontSize: 15,
      fontWeight: '600',
      fontFamily: platformTokens.typography.fontFamily,
      marginBottom: 12,
    },
    unitsGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 12,
    },
    unitButton: {
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 6,
      borderWidth: 1,
      minWidth: 60,
      alignItems: 'center',
    },
    unitText: {
      fontSize: platformTokens.typography.body.fontSize,
      fontFamily: platformTokens.typography.fontFamily,
    },
  });
