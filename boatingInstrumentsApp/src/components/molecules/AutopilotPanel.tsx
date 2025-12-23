import React, { useMemo } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, SafeAreaView } from 'react-native';
import { useTheme, ThemeColors } from '../../store/themeStore';
import { AutopilotState } from '../../hooks/useAutopilotStatus';

interface AutopilotPanelProps {
  visible: boolean;
  onClose: () => void;
  autopilotState: AutopilotState;
  onHeadingChange?: (heading: number) => void;
  onModeChange?: (mode: string) => void;
  onDisengage?: () => void;
}

export const AutopilotPanel: React.FC<AutopilotPanelProps> = ({
  visible,
  onClose,
  autopilotState,
  onHeadingChange,
  onModeChange,
  onDisengage,
}) => {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  const adjustHeading = (delta: number) => {
    if (autopilotState.targetHeading !== undefined && onHeadingChange) {
      let newHeading = autopilotState.targetHeading + delta;
      // Normalize to 0-360 range
      if (newHeading < 0) newHeading += 360;
      if (newHeading >= 360) newHeading -= 360;
      onHeadingChange(newHeading);
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <SafeAreaView style={[styles.container, { backgroundColor: theme.surface }]}>
        {/* iOS Drag Handle */}
        <View style={styles.dragHandle} />
        <View style={[styles.header, { borderBottomColor: theme.border }]}>
          <TouchableOpacity onPress={onClose} style={styles.headerButton}>
            <Text style={[styles.headerButtonText, { color: theme.primary }]}>Done</Text>
          </TouchableOpacity>
          <Text style={[styles.title, { color: theme.text }]}>Autopilot Controls</Text>
          <View style={styles.headerButton} />
        </View>

        <View style={styles.content}>
          {/* Status Display */}
          <View style={[styles.statusSection, { backgroundColor: theme.background }]}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>Current Status</Text>
            <Text style={[styles.statusText, { color: theme.text }]}>
              {autopilotState.status.toUpperCase()} - {autopilotState.mode.toUpperCase()}
            </Text>
            {autopilotState.targetHeading !== undefined && (
              <Text style={[styles.headingText, { color: theme.text }]}>
                Target: {Math.round(autopilotState.targetHeading)}°
              </Text>
            )}
            {autopilotState.actualHeading !== undefined && (
              <Text style={[styles.headingText, { color: theme.text }]}>
                Actual: {Math.round(autopilotState.actualHeading)}°
              </Text>
            )}
          </View>

          {/* Quick Controls */}
          {autopilotState.isActive && (
            <View style={[styles.controlsSection, { backgroundColor: theme.background }]}>
              <Text style={[styles.sectionTitle, { color: theme.text }]}>Heading Adjustment</Text>
              <View style={styles.headingControls}>
                <TouchableOpacity
                  style={[styles.headingButton, { backgroundColor: theme.primary }]}
                  onPress={() => adjustHeading(-10)}
                >
                  <Text style={[styles.headingButtonText, { color: theme.surface }]}>-10°</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.headingButton, { backgroundColor: theme.primary }]}
                  onPress={() => adjustHeading(-1)}
                >
                  <Text style={[styles.headingButtonText, { color: theme.surface }]}>-1°</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.headingButton, { backgroundColor: theme.primary }]}
                  onPress={() => adjustHeading(1)}
                >
                  <Text style={[styles.headingButtonText, { color: theme.surface }]}>+1°</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.headingButton, { backgroundColor: theme.primary }]}
                  onPress={() => adjustHeading(10)}
                >
                  <Text style={[styles.headingButtonText, { color: theme.surface }]}>+10°</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
          <View style={[styles.emergencySection, { backgroundColor: theme.background }]}>
            <TouchableOpacity
              style={[styles.disengageButton, { backgroundColor: theme.error }]}
              onPress={onDisengage}
            >
              <Text style={[styles.disengageButtonText, { color: theme.surface }]}>
                EMERGENCY DISENGAGE
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    </Modal>
  );
};

const createStyles = (theme: ThemeColors) =>
  StyleSheet.create({
    container: {
      flex: 1,
    },
    dragHandle: {
      width: 36,
      height: 5,
      backgroundColor: theme.overlay,
      borderRadius: 3,
      alignSelf: 'center',
      marginTop: 5,
      marginBottom: 5,
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderBottomWidth: 1,
    },
    headerButton: {
      padding: 8,
      minWidth: 60,
    },
    headerButtonText: {
      fontSize: 17,
      fontWeight: '400',
    },
    title: {
      fontSize: 17,
      fontWeight: '600',
      flex: 1,
      textAlign: 'center',
    },
    content: {
      flex: 1,
      padding: 16,
    },
    statusSection: {
      padding: 16,
      borderRadius: 8,
      marginBottom: 16,
    },
    controlsSection: {
      padding: 16,
      borderRadius: 8,
      marginBottom: 16,
    },
    emergencySection: {
      padding: 16,
      borderRadius: 8,
    },
    sectionTitle: {
      fontSize: 18,
      fontWeight: '600',
      marginBottom: 12,
    },
    statusText: {
      fontSize: 16,
      fontWeight: 'bold',
      marginBottom: 8,
    },
    headingText: {
      fontSize: 14,
      marginBottom: 4,
    },
    headingControls: {
      flexDirection: 'row',
      justifyContent: 'space-between',
    },
    headingButton: {
      padding: 12,
      borderRadius: 6,
      minWidth: 60,
      alignItems: 'center',
    },
    headingButtonText: {
      fontSize: 16,
      fontWeight: 'bold',
    },
    disengageButton: {
      padding: 16,
      borderRadius: 8,
      alignItems: 'center',
    },
    disengageButtonText: {
      fontSize: 18,
      fontWeight: 'bold',
      letterSpacing: 1,
    },
  });

export default AutopilotPanel;
