import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  StyleSheet,
  ScrollView,
  Dimensions,
  Platform,
  SafeAreaView,
  Pressable,
} from 'react-native';
import { useTheme } from '../../store/themeStore';
import { useWidgetStore } from '../../store/widgetStore';
import { log as logger } from '../../utils/logging/logger';
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
  onShowLayoutSettings?: () => void;
  onShowDisplayThemeSettings?: () => void;
  onShowAlarmHistory?: () => void;
  onShowAlarmConfiguration?: () => void;
}

const { width: screenWidth } = Dimensions.get('window');
const MENU_WIDTH = Math.min(screenWidth * 0.8, 320); // 80% of screen width, max 320pt
const MAX_MENU_WIDTH = 320;

export const HamburgerMenu: React.FC<HamburgerMenuProps> = ({
  visible,
  onClose,
  onShowUnitsDialog,
  onShowFactoryResetDialog,
  onShowConnectionSettings,
  onShowLayoutSettings,
  onShowDisplayThemeSettings,
  onShowAlarmHistory,
  onShowAlarmConfiguration,
}) => {
  const theme = useTheme();
  const menuWidth = Math.min(screenWidth * 0.8, MAX_MENU_WIDTH);
  const { resetAppToDefaults } = useWidgetStore();
  const [showFeatureFlags, setShowFeatureFlags] = useState(false);

  // Get menu sections from configuration
  const { sections, devSections } = menuConfiguration;
  const showDevTools = __DEV__ || process.env.NODE_ENV === 'development';

  // Custom action handlers
  const actionHandlers = {
    openConnectionSettings: () => {
      onClose();
      requestAnimationFrame(() => onShowConnectionSettings?.());
    },
    openDisplayThemeSettings: () => {
      onClose();
      requestAnimationFrame(() => onShowDisplayThemeSettings?.());
    },
    openUnitsConfig: () => {
      onClose();
      requestAnimationFrame(() => onShowUnitsDialog?.());
    },
    openLayoutSettings: () => {
      onClose();
      requestAnimationFrame(() => onShowLayoutSettings?.());
    },
    openAlarmHistory: () => {
      onClose();
      requestAnimationFrame(() => onShowAlarmHistory?.());
    },
    performFactoryReset: async () => {
      onClose();
      requestAnimationFrame(() => onShowFactoryResetDialog?.());
    },
    resetAppToDefaults: async () => {
      await actionHandlers.performFactoryReset();
    },
    openFeatureFlags: () => {
      onClose();
      setTimeout(() => setShowFeatureFlags(true), 0);
    },
    openAlarmConfiguration: () => {
      onClose();
      requestAnimationFrame(() => onShowAlarmConfiguration?.());
    },
  };

  return (
    <>
      {/* Hamburger Menu Modal */}
      <Modal
        transparent
        visible={visible}
        animationType="none"
        onRequestClose={onClose}
      >
        <View style={styles.overlay}>
          <View
            style={[
              styles.menuContainer,
              {
                backgroundColor: theme.surface,
                width: menuWidth,
              },
            ]}
          >
            <View style={styles.menuContent}>
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
                      onPress={onClose}
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
                      onItemPress={onClose}
                      actionHandlers={actionHandlers}
                    />
                  ))}

                  {/* Development Tools Section */}
                  {showDevTools && devSections ? (
                    <DevToolsSection
                      sections={devSections}
                      onItemPress={onClose}
                      actionHandlers={actionHandlers}
                    />
                  ) : null}
                </ScrollView>
              </SafeAreaView>
            </View>
          </View>
          
          <Pressable style={styles.overlayBackground} onPress={onClose} />
        </View>
      </Modal>

      {/* Feature Flags Developer Menu - Always rendered so state persists */}
      <FeatureFlagsMenu visible={showFeatureFlags} onClose={() => setShowFeatureFlags(false)} />
    </>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    flexDirection: 'row',
  },
  overlayBackground: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  menuContainer: {
    width: MAX_MENU_WIDTH,
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
