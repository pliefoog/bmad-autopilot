/**
 * Base Settings Modal Component
 * Story 13.2.1 - Phase 3: BaseSettingsModal Component
 * Story 13.2.1 - Phase 4: Keyboard Navigation
 * Epic 8 - Phase 1: Cross-Platform Dialog Unification
 * 
 * Reusable foundation for all settings dialogs
 * Features:
 * - Platform-native presentation (iOS card, Android bottom sheet, TV centered)
 * - Cross-platform consistency (iOS, Android, Web, Desktop, TV)
 * - Keyboard navigation (Tab, Enter, Esc)
 * - TV remote navigation (D-pad, Siri Remote)
 * - Glove-friendly touch targets
 * - Theme integration (day, night, red-night)
 * - Dismissible/non-dismissible modes
 * - Focus trap for modal accessibility
 * - Viewing-distance-optimized typography
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
  Animated,
  InteractionManager,
} from 'react-native';

// iPad pointer interaction types
type PointerStyle = 'auto' | 'highlight' | 'lift';
import { useTheme, ThemeColors } from '../../../store/themeStore';
import { useSettingsStore } from '../../../store/settingsStore';
import { UniversalIcon } from '../../atoms/UniversalIcon';
import { 
  settingsTokens, 
  getButtonHeight, 
  getPlatformTokens 
} from '../../../theme/settingsTokens';
import {
  detectPlatform,
  hasKeyboard,
  isGloveMode,
  isTablet,
  getPlatformVariant,
  isTV,
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
  onClose: () => void;
  onSave?: () => void;
  cancelButtonText?: string;
  saveButtonText?: string;
  theme: ThemeColors;
  styles: ReturnType<typeof createStyles>;
  tvMode?: boolean;
}

const SettingsFooter: React.FC<SettingsFooterProps> = ({
  onClose,
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
      <Pressable
        onPress={onClose}
        style={({ pressed }) => [
          styles.footerButton,
          styles.cancelButton,
          { height: buttonHeight },
          pressed && styles.buttonPressed,
        ]}
        accessibilityLabel={cancelButtonText || 'Cancel'}
        accessibilityRole="button"
        testID="settings-modal-cancel-button"
      >
        <Text 
          style={{
            fontSize: 16,
            fontWeight: '600',
            color: theme.text || '#000000',
            textAlign: 'center',
          }}
          allowFontScaling={false}
        >
          {cancelButtonText || 'Cancel'}
        </Text>
      </Pressable>
      
      {onSave && (
        <Pressable
          onPress={onSave}
          style={({ pressed }) => [
            styles.footerButton,
            styles.saveButton,
            { height: buttonHeight },
            pressed && styles.buttonPressed,
          ]}
          accessibilityLabel={saveButtonText}
          accessibilityRole="button"
          testID="settings-modal-save-button"
        >
          <Text 
            style={{
              fontSize: 16,
              fontWeight: '600',
              color: '#FFFFFF',
              textAlign: 'center',
            }}
            allowFontScaling={false}
          >
            {saveButtonText || 'Save'}
          </Text>
        </Pressable>
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
  const platformTokens = getPlatformTokens();
  const styles = React.useMemo(() => createStyles(theme, platformTokens), [theme, platformTokens]);
  
  const scrollViewRef = useRef<ScrollView>(null);
  const modalContentRef = useRef<View>(null);
  
  // Animation for TV modal entrance
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.95)).current;
  
  const platform = detectPlatform();
  const keyboardEnabled = hasKeyboard();
  const tvMode = isTV();

  /**
   * Animate modal entrance on TV platforms
   * Uses InteractionManager to defer animation after layout
   */
  useEffect(() => {
    if (!tvMode || !visible) {
      return;
    }

    // Reset animations
    fadeAnim.setValue(0);
    scaleAnim.setValue(0.95);

    // Defer animation until layout is complete
    const handle = InteractionManager.runAfterInteractions(() => {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: platformTokens.animations.modalEntrance,
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 1,
          duration: platformTokens.animations.modalEntrance,
          useNativeDriver: true,
        }),
      ]).start();
    });

    return () => handle.cancel();
  }, [visible, tvMode, fadeAnim, scaleAnim, platformTokens.animations.modalEntrance]);

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

  const tablet = isTablet();
  
  // iOS presentation styles based on device
  // iPad: 'formSheet' - centered, rounded corners, appropriate size
  // iPhone: 'pageSheet' - slides from bottom, dismissible by swipe
  const iOSPresentationStyle = tablet ? 'formSheet' : 'pageSheet';
  
  // Debug logging (disabled by default - logs 6 times per render)
  // console.log(`[BaseSettingsModal] tablet: ${tablet}, presentationStyle: ${iOSPresentationStyle}, Platform.isPad: ${Platform.isPad}`);
  
  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType={tvMode ? 'none' : 'fade'} // Custom animation for TV
      onRequestClose={handleRequestClose}
      statusBarTranslucent={Platform.OS === 'android'}
      // @ts-ignore - presentationStyle exists on iOS
      presentationStyle={
        Platform.OS === 'ios' && !tvMode 
          ? iOSPresentationStyle
          : undefined
      }
      testID={testID}
    >
      {/* Only render backdrop for Android/TV - iOS pageSheet provides its own */}
      {Platform.OS === 'ios' && !tvMode ? (
        // iOS pageSheet - no backdrop needed, direct content
        <KeyboardAvoidingView
          behavior="padding"
          style={styles.keyboardAvoidingView}
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
            >
              {children}
            </ScrollView>

            {/* Footer */}
            {showFooter && (
              <SettingsFooter
                theme={theme}
                styles={styles}
                tvMode={tvMode}
                onClose={onClose}
                onSave={onSave}
              />
            )}
          </View>
        </KeyboardAvoidingView>
      ) : (
        // Android/TV/Web - use backdrop
        <Pressable
          style={styles.backdrop}
          onPress={handleBackdropPress}
          testID={`${testID}-backdrop`}
        >
          {/* Modal Container - KeyboardAvoidingView for other platforms */}
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={styles.keyboardAvoidingView}
          >
            {/* Prevent backdrop press from propagating to modal content */}
            <Animated.View
              style={[
                styles.modalContainer,
                tvMode && {
                  opacity: fadeAnim,
                  transform: [{ scale: scaleAnim }],
                },
              ]}
            >
              <Pressable
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
                  >
                    {children}
                  </ScrollView>

                  {/* Footer */}
                  {showFooter && (
                    <SettingsFooter
                      theme={theme}
                      styles={styles}
                      tvMode={tvMode}
                      onClose={onClose}
                      onSave={onSave}
                    />
                  )}
                </View>
              </Pressable>
            </Animated.View>
          </KeyboardAvoidingView>
        </Pressable>
      )}
    </Modal>
  );
};

/**
 * Create styles for BaseSettingsModal
 * Theme-aware styling for day, night, and red-night modes
 * Platform-native presentation (iOS HIG, Material Design 3, TV optimized)
 */
function createStyles(theme: ThemeColors, platformTokens: ReturnType<typeof getPlatformTokens>) {
  const variant = getPlatformVariant();
  const tvMode = isTV();
  const tablet = isTablet();
  
  // Get platform-specific modal styles
  const modalStyle = platformTokens.modal;
  
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
      // Platform-specific width (not used for iOS native presentation)
      ...(Platform.OS !== 'ios' && modalStyle.width && {
        width: modalStyle.width,
      }),
      maxWidth: modalStyle.maxWidth || settingsTokens.modal.maxWidth,
      maxHeight: modalStyle.maxHeight || settingsTokens.modal.maxHeight,
      minHeight: settingsTokens.modal.minHeight,
      // Platform-specific margins (iOS phone insets)
      ...(variant === 'ios-phone' && !tvMode && {
        marginHorizontal: modalStyle.marginHorizontal,
        marginVertical: modalStyle.marginVertical,
      }),
    },
    modalContent: {
      // iOS formSheet/pageSheet handle outer sizing, but we constrain inner content
      width: '100%',
      maxWidth: Platform.OS === 'ios' && tablet ? 540 : undefined,
      alignSelf: 'center',
      backgroundColor: theme.surface,
      borderRadius: modalStyle.borderRadius,
      overflow: 'hidden',
      // Platform-specific shadows
      ...(!tvMode && modalStyle.shadow && modalStyle.shadow),
      // Android elevation (Material Design)
      ...(Platform.OS === 'android' && !tvMode && modalStyle.elevation && {
        elevation: modalStyle.elevation,
      }),
      // TV focus border
      ...(tvMode && modalStyle.focusBorder && {
        borderWidth: modalStyle.focusBorder.width,
        borderColor: theme.interactive, // Theme-aware focus color
      }),
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      height: settingsTokens.layout.headerHeight * platformTokens.viewingDistanceScale,
      paddingHorizontal: platformTokens.spacing.inset,
      backgroundColor: theme.background,
      borderBottomWidth: 1,
      borderBottomColor: theme.border,
    },
    title: {
      flex: 1,
      fontSize: platformTokens.typography.title.fontSize,
      fontWeight: platformTokens.typography.title.fontWeight,
      lineHeight: platformTokens.typography.title.lineHeight,
      color: theme.text,
      fontFamily: platformTokens.typography.fontFamily,
    },
    closeButton: {
      justifyContent: 'center',
      alignItems: 'center',
      borderRadius: settingsTokens.borderRadius.button,
      marginLeft: platformTokens.spacing.section,
      // iPad cursor support
      ...Platform.select({
        ios: {
          cursor: 'pointer' as any,
        },
      }),
    },
    contentScrollView: {
      // Let content determine height naturally for iOS formSheet/pageSheet
      flexGrow: 0,
      flexShrink: 1,
    },
    contentContainer: {
      // iOS: Use system spacing (16-20pt) for grouped lists
      // Android: Use Material spacing (16-24pt)
      paddingHorizontal: Platform.OS === 'ios' ? (tablet ? 20 : 16) : platformTokens.spacing.inset,
      paddingVertical: platformTokens.spacing.section,
    },
    footer: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'flex-end',
      height: settingsTokens.layout.footerHeight * platformTokens.viewingDistanceScale,
      paddingHorizontal: platformTokens.spacing.inset,
      paddingVertical: platformTokens.spacing.row,
      backgroundColor: theme.background,
      borderTopWidth: 1,
      borderTopColor: theme.border,
      gap: platformTokens.spacing.row,
    },
    footerButton: {
      flex: 1,
      maxWidth: 150,
      justifyContent: 'center',
      alignItems: 'center',
      borderRadius: settingsTokens.borderRadius.button,
      // Platform-specific shadows
      ...Platform.select({
        ios: {
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.1,
          shadowRadius: 4,
        },
        android: {
          elevation: 2,
        },
        default: {
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.1,
          shadowRadius: 4,
        },
      }),
      // iPad cursor support
      ...Platform.select({
        ios: {
          cursor: 'pointer' as any,
        },
      }),
    },
    buttonPressed: {
      opacity: 0.7,
      transform: [{ scale: 0.98 }],
    },
    cancelButton: {
      backgroundColor: theme.surface,
      borderWidth: 1,
      borderColor: theme.border,
    },
    cancelButtonText: {
      fontSize: platformTokens.typography.label.fontSize,
      fontWeight: platformTokens.typography.label.fontWeight as any,
      color: theme.text,
      textAlign: 'center' as const,
      // Explicit font family only if available
      ...(Platform.OS === 'ios' && {
        fontFamily: 'System',
      }),
      ...(Platform.OS === 'android' && {
        fontFamily: 'Roboto',
      }),
    },
    saveButton: {
      backgroundColor: theme.interactive,
    },
    saveButtonText: {
      fontSize: platformTokens.typography.label.fontSize,
      fontWeight: platformTokens.typography.label.fontWeight as any,
      color: '#FFFFFF',
      textAlign: 'center' as const,
      // Explicit font family only if available
      ...(Platform.OS === 'ios' && {
        fontFamily: 'System',
      }),
      ...(Platform.OS === 'android' && {
        fontFamily: 'Roboto',
      }),
    },
  });
}
