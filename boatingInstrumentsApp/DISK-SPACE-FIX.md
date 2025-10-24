# Disk Space Issue Resolution

## Problem
Metro bundler was failing with `ENOSPC: no space left on device` error because the system drive was 100% full (only 1.8GB available out of 228GB).

## Actions Taken

### 1. Cleaned npm cache
- **Before**: 1.4GB
- **After**: 902MB
- **Freed**: ~500MB

### 2. Cleaned Homebrew cache
- **Before**: 1.7GB
- **After**: 1.6GB (partial cleanup, more can be done)
- **Freed**: ~100MB

### 3. Created Metro Cache Scripts
Two new scripts have been added to use your external SSD for Metro cache:

#### `set-metro-cache.sh`
Configures environment variables to use external SSD for caching.

#### `start-metro-ssd.sh`
Starts Metro bundler with cache on SSD (use this instead of `npm start`).

### 4. Current Disk Status
- **Free space**: 1.0GB (improved from 1.8GB)
- **Capacity**: 94% (improved from 100%)

## Additional Cleanup Opportunities

### Safe to clean (2.3GB total):
1. **Homebrew cache**: `rm -rf ~/Library/Caches/Homebrew` (1.6GB)
2. **CocoaPods cache**: `rm -rf ~/Library/Caches/CocoaPods` (738MB)
3. **Spotify cache**: `rm -rf ~/Library/Caches/com.spotify.client` (827MB)

### To investigate:
1. **Documents folder**: 6.5GB - review for old files
2. **Google cache**: 1.3GB - `~/Library/Caches/Google`

## Usage Instructions

### Option 1: Use the start script (Recommended)
```bash
cd /Volumes/SSD_I/Dev/JSDev/bmad-autopilot/boatingInstrumentsApp
./start-metro-ssd.sh
```

### Option 2: Make it permanent
Add to your `~/.zshrc`:
```bash
export TMPDIR=/Volumes/SSD_I/Dev/.metro-cache
export REACT_NATIVE_CACHE_DIR=/Volumes/SSD_I/Dev/.metro-cache
```

Then run:
```bash
source ~/.zshrc
```

## Next Steps
1. Test Metro bundler with the new cache location
2. Monitor disk space: `df -h /`
3. Consider cleaning additional caches if needed
4. Set up automatic cache cleanup cron job (optional)

## Commands to Monitor

### Check disk space
```bash
df -h /
```

### Check cache sizes
```bash
du -sh ~/Library/Caches/*
```

### Clean all caches (be careful!)
```bash
npm cache clean --force
yarn cache clean
brew cleanup --prune=all
```
