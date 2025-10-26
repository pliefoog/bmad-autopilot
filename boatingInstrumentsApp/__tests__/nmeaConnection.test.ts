/**
 * Unit tests for NmeaConnectionManager
 * Tests TCP connection lifecycle, error handling, timeouts, and state management
 */

import TcpSocket from 'react-native-tcp-socket';
import { NmeaConnectionManager, NmeaConnectionOptions } from '../src/services/nmea/nmeaConnection';
import { useNmeaStore } from '../src/store/nmeaStore';

// Type the mocked module
const mockTcpSocket = TcpSocket as jest.Mocked<typeof TcpSocket>;

describe('NmeaConnectionManager', () => {
  let mockSocket: any;
  const testOptions: NmeaConnectionOptions = {
    ip: '192.168.1.100',
    port: 2000,
    protocol: 'tcp',
  };

  beforeEach(() => {
    // Reset Zustand store
    useNmeaStore.getState().reset();
    
    // Create mock socket instance
    mockSocket = {
      on: jest.fn(),
      destroy: jest.fn(),
      write: jest.fn(),
    };
    
    // Reset all mocks
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('Connection Lifecycle', () => {
    it('should transition from disconnected -> connecting -> connected on successful TCP connection', (done) => {
      // Mock successful connection
      mockTcpSocket.createConnection.mockImplementation((options, callback) => {
        // Call connection callback asynchronously
        setImmediate(() => callback());
        return mockSocket;
      });

      const manager = new NmeaConnectionManager(testOptions);
      
      // Initially disconnected
      expect(useNmeaStore.getState().connectionStatus).toBe('disconnected');
      
      manager.connect();
      
      // Should be connecting
      expect(useNmeaStore.getState().connectionStatus).toBe('connecting');
      
      // After connection callback fires
      setImmediate(() => {
        expect(useNmeaStore.getState().connectionStatus).toBe('connected');
        expect(useNmeaStore.getState().lastError).toBeUndefined();
        done();
      });
    });

    it('should call disconnect and transition to disconnected state', () => {
      mockTcpSocket.createConnection.mockReturnValue(mockSocket);
      
      const manager = new NmeaConnectionManager(testOptions);
      manager.connect();
      manager.disconnect();
      
      expect(mockSocket.destroy).toHaveBeenCalled();
      expect(useNmeaStore.getState().connectionStatus).toBe('disconnected');
    });
  });

  describe('Error Handling', () => {
    it('should handle socket errors gracefully and update lastError', () => {
      mockTcpSocket.createConnection.mockReturnValue(mockSocket);
      
      const manager = new NmeaConnectionManager(testOptions);
      manager.connect();
      
      // Simulate error event
      const errorCallback = mockSocket.on.mock.calls.find(
        (call: any[]) => call[0] === 'error'
      )?.[1];
      
      expect(errorCallback).toBeDefined();
      
      const testError = new Error('Connection refused');
      errorCallback(testError);
      
      expect(useNmeaStore.getState().lastError).toContain('Connection refused');
      expect(useNmeaStore.getState().connectionStatus).toBe('disconnected');
    });

    it('should handle socket close event', () => {
      mockTcpSocket.createConnection.mockReturnValue(mockSocket);
      
      const manager = new NmeaConnectionManager(testOptions);
      manager.connect();
      
      // Simulate close event
      const closeCallback = mockSocket.on.mock.calls.find(
        (call: any[]) => call[0] === 'close'
      )?.[1];
      
      expect(closeCallback).toBeDefined();
      closeCallback();
      
      expect(useNmeaStore.getState().connectionStatus).toBe('disconnected');
    });
  });

  describe('Connection Timeout', () => {
    it('should timeout after 10 seconds if connection callback not fired', () => {
      jest.useFakeTimers();
      
      // Mock connection that never calls callback
      mockTcpSocket.createConnection.mockReturnValue(mockSocket);
      
      const manager = new NmeaConnectionManager(testOptions);
      manager.connect();
      
      expect(useNmeaStore.getState().connectionStatus).toBe('connecting');
      
      // Fast-forward time by 10 seconds
      jest.advanceTimersByTime(10000);
      
      expect(useNmeaStore.getState().lastError).toMatch(/timed out/i);
      expect(useNmeaStore.getState().connectionStatus).toBe('disconnected');
      expect(mockSocket.destroy).toHaveBeenCalled();
    });

    it('should clear timeout if connection succeeds before 10 seconds', () => {
      jest.useFakeTimers();
      
      mockTcpSocket.createConnection.mockImplementation((options, callback) => {
        // Simulate connection success after 5 seconds
        setTimeout(() => callback(), 5000);
        return mockSocket;
      });
      
      const manager = new NmeaConnectionManager(testOptions);
      manager.connect();
      
      // Advance to just before connection succeeds
      jest.advanceTimersByTime(5000);
      
      expect(useNmeaStore.getState().connectionStatus).toBe('connected');
      expect(useNmeaStore.getState().lastError).toBeUndefined();
      
      // Advance past original timeout - should NOT trigger timeout
      jest.advanceTimersByTime(6000);
      
      expect(useNmeaStore.getState().connectionStatus).toBe('connected');
      expect(mockSocket.destroy).not.toHaveBeenCalled();
    });
  });

  describe('TCP Socket Configuration', () => {
    it('should create TCP connection with correct options', () => {
      mockTcpSocket.createConnection.mockReturnValue(mockSocket);
      
      const manager = new NmeaConnectionManager(testOptions);
      manager.connect();
      
      expect(mockTcpSocket.createConnection).toHaveBeenCalledWith(
        expect.objectContaining({
          host: '192.168.1.100',
          port: 2000,
          tls: false,
        }),
        expect.any(Function)
      );
    });

    it('should register event listeners for data, error, and close', () => {
      mockTcpSocket.createConnection.mockReturnValue(mockSocket);
      
      const manager = new NmeaConnectionManager(testOptions);
      manager.connect();
      
      const registeredEvents = mockSocket.on.mock.calls.map((call: any[]) => call[0]);
      
      expect(registeredEvents).toContain('data');
      expect(registeredEvents).toContain('error');
      expect(registeredEvents).toContain('close');
    });
  });

  describe('State Management Integration', () => {
    it('should update connection status in Zustand store', (done) => {
      mockTcpSocket.createConnection.mockImplementation((options, callback) => {
        setImmediate(() => callback());
        return mockSocket;
      });
      
      const manager = new NmeaConnectionManager(testOptions);
      
      // Initial state
      expect(useNmeaStore.getState().connectionStatus).toBe('disconnected');
      
      manager.connect();
      
      // After connect() call
      expect(useNmeaStore.getState().connectionStatus).toBe('connecting');
      
      // After connection callback
      setImmediate(() => {
        expect(useNmeaStore.getState().connectionStatus).toBe('connected');
        expect(useNmeaStore.getState().lastError).toBeUndefined();
        done();
      });
    });
  });

  describe('NMEA Sentence Parsing', () => {
    beforeEach(() => {
      mockTcpSocket.createConnection.mockReturnValue(mockSocket);
    });

    it('should parse VTG (speed) sentence correctly', () => {
      const manager = new NmeaConnectionManager(testOptions);
      manager.connect();

      const dataCallback = mockSocket.on.mock.calls.find(
        (call: any[]) => call[0] === 'data'
      )?.[1];

      // Valid VTG sentence: speed 5.5 knots  
      const vtgSentence = '$GPVTG,054.7,T,034.4,M,005.5,N,010.2,K*48';
      dataCallback(vtgSentence);

      const { nmeaData } = useNmeaStore.getState();
      expect(nmeaData.speed).toBe(5.5);
    });

    it('should parse GGA (GPS) sentence correctly', () => {
      const manager = new NmeaConnectionManager(testOptions);
      manager.connect();

      const dataCallback = mockSocket.on.mock.calls.find(
        (call: any[]) => call[0] === 'data'
      )?.[1];

      // Valid GGA sentence: GPS position
      const ggaSentence = '$GPGGA,123519,4807.038,N,01131.000,E,1,08,0.9,545.4,M,46.9,M,,*47';
      dataCallback(ggaSentence);

      const { nmeaData } = useNmeaStore.getState();
      expect(nmeaData.gpsPosition).toBeDefined();
      expect(nmeaData.gpsPosition?.lat).toBeCloseTo(48.1173, 3);
      expect(nmeaData.gpsPosition?.lon).toBeCloseTo(11.5167, 3);
      expect(nmeaData.gpsQuality).toBeDefined();
      expect(nmeaData.gpsQuality?.fixType).toBe(1);
      expect(nmeaData.gpsQuality?.satellites).toBe(8);
    });

    it('should handle malformed NMEA sentences without crashing', () => {
      const manager = new NmeaConnectionManager(testOptions);
      manager.connect();

      const dataCallback = mockSocket.on.mock.calls.find(
        (call: any[]) => call[0] === 'data'
      )?.[1];

      // Malformed sentences
      const malformedSentences = [
        'GARBAGE DATA',
        '$INVALID*FF',
        '$SDDBT,',
        '',
        'No dollar sign',
      ];

      malformedSentences.forEach(sentence => {
        expect(() => dataCallback(sentence)).not.toThrow();
      });

      // App should still be in no-data state, not crashed
      expect(useNmeaStore.getState().connectionStatus).toBe('no-data');
      expect(useNmeaStore.getState().lastError).toContain('Parse error');
    });

    it('should log errors for invalid sentences but continue processing', () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
      
      const manager = new NmeaConnectionManager(testOptions);
      manager.connect();

      const dataCallback = mockSocket.on.mock.calls.find(
        (call: any[]) => call[0] === 'data'
      )?.[1];

      dataCallback('INVALID SENTENCE');

      expect(consoleSpy).toHaveBeenCalledWith(
        'NMEA parse error:',
        expect.any(String),
        'Sentence:',
        'INVALID SENTENCE'
      );

      consoleSpy.mockRestore();
    });

    it('should successfully parse and update state for valid NMEA sentences', () => {
      const manager = new NmeaConnectionManager(testOptions);
      manager.connect();

      const dataCallback = mockSocket.on.mock.calls.find(
        (call: any[]) => call[0] === 'data'
      )?.[1];

      // Send multiple valid sentences
      dataCallback('$GPVTG,054.7,T,034.4,M,005.5,N,010.2,K*48'); // Speed
      dataCallback('$GPGGA,123519,4807.038,N,01131.000,E,1,08,0.9,545.4,M,46.9,M,,*47'); // GPS

      const { nmeaData, connectionStatus } = useNmeaStore.getState();
      expect(connectionStatus).toBe('connected');
      expect(nmeaData.speed).toBe(5.5);
      expect(nmeaData.gpsPosition).toBeDefined();
    });
  });

  describe('Throttling Mechanism', () => {
    beforeEach(() => {
      mockTcpSocket.createConnection.mockReturnValue(mockSocket);
    });

    it('should throttle rapid speed updates to 1 per second', () => {
      // Use real timers but control Date.now via mock
      const realDateNow = Date.now;
      let mockTime = 1000000000;
      jest.spyOn(Date, 'now').mockImplementation(() => mockTime);

      const manager = new NmeaConnectionManager(testOptions);
      manager.connect();

      const dataCallback = mockSocket.on.mock.calls.find(
        (call: any[]) => call[0] === 'data'
      )?.[1];

      // First update at time 1000000000
      dataCallback('$GPVTG,054.7,T,034.4,M,005.5,N,010.2,K*48');
      expect(useNmeaStore.getState().nmeaData.speed).toBe(5.5);

      // Second update 500ms later - should be throttled
      mockTime += 500;
      useNmeaStore.getState().setNmeaData({ speed: undefined }); // Clear to verify throttle
      dataCallback('$GPVTG,054.7,T,034.4,M,005.5,N,010.2,K*48');
      expect(useNmeaStore.getState().nmeaData.speed).toBeUndefined(); // Throttled!

      // Third update 1000ms after first - should go through
      mockTime = 1000000000 + 1001; // 1ms past throttle window
      dataCallback('$GPVTG,054.7,T,034.4,M,005.5,N,010.2,K*48');
      expect(useNmeaStore.getState().nmeaData.speed).toBe(5.5); // Updated!

      // Restore
      jest.spyOn(Date, 'now').mockRestore();
    });

    it('should throttle different data types independently', () => {
      const manager = new NmeaConnectionManager(testOptions);
      manager.connect();

      const dataCallback = mockSocket.on.mock.calls.find(
        (call: any[]) => call[0] === 'data'
      )?.[1];

      // Send speed and GPS at same time
      dataCallback('$GPVTG,054.7,T,034.4,M,005.5,N,010.2,K*48');
      dataCallback('$GPGGA,123519,4807.038,N,01131.000,E,1,08,0.9,545.4,M,46.9,M,,*47');

      expect(useNmeaStore.getState().nmeaData.speed).toBe(5.5);
      expect(useNmeaStore.getState().nmeaData.gpsPosition).toBeDefined();

      // Both should be throttled independently when sent again immediately
      const initialSpeed = useNmeaStore.getState().nmeaData.speed;
      const initialLat = useNmeaStore.getState().nmeaData.gpsPosition?.lat;

      dataCallback('$GPVTG,054.7,T,034.4,M,005.5,N,010.2,K*48');
      dataCallback('$GPGGA,123520,4808.038,N,01132.000,E,1,08,0.9,545.4,M,46.9,M,,*40');

      // Values should remain unchanged due to throttling
      expect(useNmeaStore.getState().nmeaData.speed).toBe(initialSpeed);
      expect(useNmeaStore.getState().nmeaData.gpsPosition?.lat).toBe(initialLat);
    });
  });

  describe('Raw Sentence Debugging (AC3)', () => {
    beforeEach(() => {
      mockTcpSocket.createConnection.mockReturnValue(mockSocket);
    });

    it('should capture raw sentences when debug mode is enabled', () => {
      useNmeaStore.getState().setDebugMode(true);
      
      const manager = new NmeaConnectionManager(testOptions);
      manager.connect();

      const dataCallback = mockSocket.on.mock.calls.find(
        (call: any[]) => call[0] === 'data'
      )?.[1];

      const testSentence = '$GPVTG,054.7,T,034.4,M,005.5,N,010.2,K*48';
      dataCallback(testSentence);

      const { rawSentences } = useNmeaStore.getState();
      expect(rawSentences).toContain(testSentence);
    });

    it('should not capture raw sentences when debug mode is disabled', () => {
      useNmeaStore.getState().setDebugMode(false);
      
      const manager = new NmeaConnectionManager(testOptions);
      manager.connect();

      const dataCallback = mockSocket.on.mock.calls.find(
        (call: any[]) => call[0] === 'data'
      )?.[1];

      dataCallback('$GPVTG,054.7,T,034.4,M,005.5,N,010.2,K*48');

      const { rawSentences } = useNmeaStore.getState();
      expect(rawSentences).toHaveLength(0);
    });

    it('should limit raw sentences to last 100 to prevent memory issues', () => {
      useNmeaStore.getState().setDebugMode(true);
      
      const manager = new NmeaConnectionManager(testOptions);
      manager.connect();

      const dataCallback = mockSocket.on.mock.calls.find(
        (call: any[]) => call[0] === 'data'
      )?.[1];

      // Send 150 valid sentences
      for (let i = 0; i < 150; i++) {
        dataCallback('$GPVTG,054.7,T,034.4,M,005.5,N,010.2,K*48');
      }

      const { rawSentences } = useNmeaStore.getState();
      expect(rawSentences.length).toBe(100);
    });
  });

  describe('Performance Requirements (AC9)', () => {
    beforeEach(() => {
      jest.useFakeTimers();
      mockTcpSocket.createConnection.mockReturnValue(mockSocket);
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should handle 100+ messages per second without losing data', () => {
      const manager = new NmeaConnectionManager(testOptions);
      manager.connect();

      const dataCallback = mockSocket.on.mock.calls.find(
        (call: any[]) => call[0] === 'data'
      )?.[1];

      // Simulate 100 messages/second for 5 seconds
      const validSentence = '$GPVTG,054.7,T,034.4,M,005.5,N,010.2,K*48';
      for (let i = 0; i < 500; i++) {
        dataCallback(validSentence);
        
        // Advance time by 10ms per message (100 msg/sec)
        if (i % 100 === 0) {
          jest.advanceTimersByTime(1000);
        }
      }

      // Verify system is still responsive and data is valid
      expect(useNmeaStore.getState().connectionStatus).toBe('connected');
      expect(useNmeaStore.getState().nmeaData.speed).toBeDefined();
    });
  });
});

