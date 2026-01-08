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
  Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../store/themeStore';
import { useWidgetStore } from '../../store/widgetStore';
import { log as logger } from '../../utils/logging/logger';
import { MenuItem } from '../molecules/MenuItem';
import { useMenuState } from '../../hooks/useMenuState';
import { menuItems } from '../../config/menuConfiguration';

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

  // Filter menu items (show dev items only in dev builds)
  const visibleItems = menuItems.filter(item => !item.devOnly || __DEV__);

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
                      <Ionicons name="close" size={24} color={theme.textSecondary} />
                    </TouchableOpacity>
                  </View>

                  {/* Flat Menu Items */}
                  <View style={styles.menuItems}>
                    {visibleItems.map((item, index) => (
                      <React.Fragment key={item.id}>
                        {item.isDividerBefore && (
                          <View
                            style={[
                              styles.divider,
                              { backgroundColor: theme.border },
                            ]}
                          />
                        )}
                        <MenuItem
                          item={item}
                          onPress={() => {
                            const handler = actionHandlers[item.action as keyof typeof actionHandlers];
                            if (handler) {
                              handler();
                            }
                          }}
                        />
                      </React.Fragment>
                    ))}
                  </View>
                </ScrollView>
              </SafeAreaView>
            </View>
          </View>
          
          <Pressable style={styles.overlayBackground} onPress={onClose} />
        </View>
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
    height: 44, // Match HeaderBar height (Apple HIG standard)
    borderBottomWidth: 1,
  },
  closeButton: {
    padding: 8,
    borderRadius: 20,
  },
  menuItems: {
    paddingTop: 8,
  },
  divider: {
    height: 1,
    marginVertical: 12,
    marginHorizontal: 16,
  },
});
