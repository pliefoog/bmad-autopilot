// Jest setup file for React Native testing
// This file is loaded before all tests via setupFilesAfterEnv in jest.config.js

// Mock @expo/vector-icons
jest.mock('@expo/vector-icons', () => {
  const React = require('react');
  const { Text } = require('react-native');
  
  const createMockIconComponent = (name: string) => 
    React.forwardRef((props: any, ref: any) =>
      React.createElement(Text, { 
        ...props, 
        ref,
        testID: `${name.toLowerCase()}-icon`,
        children: `[${name}]`
      })
    );

  return {
    AntDesign: createMockIconComponent('AntDesign'),
    Entypo: createMockIconComponent('Entypo'),
    EvilIcons: createMockIconComponent('EvilIcons'),
    Feather: createMockIconComponent('Feather'),
    FontAwesome: createMockIconComponent('FontAwesome'),
    FontAwesome5: createMockIconComponent('FontAwesome5'),
    Foundation: createMockIconComponent('Foundation'),
    Ionicons: createMockIconComponent('Ionicons'),
    MaterialIcons: createMockIconComponent('MaterialIcons'),
    MaterialCommunityIcons: createMockIconComponent('MaterialCommunityIcons'),
    Octicons: createMockIconComponent('Octicons'),
    SimpleLineIcons: createMockIconComponent('SimpleLineIcons'),
    Zocial: createMockIconComponent('Zocial'),
  };
});

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

// Mock import.meta for tests
Object.defineProperty(global, 'importMeta', {
  value: {
    url: 'http://localhost/',
    env: {
      NODE_ENV: 'test',
    },
  },
  writable: true,
});

// Mock window.location for web polyfills
Object.defineProperty(global, 'window', {
  value: {
    location: {
      href: 'http://localhost/',
    },
  },
  writable: true,
});

// Mock React Native Testing Library to use simpler rendering without timer dependencies
jest.mock('@testing-library/react-native', () => {
  const React = require('react');
  const { create } = require('react-test-renderer');
  
  const render = (component: React.ReactElement) => {
    const rendered = create(component);
    
    return {
      getByTestId: (testID: string) => {
        const instance = rendered.root;
        try {
          return instance.findByProps({ testID });
        } catch {
          throw new Error(`Unable to find an element with testID: ${testID}`);
        }
      },
      getAllByTestId: (testID: string | RegExp) => {
        const instance = rendered.root;
        try {
          if (typeof testID === 'string') {
            return instance.findAllByProps({ testID });
          } else {
            return instance.findAll((node: any) => 
              node.props && node.props.testID && testID.test(node.props.testID)
            );
          }
        } catch {
          throw new Error(`Unable to find elements with testID: ${testID}`);
        }
      },
      queryByTestId: (testID: string) => {
        const instance = rendered.root;
        try {
          return instance.findByProps({ testID });
        } catch {
          return null;
        }
      },
      rerender: (newComponent: React.ReactElement) => {
        rendered.update(newComponent);
      },
      unmount: () => {
        rendered.unmount();
      },
      toJSON: () => rendered.toJSON(),
    };
  };
  
  const fireEvent = {
    press: (element: any) => {
      if (element && element.props && element.props.onPress) {
        element.props.onPress();
      }
    },
    changeText: (element: any, text: string) => {
      if (element && element.props && element.props.onChangeText) {
        element.props.onChangeText(text);
      }
    },
  };
  
  return {
    render,
    fireEvent,
    waitFor: (callback: () => void) => Promise.resolve(callback()),
    act: (callback: () => void) => {
      callback();
      return Promise.resolve();
    },
  };
});

// Mock react-native-gesture-handler
jest.mock('react-native-gesture-handler', () => {
  const React = require('react');
  
  const mockGestureHandler = (name: string) => React.forwardRef((props: any, ref: any) => {
    const { onGestureEvent, onHandlerStateChange, children, ...otherProps } = props;
    
    // Create mock gesture event
    const mockEvent = {
      nativeEvent: {
        translationX: 0,
        translationY: 0,
        state: 4, // END state
        velocityX: 0,
        velocityY: 0,
      }
    };
    
    return React.createElement('View', {
      testID: `${name.toLowerCase()}-gesture-handler`,
      ref,
      ...otherProps,
      onTouchStart: () => {
        onGestureEvent && onGestureEvent(mockEvent);
        onHandlerStateChange && onHandlerStateChange(mockEvent);
      }
    }, children);
  });

  return {
    PanGestureHandler: mockGestureHandler('Pan'),
    TapGestureHandler: mockGestureHandler('Tap'),
    LongPressGestureHandler: mockGestureHandler('LongPress'),
    State: {
      UNDETERMINED: 0,
      FAILED: 1,
      BEGAN: 2,
      CANCELLED: 3,
      ACTIVE: 4,
      END: 5,
    },
    Directions: {
      RIGHT: 1,
      LEFT: 2,
      UP: 4,
      DOWN: 8,
    },
    gestureHandlerRootHOC: (Component: any) => Component,
  };
});

// Mock Expo Router for navigation testing
jest.mock('expo-router', () => ({
  Stack: ({ children }: any) => children,
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
    canGoBack: jest.fn(() => true),
    setParams: jest.fn(),
    navigate: jest.fn(),
  }),
  useLocalSearchParams: () => ({}),
  useGlobalSearchParams: () => ({}),
  router: {
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
    canGoBack: jest.fn(() => true),
    setParams: jest.fn(),
    navigate: jest.fn(),
  },
  useFocusEffect: jest.fn(),
  useNavigation: () => ({
    navigate: jest.fn(),
    goBack: jest.fn(),
    setOptions: jest.fn(),
  }),
  Link: ({ children, href, ...props }: any) => 
    require('react').createElement('Text', { testID: 'expo-router-link', 'data-href': href, ...props }, children),
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

// Setup global timer polyfills for React Native Testing Library
// Advanced timer polyfill to fix React Native Testing Library issues
const originalSetTimeout = global.setTimeout;
const originalClearTimeout = global.clearTimeout;
const originalSetInterval = global.setInterval;
const originalClearInterval = global.clearInterval;

// Ensure global timers are available
global.setTimeout = originalSetTimeout || ((callback: () => void, delay?: number) => {
  return setImmediate(callback) as any;
});

global.clearTimeout = originalClearTimeout || ((id: any) => {
  if (id && typeof id === 'object' && id._onImmediate) {
    clearImmediate(id);
  } else if (typeof id === 'number') {
    clearImmediate(id);
  }
});

global.setInterval = originalSetInterval || ((callback: () => void, delay?: number) => {
  const intervalId = setImmediate(() => {
    callback();
    if (global.setInterval) {
      global.setInterval(callback, delay);
    }
  });
  return intervalId as any;
});

global.clearInterval = originalClearInterval || ((id: any) => {
  if (id) {
    if (typeof id === 'object' && id._onImmediate) {
      clearImmediate(id);
    } else if (typeof id === 'number') {
      clearImmediate(id);
    }
  }
});

// Polyfill globalThis for React Native Testing Library
if (typeof globalThis === 'undefined') {
  (global as any).globalThis = global;
}

// Ensure DOM-like environment for React Native Testing Library
if (typeof global.window === 'undefined') {
  global.window = global as any;
}

// Vibration is mocked per-test file where needed to avoid React Native import issues

// Suppress console errors in tests (optional, comment out if you need to see them)
// Filter out known React Native web warnings that aren't actionable
const originalConsoleError = console.error;
const originalConsoleWarn = console.warn;

console.error = (...args) => {
  // Filter out text node warnings from React Native web
  if (args[0] && args[0].includes && args[0].includes('Unexpected text node')) {
    return;
  }
  originalConsoleError.apply(console, args);
};

console.warn = (...args) => {
  // Filter out keyboard navigation repeated registrations in development
  if (args[0] && args[0].includes && (
    args[0].includes('[KeyboardNav] Unregistered shortcut') ||
    args[0].includes('[KeyboardNav] Registered shortcut')
  )) {
    return;
  }
  originalConsoleWarn.apply(console, args);
};
