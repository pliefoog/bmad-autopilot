module.exports = {
  presets: ['module:@react-native/babel-preset'],
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
        },
      },
    ],
  ],
  env: {
    test: {
      plugins: ['@babel/plugin-transform-modules-commonjs'],
    },
  },
};
