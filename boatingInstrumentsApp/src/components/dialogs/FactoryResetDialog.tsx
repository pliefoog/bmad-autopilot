import React from 'react';
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

interface FactoryResetDialogProps {
  visible: boolean;
  onConfirm: () => Promise<void>;
  onCancel: () => void;
}

export const FactoryResetDialog: React.FC<FactoryResetDialogProps> = ({
  visible,
  onConfirm,
  onCancel,
}) => {
  const theme = useTheme();

  const handleConfirm = async () => {
    // For mobile platforms, use React Native Alert instead of the modal
    if (Platform.OS !== 'web') {
      Alert.alert(
        'Factory Reset Confirmation',
        'This will completely restore the app to its initial state:\n\n' +
        '• All widgets will be removed\n' +
        '• Dashboard layouts will be reset\n' +
        '• All settings will be cleared\n' +
        '• Connection settings will be reset\n' +
        '• App will return to first-launch state\n' +
        '• Setup wizard will appear again\n\n' +
        'This action cannot be undone!',
        [
          {
            text: 'Cancel',
            style: 'cancel',
            onPress: onCancel,
          },
          {
            text: 'Factory Reset',
            style: 'destructive',
            onPress: onConfirm,
          },
        ],
        { cancelable: true, onDismiss: onCancel }
      );
      return;
    }
    
    // For web and modal display, proceed with the action
    await onConfirm();
  };

  // Use styled modal for all platforms, with higher z-index for proper layering
  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onCancel}
      transparent={false}
      style={Platform.OS === 'web' ? { zIndex: 10001 } : undefined}
    >
      <View style={[
        styles.container, 
        { backgroundColor: theme.background },
        Platform.OS === 'web' && { position: 'relative', zIndex: 10002 }
      ]}>
        <View style={[styles.header, { borderBottomColor: theme.border }]}>
          <TouchableOpacity onPress={onCancel} style={styles.headerButton}>
            <Text style={[styles.headerButtonText, { color: theme.accent }]}>Cancel</Text>
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: theme.text }]}>Factory Reset</Text>
          <TouchableOpacity 
            onPress={handleConfirm} 
            style={styles.headerButton}
          >
            <Text style={[styles.headerButtonText, { color: theme.error }]}>Reset</Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content} contentContainerStyle={styles.scrollContent}>
          <View style={styles.warningSection}>
            <Text style={[styles.warningIcon, { color: theme.warning }]}>⚠️</Text>
            <Text style={[styles.warningTitle, { color: theme.warning }]}>
              Warning: Complete Factory Reset
            </Text>
          </View>

          <Text style={[styles.description, { color: theme.text }]}>
            This action will completely restore the app to its initial state, as if you just installed it for the first time.
          </Text>

          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>What will be reset:</Text>
            
            <View style={styles.bulletList}>
              <View style={styles.bulletItem}>
                <Text style={[styles.bulletIcon, { color: theme.error }]}>•</Text>
                <Text style={[styles.bulletText, { color: theme.text }]}>All widgets will be removed</Text>
              </View>
              
              <View style={styles.bulletItem}>
                <Text style={[styles.bulletIcon, { color: theme.error }]}>•</Text>
                <Text style={[styles.bulletText, { color: theme.text }]}>Dashboard layouts will be reset</Text>
              </View>
              
              <View style={styles.bulletItem}>
                <Text style={[styles.bulletIcon, { color: theme.error }]}>•</Text>
                <Text style={[styles.bulletText, { color: theme.text }]}>All user preferences and settings</Text>
              </View>
              
              <View style={styles.bulletItem}>
                <Text style={[styles.bulletIcon, { color: theme.error }]}>•</Text>
                <Text style={[styles.bulletText, { color: theme.text }]}>NMEA connection configurations</Text>
              </View>
              
              <View style={styles.bulletItem}>
                <Text style={[styles.bulletIcon, { color: theme.error }]}>•</Text>
                <Text style={[styles.bulletText, { color: theme.text }]}>Theme and display preferences</Text>
              </View>
              
              <View style={styles.bulletItem}>
                <Text style={[styles.bulletIcon, { color: theme.error }]}>•</Text>
                <Text style={[styles.bulletText, { color: theme.text }]}>All stored alarms and notifications</Text>
              </View>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>After reset:</Text>
            
            <View style={styles.bulletList}>
              <View style={styles.bulletItem}>
                <Text style={[styles.bulletIcon, { color: theme.success }]}>•</Text>
                <Text style={[styles.bulletText, { color: theme.text }]}>App will restart automatically</Text>
              </View>
              
              <View style={styles.bulletItem}>
                <Text style={[styles.bulletIcon, { color: theme.success }]}>•</Text>
                <Text style={[styles.bulletText, { color: theme.text }]}>Setup wizard will guide you through initial configuration</Text>
              </View>
              
              <View style={styles.bulletItem}>
                <Text style={[styles.bulletIcon, { color: theme.success }]}>•</Text>
                <Text style={[styles.bulletText, { color: theme.text }]}>All features will be available for fresh setup</Text>
              </View>
            </View>
          </View>

          <View style={styles.finalWarning}>
            <Text style={[styles.finalWarningText, { color: theme.error }]}>
              ⚠️ This action cannot be undone! ⚠️
            </Text>
            <Text style={[styles.finalWarningSubtext, { color: theme.textSecondary }]}>
              Make sure you want to completely reset the app before proceeding.
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
    zIndex: 10000, // Higher than hamburger menu to ensure it appears on top
    elevation: 50, // For Android
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    paddingTop: Platform.OS === 'ios' ? 50 : 16,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    flex: 1,
    textAlign: 'center',
  },
  headerButton: {
    padding: 8,
    minWidth: 60,
  },
  headerButtonText: {
    fontSize: 16,
    fontWeight: '500',
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingVertical: 20,
  },
  warningSection: {
    alignItems: 'center',
    marginBottom: 24,
    paddingVertical: 16,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 193, 7, 0.1)', // Light warning background
  },
  warningIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
  warningTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  description: {
    fontSize: 16,
    lineHeight: 22,
    marginBottom: 24,
    textAlign: 'center',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
  },
  bulletList: {
    paddingLeft: 8,
  },
  bulletItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  bulletIcon: {
    fontSize: 16,
    marginRight: 12,
    width: 16,
    textAlign: 'center',
  },
  bulletText: {
    fontSize: 16,
    lineHeight: 22,
    flex: 1,
  },
  finalWarning: {
    marginTop: 16,
    padding: 16,
    backgroundColor: 'rgba(220, 38, 38, 0.1)', // Light error background
    borderRadius: 8,
    alignItems: 'center',
  },
  finalWarningText: {
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 8,
  },
  finalWarningSubtext: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
});