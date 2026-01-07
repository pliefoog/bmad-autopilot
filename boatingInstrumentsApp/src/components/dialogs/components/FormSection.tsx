/**
 * FormSection Component
 *
 * Reusable collapsible form section with:
 * - AsyncStorage persistence of collapsed state
 * - Platform-optimized layouts (1-3 columns)
 * - Loading states with skeleton screens
 * - Error summary display
 * - Performance optimizations (React.memo, useCallback, useMemo)
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Platform,
  ActivityIndicator,
  ScrollView,
  Dimensions,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme, ThemeColors } from '../../../store/themeStore';
import { UniversalIcon } from '../../atoms/UniversalIcon';
import { getPlatformTokens } from '../../../theme/settingsTokens';

export interface FormSectionProps {
  /** Unique ID for this section (used for persistence) */
  sectionId: string;

  /** Dialog ID to namespace persistence keys */
  dialogId: string;

  /** Section title */
  title: string;

  /** Optional subtitle/description */
  subtitle?: string;

  /** Child form fields */
  children: React.ReactNode;

  /** Default collapsed state (if not persisted) */
  defaultCollapsed?: boolean;

  /** Loading state (show skeleton) */
  loading?: boolean;

  /** Error messages to display */
  errors?: string[];

  /** Number of columns for layout (1-3) */
  columns?: 1 | 2 | 3;

  /** Test ID for automated testing */
  testID?: string;
}

/**
 * FormSection Component
 *
 * Provides collapsible sections with persistence, responsive layouts,
 * and error feedback.
 */
export const FormSection: React.FC<FormSectionProps> = React.memo(
  ({
    sectionId,
    dialogId,
    title,
    subtitle,
    children,
    defaultCollapsed = false,
    loading = false,
    errors = [],
    columns = 1,
    testID,
  }) => {
    const theme = useTheme();
    const platformTokens = getPlatformTokens();
    const styles = useMemo(() => createStyles(theme, columns, platformTokens), [theme, columns, platformTokens]);

    const [collapsed, setCollapsed] = useState(defaultCollapsed);
    const [persistenceLoaded, setPersistenceLoaded] = useState(false);

    // Persistence key
    const persistenceKey = useMemo(
      () => `config_dialog_sections_${dialogId}_${sectionId}`,
      [dialogId, sectionId],
    );

    /**
     * Load collapsed state from AsyncStorage
     */
    useEffect(() => {
      const loadCollapsedState = async () => {
        try {
          const stored = await AsyncStorage.getItem(persistenceKey);
          if (stored !== null) {
            setCollapsed(stored === 'true');
          }
          setPersistenceLoaded(true);
        } catch (error) {
          console.warn(`Failed to load collapsed state for ${persistenceKey}:`, error);
          setPersistenceLoaded(true);
        }
      };

      loadCollapsedState();
    }, [persistenceKey]);

    /**
     * Toggle collapsed state and persist
     */
    const handleToggle = useCallback(async () => {
      const newCollapsed = !collapsed;
      setCollapsed(newCollapsed);

      try {
        await AsyncStorage.setItem(persistenceKey, String(newCollapsed));
      } catch (error) {
        console.warn(`Failed to persist collapsed state for ${persistenceKey}:`, error);
      }
    }, [collapsed, persistenceKey]);

    /**
     * Render skeleton screen during loading
     */
    const renderSkeleton = useCallback(
      () => (
        <View style={styles.skeletonContainer}>
          {[...Array(3)].map((_, index) => (
            <View key={index} style={styles.skeletonRow}>
              <View
                style={[
                  styles.skeletonBar,
                  styles.skeletonLabel,
                  { backgroundColor: theme.border },
                ]}
              />
              <View
                style={[
                  styles.skeletonBar,
                  styles.skeletonInput,
                  { backgroundColor: theme.border },
                ]}
              />
            </View>
          ))}
        </View>
      ),
      [styles, theme],
    );

    /**
     * Render error summary
     */
    const renderErrors = useCallback(() => {
      if (errors.length === 0) return null;

      return (
        <View
          style={[
            styles.errorSummary,
            { backgroundColor: `${theme.error}15`, borderColor: theme.error },
          ]}
        >
          <UniversalIcon name="alert-circle" size={16} color={theme.error} />
          <View style={styles.errorTextContainer}>
            {errors.map((error, index) => (
              <Text key={index} style={[styles.errorText, { color: theme.error }]}>
                {error}
              </Text>
            ))}
          </View>
        </View>
      );
    }, [errors, styles, theme]);

    // Don't render until persistence is loaded (prevents flash)
    if (!persistenceLoaded) {
      return (
        <View style={styles.container}>
          <View style={styles.header}>
            <ActivityIndicator size="small" color={theme.textSecondary} />
          </View>
        </View>
      );
    }

    return (
      <View style={styles.container} testID={testID}>
        {/* Header (always visible) */}
        <Pressable
          style={[styles.header, { backgroundColor: theme.surface, borderColor: theme.border }]}
          onPress={handleToggle}
          testID={`${testID}-header`}
        >
          <View style={styles.headerTextContainer}>
            <Text style={[styles.title, { color: theme.text }]}>{title}</Text>
            {subtitle && (
              <Text style={[styles.subtitle, { color: theme.textSecondary }]}>{subtitle}</Text>
            )}
          </View>

          {/* Error badge */}
          {errors.length > 0 && (
            <View style={[styles.errorBadge, { backgroundColor: theme.error }]}>
              <Text style={[styles.errorBadgeText, { color: theme.background }]}>
                {errors.length}
              </Text>
            </View>
          )}

          {/* Chevron icon */}
          <UniversalIcon
            name={collapsed ? 'chevron-down' : 'chevron-up'}
            size={20}
            color={theme.textSecondary}
          />
        </Pressable>

        {/* Content (collapsible) */}
        {!collapsed && (
          <View style={[styles.content, { borderColor: theme.border }]}>
            {/* Error summary */}
            {renderErrors()}

            {/* Loading skeleton */}
            {loading && renderSkeleton()}

            {/* Children (form fields) */}
            {!loading && <View style={styles.childrenContainer}>{children}</View>}
          </View>
        )}
      </View>
    );
  },
);

FormSection.displayName = 'FormSection';

/**
 * Calculate column count based on platform and screen size
 */
const getColumnCount = (columns: number): number => {
  if (Platform.OS === 'web') {
    // Desktop: Use requested columns
    return columns;
  } else if (Platform.OS === 'ios' || Platform.OS === 'android') {
    // Mobile: Always 1 column on phones, requested columns on tablets
    const { width } = Dimensions.get('window');
    const isTablet = width >= 768 || Platform.isTV;
    return isTablet ? Math.min(columns, 2) : 1;
  } else {
    // TV: 2 columns max
    return Math.min(columns, 2);
  }
};

const createStyles = (theme: ThemeColors, columns: number, platformTokens: ReturnType<typeof getPlatformTokens>) => {
  const columnCount = getColumnCount(columns);

  return StyleSheet.create({
    container: {
      marginVertical: 8,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 16,
      borderRadius: 8,
      borderWidth: 1,
      gap: 12,
    },
    headerTextContainer: {
      flex: 1,
    },
    title: {
      fontSize: platformTokens.typography.body.fontSize,
      fontWeight: '600',
      fontFamily: platformTokens.typography.fontFamily,
    },
    subtitle: {
      fontSize: platformTokens.typography.caption.fontSize,
      marginTop: 4,
      fontFamily: platformTokens.typography.fontFamily,
    },
    errorBadge: {
      minWidth: 20,
      height: 20,
      borderRadius: 10,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 6,
    },
    errorBadgeText: {
      fontSize: platformTokens.typography.caption.fontSize,
      fontWeight: '700',
      fontFamily: platformTokens.typography.fontFamily,
    },
    content: {
      borderLeftWidth: 2,
      borderRightWidth: 1,
      borderBottomWidth: 1,
      borderTopWidth: 0,
      borderBottomLeftRadius: 8,
      borderBottomRightRadius: 8,
      marginTop: -8,
      paddingTop: 16,
      paddingHorizontal: 16,
      paddingBottom: 16,
    },
    childrenContainer: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 16,
    },
    errorSummary: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      padding: 12,
      borderRadius: 8,
      borderWidth: 1,
      marginBottom: 16,
      gap: 8,
    },
    errorTextContainer: {
      flex: 1,
      gap: 4,
    },
    errorText: {
      fontSize: platformTokens.typography.caption.fontSize,
      fontFamily: platformTokens.typography.fontFamily,
    },
    skeletonContainer: {
      gap: 16,
    },
    skeletonRow: {
      flexDirection: 'column',
      gap: 8,
    },
    skeletonBar: {
      height: 16,
      borderRadius: 4,
      opacity: 0.5,
    },
    skeletonLabel: {
      width: '40%',
    },
    skeletonInput: {
      width: '100%',
      height: 40,
    },
  });
};
