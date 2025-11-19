import React from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView } from 'react-native';
import { useRouter, Stack } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function SettingsScreen() {
  const router = useRouter();

  const settingsOptions = [
    {
      id: 'alarms',
      title: 'Alarm Configuration',
      description: 'Configure critical safety alarms and thresholds',
      icon: '⚠️',
      route: '/settings/alarms',
      available: true,
    },
    {
      id: 'connection',
      title: 'Connection Settings',
      description: 'NMEA bridge and network configuration',
      icon: '📡',
      route: '/settings/connection',
      available: false,
    },
    {
      id: 'display',
      title: 'Display & Theme',
      description: 'Customize appearance and layout',
      icon: '🎨',
      route: '/settings/display',
      available: false,
    },
    {
      id: 'widgets',
      title: 'Widget Settings',
      description: 'Configure widget behavior and data sources',
      icon: '📊',
      route: '/settings/widgets',
      available: false,
    },
  ];

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Settings',
          headerBackTitle: 'Dashboard',
        }}
      />
      <SafeAreaView style={styles.container}>
        <ScrollView style={styles.scrollView}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Configuration</Text>
          
          {settingsOptions.map((option) => (
            <Pressable
              key={option.id}
              style={[styles.optionCard, !option.available && styles.optionCardDisabled]}
              onPress={() => option.available && router.push(option.route as any)}
              disabled={!option.available}
            >
              <Text style={styles.optionIcon}>{option.icon}</Text>
              <View style={styles.optionContent}>
                <Text style={[styles.optionTitle, !option.available && styles.optionTitleDisabled]}>
                  {option.title}
                </Text>
                <Text style={styles.optionDescription}>{option.description}</Text>
                {!option.available && (
                  <Text style={styles.comingSoonBadge}>Coming Soon</Text>
                )}
              </View>
              {option.available && (
                <Text style={styles.chevron}>›</Text>
              )}
            </Pressable>
          ))}
        </View>

        <View style={styles.infoSection}>
          <Text style={styles.infoTitle}>About</Text>
          <Text style={styles.infoText}>BMad Autopilot v2.3</Text>
          <Text style={styles.infoText}>Marine Instrument Display System</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F2F2F7',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  backButton: {
    padding: 8,
  },
  backButtonText: {
    fontSize: 17,
    color: '#007AFF',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#000000',
  },
  headerSpacer: {
    width: 60,
  },
  scrollView: {
    flex: 1,
  },
  section: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#000000',
    marginBottom: 16,
  },
  optionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  optionCardDisabled: {
    opacity: 0.6,
  },
  optionIcon: {
    fontSize: 28,
    marginRight: 12,
  },
  optionContent: {
    flex: 1,
  },
  optionTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 4,
  },
  optionTitleDisabled: {
    color: '#666',
  },
  optionDescription: {
    fontSize: 14,
    color: '#666',
  },
  comingSoonBadge: {
    fontSize: 12,
    color: '#FF9500',
    fontWeight: '600',
    marginTop: 4,
  },
  chevron: {
    fontSize: 24,
    color: '#C7C7CC',
    marginLeft: 8,
  },
  infoSection: {
    padding: 16,
    marginTop: 16,
  },
  infoTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  infoText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
});