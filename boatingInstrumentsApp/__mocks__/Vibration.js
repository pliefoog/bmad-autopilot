// Mock for React Native Vibration API
// Used by __tests__ to avoid native module dependencies

const Vibration = {
  vibrate: jest.fn(),
  cancel: jest.fn(),
};

module.exports = Vibration;