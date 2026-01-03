/**
 * Test Environment Setup
 *
 * Configure testing environment variables and global mocks
 */

// Mock environment variables
process.env.NODE_ENV = 'test';

// Mock React Native modules
jest.mock('react-native-sound', () => {
  return {
    __esModule: true,
    default: jest.fn(),
    setCategory: jest.fn(),
    MAIN_BUNDLE: 'MAIN_BUNDLE',
  };
});

jest.mock('@react-native-async-storage/async-storage', () => ({
  setItem: jest.fn(() => Promise.resolve()),
  getItem: jest.fn(() => Promise.resolve(null)),
  removeItem: jest.fn(() => Promise.resolve()),
  clear: jest.fn(() => Promise.resolve()),
}));

// Mock react-native-tcp-socket if used
jest.mock('react-native-tcp-socket', () => ({
  createConnection: jest.fn(),
  createServer: jest.fn(),
}));

// Mock expo modules
jest.mock('expo-brightness', () => ({
  setBrightnessAsync: jest.fn(() => Promise.resolve()),
  getBrightnessAsync: jest.fn(() => Promise.resolve(1)),
  usePermissions: jest.fn(() => [null, jest.fn(), jest.fn()]),
}));
