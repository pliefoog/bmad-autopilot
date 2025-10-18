// Jest setup file for React Native testing
// This file is loaded before all tests via setupFilesAfterEnv in jest.config.js

// Mock expo-brightness
jest.mock('expo-brightness', () => ({
  setBrightnessAsync: jest.fn(() => Promise.resolve()),
  getBrightnessAsync: jest.fn(() => Promise.resolve(1.0)),
  requestPermissionsAsync: jest.fn(() => Promise.resolve({ status: 'granted' })),
  usePermissions: jest.fn(() => [{ status: 'granted' }, jest.fn()]),
}));

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
  
  const MockSvgComponent = (testID: string) => React.forwardRef((props: any, ref: any) => 
    React.createElement('View', { testID, ref, ...props })
  );
    
  const MockTextComponent = React.forwardRef((props: any, ref: any) => 
    React.createElement('Text', { testID: 'svg-text', ref, ...props })
  );
  
  const SvgComponent = MockSvgComponent('svg');
  
  return {
    __esModule: true,
    default: SvgComponent,
    Svg: SvgComponent,
    Rect: MockSvgComponent('rect'),
    Path: MockSvgComponent('path'),
    Circle: MockSvgComponent('circle'),
    Line: MockSvgComponent('line'),
    G: MockSvgComponent('g'),
    Text: MockTextComponent,
    // Additional SVG components that might be used
    Ellipse: MockSvgComponent('ellipse'),
    Polygon: MockSvgComponent('polygon'),
    Polyline: MockSvgComponent('polyline'),
    Defs: MockSvgComponent('defs'),
    LinearGradient: MockSvgComponent('linearGradient'),
    Stop: MockSvgComponent('stop'),
    ClipPath: MockSvgComponent('clipPath'),
  };
});

// Mock react-native-sound
jest.mock('react-native-sound', () => {
  return class MockSound {
    static setCategory = jest.fn();
    static MAIN_BUNDLE = 'MAIN_BUNDLE';
    
    constructor(filename: string, basePath: string, callback?: (error: any) => void) {
      if (callback) {
        // Simulate successful load
        setTimeout(() => callback(null), 0);
      }
    }
    
    play = jest.fn((callback?: (success: boolean) => void) => {
      if (callback) {
        setTimeout(() => callback(true), 0);
      }
    });
    
    release = jest.fn();
  };
});

// Mock Modal component to avoid native dependencies
jest.mock('react-native/Libraries/Modal/Modal', () => {
  const React = require('react');
  
  const MockModal = ({ children, visible, ...props }: any) => {
    return visible ? React.createElement('View', { 
      testID: 'modal',
      ...props 
    }, children) : null;
  };
  
  return {
    __esModule: true,
    default: MockModal,
  };
});

// Mock SafeAreaView component to avoid native dependencies
jest.mock('react-native/Libraries/Components/SafeAreaView/SafeAreaView', () => {
  const React = require('react');
  
  const MockSafeAreaView = ({ children, ...props }: any) => {
    return React.createElement('View', { 
      testID: 'safe-area-view',
      ...props 
    }, children);
  };
  
  return {
    __esModule: true,
    default: MockSafeAreaView,
  };
});

// Additional React Native component mocks can be added here as needed

// Vibration is mocked per-test file where needed to avoid React Native import issues

// Suppress console errors in tests (optional, comment out if you need to see them)
// console.error = jest.fn();
// console.warn = jest.fn();
