/**
 * ReEnrichmentCoordinator Unit Tests
 *
 * Tests global re-enrichment coordination
 */

import { ReEnrichmentCoordinator } from '../ReEnrichmentCoordinator';
import { usePresentationStore } from '../../presentation/presentationStore';

// Mock presentation store
jest.mock('../../presentation/presentationStore', () => ({
  usePresentationStore: {
    subscribe: jest.fn(),
  },
}));

// Mock logger
jest.mock('../../utils/logging/logger', () => ({
  log: {
    app: jest.fn(),
  },
}));

describe('ReEnrichmentCoordinator', () => {
  let mockInstance: any;
  let mockUnsubscribe: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();

    // Create mock sensor instance
    mockInstance = {
      type: 'depth',
      instance: 0,
      reEnrich: jest.fn(),
    };

    // Mock unsubscribe function
    mockUnsubscribe = jest.fn();
    (usePresentationStore.subscribe as jest.Mock).mockReturnValue(mockUnsubscribe);

    // Clear coordinator state
    (ReEnrichmentCoordinator as any).instances.clear();
    (ReEnrichmentCoordinator as any).unsubscribe = undefined;
  });

  afterEach(() => {
    jest.useRealTimers();
    ReEnrichmentCoordinator.destroy();
  });

  describe('initialize', () => {
    it('should subscribe to presentation store', () => {
      ReEnrichmentCoordinator.initialize();

      expect(usePresentationStore.subscribe).toHaveBeenCalled();
    });

    it('should only initialize once', () => {
      ReEnrichmentCoordinator.initialize();
      ReEnrichmentCoordinator.initialize();

      expect(usePresentationStore.subscribe).toHaveBeenCalledTimes(1);
    });

    it('should trigger re-enrichment on presentation change', () => {
      ReEnrichmentCoordinator.initialize();
      ReEnrichmentCoordinator.register(mockInstance);

      // Get subscribe callback
      const subscribeCallback = (usePresentationStore.subscribe as jest.Mock).mock.calls[0][0];

      // Simulate presentation change
      const newState = { selectedPresentations: { depth: 'imperial' } };
      const prevState = { selectedPresentations: { depth: 'metric' } };

      subscribeCallback(newState, prevState);

      // Debounce timer
      jest.advanceTimersByTime(100);

      expect(mockInstance.reEnrich).toHaveBeenCalled();
    });

    it('should not trigger if presentations unchanged', () => {
      ReEnrichmentCoordinator.initialize();
      ReEnrichmentCoordinator.register(mockInstance);

      const subscribeCallback = (usePresentationStore.subscribe as jest.Mock).mock.calls[0][0];

      const sameState = { selectedPresentations: { depth: 'metric' } };

      subscribeCallback(sameState, sameState);

      jest.advanceTimersByTime(100);

      expect(mockInstance.reEnrich).not.toHaveBeenCalled();
    });
  });

  describe('register', () => {
    it('should add instance to registry', () => {
      ReEnrichmentCoordinator.register(mockInstance);

      const stats = ReEnrichmentCoordinator.getStats();
      expect(stats.registeredInstances).toBe(1);
    });

    it('should allow multiple instances', () => {
      const mockInstance2 = { ...mockInstance, instance: 1, reEnrich: jest.fn() };

      ReEnrichmentCoordinator.register(mockInstance);
      ReEnrichmentCoordinator.register(mockInstance2);

      const stats = ReEnrichmentCoordinator.getStats();
      expect(stats.registeredInstances).toBe(2);
    });
  });

  describe('unregister', () => {
    it('should remove instance from registry', () => {
      ReEnrichmentCoordinator.register(mockInstance);
      ReEnrichmentCoordinator.unregister(mockInstance);

      const stats = ReEnrichmentCoordinator.getStats();
      expect(stats.registeredInstances).toBe(0);
    });

    it('should handle unregistering non-existent instance', () => {
      expect(() => {
        ReEnrichmentCoordinator.unregister(mockInstance);
      }).not.toThrow();
    });
  });

  describe('triggerReEnrichment', () => {
    it('should debounce re-enrichment calls', () => {
      ReEnrichmentCoordinator.register(mockInstance);

      ReEnrichmentCoordinator.triggerReEnrichment();
      ReEnrichmentCoordinator.triggerReEnrichment();
      ReEnrichmentCoordinator.triggerReEnrichment();

      // Should only call once after debounce
      jest.advanceTimersByTime(100);

      expect(mockInstance.reEnrich).toHaveBeenCalledTimes(1);
    });

    it('should re-enrich all registered instances', () => {
      const mockInstance2 = { ...mockInstance, instance: 1, reEnrich: jest.fn() };

      ReEnrichmentCoordinator.register(mockInstance);
      ReEnrichmentCoordinator.register(mockInstance2);

      ReEnrichmentCoordinator.triggerReEnrichment();
      jest.advanceTimersByTime(100);

      expect(mockInstance.reEnrich).toHaveBeenCalled();
      expect(mockInstance2.reEnrich).toHaveBeenCalled();
    });

    it('should handle empty instance list gracefully', () => {
      expect(() => {
        ReEnrichmentCoordinator.triggerReEnrichment();
        jest.advanceTimersByTime(100);
      }).not.toThrow();
    });
  });

  describe('destroy', () => {
    it('should clear all instances', () => {
      ReEnrichmentCoordinator.register(mockInstance);
      ReEnrichmentCoordinator.destroy();

      const stats = ReEnrichmentCoordinator.getStats();
      expect(stats.registeredInstances).toBe(0);
    });

    it('should unsubscribe from presentation store', () => {
      ReEnrichmentCoordinator.initialize();
      ReEnrichmentCoordinator.destroy();

      expect(mockUnsubscribe).toHaveBeenCalled();
    });

    it('should clear debounce timer', () => {
      ReEnrichmentCoordinator.register(mockInstance);
      ReEnrichmentCoordinator.triggerReEnrichment();

      ReEnrichmentCoordinator.destroy();

      jest.advanceTimersByTime(100);

      // Should not call reEnrich after destroy
      expect(mockInstance.reEnrich).not.toHaveBeenCalled();
    });
  });

  describe('getStats', () => {
    it('should return current stats', () => {
      ReEnrichmentCoordinator.register(mockInstance);
      ReEnrichmentCoordinator.initialize();

      const stats = ReEnrichmentCoordinator.getStats();

      expect(stats).toEqual({
        registeredInstances: 1,
        isInitialized: true,
      });
    });

    it('should reflect uninitialized state', () => {
      const stats = ReEnrichmentCoordinator.getStats();

      expect(stats.isInitialized).toBe(false);
    });
  });
});
