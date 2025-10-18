import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  TouchableOpacity,
  Modal,
  Dimensions,
  Switch,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useTheme, useThemeStore } from '../core/themeStore';
import { PlatformStyles } from '../utils/animationUtils';

interface HamburgerMenuProps {
  visible: boolean;
  onClose: () => void;
  onShowConnectionSettings?: () => void;
}

const HamburgerMenu: React.FC<HamburgerMenuProps> = ({ visible, onClose, onShowConnectionSettings }) => {
  const theme = useTheme();
  const { mode, setMode } = useThemeStore();
  const slideAnim = useRef(new Animated.Value(-Dimensions.get('window').width)).current;
  const backdropOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      // Show animations
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: Platform.OS !== 'web',
        }),
        Animated.timing(backdropOpacity, {
          toValue: 0.5,
          duration: 300,
          useNativeDriver: Platform.OS !== 'web',
        }),
      ]).start();
    } else {
      // Hide animations
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: -Dimensions.get('window').width,
          duration: 250,
          useNativeDriver: Platform.OS !== 'web',
        }),
        Animated.timing(backdropOpacity, {
          toValue: 0,
          duration: 250,
          useNativeDriver: Platform.OS !== 'web',
        }),
      ]).start();
    }
  }, [visible]);

  const handleBackdropPress = () => {
    onClose(); // AC 18: Close on backdrop tap
  };

  const handleMenuItemPress = (item: string) => {
    switch (item) {
      case 'Connection':
        if (onShowConnectionSettings) {
          onShowConnectionSettings();
        }
        break;
      default:
        // TODO: Implement other navigation when routes are available
        console.log(`Navigate to: ${item}`);
        break;
    }
    onClose();
  };

  const handleThemeToggle = () => {
    const nextMode = mode === 'day' ? 'night' : mode === 'night' ? 'red-night' : 'day';
    setMode(nextMode);
  };

  const getThemeDisplayName = (currentMode: string) => {
    switch (currentMode) {
      case 'day':
        return 'Day Mode';
      case 'night':
        return 'Night Mode';
      case 'red-night':
        return 'Red Night';
      case 'auto':
        return 'Auto Mode';
      default:
        return 'Day Mode';
    }
  };

  const styles = createStyles(theme);
  const screenWidth = Dimensions.get('window').width;
  const drawerWidth = screenWidth * 0.8; // AC 15: 80% screen width

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="none"
      onRequestClose={onClose}
      testID="hamburger-menu-modal"
      accessibilityRole="menu"
    >
      {/* Backdrop */}
      <TouchableOpacity
        style={styles.backdrop}
        activeOpacity={1}
        onPress={handleBackdropPress}
        testID="hamburger-menu-backdrop"
      >
        <Animated.View
          style={[
            styles.backdropOverlay,
            {
              opacity: backdropOpacity,
            },
          ]}
        />
      </TouchableOpacity>

      {/* Slide-in Drawer */}
      <Animated.View
        style={[
          styles.drawerContainer,
          {
            width: drawerWidth,
            transform: [{ translateX: slideAnim }],
          },
        ]}
        testID="hamburger-menu-drawer"
      >
        <SafeAreaView style={styles.drawerContent}>
          {/* Menu Header */}
          <View style={styles.menuHeader}>
            <Text style={styles.menuTitle}>BMad Instruments</Text>
          </View>

          {/* Menu Items */}
          <View style={styles.menuItems}>
            {/* AC 16: Menu items */}
            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => handleMenuItemPress('Settings')}
              testID="menu-settings"
            >
              <View style={styles.menuItemWithIcon}>
                <Ionicons name="settings-outline" size={20} color={theme.text} />
                <Text style={styles.menuItemText}>Settings</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => handleMenuItemPress('Layouts')}
              testID="menu-layouts"
            >
              <View style={styles.menuItemWithIcon}>
                <Ionicons name="grid-outline" size={20} color={theme.text} />
                <Text style={styles.menuItemText}>Layouts</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => handleMenuItemPress('Alarms')}
              testID="menu-alarms"
            >
              <View style={styles.menuItemWithIcon}>
                <Ionicons name="alert-circle-outline" size={20} color={theme.text} />
                <Text style={styles.menuItemText}>Alarms</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => handleMenuItemPress('Connection')}
              testID="menu-connection"
            >
              <View style={styles.menuItemWithIcon}>
                <Ionicons name="wifi-outline" size={20} color={theme.text} />
                <Text style={styles.menuItemText}>Connection</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => handleMenuItemPress('About')}
              testID="menu-about"
            >
              <View style={styles.menuItemWithIcon}>
                <Ionicons name="information-circle-outline" size={20} color={theme.text} />
                <Text style={styles.menuItemText}>About</Text>
              </View>
            </TouchableOpacity>
          </View>

          {/* Theme Switcher at Bottom */}
          <View style={styles.themeSection}>
            <View style={styles.themeSectionHeader}>
              <Text style={styles.themeSectionTitle}>Display Mode</Text>
            </View>
            <TouchableOpacity
              style={styles.themeToggle}
              onPress={handleThemeToggle}
              testID="theme-switcher"
            >
              <Text style={styles.themeToggleText}>
                {getThemeDisplayName(mode)}
              </Text>
              <View style={styles.themeIndicator}>
                <View
                  style={[
                    styles.themeIndicatorDot,
                    {
                      backgroundColor:
                        mode === 'day'
                          ? theme.primary
                          : mode === 'night'
                          ? theme.secondary
                          : theme.error,
                    },
                  ]}
                />
              </View>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </Animated.View>
    </Modal>
  );
};

const createStyles = (theme: any) =>
  StyleSheet.create({
    backdrop: {
      flex: 1,
      justifyContent: 'flex-start',
      alignItems: 'flex-start',
    },
    backdropOverlay: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: '#000000',
    },
    drawerContainer: {
      position: 'absolute',
      top: 0,
      bottom: 0,
      left: 0,
      backgroundColor: theme.surface,
      ...PlatformStyles.boxShadow(theme.shadow, { x: 2, y: 0 }, 5, 0.25),
      elevation: 10,
    },
    drawerContent: {
      flex: 1,
    },
    menuHeader: {
      paddingHorizontal: 20,
      paddingVertical: 24,
      borderBottomWidth: 1,
      borderBottomColor: theme.border,
    },
    menuTitle: {
      fontSize: 20,
      fontWeight: '600',
      color: theme.text,
    },
    menuItems: {
      flex: 1,
      paddingTop: 16,
    },
    menuItem: {
      paddingHorizontal: 20,
      paddingVertical: 16,
      borderBottomWidth: 1,
      borderBottomColor: theme.border + '20', // 20% opacity
    },
    menuItemWithIcon: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    menuItemText: {
      fontSize: 16,
      color: theme.text,
      fontWeight: '500',
    },
    themeSection: {
      borderTopWidth: 1,
      borderTopColor: theme.border,
      paddingHorizontal: 20,
      paddingVertical: 16,
    },
    themeSectionHeader: {
      marginBottom: 12,
    },
    themeSectionTitle: {
      fontSize: 14,
      color: theme.textSecondary,
      fontWeight: '600',
      textTransform: 'uppercase',
    },
    themeToggle: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: 8,
    },
    themeToggleText: {
      fontSize: 16,
      color: theme.text,
      fontWeight: '500',
    },
    themeIndicator: {
      alignItems: 'center',
      justifyContent: 'center',
    },
    themeIndicatorDot: {
      width: 12,
      height: 12,
      borderRadius: 6,
    },
  });

export default HamburgerMenu;