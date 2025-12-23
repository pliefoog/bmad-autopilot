/**
 * PURPOSE: TestTierManager for Story 11.1 AC4 - Testing Architecture Integration and Fallback Systems
 * REQUIREMENT: All three testing tiers operational with automatic fallback when simulator unavailable
 * METHOD: Clean separation between unit, integration, and end-to-end test scopes with graceful degradation
 */

import { MockNmeaService } from '../mocks/mockNmeaService';
import { SimulatorTestClient, isSimulatorAvailable } from './SimulatorTestClient';
import { ScenarioEngine } from './ScenarioEngine';
import { PerformanceProfiler } from './testHelpers';

export enum TestTier {
  TIER1_UNIT = 'tier1-unit',
  TIER2_INTEGRATION = 'tier2-integration',
  TIER3_E2E = 'tier3-e2e',
}

export interface TestContext {
  tier: TestTier;
  simulatorAvailable: boolean;
  fallbackActive: boolean;
  performance: {
    tier1UnitThreshold: number; // AC1: <50ms
    tier2IntegrationThreshold: number; // AC2: <2000ms
    tier3E2EThreshold: number; // AC3: <30 seconds
  };
}

export interface TestCapabilities {
  mockNmeaService: boolean;
  simulatorInjection: boolean;
  scenarioExecution: boolean;
  crossPlatformTesting: boolean;
  performanceValidation: boolean;
}

export interface FallbackConfiguration {
  enableAutoFallback: boolean;
  simulatorCheckTimeout: number;
  retryAttempts: number;
  fallbackNotifications: boolean;
}

export class TestTierManager {
  private currentTier: TestTier = TestTier.TIER1_UNIT;
  private simulatorAvailable: boolean = false;
  private fallbackActive: boolean = false;
  private profiler: PerformanceProfiler;
  private mockNmeaService?: MockNmeaService;
  private simulatorClient?: SimulatorTestClient;
  private scenarioEngine?: ScenarioEngine;

  // AC4 Requirements: Performance targets across all tiers
  private static readonly DEFAULT_CONFIG: FallbackConfiguration = {
    enableAutoFallback: true,
    simulatorCheckTimeout: 2000,
    retryAttempts: 3,
    fallbackNotifications: true,
  };

  constructor(private config: FallbackConfiguration = TestTierManager.DEFAULT_CONFIG) {
    this.profiler = new PerformanceProfiler();
  }

  /**
   * AC4.1: Initialize testing architecture with proper framework integration
   */
  async initialize(preferredTier: TestTier = TestTier.TIER2_INTEGRATION): Promise<TestContext> {
    this.profiler.start();

    try {
      // AC4.2: Check simulator availability for higher tiers
      if (preferredTier !== TestTier.TIER1_UNIT) {
        this.simulatorAvailable = await isSimulatorAvailable(
          [9090, 8080],
          this.config.simulatorCheckTimeout,
        );
      }

      // AC4.2: Automatic fallback logic
      const targetTier = await this.determineTier(preferredTier);
      await this.setupTier(targetTier);

      this.profiler.mark('tier-initialization');
      const perf = this.getPerformanceForTier(targetTier);

      return {
        tier: this.currentTier,
        simulatorAvailable: this.simulatorAvailable,
        fallbackActive: this.fallbackActive,
        performance: {
          tier1UnitThreshold: 50,
          tier2IntegrationThreshold: 2000,
          tier3E2EThreshold: 30000,
        },
      };
    } catch (error) {
      // AC4.2: Fallback to Tier 1 on initialization failure
      if (this.config.enableAutoFallback) {
        return await this.fallbackToTier1('Initialization failed');
      }
      throw error;
    }
  }

  /**
   * AC4.2: Automatic fallback from Tier 2/3 to Tier 1 when simulator unavailable
   */
  private async determineTier(preferredTier: TestTier): Promise<TestTier> {
    switch (preferredTier) {
      case TestTier.TIER3_E2E:
        if (this.simulatorAvailable) {
          return TestTier.TIER3_E2E;
        }
        this.logFallback('Tier 3 E2E', 'Tier 2 Integration', 'Simulator unavailable');
      // Fall through to Tier 2

      case TestTier.TIER2_INTEGRATION:
        if (this.simulatorAvailable) {
          return TestTier.TIER2_INTEGRATION;
        }
        this.logFallback('Tier 2 Integration', 'Tier 1 Unit', 'Simulator unavailable');
      // Fall through to Tier 1

      case TestTier.TIER1_UNIT:
      default:
        return TestTier.TIER1_UNIT;
    }
  }

  /**
   * AC4.1: Setup testing tier with proper framework integration
   */
  private async setupTier(tier: TestTier): Promise<void> {
    this.currentTier = tier;

    switch (tier) {
      case TestTier.TIER1_UNIT:
        await this.setupTier1();
        break;

      case TestTier.TIER2_INTEGRATION:
        await this.setupTier2();
        break;

      case TestTier.TIER3_E2E:
        await this.setupTier3();
        break;
    }
  }

  /**
   * Tier 1: Static Mocks (Unit Tests) Infrastructure
   */
  private async setupTier1(): Promise<void> {
    // Initialize mock NMEA service for isolated testing
    this.mockNmeaService = new MockNmeaService();

    // Tier 1 doesn't need simulator connectivity
    this.fallbackActive = !this.simulatorAvailable && this.currentTier === TestTier.TIER1_UNIT;
  }

  /**
   * Tier 2: API Message Injection (Integration Tests) Framework
   */
  private async setupTier2(): Promise<void> {
    try {
      // Initialize both mock service and simulator client
      this.mockNmeaService = new MockNmeaService();
      this.simulatorClient = await SimulatorTestClient.autoConnect({
        timeout: this.config.simulatorCheckTimeout,
        retryAttempts: this.config.retryAttempts,
      });
    } catch (error) {
      if (this.config.enableAutoFallback) {
        await this.fallbackToTier1('Tier 2 setup failed');
        throw new Error(`Tier 2 setup failed, fallback to Tier 1 activated: ${error}`);
      }
      throw error;
    }
  }

  /**
   * Tier 3: Full Scenario Integration (End-to-End Tests) System
   */
  private async setupTier3(): Promise<void> {
    try {
      // Initialize all components for E2E testing
      this.mockNmeaService = new MockNmeaService();
      this.simulatorClient = await SimulatorTestClient.autoConnect({
        timeout: this.config.simulatorCheckTimeout,
        retryAttempts: this.config.retryAttempts,
      });
      this.scenarioEngine = new ScenarioEngine();
    } catch (error) {
      if (this.config.enableAutoFallback) {
        await this.fallbackToTier1('Tier 3 setup failed');
        throw new Error(`Tier 3 setup failed, fallback to Tier 1 activated: ${error}`);
      }
      throw error;
    }
  }

  /**
   * AC4.2: Fallback to Tier 1 with notification
   */
  private async fallbackToTier1(reason: string): Promise<TestContext> {
    this.fallbackActive = true;
    this.currentTier = TestTier.TIER1_UNIT;

    await this.setupTier1();

    if (this.config.fallbackNotifications) {
      console.warn(`🔄 Test Tier Fallback: ${reason}. Running Tier 1 (Static Mocks) tests only.`);
    }

    return {
      tier: this.currentTier,
      simulatorAvailable: false,
      fallbackActive: true,
      performance: {
        tier1UnitThreshold: 50,
        tier2IntegrationThreshold: 2000,
        tier3E2EThreshold: 30000,
      },
    };
  }

  /**
   * AC4.3: Get current test capabilities based on active tier
   */
  getCapabilities(): TestCapabilities {
    return {
      mockNmeaService: !!this.mockNmeaService,
      simulatorInjection: !!this.simulatorClient,
      scenarioExecution: !!this.scenarioEngine,
      crossPlatformTesting: this.currentTier === TestTier.TIER3_E2E,
      performanceValidation: true, // Available in all tiers
    };
  }

  /**
   * AC4.3: Performance targets validation across all tiers
   */
  validatePerformance(testName: string, tier?: TestTier): { passed: boolean; details: any } {
    const targetTier = tier || this.currentTier;

    switch (targetTier) {
      case TestTier.TIER1_UNIT:
        return {
          passed: this.profiler.validateUnitTestPerformance(testName).passed,
          details: this.profiler.validateUnitTestPerformance(testName),
        };

      case TestTier.TIER2_INTEGRATION:
        return {
          passed: this.profiler.validateIntegrationTestPerformance(testName).passed,
          details: this.profiler.validateIntegrationTestPerformance(testName),
        };

      case TestTier.TIER3_E2E:
        return {
          passed: this.profiler.validateE2ETestPerformance(testName).passed,
          details: this.profiler.validateE2ETestPerformance(testName),
        };

      default:
        return { passed: false, details: { error: 'Unknown tier' } };
    }
  }

  /**
   * AC4.4: Clean separation between test scopes
   */
  isTestAllowedInTier(testType: 'unit' | 'integration' | 'e2e'): boolean {
    switch (this.currentTier) {
      case TestTier.TIER1_UNIT:
        return testType === 'unit';

      case TestTier.TIER2_INTEGRATION:
        return testType === 'unit' || testType === 'integration';

      case TestTier.TIER3_E2E:
        return true; // All test types allowed in Tier 3

      default:
        return false;
    }
  }

  /**
   * Get testing components for current tier
   */
  getTestingComponents(): {
    mockNmeaService?: MockNmeaService;
    simulatorClient?: SimulatorTestClient;
    scenarioEngine?: ScenarioEngine;
    profiler: PerformanceProfiler;
  } {
    return {
      mockNmeaService: this.mockNmeaService,
      simulatorClient: this.simulatorClient,
      scenarioEngine: this.scenarioEngine,
      profiler: this.profiler,
    };
  }

  /**
   * Get performance metrics for tier
   */
  private getPerformanceForTier(tier: TestTier): any {
    const result = this.profiler.validateUnitTestPerformance('tier-initialization');

    switch (tier) {
      case TestTier.TIER2_INTEGRATION:
        return this.profiler.validateIntegrationTestPerformance('tier-initialization');
      case TestTier.TIER3_E2E:
        return this.profiler.validateE2ETestPerformance('tier-initialization');
      default:
        return result;
    }
  }

  /**
   * Log fallback event
   */
  private logFallback(fromTier: string, toTier: string, reason: string): void {
    if (this.config.fallbackNotifications) {
      console.warn(`🔄 Testing Tier Fallback: ${fromTier} → ${toTier} (${reason})`);
    }
  }

  /**
   * Cleanup resources
   */
  async cleanup(): Promise<void> {
    if (this.mockNmeaService) {
      this.mockNmeaService.destroy();
    }

    if (this.simulatorClient) {
      await this.simulatorClient.disconnect();
    }

    if (this.scenarioEngine) {
      await this.scenarioEngine.cleanup();
    }
  }

  /**
   * Get current test context
   */
  getCurrentContext(): TestContext {
    return {
      tier: this.currentTier,
      simulatorAvailable: this.simulatorAvailable,
      fallbackActive: this.fallbackActive,
      performance: {
        tier1UnitThreshold: 50,
        tier2IntegrationThreshold: 2000,
        tier3E2EThreshold: 30000,
      },
    };
  }
}

/**
 * Global test tier manager instance
 */
let globalTestTierManager: TestTierManager | null = null;

/**
 * Get or create global test tier manager
 */
export function getTestTierManager(config?: FallbackConfiguration): TestTierManager {
  if (!globalTestTierManager) {
    globalTestTierManager = new TestTierManager(config);
  }
  return globalTestTierManager;
}

/**
 * Reset global test tier manager (for testing)
 */
export function resetTestTierManager(): void {
  if (globalTestTierManager) {
    globalTestTierManager.cleanup();
    globalTestTierManager = null;
  }
}
