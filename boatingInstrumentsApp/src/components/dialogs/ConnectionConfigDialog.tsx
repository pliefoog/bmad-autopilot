/**
 * Connection Config Dialog
 * Story 13.2.3 - Migrate Connection Settings to Unified Pattern
 * 
 * Refactored to use:
 * - BaseSettingsModal (Story 13.2.1) for consistent modal foundation
 * - Platform Input Components (Story 13.2.2) for cross-platform inputs
 * - Unified keyboard shortcuts and validation
 * 
 * Features:
 * - IP address validation with real-time error display
 * - Port number validation (1-65535)
 * - Protocol toggle (TCP/UDP) - hidden on Web (websocket only)
 * - Keyboard shortcuts: Cmd+S/Ctrl+S to save, Enter to submit, Esc to cancel
 * - Platform-aware touch targets (44pt phone, 56pt tablet, 64pt glove mode)
 * - Zero breaking changes to public API
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Platform,
  Alert,
} from 'react-native';
import { BaseSettingsModal } from './base/BaseSettingsModal';
import { 
  PlatformTextInput, 
  PlatformToggle, 
  PlatformButton 
} from './inputs';
import { validators } from '../../utils/inputValidation';
import { getConnectionDefaults } from '../../services/connectionDefaults';
import { useNmeaStore } from '../../store/nmeaStore';
import { useTheme } from '../../store/themeStore';
import { hasKeyboard } from '../../utils/platformDetection';

/**
 * Connection Config Dialog Props
 * (unchanged for backward compatibility)
 */
interface ConnectionConfigDialogProps {
  visible: boolean;
  onClose: () => void;
  onConnect: (config: { ip: string; port: number; protocol: 'tcp' | 'udp' | 'websocket' }) => void;
  onDisconnect: () => void; // Deprecated but kept for compatibility
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
  const theme = useTheme();
  const connectionStatus = useNmeaStore(state => state.connectionStatus);
  const isConnected = connectionStatus === 'connected';
  const isWeb = Platform.OS === 'web';
  const keyboardEnabled = hasKeyboard();
  
  // Form state
  const [ip, setIp] = useState(currentConfig?.ip || defaults.ip);
  const [port, setPort] = useState(currentConfig?.port.toString() || defaults.port.toString());
  const [useTcp, setUseTcp] = useState(true); // true = TCP, false = UDP
  const [hasUserInput, setHasUserInput] = useState(false);
  
  // Validation errors (managed by PlatformTextInput internally)
  const [ipError, setIpError] = useState<string | undefined>();
  const [portError, setPortError] = useState<string | undefined>();

  // Initialize form when dialog opens
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
      setIpError(undefined);
      setPortError(undefined);
    }
  }, [visible]);

  // Keyboard shortcuts: Cmd+S / Ctrl+S to save
  useEffect(() => {
    if (!visible || !keyboardEnabled || Platform.OS !== 'web') return;
    
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault();
        if (isConnectButtonEnabled()) {
          handleConnect();
        }
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [visible, ip, port, useTcp, keyboardEnabled]);

  // Handle IP changes
  const handleIpChange = (value: string) => {
    setIp(value);
    setHasUserInput(true);
    
    // Validate and set error
    const error = validators.ipAddress(value.trim());
    setIpError(error);
  };

  // Handle port changes
  const handlePortChange = (value: string) => {
    setPort(value);
    setHasUserInput(true);
    
    // Validate and set error
    const error = validators.portNumber(value);
    setPortError(error);
  };

  // Get current configuration
  const getCurrentConfig = () => ({
    ip: ip.trim(),
    port: parseInt(port, 10),
    protocol: isWeb ? 'websocket' : (useTcp ? 'tcp' : 'udp') as 'tcp' | 'udp' | 'websocket',
  });

  // Check if Connect button should be enabled
  const isConnectButtonEnabled = () => {
    const portNumber = parseInt(port, 10);
    
    // Basic validation
    if (!ip.trim() || isNaN(portNumber) || portNumber < 1 || portNumber > 65535) {
      return false;
    }
    
    // Check for validation errors
    if (ipError || portError) {
      return false;
    }
    
    // Check if configuration has changed using the callback
    if (shouldEnableConnectButton) {
      return shouldEnableConnectButton(getCurrentConfig());
    }
    
    // Fallback - always enabled if no callback provided
    return true;
  };

  // Handle connect button press
  const handleConnect = () => {
    const config = getCurrentConfig();
    
    // Final validation before connecting
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

  // Reset to default values
  const handleReset = () => {
    setIp(defaults.ip);
    setPort(defaults.port.toString());
    setUseTcp(defaults.protocol === 'tcp');
    setHasUserInput(true); // Mark as user action to prevent override
    setIpError(undefined);
    setPortError(undefined);
  };

  return (
    <BaseSettingsModal
      visible={visible}
      title="Connection Settings"
      onClose={onClose}
      onSave={handleConnect}
      saveButtonText="Connect"
      cancelButtonText="Cancel"
      testID="connection-config-dialog"
    >
      <View style={styles.content}>
        {/* Description */}
        <Text style={[styles.description, { color: theme.textSecondary }]}>
          NMEA Bridge Details
        </Text>

        {/* IP Address Input */}
        <PlatformTextInput
          label="Host (IP or DNS name)"
          value={ip}
          onChangeText={handleIpChange}
          placeholder="e.g. 192.168.1.100 or bridge.local"
          keyboardType="default"
          validator={validators.ipAddress}
          error={ipError}
          onSubmit={handleConnect}
          testID="connection-ip-input"
        />

        {/* Port Input */}
        <PlatformTextInput
          label="Port"
          value={port}
          onChangeText={handlePortChange}
          placeholder="Enter port number"
          keyboardType="numeric"
          validator={validators.portNumber}
          error={portError}
          onSubmit={handleConnect}
          testID="connection-port-input"
        />

        {/* Protocol Toggle (hidden on Web - websocket only) */}
        {!isWeb && (
          <View style={styles.protocolSection}>
            <PlatformToggle
              label={useTcp ? "Protocol: TCP" : "Protocol: UDP"}
              value={useTcp}
              onValueChange={setUseTcp}
              testID="connection-protocol-toggle"
            />
          </View>
        )}

        {/* Reset to Defaults Button */}
        <View style={styles.resetContainer}>
          <PlatformButton
            variant="secondary"
            onPress={handleReset}
            title="Reset to Defaults"
            testID="connection-reset-button"
          />
        </View>

        {/* Keyboard Shortcuts Hint (desktop only) */}
        {keyboardEnabled && Platform.OS === 'web' && (
          <Text style={[styles.keyboardHint, { color: theme.textSecondary }]}>
            Keyboard shortcuts: ⌘S (Mac) or Ctrl+S (Windows) to save, Esc to cancel, Enter to submit
          </Text>
        )}
      </View>
    </BaseSettingsModal>
  );
};

const styles = StyleSheet.create({
  content: {
    padding: 20,
  },
  description: {
    fontSize: 14,
    marginBottom: 24,
    lineHeight: 20,
  },
  protocolSection: {
    marginTop: 8,
    marginBottom: 16,
  },
  resetContainer: {
    marginTop: 32,
    marginBottom: 16,
  },
  keyboardHint: {
    fontSize: 12,
    textAlign: 'center',
    marginTop: 16,
    fontStyle: 'italic',
  },
});
