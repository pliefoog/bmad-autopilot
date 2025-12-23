/**
 * ConversionRegistry Unit Tests
 *
 * Tests centralized unit conversion service with presentation caching
 */

import { ConversionRegistry } from '../ConversionRegistry';
import { usePresentationStore } from '../../presentation/presentationStore';

// Mock presentation store
jest.mock('../../presentation/presentationStore', () => ({
  usePresentationStore: {
    getState: jest.fn(),
    subscribe: jest.fn(),
  },
}));

// Mock logger
jest.mock('../logging/logger', () => ({
  log: {
    app: jest.fn(),
  },
}));

describe('ConversionRegistry', () => {
  const mockPresentation = {
    id: 'metric',
    category: 'depth' as const,
    name: 'Metric',
    description: 'Metric units',
    units: {
      depth: {
        symbol: 'm',
        convert: (si: number) => si,
        convertBack: (val: number) => val,
        format: (val: number) => val.toFixed(1),
      },
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();

    // Reset singleton state
    (ConversionRegistry as any).initialized = false;
    (ConversionRegistry as any).presentationCache.clear();

    // Setup mock presentation store
    (usePresentationStore.getState as jest.Mock).mockReturnValue({
      getPresentationForCategory: jest.fn(() => mockPresentation),
      selectedPresentations: {},
    });
    (usePresentationStore.subscribe as jest.Mock).mockReturnValue(jest.fn());
  });

  describe('Initialization', () => {
    it('should initialize lazily on first use', () => {
      expect((ConversionRegistry as any).initialized).toBe(false);

      ConversionRegistry.convertToDisplay(10, 'depth');

      expect((ConversionRegistry as any).initialized).toBe(true);
      expect(usePresentationStore.subscribe).toHaveBeenCalled();
    });

    it('should only initialize once', () => {
      ConversionRegistry.convertToDisplay(10, 'depth');
      ConversionRegistry.convertToDisplay(20, 'depth');

      expect(usePresentationStore.subscribe).toHaveBeenCalledTimes(1);
    });

    it('should subscribe to presentation changes', () => {
      ConversionRegistry.convertToDisplay(10, 'depth');

      const subscribeCall = (usePresentationStore.subscribe as jest.Mock).mock.calls[0];
      expect(subscribeCall[0]).toBeInstanceOf(Function);
    });
  });

  describe('convertToDisplay', () => {
    it('should convert SI value to display value', () => {
      const mockConvert = jest.fn((si: number) => si * 3.28084);
      const mockPresentationWithFeet = {
        ...mockPresentation,
        units: {
          depth: {
            symbol: 'ft',
            convert: mockConvert,
            convertBack: (val: number) => val / 3.28084,
            format: (val: number) => val.toFixed(1),
          },
        },
      };

      (usePresentationStore.getState as jest.Mock).mockReturnValue({
        getPresentationForCategory: jest.fn(() => mockPresentationWithFeet),
        selectedPresentations: {},
      });

      const result = ConversionRegistry.convertToDisplay(10, 'depth');

      expect(mockConvert).toHaveBeenCalledWith(10);
      expect(result).toBeCloseTo(32.8084, 4);
    });

    it('should cache presentation for reuse', () => {
      const getPresentationMock = jest.fn(() => mockPresentation);
      (usePresentationStore.getState as jest.Mock).mockReturnValue({
        getPresentationForCategory: getPresentationMock,
        selectedPresentations: {},
      });

      ConversionRegistry.convertToDisplay(10, 'depth');
      ConversionRegistry.convertToDisplay(20, 'depth');

      // Should only fetch presentation once (cached)
      expect(getPresentationMock).toHaveBeenCalledTimes(1);
    });

    it('should throw error if presentation not found', () => {
      (usePresentationStore.getState as jest.Mock).mockReturnValue({
        getPresentationForCategory: jest.fn(() => undefined),
        selectedPresentations: {},
      });

      expect(() => {
        ConversionRegistry.convertToDisplay(10, 'depth');
      }).toThrow('No presentation found for category');
    });

    it('should throw error if unit config not found', () => {
      const presentationWithoutDepth = {
        ...mockPresentation,
        units: {},
      };

      (usePresentationStore.getState as jest.Mock).mockReturnValue({
        getPresentationForCategory: jest.fn(() => presentationWithoutDepth),
        selectedPresentations: {},
      });

      expect(() => {
        ConversionRegistry.convertToDisplay(10, 'depth');
      }).toThrow('No unit config found');
    });
  });

  describe('convertToSI', () => {
    it('should convert display value to SI value', () => {
      const mockConvertBack = jest.fn((val: number) => val / 3.28084);
      const mockPresentationWithFeet = {
        ...mockPresentation,
        units: {
          depth: {
            symbol: 'ft',
            convert: (si: number) => si * 3.28084,
            convertBack: mockConvertBack,
            format: (val: number) => val.toFixed(1),
          },
        },
      };

      (usePresentationStore.getState as jest.Mock).mockReturnValue({
        getPresentationForCategory: jest.fn(() => mockPresentationWithFeet),
        selectedPresentations: {},
      });

      const result = ConversionRegistry.convertToSI(32.8084, 'depth');

      expect(mockConvertBack).toHaveBeenCalledWith(32.8084);
      expect(result).toBeCloseTo(10, 4);
    });

    it('should use cached presentation', () => {
      const getPresentationMock = jest.fn(() => mockPresentation);
      (usePresentationStore.getState as jest.Mock).mockReturnValue({
        getPresentationForCategory: getPresentationMock,
        selectedPresentations: {},
      });

      ConversionRegistry.convertToSI(10, 'depth');
      ConversionRegistry.convertToSI(20, 'depth');

      expect(getPresentationMock).toHaveBeenCalledTimes(1);
    });
  });

  describe('format', () => {
    it('should format value without unit', () => {
      const mockFormat = jest.fn((val: number) => val.toFixed(2));
      const mockPresentationWithFormat = {
        ...mockPresentation,
        units: {
          depth: {
            symbol: 'm',
            convert: (si: number) => si,
            convertBack: (val: number) => val,
            format: mockFormat,
          },
        },
      };

      (usePresentationStore.getState as jest.Mock).mockReturnValue({
        getPresentationForCategory: jest.fn(() => mockPresentationWithFormat),
        selectedPresentations: {},
      });

      const result = ConversionRegistry.format(10.567, 'depth', false);

      expect(mockFormat).toHaveBeenCalledWith(10.567);
      expect(result).toBe('10.57');
    });

    it('should format value with unit', () => {
      const mockFormat = jest.fn((val: number) => val.toFixed(1));
      const mockPresentationWithFormat = {
        ...mockPresentation,
        units: {
          depth: {
            symbol: 'ft',
            convert: (si: number) => si,
            convertBack: (val: number) => val,
            format: mockFormat,
          },
        },
      };

      (usePresentationStore.getState as jest.Mock).mockReturnValue({
        getPresentationForCategory: jest.fn(() => mockPresentationWithFormat),
        selectedPresentations: {},
      });

      const result = ConversionRegistry.format(10.567, 'depth', true);

      expect(result).toBe('10.6 ft');
    });

    it('should format with unit by default', () => {
      const mockFormat = jest.fn((val: number) => val.toFixed(1));
      const mockPresentationWithFormat = {
        ...mockPresentation,
        units: {
          depth: {
            symbol: 'm',
            convert: (si: number) => si,
            convertBack: (val: number) => val,
            format: mockFormat,
          },
        },
      };

      (usePresentationStore.getState as jest.Mock).mockReturnValue({
        getPresentationForCategory: jest.fn(() => mockPresentationWithFormat),
        selectedPresentations: {},
      });

      const result = ConversionRegistry.format(10.567, 'depth');

      expect(result).toBe('10.6 m');
    });
  });

  describe('getUnit', () => {
    it('should return unit symbol', () => {
      (usePresentationStore.getState as jest.Mock).mockReturnValue({
        getPresentationForCategory: jest.fn(() => mockPresentation),
        selectedPresentations: {},
      });

      const unit = ConversionRegistry.getUnit('depth');

      expect(unit).toBe('m');
    });

    it('should use cached presentation', () => {
      const getPresentationMock = jest.fn(() => mockPresentation);
      (usePresentationStore.getState as jest.Mock).mockReturnValue({
        getPresentationForCategory: getPresentationMock,
        selectedPresentations: {},
      });

      ConversionRegistry.getUnit('depth');
      ConversionRegistry.getUnit('depth');

      expect(getPresentationMock).toHaveBeenCalledTimes(1);
    });
  });

  describe('Cache invalidation', () => {
    it('should invalidate cache when presentation changes', () => {
      const getPresentationMock = jest.fn(() => mockPresentation);
      (usePresentationStore.getState as jest.Mock).mockReturnValue({
        getPresentationForCategory: getPresentationMock,
        selectedPresentations: { depth: 'metric' },
      });

      // First call - fetches presentation
      ConversionRegistry.convertToDisplay(10, 'depth');
      expect(getPresentationMock).toHaveBeenCalledTimes(1);

      // Simulate presentation change
      const subscribeCallback = (usePresentationStore.subscribe as jest.Mock).mock.calls[0][0];
      const newState = {
        getPresentationForCategory: getPresentationMock,
        selectedPresentations: { depth: 'imperial' },
      };
      const prevState = {
        getPresentationForCategory: getPresentationMock,
        selectedPresentations: { depth: 'metric' },
      };

      subscribeCallback(newState, prevState);

      // Next call - should fetch again (cache invalidated)
      ConversionRegistry.convertToDisplay(10, 'depth');
      expect(getPresentationMock).toHaveBeenCalledTimes(2);
    });

    it('should not invalidate cache if presentations unchanged', () => {
      const getPresentationMock = jest.fn(() => mockPresentation);
      (usePresentationStore.getState as jest.Mock).mockReturnValue({
        getPresentationForCategory: getPresentationMock,
        selectedPresentations: { depth: 'metric' },
      });

      ConversionRegistry.convertToDisplay(10, 'depth');
      expect(getPresentationMock).toHaveBeenCalledTimes(1);

      // Simulate non-presentation change
      const subscribeCallback = (usePresentationStore.subscribe as jest.Mock).mock.calls[0][0];
      const sameState = {
        getPresentationForCategory: getPresentationMock,
        selectedPresentations: { depth: 'metric' },
      };

      subscribeCallback(sameState, sameState);

      // Should still use cache
      ConversionRegistry.convertToDisplay(10, 'depth');
      expect(getPresentationMock).toHaveBeenCalledTimes(1);
    });
  });
});
