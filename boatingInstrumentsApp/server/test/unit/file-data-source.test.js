/**
 * Unit Tests for File Data Source
 * 
 * Epic 10.5 - Test Coverage & Quality
 * AC1: Unit test coverage for data source components with mocked inputs
 */

const FileDataSource = require('../../lib/data-sources/file');
const fs = require('fs');
const path = require('path');

// Mock the fs module
jest.mock('fs');

describe('FileDataSource', () => {
  let fileDataSource;
  let config;
  let mockNmeaData;

  beforeEach(() => {
    config = {
      filePath: '/path/to/test.nmea',
      rate: 100, // messages per second
      loop: false
    };

    mockNmeaData = [
      '$GPRMC,123519,A,4807.038,N,01131.000,E,000.0,360.0,230394,003.1,W*6A',
      '$GPGGA,123519,4807.038,N,01131.000,E,1,08,0.9,545.4,M,46.9,M,,*47',
      '$GPGSA,A,3,04,05,,09,12,,,24,,,,,2.5,1.3,2.1*39'
    ].join('\n');

    fs.readFile = jest.fn();
    fileDataSource = new FileDataSource(config);
  });

  afterEach(() => {
    jest.clearAllMocks();
    if (fileDataSource.playbackTimer) {
      clearInterval(fileDataSource.playbackTimer);
    }
  });

  describe('Constructor', () => {
    test('should initialize with correct configuration', () => {
      expect(fileDataSource.config).toEqual(config);
      expect(fileDataSource.nmeaLines).toEqual([]);
      expect(fileDataSource.currentLineIndex).toBe(0);
      expect(fileDataSource.isPlaying).toBe(false);
    });

    test('should initialize stats correctly', () => {
      expect(fileDataSource.stats).toEqual({
        totalLines: 0,
        currentLine: 0,
        messagesStreamed: 0,
        startTime: null,
        loopCount: 0
      });
    });
  });

  describe('loadFile()', () => {
    test('should load and parse NMEA file successfully', async () => {
      fs.readFile.mockImplementation((filePath, encoding, callback) => {
        callback(null, mockNmeaData);
      });

      await fileDataSource.loadFile();

      expect(fs.readFile).toHaveBeenCalledWith(
        config.filePath,
        'utf8', 
        expect.any(Function)
      );
      expect(fileDataSource.nmeaLines).toHaveLength(3);
      expect(fileDataSource.stats.totalLines).toBe(3);
    });

    test('should reject on file read error', async () => {
      const error = new Error('File not found');
      fs.readFile.mockImplementation((filePath, encoding, callback) => {
        callback(error);
      });

      await expect(fileDataSource.loadFile()).rejects.toThrow('File not found');
    });

    test('should filter out empty lines', async () => {
      const dataWithEmptyLines = mockNmeaData + '\n\n\n';
      fs.readFile.mockImplementation((filePath, encoding, callback) => {
        callback(null, dataWithEmptyLines);
      });

      await fileDataSource.loadFile();

      expect(fileDataSource.nmeaLines).toHaveLength(3);
      expect(fileDataSource.stats.totalLines).toBe(3);
    });

    test('should emit status events during loading', async () => {
      const statusSpy = jest.fn();
      fileDataSource.on('status', statusSpy);

      fs.readFile.mockImplementation((filePath, encoding, callback) => {
        callback(null, mockNmeaData);
      });

      await fileDataSource.loadFile();

      expect(statusSpy).toHaveBeenCalledWith(`Loading file: ${config.filePath}`);
      expect(statusSpy).toHaveBeenCalledWith(`Loaded 3 NMEA sentences from file`);
    });
  });

  describe('start()', () => {
    beforeEach(() => {
      fs.readFile.mockImplementation((filePath, encoding, callback) => {
        callback(null, mockNmeaData);
      });
    });

    test('should start playback successfully', async () => {
      const statusSpy = jest.fn();
      fileDataSource.on('status', statusSpy);

      await fileDataSource.start();

      expect(fileDataSource.isPlaying).toBe(true);
      expect(fileDataSource.stats.startTime).toBeTruthy();
      expect(statusSpy).toHaveBeenCalledWith('Started file playback');
    });

    test('should handle file load error during start', async () => {
      const error = new Error('Load failed');
      fs.readFile.mockImplementation((filePath, encoding, callback) => {
        callback(error);
      });

      const errorSpy = jest.fn();
      fileDataSource.on('error', errorSpy);

      await expect(fileDataSource.start()).rejects.toThrow('Load failed');
      expect(errorSpy).toHaveBeenCalledWith(error);
    });
  });

  describe('playback behavior', () => {
    beforeEach(async () => {
      fs.readFile.mockImplementation((filePath, encoding, callback) => {
        callback(null, mockNmeaData);
      });
      await fileDataSource.start();
    });

    test('should emit data events during playback', (done) => {
      const dataSpy = jest.fn();
      fileDataSource.on('data', dataSpy);

      // Wait for some messages to be emitted
      setTimeout(() => {
        expect(dataSpy).toHaveBeenCalled();
        expect(fileDataSource.stats.messagesStreamed).toBeGreaterThan(0);
        done();
      }, 50);
    });

    test('should respect playback rate', (done) => {
      const fastConfig = { ...config, rate: 1000 }; // 1000 msg/sec
      const fastSource = new FileDataSource(fastConfig);
      
      fs.readFile.mockImplementation((filePath, encoding, callback) => {
        callback(null, mockNmeaData);
      });

      const dataSpy = jest.fn();
      fastSource.on('data', dataSpy);

      fastSource.start().then(() => {
        setTimeout(() => {
          // Should have processed more messages with higher rate
          expect(fastSource.stats.messagesStreamed).toBeGreaterThan(0);
          fastSource.stop();
          done();
        }, 20);
      });
    });

    test('should stop at end of file when loop is false', (done) => {
      const completeSpy = jest.fn();
      fileDataSource.on('complete', completeSpy);

      // Fast forward through all messages
      fileDataSource.currentLineIndex = fileDataSource.nmeaLines.length;

      setTimeout(() => {
        expect(completeSpy).toHaveBeenCalled();
        expect(fileDataSource.isPlaying).toBe(false);
        done();
      }, 100);
    });

    test('should loop when loop is enabled', async () => {
      const loopConfig = { ...config, loop: true };
      const loopSource = new FileDataSource(loopConfig);
      
      fs.readFile.mockImplementation((filePath, encoding, callback) => {
        callback(null, mockNmeaData);
      });

      await loopSource.start();

      // Simulate reaching end of file
      loopSource.currentLineIndex = loopSource.nmeaLines.length;
      loopSource.checkPlaybackComplete();

      expect(loopSource.currentLineIndex).toBe(0);
      expect(loopSource.stats.loopCount).toBe(1);
      expect(loopSource.isPlaying).toBe(true);

      loopSource.stop();
    });
  });

  describe('stop()', () => {
    beforeEach(async () => {
      fs.readFile.mockImplementation((filePath, encoding, callback) => {
        callback(null, mockNmeaData);
      });
      await fileDataSource.start();
    });

    test('should stop playback cleanly', async () => {
      const statusSpy = jest.fn();
      fileDataSource.on('status', statusSpy);

      await fileDataSource.stop();

      expect(fileDataSource.isPlaying).toBe(false);
      expect(fileDataSource.playbackTimer).toBeNull();
      expect(statusSpy).toHaveBeenCalledWith('File playback stopped');
    });

    test('should handle stop when not playing', async () => {
      await fileDataSource.stop();
      
      // Should not throw and should call stop again
      await expect(fileDataSource.stop()).resolves.toBeUndefined();
    });
  });

  describe('getStatus()', () => {
    test('should return correct status information', async () => {
      fs.readFile.mockImplementation((filePath, encoding, callback) => {
        callback(null, mockNmeaData);
      });
      await fileDataSource.start();

      const status = fileDataSource.getStatus();

      expect(status.isPlaying).toBe(true);
      expect(status.progress).toBeDefined();
      expect(status.stats).toEqual(fileDataSource.stats);
      expect(status.config).toEqual(config);
    });

    test('should calculate progress correctly', async () => {
      fs.readFile.mockImplementation((filePath, encoding, callback) => {
        callback(null, mockNmeaData);
      });
      await fileDataSource.loadFile();

      fileDataSource.currentLineIndex = 1;
      fileDataSource.stats.currentLine = 1;

      const status = fileDataSource.getStatus();
      expect(status.progress).toBeCloseTo(33.33, 1); // 1/3 * 100
    });
  });

  describe('pause() and resume()', () => {
    beforeEach(async () => {
      fs.readFile.mockImplementation((filePath, encoding, callback) => {
        callback(null, mockNmeaData);
      });
      await fileDataSource.start();
    });

    test('should pause playback', () => {
      fileDataSource.pause();

      expect(fileDataSource.isPlaying).toBe(false);
      expect(fileDataSource.playbackTimer).toBeNull();
    });

    test('should resume playback', () => {
      fileDataSource.pause();
      fileDataSource.resume();

      expect(fileDataSource.isPlaying).toBe(true);
      expect(fileDataSource.playbackTimer).toBeTruthy();
    });
  });
});