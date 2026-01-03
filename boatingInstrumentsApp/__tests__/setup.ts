/**
 * Jest Test Setup
 *
 * Global test configuration and polyfills for React Native environment
 */

// Mock react-native modules that don't work in Node.js
jest.mock('react-native/Libraries/Animated/NativeAnimatedHelper');

// Silence console warnings during tests (optional - comment out if debugging)
// global.console = {
//   ...console,
//   warn: jest.fn(),
//   error: jest.fn(),
// };

// Setup fetch polyfill if needed
global.fetch = global.fetch || jest.fn();

// Set default timeout for async tests
jest.setTimeout(10000);
