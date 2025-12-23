import React, { useMemo } from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { StatusIndicator, Badge } from '../atoms';
import { useTheme, ThemeColors } from '../../store/themeStore';

interface ConnectionStatusProps {
  status: 'connected' | 'disconnected' | 'error' | 'reconnecting';
  label?: string;
  showLabel?: boolean;
  details?: string;
  variant?: 'compact' | 'detailed';
  style?: ViewStyle;
  testID?: string;
}

const ConnectionStatus: React.FC<ConnectionStatusProps> = ({
  status,
  label,
  showLabel = true,
  details,
  variant = 'compact',
  style,
  testID,
}) => {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  const getStatusText = () => {
    switch (status) {
      case 'connected':
        return label || 'Connected';
      case 'disconnected':
        return label || 'Disconnected';
      case 'error':
        return label || 'Connection Error';
      case 'reconnecting':
        return label || 'Reconnecting...';
      default:
        return label || 'Unknown';
    }
  };

  const getBadgeVariant = () => {
    switch (status) {
      case 'connected':
        return 'success';
      case 'disconnected':
        return 'secondary';
      case 'error':
        return 'danger';
      case 'reconnecting':
        return 'warning';
      default:
        return 'default';
    }
  };

  if (variant === 'compact') {
    return (
      <View style={[styles.compactContainer, style]} testID={testID}>
        <StatusIndicator
          status={status}
          size="small"
          testID={testID ? `${testID}-indicator` : undefined}
        />
        {showLabel && (
          <Text style={styles.compactLabel} testID={testID ? `${testID}-label` : undefined}>
            {getStatusText()}
          </Text>
        )}
      </View>
    );
  }

  return (
    <View style={[styles.detailedContainer, style]} testID={testID}>
      <View style={styles.statusRow}>
        <StatusIndicator
          status={status}
          size="medium"
          testID={testID ? `${testID}-indicator` : undefined}
        />
        <View style={styles.labelContainer}>
          <Text style={styles.statusLabel} testID={testID ? `${testID}-label` : undefined}>
            {getStatusText()}
          </Text>
          {details && (
            <Text style={styles.details} testID={testID ? `${testID}-details` : undefined}>
              {details}
            </Text>
          )}
        </View>
        <Badge
          variant={getBadgeVariant()}
          size="small"
          testID={testID ? `${testID}-badge` : undefined}
        >
          {status}
        </Badge>
      </View>
    </View>
  );
};

const createStyles = (theme: ThemeColors) =>
  StyleSheet.create({
    compactContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    compactLabel: {
      fontSize: 12,
      color: theme.textSecondary,
      fontWeight: '500',
    },
    detailedContainer: {
      padding: 12,
      backgroundColor: theme.surface,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: theme.border,
    },
    statusRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    labelContainer: {
      flex: 1,
    },
    statusLabel: {
      fontSize: 14,
      fontWeight: '600',
      color: theme.text,
    },
    details: {
      fontSize: 12,
      color: theme.textSecondary,
      marginTop: 2,
    },
  });

export default ConnectionStatus;
