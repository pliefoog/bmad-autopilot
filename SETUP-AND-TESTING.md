# Boating Instruments App - Setup and Testing Guide

## Table of Contents
- [Overview](#overview)
- [Prerequisites](#prerequisites)
- [Initial Setup](#initial-setup)
- [Platform-Specific Setup](#platform-specific-setup)
- [Running the Application](#running-the-application)
- [Testing Guide](#testing-guide)
- [Development Modes](#development-modes)
- [Troubleshooting](#troubleshooting)

---

## Overview

The **Boating Instruments App** is a cross-platform React Native application that transforms smartphones, tablets, and desktop devices into comprehensive marine instrument displays. The app connects to boat NMEA networks via WiFi bridges to display real-time marine data and control autopilot systems.

**Supported Platforms:**
- iOS 15+ (iPhone and iPad)
- Android 10+
- Windows 10/11 (Phase 1.5)
- macOS 11+ (Phase 1.5)

**Tech Stack:**
- React Native 0.82.0
- TypeScript 5.8+
- Zustand (state management)
- Jest + React Native Testing Library (testing)

---

## Prerequisites

### All Platforms

**Required Software:**

1. **Node.js 20+** and **npm**
   ```bash
   # Check your version
   node --version  # Should be v20.0.0 or higher
   npm --version

   # Install from: https://nodejs.org/
   ```

2. **Git**
   ```bash
   git --version
   ```

3. **Watchman** (recommended for file watching)
   ```bash
   # macOS (via Homebrew)
   brew install watchman

   # Linux
   # Follow: https://facebook.github.io/watchman/docs/install.html
   ```

### iOS Development (macOS Only)

1. **Xcode 14+** from Mac App Store
2. **Xcode Command Line Tools**
   ```bash
   xcode-select --install
   ```

3. **CocoaPods** (iOS dependency manager)
   ```bash
   # Install Ruby bundler
   gem install bundler

   # Or via Homebrew
   brew install cocoapods
   ```

4. **iOS Simulator** (included with Xcode)

### Android Development

1. **Android Studio** - Download from [developer.android.com](https://developer.android.com/studio)

2. **Android SDK** (installed via Android Studio)
   - SDK Platform 34 (Android 14)
   - SDK Build-Tools 34.0.0
   - Android SDK Platform-Tools
   - Android Emulator

3. **Environment Variables** - Add to `~/.zshrc` or `~/.bash_profile`:
   ```bash
   export ANDROID_HOME=$HOME/Library/Android/sdk
   export PATH=$PATH:$ANDROID_HOME/emulator
   export PATH=$PATH:$ANDROID_HOME/platform-tools
   ```

4. **Accept Android Licenses**
   ```bash
   $ANDROID_HOME/tools/bin/sdkmanager --licenses
   ```

---

## Initial Setup

### 1. Clone the Repository

```bash
# Clone the repository
git clone <repository-url>
cd bmad-autopilot

# Navigate to the app directory
cd boatingInstrumentsApp
```

### 2. Install Dependencies

```bash
# Install npm dependencies
npm install

# This will install:
# - React Native core dependencies
# - NMEA parsing libraries (nmea-simple, @canboat/canboatjs)
# - Networking libraries (react-native-tcp-socket, react-native-udp)
# - State management (zustand)
# - Testing framework (jest, @testing-library/react-native)
# - And more...
```

**Expected Output:**
```
added 644 packages in 45s
```

### 3. Verify Installation

```bash
# Run a smoke test to verify setup
npm test -- smoke.test
```

**Expected Output:**
```
PASS  __tests__/smoke.test.ts
  ✓ smoke test passes (2 ms)

Test Suites: 1 passed, 1 total
Tests:       1 passed, 1 total
```

---

## Platform-Specific Setup

### iOS Setup

#### Step 1: Install iOS Dependencies

```bash
# From boatingInstrumentsApp directory

# Install Ruby bundler (first time only)
bundle install

# Install CocoaPods dependencies
cd ios
bundle exec pod install
cd ..
```

**Expected Output:**
```
Analyzing dependencies
Downloading dependencies
Installing ...
Pod installation complete! 52 installed, 0 updated.
```

#### Step 2: Verify iOS Simulator

```bash
# List available iOS simulators
xcrun simctl list devices available

# Look for something like:
# iPhone 15 (UUID) (Booted)
# iPhone 15 Pro Max (UUID) (Shutdown)
```

#### Step 3: Common iOS Issues

**Issue: "Command PhaseScriptExecution failed"**
```bash
# Clean build folder
cd ios
xcodebuild clean
cd ..

# Re-install pods
cd ios
bundle exec pod install --repo-update
cd ..
```

**Issue: "No bundle URL present"**
```bash
# Make sure Metro is running
npm start

# In another terminal
npm run ios
```

### Android Setup

#### Step 1: Create Android Emulator (if not exists)

```bash
# Open Android Studio
# Tools → Device Manager → Create Device
# Select: Pixel 5 or similar
# System Image: API 34 (Android 14)
```

Or via command line:
```bash
# List available system images
$ANDROID_HOME/tools/bin/sdkmanager --list | grep system-images

# Install system image
$ANDROID_HOME/tools/bin/sdkmanager "system-images;android-34;google_apis;arm64-v8a"

# Create AVD
$ANDROID_HOME/tools/bin/avdmanager create avd \
  -n Pixel_5_API_34 \
  -k "system-images;android-34;google_apis;arm64-v8a" \
  -d pixel_5
```

#### Step 2: Start Android Emulator

```bash
# List available emulators
emulator -list-avds

# Start specific emulator
emulator -avd Pixel_5_API_34

# Or: Use Android Studio → Device Manager → Launch
```

#### Step 3: Verify ADB Connection

```bash
# Check connected devices
adb devices

# Expected output:
# List of devices attached
# emulator-5554    device
```

#### Step 4: Common Android Issues

**Issue: "SDK location not found"**
```bash
# Create local.properties file
echo "sdk.dir=$ANDROID_HOME" > android/local.properties
```

**Issue: "Gradle build failed"**
```bash
# Clean Gradle cache
cd android
./gradlew clean
cd ..

# Clear build cache
rm -rf android/app/build
```

**Issue: "Unable to load script"**
```bash
# Reset Metro cache
npm start -- --reset-cache

# In another terminal
npm run android
```

---

## Running the Application

### Development Workflow

#### 1. Start Metro Bundler (JavaScript Build Tool)

```bash
# From boatingInstrumentsApp directory
npm start

# Or with cache reset (if you encounter stale issues)
npm start -- --reset-cache
```

**Metro will show:**
```
 BUNDLE  [ios, dev] ./index.js ░░░░░░░░░░░░░░░░ 0.0% (0/1)

Metro waiting on exp://192.168.1.10:8081

› Press a │ open Android
› Press i │ open iOS simulator
› Press r │ reload app
› Press m │ toggle menu
```

**Keep Metro running** - It acts as the development server that serves your JavaScript bundle.

#### 2. Run on iOS

In a **new terminal window/tab**:

```bash
# Run on iOS Simulator (default: iPhone 15)
npm run ios

# Run on specific simulator
npm run ios -- --simulator="iPhone 15 Pro Max"

# Run on physical device (requires Apple Developer account)
npm run ios -- --device

# Run specific build configuration
npm run ios -- --configuration Release
```

**First Launch:** May take 2-5 minutes to compile native modules.

**Successful Launch:**
```
info Found Xcode workspace "boatingInstrumentsApp.xcworkspace"
info Building (using "xcodebuild -workspace boatingInstrumentsApp.xcworkspace ...")
success Successfully built the app
info Launching "org.reactjs.native.example.boatingInstrumentsApp"
success Successfully launched the app on the simulator
```

#### 3. Run on Android

In a **new terminal window/tab** (Metro must be running):

```bash
# Run on connected Android device/emulator
npm run android

# Run on specific device
npm run android -- --deviceId=emulator-5554

# Run release build
npm run android -- --variant=release

# Install without running
npm run android -- --no-packager
```

**First Launch:** May take 3-7 minutes to download Gradle dependencies and compile.

**Successful Launch:**
```
info Starting JS server...
info Installing the app...
info Launching the app on emulator-5554...
info Successfully installed the app
```

### Physical Device Testing

#### iOS Physical Device

**Prerequisites:**
- Apple Developer Account ($99/year or free developer account)
- Device connected via USB
- Trust computer on device

**Steps:**

1. Open `ios/boatingInstrumentsApp.xcworkspace` in Xcode
2. Select your device from the device dropdown
3. Go to Signing & Capabilities → Team → Select your team
4. Product → Run (⌘R)

Or via CLI:
```bash
npm run ios -- --device="Your Device Name"
```

#### Android Physical Device

**Prerequisites:**
- Enable Developer Options on device:
  - Settings → About Phone → Tap "Build Number" 7 times
- Enable USB Debugging:
  - Settings → Developer Options → USB Debugging
- Connect device via USB

**Steps:**

```bash
# Verify device is connected
adb devices

# Run app
npm run android
```

**Wireless Debugging (Android 11+):**
```bash
# Pair device (first time)
adb pair <IP>:<PORT>  # From device's Wireless debugging screen

# Connect
adb connect <IP>:5555

# Run app
npm run android
```

---

## Testing Guide

The app uses **Jest** and **React Native Testing Library** for comprehensive testing.

### Test Suite Overview

```
__tests__/
├── Unit Tests
│   ├── Widget Tests (DepthWidget.test.tsx, SpeedWidget.test.tsx, etc.)
│   ├── Service Tests (nmeaConnection.test.ts, layoutService.test.ts)
│   ├── Store Tests (nmeaStore.test.ts, themeStore.test.ts)
│   └── Utility Tests (utils/)
│
├── Integration Tests (integration/)
│   ├── connectionResilience.test.ts
│   ├── malformedStress.test.ts
│   ├── playbackUi.test.tsx
│   └── modeToggleWidgets.test.tsx
│
└── Platform Tests (platform/)
    ├── Platform-specific rendering
    └── Platform-specific APIs
```

### Running Tests

#### 1. Run All Tests

```bash
# Run complete test suite
npm test

# Expected output:
# Test Suites: 29 passed, 29 total
# Tests:       180+ passed, 180+ total
# Coverage:    70%+ (goal: ≥70% per NFR18)
```

#### 2. Run Tests in Watch Mode

```bash
# Automatically re-run tests on file changes
npm test -- --watch
```

**Watch Mode Commands:**
- Press `a` to run all tests
- Press `f` to run only failed tests
- Press `p` to filter by filename pattern
- Press `t` to filter by test name pattern
- Press `q` to quit watch mode

#### 3. Run Specific Test Files

```bash
# Run single test file
npm test -- DepthWidget.test.tsx

# Run tests matching pattern
npm test -- Widget.test.tsx

# Run specific test suite
npm test -- __tests__/services/
```

#### 4. Run Integration Tests

```bash
# Run all integration tests
npm run test:integration

# Run specific integration test
npm run test:integration:connection
npm run test:integration:malformed
```

#### 5. Run CI Fast Tests (Quick Validation)

```bash
# Run subset of tests for quick CI checks
npm run test:ci-fast

# Runs:
# - stopPlayback.test.ts
# - playbackParity.test.ts
# - playbackUi.test.tsx
# - modeToggleWidgets.test.tsx
# - playbackService.test.ts
```

#### 6. Generate Coverage Report

```bash
# Run tests with coverage
npm test -- --coverage

# Coverage report saved to: coverage/
# Open in browser: coverage/lcov-report/index.html
```

**Coverage Goals (from PRD NFR18):**
- **Target:** ≥70% coverage for core functionality
- **Core Areas:**
  - NMEA parsing: 80%+
  - Widget rendering: 75%+
  - Autopilot control: 85%+
  - Alarm processing: 80%+

#### 7. Run Tests with Verbose Output

```bash
# Show individual test results
npm test -- --verbose

# Debug specific test
npm test -- --no-coverage --verbose DepthWidget.test.tsx
```

### Test Categories Explained

#### Unit Tests

Test individual components and functions in isolation.

**Example: Widget Tests**
```bash
# Test depth widget rendering
npm test -- DepthWidget.test.tsx

# Test compass widget
npm test -- CompassWidget.test.tsx

# Test all widgets
npm test -- Widget.test.tsx
```

**Example: Service Tests**
```bash
# Test NMEA connection logic
npm test -- nmeaConnection.test.ts

# Test NMEA 2000 connection
npm test -- nmea2000Connection.test.ts

# Test layout service
npm test -- layoutService.test.ts
```

**Example: Store Tests**
```bash
# Test NMEA data store
npm test -- nmeaStore.test.ts

# Test theme store (Day/Night/Red-Night modes)
npm test -- themeStore.test.ts
```

#### Integration Tests

Test multiple components working together and realistic workflows.

```bash
# Test connection resilience (reconnection logic, error handling)
npm run test:integration:connection

# Test malformed NMEA data handling (stress test)
npm run test:integration:malformed

# Test playback mode UI integration
npm test -- playbackUi.test.tsx

# Test mode switching (live ↔ playback)
npm test -- modeToggleWidgets.test.tsx
```

#### Platform Tests

Test platform-specific functionality.

```bash
# Run platform-specific tests
npm test -- __tests__/platform/
```

### Understanding Test Results

**Successful Test Run:**
```
PASS  __tests__/DepthWidget.test.tsx
  DepthWidget
    ✓ renders depth value correctly (45ms)
    ✓ displays -- when value is null (12ms)
    ✓ converts units correctly (23ms)
    ✓ shows stale data indicator after 5s (5005ms)

Test Suites: 1 passed, 1 total
Tests:       4 passed, 4 total
Snapshots:   0 total
Time:        6.234 s
```

**Failed Test:**
```
FAIL  __tests__/DepthWidget.test.tsx
  DepthWidget
    ✓ renders depth value correctly (45ms)
    ✕ displays -- when value is null (12ms)

  ● DepthWidget › displays -- when value is null

    expect(received).toBeTruthy()

    Received: null

      45 |       <DepthWidget value={null} unit="ft" />
      46 |     );
    > 47 |     expect(getByText('--')).toBeTruthy();
         |                             ^
      48 |   });

Test Suites: 1 failed, 1 total
Tests:       1 failed, 3 passed, 4 total
```

### Testing Best Practices

1. **Run tests before committing code**
   ```bash
   npm test
   ```

2. **Write tests for new features** (maintain ≥70% coverage)

3. **Use descriptive test names**
   ```typescript
   it('should display "--" when NMEA data is unavailable')
   it('should convert depth from meters to feet correctly')
   ```

4. **Mock external dependencies** (TCP sockets, file system)
   ```typescript
   jest.mock('react-native-tcp-socket');
   ```

5. **Test edge cases**
   - Null/undefined data
   - Malformed NMEA sentences
   - Connection failures
   - Stale data (>5 seconds old)

---

## Development Modes

The app supports multiple development modes for testing without a physical boat.

### 1. Playback Mode

Replay pre-recorded NMEA data files for realistic testing.

**Sample Data Files:**
```bash
# Located in: marine-assets/sample-data/
ls marine-assets/sample-data/
# high_density.nmea    - 500 msg/sec stress test
# sailing_session.nmea - Typical sailing data
# motor_session.nmea   - Powerboat engine data
```

**Using Playback Mode:**

```bash
# Run playback benchmark
npm run dev:bench -- ../marine-assets/sample-data/high_density.nmea 500 5
# Arguments: <file> <rate-msg/sec> <duration-seconds>

# Validates:
# - Parser throughput (should handle 500 msg/sec)
# - Memory usage
# - Widget update latency
```

**In-App Playback:**
- Open app → Settings → Playback Mode
- Select NMEA file from device storage
- Start playback
- Widgets update as if connected to real boat

### 2. Mock Server Mode

Run a mock TCP server that streams NMEA data for integration testing.

```bash
# Run mock server validation test
npm run dev:mock

# This test:
# 1. Starts mock TCP server on port 10110
# 2. Streams NMEA sentences
# 3. Validates app can connect and parse data
# 4. Shuts down cleanly
```

### 3. Demo Mode

First-run wizard can be skipped to enter demo mode with synthetic data.

**Activating Demo Mode:**
1. Launch app (first time)
2. Skip setup wizard
3. App displays sample data without WiFi bridge

---

## Troubleshooting

### Common Issues

#### Metro Bundler Issues

**Problem: "Metro bundler already running on port 8081"**

```bash
# Kill existing Metro process
lsof -ti:8081 | xargs kill -9

# Restart Metro
npm start
```

**Problem: "Unable to resolve module"**

```bash
# Clear Metro cache
npm start -- --reset-cache

# Clear watchman cache
watchman watch-del-all

# Reinstall dependencies
rm -rf node_modules
npm install
```

#### iOS Build Issues

**Problem: "No Podfile.lock found"**

```bash
cd ios
bundle exec pod install
cd ..
```

**Problem: "Xcode build failed with code 65"**

```bash
# Clean Xcode build
cd ios
xcodebuild clean
cd ..

# Re-build
npm run ios
```

**Problem: "Command not found: xcodebuild"**

```bash
# Install Xcode command line tools
xcode-select --install
```

#### Android Build Issues

**Problem: "INSTALL_FAILED_INSUFFICIENT_STORAGE"**

```bash
# Clear app data on device/emulator
adb shell pm clear com.boatinginstrumentsapp

# Or uninstall first
adb uninstall com.boatinginstrumentsapp
npm run android
```

**Problem: "Could not find com.android.tools.build:gradle"**

```bash
# Update Gradle wrapper
cd android
./gradlew wrapper --gradle-version 8.3
cd ..
```

**Problem: "Execution failed for task ':app:installDebug'"**

```bash
# Check device connection
adb devices

# Restart ADB server
adb kill-server
adb start-server

# Run app
npm run android
```

#### Network/NMEA Issues

**Problem: "Cannot connect to WiFi bridge"**

1. Verify WiFi bridge IP address (e.g., `192.168.1.10`)
2. Ensure device is on same network as boat
3. Check TCP port (default: `10110`)
4. Use playback mode for testing without boat

```bash
# Test TCP connection
nc -zv 192.168.1.10 10110

# Expected: Connection succeeded
```

**Problem: "No NMEA data displayed"**

1. Check connection status indicator (should be green)
2. Verify NMEA data stream from WiFi bridge
3. Check app logs for parsing errors
4. Try playback mode to verify widgets work

#### Test Failures

**Problem: "Tests fail due to missing native modules"**

```bash
# Jest setup file should mock native modules
# Check: __tests__/setup.ts

# Add missing mocks:
jest.mock('react-native-tcp-socket', () => ({
  createConnection: jest.fn(),
}));
```

**Problem: "Tests timeout"**

```bash
# Increase test timeout
npm test -- --testTimeout=20000

# Or in test file:
jest.setTimeout(20000);
```

### Performance Optimization

#### Slow Metro Start

```bash
# Disable unused platforms
npm start -- --ios   # iOS only
npm start -- --android  # Android only
```

#### Slow Test Runs

```bash
# Run tests in parallel (default)
npm test

# Run serially (for debugging)
npm test -- --runInBand

# Run only changed tests
npm test -- --onlyChanged
```

### Getting Help

**Logs and Debugging:**

```bash
# React Native logs
# iOS
npx react-native log-ios

# Android
npx react-native log-android

# Metro bundler logs
npm start -- --verbose
```

**Documentation:**
- [React Native Docs](https://reactnative.dev/docs/getting-started)
- [Jest Docs](https://jestjs.io/docs/getting-started)
- [NMEA 0183 Reference](http://www.nmea.org/)

**Project Documentation:**
- PRD: `docs/prd.md`
- Architecture: `docs/architecture.md`
- Testing Details: `README-testing.md`

---

## Quick Reference

### Essential Commands

```bash
# Setup
npm install                          # Install dependencies
cd ios && bundle exec pod install    # iOS pods

# Development
npm start                            # Start Metro bundler
npm run ios                          # Run iOS
npm run android                      # Run Android

# Testing
npm test                             # All tests
npm test -- --watch                  # Watch mode
npm run test:integration             # Integration tests
npm test -- --coverage               # With coverage

# Debugging
npm start -- --reset-cache           # Clear Metro cache
npm run ios -- --simulator="iPhone 15"  # Specific simulator
adb devices                          # Check Android devices

# Linting & Formatting
npm run lint                         # Run ESLint
npm run format                       # Run Prettier (if configured)
```

### Platform-Specific Quick Start

**iOS:**
```bash
cd boatingInstrumentsApp
npm install
cd ios && bundle exec pod install && cd ..
npm start &
npm run ios
```

**Android:**
```bash
cd boatingInstrumentsApp
npm install
# Start Android emulator first
npm start &
npm run android
```

---

## Next Steps

Once setup is complete:

1. **Run the app** on your device/simulator
2. **Configure WiFi bridge** connection (or use Playback Mode)
3. **Add widgets** to dashboard from widget selector
4. **Customize layout** (drag-drop, resize)
5. **Run tests** to verify everything works

**Ready for development?** Check out the [Architecture Documentation](docs/architecture.md) for detailed technical information.

---

**Document Version:** 1.0
**Last Updated:** 2025-10-12
**For Project:** Boating Instruments App MVP
