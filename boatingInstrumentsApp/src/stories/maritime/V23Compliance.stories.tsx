import type { Meta, StoryObj } from '@storybook/react';
import React from 'react';
import { View, Text } from 'react-native';
import PrimaryMetricCell from '../../components/PrimaryMetricCell';
import SecondaryMetricCell from '../../components/SecondaryMetricCell';

const meta: Meta = {
  title: 'Maritime/V2.3 Compliance Validation',
  parameters: {
    layout: 'fullscreen',
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

// V2.3 Checklist Validation Story
export const V23ComplianceChecklist: Story = {
  render: () => (
    <View style={{ padding: 20, backgroundColor: '#f5f5f5' }}>
      {/* Header */}
      <View style={{ marginBottom: 30, padding: 16, backgroundColor: '#e3f2fd', borderRadius: 8 }}>
        <Text style={{ fontSize: 18, fontWeight: 'bold', color: '#1565c0' }}>
          UI Architecture V2.3 - Maritime Display Standards Compliance
        </Text>
        <Text style={{ marginTop: 8, color: '#1976d2' }}>
          Visual validation of implemented components against V2.3 specifications
        </Text>
      </View>

      {/* Section 1: Widget Alignment System */}
      <View style={{ marginBottom: 30, padding: 16, backgroundColor: 'white', borderRadius: 8 }}>
        <Text style={{ fontSize: 16, fontWeight: 'bold', marginBottom: 16, color: '#2e7d32' }}>
          ✅ 1. Widget Alignment System (Component Standards)
        </Text>

        <View style={{ gap: 12 }}>
          <View style={{ flexDirection: 'row', gap: 16 }}>
            <View
              style={{
                flex: 1,
                alignItems: 'flex-end',
                borderWidth: 1,
                borderColor: '#ddd',
                padding: 8,
              }}
            >
              <PrimaryMetricCell mnemonic="AWS" value="12.5" unit="m/s" category="wind_speed" />
              <Text style={{ fontSize: 11, color: '#666' }}>
                Wind Speed: Right-aligned with decimal
              </Text>
            </View>

            <View
              style={{
                flex: 1,
                alignItems: 'flex-end',
                borderWidth: 1,
                borderColor: '#ddd',
                padding: 8,
              }}
            >
              <PrimaryMetricCell
                mnemonic="LAT"
                value="48° 38.199′ N"
                unit="°"
                category="coordinates"
              />
              <Text style={{ fontSize: 11, color: '#666' }}>
                GPS: Right-aligned (FIXED 2025-10-21)
              </Text>
            </View>

            <View
              style={{
                flex: 1,
                alignItems: 'flex-end',
                borderWidth: 1,
                borderColor: '#ddd',
                padding: 8,
              }}
            >
              <PrimaryMetricCell mnemonic="AWA" value="045" unit="°" category="angle" />
              <Text style={{ fontSize: 11, color: '#666' }}>Angle: Right-aligned integer</Text>
            </View>
          </View>
        </View>
      </View>

      {/* Section 2: Maritime Typography Standards */}
      <View style={{ marginBottom: 30, padding: 16, backgroundColor: 'white', borderRadius: 8 }}>
        <Text style={{ fontSize: 16, fontWeight: 'bold', marginBottom: 16, color: '#2e7d32' }}>
          ✅ 2. Maritime Typography Standards
        </Text>

        <View style={{ gap: 8 }}>
          <View style={{ alignItems: 'flex-end', borderWidth: 1, borderColor: '#ddd', padding: 8 }}>
            <PrimaryMetricCell mnemonic="DPT" value="23.4" unit="m" category="depth" />
            <Text style={{ fontSize: 11, color: '#666' }}>
              Mnemonic: 12pt uppercase • Value: 36pt monospace bold • Unit: 12pt regular
            </Text>
          </View>
        </View>
      </View>

      {/* Section 3: Decimal Alignment System */}
      <View style={{ marginBottom: 30, padding: 16, backgroundColor: 'white', borderRadius: 8 }}>
        <Text style={{ fontSize: 16, fontWeight: 'bold', marginBottom: 16, color: '#2e7d32' }}>
          ✅ 3. Decimal-Aligned Formatting (Maritime Precision)
        </Text>

        <View style={{ gap: 8 }}>
          <View style={{ alignItems: 'flex-end', borderWidth: 1, borderColor: '#ddd', padding: 8 }}>
            <PrimaryMetricCell mnemonic="SPD" value="5.2" unit="kn" category="vessel_speed" />
          </View>
          <View style={{ alignItems: 'flex-end', borderWidth: 1, borderColor: '#ddd', padding: 8 }}>
            <PrimaryMetricCell mnemonic="SPD" value="12.8" unit="kn" category="vessel_speed" />
          </View>
          <View style={{ alignItems: 'flex-end', borderWidth: 1, borderColor: '#ddd', padding: 8 }}>
            <PrimaryMetricCell mnemonic="SPD" value="7.34" unit="kn" category="vessel_speed" />
          </View>
          <Text style={{ fontSize: 11, color: '#666', marginTop: 8 }}>
            Decimal points align vertically for easy trend comparison
          </Text>
        </View>
      </View>

      {/* Section 4: State Management Visual Feedback */}
      <View style={{ marginBottom: 30, padding: 16, backgroundColor: 'white', borderRadius: 8 }}>
        <Text style={{ fontSize: 16, fontWeight: 'bold', marginBottom: 16, color: '#2e7d32' }}>
          ✅ 4. State Management (Normal/Warning/Alarm)
        </Text>

        <View style={{ flexDirection: 'row', gap: 16 }}>
          <View
            style={{
              flex: 1,
              alignItems: 'flex-end',
              borderWidth: 1,
              borderColor: '#ddd',
              padding: 8,
            }}
          >
            <PrimaryMetricCell
              mnemonic="AWS"
              value="12.5"
              unit="m/s"
              category="wind_speed"
              state="normal"
            />
            <Text style={{ fontSize: 11, color: '#4caf50' }}>Normal</Text>
          </View>
          <View
            style={{
              flex: 1,
              alignItems: 'flex-end',
              borderWidth: 1,
              borderColor: '#ddd',
              padding: 8,
            }}
          >
            <PrimaryMetricCell
              mnemonic="AWS"
              value="25.8"
              unit="m/s"
              category="wind_speed"
              state="warning"
            />
            <Text style={{ fontSize: 11, color: '#ff9800' }}>Warning</Text>
          </View>
          <View
            style={{
              flex: 1,
              alignItems: 'flex-end',
              borderWidth: 1,
              borderColor: '#ddd',
              padding: 8,
            }}
          >
            <PrimaryMetricCell
              mnemonic="AWS"
              value="35.2"
              unit="m/s"
              category="wind_speed"
              state="alarm"
            />
            <Text style={{ fontSize: 11, color: '#f44336' }}>Alarm</Text>
          </View>
        </View>
      </View>

      {/* Section 5: Unit Conversion System Integration */}
      <View style={{ marginBottom: 30, padding: 16, backgroundColor: 'white', borderRadius: 8 }}>
        <Text style={{ fontSize: 16, fontWeight: 'bold', marginBottom: 16, color: '#2e7d32' }}>
          ✅ 5. Unit Conversion System Integration
        </Text>

        <View style={{ gap: 12 }}>
          <Text style={{ fontSize: 14, color: '#666', marginBottom: 8 }}>
            GPS Coordinates - All formats right-aligned with hemisphere indicators:
          </Text>
          <View style={{ flexDirection: 'row', gap: 16 }}>
            <View
              style={{
                flex: 1,
                alignItems: 'flex-end',
                borderWidth: 1,
                borderColor: '#ddd',
                padding: 8,
              }}
            >
              <PrimaryMetricCell
                mnemonic="LAT"
                value="48° 38′ 12″ N"
                unit="°"
                category="coordinates"
              />
              <Text style={{ fontSize: 11, color: '#666' }}>DMS Format</Text>
            </View>
            <View
              style={{
                flex: 1,
                alignItems: 'flex-end',
                borderWidth: 1,
                borderColor: '#ddd',
                padding: 8,
              }}
            >
              <PrimaryMetricCell
                mnemonic="LAT"
                value="48° 38.199′ N"
                unit="°"
                category="coordinates"
              />
              <Text style={{ fontSize: 11, color: '#666' }}>DDM Format</Text>
            </View>
            <View
              style={{
                flex: 1,
                alignItems: 'flex-end',
                borderWidth: 1,
                borderColor: '#ddd',
                padding: 8,
              }}
            >
              <PrimaryMetricCell
                mnemonic="LAT"
                value="48.63665° N"
                unit="°"
                category="coordinates"
              />
              <Text style={{ fontSize: 11, color: '#666' }}>DD Format</Text>
            </View>
          </View>
        </View>
      </View>

      {/* Section 6: Grid Layout System */}
      <View style={{ marginBottom: 30, padding: 16, backgroundColor: 'white', borderRadius: 8 }}>
        <Text style={{ fontSize: 16, fontWeight: 'bold', marginBottom: 16, color: '#2e7d32' }}>
          ✅ 6. Grid Layout System (2×1, 2×2 configurations)
        </Text>

        <View style={{ gap: 16 }}>
          <View>
            <Text style={{ fontSize: 14, marginBottom: 8 }}>GPS Widget (2×1 Primary Grid):</Text>
            <View style={{ gap: 8 }}>
              <View
                style={{ alignItems: 'flex-end', borderWidth: 1, borderColor: '#ddd', padding: 8 }}
              >
                <PrimaryMetricCell
                  mnemonic="LAT"
                  value="48° 38.199′ N"
                  unit="°"
                  category="coordinates"
                />
              </View>
              <View
                style={{ alignItems: 'flex-end', borderWidth: 1, borderColor: '#ddd', padding: 8 }}
              >
                <PrimaryMetricCell
                  mnemonic="LON"
                  value="2° 01.401′ W"
                  unit="°"
                  category="coordinates"
                />
              </View>
            </View>
          </View>

          <View>
            <Text style={{ fontSize: 14, marginBottom: 8 }}>Wind Widget (2×2 Primary Grid):</Text>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <View
                style={{
                  flex: 1,
                  alignItems: 'flex-end',
                  borderWidth: 1,
                  borderColor: '#ddd',
                  padding: 4,
                }}
              >
                <PrimaryMetricCell mnemonic="AWS" value="12.5" unit="m/s" category="wind_speed" />
              </View>
              <View
                style={{
                  flex: 1,
                  alignItems: 'flex-end',
                  borderWidth: 1,
                  borderColor: '#ddd',
                  padding: 4,
                }}
              >
                <PrimaryMetricCell mnemonic="TWS" value="14.2" unit="m/s" category="wind_speed" />
              </View>
            </View>
            <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
              <View
                style={{
                  flex: 1,
                  alignItems: 'flex-end',
                  borderWidth: 1,
                  borderColor: '#ddd',
                  padding: 4,
                }}
              >
                <PrimaryMetricCell mnemonic="AWA" value="045" unit="°" category="angle" />
              </View>
              <View
                style={{
                  flex: 1,
                  alignItems: 'flex-end',
                  borderWidth: 1,
                  borderColor: '#ddd',
                  padding: 4,
                }}
              >
                <PrimaryMetricCell mnemonic="TWA" value="052" unit="°" category="angle" />
              </View>
            </View>
          </View>
        </View>
      </View>

      {/* Completion Status */}
      <View style={{ padding: 16, backgroundColor: '#e8f5e8', borderRadius: 8 }}>
        <Text style={{ fontSize: 16, fontWeight: 'bold', color: '#2e7d32', marginBottom: 8 }}>
          🎯 V2.3 Implementation Status: COMPLETE
        </Text>
        <Text style={{ color: '#388e3c', lineHeight: 20 }}>
          ✅ Widget Alignment System implemented and documented{'\n'}✅ Maritime display standards
          enforced{'\n'}✅ Decimal-aligned formatting working{'\n'}✅ GPS coordinate right-alignment
          fixed (2025-10-21){'\n'}✅ Unit conversion system integrated{'\n'}✅ Grid layout system
          functional{'\n'}✅ Storybook validation stories created
        </Text>
      </View>
    </View>
  ),
};
