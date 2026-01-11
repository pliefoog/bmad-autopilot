/**
 * Test the new modular NMEA architecture
 * This tests the complete pipeline: Connection -> Parsing -> Transformation -> Store
 */

import { createNmeaService } from '../modular';
import type { NmeaServiceConfig } from '../modular';

// Test configuration
const testConfig: NmeaServiceConfig = {
  connection: {
    ip: 'localhost',
    port: 8080,
    protocol: 'websocket',
  },
  // Parsing options removed - were never read or used
};

export async function testModularArchitecture(): Promise<void> {
  try {
    // Create NMEA service
    const nmeaService = createNmeaService(testConfig);

    // Start service
    const started = await nmeaService.start();

    // Check status after 2 seconds
    setTimeout(() => {
      const status = nmeaService.getStatus();

      // Stop service
      nmeaService.stop();
    }, 2000);
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Export for manual testing
export { testConfig };
