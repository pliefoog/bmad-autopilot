// Mock AsyncStorage for web
const storage = {};

const AsyncStorage = {
  setItem: async (key, value) => {
    console.log('[Web Mock AsyncStorage] setItem:', key);
    storage[key] = value;
    return Promise.resolve();
  },
  getItem: async (key) => {
    console.log('[Web Mock AsyncStorage] getItem:', key);
    return Promise.resolve(storage[key] || null);
  },
  removeItem: async (key) => {
    console.log('[Web Mock AsyncStorage] removeItem:', key);
    delete storage[key];
    return Promise.resolve();
  },
  clear: async () => {
    console.log('[Web Mock AsyncStorage] clear');
    Object.keys(storage).forEach(key => delete storage[key]);
    return Promise.resolve();
  },
  getAllKeys: async () => {
    return Promise.resolve(Object.keys(storage));
  },
  multiGet: async (keys) => {
    return Promise.resolve(keys.map(key => [key, storage[key] || null]));
  },
  multiSet: async (keyValuePairs) => {
    keyValuePairs.forEach(([key, value]) => {
      storage[key] = value;
    });
    return Promise.resolve();
  },
};

export default AsyncStorage;
