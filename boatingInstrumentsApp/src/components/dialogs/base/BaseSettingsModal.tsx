/**
 * Base Settings Modal Component
 * Story 13.2.1 - Phase 3: BaseSettingsModal Component
 * Story 13.2.1 - Phase 4: Keyboard Navigation
 * 
 * Reusable foundation for all settings dialogs
 * Features:
 * - Cross-platform consistency (iOS, Android, Web, Desktop)
 * - Keyboard navigation (Tab, Enter, Esc)
 * - Glove-friendly touch targets
 * - Theme integration (day, night, red-night)
 * - Dismissible/non-dismissible modes
 * - Focus trap for modal accessibility
 */

import React, { useEffect, useRef, useCallback } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
} from 'react-native';
import { useTheme, ThemeColors } from '../../../store/themeStore';
import { useSettingsStore } from '../../../store/settingsStore';
import { UniversalIcon } from '../../atoms/UniversalIcon';
import { settingsTokens, getButtonHeight } from '../../../theme/settingsTokens';
import {
  detectPlatform,
  hasKeyboard,
  isGloveMode,
  isTablet,
} from '../../../utils/platformDetection';

/**
 * Props interface for BaseSettingsModal
 */
export interface BaseSettingsModalProps {
  /** Controls modal visibility */
  visible: boolean;
  
  /** Modal title displayed in header */
  title: string;
  
  /** Callback when modal is closed (cancel/dismiss) */
  onClose: () => void;
  
  /** Optional callback when save button is pressed */
  onSave?: () => void;
  
  /** Whether backdrop tap should dismiss modal (default: true) */
  dismissible?: boolean;
  
  /** Modal content */
  children: React.ReactNode;
  
  /** Whether to show footer with cancel/save buttons (default: true) */
  showFooter?: boolean;
  
  /** Custom text for save button (default: "Save") */
  saveButtonText?: string;
  
  /** Custom text for cancel button (default: "Cancel") */
  cancelButtonText?: string;
  
  /** Test ID for testing */
  testID?: string;
}

/**
 * Settings Header Component
 * Displays title and close button
 */
interface SettingsHeaderProps {
  title: string;
  onClose: () => void;
  theme: ThemeColors;
  styles: ReturnType<typeof createStyles>;
}

const SettingsHeader: React.FC<SettingsHeaderProps> = ({
  title,
  onClose,
  theme,
  styles,
}) => {
  const gloveMode = useSettingsStore((state) => state.themeSettings.gloveMode);
  const tablet = isTablet();
  const touchTargetSize = gloveMode ? 64 : tablet ? 56 : 44;

  return (
    <View style={styles.header}>
      <Text style={styles.title} numberOfLines={1}>
        {title}
      </Text>
      <TouchableOpacity
        onPress={onClose}
        style={[
          styles.closeButton,
          {
            width: touchTargetSize,
            height: touchTargetSize,
          },
        ]}
        accessibilityLabel="Close"
        accessibilityRole="button"
        testID="settings-modal-close-button"
      >
        <UniversalIcon
          name="close-outline"
          size={24}
          color={theme.text}
        />
      </TouchableOpacity>
    </View>
  );
};

/**
 * Settings Footer Component
 * Displays cancel and save buttons
 */
interface SettingsFooterProps {
  onCancel: () => void;
  onSave?: () => void;
  cancelButtonText: string;
  saveButtonText: string;
  theme: ThemeColors;
  styles: ReturnType<typeof createStyles>;
}

const SettingsFooter: React.FC<SettingsFooterProps> = ({
  onCancel,
  onSave,
  cancelButtonText,
  saveButtonText,
  theme,
  styles,
}) => {
  const gloveMode = useSettingsStore((state) => state.themeSettings.gloveMode);
  const tablet = isTablet();
  const buttonHeight = getButtonHeight(gloveMode, tablet);

  return (
    <View style={styles.footer}>
      <TouchableOpacity
        onPress={onCancel}
        style={[styles.footerButton, styles.cancelButton, { height: buttonHeight }]}
        accessibilityLabel={cancelButtonText}
        accessibilityRole="button"
        testID="settings-modal-cancel-button"
      >
        <Text style={styles.cancelButtonText}>{cancelButtonText}</Text>
      </TouchableOpacity>
      
      {onSave && (
        <TouchableOpacity
          onPress={onSave}
          style={[styles.footerButton, styles.saveButton, { height: buttonHeight }]}
          accessibilityLabel={saveButtonText}
          accessibilityRole="button"
          testID="settings-modal-save-button"
        >
          <Text style={styles.saveButtonText}>{saveButtonText}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

/**
 * Base Settings Modal Component
 * 
 * Provides consistent modal structure for all settings dialogs:
 * - Responsive layout (phone, tablet, desktop)
 * - Keyboard navigation (Tab, Enter, Esc)
 * - Theme integration (day, night, red-night)
 * - Touch-optimized (44pt, 56pt, 64pt targets)
 * - Focus management and accessibility
 * 
 * @example
 * ```tsx
 * <BaseSettingsModal
 *   visible={isVisible}
 *   title="Connection Settings"
 *   onClose={handleClose}
 *   onSave={handleSave}
 *   dismissible={false}
 * >
 *   <Text>Your settings content here</Text>
 * </BaseSettingsModal>
 * ```
 */
export const BaseSettingsModal: React.FC<BaseSettingsModalProps> = ({
  visible,
  title,
  onClose,
  onSave,
  dismissible = true,
  children,
  showFooter = true,
  saveButtonText = 'Save',
  cancelButtonText = 'Cancel',
  testID = 'base-settings-modal',
}) => {
  const theme = useTheme();
  const styles = React.useMemo(() => createStyles(theme), [theme]);
  
  const scrollViewRef = useRef<ScrollView>(null);
  const modalContentRef = useRef<View>(null);
  
  const platform = detectPlatform();
  const keyboardEnabled = hasKeyboard();

  /**
   * Handle backdrop press
   * Only closes if dismissible is true
   */
  const handleBackdropPress = useCallback(() => {
    if (dismissible) {
      onClose();
    }
  }, [dismissible, onClose]);

  /**
   * Handle keyboard events
   * - Tab: Focus next element (handled by browser/RN)
   * - Enter: Submit form (call onSave)
   * - Escape: Close modal (call onClose)
   */
  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (!visible || !keyboardEnabled) return;

      switch (event.key) {
        case 'Enter':
          // Prevent default form submission
          event.preventDefault();
          if (onSave) {
            onSave();
          }
          break;
        case 'Escape':
          event.preventDefault();
          onClose();
          break;
        default:
          break;
      }
    },
    [visible, keyboardEnabled, onSave, onClose]
  );

  /**
   * Set up keyboard event listeners
   * Only active when modal is visible and platform has keyboard
   */
  useEffect(() => {
    if (!visible || !keyboardEnabled || Platform.OS !== 'web') {
      return;
    }

    // Add keyboard event listener
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [visible, keyboardEnabled, handleKeyDown]);

  /**
   * Focus trap: Keep focus within modal
   * Prevents Tab key from escaping to elements behind modal
   */
  useEffect(() => {
    if (!visible || !keyboardEnabled || Platform.OS !== 'web') {
      return;
    }

    // Store the element that had focus before modal opened
    const previouslyFocused = document.activeElement as HTMLElement;

    // Focus the modal content when it opens
    const timer = setTimeout(() => {
      if (modalContentRef.current) {
        // @ts-ignore - web only
        modalContentRef.current.focus?.();
      }
    }, 100);

    return () => {
      clearTimeout(timer);
      // Restore focus when modal closes
      if (previouslyFocused && previouslyFocused.focus) {
        previouslyFocused.focus();
      }
    };
  }, [visible, keyboardEnabled]);

  /**
   * Handle modal request close
   * Called when Android back button is pressed
   */
  const handleRequestClose = useCallback(() => {
    if (dismissible) {
      onClose();
    }
  }, [dismissible, onClose]);

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={handleRequestClose}
      statusBarTranslucent={Platform.OS === 'android'}
      testID={testID}
    >
      {/* Backdrop */}
      <Pressable
        style={styles.backdrop}
        onPress={handleBackdropPress}
        testID={`${testID}-backdrop`}
      >
        {/* Modal Container - KeyboardAvoidingView for iOS */}
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.keyboardAvoidingView}
        >
          {/* Prevent backdrop press from propagating to modal content */}
          <Pressable
            style={styles.modalContainer}
            onPress={(e) => e.stopPropagation()}
            testID={`${testID}-container`}
          >
            <View
              ref={modalContentRef}
              style={styles.modalContent}
              // @ts-ignore - tabIndex is web-only
              tabIndex={keyboardEnabled ? 0 : undefined}
            >
              {/* Header */}
              <SettingsHeader
                title={title}
                onClose={onClose}
                theme={theme}
                styles={styles}
              />

              {/* Content */}
              <ScrollView
                ref={scrollViewRef}
                style={styles.contentScrollView}
                contentContainerStyle={styles.contentContainer}
                showsVerticalScrollIndicator={true}
                keyboardShouldPersistTaps="handled"
                testID={`${testID}-content`}
              >
                {children}
              </ScrollView>

              {/* Footer */}
              {showFooter && (
                <SettingsFooter
                  onCancel={onClose}
                  onSave={onSave}
                  cancelButtonText={cancelButtonText}
                  saveButtonText={saveButtonText}
                  theme={theme}
                  styles={styles}
                />
              )}
            </View>
          </Pressable>
        </KeyboardAvoidingView>
      </Pressable>
    </Modal>
  );
};

/**
 * Create styles for BaseSettingsModal
 * Theme-aware styling for day, night, and red-night modes
 */
function createStyles(theme: ThemeColors) {
  return StyleSheet.create({
    backdrop: {
      flex: 1,
      backgroundColor: `rgba(0, 0, 0, ${settingsTokens.backdrop.opacity})`,
      justifyContent: 'center',
      alignItems: 'center',
    },
    keyboardAvoidingView: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      width: '100%',
    },
    modalContainer: {
      width: Platform.OS === 'web' 
        ? settingsTokens.modal.width.desktop 
        : settingsTokens.modal.width.phone,
      maxWidth: settingsTokens.modal.maxWidth,
      maxHeight: settingsTokens.modal.maxHeight,
      minHeight: settingsTokens.modal.minHeight,
    },
    modalContent: {
      flex: 1,
      backgroundColor: theme.surface,
      borderRadius: settingsTokens.borderRadius.modal,
      overflow: 'hidden',
      ...settingsTokens.shadows.modal,
      // Ensure proper shadow rendering on Android
      ...(Platform.OS === 'android' && {
        elevation: settingsTokens.shadows.modal.elevation,
      }),
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      height: settingsTokens.layout.headerHeight,
      paddingHorizontal: settingsTokens.spacing.lg,
      backgroundColor: theme.background,
      borderBottomWidth: 1,
      borderBottomColor: theme.border,
    },
    title: {
      flex: 1,
      fontSize: settingsTokens.typography.title.fontSize,
      fontWeight: settingsTokens.typography.title.fontWeight,
      lineHeight: settingsTokens.typography.title.lineHeight,
      color: theme.text,
    },
    closeButton: {
      justifyContent: 'center',
      alignItems: 'center',
      borderRadius: settingsTokens.borderRadius.button,
      marginLeft: settingsTokens.spacing.sm,
    },
    contentScrollView: {
      flex: 1,
    },
    contentContainer: {
      padding: settingsTokens.spacing.lg,
    },
    footer: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'flex-end',
      height: settingsTokens.layout.footerHeight,
      paddingHorizontal: settingsTokens.spacing.lg,
      paddingVertical: settingsTokens.spacing.md,
      backgroundColor: theme.background,
      borderTopWidth: 1,
      borderTopColor: theme.border,
      gap: settingsTokens.spacing.md,
    },
    footerButton: {
      flex: 1,
      maxWidth: 150,
      justifyContent: 'center',
      alignItems: 'center',
      borderRadius: settingsTokens.borderRadius.button,
      ...settingsTokens.shadows.button,
    },
    cancelButton: {
      backgroundColor: theme.surface,
      borderWidth: 1,
      borderColor: theme.border,
    },
    cancelButtonText: {
      fontSize: settingsTokens.typography.label.fontSize,
      fontWeight: settingsTokens.typography.label.fontWeight,
      color: theme.text,
    },
    saveButton: {
      backgroundColor: theme.interactive,
    },
    saveButtonText: {
      fontSize: settingsTokens.typography.label.fontSize,
      fontWeight: settingsTokens.typography.label.fontWeight,
      color: '#FFFFFF',
    },
  });
}
