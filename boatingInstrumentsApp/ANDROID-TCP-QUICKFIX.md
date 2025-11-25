# TCP/UDP Native Module Linking - Quick Fix

## ⚠️ Issue
Native TCP/UDP modules lose linking after Expo hot reload/updates.

## ✅ Quick Fix (Choose One)

### Option 1: Rebuild (2-3 minutes) ⚡
```bash
npm run android:rebuild
```

### Option 2: Clean Build (5-10 minutes) 🧹  
```bash
npm run android:clean
```

### Option 3: Check Status First
```bash
npm run android:check
```

## 📚 Full Documentation
See: `docs/ANDROID-NATIVE-MODULE-LINKING.md`

## 🛠️ What Was Fixed

1. **app.json** - Added `expo-build-properties` plugin
2. **react-native.config.js** - Explicit TCP/UDP module configuration
3. **package.json** - Added build scripts: `android:clean`, `android:rebuild`, `android:check`
4. **scripts/** - Created automated build and verification scripts

## 🔍 Verification

After building, check console logs for:
```
[getTcpSocket] Native modules available: {
  hasTcpSockets: true,  ← Should be true
  hasTcpSocket: true    ← Should be true
}
```

## 🚀 Next Steps

Run **one of these commands** to fix the linking issue:

```bash
# If first error after hot reload:
npm run android:rebuild

# If rebuild doesn't work:
npm run android:clean
```

The app will rebuild with proper native module linking and should connect to NMEA successfully.
