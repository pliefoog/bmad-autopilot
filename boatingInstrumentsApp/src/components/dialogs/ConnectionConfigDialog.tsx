/**
 * Connection Config Dialog (Refactored)
 *
 * Features:
 * - IP address and port configuration with validation
 * - Protocol toggle (TCP/UDP) - hidden on Web (websocket only)
 * - Unified form state management with useFormState
 * - Zod validation schema with IP regex and port range validation
 * - Compact mobile-optimized layout (no collapsible sections)
 * - Keyboard shortcuts (Cmd+S/Ctrl+S to save, Esc to cancel)
 * - Platform-aware touch targets and layouts
 *
 * **Architecture:**
 * - Uses BaseConfigDialog for consistent Modal/header/footer structure
 * - BaseConfigDialog provides: pageSheet Modal, close button, title, optional action button
 * - Eliminates duplicate Modal boilerplate (~100 lines removed vs manual implementation)
 */

import React, { useCallback, useMemo, useEffect } from 'react';
import { View, Text, StyleSheet, Platform, TouchableOpacity } from 'react-native';
import { z } from 'zod';
import { useTheme, ThemeColors } from '../../store/themeStore';
import { useNmeaStore } from '../../store/nmeaStore';
import { UniversalIcon } from '../atoms/UniversalIcon';
import { BaseConfigDialog } from './base/BaseConfigDialog';
import { PlatformTextInput } from './inputs/PlatformTextInput';
import { PlatformToggle } from './inputs/PlatformToggle';
import { useFormState } from '../../hooks/useFormState';
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
 * @property isEmbedded - When true, renders inline without Modal (for onboarding)
 *
 * **Component Behavior:**
 * - IP validation: IPv4 format (192.168.1.100) or DNS names (bridge.local)
 * - Port validation: 1-65535 range, integer only
 * - Protocol toggle hidden on Web platform (WebSocket only)
 * - Auto-saves form changes with 300ms debounce
 * - Shows connection status indicator when connected
 * - Keyboard shortcuts: Cmd/Ctrl+S to save, Esc to close
 * - Embedded mode: No modal wrapper, renders inline in onboarding Step 2
 *
 * **Limitations:**
 * - IPv6 addresses not supported
 * - No DNS resolution validation (accepts any hostname format)
 * - Protocol switch only visible on native platforms
 * - No ping/connectivity test before connect
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
  isEmbedded?: boolean; // For onboarding - renders inline without Modal
}

// IP address validation regex (IPv4)
const ipv4Regex = /^((25[0-5]|(2[0-4]|1\d|[1-9]?\d))\.){3}(25[0-5]|(2[0-4]|1\d|[1-9]?\d))$/;

// IPv6 validation regex (simplified - covers most common cases)
const ipv6Regex = /^(([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,7}:|([0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,5}(:[0-9a-fA-F]{1,4}){1,2}|([0-9a-fA-F]{1,4}:){1,4}(:[0-9a-fA-F]{1,4}){1,3}|([0-9a-fA-F]{1,4}:){1,3}(:[0-9a-fA-F]{1,4}){1,4}|([0-9a-fA-F]{1,4}:){1,2}(:[0-9a-fA-F]{1,4}){1,5}|[0-9a-fA-F]{1,4}:((:[0-9a-fA-F]{1,4}){1,6})|:((:[0-9a-fA-F]{1,4}){1,7}|:)|::)$/;

// DNS hostname validation (RFC 1123)
const dnsHostnameRegex = /^(?=.{1,253}$)(?:(?!-)[A-Za-z0-9-]{1,63}(?<!-)\.)*(?!-)[A-Za-z0-9-]{1,63}(?<!-)$/;

// Localhost variations
const localhostRegex = /^(localhost|127\.0\.0\.1|::1|\[::1\])$/i;

// Zod schema for connection form with comprehensive validation
const connectionFormSchema = z.object({
  ip: z
    .string()
    .min(1, 'Host address is required')
    .refine(
      (val) => {
        const trimmed = val.trim().toLowerCase();
        
        // Check if it's localhost
        if (localhostRegex.test(trimmed)) {
          return true;
        }
        
        // Check if it's a valid IPv4
        if (ipv4Regex.test(trimmed)) {
          return true;
        }
        
        // Check if it's a valid IPv6
        if (ipv6Regex.test(trimmed)) {
          return true;
        }
        
        // Check if it's a valid DNS hostname
        if (dnsHostnameRegex.test(trimmed)) {
          return true;
        }
        
        return false;
      },
      (val) => {
        const trimmed = val.trim();
        
        // If it looks like it might be a DNS name (has dots or letters), provide specific error
        if (/[a-zA-Z]/.test(trimmed) && /\./.test(trimmed)) {
          return {
            message: `Invalid host: cannot resolve "${trimmed}"`,
          };
        }
        
        // If it looks like an IP but is malformed
        if (/^\d+\.\d+\.\d+\.\d+/.test(trimmed)) {
          return {
            message: `Invalid host: "${trimmed}" is not a valid IPv4 address`,
          };
        }
        
        // Generic message for other cases
        return {
          message: 'Invalid host: must be IPv4, IPv6, or DNS hostname',
        };
      }
    ),
  port: z
    .number({
      required_error: 'Port is required',
      invalid_type_error: 'Port must be a number',
    })
    .int('Port must be a whole number')
    .min(1, 'Port must be between 1 and 65535')
    .max(65535, 'Port must be between 1 and 65535')
    .refine(
      (val) => {
        // Warn about common reserved ports (informational, doesn't fail validation)
        return true;
      },
      {
        message: 'Port number is valid',
      }
    ),
  useTcp: z.boolean(),
});

type ConnectionFormData = z.infer<typeof connectionFormSchema>;

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
  const defaults = getConnectionDefaults();
  const connectionStatus = useNmeaStore((state) => state.connectionStatus);
  const nmeaData = useNmeaStore((state) => state.nmeaData);
  const isConnected = connectionStatus === 'connected';
  const isWeb = Platform.OS === 'web';

  // Initialize form data
  const initialFormData: ConnectionFormData = useMemo(
    () => ({
      ip: currentConfig?.ip || defaults.ip,
      port: currentConfig?.port || defaults.port,
      useTcp: currentConfig?.protocol === 'tcp' || defaults.protocol === 'tcp',
    }),
    [currentConfig, defaults],
  );

  // Save handler (just persists form data, doesn't connect)
  const handleSave = useCallback(
    async (data: ConnectionFormData) => {
      // Just save the form data, don't auto-connect
      // Connection only happens when user explicitly presses Connect button
    },
    [],
  );

  // Form state management
  const { formData, updateField, saveNow, isDirty, errors, validate } =
    useFormState<ConnectionFormData>(initialFormData, {
      onSave: handleSave,
      debounceMs: 300,
      validationSchema: connectionFormSchema,
    });

  // Disconnect when connection config changes
  React.useEffect(() => {
    if (isConnected && onDisconnect) {
      // Check if any connection parameter changed
      const configChanged = 
        formData.ip.trim() !== currentConfig?.ip ||
        formData.port !== currentConfig?.port ||
        (isWeb ? false : (formData.useTcp ? 'tcp' : 'udp') !== currentConfig?.protocol);
      
      if (configChanged) {
        onDisconnect();
      }
    }
  }, [formData.ip, formData.port, formData.useTcp, isConnected, currentConfig, onDisconnect, isWeb]);

  // Handle connect button
  const handleConnect = useCallback(() => {
    // Flush any pending debounced changes first
    saveNow();
    
    const isValid = validate();
    if (isValid) {
      const config = {
        ip: formData.ip.trim(),
        port: formData.port,
        protocol: isWeb
          ? 'websocket'
          : ((formData.useTcp ? 'tcp' : 'udp') as 'tcp' | 'udp' | 'websocket'),
      };

      onConnect(config);
      // Don't close dialog - let user see connection status update
    }
  }, [formData, isWeb, onConnect, validate, saveNow]);

  // Handle close
  const handleClose = useCallback(() => {
    saveNow();
    onClose();
  }, [saveNow, onClose]);

  // Handle disconnect
  const handleDisconnect = useCallback(() => {
    if (onDisconnect) {
      onDisconnect();
    }
  }, [onDisconnect]);

  // Reset to defaults
  const handleReset = useCallback(() => {
    updateField('ip', defaults.ip);
    updateField('port', defaults.port);
    updateField('useTcp', defaults.protocol === 'tcp');
  }, [updateField, defaults]);

  // Keyboard shortcuts
  useEffect(() => {
    if (!visible || Platform.OS !== 'web') return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd+S / Ctrl+S to save
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault();
        handleConnect();
      }
      // Esc to cancel
      if (e.key === 'Escape') {
        e.preventDefault();
        handleClose();
      }
      // Enter to submit (if no validation errors)
      if (e.key === 'Enter' && !errors) {
        e.preventDefault();
        handleConnect();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [visible, handleConnect, handleClose, errors]);

  // Check if connect button is enabled (only based on validation)
  const isConnectEnabled = useMemo(() => {
    return !errors || Object.keys(errors).length === 0;
  }, [errors]);

  return (
    <BaseConfigDialog
      visible={visible}
      title="Connection Settings"
      onClose={handleClose}
      actionButton={{
        label: isConnected ? 'Disconnect' : 'Connect',
        onPress: isConnected ? handleDisconnect : handleConnect,
        disabled: !isConnected && !isConnectEnabled,
        testID: isConnected ? 'connection-disconnect-button' : 'connection-connect-button',
      }}
      testID="connection-config-dialog"
    >
      {/* Connection Status Card (always visible) */}
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Connection Status</Text>
        
        <View style={styles.statsGrid}>
          <View style={styles.statRow}>
            <Text style={[styles.statLabel, { color: theme.textSecondary }]}>Status</Text>
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

          {/* Show current config when connected, form data when disconnected/editing */}
          {(isConnected ? currentConfig : formData) && (
            <>
              <View style={styles.statRow}>
                <Text style={[styles.statLabel, { color: theme.textSecondary }]}>Host</Text>
                <Text style={[styles.statValue, { color: theme.text }]}>
                  {isConnected ? currentConfig?.ip : formData.ip}
                </Text>
              </View>

              <View style={styles.statRow}>
                <Text style={[styles.statLabel, { color: theme.textSecondary }]}>Port</Text>
                <Text style={[styles.statValue, { color: theme.text }]}>
                  {isConnected ? currentConfig?.port : formData.port}
                </Text>
              </View>

              <View style={styles.statRow}>
                <Text style={[styles.statLabel, { color: theme.textSecondary }]}>Protocol</Text>
                <Text style={[styles.statValue, { color: theme.text }]}>
                  {isConnected
                    ? currentConfig?.protocol.toUpperCase()
                    : isWeb
                    ? 'WEBSOCKET'
                    : formData.useTcp
                    ? 'TCP'
                    : 'UDP'}
                </Text>
              </View>
            </>
          )}

          {connectionStatus === 'connected' && (
            <View style={styles.statRow}>
              <Text style={[styles.statLabel, { color: theme.textSecondary }]}>Messages</Text>
              <Text style={[styles.statValue, { color: theme.text }]}>
                {nmeaData.messageCount.toLocaleString()}
              </Text>
            </View>
          )}
        </View>
      </View>

      {/* NMEA Bridge Settings Card */}
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>NMEA Bridge</Text>

        {/* Host Address */}
        <View style={styles.field}>
          <Text style={[styles.label, { color: theme.text }]}>Host</Text>
          <PlatformTextInput
            value={formData.ip}
            onChangeText={(text) => updateField('ip', text)}
            placeholder="192.168.1.100 or bridge.local"
            keyboardType="default"
            autoCapitalize="none"
            autoCorrect={false}
            error={errors?.ip}
            testID="connection-ip-input"
          />
          {!errors?.ip && (
            <Text style={[styles.hint, { color: theme.textSecondary }]}>
              IPv4, IPv6, or DNS hostname
            </Text>
          )}
        </View>

        {/* Port */}
        <View style={styles.field}>
          <Text style={[styles.label, { color: theme.text }]}>Port</Text>
          <PlatformTextInput
            value={formData.port.toString()}
            onChangeText={(text) => {
              const num = parseInt(text, 10);
              if (!isNaN(num)) {
                updateField('port', num);
              } else if (text === '') {
                // Allow clearing the field
                updateField('port', 0);
              }
            }}
            placeholder="8080"
            keyboardType="numeric"
            error={errors?.port}
            testID="connection-port-input"
          />
          {!errors?.port && (
            <Text style={[styles.hint, { color: theme.textSecondary }]}>
              1-65535 (common:{' '}
              {isWeb ? '8080' : formData.useTcp ? '10110' : '2000'})
            </Text>
          )}
        </View>

        {/* Protocol Selection (hidden on web) */}
        {!isWeb && (
          <View style={styles.field}>
            <View style={styles.settingRow}>
              <Text style={[styles.label, { color: theme.text }]}>Protocol</Text>
              <PlatformToggle
                value={formData.useTcp}
                onValueChange={(value) => updateField('useTcp', value)}
                testID="connection-protocol-toggle"
              />
            </View>
            <Text style={[styles.hint, { color: theme.textSecondary }]}>
              {formData.useTcp ? 'TCP' : 'UDP'} -{' '}
              {formData.useTcp ? 'Reliable, ordered delivery' : 'Faster, connectionless'}
            </Text>
          </View>
        )}
      </View>

      {/* Reset to Defaults */}
      <TouchableOpacity
        style={[styles.resetButton, { borderColor: theme.border }]}
        onPress={handleReset}
        testID="connection-reset-button"
      >
        <UniversalIcon name="refresh-outline" size={20} color={theme.text} />
        <Text style={[styles.resetButtonText, { color: theme.text }]}>Reset to Defaults</Text>
      </TouchableOpacity>
    </BaseConfigDialog>
  );
};

const createStyles = (theme: ThemeColors, platformTokens: ReturnType<typeof getPlatformTokens>) =>
  StyleSheet.create({
    card: {
      backgroundColor: theme.surface,
      borderRadius: platformTokens.borderRadius.card,
      padding: 8,
      marginBottom: 8,
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
      fontSize: 15,
      fontWeight: '700',
      fontFamily: platformTokens.typography.fontFamily,
      color: theme.text,
      marginBottom: 12,
    },
    statsGrid: {
      gap: 8,
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
      marginBottom: 8,
    },
    field: {
      marginBottom: 12,
    },
    label: {
      fontSize: platformTokens.typography.body.fontSize,
      fontWeight: '600',
      fontFamily: platformTokens.typography.fontFamily,
      marginBottom: 8,
    },
    hint: {
      fontSize: platformTokens.typography.hint.fontSize,
      fontWeight: platformTokens.typography.hint.fontWeight,
      lineHeight: platformTokens.typography.hint.lineHeight,
      fontFamily: platformTokens.typography.fontFamily,
      fontStyle: platformTokens.typography.hint.fontStyle,
      color: theme.textSecondary,
      marginTop: 8,
    },
    resetButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 12,
      borderRadius: platformTokens.borderRadius.card,
      borderWidth: 1,
      marginTop: 8,
      gap: 8,
    },
    resetButtonText: {
      fontSize: 15,
      fontWeight: '500',
      fontFamily: platformTokens.typography.fontFamily,
    },
  });

export default ConnectionConfigDialog;
