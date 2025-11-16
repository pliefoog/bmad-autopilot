#!/usr/bin/env node

/**
 * Debug NMEA Data Flow
 * Tests the complete pipeline from WebSocket to store updates
 */

const { NmeaService } = require('./src/services/nmea/NmeaService');

class NmeaFlowDebugger {
  constructor() {
    this.service = NmeaService.getInstance();
    this.messageCount = 0;
    this.processedCount = 0;
  }

  async start() {
    console.log('🔍 Starting NMEA Data Flow Debug...');
    
    // Override the processing method to add debugging
    const originalProcess = this.service.processNmeaMessage;
    
    this.service.processNmeaMessage = (rawMessage) => {
      this.messageCount++;
      console.log(`[DEBUG] Message ${this.messageCount}:`, rawMessage.substring(0, 50));
      
      try {
        const result = originalProcess.call(this.service, rawMessage);
        this.processedCount++;
        console.log(`[DEBUG] Successfully processed message ${this.processedCount}`);
        return result;
      } catch (error) {
        console.error(`[DEBUG] Processing failed:`, error);
      }
    };

    const config = {
      connection: {
        ip: '127.0.0.1',
        port: 8080,
        protocol: 'websocket'
      }
    };

    console.log('📡 Connecting to NMEA bridge...');
    const connected = await this.service.start(config);
    
    if (connected) {
      console.log('✅ Connected! Monitoring data flow...');
      
      // Monitor for 10 seconds
      setTimeout(() => {
        console.log('\n📊 Debug Results:');
        console.log(`Messages received: ${this.messageCount}`);
        console.log(`Messages processed: ${this.processedCount}`);
        console.log(`Success rate: ${this.messageCount > 0 ? Math.round((this.processedCount / this.messageCount) * 100) : 0}%`);
        
        const status = this.service.getStatus();
        console.log('\n📈 Service Status:', JSON.stringify(status, null, 2));
        
        process.exit(0);
      }, 10000);
    } else {
      console.error('❌ Failed to connect!');
      process.exit(1);
    }
  }
}

const nmeaDebugger = new NmeaFlowDebugger();
nmeaDebugger.start().catch(console.error);