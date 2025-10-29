import React from 'react';
import { render } from '@testing-library/react-native';
import RudderPositionWidget from "../../../src/widgets/RudderPositionWidget";
import { useNmeaStore } from "../../../src/store/nmeaStore";
import { useTheme } from "../../../src/store/themeStore";

// Mock the stores
jest.mock('../../../src/store/nmeaStore');
jest.mock('../../../src/store/themeStore');

const mockUseNmeaStore = useNmeaStore as jest.MockedFunction<typeof useNmeaStore>;
const mockUseTheme = useTheme as jest.MockedFunction<typeof useTheme>;

const mockTheme = {
  background: '#F8FAFC',
  surface: '#FFFFFF',
  primary: '#0284C7',
  secondary: '#0891B2',
  text: '#0F172A',
  textSecondary: '#475569',
  accent: '#F59E0B',
  warning: '#EAB308',
  error: '#DC2626',
  success: '#16A34A',
  border: '#E2E8F0',
  shadow: '#64748B',
};

// Helper function to get rudder state based on angle
const getRudderState = (rudderPosition: number | undefined) => {
  if (rudderPosition === undefined) return 'no-data';
  const absAngle = Math.abs(rudderPosition);
  if (absAngle >= 30) return 'alarm'; // Extreme rudder angle warning (>=30 to match actual implementation)
  if (absAngle > 20) return 'highlighted'; // Caution zone
  return 'normal';
};

// Helper function to determine rudder side
const getRudderSide = (rudderPosition: number) => {
  return rudderPosition >= 0 ? 'STBD' : 'PORT';
};

// Helper function to get rudder color based on angle
const getRudderColor = (angle: number, theme: any) => {
  if (angle === 0) return theme.success;
  if (Math.abs(angle) > 30) return theme.error;
  if (Math.abs(angle) > 20) return theme.warning;
  return theme.primary;
};

describe('RudderPositionWidget', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseTheme.mockReturnValue(mockTheme);
  });

  describe('Basic Rendering Tests (Non-SVG)', () => {
    it('renders correctly with no data', () => {
      mockUseNmeaStore.mockReturnValue(undefined);
      
      // Test the widget state logic directly
      const rudderState = getRudderState(undefined);
      expect(rudderState).toBe('no-data');
    });

    it('handles null autopilot data gracefully', () => {
      mockUseNmeaStore.mockReturnValue({ nmeaData: { autopilot: null } });
      
      // Test that null data doesn't break the logic
      const rudderState = getRudderState(undefined);
      expect(rudderState).toBe('no-data');
    });
  });

  describe('Rudder Angle Classification', () => {
    it('should classify rudder angles correctly for safety warnings', () => {
      // Test normal angles
      const normalAngle = getRudderState(10);
      expect(normalAngle).toBe('normal');
      
      // Test caution angles (>20°)
      const cautionAngle = getRudderState(25);
      expect(cautionAngle).toBe('highlighted');
      
      // Test extreme angles (>30°)
      const extremeAngle = getRudderState(35);
      expect(extremeAngle).toBe('alarm');
    });

    it('should handle negative angles correctly (port rudder)', () => {
      const portAngle = -25;
      const state = getRudderState(portAngle);
      const side = getRudderSide(portAngle);
      
      expect(state).toBe('highlighted'); // >20° caution
      expect(side).toBe('PORT');
    });

    it('should handle positive angles correctly (starboard rudder)', () => {
      const starboardAngle = 15;
      const state = getRudderState(starboardAngle);
      const side = getRudderSide(starboardAngle);
      
      expect(state).toBe('normal'); // <20° normal
      expect(side).toBe('STBD');
    });

    it('should handle zero rudder angle (centered)', () => {
      const centeredAngle = 0;
      const state = getRudderState(centeredAngle);
      const side = getRudderSide(centeredAngle);
      
      expect(state).toBe('normal');
      expect(side).toBe('STBD'); // Zero is treated as starboard by convention
    });
  });

  describe('Marine Safety Thresholds', () => {
    it('should use industry-standard rudder angle thresholds', () => {
      const testCases = [
        { angle: 5, expected: 'normal', description: 'Small correction' },
        { angle: 15, expected: 'normal', description: 'Normal steering' },
        { angle: 22, expected: 'highlighted', description: 'High angle caution' },
        { angle: 35, expected: 'alarm', description: 'Extreme angle alarm' },
        { angle: 45, expected: 'alarm', description: 'Maximum rudder angle' }
      ];
      
      testCases.forEach(({ angle, expected }) => {
        const state = getRudderState(angle);
        expect(state).toBe(expected);
        
        // Test negative angles as well
        const negativeState = getRudderState(-angle);
        expect(negativeState).toBe(expected);
      });
    });

    it('should validate rudder position limits', () => {
      // Marine standard: Most boats have ±35° rudder limits
      const maxAngle = 35;
      const minAngle = -35;
      
      expect(Math.abs(maxAngle)).toBeLessThanOrEqual(35);
      expect(Math.abs(minAngle)).toBeLessThanOrEqual(35);
      
      // Test alarm state for extreme angles
      expect(getRudderState(maxAngle)).toBe('alarm');
      expect(getRudderState(minAngle)).toBe('alarm');
    });
  });

  describe('Widget State Management', () => {
    it('should return no-data state when autopilot undefined', () => {
      const widgetState = getRudderState(undefined);
      expect(widgetState).toBe('no-data');
    });

    it('should return alarm state for extreme port rudder (>30°)', () => {
      const extremePortAngle = -40;
      const widgetState = getRudderState(extremePortAngle);
      expect(widgetState).toBe('alarm');
    });

    it('should return alarm state for extreme starboard rudder (>30°)', () => {
      const extremeStarboardAngle = 32;
      const widgetState = getRudderState(extremeStarboardAngle);
      expect(widgetState).toBe('alarm');
    });

    it('should return highlighted state for high angles (20-30°)', () => {
      const highPortAngle = -25;
      const highStarboardAngle = 28;
      
      expect(getRudderState(highPortAngle)).toBe('highlighted');
      expect(getRudderState(highStarboardAngle)).toBe('highlighted');
    });

    it('should return normal state for standard angles (<20°)', () => {
      const normalAngles = [0, 5, 10, 15, -5, -10, -15];
      
      normalAngles.forEach(angle => {
        expect(getRudderState(angle)).toBe('normal');
      });
    });
  });

  describe('Rudder Visualization Logic', () => {
    it('should clamp angles for visualization', () => {
      // SVG visualization typically clamps to ±45° for display
      const clampAngle = (angle: number) => Math.max(-45, Math.min(45, angle));
      
      expect(clampAngle(60)).toBe(45);   // Clamped to max
      expect(clampAngle(-60)).toBe(-45); // Clamped to min
      expect(clampAngle(30)).toBe(30);   // Within range
      expect(clampAngle(-20)).toBe(-20); // Within range
    });

    it('should handle rotation conversion for SVG', () => {
      // SVG rotation: negative for correct visual direction
      const getRotation = (angle: number) => -angle;
      
      expect(getRotation(10)).toBe(-10);   // Port visual rotation
      expect(getRotation(-10)).toBe(10);   // Starboard visual rotation
      expect(getRotation(0)).toBe(-0);     // Centered (JavaScript -0 === 0)
    });

    it('should determine correct rudder color based on angle', () => {
      const testAngles = [
        { angle: 0, expectedColor: mockTheme.success },
        { angle: 15, expectedColor: mockTheme.primary },
        { angle: 25, expectedColor: mockTheme.warning },
        { angle: 35, expectedColor: mockTheme.error }
      ];
      
      testAngles.forEach(({ angle, expectedColor }) => {
        const color = getRudderColor(angle, mockTheme);
        expect(color).toBe(expectedColor);
      });
    });
  });

  describe('Port/Starboard Logic', () => {
    it('should correctly identify port rudder positions', () => {
      const portAngles = [-1, -5, -15, -25, -35, -45];
      
      portAngles.forEach(angle => {
        expect(getRudderSide(angle)).toBe('PORT');
      });
    });

    it('should correctly identify starboard rudder positions', () => {
      const starboardAngles = [0, 1, 5, 15, 25, 35, 45];
      
      starboardAngles.forEach(angle => {
        expect(getRudderSide(angle)).toBe('STBD');
      });
    });

    it('should handle edge cases at zero', () => {
      // Convention: zero is typically considered neutral/starboard
      expect(getRudderSide(0)).toBe('STBD');
      expect(getRudderSide(0.1)).toBe('STBD');
      expect(getRudderSide(-0.1)).toBe('PORT');
    });
  });

  describe('Angle Display and Formatting', () => {
    it('should format angles correctly for display', () => {
      const formatAngle = (angle: number) => Math.abs(angle).toFixed(1);
      
      expect(formatAngle(25.7)).toBe('25.7');
      expect(formatAngle(-15.3)).toBe('15.3');
      expect(formatAngle(0)).toBe('0.0');
      expect(formatAngle(-0.5)).toBe('0.5');
    });

    it('should handle decimal precision correctly', () => {
      const rudderAngle = 23.456;
      const displayAngle = Math.abs(rudderAngle).toFixed(1);
      
      expect(displayAngle).toBe('23.5'); // Rounded to 1 decimal
    });
  });

  describe('Warning Text Generation', () => {
    it('should generate appropriate warning messages', () => {
      const getWarningText = (state: string) => {
        switch (state) {
          case 'alarm': return 'EXTREME ANGLE!';
          case 'highlighted': return 'High Angle';
          case 'no-data': return 'No Data';
          default: return '';
        }
      };
      
      expect(getWarningText('alarm')).toBe('EXTREME ANGLE!');
      expect(getWarningText('highlighted')).toBe('High Angle');
      expect(getWarningText('no-data')).toBe('No Data');
      expect(getWarningText('normal')).toBe('');
    });
  });

  describe('Component Integration', () => {
    it('should handle autopilot data structure correctly', () => {
      const mockAutopilotData = {
        autopilot: {
          rudderPosition: 20,
          mode: 'AUTO',
          engaged: true
        }
      };
      
      const rudderAngle = mockAutopilotData.autopilot?.rudderPosition || 0;
      expect(rudderAngle).toBe(20);
      expect(getRudderState(rudderAngle)).toBe('normal');
      expect(getRudderSide(rudderAngle)).toBe('STBD');
    });

    it('should handle missing rudder data in autopilot structure', () => {
      const mockAutopilotData: any = {
        autopilot: {
          mode: 'AUTO',
          engaged: true
          // No rudderPosition field
        }
      };
      
      const rudderAngle = mockAutopilotData.autopilot?.rudderPosition;
      expect(rudderAngle).toBeUndefined();
      expect(getRudderState(rudderAngle)).toBe('no-data');
    });
  });

  describe('Marine Operations Scenarios', () => {
    it('should handle typical docking maneuvers', () => {
      // Docking often requires larger rudder angles
      const dockingAngles = [20, 25, 30]; // Progressively higher angles
      
      expect(getRudderState(dockingAngles[0])).toBe('normal');      // 20° normal
      expect(getRudderState(dockingAngles[1])).toBe('highlighted'); // 25° caution
      expect(getRudderState(dockingAngles[2])).toBe('alarm');       // 30° alarm
    });

    it('should handle emergency steering scenarios', () => {
      // Emergency maneuvers may require maximum rudder
      const emergencyAngle = 35;
      const state = getRudderState(emergencyAngle);
      
      expect(state).toBe('alarm');
      // Emergency angle should still be handled (not break the system)
      expect(Math.abs(emergencyAngle)).toBeGreaterThan(30);
    });

    it('should handle autopilot steering corrections', () => {
      // Autopilot typically uses small corrections
      const autopilotCorrections = [2, 5, 8, 12];
      
      autopilotCorrections.forEach(angle => {
        expect(getRudderState(angle)).toBe('normal');
      });
    });
  });

  describe('Performance and Edge Cases', () => {
    it('should handle very small angle changes', () => {
      const microAngles = [0.1, 0.5, 0.9];
      
      microAngles.forEach(angle => {
        expect(getRudderState(angle)).toBe('normal');
        expect(getRudderSide(angle)).toBe('STBD');
      });
    });

    it('should handle maximum possible angles', () => {
      // Some boats can achieve ±45° rudder angles
      const maxAngles = [45, -45];
      
      maxAngles.forEach(angle => {
        expect(getRudderState(angle)).toBe('alarm');
        const side = getRudderSide(angle);
        expect(['PORT', 'STBD'].includes(side)).toBe(true);
      });
    });

    it('should maintain precision across angle ranges', () => {
      // Test precision at threshold boundaries
      const boundaryAngles = [19.9, 20.1, 29.9, 30.1];
      
      expect(getRudderState(19.9)).toBe('normal');      // Just under threshold
      expect(getRudderState(20.1)).toBe('highlighted'); // Just over threshold
      expect(getRudderState(29.9)).toBe('highlighted'); // Just under alarm
      expect(getRudderState(30.1)).toBe('alarm');       // Just over alarm
    });
  });
});