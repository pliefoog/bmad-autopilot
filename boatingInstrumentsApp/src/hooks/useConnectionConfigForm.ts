/**
 * useConnectionConfigForm - React Hook Form Integration for Connection Configuration
 *
 * Purpose: Encapsulate connection form state, validation, and protocol-aware IP logic
 * Pattern: RHF with onSubmit validation mode for explicit connect/disconnect
 * Architecture: Single source of truth for connection settings, memoized computed values
 * Maritime context: Platform-aware defaults, NMEA multicast support (UDP)
 *
 * Validation:
 * - IP validation with protocol-aware logic (unicast vs multicast)
 * - IPv4/IPv6 support with validator.js
 * - DNS hostname support (TCP/WebSocket only)
 * - Port range validation (1-65535)
 * - Default ports: TCP 2000, UDP 10110, WebSocket 8080
 * - Platform-specific defaults: Web (localhost), Mobile (192.168.1.100 or 239.2.1.1 for UDP)
 *
 * Handlers:
 * - handleProtocolChange: Atomic update with disconnect on protocol change
 * - handleConnect: Validate and trigger connection callback
 * - handleReset: Reset to platform-specific defaults
 */

import { useCallback, useMemo } from 'react';
import { useForm, UseFormReturn } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Platform } from 'react-native';
import validator from 'validator';

/**
 * IP validation helper functions
 */

const localhostRegex = /^(localhost|127\.0\.0\.1|::1|\[::1\])$/i;

const isIPv4Multicast = (ip: string): boolean => {
  if (!validator.isIP(ip, 4)) return false;
  const firstOctet = parseInt(ip.split('.')[0], 10);
  return firstOctet >= 224 && firstOctet <= 239;
};

const isIPv4Unicast = (ip: string): boolean => {
  if (!validator.isIP(ip, 4)) return false;
  const parts = ip.split('.').map((p) => parseInt(p, 10));
  const firstOctet = parts[0];

  if (firstOctet >= 224 && firstOctet <= 239) return false;
  if (firstOctet >= 240) return false;
  if (firstOctet === 127) return true;

  return true;
};

const isIPv6Multicast = (ip: string): boolean => {
  if (!validator.isIP(ip, 6)) return false;
  return ip.toLowerCase().startsWith('ff');
};

const isIPv6Unicast = (ip: string): boolean => {
  if (!validator.isIP(ip, 6)) return false;
  return !ip.toLowerCase().startsWith('ff');
};

/**
 * Form data structure
 */
interface ConnectionFormData {
  ip: string;
  port: string;
  protocol: 'tcp' | 'udp' | 'websocket';
}

/**
 * Create Zod schema with protocol-aware IP validation
 */
const createConnectionFormSchema = () =>
  z
    .object({
      ip: z.string().min(1, 'Host address is required'),
      port: z.string().min(1, 'Port is required'),
      protocol: z.enum(['tcp', 'udp', 'websocket']),
    })
    .superRefine((data, ctx) => {
      const trimmedIp = data.ip.trim().toLowerCase();
      const trimmedPort = data.port.trim();
      const protocol = data.protocol;

      // Validate port
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

      // Check IPv4 first
      if (validator.isIP(trimmedIp, 4)) {
        if (protocol === 'udp') {
          if (!isIPv4Multicast(trimmedIp)) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              path: ['ip'],
              message: 'UDP requires IPv4 multicast address (224.0.0.0-239.255.255.255)',
            });
          }
        } else {
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

      // Check IPv6
      if (validator.isIP(trimmedIp, 6)) {
        if (protocol === 'udp') {
          if (!isIPv6Multicast(trimmedIp)) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              path: ['ip'],
              message: 'UDP requires IPv6 multicast address (starts with ff)',
            });
          }
        } else {
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

      // Check DNS hostnames (TCP/WebSocket only)
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

      // Invalid format
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

/**
 * Helper functions for defaults
 */
const getDefaultPort = (protocol: 'tcp' | 'udp' | 'websocket'): number => {
  switch (protocol) {
    case 'tcp':
      return 2000;
    case 'udp':
      return 10110;
    case 'websocket':
      return 8080;
    default:
      return 8080;
  }
};

const getSuggestedHost = (protocol: 'tcp' | 'udp' | 'websocket'): string => {
  if (protocol === 'udp') {
    return '239.2.1.1';
  }

  if (Platform.OS === 'web') {
    return 'localhost';
  }

  return '192.168.1.100';
};

/**
 * useConnectionConfigForm - NMEA connection configuration with React Hook Form
 *
 * Manages NMEA network connection settings with protocol-aware validation and platform-specific defaults.
 * Supports TCP (direct boat network), UDP (multicast discovery), and WebSocket (simulator/bridge).
 *
 * @param initialConfig - Current connection settings from store
 *   - ip: Host address (IPv4, IPv6, hostname, or localhost)
 *   - port: Port number (1-65535)
 *   - protocol: 'tcp' | 'udp' | 'websocket'
 *
 * @param onConnect - Callback invoked when form is submitted with validated config
 *   - Only called if form validates successfully
 *   - Receives sanitized config object with numeric port
 *
 * @param onDisconnect - Optional callback for protocol changes while connected
 *   - Called before protocol switch to allow graceful disconnection
 *   - Prevents connection state corruption
 *
 * @returns Object containing:
 *   - form: RHF UseFormReturn with connection form state
 *   - handlers: { handleProtocolChange, handleConnect, handleReset }
 *   - computed: { isConnectEnabled, suggestedPort }
 *
 * @validation
 * Protocol-aware IP validation:
 * - TCP: Unicast IPv4/IPv6 or hostname (no multicast)
 * - UDP: Multicast IPv4 (224-239.x.x.x) or unicast (fallback)
 * - WebSocket: Any valid address including localhost
 *
 * Default ports:
 * - TCP: 2000 (NMEA 0183 over TCP)
 * - UDP: 10110 (NMEA multicast standard 239.2.1.1:10110)
 * - WebSocket: 8080 (nmea-bridge simulator)
 *
 * @platform
 * - Web: Defaults to localhost (simulator testing)
 * - iOS/Android: Defaults to 192.168.1.100 (boat WiFi network)
 * - UDP multicast: 239.2.1.1 (NMEA 2000 gateway standard)
 *
 * @example
 * ```tsx
 * const { form, handlers, computed } = useConnectionConfigForm(
 *   currentConfig,
 *   (config) => connectToNMEA(config),
 *   () => disconnectFromNMEA()
 * );
 *
 * // User changes protocol
 * handlers.handleProtocolChange('udp'); // Auto-updates port to 10110
 *
 * // User submits form
 * handlers.handleConnect(); // Validates, then calls onConnect
 * ```
 *
 * @maritime
 * - Multicast UDP for automatic NMEA 2000 gateway discovery
 * - TCP for direct wired connections (RS-422/RS-232 adapters)
 * - WebSocket for shore-based testing and simulation
 */
export interface UseConnectionConfigFormReturn {
  form: UseFormReturn<ConnectionFormData>;
  handlers: {
    handleProtocolChange: (protocol: 'tcp' | 'udp' | 'websocket') => void;
    handleConnect: () => void;
    handleReset: () => void;
  };
  computed: {
    isConnectEnabled: boolean;
    suggestedPort: number;
  };
}

export const useConnectionConfigForm = (
  initialConfig: { ip: string; port: number; protocol: 'tcp' | 'udp' | 'websocket' } | undefined,
  onConnect: (config: {
    ip: string;
    port: number;
    protocol: 'tcp' | 'udp' | 'websocket';
  }) => void,
  onDisconnect?: () => void,
): UseConnectionConfigFormReturn => {
  const formSchema = useMemo(() => createConnectionFormSchema(), []);

  const form = useForm<ConnectionFormData>({
    mode: 'onSubmit',
    resolver: zodResolver(formSchema),
    defaultValues: {
      ip: initialConfig?.ip ?? 'localhost',
      port: String(initialConfig?.port ?? 8080),
      protocol: initialConfig?.protocol ?? 'websocket',
    },
  });

  // Suggested port based on current protocol
  const suggestedPort = useMemo(
    () => getDefaultPort(form.watch('protocol')),
    [form],
  );

  // Check if connect button should be enabled
  const isConnectEnabled = useMemo(() => {
    return Object.keys(form.formState.errors).length === 0;
  }, [form.formState.errors]);

  // Handle protocol change - atomic update with defaults
  const handleProtocolChange = useCallback(
    (protocol: 'tcp' | 'udp' | 'websocket') => {
      if (onDisconnect) {
        onDisconnect();
      }

      const newHost = getSuggestedHost(protocol);
      const newPort = String(getDefaultPort(protocol));

      form.setValue('protocol', protocol);
      form.setValue('ip', newHost);
      form.setValue('port', newPort);
      form.clearErrors();
    },
    [form, onDisconnect],
  );

  // Handle connect - validate and call callback
  const handleConnect = useCallback(() => {
    form.handleSubmit(async (data) => {
      const config = {
        ip: data.ip.trim(),
        port: parseInt(data.port.trim(), 10),
        protocol: data.protocol,
      };

      onConnect(config);
    })();
  }, [form, onConnect]);

  // Handle reset to defaults
  const handleReset = useCallback(() => {
    if (onDisconnect) {
      onDisconnect();
    }

    const defaultProtocol = initialConfig?.protocol ?? 'websocket';
    const defaultIp = getSuggestedHost(defaultProtocol);
    const defaultPort = String(getDefaultPort(defaultProtocol));

    form.setValue('ip', defaultIp);
    form.setValue('port', defaultPort);
    form.setValue('protocol', defaultProtocol);
    form.clearErrors();
  }, [form, initialConfig, onDisconnect]);

  return {
    form,
    handlers: {
      handleProtocolChange,
      handleConnect,
      handleReset,
    },
    computed: {
      isConnectEnabled,
      suggestedPort,
    },
  };
};
