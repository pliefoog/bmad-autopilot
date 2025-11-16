// Jest configuration for VS Code Test Explorer Integration
// This file helps VS Code Jest extension discover tests in the boatingInstrumentsApp directory

const path = require('path');

// Point to the actual Jest configuration in boatingInstrumentsApp
module.exports = {
  projects: [
    {
      displayName: 'boatingInstrumentsApp',
      rootDir: './boatingInstrumentsApp',
      testMatch: [
        '<rootDir>/__tests__/**/*.test.ts?(x)',
        '<rootDir>/src/testing/**/*.test.ts?(x)',
        '<rootDir>/server/test/**/*.test.js',
        '<rootDir>/__tests__/tier1-unit/**/*.test.ts?(x)',
        '<rootDir>/__tests__/tier2-integration/**/*.test.ts?(x)',
        '<rootDir>/__tests__/tier3-e2e/**/*.test.ts?(x)',
      ],
      transform: {
        '^.+\\.(ts|tsx)$': 'babel-jest',
        '^.+\\.(js|jsx)$': 'babel-jest',
      },
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
      testEnvironment: 'node',
      coverageDirectory: '<rootDir>/coverage',
      
      // Story 11.7: VS Code Test Explorer Integration - Custom Reporters
      reporters: [
        'default',
        ['<rootDir>/src/testing/jest-reporters/professional-test-documentation-reporter.js', {}],
        ['<rootDir>/src/testing/jest-reporters/real-time-marine-coverage-reporter.js', {}],
        ['<rootDir>/src/testing/jest-reporters/simulator-status-integration.js', {}],
        ['<rootDir>/src/testing/jest-reporters/performance-monitoring-integration.js', {}]
      ]
    }
  ],
  
  // Global settings for VS Code Test Explorer
  watchman: false,
  collectCoverage: false // Enable via CLI for better performance
};