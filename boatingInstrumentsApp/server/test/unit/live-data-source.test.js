/**
 * Unit Tests for Live Data Source
 * 
 * Epic 10.5 - Test Coverage & Quality
 * AC1: Unit test coverage for data source components with mocked inputs
 */

const LiveDataSource = require('../../lib/data-sources/live');
const net = require('net');
const EventEmitter = require('events');

// Mock the net module
jest.mock('net');

describe('LiveDataSource', () => {
  let liveDataSource;
  let mockSocket;
  let config;

  beforeEach(() => {
    config = {
      host: '192.168.1.10',
      port: 10110
    };

    mockSocket = new EventEmitter();
    mockSocket.connect = jest.fn();
    mockSocket.destroy = jest.fn();
    mockSocket.write = jest.fn();

    net.Socket.mockImplementation(() => mockSocket);

    liveDataSource = new LiveDataSource(config);
  });

  afterEach(() => {
    jest.clearAllMocks();
    if (liveDataSource.reconnectTimer) {
      clearTimeout(liveDataSource.reconnectTimer);
    }
  });

  describe('Constructor', () => {
    test('should initialize with correct configuration', () => {
      expect(liveDataSource.config).toEqual(config);
      expect(liveDataSource.isConnected).toBe(false);
      expect(liveDataSource.reconnectAttempts).toBe(0);
      expect(liveDataSource.maxReconnectAttempts).toBe(5);
      expect(liveDataSource.reconnectDelay).toBe(2000);
    });

    test('should initialize stats correctly', () => {
      expect(liveDataSource.stats).toEqual({
        messagesReceived: 0,
        connectionTime: null,
        lastMessage: null
      });
    });
  });

  describe('start()', () => {
    test('should establish TCP connection successfully', async () => {
      const startPromise = liveDataSource.start();

      // Simulate successful connection
      setTimeout(() => {
        mockSocket.emit('connect');
      }, 10);

      await expect(startPromise).resolves.toBeUndefined();
      expect(mockSocket.connect).toHaveBeenCalledWith(config.port, config.host);
      expect(liveDataSource.isConnected).toBe(true);
      expect(liveDataSource.reconnectAttempts).toBe(0);
      expect(liveDataSource.stats.connectionTime).toBeTruthy();
    });

    test('should reject on connection timeout', async () => {
      const startPromise = liveDataSource.start();

      // Don't emit connect event to trigger timeout
      await expect(startPromise).rejects.toThrow('Connection timeout to 192.168.1.10:10110');
    }, 15000);

    test('should reject on connection error', async () => {
      const startPromise = liveDataSource.start();

      // Add error listener to prevent unhandled error
      liveDataSource.on('error', () => {});

      setTimeout(() => {
        mockSocket.emit('error', new Error('Connection refused'));
      }, 10);

      await expect(startPromise).rejects.toThrow('Connection refused');
      expect(liveDataSource.isConnected).toBe(false);
    }, 15000);

    test('should emit status event on connection attempt', async () => {
      const statusSpy = jest.fn();
      liveDataSource.on('status', statusSpy);

      const startPromise = liveDataSource.start();

      setTimeout(() => {
        mockSocket.emit('connect');
      }, 10);

      await startPromise;

      expect(statusSpy).toHaveBeenCalledWith('Connecting to 192.168.1.10:10110...');
      expect(statusSpy).toHaveBeenCalledWith('Connected to NMEA WiFi bridge at 192.168.1.10:10110');
    });
  });

  describe('data handling', () => {
    beforeEach(async () => {
      const startPromise = liveDataSource.start();
      setTimeout(() => mockSocket.emit('connect'), 10);
      await startPromise;
    });

    test('should process single NMEA sentence correctly', () => {
      const dataSpy = jest.fn();
      liveDataSource.on('data', dataSpy);

      const nmeaSentence = '$GPRMC,123519,A,4807.038,N,01131.000,E,000.0,360.0,230394,003.1,W*6A';
      mockSocket.emit('data', Buffer.from(nmeaSentence + '\n'));

      expect(dataSpy).toHaveBeenCalledWith(nmeaSentence);
      expect(liveDataSource.stats.messagesReceived).toBe(1);
      expect(liveDataSource.stats.lastMessage).toBeTruthy();
    });

    test('should process multiple NMEA sentences in single data event', () => {
      const dataSpy = jest.fn();
      liveDataSource.on('data', dataSpy);

      const sentence1 = '$GPRMC,123519,A,4807.038,N,01131.000,E,000.0,360.0,230394,003.1,W*6A';
      const sentence2 = '$GPGGA,123519,4807.038,N,01131.000,E,1,08,0.9,545.4,M,46.9,M,,*47';
      const multipleData = sentence1 + '\n' + sentence2 + '\n';
      
      mockSocket.emit('data', Buffer.from(multipleData));

      expect(dataSpy).toHaveBeenCalledTimes(2);
      expect(dataSpy).toHaveBeenCalledWith(sentence1);
      expect(dataSpy).toHaveBeenCalledWith(sentence2);
      expect(liveDataSource.stats.messagesReceived).toBe(2);
    });

    test('should ignore non-NMEA data', () => {
      const dataSpy = jest.fn();
      liveDataSource.on('data', dataSpy);

      mockSocket.emit('data', Buffer.from('invalid data\n'));

      expect(dataSpy).not.toHaveBeenCalled();
      expect(liveDataSource.stats.messagesReceived).toBe(0);
    });

    test('should handle AIS sentences (starting with !)', () => {
      const dataSpy = jest.fn();
      liveDataSource.on('data', dataSpy);

      const aisSentence = '!AIVDM,1,1,,A,15M4Df001a0p=@0vb@H:5@8p0<<f,0*1A';
      mockSocket.emit('data', Buffer.from(aisSentence + '\n'));

      expect(dataSpy).toHaveBeenCalledWith(aisSentence);
      expect(liveDataSource.stats.messagesReceived).toBe(1);
    });
  });

  describe('connection management', () => {
    beforeEach(async () => {
      const startPromise = liveDataSource.start();
      setTimeout(() => mockSocket.emit('connect'), 10);
      await startPromise;
    });

    test('should handle connection close with reconnection', (done) => {
      const statusSpy = jest.fn();
      liveDataSource.on('status', statusSpy);

      // Mock scheduleReconnect to prevent actual timeout
      liveDataSource.scheduleReconnect = jest.fn();

      mockSocket.emit('close');

      expect(liveDataSource.isConnected).toBe(false);
      expect(statusSpy).toHaveBeenCalledWith('Connection to NMEA bridge closed');
      expect(liveDataSource.scheduleReconnect).toHaveBeenCalled();
      done();
    });

    test('should emit error after max reconnection attempts', (done) => {
      const errorSpy = jest.fn();
      liveDataSource.on('error', errorSpy);

      liveDataSource.reconnectAttempts = 5; // Set to max
      mockSocket.emit('close');

      setTimeout(() => {
        expect(errorSpy).toHaveBeenCalledWith(expect.objectContaining({
          message: 'Maximum reconnection attempts reached'
        }));
        done();
      }, 10);
    });
  });

  describe('stop()', () => {
    test('should clean up connection and timers', async () => {
      const startPromise = liveDataSource.start();
      setTimeout(() => mockSocket.emit('connect'), 10);
      await startPromise;

      await liveDataSource.stop();

      expect(mockSocket.destroy).toHaveBeenCalled();
      expect(liveDataSource.isConnected).toBe(false);
    });

    test('should handle stop when not connected', async () => {
      await expect(liveDataSource.stop()).resolves.toBeUndefined();
    });
  });

  describe('getStatus()', () => {
    test('should return correct status when connected', async () => {
      const startPromise = liveDataSource.start();
      setTimeout(() => mockSocket.emit('connect'), 10);
      await startPromise;

      const status = liveDataSource.getStatus();

      expect(status.type).toBe('live');
      expect(status.isConnected).toBe(true);
      expect(status.host).toBe(config.host);
      expect(status.port).toBe(config.port);
      expect(status.stats).toEqual(liveDataSource.stats);
      expect(status.reconnectAttempts).toBe(0);
    });

    test('should return correct status when disconnected', () => {
      const status = liveDataSource.getStatus();

      expect(status.type).toBe('live');
      expect(status.isConnected).toBe(false);
      expect(status.host).toBe(config.host);
      expect(status.port).toBe(config.port);
      expect(status.stats).toEqual(liveDataSource.stats);
    });
  });
});