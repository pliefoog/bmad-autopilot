import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useTheme } from '../core/themeStore';

type WidgetCardProps = {
  title: string;
  icon: string;
  value?: string | number;
  unit?: string;
  state?: 'normal' | 'alarm' | 'no-data' | 'highlighted';
  secondary?: string;
  children?: React.ReactNode;
};

export const WidgetCard: React.FC<WidgetCardProps> = ({
  title,
  icon,
  value,
  unit,
  state = 'normal',
  secondary,
  children,
}) => {
  // Raymarine Marine Instrument Colors - Bright and Visible
  const getDisplayColor = () => {
    switch (state) {
      case 'alarm':
        return '#ff1a1a'; // Bright alarm red
      case 'highlighted':
        return '#ffaa00'; // Bright warning orange
      case 'no-data':
        return '#888888'; // Visible dimmed state
      default:
        return '#00ff80'; // Bright marine green
    }
  };

  const getBorderColor = () => {
    switch (state) {
      case 'alarm':
        return '#ff3333';
      case 'highlighted':
        return '#ffaa00';
      default:
        return '#0099ff'; // Bright Raymarine blue
    }
  };

  const getBackgroundGlow = () => {
    switch (state) {
      case 'alarm':
        return '#330000'; // Dark red glow
      case 'highlighted':
        return '#332200'; // Dark orange glow  
      default:
        return '#001122'; // Dark blue glow
    }
  };

  const displayColor = getDisplayColor();
  const borderColor = getBorderColor();
  const backgroundGlow = getBackgroundGlow();
  
  return (
    <View style={styles.compactWidget}>
      
      {/* Compact Header */}
      <View style={styles.header}>
        <Ionicons name={icon} size={12} color="#666" style={styles.icon} />
        <Text style={styles.title}>{title.toUpperCase()}</Text>
        <View style={[styles.statusDot, { backgroundColor: displayColor }]} />
      </View>
      
      {/* Value Display */}
      <View style={styles.valueArea}>
        <Text style={styles.value}>
          {value !== undefined && value !== null ? value : '---'}
        </Text>
        {unit && <Text style={styles.unit}>{unit}</Text>}
      </View>
      
      {/* Secondary Info */}
      {secondary && (
        <Text style={styles.secondary}>{secondary}</Text>
      )}
      
      {/* Additional Content */}
      {children}
      
    </View>
  );
};

const styles = StyleSheet.create({
  // Compact Widget - Efficient Space Usage
  compactWidget: {
    backgroundColor: '#ffffff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    padding: 12,
    margin: 4,
    minWidth: 120,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  
  icon: {
    marginRight: 6,
  },
  
  title: {
    fontSize: 10,
    fontWeight: '600',
    color: '#666666',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    flex: 1,
  },
  
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  
  valueArea: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'flex-start',
    marginBottom: 4,
  },
  
  value: {
    fontSize: 28,
    fontWeight: '800',
    color: '#000000',
    fontFamily: 'monospace',
    letterSpacing: 0.5,
  },
  
  unit: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666666',
    marginLeft: 4,
    marginTop: 4,
  },
  
  secondary: {
    fontSize: 10,
    color: '#888888',
    fontWeight: '500',
  },
});