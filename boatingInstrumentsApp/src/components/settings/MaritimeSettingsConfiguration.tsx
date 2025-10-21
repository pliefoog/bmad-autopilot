import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { useSettingsStore } from '../../store/settingsStore';

interface SettingsSectionProps {
  title: string;
  children: React.ReactNode;
}

const SettingsSection: React.FC<SettingsSectionProps> = ({ title, children }) => (
  <View style={styles.section}>
    <Text style={styles.sectionTitle}>{title}</Text>
    {children}
  </View>
);

interface OptionButtonProps {
  label: string;
  description?: string;
  selected: boolean;
  onPress: () => void;
}

const OptionButton: React.FC<OptionButtonProps> = ({ label, description, selected, onPress }) => (
  <TouchableOpacity
    style={[styles.optionButton, selected && styles.optionButtonSelected]}
    onPress={onPress}
  >
    <Text style={[styles.optionLabel, selected && styles.optionLabelSelected]}>
      {label}
    </Text>
    {description && (
      <Text style={styles.optionDescription}>{description}</Text>
    )}
  </TouchableOpacity>
);

interface SimpleTimezonePickerProps {
  selectedTimezone: string;
  onTimezoneChange: (offset: number) => void;
  expanded: boolean;
  onToggleExpanded: () => void;
}

const SimpleTimezonePicker: React.FC<SimpleTimezonePickerProps> = ({
  selectedTimezone,
  onTimezoneChange,
  expanded,
  onToggleExpanded
}) => {
  // Simple UTC offset timezones from -12 to +14 with major cities
  const timezoneOffsets = [
    { offset: -12, label: 'UTC-12', cities: 'Baker Island' },
    { offset: -11, label: 'UTC-11', cities: 'Pago Pago' },
    { offset: -10, label: 'UTC-10', cities: 'Honolulu' },
    { offset: -9, label: 'UTC-9', cities: 'Anchorage' },
    { offset: -8, label: 'UTC-8', cities: 'Los Angeles, Vancouver' },
    { offset: -7, label: 'UTC-7', cities: 'Denver, Phoenix' },
    { offset: -6, label: 'UTC-6', cities: 'Chicago, Mexico City' },
    { offset: -5, label: 'UTC-5', cities: 'New York, Toronto' },
    { offset: -4, label: 'UTC-4', cities: 'Halifax, Caracas' },
    { offset: -3, label: 'UTC-3', cities: 'Buenos Aires, São Paulo' },
    { offset: -2, label: 'UTC-2', cities: 'South Georgia' },
    { offset: -1, label: 'UTC-1', cities: 'Azores, Cape Verde' },
    { offset: 0, label: 'UTC', cities: 'London, Reykjavik' },
    { offset: 1, label: 'UTC+1', cities: 'Paris, Rome, Berlin' },
    { offset: 2, label: 'UTC+2', cities: 'Athens, Cairo, Helsinki' },
    { offset: 3, label: 'UTC+3', cities: 'Moscow, Istanbul' },
    { offset: 4, label: 'UTC+4', cities: 'Dubai, Baku' },
    { offset: 5, label: 'UTC+5', cities: 'Karachi, Tashkent' },
    { offset: 6, label: 'UTC+6', cities: 'Dhaka, Almaty' },
    { offset: 7, label: 'UTC+7', cities: 'Bangkok, Jakarta' },
    { offset: 8, label: 'UTC+8', cities: 'Singapore, Hong Kong' },
    { offset: 9, label: 'UTC+9', cities: 'Tokyo, Seoul' },
    { offset: 10, label: 'UTC+10', cities: 'Sydney, Brisbane' },
    { offset: 11, label: 'UTC+11', cities: 'Solomon Islands' },
    { offset: 12, label: 'UTC+12', cities: 'Auckland, Fiji' },
    { offset: 13, label: 'UTC+13', cities: 'Nuku\'alofa' },
    { offset: 14, label: 'UTC+14', cities: 'Kiribati' },
  ];

  // Parse current timezone offset from string (e.g., "utc" or "5" or "-5")
  const currentOffset = selectedTimezone === 'utc' || selectedTimezone === '0' ? 0 : parseInt(selectedTimezone) || 0;
  const currentLabel = timezoneOffsets.find(tz => tz.offset === currentOffset)?.label || 'UTC';

  return (
    <View style={styles.timezonePicker}>
      <TouchableOpacity style={styles.timezoneHeader} onPress={onToggleExpanded}>
        <Text style={styles.timezoneLabel}>Timezone</Text>
        <Text style={styles.timezoneValue}>{currentLabel}</Text>
        <Text style={styles.expandIcon}>{expanded ? '▲' : '▼'}</Text>
      </TouchableOpacity>

      {expanded && (
        <ScrollView style={styles.timezoneDropdown} nestedScrollEnabled>
          <View style={styles.timezoneList}>
            {timezoneOffsets.map((tz) => (
              <TouchableOpacity
                key={tz.offset}
                style={[
                  styles.timezoneOption,
                  currentOffset === tz.offset && styles.timezoneOptionSelected,
                ]}
                onPress={() => {
                  onTimezoneChange(tz.offset);
                  onToggleExpanded();
                }}
              >
                <View style={styles.timezoneOptionContent}>
                  <Text style={[
                    styles.timezoneOptionText,
                    currentOffset === tz.offset && styles.timezoneOptionTextSelected
                  ]}>
                    {tz.label}
                  </Text>
                  <Text style={styles.timezoneCityText}>{tz.cities}</Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
      )}
    </View>
  );
};

export const MaritimeSettingsConfiguration: React.FC = () => {
  const { gps, setGpsSetting } = useSettingsStore();
  const [expandedTimezone, setExpandedTimezone] = useState<boolean>(false);

  // Coordinate format options
  const coordinateFormats = [
    { id: 'decimal_degrees', label: 'DD', description: 'Decimal Degrees (51.35872°)' },
    { id: 'degrees_minutes', label: 'DDM', description: 'Degrees Decimal Minutes (51° 21.523\')' },
    { id: 'degrees_minutes_seconds', label: 'DMS', description: 'Degrees Minutes Seconds (51° 21\' 31.4")' },
  ];

  // Date format options (all include day abbreviation DDD for nautical use)
  const dateFormats = [
    { id: 'iso_date', label: 'DDD YYYY-MM-DD', description: 'Mon 2025-10-21 (ISO with day)' },
    { id: 'us_date', label: 'DDD MM/DD/YYYY', description: 'Mon 10/21/2025 (US with day)' },
    { id: 'eu_date', label: 'DDD DD.MM.YYYY', description: 'Mon 21.10.2025 (EU with day)' },
    { id: 'uk_date', label: 'DDD DD MMM YYYY', description: 'Mon 21 Oct 2025 (UK with day)' },
    { id: 'nautical_date', label: 'DDD, MMM DD, YYYY', description: 'Mon, Oct 21, 2025 (Nautical)' },
  ];

  // Time format options
  const timeFormats = [
    { id: 'time_24h_full', label: 'HH:mm:ss', description: '14:30:45 (24-hour with seconds)' },
    { id: 'time_24h', label: 'HH:mm', description: '14:30 (24-hour format)' },
    { id: 'time_12h_full', label: 'hh:mm:ss a', description: '02:30:45 PM (12-hour with seconds)' },
    { id: 'time_12h', label: 'hh:mm a', description: '02:30 PM (12-hour format)' },
    { id: 'time_compact', label: 'HH.mm', description: '14.30 (Compact format)' },
  ];

  return (
    <ScrollView style={styles.container}>
      {/* GPS Settings Section */}
      <SettingsSection title="🗺️ GPS Settings">
        <View style={styles.subsection}>
          <Text style={styles.subsectionTitle}>Coordinate Format</Text>
          <View style={styles.optionsGrid}>
            {coordinateFormats.map((format) => (
              <OptionButton
                key={format.id}
                label={format.label}
                description={format.description}
                selected={gps.coordinateFormat === format.id}
                onPress={() => setGpsSetting('coordinateFormat', format.id)}
              />
            ))}
          </View>
        </View>

        <View style={styles.subsection}>
          <Text style={styles.subsectionTitle}>Date Format</Text>
          <View style={styles.optionsGrid}>
            {dateFormats.map((format) => (
              <OptionButton
                key={format.id}
                label={format.label}
                description={format.description}
                selected={gps.dateFormat === format.id}
                onPress={() => setGpsSetting('dateFormat', format.id)}
              />
            ))}
          </View>
        </View>

        <View style={styles.subsection}>
          <Text style={styles.subsectionTitle}>Time Format</Text>
          <View style={styles.optionsGrid}>
            {timeFormats.map((format) => (
              <OptionButton
                key={format.id}
                label={format.label}
                description={format.description}
                selected={gps.timeFormat === format.id}
                onPress={() => setGpsSetting('timeFormat', format.id)}
              />
            ))}
          </View>
        </View>

        <View style={styles.subsection}>
          <Text style={styles.subsectionTitle}>Timezone</Text>
          <SimpleTimezonePicker
            selectedTimezone={gps.timezone}
            onTimezoneChange={(offset) => setGpsSetting('timezone', offset.toString())}
            expanded={expandedTimezone}
            onToggleExpanded={() => setExpandedTimezone(!expandedTimezone)}
          />
        </View>
      </SettingsSection>

      <View style={styles.helpSection}>
        <Text style={styles.helpTitle}>📖 Maritime Time Management</Text>
        <Text style={styles.helpText}>
          • <Text style={styles.bold}>GPS Time:</Text> Used for position fixes and navigation data (typically UTC){'\n'}
          • <Text style={styles.bold}>Ship Time:</Text> Used for crew schedules, ETAs, and local operations{'\n'}
          • <Text style={styles.bold}>UTC±n Format:</Text> Shows offset from Coordinated Universal Time{'\n'}
          • <Text style={styles.bold}>Major Cities:</Text> Reference points for timezone identification
        </Text>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  section: {
    backgroundColor: 'white',
    margin: 16,
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 8,
  },
  sectionDescription: {
    fontSize: 14,
    color: '#64748b',
    marginBottom: 16,
    lineHeight: 20,
  },
  subsection: {
    marginBottom: 24,
  },
  subsectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 12,
  },
  optionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  optionButton: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    padding: 12,
    backgroundColor: '#f9fafb',
    minWidth: 120,
    alignItems: 'center',
  },
  optionButtonSelected: {
    borderColor: '#059669',
    backgroundColor: 'rgba(5, 150, 105, 0.08)',
  },
  optionLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 4,
  },
  optionLabelSelected: {
    color: '#059669',
  },
  optionDescription: {
    fontSize: 12,
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 16,
  },
  timezonePicker: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    backgroundColor: '#ffffff',
  },
  timezoneHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    justifyContent: 'space-between',
  },
  timezoneLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    flex: 1,
  },
  timezoneValue: {
    fontSize: 14,
    color: '#6b7280',
    flex: 2,
    textAlign: 'center',
  },
  expandIcon: {
    fontSize: 12,
    color: '#9ca3af',
  },
  timezoneDropdown: {
    maxHeight: 300,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  timezoneList: {
    paddingHorizontal: 4,
  },
  timezoneOption: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  timezoneOptionSelected: {
    backgroundColor: 'rgba(5, 150, 105, 0.08)',
  },
  timezoneOptionContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  timezoneOptionText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#374151',
    minWidth: 60,
  },
  timezoneOptionTextSelected: {
    color: '#059669',
    fontWeight: '700',
  },
  timezoneCityText: {
    fontSize: 12,
    color: '#6b7280',
    fontStyle: 'italic',
    flex: 1,
    textAlign: 'right',
  },
  helpSection: {
    backgroundColor: '#fffbeb',
    margin: 16,
    padding: 16,
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#f59e0b',
  },
  helpTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#92400e',
    marginBottom: 8,
  },
  helpText: {
    fontSize: 14,
    color: '#92400e',
    lineHeight: 20,
  },
  bold: {
    fontWeight: '600',
  },
});

export default MaritimeSettingsConfiguration;