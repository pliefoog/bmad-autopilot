// Mock react-native-vector-icons
jest.mock('react-native-vector-icons/Ionicons', () => 'Ionicons');

// Mock react-native-svg
jest.mock('react-native-svg', () => ({
  Svg: 'Svg',
  Circle: 'Circle',
  Line: 'Line',
  Text: 'Text',
  G: 'G',
}));

describe('CompassWidget', () => {
  describe('heading calculations', () => {
    it('normalizes heading to 0-360 range', () => {
      const normalizeHeading = (heading: number) => ((heading % 360) + 360) % 360;
      
      expect(normalizeHeading(0)).toBe(0);
      expect(normalizeHeading(180)).toBe(180);
      expect(normalizeHeading(360)).toBe(0);
      expect(normalizeHeading(370)).toBe(10);
      expect(normalizeHeading(-10)).toBe(350);
      expect(normalizeHeading(-180)).toBe(180);
    });

    it('rounds heading for display', () => {
      const roundHeading = (heading: number) => Math.round(heading);
      
      expect(roundHeading(45.4)).toBe(45);
      expect(roundHeading(45.5)).toBe(46);
      expect(roundHeading(180.0)).toBe(180);
      expect(roundHeading(359.9)).toBe(360);
    });

    it('calculates cardinal direction positions', () => {
      // Test cardinal angle to position conversion
      const getCardinalPosition = (angle: number, heading: number, center: number, radius: number) => {
        const adjustedAngle = (angle - heading) * (Math.PI / 180);
        return {
          x: center + radius * Math.sin(adjustedAngle),
          y: center - radius * Math.cos(adjustedAngle),
        };
      };
      
      const center = 50;
      const radius = 40;
      
      // When heading is 0 (North), North should be at top
      const northPos = getCardinalPosition(0, 0, center, radius);
      expect(Math.round(northPos.x)).toBe(50); // centered
      expect(Math.round(northPos.y)).toBe(10); // top (50 - 40)
      
      // When heading is 90 (East), East should be at top
      const eastPos = getCardinalPosition(90, 90, center, radius);
      expect(Math.round(eastPos.x)).toBe(50); // centered
      expect(Math.round(eastPos.y)).toBe(10); // top
    });
  });
});
