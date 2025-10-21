/**
 * LanguageSelector - Language preference selection component
 * 
 * Allows users to change the app language from a list of supported languages
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Modal,
  ActivityIndicator,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../theme';
import { typography as designTypography } from '../../theme/designTokens';
import {
  SUPPORTED_LANGUAGES,
  changeLanguage,
  getCurrentLanguage,
  type LanguageCode,
} from '../../i18n/config';

interface LanguageSelectorProps {
  visible: boolean;
  onClose: () => void;
  onLanguageChanged?: (language: LanguageCode) => void;
}

export const LanguageSelector: React.FC<LanguageSelectorProps> = ({
  visible,
  onClose,
  onLanguageChanged,
}) => {
  const { t } = useTranslation();
  const { colors, spacing, fontSize, fontWeight } = useTheme();
  const [currentLanguage, setCurrentLanguage] = useState<string>(getCurrentLanguage());
  const [changing, setChanging] = useState(false);

  const handleLanguageSelect = async (languageCode: LanguageCode) => {
    if (languageCode === currentLanguage) {
      onClose();
      return;
    }

    setChanging(true);
    try {
      await changeLanguage(languageCode);
      setCurrentLanguage(languageCode);
      onLanguageChanged?.(languageCode);
      
      // Small delay to show the change visually
      setTimeout(() => {
        setChanging(false);
        onClose();
      }, 300);
    } catch (error) {
      console.error('[LanguageSelector] Failed to change language:', error);
      setChanging(false);
    }
  };

  const styles = StyleSheet.create({
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      justifyContent: 'center',
      alignItems: 'center',
    },
    modalContent: {
      backgroundColor: colors.surface,
      borderRadius: spacing.md,
      width: '80%',
      maxHeight: '70%',
      overflow: 'hidden',
    },
    header: {
      padding: spacing.lg,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
      backgroundColor: colors.background,
    },
    headerTitle: {
      fontSize: designTypography.fontSize['2xl'],
      fontWeight: designTypography.fontWeight.semibold as any,
      color: colors.text,
      textAlign: 'center',
    },
    languageList: {
      padding: spacing.md,
    },
    languageItem: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: spacing.lg,
      borderRadius: spacing.sm,
      marginBottom: spacing.sm,
      backgroundColor: colors.background,
      borderWidth: 2,
      borderColor: 'transparent',
    },
    languageItemSelected: {
      borderColor: colors.primary,
      backgroundColor: colors.surface,
      opacity: 0.95,
    },
    languageInfo: {
      flex: 1,
    },
    languageName: {
      fontSize: designTypography.fontSize.lg,
      fontWeight: designTypography.fontWeight.semibold as any,
      color: colors.text,
      marginBottom: spacing.xs,
    },
    languageNativeName: {
      fontSize: designTypography.fontSize.sm,
      color: colors.textSecondary,
    },
    checkmark: {
      fontSize: designTypography.fontSize['2xl'],
      color: colors.primary,
      marginLeft: spacing.md,
    },
    loadingContainer: {
      padding: spacing.xl,
      alignItems: 'center',
    },
    loadingText: {
      fontSize: designTypography.fontSize.base,
      color: colors.textSecondary,
      marginTop: spacing.md,
    },
    closeButton: {
      padding: spacing.lg,
      borderTopWidth: 1,
      borderTopColor: colors.border,
      backgroundColor: colors.background,
    },
    closeButtonText: {
      fontSize: designTypography.fontSize.base,
      fontWeight: designTypography.fontWeight.semibold as any,
      color: colors.textSecondary,
      textAlign: 'center',
    },
  });

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.header}>
            <Text style={styles.headerTitle}>
              {t('settings.language.select')}
            </Text>
          </View>

          {changing ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={colors.primary} />
              <Text style={styles.loadingText}>
                {t('common.loading')}
              </Text>
            </View>
          ) : (
            <>
              <ScrollView style={styles.languageList}>
                {SUPPORTED_LANGUAGES.map((language) => {
                  const isSelected = language.code === currentLanguage;
                  return (
                    <TouchableOpacity
                      key={language.code}
                      style={[
                        styles.languageItem,
                        isSelected && styles.languageItemSelected,
                      ]}
                      onPress={() => handleLanguageSelect(language.code)}
                      activeOpacity={0.7}
                    >
                      <View style={styles.languageInfo}>
                        <Text style={styles.languageName}>
                          {language.nativeName}
                        </Text>
                        <Text style={styles.languageNativeName}>
                          {language.name}
                        </Text>
                      </View>
                      {isSelected && <Text style={styles.checkmark}>✓</Text>}
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>

              <TouchableOpacity
                style={styles.closeButton}
                onPress={onClose}
                activeOpacity={0.7}
              >
                <Text style={styles.closeButtonText}>
                  {t('common.close')}
                </Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>
    </Modal>
  );
};

/**
 * Inline language selector (for use in settings screens)
 */
export const InlineLanguageSelector: React.FC<{
  onLanguageChanged?: (language: LanguageCode) => void;
}> = ({ onLanguageChanged }) => {
  const { t } = useTranslation();
  const { colors, spacing } = useTheme();
  const [currentLanguage, setCurrentLanguage] = useState<string>(getCurrentLanguage());

  const handleLanguageSelect = async (languageCode: LanguageCode) => {
    if (languageCode === currentLanguage) {
      return;
    }

    try {
      await changeLanguage(languageCode);
      setCurrentLanguage(languageCode);
      onLanguageChanged?.(languageCode);
    } catch (error) {
      console.error('[InlineLanguageSelector] Failed to change language:', error);
    }
  };

  const styles = StyleSheet.create({
    container: {
      padding: spacing.md,
    },
    title: {
      fontSize: designTypography.fontSize.xl,
      fontWeight: designTypography.fontWeight.semibold as any,
      color: colors.text,
      marginBottom: spacing.md,
    },
    languageList: {
      gap: spacing.sm,
    },
    languageItem: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: spacing.md,
      borderRadius: spacing.sm,
      backgroundColor: colors.surface,
      borderWidth: 2,
      borderColor: 'transparent',
    },
    languageItemSelected: {
      borderColor: colors.primary,
      backgroundColor: colors.surface,
      opacity: 0.95,
    },
    languageInfo: {
      flex: 1,
    },
    languageName: {
      fontSize: designTypography.fontSize.base,
      fontWeight: designTypography.fontWeight.semibold as any,
      color: colors.text,
    },
    checkmark: {
      fontSize: designTypography.fontSize.base,
      color: colors.primary,
      marginLeft: spacing.md,
    },
  });

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{t('settings.language.title')}</Text>
      <View style={styles.languageList}>
        {SUPPORTED_LANGUAGES.map((language) => {
          const isSelected = language.code === currentLanguage;
          return (
            <TouchableOpacity
              key={language.code}
              style={[
                styles.languageItem,
                isSelected && styles.languageItemSelected,
              ]}
              onPress={() => handleLanguageSelect(language.code)}
              activeOpacity={0.7}
            >
              <View style={styles.languageInfo}>
                <Text style={styles.languageName}>
                  {language.nativeName} ({language.name})
                </Text>
              </View>
              {isSelected && <Text style={styles.checkmark}>✓</Text>}
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
};
