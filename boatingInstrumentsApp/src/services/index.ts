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
// REMOVED: layoutService - deleted during architectural cleanup
// REMOVED: playbackService - deleted (dead code from pre-registry architecture)
// REMOVED: mockServer - deleted (test-only utility, not used in production app)
// REMOVED: stressTestService - deleted (test-only utility, not used in production app)
export * from './connectionDefaults';

// Service initialization with registry
export const initServices = async () => {
  const { serviceRegistry } = await import('./registry');
  await serviceRegistry.initialize();
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
