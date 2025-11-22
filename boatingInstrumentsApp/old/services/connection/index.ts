// Connection Domain Services
// Services responsible for network connections, health monitoring, and diagnostics

// Advanced connection monitoring
export * from './connectionHealthMonitor';

// Core connection services  
export { gracefulDegradationService } from './gracefulDegradationService';

// Note: Add other connection services here as they are created
// - Connection managers
// - Network validators  
// - Protocol handlers
// - Reconnection strategies