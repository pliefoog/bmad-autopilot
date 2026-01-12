/**
 * Connection Config Dialog - RHF Refactored
 *
 * Purpose: Encapsulate IP/port/protocol connection configuration with protocol-aware validation
 * Pattern: React Hook Form with Zod validation, minimal rendering component
 * Features:
 * - IP address validation (IPv4 multicast for UDP, IPv4/IPv6 unicast for TCP/WebSocket)
 * - Protocol selection (TCP/UDP/WebSocket) with platform-aware defaults
 * - Port range validation (1-65535)
 * - Connection status display (Connected/Connecting/Disconnected/No Data)
 * - Keyboard shortcuts (Cmd+S/Ctrl+S, Esc, Enter) - web only
 * - Maritime defaults: TCP 2000, UDP 10110 (multicast), WebSocket 8080
 *
 * Validation:
 * - Localhost always valid
 * - IPv4: Multicast (224-239) for UDP only, unicast for TCP/WebSocket
 * - IPv6: Multicast (ff::/8) for UDP only, unicast for TCP/WebSocket
 * - DNS hostnames: TCP/WebSocket only (not UDP)
 * - Port: 1-65535 range validation via validator.js
 *
 * Limitations:
 * - No DNS resolution validation (accepts any hostname format)
 * - No ping/connectivity test before connect
 * - TCP/UDP unavailable on web (WebSocket only for browser security)
 * - Does not auto-disconnect when changing settings (user must manually disconnect)
 */

import React, { useCallback, useMemo, useEffect } from 'react';
import { View, Text, StyleSheet, Platform, TouchableOpacity } from 'react-native';
import { useTheme, ThemeColors } from '../../store/themeStore';
import { useNmeaStore } from '../../store/nmeaStore';
import { BaseConfigDialog } from './base/BaseConfigDialog';
import { PlatformTextInput } from './inputs/PlatformTextInput';
import { PlatformRadioButton } from './inputs/PlatformRadioButton';
import { useConnectionConfigForm } from '../../hooks/useConnectionConfigForm';
import { getConnectionDefaults } from '../../services/connectionDefaults';
import { getPlatformTokens } from '../../theme/settingsTokens';

/**
 * Connection Configuration Dialog Props
 *
 * @property visible - Controls modal visibility
 * @property onClose - Callback when dialog closes
 * @property onConnect - Called when user clicks Connect with validated config
 * @property onDisconnect - Optional callback for Disconnect button
 * @property currentConfig - Current connection settings (pre-fills form)
 * @property shouldEnableConnectButton - Optional validation override for Connect button
 */
interface ConnectionConfigDialogProps {
  visible: boolean;
  onClose: () => void;
  onConnect: (config: { ip: string; port: number; protocol: 'tcp' | 'udp' | 'websocket' }) => void;
  onDisconnect?: () => void;
  currentConfig?: { ip: string; port: number; protocol: 'tcp' | 'udp' | 'websocket' };
  shouldEnableConnectButton?: (config: {
    ip: string;
    port: number;
    protocol: 'tcp' | 'udp' | 'websocket';
  }) => boolean;
}

/**
 * Keyboard shortcut handler for web platform
 * Cmd/Ctrl+S to connect, Esc to close, Enter to connect (if valid)
 */
const createKeyboardShortcutHandler = (
  handleConnect: () => void,
  handleClose: () => void,
  hasErrors: boolean,
) => (e: KeyboardEvent) => {
  if ((e.metaKey || e.ctrlKey) && e.key === 's') {
    e.preventDefault();
    handleConnect();
  }
  if (e.key === 'Escape') {
    e.preventDefault();
    handleClose();
  }
  if (e.key === 'Enter' && !hasErrors) {
    e.preventDefault();
    handleConnect();
  }
};

export const ConnectionConfigDialog: React.FC<ConnectionConfigDialogProps> = ({
  visible,
  onClose,
  onConnect,
  onDisconnect,
  currentConfig,
  shouldEnableConnectButton,
}) => {
  const theme = useTheme();
  const platformTokens = getPlatformTokens();
  const styles = useMemo(() => createStyles(theme, platformTokens), [theme, platformTokens]);
  const connectionStatus = useNmeaStore((state) => state.connectionStatus);
  const messageCount = useNmeaStore((state) => state.nmeaData.messageCount);
  const messageFormat = useNmeaStore((state) => state.nmeaData.messageFormat);
  const isConnected = connectionStatus === 'connected';
  const isWeb = Platform.OS === 'web';

  // Create form hook with RHF integration
  const { form, handlers, computed } = useConnectionConfigForm(currentConfig, onConnect, onDisconnect);

  // Watch form values for rendering
  const ip = form.watch('ip');
  const port = form.watch('port');
  const protocol = form.watch('protocol');

  // Check if form has errors
  const hasErrors = Object.keys(form.formState.errors).length > 0;

  // Dialog close handler
  const handleClose = useCallback(() => {
    onClose();
  }, [onClose]);

  // Keyboard shortcuts (web only)
  const handleKeyDown = useCallback(
    createKeyboardShortcutHandler(handlers.handleConnect, handleClose, hasErrors),
    [handlers.handleConnect, handleClose, hasErrors],
  );

  useEffect(() => {
    if (!visible || Platform.OS !== 'web') return;
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [visible, handleKeyDown]);

  // Check if connect button is enabled
  const isConnectEnabled = useMemo(() => {
    const baseEnabled = !hasErrors;

    if (shouldEnableConnectButton) {
      const portNum = parseInt(port.trim(), 10);
      const config = {
        ip: ip.trim(),
        port: isNaN(portNum) ? 0 : portNum,
        protocol,
      };
      return baseEnabled && shouldEnableConnectButton(config);
    }

    return baseEnabled;
  }, [hasErrors, ip, port, protocol, shouldEnableConnectButton]);

  return (
    <BaseConfigDialog
      visible={visible}
      title="Connection"
      onClose={handleClose}
      actionButton={{
        label: isConnected ? 'Disconnect' : 'Connect',
        onPress: isConnected ? handlers.handleDisconnect : handlers.handleConnect,
        disabled: !isConnected && !isConnectEnabled,
        testID: isConnected ? 'connection-disconnect-button' : 'connection-connect-button',
      }}
      testID="connection-config-dialog"
    >
      {/* Connection Status Card */}
      <View style={styles.card}>
        <View style={styles.settingRow}>
          <Text style={styles.sectionTitle}>Connection</Text>
          <View style={styles.statusBadge}>
            <View
              style={[
                styles.statusDot,
                {
                  backgroundColor:
                    connectionStatus === 'connected'
                      ? theme.success
                      : connectionStatus === 'connecting'
                      ? theme.warning
                      : connectionStatus === 'no-data'
                      ? theme.warning
                      : theme.textSecondary,
                },
              ]}
            />
            <Text
              style={[
                styles.statValue,
                {
                  color:
                    connectionStatus === 'connected'
                      ? theme.success
                      : connectionStatus === 'connecting'
                      ? theme.warning
                      : connectionStatus === 'no-data'
                      ? theme.warning
                      : theme.textSecondary,
                },
              ]}
            >
              {connectionStatus === 'connected'
                ? 'Connected'
                : connectionStatus === 'connecting'
                ? 'Connecting...'
                : connectionStatus === 'no-data'
                ? 'No Data'
                : 'Disconnected'}
            </Text>
          </View>
        </View>
      </View>

      {/* Settings Card */}
      <View style={styles.card}>
        {/* Host Address */}
        <View style={styles.field}>
          <Text style={styles.label}>Host (IP address or DNS name)</Text>
          <PlatformTextInput
            value={ip}
            onChangeText={(text) => form.setValue('ip', text)}
            placeholder="192.168.1.100 or bridge.local"
            keyboardType="default"
            autoCapitalize="none"
            autoCorrect={false}
            error={form.formState.errors.ip?.message}
            testID="connection-ip-input"
          />
        </View>

        {/* Port */}
        <View style={styles.field}>
          <Text style={styles.label}>Port</Text>
          <PlatformTextInput
            value={port}
            onChangeText={(text) => form.setValue('port', text)}
            placeholder="8080"
            keyboardType="numeric"
            error={form.formState.errors.port?.message}
            testID="connection-port-input"
          />
        </View>

        {/* Protocol Selection */}
        <View style={styles.field}>
          <Text style={styles.label}>Protocol</Text>
          <View style={styles.radioGroup}>
            <PlatformRadioButton
              label="TCP"
              selected={protocol === 'tcp'}
              onPress={() => handlers.handleProtocolChange('tcp')}
              disabled={isWeb}
              testID="connection-protocol-tcp"
            />
            <PlatformRadioButton
              label="UDP"
              selected={protocol === 'udp'}
              onPress={() => handlers.handleProtocolChange('udp')}
              disabled={isWeb}
              testID="connection-protocol-udp"
            />
            <PlatformRadioButton
              label="WS"
              selected={protocol === 'websocket'}
              onPress={() => handlers.handleProtocolChange('websocket')}
              testID="connection-protocol-websocket"
            />
          </View>
          <Text style={styles.hint}>
            Suggested port: {computed.suggestedPort}
          </Text>
        </View>
      </View>

      {/* Reset to Defaults Button */}
      <TouchableOpacity
        style={styles.resetButton}
        onPress={handlers.handleReset}
        testID="connection-reset-button"
      >
        <Text style={[styles.resetButtonText, { color: theme.interactive }]}>
          ↻ Reset to Defaults
        </Text>
      </TouchableOpacity>

      {/* Connection Details - only show when connected */}
      {isConnected && (
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Connection Details</Text>
          <View style={styles.statsGrid}>
            <View style={styles.statRow}>
              <Text style={[styles.statLabel, { color: theme.textSecondary }]}>Mode</Text>
              <Text style={[styles.statValue, { color: theme.text }]}>
                {messageFormat || '-'}
              </Text>
            </View>
            <View style={styles.statRow}>
              <Text style={[styles.statLabel, { color: theme.textSecondary }]}>Messages</Text>
              <Text style={[styles.statValue, { color: theme.text }]}>
                {messageCount.toLocaleString()}
              </Text>
            </View>
          </View>
        </View>
      )}
    </BaseConfigDialog>
  );
};

/**
 * Style factory function
 * Creates platform-specific StyleSheet with theme colors
 */
const createStyles = (theme: ThemeColors, platformTokens: ReturnType<typeof getPlatformTokens>) =>
  StyleSheet.create({
    card: {
      backgroundColor: theme.surface,
      borderRadius: platformTokens.borderRadius.card,
      padding: 20,
      marginBottom: 16,
      ...Platform.select({
        ios: {
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.1,
          shadowRadius: 8,
        },
        android: {
          elevation: 2,
        },
        web: {
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
        },
      }),
    },
    sectionTitle: {
      fontSize: 18,
      fontWeight: '700',
      fontFamily: platformTokens.typography.fontFamily,
      color: theme.text,
      marginBottom: 4,
    },
    field: {
      marginBottom: 16,
    },
    label: {
      fontSize: platformTokens.typography.body.fontSize,
      fontWeight: '600',
      fontFamily: platformTokens.typography.fontFamily,
      color: theme.text,
      marginBottom: 8,
    },
    hint: {
      fontSize: platformTokens.typography.hint.fontSize,
      fontWeight: platformTokens.typography.hint.fontWeight,
      lineHeight: platformTokens.typography.hint.lineHeight,
      fontFamily: platformTokens.typography.fontFamily,
      fontStyle: 'italic',
      color: theme.textSecondary,
      marginTop: 8,
    },
    statusBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    statusDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
    },
    settingRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    statsGrid: {
      gap: 8,
      marginTop: 12,
    },
    statRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: 4,
    },
    statLabel: {
      fontSize: 14,
      fontFamily: platformTokens.typography.fontFamily,
    },
    statValue: {
      fontSize: 14,
      fontWeight: '600',
      fontFamily: platformTokens.typography.fontFamily,
    },
    radioGroup: {
      flexDirection: 'row',
      gap: 12,
      marginBottom: 4,
    },
    resetButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 12,
      marginVertical: 8,
      borderRadius: 8,
    },
    resetButtonText: {
      fontSize: 14,
      fontWeight: '500',
      fontFamily: platformTokens.typography.fontFamily,
    },
  });

export default ConnectionConfigDialog;
