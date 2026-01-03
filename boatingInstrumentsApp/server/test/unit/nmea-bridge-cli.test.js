/**
 * Unit Tests for NMEA Bridge CLI Interface
 *
 * Epic 10.5 - Test Coverage & Quality
 * AC1: CLI interface tested for mode parsing, argument validation, configuration loading
 */

// Import UnifiedNMEABridge from nmea-bridge.js for testing CLI functionality
const path = require('path');
const fs = require('fs');

// Mock child_process for CLI testing
jest.mock('child_process');
const { spawn } = require('child_process');

describe('NMEA Bridge CLI Interface', () => {
  let originalArgv;
  let originalExit;
  let exitCode;

  beforeEach(() => {
    originalArgv = process.argv;
    originalExit = process.exit;

    // Mock process.exit to capture exit codes
    process.exit = jest.fn((code) => {
      exitCode = code;
    });

    // Mock console methods
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    process.argv = originalArgv;
    process.exit = originalExit;
    exitCode = undefined;
    jest.restoreAllMocks();
  });

  describe('Argument Parsing', () => {
    test('should show help when no arguments provided', () => {
      // Simulate running with no arguments
      process.argv = ['node', 'nmea-bridge.js'];

      // Import and trigger argument parsing
      delete require.cache[require.resolve('../../nmea-bridge.js')];
      require('../../nmea-bridge.js');

      // Should call process.exit(0) for help
      expect(process.exit).toHaveBeenCalledWith(0);
      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('Unified NMEA Bridge Tool'));
    });

    test('should show help with --help flag', () => {
      process.argv = ['node', 'nmea-bridge.js', '--help'];

      delete require.cache[require.resolve('../../nmea-bridge.js')];
      require('../../nmea-bridge.js');

      expect(process.exit).toHaveBeenCalledWith(0);
      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('Usage:'));
    });

    test('should show version with --version flag', () => {
      process.argv = ['node', 'nmea-bridge.js', '--version'];

      delete require.cache[require.resolve('../../nmea-bridge.js')];
      require('../../nmea-bridge.js');

      expect(process.exit).toHaveBeenCalledWith(0);
      expect(console.log).toHaveBeenCalledWith(expect.stringMatching(/\d+\.\d+\.\d+/));
    });
  });

  describe('Live Mode Arguments', () => {
    test('should parse live mode arguments correctly', () => {
      process.argv = ['node', 'nmea-bridge.js', '--live', '192.168.1.10', '10110'];

      const { UnifiedNMEABridge } = require('../../nmea-bridge.js');
      const bridge = new UnifiedNMEABridge();

      const config = bridge.parseArguments();

      expect(config.mode).toBe('live');
      expect(config.host).toBe('192.168.1.10');
      expect(config.port).toBe(10110);
    });

    test('should reject live mode without host', () => {
      process.argv = ['node', 'nmea-bridge.js', '--live'];

      const { UnifiedNMEABridge } = require('../../nmea-bridge.js');
      const bridge = new UnifiedNMEABridge();

      bridge.parseArguments();

      expect(process.exit).toHaveBeenCalledWith(1);
      expect(console.error).toHaveBeenCalledWith(expect.stringContaining('Host and port required'));
    });

    test('should reject live mode without port', () => {
      process.argv = ['node', 'nmea-bridge.js', '--live', '192.168.1.10'];

      const { UnifiedNMEABridge } = require('../../nmea-bridge.js');
      const bridge = new UnifiedNMEABridge();

      bridge.parseArguments();

      expect(process.exit).toHaveBeenCalledWith(1);
      expect(console.error).toHaveBeenCalledWith(expect.stringContaining('Host and port required'));
    });

    test('should validate IP address format', () => {
      process.argv = ['node', 'nmea-bridge.js', '--live', 'invalid-ip', '10110'];

      const { UnifiedNMEABridge } = require('../../nmea-bridge.js');
      const bridge = new UnifiedNMEABridge();

      bridge.parseArguments();

      expect(process.exit).toHaveBeenCalledWith(1);
      expect(console.error).toHaveBeenCalledWith(expect.stringContaining('Invalid IP address'));
    });

    test('should validate port number range', () => {
      process.argv = ['node', 'nmea-bridge.js', '--live', '192.168.1.10', '99999'];

      const { UnifiedNMEABridge } = require('../../nmea-bridge.js');
      const bridge = new UnifiedNMEABridge();

      bridge.parseArguments();

      expect(process.exit).toHaveBeenCalledWith(1);
      expect(console.error).toHaveBeenCalledWith(
        expect.stringContaining('Port must be between 1 and 65535'),
      );
    });
  });

  describe('File Mode Arguments', () => {
    test('should parse file mode arguments correctly', () => {
      const testFilePath = '/path/to/test.nmea';
      process.argv = ['node', 'nmea-bridge.js', '--file', testFilePath];

      const { UnifiedNMEABridge } = require('../../nmea-bridge.js');
      const bridge = new UnifiedNMEABridge();

      const config = bridge.parseArguments();

      expect(config.mode).toBe('file');
      expect(config.filePath).toBe(testFilePath);
      expect(config.rate).toBe(10); // Default rate
      expect(config.loop).toBe(false); // Default loop
    });

    test('should parse file mode with rate parameter', () => {
      process.argv = ['node', 'nmea-bridge.js', '--file', '/path/to/test.nmea', '--rate', '50'];

      const { UnifiedNMEABridge } = require('../../nmea-bridge.js');
      const bridge = new UnifiedNMEABridge();

      const config = bridge.parseArguments();

      expect(config.mode).toBe('file');
      expect(config.rate).toBe(50);
    });

    test('should parse file mode with loop parameter', () => {
      process.argv = ['node', 'nmea-bridge.js', '--file', '/path/to/test.nmea', '--loop'];

      const { UnifiedNMEABridge } = require('../../nmea-bridge.js');
      const bridge = new UnifiedNMEABridge();

      const config = bridge.parseArguments();

      expect(config.mode).toBe('file');
      expect(config.loop).toBe(true);
    });

    test('should reject file mode without file path', () => {
      process.argv = ['node', 'nmea-bridge.js', '--file'];

      const { UnifiedNMEABridge } = require('../../nmea-bridge.js');
      const bridge = new UnifiedNMEABridge();

      bridge.parseArguments();

      expect(process.exit).toHaveBeenCalledWith(1);
      expect(console.error).toHaveBeenCalledWith(expect.stringContaining('File path is required'));
    });

    test('should validate rate parameter', () => {
      process.argv = [
        'node',
        'nmea-bridge.js',
        '--file',
        '/path/to/test.nmea',
        '--rate',
        'invalid',
      ];

      const { UnifiedNMEABridge } = require('../../nmea-bridge.js');
      const bridge = new UnifiedNMEABridge();

      bridge.parseArguments();

      expect(process.exit).toHaveBeenCalledWith(1);
      expect(console.error).toHaveBeenCalledWith(
        expect.stringContaining('Rate must be a valid number'),
      );
    });
  });

  describe('Scenario Mode Arguments', () => {
    test('should parse scenario mode arguments correctly', () => {
      process.argv = ['node', 'nmea-bridge.js', '--scenario', 'basic-navigation'];

      const { UnifiedNMEABridge } = require('../../nmea-bridge.js');
      const bridge = new UnifiedNMEABridge();

      const config = bridge.parseArguments();

      expect(config.mode).toBe('scenario');
      expect(config.scenarioName).toBe('basic-navigation');
      expect(config.loop).toBe(false); // Default loop
      expect(config.speed).toBe(1.0); // Default speed
    });

    test('should parse scenario mode with loop parameter', () => {
      process.argv = ['node', 'nmea-bridge.js', '--scenario', 'basic-navigation', '--loop'];

      const { UnifiedNMEABridge } = require('../../nmea-bridge.js');
      const bridge = new UnifiedNMEABridge();

      const config = bridge.parseArguments();

      expect(config.mode).toBe('scenario');
      expect(config.loop).toBe(true);
    });

    test('should parse scenario mode with speed parameter', () => {
      process.argv = ['node', 'nmea-bridge.js', '--scenario', 'basic-navigation', '--speed', '2.5'];

      const { UnifiedNMEABridge } = require('../../nmea-bridge.js');
      const bridge = new UnifiedNMEABridge();

      const config = bridge.parseArguments();

      expect(config.mode).toBe('scenario');
      expect(config.speed).toBe(2.5);
    });

    test('should reject scenario mode without scenario name', () => {
      process.argv = ['node', 'nmea-bridge.js', '--scenario'];

      const { UnifiedNMEABridge } = require('../../nmea-bridge.js');
      const bridge = new UnifiedNMEABridge();

      bridge.parseArguments();

      expect(process.exit).toHaveBeenCalledWith(1);
      expect(console.error).toHaveBeenCalledWith(
        expect.stringContaining('Scenario name is required'),
      );
    });

    test('should validate speed parameter', () => {
      process.argv = [
        'node',
        'nmea-bridge.js',
        '--scenario',
        'basic-navigation',
        '--speed',
        'invalid',
      ];

      const { UnifiedNMEABridge } = require('../../nmea-bridge.js');
      const bridge = new UnifiedNMEABridge();

      bridge.parseArguments();

      expect(process.exit).toHaveBeenCalledWith(1);
      expect(console.error).toHaveBeenCalledWith(
        expect.stringContaining('Speed must be a valid number'),
      );
    });

    test('should validate speed parameter range', () => {
      process.argv = ['node', 'nmea-bridge.js', '--scenario', 'basic-navigation', '--speed', '0'];

      const { UnifiedNMEABridge } = require('../../nmea-bridge.js');
      const bridge = new UnifiedNMEABridge();

      bridge.parseArguments();

      expect(process.exit).toHaveBeenCalledWith(1);
      expect(console.error).toHaveBeenCalledWith(
        expect.stringContaining('Speed must be greater than 0'),
      );
    });
  });

  describe('Global Options', () => {
    test('should parse quiet mode flag', () => {
      process.argv = ['node', 'nmea-bridge.js', '--scenario', 'basic-navigation', '--quiet'];

      const { UnifiedNMEABridge } = require('../../nmea-bridge.js');
      const bridge = new UnifiedNMEABridge();

      const config = bridge.parseArguments();

      expect(config.quiet).toBe(true);
    });

    test('should parse verbose mode flag', () => {
      process.argv = ['node', 'nmea-bridge.js', '--scenario', 'basic-navigation', '--verbose'];

      const { UnifiedNMEABridge } = require('../../nmea-bridge.js');
      const bridge = new UnifiedNMEABridge();

      const config = bridge.parseArguments();

      expect(config.verbose).toBe(true);
    });

    test('should handle conflicting quiet and verbose flags', () => {
      process.argv = [
        'node',
        'nmea-bridge.js',
        '--scenario',
        'basic-navigation',
        '--quiet',
        '--verbose',
      ];

      const { UnifiedNMEABridge } = require('../../nmea-bridge.js');
      const bridge = new UnifiedNMEABridge();

      bridge.parseArguments();

      expect(process.exit).toHaveBeenCalledWith(1);
      expect(console.error).toHaveBeenCalledWith(
        expect.stringContaining('Cannot use both --quiet and --verbose'),
      );
    });
  });

  describe('Configuration Loading', () => {
    test('should load default configuration', () => {
      const { UnifiedNMEABridge } = require('../../nmea-bridge.js');
      const bridge = new UnifiedNMEABridge();

      const config = bridge.loadConfiguration({
        mode: 'scenario',
        scenarioName: 'basic-navigation',
      });

      expect(config.server).toBeDefined();
      expect(config.server.tcpPort).toBe(2000);
      expect(config.server.udpPort).toBe(2000);
      expect(config.server.wsPort).toBe(8080);
      expect(config.server.maxClients).toBe(50);
    });

    test('should merge user configuration with defaults', () => {
      const { UnifiedNMEABridge } = require('../../nmea-bridge.js');
      const bridge = new UnifiedNMEABridge();

      const userConfig = {
        mode: 'live',
        host: '192.168.1.10',
        port: 10110,
        server: {
          maxClients: 100, // Override default
        },
      };

      const config = bridge.loadConfiguration(userConfig);

      expect(config.server.maxClients).toBe(100);
      expect(config.server.tcpPort).toBe(2000); // Should keep default
    });

    test('should validate required configuration fields', () => {
      const { UnifiedNMEABridge } = require('../../nmea-bridge.js');
      const bridge = new UnifiedNMEABridge();

      const invalidConfig = {
        mode: 'live',
        // Missing required host and port
      };

      expect(() => {
        bridge.validateConfiguration(invalidConfig);
      }).toThrow();
    });
  });

  describe('Mode-specific Validation', () => {
    test('should validate live mode configuration', () => {
      const { UnifiedNMEABridge } = require('../../nmea-bridge.js');
      const bridge = new UnifiedNMEABridge();

      const config = {
        mode: 'live',
        host: '192.168.1.10',
        port: 10110,
      };

      expect(() => {
        bridge.validateConfiguration(config);
      }).not.toThrow();
    });

    test('should validate file mode configuration', () => {
      const { UnifiedNMEABridge } = require('../../nmea-bridge.js');
      const bridge = new UnifiedNMEABridge();

      const config = {
        mode: 'file',
        filePath: '/path/to/test.nmea',
        rate: 10,
        loop: false,
      };

      expect(() => {
        bridge.validateConfiguration(config);
      }).not.toThrow();
    });

    test('should validate scenario mode configuration', () => {
      const { UnifiedNMEABridge } = require('../../nmea-bridge.js');
      const bridge = new UnifiedNMEABridge();

      const config = {
        mode: 'scenario',
        scenarioName: 'basic-navigation',
        speed: 1.0,
        loop: false,
      };

      expect(() => {
        bridge.validateConfiguration(config);
      }).not.toThrow();
    });
  });

  describe('Error Handling', () => {
    test('should handle unknown arguments gracefully', () => {
      process.argv = ['node', 'nmea-bridge.js', '--unknown-flag'];

      const { UnifiedNMEABridge } = require('../../nmea-bridge.js');
      const bridge = new UnifiedNMEABridge();

      bridge.parseArguments();

      expect(process.exit).toHaveBeenCalledWith(1);
      expect(console.error).toHaveBeenCalledWith(expect.stringContaining('Unknown argument'));
    });

    test('should handle invalid mode combinations', () => {
      process.argv = [
        'node',
        'nmea-bridge.js',
        '--live',
        '192.168.1.10',
        '10110',
        '--file',
        '/path/to/test.nmea',
      ];

      const { UnifiedNMEABridge } = require('../../nmea-bridge.js');
      const bridge = new UnifiedNMEABridge();

      bridge.parseArguments();

      expect(process.exit).toHaveBeenCalledWith(1);
      expect(console.error).toHaveBeenCalledWith(
        expect.stringContaining('Cannot specify multiple modes'),
      );
    });

    test('should provide helpful error messages', () => {
      process.argv = ['node', 'nmea-bridge.js', '--live', 'invalid-ip', 'invalid-port'];

      const { UnifiedNMEABridge } = require('../../nmea-bridge.js');
      const bridge = new UnifiedNMEABridge();

      bridge.parseArguments();

      expect(console.error).toHaveBeenCalledWith(expect.stringContaining('Invalid IP address'));
    });
  });
});
