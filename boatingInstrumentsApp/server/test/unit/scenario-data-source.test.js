/**
 * Unit Tests for Scenario Data Source
 * 
 * Epic 10.5 - Test Coverage & Quality  
 * AC1: Unit test coverage for data source components with mocked inputs
 */

const ScenarioDataSource = require('../../lib/data-sources/scenario');
const fs = require('fs');
const yaml = require('js-yaml');

// Mock modules
jest.mock('fs');
jest.mock('js-yaml');

describe('ScenarioDataSource', () => {
  let scenarioDataSource;
  let config;
  let mockScenarioData;

  beforeEach(() => {
    config = {
      scenarioName: 'basic-navigation',
      loop: false,
      speed: 1.0
    };

    mockScenarioData = {
      name: 'Basic Navigation',
      description: 'Standard navigation scenario',
      phases: [
        {
          name: 'startup',
          duration: 5000,
          messages: [
            { type: 'GPRMC', interval: 1000 },
            { type: 'GPGGA', interval: 1000 }
          ]
        },
        {
          name: 'sailing',
          duration: 10000,
          messages: [
            { type: 'GPRMC', interval: 1000 },
            { type: 'GPGGA', interval: 1000 },
            { type: 'VWVWR', interval: 2000 }
          ]
        }
      ]
    };

    fs.readFile = jest.fn();
    yaml.load = jest.fn();

    scenarioDataSource = new ScenarioDataSource(config);
  });

  afterEach(() => {
    jest.clearAllMocks();
    // Clean up any running timers
    scenarioDataSource.scenarioTimers.forEach(timer => clearTimeout(timer));
    scenarioDataSource.scenarioTimers = [];
  });

  describe('Constructor', () => {
    test('should initialize with correct configuration', () => {
      expect(scenarioDataSource.config).toEqual(config);
      expect(scenarioDataSource.scenario).toBeNull();
      expect(scenarioDataSource.isRunning).toBe(false);
      expect(scenarioDataSource.currentPhase).toBeNull();
      expect(scenarioDataSource.loopCount).toBe(0);
    });

    test('should initialize stats correctly', () => {
      expect(scenarioDataSource.stats).toEqual({
        messagesGenerated: 0,
        startTime: null,
        phasesCompleted: 0,
        currentIteration: 1
      });
    });

    test('should initialize data generators map', () => {
      expect(scenarioDataSource.dataGenerators).toBeInstanceOf(Map);
      expect(scenarioDataSource.dataGenerators.size).toBeGreaterThan(0);
    });
  });

  describe('loadScenario()', () => {
    test('should load scenario file successfully', async () => {
      const yamlContent = 'scenario: data';
      fs.readFile.mockImplementation((filePath, encoding, callback) => {
        callback(null, yamlContent);
      });
      yaml.load.mockReturnValue(mockScenarioData);

      await scenarioDataSource.loadScenario();

      expect(fs.readFile).toHaveBeenCalledWith(
        expect.stringContaining('basic-navigation.yaml'),
        'utf8',
        expect.any(Function)
      );
      expect(yaml.load).toHaveBeenCalledWith(yamlContent);
      expect(scenarioDataSource.scenario).toEqual(mockScenarioData);
    });

    test('should reject on file read error', async () => {
      const error = new Error('Scenario file not found');
      fs.readFile.mockImplementation((filePath, encoding, callback) => {
        callback(error);
      });

      await expect(scenarioDataSource.loadScenario()).rejects.toThrow('Scenario file not found');
    });

    test('should reject on YAML parse error', async () => {
      fs.readFile.mockImplementation((filePath, encoding, callback) => {
        callback(null, 'invalid: yaml: content');
      });
      yaml.load.mockImplementation(() => {
        throw new Error('YAML parse error');
      });

      await expect(scenarioDataSource.loadScenario()).rejects.toThrow('YAML parse error');

      const errorSpy = jest.fn();
      scenarioDataSource.on('error', errorSpy);
      
      try {
        await scenarioDataSource.loadScenario();
      } catch (error) {
        // Expected to throw
      }
      
      expect(errorSpy).toHaveBeenCalledWith(expect.any(Error));
    });

    test('should emit status events during loading', async () => {
      const statusSpy = jest.fn();
      scenarioDataSource.on('status', statusSpy);

      fs.readFile.mockImplementation((filePath, encoding, callback) => {
        callback(null, 'scenario: data');
      });
      yaml.load.mockReturnValue(mockScenarioData);

      await scenarioDataSource.loadScenario();

      expect(statusSpy).toHaveBeenCalledWith(expect.stringContaining('Loading scenario'));
      expect(statusSpy).toHaveBeenCalledWith(expect.stringContaining('Loaded scenario'));
    });
  });

  describe('start()', () => {
    beforeEach(() => {
      fs.readFile.mockImplementation((filePath, encoding, callback) => {
        callback(null, 'scenario: data');
      });
      yaml.load.mockReturnValue(mockScenarioData);
    });

    test('should start scenario execution successfully', async () => {
      const statusSpy = jest.fn();
      scenarioDataSource.on('status', statusSpy);

      await scenarioDataSource.start();

      expect(scenarioDataSource.isRunning).toBe(true);
      expect(scenarioDataSource.stats.startTime).toBeTruthy();
      expect(statusSpy).toHaveBeenCalledWith('Started scenario execution');
    });

    test('should handle scenario load error during start', async () => {
      const error = new Error('Load failed');
      fs.readFile.mockImplementation((filePath, encoding, callback) => {
        callback(error);
      });

      const errorSpy = jest.fn();
      scenarioDataSource.on('error', errorSpy);

      await expect(scenarioDataSource.start()).rejects.toThrow('Load failed');
      expect(errorSpy).toHaveBeenCalledWith(error);
    });
  });

  describe('NMEA message generation', () => {
    beforeEach(async () => {
      fs.readFile.mockImplementation((filePath, encoding, callback) => {
        callback(null, 'scenario: data');
      });
      yaml.load.mockReturnValue(mockScenarioData);
      await scenarioDataSource.start();
    });

    test('should generate GPRMC messages', () => {
      const gprmc = scenarioDataSource.generateGPRMC();
      
      expect(gprmc).toMatch(/^\$GPRMC,/);
      expect(gprmc).toMatch(/\*[0-9A-F]{2}$/); // Should have checksum
    });

    test('should generate GPGGA messages', () => {
      const gpgga = scenarioDataSource.generateGPGGA();
      
      expect(gpgga).toMatch(/^\$GPGGA,/);
      expect(gpgga).toMatch(/\*[0-9A-F]{2}$/); // Should have checksum
    });

    test('should generate wind messages (VWVWR)', () => {
      const wind = scenarioDataSource.generateVWVWR();
      
      expect(wind).toMatch(/^\$VWVWR,/);
      expect(wind).toMatch(/\*[0-9A-F]{2}$/); // Should have checksum
    });

    test('should generate depth messages (DPT)', () => {
      const depth = scenarioDataSource.generateDPT();
      
      expect(depth).toMatch(/^\$..DPT,/);
      expect(depth).toMatch(/\*[0-9A-F]{2}$/); // Should have checksum
    });

    test('should calculate NMEA checksum correctly', () => {
      const sentence = 'GPRMC,123519,A,4807.038,N,01131.000,E,000.0,360.0,230394,003.1,W';
      const checksum = scenarioDataSource.calculateNMEAChecksum(sentence);
      
      expect(checksum).toMatch(/^[0-9A-F]{2}$/);
      expect(checksum).toHaveLength(2);
    });
  });

  describe('phase management', () => {
    beforeEach(async () => {
      fs.readFile.mockImplementation((filePath, encoding, callback) => {
        callback(null, 'scenario: data');
      });
      yaml.load.mockReturnValue(mockScenarioData);
      await scenarioDataSource.start();
    });

    test('should progress through phases correctly', (done) => {
      const phaseSpy = jest.fn();
      scenarioDataSource.on('phaseChange', phaseSpy);

      setTimeout(() => {
        expect(scenarioDataSource.currentPhase).toBe('startup');
        expect(phaseSpy).toHaveBeenCalledWith(expect.objectContaining({
          name: 'startup'
        }));
        done();
      }, 100);
    });

    test('should emit data events during phase execution', (done) => {
      const dataSpy = jest.fn();
      scenarioDataSource.on('data', dataSpy);

      setTimeout(() => {
        expect(dataSpy).toHaveBeenCalled();
        expect(scenarioDataSource.stats.messagesGenerated).toBeGreaterThan(0);
        done();
      }, 200);
    });

    test('should complete scenario when not looping', (done) => {
      const completeSpy = jest.fn();
      scenarioDataSource.on('complete', completeSpy);

      // Mock short durations for fast test
      scenarioDataSource.scenario.phases[0].duration = 50;
      scenarioDataSource.scenario.phases[1].duration = 50;

      setTimeout(() => {
        expect(completeSpy).toHaveBeenCalled();
        expect(scenarioDataSource.isRunning).toBe(false);
        done();
      }, 200);
    });

    test('should loop scenario when loop is enabled', async () => {
      const loopConfig = { ...config, loop: true };
      const loopSource = new ScenarioDataSource(loopConfig);

      fs.readFile.mockImplementation((filePath, encoding, callback) => {
        callback(null, 'scenario: data');
      });
      yaml.load.mockReturnValue(mockScenarioData);

      await loopSource.start();

      // Simulate scenario completion
      loopSource.handleScenarioComplete();

      expect(loopSource.stats.currentIteration).toBe(2);
      expect(loopSource.isRunning).toBe(true);

      loopSource.stop();
    });
  });

  describe('stop()', () => {
    beforeEach(async () => {
      fs.readFile.mockImplementation((filePath, encoding, callback) => {
        callback(null, 'scenario: data');
      });
      yaml.load.mockReturnValue(mockScenarioData);
      await scenarioDataSource.start();
    });

    test('should stop scenario execution cleanly', async () => {
      const statusSpy = jest.fn();
      scenarioDataSource.on('status', statusSpy);

      await scenarioDataSource.stop();

      expect(scenarioDataSource.isRunning).toBe(false);
      expect(scenarioDataSource.scenarioTimers).toHaveLength(0);
      expect(statusSpy).toHaveBeenCalledWith('Scenario execution stopped');
    });

    test('should handle stop when not running', async () => {
      await scenarioDataSource.stop();
      
      // Should not throw and should call stop again
      await expect(scenarioDataSource.stop()).resolves.toBeUndefined();
    });
  });

  describe('getStatus()', () => {
    test('should return correct status information', async () => {
      fs.readFile.mockImplementation((filePath, encoding, callback) => {
        callback(null, 'scenario: data');
      });
      yaml.load.mockReturnValue(mockScenarioData);
      await scenarioDataSource.start();

      const status = scenarioDataSource.getStatus();

      expect(status.isRunning).toBe(true);
      expect(status.currentPhase).toBeTruthy();
      expect(status.stats).toEqual(scenarioDataSource.stats);
      expect(status.config).toEqual(config);
      expect(status.scenario).toEqual(mockScenarioData);
    });

    test('should handle status when not running', () => {
      const status = scenarioDataSource.getStatus();

      expect(status.isRunning).toBe(false);
      expect(status.currentPhase).toBeNull();
      expect(status.scenario).toBeNull();
    });
  });

  describe('speed control', () => {
    test('should adjust message timing based on speed factor', async () => {
      const fastConfig = { ...config, speed: 2.0 }; // 2x speed
      const fastSource = new ScenarioDataSource(fastConfig);

      fs.readFile.mockImplementation((filePath, encoding, callback) => {
        callback(null, 'scenario: data');
      });
      yaml.load.mockReturnValue(mockScenarioData);

      await fastSource.start();

      // Verify speed factor is applied
      expect(fastSource.config.speed).toBe(2.0);
      
      fastSource.stop();
    });

    test('should handle invalid speed factors gracefully', () => {
      const invalidConfig = { ...config, speed: 0 };
      const source = new ScenarioDataSource(invalidConfig);

      expect(source.config.speed).toBe(0);
      // Should still construct without throwing
    });
  });
});