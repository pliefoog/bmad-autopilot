/**
 * Feature Flags Developer Menu
 * 
 * Developer UI for toggling VIP Platform feature flags.
 * Displays flags grouped by phase with descriptions.
 */

import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Switch, Modal } from 'react-native';
import { useTheme } from '../../store/themeStore';
import { useFeatureFlagStore } from '../../store/featureFlagStore';
import { 
  FeatureFlags, 
  FEATURE_FLAG_DESCRIPTIONS, 
  FEATURE_FLAG_PHASES 
} from '../../config/featureFlags';

interface FeatureFlagsMenuProps {
  visible: boolean;
  onClose: () => void;
}

export const FeatureFlagsMenu: React.FC<FeatureFlagsMenuProps> = ({ visible, onClose }) => {
  const theme = useTheme();
  const { 
    setFeatureFlag, 
    resetToDefaults, 
    enablePhase, 
    disablePhase,
    ...flags 
  } = useFeatureFlagStore();

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.background,
    },
    header: {
      padding: 16,
      backgroundColor: theme.surface,
      borderBottomWidth: 1,
      borderBottomColor: theme.border,
    },
    headerContent: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
    },
    headerTitle: {
      fontSize: 20,
      fontWeight: 'bold',
      color: theme.text,
      marginBottom: 4,
    },
    headerSubtitle: {
      fontSize: 14,
      color: theme.textSecondary,
    },
    closeButton: {
      padding: 8,
      marginTop: -8,
      marginRight: -8,
    },
    closeButtonText: {
      fontSize: 24,
      color: theme.text,
      fontWeight: 'bold',
    },
    actionBar: {
      flexDirection: 'row',
      padding: 12,
      gap: 8,
      backgroundColor: theme.surface,
      borderBottomWidth: 1,
      borderBottomColor: theme.border,
    },
    actionButton: {
      flex: 1,
      paddingVertical: 8,
      paddingHorizontal: 12,
      borderRadius: 6,
      backgroundColor: theme.primary,
      alignItems: 'center',
    },
    actionButtonText: {
      fontSize: 14,
      fontWeight: '600',
      color: '#FFFFFF',
    },
    scrollContent: {
      padding: 16,
    },
    phaseSection: {
      marginBottom: 24,
    },
    phaseHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 12,
      paddingBottom: 8,
      borderBottomWidth: 2,
      borderBottomColor: theme.primary,
    },
    phaseTitle: {
      fontSize: 16,
      fontWeight: 'bold',
      color: theme.text,
    },
    phaseActions: {
      flexDirection: 'row',
      gap: 8,
    },
    phaseActionButton: {
      paddingVertical: 4,
      paddingHorizontal: 8,
      borderRadius: 4,
      backgroundColor: theme.surface,
      borderWidth: 1,
      borderColor: theme.border,
    },
    phaseActionText: {
      fontSize: 12,
      color: theme.text,
    },
    flagRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: 12,
      paddingHorizontal: 12,
      backgroundColor: theme.surface,
      borderRadius: 8,
      marginBottom: 8,
    },
    flagInfo: {
      flex: 1,
      marginRight: 12,
    },
    flagName: {
      fontSize: 14,
      fontWeight: '600',
      color: theme.text,
      marginBottom: 4,
    },
    flagDescription: {
      fontSize: 12,
      color: theme.textSecondary,
    },
    flagStatus: {
      fontSize: 11,
      color: theme.textSecondary,
      marginTop: 2,
    },
    switch: {
      transform: [{ scaleX: 0.9 }, { scaleY: 0.9 }],
    },
  });

  const handleToggleFlag = (flag: keyof FeatureFlags) => {
    setFeatureFlag(flag, !flags[flag]);
  };

  const getPhaseNumber = (phaseTitle: string): number => {
    const match = phaseTitle.match(/Phase (\d+)/);
    return match ? parseInt(match[1], 10) : -1;
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerContent}>
            <View>
              <Text style={styles.headerTitle}>VIP Platform Feature Flags</Text>
              <Text style={styles.headerSubtitle}>
                Epic 13 Progressive Rollout System
              </Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Text style={styles.closeButtonText}>✕</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Action Bar */}
        <View style={styles.actionBar}>
          <TouchableOpacity 
            style={styles.actionButton}
            onPress={resetToDefaults}
          >
            <Text style={styles.actionButtonText}>Reset Defaults</Text>
          </TouchableOpacity>
        </View>

        {/* Feature Flags by Phase */}
        <ScrollView style={styles.scrollContent}>
          {FEATURE_FLAG_PHASES.map((phase) => {
            const phaseNum = getPhaseNumber(phase.phase);
            const enabledCount = phase.flags.filter(flag => flags[flag]).length;
            
            return (
              <View key={phase.phase} style={styles.phaseSection}>
                {/* Phase Header */}
                <View style={styles.phaseHeader}>
                  <Text style={styles.phaseTitle}>
                    {phase.phase} ({enabledCount}/{phase.flags.length})
                  </Text>
                  {phaseNum >= 0 && (
                    <View style={styles.phaseActions}>
                      <TouchableOpacity
                        style={styles.phaseActionButton}
                        onPress={() => enablePhase(phaseNum)}
                      >
                        <Text style={styles.phaseActionText}>Enable All</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.phaseActionButton}
                        onPress={() => disablePhase(phaseNum)}
                      >
                        <Text style={styles.phaseActionText}>Disable All</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>

                {/* Phase Flags */}
                {phase.flags.map((flag) => (
                  <View key={flag} style={styles.flagRow}>
                    <View style={styles.flagInfo}>
                      <Text style={styles.flagName}>{flag}</Text>
                      <Text style={styles.flagDescription}>
                        {FEATURE_FLAG_DESCRIPTIONS[flag]}
                      </Text>
                      <Text style={styles.flagStatus}>
                        Status: {flags[flag] ? '✅ Enabled' : '❌ Disabled'}
                      </Text>
                    </View>
                    <Switch
                      style={styles.switch}
                      value={flags[flag]}
                      onValueChange={() => handleToggleFlag(flag)}
                      trackColor={{ 
                        false: theme.border, 
                        true: theme.primary 
                      }}
                      thumbColor={flags[flag] ? '#FFFFFF' : theme.surface}
                      disabled={flag === 'USE_FEATURE_FLAG_SYSTEM'}
                    />
                  </View>
                ))}
              </View>
            );
          })}
        </ScrollView>
      </View>
    </Modal>
  );
};
