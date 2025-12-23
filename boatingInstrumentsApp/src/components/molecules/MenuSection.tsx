import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../../store/themeStore';
import { MenuItem } from './MenuItem';
import { useMenuActions } from '../../hooks/useMenuActions';
import type { MenuSectionConfig } from '../../config/menuConfiguration';

interface MenuSectionProps {
  section: MenuSectionConfig;
  onItemPress: () => void; // Called after action to close menu
  actionHandlers?: Record<string, () => void>; // Optional custom handlers
}

export const MenuSection: React.FC<MenuSectionProps> = ({
  section,
  onItemPress,
  actionHandlers = {},
}) => {
  const theme = useTheme();
  const { executeAction } = useMenuActions();

  const handleItemPress = (actionId: string) => {
    // Check if there's a custom handler for this action
    if (actionHandlers[actionId]) {
      actionHandlers[actionId]();
      // Custom handlers manage their own menu closing, so don't call onItemPress
      // which would cause double-close or interfere with timing
    } else {
      // Otherwise use the default action executor
      executeAction(actionId);
      onItemPress(); // Close menu after action
    }
  };

  return (
    <View style={styles.container}>
      {/* Section Header */}
      <View style={[styles.header, { backgroundColor: theme.background }]}>
        <Text style={styles.headerIcon}>{section.icon}</Text>
        <Text style={[styles.headerTitle, { color: theme.text }]}>{section.title}</Text>
      </View>

      {/* Section Items */}
      <View style={[styles.itemsContainer, { backgroundColor: theme.surface }]}>
        {section.items.map((item) => (
          <MenuItem key={item.id} item={item} onPress={() => handleItemPress(item.action)} />
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 8,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  headerIcon: {
    fontSize: 18,
    marginRight: 8,
  },
  headerTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  itemsContainer: {
    borderRadius: 8,
    marginHorizontal: 8,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
});
