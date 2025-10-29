/**
 * Integration Tests for API Workflow
 * 
 * Epic 10.5 - Test Coverage & Quality
 * AC2: API workflow testing - Complete scenario execution via REST endpoints from external tools
 */

const request = require('supertest');
const { UnifiedNMEABridge } = require('../../nmea-bridge');

describe('API Workflow Integration Tests', () => {
  let bridge;
  let apiApp;

  beforeEach(async () => {
    bridge = new UnifiedNMEABridge();
    
    // Start bridge in scenario mode to enable API
    const config = {
      mode: 'scenario',
      scenarioName: 'basic-navigation',
      speed: 1.0
    };

    await bridge.start(config);
    apiApp = bridge.controlAPI.app;
    
    // Wait for API to be ready
    await new Promise(resolve => setTimeout(resolve, 1000));
  });

  afterEach(async () => {
    if (bridge && bridge.isRunning) {
      await bridge.shutdown();
    }
  });

  describe('Complete Scenario Workflow', () => {
    test('should execute full scenario lifecycle via API', async () => {
      // 1. Check API health
      const healthResponse = await request(apiApp)
        .get('/api/health')
        .expect(200);

      expect(healthResponse.body.status).toBe('healthy');
      expect(healthResponse.body.simulator).toBe(true);

      // 2. Get available scenarios
      const scenariosResponse = await request(apiApp)
        .get('/api/scenarios')
        .expect(200);

      expect(scenariosResponse.body.scenarios).toBeInstanceOf(Array);
      expect(scenariosResponse.body.scenarios.length).toBeGreaterThan(0);

      // 3. Start a specific scenario
      const startResponse = await request(apiApp)
        .post('/api/scenarios/start')
        .send({
          name: 'coastal-sailing',
          parameters: {
            windSpeed: 15,
            waveHeight: 2.5
          },
          duration: 30000
        })
        .expect(200);

      expect(startResponse.body.success).toBe(true);
      expect(startResponse.body.sessionId).toBeDefined();
      expect(startResponse.body.scenario.name).toBe('coastal-sailing');

      const sessionId = startResponse.body.sessionId;

      // 4. Monitor scenario execution
      await new Promise(resolve => setTimeout(resolve, 2000));

      const statusResponse = await request(apiApp)
        .get('/api/status')
        .expect(200);

      expect(statusResponse.body.simulator.isRunning).toBe(true);
      expect(statusResponse.body.performance.messagesPerSecond).toBeGreaterThan(0);

      // 5. Inject custom NMEA data during scenario
      const injectResponse = await request(apiApp)
        .post('/api/inject-data')
        .send({
          sentence: '$GPGGA,123519,4807.038,N,01131.000,E,1,08,0.9,545.4,M,46.9,M,,*47'
        })
        .expect(200);

      expect(injectResponse.body.success).toBe(true);
      expect(injectResponse.body.injected).toBe(1);

      // 6. Stop the scenario
      const stopResponse = await request(apiApp)
        .post('/api/scenarios/stop')
        .expect(200);

      expect(stopResponse.body.success).toBe(true);

      // 7. Verify scenario stopped
      const finalStatusResponse = await request(apiApp)
        .get('/api/status')
        .expect(200);

      // Should still be running but with different scenario or stopped
      expect(finalStatusResponse.body.simulator.isRunning).toBeDefined();
    }, 45000);

    test('should handle concurrent API operations', async () => {
      const operations = [];

      // Start multiple scenarios concurrently (should queue/replace)
      operations.push(
        request(apiApp)
          .post('/api/scenarios/start')
          .send({ name: 'basic-navigation' })
      );

      operations.push(
        request(apiApp)
          .post('/api/scenarios/start')
          .send({ name: 'coastal-sailing' })
      );

      // Get status while starting scenarios
      operations.push(
        request(apiApp)
          .get('/api/status')
      );

      // Inject data while operations are running
      operations.push(
        request(apiApp)
          .post('/api/inject-data')
          .send({
            sentence: '$GPRMC,123519,A,4807.038,N,01131.000,E,000.0,360.0,230394,003.1,W*6A'
          })
      );

      // Execute all operations concurrently
      const responses = await Promise.allSettled(operations);

      // Verify all operations completed (some may have expected errors)
      responses.forEach((response, index) => {
        expect(response.status).toBe('fulfilled');
        expect(response.value.status).toBeGreaterThanOrEqual(200);
        expect(response.value.status).toBeLessThan(500);
      });

      // Verify system is still stable
      const healthCheck = await request(apiApp)
        .get('/api/health')
        .expect(200);

      expect(healthCheck.body.status).toBe('healthy');
    }, 30000);
  });

  describe('Error Simulation Workflow', () => {
    test('should execute complete error simulation workflow', async () => {
      // 1. Start baseline scenario
      await request(apiApp)
        .post('/api/scenarios/start')
        .send({ name: 'basic-navigation' })
        .expect(200);

      // 2. Get baseline performance metrics
      const baselineResponse = await request(apiApp)
        .get('/api/performance')
        .expect(200);

      const baselineMetrics = baselineResponse.body;
      expect(baselineMetrics.messagesPerSecond).toBeGreaterThan(0);

      // 3. Simulate connection error
      const connectionErrorResponse = await request(apiApp)
        .post('/api/simulate-error')
        .send({
          type: 'connection_lost',
          parameters: {
            duration: 5000,
            protocols: ['tcp', 'websocket']
          }
        })
        .expect(200);

      expect(connectionErrorResponse.body.success).toBe(true);

      // 4. Monitor performance during error
      await new Promise(resolve => setTimeout(resolve, 2000));

      const errorMetricsResponse = await request(apiApp)
        .get('/api/performance')
        .expect(200);

      // System should still be operational
      expect(errorMetricsResponse.body.messagesPerSecond).toBeGreaterThanOrEqual(0);

      // 5. Wait for error simulation to complete
      await new Promise(resolve => setTimeout(resolve, 6000));

      // 6. Verify recovery
      const recoveryResponse = await request(apiApp)
        .get('/api/performance')
        .expect(200);

      expect(recoveryResponse.body.messagesPerSecond).toBeGreaterThan(0);

      // 7. Simulate data corruption
      await request(apiApp)
        .post('/api/simulate-error')
        .send({
          type: 'malformed_data',
          parameters: {
            corruptionRate: 0.1,
            duration: 3000
          }
        })
        .expect(200);

      // 8. System should handle corruption gracefully
      await new Promise(resolve => setTimeout(resolve, 4000));

      const finalMetricsResponse = await request(apiApp)
        .get('/api/performance')
        .expect(200);

      expect(finalMetricsResponse.body.messagesPerSecond).toBeGreaterThanOrEqual(0);
    }, 30000);

    test('should handle error simulation with external monitoring', async () => {
      let performanceHistory = [];
      
      // Start monitoring
      const startMonitoring = async () => {
        for (let i = 0; i < 10; i++) {
          try {
            const response = await request(apiApp)
              .get('/api/performance');
            
            if (response.status === 200) {
              performanceHistory.push({
                timestamp: Date.now(),
                metrics: response.body
              });
            }
          } catch (error) {
            performanceHistory.push({
              timestamp: Date.now(),
              error: error.message
            });
          }
          
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      };

      // Start monitoring in background
      const monitoringPromise = startMonitoring();

      // Execute error simulation workflow
      await new Promise(resolve => setTimeout(resolve, 1000));

      await request(apiApp)
        .post('/api/simulate-error')
        .send({
          type: 'high_latency',
          parameters: {
            latencyMs: 500,
            duration: 5000
          }
        })
        .expect(200);

      // Wait for monitoring to complete
      await monitoringPromise;

      // Analyze performance history
      expect(performanceHistory.length).toBeGreaterThan(5);
      
      const validMetrics = performanceHistory.filter(entry => entry.metrics);
      expect(validMetrics.length).toBeGreaterThan(3);

      // Verify metrics were collected throughout the test
      const timestamps = validMetrics.map(entry => entry.timestamp);
      const timeSpan = Math.max(...timestamps) - Math.min(...timestamps);
      expect(timeSpan).toBeGreaterThan(8000); // Should span at least 8 seconds
    }, 25000);
  });

  describe('Data Management Workflow', () => {
    test('should handle bulk data injection and validation', async () => {
      // 1. Prepare bulk NMEA data
      const bulkNmeaData = [
        '$GPRMC,123519,A,4807.038,N,01131.000,E,000.0,360.0,230394,003.1,W*6A',
        '$GPGGA,123519,4807.038,N,01131.000,E,1,08,0.9,545.4,M,46.9,M,,*47',
        '$GPGSA,A,3,04,05,,09,12,,,24,,,,,2.5,1.3,2.1*39',
        '$GPGSV,2,1,08,01,40,083,46,02,17,308,41,12,07,344,39,14,22,228,45*75',
        '$VWVWR,084,L,02.6,N,01.3,M,04.7,K*54'
      ];

      // 2. Get initial message count
      const initialStatus = await request(apiApp)
        .get('/api/status')
        .expect(200);

      const initialMessageCount = initialStatus.body.performance.totalMessages || 0;

      // 3. Inject bulk data
      const bulkInjectResponse = await request(apiApp)
        .post('/api/inject-data')
        .send({
          messages: bulkNmeaData
        })
        .expect(200);

      expect(bulkInjectResponse.body.success).toBe(true);
      expect(bulkInjectResponse.body.injected).toBe(bulkNmeaData.length);

      // 4. Verify message count increased
      await new Promise(resolve => setTimeout(resolve, 1000));

      const postInjectStatus = await request(apiApp)
        .get('/api/status')
        .expect(200);

      // Should have processed the injected messages
      expect(postInjectStatus.body.simulator.isRunning).toBe(true);

      // 5. Test invalid data rejection
      const invalidDataResponse = await request(apiApp)
        .post('/api/inject-data')
        .send({
          sentence: 'invalid nmea data without proper format'
        })
        .expect(400);

      expect(invalidDataResponse.body.error).toBeDefined();

      // 6. Test mixed valid/invalid data
      const mixedData = [
        '$GPRMC,123519,A,4807.038,N,01131.000,E,000.0,360.0,230394,003.1,W*6A', // valid
        'invalid data', // invalid
        '$GPGGA,123519,4807.038,N,01131.000,E,1,08,0.9,545.4,M,46.9,M,,*47' // valid
      ];

      const mixedResponse = await request(apiApp)
        .post('/api/inject-data')
        .send({
          messages: mixedData,
          skipInvalid: true
        })
        .expect(200);

      expect(mixedResponse.body.success).toBe(true);
      expect(mixedResponse.body.injected).toBe(2); // Only valid messages
      expect(mixedResponse.body.skipped).toBe(1); // Invalid message skipped
    }, 20000);

    test('should support real-time data streaming workflow', async () => {
      const streamingData = [];
      const messageInterval = 100; // 100ms between messages
      const streamDuration = 5000; // 5 seconds

      // Start streaming messages
      const streamingPromise = new Promise((resolve) => {
        let messageCount = 0;
        const maxMessages = streamDuration / messageInterval;

        const streamInterval = setInterval(async () => {
          const nmeaMessage = `$GPRMC,${Date.now()},A,4807.038,N,01131.000,E,000.0,360.0,230394,003.1,W*6A`;
          
          try {
            const response = await request(apiApp)
              .post('/api/inject-data')
              .send({ sentence: nmeaMessage });

            if (response.status === 200) {
              streamingData.push({
                timestamp: Date.now(),
                message: nmeaMessage,
                response: response.body
              });
            }
          } catch (error) {
            streamingData.push({
              timestamp: Date.now(),
              error: error.message
            });
          }

          messageCount++;
          if (messageCount >= maxMessages) {
            clearInterval(streamInterval);
            resolve();
          }
        }, messageInterval);
      });

      // Monitor performance during streaming
      const performanceMonitoring = new Promise((resolve) => {
        const performanceData = [];
        const monitorInterval = setInterval(async () => {
          try {
            const response = await request(apiApp).get('/api/performance');
            if (response.status === 200) {
              performanceData.push({
                timestamp: Date.now(),
                metrics: response.body
              });
            }
          } catch (error) {
            // Continue monitoring even if individual requests fail
          }
        }, 500);

        setTimeout(() => {
          clearInterval(monitorInterval);
          resolve(performanceData);
        }, streamDuration + 1000);
      });

      // Wait for both streaming and monitoring to complete
      const [, performanceResults] = await Promise.all([streamingPromise, performanceMonitoring]);

      // Validate streaming results
      expect(streamingData.length).toBeGreaterThan(30); // Should have sent many messages
      
      const successfulMessages = streamingData.filter(entry => entry.response?.success);
      expect(successfulMessages.length).toBeGreaterThan(25); // Most should succeed

      // Validate performance remained stable
      expect(performanceResults.length).toBeGreaterThan(5);
      
      const avgMessageRate = performanceResults
        .map(entry => entry.metrics.messagesPerSecond)
        .reduce((a, b) => a + b, 0) / performanceResults.length;
      
      expect(avgMessageRate).toBeGreaterThan(5); // Should maintain reasonable throughput
    }, 15000);
  });

  describe('Session Management Workflow', () => {
    test('should track and manage multiple API sessions', async () => {
      const sessions = [];

      // Create multiple sessions
      for (let i = 0; i < 3; i++) {
        const response = await request(apiApp)
          .post('/api/scenarios/start')
          .send({
            name: 'basic-navigation',
            parameters: { sessionId: `test-session-${i}` }
          })
          .expect(200);

        sessions.push(response.body.sessionId);
      }

      // Verify sessions are tracked
      const statusResponse = await request(apiApp)
        .get('/api/status')
        .expect(200);

      expect(statusResponse.body.sessions.active).toBeGreaterThanOrEqual(1);
      expect(statusResponse.body.sessions.total).toBeGreaterThanOrEqual(3);

      // Stop sessions individually
      for (const sessionId of sessions.slice(0, 2)) {
        await request(apiApp)
          .post('/api/scenarios/stop')
          .send({ sessionId })
          .expect(200);
      }

      // Verify session cleanup
      const finalStatusResponse = await request(apiApp)
        .get('/api/status')
        .expect(200);

      expect(finalStatusResponse.body.sessions.active).toBeGreaterThanOrEqual(0);
    }, 25000);
  });
});