import React, { useState, useCallback, useMemo } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  Platform,
} from 'react-native';
import { useTheme } from '../../store/themeStore';
import { useUnitConversion, UnitDefinition } from '../../hooks/useUnitConversion';

interface UnitsConfigDialogProps {
  visible: boolean;
  onClose: () => void;
}

interface CategoryConfig {
  key: string;
  name: string;
  description: string;
  icon: string;
}

// Define unit categories that have meaningful choices for marine applications
const UNIT_CATEGORIES: CategoryConfig[] = [
  {
    key: 'distance',
    name: 'Distance/Depth',
    description: 'Depth sounder, distances, ranges',
    icon: '📏',
  },
  {
    key: 'vessel_speed',
    name: 'Vessel Speed',
    description: 'SOG (Speed Over Ground), STW (Speed Through Water)',
    icon: '🚤',
  },
  {
    key: 'wind_speed',
    name: 'Wind Speed',
    description: 'Apparent wind, true wind, including Beaufort scale',
    icon: '�',
  },
  {
    key: 'temperature',
    name: 'Temperature',
    description: 'Water temperature, engine temperature',
    icon: '🌡️',
  },
  {
    key: 'pressure',
    name: 'Pressure',
    description: 'Barometric pressure, oil pressure',
    icon: '🔘',
  },
  {
    key: 'coordinates',
    name: 'GPS Coordinates',
    description: 'Latitude/longitude display format',
    icon: '🗺️',
  },
];

export const UnitsConfigDialog: React.FC<UnitsConfigDialogProps> = ({
  visible,
  onClose,
}) => {
  const theme = useTheme();
  const {
    getUnitsInCategory,
    getPreferredUnit,
    setPreferredUnit,
    currentSystem,
    setSystem,
  } = useUnitConversion();

  // Track unsaved changes
  const [pendingChanges, setPendingChanges] = useState<Record<string, string>>({});
  const [hasChanges, setHasChanges] = useState(false);

  // Handle unit selection for a category
  const handleUnitSelect = useCallback((category: string, unitId: string) => {
    setPendingChanges(prev => ({
      ...prev,
      [category]: unitId,
    }));
    setHasChanges(true);
  }, []);

  // Get currently selected unit for a category (with pending changes)
  const getSelectedUnit = useCallback((category: string): string => {
    if (pendingChanges[category]) {
      return pendingChanges[category];
    }
    const preferred = getPreferredUnit(category);
    return preferred?.id || '';
  }, [pendingChanges, getPreferredUnit]);

  // Apply all pending changes
  const handleSave = useCallback(() => {
    Object.entries(pendingChanges).forEach(([category, unitId]) => {
      setPreferredUnit(category, unitId);
    });
    
    setPendingChanges({});
    setHasChanges(false);
    onClose();
    
    Alert.alert(
      'Units Updated',
      'Your unit preferences have been saved and will apply to all widgets.',
      [{ text: 'OK' }]
    );
  }, [pendingChanges, setPreferredUnit, onClose]);

  // Cancel changes
  const handleCancel = useCallback(() => {
    if (hasChanges) {
      Alert.alert(
        'Discard Changes?',
        'You have unsaved unit preferences. Are you sure you want to discard them?',
        [
          { text: 'Keep Editing', style: 'cancel' },
          { 
            text: 'Discard', 
            style: 'destructive',
            onPress: () => {
              setPendingChanges({});
              setHasChanges(false);
              onClose();
            }
          },
        ]
      );
    } else {
      onClose();
    }
  }, [hasChanges, onClose]);

  // Reset to system defaults
  const handleResetToDefaults = useCallback(() => {
    Alert.alert(
      'Reset to Defaults?',
      `This will reset all units to ${currentSystem} system defaults.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: () => {
            // Clear all preferences to use system defaults
            const resetChanges: Record<string, string> = {};
            UNIT_CATEGORIES.forEach(category => {
              const systemUnits = getUnitsInCategory(category.key)
                .filter(unit => unit.system === currentSystem);
              if (systemUnits.length > 0) {
                resetChanges[category.key] = systemUnits[0].id;
              }
            });
            setPendingChanges(resetChanges);
            setHasChanges(true);
          }
        }
      ]
    );
  }, [currentSystem, getUnitsInCategory]);

  // Render unit picker for a category
  const renderUnitPicker = useCallback((category: CategoryConfig) => {
    const availableUnits = getUnitsInCategory(category.key);
    const selectedUnitId = getSelectedUnit(category.key);
    
    if (availableUnits.length === 0) {
      return null;
    }

    return (
      <View key={category.key} style={styles.categorySection}>
        <View style={styles.categoryHeader}>
          <Text style={styles.categoryIcon}>{category.icon}</Text>
          <View style={styles.categoryInfo}>
            <Text style={[styles.categoryName, { color: theme.text }]}>
              {category.name}
            </Text>
            <Text style={[styles.categoryDescription, { color: theme.textSecondary }]}>
              {category.description}
            </Text>
          </View>
        </View>
        
        <View style={styles.unitOptions}>
          {availableUnits.map((unit: UnitDefinition) => {
            const isSelected = selectedUnitId === unit.id;
            return (
              <TouchableOpacity
                key={unit.id}
                style={[
                  styles.unitOption,
                  {
                    backgroundColor: isSelected ? theme.primary : theme.surface,
                    borderColor: isSelected ? theme.primary : theme.border,
                  }
                ]}
                onPress={() => handleUnitSelect(category.key, unit.id)}
                activeOpacity={0.7}
              >
                <Text style={[
                  styles.unitName,
                  { color: isSelected ? theme.surface : theme.text }
                ]}>
                  {unit.name}
                </Text>
                <Text style={[
                  styles.unitSymbol,
                  { color: isSelected ? theme.surface : theme.textSecondary }
                ]}>
                  {unit.symbol}
                </Text>
                {unit.system && (
                  <Text style={[
                    styles.unitSystem,
                    { color: isSelected ? theme.surface : theme.textSecondary }
                  ]}>
                    {unit.system}
                  </Text>
                )}
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
    );
  }, [getUnitsInCategory, getSelectedUnit, handleUnitSelect, theme]);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle={Platform.OS === 'ios' ? 'pageSheet' : 'fullScreen'}
      onRequestClose={handleCancel}
    >
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        {/* Header */}
        <View style={[styles.header, { borderBottomColor: theme.border }]}>
          <TouchableOpacity onPress={handleCancel} style={styles.headerButton}>
            <Text style={[styles.headerButtonText, { color: theme.primary }]}>
              Cancel
            </Text>
          </TouchableOpacity>
          
          <Text style={[styles.headerTitle, { color: theme.text }]}>
            Units Configuration
          </Text>
          
          <TouchableOpacity 
            onPress={handleSave}
            style={styles.headerButton}
            disabled={!hasChanges}
          >
            <Text style={[
              styles.headerButtonText, 
              { color: hasChanges ? theme.primary : theme.textSecondary }
            ]}>
              Save
            </Text>
          </TouchableOpacity>
        </View>

        {/* Current System Indicator */}
        <View style={[styles.systemIndicator, { backgroundColor: theme.surface }]}>
          <Text style={[styles.systemLabel, { color: theme.textSecondary }]}>
            Current System:
          </Text>
          <Text style={[styles.systemValue, { color: theme.text }]}>
            {currentSystem.charAt(0).toUpperCase() + currentSystem.slice(1)}
          </Text>
          <TouchableOpacity
            onPress={handleResetToDefaults}
            style={[styles.resetButton, { borderColor: theme.border }]}
          >
            <Text style={[styles.resetButtonText, { color: theme.primary }]}>
              Reset to Defaults
            </Text>
          </TouchableOpacity>
        </View>

        {/* Unit Categories */}
        <ScrollView 
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {UNIT_CATEGORIES.map(renderUnitPicker)}
          
          {/* Info Section */}
          <View style={[styles.infoSection, { backgroundColor: theme.surface }]}>
            <Text style={[styles.infoTitle, { color: theme.text }]}>
              ℹ️ About Unit Preferences
            </Text>
            <Text style={[styles.infoText, { color: theme.textSecondary }]}>
              • Unit preferences apply to all widgets displaying that type of measurement{'\n'}
              • Changes take effect immediately when saved{'\n'}
              • System defaults can be restored using "Reset to Defaults"{'\n'}
              • GPS coordinate formats affect position display in navigation widgets
            </Text>
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    ...Platform.select({
      ios: {
        paddingTop: 60, // Account for status bar
      },
      android: {
        paddingTop: 16,
      },
    }),
  },
  headerButton: {
    minWidth: 80,
    alignItems: 'center',
  },
  headerButtonText: {
    fontSize: 17,
    fontWeight: '600',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '600',
  },
  systemIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
  },
  systemLabel: {
    fontSize: 14,
    fontWeight: '500',
  },
  systemValue: {
    fontSize: 14,
    fontWeight: '600',
    flex: 1,
  },
  resetButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    borderRadius: 6,
  },
  resetButtonText: {
    fontSize: 13,
    fontWeight: '500',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  categorySection: {
    marginBottom: 24,
  },
  categoryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  categoryIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  categoryInfo: {
    flex: 1,
  },
  categoryName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  categoryDescription: {
    fontSize: 13,
    lineHeight: 18,
  },
  unitOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  unitOption: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    minWidth: 120,
    alignItems: 'center',
  },
  unitName: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 2,
  },
  unitSymbol: {
    fontSize: 13,
    fontWeight: '500',
    marginBottom: 1,
  },
  unitSystem: {
    fontSize: 11,
    textTransform: 'capitalize',
  },
  infoSection: {
    marginTop: 16,
    padding: 16,
    borderRadius: 8,
  },
  infoTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  infoText: {
    fontSize: 13,
    lineHeight: 20,
  },
});

export default UnitsConfigDialog;