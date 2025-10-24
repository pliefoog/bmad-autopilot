import type { Meta, StoryObj } from '@storybook/react';
import React from 'react';
import { View } from 'react-native';
import PrimaryMetricCell from '../../components/PrimaryMetricCell';

const meta: Meta<typeof PrimaryMetricCell> = {
  title: 'Components/PrimaryMetricCell',
  component: PrimaryMetricCell,
  parameters: {
    layout: 'padded',
  },
  argTypes: {
    state: {
      control: { type: 'select' },
      options: ['normal', 'warning', 'alarm'],
    },
    category: {
      control: { type: 'select' },
      options: ['wind_speed', 'angle', 'coordinates', 'depth', 'vessel_speed'],
    },
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

// Basic component showcase
export const Default: Story = {
  args: {
    mnemonic: 'AWS',
    value: '12.5',
    unit: 'm/s',
    category: 'wind_speed',
    state: 'normal',
  },
};

// Maritime Alignment Validation - Critical for V2.3 completion
export const AlignmentValidation: Story = {
  render: () => (
    <View style={{ padding: 20, gap: 16, backgroundColor: '#f5f5f5' }}>
      {/* Wind Speed - Right Aligned with decimal precision */}
      <View style={{ alignItems: 'flex-end', borderWidth: 1, borderColor: '#ddd' }}>
        <PrimaryMetricCell 
          mnemonic="AWS" 
          value="12.5" 
          unit="m/s" 
          category="wind_speed" 
          state="normal" 
        />
      </View>
      
      {/* GPS Coordinates - Right Aligned (fixed 2025-10-21) */}
      <View style={{ alignItems: 'flex-end', borderWidth: 1, borderColor: '#ddd' }}>
        <PrimaryMetricCell 
          mnemonic="LAT" 
          value="48° 38.199′ N" 
          unit="°" 
          category="coordinates" 
          state="normal" 
        />
      </View>
      
      {/* Navigation Angles - Right Aligned integer */}
      <View style={{ alignItems: 'flex-end', borderWidth: 1, borderColor: '#ddd' }}>
        <PrimaryMetricCell 
          mnemonic="AWA" 
          value="045" 
          unit="°" 
          category="angle" 
          state="normal" 
        />
      </View>

      {/* Depth - Right Aligned with decimal */}
      <View style={{ alignItems: 'flex-end', borderWidth: 1, borderColor: '#ddd' }}>
        <PrimaryMetricCell 
          mnemonic="DPT" 
          value="23.4" 
          unit="m" 
          category="depth" 
          state="normal" 
        />
      </View>
    </View>
  ),
};

// State variations for maritime safety
export const StateVariations: Story = {
  render: () => (
    <View style={{ padding: 20, flexDirection: 'row', gap: 16 }}>
      <View style={{ alignItems: 'flex-end' }}>
        <PrimaryMetricCell 
          mnemonic="AWS" 
          value="12.5" 
          unit="m/s" 
          category="wind_speed" 
          state="normal" 
        />
      </View>
      <View style={{ alignItems: 'flex-end' }}>
        <PrimaryMetricCell 
          mnemonic="AWS" 
          value="25.8" 
          unit="m/s" 
          category="wind_speed" 
          state="warning" 
        />
      </View>
      <View style={{ alignItems: 'flex-end' }}>
        <PrimaryMetricCell 
          mnemonic="AWS" 
          value="35.2" 
          unit="m/s" 
          category="wind_speed" 
          state="alarm" 
        />
      </View>
    </View>
  ),
};

// Different value lengths to test decimal alignment
export const DecimalAlignment: Story = {
  render: () => (
    <View style={{ padding: 20, gap: 16 }}>
      <View style={{ alignItems: 'flex-end', borderWidth: 1, borderColor: '#ddd' }}>
        <PrimaryMetricCell mnemonic="SPD" value="5.2" unit="kn" category="vessel_speed" />
      </View>
      <View style={{ alignItems: 'flex-end', borderWidth: 1, borderColor: '#ddd' }}>
        <PrimaryMetricCell mnemonic="SPD" value="12.8" unit="kn" category="vessel_speed" />
      </View>
      <View style={{ alignItems: 'flex-end', borderWidth: 1, borderColor: '#ddd' }}>
        <PrimaryMetricCell mnemonic="SPD" value="7.34" unit="kn" category="vessel_speed" />
      </View>
    </View>
  ),
};

// No data state
export const NoData: Story = {
  render: () => (
    <View style={{ alignItems: 'flex-end' }}>
      <PrimaryMetricCell 
        mnemonic="AWS" 
        value="---" 
        unit="m/s" 
        category="wind_speed" 
        state="normal" 
      />
    </View>
  ),
};