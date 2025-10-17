import TcpSocket from 'react-native-tcp-socket';
import UdpSocket from 'react-native-udp';
import { parseNmeaSentence } from 'nmea-simple';
import { useNmeaStore } from '../core/nmeaStore';
import { FromPgn } from '@canboat/canboatjs';

export interface NmeaConnectionOptions {
  ip: string;
  port: number;
  protocol: 'tcp' | 'udp' | 'websocket';
}

export class NmeaConnectionManager {
  private tcpSocket: any = undefined;
  private udpSocket: any = undefined;
  private webSocket: WebSocket | undefined = undefined;
  private timeoutHandle: any = null;
  private reconnectHandle: any = null;
  private options: NmeaConnectionOptions;
  private setConnectionStatus = useNmeaStore.getState().setConnectionStatus;
  private setNmeaData = useNmeaStore.getState().setNmeaData;
  private setLastError = useNmeaStore.getState().setLastError;
  private addRawSentence = useNmeaStore.getState().addRawSentence;
  
  // Throttling: Track last update time per data field
  private lastUpdateTimes: Map<string, number> = new Map();
  private throttleInterval = 1000; // 1 second throttle per field

  constructor(options: NmeaConnectionOptions) {
    this.options = options;
  }

  /**
   * Check if enough time has passed since last update for a given field
   */
  private shouldUpdate(fieldKey: string): boolean {
    const now = Date.now();
    const lastUpdate = this.lastUpdateTimes.get(fieldKey) || 0;
    if (now - lastUpdate >= this.throttleInterval) {
      this.lastUpdateTimes.set(fieldKey, now);
      return true;
    }
    return false;
  }

  connect() {
      this.setConnectionStatus('connecting');
      this.setLastError(undefined);
      // clear any previous handles
      if (this.timeoutHandle) { clearTimeout(this.timeoutHandle); this.timeoutHandle = null; }
      if (this.reconnectHandle) { clearTimeout(this.reconnectHandle); this.reconnectHandle = null; }
      if (this.options.protocol === 'tcp') {
        this.tcpSocket = TcpSocket.createConnection({
          port: this.options.port,
          host: this.options.ip,
          tls: false,
        }, () => {
          if (this.timeoutHandle) { clearTimeout(this.timeoutHandle); this.timeoutHandle = null; }
          this.setConnectionStatus('connected');
        });
        this.tcpSocket.on('data', this.handleData);
        this.tcpSocket.on('error', this.handleError);
        this.tcpSocket.on('close', () => {
          if (this.timeoutHandle) { clearTimeout(this.timeoutHandle); this.timeoutHandle = null; }
          this.setConnectionStatus('disconnected');
        });
        // Timeout after 10 seconds if not connected
        this.timeoutHandle = setTimeout(() => {
          this.setLastError('Connection timed out after 10 seconds');
          this.disconnect();
          this.timeoutHandle = null;
        }, 10000);
        try {
          if (typeof (this.timeoutHandle as any).unref === 'function') {
            (this.timeoutHandle as any).unref();
          }
        } catch (e) {}
      } else if (this.options.protocol === 'websocket') {
        // WebSocket connection for web browsers
        const wsUrl = `ws://${this.options.ip}:${this.options.port}`;
        console.log('[NMEA Connection] Connecting to WebSocket:', wsUrl);
        
        this.webSocket = new WebSocket(wsUrl);
        
        this.webSocket.onopen = () => {
          console.log('[NMEA Connection] WebSocket connected');
          if (this.timeoutHandle) { clearTimeout(this.timeoutHandle); this.timeoutHandle = null; }
          this.setConnectionStatus('connected');
        };
        
        this.webSocket.onmessage = (event) => {
          // Physical WiFi bridges send raw NMEA strings, not JSON
          // Pass the data directly as a string to maintain consistency across transports
          this.handleData(event.data);
        };
        
        this.webSocket.onerror = (error) => {
          console.error('[NMEA Connection] WebSocket error:', error);
          this.handleError(error);
        };
        
        this.webSocket.onclose = () => {
          console.log('[NMEA Connection] WebSocket closed');
          if (this.timeoutHandle) { clearTimeout(this.timeoutHandle); this.timeoutHandle = null; }
          this.setConnectionStatus('disconnected');
        };
        
        // Timeout after 10 seconds if not connected
        this.timeoutHandle = setTimeout(() => {
          this.setLastError('WebSocket connection timed out after 10 seconds');
          this.disconnect();
          this.timeoutHandle = null;
        }, 10000);
      } else {
        this.udpSocket = UdpSocket.createSocket({ type: 'udp4' });
        this.udpSocket.bind(this.options.port);
          this.udpSocket.on('message', this.handleUdpData);
        this.udpSocket.on('error', this.handleError);
        this.udpSocket.on('close', () => {
          this.setConnectionStatus('disconnected');
        });
        this.setConnectionStatus('connected');
      }
  }

  disconnect() {
    if (this.tcpSocket) {
      this.tcpSocket.destroy();
      this.tcpSocket = undefined;
    }
    if (this.udpSocket) {
      this.udpSocket.close();
      this.udpSocket = undefined;
    }
    if (this.webSocket) {
      console.log('[NMEA Connection] Closing WebSocket connection');
      this.webSocket.close();
      this.webSocket = undefined;
    }
    if (this.timeoutHandle) { clearTimeout(this.timeoutHandle); this.timeoutHandle = null; }
    if (this.reconnectHandle) { clearTimeout(this.reconnectHandle); this.reconnectHandle = null; }
    this.setConnectionStatus('disconnected');
  }

  private handleData = (data: any) => {
      let rawData = '';
      
      if (typeof data === 'object' && data.msg) {
        rawData = data.msg.toString();
      } else if (Array.isArray(data)) {
        // Convert byte array to string
        rawData = String.fromCharCode(...data);
      } else if (Buffer.isBuffer(data)) {
        // Convert buffer to string
        rawData = data.toString('utf8');
      } else {
        rawData = data.toString();
      }
      
      // Capture raw data for debugging (AC3)
      const debugMode = useNmeaStore.getState().debugMode;
      if (debugMode) {
        this.addRawSentence(rawData.trim());
      }
      
      // Unified handler for both NMEA 0183 and NMEA 2000 formats
      this.parseUnifiedNmeaData(rawData);
  };

  private parseUnifiedNmeaData = (rawData: string) => {
      try {
        // Filter out AIS messages (AIVDM) - these are not standard NMEA for marine instruments
        if (rawData.trim().startsWith('!AIVDM')) {
          // Silently ignore AIS messages - they're not relevant for instrument display
          this.setConnectionStatus('connected'); // Keep connection alive
          return;
        }
        
        // Detect format and parse accordingly
        if (this.isNmea0183(rawData)) {
          this.parseNmea0183(rawData);
        } else if (this.isNmea2000(rawData)) {
          this.parseNmea2000(rawData);
        } else {
          // Check if this is a comma-separated byte array string (e.g., "36,73,73,77,87,86,44")
          if (/^\d+(,\d+)*$/.test(rawData.trim())) {
            // Convert comma-separated string to byte array, then to string
            const byteArray = rawData.split(',').map(num => parseInt(num.trim(), 10));
            const convertedString = String.fromCharCode(...byteArray);
            
            // Re-parse as NMEA data
            this.parseUnifiedNmeaData(convertedString);
            return;
          }
          
          // Unknown format - log but don't try to parse
          console.warn('Unknown NMEA format:', rawData.substring(0, 20));
          return;
        }
        this.setConnectionStatus('connected');
      } catch (e: any) {
        // Only set error status for actual parsing failures, not unsupported sentences
        if (e.message && e.message.includes('No known parser')) {
          console.warn('Unsupported NMEA sentence type:', rawData.substring(0, 50));
          this.setConnectionStatus('connected'); // Keep connection active
        } else {
          const errorMsg = e && e.message ? e.message : String(e);
          this.setLastError(`Parse error: ${errorMsg}`);
          this.setConnectionStatus('no-data');
          console.warn('NMEA parse error:', errorMsg, 'Data:', rawData.substring(0, 50));
        }
      }
  };

  private isNmea0183 = (data: string): boolean => {
      // NMEA 0183 sentences start with $ and contain comma-separated fields
      // But exclude $PCDIN which is NMEA 2000 encapsulated in NMEA 0183
      return data.trim().startsWith('$') && data.includes(',') && !data.includes('$PCDIN');
  };

  private isNmea2000 = (data: string): boolean => {
      // NMEA 2000 PGN format: "PGN:123456,Data:...", $PCDIN encapsulation, or binary data
      return data.includes('PGN:') || data.includes('$PCDIN');
  };

  private parseNmea0183 = (sentence: string) => {
      // Handle proprietary sentences that nmea-simple doesn't recognize
      if (sentence.startsWith('$PCDIN')) {
        this.parsePcdinSentence(sentence);
        return;
      }
      
      // Handle sentences not supported by nmea-simple but available in recordings
      if (this.parseCustomSentences(sentence)) {
        return;
      }
      
      let parsed;
      try {
        parsed = parseNmeaSentence(sentence);
      } catch (e: any) {
        if (e.message && e.message.includes('No known parser')) {
          // Just log unsupported sentence types, don't throw error
          console.warn('Unsupported NMEA 0183 sentence:', sentence.substring(0, 20));
          return;
        }
        throw e; // Re-throw other parsing errors
      }
      
      // Type guards for common NMEA 0183 sentence types with throttling
      if (parsed && parsed.sentenceId === 'DBT' && 'depthMeters' in parsed) {
        if (this.shouldUpdate('depth')) {
          this.setNmeaData({ depth: Number((parsed as any).depthMeters) });
        }
      } else if (parsed && parsed.sentenceId === 'VTG' && 'speedKnots' in parsed) {
        if (this.shouldUpdate('speed')) {
          this.setNmeaData({ speed: Number((parsed as any).speedKnots) });
        }
      } else if (parsed && parsed.sentenceId === 'MWV' && 'speed' in parsed && 'windAngle' in parsed) {
        if (this.shouldUpdate('wind')) {
          this.setNmeaData({ 
            windAngle: Number((parsed as any).windAngle), 
            windSpeed: Number((parsed as any).speed) 
          });
        }
      } else if (parsed && parsed.sentenceId === 'GGA' && 'latitude' in parsed && 'longitude' in parsed) {
        // GPGGA provides full GPS fix info including satellites and HDOP
        if (this.shouldUpdate('gps')) {
          const fixType = 'fixType' in parsed ? (parsed as any).fixType : undefined;
          this.setNmeaData({ 
            gpsPosition: { lat: Number((parsed as any).latitude), lon: Number((parsed as any).longitude) },
            gpsQuality: {
              fixType: fixType === 'fix' ? 1 : fixType === 'dgps-fix' ? 2 : 0,
              satellites: 'satellitesInView' in parsed ? Number((parsed as any).satellitesInView) : undefined,
              hdop: 'horizontalDilution' in parsed ? Number((parsed as any).horizontalDilution) : undefined,
            }
          });
        }
      } else if (parsed && parsed.sentenceId === 'GLL' && 'latitude' in parsed && 'longitude' in parsed) {
        // GPGLL provides position only, determine fix status from validity
        if (this.shouldUpdate('gps')) {
          const isValid = 'status' in parsed && (parsed as any).status === 'valid';
          this.setNmeaData({ 
            gpsPosition: { lat: Number((parsed as any).latitude), lon: Number((parsed as any).longitude) },
            gpsQuality: {
              fixType: isValid ? 2 : 0, // 2 = 2D fix if valid, 0 = no fix if invalid
              satellites: undefined, // GLL doesn't provide satellite count
              hdop: undefined, // GLL doesn't provide HDOP
            }
          });
        }
      } else if (parsed && parsed.sentenceId === 'HDG' && 'heading' in parsed) {
        if (this.shouldUpdate('heading')) {
          this.setNmeaData({ heading: Number((parsed as any).heading) });
        }
      } else if (parsed && parsed.sentenceId === 'VHW' && 'speedKnots' in parsed) {
        // VHW provides both speed and heading data
        if (this.shouldUpdate('speed') && (parsed as any).speedKnots > 0) {
          this.setNmeaData({ speed: Number((parsed as any).speedKnots) });
        }
        if (this.shouldUpdate('heading') && 'degreesMagnetic' in parsed && (parsed as any).degreesMagnetic > 0) {
          this.setNmeaData({ heading: Number((parsed as any).degreesMagnetic) });
        }
      }
      // Add more NMEA 0183 sentence type mappings as needed
  };

  private parseNmea2000 = (data: string) => {
      // Handle NMEA 2000 PGN messages
      if (data.includes('$PCDIN')) {
        // Encapsulated NMEA 2000 in NMEA 0183 format
        this.parsePcdinSentence(data);
      } else if (data.includes('PGN:')) {
        // Native NMEA 2000 PGN format
        this.parseNativePgn(data);
      } else {
        // Log unknown NMEA 2000 format but don't crash
        console.warn('Unknown NMEA 2000 format:', data.substring(0, 50));
      }
  };

  private parsePcdinSentence = (sentence: string) => {
      // Parse $PCDIN encapsulated NMEA 2000 messages
      // Format: $PCDIN,PGN,src,dst,data*checksum
      const parts = sentence.split(',');
      if (parts.length >= 4 && parts[0] === '$PCDIN') {
        const pgn = parts[1];
        const data = parts.slice(3).join(',').split('*')[0];
        
        // Map common PGNs to instrument data
        this.mapPgnToData(pgn, data);
      }
  };

  private parseNativePgn = (data: string) => {
      // Parse native PGN format: "PGN:126208,Data:1,180"
      const pgnMatch = data.match(/PGN:(\d+)/);
      const dataMatch = data.match(/Data:([^,\n\r]+)/);
      
      if (pgnMatch && dataMatch) {
        const pgn = pgnMatch[1];
        const pgnData = dataMatch[1];
        this.mapPgnToData(pgn, pgnData);
      }
  };

  private parseCustomSentences = (sentence: string): boolean => {
      // Parse rate of turn: $TIROT,rate,status*checksum
      if (sentence.startsWith('$TIROT')) {
        const parts = sentence.split(',');
        if (parts.length >= 3) {
          const rate = parseFloat(parts[1]);
          if (!isNaN(rate) && this.shouldUpdate('rateOfTurn')) {
            this.setNmeaData({ rateOfTurn: rate });
          }
        }
        return true;
      }

      // Parse relative wind: $IIVWR,angle,L/R,speed,N,speed,M,,*checksum
      if (sentence.startsWith('$IIVWR')) {
        const parts = sentence.split(',');
        if (parts.length >= 6) {
          const angle = parseFloat(parts[1]);
          const speed = parseFloat(parts[3]);
          const direction = parts[2]; // L or R
          if (!isNaN(angle) && !isNaN(speed) && this.shouldUpdate('wind')) {
            // Convert relative wind angle based on L/R direction
            const relativeAngle = direction === 'L' ? -angle : angle;
            this.setNmeaData({ 
              relativeWindAngle: relativeAngle,
              relativeWindSpeed: speed 
            });
          }
        }
        return true;
      }

      return false; // Sentence not handled by custom parser
  };

  private mapPgnToData = (pgn: string, data: string) => {
      // Map common NMEA 2000 PGNs to instrument data
      switch (pgn) {
        case '128267': // Water Depth
          if (this.shouldUpdate('depth')) {
            const depth = parseFloat(data);
            if (!isNaN(depth)) {
              this.setNmeaData({ depth });
            }
          }
          break;
        case '128259': // Speed
          if (this.shouldUpdate('speed')) {
            const speed = parseFloat(data) * 1.94384; // m/s to knots
            if (!isNaN(speed)) {
              this.setNmeaData({ speed });
            }
          }
          break;
        case '130306': // Wind Data
          if (this.shouldUpdate('wind')) {
            const parts = data.split(',');
            if (parts.length >= 2) {
              const windSpeed = parseFloat(parts[0]);
              const windAngle = parseFloat(parts[1]);
              if (!isNaN(windSpeed) && !isNaN(windAngle)) {
                this.setNmeaData({ windSpeed, windAngle });
              }
            }
          }
          break;
        case '129025': // GPS Position
          if (this.shouldUpdate('gps')) {
            const parts = data.split(',');
            if (parts.length >= 2) {
              const lat = parseFloat(parts[0]);
              const lon = parseFloat(parts[1]);
              if (!isNaN(lat) && !isNaN(lon)) {
                this.setNmeaData({ gpsPosition: { lat, lon } });
              }
            }
          }
          break;
        case '127250': // Vessel Heading
          if (this.shouldUpdate('heading')) {
            const heading = parseFloat(data) * (180 / Math.PI); // radians to degrees
            if (!isNaN(heading)) {
              this.setNmeaData({ heading });
            }
          }
          break;
        // Add more PGN mappings as needed
      }
  };

    private handleUdpData = (msg: any) => {
      // UDP can carry either NMEA 0183 or NMEA 2000 data - use unified handler
      this.handleData(msg);
    };

    private handleCanboatPgn = (pgn: any) => {
      // Handle PGN using canboatjs parsed data
      switch (pgn.pgn) {
        case 127245: // Rudder
          if (pgn.fields?.Position !== undefined) {
            this.setNmeaData({ autopilot: { rudderPosition: pgn.fields.Position } });
          }
          break;
        case 127250: // Vessel Heading
          if (pgn.fields?.Heading !== undefined) {
            this.setNmeaData({ heading: pgn.fields.Heading * 180 / Math.PI }); // Convert from radians
          }
          break;
        case 127251: // Rate of Turn
          if (pgn.fields?.Rate !== undefined) {
            this.setNmeaData({ autopilot: { rateOfTurn: pgn.fields.Rate } });
          }
          break;
        case 129025: // Position, Rapid Update
          if (pgn.fields?.Latitude !== undefined && pgn.fields?.Longitude !== undefined) {
            this.setNmeaData({ gpsPosition: { lat: pgn.fields.Latitude, lon: pgn.fields.Longitude } });
          }
          break;
        case 127488: // Engine Parameters, Rapid Update
          if (pgn.fields?.['Engine Speed'] !== undefined) {
            this.setNmeaData({ engine: { rpm: pgn.fields['Engine Speed'] } });
          }
          break;
        case 127489: // Engine Parameters, Dynamic
          const engineUpdate: any = {};
          if (pgn.fields?.['Oil pressure'] !== undefined) {
            engineUpdate.oilPressure = pgn.fields['Oil pressure'];
          }
          if (pgn.fields?.['Engine Coolant Temperature'] !== undefined) {
            engineUpdate.coolantTemp = pgn.fields['Engine Coolant Temperature'] - 273.15; // Kelvin to Celsius
          }
          if (Object.keys(engineUpdate).length > 0) {
            this.setNmeaData({ engine: engineUpdate });
          }
          break;
        case 127508: // Battery Status
          if (pgn.fields?.Voltage !== undefined) {
            this.setNmeaData({ battery: { house: pgn.fields.Voltage } });
          }
          break;
        default:
          // Unknown PGN - log but don't crash
          console.log(`Unknown NMEA2000 PGN ${pgn.pgn || 'undefined'} received`);
      }
    };

    private handleManualPgn = (pgnNum: number, msg: any) => {
      // Fallback manual parsing for when canboatjs fails
      switch (pgnNum) {
        case 127245: // Rudder
          // Rudder angle: msg[5] (signed int, tenths of degree)
          this.setNmeaData({ autopilot: { rudderPosition: msg.readInt8(5) / 10 } });
          break;
        case 127250: // Heading
          // Heading: msg[5-6] (uint16, 0.0001 rad)
          this.setNmeaData({ heading: (msg.readUInt16LE(5) * 180 / Math.PI) / 10000 });
          break;
        case 127251: // Rate of turn
          // Rate of turn: msg[5-6] (int16, 0.00001 rad/s)
          this.setNmeaData({ autopilot: { rateOfTurn: msg.readInt16LE(5) * 0.00001 } });
          break;
        case 129025: // Position
          // Latitude: msg[5-8] (int32, 1e-7 deg), Longitude: msg[9-12] (int32, 1e-7 deg)
          this.setNmeaData({ gpsPosition: { lat: msg.readInt32LE(5) * 1e-7, lon: msg.readInt32LE(9) * 1e-7 } });
          break;
        case 127488: // Engine Rapid
          // RPM: msg[2-3] (uint16, 0.25 RPM)
          this.setNmeaData({ engine: { rpm: msg.readUInt16LE(2) * 0.25 } });
          break;
        case 127489: // Engine Dynamic
          // Oil Pressure: msg[2-3] (uint16, 100 Pa), Coolant Temp: msg[6-7] (uint16, 0.01 K)
          this.setNmeaData({ engine: { oilPressure: msg.readUInt16LE(2) * 100, coolantTemp: msg.readUInt16LE(6) * 0.01 - 273.15 } });
          break;
        case 127508: // Battery Status
          // Voltage: msg[1-2] (uint16, 0.01 V)
          this.setNmeaData({ battery: { house: msg.readUInt16LE(1) * 0.01 } });
          break;
        case 127505: // Fluid Tank
          // Fuel: msg[1-2] (uint16, %), Water: msg[3-4] (uint16, %), Waste: msg[5-6] (uint16, %)
          this.setNmeaData({ tanks: { fuel: msg.readUInt16LE(1), water: msg.readUInt16LE(3), waste: msg.readUInt16LE(5) } });
          break;
        case 127506: // DC Detailed Status
          // Not mapped, but could add voltage/current per instance
          break;
        case 130310: // Environmental (temp, humidity, pressure)
          // Water temp: msg[5-6] (uint16, 0.01 K)
          this.setNmeaData({ waterTemperature: msg.readUInt16LE(5) * 0.01 - 273.15 });
          break;
        case 130311: // Environmental (temp, humidity, pressure)
          // Wind speed: msg[5-6] (uint16, 0.01 m/s), Wind angle: msg[7-8] (uint16, 0.0001 rad)
          this.setNmeaData({ windSpeed: msg.readUInt16LE(5) * 0.01, windAngle: (msg.readUInt16LE(7) * 180 / Math.PI) / 10000 });
          break;
        case 128259: // Depth
          // Depth: msg[5-6] (uint16, 0.01 m)
          this.setNmeaData({ depth: msg.readUInt16LE(5) * 0.01 });
          break;
        case 128267: // Water Depth
          // Depth: msg[5-6] (uint16, 0.01 m)
          this.setNmeaData({ depth: msg.readUInt16LE(5) * 0.01 });
          break;
        case 130312: // Temperature
          // Water temp: msg[5-6] (uint16, 0.01 K)
          this.setNmeaData({ waterTemperature: msg.readUInt16LE(5) * 0.01 - 273.15 });
          break;
        case 126208: // Raymarine proprietary (read-only)
          // Not mapped, but could log for diagnostics
          break;
        default:
          // Gracefully handle unknown PGNs
          console.log('Unknown PGN:', pgnNum, msg);
          break;
      }
      this.setConnectionStatus('connected');
    };

  private handleError = (err: any) => {
    console.error('NMEA Connection Error:', err);
    this.setLastError(err?.message || String(err));
    this.setConnectionStatus('disconnected');
    // Auto-reconnect logic (simple): try to reconnect after delay
    if (this.reconnectHandle) { clearTimeout(this.reconnectHandle); this.reconnectHandle = null; }
    this.reconnectHandle = setTimeout(() => {
      this.reconnectHandle = null;
      this.connect();
    }, 3000);
    try {
      if (typeof (this.reconnectHandle as any).unref === 'function') {
        (this.reconnectHandle as any).unref();
      }
    } catch (e) {}
  };
}
