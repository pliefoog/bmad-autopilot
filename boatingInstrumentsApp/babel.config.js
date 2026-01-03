module.exports = function (api) {
  api.cache(true);

  const config = {
    presets: [
      [
        'babel-preset-expo',
        {
          jsxRuntime: 'automatic',
          web: {
            // Disable hermes transform which might be causing issues
            unstable_transformProfile: undefined,
          },
        },
      ],
    ],
    plugins: [
      [
        'module-resolver',
        {
          root: ['./src'],
          alias: {
            '@': './src',
            '@core': './src/core',
            '@mobile': './src/mobile',
            '@desktop': './src/desktop',
            '@widgets': './src/widgets',
            '@services': './src/services',
            '@utils': './src/utils',
            // Web compatibility: Mock native modules
            'react-native-sound': './__mocks__/Sound.js',
            'react-native-vector-icons/Ionicons': './__mocks__/Ionicons.js',
          },
        },
      ],
      // Reanimated plugin MUST be last in plugins array
      'react-native-reanimated/plugin',
    ],
    env: {
      test: {
        plugins: ['@babel/plugin-transform-modules-commonjs'],
      },
      web: {
        presets: [
          [
            '@babel/preset-env',
            {
              targets: {
                browsers: ['last 2 versions', 'ie >= 11'],
              },
              modules: 'commonjs', // Force CommonJS to avoid ESM issues
            },
          ],
        ],
        plugins: [
          // Transform import.meta for web builds
          'babel-plugin-transform-import-meta',
          // Transform modules to CommonJS for better compatibility
          '@babel/plugin-transform-modules-commonjs',
        ],
      },
    },
  };

  return config;
};
