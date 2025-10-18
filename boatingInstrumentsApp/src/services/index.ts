// Service Layer Architecture - Domain-Separated Services
// Centralized exports for all service domains with clean separation of concerns

// Service Registry
export * from './registry';

// Domain-specific service exports
export * as NmeaServices from './nmea';
export * as ConnectionServices from './connection';
export * as AutopilotServices from './autopilot';
export * as PlaybackServices from './playback';
export * as StorageServices from './storage';
export * as UIServices from './ui';

// Legacy service exports (for backward compatibility during migration)
// These will be gradually removed as components migrate to domain-specific imports
export * from './autopilotService';
export * from './autopilotSafetyManager';
export * from './autopilotRetryManager';
export * from './autopilotErrorManager';
export * from './autopilotCommandQueue';
export * from './autopilotMonitoringService';
export * from './gracefulDegradationService';
export * from './autopilotReconnectionService';
export * from './nmeaConnection';
export * from './layoutService';
export * from './playbackService';
export * from './globalConnectionService';
export * from './connectionDefaults';
export * from './webNmeaInit';
export * from './mockServer';
export * from './stressTestService';

// Service initialization with registry
export const initServices = async () => {
  const { serviceRegistry } = await import('./registry');
  await serviceRegistry.initialize();
  console.log('Domain-separated services initialized with service registry');
  console.log('Available domains: NMEA, Connection, Autopilot, Playback, Storage, UI');
  return 'Services initialized with registry';
};

// Service domain utilities
export const getServiceDomains = () => ({
  nmea: 'NMEA data parsing and connection management',
  connection: 'Network connectivity and reconnection strategies', 
  autopilot: 'Autopilot control, safety, and monitoring',
  playback: 'Data simulation, testing, and mock generation',
  storage: 'Data persistence and file management',
  ui: 'Layout management and user interface state',
});
