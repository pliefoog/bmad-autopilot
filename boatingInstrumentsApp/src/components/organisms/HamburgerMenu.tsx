import React, { useCallback, useState } from 'react';
import {
  View,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  Animated,
  Dimensions,
  SafeAreaView,
} from 'react-native';
import { useTheme } from '../../store/themeStore';
import { MenuSection } from '../molecules/MenuSection';
import { DevToolsSection } from '../molecules/DevToolsSection';
import { useMenuState } from '../../hooks/useMenuState';
import { menuConfiguration } from '../../config/menuConfiguration';

interface HamburgerMenuProps {
  visible: boolean;
  onClose: () => void;
  onShowUnitsDialog?: () => void;
}

const { width: screenWidth } = Dimensions.get('window');
const MENU_WIDTH = screenWidth * 0.8; // 80% of screen width, max 320pt
const MAX_MENU_WIDTH = 320;

export const HamburgerMenu: React.FC<HamburgerMenuProps> = ({
  visible,
  onClose,
  onShowUnitsDialog,
}) => {
  const theme = useTheme();
  const { slideAnimation, fadeAnimation, animateIn, animateOut } = useMenuState(visible);
  
  // Custom action handlers
  const actionHandlers = {
    toggleUnits: () => {
      // Close hamburger menu first, then open dialog after animation
      handleClose();
      setTimeout(() => {
        onShowUnitsDialog?.();
      }, 300); // Wait for hamburger close animation
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

  if (!visible) {
    return null;
  }

  return (
    <>
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
                  />
                )}
              </ScrollView>
            </SafeAreaView>
          </TouchableOpacity>
        </Animated.View>
      </TouchableOpacity>
    </Modal>
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