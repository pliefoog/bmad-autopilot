# Development Workflow

## Local Development Setup

**Prerequisites:**
```bash
# Install Node.js 18+ and npm
node --version  # Should be 18+
npm --version

# Install Expo CLI globally
npm install -g expo-cli eas-cli
```

**Install Debugging Tools:**

1. **Redux DevTools Extension** (for Zustand DevTools):
   - **Chrome:** https://chrome.google.com/webstore/detail/redux-devtools/lmhkpmbekcpmknklioeibfkpmmfibljd
   - **Firefox:** https://addons.mozilla.org/firefox/addon/reduxdevtools/
   - **Edge:** Uses Chrome Web Store (same link as Chrome)

2. **Verification:**
   - Open browser DevTools (`F12` or `Cmd+Option+I`)
   - Look for **Redux** tab
   - Should show 9 stores: NMEA Store, Widget Store, Theme Store, Settings Store, Alarm Store, Toast Store, Sensor Config Store, Connection Store, Feature Flag Store

3. **Usage:**
   - See comprehensive guide: `docs/DEBUGGING-TOOLS-GUIDE.md`
   - Time-travel debugging, state inspection, action filtering
   - Zero performance impact when not open

**Initial Setup:**
```bash
# Clone repository
git clone <repository-url>
cd boating-instruments

# Install dependencies
npm install

# Install iOS dependencies (macOS only)
cd ios && pod install && cd ..

# Start development server
npx expo start
```

**Development Commands:**
```bash
# Start all services
npx expo start

# Start for specific platform
npx expo start --ios
npx expo start --android
npx expo start --web

# Run tests
npm test

# Run tests in watch mode
npm test -- --watch

# Type check
npx tsc --noEmit

# Lint
npm run lint

# Format code
npm run format
```

## Environment Configuration

**Required Environment Variables:**

Create `.env` file in project root:

```bash
# WiFi Bridge Configuration (Development)
NMEA_BRIDGE_HOST=192.168.1.10
NMEA_BRIDGE_PORT=10110

# Playback Mode (for testing without boat)
ENABLE_PLAYBACK_MODE=true
SAMPLE_NMEA_FILE=./assets/sample-nmea.log

# Feature Flags
ENABLE_AUTOPILOT_CONTROL=true
ENABLE_MULTI_ENGINE_SUPPORT=true

# Logging
LOG_LEVEL=debug  # Options: debug, info, warn, error

# Sentry (Production)
SENTRY_DSN=<your-sentry-dsn>
```

**Access in Code:**
```typescript
import Constants from 'expo-constants';

const config = {
  nmeaBridgeHost: Constants.expoConfig?.extra?.nmeaBridgeHost || '192.168.1.1',
  nmeaBridgePort: Constants.expoConfig?.extra?.nmeaBridgePort || 10110,
  enablePlaybackMode: Constants.expoConfig?.extra?.enablePlaybackMode || false,
};
```

---
