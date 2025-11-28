# Android TCP/UDP Native Module Linking Guide

## Problem Overview

When using Expo with native modules like `react-native-tcp-socket` and `react-native-udp`, hot reload and Expo updates can lose the native module linking. This results in errors like:

```
ERROR [getTcpSocket] ⚠️ Native TCP socket module not found!
ERROR [ConnectionManager] Cannot read property 'connect' of null
```

## Why This Happens

- **Expo's hot reload** doesn't rebuild native code
- **Metro bundler** only handles JavaScript changes
- **Native modules** require Android/iOS compilation
- **Autolinking** only runs during full native builds

## Solutions (In Order of Speed)

### 1. Quick Rebuild (2-3 minutes) ⚡

Use this for normal development when native modules break:

```bash
npm run android:rebuild
```

Or manually:
```bash
cd android
./gradlew clean
cd ..
npx expo run:android
```

**When to use:** After hot reload breaks TCP/UDP, quick fix without full prebuild

---

### 2. Clean Build (5-10 minutes) 🧹

Use this when rebuild doesn't work or after major changes:

```bash
npm run android:clean
```

Or manually:
```bash
# Clean Metro cache
npx expo start --clear

# Clean Android builds
cd android
./gradlew clean
cd ..
rm -rf android/app/build android/build android/.gradle

# Regenerate native projects
npx expo prebuild --clean --platform android

# Build and run
npx expo run:android
```

**When to use:** 
- First time setting up
- After changing native module configuration
- After updating React Native or Expo versions
- When rebuild fails

---

### 3. Nuclear Option (10-15 minutes) 💣

Use this when nothing else works:

```bash
# Stop all processes
pkill -f "expo start"
pkill -f "gradle"

# Delete everything
rm -rf android/ ios/
rm -rf node_modules/
rm -rf .expo/

# Reinstall
npm install --legacy-peer-deps

# Regenerate and build
npx expo prebuild --clean
npx expo run:android
```

**When to use:**
- Clean build fails
- Corrupted build artifacts
- After major version updates

---

## Configuration Files

### ✅ Configured for You

The following files have been configured to ensure proper native module linking:

#### 1. **app.json**
```json
{
  "expo": {
    "plugins": [
      ["expo-router", { "root": "./app" }],
      ["expo-build-properties", {
        "android": {
          "enableProguardInReleaseBuilds": false,
          "enableShrinkResourcesInReleaseBuilds": false
        }
      }]
    ]
  }
}
```

#### 2. **react-native.config.js**
```javascript
module.exports = {
  dependencies: {
    'react-native-tcp-socket': {
      platforms: {
        android: {
          sourceDir: '../node_modules/react-native-tcp-socket/android',
          packageImportPath: 'import com.asterinet.react.tcpsocket.TcpSocketPackage;',
        },
      },
    },
    'react-native-udp': {
      platforms: {
        android: {
          sourceDir: '../node_modules/react-native-udp/android',
        },
      },
    },
  },
};
```

---

## Verification Steps

After building, verify native modules are linked:

### 1. Check Console on App Start
```
[getTcpSocket] Native modules available: {
  hasTcpSockets: true,  // ← Should be true
  hasTcpSocket: true,   // ← Should be true
}
```

### 2. Check Gradle Files
```bash
grep -r "react-native-tcp-socket" android/
# Should show: android/settings.gradle:include ':react-native-tcp-socket'
```

### 3. Test Connection
```
[NmeaService] connectionManager.connect returned: true  // ← Should be true
[ConnectionManager] Connected successfully
```

---

## Development Workflow

### ❌ Avoid This Pattern
```bash
# Start with hot reload
npx expo start

# Make code changes
# ... native modules break ...
# Restart Metro (doesn't fix native modules)
npx expo start --clear
```

### ✅ Use This Pattern Instead

**For JS-only changes:**
```bash
npx expo start
# Hot reload works fine
```

**For native module changes:**
```bash
npm run android:rebuild
# Always rebuild native code
```

**After dependency updates:**
```bash
npm run android:clean
# Full clean build
```

---

## VS Code Tasks (Optional)

Add these to `.vscode/tasks.json`:

```json
{
  "label": "Android: Quick Rebuild",
  "type": "shell",
  "command": "npm run android:rebuild",
  "group": "build"
},
{
  "label": "Android: Clean Build",
  "type": "shell",
  "command": "npm run android:clean",
  "group": "build"
}
```

---

## Common Errors and Solutions

### Error: "Cannot read property 'connect' of null"
**Solution:** Run `npm run android:rebuild`

### Error: "Native TCP socket module not found"
**Solution:** Run `npm run android:clean`

### Error: "Task :app:installDebug FAILED"
**Solution:** 
1. Stop Metro bundler (Ctrl+C)
2. Run `cd android && ./gradlew clean`
3. Run `npm run android:rebuild`

### Error: "Unable to load script. Make sure you're either running Metro..."
**Solution:**
1. Stop all processes
2. Run `npx expo start --clear`
3. In new terminal: `npm run android:rebuild`

---

## Best Practices

### DO ✅
- Use `npm run android:rebuild` after breaking hot reload
- Use `npm run android:clean` after changing dependencies
- Keep Metro bundler running between JS-only changes
- Test native modules after each build

### DON'T ❌
- Rely on hot reload for native module changes
- Use `expo start` alone after TCP/UDP errors
- Skip clean builds after dependency updates
- Mix `expo start` and `expo run:android` workflows

---

## Quick Reference

| Scenario | Command | Time |
|----------|---------|------|
| Native modules broken | `npm run android:rebuild` | 2-3 min |
| After dependency update | `npm run android:clean` | 5-10 min |
| Everything broken | Nuclear option | 10-15 min |
| JS changes only | `npx expo start` | Instant |

---

---

## 🚨 CRITICAL: Release Build Issues

### Problem: Native Module Not Found in Release APK

If the app works in debug but fails in release builds with:
```
ERROR [getTcpSocket] ⚠️ Native TCP socket module not found!
hasTcpSockets: false, hasTcpSocket: false
```

**Root Causes:**
1. **Expo autolinking doesn't respect `react-native.config.js`** in release builds
2. **R8/ProGuard code shrinking** removes native modules accessed via reflection
3. **Native classes compiled but stripped** from final APK

### Solution: Manual Linking + ProGuard Rules

#### Step 1: Add ProGuard Keep Rules

Edit `android/app/proguard-rules.pro`:
```proguard
# react-native-tcp-socket
-keep class com.asterinet.react.tcpsocket.** { *; }
-keepclassmembers class com.asterinet.react.tcpsocket.** { *; }
```

#### Step 2: Manual Package Import

Edit `android/app/src/main/java/.../MainApplication.kt`:
```kotlin
import expo.modules.ApplicationLifecycleDispatcher
import expo.modules.ReactNativeHostWrapper
import com.asterinet.react.tcpsocket.TcpSocketPackage  // ← Add this

class MainApplication : Application(), ReactApplication {

  override val reactNativeHost: ReactNativeHost = ReactNativeHostWrapper(
      this,
      object : DefaultReactNativeHost(this) {
        override fun getPackages(): List<ReactPackage> =
            PackageList(this).packages.apply {
              add(TcpSocketPackage())  // ← Add this
            }
```

#### Step 3: Add to settings.gradle

Edit `android/settings.gradle`:
```gradle
include ':app'
includeBuild(expoAutolinking.reactNativeGradlePlugin)
include ':react-native-tcp-socket'  // ← Add this
project(':react-native-tcp-socket').projectDir = new File(rootProject.projectDir, '../node_modules/react-native-tcp-socket/android')  // ← Add this
```

#### Step 4: Add Gradle Dependency

Edit `android/app/build.gradle`:
```gradle
dependencies {
    implementation("com.facebook.react:react-android")
    implementation project(':react-native-tcp-socket')  // ← Add this
    
    // ... rest of dependencies
}
```

#### Step 5: Rebuild Release APK

```bash
cd android
./gradlew clean assembleRelease
adb install -r app/build/outputs/apk/release/app-release.apk
```

### Verification: Check Native Classes in APK

```bash
# Native classes are compiled into DEX bytecode
unzip -p android/app/build/outputs/apk/release/app-release.apk classes.dex | strings | grep -i "TcpSocket"

# Should output:
# Lcom/asterinet/react/tcpsocket/TcpSocketPackage;
# Lcom/asterinet/react/tcpsocket/TcpSocketModule;
# ... etc
```

If you see these strings, the native module is properly linked! ✅

---

## Why Expo Autolinking Fails

Expo SDK 52+ uses its own autolinking system that:
- **Ignores `react-native.config.js`** in many cases
- **Only scans packages with `expo-module.config.json`** or specific metadata
- **Doesn't link packages missing proper Expo plugin configuration**

**Evidence:**
- `PackageList(this).packages` returns only Expo-managed packages
- `react-native-tcp-socket` isn't in Expo's registry
- Build logs show module compiling but not linking: `> Task :react-native-tcp-socket:bundleReleaseAar`

**Solution:** Manual linking is the only reliable approach for non-Expo native modules.

---

## Still Having Issues?

1. Check Android device/emulator is running: `adb devices`
2. Check Metro bundler is running on correct port (8081)
3. Verify Android version in `android/build.gradle` matches device
4. Check `android/app/build.gradle` for proper configurations
5. Review logs: `adb logcat | grep -i "tcp\|udp\|native"`
6. **For release builds:** Verify DEX contains native classes (see verification above)
7. **For autolinking issues:** Use manual linking (see Critical section)

For more help, see:
- [Expo Autolinking Docs](https://docs.expo.dev/bare/autolinking/)
- [React Native Modules](https://reactnative.dev/docs/native-modules-android)
- [TCP Socket Issues](https://github.com/Rapsssito/react-native-tcp-socket/issues)
- [ProGuard Configuration](https://developer.android.com/build/shrink-code)
