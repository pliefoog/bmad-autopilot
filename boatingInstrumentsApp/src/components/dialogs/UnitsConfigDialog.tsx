/**
 * Units Configuration Dialog - RHF Refactored
 *
 * Purpose: Configure unit presentations for 23 data categories via presets or custom selection
 * Pattern: React Hook Form with preset selector triggering atomic category updates
 * Features:
 * - 4 presets: Nautical (EU/UK/US) + Custom
 * - 23 unit categories (6 essential + 17 advanced with progressive disclosure)
 * - Live preview with formatted example values per preset
 * - Atomic preset updates (all 23 categories change together)
 * - GPS settings (coordinate format, timezone)
 * - Progressive disclosure for cleaner mobile UX
 *
 * Architecture:
 * - Single form hook abstracts all presentation store interactions
 * - Component is pure rendering (no business logic)
 * - Preset preview shows formatted examples for quick comparison
 * - Custom mode enables individual unit selection
 * - Preset mode provides quick region/standard switching
 */

import React, { useMemo, useCallback, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { UniversalIcon } from '../atoms/UniversalIcon';
import { useTheme, ThemeColors } from '../../store/themeStore';
import { PRESENTATIONS, getPresentationConfigLabel } from '../../presentation/presentations';
import { DataCategory } from '../../presentation/categories';
import { BaseConfigDialog } from './base/BaseConfigDialog';
import { useUnitsConfigForm, type UnitsFormData } from '../../hooks/useUnitsConfigForm';
import { getPlatformTokens } from '../../theme/settingsTokens';

/**
 * Units Configuration Dialog Props
 *
 * @property visible - Controls modal visibility
 * @property onClose - Callback when dialog closes
 */
interface UnitsConfigDialogProps {
  visible: boolean;
  onClose: () => void;
}

export const UnitsConfigDialog: React.FC<UnitsConfigDialogProps> = ({ visible, onClose }) => {
  const theme = useTheme();
  const platformTokens = getPlatformTokens();
  const styles = useMemo(() => createStyles(theme, platformTokens), [theme, platformTokens]);

  // Progressive disclosure: collapse advanced categories by default
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Create form hook with RHF integration
  const { form, handlers, computed } = useUnitsConfigForm((data) => {
    // onSave callback - applied to stores immediately
  });

  // Watch form values for rendering
  const preset = form.watch('preset');
  const selectedPreset = computed.selectedPreset;

  // Get all form values
  const formValues = form.getValues();

  // Dialog close handler
  const handleClose = useCallback(() => {
    handlers.handleSave();
    onClose();
  }, [handlers, onClose]);

  return (
    <BaseConfigDialog
      visible={visible}
      title="Units & Format"
      onClose={handleClose}
      testID="units-config-dialog"
    >
      {/* Preset Selection Card */}
      <View style={styles.card}>
        <View style={styles.settingRow}>
          <Text style={styles.sectionTitle}>Preset</Text>
        </View>

        <View style={styles.presetRow}>
          {computed.presets.map((presetObj) => (
            <TouchableOpacity
              key={presetObj.id}
              style={[
                styles.presetChip,
                { backgroundColor: theme.surface, borderColor: theme.border },
                preset === presetObj.id && {
                  borderColor: theme.interactive,
                  backgroundColor: `${theme.interactive}15`,
                },
              ]}
              onPress={() => handlers.handlePresetChange(presetObj.id as any)}
              accessibilityRole="radio"
              accessibilityState={{ checked: preset === presetObj.id }}
              accessibilityLabel={`${presetObj.name}: ${presetObj.description}`}
            >
              <Text
                style={[
                  styles.presetText,
                  { color: theme.textSecondary },
                  preset === presetObj.id && {
                    color: theme.text,
                    fontWeight: '600',
                  },
                ]}
              >
                {presetObj.name}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Inline Preview - only for non-custom presets */}
        {selectedPreset && selectedPreset.examples && selectedPreset.examples.length > 0 && preset !== 'custom' && (
          <View style={styles.previewInline}>
            <Text style={[styles.previewLabel, { color: theme.textSecondary }]}>Preview:</Text>
            <View style={styles.previewRow}>
              {selectedPreset.examples.map((ex, idx) => (
                <Text key={idx} style={[styles.previewText, { color: theme.text }]}>
                  {ex.category}: <Text style={{ fontWeight: '600' }}>{ex.value}</Text>
                </Text>
              ))}
            </View>
          </View>
        )}
      </View>

      {/* Progressive Disclosure: Only show unit selections in Custom mode */}
      {preset === 'custom' && (
        <>
          {/* Essential Units Card */}
          <View style={styles.card}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>Essential Units</Text>

            {computed.categories
              .filter((cat) => !cat.isAdvanced)
              .map((category) => {
                const catKey = category.key as keyof UnitsFormData;
                const presentations = (PRESENTATIONS as Record<string, any>)[category.key]?.presentations || [];
                const selectedPresId = formValues[catKey];

                return (
                  <View key={category.key} style={styles.categorySection}>
                    <Text style={[styles.categoryTitle, { color: theme.text }]}>{category.name}</Text>

                    <View style={styles.unitsGrid}>
                      {(presentations as any[]).map((pres: any) => (
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
                          onPress={() =>
                            handlers.handleCategoryChange(category.key as DataCategory, pres.id)
                          }
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
          </View>

          {/* Advanced Units Card */}
          <View style={styles.card}>
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
                name={showAdvanced ? 'chevron-up-outline' : 'chevron-down-outline'}
                size={20}
                color={theme.interactive}
              />
            </TouchableOpacity>

            {showAdvanced &&
              computed.categories
                .filter((cat) => cat.isAdvanced)
                .map((category) => {
                  const catKey = category.key as keyof UnitsFormData;
                  const presentations = (PRESENTATIONS as Record<string, any>)[category.key]?.presentations || [];
                  const selectedPresId = formValues[catKey];

                  return (
                    <View key={category.key} style={styles.categorySection}>
                      <Text style={[styles.categoryTitle, { color: theme.text }]}>
                        {category.name}
                      </Text>

                      <View style={styles.unitsGrid}>
                        {(presentations as any[]).map((pres: any) => (
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
                            onPress={() =>
                              handlers.handleCategoryChange(category.key as DataCategory, pres.id)
                            }
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
          </View>
        </>
      )}
    </BaseConfigDialog>
  );
};

/**
 * Style factory function
 * Creates platform-specific StyleSheet with theme colors
 */
const createStyles = (theme: ThemeColors, platformTokens: ReturnType<typeof getPlatformTokens>) =>
  StyleSheet.create({
    card: {
      backgroundColor: theme.surface,
      borderRadius: platformTokens.borderRadius.card,
      padding: 20,
      marginBottom: 16,
      ...Platform.select({
        ios: {
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.1,
          shadowRadius: 8,
        },
        android: { elevation: 2 },
        web: { boxShadow: '0 2px 8px rgba(0,0,0,0.1)' },
      }),
    },
    settingRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 12,
    },
    sectionTitle: {
      fontSize: 18,
      fontWeight: '700',
      fontFamily: platformTokens.typography.fontFamily,
      color: theme.text,
    },
    presetRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 12,
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
    previewInline: {
      marginTop: 16,
      paddingTop: 16,
      borderTopWidth: 1,
      borderTopColor: theme.border,
    },
    previewLabel: {
      fontSize: platformTokens.typography.caption.fontSize,
      fontFamily: platformTokens.typography.fontFamily,
      marginBottom: 8,
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
    advancedToggle: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      paddingVertical: 12,
    },
    advancedToggleText: {
      fontSize: platformTokens.typography.body.fontSize,
      fontFamily: platformTokens.typography.fontFamily,
      fontWeight: '600',
    },
    categorySection: {
      marginTop: 20,
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

export default UnitsConfigDialog;
