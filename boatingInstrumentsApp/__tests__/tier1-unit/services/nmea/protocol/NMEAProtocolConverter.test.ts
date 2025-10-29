/**
 * NMEA Protocol Converter Tests
 * 
 * Comprehensive test suite for NMEA 2000 ↔ NMEA 0183 protocol conversion.
 * Tests core conversion functionality, $PCDIN encapsulation, and device profiles.
 */

import { NMEAProtocolConverter, PGNData, ConversionResult } from '../../../../src/services/nmea/protocol/NMEAProtocolConverter';
import { DepthConverter } from '../../../../src/services/nmea/protocol/converters/DepthConverter';

describe('NMEAProtocolConverter', () => {
  let converter: NMEAProtocolConverter;

  beforeEach(() => {
    converter = new NMEAProtocolConverter('actisense-ngw1');
  });

  describe('Core Protocol Conversion', () => {
    test('should initialize with default profile', () => {
      const profile = converter.getProfile();
      expect(profile.name).toBe('actisense-ngw1');
      expect(profile.manufacturer).toContain('Actisense');
    });

    test('should list supported PGNs', () => {
      const pgns = converter.getSupportedPGNs();
      expect(pgns).toContain(128267); // Depth
      expect(pgns).toContain(128259); // Speed
      expect(pgns).toContain(130306); // Wind
      expect(pgns).toContain(129029); // GPS
    });

    test('should list supported sentence types', () => {
      const sentences = converter.getSupportedSentenceTypes();
      expect(sentences).toContain('DBT'); // Depth
      expect(sentences).toContain('VHW'); // Speed
      expect(sentences).toContain('MWV'); // Wind
      expect(sentences).toContain('GGA'); // GPS
    });
  });

  describe('$PCDIN Encapsulation', () => {
    test('should encapsulate PGN in $PCDIN format', () => {
      const pgnData: PGNData = {
        pgn: 127505,        // Fluid Level (tanks)
        source: 5,
        destination: 255,
        priority: 6,
        data: new Uint8Array([0x01, 0x02, 0x03, 0x04]),
        timestamp: Date.now()
      };

      const result = converter.convertPGNToSentences(pgnData);
      
      expect(result.successful).toBe(true);
      expect(result.method).toBe('pcdin');
      expect(result.sentences).toHaveLength(1);
      
      const sentence = result.sentences[0];
      expect(sentence).toMatch(/^\$PCDIN,01F211,05,FF,01020304\*[0-9A-F]{2}$/);
    });

    test('should parse $PCDIN sentence back to PGN', () => {
      const pcdinSentence = '$PCDIN,01F211,05,FF,01020304*24';
      
      const pgnData = converter.convertSentenceToPGN(pcdinSentence);
      
      expect(pgnData).not.toBeNull();
      expect(pgnData!.pgn).toBe(127505);
      expect(pgnData!.source).toBe(5);
      expect(pgnData!.destination).toBe(255);
      expect(Array.from(pgnData!.data)).toEqual([1, 2, 3, 4]);
    });

    test('should validate $PCDIN checksum', () => {
      const validSentence = '$PCDIN,01F211,05,FF,01020304*24';
      const invalidSentence = '$PCDIN,01F211,05,FF,01020304*00';
      
      const validResult = converter.convertSentenceToPGN(validSentence);
      const invalidResult = converter.convertSentenceToPGN(invalidSentence);
      
      expect(validResult).not.toBeNull();
      expect(invalidResult).toBeNull();
    });
  });

  describe('Checksum Calculation', () => {
    test('should calculate correct NMEA checksums', () => {
      // Test known checksum values
      const testCases = [
        { sentence: 'GPGGA,123519,4807.038,N,01131.000,E,1,08,0.9,545.4,M,46.9,M,,', expected: '47' },
        { sentence: 'IIDBT,32.8,f,10.0,M,5.5,F', expected: '19' },
        { sentence: 'PCDIN,01F211,05,FF,01020304', expected: '24' }
      ];

      for (const testCase of testCases) {
        // Access private method via any cast for testing
        const checksum = (converter as any).calculateNMEAChecksum(testCase.sentence);
        expect(checksum).toBe(testCase.expected);
      }
    });
  });

  describe('Device Profile Support', () => {
    test('should support multiple bridge profiles', () => {
      const profiles = NMEAProtocolConverter.getAvailableProfiles();
      
      expect(profiles).toContain('actisense-ngw1');
      expect(profiles).toContain('yacht-devices-ybwn02');
    });

    test('should handle unknown profile gracefully', () => {
      expect(() => {
        new NMEAProtocolConverter('unknown-device');
      }).not.toThrow();
    });
  });
});

describe('DepthConverter', () => {
  describe('PGN 128267 → DBT Conversion', () => {
    test('should convert depth PGN to DBT sentence', () => {
      // Create PGN 128267 data for 10.5 meters depth
      const data = new Uint8Array(8);
      data[0] = 0x01;  // SID
      data[1] = 0x00;  // Instance 0
      
      // Depth: 10.5m = 1050 centimeters
      const depthCm = 1050;
      data[2] = depthCm & 0xFF;
      data[3] = (depthCm >> 8) & 0xFF;
      data[4] = (depthCm >> 16) & 0xFF;
      data[5] = (depthCm >> 24) & 0xFF;
      
      data[6] = 0xFF;  // No offset
      data[7] = 0xFF;

      const pgnData: PGNData = {
        pgn: 128267,
        source: 1,
        destination: 255,
        priority: 5,
        data,
        timestamp: Date.now()
      };

      const sentences = DepthConverter.PGN128267ToDBT(pgnData);
      
      expect(sentences).toHaveLength(1);
      const sentence = sentences[0];
      
      // Should contain depth in feet (10.5m ≈ 34.4ft), meters (10.5), and fathoms (5.7)
      expect(sentence).toMatch(/^\$IIDBT,34\.[0-9],f,10\.5,M,5\.[0-9],F\*[0-9A-F]{2}$/);
    });

    test('should handle zero depth gracefully', () => {
      const data = new Uint8Array(8);
      // All zeros = invalid depth
      
      const pgnData: PGNData = {
        pgn: 128267,
        source: 1,
        destination: 255,
        priority: 5,
        data,
        timestamp: Date.now()
      };

      const sentences = DepthConverter.PGN128267ToDBT(pgnData);
      expect(sentences).toHaveLength(0);
    });
  });

  describe('Bidirectional Conversion', () => {
    test('should convert DBT sentence back to PGN 128267', () => {
      const dbtSentence = '$IIDBT,34.4,f,10.5,M,5.7,F*65';
      
      const pgnData = DepthConverter.DBTToPGN128267(dbtSentence);
      
      expect(pgnData).not.toBeNull();
      expect(pgnData!.pgn).toBe(128267);
      
      // Parse the depth back from PGN data
      const depthCm = pgnData!.data[2] | (pgnData!.data[3] << 8) | 
                     (pgnData!.data[4] << 16) | (pgnData!.data[5] << 24);
      const depthMeters = depthCm * 0.01;
      
      expect(depthMeters).toBeCloseTo(10.5, 1);
    });

    test('should handle malformed DBT sentences', () => {
      const malformedSentences = [
        '$IIDBT,invalid,f,10.5,M,5.7,F*65',  // Invalid depth
        '$IIDBT*65',                          // Missing fields
        'INVALID SENTENCE',                   // Not NMEA format
      ];

      for (const sentence of malformedSentences) {
        const result = DepthConverter.DBTToPGN128267(sentence);
        expect(result).toBeNull();
      }
    });
  });

  describe('Units Conversion', () => {
    test('should correctly convert between depth units', () => {
      // Test 1 meter depth
      const testDepths = [
        { meters: 1.0, feet: 3.28084, fathoms: 0.546807 },
        { meters: 10.0, feet: 32.8084, fathoms: 5.46807 },
        { meters: 100.0, feet: 328.084, fathoms: 54.6807 }
      ];

      for (const test of testDepths) {
        const data = new Uint8Array(8);
        const depthCm = Math.round(test.meters * 100);
        data[2] = depthCm & 0xFF;
        data[3] = (depthCm >> 8) & 0xFF;
        data[4] = (depthCm >> 16) & 0xFF;
        data[5] = (depthCm >> 24) & 0xFF;

        const pgnData: PGNData = {
          pgn: 128267,
          source: 1,
          destination: 255,
          priority: 5,
          data,
          timestamp: Date.now()
        };

        const sentences = DepthConverter.PGN128267ToDBT(pgnData);
        expect(sentences).toHaveLength(1);
        
        const sentence = sentences[0];
        
        // Extract depth values from sentence
        const match = sentence.match(/^\$IIDBT,([0-9.]+),f,([0-9.]+),M,([0-9.]+),F\*/);
        expect(match).not.toBeNull();
        
        const [, feetStr, metersStr, fathomsStr] = match!;
        
        expect(parseFloat(metersStr)).toBeCloseTo(test.meters, 1);
        expect(parseFloat(feetStr)).toBeCloseTo(test.feet, 1);
        expect(parseFloat(fathomsStr)).toBeCloseTo(test.fathoms, 1);
      }
    });
  });
});

describe('Integration Tests', () => {
  test('should handle complete depth conversion workflow', () => {
    const converter = new NMEAProtocolConverter('actisense-ngw1');
    
    // Create depth PGN data
    const data = new Uint8Array(8);
    data[0] = 0x01;  // SID
    data[1] = 0x00;  // Instance 0
    
    // 15.3 meters depth
    const depthCm = 1530;
    data[2] = depthCm & 0xFF;
    data[3] = (depthCm >> 8) & 0xFF;
    data[4] = (depthCm >> 16) & 0xFF;
    data[5] = (depthCm >> 24) & 0xFF;
    
    data[6] = 0xFF;  // No offset
    data[7] = 0xFF;

    const pgnData: PGNData = {
      pgn: 128267,
      source: 1,
      destination: 255,
      priority: 5,
      data,
      timestamp: Date.now()
    };

    // Convert PGN to sentences
    const result = converter.convertPGNToSentences(pgnData);
    
    expect(result.successful).toBe(true);
    expect(result.method).toBe('native');
    expect(result.sentences).toHaveLength(1);

    // Convert sentence back to PGN
    const sentence = result.sentences[0];
    const roundtripPGN = converter.convertSentenceToPGN(sentence);
    
    expect(roundtripPGN).not.toBeNull();
    expect(roundtripPGN!.pgn).toBe(128267);
  });

  test('should handle unsupported PGN with $PCDIN fallback', () => {
    const converter = new NMEAProtocolConverter('actisense-ngw1');
    
    // Use an unsupported PGN
    const pgnData: PGNData = {
      pgn: 999999,  // Fictional PGN
      source: 5,
      destination: 255,
      priority: 6,
      data: new Uint8Array([0xAA, 0xBB, 0xCC, 0xDD]),
      timestamp: Date.now()
    };

    const result = converter.convertPGNToSentences(pgnData);
    
    // Should fall back to $PCDIN encapsulation
    expect(result.method).toBe('pcdin');
    expect(result.sentences[0]).toMatch(/^\$PCDIN,0F423F,05,FF,AABBCCDD\*[0-9A-F]{2}$/);
  });

  test('should handle wind conversion (PGN 130306 → MWV)', () => {
    const converter = new NMEAProtocolConverter('actisense-ngw1');
    const windPGN = {
      pgn: 130306,
      source: 1,
      destination: 255,
      priority: 5,
      data: new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8]),
      timestamp: Date.now()
    };

    const result = converter.convertPGNToSentences(windPGN);
    
    expect(result.successful).toBe(true);
    expect(result.method).toBe('native');
    expect(result.sentences).toHaveLength(1);
    expect(result.sentences[0]).toMatch(/^\$IIMWV,.*\*[0-9A-F]{2}$/);
  });
});