/**
 * Unit tests for nmeaStore
 * Tests Zustand state management, NMEA data updates, and alarm evaluation logic
 */

import { useNmeaStore } from "../../../src/store/nmeaStore";
import { useNmeaStore } from "../../../src/store/nmeaStore";

describe('nmeaStore', () => {
  beforeEach(() => {
    useNmeaStore.getState().reset();
  });

  describe('Initial State', () => {
    it('should have correct initial state', () => {
      const state = useNmeaStore.getState();
      
      expect(state.connectionStatus).toBe('disconnected');
      expect(state.nmeaData).toEqual({});
      expect(state.alarms).toEqual([]);
      expect(state.alarmHistory).toEqual([]);
      expect(state.lastError).toBeUndefined();
    });
  });

  describe('Connection Status', () => {
    it('should update connection status', () => {
      useNmeaStore.getState().setConnectionStatus('connecting');
      expect(useNmeaStore.getState().connectionStatus).toBe('connecting');
      
      useNmeaStore.getState().setConnectionStatus('connected');
      expect(useNmeaStore.getState().connectionStatus).toBe('connected');
      
      useNmeaStore.getState().setConnectionStatus('disconnected');
      expect(useNmeaStore.getState().connectionStatus).toBe('disconnected');
    });

    it('should support no-data status', () => {
      useNmeaStore.getState().setConnectionStatus('no-data');
      expect(useNmeaStore.getState().connectionStatus).toBe('no-data');
    });
  });

  describe('NMEA Data Updates', () => {
    it('should update partial NMEA data without overwriting existing data', () => {
      useNmeaStore.getState().setNmeaData({ depth: 10.5 });
      useNmeaStore.getState().setNmeaData({ speed: 6.3 });
      
      const { nmeaData } = useNmeaStore.getState();
      expect(nmeaData.depth).toBe(10.5);
      expect(nmeaData.speed).toBe(6.3);
    });

    it('should update GPS position data', () => {
      const gpsPos = { lat: 37.7749, lon: -122.4194 };
      useNmeaStore.getState().setNmeaData({ gpsPosition: gpsPos });
      
      expect(useNmeaStore.getState().nmeaData.gpsPosition).toEqual(gpsPos);
    });

    it('should update complex nested data like engine telemetry', () => {
      const engineData = {
        rpm: 2500,
        coolantTemp: 85,
        oilPressure: 45,
      };
      
      useNmeaStore.getState().setNmeaData({ engine: engineData });
      expect(useNmeaStore.getState().nmeaData.engine).toEqual(engineData);
    });

    it('should update autopilot status', () => {
      const autopilotData = {
        mode: 'AUTO',
        targetHeading: 270,
        rudderPosition: -5,
        active: true,
      };
      
      useNmeaStore.getState().setNmeaData({ autopilot: autopilotData });
      expect(useNmeaStore.getState().nmeaData.autopilot).toEqual(autopilotData);
    });
  });

  describe('Error Handling', () => {
    it('should set and clear error messages', () => {
      useNmeaStore.getState().setLastError('Connection timeout');
      expect(useNmeaStore.getState().lastError).toBe('Connection timeout');
      
      useNmeaStore.getState().setLastError(undefined);
      expect(useNmeaStore.getState().lastError).toBeUndefined();
    });
  });

  describe('Alarm Evaluation', () => {
    it('should trigger shallow depth alarm when depth < 2m', () => {
      useNmeaStore.getState().setNmeaData({ depth: 1.5 });
      
      const { alarms } = useNmeaStore.getState();
      expect(alarms.length).toBe(1);
      expect(alarms[0].id).toBe('shallow-depth');
      expect(alarms[0].level).toBe('critical');
      expect(alarms[0].message).toContain('1.5');
    });

    it('should not trigger shallow depth alarm when depth >= 2m', () => {
      useNmeaStore.getState().setNmeaData({ depth: 5.0 });
      
      const { alarms } = useNmeaStore.getState();
      expect(alarms.length).toBe(0);
    });

    it('should trigger low battery alarm when house battery < 11.5V', () => {
      useNmeaStore.getState().setNmeaData({ 
        battery: { house: 11.0, engine: 13.2 } 
      });
      
      const { alarms } = useNmeaStore.getState();
      expect(alarms.length).toBe(1);
      expect(alarms[0].id).toBe('low-house-battery');
      expect(alarms[0].level).toBe('warning');
    });

    it('should trigger engine overheat alarm when coolant temp > 95°C', () => {
      useNmeaStore.getState().setNmeaData({ 
        engine: { coolantTemp: 98 } 
      });
      
      const { alarms } = useNmeaStore.getState();
      expect(alarms.length).toBe(1);
      expect(alarms[0].id).toBe('engine-overheat');
      expect(alarms[0].level).toBe('critical');
    });

    it('should trigger multiple alarms simultaneously', () => {
      useNmeaStore.getState().setNmeaData({ 
        depth: 1.0,
        battery: { house: 10.5 },
        engine: { coolantTemp: 100 }
      });
      
      const { alarms } = useNmeaStore.getState();
      expect(alarms.length).toBe(3);
      
      const alarmIds = alarms.map(a => a.id);
      expect(alarmIds).toContain('shallow-depth');
      expect(alarmIds).toContain('low-house-battery');
      expect(alarmIds).toContain('engine-overheat');
    });

    it('should clear alarms when conditions improve', () => {
      // Trigger alarm
      useNmeaStore.getState().setNmeaData({ depth: 1.5 });
      expect(useNmeaStore.getState().alarms.length).toBe(1);
      
      // Improve condition
      useNmeaStore.getState().setNmeaData({ depth: 5.0 });
      expect(useNmeaStore.getState().alarms.length).toBe(0);
    });
  });

  describe('Alarm History', () => {
    it('should maintain alarm history when alarms are triggered', () => {
      useNmeaStore.getState().setNmeaData({ depth: 1.5 });
      
      const { alarmHistory } = useNmeaStore.getState();
      expect(alarmHistory.length).toBe(1);
      expect(alarmHistory[0].id).toBe('shallow-depth');
    });

    it('should not duplicate alarms in history with same id and timestamp', () => {
      const testData = { depth: 1.5 };
      
      useNmeaStore.getState().setNmeaData(testData);
      const firstHistoryLength = useNmeaStore.getState().alarmHistory.length;
      
      // Update again with same data (same timestamp within the same test tick)
      useNmeaStore.getState().setNmeaData(testData);
      const secondHistoryLength = useNmeaStore.getState().alarmHistory.length;
      
      // History should not grow if it's the same alarm
      expect(secondHistoryLength).toBe(firstHistoryLength);
    });

    it('should preserve alarm history when conditions improve', () => {
      useNmeaStore.getState().setNmeaData({ depth: 1.5 });
      expect(useNmeaStore.getState().alarmHistory.length).toBe(1);
      
      useNmeaStore.getState().setNmeaData({ depth: 5.0 });
      
      // Active alarms should be clear but history preserved
      expect(useNmeaStore.getState().alarms.length).toBe(0);
      expect(useNmeaStore.getState().alarmHistory.length).toBe(1);
    });
  });

  describe('Manual Alarm Updates', () => {
    it('should allow manual alarm updates via updateAlarms', () => {
      const customAlarms: Alarm[] = [
        {
          id: 'custom-alarm',
          message: 'Custom test alarm',
          level: 'info',
          timestamp: Date.now(),
        },
      ];
      
      useNmeaStore.getState().updateAlarms(customAlarms);
      
      expect(useNmeaStore.getState().alarms).toEqual(customAlarms);
      expect(useNmeaStore.getState().alarmHistory.length).toBe(1);
    });
  });

  describe('Reset Functionality', () => {
    it('should reset all state to initial values', () => {
      // Set various state values
      useNmeaStore.getState().setConnectionStatus('connected');
      useNmeaStore.getState().setNmeaData({ depth: 10, speed: 5 });
      useNmeaStore.getState().setLastError('Test error');
      useNmeaStore.getState().setNmeaData({ depth: 1.0 }); // Trigger alarm
      
      // Verify state is populated
      expect(useNmeaStore.getState().connectionStatus).toBe('connected');
      expect(Object.keys(useNmeaStore.getState().nmeaData).length).toBeGreaterThan(0);
      expect(useNmeaStore.getState().lastError).toBeDefined();
      expect(useNmeaStore.getState().alarms.length).toBeGreaterThan(0);
      
      // Reset
      useNmeaStore.getState().reset();
      
      // Verify reset to initial state
      const state = useNmeaStore.getState();
      expect(state.connectionStatus).toBe('disconnected');
      expect(state.nmeaData).toEqual({});
      expect(state.alarms).toEqual([]);
      expect(state.alarmHistory).toEqual([]);
      expect(state.lastError).toBeUndefined();
    });
  });

  describe('Debug Mode and Raw Sentences (AC3)', () => {
    it('should enable and disable debug mode', () => {
      expect(useNmeaStore.getState().debugMode).toBe(false);
      
      useNmeaStore.getState().setDebugMode(true);
      expect(useNmeaStore.getState().debugMode).toBe(true);
      
      useNmeaStore.getState().setDebugMode(false);
      expect(useNmeaStore.getState().debugMode).toBe(false);
    });

    it('should add raw sentences to history', () => {
      const sentence1 = '$SDDBT,34.4,f,10.5,M,5.7,F*3D';
      const sentence2 = '$GPVTG,054.7,T,034.4,M,6.3,N,11.7,K*48';
      
      useNmeaStore.getState().addRawSentence(sentence1);
      useNmeaStore.getState().addRawSentence(sentence2);
      
      const { rawSentences } = useNmeaStore.getState();
      expect(rawSentences).toContain(sentence1);
      expect(rawSentences).toContain(sentence2);
      expect(rawSentences.length).toBe(2);
    });

    it('should limit raw sentences to 100 entries', () => {
      // Add 150 sentences
      for (let i = 0; i < 150; i++) {
        useNmeaStore.getState().addRawSentence(`$TEST,sentence,${i}*FF`);
      }
      
      const { rawSentences } = useNmeaStore.getState();
      expect(rawSentences.length).toBe(100);
      
      // Verify oldest sentences were removed (FIFO)
      expect(rawSentences[0]).toContain('sentence,50');
      expect(rawSentences[99]).toContain('sentence,149');
    });

    it('should clear raw sentences', () => {
      useNmeaStore.getState().addRawSentence('$TEST1*FF');
      useNmeaStore.getState().addRawSentence('$TEST2*FF');
      
      expect(useNmeaStore.getState().rawSentences.length).toBe(2);
      
      useNmeaStore.getState().clearRawSentences();
      expect(useNmeaStore.getState().rawSentences).toEqual([]);
    });

    it('should reset debug mode and raw sentences on store reset', () => {
      useNmeaStore.getState().setDebugMode(true);
      useNmeaStore.getState().addRawSentence('$TEST*FF');
      
      expect(useNmeaStore.getState().debugMode).toBe(true);
      expect(useNmeaStore.getState().rawSentences.length).toBe(1);
      
      useNmeaStore.getState().reset();
      
      expect(useNmeaStore.getState().debugMode).toBe(false);
      expect(useNmeaStore.getState().rawSentences).toEqual([]);
    });
  });
});
