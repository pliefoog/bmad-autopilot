import React, { useState } from 'react';
import { View, Text, Modal, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { useTheme } from '../../store/themeStore';
import { ThemedSwitch } from '../atoms/ThemedSwitch';

interface TestSwitchDialogProps {
  visible: boolean;
  onClose: () => void;
}

/**
 * Minimal test dialog to debug Switch component rendering
 * Tests both with and without ScrollView to compare behavior
 */
const TestSwitchDialog: React.FC<TestSwitchDialogProps> = ({ visible, onClose }) => {
  const theme = useTheme();
  const [viewMode, setViewMode] = useState<'list' | 'detail'>('list');
  const [testSwitch1, setTestSwitch1] = useState(true);
  const [testSwitch2, setTestSwitch2] = useState(false);
  const [testSwitch3, setTestSwitch3] = useState(true);
  const [testSwitch4, setTestSwitch4] = useState(false);
  const [testSwitch5, setTestSwitch5] = useState(true);
  const [testSwitch6, setTestSwitch6] = useState(false);
  const [detailSwitch, setDetailSwitch] = useState(true);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        {/* iOS Drag Handle */}
        <View style={styles.dragHandle} />
        
        {/* Header */}
        <View style={[styles.header, { borderBottomColor: theme.border }]}>
          <TouchableOpacity
            onPress={viewMode === 'detail' ? () => setViewMode('list') : onClose}
            style={styles.headerButton}
          >
            <Text style={[styles.closeButton, { color: theme.text }]}>
              {viewMode === 'detail' ? 'Back' : 'Done'}
            </Text>
          </TouchableOpacity>
          <Text style={[styles.title, { color: theme.text }]}>
            {viewMode === 'detail' ? 'Detail View' : 'Test Switch Dialog'}
          </Text>
          <View style={styles.headerButton} />
        </View>

        {/* Content */}
        {viewMode === 'list' ? (
          <>
        {/* Content - WITHOUT ScrollView */}
        <View style={styles.content}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>
            WITHOUT ScrollView (baseline):
          </Text>
          
          <View style={styles.row}>
            <Text style={[styles.label, { color: theme.text }]}>
              Switch 1 (ON)
            </Text>
            <ThemedSwitch
              value={testSwitch1}
              onValueChange={setTestSwitch1}
              testID="test-switch-1"
            />
          </View>

          <View style={styles.row}>
            <Text style={[styles.label, { color: theme.text }]}>
              Switch 2 (OFF)
            </Text>
            <ThemedSwitch
              value={testSwitch2}
              onValueChange={setTestSwitch2}
              testID="test-switch-2"
            />
          </View>
        </View>

        {/* Content - WITH SCROLLVIEW */}
        <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>
            WITH ScrollView (test):
          </Text>
          
          <View style={styles.row}>
            <Text style={[styles.label, { color: theme.text }]}>
              Switch 3 (ON) - ScrollView
            </Text>
            <ThemedSwitch
              value={testSwitch3}
              onValueChange={setTestSwitch3}
              testID="test-switch-3"
            />
          </View>

          <View style={styles.row}>
            <Text style={[styles.label, { color: theme.text }]}>
              Switch 4 (OFF) - ScrollView
            </Text>
            <ThemedSwitch
              value={testSwitch4}
              onValueChange={setTestSwitch4}
              testID="test-switch-4"
            />
          </View>

          <Text style={[styles.info, { color: theme.tertiary }]}>
            Compare colors between switches above and below.
          </Text>
        </ScrollView>

        {/* New section - PageSheet test */}
        <View style={styles.content}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>
            WITH TouchableOpacity WRAPPER:
          </Text>
          
          <View style={styles.row}>
            <Text style={[styles.label, { color: theme.text }]}>
              Switch 5 (ON) - Wrapped
            </Text>
            <TouchableOpacity
              onPress={() => setTestSwitch5(!testSwitch5)}
              activeOpacity={1}
            >
              <ThemedSwitch
                value={testSwitch5}
                onValueChange={setTestSwitch5}
                testID="test-switch-5"
              />
            </TouchableOpacity>
          </View>

          <View style={styles.row}>
            <Text style={[styles.label, { color: theme.text }]}>
              Switch 6 (OFF) - Wrapped
            </Text>
            <TouchableOpacity
              onPress={() => setTestSwitch6(!testSwitch6)}
              activeOpacity={1}
            >
              <ThemedSwitch
                value={testSwitch6}
                onValueChange={setTestSwitch6}
                testID="test-switch-6"
              />
            </TouchableOpacity>
          </View>

          <Text style={[styles.info, { color: theme.tertiary }]}>
            If these show green/yellow, TouchableOpacity wrapper is the culprit!
          </Text>
          
          <TouchableOpacity
            style={[styles.button, { backgroundColor: theme.interactive }]}
            onPress={() => setViewMode('detail')}
          >
            <Text style={[styles.buttonText, { color: theme.onColor }]}>
              Go to Detail View →
            </Text>
          </TouchableOpacity>
        </View>
        </>
        ) : (
          // Detail View - mimics AlarmConfigDialog detail view
          <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>
              DETAIL VIEW (like AlarmConfigDialog):
            </Text>
            
            <View style={[styles.section, { backgroundColor: theme.surface, borderColor: theme.border }]}>
              <View style={styles.sectionRow}>
                <Text style={[styles.label, { color: theme.text }]}>Enable Alarm</Text>
                <TouchableOpacity
                  onPress={() => setDetailSwitch(!detailSwitch)}
                  activeOpacity={1}
                >
                  <ThemedSwitch
                    value={detailSwitch}
                    onValueChange={setDetailSwitch}
                    trackColor={{ false: theme.border, true: theme.interactive }}
                    testID="detail-switch"
                  />
                </TouchableOpacity>
              </View>
            </View>
            
            <Text style={[styles.info, { color: theme.tertiary }]}>
              This mimics the AlarmConfigDialog detail view structure.
              {'\n'}
              Does this switch show green?
            </Text>
          </ScrollView>
        )}
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  dragHandle: {
    width: 36,
    height: 5,
    borderRadius: 3,
    backgroundColor: '#ccc',
    alignSelf: 'center',
    marginTop: 12,
    marginBottom: 8,
  },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  dialogContainer: {
    width: '90%',
    maxWidth: 400,
    borderRadius: 12,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    flex: 1,
    textAlign: 'center',
  },
  headerButton: {
    minWidth: 60,
  },
  closeButton: {
    fontSize: 17,
    fontWeight: '400',
  },
  content: {
    padding: 16,
    gap: 12,
    borderBottomWidth: 2,
    borderBottomColor: '#666',
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    gap: 12,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  label: {
    fontSize: 16,
    fontWeight: '500',
  },
  info: {
    fontSize: 12,
    lineHeight: 18,
    marginTop: 8,
    textAlign: 'center',
  },
  button: {
    padding: 16,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 16,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  section: {
    padding: 16,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 16,
  },
  sectionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
});

export default TestSwitchDialog;
