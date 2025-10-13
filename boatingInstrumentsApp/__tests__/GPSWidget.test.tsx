import { formatLatLon } from '../src/widgets/GPSWidget';

// Mock react-native-vector-icons
jest.mock('react-native-vector-icons/Ionicons', () => 'Ionicons');

describe('GPSWidget', () => {
  describe('formatLatLon', () => {
    it('formats coordinates in decimal degrees (DD) format', () => {
      const result = formatLatLon(37.7749, -122.4194, 'DD');
      expect(result).toBe('37.77490°, -122.41940°');
    });

    it('formats coordinates in DMS format for northern latitude', () => {
      const result = formatLatLon(37.7749, -122.4194, 'DMS');
      expect(result).toContain('37°');
      expect(result).toContain('46\'');
      expect(result).toContain('N');
      expect(result).toContain('W');
    });

    it('formats coordinates in DMS format for southern latitude', () => {
      const result = formatLatLon(-33.8688, 151.2093, 'DMS');
      expect(result).toContain('33°');
      expect(result).toContain('S');
      expect(result).toContain('151°');
      expect(result).toContain('E');
    });

    it('handles zero coordinates', () => {
      const result = formatLatLon(0, 0, 'DD');
      expect(result).toBe('0.00000°, 0.00000°');
    });

    it('handles negative western longitude', () => {
      const result = formatLatLon(51.5074, -0.1278, 'DD');
      expect(result).toBe('51.50740°, -0.12780°');
    });
  });
});
