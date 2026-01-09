/**
 * Connection Config Dialog (Refactored)
 *
 * Features:
 * - IP address and port configuration with validation
 * - Protocol selection (TCP/UDP/WebSocket) via radio buttons - available on all platforms
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

import React, { useCallback, useMemo, useEffect, useState } from 'react';
import { View, Text, StyleSheet, Platform, TouchableOpacity } from 'react-native';
import { z } from 'zod';
import validator from 'validator';
import { useTheme, ThemeColors } from '../../store/themeStore';
import { useNmeaStore } from '../../store/nmeaStore';
import { UniversalIcon } from '../atoms/UniversalIcon';
import { BaseConfigDialog } from './base/BaseConfigDialog';
import { PlatformTextInput } from './inputs/PlatformTextInput';
import { PlatformRadioButton } from './inputs/PlatformRadioButton';
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
 *
 * **Component Behavior:**
 * - IP validation (protocol-aware):
 *   - TCP/WebSocket: Unicast IPv4/IPv6 or DNS hostnames
 *   - UDP: Multicast IPv4 (224-239.x.x.x) or IPv6 (ff::/8) only
 * - Port validation: 1-65535 range, integer only
 * - Protocol selection: TCP (mobile), UDP (mobile), or WebSocket (all platforms)
 * - Default ports: TCP 2000, UDP 10110, WebSocket 8080
 * - Auto-population: Switching protocol loads appropriate host/port defaults
 * - TCP/UDP disabled on web platform (browser security restrictions)
 * - Protocol selection persisted with host/port for app restarts
 * - Auto-saves form changes with 300ms debounce
 * - Shows connection status indicator when connected
 * - Keyboard shortcuts (web only): Cmd/Ctrl+S to connect, Esc to close, Enter to connect
 *
 * **Limitations:**
 * - No DNS resolution validation (accepts any hostname format)
 * - No ping/connectivity test before connect
 * - TCP/UDP unavailable on web (WebSocket required for browser security)
 * - Does not auto-disconnect when changing settings (user must manually disconnect)
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

// IP address validation helpers (using validator.js)

// Localhost variations
const localhostRegex = /^(localhost|127\.0\.0\.1|::1|\[::1\])$/i;

/**
 * Check if IPv4 address is multicast (224.0.0.0 to 239.255.255.255)
 */
const isIPv4Multicast = (ip: string): boolean => {
  if (!validator.isIP(ip, 4)) return false;
  const firstOctet = parseInt(ip.split('.')[0], 10);
  return firstOctet >= 224 && firstOctet <= 239;
};

/**
 * Check if IPv4 address is unicast (not multicast, broadcast, or reserved)
 */
const isIPv4Unicast = (ip: string): boolean => {
  if (!validator.isIP(ip, 4)) return false;
  const parts = ip.split('.').map((p) => parseInt(p, 10));
  const firstOctet = parts[0];
  
  // Multicast range: 224-239
  if (firstOctet >= 224 && firstOctet <= 239) return false;
  
  // Reserved/broadcast: 240-255
  if (firstOctet >= 240) return false;
  
  // Loopback is considered unicast
  if (firstOctet === 127) return true;
  
  // Private/public unicast ranges
  return true;
};

/**
 * Check if IPv6 address is multicast (starts with ff)
 */
const isIPv6Multicast = (ip: string): boolean => {
  if (!validator.isIP(ip, 6)) return false;
  return ip.toLowerCase().startsWith('ff');
};

/**
 * Check if IPv6 address is unicast (not multicast)
 */
const isIPv6Unicast = (ip: string): boolean => {
  if (!validator.isIP(ip, 6)) return false;
  return !ip.toLowerCase().startsWith('ff');
};

// Zod schema with protocol-aware validation
const connectionFormSchema = z
  .object({
    ip: z.string().min(1, 'Host address is required'),
    port: z.string().min(1, 'Port is required'),
    protocol: z.enum(['tcp', 'udp', 'websocket']),
  })
  .superRefine((data, ctx) => {
    const trimmedIp = data.ip.trim().toLowerCase();
    const trimmedPort = data.port.trim();
    const protocol = data.protocol;

    // Validate port using validator.js (trim whitespace first)
    if (!validator.isPort(trimmedPort)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['port'],
        message: 'Port must be a valid number between 1 and 65535',
      });
    }

    // Localhost is always valid
    if (localhostRegex.test(trimmedIp)) {
      return;
    }

    // Check IPv4 FIRST (before DNS hostname check) using validator.js
    // DNS hostname validation can match numeric strings like "239.2.1.1"
    if (validator.isIP(trimmedIp, 4)) {
      if (protocol === 'udp') {
        // UDP requires multicast
        if (!isIPv4Multicast(trimmedIp)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ['ip'],
            message: 'UDP requires IPv4 multicast address (224.0.0.0-239.255.255.255)',
          });
        }
      } else {
        // TCP/WebSocket require unicast
        if (!isIPv4Unicast(trimmedIp)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ['ip'],
            message: 'TCP/WebSocket require unicast address (not multicast or broadcast)',
          });
        }
      }
      return;
    }

    // Check IPv6 using validator.js
    if (validator.isIP(trimmedIp, 6)) {
      if (protocol === 'udp') {
        // UDP requires multicast
        if (!isIPv6Multicast(trimmedIp)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ['ip'],
            message: 'UDP requires IPv6 multicast address (starts with ff)',
          });
        }
      } else {
        // TCP/WebSocket require unicast
        if (!isIPv6Unicast(trimmedIp)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ['ip'],
            message: 'TCP/WebSocket require unicast IPv6 address (not multicast)',
          });
        }
      }
      return;
    }

    // DNS hostnames/FQDNs are valid for TCP/WebSocket only (check AFTER IP validation)
    // Using validator.isFQDN with require_tld: false to allow local hostnames like "raspberrypi"
    if (validator.isFQDN(trimmedIp, { require_tld: false })) {
      if (protocol === 'udp') {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['ip'],
          message: 'UDP requires multicast IP address (e.g., 239.2.1.1), not DNS hostname',
        });
      }
      return;
    }

    // If we reach here, format is invalid
    if (/[a-zA-Z]/.test(trimmedIp) && /\./.test(trimmedIp)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['ip'],
        message: `Invalid hostname: "${trimmedIp}"`,
      });
    } else if (/^\d+\.\d+\.\d+\.\d+/.test(trimmedIp)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['ip'],
        message: `Invalid IPv4 address: "${trimmedIp}"`,
      });
    } else {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['ip'],
        message: 'Must be IPv4, IPv6, or DNS hostname',
      });
    }
  });

type ConnectionFormData = z.infer<typeof connectionFormSchema>;

/**
 * Get default port for protocol
 */
const getDefaultPort = (protocol: 'tcp' | 'udp' | 'websocket'): number => {
  switch (protocol) {
    case 'tcp':
      return 2000; // Industry standard for TCP NMEA
    case 'udp':
      return 10110; // NMEA 0183 multicast standard
    case 'websocket':
      return 8080; // SignalK and modern bridges
    default:
      return 8080;
  }
};

/**
 * Suggest IP address based on protocol
 * Returns immediately with sensible defaults (no async network detection)
 * 
 * UDP: Multicast address
 * TCP/WS: Common NMEA bridge address
 */
const getSuggestedHost = (protocol: 'tcp' | 'udp' | 'websocket'): string => {
  if (protocol === 'udp') {
    return '239.2.1.1'; // NMEA 0183 multicast group
  }

  if (Platform.OS === 'web') {
    return 'localhost';
  }

  // Mobile: Common NMEA bridge address
  // NetInfo detection removed to eliminate async race conditions
  return '192.168.1.100';
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
  const defaults = getConnectionDefaults();
  const connectionStatus = useNmeaStore((state) => state.connectionStatus);
  const nmeaData = useNmeaStore((state) => state.nmeaData);
  const isConnected = connectionStatus === 'connected';
  const isWeb = Platform.OS === 'web';

  // Initialize form data
  const initialFormData: ConnectionFormData = useMemo(
    () => ({
      ip: currentConfig?.ip || defaults.ip,
      port: String(currentConfig?.port || defaults.port),
      protocol: currentConfig?.protocol || defaults.protocol,
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
  const { formData, updateField, updateFields, saveNow, isDirty, errors, validate, clearErrors } =
    useFormState<ConnectionFormData>(initialFormData, {
      onSave: handleSave,
      debounceMs: 300,
      validationSchema: connectionFormSchema,
    });

  // Atomic protocol change handler - updates all fields together to avoid validation race
  const handleProtocolChange = useCallback((newProtocol: 'tcp' | 'udp' | 'websocket') => {
    // Disconnect if currently connected (protocol change requires reconnection)
    if (isConnected && onDisconnect) {
      onDisconnect();
    }
    
    const newHost = getSuggestedHost(newProtocol);
    const newPort = String(getDefaultPort(newProtocol));
    
    // Clear errors immediately to prevent stale validation messages
    clearErrors();
    
    // Atomic update: all fields change together before validation runs
    updateFields({
      protocol: newProtocol,
      ip: newHost,
      port: newPort
    });
  }, [updateFields, clearErrors, isConnected, onDisconnect]);

  // Handle connect button
  const handleConnect = useCallback(() => {
    // Flush any pending debounced changes first
    saveNow();
    
    const isValid = validate();
    if (isValid) {
      const config = {
        ip: formData.ip.trim(),
        port: parseInt(formData.port.trim(), 10),
        protocol: formData.protocol,
      };

      onConnect(config);
      // Don't close dialog - let user see connection status update
    }
  }, [formData, onConnect, validate, saveNow]);

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
    // Disconnect first if connected
    if (isConnected && onDisconnect) {
      onDisconnect();
    }
    // Clear validation errors
    clearErrors();
    // Then load platform-specific defaults
    updateField('ip', defaults.ip);
    updateField('port', String(defaults.port));
    updateField('protocol', defaults.protocol);
  }, [updateField, defaults, isConnected, onDisconnect, clearErrors]);

  // Keyboard shortcuts (memoized to prevent excessive listener churn)
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
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
    // Enter to submit (only if no validation errors)
    if (e.key === 'Enter' && (!errors || Object.keys(errors).length === 0)) {
      e.preventDefault();
      handleConnect();
    }
  }, [handleConnect, handleClose, errors]);

  useEffect(() => {
    if (!visible || Platform.OS !== 'web') return;

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [visible, handleKeyDown]);

  // Check if connect button is enabled (validation-based with optional override)
  const isConnectEnabled = useMemo(() => {
    const hasNoErrors = !errors || Object.keys(errors).length === 0;
    
    // Allow optional external validation override
    if (shouldEnableConnectButton) {
      const portNum = parseInt(formData.port.trim(), 10);
      const config = {
        ip: formData.ip.trim(),
        port: isNaN(portNum) ? 0 : portNum, // Convert to number, fallback to 0 if invalid
        protocol: formData.protocol,
      };
      return hasNoErrors && shouldEnableConnectButton(config);
    }
    
    return hasNoErrors;
  }, [errors, formData, shouldEnableConnectButton]);

  return (
    <BaseConfigDialog
      visible={visible}
      title="Connection"
      onClose={handleClose}
      actionButton={{
        label: isConnected ? 'Disconnect' : 'Connect',
        onPress: isConnected ? handleDisconnect : handleConnect,
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
          <Text style={styles.sectionTitle}>Host (IP address or DNS name)</Text>
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
        </View>

        {/* Port */}
        <View style={styles.field}>
          <Text style={styles.sectionTitle}>Port</Text>
          <PlatformTextInput
            value={formData.port}
            onChangeText={(text) => {
              // Keep as string, validation handles it
              // Only allow numeric characters (validator.js will validate range)
              updateField('port', text);
            }}
            placeholder="8080"
            keyboardType="numeric"
            error={errors?.port}
            testID="connection-port-input"
          />
        </View>

        {/* Protocol Selection */}
        <View style={styles.field}>
          <Text style={styles.sectionTitle}>Protocol</Text>
          <View style={styles.radioGroup}>
            <PlatformRadioButton
              label="TCP"
              selected={formData.protocol === 'tcp'}
              onPress={() => handleProtocolChange('tcp')}
              disabled={isWeb}
              testID="connection-protocol-tcp"
            />
            <PlatformRadioButton
              label="UDP"
              selected={formData.protocol === 'udp'}
              onPress={() => handleProtocolChange('udp')}
              disabled={isWeb}
              testID="connection-protocol-udp"
            />
            <PlatformRadioButton
              label="WS"
              selected={formData.protocol === 'websocket'}
              onPress={() => handleProtocolChange('websocket')}
              testID="connection-protocol-websocket"
            />
          </View>
        </View>
      </View>

      {/* Reset to Defaults - subtle text button */}
      <TouchableOpacity
        style={styles.resetButton}
        onPress={handleReset}
        testID="connection-reset-button"
      >
        <UniversalIcon name="refresh-outline" size={18} color={theme.interactive} />
        <Text style={[styles.resetButtonText, { color: theme.interactive }]}>Reset to Defaults</Text>
      </TouchableOpacity>

      {/* Troubleshooting Info - only show when connected */}
      {isConnected && (
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Connection Details</Text>
          <View style={styles.statsGrid}>
            <View style={styles.statRow}>
              <Text style={[styles.statLabel, { color: theme.textSecondary }]}>Mode</Text>
              <Text style={[styles.statValue, { color: theme.text }]}>
                {nmeaData.messageFormat || '-'}
              </Text>
            </View>
            <View style={styles.statRow}>
              <Text style={[styles.statLabel, { color: theme.textSecondary }]}>Messages</Text>
              <Text style={[styles.statValue, { color: theme.text }]}>
                {nmeaData.messageCount.toLocaleString()}
              </Text>
            </View>
          </View>
        </View>
      )}
    </BaseConfigDialog>
  );
};

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
      marginBottom: 16,
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
    radioGroup: {
      flexDirection: 'row',
      gap: 8,
      marginBottom: 4,
    },
    resetButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 12,
      marginVertical: 8,
      gap: 6,
    },
    resetButtonText: {
      fontSize: 14,
      fontWeight: '500',
      fontFamily: platformTokens.typography.fontFamily,
    },
  });

export default ConnectionConfigDialog;
