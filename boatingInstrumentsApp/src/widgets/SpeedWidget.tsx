import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { useNmeaStore } from '../store/nmeaStore';
import { useTheme } from '../store/themeStore';
import { useWidgetStore } from '../store/widgetStore';
import { MetricDisplayData } from '../types/MetricDisplayData';
import PrimaryMetricCell from '../components/PrimaryMetricCell';
import SecondaryMetricCell from '../components/SecondaryMetricCell';
import { UniversalIcon } from '../components/atoms/UniversalIcon';
import { WidgetMetadataRegistry } from '../registry/WidgetMetadataRegistry';
import { useResponsiveFontSize } from '../hooks/useResponsiveFontSize';
import { useResponsiveHeader } from '../hooks/useResponsiveHeader';
import { UnifiedWidgetGrid } from '../components/UnifiedWidgetGrid';

interface SpeedWidgetProps {
  id: string;
  title: string;
  width?: number;  // Widget width for responsive scaling
  height?: number; // Widget height for responsive scaling
}

/**
 * Speed Widget - STW/SOG Focus per ui-architecture.md v2.3
 * Primary Grid (2×2): Column 1: SOG + MAX SOG, Column 2: STW + MAX STW
 * Secondary Grid (2×2): AVG values for both STW/SOG
 * Interactive Chart: STW trend (tap to switch to SOG)
 */
export const SpeedWidget: React.FC<SpeedWidgetProps> = React.memo(({ id, title, width, height }) => {
  const theme = useTheme();
  const fontSize = useResponsiveFontSize(width, height);
  
  // Responsive header sizing using proper base-size scaling
  const { iconSize: headerIconSize, fontSize: headerFontSize } = useResponsiveHeader(height);
  
  // Widget state management per ui-architecture.md v2.3
  
  // NOTE: History now tracked automatically in sensor data - no subscription needed
  
  // NEW: Get history and stats methods from store
  const getSensorHistory = useNmeaStore((state) => state.getSensorHistory);
  const getSessionStats = useNmeaStore((state) => state.getSessionStats);
  
  // NMEA data selectors - Phase 1 Optimization: Selective field subscriptions with shallow equality
  // ARCHITECTURAL FIX: STW from speed sensor (paddlewheel), SOG from GPS sensor (GPS-calculated)
  // VHW sentence → speed sensor throughWater (STW - paddlewheel measurement)
  // VTG/RMC sentence → GPS sensor speedOverGround (SOG - GPS calculation from position changes)
  const speedSensorData = useNmeaStore((state) => state.nmeaData.sensors.speed?.[0], (a, b) => a === b);
  const gpsSensorData = useNmeaStore((state) => state.nmeaData.sensors.gps?.[0], (a, b) => a === b);
  const stw = speedSensorData?.throughWater;
  const sog = gpsSensorData?.speedOverGround;
  const speedTimestamp = speedSensorData?.timestamp;
  
  // Debug: Log actual values from store
  useEffect(() => {
    if (Math.random() < 0.05) { // Log ~5% of the time
      console.log(`📊 SpeedWidget: SOG=${sog?.toFixed(2) ?? 'null'} knots, STW=${stw?.toFixed(2) ?? 'null'} knots`);
    }
  }, [sog, stw]);
  
  // Calculate averages and maximums for secondary view using store history
  // Use getSessionStats which is optimized and updates correctly
  const calculations = useMemo(() => {
    const sogStats = getSessionStats('gps', 0); // GPS sensor tracks speedOverGround
    const stwStats = getSessionStats('speed', 0); // Speed sensor tracks throughWater
    
    return {
      sog: {
        avg: sogStats.avg,
        max: sogStats.max
      },
      stw: {
        avg: stwStats.avg,
        max: stwStats.max
      }
    };
  }, [getSessionStats, sog, stw]); // Re-calculate when current values change

  // NEW: Use cached display info from sensor.display (Phase 3 migration)
  // No more presentation hooks needed - data is pre-formatted in store
  const speedDisplayData = useMemo(() => {
    const createDisplay = (value: number | null | undefined, displayInfo: any, mnemonic: string): MetricDisplayData => ({
      mnemonic,
      value: displayInfo?.value ?? '---',
      unit: displayInfo?.unit ?? 'kts',
      rawValue: value ?? 0,
      layout: { minWidth: 60, alignment: 'right' },
      presentation: { id: 'speed', name: 'Speed', pattern: 'xxx.x' },
      status: { isValid: value !== undefined && value !== null, isFallback: false }
    });

    return {
      sog: createDisplay(sog, gpsSensorData?.display?.speedOverGround, 'SOG'),
      stw: createDisplay(stw, speedSensorData?.display?.throughWater, 'STW'),
      sogAvg: createDisplay(calculations.sog.avg, null, 'AVG'),
      stwAvg: createDisplay(calculations.stw.avg, null, 'AVG'),
      sogMax: createDisplay(calculations.sog.max, null, 'MAX'),
      stwMax: createDisplay(calculations.stw.max, null, 'MAX')
    };
  }, [sog, stw, calculations, gpsSensorData, speedSensorData]);

  const handleLongPressOnPin = useCallback(() => {
  }, [id]);

  // Data staleness detection - consider stale if no speed data (either SOG or STW)
  const isStale = (sog === undefined || sog === null) && (stw === undefined || stw === null);

  // Widget header component with responsive sizing
  const headerComponent = (
    <View style={{
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      width: '100%',
      paddingHorizontal: 16,
    }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <UniversalIcon 
          name={WidgetMetadataRegistry.getMetadata('speed')?.icon || 'speedometer-outline'} 
          size={headerIconSize} 
          color={theme.iconPrimary}
        />
        <Text style={{
          fontSize: headerFontSize,
          fontWeight: 'bold',
          letterSpacing: 0.5,
          color: theme.textSecondary,
          textTransform: 'uppercase',
        }}>{title}</Text>
      </View>
      

    </View>
  );

  return (
    <UnifiedWidgetGrid
      theme={theme}
      header={headerComponent}
      widgetWidth={width}
      widgetHeight={height}
      primaryRows={2}
      secondaryRows={2}
      columns={2}
      testID={`speed-widget-${id}`}
    >
      {/* Row 0: SOG and STW (current values) */}
      <PrimaryMetricCell
          data={speedDisplayData.sog}
          state={isStale ? 'warning' : 'normal'}
          fontSize={{
            mnemonic: fontSize.label,
            value: fontSize.value,
            unit: fontSize.unit,
          }}
        />
        <PrimaryMetricCell
          data={speedDisplayData.stw}
          state={isStale ? 'warning' : 'normal'}
          fontSize={{
            mnemonic: fontSize.label,
            value: fontSize.value,
            unit: fontSize.unit,
          }}
        />
        
        {/* Row 1: MAX SOG and MAX STW */}
        <PrimaryMetricCell
          data={speedDisplayData.sogMax}
          state="normal"
          fontSize={{
            mnemonic: fontSize.label,
            value: fontSize.value,
            unit: fontSize.unit,
          }}
        />
        <PrimaryMetricCell
          data={speedDisplayData.stwMax}
          state="normal"
          fontSize={{
            mnemonic: fontSize.label,
            value: fontSize.value,
            unit: fontSize.unit,
          }}
        />
        
        {/* Separator rendered automatically after row 1 */}
        
        {/* Row 2: AVG SOG and AVG STW */}
        <SecondaryMetricCell
          data={speedDisplayData.sogAvg}
          state="normal"
          compact={true}
          fontSize={{
            mnemonic: fontSize.label,
            value: fontSize.value,
            unit: fontSize.unit,
          }}
        />
        <SecondaryMetricCell
          data={speedDisplayData.stwAvg}
          state="normal"
          compact={true}
          fontSize={{
            mnemonic: fontSize.label,
            value: fontSize.value,
            unit: fontSize.unit,
          }}
        />
        
        {/* Row 3: Empty space for consistent 4-row layout */}
        <View />
        <View />
    </UnifiedWidgetGrid>
  );
});

SpeedWidget.displayName = 'SpeedWidget';

export default SpeedWidget;
