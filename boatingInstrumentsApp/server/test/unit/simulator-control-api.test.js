/**
 * Unit Tests for Simulator Control API
 *
 * Epic 10.5 - Test Coverage & Quality
 * AC1: API routes validated with request/response schemas and error handling
 */

const request = require('supertest');
const { SimulatorControlAPI } = require('../../simulator-control-api');
const { ScenarioEngine } = require('../../scenario-engine');

// Mock dependencies
jest.mock('../../scenario-engine');

describe('SimulatorControlAPI', () => {
  let api;
  let mockSimulator;
  let mockScenarioEngine;

  beforeEach(() => {
    // Mock simulator
    mockSimulator = {
      isRunning: true,
      start: jest.fn(),
      stop: jest.fn(),
      broadcastMessage: jest.fn(),
      getStatus: jest.fn(() => ({
        isRunning: true,
        mode: 'scenario',
        stats: {
          messagesPerSecond: 100,
          totalMessages: 1000,
          activeConnections: 5,
        },
      })),
      clients: new Map(),
    };

    // Mock scenario engine
    mockScenarioEngine = {
      loadScenario: jest.fn(),
      stopScenario: jest.fn(),
      getAvailableScenarios: jest.fn(() => [
        'basic-navigation',
        'coastal-sailing',
        'autopilot-engagement',
      ]),
    };

    ScenarioEngine.mockImplementation(() => mockScenarioEngine);

    // Create API instance
    api = new SimulatorControlAPI(mockSimulator);
  });

  afterEach(async () => {
    if (api.server) {
      await new Promise((resolve) => {
        api.server.close(resolve);
      });
    }
    jest.clearAllMocks();
  });

  describe('Constructor', () => {
    test('should initialize with correct properties', () => {
      expect(api.simulator).toBe(mockSimulator);
      expect(api.scenarioEngine).toBeInstanceOf(Object);
      expect(api.app).toBeDefined();
      expect(api.apiPort).toBe(9090);
      expect(api.performanceMetrics).toBeDefined();
      expect(api.activeSessions).toBeInstanceOf(Map);
    });

    test('should setup middleware correctly', () => {
      // Verify CORS and JSON parsing are configured
      expect(api.app._router).toBeDefined();
    });
  });

  describe('Health Check Endpoint', () => {
    test('GET /api/health should return healthy status', async () => {
      const response = await request(api.app).get('/api/health').expect(200);

      expect(response.body).toMatchObject({
        status: 'healthy',
        simulator: true,
        version: '1.0.0',
      });
      expect(response.body.uptime).toBeGreaterThanOrEqual(0);
    });

    test('should reflect simulator running state', async () => {
      mockSimulator.isRunning = false;

      const response = await request(api.app).get('/api/health').expect(200);

      expect(response.body.simulator).toBe(false);
    });
  });

  describe('Scenario Management Endpoints', () => {
    describe('POST /api/scenarios/start', () => {
      test('should start scenario successfully', async () => {
        const scenarioData = {
          name: 'basic-navigation',
          phases: ['startup', 'sailing'],
        };

        mockScenarioEngine.loadScenario.mockResolvedValue(scenarioData);

        const response = await request(api.app)
          .post('/api/scenarios/start')
          .send({
            name: 'basic-navigation',
            parameters: { speed: 1.0 },
            duration: 30000,
          })
          .expect(200);

        expect(response.body).toMatchObject({
          success: true,
          scenario: expect.objectContaining({
            name: 'basic-navigation',
          }),
          sessionId: expect.any(String),
        });

        expect(mockScenarioEngine.loadScenario).toHaveBeenCalledWith(
          expect.stringContaining('basic-navigation.yml'),
          expect.objectContaining({
            id: 'basic-navigation',
            parameters: { speed: 1.0 },
          }),
        );
      });

      test('should reject request without scenario name', async () => {
        const response = await request(api.app)
          .post('/api/scenarios/start')
          .send({
            parameters: { speed: 1.0 },
          })
          .expect(400);

        expect(response.body.error).toBe('Scenario name is required');
      });

      test('should handle scenario loading errors', async () => {
        mockScenarioEngine.loadScenario.mockRejectedValue(new Error('Scenario not found'));

        const response = await request(api.app)
          .post('/api/scenarios/start')
          .send({
            name: 'non-existent-scenario',
          })
          .expect(500);

        expect(response.body.error).toContain('Scenario not found');
      });

      test('should apply default parameters', async () => {
        mockScenarioEngine.loadScenario.mockResolvedValue({
          name: 'basic-navigation',
          phases: [],
        });

        await request(api.app)
          .post('/api/scenarios/start')
          .send({
            name: 'basic-navigation',
          })
          .expect(200);

        expect(mockScenarioEngine.loadScenario).toHaveBeenCalledWith(
          expect.any(String),
          expect.objectContaining({
            parameters: {},
          }),
        );
      });
    });

    describe('POST /api/scenarios/stop', () => {
      test('should stop running scenario', async () => {
        // Start a scenario first
        api.currentSession = {
          id: 'test-session',
          scenario: { name: 'basic-navigation' },
          startTime: Date.now(),
        };

        mockScenarioEngine.stopScenario.mockResolvedValue();

        const response = await request(api.app).post('/api/scenarios/stop').expect(200);

        expect(response.body).toMatchObject({
          success: true,
          message: 'Scenario stopped successfully',
        });

        expect(mockScenarioEngine.stopScenario).toHaveBeenCalled();
        expect(api.currentSession).toBeNull();
      });

      test('should handle case when no scenario is running', async () => {
        api.currentSession = null;

        const response = await request(api.app).post('/api/scenarios/stop').expect(400);

        expect(response.body.error).toBe('No scenario is currently running');
      });
    });

    describe('GET /api/scenarios', () => {
      test('should list available scenarios', async () => {
        const scenarios = ['basic-navigation', 'coastal-sailing', 'autopilot-engagement'];

        mockScenarioEngine.getAvailableScenarios.mockReturnValue(scenarios);

        const response = await request(api.app).get('/api/scenarios').expect(200);

        expect(response.body).toEqual({
          scenarios: scenarios,
          total: scenarios.length,
        });
      });
    });
  });

  describe('Data Injection Endpoints', () => {
    describe('POST /api/inject-data', () => {
      test('should inject single NMEA message', async () => {
        const nmeaMessage = '$GPRMC,123519,A,4807.038,N,01131.000,E,000.0,360.0,230394,003.1,W*6A';

        const response = await request(api.app)
          .post('/api/inject-data')
          .send({
            message: nmeaMessage,
          })
          .expect(200);

        expect(response.body).toMatchObject({
          success: true,
          injected: 1,
        });

        expect(mockSimulator.broadcastMessage).toHaveBeenCalledWith(nmeaMessage);
      });

      test('should inject multiple NMEA messages', async () => {
        const messages = [
          '$GPRMC,123519,A,4807.038,N,01131.000,E,000.0,360.0,230394,003.1,W*6A',
          '$GPGGA,123519,4807.038,N,01131.000,E,1,08,0.9,545.4,M,46.9,M,,*47',
        ];

        const response = await request(api.app)
          .post('/api/inject-data')
          .send({
            messages: messages,
          })
          .expect(200);

        expect(response.body).toMatchObject({
          success: true,
          injected: 2,
        });

        expect(mockSimulator.broadcastMessage).toHaveBeenCalledTimes(2);
      });

      test('should reject invalid NMEA messages', async () => {
        const response = await request(api.app)
          .post('/api/inject-data')
          .send({
            message: 'invalid nmea message',
          })
          .expect(400);

        expect(response.body.error).toContain('Invalid NMEA message format');
      });

      test('should require message data', async () => {
        const response = await request(api.app).post('/api/inject-data').send({}).expect(400);

        expect(response.body.error).toBe('Message or messages array is required');
      });
    });
  });

  describe('Error Simulation Endpoints', () => {
    describe('POST /api/simulate-error', () => {
      test('should simulate connection error', async () => {
        const response = await request(api.app)
          .post('/api/simulate-error')
          .send({
            type: 'connection',
            parameters: {
              duration: 5000,
              affectedClients: 'all',
            },
          })
          .expect(200);

        expect(response.body).toMatchObject({
          success: true,
          errorType: 'connection',
          message: expect.stringContaining('Connection error simulation started'),
        });
      });

      test('should simulate data corruption error', async () => {
        const response = await request(api.app)
          .post('/api/simulate-error')
          .send({
            type: 'data-corruption',
            parameters: {
              corruptionRate: 0.1,
              duration: 10000,
            },
          })
          .expect(200);

        expect(response.body).toMatchObject({
          success: true,
          errorType: 'data-corruption',
        });
      });

      test('should reject unknown error types', async () => {
        const response = await request(api.app)
          .post('/api/simulate-error')
          .send({
            type: 'unknown-error',
          })
          .expect(400);

        expect(response.body.error).toContain('Unknown error type');
      });

      test('should require error type', async () => {
        const response = await request(api.app)
          .post('/api/simulate-error')
          .send({
            parameters: {},
          })
          .expect(400);

        expect(response.body.error).toBe('Error type is required');
      });
    });
  });

  describe('Status and Monitoring Endpoints', () => {
    describe('GET /api/status', () => {
      test('should return comprehensive status information', async () => {
        const response = await request(api.app).get('/api/status').expect(200);

        expect(response.body).toMatchObject({
          simulator: expect.objectContaining({
            isRunning: true,
            mode: 'scenario',
          }),
          performance: expect.objectContaining({
            messagesPerSecond: expect.any(Number),
            memoryUsage: expect.any(Number),
            uptime: expect.any(Number),
          }),
          sessions: expect.objectContaining({
            active: expect.any(Number),
            total: expect.any(Number),
          }),
        });
      });
    });

    describe('GET /api/performance', () => {
      test('should return performance metrics', async () => {
        const response = await request(api.app).get('/api/performance').expect(200);

        expect(response.body).toMatchObject({
          messagesPerSecond: expect.any(Number),
          averageLatency: expect.any(Number),
          memoryUsage: expect.any(Number),
          cpuUtilization: expect.any(Number),
          activeConnections: expect.any(Number),
          uptime: expect.any(Number),
          totalMessages: expect.any(Number),
        });
      });
    });
  });

  describe('Error Handling', () => {
    test('should handle JSON parsing errors', async () => {
      const response = await request(api.app)
        .post('/api/inject-data')
        .set('Content-Type', 'application/json')
        .send('invalid json')
        .expect(400);

      expect(response.body.error).toBeDefined();
    });

    test('should handle internal server errors', async () => {
      mockScenarioEngine.loadScenario.mockImplementation(() => {
        throw new Error('Internal error');
      });

      const response = await request(api.app)
        .post('/api/scenarios/start')
        .send({
          name: 'basic-navigation',
        })
        .expect(500);

      expect(response.body.error).toBe('Internal error');
      expect(response.body.timestamp).toBeDefined();
    });
  });

  describe('Performance Monitoring', () => {
    test('should track API request metrics', async () => {
      const initialRequests = api.performanceMetrics.totalRequests || 0;

      await request(api.app).get('/api/health').expect(200);

      // Performance monitoring should update metrics
      expect(api.performanceMetrics.startTime).toBeDefined();
    });

    test('should calculate uptime correctly', async () => {
      const response = await request(api.app).get('/api/performance').expect(200);

      expect(response.body.uptime).toBeGreaterThan(0);
    });
  });

  describe('Session Management', () => {
    test('should create unique session IDs', async () => {
      mockScenarioEngine.loadScenario.mockResolvedValue({
        name: 'basic-navigation',
        phases: [],
      });

      const response1 = await request(api.app)
        .post('/api/scenarios/start')
        .send({ name: 'basic-navigation' })
        .expect(200);

      const response2 = await request(api.app)
        .post('/api/scenarios/start')
        .send({ name: 'coastal-sailing' })
        .expect(200);

      expect(response1.body.sessionId).toBeDefined();
      expect(response2.body.sessionId).toBeDefined();
      expect(response1.body.sessionId).not.toBe(response2.body.sessionId);
    });

    test('should track active sessions', () => {
      const sessionId = 'test-session-123';
      const session = {
        id: sessionId,
        scenario: { name: 'basic-navigation' },
        startTime: Date.now(),
      };

      api.activeSessions.set(sessionId, session);

      expect(api.activeSessions.size).toBe(1);
      expect(api.activeSessions.get(sessionId)).toEqual(session);
    });
  });
});
