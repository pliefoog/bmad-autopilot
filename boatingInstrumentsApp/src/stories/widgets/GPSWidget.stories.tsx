import type { Meta, StoryObj } from '@storybook/react';
import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { GPSWidget } from '../../widgets/GPSWidget';
import { MaritimeSettingsConfiguration } from '../../components/settings/MaritimeSettingsConfiguration';

// Import the actual stores to mock them
import { useNmeaStore } from '../../store/nmeaStore';
import { useWidgetStore } from '../../store/widgetStore';
import { useSettingsStore } from '../../store/settingsStore';
import { useThemeStore, ThemeMode } from '../../store/themeStore';

// Mock NMEA store data for Storybook
const mockNmeaData = {
  gpsPosition: {
    latitude: 48.63665,
    longitude: -2.02335,
  },
  gpsQuality: 'GPS',
  utcTime: new Date().toISOString(),
  gpsTimestamp: Date.now(),
};

// Mock stores for Storybook environment
const MockStoreProvider: React.FC<{
  children: React.ReactNode;
  nmeaData?: any;
  coordinateFormat?: 'decimal_degrees' | 'degrees_minutes' | 'degrees_minutes_seconds' | 'utm';
}> = ({ children, nmeaData = mockNmeaData, coordinateFormat }) => {

  useEffect(() => {
    // Clear and reset NMEA store completely
    useNmeaStore.setState({
      nmeaData: {
        gpsPosition: nmeaData.gpsPosition,
        gpsQuality: nmeaData.gpsQuality,
        utcTime: nmeaData.utcTime,
        gpsTimestamp: nmeaData.gpsTimestamp,
        // Clear other fields to prevent cross-contamination
        windAngle: undefined,
        windSpeed: undefined,
        depth: undefined,
        speed: undefined,
      },
    });

    // Initialize widget store with default state
    useWidgetStore.setState({
      widgetExpanded: {},
      pinnedWidgets: [],
    });

    // Set coordinate format if provided
    if (coordinateFormat) {
      useSettingsStore.setState({
        gps: {
          ...useSettingsStore.getState().gps,
          coordinateFormat: coordinateFormat,
        },
      });
    }

    // Cleanup function to reset store when story unmounts
    return () => {
      useNmeaStore.setState({
        nmeaData: {},
      });
    };
  }, [
    nmeaData.gpsPosition?.latitude,
    nmeaData.gpsPosition?.longitude,
    nmeaData.gpsQuality,
    nmeaData.utcTime,
    nmeaData.gpsTimestamp,
    coordinateFormat,
  ]);

  return <View>{children}</View>;
};

const meta: Meta<typeof GPSWidget> = {
  title: 'Widgets/GPSWidget',
  component: GPSWidget,
  decorators: [
    (Story) => (
      <View style={{ padding: 20, backgroundColor: '#f5f5f5' }}>
        <Story />
      </View>
    ),
  ],
  parameters: {
    layout: 'fullscreen',
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

// Default GPS widget with standard coordinates (Brittany, France)
export const Default: Story = {
  render: () => (
    <MockStoreProvider
      nmeaData={{
        gpsPosition: {
          latitude: 48.63665,
          longitude: -2.02335,
        },
        gpsQuality: 'GPS',
        utcTime: new Date().toISOString(),
        gpsTimestamp: Date.now(),
      }}
    >
      <GPSWidget id="gps-1" title="GPS" />
    </MockStoreProvider>
  ),
};

// GPS widget with different coordinate locations
export const AtSeaCoordinates: Story = {
  render: () => (
    <MockStoreProvider
      nmeaData={{
        gpsPosition: {
          latitude: 51.505,
          longitude: -0.09,
        },
        gpsQuality: 'DGPS',
        utcTime: new Date().toISOString(),
        gpsTimestamp: Date.now(),
      }}
    >
      <GPSWidget id="gps-london" title="Near London" />
    </MockStoreProvider>
  ),
};

// GPS widget with Southern and Western hemispheres
export const SouthernHemisphere: Story = {
  render: () => (
    <MockStoreProvider
      nmeaData={{
        gpsPosition: {
          latitude: -33.8688,  // Sydney, Australia
          longitude: 151.2093,
        },
        gpsQuality: 'GPS',
        utcTime: new Date().toISOString(),
        gpsTimestamp: Date.now(),
      }}
    >
      <GPSWidget id="gps-sydney" title="Sydney, Australia" />
    </MockStoreProvider>
  ),
};

// GPS widget with no data (null values)
export const NoGPSFix: Story = {
  render: () => (
    <MockStoreProvider
      nmeaData={{
        gpsPosition: {
          latitude: null,
          longitude: null,
        },
        gpsQuality: 'No Fix',
        utcTime: null,
        gpsTimestamp: null,
      }}
    >
      <GPSWidget id="gps-no-fix" title="No GPS Signal" />
    </MockStoreProvider>
  ),
};

// Maritime Settings Configuration - Complete GPS and Ship Time settings
// This story shows how GPS widget responds to settings changes in real-time
export const MaritimeSettings: Story = {
  render: () => {
    // Use current time for realistic preview
    const currentTime = new Date();

    return (
      <MockStoreProvider
        nmeaData={{
          gpsPosition: {
            latitude: 48.63665,   // Brittany, France
            longitude: -2.02335,
          },
          gpsQuality: 'DGPS',
          utcTime: currentTime.toISOString(),
          gpsTimestamp: Date.now(),
        }}
      >
        <ScrollView style={{ backgroundColor: '#f8fafc' }}>
          <View style={{ padding: 20, gap: 20 }}>
            {/* GPS Widget Preview - Updates when settings change */}
            <View style={{ backgroundColor: 'white', padding: 16, borderRadius: 8, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 3 }}>
              <Text style={styles.previewTitle}>📍 Live GPS Widget Preview</Text>
              <Text style={styles.previewNote}>
                Current Position: Brittany, France (48.63665°N, 2.02335°W)
              </Text>
              <Text style={styles.previewNote}>
                Time: {currentTime.toLocaleString('en-US', { weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit', timeZoneName: 'short' })}
              </Text>

              <View style={{ marginTop: 12, marginBottom: 8 }}>
                <GPSWidget id="gps-preview" title="GPS Position" />
              </View>

              <View style={{ backgroundColor: '#eff6ff', padding: 12, borderRadius: 8, borderLeftWidth: 3, borderLeftColor: '#3b82f6' }}>
                <Text style={{ fontSize: 13, color: '#1e40af', fontWeight: '600', marginBottom: 4 }}>
                  💡 Interactive Demo
                </Text>
                <Text style={{ fontSize: 12, color: '#1e40af', lineHeight: 18 }}>
                  • Change <Text style={styles.bold}>Coordinate Format</Text> below to see LAT/LON display update{'\n'}
                  • Adjust <Text style={styles.bold}>Date/Time Format</Text> to see expanded view change{'\n'}
                  • Select <Text style={styles.bold}>Timezone</Text> to see local time conversion{'\n'}
                  • Click the ⌄ caret to expand/collapse the widget
                </Text>
              </View>
            </View>

            {/* Complete Maritime Settings */}
            <MaritimeSettingsConfiguration />

            {/* Implementation Notes */}
            <View style={styles.implementationNotes}>
              <Text style={styles.notesTitle}>✅ Implementation Features</Text>
              <Text style={styles.notesText}>
                ✓ <Text style={styles.bold}>GPS Section:</Text> Coordinate format (DD/DDM/DMS/UTM), Date, Time, Timezone{'\n'}
                ✓ <Text style={styles.bold}>Ship Time Section:</Text> Date, Time, Timezone (without coordinate format){'\n'}
                ✓ <Text style={styles.bold}>Timezone Dropdown:</Text> UTC±n format with major cities/countries{'\n'}
                ✓ <Text style={styles.bold}>Proper Maritime Abbreviations:</Text> DD, DDM, DMS, UTM instead of symbols{'\n'}
                ✓ <Text style={styles.bold}>Time Format Notation:</Text> HH:mm, hh:mm a, etc. instead of component letters{'\n'}
                ✓ <Text style={styles.bold}>Separate Settings:</Text> GPS for navigation, Ship Time for ETAs/schedules{'\n'}
                ✓ <Text style={styles.bold}>Comprehensive Timezones:</Text> 50+ zones with half-hour offsets included{'\n'}
                ✓ <Text style={styles.bold}>Real-time Updates:</Text> Widget reflects settings changes immediately
              </Text>
            </View>
          </View>
        </ScrollView>
      </MockStoreProvider>
    );
  },
};

const styles = StyleSheet.create({
  previewTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 12,
  },
  previewNote: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 8,
    fontStyle: 'italic',
  },
  implementationNotes: {
    backgroundColor: '#f0fdf4',
    padding: 16,
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#22c55e',
  },
  notesTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#15803d',
    marginBottom: 8,
  },
  notesText: {
    fontSize: 14,
    color: '#15803d',
    lineHeight: 20,
  },
  bold: {
    fontWeight: '600',
  },
});

// Critical alignment validation story for V2.3 completion
export const AlignmentValidation: Story = {
  render: () => (
    <MockStoreProvider
      nmeaData={{
        gpsPosition: {
          latitude: 48.63665,
          longitude: -2.02335,
        },
        gpsQuality: 'GPS',
        utcTime: new Date().toISOString(),
        gpsTimestamp: Date.now(),
      }}
    >
      <View style={{ padding: 20, gap: 20 }}>
        <View style={{ backgroundColor: 'white', padding: 16, borderRadius: 8 }}>
          <GPSWidget id="gps-ddm" title="GPS (DDM Format)" />
          <View style={{ marginTop: 10, padding: 8, backgroundColor: '#e3f2fd' }}>
            <Text>✓ Coordinates should be RIGHT-ALIGNED</Text>
            <Text>✓ Values align to right edge of hemisphere indicators (N, W)</Text>
            <Text>✓ Decimal alignment maintained across coordinate formats</Text>
          </View>
        </View>
      </View>
    </MockStoreProvider>
  ),
};

// NOTE: Coordinate formats can be tested interactively in the MaritimeSettings story
// Removed CoordinateFormats story due to Zustand singleton limitation

// Maritime theme validation with interactive theme selector
export const MaritimeThemes: Story = {
  render: () => {
    const [selectedTheme, setSelectedTheme] = useState<ThemeMode>('day');

    // Theme options
    const themes: { mode: ThemeMode; label: string; description: string; bgColor: string }[] = [
      { mode: 'day', label: '☀️ Day', description: 'High contrast for outdoor visibility', bgColor: '#ffffff' },
      { mode: 'night', label: '🌙 Night', description: 'Reduced brightness for indoor use', bgColor: '#1a1a2e' },
      { mode: 'red-night', label: '👁️ Red Night', description: 'Marine night vision preservation', bgColor: '#0f0000' },
      { mode: 'auto', label: '🕐 Auto', description: 'Automatic theme based on time', bgColor: '#f0f0f0' },
    ];

    return (
      <MockStoreProvider
        nmeaData={{
          gpsPosition: {
            latitude: 48.63665,
            longitude: -2.02335,
          },
          gpsQuality: 'GPS',
          utcTime: new Date().toISOString(),
          gpsTimestamp: Date.now(),
        }}
      >
        <ScrollView style={{ flex: 1 }}>
          <View style={{ padding: 20 }}>
            {/* Theme Selector */}
            <View style={{ marginBottom: 20 }}>
              <Text style={{ fontSize: 16, fontWeight: '600', color: '#1e293b', marginBottom: 12 }}>
                Select Maritime Theme
              </Text>
              <View style={{ flexDirection: 'row', gap: 12, flexWrap: 'wrap' }}>
                {themes.map((theme) => (
                  <TouchableOpacity
                    key={theme.mode}
                    onPress={() => {
                      setSelectedTheme(theme.mode);
                      useThemeStore.getState().setMode(theme.mode);
                    }}
                    style={{
                      padding: 12,
                      borderRadius: 8,
                      backgroundColor: selectedTheme === theme.mode ? '#3b82f6' : '#f1f5f9',
                      borderWidth: 2,
                      borderColor: selectedTheme === theme.mode ? '#2563eb' : '#e2e8f0',
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 14,
                        fontWeight: '600',
                        color: selectedTheme === theme.mode ? '#ffffff' : '#1e293b',
                      }}
                    >
                      {theme.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Current Theme Info */}
            <View style={{ backgroundColor: '#eff6ff', padding: 12, borderRadius: 8, marginBottom: 20 }}>
              <Text style={{ fontSize: 14, color: '#1e40af', fontWeight: '600' }}>
                {themes.find(t => t.mode === selectedTheme)?.label || 'Day'}
              </Text>
              <Text style={{ fontSize: 12, color: '#1e40af', marginTop: 4 }}>
                {themes.find(t => t.mode === selectedTheme)?.description}
              </Text>
            </View>

            {/* GPS Widget with Dynamic Background */}
            <View
              style={{
                backgroundColor: themes.find(t => t.mode === selectedTheme)?.bgColor || '#ffffff',
                padding: 20,
                borderRadius: 12,
              }}
            >
              <GPSWidget id="gps-theme-demo" title="GPS Position" />
            </View>

            {/* Implementation Notes */}
            <View style={{ backgroundColor: '#f0fdf4', padding: 16, borderRadius: 12, marginTop: 20, borderLeftWidth: 4, borderLeftColor: '#22c55e' }}>
              <Text style={{ fontSize: 16, fontWeight: '600', color: '#15803d', marginBottom: 8 }}>
                💡 Interactive Demo
              </Text>
              <Text style={{ fontSize: 14, color: '#15803d', lineHeight: 20 }}>
                • Select different themes above to see the GPS widget adapt{'\n'}
                • Click the ⌄ caret to expand and see Date/Time with theme styling{'\n'}
                • Day theme: High contrast for outdoor sunlight visibility{'\n'}
                • Night theme: Reduced brightness for cockpit use at night{'\n'}
                • Red Night: Preserves night-adapted vision for navigation{'\n'}
                • Auto: Switches automatically based on time of day
              </Text>
            </View>
          </View>
        </ScrollView>
      </MockStoreProvider>
    );
  },
};

// Expanded vs Collapsed states
export const WidgetStates: Story = {
  render: () => (
    <MockStoreProvider
      nmeaData={{
        gpsPosition: {
          latitude: 48.63665,
          longitude: -2.02335,
        },
        gpsQuality: 'GPS',
        utcTime: new Date().toISOString(),
        gpsTimestamp: Date.now(),
      }}
    >
      <View style={{ padding: 20, gap: 20 }}>
        <View style={{ backgroundColor: 'white', padding: 16, borderRadius: 8 }}>
          <GPSWidget id="gps-collapsed" title="GPS (Collapsed)" />
          <Text style={{ marginTop: 8, color: '#666' }}>Collapsed: Shows LAT/LON only</Text>
        </View>

        <View style={{ backgroundColor: 'white', padding: 16, borderRadius: 8 }}>
          <GPSWidget id="gps-expanded" title="GPS (Expanded)" />
          <Text style={{ marginTop: 8, color: '#666' }}>Expanded: Shows LAT/LON + UTC Date/Time</Text>
        </View>
      </View>
    </MockStoreProvider>
  ),
};

// Data quality states - All show fresh data (see individual stories for stale/no-data)
export const DataStates: Story = {
  render: () => (
    <MockStoreProvider
      nmeaData={{
        gpsPosition: {
          latitude: 48.63665,
          longitude: -2.02335,
        },
        gpsQuality: 'GPS',
        utcTime: new Date().toISOString(),
        gpsTimestamp: Date.now(),
      }}
    >
      <View style={{ padding: 20, flexDirection: 'row', gap: 16 }}>
        <View style={{ flex: 1, backgroundColor: 'white', padding: 12, borderRadius: 8 }}>
          <GPSWidget id="gps-normal" title="GPS (Normal)" />
          <Text style={{ fontSize: 12, color: '#4caf50', marginTop: 8 }}>✓ Fresh GPS data</Text>
        </View>

        <View style={{ flex: 1, backgroundColor: 'white', padding: 12, borderRadius: 8 }}>
          <GPSWidget id="gps-stale-demo" title="GPS (Stale)" />
          <Text style={{ fontSize: 12, color: '#ff9800', marginTop: 8 }}>See individual story</Text>
        </View>

        <View style={{ flex: 1, backgroundColor: 'white', padding: 12, borderRadius: 8 }}>
          <GPSWidget id="gps-no-data-demo" title="GPS (No Data)" />
          <Text style={{ fontSize: 12, color: '#f44336', marginTop: 8 }}>See "NoGPSFix" story</Text>
        </View>
      </View>
    </MockStoreProvider>
  ),
};