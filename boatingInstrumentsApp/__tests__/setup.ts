// Jest setup file for React Native testing
// This file is loaded before all tests via setupFilesAfterEnv in jest.config.js

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () => ({
  setItem: jest.fn(() => Promise.resolve()),
  getItem: jest.fn(() => Promise.resolve(null)),
  removeItem: jest.fn(() => Promise.resolve()),
  clear: jest.fn(() => Promise.resolve()),
}));

// Mock react-native-tcp-socket globally
jest.mock('react-native-tcp-socket', () => ({
  createConnection: jest.fn(),
}));

// Mock react-native-udp globally
jest.mock('react-native-udp', () => ({
  createSocket: jest.fn(() => ({
    bind: jest.fn(),
    on: jest.fn(),
    close: jest.fn(),
  })),
}));

// Mock Sentry
jest.mock('@sentry/react-native', () => ({
  init: jest.fn(),
  captureException: jest.fn(),
  captureMessage: jest.fn(),
}));

// Mock react-native-svg globally
jest.mock('react-native-svg', () => {
  const React = require('react');
  return {
    Svg: (props: any) => React.createElement('View', { testID: 'svg', ...props }),
    Rect: (props: any) => React.createElement('View', { testID: 'rect', ...props }),
    Path: (props: any) => React.createElement('View', { testID: 'path', ...props }),
    Circle: (props: any) => React.createElement('View', { testID: 'circle', ...props }),
    Line: (props: any) => React.createElement('View', { testID: 'line', ...props }),
    G: (props: any) => React.createElement('View', { testID: 'g', ...props }),
    Text: (props: any) => React.createElement('Text', { testID: 'svg-text', ...props }),
  };
});

// Suppress console errors in tests (optional, comment out if you need to see them)
// console.error = jest.fn();
// console.warn = jest.fn();
