/**
 * PURPOSE: Epic 7/10 Simulator Integration for Story 11.3 AC3.5
 * REQUIREMENT: Integration with existing NMEA Bridge Simulator API and scenario library
 * METHOD: Leverage established scenario library from vendor/test-scenarios/
 */

import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'js-yaml';

export interface ScenarioMetadata {
  name: string;
  category: string;
  path: string;
  description?: string;
  duration?: number;
  parameters?: Record<string, any>;
  epic?: string;
  story?: string;
}

export interface ScenarioLibraryConfig {
  basePath: string;
  categories: string[];
  totalScenarios: number;
  epic11Scenarios: ScenarioMetadata[];
  availableScenarios: ScenarioMetadata[];
}

export class Epic710SimulatorIntegration {
  private scenariosBasePath: string;
  private libraryConfig: ScenarioLibraryConfig | null = null;

  constructor() {
    // AC3.5: Integration with existing Epic 7/10 NMEA Bridge Simulator API
    this.scenariosBasePath = path.join(__dirname, '../../vendor/test-scenarios');
  }

  /**
   * AC4.2: Epic 7/10 simulator integration - Leverage established scenario library
   */
  async loadScenarioLibrary(): Promise<ScenarioLibraryConfig> {
    if (this.libraryConfig) {
      return this.libraryConfig;
    }

    console.log('📚 Loading Epic 7/10 scenario library...');

    const categories: string[] = [];
    const availableScenarios: ScenarioMetadata[] = [];
    let epic11Scenarios: ScenarioMetadata[] = [];

    try {
      // Scan all category directories
      const categoryDirs = await fs.promises.readdir(this.scenariosBasePath, { withFileTypes: true });
      
      for (const dir of categoryDirs) {
        if (dir.isDirectory() && !dir.name.startsWith('.')) {
          categories.push(dir.name);
          
          const categoryPath = path.join(this.scenariosBasePath, dir.name);
          const scenarios = await this.loadScenariosFromCategory(dir.name, categoryPath);
          
          availableScenarios.push(...scenarios);
          
          // Filter Epic 11 specific scenarios
          if (dir.name === 'epic-11-widget-testing' || dir.name === 'story-validation') {
            epic11Scenarios.push(...scenarios);
          }
        }
      }

      this.libraryConfig = {
        basePath: this.scenariosBasePath,
        categories,
        totalScenarios: availableScenarios.length,
        epic11Scenarios,
        availableScenarios
      };

      console.log(`✅ Scenario library loaded: ${this.libraryConfig.totalScenarios} scenarios across ${categories.length} categories`);
      console.log(`📊 Epic 11 scenarios: ${epic11Scenarios.length}`);
      
      return this.libraryConfig;

    } catch (error) {
      throw new Error(`Failed to load scenario library: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * AC4.2: Maintain compatibility with existing test infrastructure
   */
  async getScenariosByCategory(category: string): Promise<ScenarioMetadata[]> {
    const library = await this.loadScenarioLibrary();
    return library.availableScenarios.filter(scenario => scenario.category === category);
  }

  /**
   * Get scenarios specifically for Story 11.3 testing
   */
  async getStory11Scenarios(): Promise<ScenarioMetadata[]> {
    const library = await this.loadScenarioLibrary();
    return library.epic11Scenarios.filter(scenario => 
      scenario.name.includes('11.3') || 
      scenario.name.includes('simulator-discovery') ||
      scenario.name.includes('auto-discovery')
    );
  }

  /**
   * Get basic scenarios for testing auto-discovery functionality
   */
  async getBasicTestScenarios(): Promise<ScenarioMetadata[]> {
    return this.getScenariosByCategory('navigation');
  }

  /**
   * Get autopilot scenarios for testing comprehensive functionality
   */
  async getAutopilotTestScenarios(): Promise<ScenarioMetadata[]> {
    return this.getScenariosByCategory('autopilot');
  }

  /**
   * AC3.5: Integration with existing Epic 7/10 NMEA Bridge Simulator API
   * Load scenario content for execution
   */
  async loadScenarioContent(scenarioName: string): Promise<any> {
    const library = await this.loadScenarioLibrary();
    const scenario = library.availableScenarios.find(s => s.name === scenarioName);
    
    if (!scenario) {
      throw new Error(`Scenario '${scenarioName}' not found in library`);
    }

    try {
      const content = await fs.promises.readFile(scenario.path, 'utf8');
      const parsed = yaml.load(content);
      
      console.log(`📄 Loaded scenario: ${scenarioName} from ${scenario.category}`);
      return parsed;
      
    } catch (error) {
      throw new Error(`Failed to load scenario content: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get scenario recommendations based on test capabilities
   */
  async getRecommendedScenarios(capabilities: {
    simulatorAvailable: boolean;
    webSocketSupported: boolean;
    apiControlSupported: boolean;
    testTier: string;
  }): Promise<ScenarioMetadata[]> {
    const library = await this.loadScenarioLibrary();
    let recommendations: ScenarioMetadata[] = [];

    if (capabilities.testTier === 'full-scenario') {
      // Full integration testing - recommend comprehensive scenarios
      recommendations = await this.getScenariosByCategory('navigation');
      const autopilotScenarios = await this.getScenariosByCategory('autopilot');
      recommendations.push(...autopilotScenarios.slice(0, 2)); // Add 2 autopilot scenarios
      
    } else if (capabilities.testTier === 'api-injection') {
      // API-only testing - recommend simpler scenarios
      recommendations = (await this.getScenariosByCategory('navigation')).slice(0, 3);
      
    } else {
      // Mock testing - recommend basic scenarios for validation
      recommendations = (await this.getBasicTestScenarios()).slice(0, 1);
    }

    return recommendations;
  }

  /**
   * Validate scenario compatibility with current simulator version
   */
  async validateScenarioCompatibility(scenarioName: string): Promise<boolean> {
    try {
      const content = await this.loadScenarioContent(scenarioName);
      
      // Check for required fields and structure
      const requiredFields = ['metadata', 'config', 'messages'];
      const hasRequiredFields = requiredFields.every(field => 
        content && typeof content === 'object' && field in content
      );
      
      return hasRequiredFields;
      
    } catch (error) {
      console.warn(`Scenario compatibility check failed for '${scenarioName}': ${error}`);
      return false;
    }
  }

  /**
   * Get Epic 7/10 simulator configuration for Story 11.3
   */
  getSimulatorConfig(): {
    apiPort: number;
    wsPort: number;
    tcpPort: number;
    bindHost: string;
    defaultScenarios: string[];
  } {
    return {
      apiPort: 9090,   // Simulator Control API
      wsPort: 8080,    // WebSocket server
      tcpPort: 2000,   // TCP/UDP server
      bindHost: '0.0.0.0',
      defaultScenarios: [
        'basic-navigation',
        'coastal-sailing', 
        'autopilot-engagement'
      ]
    };
  }

  // Private helper methods

  private async loadScenariosFromCategory(category: string, categoryPath: string): Promise<ScenarioMetadata[]> {
    const scenarios: ScenarioMetadata[] = [];
    
    try {
      const files = await fs.promises.readdir(categoryPath);
      
      for (const file of files) {
        if (file.endsWith('.yml') || file.endsWith('.yaml')) {
          const scenarioPath = path.join(categoryPath, file);
          const scenarioName = path.basename(file, path.extname(file));
          
          try {
            // Quick metadata extraction without full parsing
            const content = await fs.promises.readFile(scenarioPath, 'utf8');
            const parsed = yaml.load(content) as any;
            
            scenarios.push({
              name: scenarioName,
              category,
              path: scenarioPath,
              description: parsed?.metadata?.description || parsed?.description,
              duration: parsed?.metadata?.duration || parsed?.config?.duration,
              parameters: parsed?.config?.parameters,
              epic: parsed?.metadata?.epic,
              story: parsed?.metadata?.story
            });
            
          } catch (error) {
            console.warn(`Failed to load scenario ${file}: ${error}`);
          }
        }
      }
      
    } catch (error) {
      console.warn(`Failed to read category ${category}: ${error}`);
    }
    
    return scenarios;
  }
}

/**
 * Singleton instance for global access
 */
const epic710Integration = new Epic710SimulatorIntegration();

/**
 * Convenience functions for test usage
 */
export async function getEpic710ScenarioLibrary(): Promise<ScenarioLibraryConfig> {
  return epic710Integration.loadScenarioLibrary();
}

export async function loadScenarioForTesting(scenarioName: string): Promise<any> {
  return epic710Integration.loadScenarioContent(scenarioName);
}

export async function getRecommendedTestScenarios(capabilities: any): Promise<ScenarioMetadata[]> {
  return epic710Integration.getRecommendedScenarios(capabilities);
}

export function getEpic710SimulatorConfig() {
  return epic710Integration.getSimulatorConfig();
}