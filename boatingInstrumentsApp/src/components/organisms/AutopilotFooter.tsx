import React, { useCallback } from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../store/themeStore';
import { AutopilotButton } from '../molecules/AutopilotButton';
import { useAutopilotStatus } from '../../hooks/useAutopilotStatus';

interface AutopilotFooterProps {
  onOpenAutopilotControl: () => void;
}

export const AutopilotFooter: React.FC<AutopilotFooterProps> = ({
  onOpenAutopilotControl,
}) => {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const autopilotState = useAutopilotStatus();

  // Handle button interactions
  const handleAutopilotPress = useCallback(() => {
    onOpenAutopilotControl();
  }, [onOpenAutopilotControl]);

  const handleEmergencyDisengage = useCallback(() => {
    // Emergency disengage logic would be implemented here
    // For now, we'll just open the autopilot control panel
    onOpenAutopilotControl();
  }, [onOpenAutopilotControl]);

  // Calculate footer height with safe area
  const footerHeight = 88 + insets.bottom;

  return (
    <View 
      style={[
        styles.container,
        {
          backgroundColor: theme.surface,
          borderTopColor: theme.border,
          height: footerHeight,
          paddingBottom: insets.bottom,
        }
      ]}
      testID="autopilot-footer"
    >
      <AutopilotButton
        status={autopilotState.status}
        mode={autopilotState.mode}
        targetHeading={autopilotState.targetHeading}
        actualHeading={autopilotState.actualHeading}
        onPress={handleAutopilotPress}
        onLongPress={handleEmergencyDisengage}
        style={styles.autopilotButton}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    borderTopWidth: 2,
    elevation: 8,
    // Platform-specific shadow
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -2 },
        shadowOpacity: 0.15,
        shadowRadius: 4,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  autopilotButton: {
    flex: 1,
    margin: 8,
  },
});

export default AutopilotFooter;