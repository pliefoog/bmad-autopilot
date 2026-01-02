/**
 * PlatformPicker Component
 * Story 13.2.2 - Task 3: Platform-appropriate selection UI
 *
 * Features:
 * - iOS: Native picker sheet (slides up from bottom)
 * - Android: Native picker dropdown
 * - Web: Custom dropdown menu with keyboard navigation
 * - Multi-column picker support
 * - Icon support in picker items
 * - Theme integration
 */

import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  StyleSheet,
  Platform,
  ScrollView,
  FlatList,
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { useTheme } from '../../../store/themeStore';
import { settingsTokens } from '../../../theme/settingsTokens';
import { UniversalIcon } from '../../atoms/UniversalIcon';
import { useTouchTargetSize, useHapticFeedback } from '../../../hooks';
import { hasKeyboard } from '../../../utils/platformDetection';

/**
 * Picker item definition
 */
export interface PlatformPickerItem {
  /** Display label */
  label: string;

  /** Item value */
  value: string | number;

  /** Optional icon name */
  icon?: string;
}

/**
 * PlatformPicker Props
 */
export interface PlatformPickerProps {
  /** Current selected value */
  value: string | number;

  /** Change handler */
  onValueChange: (value: string | number) => void;

  /** Picker items */
  items: PlatformPickerItem[];

  /** Optional label */
  label?: string;

  /** Placeholder text when no value selected */
  placeholder?: string;

  /** Disabled state */
  disabled?: boolean;

  /** Multi-column support (not implemented yet - future) */
  multiColumn?: boolean;

  /** Test ID for testing */
  testID?: string;
}

/**
 * Web Dropdown Component
 * Used when Platform.OS === 'web'
 */
const WebDropdown: React.FC<{
  value: string | number;
  items: PlatformPickerItem[];
  onValueChange: (value: string | number) => void;
  theme: ReturnType<typeof useTheme>;
  touchTargetSize: number;
  testID: string;
}> = ({ value, items, onValueChange, theme, touchTargetSize, testID }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [buttonLayout, setButtonLayout] = useState({ x: 0, y: 0, width: 0, height: 0 });
  const buttonRef = useRef<View>(null);
  const keyboardEnabled = hasKeyboard();

  const selectedItem = items.find((item) => item.value === value);

  /**
   * Handle dropdown toggle with button position measurement
   */
  const handleToggle = useCallback(() => {
    if (!isOpen && buttonRef.current) {
      buttonRef.current.measure((x, y, width, height, pageX, pageY) => {
        setButtonLayout({ x: pageX, y: pageY, width, height });
        setIsOpen(true);
      });
    } else {
      setIsOpen(false);
    }
  }, [isOpen]);

  /**
   * Handle keyboard navigation (↑↓ arrow keys)
   */
  const handleKeyDown = useCallback(
    (event: any) => {
      if (!isOpen || !keyboardEnabled) return;

      switch (event.key) {
        case 'ArrowUp':
          event.preventDefault();
          setSelectedIndex((prev) => Math.max(0, prev - 1));
          break;
        case 'ArrowDown':
          event.preventDefault();
          setSelectedIndex((prev) => Math.min(items.length - 1, prev + 1));
          break;
        case 'Enter':
          event.preventDefault();
          onValueChange(items[selectedIndex].value);
          setIsOpen(false);
          break;
        case 'Escape':
          event.preventDefault();
          setIsOpen(false);
          break;
      }
    },
    [isOpen, selectedIndex, items, onValueChange, keyboardEnabled],
  );

  useEffect(() => {
    if (isOpen && keyboardEnabled && typeof window !== 'undefined') {
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }
  }, [isOpen, handleKeyDown, keyboardEnabled]);

  return (
    <>
      <View ref={buttonRef} style={webDropdownStyles.container}>
        <TouchableOpacity
          onPress={handleToggle}
          style={[
            webDropdownStyles.button,
            { height: touchTargetSize, borderColor: theme.border, backgroundColor: theme.surface },
          ]}
          testID={testID}
        >
          <Text style={[webDropdownStyles.buttonText, { color: theme.text }]}>
            {selectedItem?.label || 'Select...'}
          </Text>
          <UniversalIcon
            name={isOpen ? 'chevron-up-outline' : 'chevron-down-outline'}
            size={20}
            color={theme.text}
          />
        </TouchableOpacity>
      </View>

      {/* Dropdown in Modal - breaks out of ScrollView clipping */}
      <Modal
        visible={isOpen}
        transparent
        animationType="none"
        onRequestClose={() => setIsOpen(false)}
      >
        {/* Backdrop - close on click outside */}
        <TouchableOpacity
          style={webDropdownStyles.modalBackdrop}
          activeOpacity={1}
          onPress={() => setIsOpen(false)}
        >
          {/* Dropdown positioned below button */}
          <View
            style={[
              webDropdownStyles.dropdownModal,
              {
                top: buttonLayout.y + buttonLayout.height + 4,
                left: buttonLayout.x,
                width: buttonLayout.width,
                backgroundColor: theme.surface,
                borderColor: theme.border,
              },
            ]}
            onStartShouldSetResponder={() => true}
          >
            <ScrollView style={webDropdownStyles.dropdownScroll}>
              {items.map((item, index) => (
                <TouchableOpacity
                  key={item.value}
                  onPress={() => {
                    onValueChange(item.value);
                    setIsOpen(false);
                  }}
                  style={[
                    webDropdownStyles.dropdownItem,
                    { backgroundColor: theme.surface },
                    index === selectedIndex && { backgroundColor: theme.appBackground },
                    item.value === value && { backgroundColor: theme.primary + '20' },
                  ]}
                  testID={`${testID}-item-${item.value}`}
                >
                  {item.icon && (
                    <UniversalIcon
                      name={item.icon}
                      size={20}
                      color={theme.text}
                      style={webDropdownStyles.itemIcon}
                    />
                  )}
                  <Text style={[webDropdownStyles.dropdownItemText, { color: theme.text }]}>
                    {item.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>
    </>
  );
};

const webDropdownStyles = StyleSheet.create({
  container: {
    position: 'relative',
    zIndex: 1000,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: settingsTokens.spacing.md,
    borderWidth: 1,
    borderRadius: settingsTokens.borderRadius.input,
  },
  buttonText: {
    flex: 1,
    fontSize: settingsTokens.typography.body.fontSize,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  dropdownModal: {
    position: 'absolute',
    maxHeight: 200,
    borderWidth: 1,
    borderRadius: settingsTokens.borderRadius.input,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 8,
  },
  dropdownScroll: {
    maxHeight: 200,
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: settingsTokens.spacing.md,
    paddingVertical: settingsTokens.spacing.xs,
    minHeight: 36,
  },
  dropdownItemText: {
    fontSize: settingsTokens.typography.body.fontSize,
  },
  itemIcon: {
    marginRight: settingsTokens.spacing.sm,
  },
});

/**
 * Platform-appropriate picker component
 *
 * @example
 * <PlatformPicker
 *   label="Unit System"
 *   value={unitSystem}
 *   onValueChange={setUnitSystem}
 *   items={[
 *     { label: 'Metric', value: 'metric' },
 *     { label: 'Imperial', value: 'imperial' },
 *     { label: 'Nautical', value: 'nautical' },
 *   ]}
 * />
 */
export const PlatformPicker: React.FC<PlatformPickerProps> = ({
  value,
  onValueChange,
  items,
  label,
  placeholder = 'Select...',
  disabled = false,
  multiColumn = false,
  testID = 'platform-picker',
}) => {
  const theme = useTheme();
  const styles = React.useMemo(() => createStyles(theme), [theme]);
  const touchTargetSize = useTouchTargetSize();
  const haptics = useHapticFeedback();

  const [showPicker, setShowPicker] = useState(false);

  const selectedItem = items.find((item) => item.value === value);

  /**
   * Handle value change with haptic feedback
   */
  const handleValueChange = useCallback(
    (newValue: string | number) => {
      haptics.triggerLight();
      onValueChange(newValue);
      if (Platform.OS === 'ios') {
        // iOS picker stays open, close manually
        setTimeout(() => setShowPicker(false), 100);
      }
    },
    [onValueChange, haptics],
  );

  // iOS: Modal with native picker
  if (Platform.OS === 'ios') {
    return (
      <View style={styles.container} testID={testID}>
        {label && label.trim() !== '' ? <Text style={styles.label}>{label}</Text> : null}

        <TouchableOpacity
          onPress={() => !disabled && setShowPicker(true)}
          style={[styles.pickerButton, { height: touchTargetSize }, disabled && styles.disabled]}
          testID={`${testID}-button`}
        >
          <Text style={[styles.pickerButtonText, !selectedItem && styles.placeholder]}>
            {selectedItem?.label || placeholder}
          </Text>
          <UniversalIcon name="chevron-down-outline" size={20} color={theme.text} />
        </TouchableOpacity>

        <Modal
          visible={showPicker}
          transparent
          animationType="slide"
          onRequestClose={() => setShowPicker(false)}
        >
          <View style={styles.modalOverlay}>
            <TouchableOpacity
              style={styles.modalBackdrop}
              onPress={() => setShowPicker(false)}
              activeOpacity={1}
            />
            <View style={[styles.modalContent, { backgroundColor: theme.surface }]}>
              <View style={styles.modalHeader}>
                <TouchableOpacity onPress={() => setShowPicker(false)} style={styles.doneButton}>
                  <Text style={[styles.doneButtonText, { color: theme.primary }]}>Done</Text>
                </TouchableOpacity>
              </View>
              <Picker
                selectedValue={value}
                onValueChange={handleValueChange}
                testID={`${testID}-picker`}
              >
                {items.map((item) => (
                  <Picker.Item key={item.value} label={item.label} value={item.value} />
                ))}
              </Picker>
            </View>
          </View>
        </Modal>
      </View>
    );
  }

  // Android: Native picker (no modal needed)
  if (Platform.OS === 'android') {
    return (
      <View style={[styles.container, disabled && styles.disabled]} testID={testID}>
        {label && label.trim() !== '' ? <Text style={styles.label}>{label}</Text> : null}
        <View style={[styles.pickerContainer, { height: touchTargetSize }]}>
          <Picker
            selectedValue={value}
            onValueChange={handleValueChange}
            enabled={!disabled}
            style={styles.picker}
            testID={`${testID}-picker`}
          >
            {items.map((item) => (
              <Picker.Item key={item.value} label={item.label} value={item.value} />
            ))}
          </Picker>
        </View>
      </View>
    );
  }

  // Web: Custom dropdown
  return (
    <View style={[styles.container, disabled && styles.disabled]} testID={testID}>
      {label && label.trim() !== '' ? <Text style={styles.label}>{label}</Text> : null}
      <WebDropdown
        value={value}
        items={items}
        onValueChange={handleValueChange}
        theme={theme}
        touchTargetSize={touchTargetSize}
        testID={`${testID}-dropdown`}
      />
    </View>
  );
};

/**
 * Create themed styles
 */
const createStyles = (theme: ReturnType<typeof useTheme>) =>
  StyleSheet.create({
    container: {
      marginBottom: settingsTokens.spacing.md,
    },

    label: {
      fontSize: settingsTokens.typography.label.fontSize,
      fontWeight: settingsTokens.typography.label.fontWeight,
      color: theme.text,
      marginBottom: settingsTokens.spacing.xs,
    },

    pickerButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      backgroundColor: theme.surface,
      borderWidth: 1,
      borderColor: theme.border,
      borderRadius: settingsTokens.borderRadius.input,
      paddingHorizontal: settingsTokens.spacing.md,
    },

    pickerButtonText: {
      fontSize: settingsTokens.typography.body.fontSize,
      color: theme.text,
    },

    placeholder: {
      color: theme.textSecondary,
    },

    pickerContainer: {
      backgroundColor: theme.surface,
      borderWidth: 1,
      borderColor: theme.border,
      borderRadius: settingsTokens.borderRadius.input,
      justifyContent: 'center',
    },

    picker: {
      color: theme.text,
    },

    disabled: {
      opacity: 0.5,
    },

    // iOS Modal styles
    modalOverlay: {
      flex: 1,
      justifyContent: 'flex-end',
    },

    modalBackdrop: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
    },

    modalContent: {
      borderTopLeftRadius: settingsTokens.borderRadius.modal,
      borderTopRightRadius: settingsTokens.borderRadius.modal,
    },

    modalHeader: {
      flexDirection: 'row',
      justifyContent: 'flex-end',
      alignItems: 'center',
      paddingHorizontal: settingsTokens.spacing.lg,
      paddingVertical: settingsTokens.spacing.md,
      borderBottomWidth: 1,
      borderBottomColor: theme.border,
    },

    doneButton: {
      padding: settingsTokens.spacing.sm,
    },

    doneButtonText: {
      fontSize: settingsTokens.typography.body.fontSize,
      fontWeight: '600',
    },
  });
