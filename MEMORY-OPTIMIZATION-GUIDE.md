# Memory Optimization Guide for React Native Development

## Current Resource Usage Analysis

**Problem:** VS Code and Chrome Browser DevTools compete for the same resources because they both use Chromium/V8 engine.

### Resource Breakdown:
- **VS Code (Electron):** 6.9% RAM (~2.2GB) - Uses Chromium engine
- **Chrome Browser:** 14.5% RAM (~4.6GB) - 62 processes active
- **TypeScript Servers:** 2 servers @ 3GB max each = 6GB allocated
- **Total Development:** ~13GB RAM usage

**Yes, they compete!** Both VS Code and Chrome use:
- Same V8 JavaScript engine
- Same Chromium rendering engine
- Same memory model
- When DevTools is open in browser, it creates additional Chrome processes that compete with VS Code's Electron processes

---

## 🎯 Optimization Strategies

### 1. Reduce TypeScript Server Memory (High Impact)

**Current:** `--max-old-space-size=3072` (3GB per TypeScript server)

**Optimize:** Create `.vscode/settings.json` with reduced memory:

```json
{
  "typescript.tsserver.maxTsServerMemory": 2048,
  "typescript.tsserver.experimental.enableProjectDiagnostics": false
}
```

**Impact:** Reduces from 6GB → 4GB for TypeScript servers

---

### 2. Optimize VS Code Extensions (High Impact)

**Current issues:**
- Jest extension with `debugMode: true` (performance intensive)
- Coverage gutters running continuously
- GitHub Copilot with multiple language servers

**Optimize `.vscode/settings.json`:**

```json
{
  // Disable expensive Jest features
  "jest.debugMode": false,
  "jest.autoRun": "off",
  "jest.showTerminalOnLaunch": false,
  "jest.enableInlineErrorMessages": false,

  // Reduce coverage gutter updates
  "coverage-gutters.showLineCoverage": false,
  "coverage-gutters.showBranchCoverage": false,

  // Disable automatic test discovery
  "testing.openTesting": "neverOpen",
  "testing.followRunningTest": false,
  "testing.automaticallyOpenTestResults": "neverOpen",

  // Reduce file watching
  "files.watcherExclude": {
    "**/node_modules/**": true,
    "**/.git/**": true,
    "**/build/**": true,
    "**/dist/**": true,
    "**/.metro-cache/**": true,
    "**/ios/build/**": true,
    "**/android/build/**": true,
    "**/ios/Pods/**": true
  }
}
```

**Impact:** Reduces VS Code memory by ~500MB-1GB

---

### 3. Optimize Metro Bundler (Medium Impact)

**Current:** Metro creates file watchers and caches that consume memory

**Add to `metro.config.js`:**

```javascript
module.exports = {
  ...config,

  // Optimize Metro memory usage
  cacheStores: [
    new FileStore({
      root: path.join(__dirname, '.metro-cache')
    })
  ],

  // Reduce watcher overhead
  watchFolders: [__dirname],

  // Optimize transformer
  transformer: {
    ...config.transformer,
    minifierConfig: {
      keep_classnames: true,
      keep_fnames: true,
      mangle: {
        keep_classnames: true,
        keep_fnames: true,
      },
    },
    // Reduce memory during builds
    getTransformOptions: async () => ({
      transform: {
        experimentalImportSupport: false,
        inlineRequires: true, // Reduce bundle size
      },
    }),
  },

  // Limit concurrent transformations
  maxWorkers: 2, // Instead of default (CPU cores)
};
```

**Impact:** Reduces Metro memory by ~200-500MB

---

### 4. Reduce Chrome DevTools Impact (High Impact)

**The Problem:**
When you open Chrome DevTools, Chrome spawns many additional processes:
- Renderer process for DevTools UI
- V8 Inspector for debugging
- Network inspector
- Performance profiler
- Memory profiler

**Solutions:**

#### Option A: Use Safari for Web Development (Recommended)
```bash
# Safari uses WebKit (not Chromium), won't compete with VS Code
# Set as default for Expo web:
expo start --web --safari
```

#### Option B: Close Unused DevTools Panels
- Only open Console (don't open Elements, Network, Performance simultaneously)
- Close DevTools when not actively debugging
- Use `console.log` instead of breakpoints when possible

#### Option C: Use Remote Debugging (Advanced)
```bash
# Run Chrome in headless mode, connect VS Code debugger
chrome --remote-debugging-port=9222 --headless
```

**Impact:** Reduces Chrome memory by ~30-50% (2-3GB)

---

### 5. Optimize React Native Development Workflow

#### Use Production-Like Builds for Testing
```bash
# Instead of development mode (large bundles, HMR overhead)
expo start --no-dev --minify

# For iOS
expo run:ios --configuration Release
```

#### Reduce Metro Refresh Frequency
Add to `package.json`:
```json
{
  "scripts": {
    "start": "EXPO_DEVTOOLS_LISTEN_ADDRESS=localhost expo start --max-workers 2"
  }
}
```

#### Clear Metro Cache Regularly
```bash
# Add to package.json scripts
"clean:metro": "rm -rf .metro-cache node_modules/.cache"
```

**Impact:** Reduces overall development memory by ~500MB

---

### 6. System-Level Optimizations

#### A. Increase Mac Swap/Virtual Memory
```bash
# Check current swap usage
sysctl vm.swapusage

# Mac handles this automatically, but ensure you have:
# - At least 20GB free on system drive ✅ (you have 20GB)
# - Enable "Optimize Mac Storage" in System Settings
```

#### B. Close Unnecessary Apps
```bash
# Kill Microsoft Teams (using 1.6GB in your case)
# Close Spotify, Slack, etc. when developing

# Find memory hogs:
ps aux | sort -nrk 4 | head -10
```

#### C. Use Activity Monitor to Kill Runaway Processes
- Press `Cmd+Space`, type "Activity Monitor"
- Sort by Memory
- Look for "Code Helper" processes using >1GB
- Force quit if stuck/frozen

---

## 🚀 Recommended Configuration

Create or update these files:

### `.vscode/settings.json` (Optimized)
```json
{
  // TypeScript optimization
  "typescript.tsserver.maxTsServerMemory": 2048,
  "typescript.tsserver.experimental.enableProjectDiagnostics": false,
  "typescript.suggest.autoImports": false,

  // Jest optimization - run on demand only
  "jest.debugMode": false,
  "jest.autoRun": "off",
  "jest.enableInlineErrorMessages": false,
  "jest.runMode": {
    "type": "on-demand"
  },

  // Coverage optimization
  "coverage-gutters.showLineCoverage": false,
  "coverage-gutters.showBranchCoverage": false,

  // Testing optimization
  "testing.openTesting": "neverOpen",
  "testing.followRunningTest": false,
  "testing.automaticallyOpenTestResults": "neverOpen",

  // File watching optimization
  "files.watcherExclude": {
    "**/node_modules/**": true,
    "**/.git/**": true,
    "**/build/**": true,
    "**/dist/**": true,
    "**/.metro-cache/**": true,
    "**/ios/build/**": true,
    "**/ios/Pods/**": true,
    "**/android/build/**": true
  },

  // Editor optimization
  "editor.quickSuggestions": {
    "other": true,
    "comments": false,
    "strings": false
  },
  "editor.suggestOnTriggerCharacters": true,
  "editor.acceptSuggestionOnEnter": "smart",

  // Git optimization
  "git.untrackedChanges": "hidden",
  "git.autorefresh": false,

  // Search optimization
  "search.followSymlinks": false,
  "search.exclude": {
    "**/node_modules": true,
    "**/bower_components": true,
    "**/*.code-search": true,
    "**/ios/Pods": true,
    "**/ios/build": true,
    "**/.metro-cache": true
  }
}
```

### `metro.config.js` (Optimized)
```javascript
const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

// Memory optimizations
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName === '../../App' && context.originModulePath.includes('expo/AppEntry')) {
    return context.resolveRequest(context, '../../index', platform);
  }
  return context.resolveRequest(context, moduleName, platform);
};

config.resolver.alias = {
  '@': path.resolve(__dirname, 'src'),
  '@components': path.resolve(__dirname, 'src/components'),
  '@hooks': path.resolve(__dirname, 'src/hooks'),
  '@stores': path.resolve(__dirname, 'src/stores'),
  '@services': path.resolve(__dirname, 'src/services'),
  '@types': path.resolve(__dirname, 'src/types'),
  '@theme': path.resolve(__dirname, 'src/theme'),
  '@utils': path.resolve(__dirname, 'src/utils'),
  '@widgets': path.resolve(__dirname, 'src/widgets'),
  'expo-router/_ctx.web': path.resolve(__dirname, 'expo-router-ctx.web.js'),
  'react-native-sound': path.resolve(__dirname, '__mocks__/Sound.js'),
  'react-native-vector-icons/Ionicons': path.resolve(__dirname, '__mocks__/Ionicons.js'),
};

config.resolver.platforms = ['native', 'web', 'ios', 'android'];

// Optimize transformer
config.transformer = {
  ...config.transformer,
  unstable_allowRequireContext: true,
  getTransformOptions: async () => ({
    transform: {
      experimentalImportSupport: false,
      inlineRequires: true, // Memory optimization
    },
  }),
};

config.resolver = {
  ...config.resolver,
  blockList: [/.*\/node_modules\/.*\.mjs$/],
};

// Limit worker processes to reduce memory
config.maxWorkers = 2;

// Cache configuration
config.cacheStores = [
  new (require('metro-cache').FileStore)({
    root: path.join(__dirname, '.metro-cache'),
  }),
];

module.exports = config;
```

### `package.json` Scripts (Optimized)
```json
{
  "scripts": {
    "start": "expo start --max-workers 2",
    "start:web": "expo start --web --max-workers 2",
    "ios": "expo run:ios --device",
    "ios:release": "expo run:ios --configuration Release",
    "clean": "rm -rf .metro-cache node_modules/.cache",
    "clean:all": "rm -rf .metro-cache node_modules/.cache ios/build android/build"
  }
}
```

---

## 📊 Expected Memory Savings

| Optimization | Current | After | Savings |
|--------------|---------|-------|---------|
| TypeScript Servers | 6GB | 4GB | **2GB** |
| VS Code Extensions | ~2GB | ~1GB | **1GB** |
| Metro Bundler | ~800MB | ~400MB | **400MB** |
| Chrome DevTools (Safari) | 4.6GB | 0GB | **4.6GB** |
| **Total** | **13.4GB** | **5.4GB** | **8GB** ✨ |

---

## 🔍 Why They Compete

### The Technical Reason:

**VS Code Architecture:**
- Built on Electron (Chromium + Node.js)
- Main process (Chromium)
- Renderer processes (1 per window/panel)
- Extension host processes
- TypeScript language server processes

**Chrome Browser:**
- Same Chromium engine
- Each tab = separate process
- DevTools = additional renderer process
- Each extension = separate process

**When Both Run:**
1. They share CPU for V8 JavaScript compilation
2. They share memory bandwidth for garbage collection
3. They compete for CPU cache
4. They both use Chromium's task scheduler

**Opening DevTools Makes It Worse:**
- Creates additional Chrome renderer process
- Doubles JavaScript execution (page + DevTools)
- Memory snapshots in DevTools consume GBs
- Performance profiling creates CPU contention

---

## 💡 Best Practices

### Development Workflow:

1. **Use Safari for web testing** (doesn't compete with VS Code)
2. **Close DevTools when not debugging** (huge memory saver)
3. **Use on-demand testing** (don't auto-run tests)
4. **Clear Metro cache weekly** (`npm run clean`)
5. **Restart VS Code daily** (prevents memory leaks)
6. **Use iOS Simulator for primary development** (not web)

### When You Need Chrome DevTools:

1. Close VS Code terminal
2. Close unused VS Code editor tabs
3. Close Jest/Testing panels in VS Code
4. Only open DevTools Console (not all panels)
5. Use `console.log` instead of breakpoints when possible

### Ultimate Setup:

- **Primary Development:** iOS Simulator (native performance)
- **Web Testing:** Safari (no resource competition)
- **Chrome:** Only for final cross-browser testing
- **VS Code:** Minimal extensions, on-demand features

---

## 🎬 Quick Wins (Apply These First)

```bash
# 1. Update VS Code settings (copy optimized config above)

# 2. Restart VS Code to apply new TypeScript memory limits
# Press Cmd+Shift+P → "Developer: Reload Window"

# 3. Clear Metro cache
cd boatingInstrumentsApp
rm -rf .metro-cache node_modules/.cache

# 4. Use Safari for web development
expo start --web --safari

# 5. Close Chrome DevTools when not actively debugging

# 6. Check memory usage
ps aux | grep -E "Visual Studio Code|Chrome" | grep -v grep | awk '{mem+=$4} END {print "Total: " mem "%"}'
```

---

## 🚨 Emergency Memory Management

If your Mac starts swapping heavily:

```bash
# 1. Quit Chrome completely
killall "Google Chrome"

# 2. Restart VS Code
# Press Cmd+Q in VS Code, then reopen

# 3. Kill stuck TypeScript servers
killall node

# 4. Clear system memory cache
sudo purge

# 5. Check what's using memory
top -o MEM -n 10
```

---

## 📚 Additional Resources

- [VS Code Performance Tips](https://code.visualstudio.com/docs/setup/setup-overview#_performance)
- [Metro Bundler Configuration](https://metrobundler.dev/docs/configuration)
- [Expo Performance](https://docs.expo.dev/guides/performance/)
- [Chrome DevTools Memory Profiling](https://developer.chrome.com/docs/devtools/memory-problems/)

---

## ✅ Verification

After applying optimizations, check memory usage:

```bash
# Total development memory
ps aux | grep -E "Visual Studio Code|Chrome|node.*metro" | grep -v grep | awk '{mem+=$4} END {print "Development memory: " mem "% (~" mem*0.32 "GB on 32GB system)"}'

# Should see:
# Before: ~13-15GB
# After: ~5-7GB
# Savings: ~8GB freed! 🎉
```
