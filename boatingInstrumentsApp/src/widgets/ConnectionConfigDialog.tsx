import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Platform,
  Alert,
  Switch,
} from 'react-native';
import { getConnectionDefaults } from '../services/connectionDefaults';
import { useNmeaStore } from '../store/nmeaStore';
import { HelpButton } from '../components/atoms/HelpButton';
import { Tooltip } from '../components/molecules/Tooltip';
import { getHelpContent, getRelatedTopics } from '../content/help-content';

interface ConnectionConfigDialogProps {
  visible: boolean;
  onClose: () => void;
  onConnect: (config: { ip: string; port: number; protocol: 'tcp' | 'udp' | 'websocket' }) => void;
  onDisconnect: () => void; // Keep for backward compatibility but won't be used
  currentConfig?: { ip: string; port: number; protocol: 'tcp' | 'udp' | 'websocket' };
  shouldEnableConnectButton?: (config: { ip: string; port: number; protocol: 'tcp' | 'udp' | 'websocket' }) => boolean;
}

export const ConnectionConfigDialog: React.FC<ConnectionConfigDialogProps> = ({
  visible,
  onClose,
  onConnect,
  onDisconnect, // Keep for compatibility
  currentConfig,
  shouldEnableConnectButton,
}) => {
  const defaults = getConnectionDefaults();
  const connectionStatus = useNmeaStore(state => state.connectionStatus);
  const isConnected = connectionStatus === 'connected';
  const isWeb = Platform.OS === 'web';
  
  // Use defaults initially, but don't override user input
  const [ip, setIp] = useState(currentConfig?.ip || defaults.ip);
  const [port, setPort] = useState(currentConfig?.port.toString() || defaults.port.toString());
  const [useTcp, setUseTcp] = useState(true); // true = TCP, false = UDP
  const [hasUserInput, setHasUserInput] = useState(false); // Track if user has made changes
  
  // Help system state
  const [activeHelpId, setActiveHelpId] = useState<string | null>(null);

  // Only update form when dialog opens (visible changes from false to true)
  // Don't reset while user is typing
  useEffect(() => {
    if (visible && currentConfig && !hasUserInput) {
      setIp(currentConfig.ip);
      setPort(currentConfig.port.toString());
      setUseTcp(currentConfig.protocol === 'tcp');
    }
  }, [visible, currentConfig, hasUserInput]);

  // Reset user input tracking when dialog closes
  useEffect(() => {
    if (!visible) {
      setHasUserInput(false);
    }
  }, [visible]);

  // Handle IP changes and mark as user input
  const handleIpChange = (value: string) => {
    setIp(value);
    setHasUserInput(true);
  };

  // Handle port changes and mark as user input  
  const handlePortChange = (value: string) => {
    setPort(value);
    setHasUserInput(true);
  };

  const getCurrentConfig = () => ({
    ip: ip.trim(),
    port: parseInt(port, 10),
    protocol: isWeb ? 'websocket' : (useTcp ? 'tcp' : 'udp') as 'tcp' | 'udp' | 'websocket',
  });

  const isConnectButtonEnabled = () => {
    const portNumber = parseInt(port, 10);
    
    // Basic validation
    if (!ip.trim() || isNaN(portNumber) || portNumber < 1 || portNumber > 65535) {
      return false;
    }
    
    // Check if configuration has changed using the callback
    if (shouldEnableConnectButton) {
      return shouldEnableConnectButton(getCurrentConfig());
    }
    
    // Fallback - always enabled if no callback provided
    return true;
  };

  const handleConnect = () => {
    const config = getCurrentConfig();
    
    if (!ip.trim()) {
      Alert.alert('Error', 'IP address is required');
      return;
    }
    
    if (isNaN(config.port) || config.port < 1 || config.port > 65535) {
      Alert.alert('Error', 'Port must be a number between 1 and 65535');
      return;
    }

    onConnect(config);
    onClose();
  };

  const handleReset = () => {
    setIp(defaults.ip);
    setPort(defaults.port.toString());
    setUseTcp(defaults.protocol === 'tcp');
    setHasUserInput(true); // Mark as user action to prevent override
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

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Connection Settings</Text>
          <View style={styles.headerActions}>
            <HelpButton 
              helpId="connection-setup" 
              onPress={() => showHelp('connection-setup')}
              size={24}
              style={styles.helpButton}
            />
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Text style={styles.closeButtonText}>✕</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.content}>
          <Text style={styles.description}>
            NMEA Bridge Details
          </Text>

          <View style={styles.section}>
            <Text style={styles.label}>Host (IP or DNS name)</Text>
            <TextInput
              style={styles.input}
              value={ip}
              onChangeText={handleIpChange}
              placeholder="e.g. 192.168.1.100 or bridge.local"
              keyboardType="default"
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="off"
            />
          </View>

          <View style={styles.section}>
            <Text style={styles.label}>Port</Text>
            <TextInput
              style={styles.input}
              value={port}
              onChangeText={handlePortChange}
              placeholder="Enter port number"
              keyboardType="numeric"
            />
          </View>

          {!isWeb && (
            <View style={styles.section}>
              <View style={styles.protocolToggle}>
                <Text style={styles.label}>Protocol</Text>
                <View style={styles.toggleContainer}>
                  <Text style={[styles.toggleLabel, !useTcp && styles.toggleLabelActive]}>UDP</Text>
                  <Switch
                    value={useTcp}
                    onValueChange={setUseTcp}
                    trackColor={{ false: '#FF6B35', true: '#007AFF' }}
                    thumbColor="#fff"
                  />
                  <Text style={[styles.toggleLabel, useTcp && styles.toggleLabelActive]}>TCP</Text>
                </View>
              </View>
            </View>
          )}
        </View>

        <View style={styles.footer}>
          <TouchableOpacity style={styles.resetButton} onPress={handleReset}>
            <Text style={styles.resetButtonText}>Reset to Suggested</Text>
          </TouchableOpacity>
          
          <View style={styles.actionButtons}>
            <TouchableOpacity style={styles.cancelButton} onPress={onClose}>
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[
                styles.connectButton,
                !isConnectButtonEnabled() && styles.connectButtonDisabled
              ]} 
              onPress={handleConnect}
              disabled={!isConnectButtonEnabled()}
            >
              <Text style={[
                styles.connectButtonText,
                !isConnectButtonEnabled() && styles.connectButtonTextDisabled
              ]}>
                Connect
              </Text>
            </TouchableOpacity>
          </View>
        </View>

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
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a1a',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
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
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  closeButton: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#333',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  description: {
    color: '#ccc',
    fontSize: 14,
    marginBottom: 30,
    lineHeight: 20,
  },
  section: {
    marginBottom: 25,
  },
  label: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#2a2a2a',
    borderRadius: 8,
    padding: 15,
    color: '#fff',
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#444',
  },
  protocolToggle: {
    marginTop: 10,
  },
  toggleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#2a2a2a',
    borderRadius: 8,
    padding: 15,
    borderWidth: 1,
    borderColor: '#444',
  },
  toggleLabel: {
    color: '#ccc',
    fontSize: 16,
    fontWeight: '600',
  },
  toggleLabelActive: {
    color: '#fff',
  },
  footer: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#333',
  },
  resetButton: {
    alignSelf: 'center',
    marginBottom: 20,
  },
  resetButtonText: {
    color: '#007AFF',
    fontSize: 14,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 15,
  },
  cancelButton: {
    flex: 1,
    padding: 15,
    borderRadius: 8,
    backgroundColor: '#2a2a2a',
    alignItems: 'center',
  },
  cancelButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  connectButton: {
    flex: 1,
    padding: 15,
    borderRadius: 8,
    backgroundColor: '#007AFF',
    alignItems: 'center',
  },
  connectButtonDisabled: {
    backgroundColor: '#333',
    opacity: 0.5,
  },
  connectButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  connectButtonTextDisabled: {
    color: '#888',
  },
});