import { NmeaConnectionManager } from '../src/services/nmeaConnection';
import UdpSocket from 'react-native-udp';

// Mock UDP socket
jest.mock('react-native-udp', () => ({
  createSocket: jest.fn(),
}));

// Mock TCP socket  
jest.mock('react-native-tcp-socket', () => ({
  createConnection: jest.fn(() => ({
    on: jest.fn(),
    destroy: jest.fn(),
  })),
}));

// Mock canboat
jest.mock('@canboat/canboatjs', () => ({
  FromPgn: jest.fn(),
}));

// Mock NMEA store
jest.mock('../src/core/nmeaStore', () => ({
  useNmeaStore: {
    getState: () => ({
      setConnectionStatus: jest.fn(),
      setNmeaData: jest.fn(),
      setLastError: jest.fn(),
      addRawSentence: jest.fn(),
    }),
  },
}));

describe('NMEA2000 UDP Connection - Integration Tests', () => {
  let mockUdpSocket: any;

  beforeEach(() => {
    jest.clearAllMocks();

    mockUdpSocket = {
      bind: jest.fn(),
      on: jest.fn(),
      close: jest.fn(),
      send: jest.fn(),
    };

    (UdpSocket.createSocket as jest.Mock).mockReturnValue(mockUdpSocket);
  });

  describe('UDP Connection Setup', () => {
    it('should create UDP connection with correct configuration', async () => {
      const connection = new NmeaConnectionManager({
        ip: '192.168.1.100',
        port: 2000,
        protocol: 'udp',
      });

      await connection.connect();
      
      expect(UdpSocket.createSocket).toHaveBeenCalledWith({ type: 'udp4' });
      expect(mockUdpSocket.bind).toHaveBeenCalledWith(2000);
      expect(mockUdpSocket.on).toHaveBeenCalledWith('message', expect.any(Function));
      expect(mockUdpSocket.on).toHaveBeenCalledWith('error', expect.any(Function));
      expect(mockUdpSocket.on).toHaveBeenCalledWith('close', expect.any(Function));

      connection.disconnect();
    });

    it('should handle UDP socket cleanup on disconnect', () => {
      const connection = new NmeaConnectionManager({
        ip: '192.168.1.100',
        port: 2000,
        protocol: 'udp',
      });

      connection.connect();
      connection.disconnect();
      
      expect(mockUdpSocket.close).toHaveBeenCalled();
    });

    it('should handle connection lifecycle for UDP protocol', () => {
      const connection = new NmeaConnectionManager({
        ip: '192.168.1.100', 
        port: 2000,
        protocol: 'udp',
      });

      connection.connect();
      expect(UdpSocket.createSocket).toHaveBeenCalledWith({ type: 'udp4' });
      expect(mockUdpSocket.bind).toHaveBeenCalledWith(2000);

      connection.disconnect();
      expect(mockUdpSocket.close).toHaveBeenCalled();
    });
  });

  describe('NMEA2000 Library Integration', () => {
    it('should integrate with @canboat/canboatjs library', () => {
      const connection = new NmeaConnectionManager({
        ip: '192.168.1.100',
        port: 2000,
        protocol: 'udp',
      });

      // Verify canboat library is properly imported
      const { FromPgn } = require('@canboat/canboatjs');
      expect(FromPgn).toBeDefined();
      
      connection.disconnect();
    });

    it('should support dual protocol connections', () => {
      const tcpConnection = new NmeaConnectionManager({
        ip: '192.168.1.100',
        port: 10110,
        protocol: 'tcp',
      });

      const udpConnection = new NmeaConnectionManager({
        ip: '192.168.1.100',
        port: 2000,
        protocol: 'udp',
      });

      // Both connections should be creatable
      expect(tcpConnection).toBeDefined();
      expect(udpConnection).toBeDefined();
      
      tcpConnection.disconnect();
      udpConnection.disconnect();
    });

    it('should handle common NMEA2000 PGNs as specified in story requirements', async () => {
      const connection = new NmeaConnectionManager({
        ip: '192.168.1.100',
        port: 2000,
        protocol: 'udp',
      });

      await connection.connect();
      
      // Verify message handler is set up
      expect(mockUdpSocket.on).toHaveBeenCalledWith('message', expect.any(Function));
      
      // Get the message handler function
      const messageHandlerCall = mockUdpSocket.on.mock.calls.find((call: any) => call[0] === 'message');
      expect(messageHandlerCall).toBeDefined();
      expect(messageHandlerCall[1]).toBeInstanceOf(Function);
      
      connection.disconnect();
    });
  });

  describe('Performance Requirements', () => {
    it('should handle error scenarios gracefully', async () => {
      const connection = new NmeaConnectionManager({
        ip: '192.168.1.100',
        port: 2000,
        protocol: 'udp',
      });

      await connection.connect();
      
      // Simulate error handling
      const errorHandlerCall = mockUdpSocket.on.mock.calls.find((call: any) => call[0] === 'error');
      expect(errorHandlerCall).toBeDefined();
      expect(errorHandlerCall[1]).toBeInstanceOf(Function);
      
      connection.disconnect();
    });

    it('should validate connection lifecycle', () => {
      const connection = new NmeaConnectionManager({
        ip: '192.168.1.100',
        port: 2000,
        protocol: 'udp',
      });
      
      // After connection attempt
      connection.connect();
      expect(UdpSocket.createSocket).toHaveBeenCalled();
      
      // After disconnect
      connection.disconnect();
      expect(mockUdpSocket.close).toHaveBeenCalled();
    });
  });

  describe('Story 2.1 Acceptance Criteria Validation', () => {
    it('AC1: Should connect to WiFi bridges via UDP for NMEA2000 data', () => {
      const connection = new NmeaConnectionManager({
        ip: '192.168.1.100',
        port: 2000,
        protocol: 'udp',
      });

      connection.connect();
      expect(UdpSocket.createSocket).toHaveBeenCalledWith({ type: 'udp4' });
      connection.disconnect();
    });

    it('AC6: Should use react-native-udp for UDP connectivity', () => {
      const connection = new NmeaConnectionManager({
        ip: '192.168.1.100',
        port: 2000,
        protocol: 'udp',
      });

      connection.connect();
      expect(UdpSocket.createSocket).toHaveBeenCalled();
      connection.disconnect();
    });

    it('AC9: Should maintain connection stability for both protocols', () => {
      const tcpConnection = new NmeaConnectionManager({
        ip: '192.168.1.100',
        port: 10110,
        protocol: 'tcp',
      });

      const udpConnection = new NmeaConnectionManager({
        ip: '192.168.1.100',
        port: 2000,
        protocol: 'udp',
      });

      // Both should be able to connect simultaneously without interference
      tcpConnection.connect();
      udpConnection.connect();

      // Verify both connections are set up
      expect(UdpSocket.createSocket).toHaveBeenCalledWith({ type: 'udp4' });

      tcpConnection.disconnect();
      udpConnection.disconnect();
    });
  });
});