// useNMEAData Hook
// Custom hook for NMEA data access with quality monitoring and field filtering

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNmeaStore } from '../store/nmeaStore';
import type { NmeaData } from '../store/nmeaStore';

export interface UseNMEADataOptions {
  // Field filtering
  fields?: string[];

  // Data quality monitoring
  enableQualityMonitoring?: boolean;
  staleDataThreshold?: number; // milliseconds
  qualityUpdateInterval?: number; // milliseconds

  // Real-time updates
  enableRealTimeUpdates?: boolean;
  updateThrottle?: number; // milliseconds

  // Callbacks
  onDataUpdate?: (data: Partial<NmeaData>) => void;
  onQualityChange?: (quality: DataQuality) => void;
  onError?: (error: string) => void;

  // Performance
  memoizeData?: boolean;
  enableDeepComparison?: boolean;
}

export type DataQuality = 'excellent' | 'good' | 'fair' | 'poor' | 'critical' | 'unknown';

export interface QualityMetrics {
  accuracy: number; // 0-100
  completeness: number; // 0-100
  timeliness: number; // 0-100
  consistency: number; // 0-100
  overall: number; // 0-100
}

export interface UseNMEADataReturn {
  // Core data
  data: Partial<NmeaData>;
  hasData: boolean;
  isReceiving: boolean;
  isValid: boolean;

  // Data quality
  quality: DataQuality;
  qualityMetrics: QualityMetrics;
  isStale: boolean;

  // Timestamps and status
  lastUpdate: number | null;
  lastReceived: number | null;
  dataAge: number | null; // milliseconds since last update

  // Connection status
  connectionStatus: string;
  isConnected: boolean;

  // Error handling
  error: string | null;
  hasErrors: boolean;

  // Control functions
  refresh: () => void;
  clearError: () => void;
  resetQualityMetrics: () => void;
}

const DEFAULT_OPTIONS: Required<UseNMEADataOptions> = {
  fields: [],
  enableQualityMonitoring: true,
  staleDataThreshold: 5000, // 5 seconds
  qualityUpdateInterval: 1000, // 1 second
  enableRealTimeUpdates: true,
  updateThrottle: 100, // 100ms
  onDataUpdate: () => {},
  onQualityChange: () => {},
  onError: () => {},
  memoizeData: true,
  enableDeepComparison: false,
};

export function useNMEAData(options: UseNMEADataOptions = {}): UseNMEADataReturn {
  const opts = useMemo(() => ({ ...DEFAULT_OPTIONS, ...options }), [options]);

  // State management
  const [lastUpdate, setLastUpdate] = useState<number | null>(null);
  const [lastReceived, setLastReceived] = useState<number | null>(null);
  const [quality, setQuality] = useState<DataQuality>('unknown');
  const [qualityMetrics, setQualityMetrics] = useState<QualityMetrics>({
    accuracy: 0,
    completeness: 0,
    timeliness: 0,
    consistency: 0,
    overall: 0,
  });
  const [error, setError] = useState<string | null>(null);

  // Zustand store subscriptions
  const { nmeaData, connectionStatus, lastError } = useNmeaStore();

  // Filter data by specified fields
  const filteredData = useMemo(() => {
    if (!opts.fields.length) return nmeaData;

    const filtered: Partial<NmeaData> = {};
    opts.fields.forEach((field) => {
      if (field in nmeaData && nmeaData[field as keyof NmeaData] !== undefined) {
        (filtered as any)[field] = nmeaData[field as keyof NmeaData];
      }
    });
    return filtered;
  }, [nmeaData, opts.fields]);

  // Data validation and quality assessment
  const assessDataQuality = useCallback(
    (data: Partial<NmeaData>): { quality: DataQuality; metrics: QualityMetrics } => {
      const now = Date.now();
      const dataKeys = Object.keys(data);
      const nonNullValues = dataKeys.filter((key) => data[key as keyof NmeaData] != null);

      // Calculate metrics
      const completeness = dataKeys.length > 0 ? (nonNullValues.length / dataKeys.length) * 100 : 0;
      const timeliness = lastUpdate
        ? Math.max(0, 100 - ((now - lastUpdate) / opts.staleDataThreshold) * 100)
        : 0;

      // Simulate accuracy based on GPS quality and data consistency
      const gpsQuality = data.gpsQuality;
      let accuracy = 50; // Base accuracy
      if (gpsQuality) {
        if (gpsQuality.fixType === 2) accuracy += 30; // DGPS
        if (gpsQuality.satellites && gpsQuality.satellites > 6) accuracy += 20;
        if (gpsQuality.hdop && gpsQuality.hdop < 2) accuracy += 10;
      }
      accuracy = Math.min(100, accuracy);

      // Consistency based on data relationships
      let consistency = 80; // Base consistency
      if (data.speed !== undefined && data.sog !== undefined) {
        const speedDiff = Math.abs((data.speed || 0) - (data.sog || 0));
        consistency -= Math.min(30, speedDiff * 5); // Penalize large differences
      }
      consistency = Math.max(0, consistency);

      const overall = (accuracy + completeness + timeliness + consistency) / 4;

      const metrics: QualityMetrics = {
        accuracy,
        completeness,
        timeliness,
        consistency,
        overall,
      };

      // Determine quality level
      let qualityLevel: DataQuality;
      if (overall >= 90) qualityLevel = 'excellent';
      else if (overall >= 75) qualityLevel = 'good';
      else if (overall >= 60) qualityLevel = 'fair';
      else if (overall >= 40) qualityLevel = 'poor';
      else if (overall > 0) qualityLevel = 'critical';
      else qualityLevel = 'unknown';

      return { quality: qualityLevel, metrics };
    },
    [lastUpdate, opts.staleDataThreshold],
  );

  // Update quality metrics periodically
  useEffect(() => {
    if (!opts.enableQualityMonitoring) return;

    const interval = setInterval(() => {
      const { quality: newQuality, metrics: newMetrics } = assessDataQuality(filteredData);

      if (newQuality !== quality) {
        setQuality(newQuality);
        opts.onQualityChange(newQuality);
      }

      setQualityMetrics(newMetrics);
    }, opts.qualityUpdateInterval);

    return () => clearInterval(interval);
  }, [filteredData, quality, assessDataQuality, opts]);

  // Track data updates
  useEffect(() => {
    const now = Date.now();
    const hasNewData = Object.keys(filteredData).some(
      (key) => filteredData[key as keyof NmeaData] != null,
    );

    if (hasNewData) {
      setLastUpdate(now);
      if (connectionStatus === 'connected') {
        setLastReceived(now);
      }
      opts.onDataUpdate(filteredData);
    }
  }, [filteredData, connectionStatus, opts]);

  // Handle errors
  useEffect(() => {
    if (lastError && lastError !== error) {
      setError(lastError);
      opts.onError(lastError);
    }
  }, [lastError, error, opts]);

  // Computed values
  const hasData = useMemo(() => {
    return Object.keys(filteredData).some((key) => filteredData[key as keyof NmeaData] != null);
  }, [filteredData]);

  const isReceiving = useMemo(() => {
    return connectionStatus === 'connected' && hasData;
  }, [connectionStatus, hasData]);

  const isConnected = useMemo(() => {
    return connectionStatus === 'connected';
  }, [connectionStatus]);

  const isStale = useMemo(() => {
    if (!lastUpdate) return true;
    return Date.now() - lastUpdate > opts.staleDataThreshold;
  }, [lastUpdate, opts.staleDataThreshold]);

  const dataAge = useMemo(() => {
    return lastUpdate ? Date.now() - lastUpdate : null;
  }, [lastUpdate]);

  const isValid = useMemo(() => {
    return hasData && !isStale && isConnected && !error;
  }, [hasData, isStale, isConnected, error]);

  // Control functions
  const refresh = useCallback(() => {
    setLastUpdate(Date.now());
    setError(null);
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const resetQualityMetrics = useCallback(() => {
    setQuality('unknown');
    setQualityMetrics({
      accuracy: 0,
      completeness: 0,
      timeliness: 0,
      consistency: 0,
      overall: 0,
    });
  }, []);

  return {
    // Core data
    data: opts.memoizeData ? filteredData : { ...filteredData },
    hasData,
    isReceiving,
    isValid,

    // Data quality
    quality,
    qualityMetrics,
    isStale,

    // Timestamps and status
    lastUpdate,
    lastReceived,
    dataAge,

    // Connection status
    connectionStatus,
    isConnected,

    // Error handling
    error,
    hasErrors: !!error,

    // Control functions
    refresh,
    clearError,
    resetQualityMetrics,
  };
}
