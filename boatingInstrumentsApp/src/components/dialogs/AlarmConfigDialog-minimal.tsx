/**
 * Alarm Configuration Dialog - MINIMAL DEBUG VERSION
 * Incrementally add functionality to isolate text node issues
 */

import React from 'react';
import { Modal, View, Text, StyleSheet, Pressable } from 'react-native';
import { useTheme } from '../../store/themeStore';

interface AlarmConfigDialogProps {
  visible: boolean;
  onClose: () => void;
}

export const AlarmConfigDialog: React.FC<AlarmConfigDialogProps> = ({ visible, onClose }) => {
  const theme = useTheme();

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        <View style={[styles.header, { backgroundColor: theme.surface, borderBottomColor: theme.border }]}>
          <Pressable onPress={onClose} style={styles.headerButton}>
            <Text style={[styles.headerButtonText, { color: theme.primary }]}>Done</Text>
          </Pressable>
          <Text style={[styles.headerTitle, { color: theme.text }]}>Alarms - Debug</Text>
          <View style={styles.headerButton} />
        </View>
        <View style={styles.content}>
          <Text style={[styles.testText, { color: theme.text }]}>Minimal version - no errors expected</Text>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between',
    paddingHorizontal: 16, 
    paddingVertical: 12, 
    borderBottomWidth: 1 
  },
  headerButton: { width: 80, alignItems: 'center' },
  headerButtonText: { fontSize: 17, fontWeight: '600' },
  headerTitle: { fontSize: 18, fontWeight: '700' },
  content: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  testText: { fontSize: 16 },
});
