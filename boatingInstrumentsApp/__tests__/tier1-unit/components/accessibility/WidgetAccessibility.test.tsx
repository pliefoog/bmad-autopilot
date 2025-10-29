/**
 * Widget Accessibility Test Suite
 * Story 4.4 AC6-10: Comprehensive accessibility testing for marine widgets
 * 
 * Tests VoiceOver/TalkBack compatibility, accessibility labels, hints, roles,
 * and marine-specific contextual information for screen reader users.
 */

import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { ThemeProvider } from '../../../src/theme/ThemeProvider';
import { DepthWidget } from '../../../src/widgets/DepthWidget';
import { SpeedWidget } from '../../../src/widgets/SpeedWidget';
import { WindWidget } from '../../../src/widgets/WindWidget';
import { GPSWidget } from '../../../src/widgets/GPSWidget';
import { CompassWidget } from '../../../src/widgets/CompassWidget';
import { WidgetCard } from '../../../src/widgets/WidgetCard';

// Mock stores
jest.mock('../../../src/store/nmeaStore');
jest.mock('../../../src/store/themeStore');

// Mock data for testing
const mockNmeaStore = require('../../../src/store/nmeaStore');
const mockThemeStore = require('../../../src/store/themeStore');

describe('Widget Accessibility Integration', () => {
  beforeEach(() => {
    // Setup theme mock
    mockThemeStore.useTheme.mockReturnValue({
      background: '#000',
      text: '#fff',
      textSecondary: '#888',
      primary: '#00f',
      success: '#0f0',
      warning: '#ff0',
      error: '#f00',
      accent: '#0ff',
    });
  });

  describe('WidgetCard Base Component', () => {
    it('should have proper accessibility role and label', () => {
      const { getByA11yRole } = render(
        <ThemeProvider>
          <WidgetCard
            title="TEST WIDGET"
            icon="water"
            value="42.5"
            unit="ft"
            state="normal"
            testID="test-widget"
          />
        </ThemeProvider>
      );

      const widget = getByA11yRole('text');
      expect(widget).toBeDefined();
      expect(widget.props.accessibilityLabel).toContain('TEST WIDGET');
      expect(widget.props.accessibilityLabel).toContain('42.5');
      expect(widget.props.accessibilityLabel).toContain('ft');
    });

    it('should announce alarm state for critical conditions', () => {
      const { getByA11yRole } = render(
        <ThemeProvider>
          <WidgetCard
            title="DEPTH"
            icon="water"
            value="1.2"
            unit="m"
            state="alarm"
            testID="alarm-widget"
          />
        </ThemeProvider>
      );

      const widget = getByA11yRole('text');
      expect(widget.props.accessibilityLabel).toContain('ALARM');
      expect(widget.props.accessibilityLiveRegion).toBe('assertive');
    });

    it('should announce warning state with polite live region', () => {
      const { getByA11yRole } = render(
        <ThemeProvider>
          <WidgetCard
            title="DEPTH"
            icon="water"
            value="1.8"
            unit="m"
            state="highlighted"
            testID="warning-widget"
          />
        </ThemeProvider>
      );

      const widget = getByA11yRole('text');
      expect(widget.props.accessibilityLabel).toContain('WARNING');
      expect(widget.props.accessibilityLiveRegion).toBe('polite');
    });

    it('should handle no-data state appropriately', () => {
      const { getByA11yRole } = render(
        <ThemeProvider>
          <WidgetCard
            title="SPEED"
            icon="speedometer"
            state="no-data"
            testID="nodata-widget"
          />
        </ThemeProvider>
      );

      const widget = getByA11yRole('text');
      expect(widget.props.accessibilityLabel).toContain('no data available');
      expect(widget.props.accessibilityState?.disabled).toBe(true);
    });

    it('should provide accessibility hints for interactive elements', () => {
      const { getByA11yRole } = render(
        <ThemeProvider>
          <WidgetCard
            title="WIND"
            icon="leaf"
            value="15.5"
            unit="kn"
            state="normal"
            accessibilityHint="Tap to change wind speed units"
            testID="interactive-widget"
          />
        </ThemeProvider>
      );

      const widget = getByA11yRole('text');
      expect(widget.props.accessibilityHint).toBe('Tap to change wind speed units');
    });

    it('should track expanded state for screen readers', () => {
      const { getByA11yRole } = render(
        <ThemeProvider>
          <WidgetCard
            title="DEPTH"
            icon="water"
            value="42.5"
            unit="ft"
            state="normal"
            expanded={true}
            testID="expanded-widget"
          />
        </ThemeProvider>
      );

      const widget = getByA11yRole('text');
      expect(widget.props.accessibilityState?.selected).toBe(true);
    });
  });

  describe('DepthWidget Accessibility', () => {
    beforeEach(() => {
      mockNmeaStore.useNmeaStore.mockImplementation((selector: any) => {
        const state = {
          nmeaData: {
            depth: 12.5,
          },
        };
        return selector(state);
      });
    });

    it('should provide depth value with trend context', () => {
      const { getByA11yRole } = render(
        <ThemeProvider>
          <DepthWidget />
        </ThemeProvider>
      );

      const widget = getByA11yRole('text');
      expect(widget.props.accessibilityLabel).toContain('Depth');
      expect(widget.props.accessibilityLabel).toMatch(/\d+\.\d+\s+(m|ft|fth)/);
    });

    it('should announce critical depth alarms', () => {
      mockNmeaStore.useNmeaStore.mockImplementation((selector: any) => {
        const state = {
          nmeaData: {
            depth: 1.2, // Critical depth
          },
        };
        return selector(state);
      });

      const { getByA11yRole } = render(
        <ThemeProvider>
          <DepthWidget />
        </ThemeProvider>
      );

      const widget = getByA11yRole('text');
      expect(widget.props.accessibilityLabel).toContain('CRITICAL DEPTH ALARM');
      expect(widget.props.accessibilityHint).toContain('immediate action required');
    });

    it('should announce shallow water warnings', () => {
      mockNmeaStore.useNmeaStore.mockImplementation((selector: any) => {
        const state = {
          nmeaData: {
            depth: 1.8, // Shallow warning
          },
        };
        return selector(state);
      });

      const { getByA11yRole } = render(
        <ThemeProvider>
          <DepthWidget />
        </ThemeProvider>
      );

      const widget = getByA11yRole('text');
      expect(widget.props.accessibilityLabel).toContain('Shallow water warning');
      expect(widget.props.accessibilityHint).toContain('monitor carefully');
    });
  });

  describe('SpeedWidget Accessibility', () => {
    beforeEach(() => {
      mockNmeaStore.useNmeaStore.mockImplementation((selector: any) => {
        const state = {
          nmeaData: {
            sog: 5.5,
            cog: 90,
          },
        };
        return selector(state);
      });
    });

    it('should provide speed and course information', () => {
      const { getByA11yRole } = render(
        <ThemeProvider>
          <SpeedWidget />
        </ThemeProvider>
      );

      const widget = getByA11yRole('text');
      expect(widget.props.accessibilityLabel).toContain('Speed');
      expect(widget.props.accessibilityLabel).toContain('knots');
      expect(widget.props.accessibilityLabel).toContain('Course over ground');
      expect(widget.props.accessibilityLabel).toContain('degrees');
    });

    it('should announce speed trend information', () => {
      const { getByA11yRole } = render(
        <ThemeProvider>
          <SpeedWidget />
        </ThemeProvider>
      );

      const widget = getByA11yRole('text');
      expect(widget.props.accessibilityLabel).toMatch(/speed (increasing|decreasing|steady)/);
    });
  });

  describe('WindWidget Accessibility', () => {
    beforeEach(() => {
      mockNmeaStore.useNmeaStore.mockImplementation((selector: any) => {
        const state = {
          nmeaData: {
            windSpeed: 15.5,
            windAngle: 45,
            heading: 0,
          },
        };
        return selector(state);
      });
    });

    it('should provide wind speed with cardinal direction', () => {
      const { getByA11yRole } = render(
        <ThemeProvider>
          <WindWidget />
        </ThemeProvider>
      );

      const widget = getByA11yRole('button'); // TouchableOpacity for unit cycling
      expect(widget.props.accessibilityLabel).toContain('Wind');
      expect(widget.props.accessibilityLabel).toContain('speed');
      expect(widget.props.accessibilityLabel).toContain('direction');
      expect(widget.props.accessibilityLabel).toMatch(/(ahead|starboard|port|astern|beam|bow|quarter)/);
    });

    it('should announce Beaufort scale wind strength', () => {
      const { getByA11yRole } = render(
        <ThemeProvider>
          <WindWidget />
        </ThemeProvider>
      );

      const widget = getByA11yRole('button');
      expect(widget.props.accessibilityLabel).toMatch(/(Calm|Light|Breeze|Gale)/);
    });

    it('should announce high wind warnings', () => {
      mockNmeaStore.useNmeaStore.mockImplementation((selector: any) => {
        const state = {
          nmeaData: {
            windSpeed: 28,
            windAngle: 45,
            heading: 0,
          },
        };
        return selector(state);
      });

      const { getByA11yRole } = render(
        <ThemeProvider>
          <WindWidget />
        </ThemeProvider>
      );

      const widget = getByA11yRole('button');
      expect(widget.props.accessibilityLabel).toContain('HIGH WIND WARNING');
      expect(widget.props.accessibilityHint).toContain('take precautions');
    });
  });

  describe('GPSWidget Accessibility', () => {
    beforeEach(() => {
      mockNmeaStore.useNmeaStore.mockImplementation((selector: any) => {
        const state = {
          nmeaData: {
            gpsPosition: {
              latitude: 37.7749,
              longitude: -122.4194,
              lat: 37.7749,
              lon: -122.4194,
            },
            gpsQuality: {
              fixType: 3,
              satellites: 8,
              hdop: 1.2,
            },
          },
        };
        return selector(state);
      });
    });

    it('should provide latitude and longitude coordinates', () => {
      const { getByA11yRole } = render(
        <ThemeProvider>
          <GPSWidget />
        </ThemeProvider>
      );

      const widget = getByA11yRole('text');
      expect(widget.props.accessibilityLabel).toContain('GPS Position');
      expect(widget.props.accessibilityLabel).toContain('Latitude');
      expect(widget.props.accessibilityLabel).toContain('Longitude');
      expect(widget.props.accessibilityLabel).toContain('degrees');
    });

    it('should announce GPS fix status and quality', () => {
      const { getByA11yRole } = render(
        <ThemeProvider>
          <GPSWidget />
        </ThemeProvider>
      );

      const widget = getByA11yRole('text');
      expect(widget.props.accessibilityLabel).toContain('Fix status');
      expect(widget.props.accessibilityLabel).toContain('satellites');
      expect(widget.props.accessibilityLabel).toContain('HDOP');
    });

    it('should warn about weak GPS signal', () => {
      mockNmeaStore.useNmeaStore.mockImplementation((selector: any) => {
        const state = {
          nmeaData: {
            gpsPosition: {
              latitude: 37.7749,
              longitude: -122.4194,
              lat: 37.7749,
              lon: -122.4194,
            },
            gpsQuality: {
              fixType: 2,
              satellites: 3, // Weak signal
              hdop: 2.5,
            },
          },
        };
        return selector(state);
      });

      const { getByA11yRole } = render(
        <ThemeProvider>
          <GPSWidget />
        </ThemeProvider>
      );

      const widget = getByA11yRole('text');
      expect(widget.props.accessibilityLabel).toContain('Weak GPS signal');
      expect(widget.props.accessibilityHint).toContain('position accuracy limited');
    });

    it('should announce no GPS fix', () => {
      mockNmeaStore.useNmeaStore.mockImplementation((selector: any) => {
        const state = {
          nmeaData: {
            gpsPosition: null,
            gpsQuality: null,
          },
        };
        return selector(state);
      });

      const { getByA11yRole } = render(
        <ThemeProvider>
          <GPSWidget />
        </ThemeProvider>
      );

      const widget = getByA11yRole('text');
      expect(widget.props.accessibilityLabel).toContain('No fix available');
      expect(widget.props.accessibilityHint).toContain('acquiring satellites');
    });
  });

  describe('CompassWidget Accessibility', () => {
    beforeEach(() => {
      mockNmeaStore.useNmeaStore.mockImplementation((selector: any) => {
        const state = {
          nmeaData: {
            heading: 90,
            rateOfTurn: 2.5,
          },
        };
        return selector(state);
      });
    });

    it('should provide heading with cardinal direction', () => {
      const { getByA11yRole } = render(
        <ThemeProvider>
          <CompassWidget />
        </ThemeProvider>
      );

      const widget = getByA11yRole('text');
      expect(widget.props.accessibilityLabel).toContain('Compass');
      expect(widget.props.accessibilityLabel).toContain('Heading');
      expect(widget.props.accessibilityLabel).toContain('degrees');
      expect(widget.props.accessibilityLabel).toMatch(/(North|East|South|West)/);
    });

    it('should announce rate of turn with port/starboard', () => {
      const { getByA11yRole } = render(
        <ThemeProvider>
          <CompassWidget />
        </ThemeProvider>
      );

      const widget = getByA11yRole('text');
      expect(widget.props.accessibilityLabel).toContain('turning starboard');
      expect(widget.props.accessibilityLabel).toContain('degrees per minute');
    });

    it('should warn about fast turns', () => {
      mockNmeaStore.useNmeaStore.mockImplementation((selector: any) => {
        const state = {
          nmeaData: {
            heading: 90,
            rateOfTurn: 12.5, // Fast turn
          },
        };
        return selector(state);
      });

      const { getByA11yRole } = render(
        <ThemeProvider>
          <CompassWidget />
        </ThemeProvider>
      );

      const widget = getByA11yRole('text');
      expect(widget.props.accessibilityLabel).toContain('fast turn');
      expect(widget.props.accessibilityHint).toContain('Rapid turn in progress');
    });

    it('should announce steady course', () => {
      mockNmeaStore.useNmeaStore.mockImplementation((selector: any) => {
        const state = {
          nmeaData: {
            heading: 90,
            rateOfTurn: 0.2, // Minimal turn
          },
        };
        return selector(state);
      });

      const { getByA11yRole } = render(
        <ThemeProvider>
          <CompassWidget />
        </ThemeProvider>
      );

      const widget = getByA11yRole('text');
      expect(widget.props.accessibilityLabel).toContain('steady course');
    });
  });

  describe('AccessibilityValue Support', () => {
    it('should provide numeric range for depth values', () => {
      mockNmeaStore.useNmeaStore.mockImplementation((selector: any) => {
        const state = {
          nmeaData: {
            depth: 12.5,
          },
        };
        return selector(state);
      });

      const { getByA11yRole } = render(
        <ThemeProvider>
          <DepthWidget />
        </ThemeProvider>
      );

      const widget = getByA11yRole('text');
      expect(widget.props.accessibilityValue).toBeDefined();
      expect(widget.props.accessibilityValue?.now).toBe(12.5);
      expect(widget.props.accessibilityValue?.min).toBe(0);
      expect(widget.props.accessibilityValue?.max).toBe(100);
    });

    it('should provide numeric range for compass heading', () => {
      mockNmeaStore.useNmeaStore.mockImplementation((selector: any) => {
        const state = {
          nmeaData: {
            heading: 180,
            rateOfTurn: 0,
          },
        };
        return selector(state);
      });

      const { getByA11yRole } = render(
        <ThemeProvider>
          <CompassWidget />
        </ThemeProvider>
      );

      const widget = getByA11yRole('text');
      expect(widget.props.accessibilityValue).toBeDefined();
      expect(widget.props.accessibilityValue?.now).toBe(180);
      expect(widget.props.accessibilityValue?.min).toBe(0);
      expect(widget.props.accessibilityValue?.max).toBe(360);
    });
  });
});
