import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { Card, StatusIndicator } from '../atoms';

interface StatusCardProps {
  title: string;
  status: 'connected' | 'connecting' | 'disconnected' | 'error';
  message?: string;
  variant?: 'default' | 'elevated' | 'outlined' | 'filled';
  style?: ViewStyle;
  testID?: string;
}

const StatusCard: React.FC<StatusCardProps> = ({
  title,
  status,
  message,
  variant = 'default',
  style,
  testID,
}) => {
  return (
    <Card
      variant={variant}
      padding="medium"
      rounded="medium"
      style={style}
      testID={testID}
    >
      <View style={[styles.container, styles.header]}>
        <StatusIndicator
          status={status}
          size="large"
          showLabel={true}
          label={title}
          testID={testID ? `${testID}-indicator` : undefined}
        />
      </View>
      {message && (
        <View style={styles.messageContainer}>
          <StatusIndicator
            status="info"
            size="small"
            showLabel={true}
            label={message}
            style={styles.message}
            testID={testID ? `${testID}-message` : undefined}
          />
        </View>
      )}
    </Card>
  );
};

const styles = StyleSheet.create({
  container: {
    minHeight: 80,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  messageContainer: {
    marginTop: 8,
    alignItems: 'center',
  },
  message: {
    opacity: 0.8,
  },
});

export default StatusCard;