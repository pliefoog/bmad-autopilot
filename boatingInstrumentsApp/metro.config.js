const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

/**
 * Metro configuration for Expo Router and path aliases
 * https://reactnative.dev/docs/metro
 * https://docs.expo.dev/router/installation/
 *
 * @type {import('expo/metro-config').MetroConfig}
 */
const config = getDefaultConfig(__dirname);

// Configure Expo Router entry point resolution
config.resolver.resolveRequest = (context, moduleName, platform) => {
  // Redirect expo/AppEntry.js to look for our index.js instead of App
  if (moduleName === '../../App' && context.originModulePath.includes('expo/AppEntry')) {
    return context.resolveRequest(context, '../../index', platform);
  }

  // Use default resolution for all other modules
  return context.resolveRequest(context, moduleName, platform);
};

// Configure path aliases for clean imports
config.resolver.alias = {
  '@': path.resolve(__dirname, 'src'),
  '@components': path.resolve(__dirname, 'src/components'),
  '@hooks': path.resolve(__dirname, 'src/hooks'),
  '@stores': path.resolve(__dirname, 'src/stores'),
  '@services': path.resolve(__dirname, 'src/services'),
  '@types': path.resolve(__dirname, 'src/types'),
  '@theme': path.resolve(__dirname, 'src/theme'),
  '@utils': path.resolve(__dirname, 'src/utils'),
  '@widgets': path.resolve(__dirname, 'src/widgets'),

  // Web compatibility: Mock native modules that don't work in web environment
  'react-native-sound': path.resolve(__dirname, '__mocks__/Sound.js'),
  'react-native-vector-icons/Ionicons': path.resolve(__dirname, '__mocks__/Ionicons.js'),
};

// Configure for web compatibility
config.resolver.platforms = ['native', 'web', 'ios', 'android'];

// Configure transformer to handle ESM and import.meta for web builds
config.transformer = {
  ...config.transformer,
  unstable_allowRequireContext: true,
  // Disable Hermes for web - it doesn't support import.meta
  hermesParser: false,
  // Force all modules to be transformed through Babel
  getTransformOptions: async (entryPoints, options, getDependenciesOf) => {
    const platform = options.platform;
    return {
      transform: {
        experimentalImportSupport: false,
        inlineRequires: true, // MEMORY OPTIMIZATION: Reduce bundle size
        // Disable Hermes transform for web
        ...(platform === 'web' && {
          unstable_transformProfile: 'default',
        }),
      },
    };
  },
};

// MEMORY OPTIMIZATION: Limit concurrent worker processes to reduce memory usage
config.maxWorkers = 2; // Instead of default (all CPU cores)

// MEMORY OPTIMIZATION: Configure file-based cache
const FileStore = require('metro-cache').FileStore;
config.cacheStores = [
  new FileStore({
    root: require('path').join(__dirname, '.metro-cache'),
  }),
];

module.exports = config;
