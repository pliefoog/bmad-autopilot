/**
 * ConfigFieldRenderer - Unified Field Rendering with Theme, Glove Mode, Mobile Optimization
 *
 * Purpose: Extract all field rendering logic from SensorConfigDialog.
 * Theme compliance: All colors from theme object, no hardcoded values.
 * Glove mode: Touch targets scale based on user setting (maritime safety).
 * Mobile optimization: Platform-aware keyboard types (decimal-pad on numeric inputs).
 * Performance: React.memo prevents re-renders when sibling fields change.
 *
 * This component handles all field types:
 * - textInput: Regular text input with optional placeholder
 * - numericInput: Numeric input with range validation and decimal-pad keyboard
 * - picker: Dropdown selection with enum validation
 * - toggle: Boolean toggle switch with help text
 *
 * Maritime context: Designed for one-handed operation with gloves.
 * Inline error display provides immediate feedback without modal dialogs.
 *
 * Error display: Red text below field, styled consistently across platforms.
 */

import React, { useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  Switch,
  Platform,
  useWindowDimensions,
  ViewStyle,
  TextStyle,
} from 'react-native';
import { ThemeColors } from '../../../store/themeStore';
import { PlatformPicker } from '../inputs/PlatformPicker';
import { UniversalIcon } from '../../atoms/UniversalIcon';
import { FieldDefinition } from '../../../registry/sensorSchemas';
import type { SensorInstance } from '../../../types/SensorInstance';
import { getFieldHeight, getTouchTargetSize } from '../../../constants/gloveMode';
import { log } from '../../../utils/logging/logger';
import { getPlatformTokens } from '../../../theme/settingsTokens';

/**
 * FieldDefinition with key property for rendering
 */
type FieldWithKey = FieldDefinition & { key: string };

export interface ConfigFieldRendererProps {
  /** Field configuration from registry */
  field: FieldWithKey;
  /** Current field value */
  value: any;
  /** Callback on field change: onChange(key, value) */
  onChange: (key: string, value: any) => void;
  /** Validation error message (if any) - displayed inline */
  error?: string;
  /** Sensor instance for reading hardware values */
  sensorInstance?: SensorInstance;
  /** Theme colors for styling */
  theme: ThemeColors;
  /** Glove mode active - increases touch target size */
  gloveMode: boolean;
}

/**
 * ConfigFieldRenderer - Renders individual config field based on type.
 *
 * Wrapped with React.memo to prevent re-renders when sibling fields change.
 * Props are memoized in parent to ensure memo effectiveness.
 */
const ConfigFieldRendererComponent: React.FC<ConfigFieldRendererProps> = ({
  field,
  value,
  onChange,
  error,
  sensorInstance,
  theme,
  gloveMode,
}) => {
  const platformTokens = getPlatformTokens();

  // Determine if field is read-only
  const isReadOnly = (() => {
    if (field.iostate === 'readOnly') return true;

    if (field.iostate === 'readOnlyIfValue') {
      // Check if field has a hardware value
      if (field.key === 'name') return false; // Special case: name is never read-only

      const fieldMetric = sensorInstance?.getMetric(field.key);
      const fieldValue = fieldMetric?.si_value ?? fieldMetric?.value;
      const hasValue = fieldValue !== undefined && fieldValue !== null && fieldValue !== '';

      return hasValue;
    }

    return false;
  })();

  // Get current value with special handling for name field
  const currentValue = (() => {
    if (field.key === 'name') {
      // For name: allow empty string during editing, don't use hardware fallback
      return value !== undefined && value !== null ? String(value) : '';
    }

    // Priority: form data first, then hardware value, then default
    if (value !== undefined && value !== null) {
      return value;
    }

    const fieldMetric = sensorInstance?.getMetric(field.key);
    const hardwareValue = fieldMetric?.si_value ?? fieldMetric?.value;
    if (hardwareValue !== undefined && hardwareValue !== null) {
      return hardwareValue;
    }

    return field.default ?? null;
  })();

  // Memoized styles for performance
  const styles = useMemo(() => createStyles(theme, platformTokens, gloveMode), [theme, platformTokens, gloveMode]);

  // Map unified schema field.type to UI rendering type
  const uiType = field.type === 'text' ? 'textInput' : 
                 field.type === 'number' ? 'numericInput' :
                 field.type === 'picker' ? 'picker' :
                 field.type === 'toggle' ? 'toggle' : 'textInput';

  // Render based on uiType
  switch (uiType) {
    case 'textInput':
      return (
        <View style={[styles.field, isReadOnly && styles.readOnlyField]}>
          <View style={styles.labelRow}>
            <Text style={[styles.label, { color: theme.text }]}>{field.label}</Text>
            {isReadOnly && <UniversalIcon name="lock" size={14} color={theme.textSecondary} />}
          </View>
          <TextInput
            style={[
              styles.input,
              {
                backgroundColor: isReadOnly ? theme.surface : theme.background,
                color: theme.text,
                borderColor: isReadOnly ? theme.border : theme.border,
                minHeight: getFieldHeight(gloveMode),
              },
              isReadOnly && styles.readOnlyInput,
            ]}
            value={String(currentValue || '')}
            onChangeText={(text) => {
              if (field.type === 'text') {
                onChange(field.key, text);
              }
            }}
            placeholder={field.helpText}
            placeholderTextColor={theme.textSecondary}
            editable={!isReadOnly}
          />
          {error && <Text style={[styles.errorText, { color: theme.error }]}>{error}</Text>}
        </View>
      );

    case 'numericInput':
      return (
        <View style={[styles.field, isReadOnly && styles.readOnlyField]}>
          <View style={styles.labelRow}>
            <Text style={[styles.label, { color: theme.text }]}>
              {field.label}
              {field.type === 'number' && field.min !== undefined && field.max !== undefined ? (
                <Text style={{ color: theme.textSecondary, fontSize: 12 }}>
                  {` (${field.min}-${field.max})`}
                </Text>
              ) : null}
            </Text>
            {isReadOnly && <UniversalIcon name="lock" size={14} color={theme.textSecondary} />}
          </View>
          <TextInput
            style={[
              styles.input,
              {
                backgroundColor: isReadOnly ? theme.surface : theme.background,
                color: theme.text,
                borderColor: isReadOnly ? theme.border : theme.border,
                minHeight: getFieldHeight(gloveMode),
              },
              isReadOnly && styles.readOnlyInput,
            ]}
            value={String(currentValue ?? '')}
            onChangeText={(text) => {
              const num = parseFloat(text);

              // Strict validation: allow NaN (no valid reading), reject Infinity
              if (!Number.isNaN(num) && !Number.isFinite(num)) {
                return; // Reject Infinity
              }

              // Apply min/max clamping if defined
              let finalValue = num;
              if (!Number.isNaN(num) && field.type === 'number') {
                if (field.min !== undefined && num < field.min) finalValue = field.min;
                if (field.max !== undefined && num > field.max) finalValue = field.max;
              }

              onChange(field.key, Number.isNaN(finalValue) ? undefined : finalValue);
            }}
            placeholder={field.helpText}
            placeholderTextColor={theme.textSecondary}
            keyboardType={Platform.OS === 'web' ? 'numeric' : 'decimal-pad'}
            editable={!isReadOnly}
          />
          {error && <Text style={[styles.errorText, { color: theme.error }]}>{error}</Text>}
        </View>
      );

    case 'picker':
      return (
        <View style={styles.field}>
          <Text style={[styles.label, { color: theme.text }]}>{field.label}</Text>
          <PlatformPicker
            value={String(currentValue || field.default || '')}
            onValueChange={(newValue: any) => {
              // Enum validation for picker fields
              if (field.type === 'picker' && field.options) {
                const isValid = field.options.includes(newValue);
                if (!isValid) {
                  log.app('ConfigFieldRenderer: Invalid enum value', () => ({
                    value: newValue,
                    fieldKey: field.key,
                    allowedOptions: field.options,
                  }));
                  return;
                }
              }
              onChange(field.key, String(newValue));
            }}
            items={
              field.type === 'picker' && field.options
                ? field.options.map((opt) => ({ label: opt, value: opt }))
                : []
            }
          />
          {isReadOnly && (
            <Text style={[styles.helpText, { color: theme.success }]}>
              Provided by sensor hardware
            </Text>
          )}
          {error && <Text style={[styles.errorText, { color: theme.error }]}>{error}</Text>}
        </View>
      );

    case 'toggle':
      return (
        <View style={styles.field}>
          <View style={styles.toggleRow}>
            <Text style={[styles.label, { color: theme.text }]}>{field.label}</Text>
            <Switch
              value={Boolean(currentValue ?? field.default ?? false)}
              onValueChange={(newValue) => {
                if (typeof newValue !== 'boolean') {
                  log.app('ConfigFieldRenderer: Invalid boolean value', () => ({
                    fieldKey: field.key,
                    valueType: typeof newValue,
                  }));
                  return;
                }
                onChange(field.key, newValue);
              }}
              disabled={isReadOnly}
            />
          </View>
          {field.helpText && (
            <Text style={[styles.helpText, { color: theme.textSecondary }]}>
              {field.helpText}
            </Text>
          )}
          {error && <Text style={[styles.errorText, { color: theme.error }]}>{error}</Text>}
        </View>
      );

    case null:
      // Field not exposed in UI (internal/computed)
      return null;

    default: {
      const _exhaustiveCheck: never = field;
      log.app('ConfigFieldRenderer: Unknown uiType', () => ({
        fieldKey: _exhaustiveCheck,
      }));
      return null;
    }
  }
};

export const ConfigFieldRenderer = React.memo(ConfigFieldRendererComponent);

const createStyles = (theme: ThemeColors, platformTokens: ReturnType<typeof getPlatformTokens>, gloveMode: boolean) =>
  StyleSheet.create({
    field: {
      marginBottom: 16,
    },
    readOnlyField: {
      opacity: 0.7,
    },
    labelRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 8,
    },
    label: {
      fontSize: 16,
      fontWeight: '600',
      fontFamily: platformTokens.typography.fontFamily,
    },
    input: {
      paddingHorizontal: 12,
      paddingVertical: 10,
      borderRadius: platformTokens.borderRadius.input,
      borderWidth: 1,
      fontSize: 16,
    },
    readOnlyInput: {
      opacity: 0.7,
    },
    toggleRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      minHeight: getTouchTargetSize(gloveMode),
    },
    helpText: {
      fontSize: platformTokens.typography.hint.fontSize,
      fontWeight: platformTokens.typography.hint.fontWeight,
      lineHeight: platformTokens.typography.hint.lineHeight,
      fontFamily: platformTokens.typography.fontFamily,
      fontStyle: platformTokens.typography.hint.fontStyle,
      color: theme.textSecondary,
      marginTop: 12,
    } as TextStyle,
    errorText: {
      fontSize: 12,
      fontStyle: 'italic',
      fontFamily: platformTokens.typography.fontFamily,
      marginTop: 4,
    } as TextStyle,
  });
