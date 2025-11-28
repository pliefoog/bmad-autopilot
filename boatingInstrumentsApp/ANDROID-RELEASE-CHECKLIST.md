# Android Development & Release Build Guide

## 🚀 Development Workflow (Recommended for Daily Coding)

### Development Build vs Release Build

| Build Type | Purpose | Hot Reload? | When to Rebuild |
|------------|---------|-------------|-----------------|
| **Development Build** | Daily coding with fast refresh | ✅ Yes (via Metro) | Only when native code changes |
| **Debug APK** | Testing without Metro | ❌ No | Each test cycle |
| **Release APK** | Production/QA testing | ❌ No | Before deployment |

---

## ✅ Setting Up Development Build (One-Time Setup)

### Step 1: Create Development Build

```bash
cd boatingInstrumentsApp

# Build and install dev client to your device
npx expo run:android
```

This creates a custom development client with TCP socket support already linked. Install it once and keep it on your device.

### Step 2: Daily Development Workflow

```bash
# Start Metro bundler
npx expo start --dev-client
```

Then on your Android device:
1. Open the installed development build app
2. Scan the QR code OR enter Metro URL manually
3. Make code changes - they hot reload instantly! ⚡

### When to Rebuild Development Build

Only rebuild when:
- ❌ Adding new native modules (e.g., new npm package with native code)
- ❌ Modifying native Android code (Kotlin/Java files)
- ❌ Changing `android/app/build.gradle` dependencies
- ❌ Updating AndroidManifest.xml permissions

**JavaScript/TypeScript/UI changes → No rebuild needed!** ✅

---

## 📦 Release Build Checklist

Use this checklist to avoid common native module issues in Android release builds.

### ✅ Pre-Build Checklist

- [ ] **ProGuard rules configured** (`android/app/proguard-rules.pro`)
  ```proguard
  # react-native-tcp-socket
  -keep class com.asterinet.react.tcpsocket.** { *; }
  -keepclassmembers class com.asterinet.react.tcpsocket.** { *; }
  ```

- [ ] **Native packages imported** (`MainApplication.kt`)
  ```kotlin
  import com.asterinet.react.tcpsocket.TcpSocketPackage
  
  // In getPackages():
  add(TcpSocketPackage())
  ```

- [ ] **Module in settings.gradle** (`android/settings.gradle`)
  ```gradle
  include ':react-native-tcp-socket'
  project(':react-native-tcp-socket').projectDir = new File(rootProject.projectDir, '../node_modules/react-native-tcp-socket/android')
  ```

- [ ] **Dependency in build.gradle** (`android/app/build.gradle`)
  ```gradle
  implementation project(':react-native-tcp-socket')
  ```

---

## Build Commands

### Development Build
```bash
# Build and install development client (one-time or after native changes)
npx expo run:android

# Daily development - just start Metro
npx expo start --dev-client
```

### Release Build
```bash
# Clean release build
cd android
./gradlew clean assembleRelease

# Install on device
adb install -r app/build/outputs/apk/release/app-release.apk
```

---

## Post-Build Verification

### 1. Check Native Classes in APK

```bash
unzip -p android/app/build/outputs/apk/release/app-release.apk classes.dex | strings | grep -i "TcpSocket"
```

**Expected output:**
```
Lcom/asterinet/react/tcpsocket/TcpSocketPackage;
Lcom/asterinet/react/tcpsocket/TcpSocketModule;
Lcom/asterinet/react/tcpsocket/TcpSocket;
```

If no output → Native module not linked! ❌

### 2. Test on Device

Launch app and check console logs:

```
[getTcpSocket] Native modules available: {
  hasTcpSockets: true,  // ← Should be true
  hasTcpSocket: true,   // ← Should be true
}
```

### 3. Test TCP Connection

Try connecting to NMEA bridge:

```
[ConnectionManager] Connected successfully  // ← Should connect
```

---

## Common Issues

| Issue | Cause | Fix |
|-------|-------|-----|
| Module not found | Autolinking failed | Manual linking (see checklist above) |
| Classes in DEX but module null | ProGuard stripping | Add keep rules |
| Build fails with "package not found" | Incorrect import path | Check `MainApplication.kt` import |
| ADB install fails | Old version installed | `adb uninstall com.anonymous.boatinginstrumentsapp` |
| Hot reload not working | Using release APK instead of dev build | Install dev build: `npx expo run:android` |

---

## 🎯 Quick Command Reference

```bash
# Daily development (fast hot reload!)
npx expo start --dev-client

# Native code changed? Rebuild dev build
npx expo run:android

# Production testing
cd android && ./gradlew assembleRelease
adb install -r app/build/outputs/apk/release/app-release.apk

# View device logs
adb logcat | grep -i "ReactNative\|TcpSocket\|NMEA"
```

---

## Full Documentation

For complete troubleshooting and detailed explanations:

**→ [Android Native Module Linking Guide](docs/ANDROID-NATIVE-MODULE-LINKING.md)**

---

## Quick Reference

**Files to check:**
1. `android/app/proguard-rules.pro` - Keep rules
2. `android/app/src/main/java/.../MainApplication.kt` - Package import
3. `android/settings.gradle` - Module include
4. `android/app/build.gradle` - Dependency declaration

**Verification command:**
```bash
unzip -p android/app/build/outputs/apk/release/app-release.apk classes.dex | strings | grep "TcpSocket"
```

**If verification fails:**
1. Re-check all 4 files above
2. Run `./gradlew clean`
3. Rebuild `./gradlew assembleRelease`
4. Re-verify

---

## 💡 Pro Tips

### Development Build Benefits
- **Fast hot reload** for 99% of code changes
- **No rebuild wait time** for UI/logic updates
- **Native modules work** (TCP/UDP already linked)
- **Keep it installed** and just connect via Metro

### When Auto-Rotation Doesn't Work
Android's rotation control may require manual confirmation:
- **System feature**: Rotate icon appears when device turns
- **To disable**: Settings → Display → Enable "Auto-rotate screen"
- **Via ADB**: `adb shell settings put system accelerometer_rotation 1`

---

**Last Updated:** November 28, 2025
