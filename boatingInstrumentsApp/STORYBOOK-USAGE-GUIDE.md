# Storybook Usage Guide - Populating Widgets with Data

## Overview

This guide explains how to populate your widgets with mock data in Storybook to validate UI rendering and behavior.

## The Problem

Your widgets use Zustand stores to get data:
- `useNmeaStore` - GPS position, wind data, etc.
- `useTheme` - Theme colors and styles
- `useWidgetStore` - Widget state (expanded, pinned)

By default, Storybook doesn't know about these stores, so widgets appear empty.

## The Solution

Use the `MockStoreProvider` wrapper to inject mock data into the stores before rendering your widget.

## How It Works

### 1. GPS Widget Example

```tsx
export const AtSeaCoordinates: Story = {
  render: () => (
    <MockStoreProvider
      nmeaData={{
        gpsPosition: {
          latitude: 51.505,    // London coordinates
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
```

### 2. Wind Widget Example

```tsx
export const StrongWind: Story = {
  render: () => (
    <MockStoreProvider
      windData={{
        windAngle: 75,       // 75° apparent wind angle
        windSpeed: 22.5,     // 22.5 knots (gale force)
        heading: 220,        // Vessel heading
        sog: 3.2,           // Speed over ground
        windTimestamp: Date.now(),
      }}
    >
      <WindWidget id="wind-strong" title="Strong Winds" />
    </MockStoreProvider>
  ),
};
```

## Available Stories for GPS Widget

1. **Default** - Standard coordinates (France)
2. **AtSeaCoordinates** - London area
3. **SouthernHemisphere** - Sydney, Australia (tests S/E hemispheres)
4. **NoGPSFix** - No GPS signal scenario
5. **MaritimeSettings** - Full settings configuration UI
6. **AlignmentValidation** - Tests coordinate alignment
7. **CoordinateFormats** - DMS, DDM, DD formats
8. **MaritimeThemes** - Day, Night, Red Night themes
9. **WidgetStates** - Collapsed vs Expanded
10. **DataStates** - Normal, Stale, No Data

## Available Stories for Wind Widget

1. **Default** - Moderate wind conditions
2. **LightWind** - Light breeze (5.2 knots)
3. **StrongWind** - Gale force (22.5 knots)
4. **Headwind** - Wind from ahead (0°)
5. **Tailwind** - Wind from behind (180°)
6. **NoWindData** - No wind sensor
7. **AlignmentValidation** - Tests metric alignment
8. **WindConditions** - Light, Moderate, Strong
9. **LayoutStates** - Collapsed vs Expanded
10. **UnitVariations** - m/s, knots, Beaufort
11. **DataStates** - Normal, Stale, No Data
12. **MaritimeThemes** - Day, Night, Red Night

## Creating Your Own Stories

### Template for New GPS Story

```tsx
export const MyCustomGPS: Story = {
  render: () => (
    <MockStoreProvider
      nmeaData={{
        gpsPosition: {
          latitude: YOUR_LAT,
          longitude: YOUR_LON,
        },
        gpsQuality: 'GPS',  // or 'DGPS', 'No Fix'
        utcTime: new Date().toISOString(),
        gpsTimestamp: Date.now(),
      }}
    >
      <GPSWidget id="my-gps" title="My Custom GPS" />
    </MockStoreProvider>
  ),
};
```

### Template for New Wind Story

```tsx
export const MyCustomWind: Story = {
  render: () => (
    <MockStoreProvider
      windData={{
        windAngle: YOUR_ANGLE,      // 0-360°
        windSpeed: YOUR_SPEED,      // knots
        heading: VESSEL_HEADING,    // 0-360°
        sog: SPEED_OVER_GROUND,    // knots
        windTimestamp: Date.now(),
      }}
    >
      <WindWidget id="my-wind" title="My Custom Wind" />
    </MockStoreProvider>
  ),
};
```

## Testing Different Scenarios

### GPS Scenarios

- **Northern Hemisphere**: `latitude: 48.0, longitude: -2.0` (Brittany, France)
- **Southern Hemisphere**: `latitude: -33.8, longitude: 151.2` (Sydney)
- **Equatorial**: `latitude: 0.0, longitude: -78.5` (Ecuador)
- **Arctic**: `latitude: 78.2, longitude: 15.6` (Svalbard)
- **No Fix**: `latitude: null, longitude: null`

### Wind Scenarios

- **Calm**: `windSpeed: 0-3` knots
- **Light Breeze**: `windSpeed: 4-7` knots
- **Moderate Breeze**: `windSpeed: 11-16` knots
- **Strong Breeze**: `windSpeed: 22-27` knots
- **Gale**: `windSpeed: 34-40` knots
- **Storm**: `windSpeed: 48+` knots

### Wind Angles

- **Headwind**: `windAngle: 0°` (dead ahead)
- **Beam Reach**: `windAngle: 90°` (from the side)
- **Tailwind**: `windAngle: 180°` (from behind)
- **Close Hauled**: `windAngle: 30-45°`
- **Broad Reach**: `windAngle: 135-170°`

## Running Storybook

```bash
# Start Storybook for React Native
npm run storybook

# Or for web
npm run storybook:web
```

## Tips

1. **Live Editing**: Change the mock data values in your story to see updates in real-time
2. **Multiple Scenarios**: Create stories for edge cases (null values, extreme values, etc.)
3. **Theme Testing**: Test with different maritime themes (Day, Night, Red Night)
4. **Unit Testing**: Use the same mock data patterns in your Jest tests
5. **Validation**: Use Storybook to validate UI before connecting real NMEA data

## Next Steps

- Create stories for other widgets (Depth, Speed, Compass, etc.)
- Add interactive controls using Storybook args
- Test accessibility features in Storybook
- Document component variations for design review
