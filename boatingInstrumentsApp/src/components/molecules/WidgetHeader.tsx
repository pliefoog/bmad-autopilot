import React, { useMemo } from 'react';
import { View, Text, StyleSheet, ViewStyle, TextStyle } from 'react-native';
import { Icon, StatusIndicator } from '../atoms';
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
}) => {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  return (
    <View style={[styles.container, style]} testID={testID}>
      <View style={styles.leftSection}>
        {iconName && (
          <Icon
            name={iconName}
            size={20}
            color="#374151"
            style={styles.icon}
            testID={testID ? `${testID}-icon` : undefined}
          />
        )}
        <View style={styles.titleContainer}>
          <Text style={[styles.title, titleStyle]} testID={testID ? `${testID}-title` : undefined}>
            {title}
          </Text>
          {subtitle && (
            <Text
              style={[styles.subtitle, subtitleStyle]}
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

const createStyles = (theme: ThemeColors) =>
  StyleSheet.create({
    container: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: theme.border,
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
      marginRight: 8,
    },
    titleContainer: {
      flex: 1,
    },
    title: {
      fontSize: 16,
      fontWeight: '600',
      color: theme.text,
    },
    subtitle: {
      fontSize: 12,
      color: theme.textSecondary,
      marginTop: 2,
    },
    statusIndicator: {
      marginLeft: 8,
    },
  });

export default WidgetHeader;
