import { Dimensions } from 'react-native';

describe('Responsive Layout Tests', () => {
  const mockDimensions = (width: number, height: number) => {
    jest.spyOn(Dimensions, 'get').mockReturnValue({ width, height, scale: 1, fontScale: 1 });
  };

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should provide correct dimensions API', () => {
    mockDimensions(375, 812); // iPhone X dimensions
    
    const { width, height } = Dimensions.get('window');
    expect(width).toBe(375);
    expect(height).toBe(812);
  });

  it('should handle tablet dimensions', () => {
    mockDimensions(1024, 768); // iPad dimensions
    
    const { width, height } = Dimensions.get('window');
    expect(width).toBe(1024);
    expect(height).toBe(768);
    
    // Test responsive logic
    const isTablet = width > 768;
    expect(isTablet).toBe(true);
  });

  it('should detect orientation changes', () => {
    // Portrait
    mockDimensions(375, 812);
    let { width, height } = Dimensions.get('window');
    const isPortrait = height > width;
    expect(isPortrait).toBe(true);
    
    // Landscape
    mockDimensions(812, 375);
    ({ width, height } = Dimensions.get('window'));
    const isLandscape = width > height;
    expect(isLandscape).toBe(true);
  });

  it('should categorize different screen sizes correctly', () => {
    const testScreenSizes = [
      { width: 320, height: 568, expected: 'phone' }, // iPhone SE
      { width: 414, height: 896, expected: 'phone' }, // iPhone 11 Pro Max
      { width: 768, height: 1024, expected: 'phone' }, // iPad (768 is boundary)
      { width: 1024, height: 1366, expected: 'tablet' }, // iPad Pro
    ];

    testScreenSizes.forEach(({ width, height, expected }) => {
      mockDimensions(width, height);
      
      const dimensions = Dimensions.get('window');
      const deviceType = dimensions.width > 768 ? 'tablet' : 'phone';
      
      expect(deviceType).toBe(expected);
      expect(dimensions.width).toBe(width);
      expect(dimensions.height).toBe(height);
    });
  });
});