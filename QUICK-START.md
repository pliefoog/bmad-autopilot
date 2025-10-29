# Boating Instruments App - Quick Start Guide

## 🚀 First Time Setup (5 Minutes)

### Prerequisites Check
```bash
node --version    # Need v20+
npm --version
git --version
```

### iOS Setup (macOS only)
```bash
cd boatingInstrumentsApp

# 1. Install dependencies
npm install

# 2. Install iOS dependencies
cd ios
bundle install
bundle exec pod install
cd ..

# 3. Start Metro and run iOS
npm start &
npm run ios
```

**Time:** ~5-7 minutes for first build

### Android Setup
```bash
cd boatingInstrumentsApp

# 1. Install dependencies
npm install

# 2. Start Android emulator (from Android Studio or CLI)
emulator -avd Pixel_5_API_34 &

# 3. Start Metro and run Android
npm start &
npm run android
```

**Time:** ~7-10 minutes for first build

---

## ⚡ Daily Development Workflow

### Start Development
```bash
# Terminal 1: Metro Bundler (keep running)
npm start

# Terminal 2: Run platform
npm run ios          # iOS
npm run android      # Android
```

### Quick Commands
```bash
# Test changes
npm test

# Reload app
# iOS: Press 'r' in Metro or Cmd+R in simulator
# Android: Press 'r' in Metro or double-tap R in app

# Clear cache (if issues)
npm start -- --reset-cache
```

---

## 🧪 Testing Cheat Sheet

### Run Tests
```bash
npm test                      # All tests
npm test -- --watch          # Watch mode
npm test -- Widget.test      # Specific test
npm run test:integration     # Integration tests
npm test -- --coverage       # With coverage report
```

### Common Test Commands
```bash
# Fast CI checks
npm run test:ci-fast

# Connection tests
npm run test:integration:connection

# Stress tests
npm run test:integration:malformed

# Widget tests
npm test -- DepthWidget.test.tsx
npm test -- AutopilotStatusWidget.test.tsx
```

---

## 🔧 Troubleshooting

### Metro Issues
```bash
# Port already in use
lsof -ti:8081 | xargs kill -9
npm start

# Module resolution issues
npm start -- --reset-cache
watchman watch-del-all
```

### iOS Issues
```bash
# Pod issues
cd ios
bundle exec pod install --repo-update
cd ..

# Clean build
cd ios && xcodebuild clean && cd ..
npm run ios
```

### Android Issues
```bash
# Check devices
adb devices

# Clear app data
adb shell pm clear com.boatinginstrumentsapp

# Restart ADB
adb kill-server
adb start-server
```

### Build Issues
```bash
# Nuclear option (clean everything)
rm -rf node_modules
rm -rf ios/Pods
rm -rf android/app/build
npm install
cd ios && bundle exec pod install && cd ..
```

---

## 📱 Testing Without Boat (Development Modes)

### Playback Mode
```bash
# Run NMEA playback benchmark
npm run dev:bench -- ../marine-assets/sample-data/high_density.nmea 500 5

# Or use in-app:
# Settings → Playback Mode → Select file → Start
```

### Mock Server
```bash
# Run mock NMEA server test
npm run dev:mock
```

### Demo Mode
```bash
# Launch app → Skip setup wizard → See synthetic data
```

---

## 📊 Test Coverage

**Current Status:**
- Target: ≥70% coverage (NFR18)
- Core modules should be 80%+

**Check Coverage:**
```bash
npm test -- --coverage
open coverage/lcov-report/index.html
```

---

## 🎯 Platform-Specific Notes

### iOS Simulator Shortcuts
- **Reload:** Cmd + R
- **Dev Menu:** Cmd + D
- **Toggle Inspector:** Cmd + I
- **Shake Device:** Cmd + Ctrl + Z

### Android Emulator Shortcuts
- **Reload:** Double-tap R
- **Dev Menu:** Cmd/Ctrl + M
- **Toggle Inspector:** Cmd/Ctrl + I

---

## 📚 Key Files

```
boatingInstrumentsApp/
├── src/                    # Source code
│   ├── components/         # UI components
│   ├── widgets/            # Marine widgets
│   ├── services/           # NMEA, storage, playback
│   ├── store/              # Zustand stores
│   └── hooks/              # Custom React hooks
│
├── __tests__/              # Test files
│   ├── integration/        # Integration tests
│   ├── services/           # Service tests
│   └── *.test.tsx          # Widget/component tests
│
├── ios/                    # iOS native code
├── android/                # Android native code
│
├── package.json            # Dependencies & scripts
├── jest.config.js          # Test configuration
└── README.md               # React Native getting started
```

---

## 🌐 Development Targets

### Supported Platforms
- **iOS:** 15+ (iPhone/iPad)
- **Android:** 10+ (API 29+)
- **Windows:** 10/11 (Phase 1.5)
- **macOS:** 11+ (Phase 1.5)

### Test Devices
- **iOS:** iPhone 15 Simulator (default)
- **Android:** Pixel 5 API 34 Emulator (recommended)
- **Physical:** Connect via USB, ensure dev mode enabled

---

## ⚙️ Environment Setup

### Required
- Node.js 20+
- npm
- Git
- Watchman (recommended)

### iOS (macOS only)
- Xcode 14+
- CocoaPods
- iOS Simulator

### Android
- Android Studio
- Android SDK 34
- Android Emulator
- Environment variables:
  ```bash
  export ANDROID_HOME=$HOME/Library/Android/sdk
  export PATH=$PATH:$ANDROID_HOME/platform-tools
  ```

---

## 🆘 Need More Help?

**Detailed Documentation:**
- Full Setup Guide: `SETUP-AND-TESTING.md`
- Architecture: `docs/architecture.md`
- PRD: `docs/prd.md`
- Testing Details: `README-testing.md`

**Online Resources:**
- [React Native Docs](https://reactnative.dev/docs/getting-started)
- [Jest Docs](https://jestjs.io/docs/getting-started)

**Debugging:**
```bash
# View logs
npx react-native log-ios      # iOS
npx react-native log-android   # Android
npm start -- --verbose         # Metro verbose
```

---

## ✅ Pre-Commit Checklist

Before committing code:

```bash
# 1. Run all tests
npm test

# 2. Check coverage (should be ≥70%)
npm test -- --coverage

# 3. Lint code (optional)
npm run lint

# 4. Verify builds
npm run ios      # Test iOS build
npm run android  # Test Android build
```

---

**Quick Start Version:** 1.0
**Last Updated:** 2025-10-12
**For:** Boating Instruments App MVP
