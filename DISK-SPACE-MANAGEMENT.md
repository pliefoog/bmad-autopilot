# Mac Disk Space Management Guide

## Quick Reference

**System Drive Status:** 228GB total, currently 23GB free (38% used)
**External SSD:** 1.8TB total, 1.5TB free (15% used)

---

## 🚀 Automated Cleanup Scripts

### 1. Cache Cleanup (Safe, Run Anytime)

Clears development caches without affecting functionality:

```bash
# Clear all dev caches (~6-8GB typically)
rm -rf ~/Library/Caches/Homebrew
rm -rf ~/.npm/_cacache
rm -rf ~/Library/Caches/pip
rm -rf ~/Library/Caches/Cypress
rm -rf ~/Library/Caches/Code
rm -rf ~/Library/Caches/Google/Chrome/Default/Cache
rm -rf ~/Library/Caches/com.spotify.client/Data
rm -rf ~/Library/Caches/CocoaPods
```

### 2. iOS Simulator Cleanup (Run Periodically)

```bash
# Remove unavailable/old simulators
xcrun simctl delete unavailable

# Erase all simulator content (keeps simulators, removes app data)
xcrun simctl shutdown all
xcrun simctl erase all

# Clean CocoaPods cache
pod cache clean --all
```

### 3. Relocate iOS Development to External SSD

**Moves ~6-15GB of iOS development data to external SSD**

```bash
# Run the relocation script
./scripts/relocate-xcode-data.sh
```

This relocates:
- iOS Simulators (1-50GB over time)
- iOS Device Support (4.5GB)
- Xcode DerivedData (build artifacts)
- Xcode Archives (app archives)

**How it works:**
- Creates directories on external SSD at `/Volumes/SSD_I/Developer/`
- Moves actual data to external SSD
- Creates symlinks from original locations
- Xcode/iOS tools work transparently with no configuration changes

**Benefits:**
- System drive stays lean
- No performance impact (SSD is fast)
- Can accumulate 50-100GB of simulator/build data without filling system drive
- Easy to reverse (delete symlink, move data back)

---

## 📊 Space Usage Breakdown

### System Drive Space Hogs

| Item | Typical Size | Location | Safe to Clean? |
|------|-------------|----------|----------------|
| iOS Simulators | 10-50GB | `~/Library/Developer/CoreSimulator` | ✅ Relocate |
| iOS Device Support | 4-5GB | `~/Library/Developer/Xcode/iOS DeviceSupport` | ✅ Relocate |
| Docker Desktop | 5-20GB | `~/Library/Containers/com.docker.docker` | ⚠️ Configure in Docker |
| Homebrew | 10-15GB | `/opt/homebrew` | ❌ Leave on system |
| Chrome Cache | 1-3GB | `~/Library/Caches/Google/Chrome` | ✅ Clear periodically |
| Spotify Cache | 2-5GB | `~/Library/Caches/com.spotify.client` | ✅ Clear periodically |
| npm Cache | 1-3GB | `~/.npm` | ✅ Clear periodically |
| CocoaPods Cache | 500MB-1GB | `~/Library/Caches/CocoaPods` | ✅ Clear after builds |
| Xcode DerivedData | 0-10GB | `~/Library/Developer/Xcode/DerivedData` | ✅ Relocate |

---

## 🔄 Maintenance Schedule

### Weekly (if actively developing)
```bash
# Clear dev caches
rm -rf ~/.npm/_cacache
rm -rf ~/Library/Caches/CocoaPods
```

### Monthly
```bash
# Clean iOS simulators
xcrun simctl delete unavailable
xcrun simctl erase all

# Clear all caches (run full cache cleanup script)
```

### When Disk Space < 15GB
1. Run cache cleanup
2. Check for large files: `sudo find / -type f -size +500M 2>/dev/null`
3. Consider relocating iOS development to external SSD

---

## 🎯 Best Practices

### For iOS Development

1. **Relocate to External SSD** (Recommended)
   - Keeps system drive lean permanently
   - No performance impact with fast external SSD
   - Can grow to 50-100GB without issues

2. **Regular Simulator Cleanup**
   - Run `xcrun simctl erase all` after major testing sessions
   - Remove unavailable simulators monthly

3. **Xcode DerivedData**
   - Xcode can regenerate this data
   - Safe to delete or relocate anytime
   - Relocating is better than deleting (keeps build caches)

### For Node.js Development

1. **npm Cache**
   - Grows to 2-3GB over time
   - Clear with: `rm -rf ~/.npm/_cacache`
   - npm will re-download packages as needed

2. **node_modules in Old Projects**
   - Can be 200-500MB per project
   - Delete from projects you're not using
   - Run `npm install` when you need them again

---

## 📝 Recent Cleanup History

### 2025-01-09 - Major Cleanup
- **Started:** 11GB free (55% used)
- **After cache cleanup:** 17GB free (6GB freed)
- **After iOS cleanup:** 23GB free (12GB total freed)

**What was cleaned:**
- Homebrew cache: 798MB
- npm cache: 2.2GB
- Chrome cache: 1.3GB
- Spotify cache: 3.3GB
- VS Code caches: ~200MB
- pip cache: 140MB
- iOS Simulators: 9.6GB (from 11GB to 1.4GB)
- CocoaPods cache: 738MB

**Result:** ✅ System drive now has 23GB free with room to grow

---

## 🛠 Docker Disk Space Management

If Docker Desktop is consuming too much space:

1. **Configure in Docker Desktop:**
   - Open Docker Desktop → Settings → Resources → Advanced
   - Set "Disk image size" to reasonable limit (e.g., 64GB)
   - Set "Disk image location" to external drive if desired

2. **Clean Docker:**
   ```bash
   docker system prune -a --volumes
   ```

---

## ⚠️ Important Notes

### What NOT to Move
- **Homebrew** (`/opt/homebrew`) - Complex, many hardcoded paths
- **System Libraries** - Never move system files
- **Active development projects** - Keep on fastest drive

### Symlink Safety
- Xcode, iOS Simulator, and build tools handle symlinks perfectly
- No configuration changes needed
- Can reverse by deleting symlink and moving data back

### External SSD Requirements
- Must be APFS or Mac OS Extended (Journaled)
- Should be at least USB 3.0 (USB-C/Thunderbolt preferred)
- Ensure "Ignore ownership on this volume" is DISABLED

---

## 🔍 Monitoring Disk Usage

```bash
# Overall disk space
df -h /

# Largest directories on system
sudo du -h -d 1 ~ | sort -hr | head -20

# iOS Simulator usage
du -sh ~/Library/Developer/CoreSimulator

# Xcode data
du -sh ~/Library/Developer/Xcode/*

# Find large files
sudo find / -type f -size +1G 2>/dev/null -exec ls -lh {} \;
```

---

## 📚 Additional Resources

- [Apple: Free up storage space on Mac](https://support.apple.com/en-us/HT206996)
- [Xcode: Reducing build cache size](https://developer.apple.com/documentation/xcode/reducing-build-cache-size)
- [Docker: Disk space management](https://docs.docker.com/desktop/disk-space/)
