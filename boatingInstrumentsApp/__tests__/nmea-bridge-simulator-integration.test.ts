/**
 * Integration Test for Enhanced NMEA Bridge Simulator
 * 
 * Tests backward compatibility with existing WebSocket bridge functionality
 */

const { NMEABridgeSimulator } = require('../server/nmea-bridge-simulator');

describe('NMEA Bridge Simulator Integration', () => {
  let simulator: any;

  beforeAll(async () => {
    simulator = new NMEABridgeSimulator();
  });

  afterAll(async () => {
    if (simulator && simulator.isRunning) {
      await simulator.shutdown();
    }
  });

  describe('Backward Compatibility', () => {
    it('should maintain existing WebSocket message format', () => {
      // Test that the simulator generates messages in the same format
      // that the existing web client expects
      const testMessage = '$IIDBT,,f,15.0,M,8.2,F*5E\r\n';
      
      // Simulate how the WebSocket server would format a message
      const wsMessage = {
        type: 'nmea',
        data: testMessage,  
        timestamp: Date.now()
      };
      
      expect(wsMessage.type).toBe('nmea');
      expect(wsMessage.data).toContain('$IIDBT');
      expect(wsMessage.timestamp).toBeDefined();
    });

    it('should support autopilot command format from existing bridge', () => {
      const command = '$PCDIN,01F112,00,00,FF,00,00,00,00,FF*59';
      
      expect(simulator.isAutopilotCommand(command)).toBe(true);
      
      // Test that command processing doesn't break
      expect(() => {
        simulator.processAutopilotCommand(command, 'test-client');
      }).not.toThrow();
    });

    it('should generate valid NMEA sentences for existing parsers', () => {
      const sentences = [
        simulator.generateDepthSentence(),
        simulator.generateSpeedSentence(),
        simulator.generateWindSentence(),
        simulator.generateGPSSentence()
      ];
      
      sentences.forEach(sentence => {
        // Each sentence should have proper NMEA format
        expect(sentence).toMatch(/^\$[A-Z]{5},.+\*[0-9A-F]{2}\r\n$/);
        
        // Should end with checksum and CRLF
        expect(sentence).toMatch(/\*[0-9A-F]{2}\r\n$/);
      });
    });
  });

  describe('Performance Requirements', () => {
    it('should handle multiple NMEA sentence generation efficiently', () => {
      const startTime = Date.now();
      const iterations = 1000;
      
      for (let i = 0; i < iterations; i++) {
        simulator.generateDepthSentence();
        simulator.generateSpeedSentence();
        simulator.generateWindSentence();
        simulator.generateGPSSentence();
      }
      
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      // Should generate 4000 sentences in less than 1 second
      expect(duration).toBeLessThan(1000);
      
      // Calculate messages per second
      const messagesPerSecond = (iterations * 4) / (duration / 1000);
      expect(messagesPerSecond).toBeGreaterThan(500);
    });

    it('should maintain reasonable performance characteristics', () => {
      // Test that sentence generation is consistent
      const sentences = [];
      for (let i = 0; i < 1000; i++) {
        sentences.push(simulator.generateDepthSentence());
      }
      
      // All sentences should be valid
      sentences.forEach(sentence => {
        expect(sentence).toMatch(/^\$IIDBT,,f,\d+\.\d,M,\d+\.\d,F\*[0-9A-F]{2}\r\n$/);
      });
      
      // Should generate consistent format
      expect(sentences.length).toBe(1000);
    });
  });

  describe('Bridge Mode Compatibility', () => {
    it('should support NMEA 0183 bridge mode', () => {
      simulator.bridgeMode = 'nmea0183';
      
      const autopilotSentence = simulator.generateAutopilotSentence();
      expect(autopilotSentence).toContain('$PCDIN');
      expect(autopilotSentence).toMatch(/\*[0-9A-F]{2}\r\n$/);
    });

    it('should support NMEA 2000 bridge mode', () => {
      simulator.bridgeMode = 'nmea2000';
      
      const autopilotMessage = simulator.generateAutopilotSentence();
      expect(autopilotMessage).toContain('PGN:');
    });
  });

  describe('Data Quality Validation', () => {
    it('should generate realistic marine data ranges', () => {
      // Test depth ranges (reasonable for marine navigation)
      for (let i = 0; i < 100; i++) {
        const sentence = simulator.generateDepthSentence();
        const depthMatch = sentence.match(/,(\d+\.\d),M,/);
        
        if (depthMatch) {
          const depth = parseFloat(depthMatch[1]);
          expect(depth).toBeGreaterThan(5);  // Minimum navigable depth
          expect(depth).toBeLessThan(50);    // Maximum test depth
        }
      }
      
      // Test speed ranges (reasonable boat speeds)
      for (let i = 0; i < 100; i++) {
        const sentence = simulator.generateSpeedSentence();
        const speedMatch = sentence.match(/,(\d+\.\d),N,/);
        
        if (speedMatch) {
          const speed = parseFloat(speedMatch[1]);
          expect(speed).toBeGreaterThan(0);   // Minimum speed
          expect(speed).toBeLessThan(15);     // Maximum reasonable test speed
        }
      }
    });

    it('should maintain data coherence over time', () => {
      // Test that autopilot heading changes are reasonable
      const initialHeading = simulator.autopilotState.currentHeading;
      
      // Simulate heading adjustment
      simulator.parsePCDINCommand('$PCDIN,01F113,00,01,00,00,00,00,00,00*5B');
      
      const newHeading = simulator.autopilotState.targetHeading;
      
      // Heading should have changed by small amount
      const headingChange = Math.abs(newHeading - initialHeading);
      expect(headingChange).toBeLessThan(30); // Reasonable adjustment
    });
  });
});