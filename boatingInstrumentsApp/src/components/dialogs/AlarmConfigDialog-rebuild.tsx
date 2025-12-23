import React, { useState, useEffect } from 'react';
import { Modal, View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';
import { ThemeColors } from '../../theme';

interface AlarmConfigDialogProps {
  visible: boolean;
  onClose: () => void;
}

export default function AlarmConfigDialog({ visible, onClose }: AlarmConfigDialogProps) {
  const { theme } = useTheme();
  const styles = createStyles(theme);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        <View style={styles.dragHandle} />
        <View style={[styles.header, { borderBottomColor: theme.border }]}>
          <TouchableOpacity onPress={onClose} style={styles.headerButton}>
            <Text style={[styles.headerButtonText, { color: theme.text }]}>Done</Text>
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: theme.text }]}>Alarms</Text>
          <View style={styles.headerButton} />
        </View>
        <View style={styles.content}>
          <Text style={[styles.message, { color: theme.text }]}>Step 1: Basic modal structure</Text>
        </View>
      </View>
    </Modal>
  );
}

const createStyles = (theme: ThemeColors) =>
  StyleSheet.create({
    container: {
      flex: 1,
    },
    dragHandle: {
      width: 36,
      height: 5,
      backgroundColor: theme.overlay,
      borderRadius: 3,
      alignSelf: 'center',
      marginTop: 5,
      marginBottom: 5,
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderBottomWidth: 1,
    },
    headerButton: {
      padding: 8,
      minWidth: 60,
    },
    headerButtonText: {
      fontSize: 17,
    },
    headerTitle: {
      fontSize: 17,
      fontWeight: '600',
    },
    content: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      padding: 20,
    },
    message: {
      fontSize: 16,
    },
  });
