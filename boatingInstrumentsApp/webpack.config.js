const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');

module.exports = {
  entry: './web/index.js',
  output: {
    path: path.resolve(__dirname, 'web-build'),
    filename: 'bundle.js',
  },
  mode: 'development',
  devtool: 'source-map',
  devServer: {
    port: 3000,
    hot: true,
    open: true,
    historyApiFallback: true,
    static: {
      directory: path.join(__dirname, 'web'),
    },
  },
  module: {
    rules: [
      {
        test: /\.(js|jsx|ts|tsx)$/,
        exclude: /node_modules\/(?!(react-native.*|@react-native.*|zustand)\/).*/,
        use: {
          loader: 'babel-loader',
          options: {
            presets: [
              '@react-native/babel-preset',
              '@babel/preset-typescript',
            ],
          },
        },
      },
      {
        test: /\.css$/,
        use: ['style-loader', 'css-loader'],
      },
      {
        test: /\.(png|jpg|gif|svg)$/,
        type: 'asset/resource',
      },
      {
        test: /\.(woff|woff2|eot|ttf|otf)$/,
        type: 'asset/resource',
      },
    ],
  },
  resolve: {
    alias: {
      'react-native$': 'react-native-web',
      'react-native-svg': 'react-native-svg-web',
      '@react-native-async-storage/async-storage': path.resolve(__dirname, '__mocks__/AsyncStorage.js'),
      'react-native-tcp-socket': path.resolve(__dirname, '__mocks__/TcpSocket.js'),
      'react-native-udp': path.resolve(__dirname, '__mocks__/UdpSocket.js'),
      'react-native-fs': path.resolve(__dirname, '__mocks__/FileSystem.js'),
      '@': path.resolve(__dirname, 'src'),
      '@core': path.resolve(__dirname, 'src/core'),
      '@mobile': path.resolve(__dirname, 'src/mobile'),
      '@desktop': path.resolve(__dirname, 'src/desktop'),
      '@widgets': path.resolve(__dirname, 'src/widgets'),
      '@services': path.resolve(__dirname, 'src/services'),
      '@utils': path.resolve(__dirname, 'src/utils'),
    },
    extensions: ['.web.tsx', '.web.ts', '.web.jsx', '.web.js', '.tsx', '.ts', '.jsx', '.js', '.json'],
    fallback: {
      crypto: false,
      stream: false,
      buffer: false,
      fs: false,
      path: false,
      net: false,
      tls: false,
      dgram: false,
    },
  },
  plugins: [
    new HtmlWebpackPlugin({
      template: './web/index.html',
      title: 'Boating Instruments App - Web Preview',
    }),
  ],
};
