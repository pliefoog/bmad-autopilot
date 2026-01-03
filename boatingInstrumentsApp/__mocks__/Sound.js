// Mock implementation of react-native-sound for web compatibility

class MockSound {
  static setCategory = () => {};
  static MAIN_BUNDLE = 'MAIN_BUNDLE';

  constructor(filename, basePath, callback) {
    console.log('[Web Mock Sound] Created sound:', filename);
    if (callback) {
      setTimeout(() => callback(null), 0);
    }
  }

  play = (callback) => {
    console.log('[Web Mock Sound] Playing sound');
    if (callback) {
      setTimeout(() => callback(true), 100);
    }
  };

  release = () => {
    console.log('[Web Mock Sound] Released sound');
  };

  setVolume = (volume) => {
    console.log('[Web Mock Sound] Set volume:', volume);
  };

  stop = (callback) => {
    console.log('[Web Mock Sound] Stopped sound');
    if (callback) {
      setTimeout(() => callback(true), 0);
    }
  };
}

export default MockSound;
