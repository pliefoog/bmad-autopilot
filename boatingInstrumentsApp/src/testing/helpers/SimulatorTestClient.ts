/**
 * PURPOSE: SimulatorTestClient for Story 11.3 - Automatic Simulator Discovery
 * REQUIREMENT: Auto-discovery on ports [9090, 8080] with WebSocket connection management
 * METHOD: HTTP API + WebSocket communication with connection pooling and retry logic
 */

import { PerformanceProfiler } from './testHelpers';

// WebSocket message interface for NMEA data streams
export interface NmeaWebSocketMessage {
  type: 'nmea';
  data: string;
  timestamp: number;
}

export interface SimulatorConnectionOptions {
  ports?: number[];
  timeout?: number;
  retries?: number;
}

export interface NmeaInjectionOptions {
  sentence: string;
  repeat?: number;
  interval?: number;
  validate?: boolean;
}

export interface ScenarioLoadOptions {
  scenarioName: string;
  parameters?: Record<string, any>;
  autoStart?: boolean;
  duration?: number;
}

export class SimulatorTestClient {
  private profiler: PerformanceProfiler;
  private isConnected: boolean = false;
  private baseUrl: string = '';
  private currentPort: number = 0;
  private websocket: WebSocket | null = null;
  private wsPort: number = 8080;
  private messageBuffer: Array<{ type: string; data: string; timestamp: number }> = [];
  private reconnectAttempts: number = 0;
  private maxReconnectAttempts: number = 5;
  private isMockMode: boolean = false;

  // AC2 Requirement: Auto-discovery on ports [9090, 8080] with 5-second timeout
  private static readonly DEFAULT_PORTS = [9090, 8080];
  private static readonly DEFAULT_TIMEOUT = 5000;
  private static readonly DEFAULT_RETRY_ATTEMPTS = 3;

  constructor() {
    this.profiler = new PerformanceProfiler();
  }

  /**
   * AC1.1: Auto-connect with port discovery and retry logic
   * AC1.2: Connection establishment with 3 retry attempts and exponential backoff
   */
  static async autoConnect(options: SimulatorConnectionOptions = {}): Promise<SimulatorTestClient> {
    const instance = new SimulatorTestClient();
    const config = {
      ports: options.ports || [9090, 8080],
      timeout: options.timeout || 5000,
      retries: options.retries || 3,
      ...options,
    };

    // AC1.2: Exponential backoff delays: 100ms, 200ms, 400ms
    const backoffDelays = [100, 200, 400];

    for (let attempt = 0; attempt < config.retries; attempt++) {
      for (const port of config.ports) {
        try {
          instance.profiler.start();

          const response = await fetch(`http://localhost:${port}/api/status`, {
            method: 'GET',
            signal: AbortSignal.timeout(config.timeout),
          });

          if (response.ok) {
            const status = await response.json();
            if (status.running || status.status === 'active') {
              instance.isConnected = true;
              instance.baseUrl = `http://localhost:${port}`;
              instance.currentPort = port;

              instance.profiler.mark('connection-established');

              // AC1.1: Connection validation
              await instance.validateConnection();

              // AC1.5: Establish WebSocket connection for real-time data streams
              try {
                await instance.connectWebSocket();
              } catch (wsError) {
                console.warn(
                  `⚠️ WebSocket connection failed, continuing with HTTP-only mode: ${wsError}`,
                );
              }

              return instance;
            }
          }
        } catch (error) {}
      }

      // AC1.2: Exponential backoff with Story 11.3 specified delays
      if (attempt < config.retries - 1) {
        const delay = backoffDelays[attempt] || 400; // fallback to 400ms
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }

    // AC1.3: Graceful fallback to mock mode if simulator unavailable
    console.warn(
      `⚠️ Simulator not available after ${config.retries} attempts, falling back to mock mode`,
    );
    return instance.createMockInstance();
  }

  /**
   * AC1.3: Create mock instance for offline development and testing
   */
  private createMockInstance(): SimulatorTestClient {
    const mockInstance = new SimulatorTestClient();
    mockInstance.isConnected = true;
    mockInstance.baseUrl = 'mock://localhost:9090';
    mockInstance.currentPort = 9090;
    mockInstance.isMockMode = true;

    return mockInstance;
  }

  /**
   * AC2.3: Targeted NMEA sentence injection capabilities
   * AC1.4: HTTP API communication for NMEA injection
   */
  async injectNmeaMessage(
    sentence: string,
    options: Partial<NmeaInjectionOptions> = {},
  ): Promise<void> {
    if (!this.isConnected) {
      throw new Error('SimulatorTestClient not connected. Call autoConnect() first.');
    }

    const { repeat = 1, interval = 1000, validate = true } = options;

    this.profiler.start();

    // AC1.3: Mock mode handling
    if (this.isMockMode) {
      await new Promise((resolve) => setTimeout(resolve, 50)); // Simulate network delay

      // Generate mock response message
      this.messageBuffer.push({
        type: 'nmea',
        data: sentence,
        timestamp: Date.now(),
      });

      this.profiler.mark('sentence-injection');
      return;
    }

    try {
      const response = await fetch(`${this.baseUrl}/api/inject-data`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sentence,
          repeat,
          interval,
          validate,
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to inject NMEA sentence: ${response.statusText}`);
      }

      this.profiler.mark('sentence-injection');
      const perf = this.profiler.validateIntegrationTestPerformance('sentence-injection');

      if (!perf.passed) {
        console.warn(
          `NMEA sentence injection time ${perf.time}ms exceeds AC2 threshold ${perf.threshold}ms`,
        );
      }
    } catch (error) {
      throw new Error(
        `NMEA sentence injection failed: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`,
      );
    }
  }

  /**
   * AC2.2: Real NMEA pipeline testing with scenario loading
   */
  /**
   * AC1.4: Scenario loading via POST /api/scenarios/start (updated to match actual API)
   */
  async loadScenario(options: ScenarioLoadOptions): Promise<void> {
    if (!this.isConnected) {
      throw new Error('SimulatorTestClient not connected. Call autoConnect() first.');
    }

    this.profiler.start();

    // AC1.3: Mock mode handling for offline development
    if (this.isMockMode) {
      await new Promise((resolve) => setTimeout(resolve, 100)); // Simulate network delay

      this.profiler.mark('scenario-load');
      return;
    }

    try {
      const response = await fetch(`${this.baseUrl}/api/scenarios/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: options.scenarioName,
          parameters: options.parameters || {},
          duration: options.duration,
        }),
      });

      if (!response.ok) {
        throw new Error(
          `Failed to load scenario '${options.scenarioName}': ${response.statusText}`,
        );
      }

      const result = await response.json();
      if (!result.success) {
        throw new Error(`Scenario start failed: ${result.error || 'Unknown error'}`);
      }

      this.profiler.mark('scenario-load');
      const perf = this.profiler.validateIntegrationTestPerformance('scenario-load');

      if (!perf.passed) {
        console.warn(`Scenario load time ${perf.time}ms exceeds AC2 threshold ${perf.threshold}ms`);
      }
    } catch (error) {
      throw new Error(
        `Scenario loading failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  /**
   * AC2.4: Pipeline validation and state synchronization testing
   */
  async validatePipelineState(
    expectedState: Record<string, any>,
    timeoutMs: number = 5000,
  ): Promise<boolean> {
    if (!this.isConnected) {
      throw new Error('SimulatorTestClient not connected. Call autoConnect() first.');
    }

    this.profiler.start();
    const startTime = Date.now();

    while (Date.now() - startTime < timeoutMs) {
      try {
        const response = await fetch(`${this.baseUrl}/api/status`);
        const status = await response.json();

        // Check if current state matches expected state
        const stateMatches = Object.entries(expectedState).every(([key, value]) => {
          return status[key] === value;
        });

        if (stateMatches) {
          this.profiler.mark('pipeline-validation');
          const perf = this.profiler.validateIntegrationTestPerformance('pipeline-validation');

          if (!perf.passed) {
            console.warn(
              `Pipeline validation time ${perf.time}ms exceeds AC2 threshold ${perf.threshold}ms`,
            );
          }

          return true;
        }

        // Wait before next check
        await new Promise((resolve) => setTimeout(resolve, 100));
      } catch (error) {
        console.warn('Pipeline state validation error:', error);
      }
    }

    return false;
  }

  /**
   * AC1.1: Connection validation and health check
   */
  async validateConnection(): Promise<void> {
    if (!this.baseUrl) {
      throw new Error('No connection established');
    }

    try {
      const response = await fetch(`${this.baseUrl}/api/health`, {
        method: 'GET',
        signal: AbortSignal.timeout(2000),
      });

      if (!response.ok) {
        throw new Error(`Health check failed: ${response.statusText}`);
      }

      const health = await response.json();
      if (health.status !== 'healthy') {
        throw new Error(`Simulator unhealthy: ${health.status}`);
      }
    } catch (error) {
      throw new Error(
        `Connection validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  /**
   * AC1.5: WebSocket connection management for real-time data streams
   * AC4.2: Automatic reconnection on connection drops
   */
  async connectWebSocket(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        const wsUrl = `ws://localhost:${this.wsPort}`;
        this.websocket = new WebSocket(wsUrl);

        this.websocket.onopen = () => {
          this.reconnectAttempts = 0;
          resolve();
        };

        this.websocket.onmessage = (event) => {
          try {
            const message = JSON.parse(event.data) as NmeaWebSocketMessage;
            this.messageBuffer.push(message);

            // Limit buffer size for memory management
            if (this.messageBuffer.length > 1000) {
              this.messageBuffer = this.messageBuffer.slice(-500);
            }
          } catch (error) {
            console.warn('WebSocket message parse error:', error);
          }
        };

        this.websocket.onclose = (event) => {
          this.websocket = null;

          // AC4.2: Automatic reconnection with exponential backoff
          if (this.isConnected && this.reconnectAttempts < this.maxReconnectAttempts) {
            const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 10000);
            this.reconnectAttempts++;

            setTimeout(() => {
              this.connectWebSocket().catch(console.warn);
            }, delay);
          }
        };

        this.websocket.onerror = (error) => {
          console.error('WebSocket error:', error);
          reject(new Error(`WebSocket connection failed`));
        };

        // Timeout the connection attempt
        setTimeout(() => {
          if (this.websocket?.readyState === WebSocket.CONNECTING) {
            this.websocket.close();
            reject(new Error('WebSocket connection timeout'));
          }
        }, 5000);
      } catch (error) {
        reject(
          new Error(
            `WebSocket setup failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
          ),
        );
      }
    });
  }

  /**
   * AC4.1: Connection pooling for test environment isolation
   */
  getRealtimeMessages(
    maxMessages: number = 10,
  ): Array<{ type: string; data: string; timestamp: number }> {
    return this.messageBuffer.slice(-maxMessages);
  }

  /**
   * AC4.3: Resource cleanup and connection disposal
   */
  async disconnect(): Promise<void> {
    if (this.websocket) {
      this.websocket.close();
      this.websocket = null;
    }

    this.messageBuffer = [];
    this.reconnectAttempts = 0;
    this.isConnected = false;
    this.baseUrl = '';
    this.currentPort = 0;
  }

  /**
   * Get connection info with mock mode status
   */
  getConnectionInfo(): {
    connected: boolean;
    port: number;
    baseUrl: string;
    mockMode: boolean;
    websocketConnected: boolean;
  } {
    return {
      connected: this.isConnected,
      port: this.currentPort,
      baseUrl: this.baseUrl,
      mockMode: this.isMockMode,
      websocketConnected: this.websocket?.readyState === WebSocket.OPEN,
    };
  }

  /**
   * Check if simulator is available (for external usage)
   */
  isMock(): boolean {
    return this.isMockMode;
  }

  /**
   * Get performance metrics for AC2 validation
   */
  getPerformanceMetrics(): Record<string, any> {
    return {
      connection: this.profiler.validateIntegrationTestPerformance('connection-established'),
      injection: this.profiler.validateIntegrationTestPerformance('sentence-injection'),
      scenarioLoad: this.profiler.validateIntegrationTestPerformance('scenario-load'),
      validation: this.profiler.validateIntegrationTestPerformance('pipeline-validation'),
    };
  }
}

/**
 * Convenience function for quick setup in tests
 */
export async function createSimulatorTestClient(
  options?: SimulatorConnectionOptions,
): Promise<SimulatorTestClient> {
  return await SimulatorTestClient.autoConnect(options);
}

/**
 * AC4: Fallback detection - Check if simulator is available for testing
 */
export async function isSimulatorAvailable(
  ports: number[] = [9090, 8080],
  timeout: number = 2000,
): Promise<boolean> {
  for (const port of ports) {
    try {
      const response = await fetch(`http://localhost:${port}/api/status`, {
        method: 'GET',
        signal: AbortSignal.timeout(timeout),
      });

      if (response.ok) {
        const status = await response.json();
        if (status.running) return true;
      }
    } catch {
      // Continue to next port
    }
  }

  return false;
}
