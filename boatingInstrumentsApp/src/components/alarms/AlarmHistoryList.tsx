/**
 * Alarm History List Component
 * Story 4.1: Critical Safety Alarms - Alarm History Display
 * 
 * Displays alarm event history with filtering and export capabilities
 */

import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useTheme } from '../../store/themeStore';
import { AlarmConfigurationManager, AlarmHistoryEntry } from '../../src/services/alarms/AlarmConfigurationManager';
import { CriticalAlarmType, AlarmEscalationLevel } from '../../src/services/alarms/types';
import { AlarmLevel } from '../../src/store/alarmStore';

interface AlarmHistoryListProps {
  maxItems?: number;
  filterByType?: CriticalAlarmType;
  onExport?: () => void;
}

export const AlarmHistoryList: React.FC<AlarmHistoryListProps> = ({
  maxItems = 50,
  filterByType,
  onExport,
}) => {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const [history, setHistory] = useState<AlarmHistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterLevel, setFilterLevel] = useState<AlarmEscalationLevel | AlarmLevel | 'all'>('all');

  useEffect(() => {
    loadHistory();
  }, [filterByType, filterLevel]);

  const loadHistory = async () => {
    setLoading(true);
    try {
      const configManager = new AlarmConfigurationManager();
      const allHistory = await configManager.getAlarmHistory(maxItems);
      
      // Apply filters
      let filtered = allHistory;
      
      if (filterByType) {
        filtered = filtered.filter(entry => entry.type === filterByType);
      }
      
      if (filterLevel !== 'all') {
        filtered = filtered.filter(entry => entry.escalationLevel === filterLevel);
      }
      
      setHistory(filtered);
    } catch (error) {
      console.error('Failed to load alarm history:', error);
      Alert.alert('Error', 'Failed to load alarm history');
    } finally {
      setLoading(false);
    }
  };

  const formatTimestamp = (timestamp: number): string => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    
    return date.toLocaleDateString();
  };

  const formatDuration = (entry: AlarmHistoryEntry): string => {
    if (!entry.duration) return 'N/A';
    
    const seconds = Math.floor(entry.duration / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    
    if (hours > 0) return `${hours}h ${minutes % 60}m`;
    if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
    return `${seconds}s`;
  };

  const getLevelColor = (level: AlarmEscalationLevel | AlarmLevel): string => {
    switch (level) {
      case 'EMERGENCY':
      case 'CRITICAL':
      case 'critical':
        return '#FF3B30';
      case 'CAUTION':
      case 'WARNING':
      case 'warning':
        return '#FF9500';
      case 'INFO':
      case 'info':
        return '#007AFF';
      default:
        return '#8E8E93';
    }
  };

  const getLevelIcon = (level: AlarmEscalationLevel | AlarmLevel): string => {
    switch (level) {
      case 'EMERGENCY':
      case 'CRITICAL':
      case 'critical':
        return '🚨';
      case 'CAUTION':
      case 'WARNING':
      case 'warning':
        return '⚠️';
      case 'INFO':
      case 'info':
        return 'ℹ️';
      default:
        return '•';
    }
  };

  const getTypeLabel = (type: CriticalAlarmType | 'threshold'): string => {
    if (type === 'threshold') return 'Custom Threshold';
    
    const labels: Record<CriticalAlarmType, string> = {
      [CriticalAlarmType.SHALLOW_WATER]: 'Shallow Water',
      [CriticalAlarmType.ENGINE_OVERHEAT]: 'Engine Overheat',
      [CriticalAlarmType.LOW_BATTERY]: 'Low Battery',
      [CriticalAlarmType.AUTOPILOT_FAILURE]: 'Autopilot Failure',
      [CriticalAlarmType.GPS_LOSS]: 'GPS Loss',
    };
    
    return labels[type] || type;
  };

  const renderHistoryItem = ({ item }: { item: AlarmHistoryEntry }) => {
    const levelColor = getLevelColor(item.escalationLevel);
    const levelIcon = getLevelIcon(item.escalationLevel);
    
    return (
      <View style={styles.historyItem}>
        <View style={styles.itemHeader}>
          <View style={styles.itemHeaderLeft}>
            <Text style={styles.levelIcon}>{levelIcon}</Text>
            <View>
              <Text style={styles.typeLabel}>{getTypeLabel(item.type)}</Text>
              <Text style={styles.timestamp}>{formatTimestamp(item.triggeredAt)}</Text>
            </View>
          </View>
          <View style={[styles.levelBadge, { backgroundColor: levelColor }]}>
            <Text style={styles.levelBadgeText}>{item.escalationLevel}</Text>
          </View>
        </View>
        
        <Text style={styles.message}>{item.message}</Text>
        
        {item.value !== undefined && item.threshold !== undefined && (
          <Text style={styles.valueInfo}>
            Value: {item.value.toFixed(2)} (Threshold: {item.threshold.toFixed(2)})
          </Text>
        )}
        
        <View style={styles.itemFooter}>
          {item.acknowledgedAt && (
            <View style={styles.footerItem}>
              <Text style={styles.footerLabel}>Acknowledged:</Text>
              <Text style={styles.footerValue}>
                {formatTimestamp(item.acknowledgedAt)}
                {item.acknowledgedBy && ` by ${item.acknowledgedBy}`}
              </Text>
            </View>
          )}
          
          {item.duration && (
            <View style={styles.footerItem}>
              <Text style={styles.footerLabel}>Duration:</Text>
              <Text style={styles.footerValue}>{formatDuration(item)}</Text>
            </View>
          )}
          
          {item.snoozeCount > 0 && (
            <View style={styles.footerItem}>
              <Text style={styles.footerLabel}>Snoozed:</Text>
              <Text style={styles.footerValue}>{item.snoozeCount}x</Text>
            </View>
          )}
        </View>
        
        {item.falsePositive && (
          <View style={styles.falsePositiveBadge}>
            <Text style={styles.falsePositiveText}>False Positive</Text>
          </View>
        )}
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Loading history...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.filterBar}>
        <Text style={styles.filterLabel}>Filter:</Text>
        <Pressable
          style={[styles.filterButton, filterLevel === 'all' && styles.filterButtonActive]}
          onPress={() => setFilterLevel('all')}
        >
          <Text style={[styles.filterButtonText, filterLevel === 'all' && styles.filterButtonTextActive]}>
            All
          </Text>
        </Pressable>
        <Pressable
          style={[styles.filterButton, filterLevel === 'CRITICAL' && styles.filterButtonActive]}
          onPress={() => setFilterLevel('CRITICAL')}
        >
          <Text style={[styles.filterButtonText, filterLevel === 'CRITICAL' && styles.filterButtonTextActive]}>
            Critical
          </Text>
        </Pressable>
        <Pressable
          style={[styles.filterButton, filterLevel === 'WARNING' && styles.filterButtonActive]}
          onPress={() => setFilterLevel('WARNING')}
        >
          <Text style={[styles.filterButtonText, filterLevel === 'WARNING' && styles.filterButtonTextActive]}>
            Warning
          </Text>
        </Pressable>
      </View>

      {history.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyIcon}>📋</Text>
          <Text style={styles.emptyText}>No alarm history</Text>
          <Text style={styles.emptySubtext}>Alarm events will appear here</Text>
        </View>
      ) : (
        <FlatList
          data={history}
          renderItem={renderHistoryItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
        />
      )}

      {onExport && history.length > 0 && (
        <Pressable style={styles.exportButton} onPress={onExport}>
          <Text style={styles.exportButtonText}>Export History (XML)</Text>
        </Pressable>
      )}
    </View>
  );
};

const createStyles = (theme: any) => StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: theme.textSecondary,
  },
  filterBar: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: theme.surface,
    borderBottomWidth: 1,
    borderBottomColor: theme.border,
  },
  filterLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: theme.text,
    marginRight: 12,
  },
  filterButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: theme.surface,
    marginRight: 8,
  },
  filterButtonActive: {
    backgroundColor: theme.primary,
  },
  filterButtonText: {
    fontSize: 14,
    color: theme.textSecondary,
  },
  filterButtonTextActive: {
    color: theme.text,
    fontWeight: '600',
  },
  listContent: {
    padding: 16,
  },
  historyItem: {
    backgroundColor: theme.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: theme.shadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  itemHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  levelIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  typeLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.text,
    marginBottom: 2,
  },
  timestamp: {
    fontSize: 13,
    color: theme.textSecondary,
  },
  levelBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  levelBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: theme.text,
    textTransform: 'uppercase' as 'uppercase',
  },
  message: {
    fontSize: 15,
    color: theme.text,
    marginBottom: 8,
    lineHeight: 20,
  },
  valueInfo: {
    fontSize: 13,
    color: theme.textSecondary,
    marginBottom: 12,
  },
  itemFooter: {
    borderTopWidth: 1,
    borderTopColor: theme.border,
    paddingTop: 8,
  },
  footerItem: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  footerLabel: {
    fontSize: 13,
    color: theme.textSecondary,
    marginRight: 6,
  },
  footerValue: {
    fontSize: 13,
    color: theme.text,
  },
  falsePositiveBadge: {
    marginTop: 8,
    backgroundColor: theme.warning,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  falsePositiveText: {
    fontSize: 12,
    color: theme.text,
    fontWeight: '600',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.text,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 15,
    color: theme.textSecondary,
  },
  exportButton: {
    backgroundColor: theme.primary,
    paddingVertical: 14,
    margin: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  exportButtonText: {
    color: theme.text,
    fontSize: 16,
    fontWeight: '600',
  },
});
