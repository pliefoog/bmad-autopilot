/**
 * AppError Unit Tests
 *
 * Tests dual-message error system with dev/user messages
 */

import { AppError } from '../AppError';
import { log } from '../logging/logger';

// Mock logger
jest.mock('../logging/logger', () => ({
  log: {
    app: jest.fn(),
  },
}));

describe('AppError', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Constructor', () => {
    it('should create error with all properties', () => {
      const error = new AppError('TEST_ERROR', 'Technical details', 'User friendly message', {
        foo: 'bar',
      });

      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(AppError);
      expect(error.code).toBe('TEST_ERROR');
      expect(error.devMessage).toBe('Technical details');
      expect(error.userMessage).toBe('User friendly message');
      expect(error.context).toEqual({ foo: 'bar' });
      expect(error.name).toBe('AppError');
    });

    it('should create error without context', () => {
      const error = new AppError('TEST_ERROR', 'Technical details', 'User friendly message');

      expect(error.code).toBe('TEST_ERROR');
      expect(error.context).toBeUndefined();
    });

    it('should set error message to devMessage', () => {
      const error = new AppError('TEST_ERROR', 'Technical details', 'User friendly message');

      expect(error.message).toBe('Technical details');
    });
  });

  describe('getDisplayMessage', () => {
    const error = new AppError('TEST_ERROR', 'Technical details for devs', 'User friendly message');

    it('should return devMessage when isDev=true', () => {
      expect(error.getDisplayMessage(true)).toBe('Technical details for devs');
    });

    it('should return userMessage when isDev=false', () => {
      expect(error.getDisplayMessage(false)).toBe('User friendly message');
    });

    it('should return userMessage by default', () => {
      expect(error.getDisplayMessage()).toBe('User friendly message');
    });
  });

  describe('logError', () => {
    it('should log error with all details', () => {
      const error = new AppError('TEST_ERROR', 'Technical details', 'User friendly message', {
        requestId: '123',
      });

      error.logError();

      expect(log.app).toHaveBeenCalledWith('AppError: TEST_ERROR', expect.any(Function));

      // Call the lazy function to verify context
      const logCall = (log.app as jest.Mock).mock.calls[0];
      const lazyFn = logCall[1];
      const loggedData = lazyFn();

      expect(loggedData).toEqual({
        code: 'TEST_ERROR',
        devMessage: 'Technical details',
        userMessage: 'User friendly message',
        context: { requestId: '123' },
        stack: expect.any(String),
      });
    });

    it('should log error without context', () => {
      const error = new AppError('TEST_ERROR', 'Technical details', 'User friendly message');

      error.logError();

      const logCall = (log.app as jest.Mock).mock.calls[0];
      const lazyFn = logCall[1];
      const loggedData = lazyFn();

      expect(loggedData.context).toBeUndefined();
    });
  });

  describe('toJSON', () => {
    it('should serialize to JSON with all properties', () => {
      const error = new AppError('TEST_ERROR', 'Technical details', 'User friendly message', {
        requestId: '123',
      });

      const json = error.toJSON();

      expect(json).toEqual({
        name: 'AppError',
        code: 'TEST_ERROR',
        devMessage: 'Technical details',
        userMessage: 'User friendly message',
        context: { requestId: '123' },
        stack: expect.any(String),
      });
    });

    it('should serialize without context', () => {
      const error = new AppError('TEST_ERROR', 'Technical details', 'User friendly message');

      const json = error.toJSON() as any;

      expect(json.context).toBeUndefined();
    });
  });

  describe('fromError', () => {
    it('should wrap AppError without modification', () => {
      const originalError = new AppError(
        'ORIGINAL_ERROR',
        'Original dev message',
        'Original user message',
      );

      const wrappedError = AppError.fromError(originalError);

      expect(wrappedError).toBe(originalError);
      expect(wrappedError.code).toBe('ORIGINAL_ERROR');
    });

    it('should wrap generic Error with default messages', () => {
      const genericError = new Error('Something broke');

      const wrappedError = AppError.fromError(genericError);

      expect(wrappedError).toBeInstanceOf(AppError);
      expect(wrappedError.code).toBe('UNKNOWN_ERROR');
      expect(wrappedError.devMessage).toBe('Something broke');
      expect(wrappedError.userMessage).toBe('An unexpected error occurred');
      expect(wrappedError.context).toEqual({ originalError: genericError });
    });

    it('should preserve stack trace from original error', () => {
      const genericError = new Error('Something broke');
      const originalStack = genericError.stack;

      const wrappedError = AppError.fromError(genericError);

      expect(wrappedError.stack).toBe(originalStack);
    });

    it('should handle error without message', () => {
      const error = new Error();

      const wrappedError = AppError.fromError(error);

      expect(wrappedError.devMessage).toBe('Unknown error');
    });

    it('should handle non-Error objects', () => {
      const weirdError = { foo: 'bar' };

      const wrappedError = AppError.fromError(weirdError as any);

      expect(wrappedError.devMessage).toBe('Unknown error');
      expect(wrappedError.context).toEqual({ originalError: weirdError });
    });
  });

  describe('Error inheritance', () => {
    it('should be throwable', () => {
      expect(() => {
        throw new AppError('TEST', 'dev', 'user');
      }).toThrow(AppError);
    });

    it('should be catchable as Error', () => {
      try {
        throw new AppError('TEST', 'dev', 'user');
      } catch (e) {
        expect(e).toBeInstanceOf(Error);
        expect(e).toBeInstanceOf(AppError);
      }
    });

    it('should have proper prototype chain', () => {
      const error = new AppError('TEST', 'dev', 'user');

      expect(Object.getPrototypeOf(error)).toBe(AppError.prototype);
      expect(Object.getPrototypeOf(AppError.prototype)).toBe(Error.prototype);
    });
  });
});
