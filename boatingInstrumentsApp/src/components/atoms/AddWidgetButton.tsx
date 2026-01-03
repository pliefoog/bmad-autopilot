import React from 'react';
import { TouchableOpacity, StyleSheet, View, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../store/themeStore';

interface AddWidgetButtonProps {
  onPress: () => void;
  size?: number;
  disabled?: boolean;
  testID?: string;
  accessibilityLabel?: string;
}

/**
 * AddWidgetButton - Blue circular + button for adding widgets to dashboard
 * Implements AC 7: Blue + button positioning at end of widget flow per UI Architecture spec
 */
export const AddWidgetButton: React.FC<AddWidgetButtonProps> = ({
  onPress,
  size = 56,
  disabled = false,
  testID = 'add-widget-button',
  accessibilityLabel = 'Add new widget to dashboard',
}) => {
  const theme = useTheme();

  const containerStyle = React.useMemo(
    () => ({
      width: size,
      height: size,
      borderRadius: size / 2,
      backgroundColor: disabled ? theme.interactiveDisabled : theme.interactive,
    }),
    [size, disabled, theme.interactiveDisabled, theme.interactive],
  );

  return (
    <TouchableOpacity
      style={[
        styles.container,
        containerStyle,
        disabled && styles.disabled,
        Platform.OS === 'ios'
          ? styles.shadowIOS
          : Platform.OS === 'android'
          ? styles.shadowAndroid
          : Platform.OS === 'web'
          ? styles.shadowWeb
          : null,
      ]}
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.7}
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled }}
    >
      <View style={styles.iconContainer}>
        <Ionicons
          name="add"
          size={size * 0.5} // Icon size is 50% of button size
          color={theme.surface}
          style={styles.icon}
        />
      </View>
    </TouchableOpacity>
  );
};

/**
 * AddWidgetButtonPositioned - Wrapper component for positioning at end of widget flow
 * Handles positioning logic per AC 7 requirements
 */
interface AddWidgetButtonPositionedProps extends AddWidgetButtonProps {
  position: 'center' | 'end-of-grid';
  containerStyle?: any;
}

export const AddWidgetButtonPositioned: React.FC<AddWidgetButtonPositionedProps> = ({
  position,
  containerStyle,
  ...buttonProps
}) => {
  const positionStyle = position === 'center' ? styles.centeredPosition : styles.endOfGridPosition;

  return (
    <View style={[positionStyle, containerStyle]}>
      <AddWidgetButton {...buttonProps} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    // Minimum 44pt touch target per AC 20: Safe Area Compliance
    minWidth: 44,
    minHeight: 44,
  },
  iconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: {
    textAlign: 'center',
  },
  // Platform-specific shadow styles for depth
  shadowIOS: {
    shadowColor: theme.shadowDark,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  shadowAndroid: {
    elevation: 5,
  },
  shadowWeb: {
    boxShadow: `0px 2px 8px ${theme.shadow}`,
  },
  // Positioning styles
  centeredPosition: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
  endOfGridPosition: {
    position: 'absolute',
    bottom: 16,
    right: 16,
    zIndex: 10,
  },
});

export default AddWidgetButton;
