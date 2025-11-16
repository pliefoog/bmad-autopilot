module.exports = {
  preset: 'react-native',
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
  setupFilesAfterEnv: [
    '<rootDir>/__tests__/setup.ts',
    '<rootDir>/__tests__/setup-test-environment.ts',
    '<rootDir>/src/test-utils/performance-monitor-setup.ts'
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
  // Story 11.6: Coverage and Performance Thresholds - Marine Safety Focus
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 70,
      lines: 70,
      statements: 70,
    },
    // Widget Coverage: 85% minimum (UI components critical for marine operations)
    './src/widgets/**/*.{js,jsx,ts,tsx}': {
      branches: 85,
      functions: 85,
      lines: 85,
      statements: 85,
    },
    './src/components/marine/**/*.{js,jsx,ts,tsx}': {
      branches: 85,
      functions: 85,
      lines: 85,
      statements: 85,
    },
    // Service Coverage: 80% minimum (NMEA parsing and state management)
    './src/services/**/*.{js,jsx,ts,tsx}': {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80,
    },
    './src/systems/**/*.{js,jsx,ts,tsx}': {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80,
    },
    './src/hooks/**/*.{js,jsx,ts,tsx}': {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80,
    },
    // Integration Coverage: 90% minimum (end-to-end marine data workflows)
    './server/lib/**/*.js': {
      branches: 90,
      functions: 90,
      lines: 90,
      statements: 90,
    },
    // Marine Safety Critical: 95% minimum (safety-critical marine functions)
    './src/services/nmea/**/*.{js,jsx,ts,tsx}': {
      branches: 95,
      functions: 95,
      lines: 95,
      statements: 95,
    },
    './src/widgets/autopilot/**/*.{js,jsx,ts,tsx}': {
      branches: 95,
      functions: 95,
      lines: 95,
      statements: 95,
    },
    './src/widgets/navigation/**/*.{js,jsx,ts,tsx}': {
      branches: 95,
      functions: 95,
      lines: 95,
      statements: 95,
    },
  },
  testEnvironment: 'node',
  clearMocks: true,
  restoreMocks: true,
  fakeTimers: {
    enableGlobally: false,
  },
  testTimeout: 10000,
  // Story 11.6: Memory-efficient test execution
  maxWorkers: '50%', // Use half of available CPU cores to prevent overload
  workerIdleMemoryLimit: '500MB', // Restart workers if they use too much memory
  // Story 11.6: Enhanced Coverage Reporting with Marine Safety Focus
  coverageDirectory: 'coverage',
  collectCoverage: false, // Enable via CLI flag for traceability reports
  coverageReporters: [
    'json-summary', 
    'text', 
    'lcov',
    ['text', { 'file': 'coverage/coverage-summary.txt' }],
    ['json', { 'file': 'coverage/coverage-final.json' }]
  ],
  
  // Story 11.7: VS Code Test Explorer Integration - Professional Test Reporting
  reporters: [
    'default',
    // AC1: Professional Test Documentation Display with PURPOSE/REQUIREMENT/METHOD headers
    ['<rootDir>/src/testing/jest-reporters/professional-test-documentation-reporter.js', {
      outputFile: 'coverage/vscode-test-explorer.json',
      traceabilityFile: 'coverage/requirement-traceability.json'
    }],
    // AC2: Real-Time Coverage Visualization with marine safety focus areas
    ['<rootDir>/src/testing/jest-reporters/real-time-marine-coverage-reporter.js', {
      updateInterval: 50, // <100ms latency requirement
      outputFile: 'coverage/vscode-coverage-overlay.json'
    }],
    // AC3: Simulator Connection Status Integration
    ['<rootDir>/src/testing/jest-reporters/simulator-status-integration.js', {
      discoveryPorts: [9090, 8080],
      discoveryTimeout: 5000,
      healthCheckInterval: 10000
    }],
    // AC4: Performance Monitoring Integration with threshold violations
    ['<rootDir>/src/testing/jest-reporters/performance-monitoring-integration.js', {
      renderThreshold: 16, // 60fps requirement
      memoryThreshold: 50, // MB increase limit
      dataLatencyThreshold: 100 // NMEA → widget update limit
    }]
  ],
  
  testResultsProcessor: undefined, // Can be configured for custom result processing
};
