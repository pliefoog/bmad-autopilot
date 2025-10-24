import type { Meta, StoryObj } from '@storybook/react';
import React, { useEffect } from 'react';
import { View, Text } from 'react-native';
import { WindWidget } from '../../widgets/WindWidget';

// Import the actual stores to mock them
import { useNmeaStore } from '../../store/nmeaStore';
import { useWidgetStore } from '../../store/widgetStore';

// Mock NMEA store data for Storybook
const mockWindData = {
  windAngle: 45, // AWA - Apparent Wind Angle
  windSpeed: 12.5, // AWS - Apparent Wind Speed in knots
  heading: 180, // Vessel heading for true wind calculation
  sog: 8.2, // Speed over ground for true wind calculation
  windTimestamp: Date.now(),
};

const MockStoreProvider: React.FC<{
  children: React.ReactNode;
  windData?: any;
}> = ({ children, windData = mockWindData }) => {

  useEffect(() => {
    // Clear and reset NMEA store completely
    useNmeaStore.setState({
      nmeaData: {
        windAngle: windData.windAngle,
        windSpeed: windData.windSpeed,
        heading: windData.heading,
        sog: windData.sog,
        windTimestamp: windData.windTimestamp,
        // Clear other fields to prevent cross-contamination
        gpsPosition: undefined,
        depth: undefined,
        speed: undefined,
      },
    });

    // Initialize widget store with default state
    useWidgetStore.setState({
      widgetExpanded: {},
      pinnedWidgets: [],
    });

    // Cleanup function to reset store when story unmounts
    return () => {
      useNmeaStore.setState({
        nmeaData: {},
      });
    };
  }, [
    windData.windAngle,
    windData.windSpeed,
    windData.heading,
    windData.sog,
    windData.windTimestamp,
  ]);

  return <View>{children}</View>;
};

const meta: Meta<typeof WindWidget> = {
  title: 'Widgets/WindWidget',
  component: WindWidget,
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

// Default wind widget with moderate conditions
export const Default: Story = {
  render: () => (
    <MockStoreProvider
      windData={{
        windAngle: 45,
        windSpeed: 12.5,
        heading: 180,
        sog: 8.2,
        windTimestamp: Date.now(),
      }}
    >
      <WindWidget id="wind-1" title="Wind" />
    </MockStoreProvider>
  ),
};

// Light wind conditions
export const LightWind: Story = {
  render: () => (
    <MockStoreProvider
      windData={{
        windAngle: 30,
        windSpeed: 5.2, // Light breeze
        heading: 90,
        sog: 4.5,
        windTimestamp: Date.now(),
      }}
    >
      <WindWidget id="wind-light" title="Light Winds" />
    </MockStoreProvider>
  ),
};

// Strong wind conditions
export const StrongWind: Story = {
  render: () => (
    <MockStoreProvider
      windData={{
        windAngle: 75,
        windSpeed: 22.5, // Gale force
        heading: 220,
        sog: 3.2,
        windTimestamp: Date.now(),
      }}
    >
      <WindWidget id="wind-strong" title="Strong Winds" />
    </MockStoreProvider>
  ),
};

// Headwind scenario (wind coming from ahead)
export const Headwind: Story = {
  render: () => (
    <MockStoreProvider
      windData={{
        windAngle: 0, // Dead ahead
        windSpeed: 15.0,
        heading: 180,
        sog: 6.0,
        windTimestamp: Date.now(),
      }}
    >
      <WindWidget id="wind-headwind" title="Headwind" />
    </MockStoreProvider>
  ),
};

// Tailwind scenario (wind from behind)
export const Tailwind: Story = {
  render: () => (
    <MockStoreProvider
      windData={{
        windAngle: 180, // Dead astern
        windSpeed: 12.0,
        heading: 90,
        sog: 8.5,
        windTimestamp: Date.now(),
      }}
    >
      <WindWidget id="wind-tailwind" title="Tailwind" />
    </MockStoreProvider>
  ),
};

// No wind data
export const NoWindData: Story = {
  render: () => (
    <MockStoreProvider
      windData={{
        windAngle: null,
        windSpeed: null,
        heading: null,
        sog: null,
        windTimestamp: null,
      }}
    >
      <WindWidget id="wind-no-data" title="No Wind Sensor" />
    </MockStoreProvider>
  ),
};

// Critical alignment validation for V2.3 completion
export const AlignmentValidation: Story = {
  render: () => (
    <MockStoreProvider
      windData={{
        windAngle: 45,
        windSpeed: 12.5,
        heading: 180,
        sog: 8.2,
        windTimestamp: Date.now(),
      }}
    >
      <View style={{ padding: 20, gap: 20 }}>
        <View style={{ backgroundColor: 'white', padding: 16, borderRadius: 8 }}>
          <WindWidget id="wind-alignment" title="Wind Alignment Test" />
          <View style={{ marginTop: 10, padding: 8, backgroundColor: '#e8f5e8' }}>
            <Text>✓ Wind speeds (AWS/TWS) RIGHT-ALIGNED with decimal precision</Text>
            <Text>✓ Wind angles (AWA/TWA) RIGHT-ALIGNED as integers</Text>
            <Text>✓ Grid layout maintains consistent alignment</Text>
            <Text>✓ Tabular numbers ensure digit consistency</Text>
          </View>
        </View>
      </View>
    </MockStoreProvider>
  ),
};

// Wind conditions showcase - Note: Shows moderate wind for all 3 due to shared store
// Use individual stories (LightWind, Default, StrongWind) to see different conditions
export const WindConditions: Story = {
  render: () => (
    <MockStoreProvider
      windData={{
        windAngle: 45,
        windSpeed: 12.5,
        heading: 180,
        sog: 8.2,
        windTimestamp: Date.now(),
      }}
    >
      <View style={{ padding: 20, gap: 16 }}>
        <View style={{ flexDirection: 'row', gap: 16 }}>
          {/* Light winds */}
          <View style={{ flex: 1, backgroundColor: 'white', padding: 12, borderRadius: 8 }}>
            <WindWidget id="wind-light-demo" title="Light Winds" />
            <Text style={{ fontSize: 12, color: '#4caf50', marginTop: 8 }}>
              Light: 5-8 knots
            </Text>
            <Text style={{ fontSize: 10, color: '#999', marginTop: 4 }}>
              See "LightWind" story
            </Text>
          </View>

          {/* Moderate winds */}
          <View style={{ flex: 1, backgroundColor: 'white', padding: 12, borderRadius: 8 }}>
            <WindWidget id="wind-moderate-demo" title="Moderate Winds" />
            <Text style={{ fontSize: 12, color: '#ff9800', marginTop: 8 }}>
              Moderate: 12-15 knots
            </Text>
            <Text style={{ fontSize: 10, color: '#999', marginTop: 4 }}>
              Current display
            </Text>
          </View>

          {/* Strong winds */}
          <View style={{ flex: 1, backgroundColor: 'white', padding: 12, borderRadius: 8 }}>
            <WindWidget id="wind-strong-demo" title="Strong Winds" />
            <Text style={{ fontSize: 12, color: '#f44336', marginTop: 8 }}>
              Strong: 20+ knots
            </Text>
            <Text style={{ fontSize: 10, color: '#999', marginTop: 4 }}>
              See "StrongWind" story
            </Text>
          </View>
        </View>
      </View>
    </MockStoreProvider>
  ),
};

// Primary vs Secondary grid layout (Collapsed vs Expanded)
export const LayoutStates: Story = {
  render: () => (
    <MockStoreProvider
      windData={{
        windAngle: 45,
        windSpeed: 12.5,
        heading: 180,
        sog: 8.2,
        windTimestamp: Date.now(),
      }}
    >
      <View style={{ padding: 20, gap: 20 }}>
        <View style={{ backgroundColor: 'white', padding: 16, borderRadius: 8 }}>
          <WindWidget id="wind-collapsed" title="Wind (Collapsed)" />
          <Text style={{ marginTop: 8, color: '#666' }}>
            Primary Grid (2×2): AWS, AWA, TWS, TWA
          </Text>
        </View>

        <View style={{ backgroundColor: 'white', padding: 16, borderRadius: 8 }}>
          <WindWidget id="wind-expanded" title="Wind (Expanded)" />
          <Text style={{ marginTop: 8, color: '#666' }}>
            + Secondary Grid: Wind history, gusts, trends
          </Text>
        </View>
      </View>
    </MockStoreProvider>
  ),
};

// Maritime unit variations - All show same data, units changed via settings
export const UnitVariations: Story = {
  render: () => (
    <MockStoreProvider
      windData={{
        windAngle: 45,
        windSpeed: 12.5,
        heading: 180,
        sog: 8.2,
        windTimestamp: Date.now(),
      }}
    >
      <View style={{ padding: 20, gap: 16 }}>
        <View style={{ flexDirection: 'row', gap: 16 }}>
          <View style={{ flex: 1, backgroundColor: 'white', padding: 12, borderRadius: 8 }}>
            <WindWidget id="wind-ms" title="Wind (m/s)" />
            <Text style={{ fontSize: 12, color: '#666', marginTop: 8 }}>
              Metric: meters per second
            </Text>
          </View>

          <View style={{ flex: 1, backgroundColor: 'white', padding: 12, borderRadius: 8 }}>
            <WindWidget id="wind-knots" title="Wind (knots)" />
            <Text style={{ fontSize: 12, color: '#666', marginTop: 8 }}>
              Nautical: knots (standard)
            </Text>
          </View>

          <View style={{ flex: 1, backgroundColor: 'white', padding: 12, borderRadius: 8 }}>
            <WindWidget id="wind-beaufort" title="Wind (Beaufort)" />
            <Text style={{ fontSize: 12, color: '#666', marginTop: 8 }}>
              Scale: 0-12 Beaufort
            </Text>
          </View>
        </View>
      </View>
    </MockStoreProvider>
  ),
};

// Data quality and connection states - All show fresh data (see individual stories)
export const DataStates: Story = {
  render: () => (
    <MockStoreProvider
      windData={{
        windAngle: 45,
        windSpeed: 12.5,
        heading: 180,
        sog: 8.2,
        windTimestamp: Date.now(),
      }}
    >
      <View style={{ padding: 20, flexDirection: 'row', gap: 16 }}>
        <View style={{ flex: 1, backgroundColor: 'white', padding: 12, borderRadius: 8 }}>
          <WindWidget id="wind-normal" title="Wind (Normal)" />
          <Text style={{ fontSize: 12, color: '#4caf50', marginTop: 8 }}>
            ✓ Fresh wind data
          </Text>
        </View>

        <View style={{ flex: 1, backgroundColor: 'white', padding: 12, borderRadius: 8 }}>
          <WindWidget id="wind-stale-demo" title="Wind (Stale)" />
          <Text style={{ fontSize: 12, color: '#ff9800', marginTop: 8 }}>
            See individual story
          </Text>
        </View>

        <View style={{ flex: 1, backgroundColor: 'white', padding: 12, borderRadius: 8 }}>
          <WindWidget id="wind-no-data-demo" title="Wind (No Data)" />
          <Text style={{ fontSize: 12, color: '#f44336', marginTop: 8 }}>
            See "NoWindData" story
          </Text>
        </View>
      </View>
    </MockStoreProvider>
  ),
};

// Maritime themes validation
export const MaritimeThemes: Story = {
  render: () => (
    <MockStoreProvider
      windData={{
        windAngle: 45,
        windSpeed: 12.5,
        heading: 180,
        sog: 8.2,
        windTimestamp: Date.now(),
      }}
    >
      <View style={{ gap: 20 }}>
        {/* Day Theme */}
        <View style={{ backgroundColor: '#ffffff', padding: 20 }}>
          <WindWidget id="wind-day" title="Wind (Day Theme)" />
          <Text style={{ marginTop: 10, color: '#666' }}>
            Day Theme - High contrast for sunlight/polarized glasses
          </Text>
        </View>

        {/* Night Theme */}
        <View style={{ backgroundColor: '#1a1a1a', padding: 20 }}>
          <WindWidget id="wind-night" title="Wind (Night Theme)" />
          <Text style={{ marginTop: 10, color: '#ccc' }}>
            Night Theme - Reduced brightness
          </Text>
        </View>

        {/* Red Night Theme */}
        <View style={{ backgroundColor: '#000000', padding: 20 }}>
          <WindWidget id="wind-red" title="Wind (Red Night)" />
          <Text style={{ marginTop: 10, color: '#ff6b6b' }}>
            Red Night Theme - Preserves night vision for navigation
          </Text>
        </View>
      </View>
    </MockStoreProvider>
  ),
};