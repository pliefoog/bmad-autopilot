/**
 * Instance Tab Bar Component
 *
 * Horizontal scrolling tab bar for multi-instance sensor navigation.
 * Shows only when there are 2+ instances available.
 */

import React from 'react';
import { View, Text, TouchableOpacity, FlatList, StyleSheet } from 'react-native';
import { ThemeColors } from '../../../store/themeStore';

export interface SensorInstance {
  instance: number;
  name?: string;
  location?: string;
}

export interface InstanceTabBarProps {
  instances: SensorInstance[];
  selectedInstance: number;
  onInstanceSelect: (instance: number) => void;
  theme: ThemeColors;
}

export const InstanceTabBar: React.FC<InstanceTabBarProps> = ({
  instances,
  selectedInstance,
  onInstanceSelect,
  theme,
}) => {
  if (instances.length <= 1) return null;

  return (
    <View
      style={[
        styles.tabContainer,
        {
          backgroundColor: theme.surface,
          borderBottomColor: theme.border,
        },
      ]}
    >
      <FlatList
        data={instances}
        horizontal
        showsHorizontalScrollIndicator={false}
        keyExtractor={(item) => item.instance.toString()}
        contentContainerStyle={styles.tabContentContainer}
        renderItem={({ item: inst }) => {
          const isSelected = inst.instance === selectedInstance;
          const displayName = inst.name || inst.location || `Instance ${inst.instance}`;

          return (
            <TouchableOpacity
              style={[
                styles.tab,
                {
                  backgroundColor: theme.surface,
                  borderColor: theme.border,
                },
                isSelected && {
                  backgroundColor: theme.primary,
                  borderColor: theme.primary,
                },
              ]}
              onPress={() => onInstanceSelect(inst.instance)}
              activeOpacity={0.7}
            >
              <Text
                style={[styles.tabText, { color: isSelected ? theme.textInverse : theme.text }]}
              >
                {displayName}
              </Text>
            </TouchableOpacity>
          );
        }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  tabContainer: {
    borderBottomWidth: 1,
  },
  tabContentContainer: {
    paddingHorizontal: 12,
  },
  tab: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginRight: 8,
    borderWidth: 1,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
  },
});
