import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../../store/themeStore';
import { MenuSection } from './MenuSection';
import type { MenuSectionConfig } from '../../config/menuConfiguration';

interface DevToolsSectionProps {
  sections: MenuSectionConfig[];
  onItemPress: () => void;
  actionHandlers?: Record<string, () => void>; // Optional custom handlers
}

export const DevToolsSection: React.FC<DevToolsSectionProps> = ({
  sections,
  onItemPress,
  actionHandlers = {}
}) => {
  const theme = useTheme();

  // Only render in development environment
  if (!__DEV__ && process.env.NODE_ENV !== 'development') {
    return null;
  }

  return (
    <View style={styles.container}>
      {/* Development Tools Header */}
      <View style={[styles.devHeader, { borderTopColor: theme.border }]}>
        <Text style={[styles.devHeaderText, { color: theme.warning }]}>
          🛠️ DEVELOPMENT TOOLS
        </Text>
        <Text style={[styles.devSubtext, { color: theme.textSecondary }]}>
          Only visible in development builds
        </Text>
      </View>

      {/* Development Sections */}
      {sections.map((section) => (
        <MenuSection
          key={section.id}
          section={section}
          onItemPress={onItemPress}
          actionHandlers={actionHandlers}
        />
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginTop: 16,
  },
  devHeader: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginTop: 16,
    borderTopWidth: 1,
  },
  devHeaderText: {
    fontSize: 14,
    fontWeight: 'bold',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  devSubtext: {
    fontSize: 12,
    marginTop: 2,
    fontStyle: 'italic',
  },
});