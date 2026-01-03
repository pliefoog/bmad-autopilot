module.exports = {
  dependencies: {
    'react-native-vector-icons': {
      platforms: {
        ios: null,
      },
    },
    'react-native-tcp-socket': {
      platforms: {
        android: {
          sourceDir: '../node_modules/react-native-tcp-socket/android',
          packageImportPath: 'import com.asterinet.react.tcpsocket.TcpSocketPackage;',
        },
        ios: {
          podspecPath: '../node_modules/react-native-tcp-socket/react-native-tcp-socket.podspec',
        },
      },
    },
    'react-native-udp': {
      platforms: {
        android: {
          sourceDir: '../node_modules/react-native-udp/android',
        },
        ios: {
          podspecPath: '../node_modules/react-native-udp/react-native-udp.podspec',
        },
      },
    },
  },
  assets: ['./src/assets/fonts/'],
};
