import React from 'react';
import { render } from '@testing-library/react-native';
import { AutopilotStatusWidget } from "../../../src/widgets/AutopilotStatusWidget";
import { useNmeaStore } from "../../../src/store/nmeaStore";

// Mock the autopilot service
jest.mock('../../../src/services/autopilotService', () => ({
  AutopilotCommandManager: jest.fn().mockImplementation(() => ({
    engageCompassMode: jest.fn().mockResolvedValue(true),
    disengageAutopilot: jest.fn().mockResolvedValue(true),
    adjustHeading: jest.fn().mockResolvedValue(true),
    emergencyDisengage: jest.fn().mockResolvedValue(true),
    disconnect: jest.fn(),
  })),
  AutopilotMode: {
    STANDBY: 'standby',
    AUTO: 'auto',
    WIND: 'wind',
    NAV: 'nav',
    TRACK: 'track'
  },
  AutopilotCommand: {
    ENGAGE: 'engage',
    DISENGAGE: 'disengage',
    ADJUST_HEADING: 'adjust_heading',
    SET_HEADING: 'set_heading',
    CHANGE_MODE: 'change_mode',
    STANDBY: 'standby',
    TACK_PORT: 'tack_port',
    TACK_STARBOARD: 'tack_starboard'
  }
}));

describe('Autopilot Widget Command Status Integration', () => {
  beforeEach(() => {
    // Reset NMEA store before each test
    useNmeaStore.getState().reset();
  });

  describe('Command Status Propagation (TEST-002)', () => {
    it('should display command status updates in the widget UI', () => {
      // STEP 1: Setup initial autopilot state
      useNmeaStore.getState().setNmeaData({
        autopilot: {
          mode: 'STANDBY',
          active: false,
          commandStatus: undefined,
          commandMessage: undefined
        }
      });

      // STEP 2: Render the autopilot widget with controls
      const { getByText, getByTestId, rerender } = render(
        <AutopilotStatusWidget showControls={true} />
      );

      // STEP 3: Verify initial state shows widget is rendered
      expect(getByTestId('widget-card')).toBeTruthy();

      // STEP 4: Simulate command being sent (update store with sending status)
      useNmeaStore.getState().setNmeaData({
        autopilot: {
          mode: 'STANDBY',
          active: false,
          commandStatus: 'sending',
          commandMessage: 'Engaging autopilot...',
          lastCommandTime: Date.now()
        }
      });

      // STEP 5: Re-render to reflect command status update
      rerender(<AutopilotStatusWidget showControls={true} />);

      // STEP 6: Verify widget shows command in progress
      expect(getByText(/Engaging autopilot/i)).toBeTruthy();

      // STEP 7: Simulate successful command completion
      useNmeaStore.getState().setNmeaData({
        autopilot: {
          mode: 'AUTO',
          active: true,
          targetHeading: 270.0,
          commandStatus: 'success',
          commandMessage: 'Autopilot engaged successfully',
          lastCommandTime: Date.now()
        }
      });

      // STEP 8: Re-render to show final status
      rerender(<AutopilotStatusWidget showControls={true} />);

      // STEP 9: Verify widget reflects successful engagement
      expect(getByText(/success/i)).toBeTruthy();
      expect(getByText(/AUTO/i)).toBeTruthy();
    });

    it('should display error status when command fails', () => {
      // Setup initial state
      useNmeaStore.getState().setNmeaData({
        autopilot: {
          mode: 'STANDBY',
          active: false,
        }
      });

      const { getByText, rerender } = render(
        <AutopilotStatusWidget showControls={true} />
      );

      // Simulate command error
      useNmeaStore.getState().setNmeaData({
        autopilot: {
          mode: 'STANDBY',
          active: false,
          commandStatus: 'error',
          commandMessage: 'Connection failed - unable to engage autopilot',
          lastCommandTime: Date.now()
        }
      });

      rerender(<AutopilotStatusWidget showControls={true} />);

      // Verify error status is displayed
      expect(getByText(/error/i) || getByText(/failed/i)).toBeTruthy();
    });

    it('should display timeout status appropriately', () => {
      useNmeaStore.getState().setNmeaData({
        autopilot: {
          mode: 'AUTO',
          active: true,
          targetHeading: 180.0
        }
      });

      const { getByText, rerender } = render(
        <AutopilotStatusWidget showControls={true} />
      );

      // Simulate command timeout
      useNmeaStore.getState().setNmeaData({
        autopilot: {
          mode: 'AUTO',
          active: true,
          targetHeading: 180.0,
          commandStatus: 'timeout',
          commandMessage: 'Command timed out - please try again',
          lastCommandTime: Date.now() - 6000 // 6 seconds ago
        }
      });

      rerender(<AutopilotStatusWidget showControls={true} />);

      // Verify timeout status is communicated
      expect(getByText(/timeout/i) || getByText(/timed out/i)).toBeTruthy();
    });

    it('should clear command status after successful operations', () => {
      // Start with command in progress
      useNmeaStore.getState().setNmeaData({
        autopilot: {
          mode: 'STANDBY',
          active: false,
          commandStatus: 'sending',
          commandMessage: 'Processing command...'
        }
      });

      const { getByText, rerender, queryByText } = render(
        <AutopilotStatusWidget showControls={true} />
      );

      // Verify command status is shown
      expect(getByText(/Processing command/i)).toBeTruthy();

      // Simulate successful completion and status clearing
      useNmeaStore.getState().setNmeaData({
        autopilot: {
          mode: 'AUTO',
          active: true,
          targetHeading: 90.0,
          commandStatus: undefined, // Status cleared
          commandMessage: undefined, // Message cleared
        }
      });

      rerender(<AutopilotStatusWidget showControls={true} />);

      // Verify command status is no longer displayed
      expect(queryByText(/Processing command/i)).toBeNull();
      // But autopilot state should be shown
      expect(getByText(/AUTO/i)).toBeTruthy();
    });
  });

  describe('Real-time Status Updates', () => {
    it('should update widget when autopilot data changes in store', () => {
      const { getByText, getByTestId, rerender } = render(
        <AutopilotStatusWidget showControls={false} />
      );

      // Initially should show autopilot widget
      expect(getByTestId('widget-card')).toBeTruthy();

      // Update store with autopilot data
      useNmeaStore.getState().setNmeaData({
        heading: 270.5,
        autopilot: {
          mode: 'AUTO',
          active: true,
          targetHeading: 270.0,
          actualHeading: 270.2,
          rudderPosition: 2.5
        }
      });

      rerender(<AutopilotStatusWidget showControls={false} />);

      // Verify widget displays current autopilot status
      expect(getByText(/AUTO/i)).toBeTruthy();
      expect(getByText(/270/)).toBeTruthy(); // Target heading
    });

    it('should reflect heading changes in real-time', () => {
      // Setup engaged autopilot
      useNmeaStore.getState().setNmeaData({
        autopilot: {
          mode: 'AUTO',
          active: true,
          targetHeading: 180.0,
          actualHeading: 180.0
        }
      });

      const { getByText, rerender } = render(
        <AutopilotStatusWidget showControls={false} />
      );

      // Verify initial heading
      expect(getByText(/180/)).toBeTruthy();

      // Simulate heading change
      useNmeaStore.getState().setNmeaData({
        autopilot: {
          mode: 'AUTO',
          active: true,
          targetHeading: 190.0, // Changed target
          actualHeading: 185.0   // Autopilot adjusting
        }
      });

      rerender(<AutopilotStatusWidget showControls={false} />);

      // Verify updated heading is displayed
      expect(getByText(/190/)).toBeTruthy();
    });
  });

  describe('Command Confirmation Integration', () => {
    it('should integrate with store for command confirmation feedback', () => {
      // This test validates that the widget can reflect command states
      // during the confirmation process (AC10 - command confirmation feedback)
      
      useNmeaStore.getState().setNmeaData({
        autopilot: {
          mode: 'STANDBY',
          active: false
        }
      });

      const { rerender, getByText } = render(
        <AutopilotStatusWidget showControls={true} />
      );

      // Simulate confirmation dialog state (would be triggered by user interaction)
      useNmeaStore.getState().setNmeaData({
        autopilot: {
          mode: 'STANDBY',
          active: false,
          commandStatus: 'sending',
          commandMessage: 'Awaiting confirmation...'
        }
      });

      rerender(<AutopilotStatusWidget showControls={true} />);

      // Widget should show confirmation is pending
      expect(getByText(/confirmation/i) || getByText(/Awaiting/i)).toBeTruthy();
    });
  });
});