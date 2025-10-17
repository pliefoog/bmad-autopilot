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
import { useNmeaStore } from '../core/nmeaStore';

interface ConnectionConfigDialogProps {
  visible: boolean;
  onClose: () => void;
  onConnect: (config: { ip: string; port: number; protocol: 'tcp' | 'udp' | 'websocket' }) => void;
  onDisconnect: () => void;
  currentConfig?: { ip: string; port: number; protocol: 'tcp' | 'udp' | 'websocket' };
}

export const ConnectionConfigDialog: React.FC<ConnectionConfigDialogProps> = ({
  visible,
  onClose,
  onConnect,
  onDisconnect,
  currentConfig,
}) => {
  const defaults = getConnectionDefaults();
  const connectionStatus = useNmeaStore(state => state.connectionStatus);
  const isConnected = connectionStatus === 'connected';
  const isWeb = Platform.OS === 'web';
  
  const [ip, setIp] = useState(currentConfig?.ip || defaults.ip);
  const [port, setPort] = useState(currentConfig?.port.toString() || defaults.port.toString());
  const [useTcp, setUseTcp] = useState(true); // true = TCP, false = UDP

  useEffect(() => {
    if (currentConfig) {
      setIp(currentConfig.ip);
      setPort(currentConfig.port.toString());
      setUseTcp(currentConfig.protocol === 'tcp');
    }
  }, [currentConfig]);

  const handleConnect = () => {
    const portNumber = parseInt(port, 10);
    
    if (!ip.trim()) {
      Alert.alert('Error', 'IP address is required');
      return;
    }
    
    if (isNaN(portNumber) || portNumber < 1 || portNumber > 65535) {
      Alert.alert('Error', 'Port must be a number between 1 and 65535');
      return;
    }

    onConnect({
      ip: ip.trim(),
      port: portNumber,
      protocol: isWeb ? 'websocket' : (useTcp ? 'tcp' : 'udp'),
    });
    
    onClose();
  };

  const handleDisconnect = () => {
    onDisconnect();
    onClose();
  };

  const handleReset = () => {
    setIp(defaults.ip);
    setPort(defaults.port.toString());
    setUseTcp(defaults.protocol === 'tcp');
  };

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
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Text style={styles.closeButtonText}>✕</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.content}>
          {!isWeb && (
            <Text style={styles.description}>
              Connect to NMEA data source via TCP or UDP
            </Text>
          )}

          <View style={styles.section}>
            <Text style={styles.label}>IP Address</Text>
            <TextInput
              style={styles.input}
              value={ip}
              onChangeText={setIp}
              placeholder="Enter IP address"
              keyboardType="numeric"
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          <View style={styles.section}>
            <Text style={styles.label}>Port</Text>
            <TextInput
              style={styles.input}
              value={port}
              onChangeText={setPort}
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
            <Text style={styles.resetButtonText}>Reset to Default</Text>
          </TouchableOpacity>
          
          <View style={styles.actionButtons}>
            <TouchableOpacity style={styles.cancelButton} onPress={onClose}>
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            
            {isConnected ? (
              <TouchableOpacity style={styles.disconnectButton} onPress={handleDisconnect}>
                <Text style={styles.disconnectButtonText}>Disconnect</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity style={styles.connectButton} onPress={handleConnect}>
                <Text style={styles.connectButtonText}>Connect</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
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
  connectButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  disconnectButton: {
    flex: 1,
    padding: 15,
    borderRadius: 8,
    backgroundColor: '#FF6B35',
    alignItems: 'center',
  },
  disconnectButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});