// NMEA Parser Service
// Enhanced NMEA sentence parsing with validation and error handling

import { useNmeaStore } from '../../stores/nmeaStore';
import { useConnectionStore } from '../../stores/connectionStore';

export interface ParsedNmeaData {
  messageType: string;
  talker: string;
  data: Record<string, any>;
  timestamp: number;
  raw: string;
  valid: boolean;
  errors?: string[];
}

export class NmeaParser {
  private static instance: NmeaParser;
  private messageCounters: Record<string, number> = {};

  static getInstance(): NmeaParser {
    if (!NmeaParser.instance) {
      NmeaParser.instance = new NmeaParser();
    }
    return NmeaParser.instance;
  }

  parseNmeaSentence(sentence: string): ParsedNmeaData | null {
    const timestamp = Date.now();
    const connectionStore = useConnectionStore.getState();
    const nmeaStore = useNmeaStore.getState();

    try {
      // Basic NMEA validation
      if (!sentence.startsWith('$') && !sentence.startsWith('!')) {
        return this.createErrorResult(sentence, timestamp, ['Invalid NMEA start character']);
      }

      // Extract message type and talker
      const parts = sentence.split(',');
      if (parts.length < 2) {
        return this.createErrorResult(sentence, timestamp, ['Insufficient NMEA fields']);
      }

      const header = parts[0].substring(1); // Remove $ or !
      const talker = header.substring(0, 2);
      const messageType = header.substring(2);

      // Parse based on message type
      const parsedData = this.parseByMessageType(messageType, parts);
      
      // Update metrics
      this.updateMessageMetrics(messageType);
      connectionStore.incrementPacketsReceived();
      nmeaStore.incrementMessageType(messageType);

      return {
        messageType,
        talker,
        data: parsedData,
        timestamp,
        raw: sentence,
        valid: true,
      };

    } catch (error) {
      connectionStore.incrementPacketsDropped();
      const errorMessage = error instanceof Error ? error.message : 'Unknown parsing error';
      return this.createErrorResult(sentence, timestamp, [errorMessage]);
    }
  }

  private parseByMessageType(messageType: string, parts: string[]): Record<string, any> {
    switch (messageType) {
      case 'GGA': return this.parseGGA(parts);
      case 'RMC': return this.parseRMC(parts);
      case 'VWR': return this.parseVWR(parts);
      case 'DPT': return this.parseDPT(parts);
      case 'HDG': return this.parseHDG(parts);
      case 'RPM': return this.parseRPM(parts);
      default: return this.parseGeneric(parts);
    }
  }

  private parseGGA(parts: string[]): Record<string, any> {
    return {
      time: parts[1],
      latitude: this.parseCoordinate(parts[2], parts[3]),
      longitude: this.parseCoordinate(parts[4], parts[5]),
      quality: parseInt(parts[6]) || 0,
      satellites: parseInt(parts[7]) || 0,
      hdop: parseFloat(parts[8]) || 0,
      altitude: parseFloat(parts[9]) || 0,
      altitudeUnit: parts[10] || 'M',
    };
  }

  private parseRMC(parts: string[]): Record<string, any> {
    return {
      time: parts[1],
      status: parts[2],
      latitude: this.parseCoordinate(parts[3], parts[4]),
      longitude: this.parseCoordinate(parts[5], parts[6]),
      speed: parseFloat(parts[7]) || 0,
      course: parseFloat(parts[8]) || 0,
      date: parts[9],
    };
  }

  private parseVWR(parts: string[]): Record<string, any> {
    return {
      windAngle: parseFloat(parts[1]) || 0,
      windDirection: parts[2] || '',
      windSpeed: parseFloat(parts[3]) || 0,
      windSpeedUnit: parts[4] || 'N',
    };
  }

  private parseDPT(parts: string[]): Record<string, any> {
    return {
      depth: parseFloat(parts[1]) || 0,
      offset: parseFloat(parts[2]) || 0,
      scale: parseFloat(parts[3]) || 1,
    };
  }

  private parseHDG(parts: string[]): Record<string, any> {
    return {
      heading: parseFloat(parts[1]) || 0,
      deviation: parseFloat(parts[2]) || 0,
      deviationDirection: parts[3] || '',
      variation: parseFloat(parts[4]) || 0,
      variationDirection: parts[5] || '',
    };
  }

  private parseRPM(parts: string[]): Record<string, any> {
    return {
      source: parts[1] || '',
      engineNumber: parseInt(parts[2]) || 0,
      rpm: parseFloat(parts[3]) || 0,
      pitch: parseFloat(parts[4]) || 0,
      status: parts[5] || '',
    };
  }

  private parseGeneric(parts: string[]): Record<string, any> {
    const data: Record<string, any> = {};
    parts.forEach((part, index) => {
      if (index > 0 && part) { // Skip header
        data[`field_${index}`] = part;
      }
    });
    return data;
  }

  private parseCoordinate(coord: string, direction: string): number | null {
    if (!coord || !direction) return null;
    
    const degrees = parseFloat(coord.substring(0, coord.length - 7));
    const minutes = parseFloat(coord.substring(coord.length - 7));
    let result = degrees + (minutes / 60);
    
    if (direction === 'S' || direction === 'W') {
      result = -result;
    }
    
    return result;
  }

  private createErrorResult(sentence: string, timestamp: number, errors: string[]): ParsedNmeaData {
    return {
      messageType: 'UNKNOWN',
      talker: 'XX',
      data: {},
      timestamp,
      raw: sentence,
      valid: false,
      errors,
    };
  }

  private updateMessageMetrics(messageType: string): void {
    this.messageCounters[messageType] = (this.messageCounters[messageType] || 0) + 1;
  }

  getMessageStats(): Record<string, number> {
    return { ...this.messageCounters };
  }

  resetStats(): void {
    this.messageCounters = {};
  }
}

// Export singleton instance
export const nmeaParser = NmeaParser.getInstance();