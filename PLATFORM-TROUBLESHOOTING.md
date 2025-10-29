# Platform-Specific Troubleshooting Guide

## iOS Troubleshooting

### Build Errors

#### "Command PhaseScriptExecution failed with a nonzero exit code"

**Cause:** CocoaPods dependencies not properly installed or cache issues.

**Solutions:**
```bash
# Solution 1: Clean and reinstall pods
cd ios
rm -rf Pods Podfile.lock
bundle exec pod install --repo-update
cd ..

# Solution 2: Clean Xcode build folder
cd ios
xcodebuild clean -workspace boatingInstrumentsApp.xcworkspace -scheme boatingInstrumentsApp
cd ..

# Solution 3: Clear Xcode derived data
rm -rf ~/Library/Developer/Xcode/DerivedData/*

# Then rebuild
npm run ios
```

#### "No bundle URL present"

**Cause:** Metro bundler not running or not accessible.

**Solutions:**
```bash
# Solution 1: Ensure Metro is running
npm start

# In another terminal
npm run ios

# Solution 2: Reset Metro cache
npm start -- --reset-cache

# Solution 3: Check if port 8081 is available
lsof -ti:8081 | xargs kill -9
npm start
```

#### "Could not find iPhone Simulator"

**Cause:** Xcode command line tools not configured correctly.

**Solutions:**
```bash
# Set Xcode command line tools
sudo xcode-select --switch /Applications/Xcode.app/Contents/Developer

# Verify
xcode-select -p

# List available simulators
xcrun simctl list devices available

# Boot specific simulator
xcrun simctl boot "iPhone 15"

# Then run
npm run ios
```

#### "library not found for -lDoubleConversion"

**Cause:** Pod dependencies not linked correctly.

**Solutions:**
```bash
# Clean everything iOS
cd ios
rm -rf Pods Podfile.lock ~/Library/Developer/Xcode/DerivedData
bundle exec pod install
cd ..

# Clean npm cache
npm cache clean --force
rm -rf node_modules
npm install

# Rebuild
npm run ios
```

#### "Multiple commands produce..."

**Cause:** Duplicate file references in Xcode project.

**Solutions:**
```bash
# Open in Xcode
open ios/boatingInstrumentsApp.xcworkspace

# In Xcode:
# 1. Build Settings → Search "ENABLE_USER_SCRIPT_SANDBOXING"
# 2. Set to "No"
# 3. Clean Build Folder (Shift+Cmd+K)
# 4. Build (Cmd+B)
```

### Runtime Errors

#### "Metro bundler is not running"

**Solutions:**
```bash
# Terminal 1: Start Metro
npm start

# Terminal 2: Run app
npm run ios

# If issue persists, reset cache
npm start -- --reset-cache
```

#### App crashes immediately after launch

**Solutions:**
```bash
# Check logs
npx react-native log-ios

# Common issues:
# 1. Native module linking - reinstall pods
cd ios && bundle exec pod install && cd ..

# 2. JavaScript errors - check Metro logs
npm start

# 3. Sentry/native modules - rebuild
npm run ios
```

#### "Unable to resolve module @react-native-async-storage/async-storage"

**Cause:** Native module not linked or Metro cache stale.

**Solutions:**
```bash
# Clear cache and reinstall
watchman watch-del-all
rm -rf node_modules
npm install
cd ios && bundle exec pod install && cd ..
npm start -- --reset-cache
npm run ios
```

### Performance Issues

#### Slow build times

**Solutions:**
```bash
# Enable Hermes (if not already)
# Edit ios/Podfile:
# :hermes_enabled => true

cd ios
bundle exec pod install
cd ..

# Use release build for testing performance
npm run ios -- --configuration Release
```

#### App laggy on device

**Solutions:**
```bash
# Check if running in dev mode
# Dev mode has perf debugging overlay

# Build release version
npm run ios -- --configuration Release --device

# Profile with Instruments:
# Xcode → Product → Profile → Time Profiler
```

---

## Android Troubleshooting

### Build Errors

#### "SDK location not found"

**Cause:** Android SDK path not configured.

**Solutions:**
```bash
# Create local.properties
echo "sdk.dir=$ANDROID_HOME" > android/local.properties

# Or on macOS:
echo "sdk.dir=$HOME/Library/Android/sdk" > android/local.properties

# Verify ANDROID_HOME
echo $ANDROID_HOME

# Add to ~/.zshrc or ~/.bash_profile if missing:
export ANDROID_HOME=$HOME/Library/Android/sdk
export PATH=$PATH:$ANDROID_HOME/platform-tools
```

#### "Execution failed for task ':app:installDebug'"

**Cause:** ADB not finding device or app already installed incorrectly.

**Solutions:**
```bash
# Check connected devices
adb devices

# If device not listed:
# 1. Enable USB debugging on device
# 2. Reconnect USB cable
# 3. Accept trust prompt on device

# Uninstall old version
adb uninstall com.boatinginstrumentsapp

# Clear app data
adb shell pm clear com.boatinginstrumentsapp

# Restart ADB
adb kill-server
adb start-server

# Rebuild
npm run android
```

#### "Could not download com.android.tools.build:gradle"

**Cause:** Gradle version mismatch or network issues.

**Solutions:**
```bash
# Update Gradle wrapper
cd android
./gradlew wrapper --gradle-version 8.3
cd ..

# Clean Gradle cache
cd android
./gradlew clean
rm -rf .gradle
cd ..

# Clear global Gradle cache
rm -rf ~/.gradle/caches/

# Rebuild
npm run android
```

#### "Duplicate class found in modules"

**Cause:** Conflicting dependency versions.

**Solutions:**
```bash
# Clean everything
cd android
./gradlew clean
rm -rf app/build .gradle
cd ..

# Check for duplicate dependencies
cd android
./gradlew app:dependencies | grep "packageName"
cd ..

# Force resolve versions in android/app/build.gradle:
# implementation('package:name:version') {
#     force = true
# }

# Rebuild
npm run android
```

#### "AAPT: error: resource android:attr/lStar not found"

**Cause:** Compile SDK version mismatch.

**Solutions:**
```bash
# Edit android/app/build.gradle:
# compileSdkVersion 34
# targetSdkVersion 34

cd android
./gradlew clean
cd ..

npm run android
```

### Runtime Errors

#### "Unable to load script"

**Cause:** Metro bundler not serving bundle or wrong IP.

**Solutions:**
```bash
# Solution 1: Restart Metro with cache reset
npm start -- --reset-cache

# Solution 2: Check device is on same network (WiFi)
# For emulator, use localhost
# For physical device, ensure same WiFi network

# Solution 3: Reverse port for physical device
adb reverse tcp:8081 tcp:8081

# Solution 4: Manually set Dev Server
# Shake device → Dev Settings → Debug server host
# Enter: <your-computer-ip>:8081

# Rebuild
npm run android
```

#### "Native module cannot be null"

**Cause:** Native module not linked or not compiled.

**Solutions:**
```bash
# Rebuild native modules
cd android
./gradlew clean
cd ..

# Clear Metro cache
npm start -- --reset-cache

# Rebuild app
npm run android

# If issue persists, check autolinking
npx react-native config
```

#### "INSTALL_FAILED_INSUFFICIENT_STORAGE"

**Solutions:**
```bash
# Free up space on device/emulator

# Option 1: Clear app data
adb shell pm clear com.boatinginstrumentsapp

# Option 2: Uninstall other apps
adb shell pm list packages
adb uninstall com.example.package

# Option 3: Create new emulator with more storage
# Android Studio → Device Manager → Create Device
# Advanced Settings → Internal Storage: 4096 MB
```

#### App crashes on startup (Android)

**Solutions:**
```bash
# Check logcat
adb logcat | grep ReactNativeJS

# Check for ProGuard issues (release builds)
# Edit android/app/build.gradle:
# minifyEnabled false
# shrinkResources false

# Common fixes:
# 1. Clear data
adb shell pm clear com.boatinginstrumentsapp

# 2. Reinstall
adb uninstall com.boatinginstrumentsapp
npm run android

# 3. Check native modules
cd android
./gradlew :app:dependencies
cd ..
```

### Performance Issues

#### Slow app start on Android

**Solutions:**
```bash
# Enable Hermes (should be enabled by default)
# Check android/app/build.gradle:
# enableHermes: true

# Build release version
npm run android -- --variant=release

# Profile with Android Studio:
# View → Tool Windows → Profiler
```

#### App laggy during use

**Solutions:**
```bash
# Check dev menu is disabled in production
# Dev menu causes performance overhead

# Build release
npm run android -- --variant=release

# Enable Hermes proguard rules
# android/app/proguard-rules.pro:
# -keep class com.facebook.hermes.unicode.** { *; }
# -keep class com.facebook.jni.** { *; }
```

---

## Network & NMEA Issues

### Cannot Connect to WiFi Bridge

#### Connection Refused

**Diagnosis:**
```bash
# Test TCP connection from computer
nc -zv 192.168.1.10 10110

# Or use telnet
telnet 192.168.1.10 10110
```

**Solutions:**
```bash
# 1. Verify IP address
# Check WiFi bridge manual or DHCP settings

# 2. Verify port (default: 10110)
# Some bridges use 2000 or 2001

# 3. Ensure device on same network
# iOS: Settings → WiFi → Network name
# Android: Settings → WiFi → Network name

# 4. Disable VPN if active
# VPN can interfere with local network

# 5. Check firewall (desktop platforms)
# macOS: System Preferences → Security & Privacy → Firewall
# Windows: Windows Defender Firewall

# 6. Test with playback mode instead
# Settings → Playback Mode → Select sample file
```

#### Connection Timeout

**Solutions:**
```bash
# 1. Check WiFi bridge is powered on and connected
# LED indicators should show active WiFi

# 2. Increase connection timeout in app
# Settings → Connection → Timeout: 10 seconds

# 3. Verify network reachability
ping 192.168.1.10

# 4. Check boat network settings
# Some boats use isolated networks (guest network)
# Connect to primary network instead
```

### No NMEA Data Displayed

#### Connected but Widgets Show "--"

**Diagnosis:**
```bash
# Check app logs for parsing errors
# iOS:
npx react-native log-ios | grep NMEA

# Android:
adb logcat | grep NMEA
```

**Solutions:**
```bash
# 1. Verify NMEA data is flowing
# Connection status should be green
# Check "Last Data" timestamp in Settings

# 2. Check NMEA format
# App supports NMEA 0183 and NMEA 2000
# Verify WiFi bridge is configured correctly

# 3. Test with sample data
# Use playback mode to verify widgets work
npm run dev:bench -- ../marine-assets/sample-data/sailing_session.nmea 10 30

# 4. Check widget configuration
# Settings → Widgets → Select Data Source
# Ensure correct NMEA source is selected

# 5. Enable debug logging
# Settings → Developer → Debug Logging: ON
# Check logs for parsing errors
```

#### Intermittent Data

**Solutions:**
```bash
# 1. Check WiFi signal strength
# Move device closer to WiFi bridge

# 2. Verify WiFi bridge firmware up to date
# Check manufacturer website

# 3. Check for interference
# Other devices on same channel
# Metal boat structures

# 4. Monitor connection resilience
npm run test:integration:connection

# 5. Enable auto-reconnect
# Settings → Connection → Auto-reconnect: ON
# Reconnect delay: 5 seconds
```

### Autopilot Control Issues

#### Commands Not Executing

**Diagnosis:**
```bash
# Run autopilot command tests
npm test -- AutopilotStatusWidget.test.tsx

# Check command transmission in logs
# iOS:
npx react-native log-ios | grep Autopilot

# Android:
adb logcat | grep Autopilot
```

**Solutions:**
```bash
# 1. Verify autopilot is in correct mode
# Must be in "Auto" or "Track" mode to accept heading changes

# 2. Check Raymarine EVO firmware version
# Some commands require specific firmware
# Update to latest firmware if needed

# 3. Verify NMEA 2000 support
# Autopilot commands require NMEA 2000
# WiFi bridge must support PGN messages

# 4. Test with playback mode
# Verify UI sends commands correctly
npm run dev:mock

# 5. Enable command confirmation
# Settings → Autopilot → Confirm Commands: ON

# 6. Check PGN encoding
npm test -- services/autopilotCommands.test.ts
```

#### Tack/Gybe Countdown Issues

**Solutions:**
```bash
# Test tack/gybe functionality
npm test -- __tests__/integration/autopilotControl.test.ts

# Check timer implementation
# Should show 5-second countdown with abort button

# If countdown not displaying:
# 1. Verify React Native Reanimated installed
npm list react-native-reanimated

# 2. Rebuild native modules
cd ios && bundle exec pod install && cd ..
npm run ios

# For Android:
cd android && ./gradlew clean && cd ..
npm run android
```

---

## Testing Issues

### Jest Test Failures

#### "Cannot find module '@/components/...'"

**Cause:** Path alias not configured in Jest.

**Solutions:**
```bash
# Verify jest.config.js has moduleNameMapper:
# moduleNameMapper: {
#   '^@/(.*)$': '<rootDir>/src/$1',
# }

# Clear Jest cache
npx jest --clearCache

# Run tests again
npm test
```

#### "Timeout - Async callback was not invoked"

**Cause:** Test taking too long or promise not resolving.

**Solutions:**
```bash
# Increase timeout for specific test
# In test file:
jest.setTimeout(20000); // 20 seconds

# Or for integration tests:
npm run test:integration -- --testTimeout=20000

# Debug hanging test:
npm test -- --runInBand --verbose SpecificTest.test.ts
```

#### "Native module cannot be null" in tests

**Cause:** Native module not mocked.

**Solutions:**
```bash
# Check __tests__/setup.ts has mocks:
jest.mock('react-native-tcp-socket', () => ({
  createConnection: jest.fn(() => ({
    on: jest.fn(),
    write: jest.fn(),
    destroy: jest.fn(),
  })),
}));

# Add missing mocks for other native modules

# Clear cache and rerun
npx jest --clearCache
npm test
```

#### Tests pass locally but fail in CI

**Solutions:**
```bash
# Run tests in CI mode
npm run test:ci-fast

# Check for timing-sensitive tests
# Use jest.useFakeTimers() for time-dependent tests

# Ensure deterministic test order
npm test -- --runInBand

# Check for environment differences
# CI might not have native modules compiled
```

### Integration Test Issues

#### "Connection refused" in integration tests

**Cause:** Mock server not starting or port conflict.

**Solutions:**
```bash
# Check if port 10110 is available
lsof -i:10110

# Kill process on port
lsof -ti:10110 | xargs kill -9

# Run integration test
npm run test:integration:connection

# Or use different port in test
# Edit integration test to use port 10111
```

#### "Playback file not found"

**Solutions:**
```bash
# Verify sample data exists
ls marine-assets/sample-data/

# If missing, create sample NMEA file:
cat > marine-assets/sample-data/test.nmea << EOF
\$GPGGA,123519,4807.038,N,01131.000,E,1,08,0.9,545.4,M,46.9,M,,*47
\$SDDBT,12.4,f,3.8,M,2.1,F*3A
EOF

# Run test with correct path
npm run dev:bench -- ../marine-assets/sample-data/test.nmea 10 5
```

---

## Platform-Specific Notes

### macOS (M1/M2/M3 Apple Silicon)

#### Rosetta Issues

**Solutions:**
```bash
# Install Rosetta if needed
softwareupdate --install-rosetta

# For Xcode projects requiring Rosetta:
# Xcode → Product → Destination → Show Both
# Select "My Mac (Rosetta)"
```

#### CocoaPods arm64 Issues

**Solutions:**
```bash
# Use native arch
arch -arm64 bundle exec pod install

# Or force x86_64 if needed
arch -x86_64 bundle exec pod install
```

### Windows (Phase 1.5)

#### React Native Windows Setup

**Solutions:**
```bash
# Install React Native Windows
npx react-native-windows-init --overwrite

# Run on Windows
npx react-native run-windows

# Common issues:
# - Visual Studio 2022 with C++ workload required
# - Windows SDK 10.0.19041.0 or higher required
# - Enable Developer Mode in Windows Settings
```

---

## General Debugging Tips

### Enable Debug Mode

**iOS:**
```bash
# In simulator: Cmd + D → Debug
# On device: Shake device → Debug

# Enable:
# - Remote JS Debugging
# - Element Inspector
# - Performance Monitor
# - Network Inspector
```

**Android:**
```bash
# In emulator: Cmd/Ctrl + M → Debug
# On device: Shake device → Debug

# Enable same features as iOS
```

### View Logs

**iOS:**
```bash
# React Native logs
npx react-native log-ios

# System logs
xcrun simctl spawn booted log stream --predicate 'processImagePath endswith "boatingInstrumentsApp"'

# Xcode console: Xcode → View → Debug Area → Show Debug Area
```

**Android:**
```bash
# React Native logs
npx react-native log-android

# Filtered logs
adb logcat | grep "ReactNativeJS\|boatinginstruments"

# Android Studio Logcat: View → Tool Windows → Logcat
```

### Network Debugging

**iOS:**
```bash
# Enable Network inspector
# Cmd + D → Toggle Inspector → Network tab

# For production builds, use proxy:
# Charles Proxy or Proxyman
```

**Android:**
```bash
# Enable Network inspector (same as iOS)

# Use Chrome DevTools:
chrome://inspect
# Select device → Inspect
```

---

## When All Else Fails

### Nuclear Reset

**Complete Clean Rebuild:**
```bash
# From boatingInstrumentsApp directory

# 1. Kill all processes
lsof -ti:8081 | xargs kill -9
pkill -f "react-native"
pkill -f "metro"

# 2. Clean everything
rm -rf node_modules
rm -rf ios/Pods
rm -rf ios/Podfile.lock
rm -rf android/app/build
rm -rf android/.gradle
rm -rf ~/.gradle/caches
rm -rf $TMPDIR/react-*
rm -rf $TMPDIR/metro-*

# 3. Clear watchman
watchman watch-del-all

# 4. Clear Metro cache
rm -rf $TMPDIR/metro-cache

# 5. Clear CocoaPods cache
pod cache clean --all

# 6. Reinstall dependencies
npm install

# 7. iOS: Reinstall pods
cd ios
bundle install
bundle exec pod install --repo-update
cd ..

# 8. Android: Sync gradle
cd android
./gradlew clean
cd ..

# 9. Start fresh
npm start -- --reset-cache

# 10. Build for platform
npm run ios      # or
npm run android
```

**Time Required:** 10-15 minutes

---

## Getting Additional Help

### Documentation
- Main Setup Guide: [SETUP-AND-TESTING.md](SETUP-AND-TESTING.md)
- Quick Start: [QUICK-START.md](QUICK-START.md)
- Architecture: [docs/architecture.md](docs/architecture.md)

### Online Resources
- [React Native Troubleshooting](https://reactnative.dev/docs/troubleshooting)
- [Jest Troubleshooting](https://jestjs.io/docs/troubleshooting)
- [Metro Troubleshooting](https://facebook.github.io/metro/docs/troubleshooting)

### Community
- [React Native GitHub Issues](https://github.com/facebook/react-native/issues)
- [Stack Overflow - React Native](https://stackoverflow.com/questions/tagged/react-native)

---

**Document Version:** 1.0
**Last Updated:** 2025-10-12
**Platform Coverage:** iOS, Android, macOS (Apple Silicon)
