// Playback Domain Services
// Services responsible for data playback, simulation, testing, and mock data generation

// Legacy playback services (to be migrated)
export * from './playbackService';
export * from './mockServer';
export * from './stressTestService';

// Enhanced NMEA playback services
export * from './NMEAPlayback';
export * from './sampleData';

// Re-export types for convenience
export type { 
  PlaybackService, 
  PlaybackOptions, 
  PlaybackStatus, 
  PlaybackFile 
} from './NMEAPlayback';
export type { 
  SampleDataSequence, 
  DemoScenario 
} from './sampleData';