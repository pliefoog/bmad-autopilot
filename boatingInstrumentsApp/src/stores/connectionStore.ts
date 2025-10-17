import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'no-data' | 'error' | 'reconnecting';

export interface ConnectionConfig {
  ip: string;
  port: number;
  protocol: 'tcp' | 'udp' | 'websocket';
  autoConnect: boolean;
  reconnectInterval: number;
  maxReconnectAttempts: number;
}

export interface ConnectionMetrics {
  connectedAt?: number;
  disconnectedAt?: number;
  bytesReceived: number;
  packetsReceived: number;
  packetsDropped: number;
  reconnectAttempts: number;
  lastErrorTime?: number;
  averageLatency?: number;
}

interface ConnectionState {
  status: ConnectionStatus;
  config: ConnectionConfig;
  metrics: ConnectionMetrics;
  lastError?: string;
  isAutoConnecting: boolean;
  debugMode: boolean;
}

interface ConnectionActions {
  setStatus: (status: ConnectionStatus) => void;
  setConfig: (config: Partial<ConnectionConfig>) => void;
  setLastError: (error?: string) => void;
  setAutoConnecting: (auto: boolean) => void;
  setDebugMode: (enabled: boolean) => void;
  updateMetrics: (metrics: Partial<ConnectionMetrics>) => void;
  incrementPacketsReceived: () => void;
  incrementPacketsDropped: () => void;
  incrementReconnectAttempts: () => void;
  resetMetrics: () => void;
  reset: () => void;
}

type ConnectionStore = ConnectionState & ConnectionActions;

const defaultConfig: ConnectionConfig = {
  ip: '10.0.0.1',
  port: 2000,
  protocol: 'tcp',
  autoConnect: true,
  reconnectInterval: 5000,
  maxReconnectAttempts: 10,
};

const defaultMetrics: ConnectionMetrics = {
  bytesReceived: 0,
  packetsReceived: 0,
  packetsDropped: 0,
  reconnectAttempts: 0,
};

export const useConnectionStore = create<ConnectionStore>()(
  persist(
    (set, get) => ({
      // State
      status: 'disconnected',
      config: defaultConfig,
      metrics: defaultMetrics,
      lastError: undefined,
      isAutoConnecting: false,
      debugMode: false,

      // Actions
      setStatus: (status) => {
        const now = Date.now();
        set((state) => ({
          status,
          metrics: {
            ...state.metrics,
            ...(status === 'connected' && { connectedAt: now }),
            ...(status === 'disconnected' && { disconnectedAt: now }),
          },
        }));
      },

      setConfig: (newConfig) =>
        set((state) => ({
          config: { ...state.config, ...newConfig },
        })),

      setLastError: (error) => {
        const now = Date.now();
        set((state) => ({
          lastError: error,
          metrics: error
            ? { ...state.metrics, lastErrorTime: now }
            : state.metrics,
        }));
      },

      setAutoConnecting: (auto) =>
        set({ isAutoConnecting: auto }),

      setDebugMode: (enabled) =>
        set({ debugMode: enabled }),

      updateMetrics: (newMetrics) =>
        set((state) => ({
          metrics: { ...state.metrics, ...newMetrics },
        })),

      incrementPacketsReceived: () =>
        set((state) => ({
          metrics: {
            ...state.metrics,
            packetsReceived: state.metrics.packetsReceived + 1,
          },
        })),

      incrementPacketsDropped: () =>
        set((state) => ({
          metrics: {
            ...state.metrics,
            packetsDropped: state.metrics.packetsDropped + 1,
          },
        })),

      incrementReconnectAttempts: () =>
        set((state) => ({
          metrics: {
            ...state.metrics,
            reconnectAttempts: state.metrics.reconnectAttempts + 1,
          },
        })),

      resetMetrics: () =>
        set({ metrics: defaultMetrics }),

      reset: () =>
        set({
          status: 'disconnected',
          metrics: defaultMetrics,
          lastError: undefined,
          isAutoConnecting: false,
        }),
    }),
    {
      name: 'connection-store',
      partialize: (state) => ({
        config: state.config,
        debugMode: state.debugMode,
      }),
    }
  )
);