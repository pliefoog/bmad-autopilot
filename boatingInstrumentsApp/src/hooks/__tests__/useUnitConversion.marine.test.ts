// Marine-specific unit conversion tests
// Tests for vessel speed, wind speed (including Beaufort), and nautical contexts

import { renderHook, act } from '@testing-library/react-native';
import { useUnitConversion } from '../useUnitConversion';

describe('useUnitConversion - Marine Context', () => {
  describe('Vessel Speed Conversions', () => {
    it('should convert between vessel speed units correctly', () => {
      const { result } = renderHook(() => useUnitConversion());

      // 10 knots to km/h
      const kmhResult = result.current.convert(10, 'knots', 'kmh_vessel');
      expect(kmhResult).toBeCloseTo(18.52, 1); // 10 * 1.852

      // 10 mph to knots
      const knotsResult = result.current.convert(10, 'mph_vessel', 'knots');
      expect(knotsResult).toBeCloseTo(8.69, 1); // 10 / 1.15078
    });

    it('should handle vessel speed precision correctly', () => {
      const { result } = renderHook(() => useUnitConversion());

      const formatted = result.current.format(10.567, 'knots');
      expect(formatted).toBe('10.6 kts'); // 1 decimal place precision
    });
  });

  describe('Wind Speed with Beaufort Scale', () => {
    it('should convert knots to Beaufort scale correctly', () => {
      const { result } = renderHook(() => useUnitConversion());

      // Test key Beaufort scale conversions
      expect(result.current.convert(0.5, 'knots_wind', 'beaufort')).toBe(0); // Calm
      expect(result.current.convert(3, 'knots_wind', 'beaufort')).toBe(1); // Light Air
      expect(result.current.convert(6, 'knots_wind', 'beaufort')).toBe(2); // Light Breeze
      expect(result.current.convert(15, 'knots_wind', 'beaufort')).toBe(4); // Moderate Breeze
      expect(result.current.convert(30, 'knots_wind', 'beaufort')).toBe(7); // Near Gale
      expect(result.current.convert(50, 'knots_wind', 'beaufort')).toBe(9); // Strong Gale
      expect(result.current.convert(65, 'knots_wind', 'beaufort')).toBe(12); // Hurricane
    });

    it('should convert Beaufort to knots correctly', () => {
      const { result } = renderHook(() => useUnitConversion());

      // Test Beaufort to knots conversions (using midpoint values)
      expect(result.current.convert(0, 'beaufort', 'knots_wind')).toBeCloseTo(0.5, 1);
      expect(result.current.convert(4, 'beaufort', 'knots_wind')).toBeCloseTo(13.5, 1);
      expect(result.current.convert(8, 'beaufort', 'knots_wind')).toBeCloseTo(37.5, 1);
    });

    it('should format Beaufort scale with descriptions', () => {
      const { result } = renderHook(() => useUnitConversion());

      const formatted = result.current.format(25, 'knots_wind');
      // Should convert 25 knots to Beaufort 6 (Strong Breeze)
      const beaufortResult = result.current.format(25, 'beaufort');
      expect(beaufortResult).toContain('6 Bf');
      expect(beaufortResult).toContain('Strong Breeze');
    });

    it('should convert between different wind speed units via knots', () => {
      const { result } = renderHook(() => useUnitConversion());

      // 20 knots wind to km/h
      const kmhWind = result.current.convert(20, 'knots_wind', 'kmh_wind');
      expect(kmhWind).toBeCloseTo(37.04, 1); // 20 * 1.852

      // 50 km/h wind to Beaufort
      const beaufortFromKmh = result.current.convert(50, 'kmh_wind', 'beaufort');
      const expectedKnots = 50 / 1.852; // ~27 knots
      expect(beaufortFromKmh).toBe(6); // Strong Breeze
    });
  });

  describe('Marine System Presets', () => {
    it('should apply nautical system with appropriate marine defaults', () => {
      const { result } = renderHook(() => useUnitConversion());

      act(() => {
        result.current.setSystem('nautical');
      });

      // Check that vessel speed defaults to knots
      const vesselSpeedUnit = result.current.getPreferredUnit('vessel_speed');
      expect(vesselSpeedUnit?.id).toBe('knots');

      // Check that wind speed defaults to Beaufort in nautical system
      const windSpeedUnit = result.current.getPreferredUnit('wind_speed');
      expect(windSpeedUnit?.id).toBe('beaufort');

      // Check that distance uses nautical miles
      const distanceUnit = result.current.getPreferredUnit('distance');
      expect(distanceUnit?.id).toBe('nautical_mile');

      // Temperature should be Celsius (maritime standard)
      const tempUnit = result.current.getPreferredUnit('temperature');
      expect(tempUnit?.id).toBe('celsius');
    });

    it('should allow individual unit preferences within system', () => {
      const { result } = renderHook(() => useUnitConversion());

      act(() => {
        result.current.setSystem('nautical');
      });

      // Override wind speed to use knots instead of Beaufort
      act(() => {
        result.current.setPreferredUnit('wind_speed', 'knots_wind');
      });

      const windSpeedUnit = result.current.getPreferredUnit('wind_speed');
      expect(windSpeedUnit?.id).toBe('knots_wind');

      // Vessel speed should still be knots
      const vesselSpeedUnit = result.current.getPreferredUnit('vessel_speed');
      expect(vesselSpeedUnit?.id).toBe('knots');
    });
  });

  describe('Mixed Marine Units Scenario', () => {
    it('should handle realistic marine scenario with mixed preferences', () => {
      const { result } = renderHook(() => useUnitConversion());

      // Set up a realistic marine configuration:
      // - Depth in meters (for precision in shallow water)
      // - Vessel speed in knots (standard)
      // - Wind speed in Beaufort (traditional sailing)
      // - Distance in nautical miles (navigation)

      act(() => {
        result.current.setPreferredUnit('depth', 'meter'); // For depth
        result.current.setPreferredUnit('vessel_speed', 'knots');
        result.current.setPreferredUnit('wind_speed', 'beaufort');
      });

      // Test depth conversion (shallow water precision)
      const depth = result.current.convertToPreferred(15.7, 'foot');
      expect(depth?.unit.id).toBe('meter');
      expect(depth?.value).toBeCloseTo(4.78, 2); // 15.7 * 0.3048

      // Test wind speed display
      const windFormatted = result.current.formatWithPreferred(25, 'knots_wind');
      expect(windFormatted).toContain('6 Bf'); // 25 knots = Beaufort 6
      expect(windFormatted).toContain('Strong Breeze');

      // Test vessel speed remains precise
      const vesselSpeed = result.current.formatWithPreferred(12.5, 'knots');
      expect(vesselSpeed).toBe('12.5 kts');
    });
  });

  describe('Category Management', () => {
    it('should distinguish between vessel_speed and wind_speed categories', () => {
      const { result } = renderHook(() => useUnitConversion());

      const vesselSpeedUnits = result.current.getUnitsInCategory('vessel_speed');
      const windSpeedUnits = result.current.getUnitsInCategory('wind_speed');

      expect(vesselSpeedUnits.length).toBeGreaterThan(0);
      expect(windSpeedUnits.length).toBeGreaterThan(0);

      // Should include Beaufort only in wind speed category
      const hasBeaufortInVessel = vesselSpeedUnits.some((u) => u.id === 'beaufort');
      const hasBeaufortInWind = windSpeedUnits.some((u) => u.id === 'beaufort');

      expect(hasBeaufortInVessel).toBe(false);
      expect(hasBeaufortInWind).toBe(true);
    });

    it('should list all marine-relevant categories', () => {
      const { result } = renderHook(() => useUnitConversion());

      const categories = result.current.getCategories();

      expect(categories).toContain('vessel_speed');
      expect(categories).toContain('wind_speed');
      expect(categories).toContain('distance');
      expect(categories).toContain('temperature');
      expect(categories).toContain('pressure');
      expect(categories).toContain('coordinates');
    });
  });
});
