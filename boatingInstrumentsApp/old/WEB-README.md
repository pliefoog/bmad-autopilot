# Running the App in Web Browser

## Quick Start

### 1. Install Web Dependencies

```bash
# Run the install script
./INSTALL-WEB.sh

# Or manually install
npm install --save-dev react-native-web react-dom webpack webpack-cli webpack-dev-server html-webpack-plugin babel-loader @babel/preset-react @babel/plugin-proposal-class-properties @babel/plugin-transform-runtime style-loader css-loader react-native-svg-web
```

### 2. Start the Web Server

```bash
npm run web
```

The app will automatically open in your browser at `http://localhost:3000`

---

## What Works in Web Mode ✅

- **UI Components:** All widgets, layouts, styling
- **State Management:** Zustand stores work perfectly
- **Themes:** Day/Night/Red-Night modes
- **Widgets:** Visual rendering and layout
- **Drag & Drop:** Mouse-based widget positioning
- **Animations:** React Native Reanimated has web support
- **SVG Graphics:** Compass roses, gauges

## What Doesn't Work ❌

- **NMEA Connection:** TCP/UDP sockets are mocked (console logs only)
- **File System:** File operations are mocked
- **Native Modules:** Sentry and other native libraries
- **Real Boat Data:** Use mock data or playback mode

---

## Development Workflow

### Hot Reload
Save any file and the browser will automatically refresh with your changes.

### Browser DevTools
- **Inspect Elements:** Right-click → Inspect
- **Console Logs:** Check for NMEA mock logs
- **Responsive Design:** Toggle device toolbar (Cmd/Ctrl + Shift + M)
- **React DevTools:** Install browser extension for component inspection

### Testing Different Screen Sizes

**Desktop (27" monitor):**
- Resize browser window to 2560x1440

**Tablet (iPad Pro):**
- Open DevTools → Device Toolbar → iPad Pro

**Phone (iPhone 15):**
- Open DevTools → Device Toolbar → iPhone 15

---

## Mock Data for Testing

The web mocks will log all native module calls to the console:

```
[Web Mock TCP] Connection attempted: {host: "192.168.1.10", port: 10110}
[Web Mock AsyncStorage] setItem: widgetLayout
[Web Mock FS] Read file: /mock/documents/nmea-recording.nmea
```

To inject NMEA data for testing, modify your stores or components:

```typescript
// In App.tsx or widget component
useEffect(() => {
  if (typeof window !== 'undefined') {
    // Inject mock NMEA data
    useNMEAStore.getState().updateDepth(12.4, 'feet');
    useNMEAStore.getState().updateSpeed(5.2, 4.8, 'knots');
    useNMEAStore.getState().updateWind(45, 12.5, 38, 10.2);
  }
}, []);
```

---

## Debugging Tips

### Console is Full of Mock Logs
The mocks are verbose for debugging. To reduce noise:
1. Open DevTools Console
2. Use filter: `-[Web Mock]` to hide mock messages

### Styles Look Different
React Native Web has some styling differences. Check:
- FlexBox properties
- Shadow properties (may need web-specific styles)
- Font rendering

### Hot Reload Not Working
```bash
# Stop the server (Ctrl+C)
# Clear webpack cache
rm -rf web-build node_modules/.cache
# Restart
npm run web
```

---

## Building for Production

```bash
npm run web:build
```

Output will be in `web-build/` directory. Can be deployed to:
- Netlify
- Vercel
- GitHub Pages
- AWS S3 + CloudFront

---

## Files Created for Web Support

```
boatingInstrumentsApp/
├── web/
│   ├── index.html          # HTML template
│   └── index.js            # Web entry point
├── __mocks__/
│   ├── AsyncStorage.js     # Mock local storage
│   ├── TcpSocket.js        # Mock TCP sockets
│   ├── UdpSocket.js        # Mock UDP sockets
│   └── FileSystem.js       # Mock file operations
├── webpack.config.js       # Webpack configuration
└── WEB-README.md          # This file
```

---

## Troubleshooting

### "Module not found: react-native-web"
```bash
./INSTALL-WEB.sh
```

### "Cannot resolve 'react-native-svg-web'"
```bash
npm install react-native-svg-web
```

### Port 3000 already in use
```bash
# Change port in webpack.config.js
devServer: {
  port: 3001,  // Change this
  ...
}
```

### Build errors with TypeScript
```bash
# Make sure babel-loader is configured correctly
npm install --save-dev @babel/preset-typescript
```

---

## Benefits of Web Development

1. **⚡ Instant Feedback:** No compile time, instant hot reload
2. **🔍 Better Debugging:** Full browser DevTools
3. **📸 Easy Screenshots:** Built-in browser screenshot tools
4. **🎨 Design Validation:** Perfect for UI/UX iteration
5. **🚀 Faster Demos:** Share via URL instead of device handoff

---

## When to Use Each Platform

**Web Browser:**
- UI layout and styling
- Widget appearance
- Theme testing
- Responsive design
- Quick iterations

**iOS/Android Simulator:**
- Native module testing
- Performance testing
- Platform-specific behavior
- Gesture handling

**Physical Device:**
- Real performance testing
- Actual NMEA connection
- Battery life testing
- Production validation

---

## Next Steps

After validating UI in the browser:

1. Test on iOS Simulator: `npm run ios`
2. Test on Android Emulator: `npm run android`
3. Test with real NMEA data via Playback Mode
4. Test on physical device for production validation

---

**Quick Commands:**

```bash
# Start web development
npm run web

# Build for production
npm run web:build

# Clean build
rm -rf web-build node_modules/.cache && npm run web
```

---

**Need Help?**

See full documentation: `../WEB-SETUP-GUIDE.md`
