/**
 * PURPOSE: SimulatorTestClient for Story 11.1 AC2 - API Message Injection Framework
 * REQUIREMENT: Tier 2 Integration Testing with NMEA Bridge Simulator auto-discovery
 * METHOD: HTTP API communication with automatic port discovery and retry logic
 */

import { PerformanceProfiler } from './testHelpers';

export interface SimulatorConnectionOptions {
  ports?: number[];
  timeout?: number;
  retryAttempts?: number;
  backoffMultiplier?: number;
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
}

export class SimulatorTestClient {
  private baseUrl: string = '';
  private isConnected: boolean = false;
  private currentPort: number = 0;
  private profiler: PerformanceProfiler;
  
  // AC2 Requirement: Auto-discovery on ports [9090, 8080] with 5-second timeout
  private static readonly DEFAULT_PORTS = [9090, 8080];
  private static readonly DEFAULT_TIMEOUT = 5000;
  private static readonly DEFAULT_RETRY_ATTEMPTS = 3;

  constructor() {
    this.profiler = new PerformanceProfiler();
  }

  /**
   * AC2.1: Auto-discovery system for ports [9090, 8080] with 5-second timeout
   */
  static async autoConnect(options: SimulatorConnectionOptions = {}): Promise<SimulatorTestClient> {
    const {
      ports = SimulatorTestClient.DEFAULT_PORTS,
      timeout = SimulatorTestClient.DEFAULT_TIMEOUT,
      retryAttempts = SimulatorTestClient.DEFAULT_RETRY_ATTEMPTS,
      backoffMultiplier = 1.5
    } = options;

    const client = new SimulatorTestClient();
    client.profiler.start();

    for (const port of ports) {
      let attempt = 0;
      let delay = 1000; // Initial delay

      while (attempt < retryAttempts) {
        try {
          const response = await fetch(`http://localhost:${port}/api/status`, {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' },
            signal: AbortSignal.timeout(timeout)
          });

          if (response.ok) {
            const status = await response.json();
            
            if (status.running) {
              client.baseUrl = `http://localhost:${port}`;
              client.currentPort = port;
              client.isConnected = true;
              
              client.profiler.mark('connection-established');
              const perf = client.profiler.validateIntegrationTestPerformance('connection-established');
              
              if (!perf.passed) {
                console.warn(`SimulatorTestClient connection time ${perf.time}ms exceeds AC2 threshold ${perf.threshold}ms`);
              }

              return client;
            }
          }
        } catch (error) {
          attempt++;
          
          if (attempt < retryAttempts) {
            // AC2.1: Exponential backoff retry logic
            await new Promise(resolve => setTimeout(resolve, delay));
            delay *= backoffMultiplier;
          }
        }
      }
    }

    throw new Error(`Failed to connect to NMEA Bridge Simulator on ports ${ports.join(', ')} after ${retryAttempts} attempts`);
  }

  /**
   * AC2.3: Targeted NMEA sentence injection capabilities
   */
  async injectNmeaMessage(sentence: string, options: Partial<NmeaInjectionOptions> = {}): Promise<void> {
    if (!this.isConnected) {
      throw new Error('SimulatorTestClient not connected. Call autoConnect() first.');
    }

    const {
      repeat = 1,
      interval = 1000,
      validate = true
    } = options;

    this.profiler.start();

    try {
      const response = await fetch(`${this.baseUrl}/api/inject-data`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sentence,
          repeat,
          interval,
          validate
        })
      });

      if (!response.ok) {
        throw new Error(`Failed to inject NMEA sentence: ${response.statusText}`);
      }

      this.profiler.mark('sentence-injection');
      const perf = this.profiler.validateIntegrationTestPerformance('sentence-injection');
      
      if (!perf.passed) {
        console.warn(`NMEA sentence injection time ${perf.time}ms exceeds AC2 threshold ${perf.threshold}ms`);
      }

    } catch (error) {
      throw new Error(`NMEA sentence injection failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * AC2.2: Real NMEA pipeline testing with scenario loading
   */
  async loadScenario(options: ScenarioLoadOptions): Promise<void> {
    if (!this.isConnected) {
      throw new Error('SimulatorTestClient not connected. Call autoConnect() first.');
    }

    this.profiler.start();

    try {
      const response = await fetch(`${this.baseUrl}/api/scenarios/load`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          scenario: options.scenarioName,
          parameters: options.parameters || {},
          autoStart: options.autoStart !== false
        })
      });

      if (!response.ok) {
        throw new Error(`Failed to load scenario '${options.scenarioName}': ${response.statusText}`);
      }

      this.profiler.mark('scenario-load');
      const perf = this.profiler.validateIntegrationTestPerformance('scenario-load');
      
      if (!perf.passed) {
        console.warn(`Scenario load time ${perf.time}ms exceeds AC2 threshold ${perf.threshold}ms`);
      }

    } catch (error) {
      throw new Error(`Scenario loading failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * AC2.4: Pipeline validation and state synchronization testing
   */
  async validatePipelineState(expectedState: Record<string, any>, timeoutMs: number = 5000): Promise<boolean> {
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
            console.warn(`Pipeline validation time ${perf.time}ms exceeds AC2 threshold ${perf.threshold}ms`);
          }

          return true;
        }

        // Wait before next check
        await new Promise(resolve => setTimeout(resolve, 100));

      } catch (error) {
        console.warn('Pipeline state validation error:', error);
      }
    }

    return false;
  }

  /**
   * Disconnect and cleanup
   */
  async disconnect(): Promise<void> {
    this.isConnected = false;
    this.baseUrl = '';
    this.currentPort = 0;
  }

  /**
   * Get connection info
   */
  getConnectionInfo(): { connected: boolean; port: number; baseUrl: string } {
    return {
      connected: this.isConnected,
      port: this.currentPort,
      baseUrl: this.baseUrl
    };
  }

  /**
   * Get performance metrics for AC2 validation
   */
  getPerformanceMetrics(): Record<string, any> {
    return {
      connection: this.profiler.validateIntegrationTestPerformance('connection-established'),
      injection: this.profiler.validateIntegrationTestPerformance('sentence-injection'),
      scenarioLoad: this.profiler.validateIntegrationTestPerformance('scenario-load'),
      validation: this.profiler.validateIntegrationTestPerformance('pipeline-validation')
    };
  }
}

/**
 * Convenience function for quick setup in tests
 */
export async function createSimulatorTestClient(options?: SimulatorConnectionOptions): Promise<SimulatorTestClient> {
  return await SimulatorTestClient.autoConnect(options);
}

/**
 * AC4: Fallback detection - Check if simulator is available for testing
 */
export async function isSimulatorAvailable(ports: number[] = [9090, 8080], timeout: number = 2000): Promise<boolean> {
  for (const port of ports) {
    try {
      const response = await fetch(`http://localhost:${port}/api/status`, {
        method: 'GET',
        signal: AbortSignal.timeout(timeout)
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