# Memory-Optimized Development Scripts

Quick reference for memory-efficient development workflows.

## 🎯 Recommended Workflow

### For Web Development (Use Safari!)

```bash
npm run web:safari
```

**Why?** Safari uses WebKit (not Chromium), so it won't compete with VS Code for resources.
**Saves:** ~4.6GB compared to Chrome with DevTools open

---

## 📋 Available Scripts

### Web Development

| Script | Opens In | Memory Impact | When to Use |
|--------|----------|---------------|-------------|
| `npm run web:safari` | Safari | **Best** (saves 4.6GB) | Primary web development |
| `npm run web:lowmem` | Chrome | **Good** (saves 400MB) | When Safari compatibility is needed |
| `npm run web` | Chrome | Default | Full Chrome DevTools needed |

### iOS Development

```bash
npm run ios              # Standard iOS simulator build
```

### Metro Bundler

```bash
npm run start            # Standard Metro (uses all CPU cores)
npm run start:lowmem     # Memory-optimized (2 workers only)
```

### Cache Cleanup

```bash
npm run clean:cache      # Clear metro + node caches (~500MB-1GB)
npm run clean:all        # Nuclear: caches + build artifacts (~2-5GB)
```

---

## 💡 Usage Tips

### Daily Development Workflow

```bash
# Morning routine
npm run clean:cache      # Start fresh
npm run web:safari       # Web dev in Safari

# Or for iOS
npm run ios              # iOS simulator
```

### When Memory Is Tight

```bash
# 1. Close Chrome completely
# 2. Use Safari
npm run web:safari

# 3. Or limit Metro workers
npm run web:lowmem
```

### Weekly Maintenance

```bash
# Clear accumulated caches
npm run clean:cache

# Check what was cleaned
du -sh .metro-cache node_modules/.cache
```

---

## 🔍 Memory Savings Explained

### Why Safari Saves So Much Memory

**Chrome with DevTools open:**
- Main Chrome process: ~800MB
- Tab renderer: ~600MB
- DevTools renderer: ~800MB
- V8 inspector: ~400MB
- Each extension: ~100-200MB
- **Total: ~4.6GB** competing with VS Code's Chromium engine

**Safari with Web Inspector:**
- Main Safari process: ~600MB
- Tab renderer: ~400MB
- Web Inspector: ~300MB
- Uses WebKit (not Chromium)
- **Total: ~1.3GB** and no competition with VS Code

**Net savings: 3.3GB + elimination of resource competition**

### Why Limiting Workers Helps

**Default Metro (8 workers on M1 Mac):**
- Each worker: ~100MB
- Total: ~800MB

**Limited Metro (2 workers):**
- Total: ~200MB
- **Savings: 600MB**
- Slightly slower builds, but manageable

---

## 🚨 Troubleshooting

### Safari Not Opening Automatically?

Check that Safari is set as default browser or manually open:
```
http://localhost:8082
```

### "Max Workers" Not Working?

The setting is in `metro.config.js`:
```javascript
config.maxWorkers = 2;
```

### Still Running Out of Memory?

1. Check what's using memory:
   ```bash
   ps aux | grep -E "Visual Studio Code|Chrome|node" | grep -v grep
   ```

2. Kill stuck processes:
   ```bash
   killall node           # Kill all node processes
   killall "Google Chrome" # Kill Chrome
   ```

3. Clear everything:
   ```bash
   npm run clean:all
   ```

4. Restart VS Code:
   - Press `Cmd+Q` to quit
   - Reopen VS Code

---

## 📊 Expected Memory Usage

After optimizations + using Safari:

| Component | Memory | Notes |
|-----------|--------|-------|
| VS Code | ~2GB | Down from ~3GB |
| Safari | ~1.3GB | Instead of Chrome's 4.6GB |
| Metro | ~400MB | With 2 workers |
| TypeScript | ~4GB | Down from 6GB |
| **Total** | **~7.7GB** | Down from ~15GB |

**Total savings: ~7GB!** 🎉

---

## 🔗 Related Documentation

- [../OPTIMIZATIONS-APPLIED.md](../OPTIMIZATIONS-APPLIED.md) - What was changed
- [../MEMORY-OPTIMIZATION-GUIDE.md](../MEMORY-OPTIMIZATION-GUIDE.md) - Complete technical guide
- [../DISK-SPACE-MANAGEMENT.md](../DISK-SPACE-MANAGEMENT.md) - Disk cleanup procedures

---

## 🎓 Best Practices

1. **Use Safari for 90% of web development**
2. **Only use Chrome for cross-browser testing**
3. **Close DevTools when not actively debugging**
4. **Run `npm run clean:cache` weekly**
5. **Restart VS Code daily** (prevents memory leaks)
6. **Keep terminal output minimal** (reduce console memory)

---

*Last updated: 2025-01-09*
