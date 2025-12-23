import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Card } from '../atoms';
import { ConnectionStatus, ThemeToggle } from '../molecules';

interface NavigationBarProps {
  connectionStatus: 'connected' | 'disconnected' | 'error' | 'reconnecting';
  isDarkMode: boolean;
  onThemeToggle: (value: boolean) => void;
  leftActions?: React.ReactNode;
  rightActions?: React.ReactNode;
  testID?: string;
}

const NavigationBar: React.FC<NavigationBarProps> = ({
  connectionStatus,
  isDarkMode,
  onThemeToggle,
  leftActions,
  rightActions,
  testID,
}) => {
  return (
    <Card variant="elevated" padding="small" rounded="none" testID={testID}>
      <View style={styles.container}>
        <View style={styles.leftSection}>{leftActions}</View>

        <View style={styles.centerSection}>
          <ConnectionStatus
            status={connectionStatus}
            variant="compact"
            testID={testID ? `${testID}-connection` : undefined}
          />
        </View>

        <View style={styles.rightSection}>
          <ThemeToggle
            isDarkMode={isDarkMode}
            onToggle={onThemeToggle}
            variant="switch"
            size="small"
            showLabel={false}
            testID={testID ? `${testID}-theme` : undefined}
          />
          {rightActions}
        </View>
      </View>
    </Card>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  leftSection: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
  },
  centerSection: {
    flex: 2,
    alignItems: 'center',
  },
  rightSection: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 8,
  },
});

export default NavigationBar;
