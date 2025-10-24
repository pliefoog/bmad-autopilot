import React, { useCallback, useEffect, useRef } from 'react';
import {
  View,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  Animated,
  Dimensions,
  SafeAreaView,
  Text,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme, useThemeStore } from '../store/themeStore';
import { MenuSection } from './molecules/MenuSection';
import { DevToolsSection } from './molecules/DevToolsSection';
import { useMenuState } from '../hooks/useMenuState';
import { menuConfiguration } from '../config/menuConfiguration';
import { PlatformStyles } from '../utils/animationUtils';

// Developer services (only loaded in development)
let playbackService: any = null;
let stressTestService: any = null;

if (__DEV__ || process.env.NODE_ENV === 'development') {
  try {
    playbackService = require('../services/playbackService').playbackService;
    stressTestService = require('../services/stressTestService').stressTestService;
  } catch (e) {
    console.warn('Developer services not available:', e);
  }
}

interface HamburgerMenuProps {
  visible: boolean;
  onClose: () => void;
  onShowConnectionSettings?: () => void;
  // Developer tools props
  onStartPlayback?: () => void;
  onStopPlayback?: () => void;
  onStartStressTest?: () => void;
  onStopStressTest?: () => void;
}

const HamburgerMenu: React.FC<HamburgerMenuProps> = ({ 
  visible, 
  onClose, 
  onShowConnectionSettings,
  onStartPlayback,
  onStopPlayback, 
  onStartStressTest,
  onStopStressTest
}) => {
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
    onClose(); // AC 4: Close on backdrop tap
  };

  const handleMenuItemPress = () => {
    onClose(); // Close menu after item action
  };

  // Custom action handlers for actions that need parent component intervention
  const actionHandlers: Record<string, () => void> = {
    openConnectionSettings: () => {
      if (onShowConnectionSettings) {
        onShowConnectionSettings();
      }
    },
    startSimulator: () => {
      if (onStartPlayback) {
        onStartPlayback();
      }
    },
    stopSimulator: () => {
      if (onStopPlayback) {
        onStopPlayback();
      }
    },
    startStressTest: () => {
      if (onStartStressTest) {
        onStartStressTest();
      }
    },
    stopStressTest: () => {
      if (onStopStressTest) {
        onStopStressTest();
      }
    },
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

          {/* Scrollable Menu Content - AC 6-10: Primary Navigation Sections */}
          <ScrollView 
            style={styles.menuItems}
            showsVerticalScrollIndicator={false}
          >
            {/* AC 6-10: Primary Navigation Sections from menuConfiguration */}
            {menuConfiguration.sections.map((section) => (
              <MenuSection
                key={section.id}
                section={section}
                onItemPress={handleMenuItemPress}
                actionHandlers={actionHandlers}
              />
            ))}

            {/* AC 11-15: Development Tools Section (conditional) */}
            {menuConfiguration.devSections && (
              <DevToolsSection
                sections={menuConfiguration.devSections}
                onItemPress={handleMenuItemPress}
                actionHandlers={actionHandlers}
              />
            )}
          </ScrollView>

          {/* Theme Switcher at Bottom - AC 7: Display Settings */}
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
    // Developer Tools Section Styles
    developerSection: {
      borderTopWidth: 1,
      borderTopColor: theme.border,
      paddingHorizontal: 20,
      paddingVertical: 16,
      backgroundColor: theme.surface + '80', // Slightly darker for distinction
    },
    developerSectionHeader: {
      marginBottom: 16,
    },
    developerSectionTitle: {
      fontSize: 14,
      color: theme.primary,
      fontWeight: '600',
      textTransform: 'uppercase',
    },
    developerSectionSubtitle: {
      fontSize: 12,
      color: theme.textSecondary,
      marginTop: 2,
    },
    developerControls: {
      gap: 16,
    },
    developerControlGroup: {
      gap: 8,
    },
    developerControlLabel: {
      fontSize: 13,
      color: theme.textSecondary,
      fontWeight: '500',
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    developerButtonRow: {
      flexDirection: 'row',
      gap: 8,
    },
    developerButton: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 12,
      paddingVertical: 8,
      backgroundColor: theme.surface,
      borderRadius: 6,
      borderWidth: 1,
      borderColor: theme.border,
      gap: 6,
      minWidth: 80,
      justifyContent: 'center',
    },
    developerButtonActive: {
      backgroundColor: theme.primary + '20',
      borderColor: theme.primary,
    },
    developerButtonDanger: {
      backgroundColor: theme.error + '20',
      borderColor: theme.error,
    },
    developerButtonText: {
      fontSize: 12,
      color: theme.text,
      fontWeight: '600',
    },
  });

export default HamburgerMenu;