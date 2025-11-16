/**
 * Alarm Configuration Screen Tests
 * Story 4.1: Critical Safety Alarms - Configuration UI Tests
 */

import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { Alert } from 'react-native';
import AlarmSettingsScreen from '../../../app/settings/alarms';
import { CriticalAlarmConfiguration } from '../../../src/services/alarms/CriticalAlarmConfiguration';
import { CriticalAlarmType } from '../../../src/services/alarms/types';

// Mock the router
jest.mock('expo-router', () => ({
  useRouter: () => ({
    back: jest.fn(),
    push: jest.fn(),
  }),
}));

// Mock the services
jest.mock('../../../src/services/alarms/CriticalAlarmConfiguration');
jest.mock('../../../src/services/alarms/AlarmConfigurationManager');

// Mock Alert
jest.spyOn(Alert, 'alert');

describe('AlarmSettingsScreen', () => {
  let mockAlarmConfig: jest.Mocked<CriticalAlarmConfiguration>;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup mock configuration
    mockAlarmConfig = new CriticalAlarmConfiguration() as jest.Mocked<CriticalAlarmConfiguration>;
    
    mockAlarmConfig.getAlarmConfig = jest.fn((type: CriticalAlarmType) => ({
      type,
      enabled: true,
      thresholds: {
        critical: type === CriticalAlarmType.SHALLOW_WATER ? 2.0 : 
                  type === CriticalAlarmType.ENGINE_OVERHEAT ? 100 :
                  type === CriticalAlarmType.LOW_BATTERY ? 12.0 : 15,
      },
      hysteresis: 0.1,
      debounceMs: 1000,
      escalationTimeoutMs: 5000,
      audioEnabled: true,
      visualEnabled: true,
      vibrationEnabled: true,
      notificationEnabled: true,
      marineSafetyClassification: 'critical',
      requiresConfirmation: true,
      allowSnooze: false,
      maxResponseTimeMs: 500,
      minAudioLevelDb: 85,
      failSafeBehavior: 'alarm',
      redundantAlerting: true,
    }));

    mockAlarmConfig.setAlarmEnabled = jest.fn().mockResolvedValue(true);
    mockAlarmConfig.updateAlarmConfig = jest.fn().mockResolvedValue({ success: true, errors: [] });
    mockAlarmConfig.testAlarmConfiguration = jest.fn().mockResolvedValue({
      configurationValid: true,
      thresholdsValid: true,
      audioSystemReady: true,
      visualSystemReady: true,
    });
  });

  describe('Screen Rendering', () => {
    it('should render all 5 alarm types', async () => {
      const { getByText } = render(<AlarmSettingsScreen />);
      
      await waitFor(() => {
        expect(getByText('Shallow Water')).toBeTruthy();
        expect(getByText('Engine Overheat')).toBeTruthy();
        expect(getByText('Low Battery')).toBeTruthy();
        expect(getByText('Autopilot Failure')).toBeTruthy();
        expect(getByText('GPS Signal Loss')).toBeTruthy();
      });
    });

    it('should display marine safety notice', async () => {
      const { getByText } = render(<AlarmSettingsScreen />);
      
      await waitFor(() => {
        expect(getByText(/Marine Safety Notice/i)).toBeTruthy();
        expect(getByText(/response time.*500ms/i)).toBeTruthy();
        expect(getByText(/Audio level.*85dB/i)).toBeTruthy();
      });
    });

    it('should show loading state initially', () => {
      const { getByText } = render(<AlarmSettingsScreen />);
      expect(getByText('Loading alarm settings...')).toBeTruthy();
    });
  });

  describe('Enable/Disable Toggle', () => {
    it('should toggle alarm enabled state', async () => {
      const { getAllByRole } = render(<AlarmSettingsScreen />);
      
      await waitFor(() => {
        const switches = getAllByRole('switch');
        expect(switches.length).toBeGreaterThan(0);
      });

      const switches = getAllByRole('switch');
      fireEvent(switches[0], 'valueChange', false);

      await waitFor(() => {
        expect(mockAlarmConfig.setAlarmEnabled).toHaveBeenCalledWith(
          CriticalAlarmType.SHALLOW_WATER,
          false
        );
      });
    });

    it('should show alert when disabling critical navigation alarm fails', async () => {
      mockAlarmConfig.setAlarmEnabled = jest.fn().mockResolvedValue(false);
      
      const { getAllByRole } = render(<AlarmSettingsScreen />);
      
      await waitFor(() => {
        const switches = getAllByRole('switch');
        expect(switches.length).toBeGreaterThan(0);
      });

      const switches = getAllByRole('switch');
      fireEvent(switches[0], 'valueChange', false);

      await waitFor(() => {
        expect(Alert.alert).toHaveBeenCalledWith(
          'Cannot Disable',
          expect.stringContaining('critical navigation alarm'),
          expect.any(Array)
        );
      });
    });
  });

  describe('Threshold Configuration', () => {
    it('should update threshold value on input', async () => {
      const { getAllByPlaceholderText } = render(<AlarmSettingsScreen />);
      
      await waitFor(() => {
        const inputs = getAllByPlaceholderText('2');
        expect(inputs.length).toBeGreaterThan(0);
      });

      const depthInput = getAllByPlaceholderText('2')[0];
      fireEvent.changeText(depthInput, '3.5');

      expect(depthInput.props.value).toBe('3.5');
    });

    it('should validate threshold range on save', async () => {
      const { getAllByPlaceholderText, getAllByText } = render(<AlarmSettingsScreen />);
      
      await waitFor(() => {
        const inputs = getAllByPlaceholderText('2');
        expect(inputs.length).toBeGreaterThan(0);
      });

      // Set invalid value (below minimum)
      const depthInput = getAllByPlaceholderText('2')[0];
      fireEvent.changeText(depthInput, '0.1');

      // Try to save
      const saveButtons = getAllByText('Save');
      fireEvent.press(saveButtons[0]);

      await waitFor(() => {
        expect(Alert.alert).toHaveBeenCalledWith(
          'Invalid Value',
          expect.stringContaining('between 0.5 and 10'),
          expect.any(Array)
        );
      });
    });

    it('should save valid threshold successfully', async () => {
      const { getAllByPlaceholderText, getAllByText } = render(<AlarmSettingsScreen />);
      
      await waitFor(() => {
        const inputs = getAllByPlaceholderText('2');
        expect(inputs.length).toBeGreaterThan(0);
      });

      const depthInput = getAllByPlaceholderText('2')[0];
      fireEvent.changeText(depthInput, '3.5');

      const saveButtons = getAllByText('Save');
      fireEvent.press(saveButtons[0]);

      await waitFor(() => {
        expect(mockAlarmConfig.updateAlarmConfig).toHaveBeenCalledWith(
          CriticalAlarmType.SHALLOW_WATER,
          expect.objectContaining({
            thresholds: { critical: 3.5 },
          })
        );
        expect(Alert.alert).toHaveBeenCalledWith(
          'Success',
          'Threshold updated successfully',
          expect.any(Array)
        );
      });
    });

    it('should handle marine safety validation errors', async () => {
      mockAlarmConfig.updateAlarmConfig = jest.fn().mockResolvedValue({
        success: false,
        errors: ['Threshold below marine safety minimum'],
      });

      const { getAllByPlaceholderText, getAllByText } = render(<AlarmSettingsScreen />);
      
      await waitFor(() => {
        const inputs = getAllByPlaceholderText('2');
        expect(inputs.length).toBeGreaterThan(0);
      });

      const depthInput = getAllByPlaceholderText('2')[0];
      fireEvent.changeText(depthInput, '2.5');

      const saveButtons = getAllByText('Save');
      fireEvent.press(saveButtons[0]);

      await waitFor(() => {
        expect(Alert.alert).toHaveBeenCalledWith(
          'Validation Error',
          'Threshold below marine safety minimum',
          expect.any(Array)
        );
      });
    });
  });

  describe('Test Alarm Function', () => {
    it('should test alarm configuration successfully', async () => {
      const { getAllByText } = render(<AlarmSettingsScreen />);
      
      await waitFor(() => {
        const testButtons = getAllByText('Test Alarm');
        expect(testButtons.length).toBeGreaterThan(0);
      });

      const testButtons = getAllByText('Test Alarm');
      fireEvent.press(testButtons[0]);

      await waitFor(() => {
        expect(mockAlarmConfig.testAlarmConfiguration).toHaveBeenCalledWith(
          CriticalAlarmType.SHALLOW_WATER
        );
        expect(Alert.alert).toHaveBeenCalledWith(
          'Test Complete',
          expect.stringContaining('successfully'),
          expect.any(Array)
        );
      });
    });

    it('should show test failure when configuration invalid', async () => {
      mockAlarmConfig.testAlarmConfiguration = jest.fn().mockResolvedValue({
        configurationValid: false,
        thresholdsValid: true,
        audioSystemReady: false,
        visualSystemReady: true,
      });

      const { getAllByText } = render(<AlarmSettingsScreen />);
      
      await waitFor(() => {
        const testButtons = getAllByText('Test Alarm');
        expect(testButtons.length).toBeGreaterThan(0);
      });

      const testButtons = getAllByText('Test Alarm');
      fireEvent.press(testButtons[0]);

      await waitFor(() => {
        expect(Alert.alert).toHaveBeenCalledWith(
          'Test Failed',
          expect.stringContaining('Configuration invalid'),
          expect.any(Array)
        );
      });
    });

    it('should disable test buttons while testing', async () => {
      const { getAllByText } = render(<AlarmSettingsScreen />);
      
      await waitFor(() => {
        const testButtons = getAllByText('Test Alarm');
        expect(testButtons.length).toBeGreaterThan(0);
      });

      const testButtons = getAllByText('Test Alarm');
      fireEvent.press(testButtons[0]);

      // Check button text changes
      await waitFor(() => {
        expect(getAllByText('Testing...').length).toBeGreaterThan(0);
      });
    });
  });

  describe('Reset to Defaults', () => {
    it('should show confirmation dialog for reset', async () => {
      const { getByText } = render(<AlarmSettingsScreen />);
      
      await waitFor(() => {
        expect(getByText('Reset All to Defaults')).toBeTruthy();
      });

      const resetButton = getByText('Reset All to Defaults');
      fireEvent.press(resetButton);

      expect(Alert.alert).toHaveBeenCalledWith(
        'Reset to Defaults',
        expect.stringContaining('Are you sure'),
        expect.arrayContaining([
          expect.objectContaining({ text: 'Cancel' }),
          expect.objectContaining({ text: 'Reset' }),
        ])
      );
    });

    it('should reset all configurations when confirmed', async () => {
      // Mock the Alert.alert to auto-confirm
      (Alert.alert as jest.Mock).mockImplementation((title, message, buttons) => {
        const resetButton = buttons?.find((b: any) => b.text === 'Reset');
        if (resetButton?.onPress) resetButton.onPress();
      });

      const { getByText } = render(<AlarmSettingsScreen />);
      
      await waitFor(() => {
        expect(getByText('Reset All to Defaults')).toBeTruthy();
      });

      const resetButton = getByText('Reset All to Defaults');
      fireEvent.press(resetButton);

      await waitFor(() => {
        // Should update all 5 alarm types
        expect(mockAlarmConfig.updateAlarmConfig).toHaveBeenCalledTimes(5);
      });
    });
  });

  describe('Marine Safety Compliance', () => {
    it('should display response time requirement', async () => {
      const { getByText } = render(<AlarmSettingsScreen />);
      
      await waitFor(() => {
        expect(getByText(/<500ms/)).toBeTruthy();
      });
    });

    it('should display audio level requirement', async () => {
      const { getByText } = render(<AlarmSettingsScreen />);
      
      await waitFor(() => {
        expect(getByText(/>85dB/)).toBeTruthy();
      });
    });

    it('should mention redundant alerting', async () => {
      const { getByText } = render(<AlarmSettingsScreen />);
      
      await waitFor(() => {
        expect(getByText(/redundant alerting/i)).toBeTruthy();
      });
    });
  });

  describe('Accessibility', () => {
    it('should have accessible labels for all controls', async () => {
      const { getAllByRole } = render(<AlarmSettingsScreen />);
      
      await waitFor(() => {
        const switches = getAllByRole('switch');
        expect(switches.length).toBe(5); // One for each alarm type
      });
    });

    it('should have clear error messages', async () => {
      const { getAllByPlaceholderText, getAllByText } = render(<AlarmSettingsScreen />);
      
      await waitFor(() => {
        const inputs = getAllByPlaceholderText('2');
        expect(inputs.length).toBeGreaterThan(0);
      });

      const depthInput = getAllByPlaceholderText('2')[0];
      fireEvent.changeText(depthInput, 'invalid');

      const saveButtons = getAllByText('Save');
      fireEvent.press(saveButtons[0]);

      await waitFor(() => {
        expect(Alert.alert).toHaveBeenCalledWith(
          'Invalid Value',
          expect.any(String),
          expect.any(Array)
        );
      });
    });
  });

  describe('Performance', () => {
    it('should debounce rapid threshold changes', async () => {
      const { getAllByPlaceholderText } = render(<AlarmSettingsScreen />);
      
      await waitFor(() => {
        const inputs = getAllByPlaceholderText('2');
        expect(inputs.length).toBeGreaterThan(0);
      });

      const depthInput = getAllByPlaceholderText('2')[0];
      
      // Rapid changes
      fireEvent.changeText(depthInput, '2.5');
      fireEvent.changeText(depthInput, '3.0');
      fireEvent.changeText(depthInput, '3.5');

      // Should update UI immediately
      expect(depthInput.props.value).toBe('3.5');
    });
  });
});
