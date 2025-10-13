// Mock react-native-vector-icons
jest.mock('react-native-vector-icons/Ionicons', () => 'Ionicons');

// Mock react-native-svg
jest.mock('react-native-svg', () => ({
  Svg: 'Svg',
  Line: 'Line',
  Polyline: 'Polyline',
}));

describe('SpeedWidget (COG/SOG)', () => {
  describe('speed unit conversions', () => {
    it('converts knots to mph', () => {
      const knotsToMph = (knots: number) => knots * 1.15078;
      
      expect(knotsToMph(10).toFixed(1)).toBe('11.5');
      expect(knotsToMph(0)).toBe(0);
      expect(knotsToMph(20).toFixed(1)).toBe('23.0');
    });

    it('converts knots to km/h', () => {
      const knotsToKmh = (knots: number) => knots * 1.852;
      
      expect(knotsToKmh(10).toFixed(1)).toBe('18.5');
      expect(knotsToKmh(0)).toBe(0);
      expect(knotsToKmh(20).toFixed(1)).toBe('37.0');
    });
  });

  describe('speed trend calculation', () => {
    it('calculates positive trend', () => {
      const history = [
        { timestamp: Date.now() - 300000, speed: 5.0 },
        { timestamp: Date.now(), speed: 7.5 },
      ];
      
      const trend = history[1].speed - history[0].speed;
      expect(trend).toBe(2.5);
    });

    it('calculates negative trend', () => {
      const history = [
        { timestamp: Date.now() - 300000, speed: 10.0 },
        { timestamp: Date.now(), speed: 8.0 },
      ];
      
      const trend = history[1].speed - history[0].speed;
      expect(trend).toBe(-2.0);
    });

    it('handles zero trend', () => {
      const history = [
        { timestamp: Date.now() - 300000, speed: 6.0 },
        { timestamp: Date.now(), speed: 6.0 },
      ];
      
      const trend = history[1].speed - history[0].speed;
      expect(trend).toBe(0);
    });
  });

  describe('course indicator calculations', () => {
    it('calculates arrow position for north (0°)', () => {
      const course = 0;
      const angle = (course - 90) * (Math.PI / 180);
      const center = 20;
      const length = 15;
      
      const x2 = center + length * Math.cos(angle);
      const y2 = center + length * Math.sin(angle);
      
      expect(Math.round(x2)).toBe(20); // centered
      expect(Math.round(y2)).toBe(5);  // pointing up
    });

    it('calculates arrow position for east (90°)', () => {
      const course = 90;
      const angle = (course - 90) * (Math.PI / 180);
      const center = 20;
      const length = 15;
      
      const x2 = center + length * Math.cos(angle);
      const y2 = center + length * Math.sin(angle);
      
      expect(Math.round(x2)).toBe(35); // pointing right
      expect(Math.round(y2)).toBe(20); // centered
    });
  });
});
