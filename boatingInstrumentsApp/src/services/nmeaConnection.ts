import TcpSocket from 'react-native-tcp-socket';
import UdpSocket from 'react-native-udp';
import { parseNmeaSentence } from 'nmea-simple';
import { useNmeaStore } from '../core/nmeaStore';
import { FromPgn } from '@canboat/canboatjs';

export interface NmeaConnectionOptions {
  ip: string;
  port: number;
  protocol: 'tcp' | 'udp';
}

export class NmeaConnectionManager {
  private tcpSocket: any = undefined;
  private udpSocket: any = undefined;
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
    if (this.timeoutHandle) { clearTimeout(this.timeoutHandle); this.timeoutHandle = null; }
    if (this.reconnectHandle) { clearTimeout(this.reconnectHandle); this.reconnectHandle = null; }
    this.setConnectionStatus('disconnected');
  }

  private handleData = (data: any) => {
      let sentence = '';
      if (typeof data === 'object' && data.msg) {
        sentence = data.msg.toString();
      } else {
        sentence = data.toString();
      }
      
      // Capture raw sentence for debugging (AC3)
      const debugMode = useNmeaStore.getState().debugMode;
      if (debugMode) {
        this.addRawSentence(sentence.trim());
      }
      
      try {
        const parsed = parseNmeaSentence(sentence);
        // Type guards for common NMEA sentence types with throttling
        if (parsed && parsed.sentenceId === 'DBT' && 'depthMeters' in parsed) {
          if (this.shouldUpdate('depth')) {
            this.setNmeaData({ depth: Number((parsed as any).depthMeters) });
          }
        } else if (parsed && parsed.sentenceId === 'VTG' && 'speedKnots' in parsed) {
          if (this.shouldUpdate('speed')) {
            this.setNmeaData({ speed: Number((parsed as any).speedKnots) });
          }
        } else if (parsed && parsed.sentenceId === 'MWV' && 'windSpeed' in parsed && 'windAngle' in parsed) {
          if (this.shouldUpdate('wind')) {
            this.setNmeaData({ 
              windAngle: Number((parsed as any).windAngle), 
              windSpeed: Number((parsed as any).windSpeed) 
            });
          }
        } else if (parsed && parsed.sentenceId === 'GGA' && 'latitude' in parsed && 'longitude' in parsed) {
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
        } else if (parsed && parsed.sentenceId === 'HDG' && 'heading' in parsed) {
          if (this.shouldUpdate('heading')) {
            this.setNmeaData({ heading: Number((parsed as any).heading) });
          }
        }
        // Add more sentence type mappings as needed
        this.setConnectionStatus('connected');
      } catch (e: any) {
        const errorMsg = e && e.message ? e.message : String(e);
        this.setLastError(`Parse error: ${errorMsg}`);
        this.setConnectionStatus('no-data');
        // Log error but don't crash (AC4, AC11)
        console.warn('NMEA parse error:', errorMsg, 'Sentence:', sentence);
      }
  };

    private handleUdpData = (msg: any) => {
      try {
        // Parse NMEA2000 PGN using canboatjs
        const pgn = new FromPgn(msg);
        
        if (pgn && pgn.pgn) {
          // Use canboatjs for proper PGN decoding
          this.handleCanboatPgn(pgn);
        } else {
          // Fallback to manual parsing if canboatjs fails
          // Extract PGN from CAN ID (first 3 bytes)
          // eslint-disable-next-line no-bitwise
          const pgnNum = msg.readUInt8(0) | (msg.readUInt8(1) << 8) | (msg.readUInt8(2) << 16);
          this.handleManualPgn(pgnNum, msg);
        }
      } catch (e: any) {
        const errorMsg = e && e.message ? e.message : String(e);
        this.setLastError(`NMEA2000 parse error: ${errorMsg}`);
        console.warn('NMEA2000 parse error:', errorMsg, 'Message:', msg);
      }
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
          console.log(`Unknown NMEA2000 PGN ${pgn.pgn} received`);
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
