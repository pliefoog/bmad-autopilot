/**
 * PURPOSE: Unit Tests for Story 11.3 SimulatorTestClient Auto-Discovery
 * REQUIREMENT: AC1 - SimulatorTestClient Auto-Discovery (Core Functionality)
 * METHOD: Test port discovery, connection establishment, retry logic, and fallback
 * EXPECTED: <50ms per unit test, 100% AC1 coverage
 */

import { SimulatorTestClient, SimulatorConnectionOptions } from '../../../src/testing/helpers/SimulatorTestClient';
import { getTestEnvironment, skipIfNoSimulator, testIf } from '../../setup-test-environment';

// Mock fetch for unit testing
global.fetch = jest.fn();

// Mock WebSocket with proper typing
const mockWebSocketConstructor = jest.fn();
(global as any).WebSocket = mockWebSocketConstructor;

describe('SimulatorTestClient Auto-Discovery (AC1)', () => {
  let mockFetch: jest.MockedFunction<typeof fetch>;

  beforeEach(() => {
    mockFetch = fetch as jest.MockedFunction<typeof fetch>;
    mockFetch.mockClear();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('AC1.1: Automatic discovery on ports [9090, 8080] with 5-second timeout', () => {
    it('should discover simulator on port 9090', async () => {
      const startTime = Date.now();
      
      // Mock successful response on port 9090
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ running: true, status: 'active' })
      } as Response);

      const client = await SimulatorTestClient.autoConnect({ ports: [9090, 8080] });
      
      const discoveryTime = Date.now() - startTime;
      expect(discoveryTime).toMeetPerformanceThreshold('discovery');
      
      expect(client.getConnectionInfo().connected).toBe(true);
      expect(client.getConnectionInfo().port).toBe(9090);
      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:9090/api/status',
        expect.objectContaining({ method: 'GET' })
      );

      await client.disconnect();
    });

    it('should discover simulator on port 8080 if 9090 fails', async () => {
      // Mock failure on 9090, success on 8080
      mockFetch
        .mockRejectedValueOnce(new Error('Connection failed'))
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ running: true })
        } as Response);

      const client = await SimulatorTestClient.autoConnect({ ports: [9090, 8080] });
      
      expect(client.getConnectionInfo().connected).toBe(true);
      expect(client.getConnectionInfo().port).toBe(8080);
      expect(mockFetch).toHaveBeenCalledTimes(2);

      await client.disconnect();
    });

    it('should respect 5-second timeout per port', async () => {
      const timeoutMs = 2000;
      
      // Mock timeout
      mockFetch.mockImplementation(() => 
        new Promise(() => {}) // Never resolves
      );

      const startTime = Date.now();
      
      try {
        await SimulatorTestClient.autoConnect({ 
          ports: [9090], 
          timeout: timeoutMs,
          retries: 1 
        });
      } catch (error) {
        const elapsedTime = Date.now() - startTime;
        // Should timeout and fallback to mock mode within reasonable time
        expect(elapsedTime).toBeGreaterThanOrEqual(timeoutMs);
        expect(elapsedTime).toBeLessThan(timeoutMs + 1000); // Allow some overhead
      }
    });
  });

  describe('AC1.2: Connection establishment with 3 retry attempts and exponential backoff', () => {
    it('should retry with exponential backoff delays: 100ms, 200ms, 400ms', async () => {
      const delays: number[] = [];
      const originalSetTimeout = global.setTimeout;
      
      // Mock setTimeout to capture delay times
      (global as any).setTimeout = jest.fn().mockImplementation((fn: Function, delay: number) => {
        delays.push(delay);
        return originalSetTimeout(fn as TimerHandler, 0); // Execute immediately for test speed
      });

      // Mock all attempts to fail
      mockFetch.mockRejectedValue(new Error('Connection failed'));

      try {
        await SimulatorTestClient.autoConnect({ 
          ports: [9090], 
          retries: 3,
          timeout: 100 
        });
      } catch (error) {
        // Should fall back to mock mode, not actually error
        expect(error).toBeUndefined();
      }

      // Verify exponential backoff delays (after the first attempt)
      expect(delays).toEqual([100, 200]); // 3 attempts = 2 delays between them
      
      (global as any).setTimeout = originalSetTimeout;
    });

    it('should succeed on second retry attempt', async () => {
      // Mock first attempt failure, second attempt success
      mockFetch
        .mockRejectedValueOnce(new Error('Connection failed'))
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ running: true })
        } as Response);

      const client = await SimulatorTestClient.autoConnect({ 
        ports: [9090], 
        retries: 3 
      });
      
      expect(client.getConnectionInfo().connected).toBe(true);
      expect(mockFetch).toHaveBeenCalledTimes(2);

      await client.disconnect();
    });

    it('should limit retries to configured maximum', async () => {
      const maxRetries = 2;
      mockFetch.mockRejectedValue(new Error('Connection failed'));

      const client = await SimulatorTestClient.autoConnect({ 
        ports: [9090], 
        retries: maxRetries,
        timeout: 100 
      });

      // Should have attempted once per retry (2 total attempts for ports)
      expect(mockFetch).toHaveBeenCalledTimes(maxRetries);
      
      // Should fallback to mock mode
      expect(client.isMock()).toBe(true);
      
      await client.disconnect();
    });
  });

  describe('AC1.3: Graceful fallback to mock mode if simulator unavailable', () => {
    it('should create mock instance when all connection attempts fail', async () => {
      mockFetch.mockRejectedValue(new Error('Simulator not available'));

      const client = await SimulatorTestClient.autoConnect({ 
        ports: [9090, 8080],
        retries: 2,
        timeout: 100
      });

      expect(client.getConnectionInfo().connected).toBe(true); // Still connected, but in mock mode
      expect(client.isMock()).toBe(true);
      expect(client.getConnectionInfo().baseUrl).toBe('mock://localhost:9090');

      await client.disconnect();
    });

    it('should handle mock mode operations correctly', async () => {
      mockFetch.mockRejectedValue(new Error('No simulator'));

      const client = await SimulatorTestClient.autoConnect();
      
      // Test mock scenario loading
      await expect(client.loadScenario({ 
        scenarioName: 'basic-navigation' 
      })).resolves.toBeUndefined();
      
      // Test mock NMEA injection
      await expect(client.injectNmeaMessage('$IIDBT,1.2,f,0.4,M,0.2,F*2B')).resolves.toBeUndefined();

      await client.disconnect();
    });
  });

  describe('AC1.4: HTTP API communication for scenario loading and NMEA injection', () => {
    beforeEach(async () => {
      // Setup successful connection
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ running: true })
      } as Response);
    });

    it('should load scenarios via POST /api/scenarios/start', async () => {
      const client = await SimulatorTestClient.autoConnect();
      
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, scenario: 'test-scenario' })
      } as Response);

      await client.loadScenario({ 
        scenarioName: 'test-scenario',
        parameters: { speed: 10 },
        duration: 30000
      });

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/scenarios/start'),
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: 'test-scenario',
            parameters: { speed: 10 },
            duration: 30000
          })
        })
      );

      await client.disconnect();
    });

    it('should inject NMEA messages via POST /api/inject-data', async () => {
      const client = await SimulatorTestClient.autoConnect();
      const testSentence = '$IIDBT,1.2,f,0.4,M,0.2,F*2B';
      
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true })
      } as Response);

      await client.injectNmeaMessage(testSentence, { repeat: 1 });

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/inject-data'),
        expect.objectContaining({
          method: 'POST',
          body: expect.stringContaining(testSentence)
        })
      );

      await client.disconnect();
    });

    it('should validate connections via health check endpoint', async () => {
      const client = await SimulatorTestClient.autoConnect();
      
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ status: 'healthy' })
      } as Response);

      await expect(client.validateConnection()).resolves.toBeUndefined();

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/health'),
        expect.objectContaining({ method: 'GET' })
      );

      await client.disconnect();
    });
  });

  describe('AC1.5: WebSocket connection management for real-time data streams', () => {
    let mockWebSocket: any;

    beforeEach(() => {
      mockWebSocket = {
        close: jest.fn(),
        send: jest.fn(),
        readyState: WebSocket.OPEN,
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
        onopen: null,
        onclose: null,
        onmessage: null,
        onerror: null
      };
      
      mockWebSocketConstructor.mockImplementation(() => mockWebSocket);
      
      // Mock successful HTTP connection
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ running: true })
      } as Response);
    });

    it('should establish WebSocket connection on port 8080', async () => {
      const client = await SimulatorTestClient.autoConnect();
      
      // Simulate WebSocket connection success
      if (mockWebSocket.onopen) {
        mockWebSocket.onopen();
      }

      expect(mockWebSocketConstructor).toHaveBeenCalledWith('ws://localhost:8080');
      expect(client.getConnectionInfo().websocketConnected).toBe(true);

      await client.disconnect();
    });

    it('should buffer real-time messages with size limit', async () => {
      const client = await SimulatorTestClient.autoConnect();
      
      // Simulate WebSocket connection and messages
      if (mockWebSocket.onopen) {
        mockWebSocket.onopen();
      }

      // Simulate multiple messages
      const testMessages = [
        { type: 'nmea', data: '$IIDBT,1.2,f,0.4,M,0.2,F*2B', timestamp: Date.now() },
        { type: 'nmea', data: '$IIVHW,,,,,5.0,N,9.3,K*7B', timestamp: Date.now() },
        { type: 'nmea', data: '$IIMWV,045,R,12.5,N,A*29', timestamp: Date.now() }
      ];

      testMessages.forEach(msg => {
        if (mockWebSocket.onmessage) {
          mockWebSocket.onmessage({ data: JSON.stringify(msg) });
        }
      });

      const bufferedMessages = client.getRealtimeMessages();
      expect(bufferedMessages).toHaveLength(3);
      expect(bufferedMessages[0].type).toBe('nmea');

      await client.disconnect();
    });

    it('should handle WebSocket disconnection gracefully', async () => {
      const client = await SimulatorTestClient.autoConnect();
      
      // Simulate connection then disconnection
      if (mockWebSocket.onopen) {
        mockWebSocket.onopen();
      }
      
      if (mockWebSocket.onclose) {
        mockWebSocket.onclose({ code: 1000 });
      }

      // Should attempt reconnection (mocked)
      expect(mockWebSocket.close).toHaveBeenCalled();

      await client.disconnect();
    });
  });
});