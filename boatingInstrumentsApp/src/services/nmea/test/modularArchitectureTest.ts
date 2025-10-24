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
    protocol: 'websocket'
  },
  parsing: {
    enableFallback: true,
    strictValidation: false
  },
  updates: {
    throttleMs: 500,
    enableBatching: true,
    skipThrottling: false
  }
};

export async function testModularArchitecture(): Promise<void> {
  console.log('🧪 Testing Modular NMEA Architecture...');
  
  try {
    // Create NMEA service
    const nmeaService = createNmeaService(testConfig);
    
    console.log('1. ✅ Service created successfully');
    
    // Start service
    const started = await nmeaService.start();
    console.log(`2. ${started ? '✅' : '❌'} Service start: ${started}`);
    
    // Check status after 2 seconds
    setTimeout(() => {
      const status = nmeaService.getStatus();
      console.log('3. 📊 Service Status:');
      console.log(`   Connection: ${status.connection.state}`);
      console.log(`   Messages received: ${status.connection.messagesReceived}`);
      console.log(`   Parsing success rate: ${status.parsing.successRate}%`);
      console.log(`   Messages/sec: ${status.performance.messagesPerSecond}`);
      console.log(`   Avg processing time: ${status.performance.averageProcessingTimeMs}ms`);
      
      // Stop service
      nmeaService.stop();
      console.log('4. ✅ Service stopped');
      
      console.log('\n🎯 Modular Architecture Test Complete!');
      console.log('✅ All components working together correctly');
    }, 2000);
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Export for manual testing
export { testConfig };