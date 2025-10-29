/**
 * Tests for Unified NMEA Bridge Tool
 * 
 * Epic 10.3 - Tool Consolidation & Unified CLI
 * Tests CLI argument parsing, mode operations, and integration
 */

const { UnifiedNMEABridge } = require('../nmea-bridge');
const fs = require('fs');
const path = require('path');

describe('UnifiedNMEABridge', () => {
  let bridge;

  beforeEach(() => {
    bridge = new UnifiedNMEABridge();
    // Mock process.argv to prevent conflicts
    jest.spyOn(process, 'argv', 'get').mockReturnValue(['node', 'nmea-bridge.js']);
  });

  afterEach(async () => {
    if (bridge && bridge.isRunning) {
      await bridge.shutdown();
    }
    jest.restoreAllMocks();
  });

  describe('CLI Argument Parsing', () => {
    test('should show help when no arguments provided', () => {
      const mockExit = jest.spyOn(process, 'exit').mockImplementation(() => {});
      const mockLog = jest.spyOn(console, 'log').mockImplementation(() => {});
      
      bridge.parseArguments();
      
      expect(mockLog).toHaveBeenCalledWith(expect.stringContaining('Unified NMEA Bridge Tool'));
      expect(mockExit).toHaveBeenCalledWith(0);
    });

    test('should parse live mode arguments correctly', () => {
      process.argv = ['node', 'nmea-bridge.js', '--live', '192.168.1.10', '10110'];
      
      const config = bridge.parseArguments();
      
      expect(config.mode).toBe('live');
      expect(config.host).toBe('192.168.1.10');
      expect(config.port).toBe(10110);
    });

    test('should parse file mode arguments correctly', () => {
      const testFile = path.join(__dirname, 'test.nmea');
      fs.writeFileSync(testFile, '$GPGGA,123519,4807.038,N,01131.000,E,1,08,0.9,545.4,M,46.9,M,,*47\n');
      
      process.argv = ['node', 'nmea-bridge.js', '--file', testFile, '--rate', '20', '--loop'];
      
      const config = bridge.parseArguments();
      
      expect(config.mode).toBe('file');
      expect(config.filePath).toBe(path.resolve(testFile));
      expect(config.rate).toBe(20);
      expect(config.loop).toBe(true);
      
      fs.unlinkSync(testFile);
    });

    test('should parse scenario mode arguments correctly', () => {
      process.argv = ['node', 'nmea-bridge.js', '--scenario', 'basic-navigation', '--loop', '--speed', '2.0'];
      
      const config = bridge.parseArguments();
      
      expect(config.mode).toBe('scenario');
      expect(config.scenarioName).toBe('basic-navigation');
      expect(config.loop).toBe(true);
      expect(config.speed).toBe(2.0);
    });

    test('should reject invalid mode', () => {
      const mockExit = jest.spyOn(process, 'exit').mockImplementation(() => {});
      const mockError = jest.spyOn(console, 'error').mockImplementation(() => {});
      
      process.argv = ['node', 'nmea-bridge.js', '--invalid'];
      
      bridge.parseArguments();
      
      expect(mockError).toHaveBeenCalledWith(expect.stringContaining('Unknown mode: --invalid'));
      expect(mockExit).toHaveBeenCalledWith(1);
    });

    test('should reject file mode with non-existent file', () => {
      const mockExit = jest.spyOn(process, 'exit').mockImplementation(() => {});
      const mockError = jest.spyOn(console, 'error').mockImplementation(() => {});
      
      process.argv = ['node', 'nmea-bridge.js', '--file', '/non/existent/file.nmea'];
      
      bridge.parseArguments();
      
      expect(mockError).toHaveBeenCalledWith(expect.stringContaining('File not found'));
      expect(mockExit).toHaveBeenCalledWith(1);
    });
  });

  describe('Data Source Integration', () => {
    test('should initialize live data source correctly', async () => {
      const config = {
        mode: 'live',
        host: '192.168.1.10',
        port: 10110,
        options: {}
      };

      await bridge.initializeDataSource(config);
      
      expect(bridge.dataSource).toBeDefined();
      expect(bridge.dataSource.constructor.name).toBe('LiveDataSource');
    });

    test('should initialize file data source correctly', async () => {
      const testFile = path.join(__dirname, 'test.nmea');
      fs.writeFileSync(testFile, '$GPGGA,123519,4807.038,N,01131.000,E,1,08,0.9,545.4,M,46.9,M,,*47\n');
      
      const config = {
        mode: 'file',
        filePath: testFile,
        rate: 10,
        loop: false,
        options: {}
      };

      await bridge.initializeDataSource(config);
      
      expect(bridge.dataSource).toBeDefined();
      expect(bridge.dataSource.constructor.name).toBe('FileDataSource');
      
      fs.unlinkSync(testFile);
    });

    test('should initialize scenario data source correctly', async () => {
      const config = {
        mode: 'scenario',
        scenarioName: 'basic-navigation',
        loop: false,
        speed: 1.0,
        options: {}
      };

      await bridge.initializeDataSource(config);
      
      expect(bridge.dataSource).toBeDefined();
      expect(bridge.dataSource.constructor.name).toBe('ScenarioDataSource');
    });

    test('should reject unsupported mode', async () => {
      const config = {
        mode: 'unsupported',
        options: {}
      };

      await expect(bridge.initializeDataSource(config)).rejects.toThrow('Unsupported mode: unsupported');
    });
  });

  describe('Status and Monitoring', () => {
    test('should return correct status when stopped', () => {
      const status = bridge.getStatus();
      
      expect(status.isRunning).toBe(false);
      expect(status.mode).toBe('stopped');
      expect(status.uptime).toBe(0);
    });

    test('should return correct status when running', async () => {
      bridge.isRunning = true;
      bridge.startTime = Date.now() - 5000;
      bridge.config = { mode: 'scenario' };
      
      const status = bridge.getStatus();
      
      expect(status.isRunning).toBe(true);
      expect(status.mode).toBe('scenario');
      expect(status.uptime).toBeGreaterThan(4000);
    });
  });

  describe('Graceful Shutdown', () => {
    test('should handle shutdown gracefully when not running', async () => {
      // Should not throw when not running
      await expect(bridge.shutdown()).resolves.not.toThrow();
    });
  });
});

describe('Data Source Tests', () => {
  describe('LiveDataSource', () => {
    const LiveDataSource = require('../lib/data-sources/live');
    
    test('should create with correct configuration', () => {
      const config = { host: '192.168.1.10', port: 10110 };
      const dataSource = new LiveDataSource(config);
      
      expect(dataSource.config).toEqual(config);
      expect(dataSource.isConnected).toBe(false);
    });

    test('should return correct status', () => {
      const config = { host: '192.168.1.10', port: 10110 };
      const dataSource = new LiveDataSource(config);
      
      const status = dataSource.getStatus();
      
      expect(status.type).toBe('live');
      expect(status.host).toBe('192.168.1.10');
      expect(status.port).toBe(10110);
      expect(status.isConnected).toBe(false);
    });
  });

  describe('FileDataSource', () => {
    const FileDataSource = require('../lib/data-sources/file');
    
    test('should create with correct configuration', () => {
      const config = { filePath: '/test/file.nmea', rate: 10, loop: false };
      const dataSource = new FileDataSource(config);
      
      expect(dataSource.config).toEqual(config);
      expect(dataSource.isPlaying).toBe(false);
    });

    test('should return correct status', () => {
      const config = { filePath: '/test/file.nmea', rate: 10, loop: false };
      const dataSource = new FileDataSource(config);
      
      const status = dataSource.getStatus();
      
      expect(status.type).toBe('file');
      expect(status.fileName).toBe('file.nmea');
      expect(status.rate).toBe(10);
      expect(status.loop).toBe(false);
      expect(status.isPlaying).toBe(false);
    });
  });

  describe('ScenarioDataSource', () => {
    const ScenarioDataSource = require('../lib/data-sources/scenario');
    
    test('should create with correct configuration', () => {
      const config = { scenarioName: 'basic-navigation', loop: false, speed: 1.0 };
      const dataSource = new ScenarioDataSource(config);
      
      expect(dataSource.config).toEqual(config);
      expect(dataSource.isRunning).toBe(false);
    });

    test('should return correct status', () => {
      const config = { scenarioName: 'basic-navigation', loop: false, speed: 1.0 };
      const dataSource = new ScenarioDataSource(config);
      
      const status = dataSource.getStatus();
      
      expect(status.type).toBe('scenario');
      expect(status.scenarioName).toBe('basic-navigation');
      expect(status.loop).toBe(false);
      expect(status.speed).toBe(1.0);
      expect(status.isRunning).toBe(false);
    });

    test('should generate NMEA checksum correctly', () => {
      const config = { scenarioName: 'basic-navigation', loop: false, speed: 1.0 };
      const dataSource = new ScenarioDataSource(config);
      
      const checksum = dataSource.calculateChecksum('GPGGA,123519,4807.038,N,01131.000,E,1,08,0.9,545.4,M,46.9,M,,');
      
      expect(checksum).toBe('47');
    });
  });
});