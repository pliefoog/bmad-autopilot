/**
 * Bridge Profile Loader
 *
 * Loads device-specific bridge profiles from YAML configuration files.
 * Handles validation, caching, and error recovery for bridge profiles.
 */

import * as fs from 'fs';
import * as path from 'path';
import { BridgeProfile, ConversionRule, ConversionRuleSet, PGNData } from './NMEAProtocolConverter';
import { DepthConverter } from './converters/DepthConverter';

// YAML parsing - will need to be imported when available
// import * as yaml from 'js-yaml';

interface BridgeProfileYAML {
  name: string;
  manufacturer: string;
  model: string;
  description: string;
  defaultProfile: boolean;
  pcdinUsage: 'minimal' | 'moderate' | 'extensive';
  transmissionPeriods: Record<number, number>;
  conversionRules: Record<number, any>;
  sentenceRules: Record<string, number>;
  notes?: string;
}

export class BridgeProfileLoader {
  private static profileCache = new Map<string, BridgeProfile>();
  private static configDir = path.join(process.cwd(), 'config/bridge-profiles');

  /**
   * Load bridge profile by name
   */
  public static async loadProfile(profileName: string): Promise<BridgeProfile> {
    // Check cache first
    if (this.profileCache.has(profileName)) {
      return this.profileCache.get(profileName)!;
    }

    try {
      const profile = await this.loadProfileFromFile(profileName);
      this.profileCache.set(profileName, profile);
      return profile;
    } catch (error) {
      console.warn(`Failed to load profile ${profileName}:`, error);
      throw new Error(`Bridge profile '${profileName}' not found or invalid`);
    }
  }

  /**
   * Get list of available profiles
   */
  public static getAvailableProfiles(): string[] {
    try {
      const files = fs.readdirSync(this.configDir);
      return files
        .filter((file) => file.endsWith('.yaml') || file.endsWith('.yml'))
        .map((file) => path.basename(file, path.extname(file)));
    } catch (error) {
      console.warn('Could not read bridge profiles directory:', error);
      return ['actisense-ngw1']; // Default fallback
    }
  }

  /**
   * Load and parse profile from YAML file
   */
  private static async loadProfileFromFile(profileName: string): Promise<BridgeProfile> {
    const filePath = path.join(this.configDir, `${profileName}.yaml`);

    if (!fs.existsSync(filePath)) {
      throw new Error(`Profile file not found: ${filePath}`);
    }

    const content = fs.readFileSync(filePath, 'utf-8');

    // For now, create a mock parser until yaml dependency is available
    const profileData = this.parseProfileYAML(content, profileName);

    return this.convertYAMLToProfile(profileData);
  }

  /**
   * Parse YAML content (mock implementation for now)
   */
  private static parseProfileYAML(content: string, profileName: string): BridgeProfileYAML {
    // This is a simplified parser for development
    // In production, this would use a proper YAML parser

    return {
      name: profileName,
      manufacturer: profileName.includes('actisense')
        ? 'Actisense'
        : profileName.includes('yacht')
        ? 'Yacht Devices'
        : 'Unknown',
      model: 'Parsed from YAML',
      description: 'Profile loaded from configuration file',
      defaultProfile: profileName === 'actisense-ngw1',
      pcdinUsage: 'moderate',
      transmissionPeriods: {
        128267: 1000, // Default transmission periods
        128259: 1000,
        130306: 1000,
        129029: 1000,
        127250: 1000,
        127488: 500,
        127505: 2000,
        127508: 1000,
      },
      conversionRules: {
        128267: { sentenceType: 'DBT', pcdinFallback: false },
        128259: { sentenceType: 'VHW', pcdinFallback: false },
        130306: { sentenceType: 'MWV', pcdinFallback: false },
        129029: { sentenceType: 'GGA', pcdinFallback: false },
        127250: { sentenceType: 'HDG', pcdinFallback: false },
        127488: { sentenceType: 'RPM', pcdinFallback: false },
        127505: { pcdinFallback: true },
        127508: { sentenceType: 'XDR', pcdinFallback: true },
      },
      sentenceRules: {
        DBT: 128267,
        VHW: 128259,
        MWV: 130306,
        GGA: 129029,
        HDG: 127250,
        RPM: 127488,
        XDR: 127508,
      },
    };
  }

  /**
   * Convert YAML data to BridgeProfile object
   */
  private static convertYAMLToProfile(yamlData: BridgeProfileYAML): BridgeProfile {
    const rules = new Map<number, ConversionRule>();
    const sentenceRules = new Map<string, ConversionRule>();

    // Process conversion rules
    for (const [pgnStr, ruleData] of Object.entries(yamlData.conversionRules)) {
      const pgn = parseInt(pgnStr);

      const rule: ConversionRule = {
        pgn,
        pcdinFallback: ruleData.pcdinFallback || false,
      };

      // Add native conversion if sentence type is specified
      if (ruleData.sentenceType) {
        rule.nativeConversion = {
          sentenceType: ruleData.sentenceType,
          converter: this.createConverterFunction(pgn, ruleData.sentenceType),
        };

        // Add bidirectional conversion for supported combinations
        rule.bidirectional = {
          sentenceType: ruleData.sentenceType,
          converter: this.createBidirectionalConverter(pgn, ruleData.sentenceType),
        };
      }

      rules.set(pgn, rule);
    }

    // Process sentence rules for bidirectional conversion
    for (const [sentence, pgn] of Object.entries(yamlData.sentenceRules)) {
      const rule = rules.get(pgn);
      if (rule) {
        sentenceRules.set(sentence, rule);
      }
    }

    return {
      name: yamlData.name,
      manufacturer: yamlData.manufacturer,
      model: yamlData.model,
      description: yamlData.description,
      defaultProfile: yamlData.defaultProfile,
      conversionRules: {
        rules,
        sentenceRules,
      },
      pcdinUsage: yamlData.pcdinUsage,
      transmissionPeriods: yamlData.transmissionPeriods,
    };
  }

  /**
   * Create converter function for specific PGN/sentence combination
   */
  private static createConverterFunction(
    pgn: number,
    sentenceType: string,
  ): (data: PGNData) => string[] {
    // Map PGN/sentence combinations to actual converter functions
    if (pgn === 128267 && sentenceType === 'DBT') {
      return DepthConverter.PGN128267ToDBT;
    }

    // Placeholder for other converters
    return (data: PGNData) => {
      const timestamp = new Date().toISOString().split('T')[1].split('.')[0];
      return [`$II${sentenceType},${pgn},placeholder,${timestamp}*00`];
    };
  }

  /**
   * Create bidirectional converter function (sentence → PGN)
   */
  private static createBidirectionalConverter(
    pgn: number,
    sentenceType: string,
  ): (sentence: string) => PGNData | null {
    // Map sentence/PGN combinations to actual converter functions
    if (pgn === 128267 && sentenceType === 'DBT') {
      return DepthConverter.DBTToPGN128267;
    }

    // Placeholder for other bidirectional converters
    return (sentence: string) => null;
  }

  /**
   * Clear profile cache (for testing)
   */
  public static clearCache(): void {
    this.profileCache.clear();
  }
}
