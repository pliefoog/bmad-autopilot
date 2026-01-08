import React, { useMemo } from 'react';
import { View, Text, StyleSheet, ViewStyle, TextStyle } from 'react-native';
import { UniversalIcon } from '../atoms/UniversalIcon';
import { StatusIndicator } from '../marine/StatusIndicator';
import { useTheme, ThemeColors } from '../../store/themeStore';

interface WidgetHeaderProps {
  title: string;
  subtitle?: string;
  status?: 'connected' | 'disconnected' | 'error' | 'warning';
  iconName?: string;
  rightElement?: React.ReactNode;
  onPress?: () => void;
  style?: ViewStyle;
  titleStyle?: TextStyle;
  subtitleStyle?: TextStyle;
  testID?: string;
  headerHeight?: number; // Dynamic height from TemplatedWidget for scaling
}

const WidgetHeader: React.FC<WidgetHeaderProps> = ({
  title,
  subtitle,
  status,
  iconName,
  rightElement,
  style,
  titleStyle,
  subtitleStyle,
  testID,
  headerHeight = 40, // Default fallback
}) => {
  const theme = useTheme();
  
  // Calculate responsive sizes based on header height
  // Icon: 50% of header height, clamped 16-28px
  const iconSize = Math.max(16, Math.min(28, headerHeight * 0.5));
  // Title: 32.5% of header height, clamped 11-18px
  const titleFontSize = Math.max(11, Math.min(18, headerHeight * 0.325));
  // Subtitle: 30% of header height, clamped 10-16px
  const subtitleFontSize = Math.max(10, Math.min(16, headerHeight * 0.3));
  
  const styles = useMemo(
    () => createStyles(theme, titleFontSize, subtitleFontSize),
    [theme, titleFontSize, subtitleFontSize]
  );

  return (
    <View style={[styles.container, style]} testID={testID}>
      <View style={styles.leftSection}>
        {iconName && (
          <UniversalIcon
            name={iconName}
            size={iconSize}
            color={theme.iconPrimary}
            style={styles.icon}
            testID={testID ? `${testID}-icon` : undefined}
          />
        )}
        <View style={styles.titleContainer}>
          <Text 
            style={[styles.title, titleStyle]} 
            numberOfLines={1}
            ellipsizeMode="tail"
            testID={testID ? `${testID}-title` : undefined}
          >
            {title}
          </Text>
          {subtitle && (
            <Text
              style={[styles.subtitle, subtitleStyle]}
              numberOfLines={1}
              ellipsizeMode="tail"
              testID={testID ? `${testID}-subtitle` : undefined}
            >
              {subtitle}
            </Text>
          )}
        </View>
      </View>
      <View style={styles.rightSection}>
        {status && (
          <StatusIndicator
            status={status}
            size="small"
            style={styles.statusIndicator}
            testID={testID ? `${testID}-status` : undefined}
          />
        )}
        {rightElement}
      </View>
    </View>
  );
};

const createStyles = (theme: ThemeColors, titleFontSize: number, subtitleFontSize: number) =>
  StyleSheet.create({
    container: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderBottomWidth: 1,
      borderBottomColor: theme.border,
      backgroundColor: '#F3F4F6',
    },
    leftSection: {
      flexDirection: 'row',
      alignItems: 'center',
      flex: 1,
    },
    rightSection: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    icon: {
      marginRight: 6,
    },
    titleContainer: {
      flex: 1,
    },
    title: {
      fontSize: titleFontSize,
      fontWeight: '600',
      color: theme.text,
    },
    subtitle: {
      fontSize: subtitleFontSize,
      color: theme.textSecondary,
      marginTop: 2,
    },
    statusIndicator: {
      marginLeft: 8,
    },
  });

export default WidgetHeader;
