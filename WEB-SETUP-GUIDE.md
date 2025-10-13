# Running Boating Instruments App in Web Browser

## Quick Setup

You can run the React Native app in a web browser for quick UI validation. This is useful for:
- 🎨 Rapidly testing UI layouts and styling
- 🔍 Inspecting components with browser DevTools
- 🚀 Faster development iteration (no iOS/Android rebuilds)
- 📱 Testing responsive layouts across screen sizes

**Important Limitations:**
- ⚠️ Native modules won't work (TCP sockets, file system, etc.)
- ⚠️ NMEA connection features will be mocked
- ⚠️ Some React Native APIs behave differently on web
- ✅ Perfect for UI/layout validation and widget visual testing

---

## Option 1: Quick Web Setup (Recommended for UI Validation)

### Step 1: Install Dependencies

```bash
cd boatingInstrumentsApp

# Install react-native-web and webpack dependencies
npm install --save-dev \
  react-native-web \
  react-dom \
  webpack \
  webpack-cli \
  webpack-dev-server \
  html-webpack-plugin \
  babel-loader \
  @babel/preset-react \
  style-loader \
  css-loader \
  url-loader \
  file-loader
```

### Step 2: Create Web Entry Point

Create `web/index.html`:
```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Boating Instruments App - Web Preview</title>
    <style>
        body {
            margin: 0;
            padding: 0;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        }
        #root {
            height: 100vh;
            width: 100vw;
        }
    </style>
</head>
<body>
    <div id="root"></div>
</body>
</html>
```

Create `web/index.js`:
```javascript
import { AppRegistry } from 'react-native';
import App from '../App';
import { name as appName } from '../app.json';

// Register the app
AppRegistry.registerComponent(appName, () => App);

// Run the app
AppRegistry.runApplication(appName, {
  rootTag: document.getElementById('root'),
});
```

### Step 3: Create Webpack Configuration

Create `webpack.config.js` in the boatingInstrumentsApp directory:

```javascript
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
  },
  module: {
    rules: [
      {
        test: /\.(js|jsx|ts|tsx)$/,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader',
          options: {
            presets: [
              '@babel/preset-react',
              '@babel/preset-typescript',
              ['@babel/preset-env', { targets: { browsers: ['last 2 versions'] } }],
            ],
            plugins: ['react-native-web'],
          },
        },
      },
      {
        test: /\.css$/,
        use: ['style-loader', 'css-loader'],
      },
      {
        test: /\.(png|jpg|gif|svg)$/,
        use: ['url-loader'],
      },
    ],
  },
  resolve: {
    alias: {
      'react-native$': 'react-native-web',
      'react-native-svg': 'react-native-svg-web',
      '@react-native-async-storage/async-storage': require.resolve('./__mocks__/AsyncStorage.js'),
      'react-native-tcp-socket': require.resolve('./__mocks__/TcpSocket.js'),
      'react-native-udp': require.resolve('./__mocks__/UdpSocket.js'),
      'react-native-fs': require.resolve('./__mocks__/FileSystem.js'),
    },
    extensions: ['.web.tsx', '.web.ts', '.web.jsx', '.web.js', '.tsx', '.ts', '.jsx', '.js'],
  },
  plugins: [
    new HtmlWebpackPlugin({
      template: './web/index.html',
    }),
  ],
};
```

### Step 4: Create Mock Files for Native Modules

Create `__mocks__/AsyncStorage.js`:
```javascript
// Mock AsyncStorage for web
const storage = {};

export default {
  setItem: async (key, value) => {
    storage[key] = value;
    return Promise.resolve();
  },
  getItem: async (key) => {
    return Promise.resolve(storage[key] || null);
  },
  removeItem: async (key) => {
    delete storage[key];
    return Promise.resolve();
  },
  clear: async () => {
    Object.keys(storage).forEach(key => delete storage[key]);
    return Promise.resolve();
  },
};
```

Create `__mocks__/TcpSocket.js`:
```javascript
// Mock TCP Socket for web
export const createConnection = (options, connectListener) => {
  console.log('[Web Mock] TCP connection attempted to:', options);

  const mockSocket = {
    on: (event, listener) => {
      console.log('[Web Mock] Socket event listener added:', event);
      if (event === 'connect' && connectListener) {
        setTimeout(() => listener(), 100);
      }
    },
    write: (data) => {
      console.log('[Web Mock] Socket write:', data);
    },
    destroy: () => {
      console.log('[Web Mock] Socket destroyed');
    },
  };

  if (connectListener) {
    setTimeout(() => connectListener(), 100);
  }

  return mockSocket;
};
```

Create `__mocks__/UdpSocket.js`:
```javascript
// Mock UDP Socket for web
export const createSocket = (type) => {
  console.log('[Web Mock] UDP socket created:', type);

  return {
    bind: (port) => {
      console.log('[Web Mock] UDP socket bound to port:', port);
    },
    send: (data, port, address) => {
      console.log('[Web Mock] UDP send to:', address, port);
    },
    close: () => {
      console.log('[Web Mock] UDP socket closed');
    },
  };
};
```

Create `__mocks__/FileSystem.js`:
```javascript
// Mock File System for web
export default {
  readFile: async (path) => {
    console.log('[Web Mock] Read file:', path);
    return Promise.resolve('');
  },
  writeFile: async (path, content) => {
    console.log('[Web Mock] Write file:', path);
    return Promise.resolve();
  },
  exists: async (path) => {
    console.log('[Web Mock] Check file exists:', path);
    return Promise.resolve(true);
  },
};
```

### Step 5: Add Web Script to package.json

Add this to the "scripts" section in `package.json`:

```json
{
  "scripts": {
    "web": "webpack serve --config webpack.config.js",
    "web:build": "webpack --config webpack.config.js --mode production"
  }
}
```

### Step 6: Run the Web App

```bash
npm run web
```

The app will open in your browser at `http://localhost:3000`

---

## Option 2: Using Expo (Easier but Requires Migration)

If you want full web support with less configuration, you can migrate to Expo:

### Step 1: Install Expo CLI

```bash
npm install -g @expo/cli
```

### Step 2: Create Expo Config

Create `app.json` (if not exists) or update it:

```json
{
  "expo": {
    "name": "Boating Instruments App",
    "slug": "boating-instruments-app",
    "version": "0.0.1",
    "platforms": ["ios", "android", "web"],
    "web": {
      "bundler": "metro"
    }
  }
}
```

### Step 3: Run Expo Web

```bash
npx expo start --web
```

**Note:** This requires some code adjustments to be Expo-compatible.

---

## Option 3: Storybook for Component Testing (Best for Widget Development)

For isolated widget testing, Storybook is excellent:

### Step 1: Install Storybook

```bash
npx sb init --type react_native
```

### Step 2: Run Storybook Web

```bash
npm run storybook:web
```

This gives you a component playground where you can test widgets in isolation.

---

## What Works in Web Mode

✅ **UI Components:**
- All widget layouts and styling
- Theme switching (Day/Night/Red-Night)
- Touch interactions (buttons, drag-drop with mouse)
- Responsive layouts
- SVG graphics (compass, gauges)
- Animations (React Native Reanimated has web support)

✅ **State Management:**
- Zustand stores work perfectly
- Mock NMEA data can be injected
- Widget configuration and layout

✅ **Visual Testing:**
- Widget appearance
- Color schemes
- Typography
- Spacing and alignment
- Responsive behavior

## What Doesn't Work

❌ **Native Features:**
- TCP/UDP sockets (use mocks)
- File system access (use mocks)
- Native modules (Sentry, etc.)
- Platform-specific APIs

❌ **Real Boat Connection:**
- Cannot connect to WiFi bridge from browser
- Use mock data or playback mode

---

## Development Workflow for Web

### 1. Start Web Server

```bash
npm run web
```

### 2. Test Widgets with Mock Data

Update your stores to inject mock NMEA data:

```typescript
// In your web entry point or App.tsx
if (process.env.NODE_ENV !== 'production' && typeof window !== 'undefined') {
  // Inject mock data for web testing
  const mockNMEAData = {
    depth: 12.4,
    speedOverGround: 5.2,
    apparentWindAngle: 45,
    apparentWindSpeed: 12.5,
    // ... more mock data
  };

  useNMEAStore.getState().updateDepth(12.4, 'feet');
  useNMEAStore.getState().updateSpeed(5.2, 4.8, 'knots');
  // ... etc
}
```

### 3. Hot Reload

Webpack dev server supports hot reload - just save your files and see changes instantly.

### 4. Browser DevTools

Use Chrome/Firefox DevTools for:
- Inspecting component structure
- Debugging styles
- Testing responsive layouts (device emulation)
- Performance profiling
- Network inspection (for future API calls)

---

## Testing Responsive Layouts

### Desktop View (27" monitor)
```
http://localhost:3000
```
Resize browser window to 2560x1440

### Tablet View (iPad)
Open DevTools → Toggle Device Toolbar → Select "iPad Pro"

### Phone View (iPhone)
Open DevTools → Toggle Device Toolbar → Select "iPhone 15"

---

## Troubleshooting Web Mode

### "Module not found" errors

```bash
# Make sure all web dependencies are installed
npm install react-native-web react-dom
```

### SVG not rendering

```bash
# Install react-native-svg-web
npm install react-native-svg-web
```

### Styles look different

React Native Web has some differences in styling. Check the [compatibility guide](https://necolas.github.io/react-native-web/docs/compatibility/).

### Hot reload not working

```bash
# Restart webpack dev server
npm run web
```

---

## Benefits of Web Development Mode

1. **Faster Iteration**
   - No iOS/Android rebuild wait times
   - Instant hot reload
   - Sub-second changes

2. **Better Debugging**
   - Full browser DevTools
   - React DevTools extension
   - Console logging
   - Network tab

3. **Easy Screenshot/Recording**
   - Browser screenshot tools
   - Video recording for demos
   - Pixel-perfect design validation

4. **Responsive Testing**
   - Test all screen sizes instantly
   - Device emulation
   - No need for multiple physical devices

---

## Next Steps

After validating UI in the browser:

1. **Test on iOS Simulator/Android Emulator** for native behavior
2. **Test on Physical Devices** for real performance
3. **Test with Real NMEA Data** using playback mode or boat connection

---

## Production Web Build (Future Phase)

For deploying a web version of the app:

```bash
npm run web:build
```

Outputs to `web-build/` directory, ready to deploy to:
- Netlify
- Vercel
- GitHub Pages
- AWS S3 + CloudFront

---

**Quick Start Command:**
```bash
# From boatingInstrumentsApp directory
npm run web
```

**Browser will open at:** `http://localhost:3000`

---

**Document Version:** 1.0
**Last Updated:** 2025-10-12
**Purpose:** UI validation and rapid development
