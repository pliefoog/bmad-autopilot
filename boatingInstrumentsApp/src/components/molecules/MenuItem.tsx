import React from 'react';
import { TouchableOpacity, Text, View, StyleSheet } from 'react-native';
import { useTheme } from '../../store/themeStore';
import type { MenuItem as MenuItemType } from '../../config/menuConfiguration';

interface MenuItemProps {
  item: MenuItemType;
  onPress: () => void;
}

export const MenuItem: React.FC<MenuItemProps> = ({ item, onPress }) => {
  const theme = useTheme();

  return (
    <TouchableOpacity
      style={[
        styles.container,
        {
          backgroundColor: theme.surface,
          borderBottomColor: theme.border,
        },
        item.disabled && styles.disabled,
      ]}
      onPress={onPress}
      disabled={item.disabled}
      testID={item.testId}
    >
      <View style={styles.content}>
        <View style={styles.leftSection}>
          <Text style={styles.icon}>{item.icon}</Text>
          <Text
            style={[
              styles.label,
              { color: item.disabled ? theme.textSecondary : theme.text },
            ]}
          >
            {item.label}
          </Text>
        </View>
        
        {item.badge && (
          <View style={[styles.badge, { backgroundColor: theme.primary }]}>
            <Text style={[styles.badgeText, { color: theme.background }]}>
              {item.badge}
            </Text>
          </View>
        )}

        <Text style={[styles.chevron, { color: theme.textSecondary }]}>
          ›
        </Text>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    minHeight: 44, // Minimum touch target for marine glove operation
  },
  leftSection: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  icon: {
    fontSize: 20,
    marginRight: 12,
    width: 24,
    textAlign: 'center',
  },
  label: {
    fontSize: 16,
    fontWeight: '500',
    flex: 1,
  },
  badge: {
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 2,
    marginRight: 8,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  chevron: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  disabled: {
    opacity: 0.5,
  },
});