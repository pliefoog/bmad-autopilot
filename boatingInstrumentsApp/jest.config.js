module.exports = {
  preset: 'react-native',
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
  setupFilesAfterEnv: [
    '<rootDir>/__tests__/setup.ts',
    '<rootDir>/__tests__/setup-test-environment.ts'
  ],
  transformIgnorePatterns: [
    'node_modules/(?!(react-native|@react-native|react-native-tcp-socket|react-native-udp|@react-native-async-storage|react-native-vector-icons|@sentry|zustand|react-native-svg|react-native-sound|expo-brightness|expo-modules-core|react-native-gesture-handler)/)',
  ],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@testing/(.*)$': '<rootDir>/src/testing/$1',
    '^@test-standards/(.*)$': '<rootDir>/../test-infrastructure/$1',
  },
  testMatch: [
    '**/__tests__/**/*.test.ts?(x)',
    '**/src/testing/**/*.test.ts?(x)',
    '**/server/test/**/*.test.js',
    // Story 11.1: Triple-Tier Testing Architecture
    '**/__tests__/tier1-unit/**/*.test.ts?(x)',
    '**/__tests__/tier2-integration/**/*.test.ts?(x)',
    '**/__tests__/tier3-e2e/**/*.test.ts?(x)',
  ],
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    'server/**/*.js',
    '!src/**/*.d.ts',
    '!src/**/__tests__/**',
    '!src/testing/**', // Exclude testing utilities from coverage
    '!server/test/**', // Exclude test files from coverage
    '!server/__tests__/**', // Exclude test files from coverage
  ],
  // Story 11.1 AC1 & AC2 Coverage Requirements: 85% widget, 80% service, 90% integration
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 70,
      lines: 70,
      statements: 70,
    },
    './src/widgets/': {
      branches: 85,
      functions: 85,
      lines: 85,
      statements: 85,
    },
    './src/services/': {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80,
    },
    './src/hooks/': {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80,
    },
    './server/lib/': {
      branches: 90,
      functions: 90,
      lines: 90,
      statements: 90,
    },
  },
  testEnvironment: 'node',
  clearMocks: true,
  restoreMocks: true,
  fakeTimers: {
    enableGlobally: false,
  },
  testTimeout: 10000,
  // Story 11.4: Professional Test Documentation Standards - Traceability Support
  coverageDirectory: 'coverage',
  collectCoverage: false, // Enable via CLI flag for traceability reports
  coverageReporters: ['json-summary', 'text', 'lcov'],
  testResultsProcessor: undefined, // Can be configured for custom result processing
};
