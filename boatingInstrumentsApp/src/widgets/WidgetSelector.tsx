import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, FlatList } from 'react-native';
import { useTheme } from '../store/themeStore';
import { UniversalIcon } from '../components/atoms/UniversalIcon';
import { WidgetRegistry } from './WidgetRegistry';
import { PlatformStyles } from '../utils/animationUtils';
import { HelpButton } from '../components/atoms/HelpButton';
import { Tooltip } from '../components/molecules/Tooltip';
import { getHelpContent, getRelatedTopics } from '../content/help-content';

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
  const theme = useTheme();
  const [localSelected, setLocalSelected] = useState<string[]>(selected);
  const [highlighted, setHighlighted] = useState<string | null>(null);
  const [activeHelpId, setActiveHelpId] = useState<string | null>(null);

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

  const showHelp = (helpId: string) => {
    setActiveHelpId(helpId);
  };

  const closeHelp = () => {
    setActiveHelpId(null);
  };

  const navigateToRelatedTopic = (helpId: string) => {
    setActiveHelpId(helpId);
  };

  // Get current help content
  const helpContent = activeHelpId ? getHelpContent(activeHelpId) : null;
  const relatedTopics = activeHelpId ? getRelatedTopics(activeHelpId) : [];

  const renderItem = ({ item }: { item: WidgetListItem }) => {
    const alreadyAdded = localSelected.includes(item.key);
    return (
      <TouchableOpacity
        style={[
          styles.card,
          { backgroundColor: theme.surface, borderColor: theme.border },
          alreadyAdded && styles.cardDimmed,
          highlighted === item.key && [styles.cardHighlight, { borderColor: theme.text }]
        ]}
        onPress={() => handleAdd(item.key)}
        activeOpacity={alreadyAdded ? 0.7 : 1}
        disabled={false}
      >
        <UniversalIcon name={item.icon} size={32} color={alreadyAdded ? theme.textSecondary : theme.text} style={{ marginBottom: 8 }} />
        <Text style={[styles.label, { color: theme.text }, alreadyAdded && { color: theme.textSecondary }]}>{item.label}</Text>
        {alreadyAdded && (
          <UniversalIcon name="checkmark-circle-outline" size={20} color={theme.textSecondary} style={{ position: 'absolute', top: 8, right: 8 }} />
        )}
      </TouchableOpacity>
    );
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={[styles.sheet, { backgroundColor: theme.background }]}>
          <View style={styles.header}>
            <Text style={[styles.title, { color: theme.text }]}>Add Instrument</Text>
            <View style={styles.headerActions}>
              <HelpButton 
                helpId="widget-customization" 
                onPress={() => showHelp('widget-customization')}
                size={24}
                style={styles.helpButton}
              />
              <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                <UniversalIcon name="close-outline" size={28} color={theme.textSecondary} />
              </TouchableOpacity>
            </View>
          </View>
          <FlatList
            data={widgetList}
            renderItem={renderItem}
            keyExtractor={(item) => item.key}
            numColumns={2}
            contentContainerStyle={styles.grid}
          />
          
          {/* Help Tooltip */}
          {helpContent && (
            <Tooltip
              visible={!!activeHelpId}
              onDismiss={closeHelp}
              title={helpContent.title}
              content={helpContent.content}
              tips={helpContent.tips}
              relatedTopics={relatedTopics.map(t => ({
                title: t.title,
                onPress: () => navigateToRelatedTopic(t.id),
              }))}
            />
          )}
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
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  helpButton: {
    marginRight: 4,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  closeBtn: {
    padding: 4,
  },
  grid: {
    paddingBottom: 12,
  },
  card: {
    borderRadius: 8,
    borderWidth: 1,
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
    ...PlatformStyles.boxShadow('#06B6D4', { x: 0, y: 2 }, 4, 0.5),
  },
  label: {
    fontSize: 15,
    fontWeight: '600',
    marginTop: 4,
    letterSpacing: 1,
  },
});
