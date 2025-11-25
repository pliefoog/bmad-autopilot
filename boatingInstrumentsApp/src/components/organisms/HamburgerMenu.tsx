import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  StyleSheet,
  ScrollView,
  Animated,
  Dimensions,
  Platform,
  SafeAreaView,
} from 'react-native';
import { useTheme } from '../../store/themeStore';
import { useWidgetStore } from '../../store/widgetStore';
import { useNmeaStore } from '../../store/nmeaStore';
import { MenuSection } from '../molecules/MenuSection';
import { DevToolsSection } from '../molecules/DevToolsSection';
import { useMenuState } from '../../hooks/useMenuState';
import { menuConfiguration } from '../../config/menuConfiguration';
import { FeatureFlagsMenu } from '../developer/FeatureFlagsMenu';

interface HamburgerMenuProps {
  visible: boolean;
  onClose: () => void;
  onShowUnitsDialog?: () => void;
  onShowFactoryResetDialog?: () => void;
  onShowConnectionSettings?: () => void;
}

const { width: screenWidth } = Dimensions.get('window');
const MENU_WIDTH = screenWidth * 0.8; // 80% of screen width, max 320pt
const MAX_MENU_WIDTH = 320;

export const HamburgerMenu: React.FC<HamburgerMenuProps> = ({
  visible,
  onClose,
  onShowUnitsDialog,
  onShowFactoryResetDialog,
  onShowConnectionSettings,
}) => {
  const theme = useTheme();
  const { slideAnimation, fadeAnimation, animateIn, animateOut } = useMenuState(visible);
  const { resetAppToDefaults } = useWidgetStore();
  const nmeaStore = useNmeaStore();
  const [showFeatureFlags, setShowFeatureFlags] = useState(false);
  
  // Custom action handlers
  const actionHandlers = {
    openConnectionSettings: () => {
      animateOut(() => {
        onClose();
        requestAnimationFrame(() => onShowConnectionSettings?.());
      });
    },
    toggleUnits: () => {
      animateOut(() => {
        onClose();
        requestAnimationFrame(() => onShowUnitsDialog?.());
      });
    },
    performFactoryReset: async () => {
      animateOut(() => {
        onClose();
        requestAnimationFrame(() => onShowFactoryResetDialog?.());
      });
    },
    // Backwards compatibility - redirect to new name
    resetAppToDefaults: async () => {
      await actionHandlers.performFactoryReset();
    },
    openAlarmConfiguration: () => {
      animateOut(() => {
        onClose();
        requestAnimationFrame(() => {
          const router = require('expo-router');
          router.router.push('/settings/alarms');
        });
      });
    },
    openAlarmHistory: () => {
      // Navigate to alarm history (placeholder for now)
      animateOut(() => {
        onClose();
        // TODO: Implement alarm history screen
        console.log('Alarm History - coming soon');
      });
    },
    openFeatureFlags: () => {
      // Trigger close animation, then open feature flags
      animateOut(() => {
        onClose();
        setTimeout(() => setShowFeatureFlags(true), 0);
      });
    },
  };

  // Handle menu close with animation
  const handleClose = useCallback(() => {
    animateOut(() => {
      onClose();
    });
  }, [animateOut, onClose]);

  // Handle overlay tap
  const handleOverlayPress = useCallback(() => {
    handleClose();
  }, [handleClose]);

  // Prevent menu panel tap from closing
  const handleMenuPress = useCallback((event: any) => {
    event.stopPropagation();
  }, []);

  // Calculate menu width (responsive with maximum)
  const menuWidth = Math.min(MENU_WIDTH, MAX_MENU_WIDTH);

  // Get menu sections from configuration
  const { sections, devSections } = menuConfiguration;
  const showDevTools = __DEV__ || process.env.NODE_ENV === 'development';

  React.useEffect(() => {
    if (visible) {
      animateIn();
    }
  }, [visible, animateIn]);

  return (
    <>
    {/* Hamburger Menu Modal */}
    <Modal
      transparent
      visible={visible}
      animationType="none"
      statusBarTranslucent
      onRequestClose={handleClose}
    >
      <TouchableOpacity
        style={styles.overlay}
        activeOpacity={1}
        onPress={handleOverlayPress}
      >
        <Animated.View
          style={[
            styles.overlayBackground,
            {
              backgroundColor: 'rgba(0, 0, 0, 0.5)',
              opacity: fadeAnimation,
            },
          ]}
        />
        
        <Animated.View
          style={[
            styles.menuContainer,
            {
              backgroundColor: theme.surface,
              width: menuWidth,
              transform: [{ translateX: slideAnimation }],
            }
          ]}
        >
          <TouchableOpacity
            style={styles.menuContent}
            activeOpacity={1}
            onPress={handleMenuPress}
          >
            <SafeAreaView style={styles.safeArea}>
              <ScrollView 
                style={styles.scrollContainer}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
              >
                {/* Header */}
                <View style={[styles.header, { borderBottomColor: theme.border }]}>
                  <TouchableOpacity
                    style={styles.closeButton}
                    onPress={handleClose}
                    testID="hamburger-menu-close"
                  >
                    <View style={[styles.closeIcon, { backgroundColor: theme.textSecondary }]} />
                  </TouchableOpacity>
                </View>

                {/* Primary Navigation Sections */}
                {sections.map((section) => (
                  <MenuSection
                    key={section.id}
                    section={section}
                    onItemPress={handleClose}
                    actionHandlers={actionHandlers}
                  />
                ))}

                {/* Development Tools Section */}
                {showDevTools && devSections && (
                  <DevToolsSection
                    sections={devSections}
                    onItemPress={handleClose}
                    actionHandlers={actionHandlers}
                  />
                )}
              </ScrollView>
            </SafeAreaView>
          </TouchableOpacity>
        </Animated.View>
      </TouchableOpacity>
    </Modal>
    
    {/* Feature Flags Developer Menu - Always rendered so state persists */}
    <FeatureFlagsMenu
      visible={showFeatureFlags}
      onClose={() => setShowFeatureFlags(false)}
    />
    </>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    flexDirection: 'row',
  },
  overlayBackground: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  menuContainer: {
    flex: 1,
    maxWidth: MAX_MENU_WIDTH,
    shadowColor: '#000',
    shadowOffset: {
      width: 2,
      height: 0,
    },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 10,
  },
  menuContent: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  scrollContainer: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  closeButton: {
    padding: 8,
    borderRadius: 20,
  },
  closeIcon: {
    width: 20,
    height: 2,
    borderRadius: 1,
    transform: [{ rotate: '45deg' }],
  },
});