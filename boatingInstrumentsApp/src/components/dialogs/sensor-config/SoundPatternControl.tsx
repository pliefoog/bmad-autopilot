/**
 * Sound Pattern Control Component
 *
 * Unified mobile/desktop layout for alarm sound configuration with:
 * - Critical and warning sound pattern selection
 * - Test button to play each sound pattern
 * - Responsive layout (stacked on mobile, horizontal on desktop)
 */

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { ThemeColors } from '../../../store/themeStore';
import { PlatformPicker, PlatformPickerItem } from '../inputs/PlatformPicker';
import { UniversalIcon } from '../../atoms/UniversalIcon';

export interface SoundPatternControlProps {
  /* Current sound pattern values */
  criticalPattern: string | undefined;
  warningPattern: string | undefined;

  /* Available sound patterns for picker */
  soundPatternItems: PlatformPickerItem[];

  /* Callbacks */
  onCriticalChange: (pattern: string) => void;
  onWarningChange: (pattern: string) => void;
  onTestSound: (pattern: string) => void;

  /* Layout control */
  isNarrow: boolean;

  /* Theme colors */
  theme: ThemeColors;
}

export const SoundPatternControl: React.FC<SoundPatternControlProps> = ({
  criticalPattern,
  warningPattern,
  soundPatternItems,
  onCriticalChange,
  onWarningChange,
  onTestSound,
  isNarrow,
  theme,
}) => {
  const renderSoundRow = (
    label: string,
    pattern: string | undefined,
    onChange: (pattern: string) => void,
    color: string,
    flex?: number,
  ) => (
    <View style={[styles.soundRow, flex ? { flex } : undefined]}>
      <Text style={[styles.soundLabel, { color }]}>{label}</Text>
      <View style={styles.pickerContainer}>
        <PlatformPicker
          label=""
          value={pattern || 'none'}
          onValueChange={(value) => onChange(String(value))}
          items={soundPatternItems}
        />
      </View>
      <TouchableOpacity
        style={[
          styles.testButton,
          {
            backgroundColor: color,
            borderColor: color,
          },
          pattern === 'none' && styles.testButtonDisabled,
        ]}
        onPress={() => onTestSound(pattern || 'none')}
        disabled={pattern === 'none'}
      >
        <UniversalIcon
          name="volume-high-outline"
          size={20}
          color={pattern === 'none' ? theme.textSecondary : theme.textInverse}
        />
      </TouchableOpacity>
    </View>
  );

  if (isNarrow) {
    return (
      <View style={styles.containerMobile}>
        {renderSoundRow('Critical:', criticalPattern, onCriticalChange, theme.error)}
        {renderSoundRow('Warning:', warningPattern, onWarningChange, theme.warning)}
      </View>
    );
  }

  return (
    <View style={styles.containerDesktop}>
      {renderSoundRow('Critical:', criticalPattern, onCriticalChange, theme.error, 1)}
      {renderSoundRow('Warning:', warningPattern, onWarningChange, theme.warning, 1)}
    </View>
  );
};

const styles = StyleSheet.create({
  containerMobile: {
    marginTop: 16,
    gap: 12,
  },
  containerDesktop: {
    marginTop: 16,
    flexDirection: 'row',
    gap: 16,
  },
  soundRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  soundLabel: {
    flex: 0,
    minWidth: 80,
    fontWeight: '600',
  },
  pickerContainer: {
    flex: 1,
  },
  testButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
  },
  testButtonDisabled: {
    opacity: 0.3,
  },
});
