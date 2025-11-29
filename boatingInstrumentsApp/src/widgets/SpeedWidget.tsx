import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { useNmeaStore } from '../store/nmeaStore';
import { useTheme } from '../store/themeStore';
import { useWidgetStore } from '../store/widgetStore';
import { useSpeedPresentation } from '../presentation/useDataPresentation';
import { MetricDisplayData } from '../types/MetricDisplayData';
import { usePresentationStore } from '../presentation/presentationStore';
import { findPresentation } from '../presentation/presentations';
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
  
  // NEW: Clean semantic data presentation system for speed
  const speedPresentation = useSpeedPresentation();
  const presentationStore = usePresentationStore();
  
  // Get the full presentation object with formatSpec
  const fullPresentation = useMemo(() => {
    const presentationId = presentationStore.selectedPresentations.speed;
    return presentationId ? findPresentation('speed', presentationId) : null;
  }, [presentationStore.selectedPresentations.speed]);
  
  // Widget state management per ui-architecture.md v2.3
  const pinned = useWidgetStore((state) => state.isWidgetPinned ? state.isWidgetPinned(id) : false);
  const toggleWidgetPin = useWidgetStore((state) => state.toggleWidgetPin);
  const updateWidgetInteraction = useWidgetStore((state) => state.updateWidgetInteraction);
  
  // NMEA data selectors - NMEA Store v2.0 sensor-based interface
  // NMEA data selectors - direct subscription without useCallback
  const speedData = useNmeaStore((state) => state.nmeaData.sensors.speed?.[0]); // Speed sensor data
  
  // Extract speed values from sensor data
  const sog = speedData?.overGround; // Speed Over Ground (VTG/RMC/GPS)
  const stw = speedData?.throughWater; // Speed Through Water (VHW/log/paddle wheel)
  const speedTimestamp = speedData?.timestamp;
  
  // Speed history for averages and maximums
  const [speedHistory, setSpeedHistory] = useState<{
    sog: { value: number; timestamp: number }[];
    stw: { value: number; timestamp: number }[];  // Speed Through Water
  }>({ sog: [], stw: [] });

  // Track speed history for calculations
  useEffect(() => {
    const now = Date.now();
    const tenMinutesAgo = now - 10 * 60 * 1000;
    
    // Only update if we have valid new data
    if (sog !== undefined && sog !== null) {
      setSpeedHistory(prev => {
        // Check if the last entry is the same value to avoid duplicates
        const lastSogEntry = prev.sog[prev.sog.length - 1];
        if (lastSogEntry && Math.abs(lastSogEntry.value - sog) < 0.01 && (now - lastSogEntry.timestamp) < 1000) {
          return prev; // Skip if same value within 1 second
        }
        
        return {
          ...prev,
          sog: [...prev.sog, { value: sog, timestamp: now }]
            .filter(entry => entry.timestamp > tenMinutesAgo)
            .slice(-300) // Keep max 300 entries
        };
      });
    }
    
    if (stw !== undefined && stw !== null) {
      setSpeedHistory(prev => {
        // Check if the last entry is the same value to avoid duplicates
        const lastStwEntry = prev.stw[prev.stw.length - 1];
        if (lastStwEntry && Math.abs(lastStwEntry.value - stw) < 0.01 && (now - lastStwEntry.timestamp) < 1000) {
          return prev; // Skip if same value within 1 second
        }
        
        return {
          ...prev,
          stw: [...prev.stw, { value: stw, timestamp: now }]
            .filter(entry => entry.timestamp > tenMinutesAgo)
            .slice(-300)
        };
      });
    }
  }, [sog, stw]);

  // Calculate averages and maximums for secondary view
  const calculations = useMemo(() => {
    const calculateStats = (data: { value: number; timestamp: number }[]) => {
      if (data.length === 0) return { avg: null, max: null };
      const values = data.map(d => d.value);
      return {
        avg: values.reduce((a, b) => a + b, 0) / values.length,
        max: Math.max(...values)
      };
    };

    return {
      sog: calculateStats(speedHistory.sog),
      stw: calculateStats(speedHistory.stw)  // Speed Through Water
    };
  }, [speedHistory]);

  // NEW: Speed conversion using semantic presentation system
  const getSpeedDisplay = useCallback((speedValue: number | null | undefined, label: string = 'Speed'): MetricDisplayData => {
    const presentation = speedPresentation.presentation;
    
    if (speedValue === undefined || speedValue === null) {
      return {
        mnemonic: label, // NMEA source abbreviation like "SOG", "STW"
        value: '---',
        unit: presentation?.symbol || 'kts', // Presentation symbol
        rawValue: 0,
        layout: {
          minWidth: 60,
          alignment: 'right'
        },
        presentation: {
          id: presentation?.id || 'kts_1',
          name: presentation?.name || 'Knots (1 decimal)',
          pattern: fullPresentation?.formatSpec.pattern || 'xxx.x'
        },
        status: {
          isValid: false,
          error: 'No data',
          isFallback: true
        }
      };
    }
    
    if (!speedPresentation.isValid || !presentation || !fullPresentation) {
      // Fallback to knots if presentation system fails
      return {
        mnemonic: label, // NMEA source abbreviation like "SOG", "STW"  
        value: speedValue.toFixed(1),
        unit: 'kts', // Fallback presentation symbol
        rawValue: speedValue,
        layout: {
          minWidth: 60,
          alignment: 'right'
        },
        presentation: {
          id: 'kts_1',
          name: 'Knots (1 decimal)',
          pattern: 'xxx.x'
        },
        status: {
          isValid: true,
          isFallback: true
        }
      };
    }
    
    return {
      mnemonic: label, // NMEA source abbreviation like "SOG", "STW"
      value: speedPresentation.convertAndFormat(speedValue),
      unit: presentation.symbol, // Presentation symbol like "kts", "mph"
      rawValue: speedValue,
      layout: {
        minWidth: fullPresentation.formatSpec.minWidth * 8, // Approximate character width
        alignment: 'right'
      },
      presentation: {
        id: presentation.id,
        name: presentation.name,
        pattern: fullPresentation.formatSpec.pattern
      },
      status: {
        isValid: true,
        isFallback: false
      }
    };
  }, [speedPresentation, fullPresentation]);

  // Speed display data for component compatibility using presentation system
  const speedDisplayData = useMemo(() => {
    return {
      sog: getSpeedDisplay(sog, 'SOG'),
      stw: getSpeedDisplay(stw, 'STW'),
      sogAvg: getSpeedDisplay(calculations.sog.avg, 'AVG'),
      stwAvg: getSpeedDisplay(calculations.stw.avg, 'AVG'),
      sogMax: getSpeedDisplay(calculations.sog.max, 'MAX'),
      stwMax: getSpeedDisplay(calculations.stw.max, 'MAX')
    };
  }, [getSpeedDisplay, sog, stw, calculations]);

  // Widget interaction handlers per ui-architecture.md v2.3
  const handlePress = useCallback(() => {
    updateWidgetInteraction(id);
  }, [id, updateWidgetInteraction]);

  const handleLongPressOnPin = useCallback(() => {
    toggleWidgetPin(id);
    updateWidgetInteraction(id);
  }, [id, toggleWidgetPin, updateWidgetInteraction]);

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
          color={theme.primary}
        />
        <Text style={{
          fontSize: headerFontSize,
          fontWeight: 'bold',
          letterSpacing: 0.5,
          color: theme.textSecondary,
          textTransform: 'uppercase',
        }}>{title}</Text>
      </View>
      
      {pinned && (
        <TouchableOpacity
          onLongPress={handleLongPressOnPin}
          style={{ padding: 4, minWidth: 24, alignItems: 'center' }}
          testID={`pin-button-${id}`}
        >
          <UniversalIcon name="pin" size={headerIconSize} color={theme.primary} />
        </TouchableOpacity>
      )}
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
      onPress={handlePress}
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
