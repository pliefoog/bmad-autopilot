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
const ipv4Regex = /^((25[0-5]|(2[0-4]|1\d|[1-9]|)\d)\.?\b){4}$/;

// Zod schema for connection form
const connectionFormSchema = z.object({
  ip: z
    .string()
    .min(1, 'IP address is required')
    .regex(ipv4Regex, 'Invalid IP address format')
    .or(z.string().regex(/^[a-zA-Z0-9][a-zA-Z0-9-_.]+[a-zA-Z0-9]$/, 'Invalid DNS name')),
  port: z
    .number()
    .int('Port must be an integer')
    .min(1, 'Port must be at least 1')
    .max(65535, 'Port must be at most 65535'),
  useTcp: z.boolean(),
});

type ConnectionFormData = z.infer<typeof connectionFormSchema>;

export const ConnectionConfigDialog: React.FC<ConnectionConfigDialogProps> = ({
  visible,
  onClose,
  onConnect,
  currentConfig,
  shouldEnableConnectButton,
}) => {
  const theme = useTheme();
  const platformTokens = getPlatformTokens();
  const styles = useMemo(() => createStyles(theme, platformTokens), [theme, platformTokens]);
  const defaults = getConnectionDefaults();
  const connectionStatus = useNmeaStore((state) => state.connectionStatus);
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

  // Save handler
  const handleSave = useCallback(
    async (data: ConnectionFormData) => {
      const config = {
        ip: data.ip.trim(),
        port: data.port,
        protocol: isWeb
          ? 'websocket'
          : ((data.useTcp ? 'tcp' : 'udp') as 'tcp' | 'udp' | 'websocket'),
      };

      onConnect(config);
    },
    [onConnect, isWeb],
  );

  // Form state management
  const { formData, updateField, saveNow, isDirty, errors, validate } =
    useFormState<ConnectionFormData>(initialFormData, {
      onSave: handleSave,
      debounceMs: 300,
      validationSchema: connectionFormSchema,
    });

  // Handle connect button
  const handleConnect = useCallback(() => {
    const isValid = validate();
    if (isValid) {
      const config = {
        ip: formData.ip.trim(),
        port: formData.port,
        protocol: isWeb
          ? 'websocket'
          : ((formData.useTcp ? 'tcp' : 'udp') as 'tcp' | 'udp' | 'websocket'),
      };

      // Check custom validation if provided
      if (shouldEnableConnectButton && !shouldEnableConnectButton(config)) {
        return;
      }

      onConnect(config);
      onClose();
    }
  }, [formData, isWeb, onConnect, onClose, shouldEnableConnectButton, validate]);

  // Handle close
  const handleClose = useCallback(() => {
    saveNow();
    onClose();
  }, [saveNow, onClose]);

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

  // Check if connect button is enabled
  const isConnectEnabled = useMemo(() => {
    if (errors && Object.keys(errors).length > 0) return false;

    const config = {
      ip: formData.ip.trim(),
      port: formData.port,
      protocol: isWeb
        ? 'websocket'
        : ((formData.useTcp ? 'tcp' : 'udp') as 'tcp' | 'udp' | 'websocket'),
    };

    if (shouldEnableConnectButton) {
      return shouldEnableConnectButton(config);
    }

    return true;
  }, [formData, isWeb, shouldEnableConnectButton, errors]);

  return (
    <BaseConfigDialog
      visible={visible}
      title="Connection Settings"
      onClose={handleClose}
      actionButton={{
        label: 'Connect',
        onPress: handleConnect,
        disabled: !isConnectEnabled,
        testID: 'connection-connect-button',
      }}
      testID="connection-config-dialog"
    >
      {/* Section Header */}
      <Text style={[styles.sectionTitle, { color: theme.text }]}>NMEA Bridge Details</Text>
      <Text style={[styles.sectionSubtitle, { color: theme.textSecondary }]}>
        Configure your NMEA data source
      </Text>

      {/* IP Address */}
      <View style={styles.field}>
        <Text style={[styles.label, { color: theme.text }]}>Host (IP or DNS name)</Text>
        <PlatformTextInput
          value={formData.ip}
          onChangeText={(text) => updateField('ip', text)}
          placeholder="e.g. 192.168.1.100 or bridge.local"
          keyboardType="default"
          error={errors?.ip}
          testID="connection-ip-input"
        />
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
            }
          }}
          placeholder="8080"
          keyboardType="numeric"
          error={errors?.port}
          testID="connection-port-input"
        />
      </View>

      {/* Protocol Selection (hidden on web) */}
      {!isWeb && (
        <>
          <Text style={[styles.sectionTitle, { color: theme.text, marginTop: 24 }]}>Protocol</Text>
          <Text style={[styles.sectionSubtitle, { color: theme.textSecondary }]}>
            Select TCP or UDP
          </Text>

          <View style={styles.field}>
            <PlatformToggle
              label={formData.useTcp ? 'TCP' : 'UDP'}
              value={formData.useTcp}
              onValueChange={(value) => updateField('useTcp', value)}
              testID="connection-protocol-toggle"
            />
            <Text style={[styles.hint, { color: theme.textSecondary }]}>
              {formData.useTcp
                ? 'TCP provides reliable, ordered delivery of data'
                : 'UDP provides faster, connectionless delivery'}
            </Text>
          </View>
        </>
      )}

      {/* Web Protocol Notice */}
      {isWeb && (
        <View
          style={[styles.infoBox, { backgroundColor: theme.surface, borderColor: theme.border }]}
        >
          <Text style={[styles.infoText, { color: theme.textSecondary }]}>
            ℹ️ Web version uses WebSocket protocol automatically
          </Text>
        </View>
      )}

      {/* Connection Status */}
      {isConnected && (
        <View
          style={[
            styles.statusBox,
            { backgroundColor: `${theme.success}15`, borderColor: theme.success },
          ]}
        >
          <UniversalIcon name="checkmark-circle" size={20} color={theme.success} />
          <Text style={[styles.statusText, { color: theme.success }]}>Connected</Text>
        </View>
      )}

      {/* Reset to Defaults */}
      <TouchableOpacity
        style={[styles.resetButton, { borderColor: theme.border }]}
        onPress={handleReset}
        testID="connection-reset-button"
      >
        <UniversalIcon name="refresh-outline" size={20} color={theme.text} />
        <Text style={[styles.resetButtonText, { color: theme.text }]}>Reset to Defaults</Text>
      </TouchableOpacity>

      {/* Keyboard Hints */}
      {Platform.OS === 'web' && (
        <Text style={[styles.keyboardHint, { color: theme.textSecondary }]}>
          Keyboard shortcuts: ⌘S (Mac) or Ctrl+S (Windows) to connect, Esc to cancel
        </Text>
      )}
    </BaseConfigDialog>
  );
};

const createStyles = (theme: ThemeColors, platformTokens: ReturnType<typeof getPlatformTokens>) =>
  StyleSheet.create({
    sectionTitle: {
      fontSize: 18,
      fontWeight: '600',
      fontFamily: platformTokens.typography.fontFamily,
      marginBottom: 8,
      marginTop: 20,
    },
    sectionSubtitle: {
      fontSize: platformTokens.typography.body.fontSize,
      fontFamily: platformTokens.typography.fontFamily,
      marginBottom: 16,
      lineHeight: platformTokens.typography.body.lineHeight,
    },
    field: {
      marginBottom: 20,
    },
    label: {
      fontSize: platformTokens.typography.body.fontSize,
      fontWeight: '600',
      fontFamily: platformTokens.typography.fontFamily,
      marginBottom: 8,
    },
    hint: {
      fontSize: platformTokens.typography.caption.fontSize,
      fontFamily: platformTokens.typography.fontFamily,
      marginTop: 8,
      lineHeight: platformTokens.typography.caption.lineHeight,
    },
    infoBox: {
      padding: 16,
      borderRadius: 8,
      borderWidth: 1,
      marginBottom: 20,
    },
    infoText: {
      fontSize: platformTokens.typography.body.fontSize,
      fontFamily: platformTokens.typography.fontFamily,
      textAlign: 'center',
      lineHeight: platformTokens.typography.body.lineHeight,
    },
    statusBox: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 12,
      borderRadius: 8,
      borderWidth: 1,
      marginBottom: 16,
      gap: 8,
    },
    statusText: {
      fontSize: 15,
      fontWeight: '600',
      fontFamily: platformTokens.typography.fontFamily,
    },
    resetButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 14,
      borderRadius: 8,
      borderWidth: 1,
      marginVertical: 16,
      gap: 8,
    },
    resetButtonText: {
      fontSize: 15,
      fontWeight: '500',
      fontFamily: platformTokens.typography.fontFamily,
    },
    keyboardHint: {
      fontSize: platformTokens.typography.caption.fontSize,
      fontFamily: platformTokens.typography.fontFamily,
      textAlign: 'center',
      marginTop: 8,
      fontStyle: 'italic',
      opacity: 0.7,
    },
  });

export default ConnectionConfigDialog;
