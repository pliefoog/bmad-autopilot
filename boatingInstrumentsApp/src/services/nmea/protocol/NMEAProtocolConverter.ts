import { DepthConverter } from './converters/DepthConverter';

/**
 * NMEA Protocol Conversion Engine
 *
 * Provides bidirectional conversion between NMEA 2000 PGNs and NMEA 0183 sentences,
 * matching the behavior of physical WiFi bridge devices like Actisense NGW-1,
 * Yacht Devices YBWN-02, and QK-A032.
 *
 * Features:
 * - Native sentence conversion for direct PGN mappings
 * - $PCDIN encapsulation for unmapped PGNs
 * - Device-specific bridge profile support
 * - Configurable conversion rules per device
 * - Bidirectional conversion framework
 */

export interface BridgeProfile {
  name: string;
  manufacturer: string;
  model: string;
  description: string;
  defaultProfile: boolean;
  conversionRules: ConversionRuleSet;
  pcdinUsage: 'minimal' | 'moderate' | 'extensive';
  transmissionPeriods: Record<number, number>; // PGN -> milliseconds
}

export interface ConversionRule {
  pgn: number;
  nativeConversion?: {
    sentenceType: string;
    converter: (data: PGNData) => string[];
  };
  pcdinFallback: boolean;
  bidirectional?: {
    sentenceType: string;
    converter: (sentence: string) => PGNData | null;
  };
}

export interface ConversionRuleSet {
  rules: Map<number, ConversionRule>;
  sentenceRules: Map<string, ConversionRule>;
}

export interface PGNData {
  pgn: number;
  source: number;
  destination: number;
  priority: number;
  data: Uint8Array;
  timestamp: number;
  instanceId?: number;
}

export interface ConversionResult {
  sentences: string[];
  successful: boolean;
  method: 'native' | 'pcdin' | 'failed';
  errors?: string[];
}

export interface PCDINData {
  pgn: number;
  source: number;
  destination: number;
  data: Uint8Array;
}

/**
 * Main Protocol Conversion Engine
 */
export class NMEAProtocolConverter {
  private profile: BridgeProfile;
  private conversionRules: ConversionRuleSet;

  constructor(profileName: string = 'actisense-ngw1') {
    this.profile = this.loadBridgeProfile(profileName);
    this.conversionRules = this.profile.conversionRules;
  }

  /**
   * Convert NMEA 2000 PGN to NMEA 0183 sentence(s)
   * Primary conversion method - may return multiple sentences for single PGN
   */
  public convertPGNToSentences(pgnData: PGNData): ConversionResult {
    const rule = this.conversionRules.rules.get(pgnData.pgn);

    if (rule?.nativeConversion) {
      return this.performNativeConversion(pgnData, rule);
    }

    if (rule?.pcdinFallback || this.profile.pcdinUsage !== 'minimal') {
      return this.performPCDINConversion(pgnData);
    }

    return {
      sentences: [],
      successful: false,
      method: 'failed',
      errors: [`No conversion rule found for PGN ${pgnData.pgn}`],
    };
  }

  /**
   * Convert NMEA 0183 sentence to NMEA 2000 PGN
   * Bidirectional support for future autopilot command processing
   */
  public convertSentenceToPGN(sentence: string): PGNData | null {
    const sentenceType = this.extractSentenceType(sentence);
    const rule = this.conversionRules.sentenceRules.get(sentenceType);

    if (rule?.bidirectional) {
      return rule.bidirectional.converter(sentence);
    }

    // Handle $PCDIN sentences
    if (sentenceType === 'PCDIN') {
      return this.parsePCDINSentence(sentence);
    }

    return null;
  }

  /**
   * Get available bridge profiles
   */
  public static getAvailableProfiles(): string[] {
    // Will be implemented to scan config/bridge-profiles/ directory
    return ['actisense-ngw1', 'actisense-w2k1', 'yacht-devices-ybwn02', 'qk-a032'];
  }

  /**
   * Load device-specific bridge profile
   */
  private loadBridgeProfile(profileName: string): BridgeProfile {
    // For development, use the default profile with actual converter functions
    return this.createDefaultProfile(profileName);
  }

  /**
   * Create default bridge profile for development
   */
  private createDefaultProfile(profileName: string): BridgeProfile {
    const rules = new Map<number, ConversionRule>();
    const sentenceRules = new Map<string, ConversionRule>();

    // Add basic conversion rules (will be expanded in subsequent tasks)
    const basicRules: Array<{ pgn: number; sentence: string; pcdin: boolean }> = [
      { pgn: 128267, sentence: 'DBT', pcdin: false }, // Depth
      { pgn: 128259, sentence: 'VHW', pcdin: false }, // Speed
      { pgn: 130306, sentence: 'MWV', pcdin: false }, // Wind
      { pgn: 129029, sentence: 'GGA', pcdin: false }, // GPS
      { pgn: 127250, sentence: 'HDG', pcdin: false }, // Heading
      { pgn: 127488, sentence: 'RPM', pcdin: false }, // Engine RPM
      { pgn: 127505, sentence: '', pcdin: true }, // Tanks (PCDIN only)
      { pgn: 127508, sentence: 'XDR', pcdin: true }, // Battery
    ];

    for (const rule of basicRules) {
      const conversionRule: ConversionRule = {
        pgn: rule.pgn,
        pcdinFallback: rule.pcdin,
      };

      if (rule.sentence) {
        conversionRule.nativeConversion = {
          sentenceType: rule.sentence,
          converter: this.createConverterFunction(rule.pgn, rule.sentence),
        };

        // Add bidirectional conversion for supported combinations
        conversionRule.bidirectional = {
          sentenceType: rule.sentence,
          converter: this.createBidirectionalConverter(rule.pgn, rule.sentence),
        };

        sentenceRules.set(rule.sentence, conversionRule);
      }

      rules.set(rule.pgn, conversionRule);
    }

    return {
      name: profileName,
      manufacturer: profileName.includes('actisense')
        ? 'Actisense'
        : profileName.includes('yacht')
        ? 'Yacht Devices'
        : 'Generic',
      model: 'Development Profile',
      description: 'Default development profile with basic conversion rules',
      defaultProfile: profileName === 'actisense-ngw1',
      conversionRules: {
        rules,
        sentenceRules,
      },
      pcdinUsage: 'moderate',
      transmissionPeriods: {
        128267: 1000, // Depth - 1Hz
        128259: 1000, // Speed - 1Hz
        130306: 1000, // Wind - 1Hz
        129029: 1000, // GPS - 1Hz
        127250: 1000, // Heading - 1Hz
        127488: 500, // Engine - 2Hz
        127505: 2000, // Tanks - 0.5Hz
        127508: 1000, // Battery - 1Hz
      },
    };
  }

  /**
   * Perform native PGN → sentence conversion
   */
  private performNativeConversion(pgnData: PGNData, rule: ConversionRule): ConversionResult {
    try {
      const sentences = rule.nativeConversion!.converter(pgnData);
      return {
        sentences,
        successful: true,
        method: 'native',
      };
    } catch (error) {
      return {
        sentences: [],
        successful: false,
        method: 'failed',
        errors: [
          `Native conversion failed: ${error instanceof Error ? error.message : String(error)}`,
        ],
      };
    }
  }

  /**
   * Perform $PCDIN encapsulation
   */
  private performPCDINConversion(pgnData: PGNData): ConversionResult {
    try {
      const pcdinSentence = this.encapsulatePCDIN({
        pgn: pgnData.pgn,
        source: pgnData.source,
        destination: pgnData.destination,
        data: pgnData.data,
      });

      return {
        sentences: [pcdinSentence],
        successful: true,
        method: 'pcdin',
      };
    } catch (error) {
      return {
        sentences: [],
        successful: false,
        method: 'failed',
        errors: [
          `PCDIN conversion failed: ${error instanceof Error ? error.message : String(error)}`,
        ],
      };
    }
  }

  /**
   * Encapsulate PGN data in $PCDIN format
   * Format: $PCDIN,<PGN hex>,<src>,<dst>,<data bytes>*checksum
   */
  private encapsulatePCDIN(pcdinData: PCDINData): string {
    const pgnHex = pcdinData.pgn.toString(16).toUpperCase().padStart(6, '0');
    const srcHex = pcdinData.source.toString(16).toUpperCase().padStart(2, '0');
    const dstHex = pcdinData.destination.toString(16).toUpperCase().padStart(2, '0');
    const dataHex = Array.from(pcdinData.data)
      .map((byte) => byte.toString(16).toUpperCase().padStart(2, '0'))
      .join('');

    const sentence = `$PCDIN,${pgnHex},${srcHex},${dstHex},${dataHex}`;
    const checksum = this.calculateNMEAChecksum(sentence.substring(1)); // Skip leading $

    return `${sentence}*${checksum}`;
  }

  /**
   * Parse $PCDIN sentence back to PGN data
   */
  private parsePCDINSentence(sentence: string): PGNData | null {
    const match = sentence.match(
      /^\$PCDIN,([0-9A-F]{6}),([0-9A-F]{2}),([0-9A-F]{2}),([0-9A-F]*)\*([0-9A-F]{2})$/,
    );

    if (!match) {
      return null;
    }

    const [, pgnHex, srcHex, dstHex, dataHex, checksumHex] = match;

    // Verify checksum
    const expectedChecksum = this.calculateNMEAChecksum(
      `PCDIN,${pgnHex},${srcHex},${dstHex},${dataHex || ''}`,
    );
    if (checksumHex !== expectedChecksum) {
      return null;
    }

    const pgn = parseInt(pgnHex, 16);
    const source = parseInt(srcHex, 16);
    const destination = parseInt(dstHex, 16);

    const data = new Uint8Array(
      dataHex ? dataHex.match(/.{2}/g)?.map((hex) => parseInt(hex, 16)) || [] : [],
    );

    return {
      pgn,
      source,
      destination,
      priority: 6, // Default priority for PCDIN
      data,
      timestamp: Date.now(),
    };
  }

  /**
   * Extract sentence type from NMEA sentence
   */
  private extractSentenceType(sentence: string): string {
    // Handle $PCDIN sentences first (special case)
    if (sentence.startsWith('$PCDIN')) {
      return 'PCDIN';
    }

    const match = sentence.match(/^\$([A-Z]{2})([A-Z]{3})/);
    if (match) {
      return match[2]; // Return sentence type (e.g., GGA, RMC, DBT)
    }

    return '';
  }

  /**
   * Calculate NMEA checksum
   */
  private calculateNMEAChecksum(sentence: string): string {
    let checksum = 0;
    for (let i = 0; i < sentence.length; i++) {
      checksum ^= sentence.charCodeAt(i);
    }
    return checksum.toString(16).toUpperCase().padStart(2, '0');
  }

  /**
   * Get profile information
   */
  public getProfile(): BridgeProfile {
    return this.profile;
  }

  /**
   * Get supported PGNs for current profile
   */
  public getSupportedPGNs(): number[] {
    return Array.from(this.conversionRules.rules.keys());
  }

  /**
   * Get supported sentence types for current profile
   */
  public getSupportedSentenceTypes(): string[] {
    return Array.from(this.conversionRules.sentenceRules.keys());
  }

  /**
   * Create converter function for specific PGN/sentence combination
   */
  private createConverterFunction(pgn: number, sentenceType: string): (data: PGNData) => string[] {
    // Map PGN/sentence combinations to actual converter functions
    if (pgn === 128267 && sentenceType === 'DBT') {
      return DepthConverter.PGN128267ToDBT;
    }

    // Basic converter implementations for architecture demonstration
    if (pgn === 128259 && sentenceType === 'VHW') {
      return this.createSpeedConverter();
    }

    if (pgn === 130306 && sentenceType === 'MWV') {
      return this.createWindConverter();
    }

    if (pgn === 129029 && sentenceType === 'GGA') {
      return this.createGPSConverter();
    }

    if (pgn === 127250 && sentenceType === 'HDG') {
      return this.createHeadingConverter();
    }

    if (pgn === 127488 && sentenceType === 'RPM') {
      return this.createEngineConverter();
    }

    // Fallback for unsupported combinations
    return (data: PGNData) => [];
  }

  /**
   * Create bidirectional converter function (sentence → PGN)
   */
  private createBidirectionalConverter(
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
   * Create speed converter for PGN 128259 → VHW
   */
  private createSpeedConverter(): (data: PGNData) => string[] {
    return (pgnData: PGNData): string[] => {
      // VHW: Water speed and heading
      // Format: $--VHW,x.x,T,x.x,M,x.x,N,x.x,K*hh
      const speed_knots = 5.2; // Placeholder data from PGN
      const heading = 45.0; // Placeholder data from PGN

      const sentence = `$IIVHW,${heading.toFixed(1)},T,,M,${speed_knots.toFixed(1)},N,${(
        speed_knots * 1.852
      ).toFixed(1)},K`;
      const checksum = this.calculateNMEAChecksum(sentence.substring(1));
      return [`${sentence}*${checksum}`];
    };
  }

  /**
   * Create wind converter for PGN 130306 → MWV
   */
  private createWindConverter(): (data: PGNData) => string[] {
    return (pgnData: PGNData): string[] => {
      // MWV: Wind speed and angle
      // Format: $--MWV,x.x,a,x.x,a*hh (angle, reference, speed, unit)
      const wind_angle = 120.0; // Placeholder data
      const wind_speed = 8.5; // Placeholder data

      const sentence = `$IIMWV,${wind_angle.toFixed(1)},R,${wind_speed.toFixed(1)},N,A`;
      const checksum = this.calculateNMEAChecksum(sentence.substring(1));
      return [`${sentence}*${checksum}`];
    };
  }

  /**
   * Create GPS converter for PGN 129029 → GGA
   */
  private createGPSConverter(): (data: PGNData) => string[] {
    return (pgnData: PGNData): string[] => {
      // GGA: GPS fix data
      // Format: $--GGA,hhmmss.ss,llll.ll,a,yyyyy.yy,a,x,xx,x.x,x.x,M,x.x,M,x.x,xxxx*hh
      const time = '120000.00'; // Placeholder
      const lat = '5230.5000,N'; // Placeholder
      const lon = '00131.2000,E'; // Placeholder

      const sentence = `$IIGGA,${time},${lat},${lon},1,08,1.0,50.0,M,45.0,M,,`;
      const checksum = this.calculateNMEAChecksum(sentence.substring(1));
      return [`${sentence}*${checksum}`];
    };
  }

  /**
   * Create heading converter for PGN 127250 → HDG
   */
  private createHeadingConverter(): (data: PGNData) => string[] {
    return (pgnData: PGNData): string[] => {
      // HDG: Heading, deviation & variation
      // Format: $--HDG,x.x,x.x,a,x.x,a*hh
      const heading = 90.5; // Placeholder data
      const deviation = 2.1; // Placeholder
      const variation = 5.2; // Placeholder

      const sentence = `$IIHDG,${heading.toFixed(1)},${deviation.toFixed(1)},E,${variation.toFixed(
        1,
      )},W`;
      const checksum = this.calculateNMEAChecksum(sentence.substring(1));
      return [`${sentence}*${checksum}`];
    };
  }

  /**
   * Create engine converter for PGN 127488 → RPM
   */
  private createEngineConverter(): (data: PGNData) => string[] {
    return (pgnData: PGNData): string[] => {
      // RPM: Engine revolutions
      // Format: $--RPM,a,x,x.x,x.x,A*hh
      const rpm = 2850; // Placeholder data
      const pitch = 45.0; // Placeholder

      const sentence = `$IIRPM,E,1,${rpm.toFixed(1)},${pitch.toFixed(1)},A`;
      const checksum = this.calculateNMEAChecksum(sentence.substring(1));
      return [`${sentence}*${checksum}`];
    };
  }
}
