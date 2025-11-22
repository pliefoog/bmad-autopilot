import { useTheme, ThemeColors } from '../src/store/themeStore';
import React, { useMemo } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';

// TODO: This will be fully implemented in Task 7 with actual widget selection
export default function WidgetSelectorScreen() {
  const router = useRouter();
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  const widgets = [
    'Depth', 'Speed', 'Wind', 'GPS', 'Compass', 
    'Engine', 'Battery', 'Tanks', 'Autopilot'
  ];

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={styles.title}>Add Widget</Text>
        <Text style={styles.subtitle}>Select a widget to add to your dashboard</Text>
        
        {widgets.map((widget, index) => (
          <Pressable 
            key={index}
            style={styles.widgetOption}
            onPress={() => {
              // TODO: Implement widget selection logic
              router.back();
            }}
          >
            <Text style={styles.widgetText}>{widget}</Text>
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
}

const createStyles = (theme: ThemeColors) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.appBackground,
  },
  scrollContent: {
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 10,
    color: theme.text,
  },
  subtitle: {
    fontSize: 16,
    color: theme.textSecondary,
    marginBottom: 30,
  },
  widgetOption: {
    backgroundColor: theme.surface,
    padding: 15,
    marginBottom: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: theme.borderLight,
  },
  widgetText: {
    fontSize: 16,
    fontWeight: '500',
    color: theme.text,
  },
});