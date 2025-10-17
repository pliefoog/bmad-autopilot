module.exports = {
  dependencies: {
    'react-native-vector-icons': {
      platforms: {
        ios: {
          sharedLibraries: ['libRNVectorIcons'],
        },
      },
    },
  },
  assets: ['./src/assets/fonts/'], // Add this if you have custom fonts
};