import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, FlatList } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { WidgetRegistry } from './WidgetRegistry';
import { PlatformStyles } from '../utils/animationUtils';

interface WidgetListItem {
  key: string;
  label: string;
  icon: string;
  category: string;
}

export const WidgetSelector: React.FC<{
  selected: string[];
  onChange: (selected: string[]) => void;
  visible: boolean;
  onClose: () => void;
}> = ({ selected, onChange, visible, onClose }) => {
  const [localSelected, setLocalSelected] = useState<string[]>(selected);
  const [highlighted, setHighlighted] = useState<string | null>(null);

  // Get widget list from registry
  const widgetList: WidgetListItem[] = useMemo(() => {
    return WidgetRegistry.getAllWidgets().map(meta => ({
      key: meta.id,
      label: meta.title,
      icon: meta.icon,
      category: meta.category,
    }));
  }, []);

  const handleAdd = (key: string) => {
    const updated = [...localSelected, key];
    setLocalSelected(updated);
    setHighlighted(key);
    onChange(updated);
    setTimeout(() => setHighlighted(null), 600);
    onClose();
  };

  const renderItem = ({ item }: { item: WidgetListItem }) => {
    const alreadyAdded = localSelected.includes(item.key);
    return (
      <TouchableOpacity
        style={[styles.card, alreadyAdded && styles.cardDimmed, highlighted === item.key && styles.cardHighlight]}
        onPress={() => handleAdd(item.key)}
        activeOpacity={alreadyAdded ? 0.7 : 1}
        disabled={false}
      >
        <Ionicons name={item.icon} size={32} color={alreadyAdded ? '#94A3B8' : '#0284C7'} style={{ marginBottom: 8 }} />
        <Text style={[styles.label, alreadyAdded && styles.labelDimmed]}>{item.label}</Text>
        {alreadyAdded && (
          <Ionicons name="checkmark-circle-outline" size={20} color="#94A3B8" style={{ position: 'absolute', top: 8, right: 8 }} />
        )}
      </TouchableOpacity>
    );
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <View style={styles.header}>
            <Text style={styles.title}>Add Instrument</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close-outline" size={28} color="#CBD5E1" />
            </TouchableOpacity>
          </View>
          <FlatList
            data={widgetList}
            renderItem={renderItem}
            keyExtractor={(item) => item.key}
            numColumns={2}
            contentContainerStyle={styles.grid}
          />
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#1E293B',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 32,
    minHeight: '60%',
    elevation: 8,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
    letterSpacing: 1,
  },
  closeBtn: {
    padding: 4,
  },
  grid: {
    paddingBottom: 12,
  },
  card: {
    backgroundColor: '#1E293B',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#334155',
    margin: 8,
    flex: 1,
    minWidth: 140,
    minHeight: 160,
    alignItems: 'center',
    justifyContent: 'center',
    ...PlatformStyles.boxShadow('#000', { x: 0, y: 2 }, 4, 0.2),
    position: 'relative',
  },
  cardDimmed: {
    opacity: 0.5,
  },
  cardHighlight: {
    borderColor: '#06B6D4',
    ...PlatformStyles.boxShadow('#06B6D4', { x: 0, y: 2 }, 4, 0.5),
  },
  label: {
    fontSize: 15,
    color: '#FFFFFF',
    fontWeight: '600',
    marginTop: 4,
    letterSpacing: 1,
  },
  labelDimmed: {
    color: '#94A3B8',
  },
});
